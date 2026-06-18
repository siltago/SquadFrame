export type StatusSolicitacao = 'ABERTA' | 'AGUARDANDO_APROVACAO' | 'APROVADA' | 'REJEITADA' | 'CANCELADA' | 'EM_PEDIDO';
export type StatusPedido = 'RASCUNHO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'EMITIDO' | 'AGUARDANDO_RECEBIMENTO' | 'RECEBIDO_PARCIAL' | 'RECEBIDO' | 'FINALIZADO' | 'CANCELADO';
export type Prioridade = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
export type Origem = 'OBRA' | 'ADMINISTRATIVO' | 'MANUTENCAO';

export const STATUS_SOL_LABEL: Record<StatusSolicitacao, string> = {
  ABERTA: 'Aberta',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
  EM_PEDIDO: 'Em Pedido',
};
export const STATUS_SOL_COR: Record<StatusSolicitacao, string> = {
  ABERTA: '#3b82f6',
  AGUARDANDO_APROVACAO: '#f59e0b',
  APROVADA: '#10b981',
  REJEITADA: '#ef4444',
  CANCELADA: '#6b7280',
  EM_PEDIDO: '#8b5cf6',
};

export const STATUS_PED_LABEL: Record<StatusPedido, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADO: 'Aprovado',
  EMITIDO: 'Emitido',
  AGUARDANDO_RECEBIMENTO: 'Aguard. Recebimento',
  RECEBIDO_PARCIAL: 'Recebido Parcial',
  RECEBIDO: 'Recebido',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};
export const STATUS_PED_COR: Record<StatusPedido, string> = {
  RASCUNHO: '#6b7280',
  AGUARDANDO_APROVACAO: '#f59e0b',
  APROVADO: '#10b981',
  EMITIDO: '#3b82f6',
  AGUARDANDO_RECEBIMENTO: '#8b5cf6',
  RECEBIDO_PARCIAL: '#f97316',
  RECEBIDO: '#10b981',
  FINALIZADO: '#1e293b',
  CANCELADO: '#ef4444',
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  BAIXA: 'Baixa', NORMAL: 'Normal', ALTA: 'Alta', URGENTE: 'Urgente',
};
export const PRIORIDADE_COR: Record<Prioridade, string> = {
  BAIXA: '#6b7280', NORMAL: '#3b82f6', ALTA: '#f59e0b', URGENTE: '#ef4444',
};

export const ORIGEM_LABEL: Record<Origem, string> = {
  OBRA: 'Obra', ADMINISTRATIVO: 'Administrativo', MANUTENCAO: 'Manutenção',
};
