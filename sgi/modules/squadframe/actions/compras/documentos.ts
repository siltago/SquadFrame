"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { getUsuarioId } from "./helpers";

export async function obterUrlUploadDocumento(pedidoId: string, nomeArquivo: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_DOCUMENTO_UPLOAD);
  const admin = createAdminClient();
  const safe = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `pedidos/${pedidoId}/${Date.now()}-${safe}`;
  const { data, error } = await admin.storage.from("pedido-docs").createSignedUploadUrl(caminho);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, token: data.token, caminho };
}

export async function registrarDocumento(
  pedidoId: string,
  nome: string,
  caminho: string,
  tamanho: number,
) {
  await verificarPermissao(PERMISSIONS.COMPRAS_DOCUMENTO_UPLOAD);
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const { error } = await admin.from("pedido_documentos").insert({
    pedido_id: pedidoId,
    usuario_id,
    nome_arquivo: nome,
    caminho_storage: caminho,
    tamanho_bytes: tamanho,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}

export async function excluirDocumento(documentoId: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_DOCUMENTO_EXCLUIR);
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("pedido_documentos")
    .select("pedido_id, caminho_storage")
    .eq("id", documentoId)
    .single();
  if (!doc) throw new Error("Documento não encontrado.");
  await admin.storage.from("pedido-docs").remove([doc.caminho_storage]);
  await admin.from("pedido_documentos").delete().eq("id", documentoId);
  revalidatePath(`/squadframe/compras/pedidos/${doc.pedido_id}`);
}

export async function gerarUrlDownload(caminho: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_DOCUMENTO_UPLOAD);
  const admin = createAdminClient();
  const { data } = await admin.storage.from("pedido-docs").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? null;
}
