"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient as createClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import {
  bloquearContextoAction,
  desbloquearContextoAction,
  obterContextoAction,
} from "@/modules/squadframe/package-procurement/actions";

const MOTIVO_BLOQUEIO_PADRAO = "Lote criado — aguardando liberação de compras.";

export async function buscarObrasAction(query: string) {
  const admin = createClient();
  let q = admin.from("obras").select("id, nome, codigo, numero").is("deleted_at", null);
  if (query.trim()) {
    q = q.or(`nome.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
  }
  const { data } = await q.order("nome").limit(30);
  return (data ?? []) as { id: string; nome: string; codigo: string | null; numero: number | null }[];
}

export async function criarLotePlanejamento(obraId: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.OBRAS_CRIAR, PERMISSIONS.OBRAS_EDITAR);
  const admin = createClient();
  const usuario = await getUsuarioAtual();

  const nome           = String(formData.get("nome") || "").trim();
  const numero_externo = String(formData.get("numero_externo") || "").trim() || null;
  const prioridade     = String(formData.get("prioridade") || "MEDIA");
  const prazo          = String(formData.get("prazo") || "") || null;
  const descricao       = String(formData.get("descricao") || "").trim() || null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const { data: lote, error } = await admin
    .from("lotes_obra")
    .insert({ obra_id: obraId, nome, descricao, numero_externo, prioridade, prazo, status: "ATIVO", etapa: "compras" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (usuario) {
    await bloquearContextoAction(lote.id, MOTIVO_BLOQUEIO_PADRAO);
  }

  await admin.from("obra_historico").insert({
    obra_id: obraId,
    acao: "PACOTE_CRIADO",
    valor_novo: { nome, lote_id: lote.id, numero_externo },
  });

  revalidatePath("/squadframe/planejamento");
  revalidatePath(`/squadframe/obras/${obraId}`);
  return { id: lote.id as string };
}

export async function criarLoteComXmlPlanejamento(
  obraId: string,
  nome: string,
  numeroExterno: string | null,
  descricao: string | null,
  itens: Array<{
    nome: string; quantidade: number; codigo_esquadria: string | null; tipo: string | null;
    largura_mm: number | null; altura_mm: number | null; tratamento: string | null;
    descricao: string | null; peso_unit: number | null; preco_unit: number | null;
  }>,
) {
  await verificarPermissao(PERMISSIONS.OBRAS_CRIAR, PERMISSIONS.OBRAS_EDITAR);
  const admin = createClient();

  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Nome é obrigatório.");
  if (!itens.length) throw new Error("Nenhuma tipologia para importar.");

  const { data: lote, error } = await admin
    .from("lotes_obra")
    .insert({ obra_id: obraId, nome: nomeLimpo, descricao, numero_externo: numeroExterno, status: "ATIVO", etapa: "compras" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: errItens } = await admin.from("tipologias_obra").insert(
    itens.map((item) => ({ ...item, obra_id: obraId, lote_id: lote.id }))
  );
  if (errItens) throw new Error(errItens.message);

  await bloquearContextoAction(lote.id, MOTIVO_BLOQUEIO_PADRAO);

  await admin.from("obra_historico").insert({
    obra_id: obraId,
    acao: "PACOTE_CRIADO",
    valor_novo: { nome: nomeLimpo, lote_id: lote.id, numero_externo: numeroExterno, origem: "xml", tipologias: itens.length },
  });

  revalidatePath("/squadframe/planejamento");
  revalidatePath(`/squadframe/obras/${obraId}`);
  return { id: lote.id as string, criadas: itens.length };
}

export async function editarLotePlanejamento(loteId: string, obraId: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.OBRAS_EDITAR);
  const admin = createClient();

  const nome           = String(formData.get("nome") || "").trim();
  const numero_externo = String(formData.get("numero_externo") || "").trim() || null;
  const descricao       = String(formData.get("descricao") || "").trim() || null;
  const prioridade      = String(formData.get("prioridade") || "MEDIA");
  const prazo           = String(formData.get("prazo") || "") || null;
  const status          = String(formData.get("status") || "ATIVO");
  const etapa           = String(formData.get("etapa") || "compras");

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await admin
    .from("lotes_obra")
    .update({ nome, numero_externo, descricao, prioridade, prazo, status, etapa })
    .eq("id", loteId);
  if (error) throw new Error(error.message);

  revalidatePath("/squadframe/planejamento");
  revalidatePath(`/squadframe/obras/${obraId}`);
}

// Toggle único de liberação de compras do lote — reaproveita o contexto
// já existente em frame_pacote_compras (fn_frame_block/unblock_package_procurement),
// em vez de duplicar em lotes_obra.liberado_compras.
export async function alternarLiberacaoComprasPlanejamento(
  loteId: string,
  obraId: string,
  liberar: boolean,
  motivo?: string,
) {
  await verificarPermissao(PERMISSIONS.FRAME_PACOTES_COMPRAS_GERENCIAR);

  const resultado = liberar
    ? await desbloquearContextoAction(loteId)
    : await bloquearContextoAction(loteId, motivo?.trim() || "Bloqueado manualmente.");

  if (!resultado.ok) throw new Error(resultado.erro);

  revalidatePath("/squadframe/planejamento");
  revalidatePath(`/squadframe/obras/${obraId}`);
}

export async function buscarPedidosDaObraPlanejamento(obraId: string) {
  const admin = createClient();
  const { data } = await admin
    .from("pedidos_compra")
    .select("id, numero, status, lote_id, fornecedor:fornecedores(nome)")
    .eq("obra_id", obraId)
    .order("criado_em", { ascending: false })
    .limit(100);
  type Raw = { id: string; numero: string; status: string; lote_id: string | null; fornecedor: { nome: string }[] | { nome: string } | null };
  return ((data ?? []) as unknown as Raw[]).map((p) => ({
    ...p,
    fornecedor: Array.isArray(p.fornecedor) ? p.fornecedor[0] ?? null : p.fornecedor,
  }));
}

export async function statusLiberacaoComprasPlanejamento(loteId: string) {
  const contexto = await obterContextoAction(loteId);
  // Sem contexto ainda = considerado bloqueado (compra não liberada por padrão).
  return { liberado: !!contexto && !contexto.bloqueado, motivo: contexto?.motivo_bloqueio ?? null };
}
