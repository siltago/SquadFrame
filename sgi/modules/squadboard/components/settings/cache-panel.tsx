"use client";

import { useState, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { RefreshIcon, TrashIcon } from "@/ui/icons";
import { limparTodoCache, buscarStatusCache } from "@/modules/squadboard/actions/cache";
import type { CacheStatus } from "@/modules/squadboard/actions/cache";

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  return `${Math.floor(m / 60)}h atrás`;
}

export function CachePanel({ statusInicial }: { statusInicial: CacheStatus[] }) {
  const [entries, setEntries] = useState<CacheStatus[]>(statusInicial);
  const [limpando, startLimpar] = useTransition();
  const [atualizando, startAtualizar] = useTransition();

  function limpar() {
    startLimpar(async () => {
      await limparTodoCache();
      setEntries([]);
    });
  }

  function atualizar() {
    startAtualizar(async () => {
      const fresh = await buscarStatusCache();
      setEntries(fresh);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Cache de Boards</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={atualizar}
            disabled={atualizando}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-2 hover:border-primary/40 hover:text-text disabled:opacity-50 transition-colors"
          >
            <RefreshIcon size={12} className={cn(atualizando && "animate-spin")} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={limpar}
            disabled={limpando || entries.length === 0}
            className="flex items-center gap-1 rounded-md border border-danger/30 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
          >
            <TrashIcon size={12} />
            {limpando ? "Limpando…" : "Limpar tudo"}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-text-3">Nenhuma entrada no cache.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((e) => (
            <div key={e.key} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
              <span className="flex-1 truncate font-mono text-[11px] text-text-2">{e.key}</span>
              <span className="text-[10px] text-text-3 shrink-0">{ago(e.updatedAt)}</span>
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                e.stale ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-600 dark:text-green-400",
              )}>
                {e.stale ? "stale" : "fresh"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-text-3">
        TTL de 5 minutos. Stale-while-revalidate: dados expirados são servidos imediatamente enquanto o cliente atualiza em background.
      </p>
    </div>
  );
}
