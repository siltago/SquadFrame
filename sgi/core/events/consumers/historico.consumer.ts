import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { DomainEvent, EVENTS } from "../event-types";

const EVENTO_HISTORICO: Record<string, { entidade: string; acao: string }> = {
  [EVENTS.PURCHASE_REQUEST_CREATED]:           { entidade: "solicitacao", acao: "CRIADA" },
  [EVENTS.PURCHASE_REQUEST_SUBMITTED]:         { entidade: "solicitacao", acao: "STATUS_AGUARDANDO_APROVACAO" },
  [EVENTS.PURCHASE_REQUEST_APPROVED]:          { entidade: "solicitacao", acao: "STATUS_APROVADA" },
  [EVENTS.PURCHASE_REQUEST_REJECTED]:          { entidade: "solicitacao", acao: "STATUS_REJEITADA" },
  [EVENTS.PURCHASE_REQUEST_CANCELLED]:         { entidade: "solicitacao", acao: "STATUS_CANCELADA" },
  [EVENTS.PURCHASE_ORDER_CREATED]:             { entidade: "pedido",      acao: "CRIADO" },
  [EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL]:   { entidade: "pedido",      acao: "STATUS_AGUARDANDO_APROVACAO" },
  [EVENTS.PURCHASE_ORDER_APPROVED]:            { entidade: "pedido",      acao: "STATUS_APROVADO" },
  [EVENTS.PURCHASE_ORDER_SENT]:                { entidade: "pedido",      acao: "STATUS_EMITIDO" },
  [EVENTS.PURCHASE_ORDER_CANCELLED]:           { entidade: "pedido",      acao: "STATUS_CANCELADO" },
  [EVENTS.PURCHASE_ORDER_RECEIVED_PARTIAL]:    { entidade: "pedido",      acao: "STATUS_RECEBIDO_PARCIAL" },
  [EVENTS.PURCHASE_ORDER_RECEIVED_FULL]:       { entidade: "pedido",      acao: "STATUS_RECEBIDO" },
  [EVENTS.PURCHASE_ORDER_EDITED]:              { entidade: "pedido",      acao: "EDITADO" },
  [EVENTS.PURCHASE_RECEIPT_REGISTERED]:        { entidade: "pedido",      acao: "RECEBIMENTO_REGISTRADO" },
};

export async function historicoConsumerHandler(event: DomainEvent): Promise<void> {
  const p = event.payload;
  const admin = createAdminClient();
  const evento_id = event.id ?? null;

  // Exclusão em lote — batch insert único em vez de N inserts paralelos
  if (event.tipo === EVENTS.PURCHASE_ORDER_DELETED) {
    const orderIds = p.order_ids as string[];
    const usuario_id = (p.deleted_by as string | null) ?? null;
    await admin.from("compra_historico").insert(
      orderIds.map((id) => ({
        entidade: "pedido",
        entidade_id: id,
        usuario_id,
        acao: "EXCLUIDO",
        dados: {},
        evento_id,
      })),
    ).select();
    return;
  }

  if (event.tipo === EVENTS.PURCHASE_REQUEST_DELETED) {
    const requestIds = p.request_ids as string[];
    const usuario_id = (p.deleted_by as string | null) ?? null;
    await admin.from("compra_historico").insert(
      requestIds.map((id) => ({
        entidade: "solicitacao",
        entidade_id: id,
        usuario_id,
        acao: "EXCLUIDO",
        dados: {},
        evento_id,
      })),
    ).select();
    return;
  }

  const mapeamento = EVENTO_HISTORICO[event.tipo];
  if (!mapeamento) return;

  const entidade_id = (p.request_id ?? p.order_id ?? p.receipt_id) as string | undefined;
  if (!entidade_id) return;

  const usuario_id =
    (p.usuario_id ?? p.solicitante_id ?? p.comprador_id ?? null) as string | null;

  await admin.from("compra_historico").insert({
    entidade: mapeamento.entidade,
    entidade_id,
    usuario_id,
    acao: mapeamento.acao,
    dados: (p.dados as object | undefined) ?? {},
    evento_id,
  }).select();
}
