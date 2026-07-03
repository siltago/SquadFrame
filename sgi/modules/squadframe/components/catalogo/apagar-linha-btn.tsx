"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { apagarLinha } from "@/modules/squadframe/actions/catalogo/actions";
import { usePode } from "@/modules/squadframe/components/user-provider";

export function ApagarLinhaBtn({ linhaId, nomeLinha }: { linhaId: string; nomeLinha: string }) {
  const pode = usePode("catalogo.excluir");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!pode) return null;

  function handleClick() {
    if (!confirm(`Apagar a linha "${nomeLinha}"?\n\nEsta ação não pode ser desfeita.`)) return;
    start(async () => {
      try {
        await apagarLinha(linhaId);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
      {pending ? "Apagando…" : "Apagar linha"}
    </button>
  );
}
