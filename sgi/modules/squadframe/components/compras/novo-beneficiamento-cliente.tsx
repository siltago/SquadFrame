"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarBeneficiamento } from "@/modules/squadframe/actions/compras/beneficiamentos";
import { criarProdutoRapidoAction } from "@/modules/squadframe/package-procurement/actions";
import { Button } from "@/ui/components/Button";
import { Textarea } from "@/ui/components/Input";

type ProdutoOrigem = { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm: number | null; linha_id: string | null };
type ItemPedido = { id: string; quantidade_pedida: number; unidade: string; descricao_snapshot: string; produto: ProdutoOrigem | null };
type PedidoOrigem = { id: string; numero: string; obra_id: string | null; obra: { nome: string } | null; itens: ItemPedido[] };
type PedidoResumo = { id: string; numero: string; obra: { nome: string } | null };
type ProdutoBusca = { id: string; codigo_mestre: string; nome: string; unidade: string; tamanho_mm: number | null };

type LinhaForm = {
  itemId: string;
  incluir: boolean;
  quantidade: number;
  produtoPintadoId: string | null;
  produtoPintadoLabel: string | null;
  cadastrando: boolean;
};

export function NovoBeneficiamentoCliente({
  pedidoOrigem,
  pedidosElegiveis,
  fornecedores,
  formasPagamento,
}: {
  pedidoOrigem: PedidoOrigem | null;
  pedidosElegiveis: PedidoResumo[];
  fornecedores: { id: string; nome: string }[];
  formasPagamento: { id: string; nome: string; is_faturamento_direto: boolean }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const formaFaturamentoDireto = formasPagamento.find((f) => f.is_faturamento_direto);

  const [linhas, setLinhas] = useState<LinhaForm[]>(
    (pedidoOrigem?.itens ?? []).map((i) => ({
      itemId: i.id, incluir: true, quantidade: i.quantidade_pedida,
      produtoPintadoId: null, produtoPintadoLabel: null, cadastrando: false,
    }))
  );

  function patch(itemId: string, fn: (l: LinhaForm) => LinhaForm) {
    setLinhas((prev) => prev.map((l) => (l.itemId === itemId ? fn(l) : l)));
  }

  // Sem pedido escolhido ainda — seletor.
  if (!pedidoOrigem) {
    return (
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Pedido de origem (com perfil cor natural)</label>
          <select
            className="field h-9 text-sm w-full"
            defaultValue=""
            onChange={(e) => { if (e.target.value) router.push(`/squadframe/beneficiamento/novo?pedido_id=${e.target.value}`); }}
          >
            <option value="" disabled>Selecione…</option>
            {pedidosElegiveis.map((p) => (
              <option key={p.id} value={p.id}>{p.numero} {p.obra?.nome ? `— ${p.obra.nome}` : ""}</option>
            ))}
          </select>
          {pedidosElegiveis.length === 0 && (
            <p className="mt-2 text-xs text-text-3">
              Nenhum pedido elegível encontrado (precisa ter item de perfil cor natural e já ter sido emitido).
            </p>
          )}
        </div>
      </div>
    );
  }

  if (pedidoOrigem.itens.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-text-3">
        O pedido {pedidoOrigem.numero} não tem nenhum item de perfil cor natural.
      </div>
    );
  }

  function confirmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);

    const incluidas = linhas.filter((l) => l.incluir);
    if (incluidas.length === 0) { setErro("Selecione ao menos um item."); return; }
    for (const l of incluidas) {
      if (!l.produtoPintadoId) { setErro("Todo item incluído precisa de um produto pintado escolhido ou cadastrado."); return; }
      if (!(l.quantidade > 0)) { setErro("Quantidade precisa ser maior que zero."); return; }
    }

    const itens = incluidas.map((l) => {
      const itemOrigem = pedidoOrigem!.itens.find((i) => i.id === l.itemId)!;
      return {
        pedido_item_origem_id: l.itemId,
        produto_cru_id: itemOrigem.produto!.id,
        produto_pintado_id: l.produtoPintadoId,
        descricao_snapshot: `${itemOrigem.descricao_snapshot} (pintado)`,
        quantidade: l.quantidade,
        unidade: itemOrigem.unidade,
      };
    });

    fd.set("pedido_origem_id", pedidoOrigem!.id);
    fd.set("obra_id", pedidoOrigem!.obra_id ?? "");
    fd.set("itens", JSON.stringify(itens));

    startTransition(async () => {
      try {
        await criarBeneficiamento(fd);
      } catch (err: any) {
        setErro(err.message ?? "Não foi possível criar o beneficiamento.");
      }
    });
  }

  return (
    <form onSubmit={confirmar} className="space-y-5">
      <div className="card p-4">
        <p className="text-sm text-text-2">
          Pedido de origem: <span className="font-mono font-semibold text-text">{pedidoOrigem.numero}</span>
          {pedidoOrigem.obra?.nome && <span className="text-text-3"> — {pedidoOrigem.obra.nome}</span>}
        </p>
      </div>

      <div className="card divide-y divide-border">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Itens (perfil cor natural)</h2>
        </div>
        {linhas.map((l) => {
          const item = pedidoOrigem.itens.find((i) => i.id === l.itemId)!;
          return (
            <LinhaItem
              key={l.itemId}
              item={item}
              linha={l}
              onChange={(fn) => patch(l.itemId, fn)}
            />
          );
        })}
      </div>

      <div className="card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fornecedor de beneficiamento</label>
            <select name="fornecedor_id" required className="field h-9 text-sm w-full" defaultValue="">
              <option value="" disabled>Selecione…</option>
              {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            {fornecedores.length === 0 && (
              <p className="mt-1 text-xs text-danger">
                Nenhum fornecedor marcado como "faz beneficiamento" ainda.{" "}
                <a href="/squadframe/compras/fornecedores" target="_blank" className="underline">Cadastrar</a>
              </p>
            )}
          </div>
          <div>
            <label className="label">Forma de pagamento</label>
            <select name="forma_pagamento_id" required className="field h-9 text-sm w-full" defaultValue={formaFaturamentoDireto?.id ?? ""}>
              <option value="" disabled>Selecione…</option>
              {formasPagamento.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Rota</label>
          <div className="mt-1 flex gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="rota" value="VIA_FABRICA" defaultChecked />
              Via fábrica (material já recebido, sai do estoque pra pintura)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="rota" value="DIRETO_FORNECEDOR" />
              Direto do fornecedor (nunca passa pela fábrica)
            </label>
          </div>
        </div>

        <div>
          <Textarea label="Observações" name="observacoes" rows={2} className="text-sm" />
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando…" : "Criar beneficiamento"}
        </Button>
      </div>
    </form>
  );
}

function LinhaItem({
  item, linha, onChange,
}: {
  item: ItemPedido;
  linha: LinhaForm;
  onChange: (fn: (l: LinhaForm) => LinhaForm) => void;
}) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={linha.incluir}
          onChange={(e) => onChange((l) => ({ ...l, incluir: e.target.checked }))}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{item.produto?.nome ?? item.descricao_snapshot}</p>
          <p className="text-xs text-text-3 font-mono">{item.produto?.codigo_mestre}</p>
        </div>
        <div className="w-28 shrink-0">
          <input
            type="number" step="0.001" min="0.001"
            value={linha.quantidade}
            disabled={!linha.incluir}
            onChange={(e) => onChange((l) => ({ ...l, quantidade: parseFloat(e.target.value) || 0 }))}
            className="field h-8 text-xs w-full"
          />
        </div>
        <span className="w-16 shrink-0 text-xs text-text-3">{item.unidade} (de {item.quantidade_pedida})</span>
      </div>
      {linha.incluir && (
        <div className="pl-7">
          {linha.produtoPintadoId ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              Produto pintado: <span className="font-mono">{linha.produtoPintadoLabel}</span>
              <button type="button" onClick={() => onChange((l) => ({ ...l, produtoPintadoId: null, produtoPintadoLabel: null }))} className="ml-1 text-emerald-700 hover:text-danger">×</button>
            </span>
          ) : linha.cadastrando ? (
            <CadastroProdutoPintado
              produtoOrigem={item.produto}
              onCancelar={() => onChange((l) => ({ ...l, cadastrando: false }))}
              onCriado={(p) => onChange((l) => ({ ...l, produtoPintadoId: p.id, produtoPintadoLabel: `${p.codigo_mestre} — ${p.nome}`, cadastrando: false }))}
            />
          ) : (
            <div className="flex items-center gap-2">
              <ProdutoBuscaInline onSelect={(p) => onChange((l) => ({ ...l, produtoPintadoId: p.id, produtoPintadoLabel: `${p.codigo_mestre} — ${p.nome}` }))} />
              <button
                type="button"
                onClick={() => onChange((l) => ({ ...l, cadastrando: true }))}
                className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
              >
                Cadastrar produto pintado
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProdutoBuscaInline({ onSelect }: { onSelect: (p: ProdutoBusca) => void }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const [aberto, setAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/produtos/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data: ProdutoBusca[]) => { setResultados(data); setAberto(true); })
        .catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative flex-1 min-w-0 max-w-xs">
      <input
        className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs"
        placeholder="Buscar produto pintado existente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(p); setQuery(""); setResultados([]); setAberto(false); }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-bg"
            >
              <span className="shrink-0 font-mono text-text-3">{p.codigo_mestre}</span>
              <span className="flex-1 truncate">{p.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CadastroProdutoPintado({
  produtoOrigem, onCancelar, onCriado,
}: {
  produtoOrigem: ProdutoOrigem | null;
  onCancelar: () => void;
  onCriado: (p: { id: string; codigo_mestre: string; nome: string }) => void;
}) {
  const [codigoMestre, setCodigoMestre] = useState(produtoOrigem ? `${produtoOrigem.codigo_mestre}-PINT` : "");
  const [nomeTecnico, setNomeTecnico] = useState(produtoOrigem ? `${produtoOrigem.nome} (pintado)` : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function salvar() {
    if (!produtoOrigem?.linha_id) { setErro("Produto de origem sem linha — não é possível criar variante."); return; }
    if (!codigoMestre.trim() || !nomeTecnico.trim()) { setErro("Preencha código mestre e nome."); return; }
    setErro(null);
    setSalvando(true);
    criarProdutoRapidoAction({
      linha_id: produtoOrigem.linha_id,
      codigo_mestre: codigoMestre.trim(),
      nome_tecnico: nomeTecnico.trim(),
      unidade: produtoOrigem.unidade,
      tamanho_mm: produtoOrigem.tamanho_mm,
    })
      .then((p) => onCriado({ id: p.id, codigo_mestre: p.codigo_mestre, nome: p.nome }))
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível cadastrar o produto."))
      .finally(() => setSalvando(false));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-primary/30 bg-primary-soft/50 p-2">
      <input className="w-40 rounded-md border border-border bg-bg px-2 py-1 text-xs" placeholder="código mestre" value={codigoMestre} onChange={(e) => setCodigoMestre(e.target.value)} />
      <input className="w-56 flex-1 min-w-40 rounded-md border border-border bg-bg px-2 py-1 text-xs" placeholder="nome técnico" value={nomeTecnico} onChange={(e) => setNomeTecnico(e.target.value)} />
      <button type="button" disabled={salvando} onClick={salvar} className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onCancelar} className="text-[11px] text-text-3 hover:text-text-2">cancelar</button>
      {erro && <span className="w-full text-[11px] text-danger">{erro}</span>}
    </div>
  );
}
