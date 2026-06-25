-- =============================================================================
-- Migration: 20260625000003_kanban_fixes.sql
-- Objetos: índice único de idempotência do Kanban,
--          coluna "Solicitações em aprovação" no setor Compras,
--          correção de ordem das colunas de compras.
-- Idempotente: IF NOT EXISTS / WHERE NOT EXISTS em todos os objetos.
-- Sem DROP TABLE, sem TRUNCATE, sem perda de dados.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Idempotência de cards do Kanban
-- Remove duplicatas (mantém o card mais recente por entidade).
-- Necessário para criar o UNIQUE INDEX sem erro de duplicidade.
-- ---------------------------------------------------------------------------
WITH duplicatas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY entidade_ref, entidade_ref_id
      ORDER BY criado_em DESC, id DESC
    ) AS rn
  FROM tarefas
  WHERE entidade_ref    IS NOT NULL
    AND entidade_ref_id IS NOT NULL
)
DELETE FROM tarefas
WHERE id IN (SELECT id FROM duplicatas WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tarefa_entidade_unica
  ON tarefas (entidade_ref, entidade_ref_id)
  WHERE entidade_ref    IS NOT NULL
    AND entidade_ref_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Corrigir ordens das colunas de compras
-- Estado atual das colunas do fluxo de pedidos:
--   Rascunho (1), Aguard. Aprovação (2), Aprovados (3),
--   Em Recebimento (4), Concluído (4)  ← colisão existente
--
-- Após migration:
--   Solicitações em aprovação (1, nova)
--   Rascunho (2), Aguard. Aprovação (3), Aprovados (4),
--   Em Recebimento (5), Concluído (6)  ← sem colisão
-- ---------------------------------------------------------------------------

-- Passo 1: shift +1 nas colunas que vêm depois de "Solicitações abertas"
UPDATE colunas_kanban ck
SET ordem = ck.ordem + 1
FROM setores s
WHERE ck.setor_id = s.id
  AND s.nome ILIKE '%compra%'
  AND ck.nome IN (
    'Rascunho',
    'Aguard. Aprovação',
    'Aprovados',
    'Em Recebimento',
    'Concluído'
  );

-- Passo 2: fixa "Concluído" na posição 6 (elimina colisão com "Em Recebimento")
UPDATE colunas_kanban ck
SET ordem = 6
FROM setores s
WHERE ck.setor_id = s.id
  AND s.nome ILIKE '%compra%'
  AND ck.nome = 'Concluído';

-- Passo 3: insere "Solicitações em aprovação" na posição 1
-- WHERE NOT EXISTS garante idempotência (sem constraint única na tabela)
INSERT INTO colunas_kanban (setor_id, nome, ordem, tipo, aceita_automaticas, usuario_id, cor)
SELECT
  s.id,
  'Solicitações em aprovação',
  1,
  'PADRAO',
  true,
  null,
  null
FROM setores s
WHERE s.nome ILIKE '%compra%'
  AND NOT EXISTS (
    SELECT 1 FROM colunas_kanban ck2
    WHERE ck2.setor_id = s.id
      AND ck2.nome = 'Solicitações em aprovação'
  );
