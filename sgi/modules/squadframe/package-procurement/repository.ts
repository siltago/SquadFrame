import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import {
  adicionarAlias,
  criarProdutoRapido as criarProdutoRapidoCatalogo,
  criarLinhaRapida as criarLinhaRapidaCatalogo,
  listarTiposLinha as listarTiposLinhaCatalogo,
} from "@/modules/squadframe/actions/catalogo/actions";
import type {
  WisePacoteCompras, WiseNecessidade,
  AlocacaoSolicitacao, AlocacaoPedido, AlocacaoRecebimento, PedidoItemDisponivel,
  SolicitacaoItemDisponivel, RecebimentoItemDisponivel,
} from "./types";

// Repository burro por design — regra de negócio vive em service.ts.
// Operações sensíveis (criar contexto, adicionar/cancelar necessidade,
// bloquear/desbloquear) passam pelas RPCs — não por insert/update
// direto — para manter o gate de permissão dentro da transação.

export async function buscarContexto(pacoteId: string): Promise<WisePacoteCompras | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_pacote_compras")
    .select("*")
    .eq("pacote_id", pacoteId)
    .maybeSingle();
  return (data as WisePacoteCompras) ?? null;
}

export async function listarNecessidades(pacoteId: string): Promise<WiseNecessidade[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_pacote_necessidades")
    .select("*, produto:produtos(id, nome, codigo_mestre)")
    .eq("pacote_id", pacoteId)
    .order("criticidade", { ascending: false })
    .order("criado_em", { ascending: true });
  return (data ?? []) as unknown as WiseNecessidade[];
}

export async function ensureContexto(pacoteId: string, usuarioId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_frame_ensure_package_procurement_context", {
    p_pacote_id: pacoteId,
    p_usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function adicionarNecessidade(dados: {
  pacote_id: string;
  usuario_id: string;
  produto_id: string | null;
  descricao_livre: string | null;
  quantidade: number;
  unidade: string;
  criticidade: string;
  etapa_necessaria: string | null;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_frame_add_material_need", {
    p_pacote_id: dados.pacote_id,
    p_usuario_id: dados.usuario_id,
    p_produto_id: dados.produto_id,
    p_descricao_livre: dados.descricao_livre,
    p_quantidade: dados.quantidade,
    p_unidade: dados.unidade,
    p_criticidade: dados.criticidade,
    p_etapa_necessaria: dados.etapa_necessaria,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelarNecessidade(necessidadeId: string, usuarioId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_cancel_material_need", {
    p_necessidade_id: necessidadeId,
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

export async function bloquearContexto(pacoteId: string, usuarioId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_block_package_procurement", {
    p_pacote_id: pacoteId,
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

export async function desbloquearContexto(pacoteId: string, usuarioId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_unblock_package_procurement", {
    p_pacote_id: pacoteId,
    p_usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);
}

// ── Alocações (Bloco B) ──────────────────────────────────────

export async function listarAlocacoesSolicitacao(necessidadeIds: string[]): Promise<AlocacaoSolicitacao[]> {
  if (!necessidadeIds.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_solicitacao_item_alocacoes")
    .select("*")
    .in("necessidade_id", necessidadeIds)
    .eq("estado_administrativo", "ATIVA");
  return (data ?? []) as AlocacaoSolicitacao[];
}

export async function listarAlocacoesPedido(necessidadeIds: string[]): Promise<AlocacaoPedido[]> {
  if (!necessidadeIds.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_pedido_item_alocacoes")
    .select("*")
    .in("necessidade_id", necessidadeIds)
    .eq("estado_administrativo", "ATIVA");
  return (data ?? []) as AlocacaoPedido[];
}

export async function listarAlocacoesRecebimento(pedidoAlocacaoIds: string[]): Promise<AlocacaoRecebimento[]> {
  if (!pedidoAlocacaoIds.length) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_recebimento_item_alocacoes")
    .select("*")
    .in("pedido_item_alocacao_id", pedidoAlocacaoIds)
    .eq("estado_administrativo", "ATIVA");
  return (data ?? []) as AlocacaoRecebimento[];
}

// Itens de pedido dos pedidos vinculados a este pacote (via
// pedidos_compra.lote_id) — fonte do picker de alocação. Mostra
// quanto de cada item já está alocado a QUALQUER necessidade, pra
// não deixar o usuário tentar alocar acima do saldo (a RPC valida de
// novo, isso aqui é só pra UX).
export async function listarItensPedidoDoPacote(pacoteId: string): Promise<PedidoItemDisponivel[]> {
  const admin = createAdminClient();
  const { data: pedidos } = await admin
    .from("pedidos_compra")
    .select("id, numero")
    .eq("lote_id", pacoteId);
  const pedidoIds = (pedidos ?? []).map((p) => p.id as string);
  if (!pedidoIds.length) return [];

  const numeroPorPedido = new Map((pedidos ?? []).map((p) => [p.id as string, p.numero as string]));

  const { data: itens } = await admin
    .from("pedido_itens")
    .select("id, pedido_id, descricao_snapshot, quantidade_pedida, unidade")
    .in("pedido_id", pedidoIds);

  const itemIds = (itens ?? []).map((i) => i.id as string);
  const { data: alocacoes } = itemIds.length
    ? await admin
        .from("frame_pedido_item_alocacoes")
        .select("pedido_item_id, quantidade_alocada")
        .in("pedido_item_id", itemIds)
        .eq("estado_administrativo", "ATIVA")
    : { data: [] as { pedido_item_id: string; quantidade_alocada: number }[] };

  const alocadoPorItem = new Map<string, number>();
  for (const a of alocacoes ?? []) {
    alocadoPorItem.set(a.pedido_item_id, (alocadoPorItem.get(a.pedido_item_id) ?? 0) + a.quantidade_alocada);
  }

  return (itens ?? []).map((i) => ({
    id: i.id as string,
    pedido_id: i.pedido_id as string,
    pedido_numero: numeroPorPedido.get(i.pedido_id as string) ?? "?",
    descricao_snapshot: i.descricao_snapshot as string,
    quantidade_pedida: i.quantidade_pedida as number,
    unidade: i.unidade as string,
    ja_alocado: alocadoPorItem.get(i.id as string) ?? 0,
  }));
}

export async function alocarItemPedido(dados: {
  pedido_item_id: string;
  necessidade_id: string;
  quantidade: number;
  origem: string;
  solicitacao_item_alocacao_id: string | null;
  justificativa: string | null;
  usuario_id: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_frame_allocate_purchase_item", {
    p_pedido_item_id: dados.pedido_item_id,
    p_necessidade_id: dados.necessidade_id,
    p_quantidade: dados.quantidade,
    p_origem: dados.origem,
    p_solicitacao_item_alocacao_id: dados.solicitacao_item_alocacao_id,
    p_justificativa: dados.justificativa,
    p_usuario_id: dados.usuario_id,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelarAlocacaoPedido(id: string, usuarioId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_cancel_purchase_allocation", {
    p_id: id,
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

// Itens de solicitação dos pedidos de compra vinculados a este pacote
// (via solicitacoes_compra.lote_id) — fonte do picker de "alocar
// solicitação". Mesma lógica de saldo do pedido: soma alocações ATIVAS
// pra qualquer necessidade, RPC revalida de novo.
export async function listarItensSolicitacaoDoPacote(pacoteId: string): Promise<SolicitacaoItemDisponivel[]> {
  const admin = createAdminClient();
  const { data: solicitacoes } = await admin
    .from("solicitacoes_compra")
    .select("id, numero")
    .eq("lote_id", pacoteId);
  const solicitacaoIds = (solicitacoes ?? []).map((s) => s.id as string);
  if (!solicitacaoIds.length) return [];

  const numeroPorSolicitacao = new Map((solicitacoes ?? []).map((s) => [s.id as string, s.numero as string]));

  const { data: itens } = await admin
    .from("solicitacao_itens")
    .select("id, solicitacao_id, produto_id, descricao_manual, quantidade, unidade, produto:produtos(nome)")
    .in("solicitacao_id", solicitacaoIds);

  const itemIds = (itens ?? []).map((i) => i.id as string);
  const { data: alocacoes } = itemIds.length
    ? await admin
        .from("frame_solicitacao_item_alocacoes")
        .select("solicitacao_item_id, quantidade_alocada")
        .in("solicitacao_item_id", itemIds)
        .eq("estado_administrativo", "ATIVA")
    : { data: [] as { solicitacao_item_id: string; quantidade_alocada: number }[] };

  const alocadoPorItem = new Map<string, number>();
  for (const a of alocacoes ?? []) {
    alocadoPorItem.set(a.solicitacao_item_id, (alocadoPorItem.get(a.solicitacao_item_id) ?? 0) + a.quantidade_alocada);
  }

  return (itens ?? []).map((i) => {
    const produto = i.produto as unknown as { nome: string } | null;
    return {
      id: i.id as string,
      solicitacao_id: i.solicitacao_id as string,
      solicitacao_numero: numeroPorSolicitacao.get(i.solicitacao_id as string) ?? "?",
      descricao: (produto?.nome ?? (i.descricao_manual as string | null) ?? "?"),
      quantidade: i.quantidade as number,
      unidade: i.unidade as string,
      ja_alocado: alocadoPorItem.get(i.id as string) ?? 0,
    };
  });
}

export async function alocarItemSolicitacao(dados: {
  solicitacao_item_id: string;
  necessidade_id: string;
  quantidade: number;
  usuario_id: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_frame_allocate_requisition_item", {
    p_solicitacao_item_id: dados.solicitacao_item_id,
    p_necessidade_id: dados.necessidade_id,
    p_quantidade: dados.quantidade,
    p_usuario_id: dados.usuario_id,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function cancelarAlocacaoSolicitacao(id: string, usuarioId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_cancel_requisition_allocation", {
    p_id: id,
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

// Itens de recebimento disponíveis para alocar contra uma necessidade
// específica — só entram na lista os recebimento_itens cujo pedido_item
// já tem uma alocação ATIVA pra ESTA necessidade (a cadeia recebimento
// nasce da alocação de pedido, não do pacote direto).
export async function listarRecebimentosDaNecessidade(necessidadeId: string): Promise<RecebimentoItemDisponivel[]> {
  const admin = createAdminClient();
  const { data: alocacoesPedido } = await admin
    .from("frame_pedido_item_alocacoes")
    .select("id, pedido_item_id")
    .eq("necessidade_id", necessidadeId)
    .eq("estado_administrativo", "ATIVA");

  const pedidoItemIds = (alocacoesPedido ?? []).map((a) => a.pedido_item_id as string);
  if (!pedidoItemIds.length) return [];

  const alocacaoPorPedidoItem = new Map((alocacoesPedido ?? []).map((a) => [a.pedido_item_id as string, a.id as string]));

  const { data: pedidoItens } = await admin
    .from("pedido_itens")
    .select("id, pedido_id, unidade")
    .in("id", pedidoItemIds);
  const pedidoIdPorItem = new Map((pedidoItens ?? []).map((p) => [p.id as string, p.pedido_id as string]));
  const unidadePorItem = new Map((pedidoItens ?? []).map((p) => [p.id as string, p.unidade as string]));
  const pedidoIds = Array.from(new Set((pedidoItens ?? []).map((p) => p.pedido_id as string)));

  const { data: pedidos } = pedidoIds.length
    ? await admin.from("pedidos_compra").select("id, numero").in("id", pedidoIds)
    : { data: [] as { id: string; numero: string }[] };
  const numeroPorPedido = new Map((pedidos ?? []).map((p) => [p.id as string, p.numero as string]));

  const { data: recebimentoItens } = await admin
    .from("recebimento_itens")
    .select("id, recebimento_id, pedido_item_id, quantidade_recebida")
    .in("pedido_item_id", pedidoItemIds);

  const recebimentoItemIds = (recebimentoItens ?? []).map((r) => r.id as string);
  const { data: alocacoesRecebimento } = recebimentoItemIds.length
    ? await admin
        .from("frame_recebimento_item_alocacoes")
        .select("recebimento_item_id, quantidade_alocada")
        .in("recebimento_item_id", recebimentoItemIds)
        .eq("estado_administrativo", "ATIVA")
    : { data: [] as { recebimento_item_id: string; quantidade_alocada: number }[] };

  const alocadoPorItem = new Map<string, number>();
  for (const a of alocacoesRecebimento ?? []) {
    alocadoPorItem.set(a.recebimento_item_id, (alocadoPorItem.get(a.recebimento_item_id) ?? 0) + a.quantidade_alocada);
  }

  return (recebimentoItens ?? []).map((r) => {
    const pedidoItemId = r.pedido_item_id as string;
    const pedidoId = pedidoIdPorItem.get(pedidoItemId) ?? "";
    return {
      id: r.id as string,
      recebimento_id: r.recebimento_id as string,
      pedido_numero: numeroPorPedido.get(pedidoId) ?? "?",
      pedido_item_id: pedidoItemId,
      pedido_item_alocacao_id: alocacaoPorPedidoItem.get(pedidoItemId) ?? "",
      quantidade_recebida: r.quantidade_recebida as number,
      unidade: "un",
      ja_alocado: alocadoPorItem.get(r.id as string) ?? 0,
    };
  });
}

export async function alocarItemRecebimento(dados: {
  recebimento_item_id: string;
  pedido_item_alocacao_id: string;
  quantidade: number;
  usuario_id: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_frame_allocate_receipt_item", {
    p_recebimento_item_id: dados.recebimento_item_id,
    p_pedido_item_alocacao_id: dados.pedido_item_alocacao_id,
    p_quantidade: dados.quantidade,
    p_usuario_id: dados.usuario_id,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function estornarAlocacaoRecebimento(id: string, usuarioId: string, motivo: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("fn_frame_reverse_receipt_allocation", {
    p_id: id,
    p_usuario_id: usuarioId,
    p_motivo: motivo,
  });
  if (error) throw new Error(error.message);
}

// ── Import de necessidades via XML (de-para de código) ───────

export type ProdutoResolvido = {
  id: string;
  codigo_mestre: string;
  nome: string;
  tamanho_mm: number | null;
  linha_id: string | null;
};

// Fornecedor "virtual" que representa a origem dos códigos do XML —
// criado (idempotente) pela migration 20260720000001. Cacheado em
// memória do processo pra não bater no banco a cada item.
let fornecedorPreferenceIdCache: string | null = null;

export async function buscarFornecedorPreferenceId(): Promise<string> {
  if (fornecedorPreferenceIdCache) return fornecedorPreferenceIdCache;
  const admin = createAdminClient();
  const { data, error } = await admin.from("fornecedores").select("id").eq("nome", "Preference").single();
  if (error || !data) throw new Error("Fornecedor 'Preference' não encontrado — rode a migration 20260720000001.");
  fornecedorPreferenceIdCache = data.id as string;
  return fornecedorPreferenceIdCache;
}

export async function buscarProdutoPorCodigoMestre(codigo: string): Promise<ProdutoResolvido | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("produtos")
    .select("id, codigo_mestre, nome, tamanho_mm, linha_id")
    .ilike("codigo_mestre", codigo)
    .maybeSingle();
  return (data as ProdutoResolvido) ?? null;
}

export async function buscarProdutoPorAlias(codigo: string): Promise<ProdutoResolvido | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("produto_aliases")
    .select("produto:produtos(id, codigo_mestre, nome, tamanho_mm, linha_id)")
    .ilike("alias", codigo)
    .maybeSingle();
  const produto = (data as unknown as { produto: ProdutoResolvido | null } | null)?.produto;
  return produto ?? null;
}

export async function codigoEstaIgnorado(fornecedorId: string, codigo: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("frame_xml_codigos_ignorados")
    .select("id")
    .eq("fornecedor_id", fornecedorId)
    .eq("codigo", codigo)
    .maybeSingle();
  return !!data;
}

export async function marcarCodigoIgnorado(fornecedorId: string, codigo: string, usuarioId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("frame_xml_codigos_ignorados")
    .upsert({ fornecedor_id: fornecedorId, codigo, criado_por: usuarioId }, { onConflict: "fornecedor_id,codigo", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

// Cria o alias (código do XML → produto do catálogo) reaproveitando a
// action já existente do módulo de catálogo — não reimplementa o
// insert. Busca o linha_id do produto só porque adicionarAlias usa
// isso pra revalidatePath, não afeta o dado gravado.
export async function criarAliasParaCodigo(produtoId: string, codigo: string, fornecedorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: produto } = await admin.from("produtos").select("linha_id").eq("id", produtoId).single();
  await adicionarAlias(produtoId, produto?.linha_id ?? "", codigo, fornecedorId, {});
}

export async function listarLinhas(): Promise<{ id: string; nome: string; tipo: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("linhas").select("id, nome, tipo").eq("ativo", true).order("nome");
  return (data ?? []) as { id: string; nome: string; tipo: string }[];
}

export async function criarProdutoRapido(dados: {
  linha_id: string;
  codigo_mestre: string;
  nome_tecnico: string;
  unidade?: string;
  tamanho_mm?: number | null;
}): Promise<{ id: string; codigo_mestre: string; nome: string; ja_existia: boolean }> {
  return criarProdutoRapidoCatalogo(dados);
}

export async function criarLinhaRapida(dados: { nome: string; tipo: string }): Promise<{ id: string; nome: string; tipo: string; ja_existia: boolean }> {
  return criarLinhaRapidaCatalogo(dados);
}

export async function listarTiposLinha(): Promise<{ nome: string; slug: string }[]> {
  return listarTiposLinhaCatalogo();
}
