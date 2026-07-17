export type WisePacoteStatus = 'RASCUNHO' | 'ATIVO' | 'SUSPENSO' | 'CONCLUIDO' | 'CANCELADO';
export type WisePrioridade  = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type WisePacoteModulo = 'frame' | 'board' | 'flow' | 'stock' | 'measure';

export const MODULOS_LABEL: Record<WisePacoteModulo, string> = {
  frame:   'SquadFrame (Compras)',
  board:   'SquadBoard (Kanban)',
  flow:    'SquadFlow (Produção)',
  stock:   'SquadStock (Estoque)',
  measure: 'SquadMeasure (Medições)',
};

export const STATUS_LABEL: Record<WisePacoteStatus, string> = {
  RASCUNHO: 'Rascunho',
  ATIVO:    'Ativo',
  SUSPENSO: 'Suspenso',
  CONCLUIDO:'Concluído',
  CANCELADO:'Cancelado',
};

export const STATUS_COR: Record<WisePacoteStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  ATIVO:    'bg-green-100 text-green-700',
  SUSPENSO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO:'bg-blue-100 text-blue-700',
  CANCELADO:'bg-red-100 text-red-600',
};

export const PRIORIDADE_LABEL: Record<WisePrioridade, string> = {
  BAIXA:   'Baixa',
  MEDIA:   'Média',
  ALTA:    'Alta',
  CRITICA: 'Crítica',
};

export const PRIORIDADE_COR: Record<WisePrioridade, string> = {
  BAIXA:   'text-slate-500',
  MEDIA:   'text-blue-500',
  ALTA:    'text-orange-500',
  CRITICA: 'text-red-600',
};

export type WisePacote = {
  id: string;
  obra_id: string;
  empresa_id: string | null;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  status: WisePacoteStatus;
  prioridade: WisePrioridade | null;
  prazo: string | null;
  responsavel_id: string | null;
  tipo: string | null;
  revisao: number;
  criado_em: string;
  // joins
  responsavel?: { id: string; nome: string } | null;
  obra?: { id: string; nome: string; codigo: string | null } | null;
  modulos?: WisePacoteModuloRow[];
  _count?: { tipologias: number };
};

export type WisePacoteModuloRow = {
  pacote_id: string;
  modulo: WisePacoteModulo;
  habilitado: boolean;
};

export type WisePacoteEscopoEstrutura = {
  pacote_id: string;
  estrutura_id: string;
  estrutura?: {
    tipo: string;
    nome: string;
    codigo: string | null;
    parent_id: string | null;
  };
};

export type WisePacoteEscopoTipologia = {
  pacote_id: string;
  tipologia_id: string;
  quantidade: number | null;
  tipologia?: {
    nome: string;
    codigo_esquadria: string | null;
    quantidade: number;
    status: string;
  };
};

export type WisePacoteInput = {
  obra_id: string;
  nome: string;
  descricao?: string | null;
  prioridade?: WisePrioridade | null;
  prazo?: string | null;
  responsavel_id?: string | null;
  tipo?: string | null;
  modulos?: WisePacoteModulo[];
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; erro: string };
