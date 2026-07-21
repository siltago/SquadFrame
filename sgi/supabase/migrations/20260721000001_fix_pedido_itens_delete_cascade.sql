-- Bug real: excluir_pedidos_cascade, editar_pedido e aprovar_retorno_pedido
-- fazem DELETE FROM pedido_itens sem antes limpar as tabelas mais novas que
-- passaram a referenciar pedido_itens (frame_pedido_item_alocacoes, do
-- Bloco B de alocação) e devolucao_itens (devolução de pedido) — nenhuma
-- dessas FKs tem ON DELETE CASCADE, então o delete falha com
-- "violates foreign key constraint ... _fkey" assim que existe qualquer
-- alocação ou devolução vinculada ao item.
--
-- excluir_pedidos_cascade também precisa limpar frame_recebimento_item_
-- alocacoes antes de DELETE FROM recebimento_itens, pelo mesmo motivo.

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

  -- Bloco B: alocação recebimento→pedido precisa sair antes de recebimento_itens
  -- e antes de frame_pedido_item_alocacoes (referencia as duas).
  DELETE FROM frame_recebimento_item_alocacoes
  WHERE pedido_item_alocacao_id IN (
    SELECT fpa.id
    FROM frame_pedido_item_alocacoes fpa
    JOIN pedido_itens pi ON pi.id = fpa.pedido_item_id
    WHERE pi.pedido_id = ANY(p_pedido_ids)
  );

  DELETE FROM frame_pedido_item_alocacoes
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = ANY(p_pedido_ids));

  -- Devolução: devolucao_itens.pedido_item_id bloqueia o delete de
  -- pedido_itens; apaga a devolução inteira (cascata já limpa devolucao_itens
  -- via devolucao_id).
  DELETE FROM devolucoes_compra WHERE pedido_id = ANY(p_pedido_ids);

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
    prazo_entrega       = p_prazo_entrega,
    atualizado_em      = now()
  WHERE id = p_pedido_id;

  -- Itens vão ser substituídos por completo — qualquer alocação (Bloco B) ou
  -- devolução presa aos itens antigos precisa sair antes, senão o DELETE
  -- abaixo quebra com FK violation (mesma causa do excluir_pedidos_cascade).
  DELETE FROM frame_recebimento_item_alocacoes
  WHERE pedido_item_alocacao_id IN (
    SELECT fpa.id
    FROM frame_pedido_item_alocacoes fpa
    JOIN pedido_itens pi ON pi.id = fpa.pedido_item_id
    WHERE pi.pedido_id = p_pedido_id
  );
  DELETE FROM frame_pedido_item_alocacoes
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = p_pedido_id);
  DELETE FROM devolucao_itens
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = p_pedido_id);

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

CREATE OR REPLACE FUNCTION aprovar_retorno_pedido(
  p_retorno_id uuid,
  p_usuario_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_retorno pedido_retornos%ROWTYPE;
  v_alt     jsonb;
  v_item    jsonb;
BEGIN
  SELECT * INTO v_retorno FROM pedido_retornos WHERE id = p_retorno_id FOR UPDATE;
  IF NOT FOUND        THEN RAISE EXCEPTION 'Retorno não encontrado.'; END IF;
  IF v_retorno.status != 'PENDENTE' THEN RAISE EXCEPTION 'Retorno não está pendente.'; END IF;

  v_alt := v_retorno.alteracoes;

  -- Atualiza campos do pedido e libera o retorno pendente
  UPDATE pedidos_compra SET
    retorno_pendente_id = NULL,
    status              = v_retorno.etapa_anterior,
    fornecedor_id       = COALESCE(NULLIF(v_alt->>'fornecedor_id','')::uuid, fornecedor_id),
    obra_id             = NULLIF(v_alt->>'obra_id','')::uuid,
    forma_pagamento_id  = NULLIF(v_alt->>'forma_pagamento_id','')::uuid,
    cor_id              = NULLIF(v_alt->>'cor_id','')::uuid,
    observacoes         = NULLIF(v_alt->>'observacoes',''),
    prazo_entrega       = NULLIF(v_alt->>'prazo_entrega','')::date
  WHERE id = v_retorno.pedido_id;

  -- Mesma limpeza de dependências novas (Bloco B / devolução) que
  -- editar_pedido precisa fazer antes de substituir os itens.
  DELETE FROM frame_recebimento_item_alocacoes
  WHERE pedido_item_alocacao_id IN (
    SELECT fpa.id
    FROM frame_pedido_item_alocacoes fpa
    JOIN pedido_itens pi ON pi.id = fpa.pedido_item_id
    WHERE pi.pedido_id = v_retorno.pedido_id
  );
  DELETE FROM frame_pedido_item_alocacoes
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id);
  DELETE FROM devolucao_itens
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id);

  -- Substitui itens do pedido
  DELETE FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_alt->'itens') LOOP
    INSERT INTO pedido_itens (
      pedido_id, produto_id, descricao_snapshot, quantidade_pedida, unidade,
      preco_unitario, codigo_fornecedor, obra_id, largura_m, altura_m, qtd_pecas, cor_id
    ) VALUES (
      v_retorno.pedido_id,
      NULLIF(v_item->>'produto_id','')::uuid,
      v_item->>'descricao_snapshot',
      (v_item->>'quantidade_pedida')::numeric,
      COALESCE(NULLIF(v_item->>'unidade',''), 'UN'),
      NULLIF(v_item->>'preco_unitario','')::numeric,
      NULLIF(v_item->>'codigo_fornecedor',''),
      NULLIF(v_item->>'obra_id','')::uuid,
      NULLIF(v_item->>'largura_m','')::numeric,
      NULLIF(v_item->>'altura_m','')::numeric,
      NULLIF(v_item->>'qtd_pecas','')::numeric,
      NULLIF(v_item->>'cor_id','')::uuid
    );
  END LOOP;

  -- Marca retorno como aprovado
  UPDATE pedido_retornos SET
    status       = 'APROVADO',
    aprovado_por = p_usuario_id,
    resolvido_em = now()
  WHERE id = p_retorno_id;

  INSERT INTO compra_historico (entidade, entidade_id, acao, dados, usuario_id)
  VALUES ('pedido', v_retorno.pedido_id, 'RETORNO_APROVADO',
    jsonb_build_object('retorno_id', p_retorno_id, 'etapa_anterior', v_retorno.etapa_anterior, 'motivo', v_retorno.motivo),
    p_usuario_id);
END;
$$;
