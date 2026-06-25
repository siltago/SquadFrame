-- =============================================================================
-- kanban-fixes.sql
-- Migrations para os bugs corrigidos no Kanban de Compras.
-- Todas as operações são idempotentes (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BUG 3 — Idempotência de cards do Kanban
-- ---------------------------------------------------------------------------
-- Garante que cada entidade (solicitação ou pedido) tenha no máximo 1 card.
-- O upsert em criarTarefaAutomatica usa este índice via onConflict.
-- ---------------------------------------------------------------------------

-- Passo 1: Remove duplicatas existentes (mantém o card mais recente)
WITH duplicatas AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY entidade_ref, entidade_ref_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM tarefas
  WHERE entidade_ref IS NOT NULL
    AND entidade_ref_id IS NOT NULL
)
DELETE FROM tarefas
WHERE id IN (SELECT id FROM duplicatas WHERE rn > 1);

-- Passo 2: Cria o índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarefa_entidade_unica
  ON tarefas (entidade_ref, entidade_ref_id)
  WHERE entidade_ref IS NOT NULL
    AND entidade_ref_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- OPCIONAL Opção B — Coluna "Solicitações em aprovação"
-- ---------------------------------------------------------------------------
-- Adiciona a nova coluna para cada setor de compras que já existe.
-- Atualiza a ordem das colunas existentes para acomodar a nova coluna
-- na posição visual correta (entre "Solicitações abertas" e "Rascunho").
-- ---------------------------------------------------------------------------

-- Passo 1: Abre espaço nas ordens existentes (shift +1 nas colunas que vêm depois)
UPDATE colunas_kanban ck
SET ordem = ordem + 1
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

-- Passo 2: Insere a nova coluna com ordem = 1 (após "Solicitações abertas" = 0)
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
ON CONFLICT DO NOTHING;
