"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";
import { getUsuarioId } from "./helpers";

const STATUS_RETORNAVEL = ["APROVADO", "EMITIDO", "AGUARDANDO_RECEBIMENTO"] as const;

export async function criarRetornoPedido(
  pedidoId: string,
  motivo: string,
  alteracoes: Record<string, unknown>,
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_RETORNAR);
  if (!motivo.trim()) throw new Error("Informe o motivo do retorno.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status, retorno_pendente_id")
    .eq("id", pedidoId)
    .single();

  if (!ped) throw new Error("Pedido não encontrado.");

  if (!(STATUS_RETORNAVEL as readonly string[]).includes(ped.status)) {
    throw new Error(`Retorno não é permitido no status "${ped.status}".`);
  }

  if (ped.retorno_pendente_id) {
    throw new Error("Já existe um retorno pendente para este pedido.");
  }

  const { data: retorno, error } = await admin
    .from("pedido_retornos")
    .insert({
      pedido_id:      pedidoId,
      etapa_anterior: ped.status,
      motivo:         motivo.trim(),
      alteracoes,
      criado_por:     usuario_id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await admin
    .from("pedidos_compra")
    .update({ retorno_pendente_id: retorno.id })
    .eq("id", pedidoId);

  await admin.from("compra_historico").insert({
    entidade:    "pedido",
    entidade_id: pedidoId,
    acao:        "RETORNO_SOLICITADO",
    dados:       { motivo: motivo.trim(), retorno_id: retorno.id },
    usuario_id,
  });

  await emitirEvento(EVENTS.PURCHASE_ORDER_RETURN_REQUESTED, {
    order_id:   pedidoId,
    retorno_id: retorno.id,
    usuario_id,
    dados:      { motivo },
  });

  redirect(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function aprovarRetornoPedido(retornoId: string, pedidoId: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_APROVAR_RETORNO);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { error } = await admin.rpc("aprovar_retorno_pedido" as any, {
    p_retorno_id: retornoId,
    p_usuario_id: usuario_id,
  });

  if (error) throw new Error(error.message);

  await emitirEvento(EVENTS.PURCHASE_ORDER_RETURN_APPROVED, {
    order_id:   pedidoId,
    retorno_id: retornoId,
    usuario_id,
  });

  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function rejeitarRetornoPedido(
  retornoId: string,
  pedidoId: string,
  motivoRejeicao?: string,
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_APROVAR_RETORNO);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { error } = await admin.rpc("rejeitar_retorno_pedido" as any, {
    p_retorno_id:      retornoId,
    p_usuario_id:      usuario_id,
    p_motivo_rejeicao: motivoRejeicao || null,
  });

  if (error) throw new Error(error.message);

  await emitirEvento(EVENTS.PURCHASE_ORDER_RETURN_REJECTED, {
    order_id:   pedidoId,
    retorno_id: retornoId,
    usuario_id,
  });

  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}
