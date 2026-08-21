-- criar_beneficiamento v3 — insere em pedidos_beneficiamento (entidade
-- separada) em vez de pedidos_compra. Beneficiamentos novos gravam
-- beneficiamentos.pedido_beneficiamento_id (pedido_pintura_id fica NULL).
-- Assinatura muda: perde p_numero (não precisa mais, sem numero próprio —
-- beneficiamentos.numero já é o identificador visível).
CREATE OR REPLACE FUNCTION criar_beneficiamento(
  p_pedido_origem_id    uuid,
  p_rota                text,
  p_obra_id             uuid,
  p_fornecedor_id       uuid,
  p_forma_pagamento_id  uuid,
  p_comprador_id        uuid,
  p_observacoes         text,
  p_itens               jsonb  -- [{pedido_item_origem_id, produto_cru_id, cor_id, descricao_snapshot, quantidade, unidade}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_beneficiamento_id uuid;
  v_beneficiamento_id        uuid;
  v_numero_benef             text;
  v_produto_id               uuid;
  v_cor_id                   uuid;
  item                       jsonb;
BEGIN
  PERFORM fn_exigir_permissao(p_comprador_id, 'compras.beneficiamento.criar');

  IF p_rota NOT IN ('VIA_FABRICA', 'DIRETO_FORNECEDOR') THEN
    RAISE EXCEPTION 'Rota inválida: %', p_rota;
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um item pra beneficiar.';
  END IF;

  INSERT INTO pedidos_beneficiamento (
    obra_id, fornecedor_id, forma_pagamento_id, comprador_id, observacoes
  ) VALUES (
    p_obra_id, p_fornecedor_id, p_forma_pagamento_id, p_comprador_id, p_observacoes
  )
  RETURNING id INTO v_pedido_beneficiamento_id;

  v_numero_benef := 'BNF-' || nextval('beneficiamento_numero_seq')::text;

  INSERT INTO beneficiamentos (
    numero, pedido_origem_id, pedido_beneficiamento_id, obra_id, rota, criado_por, observacoes
  ) VALUES (
    v_numero_benef, p_pedido_origem_id, v_pedido_beneficiamento_id, p_obra_id, p_rota, p_comprador_id, p_observacoes
  )
  RETURNING id INTO v_beneficiamento_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := (item->>'produto_cru_id')::uuid;
    v_cor_id      := NULLIF(item->>'cor_id', '')::uuid;

    INSERT INTO beneficiamento_itens (
      beneficiamento_id, pedido_item_origem_id, produto_cru_id, produto_pintado_id, cor_id, quantidade
    ) VALUES (
      v_beneficiamento_id,
      (item->>'pedido_item_origem_id')::uuid,
      v_produto_id,
      v_produto_id,
      v_cor_id,
      (item->>'quantidade')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_beneficiamento_id,
    'numero', v_numero_benef,
    'pedido_beneficiamento_id', v_pedido_beneficiamento_id
  );
END;
$$;

-- Nova assinatura — remove a antiga explicitamente (Postgres não faz
-- overload discovery por nome só, precisa dropar a assinatura velha).
DROP FUNCTION IF EXISTS criar_beneficiamento(text, uuid, text, uuid, uuid, uuid, uuid, text, jsonb);
GRANT EXECUTE ON FUNCTION criar_beneficiamento(uuid, text, uuid, uuid, uuid, uuid, text, jsonb) TO authenticated, service_role;
