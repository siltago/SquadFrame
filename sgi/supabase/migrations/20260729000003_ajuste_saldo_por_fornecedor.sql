-- =============================================================================
-- Migration: 20260729000003_ajuste_saldo_por_fornecedor.sql
-- Redesenha o ajuste manual de saldo: em vez de mirar uma carteira
-- obra×fornecedor específica, mira o fornecedor (saldo pooled, mesmo
-- critério de confirmar_debito_carteira). Aumento vira DEPOSITO na
-- carteira mais antiga do fornecedor; redução vira DEBITO em cascata
-- (mais antiga primeiro), podendo espalhar por mais de uma carteira.
-- Descrição no ledger passa a ser sempre "Ajuste interno: <usuário>"
-- (padronizado); o motivo livre digitado pelo usuário continua guardado
-- em carteira_ajustes.motivo, ligado via referencia_tipo='ajuste' +
-- referencia_id (mesmo padrão polimórfico já usado por pedido/contrato).
--
-- carteira_ajustes foi criada nesta mesma sessão (20260729000002) e nunca
-- teve dado real — recriar do zero em vez de ALTER incremental.
-- =============================================================================

DROP FUNCTION IF EXISTS ajustar_saldo_carteira(uuid, uuid, numeric, text);
DROP TABLE IF EXISTS carteira_ajustes;

CREATE TABLE carteira_ajustes (
  id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id  uuid          NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  usuario_id     uuid          REFERENCES usuarios(id) ON DELETE SET NULL,
  valor_anterior numeric(14,2) NOT NULL,
  valor_novo     numeric(14,2) NOT NULL,
  motivo         text          NOT NULL,
  criado_em      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_carteira_ajustes_fornecedor ON carteira_ajustes(fornecedor_id, criado_em DESC);

ALTER TABLE carteira_ajustes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carteira_ajustes_leitura" ON carteira_ajustes;
CREATE POLICY "carteira_ajustes_leitura" ON carteira_ajustes
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

-- ---------------------------------------------------------------------------
-- RPC: ajustar_saldo_fornecedor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ajustar_saldo_fornecedor(
  p_fornecedor_id uuid,
  p_usuario_id    uuid,
  p_valor_novo    numeric,
  p_motivo        text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_pool    numeric;
  v_delta         numeric;
  v_restante      numeric;
  v_aplicado      numeric;
  v_ajuste_id     uuid;
  v_usuario_nome  text;
  v_descricao     text;
  v_carteira_id   uuid;
  v_carteira      record;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.carteira.ajustar');

  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Informe o motivo do ajuste.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_valor_novo IS NULL OR p_valor_novo < 0 THEN
    RAISE EXCEPTION 'O novo saldo não pode ser negativo.' USING ERRCODE = 'check_violation';
  END IF;

  -- Trava todas as carteiras do fornecedor antes de somar (mesmo padrão de
  -- confirmar_debito_carteira) — evita corrida com um débito/depósito
  -- concorrente no mesmo fornecedor.
  PERFORM 1 FROM carteiras WHERE fornecedor_id = p_fornecedor_id FOR UPDATE;

  IF NOT EXISTS (SELECT 1 FROM carteiras WHERE fornecedor_id = p_fornecedor_id) THEN
    RAISE EXCEPTION 'Este fornecedor ainda não tem carteira em nenhuma obra — aloque um contrato pra ele primeiro.'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(saldo_atual), 0) INTO v_saldo_pool
  FROM carteiras WHERE fornecedor_id = p_fornecedor_id;

  v_delta := p_valor_novo - v_saldo_pool;
  IF v_delta = 0 THEN
    RAISE EXCEPTION 'O novo saldo é igual ao saldo atual — nada para ajustar.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT nome INTO v_usuario_nome FROM usuarios WHERE id = p_usuario_id;
  v_descricao := 'Ajuste interno: ' || COALESCE(v_usuario_nome, 'usuário');

  INSERT INTO carteira_ajustes (fornecedor_id, usuario_id, valor_anterior, valor_novo, motivo)
  VALUES (p_fornecedor_id, p_usuario_id, v_saldo_pool, p_valor_novo, btrim(p_motivo))
  RETURNING id INTO v_ajuste_id;

  IF v_delta > 0 THEN
    -- Aumento: registra como DEPOSITO inteiro na carteira mais antiga do fornecedor.
    SELECT id INTO v_carteira_id
    FROM carteiras WHERE fornecedor_id = p_fornecedor_id
    ORDER BY criado_em ASC LIMIT 1;

    INSERT INTO carteira_movimentacoes (
      carteira_id, tipo, valor, referencia_tipo, referencia_id, descricao, usuario_id
    ) VALUES (
      v_carteira_id, 'DEPOSITO', v_delta, 'ajuste', v_ajuste_id, v_descricao, p_usuario_id
    );

    UPDATE carteiras SET saldo_atual = saldo_atual + v_delta, atualizado_em = now()
    WHERE id = v_carteira_id;
  ELSE
    -- Redução: registra como DEBITO em cascata (mais antiga primeiro),
    -- podendo espalhar por mais de uma carteira do mesmo fornecedor.
    v_restante := abs(v_delta);
    FOR v_carteira IN
      SELECT id, saldo_atual FROM carteiras
      WHERE fornecedor_id = p_fornecedor_id AND saldo_atual > 0
      ORDER BY criado_em ASC
    LOOP
      EXIT WHEN v_restante <= 0;
      v_aplicado := LEAST(v_carteira.saldo_atual, v_restante);

      INSERT INTO carteira_movimentacoes (
        carteira_id, tipo, valor, referencia_tipo, referencia_id, descricao, usuario_id
      ) VALUES (
        v_carteira.id, 'DEBITO', v_aplicado, 'ajuste', v_ajuste_id, v_descricao, p_usuario_id
      );

      UPDATE carteiras SET saldo_atual = saldo_atual - v_aplicado, atualizado_em = now()
      WHERE id = v_carteira.id;

      v_restante := v_restante - v_aplicado;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'ajuste_id', v_ajuste_id,
    'valor_anterior', v_saldo_pool,
    'valor_novo', p_valor_novo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ajustar_saldo_fornecedor(uuid, uuid, numeric, text) TO authenticated, service_role;
