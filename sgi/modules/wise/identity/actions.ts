"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import * as service from "./service";
import type { WiseSetor, WiseCargo, WiseUsuario } from "./types";

async function atorWiseId(): Promise<string | null> {
  const usuario = await getUsuarioAtual();
  if (!usuario) return null;
  const wiseUsuario = await service.buscarUsuarioPorAuthId(usuario.auth_id);
  return wiseUsuario?.id ?? null;
}

export async function listarSetoresAction(empresaId: string): Promise<WiseSetor[]> {
  return service.listarSetores(empresaId);
}

export async function criarSetorAction(dados: { empresa_id: string; nome: string; cor?: string; ordem?: number }) {
  const resultado = await service.criarSetor(dados);
  if (resultado.ok) revalidatePath("/squadwise");
  return resultado;
}

export async function listarCargosAction(empresaId: string): Promise<WiseCargo[]> {
  return service.listarCargos(empresaId);
}

export async function criarCargoAction(dados: {
  empresa_id: string;
  setor_id?: string | null;
  nome: string;
  nivel?: number;
  cor?: string;
  ordem?: number;
}) {
  const resultado = await service.criarCargo(dados);
  if (resultado.ok) revalidatePath("/squadwise");
  return resultado;
}

export async function listarUsuariosAction(empresaId: string): Promise<WiseUsuario[]> {
  return service.listarUsuarios(empresaId);
}

export async function trocarSetorCargoAction(usuarioId: string, dados: { setor_id: string | null; cargo_id: string | null }) {
  const ator = await atorWiseId();
  const resultado = await service.trocarSetorCargo(usuarioId, dados, ator);
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}

export async function convidarUsuarioAction(dados: {
  empresa_id: string;
  nome: string;
  email: string;
  setor_id?: string | null;
  cargo_id?: string | null;
}) {
  const ator = await atorWiseId();
  const resultado = await service.convidarUsuario({ ...dados, convidadoPor: ator });
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}

export async function bloquearUsuarioAction(usuarioId: string) {
  const ator = await atorWiseId();
  const resultado = await service.bloquearUsuario(usuarioId, ator);
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}

export async function desbloquearUsuarioAction(usuarioId: string) {
  const ator = await atorWiseId();
  const resultado = await service.desbloquearUsuario(usuarioId, ator);
  if (resultado.ok) revalidatePath("/squadwise/usuarios");
  return resultado;
}

export async function buscarConvitePorTokenAction(token: string) {
  return service.buscarConvitePorToken(token);
}

export async function ativarConviteAction(token: string, senha: string) {
  return service.ativarConvite(token, senha);
}
