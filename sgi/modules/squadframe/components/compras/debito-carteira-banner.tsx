"use client";

import { Button } from "@/ui/components/Button";

// Banner de débito de faturamento direto — extraído de pedido-cliente.tsx
// pra ser reaproveitado também no fluxo de beneficiamento (mesma lógica de
// usa_carteira/debito_registrado/debito_status, só que lida de
// pedidos_beneficiamento em vez de pedidos_compra). Puramente
// apresentacional — quem chama já resolve os três estados (pendente/
// rejeitado/aprovado) e passa os handlers.
export function DebitoCarteiraBanner({
  temDebitoPendente,
  debitoRejeitado,
  debitoAprovado,
  debitoRejeitadoMotivo,
  debitoAprovadorNome,
  debitoDecididoEm,
  pending,
  erro,
  ok,
  showRejeitar,
  motivoRejeicao,
  onMotivoRejeicaoChange,
  onAprovar,
  onRejeitar,
  onToggleRejeitar,
}: {
  temDebitoPendente: boolean;
  debitoRejeitado: boolean;
  debitoAprovado: boolean;
  debitoRejeitadoMotivo: string | null;
  debitoAprovadorNome: string | null;
  debitoDecididoEm: string | null;
  pending: boolean;
  erro: string | null;
  ok: boolean;
  showRejeitar: boolean;
  motivoRejeicao: string;
  onMotivoRejeicaoChange: (v: string) => void;
  onAprovar: () => void;
  onRejeitar: () => void;
  onToggleRejeitar: (show: boolean) => void;
}) {
  if (!temDebitoPendente && !debitoRejeitado && !debitoAprovado) return null;

  return (
    <>
      {temDebitoPendente && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-warning-soft p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Débito pendente de aprovação
              </p>
              <p className="mt-0.5 text-xs text-warning dark:text-amber-400">
                Este pedido usa faturamento direto e precisa que alguém aprove o débito na carteira
                {" "}(ou rejeite, se não houver saldo/autorização).
              </p>
              {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
              {ok && <p className="mt-1 text-xs text-success">Débito aprovado com sucesso.</p>}
              {showRejeitar && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={motivoRejeicao}
                    onChange={(e) => onMotivoRejeicaoChange(e.target.value)}
                    placeholder="Motivo da rejeição"
                    className="field h-8 min-w-[220px] flex-1 text-xs"
                  />
                  <Button size="sm" variant="danger" disabled={pending} onClick={onRejeitar}>
                    {pending ? "Enviando…" : "Confirmar rejeição"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onToggleRejeitar(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
            {!showRejeitar && (
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={pending}
                  onClick={() => onToggleRejeitar(true)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-surface-2 disabled:opacity-50"
                >
                  Rejeitar
                </button>
                <button
                  disabled={pending}
                  onClick={onAprovar}
                  className="rounded-lg border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {pending ? "Aprovando…" : "Aprovar débito"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {debitoRejeitado && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-danger">Débito de faturamento direto rejeitado</p>
              <p className="mt-0.5 text-xs text-danger/90">
                {debitoRejeitadoMotivo ?? "Sem motivo informado."}
              </p>
              <p className="mt-1 text-xs text-text-3">
                Rejeitado por {debitoAprovadorNome ?? "—"}
                {debitoDecididoEm && ` em ${new Date(debitoDecididoEm).toLocaleString("pt-BR")}`}
                {" — "}o pedido não avança até isso ser resolvido.
              </p>
              {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
              {ok && <p className="mt-1 text-xs text-success">Débito aprovado com sucesso.</p>}
            </div>
            <button
              disabled={pending}
              onClick={onAprovar}
              className="shrink-0 rounded-lg border border-danger bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-hover disabled:opacity-50"
            >
              {pending ? "Aprovando…" : "Aprovar mesmo assim"}
            </button>
          </div>
        </div>
      )}

      {debitoAprovado && (
        <p className="mb-3 text-xs text-text-3">
          Débito aprovado por <span className="font-medium text-text-2">{debitoAprovadorNome ?? "—"}</span>
          {debitoDecididoEm && ` em ${new Date(debitoDecididoEm).toLocaleString("pt-BR")}`}.
        </p>
      )}
    </>
  );
}
