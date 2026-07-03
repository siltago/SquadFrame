"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { revalidatePath } from "next/cache";
import { COLUNA_STATUS_COMPRAS, type BoardPedidoCard } from "@/modules/squadboard/types/pedido";
import { mapPedidoParaBoardCard, type PedidoBoardRaw } from "@/modules/squadboard/utils/map-pedido-to-card";

// Busca pedidos de compra standalone (sem lote vinculado) para o pipeline
// de Compras do SquadBoard. Pedidos cancelados são excluídos.
export async function buscarPedidosCompras(): Promise<BoardPedidoCard[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("pedidos_compra")
    .select(`
      id, numero, status, obra_id, comprador_id, prazo_entrega,
      valor_final, criado_em, fornecedor_id,
      obra:obras(id, nome, deleted_at),
      fornecedor:fornecedores(nome),
      comprador:usuarios(nome)
    `)
    .is("lote_id", null)
    .neq("status", "CANCELADO")
    .order("criado_em", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as PedidoBoardRaw[]).map(mapPedidoParaBoardCard);
}

// Move um pedido para outra coluna do pipeline Compras atualizando seu status
// para o status canônico da coluna de destino.
export async function moverPedidoBoard(pedidoId: string, novaColuna: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const novoStatus = COLUNA_STATUS_COMPRAS[novaColuna];
  if (!novoStatus) throw new Error(`Coluna "${novaColuna}" não existe no pipeline de Compras.`);

  const admin = createAdminClient();
  const { error } = await admin
    .from("pedidos_compra")
    .update({ status: novoStatus })
    .eq("id", pedidoId);

  if (error) throw new Error(error.message);

  revalidatePath("/squadboard");
}
