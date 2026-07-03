"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { revalidatePath } from "next/cache";

export async function depositarCarteira(formData: FormData) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_CARTEIRA_DEPOSITAR);

  const obra_id       = formData.get("obra_id") as string;
  const fornecedor_id = formData.get("fornecedor_id") as string;
  const valor         = parseFloat(formData.get("valor") as string);
  const descricao     = (formData.get("descricao") as string) || null;

  if (!obra_id)       throw new Error("Selecione uma obra.");
  if (!fornecedor_id) throw new Error("Selecione um fornecedor.");
  if (!valor || valor <= 0) throw new Error("Informe um valor válido.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data, error } = await admin.rpc("criar_deposito_carteira", {
    p_obra_id:       obra_id,
    p_fornecedor_id: fornecedor_id,
    p_usuario_id:    usuario_id,
    p_valor:         valor,
    p_descricao:     descricao,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/squadframe/financeiro");
  return data as { carteira_id: string; movimentacao_id: string; novo_saldo: number };
}

export async function marcarUsaCarteira(pedidoId: string, usa: boolean) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_PEDIDO_FAT_DIRETO);

  const admin = createAdminClient();
  const { error } = await admin
    .from("pedidos_compra")
    .update({ usa_carteira: usa })
    .eq("id", pedidoId);

  if (error) throw new Error(error.message);
  revalidatePath(`/squadframe/compras/pedidos/${pedidoId}`);
}
