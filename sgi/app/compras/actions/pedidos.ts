"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/core/permissions/permissions";
import { verificarPermissao } from "@/core/permissions/check-permission";
import { emitirEvento } from "@/core/events/event-bus";
import { EVENTS } from "@/core/events/event-types";
import { validarTransicaoPedido, pedidoEditavel } from "@/core/state-machines/compras";
import { getUsuario, getUsuarioId, gerarNumeroPedido, enriquecerItensChapa } from "./helpers";

const STATUS_PARA_EVENTO: Record<string, string> = {
  AGUARDANDO_APROVACAO:   EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL,
  APROVADO:               EVENTS.PURCHASE_ORDER_APPROVED,
  AGUARDANDO_RECEBIMENTO: EVENTS.PURCHASE_ORDER_SENT,
  CANCELADO:              EVENTS.PURCHASE_ORDER_CANCELLED,
  FINALIZADO:             EVENTS.PURCHASE_ORDER_RECEIVED_FULL,
};

export async function criarPedido(formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_CRIAR);

  const admin = createAdminClient();
  const usuario = await getUsuario();

  const obra_id            = (formData.get("obra_id") as string | null) || null;
  const fornecedor_id      = formData.get("fornecedor_id") as string;
  const forma_pagamento_id = (formData.get("forma_pagamento_id") as string | null) || null;
  const cor_id             = (formData.get("cor_id") as string | null) || null;
  const observacoes        = (formData.get("observacoes") as string | null) || null;
  const tipo_linha         = (formData.get("tipo_linha") as string | null) || null;
  const itensJson          = formData.get("itens") as string;

  if (!fornecedor_id) throw new Error("Selecione um fornecedor.");
  if (!obra_id) throw new Error("Selecione uma obra.");

  const itens: {
    produto_id: string; descricao_snapshot: string; quantidade_pedida: number;
    unidade: string; preco_unitario?: number; codigo_fornecedor?: string;
    produto_fornecedor_id?: string; obra_id?: string; solicitacao_item_id?: string;
    largura_m?: number | null; altura_m?: number | null; qtd_pecas?: number | null;
    cor_id?: string | null;
  }[] = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Adicione ao menos um item.");

  const produtoIds = itens.map((i) => i.produto_id).filter(Boolean);
  if (produtoIds.length > 0) {
    const { data: inativos } = await admin
      .from("produtos")
      .select("codigo_mestre, nome")
      .in("id", produtoIds)
      .eq("status", false);
    if (inativos && inativos.length > 0) {
      const nomes = inativos.map((p) => `${p.codigo_mestre} — ${p.nome}`).join(", ");
      throw new Error(`Produto(s) inativo(s) no pedido: ${nomes}`);
    }
  }

  const itensProcessados = enriquecerItensChapa(itens);
  const numero = await gerarNumeroPedido(admin);

  // RPC atômica: pedidos_compra + pedido_itens em uma única transação
  const { data: result, error } = await admin.rpc("criar_pedido", {
    p_numero:             numero,
    p_obra_id:            obra_id,
    p_fornecedor_id:      fornecedor_id,
    p_forma_pagamento_id: forma_pagamento_id,
    p_comprador_id:       usuario.id,
    p_observacoes:        observacoes,
    p_tipo_linha:         tipo_linha,
    p_cor_id:             cor_id,
    p_itens:              itensProcessados,
  });
  if (error) throw new Error(error.message);

  const { id: pedidoId } = result as { id: string; numero: string };

  await emitirEvento(EVENTS.PURCHASE_ORDER_CREATED, {
    order_id:     pedidoId,
    numero,
    obra_id:      obra_id || null,
    fornecedor_id,
    comprador_id: usuario.id,
    tipo_linha,
    itens_count:  itens.length,
  });

  redirect(`/compras/pedidos/${pedidoId}`);
}

export async function alterarStatusPedido(
  id: string,
  status: string,
  observacoes?: string,
) {
  const permissaoNecessaria =
    status === "APROVADO"  ? PERMISSIONS.COMPRAS_PEDIDO_APROVAR  :
    status === "CANCELADO" ? PERMISSIONS.COMPRAS_PEDIDO_CANCELAR :
    PERMISSIONS.COMPRAS_PEDIDO_CRIAR;
  await verificarPermissao(permissaoNecessaria);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status, obra_id")
    .eq("id", id)
    .single();
  if (!ped) throw new Error("Pedido não encontrado.");

  validarTransicaoPedido(ped.status, status);

  const { error } = await admin.from("pedidos_compra").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  const tipoEvento = STATUS_PARA_EVENTO[status];
  if (tipoEvento) {
    await emitirEvento(tipoEvento, {
      order_id:    id,
      obra_id:     ped.obra_id || null,
      status_novo: status,
      usuario_id,
      dados:       { observacoes },
    });
  }
}

export async function editarPedido(id: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_CRIAR);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status")
    .eq("id", id)
    .single();
  if (!ped) throw new Error("Pedido não encontrado.");

  if (!pedidoEditavel(ped.status)) {
    throw new Error(
      `Pedidos com status "${ped.status}" não podem ser editados. ` +
      `Somente pedidos em RASCUNHO ou AGUARDANDO_APROVACAO são editáveis.`,
    );
  }

  const fornecedor_id      = formData.get("fornecedor_id") as string;
  const obra_id            = (formData.get("obra_id") as string) || null;
  const forma_pagamento_id = (formData.get("forma_pagamento_id") as string) || null;
  const cor_id             = (formData.get("cor_id") as string) || null;
  const observacoes        = (formData.get("observacoes") as string) || null;
  const prazo_entrega      = (formData.get("prazo_entrega") as string) || null;
  const itens              = JSON.parse(formData.get("itens") as string) as Record<string, unknown>[];

  const itensProcessados = enriquecerItensChapa(itens as Parameters<typeof enriquecerItensChapa>[0]);

  // RPC atômica: UPDATE + DELETE itens + INSERT itens em uma única transação
  const { error } = await admin.rpc("editar_pedido", {
    p_pedido_id:          id,
    p_fornecedor_id:      fornecedor_id,
    p_obra_id:            obra_id,
    p_forma_pagamento_id: forma_pagamento_id,
    p_cor_id:             cor_id,
    p_observacoes:        observacoes,
    p_prazo_entrega:      prazo_entrega,
    p_itens:              itensProcessados,
  });
  if (error) throw new Error(error.message);

  await emitirEvento(EVENTS.PURCHASE_ORDER_EDITED, {
    order_id:    id,
    usuario_id,
    itens_count: itens.length,
    dados:       {},
  });

  return { id };
}

export async function adicionarAnotacao(pedidoId: string, texto: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_ANOTACAO_CRIAR);
  if (!texto.trim()) throw new Error("Anotação não pode estar vazia.");
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status")
    .eq("id", pedidoId)
    .single();
  await admin.from("pedido_anotacoes").insert({
    pedido_id: pedidoId,
    usuario_id,
    status_pedido: ped?.status ?? null,
    texto: texto.trim(),
  });
  revalidatePath(`/compras/pedidos/${pedidoId}`);
}

export async function excluirPedidos(ids: string[]) {
  if (!ids.length) return;
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_EXCLUIR);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  // RPC atômica: cascade delete + retorna sol_ids e storage_paths para os consumers
  const { data: result, error } = await admin.rpc("excluir_pedidos_cascade", {
    p_pedido_ids: ids,
  });
  if (error) throw new Error(error.message);

  const { sol_ids, storage_paths } = result as {
    sol_ids: string[];
    storage_paths: string[];
  };

  await emitirEvento(EVENTS.PURCHASE_ORDER_DELETED, {
    order_ids:     ids,
    deleted_by:    usuario_id,
    sol_ids:       sol_ids ?? [],
    storage_paths: storage_paths ?? [],
  });
}
