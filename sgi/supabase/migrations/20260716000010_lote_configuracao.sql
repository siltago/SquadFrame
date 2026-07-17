-- ============================================================
-- SquadWise — Configuração operacional do Lote de Trabalho
-- Campos que permitem o Wise controlar etapas e liberações
-- sem alterar o funcionamento atual do Frame/Board.
-- ============================================================

ALTER TABLE lotes_obra
  ADD COLUMN IF NOT EXISTS etapa text NOT NULL DEFAULT 'configuracao'
    CHECK (etapa IN ('configuracao','compras','producao','entrega','concluido')),
  ADD COLUMN IF NOT EXISTS liberado_compras  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liberado_producao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_producao     text;

CREATE INDEX IF NOT EXISTS lotes_obra_etapa_idx ON lotes_obra(etapa);

-- Lotes existentes com responsável e tipologias → considerar em 'compras'
UPDATE lotes_obra l
SET etapa = 'compras', liberado_compras = true
WHERE responsavel_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM tipologias_obra t WHERE t.lote_id = l.id LIMIT 1);
