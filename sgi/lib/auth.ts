import "server-only";
import { createClient } from "./supabase-server";
import { createAdminClient } from "./supabase-admin";

export type UsuarioAtual = {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  empresa: string | null;
  cargo: {
    id: string;
    nome: string;
    cor: string;
    is_admin: boolean;
  } | null;
  setor: {
    id: string;
    nome: string;
    cor: string;
  } | null;
  // null = sem cargo (só pode ver)
  // ['*'] = admin (tudo liberado)
  // string[] = chaves de permissão específicas
  permissoes: string[] | null;
};

export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Admin client ignora RLS — garante que dados sempre carregam
  const admin = createAdminClient();

  const { data } = await admin
    .from("usuarios")
    .select(
      `id, auth_id, nome, email, foto_url, empresa,
       cargo:cargos(id, nome, cor, is_admin, setor:setores(id, nome, cor))`
    )
    .eq("auth_id", user.id)
    .single();

  if (!data) {
    return {
      id: user.id,
      auth_id: user.id,
      nome: user.user_metadata?.nome ?? user.email ?? "Usuário",
      email: user.email ?? "",
      foto_url: user.user_metadata?.foto_url ?? null,
      empresa: user.user_metadata?.empresa ?? null,
      cargo: null,
      setor: null,
      permissoes: null,
    };
  }

  const cargo = data.cargo as any;

  let permissoes: string[] | null = null;
  if (cargo) {
    if (cargo.is_admin) {
      permissoes = ["*"];
    } else {
      const { data: cPerms } = await admin
        .from("cargo_permissoes")
        .select("permissao:permissoes(chave)")
        .eq("cargo_id", cargo.id);
      permissoes = (cPerms ?? [])
        .map((p: any) => p.permissao?.chave)
        .filter(Boolean) as string[];
    }
  }

  return {
    id: data.id,
    auth_id: data.auth_id,
    nome: data.nome,
    email: data.email,
    foto_url: data.foto_url ?? user.user_metadata?.foto_url ?? null,
    empresa: data.empresa,
    cargo: cargo
      ? { id: cargo.id, nome: cargo.nome, cor: cargo.cor, is_admin: cargo.is_admin }
      : null,
    setor: cargo?.setor ?? null,
    permissoes,
  };
}

export async function temPermissao(
  usuarioId: string,
  chave: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from("usuarios")
    .select("cargo:cargos(id, is_admin)")
    .eq("id", usuarioId)
    .single();

  const cargo = usuario?.cargo as any;
  if (!cargo) return false;
  if (cargo.is_admin) return true;

  const { data } = await admin
    .from("cargo_permissoes")
    .select("permissao:permissoes!inner(chave)")
    .eq("cargo_id", cargo.id)
    .eq("permissoes.chave", chave)
    .maybeSingle();

  return !!data;
}
