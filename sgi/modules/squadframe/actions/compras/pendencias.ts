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
