"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { verificarPermissao } from "@/shared/auth/check-permission";
import { STOCK_PERMISSIONS } from "@/modules/squadstock/constants";

export type RomaneioBusca = {
  id: string;
  numero: string | null;
  data_entrega: string | null;
  criado_em: string;
  fornecedor: { nome: string } | null;
};

// romaneios.numero não tem UNIQUE (é texto extraído do PDF) — a busca pode
// retornar mais de um resultado, o chamador decide o que fazer (ir direto
// se só um, mostrar lista se vários).
export async function buscarRomaneioPorNumero(numero: string): Promise<RomaneioBusca[]> {
  await verificarPermissao(STOCK_PERMISSIONS.RECEBIMENTO_INICIAR);
  const termo = numero.trim();
  if (!termo) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("romaneios")
    .select("id, numero, data_entrega, criado_em, fornecedor:fornecedores(nome)")
    .ilike("numero", `%${termo}%`)
    .order("criado_em", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    fornecedor: Array.isArray(r.fornecedor) ? r.fornecedor[0] ?? null : r.fornecedor,
  }));
}
