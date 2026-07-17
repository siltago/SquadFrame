-- ============================================================
-- Retorno de Pedido e Devolução de Pedido
-- Retorno: antes de qualquer recebimento — pedido volta para aprovação
-- Devolução: após recebimento — devolução formal ao fornecedor
-- ============================================================

-- ── Retorno de Pedido ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pedido_retornos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       uuid        NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  etapa_anterior  text        NOT NULL,
  motivo          text        NOT NULL,
  motivo_rejeicao text,
  alteracoes      jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'PENDENTE'
                              CHECK (status IN ('PENDENTE','APROVADO','REJEITADO')),
  criado_por      uuid        REFERENCES usuarios(id),
  aprovado_por    uuid        REFERENCES usuarios(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  resolvido_em    timestamptz
);

CREATE INDEX IF NOT EXISTS pedido_retornos_pedido_idx ON pedido_retornos(pedido_id);
CREATE INDEX IF NOT EXISTS pedido_retornos_status_idx ON pedido_retornos(status);

-- Flag no pedido para indicar retorno pendente (nullable = sem retorno)
ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS retorno_pendente_id uuid REFERENCES pedido_retornos(id);

-- ── Devolução de Pedido ───────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS devolucao_numero_seq START 1;

CREATE OR REPLACE FUNCTION gerar_numero_devolucao()
RETURNS text LANGUAGE sql AS $$
  SELECT 'DEV-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('devolucao_numero_seq')::text, 4, '0');
$$;

CREATE TABLE IF NOT EXISTS devolucoes_compra (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero        text        NOT NULL UNIQUE,
  pedido_id     uuid        NOT NULL REFERENCES pedidos_compra(id),
  fornecedor_id uuid        REFERENCES fornecedores(id),
  obra_id       uuid        REFERENCES obras(id),
  motivo        text        NOT NULL,
  status        text        NOT NULL DEFAULT 'RASCUNHO'
                            CHECK (status IN ('RASCUNHO','AGUARDANDO_APROVACAO','APROVADO','ENVIO','ENTREGUE','CANCELADO')),
  valor_total   numeric(14,2),
  usa_carteira  boolean     NOT NULL DEFAULT false,
  criado_por    uuid        REFERENCES usuarios(id),
  aprovado_por  uuid        REFERENCES usuarios(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz
);

CREATE TABLE IF NOT EXISTS devolucao_itens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucao_id    uuid        NOT NULL REFERENCES devolucoes_compra(id) ON DELETE CASCADE,
  pedido_item_id  uuid        REFERENCES pedido_itens(id),
  descricao_snapshot text     NOT NULL,
  quantidade      numeric(12,3) NOT NULL,
  unidade         text        NOT NULL DEFAULT 'UN',
  preco_unitario  numeric(15,4)
);

CREATE INDEX IF NOT EXISTS devolucoes_pedido_idx ON devolucoes_compra(pedido_id);
CREATE INDEX IF NOT EXISTS devolucao_itens_dev_idx ON devolucao_itens(devolucao_id);

-- ── Permissões ────────────────────────────────────────────────────────────────

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.pedido.retornar',         'Abrir retorno de pedido de compra',            'compras'),
  ('compras.pedido.aprovar_retorno',  'Aprovar ou rejeitar retorno de pedido',         'compras'),
  ('compras.pedido.devolver',         'Criar devolução de pedido de compra',           'compras'),
  ('compras.pedido.aprovar_devolucao','Aprovar ou rejeitar devolução de pedido',       'compras')
ON CONFLICT (chave) DO NOTHING;

-- ── RPC: aprovar_retorno_pedido ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION aprovar_retorno_pedido(
  p_retorno_id uuid,
  p_usuario_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_retorno pedido_retornos%ROWTYPE;
  v_alt     jsonb;
  v_item    jsonb;
BEGIN
  SELECT * INTO v_retorno FROM pedido_retornos WHERE id = p_retorno_id FOR UPDATE;
  IF NOT FOUND        THEN RAISE EXCEPTION 'Retorno não encontrado.'; END IF;
  IF v_retorno.status != 'PENDENTE' THEN RAISE EXCEPTION 'Retorno não está pendente.'; END IF;

  v_alt := v_retorno.alteracoes;

  -- Atualiza campos do pedido e libera o retorno pendente
  UPDATE pedidos_compra SET
    retorno_pendente_id = NULL,
    status              = v_retorno.etapa_anterior,
    fornecedor_id       = COALESCE(NULLIF(v_alt->>'fornecedor_id','')::uuid, fornecedor_id),
    obra_id             = NULLIF(v_alt->>'obra_id','')::uuid,
    forma_pagamento_id  = NULLIF(v_alt->>'forma_pagamento_id','')::uuid,
    cor_id              = NULLIF(v_alt->>'cor_id','')::uuid,
    observacoes         = NULLIF(v_alt->>'observacoes',''),
    prazo_entrega       = NULLIF(v_alt->>'prazo_entrega','')::date
  WHERE id = v_retorno.pedido_id;

  -- Substitui itens do pedido
  DELETE FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_alt->'itens') LOOP
    INSERT INTO pedido_itens (
      pedido_id, produto_id, descricao_snapshot, quantidade_pedida, unidade,
      preco_unitario, codigo_fornecedor, obra_id, largura_m, altura_m, qtd_pecas, cor_id
    ) VALUES (
      v_retorno.pedido_id,
      NULLIF(v_item->>'produto_id','')::uuid,
      v_item->>'descricao_snapshot',
      (v_item->>'quantidade_pedida')::numeric,
      COALESCE(NULLIF(v_item->>'unidade',''), 'UN'),
      NULLIF(v_item->>'preco_unitario','')::numeric,
      NULLIF(v_item->>'codigo_fornecedor',''),
      NULLIF(v_item->>'obra_id','')::uuid,
      NULLIF(v_item->>'largura_m','')::numeric,
      NULLIF(v_item->>'altura_m','')::numeric,
      NULLIF(v_item->>'qtd_pecas','')::numeric,
      NULLIF(v_item->>'cor_id','')::uuid
    );
  END LOOP;

  -- Marca retorno como aprovado
  UPDATE pedido_retornos SET
    status       = 'APROVADO',
    aprovado_por = p_usuario_id,
    resolvido_em = now()
  WHERE id = p_retorno_id;

  INSERT INTO compra_historico (entidade, entidade_id, acao, dados, usuario_id)
  VALUES ('pedido', v_retorno.pedido_id, 'RETORNO_APROVADO',
    jsonb_build_object('retorno_id', p_retorno_id, 'etapa_anterior', v_retorno.etapa_anterior, 'motivo', v_retorno.motivo),
    p_usuario_id);
END;
$$;

-- ── RPC: rejeitar_retorno_pedido ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rejeitar_retorno_pedido(
  p_retorno_id     uuid,
  p_usuario_id     uuid,
  p_motivo_rejeicao text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_retorno pedido_retornos%ROWTYPE;
BEGIN
  SELECT * INTO v_retorno FROM pedido_retornos WHERE id = p_retorno_id FOR UPDATE;
  IF NOT FOUND        THEN RAISE EXCEPTION 'Retorno não encontrado.'; END IF;
  IF v_retorno.status != 'PENDENTE' THEN RAISE EXCEPTION 'Retorno não está pendente.'; END IF;

  UPDATE pedido_retornos SET
    status           = 'REJEITADO',
    motivo_rejeicao  = p_motivo_rejeicao,
    aprovado_por     = p_usuario_id,
    resolvido_em     = now()
  WHERE id = p_retorno_id;

  UPDATE pedidos_compra SET retorno_pendente_id = NULL WHERE id = v_retorno.pedido_id;

  INSERT INTO compra_historico (entidade, entidade_id, acao, dados, usuario_id)
  VALUES ('pedido', v_retorno.pedido_id, 'RETORNO_REJEITADO',
    jsonb_build_object('retorno_id', p_retorno_id, 'motivo_rejeicao', p_motivo_rejeicao),
    p_usuario_id);
END;
$$;

-- ── RPC: registrar_entrega_devolucao ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION registrar_entrega_devolucao(
  p_devolucao_id uuid,
  p_usuario_id   uuid
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_dev  devolucoes_compra%ROWTYPE;
  v_ped  pedidos_compra%ROWTYPE;
  v_cart carteiras%ROWTYPE;
BEGIN
  SELECT * INTO v_dev FROM devolucoes_compra WHERE id = p_devolucao_id FOR UPDATE;
  IF NOT FOUND     THEN RAISE EXCEPTION 'Devolução não encontrada.'; END IF;
  IF v_dev.status != 'ENVIO' THEN RAISE EXCEPTION 'Devolução precisa estar em ENVIO para ser entregue.'; END IF;

  UPDATE devolucoes_compra SET status = 'ENTREGUE', resolvido_em = now() WHERE id = p_devolucao_id;

  -- Crédito na carteira se usa_carteira e tem valor
  IF v_dev.usa_carteira AND v_dev.valor_total IS NOT NULL AND v_dev.valor_total > 0 THEN
    SELECT * INTO v_ped FROM pedidos_compra WHERE id = v_dev.pedido_id;

    IF v_ped.obra_id IS NOT NULL AND v_ped.fornecedor_id IS NOT NULL THEN
      INSERT INTO carteiras (obra_id, fornecedor_id, saldo_atual)
      VALUES (v_ped.obra_id, v_ped.fornecedor_id, 0)
      ON CONFLICT (obra_id, fornecedor_id) DO NOTHING;

      SELECT * INTO v_cart
      FROM carteiras WHERE obra_id = v_ped.obra_id AND fornecedor_id = v_ped.fornecedor_id
      FOR UPDATE;

      INSERT INTO carteira_movimentacoes (carteira_id, tipo, valor, referencia_tipo, referencia_id, descricao, usuario_id)
      VALUES (v_cart.id, 'DEPOSITO', v_dev.valor_total, 'devolucao', p_devolucao_id,
        'Estorno por devolução ' || v_dev.numero, p_usuario_id);

      UPDATE carteiras SET saldo_atual = saldo_atual + v_dev.valor_total, atualizado_em = now()
      WHERE id = v_cart.id;
    END IF;
  END IF;

  INSERT INTO compra_historico (entidade, entidade_id, acao, dados, usuario_id)
  VALUES ('pedido', v_dev.pedido_id, 'DEVOLUCAO_ENTREGUE',
    jsonb_build_object('devolucao_id', p_devolucao_id, 'numero', v_dev.numero, 'valor', v_dev.valor_total),
    p_usuario_id);
END;
$$;
