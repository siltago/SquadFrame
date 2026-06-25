-- ============================================================
-- SGI — Migrations de correção do módulo de compras
-- Execute no SQL Editor do Supabase após compras.sql
--
-- Idempotente: usa IF NOT EXISTS / IF EXISTS em todos os comandos.
-- Pode ser executado múltiplas vezes sem efeitos colaterais.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SEQUENCE para numeração atômica de pedidos
-- ────────────────────────────────────────────────────────────

-- Cria sequence iniciando no próximo valor após o máximo atual
DO $$
DECLARE
  ultimo integer;
BEGIN
  SELECT COALESCE(MAX(numero::integer), 541) INTO ultimo
  FROM pedidos_compra
  WHERE numero ~ '^\d+$';          -- ignora números no formato antigo (NNNN-NNNN)

  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq START %s INCREMENT 1', ultimo + 1);
END $$;

CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS text LANGUAGE sql AS $$
  SELECT nextval('pedido_numero_seq')::text;
$$;

-- UNIQUE constraint (pode falhar se houver duplicatas: limpe antes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'pedidos_compra'
      AND constraint_name = 'pedidos_compra_numero_unique'
  ) THEN
    ALTER TABLE pedidos_compra ADD CONSTRAINT pedidos_compra_numero_unique UNIQUE (numero);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. IDEMPOTÊNCIA — coluna evento_id em compra_historico
-- ────────────────────────────────────────────────────────────

ALTER TABLE compra_historico
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES eventos_dominio(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS compra_historico_evento_uniq
  ON compra_historico (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compra_historico_entidade
  ON compra_historico (entidade_id, criado_em DESC);

-- ────────────────────────────────────────────────────────────
-- 3. IDEMPOTÊNCIA — coluna evento_id em assinatura_eventos
-- ────────────────────────────────────────────────────────────

ALTER TABLE assinatura_eventos
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES eventos_dominio(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assinatura_eventos_evento_uniq
  ON assinatura_eventos (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 4. FK tarefas.pedido_id → pedidos_compra
-- ────────────────────────────────────────────────────────────

-- Limpa referências inválidas antes de adicionar a FK
UPDATE tarefas
SET pedido_id = NULL
WHERE pedido_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pedidos_compra WHERE id = tarefas.pedido_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tarefas'
      AND constraint_name = 'tarefas_pedido_id_fk'
  ) THEN
    ALTER TABLE tarefas
      ADD CONSTRAINT tarefas_pedido_id_fk
      FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. ÍNDICES ausentes (todos idempotentes com IF NOT EXISTS)
-- ────────────────────────────────────────────────────────────

-- pedidos_compra
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status
  ON pedidos_compra (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_fornecedor
  ON pedidos_compra (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_obra
  ON pedidos_compra (obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_comprador
  ON pedidos_compra (comprador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_numero
  ON pedidos_compra (numero);

-- pedido_itens
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido
  ON pedido_itens (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_sol_item
  ON pedido_itens (solicitacao_item_id) WHERE solicitacao_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto
  ON pedido_itens (produto_id);

-- solicitacoes_compra
CREATE INDEX IF NOT EXISTS idx_sol_compra_status
  ON solicitacoes_compra (status);
CREATE INDEX IF NOT EXISTS idx_sol_compra_solicitante
  ON solicitacoes_compra (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_sol_compra_obra
  ON solicitacoes_compra (obra_id) WHERE obra_id IS NOT NULL;

-- solicitacao_itens
CREATE INDEX IF NOT EXISTS idx_sol_itens_solicitacao
  ON solicitacao_itens (solicitacao_id);

-- recebimentos
CREATE INDEX IF NOT EXISTS idx_recebimentos_pedido
  ON recebimentos (pedido_id);

-- recebimento_itens
CREATE INDEX IF NOT EXISTS idx_recebimento_itens_pedido_item
  ON recebimento_itens (pedido_item_id);

-- pedido_documentos / pedido_anotacoes
CREATE INDEX IF NOT EXISTS idx_pedido_docs_pedido
  ON pedido_documentos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_anotacoes_pedido
  ON pedido_anotacoes (pedido_id);

-- compra_historico  (já criado acima, garante idempotência)
CREATE INDEX IF NOT EXISTS idx_compra_historico_entidade
  ON compra_historico (entidade_id, criado_em DESC);

-- eventos_dominio (analytic + worker)
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_analytics
  ON eventos_dominio (company_id, tipo, criado_em DESC);

-- ────────────────────────────────────────────────────────────
-- 6. CHECK CONSTRAINT em pedidos_compra.status
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'pedidos_compra'
      AND constraint_name = 'pedidos_compra_status_check'
  ) THEN
    ALTER TABLE pedidos_compra
      ADD CONSTRAINT pedidos_compra_status_check
      CHECK (status IN (
        'RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO',
        'AGUARDANDO_RECEBIMENTO', 'RECEBIDO_PARCIAL',
        'RECEBIDO', 'FINALIZADO', 'CANCELADO'
      ));
  END IF;
END $$;
