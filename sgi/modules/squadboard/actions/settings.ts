"use server";

import { getUsuarioAtual } from "@/shared/auth/auth";
import { getProvider } from "../providers/registry";
import {
  buscarWorkspaces,
  garantirWorkspaceInterno,
  salvarBoardNoSetor,
  removerBoardDoSetor,
  garantirSetores,
} from "./workspace";
import type { Workspace } from "../types/workspace";
import type { Setor } from "../types/internal-board";

// ── Workspaces ────────────────────────────────────────────────────────

export async function buscarWorkspacesConfigurados(): Promise<Workspace[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");
  return buscarWorkspaces();
}

export async function inicializarWorkspaceInterno(): Promise<string> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const workspaceId = await garantirWorkspaceInterno();
  await garantirSetores(workspaceId);
  return workspaceId;
}

// ── Boards disponíveis ────────────────────────────────────────────────

export async function buscarBoardsDisponiveis(): Promise<{ id: string; nome: string }[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const provider = getProvider("trello");
  const boards = await provider.getAvailableBoards();
  return boards.map((b) => ({ id: b.id, nome: b.nome }));
}

export async function buscarColunasDisponiveis(boardId: string): Promise<{ id: string; nome: string }[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const provider = getProvider("trello");
  const cols = await provider.getAvailableColumns(boardId);
  return cols.map((c) => ({ id: c.id, nome: c.nome }));
}

// ── Mapeamento setor → board ──────────────────────────────────────────

export async function configurarBoardParaSetor(
  setor: Setor,
  providerBoardId: string,
  providerBoardNome: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const workspaces = await buscarWorkspaces();
  const ws = workspaces.find((w) => w.nome === "Interno" && w.provider === "trello");
  if (!ws) throw new Error("Workspace interno não encontrado. Inicialize primeiro.");

  const sector = ws.sectors.find((s) => s.nome === setor);
  if (!sector) throw new Error(`Setor "${setor}" não encontrado no workspace.`);

  await salvarBoardNoSetor(sector.id, providerBoardId, providerBoardNome);
}

export async function removerBoardParaSetor(setor: Setor): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const workspaces = await buscarWorkspaces();
  const ws = workspaces.find((w) => w.nome === "Interno" && w.provider === "trello");
  if (!ws) return;

  const sector = ws.sectors.find((s) => s.nome === setor);
  if (!sector) return;

  await removerBoardDoSetor(sector.id);
}

// ── Conexão ───────────────────────────────────────────────────────────

export async function verificarConexaoTrello(): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) {
    return { ok: false, erro: "TRELLO_API_KEY ou TRELLO_TOKEN não configurados." };
  }

  try {
    const provider = getProvider("trello");
    await provider.getAvailableBoards();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}
