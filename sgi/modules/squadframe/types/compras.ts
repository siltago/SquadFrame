export type StatusSolicitacao = 'ABERTA' | 'AGUARDANDO_APROVACAO' | 'APROVADA' | 'REJEITADA' | 'CANCELADA' | 'EM_PEDIDO';
export type StatusPedido = 'RASCUNHO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'REJEITADO' | 'EMITIDO' | 'AGUARDANDO_RECEBIMENTO' | 'RECEBIDO_PARCIAL' | 'RECEBIDO' | 'FINALIZADO' | 'CANCELADO';
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
  REJEITADO: 'Rejeitado',
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
  REJEITADO: '#ef4444',
  EMITIDO: '#3b82f6',
  AGUARDANDO_RECEBIMENTO: '#8b5cf6',
  RECEBIDO_PARCIAL: '#f97316',
  RECEBIDO: '#10b981',
  FINALIZADO: '#1e293b',
  CANCELADO: '#6b7280',
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

export type StatusRetorno = 'PENDENTE' | 'APROVADO' | 'REJEITADO';
export const STATUS_RET_LABEL: Record<StatusRetorno, string> = {
  PENDENTE:  'Pendente',
  APROVADO:  'Aprovado',
  REJEITADO: 'Rejeitado',
};
export const STATUS_RET_COR: Record<StatusRetorno, string> = {
  PENDENTE:  '#f59e0b',
  APROVADO:  '#10b981',
  REJEITADO: '#ef4444',
};

export type StatusDevolucao = 'RASCUNHO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'ENVIO' | 'ENTREGUE' | 'CANCELADO';
export const STATUS_DEV_LABEL: Record<StatusDevolucao, string> = {
  RASCUNHO:             'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguard. Aprovação',
  APROVADO:             'Aprovado',
  ENVIO:                'Em Envio',
  ENTREGUE:             'Entregue',
  CANCELADO:            'Cancelado',
};
export const STATUS_DEV_COR: Record<StatusDevolucao, string> = {
  RASCUNHO:             '#6b7280',
  AGUARDANDO_APROVACAO: '#f59e0b',
  APROVADO:             '#10b981',
  ENVIO:                '#3b82f6',
  ENTREGUE:             '#8b5cf6',
  CANCELADO:            '#ef4444',
};

export type DevolucaoCompra = {
  id: string;
  numero: string;
  pedido_id: string;
  motivo: string;
  status: StatusDevolucao;
  valor_total: number | null;
  usa_carteira: boolean;
  criado_em: string;
};

export type RetornoPendente = {
  id: string;
  motivo: string;
  etapa_anterior: string;
  criado_em: string;
  criado_por: { nome: string } | null;
};
