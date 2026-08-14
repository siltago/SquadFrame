export const PRIORIDADE_LOTE = {
  CRITICA: { label: "Crítica", cor: "#ef4444" },
  ALTA:    { label: "Alta",    cor: "#f59e0b" },
  MEDIA:   { label: "Média",   cor: "#3b82f6" },
  BAIXA:   { label: "Baixa",   cor: "#94a3b8" },
} as const;

export const STATUS_LOTE = {
  RASCUNHO:  { label: "Rascunho",  cor: "#94a3b8" },
  ATIVO:     { label: "Ativo",     cor: "#3b82f6" },
  SUSPENSO:  { label: "Suspenso",  cor: "#f59e0b" },
  CONCLUIDO: { label: "Concluído", cor: "#22c55e" },
  CANCELADO: { label: "Cancelado", cor: "#ef4444" },
} as const;

// Ordem fixa das etapas do CHECK constraint em lotes_obra.etapa
// (ver supabase/migrations/20260716000010_lote_configuracao.sql).
export const ETAPAS_LOTE = ["configuracao", "compras", "producao", "entrega", "concluido"] as const;

export const ETAPA_LOTE_LABEL: Record<(typeof ETAPAS_LOTE)[number], string> = {
  configuracao: "Configuração",
  compras:      "Compras",
  producao:     "Produção",
  entrega:      "Entrega",
  concluido:    "Concluído",
};

export const ETAPA_LOTE_COR: Record<(typeof ETAPAS_LOTE)[number], string> = {
  configuracao: "#94a3b8",
  compras:      "#f59e0b",
  producao:     "#3b82f6",
  entrega:      "#8b5cf6",
  concluido:    "#22c55e",
};
