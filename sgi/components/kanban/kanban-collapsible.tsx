"use client";

import { useState } from "react";
import type { Coluna, Tarefa } from "@/types/kanban";
import { KanbanBoard } from "./kanban-board";

interface Props {
  colunas: Coluna[];
  tarefas: Tarefa[];
  usuarioId: string;
  usuarioNome: string;
}

export function KanbanCollapsible({ colunas, tarefas, usuarioId, usuarioNome }: Props) {
  const [expanded, setExpanded] = useState(false);
  const total = tarefas.filter((t) => !t.deleted_at).length;

  return (
    <div className="min-h-screen bg-canvas">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-4 border-b border-line bg-surface hover:bg-canvas transition-colors"
      >
        <div className="text-left">
          <h1 className="font-display text-xl font-bold text-ink">Meu Kanban</h1>
          <p className="text-xs text-ink-faint mt-0.5">
            Olá, {usuarioNome} · {total} {total === 1 ? "tarefa" : "tarefas"}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 py-4 overflow-x-auto">
          <KanbanBoard
            colunas={colunas}
            tarefas={tarefas}
            modo="pessoal"
            usuarioId={usuarioId}
            setorId={null}
          />
        </div>
      )}
    </div>
  );
}
