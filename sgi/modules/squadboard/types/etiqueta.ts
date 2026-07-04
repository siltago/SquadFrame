export type BoardEtiqueta = {
  id: string;
  nome: string;
  cor: string; // hex
  criadoEm: string;
};

export const LABEL_CORES = [
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#6b7280", // cinza
  "#78716c", // marrom
] as const;
