export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE";

export interface Movimentacao {
  id: string;
  numero: string;
  produto_id: string;
  obra_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  origem_tipo: string | null;
  origem_id: string | null;
  observacoes: string | null;
  usuario_id: string | null;
  criado_em: string;
  produto?: { codigo_mestre: string; nome: string; unidade: string | null } | null;
  obra?: { nome: string; codigo: string } | null;
  usuario?: { nome: string } | null;
}

export interface SaldoProduto {
  produto_id: string;
  obra_id: string;
  quantidade: number;
  atualizado_em: string;
  produto?: { codigo_mestre: string; nome: string; unidade: string | null } | null;
}
