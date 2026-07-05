import "server-only";

import { trelloGet, trelloPut, trelloPost, trelloDelete } from "./trello-client";
import { TRELLO_TAGS, invalidateBoard, invalidateCard } from "./trello-cache";
import {
  mapTrelloCardLight, mapTrelloCardDetail, groupIntoColumns,
  mapChecklist, parseCheckItem, mapBoardMember, mapLabel, mapColor, mapTrelloActivity,
} from "./trello-mapper";
import type {
  TrelloCard, TrelloList, TrelloBoard, TrelloAction,
  TrelloChecklist, TrelloMember, TrelloLabel,
} from "./trello-types";
import type {
  BoardProvider, ProviderAvailableBoard, ProviderAvailableColumn,
  CreateCardInput, UpdateCardInput,
} from "../index";
import type {
  InternalBoardColumn, InternalBoardCardDetail, InternalBoardMember,
  InternalCardLabel, InternalChecklist, InternalChecklistItem,
  InternalComment, InternalActivity, Setor,
} from "../../types/internal-board";
import { NotImplementedError } from "../index";

export class TrelloProvider implements BoardProvider {
  readonly id = "trello" as const;
  readonly nome = "Trello";

  // ── Descoberta ────────────────────────────────────────────────────

  async getAvailableBoards(): Promise<ProviderAvailableBoard[]> {
    const boards = await trelloGet<TrelloBoard[]>(
      "/members/me/boards",
      { filter: "open", fields: "id,name,shortUrl" },
      TRELLO_TAGS.myBoards(),
      300,
    );
    return boards.map((b) => ({ id: b.id, nome: b.name, url: b.shortUrl }));
  }

  async getAvailableColumns(boardId: string): Promise<ProviderAvailableColumn[]> {
    const lists = await trelloGet<TrelloList[]>(
      `/boards/${boardId}/lists`,
      { filter: "open", fields: "id,name,pos" },
      TRELLO_TAGS.lists(boardId),
    );
    return lists
      .filter((l) => !l.closed)
      .sort((a, b) => a.pos - b.pos)
      .map((l) => ({ id: l.id, nome: l.name, pos: l.pos }));
  }

  // ── Leitura ───────────────────────────────────────────────────────

  async getColumns(boardId: string, setor: Setor): Promise<InternalBoardColumn[]> {
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

  async getCard(cardId: string, setor: Setor): Promise<InternalBoardCardDetail> {
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

  // ── Mutações card ─────────────────────────────────────────────────

  async createCard(boardId: string, input: CreateCardInput): Promise<string> {
    const body: Record<string, unknown> = {
      idList: input.listaId,
      name: input.titulo,
      desc: input.descricao ?? "",
      due: input.prazo ?? null,
    };
    if (input.memberIds?.length) body.idMembers = input.memberIds.join(",");
    if (input.labelIds?.length) body.idLabels = input.labelIds.join(",");

    const card = await trelloPost<TrelloCard>("/cards", body);
    invalidateBoard(boardId);
    return card.id;
  }

  async updateCard(cardId: string, boardId: string, input: UpdateCardInput): Promise<void> {
    const body: Record<string, unknown> = {};
    if (input.titulo !== undefined) body.name = input.titulo;
    if (input.descricao !== undefined) body.desc = input.descricao;
    if ("prazo" in input) body.due = input.prazo ?? null;
    if (Object.keys(body).length === 0) return;
    await trelloPut(`/cards/${cardId}`, body);
    invalidateCard(cardId, boardId);
  }

  async moveCard(cardId: string, toListId: string, boardId: string): Promise<void> {
    await trelloPut(`/cards/${cardId}`, { idList: toListId });
    invalidateCard(cardId, boardId);
  }

  async deleteCard(cardId: string, boardId: string): Promise<void> {
    throw new NotImplementedError(this.nome, "deleteCard");
    // Implementar quando necessário: await trelloDelete(`/cards/${cardId}`); invalidateCard(cardId, boardId);
  }

  // ── Membros ───────────────────────────────────────────────────────

  async getMembers(boardId: string): Promise<InternalBoardMember[]> {
    const members = await trelloGet<TrelloMember[]>(
      `/boards/${boardId}/members`,
      { fields: "id,fullName,username,avatarUrl" },
      TRELLO_TAGS.board(boardId),
      300,
    );
    return members.map(mapBoardMember);
  }

  async addMember(cardId: string, boardId: string, memberId: string): Promise<void> {
    await trelloPost(`/cards/${cardId}/idMembers`, { value: memberId });
    invalidateCard(cardId, boardId);
  }

  async removeMember(cardId: string, boardId: string, memberId: string): Promise<void> {
    await trelloDelete(`/cards/${cardId}/idMembers/${memberId}`);
    invalidateCard(cardId, boardId);
  }

  // ── Labels ────────────────────────────────────────────────────────

  async getBoardLabels(boardId: string): Promise<InternalCardLabel[]> {
    const labels = await trelloGet<TrelloLabel[]>(
      `/boards/${boardId}/labels`,
      { fields: "id,name,color" },
      TRELLO_TAGS.board(boardId),
      300,
    );
    return labels.map(mapLabel);
  }

  async addLabel(cardId: string, boardId: string, labelId: string): Promise<void> {
    await trelloPost(`/cards/${cardId}/idLabels`, { value: labelId });
    invalidateCard(cardId, boardId);
  }

  async removeLabel(cardId: string, boardId: string, labelId: string): Promise<void> {
    await trelloDelete(`/cards/${cardId}/idLabels/${labelId}`);
    invalidateCard(cardId, boardId);
  }

  // ── Comentários ───────────────────────────────────────────────────

  async getComments(cardId: string): Promise<InternalBoardCardDetail["comentarios"]> {
    const actions = await trelloGet<TrelloAction[]>(
      `/cards/${cardId}/actions`,
      { filter: "commentCard", limit: "50" },
      TRELLO_TAGS.card(cardId),
      30,
    );
    return actions
      .filter((a) => a.type === "commentCard")
      .map((a) => ({
        id: a.id,
        texto: (a.data.text as string | undefined) ?? "",
        autor: a.memberCreator.fullName,
        avatar: a.memberCreator.avatarUrl ?? undefined,
        criadoEm: a.date,
      }));
  }

  async createComment(cardId: string, text: string): Promise<InternalComment> {
    const action = await trelloPost<TrelloAction>(
      `/cards/${cardId}/actions/comments`,
      { text },
    );
    return {
      id: action.id,
      texto: (action.data.text as string | undefined) ?? text,
      autor: action.memberCreator.fullName,
      avatar: action.memberCreator.avatarUrl ?? undefined,
      criadoEm: action.date,
    };
  }

  // ── Checklists ────────────────────────────────────────────────────

  async createChecklist(cardId: string, boardId: string, name: string): Promise<InternalChecklist> {
    const cl = await trelloPost<TrelloChecklist>("/checklists", {
      idCard: cardId,
      name,
    });
    invalidateCard(cardId, boardId);
    return mapChecklist(cl);
  }

  async updateChecklist(checklistId: string, name: string): Promise<void> {
    await trelloPut(`/checklists/${checklistId}`, { name });
  }

  async deleteChecklist(checklistId: string, cardId: string, boardId: string): Promise<void> {
    await trelloDelete(`/checklists/${checklistId}`);
    invalidateCard(cardId, boardId);
  }

  async createChecklistItem(
    checklistId: string,
    cardId: string,
    name: string,
  ): Promise<InternalChecklistItem> {
    const item = await trelloPost<TrelloChecklist["checkItems"][0]>(
      `/checklists/${checklistId}/checkItems`,
      { name, checked: "false", pos: "bottom" },
    );
    return parseCheckItem(item);
  }

  async updateChecklistItem(
    checklistId: string,
    itemId: string,
    cardId: string,
    name: string,
  ): Promise<void> {
    await trelloPut(`/cards/${cardId}/checkItem/${itemId}`, { name });
  }

  async deleteChecklistItem(
    checklistId: string,
    itemId: string,
    cardId: string,
    boardId: string,
  ): Promise<void> {
    await trelloDelete(`/checklists/${checklistId}/checkItems/${itemId}`);
    invalidateCard(cardId, boardId);
  }

  async toggleCheckItem(
    cardId: string,
    boardId: string,
    checkItemId: string,
    done: boolean,
  ): Promise<void> {
    await trelloPut(`/cards/${cardId}/checkItem/${checkItemId}`, {
      state: done ? "complete" : "incomplete",
    });
    invalidateCard(cardId, boardId);
  }

  // ── Atividade ─────────────────────────────────────────────────────

  async getActivities(cardId: string): Promise<InternalActivity[]> {
    const actions = await trelloGet<TrelloAction[]>(
      `/cards/${cardId}/actions`,
      { filter: "all", limit: "50" },
      TRELLO_TAGS.card(cardId),
      30,
    );
    return actions.map(mapTrelloActivity);
  }
}
