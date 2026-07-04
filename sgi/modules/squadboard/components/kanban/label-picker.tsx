"use client";

import { useState } from "react";
import { cn } from "@/ui/lib/cn";
import { Popover } from "@/ui/components/Popover";
import type { BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function LabelPicker({
  todas,
  selecionadas,
  onToggle,
  onOpenManager,
}: {
  todas: BoardEtiqueta[];
  selecionadas: BoardEtiqueta[];
  onToggle: (etiqueta: BoardEtiqueta) => void;
  onOpenManager: () => void;
}) {
  const [busca, setBusca] = useState("");

  const selecionadasIds = new Set(selecionadas.map((e) => e.id));
  const filtradas = todas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <Popover
      width="220px"
      align="start"
      trigger={
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-border bg-surface-2",
            "px-2.5 py-1.5 text-sm text-text-3 transition-colors hover:bg-surface-3 hover:text-text",
          )}
        >
          <span className="text-[11px]">+ Adicionar etiqueta</span>
        </button>
      }
    >
      <div className="flex flex-col">
        {/* Busca */}
        <div className="border-b border-border px-2 py-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar etiqueta…"
            className="field w-full text-xs"
          />
        </div>

        {/* Lista */}
        <div className="max-h-48 overflow-y-auto scrollbar-thin py-1">
          {filtradas.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-text-3">Nenhuma etiqueta</p>
          ) : (
            filtradas.map((etiqueta) => {
              const ativa = selecionadasIds.has(etiqueta.id);
              return (
                <button
                  key={etiqueta.id}
                  type="button"
                  onClick={() => onToggle(etiqueta)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors",
                    "hover:bg-surface-2",
                    ativa ? "text-text" : "text-text-2",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: etiqueta.cor }}
                  />
                  <span className="flex-1 truncate text-left">{etiqueta.nome}</span>
                  {ativa && <CheckIcon />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-2 py-1.5">
          <button
            type="button"
            onClick={onOpenManager}
            className="w-full rounded px-2 py-1 text-left text-xs text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
          >
            Gerenciar etiquetas…
          </button>
        </div>
      </div>
    </Popover>
  );
}
