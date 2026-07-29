-- =============================================================================
-- Migration: 20260728000005_financeiro_contratos.sql
-- Contratos de faturamento direto por obra. Um contrato se divide em
-- "destinos" (reusa as abas do catálogo, tipos_linha) e cada destino se
-- divide em alocações por fornecedor. Alocar valor a um fornecedor
-- financia a carteira dele (obra × fornecedor) automaticamente — reusa
-- a mesma tabela/ledger de carteiras já existente
-- (20260629000002_financeiro_carteiras.sql), não cria um pool paralelo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissão
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('financeiro.contrato.gerenciar', 'Cadastrar contratos e alocar valores por fornecedor', 'FINANCEIRO')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id       uuid        NOT NULL REFERENCES obras(id) ON DELETE RESTRICT,
  numero        text        NOT NULL UNIQUE,
  valor_total   numeric(14,2) NOT NULL CHECK (valor_total > 0),
  descricao     text,
  usuario_id    uuid        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_obra ON contratos(obra_id);

-- tipo_linha aponta pro mesmo slug de tipos_linha usado no catálogo
-- (Perfil/Vidros/Componentes/ACM/Conexões) — decisão confirmada com o
-- usuário: não criar uma segunda taxonomia paralela.
CREATE TABLE IF NOT EXISTS contrato_destinos (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id       uuid        NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  tipo_linha        text        NOT NULL REFERENCES tipos_linha(slug),
  valor             numeric(14,2) NOT NULL CHECK (valor > 0),
  criado_em         timestamptz DEFAULT now(),
  UNIQUE (contrato_id, tipo_linha)
);

CREATE INDEX IF NOT EXISTS idx_contrato_destinos_contrato ON contrato_destinos(contrato_id);

CREATE TABLE IF NOT EXISTS contrato_fornecedor_alocacoes (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_destino_id   uuid        NOT NULL REFERENCES contrato_destinos(id) ON DELETE CASCADE,
  fornecedor_id         uuid        NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  valor                 numeric(14,2) NOT NULL CHECK (valor > 0),
  criado_em             timestamptz DEFAULT now(),
  UNIQUE (contrato_destino_id, fornecedor_id)
);

CREATE INDEX IF NOT EXISTS idx_contrato_alocacoes_destino     ON contrato_fornecedor_alocacoes(contrato_destino_id);
CREATE INDEX IF NOT EXISTS idx_contrato_alocacoes_fornecedor  ON contrato_fornecedor_alocacoes(fornecedor_id);

-- ---------------------------------------------------------------------------
-- 3. RLS — leitura para quem tem financeiro.carteira.ver ou o admin,
--    mesmo padrão de carteiras/carteira_movimentacoes. Escrita só via RPC
--    SECURITY DEFINER abaixo (service_role sempre passa direto).
-- ---------------------------------------------------------------------------
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_fornecedor_alocacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contratos_leitura" ON contratos;
CREATE POLICY "contratos_leitura" ON contratos
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

DROP POLICY IF EXISTS "contrato_destinos_leitura" ON contrato_destinos;
CREATE POLICY "contrato_destinos_leitura" ON contrato_destinos
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

DROP POLICY IF EXISTS "contrato_alocacoes_leitura" ON contrato_fornecedor_alocacoes;
CREATE POLICY "contrato_alocacoes_leitura" ON contrato_fornecedor_alocacoes
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('financeiro.carteira.ver'));

-- ---------------------------------------------------------------------------
-- 4. RPC: criar_contrato
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_contrato(
  p_usuario_id  uuid,
  p_obra_id     uuid,
  p_numero      text,
  p_valor_total numeric,
  p_descricao   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.contrato.gerenciar');

  IF p_numero IS NULL OR btrim(p_numero) = '' THEN
    RAISE EXCEPTION 'Informe o número do contrato.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_valor_total IS NULL OR p_valor_total <= 0 THEN
    RAISE EXCEPTION 'O valor total do contrato deve ser maior que zero.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO contratos (obra_id, numero, valor_total, descricao, usuario_id)
  VALUES (p_obra_id, btrim(p_numero), p_valor_total, p_descricao, p_usuario_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: criar_contrato_destino — valida que a soma dos destinos não
--    ultrapassa o valor total do contrato.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_contrato_destino(
  p_usuario_id  uuid,
  p_contrato_id uuid,
  p_tipo_linha  text,
  p_valor       numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id            uuid;
  v_valor_total   numeric;
  v_ja_alocado    numeric;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.contrato.gerenciar');

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor do destino deve ser maior que zero.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT valor_total INTO v_valor_total FROM contratos WHERE id = p_contrato_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_ja_alocado
  FROM contrato_destinos WHERE contrato_id = p_contrato_id;

  IF v_ja_alocado + p_valor > v_valor_total THEN
    RAISE EXCEPTION 'Destino ultrapassa o valor total do contrato. Já alocado: R$ %, valor total: R$ %.',
      round(v_ja_alocado, 2), round(v_valor_total, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO contrato_destinos (contrato_id, tipo_linha, valor)
  VALUES (p_contrato_id, p_tipo_linha, p_valor)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: criar_contrato_alocacao — valida que a soma das alocações não
--    ultrapassa o valor do destino, e financia a carteira obra×fornecedor
--    correspondente (mesma tabela/ledger de carteiras, sem duplicar lógica
--    de saldo). Não exige financeiro.carteira.depositar separadamente —
--    quem gerencia contrato não precisa acumular as duas permissões.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_contrato_alocacao(
  p_usuario_id          uuid,
  p_contrato_destino_id uuid,
  p_fornecedor_id       uuid,
  p_valor               numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id             uuid;
  v_obra_id        uuid;
  v_numero         text;
  v_tipo_linha     text;
  v_valor_destino  numeric;
  v_ja_alocado     numeric;
  v_carteira_id    uuid;
  v_novo_saldo     numeric;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'financeiro.contrato.gerenciar');

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor da alocação deve ser maior que zero.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT cd.valor, cd.tipo_linha, c.obra_id, c.numero
  INTO v_valor_destino, v_tipo_linha, v_obra_id, v_numero
  FROM contrato_destinos cd
  JOIN contratos c ON c.id = cd.contrato_id
  WHERE cd.id = p_contrato_destino_id
  FOR UPDATE OF cd;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destino de contrato não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_ja_alocado
  FROM contrato_fornecedor_alocacoes WHERE contrato_destino_id = p_contrato_destino_id;

  IF v_ja_alocado + p_valor > v_valor_destino THEN
    RAISE EXCEPTION 'Alocação ultrapassa o valor do destino. Já alocado: R$ %, valor do destino: R$ %.',
      round(v_ja_alocado, 2), round(v_valor_destino, 2)
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO contrato_fornecedor_alocacoes (contrato_destino_id, fornecedor_id, valor)
  VALUES (p_contrato_destino_id, p_fornecedor_id, p_valor)
  RETURNING id INTO v_id;

  INSERT INTO carteiras (obra_id, fornecedor_id)
  VALUES (v_obra_id, p_fornecedor_id)
  ON CONFLICT (obra_id, fornecedor_id) DO NOTHING;

  SELECT id INTO v_carteira_id
  FROM carteiras WHERE obra_id = v_obra_id AND fornecedor_id = p_fornecedor_id;

  INSERT INTO carteira_movimentacoes (
    carteira_id, tipo, valor, referencia_tipo, referencia_id, descricao, usuario_id
  ) VALUES (
    v_carteira_id, 'DEPOSITO', p_valor, 'contrato', v_id,
    format('Contrato %s — %s', v_numero, v_tipo_linha), p_usuario_id
  );

  UPDATE carteiras
  SET saldo_atual = saldo_atual + p_valor, atualizado_em = now()
  WHERE id = v_carteira_id
  RETURNING saldo_atual INTO v_novo_saldo;

  RETURN jsonb_build_object(
    'alocacao_id', v_id,
    'carteira_id', v_carteira_id,
    'novo_saldo',  v_novo_saldo
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants + Realtime
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION criar_contrato(uuid, uuid, text, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION criar_contrato_destino(uuid, uuid, text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION criar_contrato_alocacao(uuid, uuid, uuid, numeric) TO authenticated, service_role;

DO $$
DECLARE
  tabelas TEXT[] := ARRAY['contratos', 'contrato_destinos', 'contrato_fornecedor_alocacoes'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END;
$$;
