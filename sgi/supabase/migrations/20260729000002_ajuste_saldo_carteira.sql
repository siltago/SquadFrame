-- =============================================================================
-- Migration: 20260729000002_ajuste_saldo_carteira.sql
-- Ajuste manual de saldo de carteira (correção) — ex: sistema mostra 500k
-- mas o saldo real é 469k. Gera um lançamento normal em
-- carteira_movimentacoes (tipo DEPOSITO/DEBITO conforme o sinal do ajuste,
-- referencia_tipo='ajuste', já previsto no comentário original da coluna)
-- + um registro dedicado em carteira_ajustes com valor anterior/novo e
-- motivo, pensado pra alimentar relatório/documento depois (o ledger
-- genérico não guarda "valor anterior", só o delta).
-- =============================================================================

CREATE TABLE IF NOT EXISTS carteira_ajustes (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  carteira_id     uuid          NOT NULL REFERENCES carteiras(id) ON DELETE RESTRICT,
  movimentacao_id uuid          REFERENCES carteira_movimentacoes(id) ON DELETE SET NULL,
  usuario_id      uuid          REFERENCES usuarios(id) ON DELETE SET NULL,
  valor_anterior  numeric(14,2) NOT NULL,
  valor_novo      numeric(14,2) NOT NULL,
  motivo          text          NOT NULL,
  criado_em       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carteira_ajustes_carteira ON carteira_ajustes(carteira_id, criado_em DESC);

ALTER TABLE carteira_ajustes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carteira_ajustes_leitura" ON carteira_ajustes;
CREATE POLICY "carteira_ajustes_leitura" ON carteira_ajustes
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

-- ---------------------------------------------------------------------------
-- Permissão
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('financeiro.carteira.ajustar', 'Ajustar saldo de carteira manualmente (correção)', 'FINANCEIRO')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- RPC: ajustar_saldo_carteira
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ajustar_saldo_carteira(
  p_carteira_id uuid,
  p_usuario_id  uuid,
  p_valor_novo  numeric,
  p_motivo      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_atual numeric;
  v_delta       numeric;
  v_tipo        text;
  v_mov_id      uuid;
  v_ajuste_id   uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.carteira.ajustar');

  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Informe o motivo do ajuste.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_valor_novo IS NULL OR p_valor_novo < 0 THEN
    RAISE EXCEPTION 'O novo saldo não pode ser negativo.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT saldo_atual INTO v_saldo_atual
  FROM carteiras
  WHERE id = p_carteira_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  v_delta := p_valor_novo - v_saldo_atual;
  IF v_delta = 0 THEN
    RAISE EXCEPTION 'O novo saldo é igual ao saldo atual — nada para ajustar.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_tipo := CASE WHEN v_delta > 0 THEN 'DEPOSITO' ELSE 'DEBITO' END;

  INSERT INTO carteira_movimentacoes (
    carteira_id, tipo, valor, referencia_tipo, descricao, usuario_id
  ) VALUES (
    p_carteira_id, v_tipo, abs(v_delta), 'ajuste', btrim(p_motivo), p_usuario_id
  ) RETURNING id INTO v_mov_id;

  INSERT INTO carteira_ajustes (
    carteira_id, movimentacao_id, usuario_id, valor_anterior, valor_novo, motivo
  ) VALUES (
    p_carteira_id, v_mov_id, p_usuario_id, v_saldo_atual, p_valor_novo, btrim(p_motivo)
  ) RETURNING id INTO v_ajuste_id;

  UPDATE carteiras
  SET saldo_atual = p_valor_novo, atualizado_em = now()
  WHERE id = p_carteira_id;

  RETURN jsonb_build_object(
    'ajuste_id', v_ajuste_id,
    'movimentacao_id', v_mov_id,
    'valor_anterior', v_saldo_atual,
    'valor_novo', p_valor_novo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ajustar_saldo_carteira(uuid, uuid, numeric, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'carteira_ajustes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE carteira_ajustes';
  END IF;
END;
$$;
