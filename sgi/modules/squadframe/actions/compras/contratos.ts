"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function criarContrato(formData: FormData) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR);

  const obra_id     = formData.get("obra_id") as string;
  const numero      = (formData.get("numero") as string)?.trim();
  const valor_total = parseFloat(formData.get("valor_total") as string);
  const descricao   = (formData.get("descricao") as string) || null;

  if (!obra_id) throw new Error("Selecione uma obra.");
  if (!numero) throw new Error("Informe o número do contrato.");
  if (!valor_total || valor_total <= 0) throw new Error("Informe um valor total válido.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { data, error } = await admin.rpc("criar_contrato", {
    p_usuario_id:  usuario_id,
    p_obra_id:     obra_id,
    p_numero:      numero,
    p_valor_total: valor_total,
    p_descricao:   descricao,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/squadframe/financeiro/contratos");
  redirect(`/squadframe/financeiro/contratos/${data as string}`);
}

export async function criarContratoDestino(contratoId: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR);

  const tipo_linha = formData.get("tipo_linha") as string;
  const valor       = parseFloat(formData.get("valor") as string);

  if (!tipo_linha) throw new Error("Selecione a aba do catálogo (destino).");
  if (!valor || valor <= 0) throw new Error("Informe um valor válido.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { error } = await admin.rpc("criar_contrato_destino", {
    p_usuario_id:  usuario_id,
    p_contrato_id: contratoId,
    p_tipo_linha:  tipo_linha,
    p_valor:       valor,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/squadframe/financeiro/contratos/${contratoId}`);
}

export async function criarContratoAlocacao(
  contratoId: string,
  contratoDestinoId: string,
  formData: FormData,
) {
  await verificarPermissao(PERMISSIONS.FINANCEIRO_CONTRATO_GERENCIAR);

  const fornecedor_id = formData.get("fornecedor_id") as string;
  const valor          = parseFloat(formData.get("valor") as string);

  if (!fornecedor_id) throw new Error("Selecione um fornecedor.");
  if (!valor || valor <= 0) throw new Error("Informe um valor válido.");

  const admin = createAdminClient();
  const usuario_id = await getUsuarioId();

  const { error } = await admin.rpc("criar_contrato_alocacao", {
    p_usuario_id:          usuario_id,
    p_contrato_destino_id: contratoDestinoId,
    p_fornecedor_id:       fornecedor_id,
    p_valor:               valor,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/squadframe/financeiro/contratos/${contratoId}`);
  revalidatePath("/squadframe/financeiro");
}

export interface SaldoFaturamentoDireto {
  temContrato: boolean;
  saldoPooled: number;
}

// Usado pelo formulário de pedido pra avisar (não bloquear) se a obra tem
// contrato de faturamento direto com o fornecedor e qual o saldo agregado
// entre obras (pool) — o bloqueio duro de verdade continua sendo só na
// confirmação de débito (confirmar_debito_carteira).
export async function consultarSaldoFaturamentoDireto(
  obraId: string,
  fornecedorId: string,
): Promise<SaldoFaturamentoDireto> {
  if (!obraId || !fornecedorId) return { temContrato: false, saldoPooled: 0 };

  const admin = createAdminClient();

  const [{ data: alocacoes }, { data: carteiras }] = await Promise.all([
    admin
      .from("contrato_fornecedor_alocacoes")
      .select("id, contrato_destino:contrato_destinos(contrato:contratos(obra_id))")
      .eq("fornecedor_id", fornecedorId),
    admin.from("carteiras").select("saldo_atual").eq("fornecedor_id", fornecedorId),
  ]);

  type AlocacaoRaw = {
    contrato_destino:
      | { contrato: { obra_id: string } | { obra_id: string }[] | null }
      | { contrato: { obra_id: string } | { obra_id: string }[] | null }[]
      | null;
  };
  const temContrato = ((alocacoes ?? []) as AlocacaoRaw[]).some((a) => {
    const destino = Array.isArray(a.contrato_destino) ? a.contrato_destino[0] : a.contrato_destino;
    const contrato = Array.isArray(destino?.contrato) ? destino?.contrato[0] : destino?.contrato;
    return contrato?.obra_id === obraId;
  });

  const saldoPooled = (carteiras ?? []).reduce((acc, c) => acc + Number(c.saldo_atual ?? 0), 0);

  return { temContrato, saldoPooled };
}
