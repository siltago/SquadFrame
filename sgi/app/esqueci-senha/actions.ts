"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";

// Redefine a senha direto na tela, sem e-mail — o serviço de e-mail padrão
// do Supabase tem limite de envio muito baixo (poucos e-mails/hora) e não é
// confiável pra recuperação de senha em produção sem SMTP próprio
// configurado. Usa a API admin (service_role) pra trocar a senha sem
// precisar de sessão nem link de confirmação.
export async function redefinirSenhaSemEmail(email: string, novaSenha: string) {
  if (novaSenha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");

  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from("usuarios")
    .select("auth_id, ativo")
    .ilike("email", email.trim())
    .maybeSingle();

  if (!usuario?.auth_id || !usuario.ativo) {
    throw new Error("Não foi possível redefinir a senha. Confira o e-mail informado.");
  }

  const { error } = await admin.auth.admin.updateUserById(usuario.auth_id, { password: novaSenha });
  if (error) throw new Error(error.message);
}
