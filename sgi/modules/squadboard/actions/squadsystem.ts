"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";

export type SquadUsuario = {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
};

export type ObraResult = {
  id: string;
  numero: number;
  codigo?: string;
  nome: string;
};

export type EntityResult = {
  id: string;
  label: string;
  sub?: string;
};

// ── Usuários ────���─────────────────────────────────────────────────────

export async function buscarUsuariosSquadSystem(): Promise<SquadUsuario[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usuarios")
    .select("id, nome, email, foto_url")
    .eq("ativo", true)
    .order("nome");

  if (error) return [];
  return (data ?? []).map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    avatar: u.foto_url ?? undefined,
  }));
}

// ── Obras ─────────────────────────────────────────���───────────────────

export async function buscarObras(query: string): Promise<ObraResult[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const q = query.trim();

  let req = admin
    .from("obras")
    .select("id, numero, codigo, nome")
    .is("deleted_at", null)
    .order("numero", { ascending: false })
    .limit(20);

  if (q) {
    req = req.or(`nome.ilike.%${q}%,codigo.ilike.%${q}%`);
  }

  const { data, error } = await req;
  if (error) return [];
  return (data ?? []).map((o) => ({
    id: o.id,
    numero: o.numero,
    codigo: o.codigo ?? undefined,
    nome: o.nome,
  }));
}

// ── Entidades por Obra ────────────────────────────────────���───────────

export async function buscarLotesPorObra(obraId: string): Promise<EntityResult[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lotes_obra")
    .select("id, nome, prioridade")
    .eq("obra_id", obraId)
    .order("nome");

  if (error) return [];
  return (data ?? []).map((l) => ({
    id: l.id,
    label: l.nome,
    sub: l.prioridade ?? undefined,
  }));
}

export async function buscarPedidosPorObra(obraId: string): Promise<EntityResult[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pedidos_compra")
    .select("id, numero, status")
    .eq("obra_id", obraId)
    .order("numero", { ascending: false });

  if (error) return [];
  return (data ?? []).map((p) => ({
    id: p.id,
    label: `Pedido #${p.numero}`,
    sub: p.status ?? undefined,
  }));
}

export async function buscarSolicitacoesPorObra(obraId: string): Promise<EntityResult[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("N��o autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("solicitacoes_compra")
    .select("id, numero, status, prioridade")
    .eq("obra_id", obraId)
    .order("numero", { ascending: false });

  if (error) return [];
  return (data ?? []).map((s) => ({
    id: s.id,
    label: `SC #${s.numero}`,
    sub: s.status ?? undefined,
  }));
}
