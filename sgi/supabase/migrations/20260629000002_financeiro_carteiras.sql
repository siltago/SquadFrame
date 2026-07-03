-- =============================================================================
-- Migration: 20260629_financeiro_carteiras.sql
-- Módulo financeiro MVP: carteiras por obra×fornecedor + ledger imutável.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissões financeiras
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('financeiro.carteira.ver',                    'Visualizar carteiras e saldos',           'FINANCEIRO'),
  ('financeiro.carteira.depositar',              'Registrar depósitos em carteiras',        'FINANCEIRO'),
  ('financeiro.pedido.faturamento_direto.usar',  'Criar pedido com faturamento da carteira','FINANCEIRO'),
  ('financeiro.pedido.confirmar_debito',         'Confirmar débito da carteira ao emitir',  'FINANCEIRO'),
  ('financeiro.dashboard.ver',                   'Acessar dashboard financeiro',            'FINANCEIRO')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Carteiras (saldo por obra × fornecedor)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carteiras (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id       uuid        NOT NULL REFERENCES obras(id)       ON DELETE RESTRICT,
  fornecedor_id uuid        NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  saldo_atual   numeric(14,2) NOT NULL DEFAULT 0 CHECK (saldo_atual >= 0),
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (obra_id, fornecedor_id)
);

CREATE INDEX IF NOT EXISTS idx_carteiras_obra       ON carteiras(obra_id);
CREATE INDEX IF NOT EXISTS idx_carteiras_fornecedor ON carteiras(fornecedor_id);

-- ---------------------------------------------------------------------------
-- 3. Ledger imutável de movimentações (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carteira_movimentacoes (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  carteira_id     uuid        NOT NULL REFERENCES carteiras(id) ON DELETE RESTRICT,
  tipo            text        NOT NULL CHECK (tipo IN ('DEPOSITO', 'DEBITO')),
  valor           numeric(14,2) NOT NULL CHECK (valor > 0),
  referencia_tipo text,        -- 'pedido' | 'deposito_manual' | 'ajuste'
  referencia_id   uuid,        -- pedido_id quando tipo='DEBITO'
  descricao       text,
  usuario_id      uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cartmov_carteira   ON carteira_movimentacoes(carteira_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_cartmov_referencia ON carteira_movimentacoes(referencia_tipo, referencia_id);

-- ---------------------------------------------------------------------------
-- 4. Colunas em pedidos_compra para controle de faturamento direto
-- ---------------------------------------------------------------------------
ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS usa_carteira     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS debito_registrado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pedidos_usa_carteira
  ON pedidos_compra(fornecedor_id, obra_id)
  WHERE usa_carteira = true AND debito_registrado = false;

-- ---------------------------------------------------------------------------
-- 5. RPC: criar_deposito_carteira
--    Cria ou reutiliza carteira obra×fornecedor, registra depósito.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_deposito_carteira(
  p_obra_id       uuid,
  p_fornecedor_id uuid,
  p_usuario_id    uuid,
  p_valor         numeric,
  p_descricao     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carteira_id uuid;
  v_mov_id      uuid;
  v_novo_saldo  numeric;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.carteira.depositar');

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor do depósito deve ser maior que zero.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Cria carteira se não existe
  INSERT INTO carteiras (obra_id, fornecedor_id)
  VALUES (p_obra_id, p_fornecedor_id)
  ON CONFLICT (obra_id, fornecedor_id) DO NOTHING;

  SELECT id INTO v_carteira_id
  FROM carteiras
  WHERE obra_id = p_obra_id AND fornecedor_id = p_fornecedor_id;

  -- Ledger: registra depósito
  INSERT INTO carteira_movimentacoes (
    carteira_id, tipo, valor, referencia_tipo, descricao, usuario_id
  ) VALUES (
    v_carteira_id, 'DEPOSITO', p_valor, 'deposito_manual', p_descricao, p_usuario_id
  ) RETURNING id INTO v_mov_id;

  -- Credita saldo e atualiza timestamp
  UPDATE carteiras
  SET saldo_atual   = saldo_atual + p_valor,
      atualizado_em = now()
  WHERE id = v_carteira_id
  RETURNING saldo_atual INTO v_novo_saldo;

  RETURN jsonb_build_object(
    'carteira_id',     v_carteira_id,
    'movimentacao_id', v_mov_id,
    'novo_saldo',      v_novo_saldo
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: confirmar_debito_carteira
--    Debita carteira ao emitir pedido. Idempotente via debito_registrado.
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
  v_carteira_id uuid;
  v_saldo       numeric;
  v_valor       numeric;
  v_mov_id      uuid;
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

  -- Busca carteira obra × fornecedor
  SELECT id, saldo_atual INTO v_carteira_id, v_saldo
  FROM carteiras
  WHERE obra_id = v_pedido.obra_id AND fornecedor_id = v_pedido.fornecedor_id
  FOR UPDATE;

  IF v_carteira_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada para esta obra e fornecedor. Faça um depósito primeiro.'
      USING ERRCODE = 'no_data_found';
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

  IF v_saldo < v_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: R$ %. Valor do pedido: R$ %.',
      round(v_saldo, 2), round(v_valor, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  -- Ledger: registra débito
  INSERT INTO carteira_movimentacoes (
    carteira_id, tipo, valor, referencia_tipo, referencia_id, usuario_id
  ) VALUES (
    v_carteira_id, 'DEBITO', v_valor, 'pedido', p_pedido_id, p_usuario_id
  ) RETURNING id INTO v_mov_id;

  -- Debita saldo
  UPDATE carteiras
  SET saldo_atual   = saldo_atual - v_valor,
      atualizado_em = now()
  WHERE id = v_carteira_id;

  -- Marca pedido como debitado (idempotência)
  UPDATE pedidos_compra
  SET debito_registrado = true
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'movimentacao_id', v_mov_id,
    'valor_debitado',  v_valor,
    'carteira_id',     v_carteira_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION criar_deposito_carteira(uuid, uuid, uuid, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION confirmar_debito_carteira(uuid, uuid) TO authenticated, service_role;

-- RLS: carteiras e movimentações (autenticados com permissão financeira)
ALTER TABLE carteiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE carteira_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carteiras_leitura" ON carteiras;
CREATE POLICY "carteiras_leitura" ON carteiras
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

DROP POLICY IF EXISTS "cartmov_leitura" ON carteira_movimentacoes;
CREATE POLICY "cartmov_leitura" ON carteira_movimentacoes
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));
