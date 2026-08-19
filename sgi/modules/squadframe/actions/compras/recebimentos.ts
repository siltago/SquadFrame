"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";
import { getUsuarioId } from "./helpers";

type ItemRecebido = { pedido_item_id: string; quantidade_recebida: number; observacoes?: string };

// Núcleo compartilhado entre o recebimento individual e o em lote — grava um
// recebimento pra UM pedido e emite os eventos de domínio. A permissão é
// checada uma única vez, no ponto de entrada (registrarRecebimento ou
// registrarRecebimentoLote), não aqui dentro.
async function registrarRecebimentoInterno(
  admin: ReturnType<typeof createAdminClient>,
  usuario_id: string,
  pedidoId: string,
  dataRecebimento: string,
  observacoes: string,
  itens: ItemRecebido[],
  romaneioId?: string | null,
) {
  const itemsValidos = itens.filter((i) => i.quantidade_recebida > 0);
  if (!itemsValidos.length) throw new Error("Informe ao menos uma quantidade.");

  // RPC atômica: valida saldos + insere recebimento + itens + trigger recalcula status
  // A validação de saldo ocorre dentro da RPC com SELECT FOR SHARE (sem race condition).
  const { data: result, error } = await admin.rpc("registrar_recebimento", {
    p_pedido_id:        pedidoId,
    p_responsavel_id:   usuario_id,
    p_data_recebimento: dataRecebimento,
    p_observacoes:      observacoes,
    p_itens:            itemsValidos,
    p_romaneio_id:      romaneioId ?? null,
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

  return { recebimento_id, status_resultante };
}

export async function registrarRecebimento(
  pedidoId: string,
  dataRecebimento: string,
  observacoes: string,
  itens: ItemRecebido[],
  romaneioId?: string | null,
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_RECEBIMENTO_REGISTRAR);
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  await registrarRecebimentoInterno(admin, usuario_id, pedidoId, dataRecebimento, observacoes, itens, romaneioId);
}

export type ResultadoLote = {
  sucesso: { pedidoId: string; numero: string; statusResultante: string; recebimentoId: string }[];
  falhas: { pedidoId: string; numero: string; mensagem: string }[];
};

// Recebimento em lote — usado quando vários pedidos chegam juntos no mesmo
// romaneio. Loop SEQUENCIAL (não Promise.all): cada RPC já é atômica por
// pedido sozinha, mas não há transação cobrindo o lote inteiro via
// PostgREST, então o loop sequencial garante ordem previsível de
// sucesso/falha (mesma ordem que a tela mostra) em vez de falhas
// concorrentes intercaladas. Falha de um pedido nunca aborta os seguintes —
// o resultado sempre reflete o que foi de fato gravado, nunca um erro
// genérico que sugira que nada foi salvo quando parte do lote já foi.
export async function registrarRecebimentoLote(
  romaneioId: string,
  dataRecebimento: string,
  observacoes: string,
  itensPorPedido: { pedidoId: string; itens: ItemRecebido[] }[],
): Promise<ResultadoLote> {
  await verificarPermissao(PERMISSIONS.COMPRAS_RECEBIMENTO_REGISTRAR);

  const grupos = itensPorPedido.filter((g) => g.itens.some((i) => i.quantidade_recebida > 0));
  if (!grupos.length) throw new Error("Informe ao menos uma quantidade.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: pedidosInfo } = await admin
    .from("pedidos_compra")
    .select("id, numero")
    .in("id", grupos.map((g) => g.pedidoId));
  const numeroPorId = new Map((pedidosInfo ?? []).map((p) => [p.id, p.numero]));

  const resultado: ResultadoLote = { sucesso: [], falhas: [] };

  for (const grupo of grupos) {
    const numero = numeroPorId.get(grupo.pedidoId) ?? grupo.pedidoId;
    try {
      const { recebimento_id, status_resultante } = await registrarRecebimentoInterno(
        admin, usuario_id, grupo.pedidoId, dataRecebimento, observacoes, grupo.itens, romaneioId,
      );
      resultado.sucesso.push({ pedidoId: grupo.pedidoId, numero, statusResultante: status_resultante, recebimentoId: recebimento_id });
    } catch (e: any) {
      resultado.falhas.push({ pedidoId: grupo.pedidoId, numero, mensagem: e.message ?? "Erro desconhecido." });
    }
  }

  return resultado;
}
