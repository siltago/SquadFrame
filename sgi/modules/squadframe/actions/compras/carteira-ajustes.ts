"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { revalidatePath } from "next/cache";

export interface ResultadoAjusteSaldo {
  ajuste_id: string;
  valor_anterior: number;
  valor_novo: number;
}

// Correção manual de saldo POOLED de um fornecedor (ex: sistema mostra 500k
// entre as obras, o real é 469k) — nunca um depósito/débito comum, sempre
// com motivo obrigatório. A RPC decide sozinha em qual(is) carteira(s)
// obra×fornecedor aplicar o delta (mais antiga primeiro) e já registra a
// descrição padronizada "Ajuste interno: <usuário>" no ledger — ver
// ajustar_saldo_fornecedor. O motivo livre digitado aqui fica em
// carteira_ajustes.motivo, pra alimentar relatório/documento depois.
export async function ajustarSaldoFornecedor(formData: FormData): Promise<ResultadoAjusteSaldo> {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_CARTEIRA_AJUSTAR);

  const fornecedor_id = formData.get("fornecedor_id") as string;
  const valor_novo     = parseFloat(String(formData.get("valor_novo") || "").replace(",", "."));
  const motivo         = String(formData.get("motivo") || "").trim();

  if (!fornecedor_id) throw new Error("Selecione um fornecedor.");
  if (isNaN(valor_novo) || valor_novo < 0) throw new Error("Informe um saldo válido.");
  if (!motivo) throw new Error("Informe o motivo do ajuste.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data, error } = await admin.rpc("ajustar_saldo_fornecedor", {
    p_fornecedor_id: fornecedor_id,
    p_usuario_id:    usuario_id,
    p_valor_novo:    valor_novo,
    p_motivo:        motivo,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/squadframe/financeiro");

  return data as ResultadoAjusteSaldo;
}
