"use server";

import { createAdminClient } from "@/shared/database/supabase-admin";
import { getUsuarioAtual } from "@/shared/auth/auth";
import type { Workspace, WorkspaceSector, WorkspaceBoard } from "../types/workspace";
import type { Setor } from "../types/internal-board";
import type { ProviderId } from "../providers/index";

// ── Leitura ───────────────────────────────────────────────────────────

export async function buscarWorkspaces(): Promise<Workspace[]> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_workspaces")
    .select(`
      id, nome, provider, ativo,
      sectors:board_workspace_sectors (
        id, workspace_id, nome, label, ordem, ativo,
        boards:board_workspace_boards (
          id, sector_id, provider_board_id, provider_board_nome,
          label, ordem, ativo, list_config, ultimo_sync
        )
      )
    `)
    .eq("ativo", true)
    .order("nome");

  if (error) throw new Error(error.message);

  return (data ?? []).map(mapWorkspace);
}

export async function buscarWorkspace(id: string): Promise<Workspace | null> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_workspaces")
    .select(`
      id, nome, provider, ativo,
      sectors:board_workspace_sectors (
        id, workspace_id, nome, label, ordem, ativo,
        boards:board_workspace_boards (
          id, sector_id, provider_board_id, provider_board_nome,
          label, ordem, ativo, list_config, ultimo_sync
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  return data ? mapWorkspace(data) : null;
}

// Busca o board configurado para um setor em qualquer workspace ativo
export async function buscarBoardPorSetor(
  setor: Setor,
): Promise<{ boardId: string; workspaceId: string; sectorId: string } | null> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("board_workspace_boards")
    .select(`
      provider_board_id,
      sector:board_workspace_sectors!inner (
        id, nome,
        workspace:board_workspaces!inner (
          id, ativo
        )
      )
    `)
    .eq("board_workspace_sectors.nome", setor)
    .eq("ativo", true)
    .maybeSingle();

  if (!data) return null;

  const sector = data.sector as unknown as {
    id: string;
    workspace: { id: string };
  };

  return {
    boardId: data.provider_board_id,
    workspaceId: sector.workspace.id,
    sectorId: sector.id,
  };
}

// ── Workspace CRUD ────────────────────────────────────────────────────

export async function criarWorkspace(nome: string, provider: ProviderId): Promise<string> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("board_workspaces")
    .insert({ nome, provider, ativo: true })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function garantirWorkspaceInterno(): Promise<string> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  // Verifica se já existe
  const { data: existing } = await admin
    .from("board_workspaces")
    .select("id")
    .eq("nome", "Interno")
    .eq("provider", "trello")
    .maybeSingle();

  if (existing) return existing.id;

  // Cria workspace + setores padrão
  const { data: ws, error: wsErr } = await admin
    .from("board_workspaces")
    .insert({ nome: "Interno", provider: "trello", ativo: true })
    .select("id")
    .single();

  if (wsErr) throw new Error(wsErr.message);

  const SETORES_PADRAO: { nome: Setor; label: string; ordem: number }[] = [
    { nome: "engenharia", label: "Engenharia", ordem: 1 },
    { nome: "compras", label: "Compras", ordem: 2 },
    { nome: "producao", label: "Produção", ordem: 3 },
  ];

  await admin.from("board_workspace_sectors").insert(
    SETORES_PADRAO.map((s) => ({ workspace_id: ws.id, ...s, ativo: true })),
  );

  return ws.id;
}

// ── Setor CRUD ────────────────────────────────────────────────────────

export async function garantirSetores(workspaceId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("board_workspace_sectors")
    .select("nome")
    .eq("workspace_id", workspaceId);

  const existingNomes = new Set((existing ?? []).map((s) => s.nome));
  const faltando = [
    { nome: "engenharia", label: "Engenharia", ordem: 1 },
    { nome: "compras", label: "Compras", ordem: 2 },
    { nome: "producao", label: "Produção", ordem: 3 },
  ].filter((s) => !existingNomes.has(s.nome));

  if (faltando.length > 0) {
    await admin.from("board_workspace_sectors").insert(
      faltando.map((s) => ({ workspace_id: workspaceId, ...s, ativo: true })),
    );
  }
}

// ── Board CRUD ────────────────────────────────────────────────────────

export async function salvarBoardNoSetor(
  sectorId: string,
  providerBoardId: string,
  providerBoardNome: string,
): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();

  // Desativa qualquer board existente neste setor
  await admin
    .from("board_workspace_boards")
    .update({ ativo: false })
    .eq("sector_id", sectorId);

  // Insere o novo board
  await admin.from("board_workspace_boards").insert({
    sector_id: sectorId,
    provider_board_id: providerBoardId,
    provider_board_nome: providerBoardNome,
    label: providerBoardNome,
    ordem: 1,
    ativo: true,
    list_config: null,
  });
}

export async function removerBoardDoSetor(sectorId: string): Promise<void> {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error("Não autenticado.");

  const admin = createAdminClient();
  await admin
    .from("board_workspace_boards")
    .update({ ativo: false })
    .eq("sector_id", sectorId);
}

export async function atualizarUltimoSync(boardId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("board_workspace_boards")
    .update({ ultimo_sync: new Date().toISOString() })
    .eq("id", boardId);
}

// ── Mappers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkspace(r: any): Workspace {
  return {
    id: r.id,
    nome: r.nome,
    provider: r.provider as ProviderId,
    ativo: r.ativo,
    sectors: (r.sectors ?? []).map(mapSector),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSector(r: any): WorkspaceSector {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    nome: r.nome as Setor,
    label: r.label,
    ordem: r.ordem,
    ativo: r.ativo,
    boards: (r.boards ?? []).map(mapBoard),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBoard(r: any): WorkspaceBoard {
  return {
    id: r.id,
    sectorId: r.sector_id,
    providerBoardId: r.provider_board_id,
    providerBoardNome: r.provider_board_nome ?? "",
    label: r.label ?? r.provider_board_nome ?? "",
    ordem: r.ordem ?? 1,
    ativo: r.ativo,
    listConfig: r.list_config ?? null,
    ultimoSync: r.ultimo_sync ?? null,
  };
}
