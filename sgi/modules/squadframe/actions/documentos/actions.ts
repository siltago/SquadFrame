"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { getUsuarioId } from "@/modules/squadframe/actions/compras/helpers";
import type { StatusPedido } from "@/modules/squadframe/types/compras";

// Chaves em snake_case — é o formato salvo na coluna jsonb `relatorios.filtros`
// e lido de volta por app/squadframe/documentos/[id]/page.tsx e .../editar/page.tsx.
interface FiltrosSalvos {
  data_inicio: string;
  data_fim: string;
  obra_id?: string;
  fornecedor_id?: string;
  status?: StatusPedido;
}

function filtrosDoFormData(formData: FormData): FiltrosSalvos {
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const obraId = String(formData.get("obra_id") ?? "");
  const fornecedorId = String(formData.get("fornecedor_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!dataInicio || !dataFim) throw new Error("Período (data início/fim) é obrigatório.");

  return {
    data_inicio: dataInicio,
    data_fim: dataFim,
    ...(obraId ? { obra_id: obraId } : {}),
    ...(fornecedorId ? { fornecedor_id: fornecedorId } : {}),
    ...(status ? { status: status as StatusPedido } : {}),
  };
}

export async function criarRelatorio(formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  const admin = createAdminClient();
  const usuarioId = await getUsuarioId();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome do relatório é obrigatório.");
  const filtros = filtrosDoFormData(formData);

  const { data, error } = await admin
    .from("relatorios")
    .insert({ tipo: "pedidos", nome, filtros, criado_por: usuarioId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao criar relatório.");

  revalidatePath("/squadframe/documentos");
  redirect(`/squadframe/documentos/${data.id}`);
}

export async function editarRelatorio(id: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  const admin = createAdminClient();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome do relatório é obrigatório.");
  const filtros = filtrosDoFormData(formData);

  const { error } = await admin
    .from("relatorios")
    .update({ nome, filtros, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/squadframe/documentos");
  revalidatePath(`/squadframe/documentos/${id}`);
  redirect(`/squadframe/documentos/${id}`);
}

export async function excluirRelatorio(id: string) {
  await verificarPermissao(PERMISSIONS.COMPRAS_RELATORIO_GERENCIAR);
  const admin = createAdminClient();
  const { error } = await admin.from("relatorios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/squadframe/documentos");
}
