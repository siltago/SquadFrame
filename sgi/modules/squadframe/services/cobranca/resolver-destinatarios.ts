import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Destinatario {
  tipo: "individual";
  destino: string; // número em E.164 sem "+"
  usuario_id: string;
}

// Mesma query já usada em notificacoes.consumer.ts (permissoes → cargo_permissoes → usuarios),
// extraída aqui para ser reaproveitada pela cobrança.
export async function resolverUsuariosComPermissao(
  admin: SupabaseClient,
  chave: string,
): Promise<{ id: string; whatsapp: string | null }[]> {
  const { data: perm } = await admin
    .from("permissoes")
    .select("id")
    .eq("chave", chave)
    .maybeSingle();
  if (!perm?.id) return [];

  const { data: cargoPerms } = await admin
    .from("cargo_permissoes")
    .select("cargo_id")
    .eq("permissao_id", perm.id);
  if (!cargoPerms?.length) return [];

  const cargoIds = cargoPerms.map((cp) => cp.cargo_id);
  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, whatsapp")
    .in("cargo_id", cargoIds)
    .eq("ativo", true);

  return usuarios ?? [];
}

// Twilio (API oficial) não suporta grupo — o "aviso pro time de Compras" vira
// mensagem individual pra cada pessoa ativa do setor, além dos aprovadores.
async function resolverUsuariosSetorCompras(admin: SupabaseClient): Promise<{ id: string; whatsapp: string | null }[]> {
  const { data: setor } = await admin
    .from("setores")
    .select("id")
    .eq("nome", "Compras")
    .maybeSingle();
  if (!setor?.id) return [];

  const { data: cargos } = await admin
    .from("cargos")
    .select("id")
    .eq("setor_id", setor.id);
  if (!cargos?.length) return [];

  const { data: usuarios } = await admin
    .from("usuarios")
    .select("id, whatsapp")
    .in("cargo_id", cargos.map((c) => c.id))
    .eq("ativo", true);

  return usuarios ?? [];
}

function paraDestinatarios(usuarios: { id: string; whatsapp: string | null }[]): Destinatario[] {
  return usuarios
    .filter((u) => !!u.whatsapp)
    .map((u) => ({ tipo: "individual" as const, destino: u.whatsapp as string, usuario_id: u.id }));
}

function deduplicar(destinatarios: Destinatario[]): Destinatario[] {
  const porUsuario = new Map<string, Destinatario>();
  for (const d of destinatarios) porUsuario.set(d.usuario_id, d);
  return [...porUsuario.values()];
}

async function resolverBase(admin: SupabaseClient, permissao: string): Promise<Destinatario[]> {
  const [aprovadores, setorCompras] = await Promise.all([
    resolverUsuariosComPermissao(admin, permissao),
    resolverUsuariosSetorCompras(admin),
  ]);
  return deduplicar([...paraDestinatarios(aprovadores), ...paraDestinatarios(setorCompras)]);
}

export async function resolverDestinatariosPedido(
  admin: SupabaseClient,
  _pedidoId: string,
): Promise<Destinatario[]> {
  return resolverBase(admin, "compras.pedido.aprovar");
}

export async function resolverDestinatariosSolicitacao(
  admin: SupabaseClient,
  _solicitacaoId: string,
): Promise<Destinatario[]> {
  return resolverBase(admin, "compras.solicitacao.aprovar");
}
