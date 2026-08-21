-- confirmar_debito_carteira_beneficiamento / rejeitar_debito_beneficiamento —
-- espelham confirmar_debito_carteira/rejeitar_debito_pedido (pool por
-- fornecedor_id, mesma prioridade obra-própria primeiro), operando em
-- pedidos_beneficiamento em vez de pedidos_compra. Sem o fallback de somar
-- preco_unitario*quantidade_pedida dos itens (beneficiamento não tem preço
-- por item) — exige valor_final explícito.
CREATE OR REPLACE FUNCTION confirmar_debito_carteira_beneficiamento(
  p_pedido_beneficiamento_id uuid,
  p_usuario_id               uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido      record;
  v_valor       numeric;
  v_saldo_pool  numeric;
  v_restante    numeric;
  v_debitado    numeric;
  v_carteira    record;
  v_mov_id      uuid;
  v_movs        jsonb := '[]'::jsonb;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.pedido.confirmar_debito');

  SELECT obra_id, fornecedor_id, valor_final, usa_carteira, debito_registrado
  INTO v_pedido
  FROM pedidos_beneficiamento
  WHERE id = p_pedido_beneficiamento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido de beneficiamento não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT v_pedido.usa_carteira THEN
    RAISE EXCEPTION 'Este pedido não utiliza faturamento direto da carteira.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_pedido.debito_registrado THEN
    RAISE EXCEPTION 'Débito já foi registrado para este pedido (idempotência).' USING ERRCODE = 'unique_violation';
  END IF;

  v_valor := v_pedido.valor_final;
  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'O pedido não possui valor definido. Registre o valor final antes.' USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1 FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id FOR UPDATE;
  SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_pool FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id;

  IF v_saldo_pool < v_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo disponível no fornecedor (todas as obras): R$ %. Valor do pedido: R$ %.',
      round(v_saldo_pool, 2), round(v_valor, 2) USING ERRCODE = 'check_violation';
  END IF;

  v_restante := v_valor;
  FOR v_carteira IN
    SELECT id, saldo_atual FROM carteiras
    WHERE fornecedor_id = v_pedido.fornecedor_id AND saldo_atual > 0
    ORDER BY (obra_id <> v_pedido.obra_id), criado_em ASC
  LOOP
    EXIT WHEN v_restante <= 0;
    v_debitado := LEAST(v_carteira.saldo_atual, v_restante);

    INSERT INTO carteira_movimentacoes (carteira_id, tipo, valor, referencia_tipo, referencia_id, usuario_id)
    VALUES (v_carteira.id, 'DEBITO', v_debitado, 'pedido_beneficiamento', p_pedido_beneficiamento_id, p_usuario_id)
    RETURNING id INTO v_mov_id;

    UPDATE carteiras SET saldo_atual = saldo_atual - v_debitado, atualizado_em = now() WHERE id = v_carteira.id;

    v_movs := v_movs || jsonb_build_object('carteira_id', v_carteira.id, 'movimentacao_id', v_mov_id, 'valor', v_debitado);
    v_restante := v_restante - v_debitado;
  END LOOP;

  UPDATE pedidos_beneficiamento
  SET debito_registrado = true, debito_status = 'APROVADO',
      debito_decidido_por = p_usuario_id, debito_decidido_em = now()
  WHERE id = p_pedido_beneficiamento_id;

  RETURN jsonb_build_object('valor_debitado', v_valor, 'movimentacoes', v_movs);
END;
$$;

CREATE OR REPLACE FUNCTION rejeitar_debito_beneficiamento(
  p_pedido_beneficiamento_id uuid,
  p_usuario_id               uuid,
  p_motivo                   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.pedido.confirmar_debito');
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Informe o motivo da rejeição.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT usa_carteira, debito_registrado INTO v_pedido
  FROM pedidos_beneficiamento WHERE id = p_pedido_beneficiamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido de beneficiamento não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT v_pedido.usa_carteira THEN
    RAISE EXCEPTION 'Este pedido não utiliza faturamento direto da carteira.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_pedido.debito_registrado THEN
    RAISE EXCEPTION 'Débito já foi registrado — não é possível rejeitar.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE pedidos_beneficiamento
  SET debito_status = 'REJEITADO', debito_rejeitado_motivo = btrim(p_motivo),
      debito_decidido_por = p_usuario_id, debito_decidido_em = now()
  WHERE id = p_pedido_beneficiamento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_debito_carteira_beneficiamento(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rejeitar_debito_beneficiamento(uuid, uuid, text) TO authenticated, service_role;
