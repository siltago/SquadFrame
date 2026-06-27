"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { verificarPermissao } from "@/core/permissions/check-permission";
import { revalidatePath } from "next/cache";

async function audit(acao: string, tabela: string, registro_id: string, dados?: object) {
  const admin = createAdminClient();
  const usuario = await getUsuarioAtual();
  await admin.from("audit_log").insert({
    usuario_id: usuario?.id ?? null,
    acao,
    tabela,
    registro_id,
    dados: dados ?? null,
  });
}

export async function criarSetor(formData: FormData) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();
  const nome = String(formData.get("nome") || "").trim();
  const cor  = String(formData.get("cor")  || "#475569").trim();
  if (!nome) throw new Error("Nome é obrigatório.");

  const { data: ultimo } = await admin
    .from("setores")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("setores")
    .insert({ nome, cor, ordem: (ultimo?.ordem ?? 0) + 1 })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await audit("criar", "setores", data.id, { nome, cor });
  revalidatePath("/usuarios/cargos");
}

export async function criarCargo(formData: FormData) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();
  const nome     = String(formData.get("nome")     || "").trim();
  const cor      = String(formData.get("cor")      || "#475569").trim();
  const setor_id = String(formData.get("setor_id") || "").trim();
  if (!nome)     throw new Error("Nome é obrigatório.");
  if (!setor_id) throw new Error("Setor é obrigatório.");

  const { data: ultimo } = await admin
    .from("cargos")
    .select("ordem")
    .eq("setor_id", setor_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("cargos")
    .insert({ nome, cor, setor_id, ordem: (ultimo?.ordem ?? 0) + 1, is_admin: false })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await audit("criar", "cargos", data.id, { nome, cor, setor_id });
  revalidatePath("/usuarios/cargos");
}

export async function salvarCargo(
  cargoId: string,
  payload: {
    nome: string;
    cor: string;
    setor_id: string;
    is_admin: boolean;
    permissao_ids: string[];
  }
) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();
  const { nome, cor, setor_id, is_admin, permissao_ids } = payload;

  const { error: errCargo } = await admin
    .from("cargos")
    .update({ nome, cor, setor_id, is_admin })
    .eq("id", cargoId);

  if (errCargo) throw new Error(errCargo.message);

  await admin.from("cargo_permissoes").delete().eq("cargo_id", cargoId);

  if (permissao_ids.length > 0) {
    const { error: errPerms } = await admin.from("cargo_permissoes").insert(
      permissao_ids.map((permissao_id) => ({ cargo_id: cargoId, permissao_id }))
    );
    if (errPerms) throw new Error(errPerms.message);
  }

  await audit("editar", "cargos", cargoId, { nome, cor, setor_id, is_admin, permissao_ids });
  revalidatePath("/usuarios/cargos");
}

export async function reordenarCargos(itens: { id: string; ordem: number }[]) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();
  await Promise.all(
    itens.map(({ id, ordem }) =>
      admin.from("cargos").update({ ordem }).eq("id", id)
    )
  );
  revalidatePath("/usuarios/cargos");
}

export async function excluirCargo(cargoId: string) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();

  const { count } = await admin
    .from("usuarios")
    .select("*", { count: "exact", head: true })
    .eq("cargo_id", cargoId);

  if (count && count > 0)
    throw new Error("Este cargo possui usuários vinculados e não pode ser excluído.");

  const { data: cargo } = await admin
    .from("cargos")
    .select("is_admin")
    .eq("id", cargoId)
    .single();

  if (cargo?.is_admin) {
    const { count: admins } = await admin
      .from("cargos")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", true);
    if ((admins ?? 0) <= 1)
      throw new Error("O único cargo administrador não pode ser excluído.");
  }

  await admin.from("cargo_permissoes").delete().eq("cargo_id", cargoId);
  const { error } = await admin.from("cargos").delete().eq("id", cargoId);
  if (error) throw new Error(error.message);

  await audit("apagar", "cargos", cargoId, {});
  revalidatePath("/usuarios/cargos");
}

export async function atribuirCargo(usuarioId: string, cargoId: string | null) {
  await verificarPermissao("cargos.criar");
  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ cargo_id: cargoId })
    .eq("id", usuarioId);
  if (error) throw new Error(error.message);
  await audit("editar", "usuarios", usuarioId, { cargo_id: cargoId });
  revalidatePath("/usuarios/cargos");
}
