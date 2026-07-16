export type WisePermissao = {
  id: string;
  chave: string;
  nome: string;
  modulo: string;
  criado_em: string;
};

export type WisePapel = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  is_admin: boolean;
  ativo: boolean;
  criado_em: string;
};

export type WisePapelComPermissoes = WisePapel & {
  permissoes: WisePermissao[];
};

export type WiseUsuarioPapel = {
  usuario_id: string;
  papel_id: string;
  atribuido_em: string;
  atribuido_por: string | null;
};
