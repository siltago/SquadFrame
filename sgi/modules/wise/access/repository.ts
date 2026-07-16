import "server-only";

import { createAdminClient } from "@/shared/database/supabase-admin";
import type { WisePermissao, WisePapel, WisePapelComPermissoes } from "./types";

// Repository burro por design — regra de negócio vive em service.ts.

export async function listarPermissoes(): Promise<WisePermissao[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("wise_permissoes").select("*").order("modulo").order("chave");
  return (data ?? []) as WisePermissao[];
}

export async function listarPapeis(empresaId: string): Promise<WisePapel[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_papeis")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");
  return (data ?? []) as WisePapel[];
}

export async function buscarPapelComPermissoes(papelId: string): Promise<WisePapelComPermissoes | null> {
  const admin = createAdminClient();
  const { data: papel } = await admin.from("wise_papeis").select("*").eq("id", papelId).maybeSingle();
  if (!papel) return null;

  const { data: vinculos } = await admin
    .from("wise_papel_permissoes")
    .select("permissao:wise_permissoes(*)")
    .eq("papel_id", papelId);

  const permissoes = ((vinculos ?? []) as unknown as { permissao: WisePermissao }[])
    .map((v) => v.permissao)
    .filter(Boolean);

  return { ...(papel as WisePapel), permissoes };
}

export async function inserirPapel(dados: {
  empresa_id: string;
  nome: string;
  descricao: string | null;
  is_admin: boolean;
}): Promise<WisePapel> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("wise_papeis").insert(dados).select("*").single();
  if (error) throw new Error(error.message);
  return data as WisePapel;
}

export async function atualizarPapel(
  papelId: string,
  dados: Partial<{ nome: string; descricao: string | null; ativo: boolean }>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("wise_papeis").update(dados).eq("id", papelId);
  if (error) throw new Error(error.message);
}

export async function adicionarPermissaoAoPapel(papelId: string, permissaoId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_papel_permissoes")
    .upsert({ papel_id: papelId, permissao_id: permissaoId }, { onConflict: "papel_id,permissao_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function removerPermissaoDoPapel(papelId: string, permissaoId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_papel_permissoes")
    .delete()
    .eq("papel_id", papelId)
    .eq("permissao_id", permissaoId);
  if (error) throw new Error(error.message);
}

export async function listarPapeisDoUsuario(usuarioId: string): Promise<WisePapel[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wise_usuario_papeis")
    .select("papel:wise_papeis(*)")
    .eq("usuario_id", usuarioId);
  return ((data ?? []) as unknown as { papel: WisePapel }[]).map((r) => r.papel).filter(Boolean);
}

export async function atribuirPapelAoUsuario(
  usuarioId: string,
  papelId: string,
  atribuidoPor: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_usuario_papeis")
    .upsert(
      { usuario_id: usuarioId, papel_id: papelId, atribuido_por: atribuidoPor },
      { onConflict: "usuario_id,papel_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function revogarPapelDoUsuario(usuarioId: string, papelId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("wise_usuario_papeis")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("papel_id", papelId);
  if (error) throw new Error(error.message);
}

// Mesma função SQL usada pelas RLS policies (wise_fn_tem_permissao) —
// garante que policy e código de aplicação nunca divirjam sobre a
// mesma pergunta. Ver seção 7 do documento de arquitetura.
export async function verificarPermissao(usuarioId: string, chave: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("wise_fn_tem_permissao", {
    p_usuario_id: usuarioId,
    p_chave: chave,
  });
  if (error) throw new Error(error.message);
  return !!data;
}
