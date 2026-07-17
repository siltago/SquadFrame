"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import * as service from "./service";
import type { WisePacoteInput, WisePacoteStatus } from "./types";

async function contexto() {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) throw new Error("Usuário não encontrado no SquadWise.");
  return { empresaId: wiseUsuario.empresa_id, usuarioId: wiseUsuario.id };
}

export async function listarPacotesDaObraAction(obraId: string) {
  await contexto();
  return service.listarPacotesDaObra(obraId);
}

export async function listarPacotesDaEmpresaAction() {
  const { empresaId } = await contexto();
  return service.listarPacotesDaEmpresa(empresaId);
}

export async function buscarPacoteAction(id: string) {
  await contexto();
  return service.buscarPacote(id);
}

export async function criarPacoteAction(input: WisePacoteInput) {
  const { empresaId } = await contexto();
  const resultado = await service.criarPacote(empresaId, input);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${input.obra_id}`);
    revalidatePath("/squadwise/obras");
  }
  return resultado;
}

export async function editarPacoteAction(
  id: string,
  obraId: string,
  input: Partial<Omit<WisePacoteInput, "obra_id">>,
) {
  await contexto();
  const resultado = await service.editarPacote(id, input);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
    revalidatePath(`/squadwise/obras/${obraId}/pacotes/${id}`);
  }
  return resultado;
}

export async function transicionarStatusAction(
  id: string,
  obraId: string,
  novoStatus: WisePacoteStatus,
) {
  const { empresaId } = await contexto();
  const resultado = await service.transicionarStatus(id, empresaId, novoStatus);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

export async function definirEscopoEstruturaAction(
  pacoteId: string,
  obraId: string,
  estruturaIds: string[],
) {
  await contexto();
  const resultado = await service.definirEscopoEstrutura(pacoteId, estruturaIds);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

export async function listarEscopoEstruturaAction(pacoteId: string) {
  await contexto();
  return service.listarEscopoEstrutura(pacoteId);
}

export async function listarEscopoTipologiasAction(pacoteId: string) {
  await contexto();
  return service.listarEscopoTipologias(pacoteId);
}
