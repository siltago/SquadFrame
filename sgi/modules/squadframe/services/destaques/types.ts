export type TipoDestaque =
  | "PEDIDOS_ATRASADOS"
  | "PEDIDOS_SEM_PRAZO"
  | "PEDIDOS_PARADOS_APROVACAO"
  | "CARTEIRAS_SALDO_BAIXO";

export type Destaque = {
  tipo: TipoDestaque;
  variant: "danger" | "warning";
  titulo: string;
  corpo: string;
  href: string;
};
