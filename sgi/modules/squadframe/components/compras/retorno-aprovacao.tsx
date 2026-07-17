"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprovarRetornoPedido, rejeitarRetornoPedido } from "@/modules/squadframe/actions/compras/retorno";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { usePode } from "@/modules/squadframe/components/user-provider";
import type { RetornoPendente } from "@/modules/squadframe/types/compras";

export function RetornoAprovacao({
  retorno,
  pedidoId,
}: {
  retorno: RetornoPendente;
  pedidoId: string;
}) {
  const podeAprovar = usePode("compras.pedido.aprovar_retorno");
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [pendingAprovar, startAprovar] = useTransition();
  const [pendingRejeitar, startRejeitar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<"aprovar" | null>(null);
  const router = useRouter();

  function confirmarAprovacao() {
    setErro(null);
    startAprovar(async () => {
      try {
        await aprovarRetornoPedido(retorno.id, pedidoId);
        setModal(null);
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  function confirmarRejeicao() {
    setErro(null);
    startRejeitar(async () => {
      try {
        await rejeitarRetornoPedido(retorno.id, pedidoId, motivoRejeicao || undefined);
        setShowRejeitar(false);
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
      }
    });
  }

  return (
    <>
      {modal === "aprovar" && (
        <AssinarModal
          acao="Aprovar Retorno de Pedido"
          onConfirm={async () => confirmarAprovacao()}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            className="text-amber-600 mt-0.5 shrink-0 dark:text-amber-400">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Retorno de pedido aguardando aprovação
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              <span className="font-medium">Motivo: </span>{retorno.motivo}
            </p>
            {retorno.criado_por && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                Solicitado por {retorno.criado_por.nome} em{" "}
                {new Date(retorno.criado_em).toLocaleDateString("pt-BR")}
              </p>
            )}

            {podeAprovar && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pendingAprovar}
                  onClick={() => setModal("aprovar")}
                  className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {pendingAprovar ? "Aprovando…" : "Aprovar retorno"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejeitar((v) => !v)}
                  className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  Rejeitar
                </button>
              </div>
            )}

            {showRejeitar && (
              <div className="mt-3 space-y-2 max-w-sm">
                <textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  rows={2}
                  placeholder="Motivo da rejeição (opcional)…"
                  className="field text-sm w-full"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingRejeitar}
                    onClick={confirmarRejeicao}
                    className="rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
                  >
                    {pendingRejeitar ? "Rejeitando…" : "Confirmar rejeição"}
                  </button>
                  <button type="button" onClick={() => setShowRejeitar(false)}
                    className="text-sm text-text-3 hover:text-text-2 px-2">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
