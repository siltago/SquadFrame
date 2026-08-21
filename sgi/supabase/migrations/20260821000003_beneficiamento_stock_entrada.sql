-- Trigger de crédito de estoque a partir do recebimento de beneficiamento —
-- espelha stock_fn_entrada_por_recebimento, lendo beneficiamento_itens em vez
-- de pedido_itens.
CREATE OR REPLACE FUNCTION stock_fn_entrada_por_recebimento_beneficiamento() RETURNS trigger AS $$
DECLARE
  v_produto_id uuid;
  v_cor_id     uuid;
  v_obra_id    uuid;
  v_local_id   uuid;
BEGIN
  SELECT bi.produto_cru_id, bi.cor_id, pb.obra_id
  INTO v_produto_id, v_cor_id, v_obra_id
  FROM beneficiamento_itens bi
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  JOIN pedidos_beneficiamento pb ON pb.id = b.pedido_beneficiamento_id
  WHERE bi.id = NEW.beneficiamento_item_id;

  SELECT id INTO v_local_id FROM stock_locais WHERE nome = 'Não alocado';

  IF v_produto_id IS NOT NULL AND v_local_id IS NOT NULL THEN
    INSERT INTO stock_movimentacoes (numero, produto_id, local_id, obra_id, cor_id, tipo, quantidade, origem_tipo, origem_id)
    VALUES (gerar_numero_movimento_estoque(), v_produto_id, v_local_id, v_obra_id, v_cor_id, 'ENTRADA', NEW.quantidade_recebida, 'recebimento_beneficiamento', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_stock_entrada_recebimento_beneficiamento ON beneficiamento_recebimento_itens;
CREATE TRIGGER trg_stock_entrada_recebimento_beneficiamento
AFTER INSERT ON beneficiamento_recebimento_itens
FOR EACH ROW EXECUTE FUNCTION stock_fn_entrada_por_recebimento_beneficiamento();
