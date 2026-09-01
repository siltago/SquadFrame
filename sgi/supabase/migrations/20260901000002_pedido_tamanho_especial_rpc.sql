-- criar_pedido / editar_pedido passam a aceitar tamanho_mm_especial por
-- item (barra fora do padrão cadastrado no produto — ver migration
-- 20260901000001). Mesma assinatura das duas funções, só adiciona a
-- coluna nova na INSERT.

CREATE OR REPLACE FUNCTION criar_pedido(
  p_numero              text,
  p_obra_id             uuid,
  p_fornecedor_id       uuid,
  p_forma_pagamento_id  uuid,
  p_comprador_id        uuid,
  p_observacoes         text,
  p_tipo_linha          text,
  p_cor_id              uuid,
  p_itens               jsonb,
  p_lote_id             uuid DEFAULT NULL,
  p_origem_contexto     text DEFAULT NULL
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
    comprador_id, observacoes, tipo_linha, cor_id,
    lote_id, origem_contexto
  ) VALUES (
    p_numero, p_obra_id, p_fornecedor_id, p_forma_pagamento_id,
    p_comprador_id, p_observacoes, p_tipo_linha, p_cor_id,
    p_lote_id, p_origem_contexto
  )
  RETURNING id INTO v_pedido_id;

  INSERT INTO pedido_itens (
    pedido_id, produto_id, descricao_snapshot, quantidade_pedida,
    unidade, preco_unitario, codigo_fornecedor, produto_fornecedor_id,
    obra_id, solicitacao_item_id, largura_m, altura_m, qtd_pecas, cor_id,
    tamanho_mm_especial
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
    NULLIF(item->>'cor_id', '')::uuid,
    NULLIF(item->>'tamanho_mm_especial', '')::numeric
  FROM jsonb_array_elements(p_itens) AS item;

  RETURN jsonb_build_object('id', v_pedido_id, 'numero', p_numero);
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
DECLARE
  v_desc text;
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.pedido.criar');
  END IF;

  SELECT pi.descricao_snapshot INTO v_desc
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  WHERE pi.pedido_id = p_pedido_id
    AND b.status != 'CANCELADO'
  LIMIT 1;
  IF v_desc IS NOT NULL THEN
    RAISE EXCEPTION 'Este pedido não pode ser editado — o item "%" já foi enviado pra beneficiamento. Cancele o beneficiamento correspondente antes de editar os itens deste pedido.', v_desc;
  END IF;

  SELECT pi.descricao_snapshot INTO v_desc
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamento_recebimento_itens bri ON bri.beneficiamento_item_id = bi.id
  WHERE pi.pedido_id = p_pedido_id
  LIMIT 1;
  IF v_desc IS NOT NULL THEN
    RAISE EXCEPTION 'Este pedido não pode ser editado — o item "%" tem beneficiamento cancelado com recebimento já registrado. Contate o suporte.', v_desc;
  END IF;

  DELETE FROM beneficiamento_itens
  WHERE pedido_item_origem_id IN (SELECT id FROM pedido_itens WHERE pedido_id = p_pedido_id);

  UPDATE pedidos_compra SET
    fornecedor_id      = p_fornecedor_id,
    obra_id            = p_obra_id,
    forma_pagamento_id = p_forma_pagamento_id,
    cor_id             = p_cor_id,
    observacoes        = p_observacoes,
    prazo_entrega       = p_prazo_entrega,
    atualizado_em      = now()
  WHERE id = p_pedido_id;

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
    obra_id, solicitacao_item_id, largura_m, altura_m, qtd_pecas, cor_id,
    tamanho_mm_especial
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
    NULLIF(item->>'cor_id', '')::uuid,
    NULLIF(item->>'tamanho_mm_especial', '')::numeric
  FROM jsonb_array_elements(p_itens) AS item;
END;
$$;
