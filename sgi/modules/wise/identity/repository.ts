import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WiseSetor, WiseCargo, WiseUsuario } from "./types";

// Repository burro por design — regra de negócio vive em service.ts.

export async function listarSetores(empresaId: string): Promise<WiseSetor[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_setores")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ordem");
  return (data ?? []) as WiseSetor[];
}

export async function inserirSetor(dados: {
  empresa_id: string;
  nome: string;
  cor: string;
  ordem: number;
}): Promise<WiseSetor> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("wise_setores").insert(dados).select("*").single();
  if (error) throw new Error(error.message);
  return data as WiseSetor;
}

export async function listarCargos(empresaId: string): Promise<WiseCargo[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_cargos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ordem");
  return (data ?? []) as WiseCargo[];
}

export async function inserirCargo(dados: {
  empresa_id: string;
  setor_id: string | null;
  nome: string;
  nivel: number;
  cor: string;
  ordem: number;
}): Promise<WiseCargo> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("wise_cargos").insert(dados).select("*").single();
  if (error) throw new Error(error.message);
  return data as WiseCargo;
}

export async function listarUsuarios(empresaId: string): Promise<WiseUsuario[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_usuarios")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");
  return (data ?? []) as WiseUsuario[];
}

export async function buscarUsuarioPorAuthId(authId: string): Promise<WiseUsuario | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_usuarios").select("*").eq("auth_id", authId).maybeSingle();
  return (data as WiseUsuario) ?? null;
}

export async function buscarUsuarioPorEmail(empresaId: string, email: string): Promise<WiseUsuario | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_usuarios")
    .select("*")
    .eq("empresa_id", empresaId)
    .ilike("email", email)
    .maybeSingle();
  return (data as WiseUsuario) ?? null;
}

export async function atualizarSetorCargoUsuario(
  usuarioId: string,
  dados: { setor_id: string | null; cargo_id: string | null },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("wise_usuarios").update(dados).eq("id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function inserirConvite(dados: {
  empresa_id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  cargo_id: string | null;
  convite_token: string;
  convite_expira_em: string;
}): Promise<WiseUsuario> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wise_usuarios")
    .insert({ ...dados, auth_id: null, status: "convidado" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as WiseUsuario;
}

export async function buscarUsuarioPorToken(token: string): Promise<WiseUsuario | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_usuarios").select("*").eq("convite_token", token).maybeSingle();
  return (data as WiseUsuario) ?? null;
}

export async function ativarUsuarioConvidado(usuarioId: string, authId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_usuarios")
    .update({ auth_id: authId, status: "ativo", convite_token: null, convite_expira_em: null })
    .eq("id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function atualizarStatusUsuario(
  usuarioId: string,
  status: WiseUsuario["status"],
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("wise_usuarios").update({ status }).eq("id", usuarioId);
  if (error) throw new Error(error.message);
}

export async function buscarUsuarioPorId(usuarioId: string): Promise<WiseUsuario | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_usuarios").select("*").eq("id", usuarioId).maybeSingle();
  return (data as WiseUsuario) ?? null;
}
