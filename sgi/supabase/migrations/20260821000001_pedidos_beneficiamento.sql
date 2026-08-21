-- Separa o "pedido de beneficiamento" de pedidos_compra. Antes, criar um
-- beneficiamento criava uma linha DE VERDADE em pedidos_compra
-- (origem_contexto='BENEFICIAMENTO') — isso fazia o beneficiamento aparecer
-- misturado em Pedidos, nos KPIs, na cobrança automática e no gate de
-- conformidade, nenhum dos quais filtra por origem_contexto.
--
-- A partir desta migration, beneficiamentos NOVOS usam pedidos_beneficiamento
-- (entidade própria, "filho" de pedidos_compra, não um pedido de compra).
-- Beneficiamentos ANTIGOS continuam com pedido_pintura_id apontando pra uma
-- linha real de pedidos_compra — histórico intocado, sem backfill.

-- ---------------------------------------------------------------------------
-- 1. pedidos_beneficiamento — espelha as colunas de pedidos_compra que o
--    fluxo de beneficiamento realmente usa (status/carteira/valor final).
--    Sem numero próprio: beneficiamentos.numero (BNF-xxx) já é o
--    identificador visível.
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos_beneficiamento (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  status                   text          NOT NULL DEFAULT 'RASCUNHO',
  obra_id                  uuid          REFERENCES obras(id),
  fornecedor_id            uuid          NOT NULL REFERENCES fornecedores(id),
  forma_pagamento_id       uuid          REFERENCES formas_pagamento(id),
  comprador_id             uuid          REFERENCES usuarios(id),
  observacoes              text,
  prazo_entrega            date,
  valor_final              numeric(15,2),
  usa_carteira             boolean       NOT NULL DEFAULT false,
  debito_registrado        boolean       NOT NULL DEFAULT false,
  debito_status            text          CHECK (debito_status IS NULL OR debito_status IN ('APROVADO', 'REJEITADO')),
  debito_rejeitado_motivo  text,
  debito_decidido_por      uuid          REFERENCES usuarios(id) ON DELETE SET NULL,
  debito_decidido_em       timestamptz,
  criado_em                timestamptz   NOT NULL DEFAULT now(),
  atualizado_em            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedbenef_obra        ON pedidos_beneficiamento (obra_id);
CREATE INDEX idx_pedbenef_fornecedor  ON pedidos_beneficiamento (fornecedor_id);
CREATE INDEX idx_pedbenef_comprador   ON pedidos_beneficiamento (comprador_id);
CREATE INDEX idx_pedbenef_usa_carteira
  ON pedidos_beneficiamento (fornecedor_id, obra_id)
  WHERE usa_carteira = true AND debito_registrado = false;

ALTER TABLE pedidos_beneficiamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON pedidos_beneficiamento FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 2. beneficiamentos — pedido_pintura_id vira nullable (só preenchido em
--    beneficiamentos LEGADOS); novo pedido_beneficiamento_id (só
--    beneficiamentos NOVOS). Exatamente um dos dois deve estar preenchido.
-- ---------------------------------------------------------------------------
ALTER TABLE beneficiamentos
  ALTER COLUMN pedido_pintura_id DROP NOT NULL;

ALTER TABLE beneficiamentos
  ADD COLUMN pedido_beneficiamento_id uuid REFERENCES pedidos_beneficiamento(id);

CREATE INDEX idx_beneficiamentos_pedido_beneficiamento
  ON beneficiamentos (pedido_beneficiamento_id);

ALTER TABLE beneficiamentos
  ADD CONSTRAINT chk_beneficiamentos_um_dos_dois CHECK (
    (pedido_pintura_id IS NOT NULL AND pedido_beneficiamento_id IS NULL) OR
    (pedido_pintura_id IS NULL AND pedido_beneficiamento_id IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 3. beneficiamento_itens — pedido_item_pintura_id vira nullable (idem,
--    legado). Itens novos não geram mais um pedido_itens de verdade —
--    beneficiamento_itens já carrega produto_cru_id/cor_id/quantidade,
--    suficiente pra recebimento e crédito de estoque próprios.
-- ---------------------------------------------------------------------------
ALTER TABLE beneficiamento_itens
  ALTER COLUMN pedido_item_pintura_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Permissão de aprovação própria — pra beneficiamento parar de notificar
--    quem tem compras.pedido.aprovar (aprovador de pedido normal).
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.beneficiamento.aprovar', 'Aprovar pedido de beneficiamento', 'compras')
ON CONFLICT (chave) DO NOTHING;
