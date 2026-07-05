import "server-only";
import { revalidateTag } from "next/cache";

// Tags centralizadas — garante consistência entre client e invalidação.
export const TRELLO_TAGS = {
  myBoards: () => "trello-my-boards",
  board: (id: string) => `trello-board-${id}`,
  lists: (boardId: string) => `trello-lists-${boardId}`,
  cards: (boardId: string) => `trello-cards-${boardId}`,
  card: (id: string) => `trello-card-${id}`,
};

export function invalidateBoard(boardId: string): void {
  revalidateTag(TRELLO_TAGS.board(boardId));
  revalidateTag(TRELLO_TAGS.lists(boardId));
  revalidateTag(TRELLO_TAGS.cards(boardId));
}

export function invalidateCard(cardId: string, boardId?: string): void {
  revalidateTag(TRELLO_TAGS.card(cardId));
  if (boardId) revalidateTag(TRELLO_TAGS.cards(boardId));
}
