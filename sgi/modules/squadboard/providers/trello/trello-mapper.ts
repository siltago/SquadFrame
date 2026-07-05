import "server-only";

import type {
  TrelloCard, TrelloList, TrelloChecklist, TrelloAction, TrelloColor, TrelloMember,
} from "./trello-types";
import type {
  InternalBoardCard, InternalBoardCardDetail, InternalBoardColumn,
  InternalBoardMember, InternalCardLabel,
  InternalChecklist, InternalChecklistItem, InternalComment,
  InternalActivity, Setor,
} from "../../types/internal-board";

// ── Checklist ─────────────────────────────────────────────────────────

const RESPONSIBLE_RE = /^\[@(.+?)\]\s*/;

export function parseCheckItem(item: TrelloChecklist["checkItems"][0]): InternalChecklistItem {
  const match = RESPONSIBLE_RE.exec(item.name);
  return {
    id: item.id,
    texto: match ? item.name.replace(RESPONSIBLE_RE, "").trim() : item.name,
    concluido: item.state === "complete",
    responsavel: match ? match[1] : undefined,
  };
}

export function mapChecklist(cl: TrelloChecklist): InternalChecklist {
  const itens = [...cl.checkItems]
    .sort((a, b) => a.pos - b.pos)
    .map(parseCheckItem);
  const done = itens.filter((i) => i.concluido).length;
  return {
    id: cl.id,
    titulo: cl.name,
    itens,
    progresso: itens.length > 0 ? Math.round((done / itens.length) * 100) : 0,
  };
}

function overallProgress(checklists: InternalChecklist[]): number {
  const all = checklists.flatMap((c) => c.itens);
  if (all.length === 0) return 0;
  return Math.round((all.filter((i) => i.concluido).length / all.length) * 100);
}

// ── Cores ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<NonNullable<TrelloColor> | "null", string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  sky: "#06b6d4",
  lime: "#84cc16",
  black: "#374151",
  null: "#6b7280",
};

export function mapColor(c: TrelloColor): string {
  return COLOR_MAP[(c ?? "null") as keyof typeof COLOR_MAP] ?? "#6b7280";
}

// ── Members ───────────────────────────────────────────────────────────

export function mapBoardMember(m: TrelloMember): InternalBoardMember {
  return {
    id: m.id,
    nome: m.fullName,
    avatar: m.avatarUrl ?? undefined,
  };
}

// ── Labels ────────────────────────────────────────────────────────────

export function mapLabel(l: { id: string; name: string; color: TrelloColor }): InternalCardLabel {
  return { id: l.id, nome: l.name, cor: mapColor(l.color) };
}

// ── Cards ─────────────────────────────────────────────────────────────

export function mapTrelloCardLight(
  card: TrelloCard,
  list: TrelloList,
  setor: Setor,
): InternalBoardCard {
  const checklists = (card.checklists ?? []).map(mapChecklist);
  return {
    id: card.id,
    titulo: card.name,
    descricao: card.desc,
    setor,
    coluna: list.name,
    colunaId: list.id,
    responsaveis: [],
    prazo: card.due ?? undefined,
    labels: card.labels.map(mapLabel),
    checklists,
    progresso: overallProgress(checklists),
    provider: "trello",
    shortUrl: card.shortUrl,
  };
}

export function mapTrelloCardDetail(
  card: TrelloCard,
  list: TrelloList,
  setor: Setor,
  actions: TrelloAction[],
): InternalBoardCardDetail {
  const base = mapTrelloCardLight(card, list, setor);

  const comentarios: InternalComment[] = actions
    .filter((a) => a.type === "commentCard")
    .map((a) => ({
      id: a.id,
      texto: (a.data.text as string | undefined) ?? "",
      autor: a.memberCreator.fullName,
      avatar: a.memberCreator.avatarUrl ?? undefined,
      criadoEm: a.date,
    }));

  return {
    ...base,
    comentarios,
    relacionamentos: [], // enriquecido pela action após retorno do provider
    anexos: (card.attachments ?? []).map((a) => ({
      id: a.id,
      nome: a.name,
      url: a.url,
      mimeType: a.mimeType,
      preview: a.previews?.[0]?.url,
    })),
  };
}

// ── Colunas ───────────────────────────────────────────────────────────

export function groupIntoColumns(
  cards: InternalBoardCard[],
  lists: TrelloList[],
): InternalBoardColumn[] {
  const open = lists.filter((l) => !l.closed).sort((a, b) => a.pos - b.pos);
  return open.map((list) => ({
    id: list.id,
    nome: list.name,
    cards: cards.filter((c) => c.colunaId === list.id),
  }));
}

// ── Atividade ─────────────────────────────────────────────────────────

type TrelloDataWithMember = { member?: { fullName?: string; name?: string }; [k: string]: unknown };
type TrelloDataWithList   = { listAfter?: { name?: string }; list?: { name?: string }; [k: string]: unknown };
type TrelloDataWithCheck  = { checkItem?: { name?: string; state?: string }; [k: string]: unknown };
type TrelloDataWithLabel  = { label?: { name?: string }; [k: string]: unknown };

function buildActivityDescription(action: TrelloAction): string {
  const d = action.data;
  switch (action.type) {
    case "commentCard":
      return "comentou";
    case "updateCard": {
      const old = d.old as Record<string, unknown> | undefined;
      if (old && "name" in old) return "renomeou o card";
      if (old && "desc" in old) return "editou a descrição";
      if (old && "due" in old) return "alterou o prazo";
      if (old && "idList" in old) {
        const dest = (d as TrelloDataWithList).listAfter?.name;
        return dest ? `moveu para "${dest}"` : "moveu o card";
      }
      if (old && "closed" in old) return "arquivou o card";
      return "atualizou o card";
    }
    case "addMemberToCard": {
      const nome = (d as TrelloDataWithMember).member?.fullName ?? "";
      return `adicionou ${nome}`;
    }
    case "removeMemberFromCard": {
      const nome = (d as TrelloDataWithMember).member?.fullName ?? "";
      return `removeu ${nome}`;
    }
    case "updateCheckItemStateOnCard": {
      const ci = (d as TrelloDataWithCheck).checkItem;
      const done = ci?.state === "complete";
      const nome = ci?.name ? `"${ci.name}"` : "item";
      return done ? `concluiu ${nome}` : `reabriu ${nome}`;
    }
    case "addLabelToCard": {
      const nome = (d as TrelloDataWithLabel).label?.name ?? "";
      return nome ? `adicionou etiqueta "${nome}"` : "adicionou etiqueta";
    }
    case "removeLabelFromCard": {
      const nome = (d as TrelloDataWithLabel).label?.name ?? "";
      return nome ? `removeu etiqueta "${nome}"` : "removeu etiqueta";
    }
    case "createCheckItem":
      return "adicionou item ao checklist";
    case "deleteCheckItem":
      return "removeu item do checklist";
    case "createCard":
      return "criou o card";
    case "copyCard":
      return "copiou o card";
    case "archiveCard":
      return "arquivou o card";
    default:
      return action.type.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  }
}

export function mapTrelloActivity(action: TrelloAction): InternalActivity {
  const autor = action.memberCreator.fullName;
  return {
    id: action.id,
    tipo: action.type,
    descricao: `${autor} ${buildActivityDescription(action)}`,
    autor,
    avatar: action.memberCreator.avatarUrl ?? undefined,
    criadoEm: action.date,
    fonte: "provider",
  };
}
