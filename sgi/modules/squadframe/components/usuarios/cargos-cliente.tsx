"use client";

import { useState, useTransition, useEffect } from "react";
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
} from "@/modules/squadframe/actions/usuarios/cargos";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { BackButton } from "@/modules/squadframe/components/back-button";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Chip } from "@/ui/components/Chip";
import { Input } from "@/ui/components/Input";
import { LoadingOverlay } from "@/ui/components/LoadingOverlay";
import { useLoadingOverlay } from "@/ui/lib/use-loading-overlay";

// Campos do form "novo setor" — usado tanto na barra mobile quanto na
// sidebar desktop (mesmo Input + seletor de cor + botões, só o wrapper
// externo muda de estilo entre as duas).
function NovoSetorFields({
  nomeSetor, setNomeSetor, corSetor, setCorSetor, onCriar, pending, onCancelar,
}: {
  nomeSetor: string;
  setNomeSetor: (v: string) => void;
  corSetor: string;
  setCorSetor: (v: string) => void;
  onCriar: () => void;
  pending: boolean;
  onCancelar: () => void;
}) {
  return (
    <>
      <Input
        autoFocus value={nomeSetor}
        onChange={(e) => setNomeSetor(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCriar()}
        placeholder="Nome do setor…"
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <input type="color" value={corSetor} onChange={(e) => setCorSetor(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-border p-1" />
        <Button size="sm" onClick={onCriar} disabled={pending} className="flex-1">Criar</Button>
        <button onClick={onCancelar} className="text-xs text-text-3 hover:text-text">✕</button>
      </div>
    </>
  );
}

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

// "compras" e "catalogo" são tratados como seções separadas abaixo do grid
const MODULOS = [
  "obras", "producao",
  "qualidade", "expedicao", "tarefas", "usuarios", "cargos",
] as const;

const ACOES = ["criar", "editar", "alterar_status", "apagar"] as const;

const MODULO_LABEL: Record<string, string> = {
  obras: "Obras", catalogo: "Catálogo", compras: "Compras", financeiro: "Financeiro",
  producao: "Produção", qualidade: "Qualidade", expedicao: "Expedição",
  tarefas: "Tarefas", usuarios: "Usuários", cargos: "Cargos", stock: "Estoque",
};

const ACAO_LABEL: Record<string, string> = {
  criar: "Criar", editar: "Editar",
  alterar_status: "Alterar status", apagar: "Apagar",
};

const COMPRAS_GRUPOS: { key: string; label: string }[] = [
  { key: "compras.solicitacao",    label: "Solicitações" },
  { key: "compras.pedido",         label: "Pedidos" },
  { key: "compras.recebimento",    label: "Recebimentos" },
  { key: "compras.romaneio",       label: "Romaneios / Entregas" },
  { key: "compras.beneficiamento", label: "Beneficiamento" },
  { key: "compras.fornecedor",     label: "Fornecedores (legado)" },
  { key: "compras.documento",      label: "Documentos" },
  { key: "compras.anotacao",       label: "Anotações" },
  { key: "compras.formapagamento", label: "Formas de pagamento" },
  { key: "compras.notificacao",    label: "Notificações (WhatsApp)" },
  { key: "compras.relatorio",      label: "Relatórios" },
];

const STOCK_GRUPOS: { key: string; label: string }[] = [
  { key: "stock.movimentacao", label: "Movimentações" },
  { key: "stock.local",        label: "Locais" },
  { key: "stock.recebimento",  label: "Recebimento" },
];

const CATALOGO_GRUPOS: { key: string; label: string }[] = [
  { key: "catalogo",            label: "Geral" },
  { key: "catalogo.fornecedor", label: "Fornecedores" },
  { key: "catalogo.linha",      label: "Linhas" },
  { key: "catalogo.categoria",  label: "Categorias" },
];

const FINANCEIRO_GRUPOS: { key: string; label: string }[] = [
  { key: "financeiro.carteira",  label: "Carteiras" },
  { key: "financeiro.pedido",    label: "Pedidos (débito/carteira)" },
  { key: "financeiro.dashboard", label: "Dashboard" },
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

    // Permissões de um grupo específico dentro de um módulo (ex: "compras.pedido"
  // dentro de "compras") — casa só um nível abaixo do prefixo, pra um grupo
  // mais genérico ("catalogo") não engolir as chaves de um mais específico
  // ("catalogo.fornecedor"). Vai por chave, não por modulo — modulo tem
  // grafia inconsistente entre migrations (ex: "COMPRAS" vs "compras").
  function permsDoGrupo(lista: Permissao[], key: string): Permissao[] {
    const re = new RegExp(`^${key.replace(/\./g, "\\.")}\\.[^.]+$`);
    return lista.filter((p) => re.test(p.chave));
  }

  function togglePerm(id: string) {
    setPermsIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleModulo(modulo: string, checked: boolean) {
    // Case-insensitive: a coluna modulo tem grafia inconsistente entre
    // migrations (ex: "OBRAS" vs "obras" pra permissões do mesmo módulo).
    const alvo = modulo.toUpperCase();
    const ids = permissoes
      .filter((p) => p.modulo.toUpperCase() === alvo || p.modulo.toUpperCase().startsWith(alvo + "."))
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

  const MODULOS_DISPLAY = [...MODULOS, "catalogo", "compras", "financeiro", "stock"] as const;
  const modulosAtivos = MODULOS_DISPLAY.filter((m) => {
    const alvo = m.toUpperCase();
    return permissoes
      .filter((p) => p.modulo.toUpperCase() === alvo || p.modulo.toUpperCase().startsWith(alvo + "."))
      .some((p) => permsIds.has(p.id));
  });

  return (
    <div ref={setNodeRef} style={style}>
      {!editando ? (
        <div
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-md"
          onClick={() => podeEditar && setEditando(true)}
        >
          {podeEditar && (
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0 cursor-grab text-text-3 active:cursor-grabbing"
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
              <span className="text-sm font-semibold text-text">{cargo.nome}</span>
              {cargo.is_admin && (
                <Badge variant="warning" size="sm">Admin</Badge>
              )}
            </div>
            {cargo.is_admin ? (
              <p className="mt-1 text-[11px] text-text-3">Acesso total</p>
            ) : modulosAtivos.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {modulosAtivos.map((m) => (
                  <Chip key={m} variant="primary" className="text-[10px]">
                    {MODULO_LABEL[m]}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-text-3">Sem permissões</p>
            )}
          </div>
          {podeEditar && (
            <span className="mt-1 shrink-0 text-[11px] text-text-3 opacity-0 group-hover:opacity-100">
              Editar
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-primary bg-surface p-4 shadow-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nome do cargo" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex items-center gap-2">
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-surface p-1" />
                <span className="font-mono text-xs text-text-3">{cor}</span>
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
              className={`relative h-5 w-9 rounded-full transition-colors ${isAdmin ? "bg-amber-500" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isAdmin ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm font-medium text-text">Administrador</span>
            <span className="text-xs text-text-3">(acesso total)</span>
          </label>

          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="px-3 py-2 text-left font-medium text-text-2">Módulo</th>
                  {ACOES.map((a) => (
                    <th key={a} className="px-2 py-2 text-center font-medium text-text-2">{ACAO_LABEL[a]}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium text-text-2">Tudo</th>
                </tr>
              </thead>
              <tbody>
                {MODULOS.map((modulo) => {
                  const mPerms = permissoes.filter((p) => p.modulo.toUpperCase() === modulo.toUpperCase());
                  const todosAtivos = mPerms.length > 0 && mPerms.every((p) => permsIds.has(p.id));
                  return (
                    <tr key={modulo} className="border-b border-border last:border-0 hover:bg-bg/50">
                      <td className="px-3 py-2 font-medium text-text">{MODULO_LABEL[modulo]}</td>
                      {ACOES.map((acao) => {
                        const perm = mPerms.find((p) => p.acao === acao);
                        return (
                          <td key={acao} className="px-2 py-2 text-center">
                            {perm ? (
                              <input type="checkbox"
                                checked={permsIds.has(perm.id) || isAdmin}
                                disabled={isAdmin}
                                onChange={() => togglePerm(perm.id)}
                                className="h-4 w-4 rounded accent-primary"
                              />
                            ) : <span className="text-text-3">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center">
                        <input type="checkbox"
                          checked={todosAtivos || isAdmin}
                          disabled={isAdmin}
                          onChange={(e) => toggleModulo(modulo, e.target.checked)}
                          className="h-4 w-4 rounded accent-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Catálogo — todas as permissões (geral + fornecedores/linhas/categorias) */}
          {!isAdmin && (() => {
            const todosCatalogo = permissoes.filter((p) => p.chave.startsWith("catalogo."));
            if (!todosCatalogo.length) return null;
            const todosMarcados = todosCatalogo.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
                  <span className="text-xs font-medium text-text-2">Catálogo</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const ids = todosCatalogo.map((p) => p.id);
                        setPermsIds((prev) => {
                          const n = new Set(prev);
                          ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    Tudo
                  </label>
                </div>
                <div className="divide-y divide-border">
                  {CATALOGO_GRUPOS.map(({ key, label }) => {
                    const grupoPerms = permsDoGrupo(todosCatalogo, key);
                    if (!grupoPerms.length) return null;
                    return (
                      <div key={key} className="px-3 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {grupoPerms.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox"
                                checked={permsIds.has(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="text-xs text-text">{p.nome}</span>
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

          {/* Compras — permissões granulares */}
          {!isAdmin && (() => {
            const todosCompras = permissoes.filter((p) => p.chave.startsWith("compras."));
            if (!todosCompras.length) return null;
            const todosMarcados = todosCompras.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
                  <span className="text-xs font-medium text-text-2">Compras</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const ids = todosCompras.map((p) => p.id);
                        setPermsIds((prev) => {
                          const n = new Set(prev);
                          ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    Tudo
                  </label>
                </div>
                <div className="divide-y divide-border">
                  {COMPRAS_GRUPOS.map(({ key, label }) => {
                    const grupoPerms = permsDoGrupo(todosCompras, key);
                    if (!grupoPerms.length) return null;
                    return (
                      <div key={key} className="px-3 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {grupoPerms.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox"
                                checked={permsIds.has(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="text-xs text-text">{p.nome}</span>
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

          {/* Pacotes de Trabalho — contexto de Compras (necessidades de material) */}
          {!isAdmin && (() => {
            const todosPacoteCompras = permissoes.filter((p) => p.chave.startsWith("frame.pacotes.compras."));
            if (!todosPacoteCompras.length) return null;
            const todosMarcados = todosPacoteCompras.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
                  <span className="text-xs font-medium text-text-2">Pacotes de Trabalho (Compras)</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const ids = todosPacoteCompras.map((p) => p.id);
                        setPermsIds((prev) => {
                          const n = new Set(prev);
                          ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    Tudo
                  </label>
                </div>
                <div className="px-3 py-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {todosPacoteCompras.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox"
                          checked={permsIds.has(p.id)}
                          onChange={() => togglePerm(p.id)}
                          className="h-3.5 w-3.5 rounded accent-primary"
                        />
                        <span className="text-xs text-text">{p.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Financeiro — permissões granulares */}
          {!isAdmin && (() => {
            const todosFinanceiro = permissoes.filter((p) => p.chave.startsWith("financeiro."));
            if (!todosFinanceiro.length) return null;
            const todosMarcados = todosFinanceiro.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
                  <span className="text-xs font-medium text-text-2">Financeiro</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const ids = todosFinanceiro.map((p) => p.id);
                        setPermsIds((prev) => {
                          const n = new Set(prev);
                          ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    Tudo
                  </label>
                </div>
                <div className="divide-y divide-border">
                  {FINANCEIRO_GRUPOS.map(({ key, label }) => {
                    const grupoPerms = permsDoGrupo(todosFinanceiro, key);
                    if (!grupoPerms.length) return null;
                    return (
                      <div key={key} className="px-3 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {grupoPerms.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox"
                                checked={permsIds.has(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="text-xs text-text">{p.nome}</span>
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

          {/* Estoque (SquadStock) — nunca tinha seção nenhuma aqui, mesmo
              existindo permissões stock.* no banco desde antes; não dava
              pra conceder por essa tela de jeito nenhum. */}
          {!isAdmin && (() => {
            const todosStock = permissoes.filter((p) => p.chave.startsWith("stock."));
            if (!todosStock.length) return null;
            const todosMarcados = todosStock.every((p) => permsIds.has(p.id));
            return (
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-bg px-3 py-2">
                  <span className="text-xs font-medium text-text-2">Estoque</span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-2">
                    <input type="checkbox"
                      checked={todosMarcados}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const ids = todosStock.map((p) => p.id);
                        setPermsIds((prev) => {
                          const n = new Set(prev);
                          ids.forEach((id) => (checked ? n.add(id) : n.delete(id)));
                          return n;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded accent-primary"
                    />
                    Tudo
                  </label>
                </div>
                <div className="divide-y divide-border">
                  {STOCK_GRUPOS.map(({ key, label }) => {
                    const grupoPerms = permsDoGrupo(todosStock, key);
                    if (!grupoPerms.length) return null;
                    return (
                      <div key={key} className="px-3 py-2">
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {grupoPerms.map((p) => (
                            <label key={p.id} className="flex cursor-pointer items-center gap-2">
                              <input type="checkbox"
                                checked={permsIds.has(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="text-xs text-text">{p.nome}</span>
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

          {erro && <p className="mt-3 text-xs text-danger">{erro}</p>}

          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditando(false); setErro(null); }} disabled={pending}>
              Cancelar
            </Button>
            <button onClick={handleExcluir} disabled={pending}
              className="ml-auto text-xs text-text-3 hover:text-danger disabled:opacity-50">
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
  // useState(cargosInit) só usa o valor inicial no primeiro mount — sem isso,
  // router.refresh() (manual ou via RealtimeRefresher) busca dados novos no
  // servidor, mas esse componente cliente nunca via essa atualização: a
  // lista de cargos/setores ficava congelada pra sempre no que existia no
  // carregamento da página. Mesmo padrão já usado em UsuariosCliente.
  useEffect(() => { setSetores(setoresInit); }, [setoresInit]);
  useEffect(() => { setCargos(cargosInit); }, [cargosInit]);
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
  const { status: overlayStatus, run: runComOverlay } = useLoadingOverlay();

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
      await runComOverlay(() => criarSetor(fd));
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
      await runComOverlay(() => criarCargo(fd));
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
          ${ativo ? "bg-primary/10 font-medium text-primary sm:border-r-2 sm:bg-primary/5" : "text-text-2 hover:bg-bg hover:text-text"}`}
        style={ativo ? { borderRightColor: s.cor } : {}}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
        <span className="flex-1 text-left">{s.nome}</span>
        <span className={`text-xs ${ativo ? "text-primary/70" : "text-text-3"}`}>{count}</span>
      </button>
    );
  }

  return (
    <>
      {overlayStatus && (
        <LoadingOverlay status={overlayStatus} label={overlayStatus === "loading" ? "Salvando…" : "Feito!"} />
      )}
    <div className="flex flex-col sm:flex-row sm:h-[calc(100dvh-56px-env(safe-area-inset-top))]">
      {/* ── Cabeçalho mobile (back + título) ──────────── */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:hidden">
        <BackButton href="/squadframe/usuarios" />
        <p className="text-xs font-semibold uppercase tracking-widest text-text-3">Cargos</p>
      </div>

      {/* ── Tabs de setor (mobile: scroll horizontal) ─── */}
      <div className="flex overflow-x-auto gap-1 border-b border-border bg-surface px-3 py-2 sm:hidden">
        {setores.map((s) => <SetorBtn key={s.id} s={s} />)}
        {podeGerenciar && !adicionandoSetor && (
          <button
            onClick={() => setAdicionandoSetor(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-3 hover:border-primary hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo setor
          </button>
        )}
      </div>
      {adicionandoSetor && (
        <div className="border-b border-border bg-surface px-3 py-2 space-y-2 sm:hidden">
          <NovoSetorFields
            nomeSetor={nomeSetor} setNomeSetor={setNomeSetor}
            corSetor={corSetor} setCorSetor={setCorSetor}
            onCriar={handleCriarSetor} pending={pending}
            onCancelar={() => setAdicionandoSetor(false)}
          />
        </div>
      )}

      {/* ── Sidebar de setores (desktop) ──────────────── */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <BackButton href="/squadframe/usuarios" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-text-3">Setores</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {setores.map((s) => <SetorBtn key={s.id} s={s} />)}
        </nav>

        {podeGerenciar && (
          <div className="border-t border-border p-3">
            {adicionandoSetor ? (
              <div className="space-y-2">
                <NovoSetorFields
                  nomeSetor={nomeSetor} setNomeSetor={setNomeSetor}
                  corSetor={corSetor} setCorSetor={setCorSetor}
                  onCriar={handleCriarSetor} pending={pending}
                  onCancelar={() => setAdicionandoSetor(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setAdicionandoSetor(true)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-text-3 hover:bg-bg hover:text-text"
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
          <div className="flex h-full items-center justify-center text-sm text-text-3">
            Selecione um setor
          </div>
        ) : (
          <div className="px-8 py-6">
            {/* Cabeçalho */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: setor.cor }} />
                <h2 className="text-xl font-bold text-text">{setor.nome}</h2>
                <span className="text-sm text-text-3">{cargosDoSetor.length} cargos</span>
              </div>
              {podeGerenciar && !adicionandoCargo && (
                <Button onClick={() => setAdicionandoCargo(true)}>
                  Novo cargo
                </Button>
              )}
            </div>

            {/* Formulário novo cargo */}
            {podeGerenciar && adicionandoCargo && (
              <div className="mb-4 rounded-lg border border-primary bg-surface p-4">
                <p className="mb-3 text-sm font-semibold text-text">Novo cargo em {setor.nome}</p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="Nome"
                      autoFocus value={nomeCargo}
                      onChange={(e) => setNomeCargo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCriarCargo()}
                      placeholder="Ex: Gerente de Produção"
                    />
                  </div>
                  <div>
                    <label className="label">Cor</label>
                    <input type="color" value={corCargo} onChange={(e) => setCorCargo(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border border-border p-1" />
                  </div>
                  <Button onClick={handleCriarCargo} disabled={pending}>
                    {pending ? "…" : "Criar cargo"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setAdicionandoCargo(false); setNomeCargo(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de cargos */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cargosDoSetor.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {cargosDoSetor.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-text-3">
                      Nenhum cargo neste setor.
                      {podeGerenciar && (
                        <button onClick={() => setAdicionandoCargo(true)} className="mt-2 block w-full text-primary hover:underline">
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
    </>
  );
}
