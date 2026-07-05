// DTOs internos — a UI nunca conhece JSON de nenhum provider.
// Qualquer provider (Trello, Jira, ClickUp…) mapeia para estes tipos.

import type { ProviderId } from "../providers/index";
import type { CardEntityLink } from "./entity-link";

export type Setor = "engenharia" | "compras" | "producao";

export const SETORES: { id: Setor; label: string }[] = [
  { id: "engenharia", label: "Engenharia" },
  { id: "compras", label: "Compras" },
  { id: "producao", label: "Produção" },
];

export type InternalCardLabel = { id: string; nome: string; cor: string };

// Membro de card = usuário do SquadSystem (não do provider)
export type InternalCardMember = {
  id: string;     // usuarios.id (UUID SquadSystem)
  nome: string;
  email?: string;
  avatar?: string; // foto_url
};

// Picker de membros do board — também SquadSystem users
export type InternalBoardMember = {
  id: string;
  nome: string;
  email?: string;
  avatar?: string;
};

export type InternalChecklistItem = {
  id: string;
  texto: string;
  concluido: boolean;
  responsavel?: string; // convenção [@Nome] extraída no mapper
};

export type InternalChecklist = {
  id: string;
  titulo: string;
  itens: InternalChecklistItem[];
  progresso: number; // 0–100
};

export type InternalComment = {
  id: string;
  texto: string;
  autor: string;
  avatar?: string;
  criadoEm: string; // ISO
};

export type InternalAttachment = {
  id: string;
  nome: string;
  url: string;
  mimeType?: string;
  preview?: string;
};

// Evento de atividade — mix de eventos do provider + eventos locais do SquadSystem
export type InternalActivity = {
  id: string;
  tipo: string;        // 'COMMENT', 'MOVE', 'RENAME', 'ADD_MEMBER', etc.
  descricao: string;   // texto legível
  autor: string;
  avatar?: string;
  criadoEm: string;    // ISO
  fonte: "provider" | "local";
};

// Card leve — listagem do board (sem comentários/anexos/atividade)
export type InternalBoardCard = {
  id: string;
  titulo: string;
  descricao: string;
  setor: Setor;
  coluna: string;      // nome da lista
  colunaId: string;    // id da lista
  responsaveis: InternalCardMember[];
  prazo?: string;
  labels: InternalCardLabel[];
  checklists: InternalChecklist[];
  progresso: number;
  provider: ProviderId;
  shortUrl?: string;   // link direto ao card no provider
};

// Card completo — detalhe (inclui comentários, anexos, relacionamentos)
export type InternalBoardCardDetail = InternalBoardCard & {
  comentarios: InternalComment[];
  anexos: InternalAttachment[];
  relacionamentos: CardEntityLink[];
};

export type InternalBoardColumn = {
  id: string;
  nome: string;
  cards: InternalBoardCard[];
};
