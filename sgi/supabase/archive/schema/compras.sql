-- ============================================================
-- SGI — Schema Definitivo do Módulo de Compras
-- Execute APÓS: schema.sql, catalogo.sql, assinaturas.sql, event-bus.sql
--
-- Tabelas cobertas:
--   formas_pagamento, fornecedores (extensões), solicitacoes_compra,
--   solicitacao_itens, pedidos_compra, pedido_itens, recebimentos,
--   recebimento_itens, pedido_documentos, pedido_anotacoes, compra_historico
--
-- Este arquivo é o DDL oficial do módulo.
-- Toda alteração de schema deve ser documentada aqui E em um
-- arquivo de migration incremental separado.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SEQUENCES
-- ────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS solicitacao_numero_seq START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq     START 542 INCREMENT 1;

-- Função atômica — garante número único mesmo em requests concorrentes
CREATE OR REPLACE FUNCTION gerar_numero_pedido()
RETURNS text LANGUAGE sql AS $$
  SELECT nextval('pedido_numero_seq')::text;
$$;

-- ────────────────────────────────────────────────────────────
-- FORMAS DE PAGAMENTO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        NOT NULL,
  descricao   text,
  ativo       boolean     NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- FORNECEDORES  (tabela base criada em catalogo.sql; este bloco
-- documenta todas as colunas após as migrations incrementais)
-- ────────────────────────────────────────────────────────────

-- Colunas adicionadas por migrations (documentadas aqui para referência):
--   fornecedores-endereco.sql  : razao_social, endereco, numero, complemento,
--                                bairro, cidade, estado, cep
--   fornecedores-contato.sql   : contato
--   fornecedor-tipos.sql       : tipos text[] NOT NULL DEFAULT '{}'
--   catalogo.sql (base)        : id, nome, ativo, criado_em
--   pedido-tipo-codigos...sql  : produto_aliases.fornecedor_id (ver catalogo)

-- Coluna faltante documentada (adicionar se ausente):
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS cnpj    text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS email   text;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS telefone text;

-- ────────────────────────────────────────────────────────────
-- SOLICITAÇÕES DE COMPRA
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS solicitacoes_compra (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          text        NOT NULL DEFAULT nextval('solicitacao_numero_seq')::text,
  obra_id         uuid        REFERENCES obras(id) ON DELETE SET NULL,
  origem          text        NOT NULL,
  prioridade      text        NOT NULL DEFAULT 'NORMAL'
                              CHECK (prioridade IN ('NORMAL', 'URGENTE', 'CRITICA')),
  justificativa   text,
  observacoes     text,
  solicitante_id  uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'ABERTA'
                              CHECK (status IN (
                                'ABERTA', 'AGUARDANDO_APROVACAO', 'APROVADA',
                                'REJEITADA', 'CANCELADA', 'EM_PEDIDO'
                              )),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS solicitacoes_compra_numero_uniq ON solicitacoes_compra (numero);
CREATE INDEX IF NOT EXISTS idx_sol_compra_status      ON solicitacoes_compra (status);
CREATE INDEX IF NOT EXISTS idx_sol_compra_solicitante ON solicitacoes_compra (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_sol_compra_obra        ON solicitacoes_compra (obra_id) WHERE obra_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- ITENS DA SOLICITAÇÃO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS solicitacao_itens (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id   uuid        NOT NULL REFERENCES solicitacoes_compra(id) ON DELETE CASCADE,
  produto_id       uuid        REFERENCES produtos(id) ON DELETE RESTRICT,  -- nullable: itens externos
  descricao_manual text,                                                     -- obrigatório se produto_id NULL
  quantidade       numeric     NOT NULL CHECK (quantidade > 0),
  unidade          text        NOT NULL DEFAULT 'UN',
  observacoes      text,
  cor_id           uuid        REFERENCES cores_ral(id) ON DELETE SET NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sol_item_descricao_check
    CHECK (produto_id IS NOT NULL OR descricao_manual IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_sol_itens_solicitacao ON solicitacao_itens (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_sol_itens_produto     ON solicitacao_itens (produto_id) WHERE produto_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- PEDIDOS DE COMPRA
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              text        NOT NULL UNIQUE DEFAULT gerar_numero_pedido(),
  obra_id             uuid        REFERENCES obras(id) ON DELETE SET NULL,
  fornecedor_id       uuid        NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  forma_pagamento_id  uuid        REFERENCES formas_pagamento(id) ON DELETE SET NULL,
  comprador_id        uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  status              text        NOT NULL DEFAULT 'RASCUNHO'
                                  CHECK (status IN (
                                    'RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO',
                                    'AGUARDANDO_RECEBIMENTO', 'RECEBIDO_PARCIAL',
                                    'RECEBIDO', 'FINALIZADO', 'CANCELADO'
                                  )),
  observacoes         text,
  tipo_linha          text,                         -- ex: 'vidro', 'perfil'
  cor_id              uuid        REFERENCES cores_ral(id) ON DELETE SET NULL,
  prazo_entrega       date,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_status     ON pedidos_compra (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_fornecedor ON pedidos_compra (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_obra       ON pedidos_compra (obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_comprador  ON pedidos_compra (comprador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_numero     ON pedidos_compra (numero);  -- suporte a busca por número

-- ────────────────────────────────────────────────────────────
-- ITENS DO PEDIDO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_itens (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id             uuid        NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  produto_id            uuid        NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  descricao_snapshot    text        NOT NULL,   -- snapshot do nome no momento do pedido
  quantidade_pedida     numeric     NOT NULL CHECK (quantidade_pedida > 0),
  unidade               text        NOT NULL DEFAULT 'UN',
  preco_unitario        numeric     CHECK (preco_unitario >= 0),
  codigo_fornecedor     text,
  produto_fornecedor_id uuid        REFERENCES produto_fornecedores(id) ON DELETE SET NULL,
  solicitacao_item_id   uuid        REFERENCES solicitacao_itens(id) ON DELETE SET NULL,
  obra_id               uuid        REFERENCES obras(id) ON DELETE SET NULL,
  -- dimensões para itens CHAPA (vidro, etc.)
  largura_m             numeric,
  altura_m              numeric,
  qtd_pecas             integer,
  cor_id                uuid        REFERENCES cores_ral(id) ON DELETE SET NULL,
  criado_em             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido   ON pedido_itens (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_sol_item ON pedido_itens (solicitacao_item_id)
  WHERE solicitacao_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto  ON pedido_itens (produto_id);

-- ────────────────────────────────────────────────────────────
-- VIEW: saldo pendente de recebimento por item
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_pedido_itens AS
WITH recebidos AS (
  SELECT pedido_item_id, SUM(quantidade_recebida) AS total_recebido
  FROM recebimento_itens
  GROUP BY pedido_item_id
)
SELECT
  pi.*,
  COALESCE(r.total_recebido, 0)                               AS quantidade_recebida,
  pi.quantidade_pedida - COALESCE(r.total_recebido, 0)        AS saldo_pendente
FROM pedido_itens pi
LEFT JOIN recebidos r ON r.pedido_item_id = pi.id;

-- ────────────────────────────────────────────────────────────
-- RECEBIMENTOS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recebimentos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         uuid        NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  responsavel_id    uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  data_recebimento  date        NOT NULL,
  observacoes       text,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recebimentos_pedido ON recebimentos (pedido_id);

-- ────────────────────────────────────────────────────────────
-- ITENS DO RECEBIMENTO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recebimento_itens (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id      uuid        NOT NULL REFERENCES recebimentos(id) ON DELETE CASCADE,
  pedido_item_id      uuid        NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  quantidade_recebida numeric     NOT NULL CHECK (quantidade_recebida > 0),
  observacoes         text,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recebimento_itens_recebimento ON recebimento_itens (recebimento_id);
CREATE INDEX IF NOT EXISTS idx_recebimento_itens_pedido_item ON recebimento_itens (pedido_item_id);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTOS DO PEDIDO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_documentos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id        uuid        NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  usuario_id       uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  nome_arquivo     text        NOT NULL,
  caminho_storage  text        NOT NULL,
  tamanho_bytes    bigint,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_docs_pedido ON pedido_documentos (pedido_id);

-- Bucket Storage para documentos de pedidos (rodar no Dashboard ou via API):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pedido-docs', 'pedido-docs', false) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- ANOTAÇÕES DO PEDIDO
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_anotacoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      uuid        NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  usuario_id     uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  texto          text        NOT NULL,
  status_pedido  text,       -- snapshot do status no momento da anotação
  criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_anotacoes_pedido ON pedido_anotacoes (pedido_id);

-- ────────────────────────────────────────────────────────────
-- HISTÓRICO DE COMPRAS  (audit trail append-only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compra_historico (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade     text        NOT NULL,   -- 'pedido' | 'solicitacao'
  entidade_id  uuid        NOT NULL,   -- ID do pedido ou solicitação
  usuario_id   uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  acao         text        NOT NULL,
  dados        jsonb       NOT NULL DEFAULT '{}',
  evento_id    uuid        REFERENCES eventos_dominio(id) ON DELETE SET NULL,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

-- Índice principal para leitura do histórico de uma entidade
CREATE INDEX IF NOT EXISTS idx_compra_historico_entidade
  ON compra_historico (entidade_id, criado_em DESC);

-- Índice para idempotência: mesmo evento não gera entrada duplicada
CREATE UNIQUE INDEX IF NOT EXISTS compra_historico_evento_uniq
  ON compra_historico (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- ASSINATURA_EVENTOS  (idempotência — adicionar coluna evento_id)
-- (tabela base criada em assinaturas.sql)
-- ────────────────────────────────────────────────────────────

ALTER TABLE assinatura_eventos
  ADD COLUMN IF NOT EXISTS evento_id uuid REFERENCES eventos_dominio(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assinatura_eventos_evento_uniq
  ON assinatura_eventos (entidade_id, acao, evento_id)
  WHERE evento_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- RLS  (admin client bypassa via service_role)
-- ────────────────────────────────────────────────────────────

ALTER TABLE formas_pagamento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacao_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimento_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_documentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_anotacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_historico   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado_le_formas_pagamento"    ON formas_pagamento    FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_solicitacoes"        ON solicitacoes_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_solicitacao_itens"   ON solicitacao_itens   FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedidos"             ON pedidos_compra      FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedido_itens"        ON pedido_itens        FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_recebimentos"        ON recebimentos        FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_recebimento_itens"   ON recebimento_itens   FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedido_docs"         ON pedido_documentos   FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedido_anotacoes"    ON pedido_anotacoes    FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_compra_historico"    ON compra_historico    FOR SELECT TO authenticated USING (true);
