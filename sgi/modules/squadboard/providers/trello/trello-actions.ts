"use server";

import { trelloGet, trelloPut, trelloPost } from "./trello-client";
import { TRELLO_TAGS, invalidateBoard, invalidateCard } from "./trello-cache";
import {
  mapTrelloCardLight,
  mapTrelloCardDetail,
  groupIntoColumns,
} from "./trello-mapper";
import type {
  TrelloCard, TrelloList, TrelloBoard, TrelloAction,
  TrelloChecklist, TrelloCheckItem,
} from "./trello-types";
import type {
  InternalBoardColumn, InternalBoardCardDetail, Setor,
} from "../../types/internal-board";

// ── Listagem ──────────────────────────────────────────────────────────

export async function buscarColunasBoard(
  boardId: string,
  setor: Setor,
): Promise<InternalBoardColumn[]> {
  const [lists, cards] = await Promise.all([
    trelloGet<TrelloList[]>(
      `/boards/${boardId}/lists`,
      { filter: "open" },
      TRELLO_TAGS.lists(boardId),
    ),
    trelloGet<TrelloCard[]>(
      `/boards/${boardId}/cards`,
      { members: "true", labels: "true", checklists: "all", filter: "open" },
      TRELLO_TAGS.cards(boardId),
    ),
  ]);

  const listMap = new Map(lists.map((l) => [l.id, l]));
  const mappedCards = cards
    .filter((c) => !c.closed)
    .flatMap((c) => {
      const list = listMap.get(c.idList);
      return list ? [mapTrelloCardLight(c, list, setor)] : [];
    });

  return groupIntoColumns(mappedCards, lists);
}

// ── Detalhe ───────────────────────────────────────────────────────────

export async function buscarCardDetalhe(
  cardId: string,
  setor: Setor,
): Promise<InternalBoardCardDetail> {
  const [card, actions] = await Promise.all([
    trelloGet<TrelloCard>(
      `/cards/${cardId}`,
      { members: "true", labels: "true", checklists: "all", attachments: "true" },
      TRELLO_TAGS.card(cardId),
      30,
    ),
    trelloGet<TrelloAction[]>(
      `/cards/${cardId}/actions`,
      { filter: "commentCard", limit: "50" },
      TRELLO_TAGS.card(cardId),
      30,
    ),
  ]);

  const list = await trelloGet<TrelloList>(
    `/lists/${card.idList}`,
    {},
    TRELLO_TAGS.lists(card.idBoard),
  );

  return mapTrelloCardDetail(card, list, setor, actions);
}

// ── Mutações ─────────────────────────────────────────────────────────

export async function moverCardTrello(
  cardId: string,
  novaListaId: string,
  boardId: string,
): Promise<void> {
  await trelloPut(`/cards/${cardId}`, { idList: novaListaId });
  invalidateCard(cardId, boardId);
}

export async function editarCardTrello(
  cardId: string,
  campos: { name?: string; desc?: string; due?: string | null },
  boardId: string,
): Promise<void> {
  await trelloPut(`/cards/${cardId}`, campos);
  invalidateCard(cardId, boardId);
}

export async function criarCardTrello(
  listId: string,
  titulo: string,
  boardId: string,
  descricao?: string,
): Promise<string> {
  const card = await trelloPost<TrelloCard>("/cards", {
    idList: listId,
    name: titulo,
    desc: descricao ?? "",
  });
  invalidateBoard(boardId);
  return card.id;
}

// ── Checklists ────────────────────────────────────────────────────────

export async function criarChecklistTrello(
  cardId: string,
  titulo: string,
  boardId: string,
): Promise<string> {
  const cl = await trelloPost<TrelloChecklist>("/checklists", {
    idCard: cardId,
    name: titulo,
  });
  invalidateCard(cardId, boardId);
  return cl.id;
}

export async function criarItemChecklistTrello(
  checklistId: string,
  texto: string,
  cardId: string,
  boardId: string,
): Promise<string> {
  const item = await trelloPost<TrelloCheckItem>(
    `/checklists/${checklistId}/checkItems`,
    { name: texto, pos: "bottom" },
  );
  invalidateCard(cardId, boardId);
  return item.id;
}

export async function toggleItemChecklistTrello(
  cardId: string,
  checkItemId: string,
  concluido: boolean,
  boardId: string,
): Promise<void> {
  await trelloPut(`/cards/${cardId}/checkItem/${checkItemId}`, {
    state: concluido ? "complete" : "incomplete",
  });
  invalidateCard(cardId, boardId);
}

// ── Boards disponíveis (para configuração) ────────────────────────────

export async function buscarBoardsTrello(): Promise<TrelloBoard[]> {
  return trelloGet<TrelloBoard[]>(
    "/members/me/boards",
    { filter: "open", fields: "id,name,shortUrl" },
    TRELLO_TAGS.myBoards(),
    300,
  );
}
