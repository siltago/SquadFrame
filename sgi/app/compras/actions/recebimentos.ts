"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { PERMISSIONS } from "@/core/permissions/permissions";
import { verificarPermissao } from "@/core/permissions/check-permission";
import { emitirEvento } from "@/core/events/event-bus";
import { EVENTS } from "@/core/events/event-types";
import { getUsuarioId } from "./helpers";

export async function registrarRecebimento(
  pedidoId: string,
  dataRecebimento: string,
  observacoes: string,
  itens: { pedido_item_id: string; quantidade_recebida: number; observacoes?: string }[],
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_RECEBIMENTO_REGISTRAR);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const itemsValidos = itens.filter((i) => i.quantidade_recebida > 0);
  if (!itemsValidos.length) throw new Error("Informe ao menos uma quantidade.");

  // RPC atômica: valida saldos + insere recebimento + itens + trigger recalcula status
  // A validação de saldo ocorre dentro da RPC com SELECT FOR SHARE (sem race condition).
  const { data: result, error } = await admin.rpc("registrar_recebimento", {
    p_pedido_id:        pedidoId,
    p_responsavel_id:   usuario_id,
    p_data_recebimento: dataRecebimento,
    p_observacoes:      observacoes,
    p_itens:            JSON.stringify(itemsValidos),
  });
  if (error) throw new Error(error.message);

  const { recebimento_id, status_resultante } = result as {
    recebimento_id: string;
    status_resultante: string;
  };

  // Evento de status do pedido → KanbanConsumer move o card
  const tipoEventoPedido =
    status_resultante === "RECEBIDO"
      ? EVENTS.PURCHASE_ORDER_RECEIVED_FULL
      : EVENTS.PURCHASE_ORDER_RECEIVED_PARTIAL;

  await emitirEvento(tipoEventoPedido, {
    order_id:    pedidoId,
    status_novo: status_resultante,
    usuario_id,
    dados:       { recebimento_id },
  });

  // Evento de recebimento → AssinaturaConsumer registra assinatura eletrônica
  await emitirEvento(EVENTS.PURCHASE_RECEIPT_REGISTERED, {
    receipt_id:        recebimento_id,
    order_id:          pedidoId,
    usuario_id,
    data_recebimento:  dataRecebimento,
    itens_count:       itemsValidos.length,
    status_resultante,
  });
}
