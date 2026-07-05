import type { ProviderId } from "../providers/index";
import type { Setor } from "./internal-board";

// Estrutura de Workspace → Setor → Board.
// Permite múltiplos boards por setor e múltiplos setores por workspace.
// Hoje usamos 1 workspace "Interno" com 3 setores e 1 board por setor.

export type WorkspaceBoard = {
  id: string;                 // PK local
  sectorId: string;
  providerBoardId: string;    // ID do board no provider (Trello board ID)
  providerBoardNome: string;  // nome cacheado para exibição
  label: string;              // nome customizado no SquadBoard
  ordem: number;
  ativo: boolean;
  listConfig: string[] | null; // IDs de listas ativas; null = todas
  ultimoSync: string | null;   // ISO
};

export type WorkspaceSector = {
  id: string;
  workspaceId: string;
  nome: Setor;
  label: string;
  ordem: number;
  ativo: boolean;
  boards: WorkspaceBoard[];
};

export type Workspace = {
  id: string;
  nome: string;
  provider: ProviderId;
  ativo: boolean;
  sectors: WorkspaceSector[];
};

// Payload mínimo retornado pelas actions de configuração
export type WorkspaceSummary = Omit<Workspace, "sectors"> & {
  totalBoards: number;
  boardsConfigurados: number;
};
