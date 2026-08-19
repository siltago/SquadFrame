"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";

// "Fechar" o banner de destaques — não resolve nada, só adia a exibição pro
// próximo acesso do dia seguinte (ver detectarDestaquesDashboard, que
// confere snoozed_em contra a data atual). Mesmo padrão de
// adiarPendenciasParaAmanha (modules/squadframe/actions/compras/pendencias.ts).
export async function adiarDestaquesParaAmanha() {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const hojeIso = new Date().toISOString().slice(0, 10);

  await admin
    .from("usuario_destaque_snooze")
    .upsert({ usuario_id: usuario.id, snoozed_em: hojeIso, atualizado_em: new Date().toISOString() });
}
