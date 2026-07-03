// DTO do SquadBoard para pedidos de compra standalone (sem lote_id vinculado).
// A posição no board é DERIVADA do status — não persiste em tabela separada.
// Ao arrastar entre colunas, o status do pedido é atualizado para o
// "status canônico" da coluna de destino (ver COLUNA_STATUS_COMPRAS abaixo).

export type StatusPedidoBoard =
  | "RASCUNHO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "REJEITADO"
  | "EMITIDO"
  | "AGUARDANDO_RECEBIMENTO"
  | "RECEBIDO_PARCIAL"
  | "RECEBIDO"
  | "FINALIZADO";

// Status → coluna do pipeline Compras
export const STATUS_COLUNA_COMPRAS: Record<StatusPedidoBoard, string> = {
  RASCUNHO: "aguardando",
  AGUARDANDO_APROVACAO: "aguardando",
  REJEITADO: "aguardando",
  APROVADO: "solicitacao",
  EMITIDO: "solicitacao",
  AGUARDANDO_RECEBIMENTO: "pedido",
  RECEBIDO_PARCIAL: "pedido",
  RECEBIDO: "recebido",
  FINALIZADO: "recebido",
};

// Coluna → status canônico ao mover um card (drag & drop)
export const COLUNA_STATUS_COMPRAS: Record<string, StatusPedidoBoard> = {
  aguardando: "AGUARDANDO_APROVACAO",
  solicitacao: "APROVADO",
  pedido: "AGUARDANDO_RECEBIMENTO",
  recebido: "RECEBIDO",
};

export const STATUS_LABEL_PEDIDO: Record<StatusPedidoBoard, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguard. Aprovação",
  REJEITADO: "Rejeitado",
  APROVADO: "Aprovado",
  EMITIDO: "Emitido",
  AGUARDANDO_RECEBIMENTO: "Aguard. Recebimento",
  RECEBIDO_PARCIAL: "Recebido Parcial",
  RECEBIDO: "Recebido",
  FINALIZADO: "Finalizado",
};

export type BoardPedidoCard = {
  id: string;
  numero: string;
  obraId: string | null;
  obraNome: string | null;
  fornecedorId: string;
  fornecedor: string;
  compradorId: string | null;
  comprador: string | null;
  prazo: string | null;       // prazo_entrega ISO date
  valorFinal: number | null;
  status: StatusPedidoBoard;
  coluna: string;             // derivado de STATUS_COLUNA_COMPRAS[status]
  criadoEm: string;
};
