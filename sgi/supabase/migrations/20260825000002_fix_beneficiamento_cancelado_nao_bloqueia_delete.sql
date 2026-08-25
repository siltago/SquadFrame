-- Ajuste do fix anterior (20260825000001): bloquear a exclusão/edição do
-- pedido sempre que existir QUALQUER beneficiamento_itens vinculado era
-- bom demais — cancelar o beneficiamento não apaga essa linha (só muda o
-- status), então o usuário seguia a própria instrução do erro ("cancele o
-- beneficiamento antes") e continuava travado, sem forma nenhuma de sair
-- do estado.
--
-- Regra correta: só bloqueia se o beneficiamento vinculado ainda está
-- ATIVO (não CANCELADO), ou se — mesmo cancelado — já chegou a receber
-- material (beneficiamento_recebimento_itens não vazio, caso raro que
-- merece atenção manual em vez de limpeza automática). Beneficiamento
-- cancelado sem nenhum recebimento nunca teve impacto real em estoque/
-- carteira — é seguro remover a linha de beneficiamento_itens (cascade
-- cuida do resto) pra liberar o item do pedido.

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
  v_numero        text;
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    PERFORM fn_exigir_permissao(p_usuario_id, 'compras.pedido.excluir');
  END IF;

  -- Beneficiamento ainda ativo (não cancelado) bloqueia de verdade.
  SELECT pc.numero INTO v_numero
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamentos b ON b.id = bi.beneficiamento_id
  JOIN pedidos_compra pc ON pc.id = pi.pedido_id
  WHERE pi.pedido_id = ANY(p_pedido_ids)
    AND b.status != 'CANCELADO'
  LIMIT 1;
  IF v_numero IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido % não pode ser excluído — tem item já enviado pra beneficiamento. Cancele o beneficiamento correspondente antes.', v_numero;
  END IF;

  -- Beneficiamento cancelado mas que já recebeu material — não limpa
  -- sozinho, precisa de atenção manual (caso raro).
  SELECT pc.numero INTO v_numero
  FROM pedido_itens pi
  JOIN beneficiamento_itens bi ON bi.pedido_item_origem_id = pi.id
  JOIN beneficiamento_recebimento_itens bri ON bri.beneficiamento_item_id = bi.id
  JOIN pedidos_compra pc ON pc.id = pi.pedido_id
  WHERE pi.pedido_id = ANY(p_pedido_ids)
  LIMIT 1;
  IF v_numero IS NOT NULL THEN
    RAISE EXCEPTION 'Pedido % não pode ser excluído — o beneficiamento vinculado já teve recebimento registrado, mesmo cancelado. Contate o suporte.', v_numero;
  END IF;

  -- Beneficiamento cancelado e sem recebimento — seguro remover, libera o item.
  DELETE FROM beneficiamento_itens
  WHERE pedido_item_origem_id IN (SELECT id FROM pedido_itens WHERE pedido_id = ANY(p_pedido_ids));

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

  DELETE FROM frame_recebimento_item_alocacoes
  WHERE pedido_item_alocacao_id IN (
    SELECT fpa.id
    FROM frame_pedido_item_alocacoes fpa
    JOIN pedido_itens pi ON pi.id = fpa.pedido_item_id
    WHERE pi.pedido_id = ANY(p_pedido_ids)
  );

  DELETE FROM frame_pedido_item_alocacoes
  WHERE pedido_item_id IN (SELECT id FROM pedido_itens WHERE pedido_id = ANY(p_pedido_ids));

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
