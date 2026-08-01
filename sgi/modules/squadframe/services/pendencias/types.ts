export type TipoPendencia =
  | "APROVADO_SEM_EMITIR"
  | "PRAZO_VENCIDO"
  | "RECEBIDO_SEM_VALOR"
  | "RASCUNHO_ESQUECIDO";

export const PENDENCIA_LABEL: Record<TipoPendencia, string> = {
  APROVADO_SEM_EMITIR: "Aprovado, mas não emitido",
  PRAZO_VENCIDO: "Prazo de entrega vencido, sem recebimento",
  RECEBIDO_SEM_VALOR: "Recebido, sem valor final registrado",
  RASCUNHO_ESQUECIDO: "Rascunho parado sem envio",
};

export type Pendencia = {
  pedidoId: string;
  numero: string;
  fornecedorNome: string | null;
  tipo: TipoPendencia;
  diasEmAberto: number;
  ultimoMotivo: string | null;
};
