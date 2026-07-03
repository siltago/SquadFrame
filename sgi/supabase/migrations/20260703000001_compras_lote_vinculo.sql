-- Fase 3: rastreabilidade Produção > Pacote de Trabalho > Solicitação > Pedido.
-- Vínculo opcional (lote_id nullable) — não altera nenhuma regra de negócio
-- existente, não torna obrigatório, não quebra fluxo atual de Compras.

ALTER TABLE public.solicitacoes_compra
  ADD COLUMN IF NOT EXISTS lote_id          uuid REFERENCES public.lotes_obra(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_contexto  text;

ALTER TABLE public.pedidos_compra
  ADD COLUMN IF NOT EXISTS lote_id          uuid REFERENCES public.lotes_obra(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_contexto  text;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_lote_id
  ON public.solicitacoes_compra (lote_id) WHERE lote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_lote_id
  ON public.pedidos_compra (lote_id) WHERE lote_id IS NOT NULL;

COMMENT ON COLUMN public.solicitacoes_compra.lote_id         IS 'Pacote de Trabalho (lotes_obra) de origem, quando a solicitação nasce da aba Produção. Opcional.';
COMMENT ON COLUMN public.solicitacoes_compra.origem_contexto IS 'Contexto de criação (ex: PRODUCAO_PACOTE). NULL = fluxo normal de Compras.';
COMMENT ON COLUMN public.pedidos_compra.lote_id               IS 'Pacote de Trabalho (lotes_obra) vinculado — direto ou herdado da solicitação de origem. Opcional.';
COMMENT ON COLUMN public.pedidos_compra.origem_contexto       IS 'Contexto de criação (ex: PRODUCAO_PACOTE). NULL = fluxo normal de Compras.';

-- ── RPCs — adiciona parâmetros opcionais (DEFAULT NULL) sem alterar
-- assinatura de nenhum parâmetro existente. Chamadas atuais (que não
-- passam p_lote_id/p_origem_contexto) continuam funcionando idênticas.

CREATE OR REPLACE FUNCTION criar_solicitacao(
  p_obra_id         uuid,
  p_origem          text,
  p_prioridade      text,
  p_justificativa   text,
  p_observacoes     text,
  p_solicitante_id  uuid,
  p_itens           jsonb,
  p_lote_id         uuid DEFAULT NULL,
  p_origem_contexto text DEFAULT NULL
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
    obra_id, origem, prioridade, justificativa, observacoes, solicitante_id,
    lote_id, origem_contexto
  ) VALUES (
    p_obra_id, p_origem, p_prioridade, p_justificativa, p_observacoes, p_solicitante_id,
    p_lote_id, p_origem_contexto
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
