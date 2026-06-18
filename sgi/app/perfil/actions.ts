"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function salvarFotoUrl(url: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin.from("usuarios").update({ foto_url: url }).eq("auth_id", user.id);
  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/usuarios");
}

export async function salvarAssinatura(texto: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data: usuario } = await admin.from("usuarios").select("id").eq("auth_id", user.id).single();
  if (!usuario) throw new Error("Usuário não encontrado.");

  await admin.from("assinaturas").upsert(
    { usuario_id: usuario.id, texto, atualizado_em: new Date().toISOString() },
    { onConflict: "usuario_id" }
  );
  revalidatePath("/perfil");
}

export async function salvarPerfil(nome: string, empresa: string, fotoUrl: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  await supabase.auth.updateUser({ data: { nome, empresa } });

  const admin = createAdminClient();
  await admin
    .from("usuarios")
    .update({ nome, empresa: empresa || null, foto_url: fotoUrl || null })
    .eq("auth_id", user.id);

  revalidatePath("/");
  revalidatePath("/perfil");
}
