export type WiseUsuarioStatus = "ativo" | "inativo" | "bloqueado" | "convidado";

export type WiseSetor = {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
};

export type WiseCargo = {
  id: string;
  empresa_id: string;
  setor_id: string | null;
  nome: string;
  nivel: number;
  cor: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
};

export type WiseUsuario = {
  id: string;
  empresa_id: string;
  auth_id: string | null;
  unidade_id: string | null;
  setor_id: string | null;
  cargo_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  foto_url: string | null;
  status: WiseUsuarioStatus;
  criado_em: string;
  ultimo_acesso: string | null;
  convite_token: string | null;
  convite_expira_em: string | null;
};
