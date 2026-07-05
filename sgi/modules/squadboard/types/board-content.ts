export type EntityType = "lote" | "pedido" | "pedido_grupo";

export type BoardChecklistItem = {
  id: string;
  texto: string;
  concluido: boolean;
  ordem: number;
};

export type BoardChecklist = {
  id: string;
  titulo: string;
  ordem: number;
  itens: BoardChecklistItem[];
};

export type BoardAnexo = {
  id: string;
  nome: string;
  url: string;
  criadoEm: string;
  storagePath?: string;
};

export type BoardContent = {
  descricao: string;
  checklists: BoardChecklist[];
  anexos: BoardAnexo[];
};
