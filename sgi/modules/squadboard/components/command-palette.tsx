"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, KanbanIcon } from "@/ui/icons";
import { EmptyState } from "@/ui/components/EmptyState";
import { PriorityDot } from "./kanban/priority-dot";
import type { BoardCard } from "@/modules/squadboard/types/board";

export function CommandPalette({
  open, onClose, cards, onSelectCard,
}: {
  open: boolean;
  onClose: () => void;
  cards: BoardCard[];
  onSelectCard: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards.slice(0, 8);
    return cards.filter((c) =>
      c.titulo.toLowerCase().includes(q) || c.cliente?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, cards]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setAtivo(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(a + 1, resultados.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && resultados[ativo]) { onSelectCard(resultados[ativo].id); onClose(); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, ativo, resultados, onClose, onSelectCard]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: "squadCmdFade var(--motion-modal) var(--ease-out) both" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        style={{ animation: "squadCmdIn var(--motion-modal) var(--ease-out) both" }}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <SearchIcon size={16} className="shrink-0 text-text-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAtivo(0); }}
            placeholder="Buscar cards por título ou cliente…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-text-3">esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
          {resultados.length === 0 ? (
            <EmptyState size="sm" title="Nenhum card encontrado" />
          ) : (
            resultados.map((c, i) => (
              <button
                key={c.id}
                onClick={() => { onSelectCard(c.id); onClose(); }}
                onMouseEnter={() => setAtivo(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-[80ms] ${
                  i === ativo ? "bg-surface-2" : ""
                }`}
              >
                <KanbanIcon size={14} className="shrink-0 text-text-3" />
                <span className="min-w-0 flex-1 truncate text-sm text-text">{c.titulo}</span>
                <PriorityDot prioridade={c.prioridade} />
              </button>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes squadCmdFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes squadCmdIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
