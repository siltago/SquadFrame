"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirTarefa } from "@/modules/squadframe/actions/tarefas/actions";

export function BtnExcluirTarefa({ tarefaId }: { tarefaId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta tarefa?")) return;
    startTransition(async () => {
      await excluirTarefa(tarefaId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-danger disabled:opacity-30 p-1 rounded"
      title="Excluir tarefa"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
  );
}
