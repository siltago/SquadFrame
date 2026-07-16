"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import * as service from "./service";
import type { WisePermissao, WisePapel, WisePapelComPermissoes } from "./types";

async function usuarioAtual() {
  const usuario = await getUsuarioAtual();
  if (!usuario) return null;
  return buscarUsuarioPorAuthId(usuario.auth_id);
}

export async function listarPermissoesAction(): Promise<WisePermissao[]> {
  return service.listarPermissoes();
}

export async function listarPapeisAction(empresaId: string): Promise<WisePapel[]> {
  return service.listarPapeis(empresaId);
}

export async function buscarPapelComPermissoesAction(papelId: string): Promise<WisePapelComPermissoes | null> {
  return service.buscarPapelComPermissoes(papelId);
}

export async function criarPapelAction(dados: {
  empresa_id: string;
  nome: string;
  descricao?: string;
  is_admin?: boolean;
}) {
  const resultado = await service.criarPapel(dados);
  if (resultado.ok) revalidatePath("/squadwise/papeis");
  return resultado;
}

export async function renomearPapelAction(papelId: string, nome: string) {
  const resultado = await service.renomearPapel(papelId, nome);
  if (resultado.ok) revalidatePath("/squadwise/papeis");
  return resultado;
}

export async function desativarPapelAction(papelId: string) {
  const resultado = await service.desativarPapel(papelId);
  if (resultado.ok) revalidatePath("/squadwise/papeis");
  return resultado;
}

export async function definirPermissoesDoPapelAction(papelId: string, permissaoIds: string[]) {
  const resultado = await service.definirPermissoesDoPapel(papelId, permissaoIds);
  if (resultado.ok) revalidatePath("/squadwise/papeis");
  return resultado;
}

export async function listarPapeisDoUsuarioAction(usuarioId: string): Promise<WisePapel[]> {
  return service.listarPapeisDoUsuario(usuarioId);
}

export async function atribuirPapelAction(usuarioId: string, papelId: string) {
  const ator = await usuarioAtual();
  if (!ator) return { ok: false as const, erro: "Não autenticado" };
  const resultado = await service.atribuirPapel(usuarioId, papelId, ator.id, ator.empresa_id);
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}

export async function revogarPapelAction(usuarioId: string, papelId: string) {
  const ator = await usuarioAtual();
  if (!ator) return { ok: false as const, erro: "Não autenticado" };
  const resultado = await service.revogarPapel(usuarioId, papelId, ator.id, ator.empresa_id);
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}
