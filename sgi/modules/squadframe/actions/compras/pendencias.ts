"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioId } from "./helpers";
import type { TipoPendencia } from "@/modules/squadframe/services/pendencias/types";

export async function registrarJustificativaPendencia(
  pedidoId: string,
  tipo: TipoPendencia,
  motivo: string,
) {
  if (!motivo.trim()) throw new Error("Informe o motivo.");
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  await admin.from("pedido_pendencia_justificativas").insert({
    pedido_id: pedidoId,
    usuario_id,
    tipo_pendencia: tipo,
    motivo: motivo.trim(),
  });
}

// "Minimizar" o banner de pendências — não resolve nem justifica nada, só
// adia a cobrança pro próximo acesso do dia seguinte (ver
// detectarPendenciasComprador, que confere snoozed_em contra a data atual).
export async function adiarPendenciasParaAmanha() {
  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();
  const hojeIso = new Date().toISOString().slice(0, 10);

  await admin
    .from("usuario_pendencia_snooze")
    .upsert({ usuario_id, snoozed_em: hojeIso, atualizado_em: new Date().toISOString() });
}
