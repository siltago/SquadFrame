"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";
import { iniciarRecebimento } from "./recebimento";

// Decide se o clique em "Conferir recebimento (Estoque)" no detalhe do
// pedido leva pro lote do romaneio (se houver um vinculado) ou pro fluxo
// individual. Sem romaneio vinculado, cai no fluxo de sempre — iniciarRecebimento
// é idempotente, mesmo padrão já usado em RecebimentoAcaoBotao.
export async function resolverDestinoRecebimento(pedidoId: string): Promise<{ href: string }> {
  await verificarPermissao(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  const admin = createAdminClient();

  const { data: vinculos } = await admin
    .from("romaneio_pedidos")
    .select("romaneio_id, romaneio:romaneios(criado_em)")
    .eq("pedido_id", pedidoId);

  const maisRecente = (vinculos ?? [])
    .map((r: any) => ({
      id: r.romaneio_id,
      criado_em: (Array.isArray(r.romaneio) ? r.romaneio[0] : r.romaneio)?.criado_em,
    }))
    .sort((a, b) => (b.criado_em ?? "").localeCompare(a.criado_em ?? ""))[0];

  if (maisRecente?.id) {
    return { href: `/squadstock/recebimento/romaneio/${maisRecente.id}` };
  }

  await iniciarRecebimento(pedidoId);
  return { href: `/squadstock/recebimento/${pedidoId}` };
}
