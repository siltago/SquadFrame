"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { criarSolicitacao } from "@/app/squadframe/compras/actions";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { Button } from "@/ui/components/Button";
import { BuscaProduto } from "@/modules/squadframe/components/compras/busca-produto";
import { SegmentedToggle } from "@/ui/components/SegmentedToggle";
import { Input, Textarea } from "@/ui/components/Input";
import { LoadingOverlay } from "@/ui/components/LoadingOverlay";
import { useLoadingOverlay } from "@/ui/lib/use-loading-overlay";
import { isChapa } from "@/modules/squadframe/lib/chapa";

const UNIDADES = [
  "un", "m", "m²", "m³", "kg", "g", "L", "ml",
  "barra", "peça", "caixa", "rolo", "folha", "chapa",
  "saco", "tubo", "par", "kit", "jogo", "conjunto", "vb",
];

type Obra = { id: string; nome: string; codigo: string };
type CorRal = { id: string; codigo_ral: string; nome: string | null; tipos?: string[] | null };
type Produto = { id: string; codigo_mestre: string; nome: string; unidade: string };
type TipoLinha = { id: string; nome: string; slug: string };
type Fornecedor = { id: string; nome: string; tipos?: string[] | null };

// Dimensões só fazem sentido pra item de CHAPA/M²/M2 (ver isChapa em
// lib/chapa.ts) — quantidade guarda a contagem de peças nesse caso, a área
// é só exibida como conferência, mesma convenção de pedido_itens.
type ItemCatalogo = { tipo: "catalogo"; produto: Produto; quantidade: number; unidade: string; observacoes: string; cor_id?: string; largura_m?: number | null; altura_m?: number | null; qtd_pecas?: number | null };
type ItemExterno  = { tipo: "externo"; descricao: string; quantidade: number; unidade: string; observacoes: string; cor_id?: string; largura_m?: number | null; altura_m?: number | null; qtd_pecas?: number | null };
type Item = ItemCatalogo | ItemExterno;

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
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary/70">Item externo (não cadastrado)</p>
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
          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 h-8 disabled:opacity-40">
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function NovaSolicitacaoCliente({
  obras,
  coresRal,
  defaultObraId,
  loteId,
  loteNome,
  origemContexto,
  tiposLinha,
  fornecedores,
}: {
  obras: Obra[];
  coresRal: CorRal[];
  defaultObraId?: string | null;
  loteId?: string | null;
  loteNome?: string | null;
  origemContexto?: string | null;
  tiposLinha: TipoLinha[];
  fornecedores: Fornecedor[];
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [modoAdd, setModoAdd] = useState<"catalogo" | "externo">("catalogo");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const { status: overlayStatus, run: runComOverlay } = useLoadingOverlay();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoLinha | null>(null);
  const [fornecedorId, setFornecedorId] = useState("");

  // Sem tipo escolhido, mostra todos; com tipo, só os fornecedores
  // cadastrados pra ele — mesmo filtro do Novo Pedido.
  const fornecedoresVisiveis = tipoSelecionado
    ? fornecedores.filter((f) => (f.tipos ?? []).includes(tipoSelecionado.slug))
    : fornecedores;
  // Mesmo filtro de cor por tipo do Novo Pedido — sem isso, cor de Vidro
  // aparecia como opção num pedido de Perfil e vice-versa.
  const coresFiltradas = tipoSelecionado
    ? coresRal.filter((c) => (c.tipos ?? []).includes(tipoSelecionado.slug))
    : coresRal;

  function addCatalogo(p: Produto, forcar = false) {
    if (!forcar && itens.find((i) => i.tipo === "catalogo" && (i as ItemCatalogo).produto.id === p.id)) return;
    const chapa = isChapa({ unidade: p.unidade });
    setItens((prev) => [...prev, {
      tipo: "catalogo", produto: p, quantidade: 1, unidade: p.unidade, observacoes: "", cor_id: "",
      ...(chapa ? { qtd_pecas: 1, largura_m: null, altura_m: null } : {}),
    }]);
  }

  function addExterno(item: ItemExterno) {
    const chapa = isChapa({ unidade: item.unidade });
    setItens((prev) => [...prev, {
      ...item, cor_id: "",
      ...(chapa ? { qtd_pecas: item.quantidade || 1, largura_m: null, altura_m: null } : {}),
    }]);
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(
    idx: number,
    field: "quantidade" | "unidade" | "observacoes" | "cor_id" | "largura_m" | "altura_m" | "qtd_pecas",
    value: string | number | null | undefined,
  ) {
    setItens((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [field]: value } as Item;
      // qtd_pecas é a própria quantidade solicitada quando é chapa (mesma
      // convenção de pedido_itens — a área é só conferência).
      if (field === "qtd_pecas") next.quantidade = (value as number) || 1;
      return next;
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itens.length) { setErro("Adicione ao menos um item."); return; }
    setErro(null);
    const fd = new FormData(e.currentTarget);
    if (tipoSelecionado) fd.set("tipo_linha", tipoSelecionado.slug);
    fd.set("itens", JSON.stringify(itens.map((i) => {
      const cor_id = i.cor_id || undefined;
      const chapaFields = isChapa(i)
        ? { largura_m: i.largura_m || undefined, altura_m: i.altura_m || undefined, qtd_pecas: i.qtd_pecas || undefined }
        : {};
      return i.tipo === "catalogo"
        ? { produto_id: i.produto.id, quantidade: i.quantidade, unidade: i.unidade, observacoes: i.observacoes || undefined, cor_id, ...chapaFields }
        : { descricao_manual: i.descricao, quantidade: i.quantidade, unidade: i.unidade, observacoes: i.observacoes || undefined, cor_id, ...chapaFields };
    })));
    pendingFn.current = async () => {
      start(async () => {
        try { await runComOverlay(() => criarSolicitacao(fd)); }
        catch (err: any) { setErro(err.message); }
      });
    };
    setModalAcao("Criar Solicitação de Compra");
  }

  return (
    <>
      {overlayStatus && (
        <LoadingOverlay status={overlayStatus} label={overlayStatus === "loading" ? "Enviando…" : "Feito!"} />
      )}

      {modalAcao && (
        <AssinarModal
          acao={modalAcao}
          onConfirm={async () => { setModalAcao(null); await pendingFn.current?.(); }}
          onCancel={() => setModalAcao(null)}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {loteId && (
          <input type="hidden" name="lote_id" value={loteId} />
        )}
        {origemContexto && (
          <input type="hidden" name="origem_contexto" value={origemContexto} />
        )}
        {loteNome && (
          <div className="rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5 text-sm text-text">
            Vinculada ao lote <strong>{loteNome}</strong>
          </div>
        )}

        {/* Tipo de material */}
        {tiposLinha.length > 0 && (
          <div className="card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">
              Tipo de material{tipoSelecionado && (
                <span className="ml-2 font-normal normal-case text-primary">{tipoSelecionado.nome}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {tiposLinha.map((t) => (
                <button key={t.slug} type="button"
                  onClick={() => setTipoSelecionado(tipoSelecionado?.slug === t.slug ? null : t)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    tipoSelecionado?.slug === t.slug
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-2 hover:bg-bg"
                  }`}>
                  {t.nome}
                </button>
              ))}
              {tipoSelecionado && (
                <button type="button" onClick={() => setTipoSelecionado(null)}
                  className="text-xs text-text-3 hover:text-text underline ml-1">
                  Limpar tipo
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Obra <span className="text-text-3 font-normal">(opcional)</span></label>
              <select name="obra_id" className="field" defaultValue={defaultObraId ?? ""}>
                <option value="">Sem obra vinculada</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.codigo} — {o.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fornecedor <span className="text-text-3 font-normal">(opcional, se já souber)</span></label>
              <select name="fornecedor_id" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className="field">
                <option value="">Ainda não sei</option>
                {fornecedoresVisiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              {tipoSelecionado && fornecedoresVisiveis.length === 0 && (
                <p className="mt-1 text-xs text-text-3">Nenhum fornecedor de {tipoSelecionado.nome} cadastrado ainda.</p>
              )}
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
              <label className="label">Justificativa <span className="text-text-3 font-normal">(opcional)</span></label>
              <Input name="justificativa" placeholder="Motivo da solicitação" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações <span className="text-text-3 font-normal">(opcional)</span></label>
              <Textarea name="observacoes" rows={2} />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Itens da solicitação</h2>
            <SegmentedToggle
              value={modoAdd}
              onChange={setModoAdd}
              className="flex rounded-lg border border-border overflow-hidden text-sm"
              options={[{ value: "catalogo", label: "Do catálogo" }, { value: "externo", label: "Item externo" }]}
            />
          </div>

          <div className="mb-4 rounded-lg bg-bg p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">Adicionar item</p>
            {modoAdd === "catalogo" && !tipoSelecionado && tiposLinha.length > 0 && (
              <p className="mb-2 text-xs text-warning">
                Selecione o tipo de material acima para filtrar os produtos por categoria.
              </p>
            )}
            {modoAdd === "catalogo" ? (
              <BuscaProduto
                placeholder="Buscar produto por código ou nome…"
                tipoSlug={tipoSelecionado?.slug ?? ""}
                fornecedorId={fornecedorId}
                nomeFornecedor={fornecedores.find((f) => f.id === fornecedorId)?.nome ?? ""}
                onAdd={addCatalogo}
                onAddForcar={(p) => addCatalogo(p, true)}
                onIncrement={(id, delta) => setItens((prev) => prev.map((it) =>
                  it.tipo === "catalogo" && (it as ItemCatalogo).produto.id === id
                    ? { ...it, quantidade: (it.quantidade ?? 0) + delta }
                    : it
                ))}
                existingQtds={new Map(itens.filter((i): i is ItemCatalogo => i.tipo === "catalogo").map((i) => [i.produto.id, i.quantidade ?? 0]))}
              />
            ) : (
              <FormItemExterno onAdd={addExterno} />
            )}
          </div>

          {itens.length > 0 && (
            <div className="mt-3 card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
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
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        {it.tipo === "catalogo" ? (
                          <span className="font-mono text-xs text-text-3">{(it as ItemCatalogo).produto.codigo_mestre}</span>
                        ) : (
                          <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-bold text-warning">EXTERNO</span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-text">
                        {it.tipo === "catalogo" ? (it as ItemCatalogo).produto.nome : (it as ItemExterno).descricao}
                      </td>
                      <td className="px-4 py-2">
                        {isChapa(it) ? (
                          <div className="flex flex-col gap-1 min-w-[170px]">
                            <div className="flex items-center gap-1">
                              <input type="number" min="0" step="1" placeholder="L mm"
                                value={it.largura_m != null ? Math.round(it.largura_m * 1000) : ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  updateItem(idx, "largura_m", isNaN(v) ? null : v / 1000);
                                }}
                                className="field h-7 w-16 text-xs" />
                              <span className="text-xs text-text-3">×</span>
                              <input type="number" min="0" step="1" placeholder="A mm"
                                value={it.altura_m != null ? Math.round(it.altura_m * 1000) : ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  updateItem(idx, "altura_m", isNaN(v) ? null : v / 1000);
                                }}
                                className="field h-7 w-16 text-xs" />
                            </div>
                            <div className="flex items-center gap-1">
                              <input type="number" min="1" step="1" placeholder="Qtd pç"
                                value={it.qtd_pecas ?? 1}
                                onChange={(e) => updateItem(idx, "qtd_pecas", parseInt(e.target.value) || 1)}
                                className="field h-7 w-16 text-xs" />
                              <span className="text-[10px] text-text-3">peças</span>
                            </div>
                            {it.largura_m && it.altura_m && it.qtd_pecas && (
                              <p className="text-[10px] text-text-3">
                                {(it.largura_m * it.altura_m * it.qtd_pecas).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m²
                              </p>
                            )}
                          </div>
                        ) : (
                          <input type="number" min="0" step="any" value={it.quantidade}
                            onChange={(e) => updateItem(idx, "quantidade", parseFloat(e.target.value) || 1)}
                            className="field h-8 w-24 text-sm" />
                        )}
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
                            {coresFiltradas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}
                              </option>
                            ))}
                          </select>
                          {tipoSelecionado && coresFiltradas.length === 0 && (
                            <p className="mt-1 text-[10px] text-text-3">Nenhuma cor de {tipoSelecionado.nome}.</p>
                          )}
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
                          className="text-text-3 hover:text-danger">
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
            <div className="mt-3 rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-3">
              {modoAdd === "catalogo" ? "Busque e adicione produtos acima." : "Preencha os campos acima e clique em Adicionar."}
            </div>
          )}
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Criar solicitação"}
          </Button>
          <Button as="a" variant="ghost" href="/squadframe/compras/solicitacoes">Cancelar</Button>
        </div>
      </form>
    </>
  );
}
