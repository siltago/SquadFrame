"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, CloseIcon, ChevronRightIcon } from "@/ui/icons";

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
  obra:       "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  produto:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  fornecedor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  pedido:     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  solicitacao:"bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  tarefa:     "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
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
        className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-sm text-white/65 transition-all duration-[var(--motion-hover)] ease-[var(--ease-spring)] hover:scale-105 hover:bg-white/15 hover:text-white"
        title="Buscar (Ctrl+K)"
      >
        <SearchIcon size={14} />
        <span className="hidden xl:inline">Buscar</span>
        <kbd className="hidden xl:inline text-xs opacity-60 font-mono">Ctrl+K</kbd>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4" style={{ paddingTop: "max(10vh, env(safe-area-inset-top))" }} onClick={() => setAberto(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <SearchIcon size={16} className="text-text-3 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar obras, produtos, fornecedores, pedidos…"
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResultados([]); inputRef.current?.focus(); }} className="text-text-3 hover:text-text">
                  <CloseIcon size={14} />
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
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selecionado ? "bg-bg" : ""}`}
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIPO_COR[r.tipo]}`}>
                        {TIPO_LABEL[r.tipo]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">{r.titulo}</p>
                        {r.subtitulo && <p className="truncate text-xs text-text-3">{r.subtitulo}</p>}
                      </div>
                      <ChevronRightIcon size={12} className="ml-auto shrink-0 text-text-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.length >= 2 && resultados.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-text-3">Nenhum resultado para "{query}"</p>
            )}

            {!query && (
              <p className="px-4 py-4 text-center text-xs text-text-3">Digite para buscar · ↑↓ navegar · Enter selecionar</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
