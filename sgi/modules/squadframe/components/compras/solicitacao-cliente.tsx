"use client";

import { alterarStatusSolicitacao } from "@/app/squadframe/compras/actions";
import { StatusTransitionActions, type Transicao } from "@/modules/squadframe/components/status-transition-actions";

const TRANSICOES: Record<string, Transicao[]> = {
  ABERTA:               [{ label: "Enviar para aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADA", variant: "danger" }],
  AGUARDANDO_APROVACAO: [{ label: "Aprovar", status: "APROVADA", variant: "primary" }, { label: "Rejeitar", status: "REJEITADA", variant: "danger" }],
  APROVADA:             [],
  REJEITADA:            [{ label: "Reabrir", status: "ABERTA", variant: "ghost" }],
  CANCELADA:            [],
};

const ACAO_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Enviar para Aprovação",
  APROVADA: "Aprovar Solicitação",
  REJEITADA: "Rejeitar Solicitação",
  CANCELADA: "Cancelar Solicitação",
  ABERTA: "Reabrir Solicitação",
};

export function SolicitacaoCliente({ solicitacao }: { solicitacao: any }) {
  const transicoes = TRANSICOES[solicitacao.status] ?? [];

  return (
    <StatusTransitionActions
      transicoes={transicoes}
      acaoLabel={ACAO_LABEL}
      precisaObservacao={(status) => status === "CANCELADA" || status === "REJEITADA"}
      onExecutar={async (status, extra) => {
        await alterarStatusSolicitacao(solicitacao.id, status, extra?.observacoes);
      }}
    />
  );
}
