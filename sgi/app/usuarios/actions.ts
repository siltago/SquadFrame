"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function atribuirCargo(usuarioId: string, cargoId: string | null) {
  const admin = createAdminClient();

  let setorId: string | null = null;
  if (cargoId) {
    const { data: cargo } = await admin
      .from("cargos")
      .select("setor_id")
      .eq("id", cargoId)
      .single();
    setorId = cargo?.setor_id ?? null;
  }

  const { error } = await admin
    .from("usuarios")
    .update({ cargo_id: cargoId, setor_id: setorId })
    .eq("id", usuarioId);

  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function alterarStatusUsuario(usuarioId: string, ativo: boolean) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("usuarios")
    .update({ ativo })
    .eq("id", usuarioId);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function configurarPrimeiroAdmin() {
  const admin = createAdminClient();

  // Só funciona se não houver nenhum cargo admin ativo
  const { data: adminsExistentes } = await admin
    .from("cargos")
    .select("id")
    .eq("is_admin", true)
    .eq("ativo", true);

  if (adminsExistentes && adminsExistentes.length > 0) {
    throw new Error("Já existe um cargo de administrador no sistema.");
  }

  // Descobre o usuário atual pelo session
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // Cria cargo Administrador
  const { data: cargo, error: errCargo } = await admin
    .from("cargos")
    .insert({ nome: "Administrador", cor: "#1e40af", is_admin: true, ativo: true })
    .select("id")
    .single();
  if (errCargo) throw new Error(errCargo.message);

  // Atribui ao usuário atual
  const { error: errUser } = await admin
    .from("usuarios")
    .update({ cargo_id: cargo.id })
    .eq("auth_id", user.id);
  if (errUser) throw new Error(errUser.message);

  revalidatePath("/usuarios");
  revalidatePath("/");
}
