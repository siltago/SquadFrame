-- =============================================================================
-- Migration: 20260728000006_financeiro_debito_pooled.sql
-- confirmar_debito_carteira passa a considerar o saldo agregado do
-- fornecedor entre TODAS as obras (pool), não só a carteira obra×fornecedor
-- do próprio pedido — decisão do usuário: contrato não trava o gasto numa
-- obra só, contanto que a soma de contratos naquele fornecedor cubra a
-- compra. Consome primeiro a carteira da própria obra do pedido, e só
-- "transborda" pras carteiras de outras obras (mais antigas primeiro) se
-- faltar saldo — preserva de qual obra o dinheiro efetivamente saiu.
--
-- Mesma assinatura/nome da função original (20260629000002) — nenhum call
-- site (modules/squadframe/actions/compras/pedidos.ts) precisa mudar.
-- O único uso do retorno é checar `error`; nenhum código lê `data`, então
-- o formato do jsonb pode mudar sem quebrar nada.
-- =============================================================================

CREATE OR REPLACE FUNCTION confirmar_debito_carteira(
  p_pedido_id  uuid,
  p_usuario_id uuid
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

  -- Bloqueia linha do pedido para evitar duplo débito concorrente
  SELECT obra_id, fornecedor_id, valor_final, usa_carteira, debito_registrado
  INTO v_pedido
  FROM pedidos_compra
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT v_pedido.usa_carteira THEN
    RAISE EXCEPTION 'Este pedido não utiliza faturamento direto da carteira.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_pedido.debito_registrado THEN
    RAISE EXCEPTION 'Débito já foi registrado para este pedido (idempotência).'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Valor: usa valor_final se confirmado, senão soma estimada dos itens
  SELECT COALESCE(
    v_pedido.valor_final,
    (SELECT SUM(COALESCE(preco_unitario, 0) * COALESCE(quantidade_pedida, 0))
     FROM pedido_itens WHERE pedido_id = p_pedido_id)
  ) INTO v_valor;

  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'O pedido não possui valor definido. Registre o valor final ou defina preços nos itens.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Trava todas as carteiras desse fornecedor (qualquer obra) antes de somar,
  -- pra não ter corrida entre dois pedidos gastando o mesmo pool ao mesmo tempo.
  PERFORM 1 FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id FOR UPDATE;

  SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_pool
  FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id;

  IF v_saldo_pool < v_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo disponível no fornecedor (todas as obras): R$ %. Valor do pedido: R$ %.',
      round(v_saldo_pool, 2), round(v_valor, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  v_restante := v_valor;

  -- Consome primeiro a carteira da própria obra do pedido; o que faltar
  -- transborda pras demais carteiras do mesmo fornecedor, mais antigas primeiro.
  FOR v_carteira IN
    SELECT id, saldo_atual FROM carteiras
    WHERE fornecedor_id = v_pedido.fornecedor_id AND saldo_atual > 0
    ORDER BY (obra_id <> v_pedido.obra_id), criado_em ASC
  LOOP
    EXIT WHEN v_restante <= 0;
    v_debitado := LEAST(v_carteira.saldo_atual, v_restante);

    INSERT INTO carteira_movimentacoes (
      carteira_id, tipo, valor, referencia_tipo, referencia_id, usuario_id
    ) VALUES (
      v_carteira.id, 'DEBITO', v_debitado, 'pedido', p_pedido_id, p_usuario_id
    ) RETURNING id INTO v_mov_id;

    UPDATE carteiras
    SET saldo_atual = saldo_atual - v_debitado, atualizado_em = now()
    WHERE id = v_carteira.id;

    v_movs := v_movs || jsonb_build_object(
      'carteira_id', v_carteira.id, 'movimentacao_id', v_mov_id, 'valor', v_debitado
    );
    v_restante := v_restante - v_debitado;
  END LOOP;

  -- Marca pedido como debitado (idempotência)
  UPDATE pedidos_compra
  SET debito_registrado = true
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'valor_debitado', v_valor,
    'movimentacoes',  v_movs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_debito_carteira(uuid, uuid) TO authenticated, service_role;
