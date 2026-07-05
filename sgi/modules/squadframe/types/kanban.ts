export type ColunaTipo = 'PADRAO' | 'CUSTOM';
export type TarefaOrigem = 'MANUAL' | 'COMPRA' | 'PRODUCAO' | 'QUALIDADE' | 'EXPEDICAO' | 'OBRA';
export type TarefaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TarefaStatus = 'SEM_DONO' | 'ACEITA' | 'EM_ANDAMENTO' | 'AGUARDANDO' | 'CONCLUIDA' | 'CANCELADA';
export type ParticipantePapel = 'responsavel' | 'colaborador' | 'observador';
export type NotificacaoTipo =
  | 'tarefa_atribuida'
  | 'tarefa_comentario'
  | 'pedido_aprovado'
  | 'pedido_aguardando_aprovacao'
  | 'debito_carteira_falhou'
  | 'solicitacao_aprovada'
  | 'solicitacao_rejeitada'
  // SquadBoard
  | 'board_card_atribuido'
  | 'board_card_movido'
  | 'board_card_comentario'
  | 'board_checklist_mencionado'
  | 'board_card_prazo_proximo';

export type Coluna = {
  id: string; nome: string; ordem: number; tipo: ColunaTipo;
  setor_id: string | null; usuario_id: string | null;
  cor: string | null; aceita_automaticas: boolean;
};

export type Etiqueta = { id: string; nome: string; cor: string; setor_id: string | null; };

export type TarefaParticipante = {
  tarefa_id: string;
  usuario_id: string;
  papel: ParticipantePapel;
  criado_em: string;
  usuario?: { id: string; nome: string };
};

export type Notificacao = {
  id: string;
  usuario_id: string;
  tipo: NotificacaoTipo;
  tarefa_id: string | null;
  payload: Record<string, unknown>;
  lida: boolean;
  criado_em: string;
};

export type Tarefa = {
  id: string; titulo: string; descricao: string | null;
  coluna_id: string | null; ordem: number;
  setor_id: string | null; usuario_responsavel_id: string | null;
  criado_por: string | null;
  origem: TarefaOrigem; entidade_ref: string | null; entidade_ref_id: string | null;
  obra_id: string | null; pedido_id: string | null; orcamento_id: string | null;
  prioridade: TarefaPrioridade; data_limite: string | null;
  status: TarefaStatus; aceita_em: string | null; concluida_em: string | null;
  criado_em: string; deleted_at: string | null;
  responsavel?: { id: string; nome: string } | null;
  etiquetas?: Etiqueta[];
  participantes?: TarefaParticipante[];
  checklist?: ChecklistItem[];
  _checklist_total?: number; _checklist_done?: number;
  _tem_arquivos?: boolean; _tem_links?: boolean;
};

export type ChecklistItem = { id: string; texto: string; concluido: boolean; ordem: number; };
export type TarefaComentario = { id: string; tarefa_id: string; usuario_id: string; texto: string; criado_em: string; usuario?: { nome: string }; };
export type TarefaHistorico = { id: string; tarefa_id: string; usuario_id: string | null; acao: string; dados: any; criado_em: string; usuario?: { nome: string }; };
export type TarefaLink = { id: string; titulo: string; url: string; };
export type TarefaArquivo = { id: string; nome: string; url: string; tipo: string | null; };

export const PRIORIDADE_COR: Record<TarefaPrioridade, string> = {
  BAIXA: '#9ca3af', MEDIA: '#3b82f6', ALTA: '#f97316', CRITICA: '#ef4444',
};
export const PRIORIDADE_LABEL: Record<TarefaPrioridade, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
};
export const ORIGEM_LABEL: Record<TarefaOrigem, string> = {
  MANUAL: 'Manual', COMPRA: 'Compra', PRODUCAO: 'Produção',
  QUALIDADE: 'Qualidade', EXPEDICAO: 'Expedição', OBRA: 'Obra',
};
export const ORIGEM_COR: Record<TarefaOrigem, string> = {
  MANUAL: '#6366f1', COMPRA: '#0ea5e9', PRODUCAO: '#f59e0b',
  QUALIDADE: '#10b981', EXPEDICAO: '#8b5cf6', OBRA: '#f97316',
};
