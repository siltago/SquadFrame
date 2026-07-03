"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";
import { validarTransicaoPedido, pedidoEditavel } from "@/modules/squadframe/services/state-machines/compras";
import { getUsuario, getUsuarioId, gerarNumeroPedido, enriquecerItensChapa } from "./helpers";

const STATUS_PARA_EVENTO: Record<string, string> = {
  AGUARDANDO_APROVACAO:   EVENTS.PURCHASE_ORDER_AWAITING_APPROVAL,
  APROVADO:               EVENTS.PURCHASE_ORDER_APPROVED,
  // REJEITADO: sem notificação — comprador é notificado ao cancelar ou devolver para edição
  EMITIDO:                EVENTS.PURCHASE_ORDER_EMITTED,
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
  // Vínculo opcional com Pacote de Trabalho — direto (form) ou herdado da
  // solicitação de origem (ver bloco abaixo). Ausente = comportamento
  // idêntico ao fluxo normal de Compras.
  let lote_id              = (formData.get("lote_id") as string | null) || null;
  let origem_contexto      = (formData.get("origem_contexto") as string | null) || null;

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

  // Herda lote_id/origem_contexto da solicitação de origem, se o pedido não
  // veio já com um lote_id explícito (fluxo "pedido direto a partir do pacote").
  if (!lote_id) {
    const itemComSolicitacao = itens.find((i) => i.solicitacao_item_id);
    if (itemComSolicitacao?.solicitacao_item_id) {
      const { data: itemSol } = await admin
        .from("solicitacao_itens")
        .select("solicitacao:solicitacoes_compra(lote_id, origem_contexto)")
        .eq("id", itemComSolicitacao.solicitacao_item_id)
        .maybeSingle();
      // O PostgREST não expõe pro TS a cardinalidade real do join — pra uma FK
      // simples (solicitacao_id) ele sempre volta 1 objeto, mas o tipo inferido
      // é array. Normaliza sem `any` (mesmo padrão já usado em obras/[id]/page.tsx).
      type SolicitacaoRaw = { lote_id: string | null; origem_contexto: string | null };
      const raw = itemSol as unknown as { solicitacao: SolicitacaoRaw[] | SolicitacaoRaw | null } | null;
      const solicitacao = Array.isArray(raw?.solicitacao) ? raw?.solicitacao[0] ?? null : raw?.solicitacao ?? null;
      if (solicitacao?.lote_id) {
        lote_id = solicitacao.lote_id;
        origem_contexto = solicitacao.origem_contexto;
      }
    }
  }

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
    p_lote_id:            lote_id,
    p_origem_contexto:    origem_contexto,
  });
  if (error) throw new Error(error.message);

  const { id: pedidoId } = result as { id: string; numero: string };

  // Se a forma de pagamento for Faturamento Direto, marcar usa_carteira
  if (forma_pagamento_id) {
    const { data: forma } = await admin
      .from("formas_pagamento")
      .select("is_faturamento_direto")
      .eq("id", forma_pagamento_id)
      .single();
    if (forma?.is_faturamento_direto) {
      await admin.from("pedidos_compra").update({ usa_carteira: true }).eq("id", pedidoId);
    }
  }

  await emitirEvento(EVENTS.PURCHASE_ORDER_CREATED, {
    order_id:     pedidoId,
    numero,
    obra_id:      obra_id || null,
    fornecedor_id,
    comprador_id: usuario.id,
    tipo_linha,
    itens_count:  itens.length,
  });

  redirect(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function alterarStatusPedido(
  id: string,
  status: string,
  observacoes?: string,
) {
  const permissaoNecessaria =
    status === "APROVADO"  ? PERMISSIONS.COMPRAS_PEDIDO_APROVAR  :
    status === "REJEITADO" ? PERMISSIONS.COMPRAS_PEDIDO_APROVAR  :
    status === "CANCELADO" ? PERMISSIONS.COMPRAS_PEDIDO_CANCELAR :
    PERMISSIONS.COMPRAS_PEDIDO_CRIAR;
  await verificarPermissao(permissaoNecessaria);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status, obra_id, usa_carteira, debito_registrado, comprador_id, numero")
    .eq("id", id)
    .single();
  if (!ped) throw new Error("Pedido não encontrado.");

  // Idempotência: se já está no status alvo (double-click ou estado stale), ignora
  if (ped.status === status) return;

  validarTransicaoPedido(ped.status, status);

  const { error } = await admin.from("pedidos_compra").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  // Transição de devolver para edição: REJEITADO → RASCUNHO emite evento próprio
  const tipoEvento =
    status === "RASCUNHO" && ped.status === "REJEITADO"
      ? EVENTS.PURCHASE_ORDER_RETURNED_TO_DRAFT
      : STATUS_PARA_EVENTO[status];

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
    p_usuario_id:         usuario_id,
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

export async function confirmarDebitoPedido(pedidoId: string) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_PEDIDO_CONFIRMAR_DEBITO);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("usa_carteira, debito_registrado, status")
    .eq("id", pedidoId)
    .single();

  if (!ped) throw new Error("Pedido não encontrado.");
  if (!ped.usa_carteira) throw new Error("Este pedido não usa faturamento direto.");
  if (ped.debito_registrado) throw new Error("Débito já foi registrado.");

  const { error } = await admin.rpc("confirmar_debito_carteira", {
    p_pedido_id:  pedidoId,
    p_usuario_id: usuario_id,
  });

  if (error) throw new Error(error.message);
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
  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function registrarValorFinal(pedidoId: string, valorFinal: number) {
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_CRIAR);
  const admin = createAdminClient();

  const { data: ped } = await admin
    .from("pedidos_compra")
    .select("status, usa_carteira, debito_registrado")
    .eq("id", pedidoId)
    .single();

  const statusPermitidos = ["AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO", "FINALIZADO"];
  if (!ped || !statusPermitidos.includes(ped.status)) {
    throw new Error("Valor final só pode ser registrado após a emissão do pedido.");
  }

  const { error } = await admin
    .from("pedidos_compra")
    .update({ valor_final: valorFinal })
    .eq("id", pedidoId);
  if (error) throw new Error(error.message);

  const usuario_id = await getUsuarioId();

  if (ped.usa_carteira && !ped.debito_registrado) {
    const { error: errDebito } = await admin.rpc("confirmar_debito_carteira", {
      p_pedido_id:  pedidoId,
      p_usuario_id: usuario_id,
    });
    if (errDebito) throw new Error(`Não foi possível debitar a carteira: ${errDebito.message}`);
  }

  await admin.from("compra_historico").insert({
    entidade: "pedido", entidade_id: pedidoId,
    acao: "VALOR_FINAL_REGISTRADO",
    valor_novo: { valor_final: valorFinal },
    usuario_id,
  });

  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
  revalidatePath("/squadframe/financeiro");
}

export async function excluirPedidos(ids: string[]) {
  if (!ids.length) return;
  await verificarPermissao(PERMISSIONS.COMPRAS_PEDIDO_EXCLUIR);

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  // RPC atômica: cascade delete + retorna sol_ids e storage_paths para os consumers
  const { data: result, error } = await admin.rpc("excluir_pedidos_cascade", {
    p_pedido_ids: ids,
    p_usuario_id: usuario_id,
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
