-- aprovar_retorno_pedido também precisa gravar tamanho_mm_especial (barra
-- especial por item — ver migration 20260901000001) quando reconstrói os
-- itens do pedido a partir do retorno aprovado.
CREATE OR REPLACE FUNCTION aprovar_retorno_pedido(
  p_retorno_id uuid,
  p_usuario_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_retorno pedido_retornos%ROWTYPE;
  v_alt     jsonb;
  v_item    jsonb;
  v_desc    text;
BEGIN
  SELECT * INTO v_retorno FROM pedido_retornos WHERE id = p_retorno_id FOR UPDATE;
  IF NOT FOUND        THEN RAISE EXCEPTION 'Retorno não encontrado.'; END IF;
  IF v_retorno.status != 'PENDENTE' THEN RAISE EXCEPTION 'Retorno não está pendente.'; END IF;

  SELECT pi.descricao_snapshot INTO v_desc
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  WHERE pi.pedido_id = v_retorno.pedido_id
    AND b.status != 'CANCELADO'
  LIMIT 1;
  IF v_desc IS NOT NULL THEN
    RAISE EXCEPTION 'Este pedido não pode ter o retorno aprovado — o item "%" já foi enviado pra beneficiamento. Cancele o beneficiamento correspondente antes.', v_desc;
  END IF;

  SELECT pi.descricao_snapshot INTO v_desc
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamento_recebimento_itens bri ON bri.beneficiamento_item_id = bi.id
  WHERE pi.pedido_id = v_retorno.pedido_id
  LIMIT 1;
  IF v_desc IS NOT NULL THEN
    RAISE EXCEPTION 'Este pedido não pode ter o retorno aprovado — o item "%" tem beneficiamento cancelado com recebimento já registrado. Contate o suporte.', v_desc;
  END IF;

  DELETE FROM beneficiamento_itens
  WHERE pedido_item_origem_id IN (SELECT id FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id);

  v_alt := v_retorno.alteracoes;

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

  DELETE FROM pedido_itens WHERE pedido_id = v_retorno.pedido_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_alt->'itens') LOOP
    INSERT INTO pedido_itens (
      pedido_id, produto_id, descricao_snapshot, quantidade_pedida, unidade,
      preco_unitario, codigo_fornecedor, obra_id, largura_m, altura_m, qtd_pecas, cor_id,
      tamanho_mm_especial
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
      NULLIF(v_item->>'cor_id','')::uuid,
      NULLIF(v_item->>'tamanho_mm_especial','')::numeric
    );
  END LOOP;

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
