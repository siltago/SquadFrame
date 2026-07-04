"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import type { BoardEtiqueta } from "@/modules/squadboard/types/etiqueta";

export async function buscarEtiquetas(): Promise<BoardEtiqueta[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_etiquetas")
    .select("id, nome, cor, criado_em")
    .order("criado_em", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, criadoEm: e.criado_em }));
}

export async function criarEtiqueta(nome: string, cor: string): Promise<BoardEtiqueta> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_etiquetas")
    .insert({ nome: nome.trim(), cor })
    .select("id, nome, cor, criado_em")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id, nome: data.nome, cor: data.cor, criadoEm: data.criado_em };
}

export async function atualizarEtiqueta(
  id: string,
  campos: { nome?: string; cor?: string },
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const payload: Record<string, string> = {};
  if (campos.nome !== undefined) payload.nome = campos.nome.trim();
  if (campos.cor !== undefined) payload.cor = campos.cor;

  const admin = createAdminClient();
  const { error } = await admin.from("board_etiquetas").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletarEtiqueta(id: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin.from("board_etiquetas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function buscarEtiquetasDoPacote(loteId: string): Promise<BoardEtiqueta[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lote_board_etiqueta")
    .select("etiqueta:board_etiquetas(id, nome, cor, criado_em)")
    .eq("lote_id", loteId);

  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const e = Array.isArray(row.etiqueta) ? row.etiqueta[0] : row.etiqueta;
    if (!e) return [];
    return [{ id: e.id, nome: e.nome, cor: e.cor, criadoEm: e.criado_em }];
  });
}

export async function atribuirEtiqueta(loteId: string, etiquetaId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("lote_board_etiqueta")
    .upsert({ lote_id: loteId, etiqueta_id: etiquetaId }, { onConflict: "lote_id,etiqueta_id" });
  if (error) throw new Error(error.message);
}

export async function removerEtiquetaDoPacote(loteId: string, etiquetaId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("lote_board_etiqueta")
    .delete()
    .eq("lote_id", loteId)
    .eq("etiqueta_id", etiquetaId);
  if (error) throw new Error(error.message);
}

// ── Etiquetas para pedidos de compra standalone ──────────────────────────────

export async function buscarEtiquetasDePedido(pedidoId: string): Promise<BoardEtiqueta[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pedido_board_etiqueta")
    .select("etiqueta:board_etiquetas(id, nome, cor, criado_em)")
    .eq("pedido_id", pedidoId);

  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    const e = Array.isArray(row.etiqueta) ? row.etiqueta[0] : row.etiqueta;
    if (!e) return [];
    return [{ id: e.id, nome: e.nome, cor: e.cor, criadoEm: e.criado_em }];
  });
}

export async function atribuirEtiquetaPedido(pedidoId: string, etiquetaId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("pedido_board_etiqueta")
    .upsert({ pedido_id: pedidoId, etiqueta_id: etiquetaId }, { onConflict: "pedido_id,etiqueta_id" });
  if (error) throw new Error(error.message);
}

export async function removerEtiquetaDePedido(pedidoId: string, etiquetaId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("pedido_board_etiqueta")
    .delete()
    .eq("pedido_id", pedidoId)
    .eq("etiqueta_id", etiquetaId);
  if (error) throw new Error(error.message);
}
