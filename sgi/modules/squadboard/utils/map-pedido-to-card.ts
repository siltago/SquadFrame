import { STATUS_COLUNA_COMPRAS, type BoardPedidoCard, type StatusPedidoBoard } from "@/modules/squadboard/types/pedido";

export type PedidoBoardRaw = {
  id: string;
  numero: string;
  status: string;
  obra_id: string | null;
  comprador_id: string | null;
  prazo_entrega: string | null;
  valor_final: number | null;
  criado_em: string;
  fornecedor_id: string;
  obra: { id: string; nome: string; deleted_at: string | null }[] | { id: string; nome: string; deleted_at: string | null } | null;
  fornecedor: { nome: string }[] | { nome: string } | null;
  comprador: { nome: string }[] | { nome: string } | null;
};

export function mapPedidoParaBoardCard(raw: PedidoBoardRaw): BoardPedidoCard {
  const obra = Array.isArray(raw.obra) ? raw.obra[0] ?? null : raw.obra;
  const fornecedor = Array.isArray(raw.fornecedor) ? raw.fornecedor[0] ?? null : raw.fornecedor;
  const comprador = Array.isArray(raw.comprador) ? raw.comprador[0] ?? null : raw.comprador;

  const status = raw.status as StatusPedidoBoard;

  return {
    id: raw.id,
    numero: raw.numero,
    obraId: raw.obra_id,
    obraNome: obra?.nome ?? null,
    fornecedorId: raw.fornecedor_id,
    fornecedor: fornecedor?.nome ?? "Fornecedor desconhecido",
    compradorId: raw.comprador_id,
    comprador: comprador?.nome ?? null,
    prazo: raw.prazo_entrega,
    valorFinal: raw.valor_final,
    status,
    coluna: STATUS_COLUNA_COMPRAS[status] ?? "aguardando",
    criadoEm: raw.criado_em,
  };
}
