-- =============================================================================
-- Migration: 20260703000002_pacote_pipeline_status.sql
-- Fase 5 do SquadBoard: infraestrutura genérica para múltiplos Pipelines por
-- Pacote de Trabalho (lotes_obra). Um Pacote pertence a UMA obra, mas pode
-- ocupar uma posição independente em cada Pipeline (Engenharia, Compras,
-- Produção nesta fase — mais podem ser adicionados sem nova migration de
-- schema, só novas linhas).
--
-- Decisão de arquitetura: tabela de estado por pipeline (Opção B), não
-- colunas em lotes_obra (Opção A). Ver justificativa completa no relatório
-- da Fase 5 entregue junto com esta migration. Resumo:
--   - Opção A cresce uma coluna por pipeline novo (schema muda a cada
--     pipeline); Opção B não muda schema nunca, só dados.
--   - Opção A não tem histórico/auditoria natural por pipeline; Opção B
--     tem `updated_at` por linha e comporta uma tabela de histórico futura
--     sem alterar lotes_obra.
--   - Opção A mistura conceitos (lotes_obra vira "deus-tabela" com uma
--     coluna por setor); Opção B mantém lotes_obra 100% inalterada — zero
--     risco para Produção/Compras existentes.
--   - Consultas: "onde este pacote está no pipeline X" e "todos os pacotes
--     do pipeline X, coluna Y" são igualmente simples nas duas, mas Opção B
--     também responde "em quais pipelines um pacote já está" sem UNIONs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pacote_pipeline_status (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id     uuid        NOT NULL REFERENCES public.lotes_obra(id) ON DELETE CASCADE,
  pipeline    text        NOT NULL CHECK (pipeline IN ('engenharia', 'compras', 'producao')),
  coluna      text        NOT NULL,
  ordem       integer     NOT NULL DEFAULT 0,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lote_id, pipeline)
);

CREATE INDEX IF NOT EXISTS idx_pacote_pipeline_status_lote
  ON public.pacote_pipeline_status(lote_id);

CREATE INDEX IF NOT EXISTS idx_pacote_pipeline_status_pipeline_coluna
  ON public.pacote_pipeline_status(pipeline, coluna);

COMMENT ON TABLE public.pacote_pipeline_status IS
  'Posição de um Pacote de Trabalho (lotes_obra) dentro de um Pipeline (Engenharia/Compras/Produção). '
  'Um Pacote sem linha aqui para um pipeline está, por convenção da aplicação, na primeira coluna desse '
  'pipeline (default implícito — não requer backfill). Cada pipeline é independente: mover um pacote em '
  'um pipeline não afeta as linhas dos outros pipelines (chave única é lote_id+pipeline).';

-- Mesma convenção de RLS já usada em lotes_obra: RLS habilitado, acesso via
-- service_role (admin client, como todo o resto do projeto). Sem policy de
-- permissão nova — este módulo ainda não tem chaves de permissão dedicadas
-- (mesma decisão já tomada nas Fases 3 e 4).
ALTER TABLE public.pacote_pipeline_status ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.pacote_pipeline_status TO anon;
GRANT ALL ON TABLE public.pacote_pipeline_status TO authenticated;
GRANT ALL ON TABLE public.pacote_pipeline_status TO service_role;
