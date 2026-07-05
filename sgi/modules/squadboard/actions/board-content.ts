"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import type {
  EntityType, BoardContent, BoardChecklist, BoardChecklistItem, BoardAnexo,
} from "@/modules/squadboard/types/board-content";

export async function buscarConteudo(
  entityType: EntityType,
  entityId: string,
): Promise<BoardContent> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  const [descricaoRes, checklistsRes, anexosRes] = await Promise.all([
    admin
      .from("board_descricao")
      .select("conteudo")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle(),
    admin
      .from("board_checklist")
      .select("id, titulo, ordem, itens:board_checklist_item(id, texto, concluido, ordem)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("ordem", { ascending: true }),
    admin
      .from("board_anexo")
      .select("id, nome, url, criado_em")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("criado_em", { ascending: true }),
  ]);

  const checklists: BoardChecklist[] = (checklistsRes.data ?? []).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    ordem: c.ordem,
    itens: ((c.itens as BoardChecklistItem[]) ?? []).sort((a, b) => a.ordem - b.ordem),
  }));

  const anexos: BoardAnexo[] = (anexosRes.data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    url: a.url,
    criadoEm: a.criado_em,
  }));

  return {
    descricao: descricaoRes.data?.conteudo ?? "",
    checklists,
    anexos,
  };
}

export async function salvarDescricao(
  entityType: EntityType,
  entityId: string,
  conteudo: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("board_descricao")
    .upsert(
      { entity_type: entityType, entity_id: entityId, conteudo, atualizado_em: new Date().toISOString() },
      { onConflict: "entity_type,entity_id" },
    );
  if (error) throw new Error(error.message);
}

export async function criarChecklist(
  entityType: EntityType,
  entityId: string,
  titulo: string,
): Promise<BoardChecklist> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_checklist")
    .insert({ entity_type: entityType, entity_id: entityId, titulo, ordem: Date.now() })
    .select("id, titulo, ordem")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, titulo: data.titulo, ordem: data.ordem, itens: [] };
}

export async function atualizarChecklist(id: string, titulo: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin.from("board_checklist").update({ titulo }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletarChecklist(id: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin.from("board_checklist").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function criarItemChecklist(
  checklistId: string,
  texto: string,
): Promise<BoardChecklistItem> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_checklist_item")
    .insert({ checklist_id: checklistId, texto, concluido: false, ordem: Date.now() })
    .select("id, texto, concluido, ordem")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, texto: data.texto, concluido: data.concluido, ordem: data.ordem };
}

export async function atualizarItemChecklist(
  id: string,
  campos: { texto?: string; concluido?: boolean },
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin.from("board_checklist_item").update(campos).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletarItemChecklist(id: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { error } = await admin.from("board_checklist_item").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function criarAnexo(
  entityType: EntityType,
  entityId: string,
  nome: string,
  url: string,
): Promise<BoardAnexo> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_anexo")
    .insert({ entity_type: entityType, entity_id: entityId, nome, url })
    .select("id, nome, url, criado_em")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, nome: data.nome, url: data.url, criadoEm: data.criado_em };
}

export async function deletarAnexo(id: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  // Remove do Storage se for um arquivo interno
  const { data: row } = await admin
    .from("board_anexo")
    .select("url, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.storage_path) {
    await admin.storage.from("board-anexos").remove([row.storage_path]);
  }

  const { error } = await admin.from("board_anexo").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadAnexoArquivo(
  entityType: EntityType,
  entityId: string,
  formData: FormData,
): Promise<BoardAnexo> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Arquivo não encontrado.");

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "";
  const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const bytes = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("board-anexos")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: urlData } = admin.storage.from("board-anexos").getPublicUrl(storagePath);

  const { data, error } = await admin
    .from("board_anexo")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      nome: file.name,
      url: urlData.publicUrl,
      storage_path: storagePath,
    })
    .select("id, nome, url, criado_em")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, nome: data.nome, url: data.url, criadoEm: data.criado_em };
}
