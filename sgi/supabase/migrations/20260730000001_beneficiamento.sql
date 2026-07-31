-- =============================================================================
-- Beneficiamento de Pedido — quando um perfil é comprado na cor natural (cru)
-- e precisa ser mandado pintar antes de ir pra obra. Gera um pedido de
-- compra de verdade (fornecedor = quem faz o beneficiamento), passando pelo
-- mesmo fluxo de aprovação/valor final/carteira de qualquer pedido — não é
-- um controle paralelo.
--
-- Cru e pintado são produtos DIFERENTES no catálogo (SKUs distintos) — é o
-- único jeito de ter estoque certo, já que stock_saldos/stock_movimentacoes
-- não têm dimensão de cor, só produto_id.
-- =============================================================================

ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS faz_beneficiamento boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN fornecedores.faz_beneficiamento IS
  'Fornecedor presta serviço de beneficiamento (pintura, etc — genérico, não só pintura). Filtra o seletor na criação de um beneficiamento.';

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

CREATE TABLE beneficiamentos (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             text        NOT NULL UNIQUE,
  pedido_origem_id   uuid        NOT NULL REFERENCES pedidos_compra(id),
  pedido_pintura_id  uuid        NOT NULL REFERENCES pedidos_compra(id),
  obra_id            uuid        REFERENCES obras(id),
  rota               text        NOT NULL CHECK (rota IN ('VIA_FABRICA', 'DIRETO_FORNECEDOR')),
  status             text        NOT NULL DEFAULT 'AGUARDANDO_ENVIO'
                        CHECK (status IN ('AGUARDANDO_ENVIO', 'ENVIADO', 'CONCLUIDO', 'CANCELADO')),
  observacoes        text,
  criado_por         uuid        REFERENCES usuarios(id),
  criado_em          timestamptz NOT NULL DEFAULT now(),
  enviado_em         timestamptz,
  concluido_em       timestamptz
);

CREATE INDEX idx_beneficiamentos_pedido_origem ON beneficiamentos (pedido_origem_id);
CREATE INDEX idx_beneficiamentos_pedido_pintura ON beneficiamentos (pedido_pintura_id);
CREATE INDEX idx_beneficiamentos_obra ON beneficiamentos (obra_id);

CREATE TABLE beneficiamento_itens (
  id                      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id       uuid           NOT NULL REFERENCES beneficiamentos(id) ON DELETE CASCADE,
  pedido_item_origem_id   uuid           NOT NULL REFERENCES pedido_itens(id),
  pedido_item_pintura_id  uuid           NOT NULL REFERENCES pedido_itens(id),
  produto_cru_id          uuid           NOT NULL REFERENCES produtos(id),
  produto_pintado_id      uuid           NOT NULL REFERENCES produtos(id),
  quantidade              numeric(12,3)  NOT NULL
);

CREATE INDEX idx_beneficiamento_itens_beneficiamento ON beneficiamento_itens (beneficiamento_id);

ALTER TABLE beneficiamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON beneficiamentos FOR SELECT TO authenticated USING (true);

ALTER TABLE beneficiamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON beneficiamento_itens FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Numeração — mesmo padrão de pedido_numero_seq (gerar_numero_pedido).
-- ---------------------------------------------------------------------------
CREATE SEQUENCE beneficiamento_numero_seq START 1;

-- ---------------------------------------------------------------------------
-- RPC: criar_beneficiamento — atômica (pedido de pintura + beneficiamento +
-- itens numa transação só). Mesmo formato de insert de pedidos_compra/
-- pedido_itens que criar_pedido usa, mas em loop pra conseguir gravar, item
-- a item, o vínculo pedido_item_origem_id <-> pedido_item_pintura_id sem
-- depender de RETURNING preservar ordem de um INSERT...SELECT em lote.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_beneficiamento(
  p_numero              text,   -- número do pedido de pintura (gerar_numero_pedido, gerado no app)
  p_pedido_origem_id    uuid,
  p_rota                text,
  p_obra_id             uuid,
  p_fornecedor_id       uuid,
  p_forma_pagamento_id  uuid,
  p_comprador_id        uuid,
  p_observacoes         text,
  p_itens               jsonb   -- [{pedido_item_origem_id, produto_cru_id, produto_pintado_id, descricao_snapshot, quantidade, unidade}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_pintura_id uuid;
  v_beneficiamento_id uuid;
  v_numero_benef      text;
  v_pedido_item_id    uuid;
  item                jsonb;
BEGIN
  PERFORM fn_exigir_permissao(p_comprador_id, 'compras.beneficiamento.criar');

  IF p_rota NOT IN ('VIA_FABRICA', 'DIRETO_FORNECEDOR') THEN
    RAISE EXCEPTION 'Rota inválida: %', p_rota;
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um item pra beneficiar.';
  END IF;

  INSERT INTO pedidos_compra (
    numero, obra_id, fornecedor_id, forma_pagamento_id, comprador_id, observacoes, origem_contexto
  ) VALUES (
    p_numero, p_obra_id, p_fornecedor_id, p_forma_pagamento_id, p_comprador_id, p_observacoes, 'BENEFICIAMENTO'
  )
  RETURNING id INTO v_pedido_pintura_id;

  v_numero_benef := 'BNF-' || nextval('beneficiamento_numero_seq')::text;

  INSERT INTO beneficiamentos (
    numero, pedido_origem_id, pedido_pintura_id, obra_id, rota, criado_por, observacoes
  ) VALUES (
    v_numero_benef, p_pedido_origem_id, v_pedido_pintura_id, p_obra_id, p_rota, p_comprador_id, p_observacoes
  )
  RETURNING id INTO v_beneficiamento_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    INSERT INTO pedido_itens (pedido_id, produto_id, descricao_snapshot, quantidade_pedida, unidade)
    VALUES (
      v_pedido_pintura_id,
      (item->>'produto_pintado_id')::uuid,
      item->>'descricao_snapshot',
      (item->>'quantidade')::numeric,
      item->>'unidade'
    )
    RETURNING id INTO v_pedido_item_id;

    INSERT INTO beneficiamento_itens (
      beneficiamento_id, pedido_item_origem_id, pedido_item_pintura_id,
      produto_cru_id, produto_pintado_id, quantidade
    ) VALUES (
      v_beneficiamento_id,
      (item->>'pedido_item_origem_id')::uuid,
      v_pedido_item_id,
      (item->>'produto_cru_id')::uuid,
      (item->>'produto_pintado_id')::uuid,
      (item->>'quantidade')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_beneficiamento_id,
    'numero', v_numero_benef,
    'pedido_pintura_id', v_pedido_pintura_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION criar_beneficiamento(text, uuid, text, uuid, uuid, uuid, uuid, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Conclusão automática: quando o pedido de pintura chega em RECEBIDO (fluxo
-- normal de registrar_recebimento, sem mudar nada nele), o beneficiamento
-- correspondente vira CONCLUIDO sozinho. O crédito de estoque do produto
-- pintado já acontece via stock_fn_entrada_por_recebimento (existente, não
-- muda) — o pedido_item aponta pro produto pintado desde a criação.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_concluir_beneficiamento_ao_receber() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'RECEBIDO' AND (OLD.status IS DISTINCT FROM 'RECEBIDO') THEN
    UPDATE beneficiamentos
    SET status = 'CONCLUIDO', concluido_em = now()
    WHERE pedido_pintura_id = NEW.id
      AND status NOT IN ('CONCLUIDO', 'CANCELADO');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_concluir_beneficiamento
AFTER UPDATE OF status ON pedidos_compra
FOR EACH ROW EXECUTE FUNCTION fn_concluir_beneficiamento_ao_receber();

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.beneficiamento.criar',     'Criar beneficiamento de pedido',       'compras'),
  ('compras.beneficiamento.gerenciar', 'Avançar/cancelar beneficiamento',      'compras')
ON CONFLICT (chave) DO NOTHING;
