"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/modules/squadframe/lib/permissions";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { emitirEvento } from "@/modules/squadframe/services/events/event-bus";
import { EVENTS } from "@/modules/squadframe/services/events/event-types";

// ── Formas de Pagamento ──────────────────────────────────────────────────────

export async function criarFormaPagamento(formData: FormData) {
  await verificarPermissao(PERMISSIONS.COMPRAS_FORMA_PAGAMENTO_GERENCIAR);
  const admin = createAdminClient();
  const nome                 = (formData.get("nome") as string).trim();
  const descricao            = (formData.get("descricao") as string | null)?.trim() || null;
  const is_faturamento_direto = formData.get("is_faturamento_direto") === "true";
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await admin.from("formas_pagamento").insert({ nome, descricao, is_faturamento_direto });
  if (error) throw new Error(error.message);
  revalidatePath("/squadframe/compras/formas-pagamento");
}

export async function alterarFormaPagamento(id: string, ativo: boolean) {
  await verificarPermissao(PERMISSIONS.COMPRAS_FORMA_PAGAMENTO_GERENCIAR);
  const admin = createAdminClient();
  await admin.from("formas_pagamento").update({ ativo }).eq("id", id);
  revalidatePath("/squadframe/compras/fornecedores");
}

export async function excluirFormasPagamento(ids: string[]) {
  if (!ids.length) return;
  await verificarPermissao(PERMISSIONS.COMPRAS_FORMA_PAGAMENTO_GERENCIAR);
  const admin = createAdminClient();
  const { error } = await admin.from("formas_pagamento").delete().in("id", ids);
  if (error) throw new Error("Não é possível excluir: há pedidos vinculados a essa forma de pagamento.");
  revalidatePath("/squadframe/compras/formas-pagamento");
}

// ── Fornecedores ─────────────────────────────────────────────────────────────

export async function criarFornecedor(formData: FormData) {
  await verificarPermissao(PERMISSIONS.CATALOGO_FORNECEDOR_CRIAR, PERMISSIONS.COMPRAS_FORNECEDOR_CRIAR);
  const admin = createAdminClient();
  const g = (k: string) => (formData.get(k) as string | null)?.trim() || null;
  const nome  = (formData.get("nome") as string).trim();
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);
  if (!nome) throw new Error("Nome é obrigatório.");
  const { data, error } = await admin
    .from("fornecedores")
    .insert({
      nome, tipos,
      razao_social: g("razao_social"), cnpj: g("cnpj"),
      email: g("email"), telefone: g("telefone"), contato: g("contato"),
      endereco: g("endereco"), numero: g("numero"), complemento: g("complemento"),
      bairro: g("bairro"), cidade: g("cidade"), estado: g("estado"), cep: g("cep"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await emitirEvento(EVENTS.SUPPLIER_CREATED, { supplier_id: data?.id, nome });
}

export async function editarFornecedor(id: string, formData: FormData) {
  await verificarPermissao(PERMISSIONS.CATALOGO_FORNECEDOR_EDITAR, PERMISSIONS.COMPRAS_FORNECEDOR_EDITAR);
  const admin = createAdminClient();
  const g = (k: string) => (formData.get(k) as string | null)?.trim() || null;
  const nome  = (formData.get("nome") as string).trim();
  const tipos = formData.getAll("tipos").map(String).filter(Boolean);
  if (!nome) throw new Error("Nome é obrigatório.");
  const { error } = await admin
    .from("fornecedores")
    .update({
      nome, tipos,
      razao_social: g("razao_social"), cnpj: g("cnpj"),
      email: g("email"), telefone: g("telefone"), contato: g("contato"),
      endereco: g("endereco"), numero: g("numero"), complemento: g("complemento"),
      bairro: g("bairro"), cidade: g("cidade"), estado: g("estado"), cep: g("cep"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await emitirEvento(EVENTS.SUPPLIER_UPDATED, { supplier_id: id, nome });
}

export async function excluirFornecedores(ids: string[]) {
  if (!ids.length) return;
  await verificarPermissao(PERMISSIONS.CATALOGO_FORNECEDOR_EXCLUIR, PERMISSIONS.COMPRAS_FORNECEDOR_EXCLUIR);
  const admin = createAdminClient();
  const { error } = await admin.from("fornecedores").delete().in("id", ids);
  if (error) throw new Error("Não é possível excluir: há pedidos ou registros vinculados a esse fornecedor.");
  await emitirEvento(EVENTS.SUPPLIER_DELETED, { supplier_ids: ids });
}
