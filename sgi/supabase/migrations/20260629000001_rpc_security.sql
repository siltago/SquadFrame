-- =============================================================================
-- Migration: 20260629_rpc_security.sql
-- Segurança em nível de banco: verificação de permissão dentro das RPCs
-- e policies RLS para acesso via JWT autenticado (Realtime, REST direto).
--
-- ESTRATÉGIA:
--   1. fn_tem_permissao / fn_exigir_permissao — helpers internos
--   2. RPCs críticas reescritas com checagem no início
--   3. Helpers auth.uid() → usuarios para uso em policies
--   4. RLS policies em tabelas de compras (proteção para Realtime e REST)
--
-- IMPORTANTE: service_role bypassa RLS — políticas protegem acesso via
-- anon/authenticated key (browser, Realtime subscriptions, REST direto).
-- A proteção principal contra bypass da aplicação está nas RPCs (itens 1-2).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. fn_tem_permissao — verifica se um usuário tem uma permissão
--    Lógica: cargo.is_admin → true | cargo_permissoes → chave encontrada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_tem_permissao(p_user_id uuid, p_chave text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cargo_id uuid;
  v_is_admin boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT cargo_id INTO v_cargo_id
  FROM usuarios
  WHERE id = p_user_id;

  IF v_cargo_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM cargos
  WHERE id = v_cargo_id;

  IF v_is_admin THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM cargo_permissoes cp
    JOIN permissoes p ON p.id = cp.permissao_id
    WHERE cp.cargo_id = v_cargo_id
      AND p.chave    = p_chave
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. fn_exigir_permissao — lança exceção com código padrão se sem permissão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_exigir_permissao(p_user_id uuid, p_chave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT fn_tem_permissao(p_user_id, p_chave) THEN
    RAISE EXCEPTION 'Permissão negada: %', p_chave
      USING ERRCODE = 'insufficient_privilege',
            HINT    = p_chave;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Helpers para uso em RLS policies (auth.uid() → usuarios.id)
-- ---------------------------------------------------------------------------

-- Retorna o ID interno (usuarios.id) do usuário autenticado via JWT
CREATE OR REPLACE FUNCTION fn_auth_user_db_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Retorna true se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION fn_auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.is_admin
     FROM usuarios u
     JOIN cargos c ON c.id = u.cargo_id
     WHERE u.auth_id = auth.uid()
     LIMIT 1),
    false
  );
$$;

-- Retorna true se o usuário autenticado tem a permissão especificada
CREATE OR REPLACE FUNCTION fn_auth_tem_permissao(p_chave text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fn_tem_permissao(fn_auth_user_db_id(), p_chave);
$$;

-- ---------------------------------------------------------------------------
-- 4. criar_pedido — adiciona checagem de permissão no início
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_pedido(
  p_numero              text,
  p_obra_id             uuid,
  p_fornecedor_id       uuid,
  p_forma_pagamento_id  uuid,
  p_comprador_id        uuid,
  p_observacoes         text,
  p_tipo_linha          text,
  p_cor_id              uuid,
  p_itens               jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_comprador_id, 'compras.pedido.criar');

  INSERT INTO pedidos_compra (
    numero, obra_id, fornecedor_id, forma_pagamento_id,
    comprador_id, observacoes, tipo_linha, cor_id
  ) VALUES (
    p_numero, p_obra_id, p_fornecedor_id, p_forma_pagamento_id,
    p_comprador_id, p_observacoes, p_tipo_linha, p_cor_id
  )
  RETURNING id INTO v_pedido_id;

  INSERT INTO pedido_itens (
    pedido_id, produto_id, descricao_snapshot, quantidade_pedida,
    unidade, preco_unitario, codigo_fornecedor, produto_fornecedor_id,
    obra_id, solicitacao_item_id, largura_m, altura_m, qtd_pecas, cor_id
  )
  SELECT
    v_pedido_id,
    (item->>'produto_id')::uuid,
    item->>'descricao_snapshot',
    (item->>'quantidade_pedida')::numeric,
    item->>'unidade',
    NULLIF(item->>'preco_unitario', '')::numeric,
    NULLIF(item->>'codigo_fornecedor', ''),
    NULLIF(item->>'produto_fornecedor_id', '')::uuid,
    NULLIF(item->>'obra_id', '')::uuid,
    NULLIF(item->>'solicitacao_item_id', '')::uuid,
    NULLIF(item->>'largura_m', '')::numeric,
    NULLIF(item->>'altura_m', '')::numeric,
    NULLIF(item->>'qtd_pecas', '')::integer,
    NULLIF(item->>'cor_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;

  RETURN jsonb_build_object('id', v_pedido_id, 'numero', p_numero);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. editar_pedido — adiciona p_usuario_id (DEFAULT NULL) + checagem
--    DEFAULT NULL: backward-compat; quando passado, valida permissão.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION editar_pedido(
  p_pedido_id           uuid,
  p_fornecedor_id       uuid,
  p_obra_id             uuid,
  p_forma_pagamento_id  uuid,
  p_cor_id              uuid,
  p_observacoes         text,
  p_prazo_entrega       date,
  p_itens               jsonb,
  p_usuario_id          uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.pedido.criar');
  END IF;

  UPDATE pedidos_compra SET
    fornecedor_id      = p_fornecedor_id,
    obra_id            = p_obra_id,
    forma_pagamento_id = p_forma_pagamento_id,
    cor_id             = p_cor_id,
    observacoes        = p_observacoes,
    prazo_entrega      = p_prazo_entrega,
    atualizado_em      = now()
  WHERE id = p_pedido_id;

  DELETE FROM pedido_itens WHERE pedido_id = p_pedido_id;

  INSERT INTO pedido_itens (
    pedido_id, produto_id, descricao_snapshot, quantidade_pedida,
    unidade, preco_unitario, codigo_fornecedor, produto_fornecedor_id,
    obra_id, solicitacao_item_id, largura_m, altura_m, qtd_pecas, cor_id
  )
  SELECT
    p_pedido_id,
    (item->>'produto_id')::uuid,
    item->>'descricao_snapshot',
    (item->>'quantidade_pedida')::numeric,
    item->>'unidade',
    NULLIF(item->>'preco_unitario', '')::numeric,
    NULLIF(item->>'codigo_fornecedor', ''),
    NULLIF(item->>'produto_fornecedor_id', '')::uuid,
    NULLIF(item->>'obra_id', '')::uuid,
    NULLIF(item->>'solicitacao_item_id', '')::uuid,
    NULLIF(item->>'largura_m', '')::numeric,
    NULLIF(item->>'altura_m', '')::numeric,
    NULLIF(item->>'qtd_pecas', '')::integer,
    NULLIF(item->>'cor_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. criar_solicitacao — adiciona checagem de permissão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_solicitacao(
  p_obra_id        uuid,
  p_origem         text,
  p_prioridade     text,
  p_justificativa  text,
  p_observacoes    text,
  p_solicitante_id uuid,
  p_itens          jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol_id uuid;
  v_numero text;
BEGIN
  PERFORM fn_exigir_permissao(p_solicitante_id, 'compras.solicitacao.criar');

  INSERT INTO solicitacoes_compra (
    obra_id, origem, prioridade, justificativa, observacoes, solicitante_id
  ) VALUES (
    p_obra_id, p_origem, p_prioridade, p_justificativa, p_observacoes, p_solicitante_id
  )
  RETURNING id, numero INTO v_sol_id, v_numero;

  INSERT INTO solicitacao_itens (
    solicitacao_id, produto_id, descricao_manual,
    quantidade, unidade, observacoes, cor_id
  )
  SELECT
    v_sol_id,
    NULLIF(item->>'produto_id', '')::uuid,
    NULLIF(item->>'descricao_manual', ''),
    (item->>'quantidade')::numeric,
    item->>'unidade',
    NULLIF(item->>'observacoes', ''),
    NULLIF(item->>'cor_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;

  RETURN jsonb_build_object('id', v_sol_id, 'numero', v_numero);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. editar_solicitacao — adiciona p_usuario_id (DEFAULT NULL) + checagem
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION editar_solicitacao(
  p_sol_id         uuid,
  p_obra_id        uuid,
  p_prioridade     text,
  p_justificativa  text,
  p_observacoes    text,
  p_itens          jsonb,
  p_usuario_id     uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.solicitacao.criar');
  END IF;

  UPDATE solicitacoes_compra SET
    obra_id       = p_obra_id,
    prioridade    = p_prioridade,
    justificativa = p_justificativa,
    observacoes   = p_observacoes,
    atualizado_em = now()
  WHERE id = p_sol_id;

  DELETE FROM solicitacao_itens WHERE solicitacao_id = p_sol_id;

  INSERT INTO solicitacao_itens (
    solicitacao_id, produto_id, descricao_manual,
    quantidade, unidade, observacoes, cor_id
  )
  SELECT
    p_sol_id,
    NULLIF(item->>'produto_id', '')::uuid,
    NULLIF(item->>'descricao_manual', ''),
    (item->>'quantidade')::numeric,
    item->>'unidade',
    NULLIF(item->>'observacoes', ''),
    NULLIF(item->>'cor_id', '')::uuid
  FROM jsonb_array_elements(p_itens) AS item;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. registrar_recebimento — adiciona checagem de permissão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_recebimento(
  p_pedido_id        uuid,
  p_responsavel_id   uuid,
  p_data_recebimento date,
  p_observacoes      text,
  p_itens            jsonb
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

  INSERT INTO recebimentos (pedido_id, responsavel_id, data_recebimento, observacoes)
  VALUES (p_pedido_id, p_responsavel_id, p_data_recebimento, p_observacoes)
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

-- ---------------------------------------------------------------------------
-- 9. excluir_pedidos_cascade — adiciona p_usuario_id (DEFAULT NULL) + checagem
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION excluir_pedidos_cascade(
  p_pedido_ids uuid[],
  p_usuario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol_ids       uuid[];
  v_storage_paths text[];
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.pedido.excluir');
  END IF;

  SELECT ARRAY_AGG(DISTINCT si.solicitacao_id)
  INTO v_sol_ids
  FROM pedido_itens pi
  JOIN solicitacao_itens si ON si.id = pi.solicitacao_item_id
  WHERE pi.pedido_id = ANY(p_pedido_ids)
    AND pi.solicitacao_item_id IS NOT NULL;

  SELECT ARRAY_AGG(caminho_storage)
  INTO v_storage_paths
  FROM pedido_documentos
  WHERE pedido_id = ANY(p_pedido_ids);

  DELETE FROM pedido_anotacoes  WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedido_documentos WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM recebimento_itens
  WHERE recebimento_id IN (
    SELECT id FROM recebimentos WHERE pedido_id = ANY(p_pedido_ids)
  );
  DELETE FROM recebimentos    WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedido_itens    WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedidos_compra  WHERE id        = ANY(p_pedido_ids);

  RETURN jsonb_build_object(
    'sol_ids',       COALESCE(to_jsonb(v_sol_ids),       '[]'::jsonb),
    'storage_paths', COALESCE(to_jsonb(v_storage_paths), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. excluir_solicitacoes_cascade — adiciona p_usuario_id (DEFAULT NULL) + checagem
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION excluir_solicitacoes_cascade(
  p_sol_ids    uuid[],
  p_usuario_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.solicitacao.criar');
  END IF;

  IF EXISTS (
    SELECT 1 FROM solicitacoes_compra
    WHERE id = ANY(p_sol_ids) AND status = 'EM_PEDIDO'
  ) THEN
    RAISE EXCEPTION 'Uma ou mais solicitações estão vinculadas a pedidos ativos (EM_PEDIDO).';
  END IF;

  DELETE FROM solicitacao_itens   WHERE solicitacao_id = ANY(p_sol_ids);
  DELETE FROM solicitacoes_compra WHERE id = ANY(p_sol_ids);
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. GRANTS para as novas funções helper
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION fn_tem_permissao(uuid, text)     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_exigir_permissao(uuid, text)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_auth_user_db_id()             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_auth_is_admin()               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_auth_tem_permissao(text)      TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 12. RLS POLICIES — pedidos_compra
--     Protege acesso via authenticated JWT (Realtime subscriptions, REST direto).
--     service_role bypassa RLS — políticas não afetam a aplicação.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pedidos_leitura"  ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_insercao" ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_edicao"   ON pedidos_compra;
DROP POLICY IF EXISTS "pedidos_exclusao" ON pedidos_compra;

CREATE POLICY "pedidos_leitura" ON pedidos_compra
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'));

CREATE POLICY "pedidos_insercao" ON pedidos_compra
  FOR INSERT TO authenticated
  WITH CHECK (fn_auth_tem_permissao('compras.pedido.criar'));

CREATE POLICY "pedidos_edicao" ON pedidos_compra
  FOR UPDATE TO authenticated
  USING  (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'))
  WITH CHECK (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'));

CREATE POLICY "pedidos_exclusao" ON pedidos_compra
  FOR DELETE TO authenticated
  USING (fn_auth_tem_permissao('compras.pedido.excluir'));

-- ---------------------------------------------------------------------------
-- 13. RLS POLICIES — pedido_itens
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pedido_itens_leitura"  ON pedido_itens;
DROP POLICY IF EXISTS "pedido_itens_escrita"  ON pedido_itens;

CREATE POLICY "pedido_itens_leitura" ON pedido_itens
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'));

CREATE POLICY "pedido_itens_escrita" ON pedido_itens
  FOR ALL TO authenticated
  USING  (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'))
  WITH CHECK (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.pedido.criar'));

-- ---------------------------------------------------------------------------
-- 14. RLS POLICIES — solicitacoes_compra
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "solicitacoes_leitura"  ON solicitacoes_compra;
DROP POLICY IF EXISTS "solicitacoes_insercao" ON solicitacoes_compra;
DROP POLICY IF EXISTS "solicitacoes_edicao"   ON solicitacoes_compra;
DROP POLICY IF EXISTS "solicitacoes_exclusao" ON solicitacoes_compra;

CREATE POLICY "solicitacoes_leitura" ON solicitacoes_compra
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.solicitacao.criar'));

CREATE POLICY "solicitacoes_insercao" ON solicitacoes_compra
  FOR INSERT TO authenticated
  WITH CHECK (fn_auth_tem_permissao('compras.solicitacao.criar'));

CREATE POLICY "solicitacoes_edicao" ON solicitacoes_compra
  FOR UPDATE TO authenticated
  USING  (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.solicitacao.criar'))
  WITH CHECK (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.solicitacao.criar'));

CREATE POLICY "solicitacoes_exclusao" ON solicitacoes_compra
  FOR DELETE TO authenticated
  USING (fn_auth_tem_permissao('compras.solicitacao.criar'));

-- ---------------------------------------------------------------------------
-- 15. RLS POLICIES — recebimentos / recebimento_itens
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "recebimentos_leitura" ON recebimentos;
DROP POLICY IF EXISTS "recebimentos_escrita" ON recebimentos;

CREATE POLICY "recebimentos_leitura" ON recebimentos
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'));

CREATE POLICY "recebimentos_escrita" ON recebimentos
  FOR ALL TO authenticated
  USING  (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'))
  WITH CHECK (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'));

DROP POLICY IF EXISTS "recebimento_itens_leitura" ON recebimento_itens;
DROP POLICY IF EXISTS "recebimento_itens_escrita" ON recebimento_itens;

CREATE POLICY "recebimento_itens_leitura" ON recebimento_itens
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'));

CREATE POLICY "recebimento_itens_escrita" ON recebimento_itens
  FOR ALL TO authenticated
  USING  (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'))
  WITH CHECK (fn_auth_is_admin() OR fn_auth_tem_permissao('compras.recebimento.registrar'));
