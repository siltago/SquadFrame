-- Tabelas de recebimento PRÓPRIAS pra pedidos_beneficiamento — espelham
-- recebimentos/recebimento_itens sem depender de pedidos_compra/pedido_itens.

CREATE TABLE beneficiamento_recebimentos (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_beneficiamento_id  uuid        NOT NULL REFERENCES pedidos_beneficiamento(id),
  responsavel_id            uuid        REFERENCES usuarios(id),
  data_recebimento          date        NOT NULL,
  observacoes               text,
  criado_em                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_benefrec_pedido ON beneficiamento_recebimentos (pedido_beneficiamento_id);

CREATE TABLE beneficiamento_recebimento_itens (
  id                      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id          uuid           NOT NULL REFERENCES beneficiamento_recebimentos(id) ON DELETE CASCADE,
  beneficiamento_item_id  uuid           NOT NULL REFERENCES beneficiamento_itens(id),
  quantidade_recebida     numeric(12,3)  NOT NULL,
  observacoes             text
);

CREATE INDEX idx_benefrecit_item ON beneficiamento_recebimento_itens (beneficiamento_item_id);

ALTER TABLE beneficiamento_recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON beneficiamento_recebimentos FOR SELECT TO authenticated USING (true);
ALTER TABLE beneficiamento_recebimento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_select" ON beneficiamento_recebimento_itens FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- RPC: registrar_recebimento_beneficiamento — espelha registrar_recebimento
-- (mesmo padrão: FOR SHARE, valida saldo, insert atômico).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_recebimento_beneficiamento(
  p_pedido_beneficiamento_id uuid,
  p_responsavel_id           uuid,
  p_data_recebimento         date,
  p_observacoes              text,
  p_itens                    jsonb  -- [{beneficiamento_item_id, quantidade_recebida, observacoes}]
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
  PERFORM 1 FROM beneficiamento_itens bi
  WHERE bi.id IN (SELECT (item->>'beneficiamento_item_id')::uuid FROM jsonb_array_elements(p_itens) AS item)
  FOR SHARE;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_itens) AS item
    JOIN beneficiamento_itens bi ON bi.id = (item->>'beneficiamento_item_id')::uuid
    LEFT JOIN (
      SELECT beneficiamento_item_id, SUM(quantidade_recebida) AS total
      FROM beneficiamento_recebimento_itens
      GROUP BY beneficiamento_item_id
    ) recebido ON recebido.beneficiamento_item_id = bi.id
    WHERE (item->>'quantidade_recebida')::numeric > 0
      AND (item->>'quantidade_recebida')::numeric > (bi.quantidade - COALESCE(recebido.total, 0))
  ) THEN
    RAISE EXCEPTION 'Quantidade recebida excede o saldo pendente de um ou mais itens.';
  END IF;

  INSERT INTO beneficiamento_recebimentos (pedido_beneficiamento_id, responsavel_id, data_recebimento, observacoes)
  VALUES (p_pedido_beneficiamento_id, p_responsavel_id, p_data_recebimento, p_observacoes)
  RETURNING id INTO v_rec_id;

  INSERT INTO beneficiamento_recebimento_itens (recebimento_id, beneficiamento_item_id, quantidade_recebida, observacoes)
  SELECT
    v_rec_id,
    (item->>'beneficiamento_item_id')::uuid,
    (item->>'quantidade_recebida')::numeric,
    NULLIF(item->>'observacoes', '')
  FROM jsonb_array_elements(p_itens) AS item
  WHERE (item->>'quantidade_recebida')::numeric > 0;

  SELECT status INTO v_status FROM pedidos_beneficiamento WHERE id = p_pedido_beneficiamento_id;

  RETURN jsonb_build_object('recebimento_id', v_rec_id, 'status_resultante', v_status);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_recebimento_beneficiamento(uuid, uuid, date, text, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Trigger — recalcula status de pedidos_beneficiamento após
-- insert/delete em beneficiamento_recebimento_itens. Mesma lógica de
-- fn_recalcular_status_pedido, só trocando as tabelas de origem.
-- beneficiamento_itens não tem pedido_beneficiamento_id direto — chega lá
-- via beneficiamento_itens.beneficiamento_id -> beneficiamentos.pedido_beneficiamento_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_status_pedido_beneficiamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_id   uuid;
  v_pendente    numeric;
  v_novo_status text;
BEGIN
  SELECT b.pedido_beneficiamento_id INTO v_pedido_id
  FROM beneficiamento_itens bi
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  WHERE bi.id = COALESCE(NEW.beneficiamento_item_id, OLD.beneficiamento_item_id);

  IF v_pedido_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(bi.quantidade), 0) - COALESCE(SUM(ri_total.total_recebido), 0)
  INTO v_pendente
  FROM beneficiamento_itens bi
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  LEFT JOIN (
    SELECT beneficiamento_item_id, SUM(quantidade_recebida) AS total_recebido
    FROM beneficiamento_recebimento_itens
    GROUP BY beneficiamento_item_id
  ) ri_total ON ri_total.beneficiamento_item_id = bi.id
  WHERE b.pedido_beneficiamento_id = v_pedido_id;

  v_novo_status := CASE WHEN v_pendente <= 0 THEN 'RECEBIDO' ELSE 'RECEBIDO_PARCIAL' END;

  UPDATE pedidos_beneficiamento
  SET status = v_novo_status, atualizado_em = now()
  WHERE id = v_pedido_id
    AND status IN ('AGUARDANDO_RECEBIMENTO', 'RECEBIDO_PARCIAL');

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_status_pedido_beneficiamento ON beneficiamento_recebimento_itens;
CREATE TRIGGER trg_recalcular_status_pedido_beneficiamento
  AFTER INSERT OR DELETE ON beneficiamento_recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_status_pedido_beneficiamento();
