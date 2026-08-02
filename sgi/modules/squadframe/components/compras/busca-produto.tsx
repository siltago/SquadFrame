"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/ui/components/Button";

export type Produto = {
  id: string;
  codigo_mestre: string;
  nome: string;
  unidade: string;
  codigo_do_fornecedor?: string | null;
  peso_metro?: number | null;
  preco_metro?: number | null;
  tamanho_mm?: number | null;
};

// Autocomplete de produto do catálogo, usado em Nova Solicitação, Novo
// Pedido, Retornar Pedido e Editar Pedido. Os filtros (tipoSlug/
// fornecedorId/corId) e o painel de "já existe, somar quantidade"
// (onAddForcar/onIncrement/existingQtds) são opcionais — sem eles o
// componente se comporta como a busca simples usada em retorno/edição.
export function BuscaProduto({
  tipoSlug = "",
  fornecedorId = "",
  corId = "",
  nomeFornecedor = "",
  onAdd,
  onAddForcar,
  onIncrement,
  existingQtds = new Map<string, number>(),
  placeholder,
}: {
  tipoSlug?: string;
  fornecedorId?: string;
  corId?: string;
  nomeFornecedor?: string;
  onAdd: (p: Produto) => void;
  onAddForcar?: (p: Produto) => void;
  onIncrement?: (produtoId: string, delta: number) => void;
  existingQtds?: Map<string, number>;
  placeholder?: string;
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

  const placeholderFinal = placeholder ?? (tipoSlug ? "Buscar produto (código mestre, alias ou código do fornecedor)…" : "Buscar produto…");

  return (
    <div ref={ref} className="relative flex-1">
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={placeholderFinal}
        className="field h-9 w-full text-sm" />
      {aberto && resultados.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          {resultados.map((p) => {
            const temCodigoForn = p.codigo_do_fornecedor && p.codigo_do_fornecedor !== p.codigo_mestre;
            const atual = existingQtds.get(p.id);
            const jaExiste = atual !== undefined;
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
                    <input
                      type="number" min="1" step="any" value={qtd}
                      onChange={(e) => setQtdExtra((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 1 }))}
                      onClick={(e) => e.stopPropagation()}
                      className="field h-7 w-20 text-xs font-mono"
                    />
                    <span className="text-xs text-text-3">{p.unidade}</span>
                    <span className="text-xs text-text-3 font-mono">
                      {atual} + {qtd} = <strong className="text-text">{atual + qtd}</strong>
                    </span>
                    <Button
                      type="button" size="sm"
                      onClick={() => { onIncrement?.(p.id, qtd); setQtdExtra((prev) => ({ ...prev, [p.id]: 1 })); setQ(""); setAberto(false); }}
                      className="h-7 px-3 text-xs"
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button" variant="secondary" size="sm"
                      onClick={() => { onAddForcar?.(p); setQ(""); setAberto(false); }}
                      className="h-7 px-3 text-xs"
                    >
                      Adicionar novamente
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
