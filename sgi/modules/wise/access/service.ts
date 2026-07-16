import "server-only";

import { registrarAuditoria } from "@/modules/wise/audit/service";
import * as repo from "./repository";
import type { WisePermissao, WisePapel, WisePapelComPermissoes } from "./types";

export type ResultadoServico<T> = { ok: true; dados: T } | { ok: false; erro: string };

export async function listarPermissoes(): Promise<WisePermissao[]> {
  return repo.listarPermissoes();
}

export async function listarPapeis(empresaId: string): Promise<WisePapel[]> {
  return repo.listarPapeis(empresaId);
}

export async function buscarPapelComPermissoes(papelId: string): Promise<WisePapelComPermissoes | null> {
  return repo.buscarPapelComPermissoes(papelId);
}

export async function criarPapel(dados: {
  empresa_id: string;
  nome: string;
  descricao?: string;
  is_admin?: boolean;
}): Promise<ResultadoServico<WisePapel>> {
  const nome = dados.nome.trim();
  if (!nome) return { ok: false, erro: "Nome do papel é obrigatório" };

  const papel = await repo.inserirPapel({
    empresa_id: dados.empresa_id,
    nome,
    descricao: dados.descricao?.trim() || null,
    is_admin: dados.is_admin ?? false,
  });
  return { ok: true, dados: papel };
}

export async function renomearPapel(papelId: string, nome: string): Promise<ResultadoServico<true>> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return { ok: false, erro: "Nome do papel é obrigatório" };
  await repo.atualizarPapel(papelId, { nome: nomeLimpo });
  return { ok: true, dados: true };
}

export async function desativarPapel(papelId: string): Promise<ResultadoServico<true>> {
  await repo.atualizarPapel(papelId, { ativo: false });
  return { ok: true, dados: true };
}

export async function definirPermissoesDoPapel(
  papelId: string,
  permissaoIds: string[],
): Promise<ResultadoServico<true>> {
  const atual = await repo.buscarPapelComPermissoes(papelId);
  if (!atual) return { ok: false, erro: "Papel não encontrado" };

  const atuaisIds = new Set(atual.permissoes.map((p) => p.id));
  const novasIds = new Set(permissaoIds);

  const paraAdicionar = permissaoIds.filter((id) => !atuaisIds.has(id));
  const paraRemover = atual.permissoes.filter((p) => !novasIds.has(p.id)).map((p) => p.id);

  await Promise.all([
    ...paraAdicionar.map((id) => repo.adicionarPermissaoAoPapel(papelId, id)),
    ...paraRemover.map((id) => repo.removerPermissaoDoPapel(papelId, id)),
  ]);

  return { ok: true, dados: true };
}

export async function listarPapeisDoUsuario(usuarioId: string): Promise<WisePapel[]> {
  return repo.listarPapeisDoUsuario(usuarioId);
}

export async function atribuirPapel(
  usuarioId: string,
  papelId: string,
  atribuidoPor: string | null,
  empresaId: string,
): Promise<ResultadoServico<true>> {
  await repo.atribuirPapelAoUsuario(usuarioId, papelId, atribuidoPor);
  await registrarAuditoria({
    empresa_id: empresaId,
    usuario_id: atribuidoPor,
    entidade: "usuario_papel",
    entidade_id: usuarioId,
    acao: "PAPEL_ATRIBUIDO",
    dados_depois: { papel_id: papelId },
  });
  return { ok: true, dados: true };
}

export async function revogarPapel(
  usuarioId: string,
  papelId: string,
  atorId: string | null,
  empresaId: string,
): Promise<ResultadoServico<true>> {
  await repo.revogarPapelDoUsuario(usuarioId, papelId);
  await registrarAuditoria({
    empresa_id: empresaId,
    usuario_id: atorId,
    entidade: "usuario_papel",
    entidade_id: usuarioId,
    acao: "PAPEL_REVOGADO",
    dados_antes: { papel_id: papelId },
  });
  return { ok: true, dados: true };
}

// Wrapper reusado por qualquer módulo consumidor do Wise — ver seção 2
// do documento ("como um módulo consome o Wise").
export async function verificarPermissaoWise(usuarioId: string, chave: string): Promise<boolean> {
  return repo.verificarPermissao(usuarioId, chave);
}
