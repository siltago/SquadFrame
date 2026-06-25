-- =============================================================================
-- compras-rpc.sql
-- RPCs atômicas para o módulo de compras.
-- Cada função executa dentro de uma transação implícita do PostgreSQL.
-- Em caso de erro, o ROLLBACK é automático — nenhum insert parcial persiste.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TIPOS auxiliares
-- ---------------------------------------------------------------------------

-- Item de pedido recebido como JSON
-- { produto_id, descricao_snapshot, quantidade_pedida, unidade,
--   preco_unitario, codigo_fornecedor, produto_fornecedor_id,
--   obra_id, solicitacao_item_id, largura_m, altura_m, qtd_pecas, cor_id }

-- ---------------------------------------------------------------------------
-- 1. criar_pedido
-- ---------------------------------------------------------------------------
-- Insere pedidos_compra + pedido_itens em uma única transação.
-- Retorna o id e numero do pedido criado.
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
AS $$
DECLARE
  v_pedido_id   uuid;
  v_pedido_row  record;
BEGIN
  INSERT INTO pedidos_compra (
    numero, obra_id, fornecedor_id, forma_pagamento_id,
    comprador_id, observacoes, tipo_linha, cor_id
  ) VALUES (
    p_numero, p_obra_id, p_fornecedor_id, p_forma_pagamento_id,
    p_comprador_id, p_observacoes, p_tipo_linha, p_cor_id
  )
  RETURNING id, numero INTO v_pedido_id, v_pedido_row.numero;

  -- Insere todos os itens de uma vez
  INSERT INTO pedido_itens (
    pedido_id,
    produto_id,
    descricao_snapshot,
    quantidade_pedida,
    unidade,
    preco_unitario,
    codigo_fornecedor,
    produto_fornecedor_id,
    obra_id,
    solicitacao_item_id,
    largura_m,
    altura_m,
    qtd_pecas,
    cor_id
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
-- 2. editar_pedido
-- ---------------------------------------------------------------------------
-- Atualiza pedidos_compra e substitui pedido_itens atomicamente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION editar_pedido(
  p_pedido_id           uuid,
  p_fornecedor_id       uuid,
  p_obra_id             uuid,
  p_forma_pagamento_id  uuid,
  p_cor_id              uuid,
  p_observacoes         text,
  p_prazo_entrega       date,
  p_itens               jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pedidos_compra SET
    fornecedor_id      = p_fornecedor_id,
    obra_id            = p_obra_id,
    forma_pagamento_id = p_forma_pagamento_id,
    cor_id             = p_cor_id,
    observacoes        = p_observacoes,
    prazo_entrega      = p_prazo_entrega,
    atualizado_em      = now()
  WHERE id = p_pedido_id;

  -- Substitui itens atomicamente: delete + insert no mesmo bloco
  DELETE FROM pedido_itens WHERE pedido_id = p_pedido_id;

  INSERT INTO pedido_itens (
    pedido_id,
    produto_id,
    descricao_snapshot,
    quantidade_pedida,
    unidade,
    preco_unitario,
    codigo_fornecedor,
    produto_fornecedor_id,
    obra_id,
    solicitacao_item_id,
    largura_m,
    altura_m,
    qtd_pecas,
    cor_id
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
-- 3. criar_solicitacao
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
AS $$
DECLARE
  v_sol_id  uuid;
  v_numero  integer;
BEGIN
  INSERT INTO solicitacoes_compra (
    obra_id, origem, prioridade, justificativa, observacoes, solicitante_id
  ) VALUES (
    p_obra_id, p_origem, p_prioridade, p_justificativa, p_observacoes, p_solicitante_id
  )
  RETURNING id, numero INTO v_sol_id, v_numero;

  INSERT INTO solicitacao_itens (
    solicitacao_id,
    produto_id,
    descricao_manual,
    quantidade,
    unidade,
    observacoes,
    cor_id
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
-- 4. editar_solicitacao
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION editar_solicitacao(
  p_sol_id         uuid,
  p_obra_id        uuid,
  p_prioridade     text,
  p_justificativa  text,
  p_observacoes    text,
  p_itens          jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE solicitacoes_compra SET
    obra_id       = p_obra_id,
    prioridade    = p_prioridade,
    justificativa = p_justificativa,
    observacoes   = p_observacoes,
    atualizado_em = now()
  WHERE id = p_sol_id;

  DELETE FROM solicitacao_itens WHERE solicitacao_id = p_sol_id;

  INSERT INTO solicitacao_itens (
    solicitacao_id,
    produto_id,
    descricao_manual,
    quantidade,
    unidade,
    observacoes,
    cor_id
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
-- 5. registrar_recebimento
-- ---------------------------------------------------------------------------
-- Cria recebimento + itens e retorna o status calculado do pedido.
-- O status é calculado via trigger (ver abaixo) — a função apenas retorna
-- o valor recém-calculado após o insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_recebimento(
  p_pedido_id        uuid,
  p_responsavel_id   uuid,
  p_data_recebimento date,
  p_observacoes      text,
  p_itens            jsonb
  -- [{pedido_item_id, quantidade_recebida, observacoes}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec_id     uuid;
  v_status     text;
BEGIN
  -- Valida saldos dentro da transação (SELECT FOR SHARE evita race condition)
  PERFORM 1
  FROM pedido_itens pi
  WHERE pi.pedido_id = p_pedido_id
  FOR SHARE;

  -- Verifica se algum item excede o saldo
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
    WHERE (item->>'quantidade_recebida')::numeric >
          (pi.quantidade_pedida - COALESCE(recebido.total, 0))
      AND (item->>'quantidade_recebida')::numeric > 0
  ) THEN
    RAISE EXCEPTION 'Quantidade recebida excede o saldo pendente de um ou mais itens.';
  END IF;

  -- Insere recebimento
  INSERT INTO recebimentos (pedido_id, responsavel_id, data_recebimento, observacoes)
  VALUES (p_pedido_id, p_responsavel_id, p_data_recebimento, p_observacoes)
  RETURNING id INTO v_rec_id;

  -- Insere itens de recebimento (o trigger vai recalcular o status do pedido)
  INSERT INTO recebimento_itens (recebimento_id, pedido_item_id, quantidade_recebida, observacoes)
  SELECT
    v_rec_id,
    (item->>'pedido_item_id')::uuid,
    (item->>'quantidade_recebida')::numeric,
    NULLIF(item->>'observacoes', '')
  FROM jsonb_array_elements(p_itens) AS item
  WHERE (item->>'quantidade_recebida')::numeric > 0;

  -- Lê status atualizado pelo trigger
  SELECT status INTO v_status FROM pedidos_compra WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'recebimento_id', v_rec_id,
    'status_resultante', v_status
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Trigger — recalcular status do pedido após recebimento_itens
-- ---------------------------------------------------------------------------
-- Elimina a race condition: o status é calculado diretamente no banco,
-- dentro da mesma transação que inseriu os itens de recebimento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_status_pedido()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_id   uuid;
  v_pendente    numeric;
  v_novo_status text;
BEGIN
  -- Obtém o pedido_id a partir do pedido_item referenciado
  SELECT pi.pedido_id INTO v_pedido_id
  FROM pedido_itens pi
  WHERE pi.id = COALESCE(NEW.pedido_item_id, OLD.pedido_item_id);

  IF v_pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calcula saldo total pendente para o pedido
  SELECT COALESCE(SUM(pi.quantidade_pedida), 0)
       - COALESCE(SUM(ri_total.total_recebido), 0)
  INTO v_pendente
  FROM pedido_itens pi
  LEFT JOIN (
    SELECT pedido_item_id, SUM(quantidade_recebida) AS total_recebido
    FROM recebimento_itens
    GROUP BY pedido_item_id
  ) ri_total ON ri_total.pedido_item_id = pi.id
  WHERE pi.pedido_id = v_pedido_id;

  v_novo_status := CASE WHEN v_pendente <= 0 THEN 'RECEBIDO' ELSE 'RECEBIDO_PARCIAL' END;

  UPDATE pedidos_compra
  SET status = v_novo_status
  WHERE id = v_pedido_id
    AND status IN ('AGUARDANDO_RECEBIMENTO', 'RECEBIDO_PARCIAL');

  RETURN NEW;
END;
$$;

-- Associa o trigger a recebimento_itens (INSERT e DELETE)
DROP TRIGGER IF EXISTS trg_recalcular_status_pedido ON recebimento_itens;
CREATE TRIGGER trg_recalcular_status_pedido
  AFTER INSERT OR DELETE ON recebimento_itens
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_status_pedido();

-- ---------------------------------------------------------------------------
-- 7. excluir_pedidos_cascade
-- ---------------------------------------------------------------------------
-- Exclui pedidos e toda a cascade em uma única transação.
-- Retorna sol_ids e storage_paths para o side-effects consumer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION excluir_pedidos_cascade(
  p_pedido_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sol_ids      uuid[];
  v_storage_paths text[];
BEGIN
  -- Coleta solicitacao_ids vinculadas (antes de deletar)
  SELECT ARRAY_AGG(DISTINCT si.solicitacao_id)
  INTO v_sol_ids
  FROM pedido_itens pi
  JOIN solicitacao_itens si ON si.id = pi.solicitacao_item_id
  WHERE pi.pedido_id = ANY(p_pedido_ids)
    AND pi.solicitacao_item_id IS NOT NULL;

  -- Coleta caminhos de storage (antes de deletar)
  SELECT ARRAY_AGG(caminho_storage)
  INTO v_storage_paths
  FROM pedido_documentos
  WHERE pedido_id = ANY(p_pedido_ids);

  -- Cascade delete em ordem segura
  DELETE FROM pedido_anotacoes   WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedido_documentos  WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM recebimento_itens
  WHERE recebimento_id IN (
    SELECT id FROM recebimentos WHERE pedido_id = ANY(p_pedido_ids)
  );
  DELETE FROM recebimentos       WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedido_itens       WHERE pedido_id = ANY(p_pedido_ids);
  DELETE FROM pedidos_compra     WHERE id = ANY(p_pedido_ids);

  RETURN jsonb_build_object(
    'sol_ids',       COALESCE(to_jsonb(v_sol_ids), '[]'::jsonb),
    'storage_paths', COALESCE(to_jsonb(v_storage_paths), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. excluir_solicitacoes_cascade
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION excluir_solicitacoes_cascade(
  p_sol_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bloqueia se alguma estiver EM_PEDIDO
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
