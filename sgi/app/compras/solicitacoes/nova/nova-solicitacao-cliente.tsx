"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { criarSolicitacao } from "@/app/compras/actions";
import { AssinarModal } from "@/components/assinar-modal";

const UNIDADES = [
  "un", "m", "m²", "m³", "kg", "g", "L", "ml",
  "barra", "peça", "caixa", "rolo", "folha", "chapa",
  "saco", "tubo", "par", "kit", "jogo", "conjunto", "vb",
];

type Obra = { id: string; nome: string; codigo: string };
type CorRal = { id: string; codigo_ral: string; nome: string | null; tipos?: string[] | null };
type Produto = { id: string; codigo_mestre: string; nome: string; unidade: string };

type ItemCatalogo = { tipo: "catalogo"; produto: Produto; quantidade: number; unidade: string; observacoes: string; cor_id?: string };
type ItemExterno  = { tipo: "externo"; descricao: string; quantidade: number; unidade: string; observacoes: string; cor_id?: string };
type Item = ItemCatalogo | ItemExterno;

function BuscaProduto({ onAdd, onAddForcar, onIncrement, existingIds }: {
  onAdd: (p: Produto) => void;
  onAddForcar: (p: Produto) => void;
  onIncrement: (produtoId: string, delta: number) => void;
  existingIds: Set<string>;
}) {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [aberto, setAberto] = useState(false);
  const [qtdExtra, setQtdExtra] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setAberto(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/produtos/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResultados(data);
      setAberto(true);
    }, 280);
  }, [q]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar produto por código ou nome…"
        className="field h-9 w-full text-sm"
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-surface shadow-lg">
          {resultados.map((p) => {
            const jaExiste = existingIds.has(p.id);
            const qtd = qtdExtra[p.id] ?? 1;
            if (jaExiste) {
              return (
                <div key={p.id} className="px-3 py-2 border-b border-line last:border-0 bg-amber-50/60">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-24 shrink-0 font-mono text-xs text-ink-faint">{p.codigo_mestre}</span>
                    <span className="flex-1 text-sm text-ink">{p.nome}</span>
                    <span className="text-xs text-amber-600 font-medium">Já na lista</span>
                  </div>
                  <div className="flex items-center gap-2 pl-[6.5rem]">
                    <span className="text-xs text-ink-faint">Adicionar mais:</span>
                    <input type="number" min="1" step="any" value={qtd}
                      onChange={(e) => setQtdExtra((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 1 }))}
                      onClick={(e) => e.stopPropagation()}
                      className="field h-7 w-20 text-xs font-mono" />
                    <span className="text-xs text-ink-faint">{p.unidade}</span>
                    <button type="button"
                      onClick={() => { onIncrement(p.id, qtd); setQtdExtra((prev) => ({ ...prev, [p.id]: 1 })); setQ(""); setAberto(false); }}
                      className="btn-primary h-7 px-3 text-xs">
                      Confirmar
                    </button>
                    <button type="button"
                      onClick={() => { onAddForcar(p); setQ(""); setAberto(false); }}
                      className="btn-secondary h-7 px-3 text-xs">
                      + Cor diferente
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <button key={p.id} type="button"
                onClick={() => { onAdd(p); setQ(""); setAberto(false); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-canvas border-b border-line last:border-0">
                <span className="w-24 shrink-0 font-mono text-xs text-ink-faint">{p.codigo_mestre}</span>
                <span className="flex-1 text-ink">{p.nome}</span>
                <span className="text-xs text-ink-faint">{p.unidade}</span>
              </button>
            );
          })}
        </div>
      )}
      {aberto && q.length >= 2 && resultados.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-surface px-3 py-3 shadow-lg text-sm text-ink-faint">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  );
}

function FormItemExterno({ onAdd }: { onAdd: (item: ItemExterno) => void }) {
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade]     = useState("un");
  const [quantidade, setQtd]      = useState(1);
  const [obs, setObs]             = useState("");

  function handleAdd() {
    if (!descricao.trim()) return;
    onAdd({ tipo: "externo", descricao: descricao.trim(), quantidade, unidade, observacoes: obs });
    setDescricao(""); setUnidade("un"); setQtd(1); setObs("");
  }

  return (
    <div className="rounded-lg border border-dashed border-steel/40 bg-steel/5 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-steel/70">Item externo (não cadastrado)</p>
      <div className="flex flex-wrap gap-2">
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descrição do item *"
          className="field h-8 min-w-[200px] flex-1 text-sm" />
        <select value={unidade} onChange={(e) => setUnidade(e.target.value)}
          className="field h-8 w-28 text-sm">
          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" min="0" step="any" value={quantidade}
          onChange={(e) => setQtd(parseFloat(e.target.value) || 1)}
          className="field h-8 w-24 text-sm" />
        <input value={obs} onChange={(e) => setObs(e.target.value)}
          placeholder="Obs. (opcional)" className="field h-8 flex-1 text-sm" />
        <button type="button" onClick={handleAdd} disabled={!descricao.trim()}
          className="btn-primary h-8 px-3 text-sm disabled:opacity-40">
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function NovaSolicitacaoCliente({ obras, coresRal }: { obras: Obra[]; coresRal: CorRal[] }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [modoAdd, setModoAdd] = useState<"catalogo" | "externo">("catalogo");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);

  function addCatalogo(p: Produto, forcar = false) {
    if (!forcar && itens.find((i) => i.tipo === "catalogo" && (i as ItemCatalogo).produto.id === p.id)) return;
    setItens((prev) => [...prev, { tipo: "catalogo", produto: p, quantidade: 1, unidade: p.unidade, observacoes: "", cor_id: "" }]);
  }

  function addExterno(item: ItemExterno) {
    setItens((prev) => [...prev, { ...item, cor_id: "" }]);
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: "quantidade" | "unidade" | "observacoes" | "cor_id", value: string | number | undefined) {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itens.length) { setErro("Adicione ao menos um item."); return; }
    setErro(null);
    const fd = new FormData(e.currentTarget);
    fd.set("itens", JSON.stringify(itens.map((i) => {
      const cor_id = i.cor_id || undefined;
      return i.tipo === "catalogo"
        ? { produto_id: i.produto.id, quantidade: i.quantidade, unidade: i.unidade, observacoes: i.observacoes || undefined, cor_id }
        : { descricao_manual: i.descricao, quantidade: i.quantidade, unidade: i.unidade, observacoes: i.observacoes || undefined, cor_id };
    })));
    pendingFn.current = async () => {
      start(async () => {
        try { await criarSolicitacao(fd); }
        catch (err: any) { setErro(err.message); }
      });
    };
    setModalAcao("Criar Solicitação de Compra");
  }

  return (
    <>
      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Obra <span className="text-ink-faint font-normal">(opcional)</span></label>
              <select name="obra_id" className="field">
                <option value="">Sem obra vinculada</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select name="origem" className="field" defaultValue="OBRA">
                <option value="OBRA">Obra</option>
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="MANUTENCAO">Manutenção</option>
              </select>
            </div>
            <div>
              <label className="label">Prioridade</label>
              <select name="prioridade" className="field" defaultValue="NORMAL">
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="label">Justificativa <span className="text-ink-faint font-normal">(opcional)</span></label>
              <input name="justificativa" className="field" placeholder="Motivo da solicitação" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações <span className="text-ink-faint font-normal">(opcional)</span></label>
              <textarea name="observacoes" rows={2} className="field" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Itens da solicitação</h2>
            <div className="flex rounded-lg border border-line overflow-hidden text-sm">
              <button type="button"
                onClick={() => setModoAdd("catalogo")}
                className={`px-3 py-1.5 ${modoAdd === "catalogo" ? "bg-steel text-white" : "bg-surface text-ink-soft hover:bg-canvas"}`}>
                Do catálogo
              </button>
              <button type="button"
                onClick={() => setModoAdd("externo")}
                className={`px-3 py-1.5 border-l border-line ${modoAdd === "externo" ? "bg-steel text-white" : "bg-surface text-ink-soft hover:bg-canvas"}`}>
                Item externo
              </button>
            </div>
          </div>

          {modoAdd === "catalogo" ? (
            <BuscaProduto
              onAdd={addCatalogo}
              onAddForcar={(p) => addCatalogo(p, true)}
              onIncrement={(id, delta) => setItens((prev) => prev.map((it) =>
                it.tipo === "catalogo" && (it as ItemCatalogo).produto.id === id
                  ? { ...it, quantidade: (it.quantidade ?? 0) + delta }
                  : it
              ))}
              existingIds={new Set(itens.filter((i): i is ItemCatalogo => i.tipo === "catalogo").map((i) => i.produto.id))}
            />
          ) : (
            <FormItemExterno onAdd={addExterno} />
          )}

          {itens.length > 0 && (
            <div className="mt-3 card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-2 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Descrição / Produto</th>
                    <th className="px-4 py-2 font-medium w-24">Qtd</th>
                    <th className="px-4 py-2 font-medium w-20">Unid.</th>
                    {coresRal.length > 0 && <th className="px-4 py-2 font-medium w-40">Cor</th>}
                    <th className="px-4 py-2 font-medium">Obs.</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => (
                    <tr key={idx} className="border-b border-line last:border-0">
                      <td className="px-4 py-2">
                        {it.tipo === "catalogo" ? (
                          <span className="font-mono text-xs text-ink-faint">{(it as ItemCatalogo).produto.codigo_mestre}</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">EXTERNO</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-ink">
                        {it.tipo === "catalogo" ? (it as ItemCatalogo).produto.nome : (it as ItemExterno).descricao}
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="any" value={it.quantidade}
                          onChange={(e) => updateItem(idx, "quantidade", parseFloat(e.target.value) || 1)}
                          className="field h-8 w-24 text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={it.unidade}
                          onChange={(e) => updateItem(idx, "unidade", e.target.value)}
                          className="field h-8 w-24 text-sm">
                          {Array.from(new Set([it.unidade, ...UNIDADES])).map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      {coresRal.length > 0 && (
                        <td className="px-4 py-2">
                          <select
                            value={it.cor_id}
                            onChange={(e) => updateItem(idx, "cor_id", e.target.value)}
                            className="field h-8 w-40 text-xs"
                          >
                            <option value="">— Sem cor —</option>
                            {coresRal.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <input value={it.observacoes}
                          onChange={(e) => updateItem(idx, "observacoes", e.target.value)}
                          placeholder="opcional"
                          className="field h-8 text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-ink-faint hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {itens.length === 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-line p-8 text-center text-sm text-ink-faint">
              {modoAdd === "catalogo" ? "Busque e adicione produtos acima." : "Preencha os campos acima e clique em Adicionar."}
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Salvando…" : "Criar solicitação"}
          </button>
          <a href="/compras/solicitacoes" className="btn-ghost">Cancelar</a>
        </div>
      </form>
    </>
  );
}
