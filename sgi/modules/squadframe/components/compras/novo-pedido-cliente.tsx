"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { criarPedido } from "@/app/squadframe/compras/actions";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { calcMedida, calcPesoTotal, calcPrecoUnit } from "@/modules/squadframe/lib/tipo-unidade";
import { Button } from "@/ui/components/Button";
import { Badge } from "@/ui/components/Badge";
import { Alert } from "@/ui/components/Alert";

type Obra = { id: string; nome: string; codigo: string; numero?: number | null };
type Fornecedor = { id: string; nome: string; tipos?: string[] | null };
type FormaPagamento = { id: string; nome: string; is_faturamento_direto?: boolean };
type TipoLinha = { id: string; nome: string; slug: string; unidade?: string | null }
type CorRal = { id: string; codigo_ral: string; nome: string | null; hex: string | null; tipos: string[] };
type Produto = {
  id: string; codigo_mestre: string; nome: string; unidade: string;
  codigo_do_fornecedor?: string | null;
  peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null;
};
type SolItem = { id: string; quantidade: number; unidade: string; observacoes?: string; descricao_manual?: string | null; produto?: Produto | null };
type Solicitacao = { id: string; numero: string; obra: any; itens: SolItem[] };
type Item = {
  produto?: Produto | null; quantidade_pedida: number; unidade: string; preco_unitario: number;
  codigo_fornecedor: string; descricao_snapshot: string;
  peso_metro?: number | null; preco_metro?: number | null; tamanho_mm?: number | null;
  // Dimensões para CHAPA (largura × altura × qtd_pecas); espessura vem de tamanho_mm do produto
  largura_m?: number | null; altura_m?: number | null; qtd_pecas?: number | null;
  cor_id?: string | null;
  obra_id?: string; solicitacao_item_id?: string;
};

function isChapa(it: Item) {
  return ["CHAPA","M²","M2"].includes((it.unidade ?? "").toUpperCase());
}

// Para CHAPA: área total = largura × altura × qtd_pecas
// Para outros: usa quantidade_pedida normalmente
function itemAreaChapa(it: Item): number | null {
  if (!isChapa(it)) return null;
  if (it.largura_m && it.altura_m && it.qtd_pecas) {
    return it.largura_m * it.altura_m * it.qtd_pecas;
  }
  return null;
}

function itemMedida(it: Item) {
  const area = itemAreaChapa(it);
  if (area != null) return { valor: area, sufixo: "m²" };
  return calcMedida(it.quantidade_pedida, it.unidade, it.tamanho_mm);
}
const FATOR_MASSA_CHAPA = 0.0000025;
function itemPeso(it: Item) {
  // Chapa: L(mm) × A(mm) × espessura(mm) × 0.0000025 × qtd_pecas
  // espessura vem de tamanho_mm do produto
  if (isChapa(it) && it.largura_m && it.altura_m && it.tamanho_mm && it.qtd_pecas) {
    return it.largura_m * 1000 * it.altura_m * 1000 * it.tamanho_mm * FATOR_MASSA_CHAPA * it.qtd_pecas;
  }
  const area = itemAreaChapa(it);
  if (area != null && it.peso_metro) return area * it.peso_metro;
  return calcPesoTotal(it.quantidade_pedida, it.unidade, it.tamanho_mm, it.peso_metro);
}

// ── BuscaProduto ──────────────────────────────────────────────────
function BuscaProduto({ tipoSlug, fornecedorId, corId, nomeFornecedor, onAdd, onAddForcar, onIncrement, existingIds }: {
  tipoSlug: string; fornecedorId: string; corId?: string; nomeFornecedor: string;
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

  useEffect(() => { setQ(""); setResultados([]); setAberto(false); }, [tipoSlug, fornecedorId]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) { setResultados([]); setAberto(false); return; }
    timer.current = setTimeout(async () => {
      const params = new URLSearchParams({ q });
      if (tipoSlug) params.set("tipo", tipoSlug);
      if (fornecedorId) params.set("fornecedor_id", fornecedorId);
      // Cor única do pedido — resolve o código do fornecedor específico da
      // cor quando o produto tem alias por cor (ex: FEC325PTR/FEC325BRC).
      if (corId) params.set("cor_id", corId);
      const res = await fetch(`/api/produtos/search?${params}`);
      setResultados(await res.json());
      setAberto(true);
    }, 280);
  }, [q, tipoSlug, fornecedorId, corId]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={tipoSlug ? `Buscar produto (código mestre, alias ou código do fornecedor)…` : "Buscar produto…"}
        className="field h-9 w-full text-sm" />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          {resultados.map((p) => {
            const temCodigoForn = p.codigo_do_fornecedor && p.codigo_do_fornecedor !== p.codigo_mestre;
            const jaExiste = existingIds.has(p.id);
            const qtd = qtdExtra[p.id] ?? 1;
            if (jaExiste) {
              return (
                <div key={p.id} className="px-3 py-2 border-b border-border last:border-0 bg-warning-soft/60">
                  <div className="flex w-full items-center gap-3 mb-1.5">
                    <span className="font-mono text-xs text-text-3 w-24 shrink-0">{p.codigo_mestre}</span>
                    <span className="flex-1 text-sm text-text">{p.nome}</span>
                    <span className="text-xs text-warning font-medium shrink-0">Já no pedido</span>
                  </div>
                  <div className="flex items-center gap-2 pl-[6.5rem]">
                    <span className="text-xs text-text-3">Adicionar mais:</span>
                    <input
                      type="number" min="1" step="any" value={qtd}
                      onChange={(e) => setQtdExtra((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 1 }))}
                      onClick={(e) => e.stopPropagation()}
                      className="field h-7 w-20 text-xs font-mono"
                    />
                    <span className="text-xs text-text-3">{p.unidade}</span>
                    <Button
                      type="button" size="sm"
                      onClick={() => { onIncrement(p.id, qtd); setQtdExtra((prev) => ({ ...prev, [p.id]: 1 })); setQ(""); setAberto(false); }}
                      className="h-7 px-3 text-xs"
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button" variant="secondary" size="sm"
                      onClick={() => { onAddForcar(p); setQ(""); setAberto(false); }}
                      className="h-7 px-3 text-xs"
                    >
                      + Cor diferente
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <button key={p.id} type="button"
                onClick={() => { onAdd(p); setQ(""); setAberto(false); }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-bg border-b border-border last:border-0">
                <div className="flex w-full items-center gap-3">
                  <span className="font-mono text-xs text-text-3 w-24 shrink-0">{p.codigo_mestre}</span>
                  <span className="flex-1 text-text">{p.nome}</span>
                  <span className="text-xs text-text-3 shrink-0">{p.unidade}</span>
                </div>
                {temCodigoForn && nomeFornecedor && (
                  <p className="pl-[6.5rem] text-xs text-warning">
                    {nomeFornecedor} usa <span className="font-mono font-semibold">{p.codigo_do_fornecedor}</span>
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
      {aberto && q.length >= 2 && resultados.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface px-3 py-3 shadow-lg text-sm text-text-3">
          Nenhum produto encontrado{tipoSlug ? " nessa categoria" : ""}.
        </div>
      )}
    </div>
  );
}

// ── Modal de código do fornecedor ─────────────────────────────────
function CodigoFornecedorModal({ produto, nomeFornecedor, onUsar, onSemCodigo, onCancelar }: {
  produto: Produto; nomeFornecedor: string;
  onUsar: () => void; onSemCodigo: () => void; onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2 className="font-semibold text-text">Código do fornecedor</h2>
        <p className="mt-3 text-sm text-text-2">
          O produto <strong>{produto.nome}</strong> tem código mestre{" "}
          <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">{produto.codigo_mestre}</code>,
          mas <strong>{nomeFornecedor}</strong> usa o código{" "}
          <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">{produto.codigo_do_fornecedor}</code>{" "}
          para este produto.
        </p>
        <p className="mt-2 text-sm text-text-2">Qual código deseja usar neste pedido?</p>
        <div className="mt-5 flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
          <Button type="button" variant="ghost" onClick={onSemCodigo} className="border border-border">
            Sem código
          </Button>
          <Button type="button" onClick={onUsar}>
            Usar {produto.codigo_do_fornecedor}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
type Lote = { id: string; nome: string; obra_id: string };

type NecessidadeParaPedido = { id: string; quantidade: number; unidade: string; produto: Produto };

export function NovoPedidoCliente({
  obras, fornecedores, solicitacoesAprovadas, tiposLinha, formasPagamento, coresRal, fromSolicitacao, fromObraId,
  loteId, origemContexto, lotes, fromNecessidades, necessidadesSemProduto,
}: {
  obras: Obra[]; fornecedores: Fornecedor[]; solicitacoesAprovadas: Solicitacao[];
  tiposLinha: TipoLinha[]; formasPagamento: FormaPagamento[]; coresRal: CorRal[];
  fromSolicitacao?: Solicitacao | null; fromObraId?: string | null;
  loteId?: string | null; origemContexto?: string | null;
  lotes?: Lote[];
  fromNecessidades?: NecessidadeParaPedido[] | null;
  necessidadesSemProduto?: number;
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [obraId, setObraId] = useState(fromObraId ?? "");
  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [showSols, setShowSols] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoLinha | null>(
    tiposLinha.length === 1 ? tiposLinha[0] : null
  );
  const [fornecedorId, setFornecedorId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [modoCorPedido, setModoCorPedido] = useState<"unica" | "por-item">(
    tiposLinha.length === 1 && tiposLinha[0].slug.toUpperCase() === "COMPONENTES" ? "por-item" : "unica"
  );
  const [corUnicaId, setCorUnicaId] = useState("");
  const [formaPagId, setFormaPagId] = useState("");
  const [pending, start] = useTransition();
  const pendingFn = useRef<(() => Promise<void>) | null>(null);
  const [modalAcao, setModalAcao] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{ produto: Produto; nomeFornecedor: string } | null>(null);

  useEffect(() => {
    if (fromSolicitacao) importarSolicitacao(fromSolicitacao);
    if (fromNecessidades?.length) importarNecessidades(fromNecessidades);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outrasSolicitacoes = fromSolicitacao
    ? solicitacoesAprovadas.filter((s) => s.id !== fromSolicitacao.id)
    : solicitacoesAprovadas;

  // Componentes tendem a ter código/cor por peça (ex: fechadura preta e
  // branca no mesmo pedido) — não faz sentido oferecer "cor única" pra esse
  // tipo, só "por item".
  const tipoComponentes = tipoSelecionado?.slug?.toUpperCase() === "COMPONENTES";

  // Filtra fornecedores pelo tipo selecionado — estritamente
  const fornecedoresVisiveis = tipoSelecionado
    ? fornecedores.filter((f) => (f.tipos ?? []).includes(tipoSelecionado.slug))
    : fornecedores;
  const semTiposCadastrados = tipoSelecionado && fornecedores.every(f => !f.tipos?.length);

  const nomeFornecedorAtual = fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "";

  // Ao trocar tipo: limpa itens (confirmação), limpa fornecedor se incompatível
  function selecionarTipo(t: TipoLinha | null) {
    if (itens.length > 0 && t?.slug !== tipoSelecionado?.slug) {
      if (!confirm(`Mudar o tipo para "${t?.nome ?? "Todos"}" irá remover os itens já adicionados. Continuar?`)) return;
      setItens([]);
    }
    setTipoSelecionado(t);
    // Limpa fornecedor se não atende ao novo tipo
    if (t && fornecedorId) {
      const forn = fornecedores.find(f => f.id === fornecedorId);
      if (forn && !(forn.tipos ?? []).includes(t.slug)) {
        setFornecedorId("");
      }
    }
    // Volta para cor única ao trocar tipo (cores mudam) — exceto Componentes,
    // que só tem "por item" (cada peça pode ter uma cor diferente).
    setModoCorPedido(t?.slug?.toUpperCase() === "COMPONENTES" ? "por-item" : "unica");
  }

  function incrementarProduto(produtoId: string, delta: number) {
    setItens((prev) => prev.map((it) =>
      it.produto?.id === produtoId && !it.solicitacao_item_id
        ? { ...it, quantidade_pedida: (it.quantidade_pedida ?? 0) + delta }
        : it
    ));
  }

  function addProduto(p: Produto, forcar = false) {
    if (!forcar && itens.find((i) => i.produto?.id === p.id && !i.solicitacao_item_id)) return;

    // Se o fornecedor selecionado tem um código específico diferente do mestre → confirmar
    if (fornecedorId && p.codigo_do_fornecedor != null && p.codigo_do_fornecedor !== p.codigo_mestre) {
      setPendingAdd({ produto: p, nomeFornecedor: nomeFornecedorAtual });
      return;
    }

    addProdutoFinal(p, p.codigo_do_fornecedor ?? "");
  }

  function addProdutoFinal(p: Produto, codigoFornecedor: string) {
    const chapa = ["CHAPA","M²","M2"].includes((p.unidade ?? "").toUpperCase());
    // Para CHAPA: preço é calculado ao preencher dimensões; não auto-fill agora
    const precoUnit = chapa ? 0 : calcPrecoUnit(p.unidade, p.tamanho_mm, p.preco_metro);
    setItens((prev) => [...prev, {
      produto: p, quantidade_pedida: chapa ? 1 : 1, unidade: p.unidade,
      preco_unitario: precoUnit,
      codigo_fornecedor: codigoFornecedor, descricao_snapshot: p.nome,
      peso_metro: p.peso_metro ?? null,
      tamanho_mm: p.tamanho_mm ?? null,
      preco_metro: p.preco_metro ?? null,
      largura_m: null,
      altura_m: null,
      qtd_pecas: chapa ? 1 : null,
      cor_id: null,
    }]);
    setPendingAdd(null);
  }

  function importarSolicitacao(sol: Solicitacao) {
    setItens((prev) => {
      const novos = sol.itens
        .filter((si) => !prev.find((i) => i.solicitacao_item_id === si.id))
        .map((si) => ({
          produto: si.produto ?? null,
          quantidade_pedida: Number(si.quantidade),
          unidade: si.unidade, preco_unitario: 0, codigo_fornecedor: "",
          descricao_snapshot: si.produto?.nome ?? si.descricao_manual ?? "Item externo",
          obra_id: (sol.obra as any)?.id, solicitacao_item_id: si.id,
        }));
      return [...prev, ...novos];
    });
    setShowSols(false);
  }

  function importarNecessidades(nec: NecessidadeParaPedido[]) {
    setItens((prev) => {
      const novos = nec
        .filter((n) => !prev.find((i) => i.produto?.id === n.produto.id))
        .map((n) => ({
          produto: n.produto,
          quantidade_pedida: n.quantidade,
          unidade: n.unidade,
          preco_unitario: n.produto.preco_metro ? calcPrecoUnit(n.unidade, n.produto.tamanho_mm, n.produto.preco_metro) : 0,
          codigo_fornecedor: n.produto.codigo_do_fornecedor ?? "",
          descricao_snapshot: n.produto.nome,
          peso_metro: n.produto.peso_metro ?? null,
          tamanho_mm: n.produto.tamanho_mm ?? null,
          preco_metro: n.produto.preco_metro ?? null,
        }));
      return [...prev, ...novos];
    });
  }

  function removeItem(idx: number) { setItens((prev) => prev.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof Item, value: any) {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  // No modo "por item", a cor só é escolhida depois que o produto já foi
  // adicionado à linha — o código do fornecedor específico daquela cor
  // (alias) precisa ser buscado de novo nesse momento, senão o campo fica
  // vazio pra produtos cujo código muda por cor (ex: FEC325PTR/FEC325BRC).
  // Só sobrescreve o campo se ele ainda estiver vazio ou igual ao código
  // mestre — respeita edição manual do usuário.
  function handleCorItemChange(idx: number, novoCorId: string | null) {
    const itemAtual = itens[idx];
    updateItem(idx, "cor_id", novoCorId);
    if (!itemAtual?.produto || !fornecedorId || !novoCorId) return;

    const produto = itemAtual.produto;
    const codigoAnterior = itemAtual.codigo_fornecedor;
    const params = new URLSearchParams({ q: produto.codigo_mestre, fornecedor_id: fornecedorId, cor_id: novoCorId });
    fetch(`/api/produtos/search?${params}`)
      .then((res) => res.json())
      .then((resultados: Produto[]) => {
        const match = resultados.find((p) => p.id === produto.id);
        if (!match?.codigo_do_fornecedor) return;
        setItens((prev) => prev.map((it, i) => {
          if (i !== idx) return it;
          const aindaSemEdicao = !it.codigo_fornecedor || it.codigo_fornecedor === codigoAnterior;
          return aindaSemEdicao ? { ...it, codigo_fornecedor: match.codigo_do_fornecedor! } : it;
        }));
      })
      .catch(() => { /* mantém o código atual se a busca falhar */ });
  }

  const totalValor  = itens.reduce((acc, i) => {
    if (isChapa(i)) {
      const area = itemAreaChapa(i);
      return acc + (area ?? 0) * (i.preco_metro ?? 0);
    }
    return acc + i.quantidade_pedida * i.preco_unitario;
  }, 0);
  const totalMetros = itens.reduce((s, i) => { const m = itemMedida(i); return m?.sufixo === "m"  ? s + m.valor : s; }, 0);
  const totalArea   = itens.reduce((s, i) => { const m = itemMedida(i); return m?.sufixo === "m²" ? s + m.valor : s; }, 0);
  const totalPeso   = itens.reduce((s, i) => { const p = itemPeso(i);   return s + (p ?? 0); }, 0);
  const temSpecs    = itens.some((i) => i.tamanho_mm || i.peso_metro ||
    ["M","ML","M²","M2","CHAPA"].includes((i.unidade ?? "").toUpperCase()));
  const coresFiltradas = tipoSelecionado
    ? coresRal.filter(c => (c.tipos ?? []).includes(tipoSelecionado.slug))
    : coresRal;
  const corPorItem = modoCorPedido === "por-item" && coresRal.length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itens.length) { setErro("Adicione ao menos um item."); return; }
    setErro(null);
    const fd = new FormData(e.currentTarget);
    if (tipoSelecionado) fd.set("tipo_linha", tipoSelecionado.slug);
    fd.set("itens", JSON.stringify(itens.map((i) => {
      const chapa = ["CHAPA","M²","M2"].includes((i.unidade ?? "").toUpperCase());
      const area = chapa && i.largura_m && i.altura_m && i.qtd_pecas
        ? i.largura_m * i.altura_m * i.qtd_pecas : null;
      return {
        produto_id: i.produto?.id ?? null,
        descricao_snapshot: i.descricao_snapshot,
        quantidade_pedida: chapa ? (i.qtd_pecas ?? 1) : i.quantidade_pedida,
        unidade: i.unidade,
        preco_unitario: chapa
          ? (area && i.preco_metro ? (area / (i.qtd_pecas ?? 1)) * i.preco_metro : null)
          : (i.preco_unitario || null),
        codigo_fornecedor: i.codigo_fornecedor || null,
        obra_id: i.obra_id || null,
        solicitacao_item_id: i.solicitacao_item_id || null,
        largura_m: i.largura_m || null,
        altura_m: i.altura_m || null,
        qtd_pecas: i.qtd_pecas || null,
        ...(corPorItem && i.cor_id ? { cor_id: i.cor_id } : {}),
      };
    })));
    pendingFn.current = async () => {
      start(async () => {
        try { await criarPedido(fd); }
        catch (err: any) { setErro(err.message); }
      });
    };
    const titulo = tipoSelecionado ? `Criar Pedido de ${tipoSelecionado.nome}` : "Criar Pedido de Compra";
    setModalAcao(titulo);
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

      {pendingAdd && (
        <CodigoFornecedorModal
          produto={pendingAdd.produto}
          nomeFornecedor={pendingAdd.nomeFornecedor}
          onUsar={() => addProdutoFinal(pendingAdd.produto, pendingAdd.produto.codigo_do_fornecedor!)}
          onSemCodigo={() => addProdutoFinal(pendingAdd.produto, "")}
          onCancelar={() => setPendingAdd(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {loteId && <input type="hidden" name="lote_id" value={loteId} />}
        {origemContexto && <input type="hidden" name="origem_contexto" value={origemContexto} />}
        {/* Tipo de pedido */}
        {tiposLinha.length > 0 && (
          <div className="card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">
              Tipo de pedido{tipoSelecionado && (
                <span className="ml-2 font-normal normal-case text-primary">Pedido de {tipoSelecionado.nome}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {tiposLinha.map((t) => (
                <button key={t.slug} type="button" onClick={() => selecionarTipo(t)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    tipoSelecionado?.slug === t.slug
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text-2 hover:bg-bg"
                  }`}>
                  {t.nome}
                </button>
              ))}
              {tipoSelecionado && (
                <button type="button" onClick={() => selecionarTipo(null)}
                  className="text-xs text-text-3 hover:text-text underline ml-1">
                  Limpar tipo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dados do pedido */}
        <div className="card p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Fornecedor <span className="text-danger">*</span></label>
              <select name="fornecedor_id" required value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)} className="field">
                <option value="">Selecione…</option>
                {fornecedoresVisiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              {tipoSelecionado && !semTiposCadastrados && fornecedoresVisiveis.length === 0 && (
                <p className="mt-1 text-xs text-warning">
                  Nenhum fornecedor de {tipoSelecionado.nome} cadastrado. Configure em Compras → Fornecedores.
                </p>
              )}
              {tipoSelecionado && !semTiposCadastrados && fornecedoresVisiveis.length > 0 && (
                <p className="mt-1 text-xs text-text-3">
                  {fornecedoresVisiveis.length} fornecedor(es) de {tipoSelecionado.nome}
                </p>
              )}
            </div>
            <div>
              <label className="label">Obra <span className="text-danger">*</span></label>
              <select
                name="obra_id" required value={obraId}
                onChange={(e) => { setObraId(e.target.value); setLoteSelecionadoId(""); }}
                className="field"
              >
                <option value="">Selecione uma obra…</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero ? String(o.numero).padStart(4, "0") + " — " : ""}{o.nome}
                  </option>
                ))}
              </select>
            </div>
            {!loteId && (lotes?.length ?? 0) > 0 && (
              <div>
                <label className="label">Lote <span className="text-text-3 font-normal">(opcional)</span></label>
                <select
                  name="lote_id" value={loteSelecionadoId}
                  onChange={(e) => setLoteSelecionadoId(e.target.value)}
                  disabled={!obraId}
                  className="field"
                >
                  <option value="">Nenhum — pedido avulso</option>
                  {(lotes ?? []).filter((l) => l.obra_id === obraId).map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
                {loteSelecionadoId && (
                  <input type="hidden" name="origem_contexto" value="COMPRAS_PACOTE" />
                )}
                {!obraId && (
                  <p className="mt-1 text-xs text-text-3">Selecione uma obra para listar os lotes.</p>
                )}
              </div>
            )}
            <div>
              <label className="label">Forma de pagamento <span className="text-text-3 font-normal">(opcional)</span></label>
              <select
                name="forma_pagamento_id"
                className="field"
                onChange={(e) => setFormaPagId(e.target.value)}
                value={formaPagId}
              >
                <option value="">Não definida</option>
                {formasPagamento.map((fp) => <option key={fp.id} value={fp.id}>{fp.nome}</option>)}
              </select>
              {(() => {
                const forma = formasPagamento.find((f) => f.id === formaPagId);
                if (forma?.is_faturamento_direto) {
                  return (
                    <p className="mt-1 text-xs text-primary font-medium">
                      O valor será debitado da carteira da obra ao emitir o pedido.
                    </p>
                  );
                }
                if (formasPagamento.length === 0) {
                  return (
                    <p className="mt-1 text-xs text-text-3">
                      Cadastre em <a href="/squadframe/compras/formas-pagamento" className="underline">Formas de Pagamento</a>
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            {coresRal.length > 0 && (
              <div className="sm:col-span-2">
                <label className="label">Cor <span className="text-text-3 font-normal">(opcional)</span></label>
                <div className="flex items-center gap-2 mb-2">
                  {tipoComponentes ? (
                    <span className="rounded-md bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-2">Por item</span>
                  ) : (
                    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                      <button type="button"
                        onClick={() => setModoCorPedido("unica")}
                        className={`px-3 py-1.5 transition-colors ${modoCorPedido === "unica" ? "bg-primary text-white" : "bg-surface text-text-2 hover:bg-bg"}`}>
                        Cor única
                      </button>
                      <button type="button"
                        onClick={() => setModoCorPedido("por-item")}
                        className={`px-3 py-1.5 border-l border-border transition-colors ${modoCorPedido === "por-item" ? "bg-primary text-white" : "bg-surface text-text-2 hover:bg-bg"}`}>
                        Por item
                      </button>
                    </div>
                  )}
                  {modoCorPedido === "por-item" && (
                    <span className="text-xs text-text-3">Selecione a cor em cada item da tabela abaixo</span>
                  )}
                </div>
                {modoCorPedido === "unica" && !tipoComponentes && (
                  <>
                    <select name="cor_id" value={corUnicaId} onChange={(e) => setCorUnicaId(e.target.value)} className="field max-w-xs">
                      <option value="">Sem cor definida</option>
                      {coresFiltradas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}
                        </option>
                      ))}
                    </select>
                    {tipoSelecionado && coresFiltradas.length === 0 && (
                      <p className="mt-1 text-xs text-warning">
                        Nenhuma cor de {tipoSelecionado.nome}. Configure em Catálogo → Cores RAL.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea name="observacoes" rows={2} className="field" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              {tipoSelecionado ? `Itens — ${tipoSelecionado.nome}` : "Itens do pedido"}
            </h2>
            {outrasSolicitacoes.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowSols((v) => !v)} className="gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="8 17 12 21 16 17"/><line x1="12" y1="3" x2="12" y2="21"/>
                </svg>
                Importar de outra solicitação
              </Button>
            )}
          </div>

          {fromSolicitacao && (
            <Alert variant="success" className="mb-3">
              Itens importados automaticamente de{" "}
              <span className="font-mono font-semibold">{fromSolicitacao.numero}</span>
            </Alert>
          )}

          {fromNecessidades && fromNecessidades.length > 0 && (
            <Alert variant="success" className="mb-3">
              {fromNecessidades.length} iten(s) importado(s) do levantamento de material do lote.
              {!!necessidadesSemProduto && (
                <> {necessidadesSemProduto} necessidade(s) sem código de catálogo não foram incluídas — cadastre o produto antes de importar.</>
              )}
            </Alert>
          )}
          {fromNecessidades && fromNecessidades.length === 0 && necessidadesSemProduto === 0 && (
            <Alert variant="warning" className="mb-3">
              Nenhuma necessidade pendente de pedido encontrada neste lote.
            </Alert>
          )}

          {showSols && (
            <div className="mb-3 card overflow-x-auto">
              <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-3">
                Outras solicitações aprovadas
              </div>
              {outrasSolicitacoes.map((sol) => (
                <div key={sol.id} className="flex items-center justify-between border-b border-border last:border-0 px-4 py-3">
                  <div>
                    <span className="font-mono text-xs font-semibold text-primary">{sol.numero}</span>
                    <span className="ml-2 text-sm text-text-2">{(sol.obra as any)?.nome ?? "Sem obra"}</span>
                    <span className="ml-2 text-xs text-text-3">{sol.itens.length} iten(s)</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => importarSolicitacao(sol)}>Importar</Button>
                </div>
              ))}
            </div>
          )}

          {/* Busca de produto — filtra pelo tipo selecionado */}
          <div className="mb-3">
            {!tipoSelecionado && tiposLinha.length > 0 && (
              <p className="mb-2 text-xs text-warning">
                Selecione o tipo de pedido acima para filtrar os produtos por categoria.
              </p>
            )}
            <BuscaProduto
              tipoSlug={tipoSelecionado?.slug ?? ""}
              fornecedorId={fornecedorId}
              corId={modoCorPedido === "unica" ? corUnicaId : ""}
              nomeFornecedor={nomeFornecedorAtual}
              onAdd={addProduto}
              onAddForcar={(p) => addProduto(p, true)}
              onIncrement={incrementarProduto}
              existingIds={new Set(itens.filter((i) => !i.solicitacao_item_id && i.produto).map((i) => i.produto!.id))}
            />
            {fornecedorId && tipoSelecionado && (
              <p className="mt-1 text-xs text-text-3">
                Buscando por código mestre, aliases e código do fornecedor selecionado
              </p>
            )}
          </div>

          {itens.length > 0 ? (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-3">
                    <th className="px-4 py-2 font-medium">Produto</th>
                    <th className="px-4 py-2 font-medium">Qtd / Dimensões</th>
                    {temSpecs && <th className="px-4 py-2 font-medium w-28 text-right">Linear / Área</th>}
                    {temSpecs && <th className="px-4 py-2 font-medium w-24 text-right">Peso</th>}
                    <th className="px-4 py-2 font-medium w-32">Preço unit.</th>
                    <th className="px-4 py-2 font-medium w-32">Cód. Forn.</th>
                    {corPorItem && <th className="px-4 py-2 font-medium w-36">Cor</th>}
                    <th className="px-4 py-2 font-medium w-28 text-right">Total</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => {
                    const medida = itemMedida(it);
                    const peso = itemPeso(it);
                    const itIsChapa = isChapa(it);
                    const area = itemAreaChapa(it);
                    // Recalcula preço unitário por peça quando dimensões CHAPA mudam
                    const precoUnitDisplay = itIsChapa && area && it.qtd_pecas && it.preco_metro
                      ? (area / it.qtd_pecas) * (it.preco_metro ?? 0)
                      : it.preco_unitario;
                    return (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <p className="font-medium text-text">{it.descricao_snapshot}</p>
                        {it.produto ? (
                          <p className="font-mono text-xs text-text-3">{it.produto.codigo_mestre}</p>
                        ) : (
                          <Badge variant="warning" size="sm">EXTERNO</Badge>
                        )}
                        {it.tamanho_mm && (
                          <p className="text-xs text-text-3">{Number(it.tamanho_mm).toLocaleString("pt-BR")} mm {itIsChapa ? "(esp.)" : "(barra)"}</p>
                        )}
                      </td>
                      {/* Qtd / Dimensões */}
                      <td className="px-4 py-2">
                        {itIsChapa ? (
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-medium text-text-3 uppercase w-4">L</span>
                              <input type="number" min="0" step="1" placeholder="mm"
                                value={it.largura_m != null ? Math.round(it.largura_m * 1000) : ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || null;
                                  const vM = v != null ? v / 1000 : null;
                                  setItens(prev => prev.map((x, i) => {
                                    if (i !== idx) return x;
                                    const newArea = (vM ?? 0) * (x.altura_m ?? 0) * (x.qtd_pecas ?? 1);
                                    const pu = newArea && x.preco_metro ? (newArea / (x.qtd_pecas ?? 1)) * x.preco_metro : x.preco_unitario;
                                    return { ...x, largura_m: vM, preco_unitario: pu };
                                  }));
                                }}
                                className="field h-7 w-20 text-xs" />
                              <span className="text-xs text-text-3">×</span>
                              <span className="text-[10px] font-medium text-text-3 uppercase w-4">A</span>
                              <input type="number" min="0" step="1" placeholder="mm"
                                value={it.altura_m != null ? Math.round(it.altura_m * 1000) : ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || null;
                                  const vM = v != null ? v / 1000 : null;
                                  setItens(prev => prev.map((x, i) => {
                                    if (i !== idx) return x;
                                    const newArea = (x.largura_m ?? 0) * (vM ?? 0) * (x.qtd_pecas ?? 1);
                                    const pu = newArea && x.preco_metro ? (newArea / (x.qtd_pecas ?? 1)) * x.preco_metro : x.preco_unitario;
                                    return { ...x, altura_m: vM, preco_unitario: pu };
                                  }));
                                }}
                                className="field h-7 w-20 text-xs" />
                              <span className="text-xs text-text-3">mm</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input type="number" min="1" step="1" placeholder="Qtd pç"
                                value={it.qtd_pecas ?? 1}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 1;
                                  setItens(prev => prev.map((x, i) => {
                                    if (i !== idx) return x;
                                    const newArea = (x.largura_m ?? 0) * (x.altura_m ?? 0) * v;
                                    const pu = newArea && x.preco_metro ? (newArea / v) * x.preco_metro : x.preco_unitario;
                                    return { ...x, qtd_pecas: v, quantidade_pedida: v, preco_unitario: pu };
                                  }));
                                }}
                                className="field h-7 w-16 text-xs" />
                              <span className="text-xs text-text-3">peças</span>
                            </div>
                            {it.largura_m && it.altura_m && it.qtd_pecas && (
                              <p className="text-[10px] text-text-3">
                                {((it.largura_m * it.altura_m * it.qtd_pecas)).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} m²
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input type="number" min="0" step="any" value={it.quantidade_pedida}
                              onChange={(e) => updateItem(idx, "quantidade_pedida", parseFloat(e.target.value) || 1)}
                              className="field h-8 w-20 text-sm" />
                            <span className="text-xs text-text-3">{it.unidade}</span>
                          </div>
                        )}
                      </td>
                      {temSpecs && (
                        <td className="px-4 py-2 text-right text-xs text-text-2">
                          {medida != null ? `${medida.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${medida.sufixo}` : "—"}
                        </td>
                      )}
                      {temSpecs && (
                        <td className="px-4 py-2 text-right text-xs text-text-2">
                          {peso != null ? `${peso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-2">
                        {itIsChapa ? (
                          <div>
                            <p className="text-sm font-medium text-text">
                              {precoUnitDisplay > 0
                                ? precoUnitDisplay.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                : "—"}
                            </p>
                            <p className="text-[10px] text-text-3">por peça</p>
                          </div>
                        ) : (
                          <input type="number" min="0" step="0.01" value={it.preco_unitario}
                            onChange={(e) => updateItem(idx, "preco_unitario", parseFloat(e.target.value) || 0)}
                            className="field h-8 w-32 text-sm" placeholder="0,00" />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input value={it.codigo_fornecedor}
                          onChange={(e) => updateItem(idx, "codigo_fornecedor", e.target.value)}
                          className="field h-8 w-32 text-sm" placeholder="opcional" />
                      </td>
                      {corPorItem && (
                        <td className="px-4 py-2">
                          <select value={it.cor_id ?? ""}
                            onChange={(e) => handleCorItemChange(idx, e.target.value || null)}
                            className="field h-8 text-xs w-36">
                            <option value="">—</option>
                            {coresFiltradas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo_ral}{c.nome ? ` — ${c.nome}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-4 py-2 text-right text-sm font-medium text-text">
                        {itIsChapa
                          ? ((area ?? 0) * (it.preco_metro ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : (it.quantidade_pedida * it.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => removeItem(idx)} className="text-text-3 hover:text-danger">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-bg">
                    <td colSpan={2} className="px-4 py-2 text-right text-sm font-semibold text-text">Totais</td>
                    {temSpecs && (
                      <td className="px-4 py-2 text-right text-xs font-semibold text-text">
                        {totalMetros > 0 && <span>{totalMetros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m</span>}
                        {totalMetros > 0 && totalArea > 0 && <br />}
                        {totalArea > 0 && <span>{totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</span>}
                        {totalMetros === 0 && totalArea === 0 && "—"}
                      </td>
                    )}
                    {temSpecs && (
                      <td className="px-4 py-2 text-right text-xs font-semibold text-text">
                        {totalPeso > 0 ? `${totalPeso.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "—"}
                      </td>
                    )}
                    <td colSpan={corPorItem ? 3 : 2} />
                    <td className="px-4 py-2 text-right text-sm font-bold text-text">
                      {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-3">
              {tipoSelecionado
                ? `Busque produtos de ${tipoSelecionado.nome} ou importe de uma solicitação aprovada.`
                : "Busque produtos ou importe de uma solicitação aprovada."}
            </div>
          )}
        </div>

        {erro && <Alert variant="danger">{erro}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : tipoSelecionado ? `Criar Pedido de ${tipoSelecionado.nome}` : "Criar pedido"}
          </Button>
          <Button as="a" href="/squadframe/compras/pedidos" variant="ghost">Cancelar</Button>
        </div>
      </form>
    </>
  );
}
