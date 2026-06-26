"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  criarSetor,
  criarCargo,
  salvarCargo,
  reordenarCargos,
  excluirCargo,
} from "./actions";
import { usePode } from "@/components/user-provider";
import { BackButton } from "@/components/back-button";

// ─── Tipos ───────────────────────────────────────────────────

type Permissao = { id: string; chave: string; nome: string; modulo: string; acao: string };
type Setor = { id: string; nome: string; cor: string; ordem: number };
type Cargo = {
  id: string;
  nome: string;
  cor: string;
  setor_id: string;
  ordem: number;
  is_admin: boolean;
  permissao_ids: string[];
};

// "compras" é tratado como seção separada abaixo do grid
const MODULOS = [
  "obras", "catalogo", "producao",
  "qualidade", "expedicao", "tarefas", "usuarios", "cargos",
] as const;

const ACOES = ["criar", "editar", "alterar_status", "apagar"] as const;

const MODULO_LABEL: Record<string, string> = {
  obras: "Obras", catalogo: "Catálogo", compras: "Compras",
  producao: "Produção", qualidade: "Qualidade", expedicao: "Expedição",
  tarefas: "Tarefas", usuarios: "Usuários", cargos: "Cargos",
};

const ACAO_LABEL: Record<string, string> = {
  criar: "Criar", editar: "Editar",
  alterar_status: "Alterar status", apagar: "Apagar",
};

const COMPRAS_GRUPOS: { key: string; label: string }[] = [
  { key: "compras.solicitacao",    label: "Solicitações" },
  { key: "compras.pedido",         label: "Pedidos" },
  { key: "compras.recebimento",    label: "Recebimentos" },
  { key: "compras.fornecedor",     label: "Fornecedores" },
  { key: "compras.documento",      label: "Documentos" },
  { key: "compras.anotacao",       label: "Anotações" },
  { key: "compras.formapagamento", label: "Formas de pagamento" },
];

// ─── Card de cargo (sortable) ─────────────────────────────────

function CargoCard({
  cargo,
  setores,
  permissoes,
  podeEditar,
  onSaved,
}: {
  cargo: Cargo;
  setores: Setor[];
  permissoes: Permissao[];
  podeEditar: boolean;
  onSaved: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(cargo.nome);
  const [cor, setCor] = useState(cargo.cor);
  const [setorId, setSetorId] = useState(cargo.setor_id);
  const [isAdmin, setIsAdmin] = useState(cargo.is_admin);
  const [permsIds, setPermsIds] = useState<Set<string>>(new Set(cargo.permissao_ids));
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cargo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function togglePerm(id: string) {
    setPermsIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleModulo(modulo: string, checked: boolean) {
    const ids = permissoes
      .filter((p) => p.modulo === modulo || p.modulo.startsWith(modulo + "."))
      .map((p) => p.id);
    setPermsIds((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
      return n;
    });
  }

  function toggleAdmin(checked: boolean) {
    setIsAdmin(checked);
    if (checked) setPermsIds(new Set(permissoes.map((p) => p.id)));
    else setPermsIds(new Set());
  }

  function handleSave() {
    setErro(null);
    start(async () => {
      try {
        await salvarCargo(cargo.id, {
          nome, cor, setor_id: setorId, is_admin: isAdmin,
          permissao_ids: [...permsIds],
        });
        setEditando(false);
        onSaved();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  function handleExcluir() {
    if (!confirm(`Excluir o cargo "${cargo.nome}"?`)) return;
    start(async () => {
      try {
        await excluirCargo(cargo.id);
        onSaved();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  const MODULOS_DISPLAY = [...MODULOS, "compras"] as const;
  const modulosAtivos = MODULOS_DISPLAY.filter((m) =>
    permissoes
      .filter((p) => p.modulo === m || p.modulo.startsWith(m + "."))
      .some((p) => permsIds.has(p.id))
  );

  return (
    <div ref={setNodeRef} style={style}>
      {!editando ? (
        <div
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-line bg-surface p-3 shadow-card transition-shadow hover:shadow-md"
          onClick={() => podeEditar && setEditando(true)}
        >
          {podeEditar && (
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0 cursor-grab text-ink-faint active:cursor-grabbing"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
                <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
              </svg>
            </button>
          )}
          <div className="mt-0.5 h-full w-1 shrink-0 rounded-full" style={{ backgroundColor: cargo.cor, minHeight: 36 }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{cargo.nome}</span>
              {cargo.is_admin && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Admin
                </span>
              )}
            </div>
            {cargo.is_admin ? (
              <p className="mt-1 text-[11px] text-ink-faint">Acesso total</p>
            ) : modulosAtivos.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {modulosAtivos.map((m) => (
                  <span key={m} className="rounded-full bg-steel/10 px-1.5 py-0.5 text-[10px] font-medium text-steel">
                    {MODULO_LABEL[m]}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-ink-faint">Sem permissões</p>
            )}
          </div>
          {podeEditar && (
            <span className="mt-1 shrink-0 text-[11px] text-ink-faint opacity-0 group-hover:opacity-100">
              Editar
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-steel bg-surface p-4 shadow-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nome do cargo</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex items-center gap-2">
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-line bg-surface p-1" />
                <span className="font-mono text-xs text-ink-faint">{cor}</span>
              </div>
            </div>
            <div>
              <label className="label">Setor</label>
              <select value={setorId} onChange={(e) => setSetorId(e.target.value)} className="field">
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <div
              onClick={() => toggleAdmin(!isAdmin)}
              className={`relative h-5 w-9 rounded-full transition-colors ${isAdmin ? "bg-amber-500" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isAdmin ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm font-medium text-ink">Administrador</span>
            <span className="text-xs text-ink-faint">(acesso total)</span>
          </label>

          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="px-3 py-2 text-left font-medium text-ink-soft">Módulo</th>
                  {ACOES.map((a) => (
                    <th key={a} className="px-2 py-2 text-center font-medium text-ink-soft">{ACAO_LABEL[a]}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium text-ink-soft">Tudo</th>
                </tr>
              </thead>
              <tbody>
                {MODULOS.map((modulo) => {
                  const mPerms = permissoes.filter((p) => p.modulo === modulo);
                  const todosAtivos = mPerms.length > 0 && mPerms.every((p) => permsIds.has(p.id));
                  return (
                    <tr key={modulo} className="border-b border-line last:border-0 hover:bg-canvas/50">
                      <td className="px-3 py-2 font-medium text-ink">{MODULO_LABEL[modulo]}</td>
                      {ACOES.map((acao) => {
                        const perm = mPerms.find((p) => p.acao === acao);
                        return (
                          <td key={acao} className="px-2 py-2 text-center">
                            {perm ? (
                              <input type="checkbox"
                                checked={permsIds.has(perm.id) || isAdmin}
                                disabled={isAdmin}
                                onChange={() => togglePerm(perm.id)}
                                className="h-4 w-4 rounded accent-steel"
                              />
                            ) : <span className="text-ink-faint">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox"
                          checked={todosAtivos || isAdmin}
                          disabled={isAdmin}
                          onChange={(e) => toggleModulo(modulo, e.target.checked)}
                          className="h-4 w-4 rounded accent-steel"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compras — permissões granulares */}
          {!isAdmin && (() => {
            const todosCompras = permissoes.filter((p) => p.chave.startsWith("compras."));
            if (!todosCompras.length) return null;
            const todosMarcados = todosCompras.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line bg-canvas px-3 py-2">
                  <span className="text-xs font-medium text-ink-soft">Compras</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => toggleModulo("compras", e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-steel"
                    />
                    Tudo
                  </label>
                </div>
                <div className="divide-y divide-line">
                  {COMPRAS_GRUPOS.map(({ key, label }) => {
                    const grupoPerms = todosCompras.filter((p) => p.modulo === key);
                    if (!grupoPerms.length) return null;
                    return (
                      <div key={key} className="px-3 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {grupoPerms.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox"
                                checked={permsIds.has(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="h-3.5 w-3.5 rounded accent-steel"
                              />
                              <span className="text-xs text-ink">{p.nome}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {erro && <p className="mt-3 text-xs text-red-500">{erro}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button onClick={handleSave} disabled={pending} className="btn-primary">
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button onClick={() => { setEditando(false); setErro(null); }} disabled={pending} className="btn-ghost">
              Cancelar
            </button>
            <button onClick={handleExcluir} disabled={pending}
              className="ml-auto text-xs text-ink-faint hover:text-red-500 disabled:opacity-50">
              Excluir cargo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────

export function CargosCliente({
  setoresInit,
  cargosInit,
  permissoes,
}: {
  setoresInit: Setor[];
  cargosInit: Cargo[];
  permissoes: Permissao[];
}) {
  const [setores, setSetores] = useState(setoresInit);
  const [cargos, setCargos] = useState(cargosInit);
  const [setorAtivo, setSetorAtivo] = useState<string | null>(setoresInit[0]?.id ?? null);
  const [adicionandoSetor, setAdicionandoSetor] = useState(false);
  const [nomeSetor, setNomeSetor] = useState("");
  const [corSetor, setCorSetor] = useState("#0F4C81");
  const [adicionandoCargo, setAdicionandoCargo] = useState(false);
  const [nomeCargo, setNomeCargo] = useState("");
  const [corCargo, setCorCargo] = useState("#475569");
  const [pending, start] = useTransition();
  const router = useRouter();
  const podeGerenciar = usePode("cargos.criar");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onRefresh() { router.refresh(); }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCargo = cargos.find((c) => c.id === activeId);
    if (!activeCargo) return;
    const setorId = activeCargo.setor_id;
    const setorCargos = cargos.filter((c) => c.setor_id === setorId);
    const oldIndex = setorCargos.findIndex((c) => c.id === activeId);
    const newIndex = setorCargos.findIndex((c) => c.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordenados = arrayMove(setorCargos, oldIndex, newIndex).map((c, i) => ({ ...c, ordem: i + 1 }));
    setCargos((prev) => [...prev.filter((c) => c.setor_id !== setorId), ...reordenados]);
    start(async () => { await reordenarCargos(reordenados.map((c) => ({ id: c.id, ordem: c.ordem }))); });
  }

  function handleCriarSetor() {
    if (!nomeSetor.trim()) return;
    const fd = new FormData();
    fd.set("nome", nomeSetor.trim());
    fd.set("cor", corSetor);
    start(async () => {
      await criarSetor(fd);
      setNomeSetor(""); setAdicionandoSetor(false);
      onRefresh();
    });
  }

  function handleCriarCargo() {
    if (!nomeCargo.trim() || !setorAtivo) return;
    const fd = new FormData();
    fd.set("nome", nomeCargo.trim());
    fd.set("cor", corCargo);
    fd.set("setor_id", setorAtivo);
    start(async () => {
      await criarCargo(fd);
      setNomeCargo(""); setAdicionandoCargo(false);
      onRefresh();
    });
  }

  const setor = setores.find((s) => s.id === setorAtivo) ?? null;
  const cargosDoSetor = cargos.filter((c) => c.setor_id === setorAtivo).sort((a, b) => a.ordem - b.ordem);

  // ── Botões de setor reutilizáveis ────────────────────
  function SetorBtn({ s }: { s: Setor }) {
    const count = cargos.filter((c) => c.setor_id === s.id).length;
    const ativo = s.id === setorAtivo;
    return (
      <button
        key={s.id}
        onClick={() => setSetorAtivo(s.id)}
        className={`flex items-center gap-2 shrink-0 rounded-lg px-3 py-2 text-sm transition-colors
          sm:w-full sm:rounded-none sm:px-4 sm:py-2.5
          ${ativo ? "bg-steel/10 font-medium text-steel sm:border-r-2 sm:bg-steel/5" : "text-ink-soft hover:bg-canvas hover:text-ink"}`}
        style={ativo ? { borderRightColor: s.cor } : {}}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
        <span className="flex-1 text-left">{s.nome}</span>
        <span className={`text-xs ${ativo ? "text-steel/70" : "text-ink-faint"}`}>{count}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:h-[calc(100dvh-56px-env(safe-area-inset-top))]">
      {/* ── Cabeçalho mobile (back + título) ──────────── */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:hidden">
        <BackButton href="/usuarios" />
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Cargos</p>
      </div>

      {/* ── Tabs de setor (mobile: scroll horizontal) ─── */}
      <div className="flex overflow-x-auto gap-1 border-b border-line bg-surface px-3 py-2 sm:hidden">
        {setores.map((s) => <SetorBtn key={s.id} s={s} />)}
        {podeGerenciar && !adicionandoSetor && (
          <button
            onClick={() => setAdicionandoSetor(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-ink-faint hover:border-steel hover:text-steel transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo setor
          </button>
        )}
      </div>
      {adicionandoSetor && (
        <div className="border-b border-line bg-surface px-3 py-2 space-y-2 sm:hidden">
          <input
            autoFocus value={nomeSetor}
            onChange={(e) => setNomeSetor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCriarSetor()}
            placeholder="Nome do setor…"
            className="field text-sm"
          />
          <div className="flex items-center gap-2">
            <input type="color" value={corSetor} onChange={(e) => setCorSetor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-line p-1" />
            <button onClick={handleCriarSetor} disabled={pending} className="btn-primary flex-1 py-1 text-xs">Criar</button>
            <button onClick={() => setAdicionandoSetor(false)} className="text-xs text-ink-faint hover:text-ink">✕</button>
          </div>
        </div>
      )}

      {/* ── Sidebar de setores (desktop) ──────────────── */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <BackButton href="/usuarios" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Setores</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {setores.map((s) => <SetorBtn key={s.id} s={s} />)}
        </nav>

        {podeGerenciar && (
          <div className="border-t border-line p-3">
            {adicionandoSetor ? (
              <div className="space-y-2">
                <input
                  autoFocus value={nomeSetor}
                  onChange={(e) => setNomeSetor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCriarSetor()}
                  placeholder="Nome do setor…"
                  className="field text-sm"
                />
                <div className="flex items-center gap-2">
                  <input type="color" value={corSetor} onChange={(e) => setCorSetor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-line p-1" />
                  <button onClick={handleCriarSetor} disabled={pending} className="btn-primary flex-1 py-1 text-xs">Criar</button>
                  <button onClick={() => setAdicionandoSetor(false)} className="text-xs text-ink-faint hover:text-ink">✕</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdicionandoSetor(true)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-faint hover:bg-canvas hover:text-ink"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Novo setor
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ── Conteúdo: cargos do setor ──────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!setor ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            Selecione um setor
          </div>
        ) : (
          <div className="px-8 py-6">
            {/* Cabeçalho */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: setor.cor }} />
                <h2 className="text-xl font-bold text-ink">{setor.nome}</h2>
                <span className="text-sm text-ink-faint">{cargosDoSetor.length} cargos</span>
              </div>
              {podeGerenciar && !adicionandoCargo && (
                <button onClick={() => setAdicionandoCargo(true)} className="btn-primary">
                  Novo cargo
                </button>
              )}
            </div>

            {/* Formulário novo cargo */}
            {podeGerenciar && adicionandoCargo && (
              <div className="mb-4 rounded-lg border border-steel bg-surface p-4">
                <p className="mb-3 text-sm font-semibold text-ink">Novo cargo em {setor.nome}</p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label">Nome</label>
                    <input
                      autoFocus value={nomeCargo}
                      onChange={(e) => setNomeCargo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCriarCargo()}
                      placeholder="Ex: Gerente de Produção"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">Cor</label>
                    <input type="color" value={corCargo} onChange={(e) => setCorCargo(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-line p-1" />
                  </div>
                  <button onClick={handleCriarCargo} disabled={pending} className="btn-primary">
                    {pending ? "…" : "Criar cargo"}
                  </button>
                  <button onClick={() => { setAdicionandoCargo(false); setNomeCargo(""); }}
                    className="btn-ghost">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de cargos */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cargosDoSetor.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {cargosDoSetor.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-ink-faint">
                      Nenhum cargo neste setor.
                      {podeGerenciar && (
                        <button onClick={() => setAdicionandoCargo(true)} className="mt-2 block w-full text-steel hover:underline">
                          Criar o primeiro cargo
                        </button>
                      )}
                    </div>
                  ) : (
                    cargosDoSetor.map((c) => (
                      <CargoCard
                        key={c.id}
                        cargo={c}
                        setores={setores}
                        permissoes={permissoes}
                        podeEditar={podeGerenciar}
                        onSaved={onRefresh}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
