export type WiseEmpresa = {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type WiseUnidade = {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  criado_em: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

export type WiseModulo = {
  id: string;
  chave: string;
  nome: string;
  ativo: boolean;
};

export type WiseEmpresaModulo = {
  empresa_id: string;
  modulo_id: string;
  habilitado_em: string;
};
