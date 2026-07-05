"use client";

import { useState, useTransition } from "react";
import { cn } from "@/ui/lib/cn";
import { CheckCircleIcon, XCircleIcon, RefreshIcon, AlertTriangleIcon } from "@/ui/icons";
import { verificarConexaoTrello } from "@/modules/squadboard/actions/settings";

interface ConexaoStatus {
  ok: boolean;
  erro?: string;
}

interface ConnectionPanelProps {
  statusInicial: ConexaoStatus;
  temApiKey: boolean;
  temToken: boolean;
}

export function ConnectionPanel({ statusInicial, temApiKey, temToken }: ConnectionPanelProps) {
  const [status, setStatus] = useState<ConexaoStatus>(statusInicial);
  const [testando, startTransition] = useTransition();

  function testar() {
    startTransition(async () => {
      const result = await verificarConexaoTrello();
      setStatus(result);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-text">Conexão Trello</h2>
        <span className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          status.ok
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-danger/10 text-danger",
        )}>
          {status.ok ? <CheckCircleIcon size={11} /> : <XCircleIcon size={11} />}
          {status.ok ? "Conectado" : "Desconectado"}
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <span className="text-[11px] font-medium text-text-3 w-28 shrink-0">TRELLO_API_KEY</span>
          <span className={cn("text-xs", temApiKey ? "text-text-2" : "text-danger")}>
            {temApiKey ? "Configurado" : "Não configurado"}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <span className="text-[11px] font-medium text-text-3 w-28 shrink-0">TRELLO_TOKEN</span>
          <span className={cn("text-xs", temToken ? "text-text-2" : "text-danger")}>
            {temToken ? "Configurado" : "Não configurado"}
          </span>
        </div>
      </div>

      {status.erro && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          <AlertTriangleIcon size={13} className="mt-0.5 shrink-0" />
          {status.erro}
        </div>
      )}

      <button
        type="button"
        onClick={testar}
        disabled={testando}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-2 hover:border-primary/40 hover:text-text transition-colors disabled:opacity-50"
      >
        <RefreshIcon size={13} className={cn(testando && "animate-spin")} />
        {testando ? "Testando…" : "Testar conexão"}
      </button>
    </div>
  );
}
