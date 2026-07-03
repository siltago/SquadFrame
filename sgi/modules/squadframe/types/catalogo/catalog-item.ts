export type CatalogItem = {
  id: string;
  codigo: string;
  descricao: string;
  fornecedor: string | null;
  linha: { id: string; nome: string } | null;
  categoria: { id: string; nome: string } | null;
  status: boolean;
  unidade: string;
  previewUrl: string | null;
  href: string;
};
