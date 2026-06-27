"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { verificarPermissao } from "@/core/permissions/check-permission";

export async function cadastrarUsuario(formData: FormData) {
  await verificarPermissao("usuarios.criar");
  const nome    = String(formData.get("nome")    || "").trim();
  const empresa = String(formData.get("empresa") || "").trim();
  const email   = String(formData.get("email")   || "").trim();
  const senha   = String(formData.get("senha")   || "");

  if (!nome || !email || !senha) throw new Error("Preencha todos os campos.");
  if (senha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

  const admin = createAdminClient();

  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, empresa },
  });

  if (!error && criado?.user) {
    // Garante linha em usuarios (trigger pode ter falhado)
    await admin.from("usuarios").upsert(
      { auth_id: criado.user.id, nome, email, empresa: empresa || null },
      { onConflict: "auth_id", ignoreDuplicates: true }
    );
    revalidatePath("/usuarios");
    return { ok: true };
  }

  // Se o e-mail já existe, atualiza a senha e os metadados
  if (error && error.message.toLowerCase().includes("already")) {
    const { data: lista } = await admin.auth.admin.listUsers();
    const existente = lista?.users.find((u) => u.email === email);

    if (!existente) throw new Error("Erro ao localizar usuário existente.");

    const { error: errUpdate } = await admin.auth.admin.updateUserById(
      existente.id,
      { password: senha, email_confirm: true, user_metadata: { nome, empresa } }
    );

    if (errUpdate) throw new Error(errUpdate.message);

    await admin.from("usuarios").upsert(
      { auth_id: existente.id, nome, email, empresa: empresa || null },
      { onConflict: "auth_id" }
    );

    revalidatePath("/usuarios");
    return { ok: true };
  }

  throw new Error(error?.message ?? "Erro desconhecido.");
}
