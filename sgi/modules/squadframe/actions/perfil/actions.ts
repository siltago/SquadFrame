"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { createClient } from "@/shared/database/supabase-server";
import { revalidatePath } from "next/cache";

export async function salvarFotoUrl(url: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin.from("usuarios").update({ foto_url: url }).eq("auth_id", user.id);
  revalidatePath("/");
  revalidatePath("/squadframe/perfil");
  revalidatePath("/squadframe/usuarios");
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
  revalidatePath("/squadframe/perfil");
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
  revalidatePath("/squadframe/perfil");
}

function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function enviarCodigoWhatsapp(numero: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const numeroLimpo = numero.replace(/\D/g, "");
  if (numeroLimpo.length < 10) {
    throw new Error("WhatsApp inválido — informe DDD + número (ex: 11999998888).");
  }
  // Envio via Evolution API espera E.164 sem "+" — assume DDI 55 (Brasil) quando ausente.
  const numeroEnvio = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;

  const codigo = gerarCodigo();
  const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  // Salva já no formato E.164 (com DDI) — é esse valor que vira usuarios.whatsapp
  // depois de confirmado, e é ele que o cron usa pra enviar via Evolution API.
  const { error } = await admin
    .from("usuarios")
    .update({ whatsapp_pendente: numeroEnvio, whatsapp_codigo: codigo, whatsapp_codigo_expira_em: expiraEm })
    .eq("auth_id", user.id);
  if (error) throw new Error(error.message);

  const { sendWhatsappMessage } = await import("@/shared/providers/whatsapp/twilio");
  const resultado = await sendWhatsappMessage(
    numeroEnvio,
    `Seu código de verificação SquadFrame é *${codigo}*. Válido por 10 minutos.`,
  );

  if (!resultado.ok) {
    throw new Error(
      resultado.error === "not_configured"
        ? "Envio de WhatsApp não está configurado no sistema. Contate o administrador."
        : "Não foi possível enviar o código. Confira o número e tente novamente.",
    );
  }

  revalidatePath("/squadframe/perfil");
  return { numeroEnvio };
}

export async function confirmarCodigoWhatsapp(codigo: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("whatsapp_pendente, whatsapp_codigo, whatsapp_codigo_expira_em")
    .eq("auth_id", user.id)
    .single();
  if (!usuario?.whatsapp_pendente) throw new Error("Nenhuma verificação em andamento. Informe o número novamente.");

  if (!usuario.whatsapp_codigo_expira_em || new Date(usuario.whatsapp_codigo_expira_em) < new Date()) {
    throw new Error("Código expirado. Solicite um novo.");
  }
  if (usuario.whatsapp_codigo !== codigo.trim()) {
    throw new Error("Código incorreto.");
  }

  const { error } = await admin
    .from("usuarios")
    .update({
      whatsapp: usuario.whatsapp_pendente,
      whatsapp_pendente: null,
      whatsapp_codigo: null,
      whatsapp_codigo_expira_em: null,
    })
    .eq("auth_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/squadframe/perfil");
}

export async function cancelarVerificacaoWhatsapp() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin
    .from("usuarios")
    .update({ whatsapp_pendente: null, whatsapp_codigo: null, whatsapp_codigo_expira_em: null })
    .eq("auth_id", user.id);

  revalidatePath("/squadframe/perfil");
}
