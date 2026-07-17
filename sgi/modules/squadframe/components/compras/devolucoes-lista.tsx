"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alterarStatusDevolucao } from "@/modules/squadframe/actions/compras/devolucao";
import { AssinarModal } from "@/modules/squadframe/components/assinar-modal";
import { usePode } from "@/modules/squadframe/components/user-provider";
import { STATUS_DEV_COR, STATUS_DEV_LABEL } from "@/modules/squadframe/types/compras";
import type { DevolucaoCompra, StatusDevolucao } from "@/modules/squadframe/types/compras";

type Transicao = { label: string; status: StatusDevolucao; variant: "primary" | "ghost" | "danger" };

const TRANSICOES: Record<StatusDevolucao, Transicao[]> = {
  RASCUNHO:             [{ label: "Enviar aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  AGUARDANDO_APROVACAO: [{ label: "Aprovar",  status: "APROVADO",  variant: "primary" }, { label: "Rejeitar", status: "CANCELADO", variant: "danger" }],
  APROVADO:             [{ label: "Marcar envio ao fornecedor", status: "ENVIO", variant: "primary" }],
  ENVIO:                [{ label: "Confirmar entrega da devolução", status: "ENTREGUE", variant: "primary" }],
  ENTREGUE:             [],
  CANCELADO:            [],
};

function StatusBadge({ status }: { status: StatusDevolucao }) {
  const cor = STATUS_DEV_COR[status] ?? "#6b7280";
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: cor + "20", color: cor }}>
      {STATUS_DEV_LABEL[status] ?? status}
    </span>
  );
}

function DevolucaoCard({ dev, pedidoId }: { dev: DevolucaoCompra; pedidoId: string }) {
  const podeCriar  = usePode("compras.pedido.devolver");
  const podeAprovar = usePode("compras.pedido.aprovar_devolucao");

  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [acaoPendente, setAcaoPendente] = useState<StatusDevolucao | null>(null);
  const router = useRouter();

  const transicoes = (TRANSICOES[dev.status] ?? []).filter((t) => {
    if (t.status === "APROVADO" || (dev.status === "AGUARDANDO_APROVACAO" && t.status === "CANCELADO")) {
      return podeAprovar;
    }
    return podeCriar;
  });

  function handleAcao(status: StatusDevolucao) {
    setAcaoPendente(status);
    setModal(`${STATUS_DEV_LABEL[status] ?? status} — Devolução ${dev.numero}`);
  }

  function confirmar() {
    if (!acaoPendente) return;
    setErro(null);
    start(async () => {
      try {
        await alterarStatusDevolucao(dev.id, pedidoId, acaoPendente);
        setModal(null);
        setAcaoPendente(null);
        router.refresh();
      } catch (e: any) {
        setErro(e.message);
        setModal(null);
      }
    });
  }

  return (
    <>
      {modal && (
        <AssinarModal
          acao={modal}
          onConfirm={async () => { setModal(null); confirmar(); }}
          onCancel={() => { setModal(null); setAcaoPendente(null); }}
        />
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-text-3">{dev.numero}</span>
              <StatusBadge status={dev.status} />
              {dev.usa_carteira && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Faturamento direto
                </span>
              )}
            </div>
            <p className="text-sm text-text">{dev.motivo}</p>
            <p className="text-xs text-text-3">
              Criado em {new Date(dev.criado_em).toLocaleDateString("pt-BR")}
              {dev.valor_total != null && (
                <> · Valor: {Number(dev.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</>
              )}
            </p>
          </div>

          {transicoes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {transicoes.map((t) => (
                <button
                  key={t.status}
                  type="button"
                  disabled={pending}
                  onClick={() => handleAcao(t.status)}
                  className={
                    t.variant === "primary"
                      ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      : t.variant === "danger"
                      ? "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
                      : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-2 hover:bg-bg disabled:opacity-50"
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {dev.status === "ENTREGUE" && dev.usa_carteira && dev.valor_total != null && (
          <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {Number(dev.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} creditados de volta na carteira.
          </div>
        )}

        {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
      </div>
    </>
  );
}

export function DevolucoesList({
  devolucoesCompra,
  pedidoId,
}: {
  devolucoesCompra: DevolucaoCompra[];
  pedidoId: string;
}) {
  if (devolucoesCompra.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">
        Devoluções · {devolucoesCompra.length}
      </h2>
      <div className="space-y-3">
        {devolucoesCompra.map((d) => (
          <DevolucaoCard key={d.id} dev={d} pedidoId={pedidoId} />
        ))}
      </div>
    </div>
  );
}
