// Fase 5 — arquitetura genérica de Pipelines. Nenhuma lógica específica de
// setor vive aqui: cada Pipeline é só um id + uma lista ordenada de colunas.
// Adicionar um Pipeline novo no futuro é acrescentar uma entrada em
// PIPELINES — não exige migration nem mudança nos componentes do board.

export type PipelineId = "engenharia" | "compras" | "producao";

export type PipelineColuna = { id: string; nome: string };

export type Pipeline = { id: PipelineId; nome: string; colunas: PipelineColuna[] };

export const PIPELINES: Pipeline[] = [
  {
    id: "engenharia",
    nome: "Engenharia",
    colunas: [
      { id: "a_fazer", nome: "A Fazer" },
      { id: "em_desenvolvimento", nome: "Em Desenvolvimento" },
      { id: "revisao", nome: "Revisão" },
      { id: "liberado", nome: "Liberado" },
    ],
  },
  {
    id: "compras",
    nome: "Compras",
    colunas: [
      { id: "aguardando", nome: "Aguardando" },
      { id: "solicitacao", nome: "Solicitação" },
      { id: "pedido", nome: "Pedido" },
      { id: "recebido", nome: "Recebido" },
    ],
  },
  {
    id: "producao",
    nome: "Produção",
    colunas: [
      { id: "aguardando", nome: "Aguardando" },
      { id: "fila", nome: "Fila" },
      { id: "em_producao", nome: "Em Produção" },
      { id: "finalizado", nome: "Finalizado" },
    ],
  },
];

export function getPipeline(id: PipelineId): Pipeline {
  const pipeline = PIPELINES.find((p) => p.id === id);
  if (!pipeline) throw new Error(`Pipeline desconhecido: ${id}`);
  return pipeline;
}

export function colunasDoPipeline(id: PipelineId): PipelineColuna[] {
  return getPipeline(id).colunas;
}

// Coluna assumida para um Pacote que ainda não tem linha em
// pacote_pipeline_status para este pipeline (nunca foi movido).
export function colunaPadrao(id: PipelineId): string {
  return getPipeline(id).colunas[0].id;
}

export function colunaValida(id: PipelineId, coluna: string): boolean {
  return getPipeline(id).colunas.some((c) => c.id === coluna);
}
