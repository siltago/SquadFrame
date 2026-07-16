import "server-only";

import * as repo from "./repository";
import type { WiseEmpresa, WiseUnidade, WiseModulo } from "./types";

function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ResultadoServico<T> = { ok: true; dados: T } | { ok: false; erro: string };

// Único lugar que valida, decide o slug e garante unicidade — a mesma
// regra que a UI de criação de empresa vai reusar quando existir
// (Bloco futuro, fora da Fase 1: hoje só a empresa seed existe).
export async function criarEmpresa(dados: {
  nome: string;
  cnpj?: string | null;
}): Promise<ResultadoServico<WiseEmpresa>> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome da empresa é obrigatório" };

  const slug = slugify(nome);
  if (!slug) return { ok: false, erro: "Não foi possível gerar um slug a partir do nome informado" };

  const existente = await repo.buscarEmpresaPorSlug(slug);
  if (existente) return { ok: false, erro: "Já existe uma empresa com esse nome (slug duplicado)" };

  const empresa = await repo.inserirEmpresa({ nome, slug, cnpj: dados.cnpj?.trim() || null });

  // Seed padrão de toda empresa nova: uma unidade "Matriz".
  await repo.inserirUnidade({ empresa_id: empresa.id, nome: "Matriz", codigo: "MATRIZ" });

  return { ok: true, dados: empresa };
}

export async function listarEmpresas(): Promise<WiseEmpresa[]> {
  return repo.listarEmpresas();
}

export async function buscarEmpresa(id: string): Promise<WiseEmpresa | null> {
  return repo.buscarEmpresaPorId(id);
}

export async function atualizarEmpresa(
  id: string,
  dados: { nome: string; cnpj?: string | null },
): Promise<ResultadoServico<WiseEmpresa>> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome da empresa é obrigatório" };

  const empresa = await repo.atualizarEmpresa(id, { nome, cnpj: dados.cnpj?.trim() || null });
  return { ok: true, dados: empresa };
}

export async function listarUnidades(empresaId: string): Promise<WiseUnidade[]> {
  return repo.listarUnidades(empresaId);
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
  empresa_id: string;
  nome: string;
  codigo: string;
} & DadosEndereco): Promise<ResultadoServico<WiseUnidade>> {
  const nome = dados.nome.trim();
  const codigo = dados.codigo.trim().toUpperCase();
  if (!nome) return { ok: false, erro: "Nome da unidade é obrigatório" };
  if (!codigo) return { ok: false, erro: "Código da unidade é obrigatório" };

  const unidade = await repo.inserirUnidade({
    empresa_id: dados.empresa_id,
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

export async function listarModulosHabilitados(empresaId: string): Promise<WiseModulo[]> {
  return repo.listarModulosHabilitados(empresaId);
}

export async function habilitarModuloParaEmpresa(
  empresaId: string,
  moduloId: string,
): Promise<ResultadoServico<true>> {
  await repo.habilitarModulo({ empresa_id: empresaId, modulo_id: moduloId });
  return { ok: true, dados: true };
}

export async function desabilitarModuloParaEmpresa(
  empresaId: string,
  moduloId: string,
): Promise<ResultadoServico<true>> {
  await repo.desabilitarModulo(empresaId, moduloId);
  return { ok: true, dados: true };
}
