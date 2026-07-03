// Tipos visuais do SquadBoard. Nenhuma lógica de negócio/API ainda —
// o shape já é desenhado para mapear 1:1 com uma futura integração
// (ex: API do Trello: board→board, list→coluna, card→card).

export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export type Membro = {
  id: string;
  nome: string;
  avatarUrl?: string | null;
};

export type Etiqueta = {
  id: string;
  nome: string;
  cor: "success" | "warning" | "danger" | "info" | "accent" | "default";
};

export type ChecklistItem = {
  id: string;
  texto: string;
  feito: boolean;
};

export type Comentario = {
  id: string;
  autor: Membro;
  texto: string;
  criadoEm: string; // ISO
};

export type TimelineEvento = {
  id: string;
  autor: Membro;
  acao: string; // ex: "moveu o card para Em andamento"
  criadoEm: string; // ISO
};

export type Anexo = {
  id: string;
  nome: string;
  tamanho: string; // ex: "1.2 MB"
  tipo: "imagem" | "documento" | "link";
};

export type BoardCard = {
  id: string;
  colunaId: string;
  titulo: string;
  cliente?: string;
  descricao?: string;
  responsaveis: Membro[];
  prioridade: Prioridade;
  prazo?: string; // ISO
  etiquetas: Etiqueta[];
  checklist: ChecklistItem[];
  comentarios: Comentario[];
  timeline: TimelineEvento[];
  anexos: Anexo[];
  tempoEstimadoH?: number;
  ordem: number;
};

export type BoardColuna = {
  id: string;
  nome: string;
  ordem: number;
  limiteWip?: number;
};

export type Board = {
  id: string;
  nome: string;
  descricao?: string;
  colunas: BoardColuna[];
};
