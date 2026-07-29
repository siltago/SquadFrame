import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseUnidade, WiseModulo } from "./types";

// Repository burro por design: um select/insert/update por método, sem
// regra de negócio aqui dentro. Regra vive em service.ts — ver seção 3
// do docs/squadwise/fase-1-arquitetura.md.

export async function listarUnidades(): Promise<WiseUnidade[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_unidades").select("*").order("nome");
  return (data ?? []) as WiseUnidade[];
}

export async function inserirUnidade(dados: {
  nome: string;
  codigo: string;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}): Promise<WiseUnidade> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wise_unidades")
    .insert(dados)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as WiseUnidade;
}

export async function atualizarUnidade(
  id: string,
  dados: Partial<{
    nome: string;
    codigo: string;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
  }>,
): Promise<WiseUnidade> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("wise_unidades").update(dados).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as WiseUnidade;
}

export async function listarModulos(): Promise<WiseModulo[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_modulos").select("*").order("nome");
  return (data ?? []) as WiseModulo[];
}
