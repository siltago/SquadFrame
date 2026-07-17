import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseObra, WiseObraEstrutura, WiseObraInput, WiseEstruturaInput, WiseObraStatusRow, WiseCliente } from "./types";

// ── Obras ──────────────────────────────────────────────────────────────────

export async function listarObras(empresaId: string): Promise<WiseObra[]> {
  const { data } = await createAdminClient()
    .from("obras")
    .select(`
      id, codigo, numero, nome, empresa_id, unidade_id, cliente_id,
      endereco, cidade, estado, cep,
      responsavel_comercial_id, responsavel_tecnico_id,
      status_id, data_prevista, observacoes, criado_em, deleted_at,
      cliente:clientes(id, nome, razao_social),
      status:obra_status(id, nome, cor, ordem, is_final, ativo),
      responsavel_comercial:usuarios!obras_responsavel_comercial_id_fkey(id, nome),
      responsavel_tecnico:usuarios!obras_responsavel_tecnico_id_fkey(id, nome),
      unidade:wise_unidades(nome, codigo)
    `)
    .eq("empresa_id", empresaId)
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  return (data ?? []) as unknown as WiseObra[];
}

export async function buscarObraPorId(id: string, empresaId: string): Promise<WiseObra | null> {
  const { data } = await createAdminClient()
    .from("obras")
    .select(`
      id, codigo, numero, nome, empresa_id, unidade_id, cliente_id,
      endereco, cidade, estado, cep,
      responsavel_comercial_id, responsavel_tecnico_id,
      status_id, data_prevista, observacoes, criado_em, deleted_at,
      cliente:clientes(id, nome, razao_social),
      status:obra_status(id, nome, cor, ordem, is_final, ativo),
      responsavel_comercial:usuarios!obras_responsavel_comercial_id_fkey(id, nome),
      responsavel_tecnico:usuarios!obras_responsavel_tecnico_id_fkey(id, nome),
      unidade:wise_unidades(nome, codigo)
    `)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .is("deleted_at", null)
    .maybeSingle();
  return data as unknown as WiseObra | null;
}

export async function inserirObra(
  dados: WiseObraInput & { empresa_id: string; criado_por?: string },
): Promise<WiseObra> {
  const { data, error } = await createAdminClient()
    .from("obras")
    .insert(dados)
    .select("id, codigo, nome, empresa_id, criado_em")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as WiseObra;
}

export async function atualizarObra(
  id: string,
  empresaId: string,
  dados: Partial<WiseObraInput>,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("obras")
    .update(dados)
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) throw new Error(error.message);
}

export async function arquivarObra(id: string, empresaId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("obras")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) throw new Error(error.message);
}

// ── Status de obra ──────────────────────────────────────────────────────────

export async function listarStatus(): Promise<WiseObraStatusRow[]> {
  const { data } = await createAdminClient()
    .from("obra_status")
    .select("id, nome, cor, ordem, is_final, ativo")
    .eq("ativo", true)
    .order("ordem");
  return (data ?? []) as WiseObraStatusRow[];
}

// ── Clientes ────────────────────────────────────────────────────────────────

export async function listarClientes(): Promise<WiseCliente[]> {
  const { data } = await createAdminClient()
    .from("clientes")
    .select("id, nome, razao_social")
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("nome");
  return (data ?? []) as WiseCliente[];
}

// ── Estrutura Física ────────────────────────────────────────────────────────

export async function listarEstrutura(obraId: string): Promise<WiseObraEstrutura[]> {
  const { data } = await createAdminClient()
    .from("wise_obra_estrutura")
    .select("id, obra_id, parent_id, tipo, nome, codigo, ordem, criado_em")
    .eq("obra_id", obraId)
    .order("tipo")
    .order("ordem")
    .order("nome");
  return (data ?? []) as WiseObraEstrutura[];
}

export async function inserirEstrutura(dados: WiseEstruturaInput): Promise<WiseObraEstrutura> {
  const { data, error } = await createAdminClient()
    .from("wise_obra_estrutura")
    .insert({ ...dados, parent_id: dados.parent_id ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as WiseObraEstrutura;
}

export async function atualizarEstrutura(
  id: string,
  dados: Partial<Pick<WiseEstruturaInput, "nome" | "codigo" | "ordem">>,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("wise_obra_estrutura")
    .update(dados)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirEstrutura(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("wise_obra_estrutura")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Lote ───────────────────────────────────────────────────────────────────

export async function atualizarLote(
  loteId: string,
  dados: {
    nome?: string;
    etapa?: string;
    liberado_compras?: boolean;
    liberado_producao?: boolean;
    tipo_producao?: string | null;
    prioridade?: string | null;
  },
): Promise<void> {
  const { error } = await createAdminClient()
    .from("lotes_obra")
    .update(dados)
    .eq("id", loteId);
  if (error) throw new Error(error.message);
}
