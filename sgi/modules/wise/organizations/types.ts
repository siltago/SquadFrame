export type WiseUnidade = {
  id: string;
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
