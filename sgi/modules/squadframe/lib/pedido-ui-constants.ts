// Mapa de transições de status + rótulos de ação, compartilhado entre
// pedido-cliente.tsx (pedidos_compra) e o fluxo novo de beneficiamento
// (pedidos_beneficiamento) — os dois usam a MESMA state machine
// (validarTransicaoPedido em services/state-machines/compras.ts), então o
// mapa de UI também é o mesmo, extraído aqui pra não duplicar.
export type Transicao = { label: string; status: string; variant: "primary" | "ghost" | "danger" };

export const TRANSICOES: Record<string, Transicao[]> = {
  RASCUNHO:               [{ label: "Enviar aprovação", status: "AGUARDANDO_APROVACAO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  AGUARDANDO_APROVACAO:   [{ label: "Aprovar", status: "APROVADO", variant: "primary" }, { label: "Rejeitar", status: "REJEITADO", variant: "danger" }],
  REJEITADO:              [{ label: "Devolver para edição", status: "RASCUNHO", variant: "primary" }, { label: "Cancelar pedido", status: "CANCELADO", variant: "danger" }],
  APROVADO:               [{ label: "Emitir pedido", status: "AGUARDANDO_RECEBIMENTO", variant: "primary" }, { label: "Cancelar", status: "CANCELADO", variant: "danger" }],
  EMITIDO:                [{ label: "Emitir pedido", status: "AGUARDANDO_RECEBIMENTO", variant: "primary" }],
  AGUARDANDO_RECEBIMENTO: [],
  RECEBIDO_PARCIAL:       [],
  RECEBIDO:               [{ label: "Finalizar", status: "FINALIZADO", variant: "primary" }],
  FINALIZADO:             [],
  CANCELADO:              [],
};

export const ACAO_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Enviar para Aprovação",
  APROVADO: "Aprovar Pedido de Compra",
  REJEITADO: "Rejeitar Pedido",
  RASCUNHO: "Devolver para Edição",
  EMITIDO: "Emitir Pedido de Compra",
  AGUARDANDO_RECEBIMENTO: "Marcar como Aguardando Recebimento",
  FINALIZADO: "Finalizar Pedido",
  CANCELADO: "Cancelar Pedido",
};
