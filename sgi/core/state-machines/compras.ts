import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// MÁQUINAS DE ESTADO — Módulo Compras
//
// Toda transição de status deve passar por validarTransicao*.
// Transições inválidas lançam erro antes de qualquer DB write.
// Transições automáticas (sistema) são marcadas com o comentário [sistema].
// ─────────────────────────────────────────────────────────────────────────────

// ── SOLICITAÇÕES ─────────────────────────────────────────────────────────────

export type StatusSolicitacao =
  | "ABERTA"
  | "AGUARDANDO_APROVACAO"
  | "APROVADA"
  | "REJEITADA"
  | "CANCELADA"
  | "EM_PEDIDO";

const TRANSICOES_SOLICITACAO: Record<StatusSolicitacao, StatusSolicitacao[]> = {
  ABERTA:               ["AGUARDANDO_APROVACAO", "CANCELADA"],
  AGUARDANDO_APROVACAO: ["APROVADA", "REJEITADA", "CANCELADA"],
  APROVADA:             ["EM_PEDIDO"],      // [sistema] via SideEffectsConsumer
  EM_PEDIDO:            ["APROVADA"],       // [sistema] via SideEffectsConsumer ao excluir pedido
  REJEITADA:            [],                 // terminal
  CANCELADA:            [],                 // terminal
};

export function validarTransicaoSolicitacao(
  atual: string,
  proximo: string,
): void {
  const permitidas = TRANSICOES_SOLICITACAO[atual as StatusSolicitacao] ?? [];
  if (!permitidas.includes(proximo as StatusSolicitacao)) {
    throw new Error(
      `Transição de solicitação inválida: ${atual} → ${proximo}. ` +
      `Permitidas: ${permitidas.join(", ") || "nenhuma (estado terminal)"}`,
    );
  }
}

export function isStatusSolicitacaoTerminal(status: string): boolean {
  const transicoes = TRANSICOES_SOLICITACAO[status as StatusSolicitacao];
  return Array.isArray(transicoes) && transicoes.length === 0;
}

// ── PEDIDOS ──────────────────────────────────────────────────────────────────

export type StatusPedido =
  | "RASCUNHO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "AGUARDANDO_RECEBIMENTO"
  | "RECEBIDO_PARCIAL"
  | "RECEBIDO"
  | "FINALIZADO"
  | "CANCELADO";

const TRANSICOES_PEDIDO: Record<StatusPedido, StatusPedido[]> = {
  RASCUNHO:               ["AGUARDANDO_APROVACAO"],
  AGUARDANDO_APROVACAO:   ["APROVADO", "CANCELADO"],
  APROVADO:               ["AGUARDANDO_RECEBIMENTO", "CANCELADO"],
  AGUARDANDO_RECEBIMENTO: ["RECEBIDO_PARCIAL", "RECEBIDO", "CANCELADO"],
  RECEBIDO_PARCIAL:       ["RECEBIDO"],  // [sistema] via registrarRecebimento
  RECEBIDO:               [],            // terminal
  FINALIZADO:             [],            // terminal
  CANCELADO:              [],            // terminal
};

export function validarTransicaoPedido(
  atual: string,
  proximo: string,
): void {
  const permitidas = TRANSICOES_PEDIDO[atual as StatusPedido] ?? [];
  if (!permitidas.includes(proximo as StatusPedido)) {
    throw new Error(
      `Transição de pedido inválida: ${atual} → ${proximo}. ` +
      `Permitidas: ${permitidas.join(", ") || "nenhuma (estado terminal)"}`,
    );
  }
}

export function isStatusPedidoTerminal(status: string): boolean {
  const transicoes = TRANSICOES_PEDIDO[status as StatusPedido];
  return Array.isArray(transicoes) && transicoes.length === 0;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Retorna true se o pedido ainda pode ser editado (não está em estado final)
export function pedidoEditavel(status: string): boolean {
  return ["RASCUNHO", "AGUARDANDO_APROVACAO"].includes(status);
}

// Retorna true se a solicitação pode ser excluída pelo usuário
export function solicitacaoExcluivel(status: string): boolean {
  // EM_PEDIDO não pode ser excluída: há pedidos referenciando seus itens
  // APROVADA vinculada a pedido activo também não deveria (validação adicional em excluirSolicitacoes)
  return !["EM_PEDIDO"].includes(status);
}
