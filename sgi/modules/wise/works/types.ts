export type WiseObraStatusRow = {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  is_final: boolean;
  ativo: boolean;
};

export type WiseCliente = {
  id: string;
  nome: string;
  razao_social: string | null;
};

export type WiseResponsavel = {
  id: string;
  nome: string;
};

export type WiseObra = {
  id: string;
  codigo: string | null;
  numero: number | null;
  nome: string;
  unidade_id: string | null;
  cliente_id: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  responsavel_comercial_id: string | null;
  responsavel_tecnico_id: string | null;
  status_id: string;
  data_prevista: string | null;
  observacoes: string | null;
  criado_em: string;
  deleted_at: string | null;
  // joins opcionais (dependem do select)
  cliente?: WiseCliente | null;
  status?: WiseObraStatusRow | null;
  responsavel_comercial?: WiseResponsavel | null;
  responsavel_tecnico?: WiseResponsavel | null;
  unidade?: { nome: string; codigo: string } | null;
};

export type WiseObraEstrutura = {
  id: string;
  obra_id: string;
  parent_id: string | null;
  tipo: 'TORRE' | 'BLOCO' | 'PAVIMENTO' | 'AMBIENTE' | 'OUTRO';
  nome: string;
  codigo: string | null;
  ordem: number;
  criado_em: string;
  filhos?: WiseObraEstrutura[];
};

export type WiseObraInput = {
  nome: string;
  cliente_id: string;
  unidade_id?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  responsavel_comercial_id?: string | null;
  responsavel_tecnico_id?: string | null;
  status_id: string;
  data_prevista?: string | null;
  observacoes?: string | null;
};

export type WiseEstruturaInput = {
  obra_id: string;
  parent_id?: string | null;
  tipo: WiseObraEstrutura['tipo'];
  nome: string;
  codigo?: string | null;
  ordem?: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; erro: string };
