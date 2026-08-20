"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { getUsuario, gerarNumeroPedido, derivarUsaCarteira } from "./helpers";
import { alterarStatusPedido } from "./pedidos";

// O item pintado é sempre o MESMO produto do cru — não cria mais um produto
// novo no catálogo. A diferenciação é por cor RAL (cor_id), propagada pro
// pedido_itens do pedido de pintura e pro estoque (ver migration
// 20260820000001_stock_cor.sql).
export type ItemBeneficiamento = {
  pedido_item_origem_id: string;
  produto_cru_id: string;
  cor_id: string | null;
  descricao_snapshot: string;
  quantidade: number;
  unidade: string;
};

// Cria o pedido de compra pro beneficiamento (fornecedor = quem beneficia) +
// o registro de beneficiamento + itens, tudo numa RPC atômica só
// (criar_beneficiamento) — mesmo formato de insert que criar_pedido usa,
// mas não é a mesma function porque criar_pedido não devolve os ids dos
// itens criados, e aqui precisamos linkar item a item (pedido_item_origem
// <-> pedido_item_pintura).
export async function criarBeneficiamento(formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_BENEFICIAMENTO_CRIAR);

  const admin = createAdminClient();
  const usuario = await getUsuario();

  const pedido_origem_id   = formData.get("pedido_origem_id") as string;
  const rota               = formData.get("rota") as string;
  const obra_id             = (formData.get("obra_id") as string | null) || null;
  const fornecedor_id       = formData.get("fornecedor_id") as string;
  const forma_pagamento_id  = formData.get("forma_pagamento_id") as string;
  const observacoes         = (formData.get("observacoes") as string | null) || null;
  const itensJson           = formData.get("itens") as string;

  if (!pedido_origem_id) throw new Error("Pedido de origem não informado.");
  if (!rota) throw new Error("Selecione a rota.");
  if (!fornecedor_id) throw new Error("Selecione o fornecedor de beneficiamento.");
  if (!forma_pagamento_id) throw new Error("Selecione a forma de pagamento.");
  if (!itensJson) throw new Error("Adicione ao menos um item.");

  const itens: ItemBeneficiamento[] = JSON.parse(itensJson);
  if (!itens.length) throw new Error("Adicione ao menos um item.");

  // Só depois do pedido de origem emitido — confirma no servidor, não
  // confia só no filtro da tela.
  const STATUS_BENEFICIAVEL = ["EMITIDO", "AGUARDANDO_RECEBIMENTO", "RECEBIDO_PARCIAL", "RECEBIDO"];
  const { data: pedidoOrigem } = await admin
    .from("pedidos_compra")
    .select("status, tipo_linha")
    .eq("id", pedido_origem_id)
    .maybeSingle();
  if (!pedidoOrigem || !STATUS_BENEFICIAVEL.includes(pedidoOrigem.status)) {
    throw new Error("Só é possível gerar beneficiamento depois do pedido de origem emitido.");
  }
  if (pedidoOrigem.tipo_linha !== "PERFIL") {
    throw new Error("Só pedidos de perfil podem virar beneficiamento.");
  }

  // Só perfil cor natural pode virar beneficiamento — confirma no servidor,
  // não confia só no filtro da tela. Na prática ninguém escolhe uma cor
  // "NATURAL" explícita no pedido — o dropdown de cor tem "Sem cor
  // definida" como opção e é isso que fica salvo (cor_id NULL) pra perfil
  // natural (o alumínio cru, sem pintura). Uma cor RAL explícita chamada
  // "NATURAL" existe em cores_ral mas não é usada na prática — tratamos as
  // duas formas como válidas (já que o pedido de origem é garantidamente
  // PERFIL, checado acima).
  const { data: itensOrigem } = await admin
    .from("pedido_itens")
    .select("id, cor:cores_ral(codigo_ral)")
    .in("id", itens.map((i) => i.pedido_item_origem_id));
  for (const item of itensOrigem ?? []) {
    const cor = Array.isArray(item.cor) ? item.cor[0] : item.cor;
    const ehNatural = !cor || cor.codigo_ral?.toUpperCase() === "NATURAL";
    if (!ehNatural) {
      throw new Error("Só itens de perfil cor natural podem virar beneficiamento.");
    }
  }

  const { data: fornecedor } = await admin
    .from("fornecedores")
    .select("faz_beneficiamento")
    .eq("id", fornecedor_id)
    .maybeSingle();
  if (!fornecedor?.faz_beneficiamento) {
    throw new Error("Este fornecedor não está marcado como \"faz beneficiamento\".");
  }

  const numero = await gerarNumeroPedido(admin);

  const { data: result, error } = await admin.rpc("criar_beneficiamento", {
    p_numero:             numero,
    p_pedido_origem_id:   pedido_origem_id,
    p_rota:               rota,
    p_obra_id:            obra_id,
    p_fornecedor_id:      fornecedor_id,
    p_forma_pagamento_id: forma_pagamento_id,
    p_comprador_id:       usuario.id,
    p_observacoes:        observacoes,
    p_itens:              itens,
  });
  if (error) throw new Error(error.message);

  const { id: beneficiamentoId, pedido_pintura_id: pedidoPinturaId } = result as {
    id: string; numero: string; pedido_pintura_id: string;
  };

  // usa_carteira do pedido de pintura, mesma fonte única de verdade de
  // sempre (derivarUsaCarteira) — não é diferente por ser beneficiamento.
  const usaCarteira = await derivarUsaCarteira(admin, forma_pagamento_id);
  if (usaCarteira) {
    await admin.from("pedidos_compra").update({ usa_carteira: true }).eq("id", pedidoPinturaId);
  }

  revalidatePath("/squadframe/beneficiamento");
  revalidatePath(`/squadframe/compras/pedidos/${pedido_origem_id}`);
  redirect(`/squadframe/beneficiamento/${beneficiamentoId}`);
}

// Marca o material como fisicamente enviado pro beneficiamento. Rota
// VIA_FABRICA exige que o pedido de origem já tenha sido recebido (material
// precisa estar fisicamente na fábrica antes de poder sair de novo) e debita
// o estoque do produto cru, em cascata pelas posições com saldo (mais cheias
// primeiro) — não há um local único garantido, o material pode estar
// espalhado. DIRETO_FORNECEDOR nunca passou pela fábrica, não tem saldo cru
// pra debitar.
export async function marcarEnviado(beneficiamentoId: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_BENEFICIAMENTO_GERENCIAR);
  const admin = createAdminClient();
  const usuario = await getUsuario();

  const { data: benef } = await admin
    .from("beneficiamentos")
    .select("id, status, rota, pedido_origem_id, obra_id")
    .eq("id", beneficiamentoId)
    .single();
  if (!benef) throw new Error("Beneficiamento não encontrado.");
  if (benef.status !== "AGUARDANDO_ENVIO") {
    throw new Error(`Beneficiamento já está em "${benef.status}" — não pode marcar como enviado de novo.`);
  }

  if (benef.rota === "VIA_FABRICA") {
    const { data: pedidoOrigem } = await admin
      .from("pedidos_compra")
      .select("status")
      .eq("id", benef.pedido_origem_id)
      .single();
    if (!pedidoOrigem || !["RECEBIDO", "RECEBIDO_PARCIAL"].includes(pedidoOrigem.status)) {
      throw new Error("O pedido de origem precisa estar recebido (material na fábrica) antes de enviar pro beneficiamento.");
    }

    const { data: itens } = await admin
      .from("beneficiamento_itens")
      .select("produto_cru_id, quantidade")
      .eq("beneficiamento_id", beneficiamentoId);

    for (const item of itens ?? []) {
      await debitarEstoqueCascata(admin, item.produto_cru_id, item.quantidade, usuario.id);
    }
  }

  const { error } = await admin
    .from("beneficiamentos")
    .update({ status: "ENVIADO", enviado_em: new Date().toISOString() })
    .eq("id", beneficiamentoId);
  if (error) throw new Error(error.message);

  revalidatePath(`/squadframe/beneficiamento/${beneficiamentoId}`);
  revalidatePath("/squadframe/beneficiamento");
}

async function debitarEstoqueCascata(
  admin: ReturnType<typeof createAdminClient>,
  produtoId: string,
  quantidade: number,
  usuarioId: string,
) {
  const { data: saldos } = await admin
    .from("stock_saldos")
    .select("local_id, obra_id, quantidade")
    .eq("produto_id", produtoId)
    .is("cor_id", null) // só debita do bucket NATURAL, nunca do já pintado
    .gt("quantidade", 0)
    .order("quantidade", { ascending: false });

  const totalDisponivel = (saldos ?? []).reduce((s, r) => s + r.quantidade, 0);
  if (totalDisponivel < quantidade) {
    throw new Error(`Saldo insuficiente do produto cru pra enviar ao beneficiamento — disponível: ${totalDisponivel}, necessário: ${quantidade}.`);
  }

  let restante = quantidade;
  for (const saldo of saldos ?? []) {
    if (restante <= 0) break;
    const aplicado = Math.min(saldo.quantidade, restante);

    const { data: numero, error: erroNumero } = await admin.rpc("gerar_numero_movimento_estoque");
    if (erroNumero) throw new Error(erroNumero.message);

    // Precisa sair da MESMA posição (local + reserva de obra) que está
    // sendo debitada — senão a saída bate num saldo diferente (obra_id
    // divergente) e tenta criar uma posição nova do zero, negativa.
    const { error } = await admin.from("stock_movimentacoes").insert({
      numero,
      produto_id: produtoId,
      local_id: saldo.local_id,
      obra_id: saldo.obra_id,
      tipo: "SAIDA",
      quantidade: -aplicado,
      origem_tipo: "beneficiamento",
      observacoes: "Enviado para beneficiamento",
      usuario_id: usuarioId,
    });
    if (error) throw new Error(error.message);

    restante -= aplicado;
  }
}

export async function cancelarBeneficiamento(beneficiamentoId: string, motivo: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_BENEFICIAMENTO_GERENCIAR);
  if (!motivo?.trim()) throw new Error("Informe o motivo do cancelamento.");
  const admin = createAdminClient();

  const { data: benef } = await admin
    .from("beneficiamentos")
    .select("status, pedido_pintura_id")
    .eq("id", beneficiamentoId)
    .single();
  if (!benef) throw new Error("Beneficiamento não encontrado.");
  if (benef.status !== "AGUARDANDO_ENVIO") {
    throw new Error("Só é possível cancelar um beneficiamento que ainda não foi enviado.");
  }

  await alterarStatusPedido(benef.pedido_pintura_id, "CANCELADO", motivo);

  const { error } = await admin
    .from("beneficiamentos")
    .update({ status: "CANCELADO", observacoes: motivo })
    .eq("id", beneficiamentoId);
  if (error) throw new Error(error.message);

  revalidatePath(`/squadframe/beneficiamento/${beneficiamentoId}`);
  revalidatePath("/squadframe/beneficiamento");
}
