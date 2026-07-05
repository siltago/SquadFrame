// Interface canônica que todo provider de board deve implementar.
// A UI nunca conhece o provider — só conhece os DTOs de internal-board.ts.
// Adicionar um novo provider = implementar esta interface.

import type {
  InternalBoardColumn,
  InternalBoardCardDetail,
  InternalBoardMember,
  InternalCardLabel,
  InternalChecklist,
  InternalChecklistItem,
  InternalComment,
  InternalActivity,
  Setor,
} from "../types/internal-board";

export type ProviderId = "trello"; // | "jira" | "clickup" | "monday" | "github-projects"

export type ProviderAvailableBoard  = { id: string; nome: string; url?: string };
export type ProviderAvailableColumn = { id: string; nome: string; pos: number };

export type CreateCardInput = {
  listaId: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  memberIds?: string[];
  labelIds?: string[];
};

export type UpdateCardInput = {
  titulo?: string;
  descricao?: string;
  prazo?: string | null;
};

/**
 * Interface completa de um BoardProvider.
 * Todo método não suportado pelo provider deve lançar NotImplementedError.
 */
export interface BoardProvider {
  readonly id: ProviderId;
  readonly nome: string;

  // ── Descoberta ────────────────────────────────────────────────────
  getAvailableBoards(): Promise<ProviderAvailableBoard[]>;
  getAvailableColumns(boardId: string): Promise<ProviderAvailableColumn[]>;

  // ── Leitura ───────────────────────────────────────────────────────
  getColumns(boardId: string, setor: Setor): Promise<InternalBoardColumn[]>;
  getCard(cardId: string, setor: Setor): Promise<InternalBoardCardDetail>;

  // ── Mutações card ─────────────────────────────────────────────────
  createCard(boardId: string, input: CreateCardInput): Promise<string>;
  updateCard(cardId: string, boardId: string, input: UpdateCardInput): Promise<void>;
  moveCard(cardId: string, toListId: string, boardId: string): Promise<void>;
  deleteCard(cardId: string, boardId: string): Promise<void>;

  // ── Membros ─────────────��──────────────────────────────��──────────
  getMembers(boardId: string): Promise<InternalBoardMember[]>;
  addMember(cardId: string, boardId: string, memberId: string): Promise<void>;
  removeMember(cardId: string, boardId: string, memberId: string): Promise<void>;

  // ── Labels ───���────────────────────────────────��───────────────────
  getBoardLabels(boardId: string): Promise<InternalCardLabel[]>;
  addLabel(cardId: string, boardId: string, labelId: string): Promise<void>;
  removeLabel(cardId: string, boardId: string, labelId: string): Promise<void>;

  // ── Comentários ────��──────────────────────────────────────────────
  getComments(cardId: string): Promise<InternalBoardCardDetail["comentarios"]>;
  createComment(cardId: string, text: string): Promise<InternalComment>;

  // ── Checklists ��───────────────────────────────��───────────────────
  createChecklist(cardId: string, boardId: string, name: string): Promise<InternalChecklist>;
  updateChecklist(checklistId: string, name: string): Promise<void>;
  deleteChecklist(checklistId: string, cardId: string, boardId: string): Promise<void>;
  createChecklistItem(checklistId: string, cardId: string, name: string): Promise<InternalChecklistItem>;
  updateChecklistItem(checklistId: string, itemId: string, cardId: string, name: string): Promise<void>;
  deleteChecklistItem(checklistId: string, itemId: string, cardId: string, boardId: string): Promise<void>;
  toggleCheckItem(cardId: string, boardId: string, checkItemId: string, done: boolean): Promise<void>;

  // ── Atividade ───────���───────────────────────────────���─────────────
  getActivities(cardId: string): Promise<InternalActivity[]>;
}

export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}: método "${method}" não implementado.`);
    this.name = "NotImplementedError";
  }
}
