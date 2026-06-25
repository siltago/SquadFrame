-- =============================================================================
-- Migration: 20260625000001_compras_fixes.sql
-- Objetos: sequence pedido_numero_seq, função gerar_numero_pedido,
--          constraint unique pedidos.numero, coluna evento_id em
--          compra_historico e assinatura_eventos, FK tarefas→pedidos,
--          índices ausentes.
-- Idempotente: usa IF NOT EXISTS em todos os objetos.
-- Sem DROP, sem TRUNCATE, sem perda de dados.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Tabela de eventos de domínio (event-bus)
-- Necessária antes das FKs que referenciam eventos_dominio.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_dominio (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       text        NOT NULL,
  payload    jsonb       NOT NULL DEFAULT '{}',
  company_id text        NOT NULL DEFAULT 'default',
  processado boolean     NOT NULL DEFAULT false,
  erro       text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_dominio_tipo
  ON eventos_dominio (tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_processado
  ON eventos_dominio (processado) WHERE NOT processado;
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_company
  ON eventos_dominio (company_id);

-- PRÉ-VÔOO OBRIGATÓRIO (executar antes desta migration):
-- Verificar se existem números duplicados em pedidos_compra.
-- Se a query abaixo retornar linhas, LIMPAR antes de aplicar o passo 3.
--
-- SELECT numero, COUNT(*) FROM pedidos_compra
-- GROUP BY numero HAVING COUNT(*) > 1;

-- ---------------------------------------------------------------------------
-- 1. Sequence para numeração atômica de pedidos
-- Inicia no próximo inteiro após o maior número puro existente.
-- Números no formato antigo (0001-0001, PC-xxx) são ignorados pelo filtro.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_ultimo integer;
BEGIN
  SELECT COALESCE(MAX(numero::integer), 543)
  INTO v_ultimo
  FROM pedidos_compra
  WHERE numero ~ '^\d+$';

  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq START %s INCREMENT 1',
    v_ultimo + 1
  );
END $$;

-- ---------------------------------------------------------------------------
-- 2. Função atômica de geração de número de pedido
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS text LANGUAGE sql AS $$
  SELECT nextval('pedido_numero_seq')::text;
$$;

-- ---------------------------------------------------------------------------
-- 3. Constraint UNIQUE em pedidos_compra.numero
-- Pré-condição: sem duplicatas (verificar com a query acima).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'pedidos_compra'
      AND constraint_name = 'pedidos_compra_numero_unique'
  ) THEN
    ALTER TABLE pedidos_compra
      ADD CONSTRAINT pedidos_compra_numero_unique UNIQUE (numero);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Idempotência de eventos — coluna evento_id em compra_historico
-- ---------------------------------------------------------------------------
ALTER TABLE compra_historico
  ADD COLUMN IF NOT EXISTS evento_id uuid
  REFERENCES eventos_dominio(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS compra_historico_evento_uniq
  ON compra_historico (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compra_historico_entidade
  ON compra_historico (entidade_id, criado_em DESC);

-- ---------------------------------------------------------------------------
-- 5. Idempotência de eventos — coluna evento_id em assinatura_eventos
-- ---------------------------------------------------------------------------
ALTER TABLE assinatura_eventos
  ADD COLUMN IF NOT EXISTS evento_id uuid
  REFERENCES eventos_dominio(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assinatura_eventos_evento_uniq
  ON assinatura_eventos (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. FK tarefas.pedido_id → pedidos_compra
-- Remove referências inválidas antes de adicionar a constraint.
-- ---------------------------------------------------------------------------
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
    WHERE table_schema = 'public'
      AND table_name   = 'tarefas'
      AND constraint_name = 'tarefas_pedido_id_fk'
  ) THEN
    ALTER TABLE tarefas
      ADD CONSTRAINT tarefas_pedido_id_fk
      FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Índices ausentes — todos idempotentes com IF NOT EXISTS
-- ---------------------------------------------------------------------------

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

-- recebimentos / recebimento_itens
CREATE INDEX IF NOT EXISTS idx_recebimentos_pedido
  ON recebimentos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_recebimento_itens_pedido_item
  ON recebimento_itens (pedido_item_id);

-- pedido_documentos / pedido_anotacoes
CREATE INDEX IF NOT EXISTS idx_pedido_docs_pedido
  ON pedido_documentos (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_anotacoes_pedido
  ON pedido_anotacoes (pedido_id);

-- eventos_dominio (analytics + worker)
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_analytics
  ON eventos_dominio (company_id, tipo, criado_em DESC);
