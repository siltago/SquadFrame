-- =============================================================================
-- Migration: 20260728000008_financeiro_aprovacao_debito.sql
-- Aprovação explícita de débito de faturamento direto. Hoje o débito era
-- confirmado automaticamente dentro de registrarValorFinal() assim que o
-- valor final era salvo — uma auto-aprovação silenciosa, sem distinção
-- entre "pedido pronto pra debitar" e "alguém com autoridade decidiu
-- debitar". Essa migration só adiciona o estado; a remoção da
-- auto-aprovação é código (modules/squadframe/actions/compras/pedidos.ts).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas de decisão em pedidos_compra
-- ---------------------------------------------------------------------------
ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS debito_status text CHECK (debito_status IS NULL OR debito_status IN ('APROVADO', 'REJEITADO')),
  ADD COLUMN IF NOT EXISTS debito_rejeitado_motivo text,
  ADD COLUMN IF NOT EXISTS debito_decidido_por uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS debito_decidido_em timestamptz;

-- ---------------------------------------------------------------------------
-- 2. confirmar_debito_carteira — carimba debito_status='APROVADO' junto com
--    debito_registrado=true. Mesma assinatura da versão anterior
--    (20260728000006_financeiro_debito_pooled.sql) — nenhum call site muda.
-- ---------------------------------------------------------------------------
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

  SELECT COALESCE(
    v_pedido.valor_final,
    (SELECT SUM(COALESCE(preco_unitario, 0) * COALESCE(quantidade_pedida, 0))
     FROM pedido_itens WHERE pedido_id = p_pedido_id)
  ) INTO v_valor;

  IF v_valor IS NULL OR v_valor <= 0 THEN
    RAISE EXCEPTION 'O pedido não possui valor definido. Registre o valor final ou defina preços nos itens.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM 1 FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id FOR UPDATE;

  SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_pool
  FROM carteiras WHERE fornecedor_id = v_pedido.fornecedor_id;

  IF v_saldo_pool < v_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo disponível no fornecedor (todas as obras): R$ %. Valor do pedido: R$ %.',
      round(v_saldo_pool, 2), round(v_valor, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  v_restante := v_valor;

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

  UPDATE pedidos_compra
  SET debito_registrado = true,
      debito_status = 'APROVADO',
      debito_decidido_por = p_usuario_id,
      debito_decidido_em = now()
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'valor_debitado', v_valor,
    'movimentacoes',  v_movs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_debito_carteira(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. rejeitar_debito_pedido — não mexe em carteiras/ledger, só registra a
--    decisão. Reversível: confirmar_debito_carteira continua podendo
--    aprovar depois (o guard dela é só debito_registrado, nunca tocado aqui).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rejeitar_debito_pedido(
  p_pedido_id  uuid,
  p_usuario_id uuid,
  p_motivo     text
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
    RAISE EXCEPTION 'Débito já foi registrado para este pedido — não é possível rejeitar.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE pedidos_compra
  SET debito_status = 'REJEITADO',
      debito_rejeitado_motivo = btrim(p_motivo),
      debito_decidido_por = p_usuario_id,
      debito_decidido_em = now()
  WHERE id = p_pedido_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rejeitar_debito_pedido(uuid, uuid, text) TO authenticated, service_role;
