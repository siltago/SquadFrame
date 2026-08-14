"use server";

import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/shared/auth/auth";
import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/service";
import * as service from "./service";
import type { WiseObraInput, WiseEstruturaInput } from "./types";

async function contexto() {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  const wiseUsuario = await buscarUsuarioPorAuthId(usuario.auth_id);
  if (!wiseUsuario) throw new Error("Usuário não encontrado no SquadWise.");
  return { usuarioId: wiseUsuario.id };
}

// ── Obras ──────────────────────────────────────────────────────────────────

export async function listarObrasAction() {
  await contexto();
  return service.listarObras();
}

export async function buscarObraAction(id: string) {
  await contexto();
  return service.buscarObra(id);
}

export async function criarObraAction(input: WiseObraInput) {
  const { usuarioId } = await contexto();
  const resultado = await service.criarObra(usuarioId, input);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
  }
  return resultado;
}

export async function editarObraAction(id: string, input: Partial<WiseObraInput>) {
  await contexto();
  const resultado = await service.editarObra(id, input);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
    revalidatePath(`/squadwise/obras/${id}`);
  }
  return resultado;
}

export async function arquivarObraAction(id: string) {
  await contexto();
  const resultado = await service.arquivarObra(id);
  if (resultado.ok) {
    revalidatePath("/squadwise/obras");
  }
  return resultado;
}

// ── Suporte ─────────────────────────────────────────────────────────────────

export async function listarStatusObraAction() {
  return service.listarStatusObra();
}

export async function listarClientesAction() {
  return service.listarClientes();
}

// ── Estrutura Física ────────────────────────────────────────────────────────

export async function listarEstruturaAction(obraId: string) {
  await contexto();
  return service.listarEstrutura(obraId);
}

export async function adicionarEstruturaAction(input: WiseEstruturaInput) {
  await contexto();
  const resultado = await service.adicionarEstrutura(input);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${input.obra_id}`);
  }
  return resultado;
}

export async function editarEstruturaAction(
  id: string,
  obraId: string,
  dados: Partial<Pick<WiseEstruturaInput, "nome" | "codigo" | "ordem">>,
) {
  await contexto();
  const resultado = await service.editarEstrutura(id, dados);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

export async function excluirEstruturaAction(id: string, obraId: string) {
  await contexto();
  const resultado = await service.excluirEstrutura(id);
  if (resultado.ok) {
    revalidatePath(`/squadwise/obras/${obraId}`);
  }
  return resultado;
}

// Lote/Pacote de Trabalho e tipologias saíram do Wise — gerido só pelo
// SquadFrame agora (ver modules/squadframe/actions/planejamento).
