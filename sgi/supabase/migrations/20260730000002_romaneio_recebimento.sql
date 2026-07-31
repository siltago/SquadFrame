-- =============================================================================
-- Romaneio de entrega (SquadFrame → Compras → Entregas) + início de
-- recebimento (SquadStock → Recebimento, ex-Chegadas).
--
-- Romaneio é lido por PDF (número, data, fornecedor, quais pedidos aparecem
-- nele) — sempre com revisão manual antes de confirmar, nunca persistido
-- direto da extração. Confirmado, vira um documento anexado em cada pedido
-- vinculado (pedido_documentos já existente, só ganha rastreio de origem).
--
-- "Iniciar recebimento" é só um timestamp leve em pedidos_compra (mesmo
-- padrão de marcador de fluxo já usado nesta sessão, ex: debito_status) —
-- não precisa de tabela nova pra isso.
-- =============================================================================

CREATE TABLE romaneios (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           text,
  data_entrega     date,
  fornecedor_id    uuid        REFERENCES fornecedores(id),
  arquivo_nome     text        NOT NULL,
  arquivo_caminho  text        NOT NULL,
  texto_extraido   text,
  criado_por       uuid        REFERENCES usuarios(id),
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_romaneios_fornecedor ON romaneios (fornecedor_id);

CREATE TABLE romaneio_pedidos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  romaneio_id  uuid NOT NULL REFERENCES romaneios(id) ON DELETE CASCADE,
  pedido_id    uuid NOT NULL REFERENCES pedidos_compra(id),
  UNIQUE (romaneio_id, pedido_id)
);

CREATE INDEX idx_romaneio_pedidos_pedido ON romaneio_pedidos (pedido_id);

ALTER TABLE romaneios        ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON romaneios FOR SELECT TO authenticated USING (true);

ALTER TABLE romaneio_pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON romaneio_pedidos FOR SELECT TO authenticated USING (true);

ALTER TABLE pedido_documentos ADD COLUMN IF NOT EXISTS romaneio_id uuid REFERENCES romaneios(id);
ALTER TABLE recebimentos      ADD COLUMN IF NOT EXISTS romaneio_id uuid REFERENCES romaneios(id);

ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS recebimento_iniciado_em timestamptz,
  ADD COLUMN IF NOT EXISTS recebimento_iniciado_por uuid REFERENCES usuarios(id);

-- ---------------------------------------------------------------------------
-- registrar_recebimento ganha p_romaneio_id — DROP explícito do overload de
-- 5 params antes de recriar com 6, senão fica um overload ambíguo (mesma
-- armadilha já vista com criar_pedido nesta sessão: CREATE OR REPLACE só
-- substitui quando a assinatura é idêntica; parâmetro novo cria uma segunda
-- função em vez de trocar a existente).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS registrar_recebimento(uuid, uuid, date, text, jsonb);

CREATE OR REPLACE FUNCTION registrar_recebimento(
  p_pedido_id        uuid,
  p_responsavel_id   uuid,
  p_data_recebimento date,
  p_observacoes      text,
  p_itens            jsonb,
  p_romaneio_id      uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec_id uuid;
  v_status text;
BEGIN
  PERFORM fn_exigir_permissao(p_responsavel_id, 'compras.recebimento.registrar');

  PERFORM 1 FROM pedido_itens WHERE pedido_id = p_pedido_id FOR SHARE;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_itens) AS item
    JOIN pedido_itens pi ON pi.id = (item->>'pedido_item_id')::uuid
    LEFT JOIN (
      SELECT pedido_item_id, SUM(quantidade_recebida) AS total
      FROM recebimento_itens
      WHERE pedido_item_id IN (
        SELECT id FROM pedido_itens WHERE pedido_id = p_pedido_id
      )
      GROUP BY pedido_item_id
    ) recebido ON recebido.pedido_item_id = pi.id
    WHERE (item->>'quantidade_recebida')::numeric
        > (pi.quantidade_pedida - COALESCE(recebido.total, 0))
      AND (item->>'quantidade_recebida')::numeric > 0
  ) THEN
    RAISE EXCEPTION 'Quantidade recebida excede o saldo pendente de um ou mais itens.';
  END IF;

  INSERT INTO recebimentos (pedido_id, responsavel_id, data_recebimento, observacoes, romaneio_id)
  VALUES (p_pedido_id, p_responsavel_id, p_data_recebimento, p_observacoes, p_romaneio_id)
  RETURNING id INTO v_rec_id;

  INSERT INTO recebimento_itens (recebimento_id, pedido_item_id, quantidade_recebida, observacoes)
  SELECT
    v_rec_id,
    (item->>'pedido_item_id')::uuid,
    (item->>'quantidade_recebida')::numeric,
    NULLIF(item->>'observacoes', '')
  FROM jsonb_array_elements(p_itens) AS item
  WHERE (item->>'quantidade_recebida')::numeric > 0;

  SELECT status INTO v_status FROM pedidos_compra WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'recebimento_id',    v_rec_id,
    'status_resultante', v_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_recebimento(uuid, uuid, date, text, jsonb, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.romaneio.criar',     'Fazer upload/confirmar romaneio de entrega', 'compras'),
  ('stock.recebimento.iniciar',  'Iniciar conferência de recebimento',         'STOCK')
ON CONFLICT (chave) DO NOTHING;
