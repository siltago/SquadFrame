"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getUsuarioAtual } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type SalvarResult = { ok: true; logo_url: string | null } | { ok: false; erro: string };

export async function salvarEmpresa(formData: FormData): Promise<SalvarResult> {
  const usuario = await getUsuarioAtual();
  if (!usuario) return { ok: false, erro: "Não autenticado." };
  if (!usuario.permissoes?.includes("*")) return { ok: false, erro: "Apenas administradores podem alterar dados da empresa." };
  const admin = createAdminClient();

  const logoFile = formData.get("logo_file") as File | null;
  let logo_url: string | null = null;
  let logoErro: string | null = null;

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop() ?? "png";
    const path = `logo.${ext}`;
    const buffer = Buffer.from(await logoFile.arrayBuffer());

    const { error } = await admin.storage
      .from("empresa")
      .upload(path, buffer, { contentType: logoFile.type, upsert: true });

    if (error) {
      logoErro = `Falha no upload da logo: ${error.message}. Verifique se o bucket "empresa" foi criado no Supabase.`;
    } else {
      const { data } = admin.storage.from("empresa").getPublicUrl(path);
      logo_url = `${data.publicUrl}?t=${Date.now()}`;
    }
  }

  const fields: Record<string, string | null> = {
    nome:          (formData.get("nome")         as string) || null,
    nome_fantasia: (formData.get("nome_fantasia") as string) || null,
    cnpj:          (formData.get("cnpj")         as string) || null,
    ie:            (formData.get("ie")           as string) || null,
    telefone:      (formData.get("telefone")      as string) || null,
    email:         (formData.get("email")         as string) || null,
    site:          (formData.get("site")          as string) || null,
    endereco:      (formData.get("endereco")      as string) || null,
    numero:        (formData.get("numero")        as string) || null,
    complemento:   (formData.get("complemento")   as string) || null,
    bairro:        (formData.get("bairro")        as string) || null,
    cidade:        (formData.get("cidade")        as string) || null,
    estado:        (formData.get("estado")        as string) || null,
    cep:           (formData.get("cep")           as string) || null,
    atualizado_em: new Date().toISOString(),
  };

  if (logo_url) fields.logo_url = logo_url;

  const { error: dbError } = await admin
    .from("empresa")
    .upsert({ id: "default", ...fields });

  if (dbError) return { ok: false, erro: dbError.message };
  if (logoErro) return { ok: false, erro: logoErro };

  revalidatePath("/compras/empresa");
  return { ok: true, logo_url };
}
