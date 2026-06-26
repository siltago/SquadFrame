"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Resultado = {
  tipo: "obra" | "produto" | "fornecedor" | "pedido" | "solicitacao" | "tarefa";
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
};

const TIPO_LABEL: Record<Resultado["tipo"], string> = {
  obra: "Obra",
  produto: "Produto",
  fornecedor: "Fornecedor",
  pedido: "Pedido",
  solicitacao: "Solicitação",
  tarefa: "Tarefa",
};

const TIPO_COR: Record<Resultado["tipo"], string> = {
  obra: "bg-blue-100 text-blue-700",
  produto: "bg-amber-100 text-amber-700",
  fornecedor: "bg-emerald-100 text-emerald-700",
  pedido: "bg-violet-100 text-violet-700",
  solicitacao: "bg-purple-100 text-purple-700",
  tarefa: "bg-teal-100 text-teal-700",
};

export function BuscaGlobal() {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [selecionado, setSelecionado] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAberto(true);
      }
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResultados([]);
      setSelecionado(0);
    }
  }, [aberto]);

  function handleQuery(val: string) {
    setQuery(val);
    setSelecionado(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(val)}`);
        const json = await res.json();
        setResultados(json.resultados ?? []);
      });
    }, 250);
  }

  function navegar(href: string) {
    setAberto(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelecionado((s) => Math.min(s + 1, resultados.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelecionado((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && resultados[selecionado]) navegar(resultados[selecionado].href);
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/15 hover:text-white transition-colors"
        title="Buscar (Ctrl+K)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span className="hidden md:inline">Buscar</span>
        <kbd className="hidden md:inline text-xs opacity-60 font-mono">Ctrl+K</kbd>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4" onClick={() => setAberto(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-faint shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar obras, produtos, fornecedores, pedidos…"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResultados([]); inputRef.current?.focus(); }} className="text-ink-faint hover:text-ink">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            {resultados.length > 0 && (
              <ul className="max-h-80 overflow-y-auto py-1">
                {resultados.map((r, i) => (
                  <li key={r.id + r.tipo}>
                    <button
                      onClick={() => navegar(r.href)}
                      onMouseEnter={() => setSelecionado(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selecionado ? "bg-canvas" : ""}`}
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIPO_COR[r.tipo]}`}>
                        {TIPO_LABEL[r.tipo]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{r.titulo}</p>
                        {r.subtitulo && <p className="truncate text-xs text-ink-faint">{r.subtitulo}</p>}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0 text-ink-faint"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.length >= 2 && resultados.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">Nenhum resultado para "{query}"</p>
            )}

            {!query && (
              <p className="px-4 py-4 text-center text-xs text-ink-faint">Digite para buscar · ↑↓ navegar · Enter selecionar</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
