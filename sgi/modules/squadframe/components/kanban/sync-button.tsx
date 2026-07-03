"use client";

import { useState, useTransition } from "react";
import { sincronizarTarefasCompras } from "@/modules/squadframe/actions/tarefas/actions";

export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ criadas: number; corrigidas: number; erros: number } | null>(null);

  function handleSync() {
    startTransition(async () => {
      const r = await sincronizarTarefasCompras();
      setResultado(r);
      setTimeout(() => setResultado(null), 5000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-2 hover:text-text hover:border-primary/40 transition-colors disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className={pending ? "animate-spin" : ""}>
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {pending ? "Sincronizando…" : "Sincronizar pedidos"}
      </button>
      {resultado && (
        <span className="text-xs text-text-2">
          {resultado.criadas > 0 && `${resultado.criadas} criada${resultado.criadas !== 1 ? "s" : ""}`}
          {resultado.criadas > 0 && resultado.corrigidas > 0 && " · "}
          {resultado.corrigidas > 0 && `${resultado.corrigidas} corrigida${resultado.corrigidas !== 1 ? "s" : ""}`}
          {resultado.criadas === 0 && resultado.corrigidas === 0 && "Nada a sincronizar"}
          {resultado.erros > 0 && ` · ${resultado.erros} erro(s)`}
        </span>
      )}
    </div>
  );
}
