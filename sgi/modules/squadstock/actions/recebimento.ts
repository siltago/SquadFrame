"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";

// Idempotente: se já tiver sido iniciado, não sobrescreve o timestamp de
// quem começou a conferência.
export async function iniciarRecebimento(pedidoId: string) {
  await verificarPermissao(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const { data: pedido } = await admin
    .from("pedidos_compra")
    .select("recebimento_iniciado_em")
    .eq("id", pedidoId)
    .single();
  if (!pedido) throw new Error("Pedido não encontrado.");

  if (!pedido.recebimento_iniciado_em) {
    const { error } = await admin
      .from("pedidos_compra")
      .update({ recebimento_iniciado_em: new Date().toISOString(), recebimento_iniciado_por: usuarioId })
      .eq("id", pedidoId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/squadstock/recebimento");
  revalidatePath(`/squadstock/recebimento/${pedidoId}`);
}
