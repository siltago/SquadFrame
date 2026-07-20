"use client";

import { useEffect, useRef, useState } from "react";

export type ProdutoOption = { id: string; codigo_mestre: string; nome: string; unidade: string };

// Autocomplete sobre o catálogo mestre do Frame (tabela produtos,
// compartilhada — não é dado exclusivo do módulo Frame), reaproveitando
// a API de busca já existente (/api/produtos/search) em vez de portar o
// Catálogo Mestre pro Wise como módulo próprio.
export function ProdutoPicker({ onSelect }: { onSelect: (produto: ProdutoOption) => void }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ProdutoOption[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResultados([]); return; }
    setCarregando(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/produtos/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data: ProdutoOption[]) => { setResultados(data); setAberto(true); })
        .catch(() => setResultados([]))
        .finally(() => setCarregando(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        placeholder="Buscar produto do catálogo (código ou nome)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {carregando && <span className="absolute right-3 top-2.5 text-xs text-text-3">buscando…</span>}
      {aberto && resultados.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(p); setQuery(""); setResultados([]); setAberto(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg"
            >
              <span className="shrink-0 font-mono text-xs text-text-3">{p.codigo_mestre}</span>
              <span className="flex-1 truncate">{p.nome}</span>
              <span className="shrink-0 text-xs text-text-3">{p.unidade}</span>
            </button>
          ))}
        </div>
      )}
      {aberto && !carregando && query.trim().length >= 2 && resultados.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-3 shadow-lg">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  );
}
