"use client";

import { Button } from "@/ui/components/Button";

// Botão que liga o "modo exclusão" (topo da lista) — vira "Cancelar" quando
// já está ativo.
export function BulkDeleteToggle({
  ativo, onAtivar, onCancelar, cancelarLabel = "Cancelar exclusão",
}: {
  ativo: boolean;
  onAtivar: () => void;
  onCancelar: () => void;
  cancelarLabel?: string;
}) {
  if (ativo) {
    return (
      <button onClick={onCancelar} className="text-xs text-text-3 hover:text-text underline">
        {cancelarLabel}
      </button>
    );
  }
  return (
    <button onClick={onAtivar}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft dark:border-red-800/50 dark:text-danger dark:hover:bg-red-900/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
      Excluir
    </button>
  );
}

// Barra fixa no rodapé, pra confirmar a exclusão em massa. `label` é o
// texto completo depois da contagem (ex: "pedido(s) selecionado(s)"),
// já que gênero/plural variam por domínio.
export function BulkDeleteBar({
  count, onConfirm, onCancel, pending, erro, label,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  erro: string | null;
  label: string;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-red-200 bg-danger-soft px-8 py-3 shadow-lg dark:bg-red-900/20">
      <p className="text-sm font-medium text-danger dark:text-danger">{count} {label}</p>
      <div className="flex items-center gap-3">
        {erro && <p className="text-xs text-danger">{erro}</p>}
        <Button variant="ghost" onClick={onCancel} className="text-sm">Cancelar</Button>
        <button onClick={onConfirm} disabled={pending}
          className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "Excluindo…" : `Excluir ${count}`}
        </button>
      </div>
    </div>
  );
}
