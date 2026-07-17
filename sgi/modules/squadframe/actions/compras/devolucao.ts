"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";
import { getUsuarioId } from "./helpers";

const STATUS_DEVOLUCAO_PERMITIDOS = ["RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"] as const;

type ItemDevolucao = {
  pedido_item_id: string;
  descricao_snapshot: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number | null;
};

export async function criarDevolucaoPedido(
  pedidoId: string,
  motivo: string,
  itens: ItemDevolucao[],
  valorTotal: number | null,
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_DEVOLVER);
  if (!motivo.trim()) throw new Error("Informe o motivo da devolução.");
  if (!itens.length)  throw new Error("Selecione ao menos um item para devolver.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status, fornecedor_id, obra_id, usa_carteira")
    .eq("id", pedidoId)
    .single();

  if (!ped) throw new Error("Pedido não encontrado.");

  if (!(STATUS_DEVOLUCAO_PERMITIDOS as readonly string[]).includes(ped.status)) {
    throw new Error("Devolução só é possível após recebimento do pedido.");
  }

  const { data: numResult, error: errNum } = await admin.rpc("gerar_numero_devolucao" as any);
  if (errNum) throw new Error(errNum.message);
  const numero = numResult as string;

  const { data: dev, error: errDev } = await admin
    .from("devolucoes_compra")
    .insert({
      numero,
      pedido_id:    pedidoId,
      fornecedor_id: ped.fornecedor_id,
      obra_id:       ped.obra_id,
      motivo:        motivo.trim(),
      valor_total:   valorTotal,
      usa_carteira:  ped.usa_carteira ?? false,
      criado_por:    usuario_id,
    })
    .select("id")
    .single();

  if (errDev) throw new Error(errDev.message);

  const { error: errItens } = await admin.from("devolucao_itens").insert(
    itens.map((it) => ({ ...it, devolucao_id: dev.id })),
  );

  if (errItens) throw new Error(errItens.message);

  await admin.from("compra_historico").insert({
    entidade:    "pedido",
    entidade_id: pedidoId,
    acao:        "DEVOLUCAO_CRIADA",
    dados:       { devolucao_id: dev.id, numero },
    usuario_id,
  });

  await emitirEvento(EVENTS.PURCHASE_ORDER_DEVOLUTION_CREATED, {
    order_id:        pedidoId,
    devolucao_id:    dev.id,
    numero_devolucao: numero,
    usuario_id,
  });

  redirect(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function alterarStatusDevolucao(
  devolucaoId: string,
  pedidoId: string,
  novoStatus: string,
  obs?: string,
) {
  await verificarPermissao(
    ["APROVADO", "REJEITADO"].includes(novoStatus)
      ? PERMISSIONS.COMPRAS_PEDIDO_APROVAR_DEVOLUCAO
      : PERMISSIONS.COMPRAS_PEDIDO_DEVOLVER,
  );

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  if (novoStatus === "ENTREGUE") {
    const { error } = await admin.rpc("registrar_entrega_devolucao" as any, {
      p_devolucao_id: devolucaoId,
      p_usuario_id:   usuario_id,
    });
    if (error) throw new Error(error.message);

    await emitirEvento(EVENTS.PURCHASE_ORDER_DEVOLUTION_DELIVERED, {
      order_id:     pedidoId,
      devolucao_id: devolucaoId,
      usuario_id,
    });
  } else {
    const patch: Record<string, unknown> = { status: novoStatus };
    if (novoStatus === "APROVADO" || novoStatus === "REJEITADO") {
      patch.aprovado_por = usuario_id;
    }

    const { error } = await admin
      .from("devolucoes_compra")
      .update(patch)
      .eq("id", devolucaoId);
    if (error) throw new Error(error.message);

    await admin.from("compra_historico").insert({
      entidade:    "pedido",
      entidade_id: pedidoId,
      acao:        `DEVOLUCAO_${novoStatus}`,
      dados:       { devolucao_id: devolucaoId, obs },
      usuario_id,
    });
  }

  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}
