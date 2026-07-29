"use server";

import { revalidatePath } from "next/cache";
import * as service from "./service";
import type { WiseUnidade, WiseModulo } from "./types";

export async function listarUnidadesAction(): Promise<WiseUnidade[]> {
  return service.listarUnidades();
}

export async function criarUnidadeAction(dados: {
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
  if (resultado.ok) revalidatePath("/squadwise/unidades");
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
  if (resultado.ok) revalidatePath("/squadwise/unidades");
  return resultado;
}

export async function listarModulosAction(): Promise<WiseModulo[]> {
  return service.listarModulos();
}
