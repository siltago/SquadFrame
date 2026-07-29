import "server-only";

import * as repo from "./repository";
import type { WiseUnidade, WiseModulo } from "./types";

export type ResultadoServico<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function listarUnidades(): Promise<WiseUnidade[]> {
  return repo.listarUnidades();
}

type DadosEndereco = {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

export async function criarUnidade(dados: {
  nome: string;
  codigo: string;
} & DadosEndereco): Promise<ResultadoServico<WiseUnidade>> {
  const nome = dados.nome.trim();
  const codigo = dados.codigo.trim().toUpperCase();
  if (!nome) return { ok: false, erro: "Nome da unidade é obrigatório" };
  if (!codigo) return { ok: false, erro: "Código da unidade é obrigatório" };

  const unidade = await repo.inserirUnidade({
    nome,
    codigo,
    cep: dados.cep?.trim() || null,
    logradouro: dados.logradouro?.trim() || null,
    numero: dados.numero?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.cidade?.trim() || null,
    estado: dados.estado?.trim().toUpperCase() || null,
  });
  return { ok: true, dados: unidade };
}

export async function editarUnidade(
  id: string,
  dados: { nome: string; codigo: string } & DadosEndereco,
): Promise<ResultadoServico<WiseUnidade>> {
  const nome = dados.nome.trim();
  const codigo = dados.codigo.trim().toUpperCase();
  if (!nome) return { ok: false, erro: "Nome da unidade é obrigatório" };
  if (!codigo) return { ok: false, erro: "Código da unidade é obrigatório" };

  const unidade = await repo.atualizarUnidade(id, {
    nome,
    codigo,
    cep: dados.cep?.trim() || null,
    logradouro: dados.logradouro?.trim() || null,
    numero: dados.numero?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.cidade?.trim() || null,
    estado: dados.estado?.trim().toUpperCase() || null,
  });
  return { ok: true, dados: unidade };
}

export async function listarModulos(): Promise<WiseModulo[]> {
  return repo.listarModulos();
}
