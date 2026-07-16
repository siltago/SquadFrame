import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseEmpresa, WiseUnidade, WiseModulo } from "./types";

// Repository burro por design: um select/insert/update por método, sem
// regra de negócio aqui dentro. Regra vive em service.ts — ver seção 3
// do docs/squadwise/fase-1-arquitetura.md.

export async function listarEmpresas(): Promise<WiseEmpresa[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_empresas").select("*").order("nome");
  return (data ?? []) as WiseEmpresa[];
}

export async function buscarEmpresaPorId(id: string): Promise<WiseEmpresa | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_empresas").select("*").eq("id", id).maybeSingle();
  return (data as WiseEmpresa) ?? null;
}

export async function buscarEmpresaPorSlug(slug: string): Promise<WiseEmpresa | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_empresas").select("*").eq("slug", slug).maybeSingle();
  return (data as WiseEmpresa) ?? null;
}

export async function inserirEmpresa(dados: {
  nome: string;
  slug: string;
  cnpj: string | null;
}): Promise<WiseEmpresa> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wise_empresas")
    .insert(dados)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as WiseEmpresa;
}

export async function atualizarEmpresa(
  id: string,
  dados: Partial<{ nome: string; cnpj: string | null }>,
): Promise<WiseEmpresa> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("wise_empresas").update(dados).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as WiseEmpresa;
}

export async function listarUnidades(empresaId: string): Promise<WiseUnidade[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_unidades")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");
  return (data ?? []) as WiseUnidade[];
}

export async function inserirUnidade(dados: {
  empresa_id: string;
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

export async function listarModulosHabilitados(empresaId: string): Promise<WiseModulo[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_empresa_modulos")
    .select("modulo:wise_modulos(*)")
    .eq("empresa_id", empresaId);
  return ((data ?? []) as unknown as { modulo: WiseModulo }[])
    .map((r) => r.modulo)
    .filter(Boolean);
}

export async function habilitarModulo(dados: { empresa_id: string; modulo_id: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_empresa_modulos")
    .upsert(dados, { onConflict: "empresa_id,modulo_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function desabilitarModulo(empresaId: string, moduloId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_empresa_modulos")
    .delete()
    .eq("empresa_id", empresaId)
    .eq("modulo_id", moduloId);
  if (error) throw new Error(error.message);
}
