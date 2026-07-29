import "server-only";
import { createAdminClient } from "@/shared/database/supabase-admin";

// IDs de usuários ativos que podem agir sobre uma permissão: têm cargo com
// essa permissão em cargo_permissoes, OU têm cargo com is_admin=true.
// Admins bypassam toda checagem de permissão na aplicação (ver
// temPermissao() em shared/auth/auth.ts) sem precisar de linha em
// cargo_permissoes — se essa função só olhasse cargo_permissoes, um
// aprovador cujo acesso vem só do is_admin nunca apareceria aqui e nunca
// seria notificado sobre ações que só ele consegue aprovar.
export async function getUsuariosComPermissao(chave: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data: cargosAdmin } = await admin.from("cargos").select("id").eq("is_admin", true);
  const cargoIdsAdmin = (cargosAdmin ?? []).map((c) => c.id);

  const { data: perm } = await admin.from("permissoes").select("id").eq("chave", chave).maybeSingle();
  let cargoIdsPermissao: string[] = [];
  if (perm?.id) {
    const { data: cargoPerms } = await admin.from("cargo_permissoes").select("cargo_id").eq("permissao_id", perm.id);
    cargoIdsPermissao = (cargoPerms ?? []).map((cp) => cp.cargo_id);
  }

  const cargoIds = Array.from(new Set([...cargoIdsAdmin, ...cargoIdsPermissao]));
  if (!cargoIds.length) return [];

  const { data: usuarios } = await admin.from("usuarios").select("id").in("cargo_id", cargoIds).eq("ativo", true);
  return (usuarios ?? []).map((u) => u.id);
}
