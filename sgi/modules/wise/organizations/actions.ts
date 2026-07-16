"use server";

import { revalidatePath } from "next/cache";
import * as service from "./service";
import type { WiseEmpresa, WiseUnidade, WiseModulo } from "./types";

export async function buscarEmpresaAction(id: string): Promise<WiseEmpresa | null> {
  return service.buscarEmpresa(id);
}

export async function atualizarEmpresaAction(id: string, dados: { nome: string; cnpj?: string | null }) {
  const resultado = await service.atualizarEmpresa(id, dados);
  if (resultado.ok) revalidatePath("/squadwise/empresa");
  return resultado;
}

export async function listarUnidadesAction(empresaId: string): Promise<WiseUnidade[]> {
  return service.listarUnidades(empresaId);
}

export async function criarUnidadeAction(dados: {
  empresa_id: string;
  nome: string;
  codigo: string;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  const resultado = await service.criarUnidade(dados);
  if (resultado.ok) revalidatePath("/squadwise/empresa");
  return resultado;
}

export async function editarUnidadeAction(
  id: string,
  dados: {
    nome: string;
    codigo: string;
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  },
) {
  const resultado = await service.editarUnidade(id, dados);
  if (resultado.ok) revalidatePath("/squadwise/empresa");
  return resultado;
}

export async function listarModulosAction(): Promise<WiseModulo[]> {
  return service.listarModulos();
}

export async function listarModulosHabilitadosAction(empresaId: string): Promise<WiseModulo[]> {
  return service.listarModulosHabilitados(empresaId);
}

export async function habilitarModuloAction(empresaId: string, moduloId: string) {
  const resultado = await service.habilitarModuloParaEmpresa(empresaId, moduloId);
  if (resultado.ok) revalidatePath("/squadwise/modulos");
  return resultado;
}

export async function desabilitarModuloAction(empresaId: string, moduloId: string) {
  const resultado = await service.desabilitarModuloParaEmpresa(empresaId, moduloId);
  if (resultado.ok) revalidatePath("/squadwise/modulos");
  return resultado;
}
