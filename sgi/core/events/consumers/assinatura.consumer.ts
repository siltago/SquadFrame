import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { DomainEvent, EVENTS } from "../event-types";

const EVENTO_ACAO_ASSINATURA: Record<string, { entidade: string; acao: string }> = {
  [EVENTS.PURCHASE_REQUEST_CREATED]:         { entidade: "solicitacao", acao: "CRIADA" },
  [EVENTS.PURCHASE_REQUEST_SUBMITTED]:       { entidade: "solicitacao", acao: "STATUS_AGUARDANDO_APROVACAO" },
  [EVENTS.PURCHASE_REQUEST_APPROVED]:        { entidade: "solicitacao", acao: "STATUS_APROVADA" },
  [EVENTS.PURCHASE_REQUEST_REJECTED]:        { entidade: "solicitacao", acao: "STATUS_REJEITADA" },
  [EVENTS.PURCHASE_REQUEST_CANCELLED]:       { entidade: "solicitacao", acao: "STATUS_CANCELADA" },
  [EVENTS.PURCHASE_ORDER_CREATED]:           { entidade: "pedido",      acao: "CRIADO" },
  [EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL]: { entidade: "pedido",      acao: "STATUS_AGUARDANDO_APROVACAO" },
  [EVENTS.PURCHASE_ORDER_APPROVED]:          { entidade: "pedido",      acao: "STATUS_APROVADO" },
  [EVENTS.PURCHASE_ORDER_SENT]:              { entidade: "pedido",      acao: "STATUS_EMITIDO" },
  [EVENTS.PURCHASE_ORDER_CANCELLED]:         { entidade: "pedido",      acao: "STATUS_CANCELADO" },
  [EVENTS.PURCHASE_ORDER_EDITED]:            { entidade: "pedido",      acao: "EDITADO" },
  [EVENTS.PURCHASE_RECEIPT_REGISTERED]:      { entidade: "pedido",      acao: "RECEBIMENTO" },
};

export async function assinaturaConsumerHandler(event: DomainEvent): Promise<void> {
  const mapeamento = EVENTO_ACAO_ASSINATURA[event.tipo];
  if (!mapeamento) return;

  const p = event.payload;
  const usuario_id =
    (p.usuario_id ?? p.solicitante_id ?? p.comprador_id) as string | undefined;
  // Para PURCHASE_RECEIPT_REGISTERED, order_id é o entidade_id canônico
  const entidade_id =
    (p.request_id ?? p.order_id) as string | undefined;

  if (!usuario_id || !entidade_id) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from("assinaturas")
    .select("texto")
    .eq("usuario_id", usuario_id)
    .single();
  if (!data?.texto) return;

  // ON CONFLICT DO NOTHING via unique index (entidade_id, acao, evento_id) WHERE evento_id IS NOT NULL
  await admin.from("assinatura_eventos").insert({
    usuario_id,
    entidade: mapeamento.entidade,
    entidade_id,
    acao: mapeamento.acao,
    texto: data.texto,
    evento_id: event.id ?? null,
  }).select();
}
