"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";

const TIPOS_VALIDOS = ["GALPAO", "FILIAL", "OUTRO"];

export async function criarLocal(formData: FormData) {
  await verificarPermissao(STOCK_PERMISSIONS.LOCAL_GERENCIAR);
  const admin = createAdminClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "OUTRO");

  if (!nome) throw new Error("Informe o nome do local.");
  if (!TIPOS_VALIDOS.includes(tipo)) throw new Error("Tipo inválido.");

  const { error } = await admin.from("stock_locais").insert({ nome, tipo });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe um local com esse nome.");
    throw new Error(error.message);
  }

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}

export async function desativarLocal(localId: string) {
  await verificarPermissao(STOCK_PERMISSIONS.LOCAL_GERENCIAR);
  const admin = createAdminClient();

  const { error } = await admin.from("stock_locais").update({ ativo: false }).eq("id", localId);
  if (error) throw new Error(error.message);

  revalidatePath("/squadstock/locais");
  revalidatePath("/squadstock");
}
