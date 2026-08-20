import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";

// Primeira vez que cargos.ordem ganha efeito funcional no sistema — hoje é
// 100% cosmético, só controla a ordem visual no drag-and-drop de gestão de
// cargos (modules/squadframe/components/usuarios/cargos-cliente.tsx).
// "Gestor de X" = usuário ativo cujo cargo está no MESMO setor do cargo de
// X e tem ordem MENOR (menor ordem = mais acima na hierarquia, mesma
// convenção do drag-and-drop). Se X já é o topo do setor (ninguém com
// ordem menor), cai no fallback: todo mundo com cargos.is_admin = true.
// O setor efetivo do usuário sempre vem de cargo.setor_id — nunca da coluna
// solta usuarios.setor_id (ver getUsuarioAtual em shared/auth/auth.ts, que
// ignora essa coluna deliberadamente).
export async function buscarGestoresDoUsuario(usuarioId: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from("usuarios")
    .select("cargo:cargos(id, ordem, setor_id)")
    .eq("id", usuarioId)
    .single();

  const cargoRaw = usuario?.cargo as unknown;
  const cargo = (Array.isArray(cargoRaw) ? cargoRaw[0] : cargoRaw) as { id: string; ordem: number; setor_id: string | null } | null;
  if (!cargo || !cargo.setor_id) return gestoresFallbackAdmin(admin);

  const { data: cargosSuperiores } = await admin
    .from("cargos")
    .select("id")
    .eq("setor_id", cargo.setor_id)
    .eq("ativo", true)
    .lt("ordem", cargo.ordem);

  const cargoIds = (cargosSuperiores ?? []).map((c) => c.id);
  if (!cargoIds.length) return gestoresFallbackAdmin(admin);

  const { data: gestores } = await admin
    .from("usuarios")
    .select("id")
    .in("cargo_id", cargoIds)
    .eq("ativo", true);

  const ids = (gestores ?? []).map((u) => u.id);
  return ids.length ? ids : gestoresFallbackAdmin(admin);
}

async function gestoresFallbackAdmin(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const { data: cargosAdmin } = await admin.from("cargos").select("id").eq("is_admin", true);
  const cargoIds = (cargosAdmin ?? []).map((c) => c.id);
  if (!cargoIds.length) return [];
  const { data: admins } = await admin.from("usuarios").select("id").in("cargo_id", cargoIds).eq("ativo", true);
  return (admins ?? []).map((u) => u.id);
}

// Usado por decidirExcecaoPendencia — valida que quem está aprovando uma
// exceção é gestor de verdade do dono da pendência (ou admin).
export async function ehGestorDoUsuario(gestorCandidatoId: string, usuarioAlvoId: string): Promise<boolean> {
  const gestores = await buscarGestoresDoUsuario(usuarioAlvoId);
  return gestores.includes(gestorCandidatoId);
}

// Lista pro <select> de "responsável pela próxima ação" no formulário de
// prorrogação — colegas ativos do mesmo setor do usuário (setor efetivo via
// cargo, mesma regra de sempre).
export async function listarColegasDoSetor(usuarioId: string): Promise<{ id: string; nome: string }[]> {
  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from("usuarios")
    .select("cargo:cargos(setor_id)")
    .eq("id", usuarioId)
    .single();
  const cargoRaw = usuario?.cargo as unknown;
  const cargo = (Array.isArray(cargoRaw) ? cargoRaw[0] : cargoRaw) as { setor_id: string | null } | null;
  if (!cargo?.setor_id) return [];

  const { data: cargosDoSetor } = await admin.from("cargos").select("id").eq("setor_id", cargo.setor_id).eq("ativo", true);
  const cargoIds = (cargosDoSetor ?? []).map((c) => c.id);
  if (!cargoIds.length) return [];

  const { data: colegas } = await admin
    .from("usuarios")
    .select("id, nome")
    .in("cargo_id", cargoIds)
    .eq("ativo", true)
    .order("nome");
  return colegas ?? [];
}
