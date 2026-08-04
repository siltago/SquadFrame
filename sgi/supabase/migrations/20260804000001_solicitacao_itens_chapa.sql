-- solicitacao_itens nunca teve como guardar dimensões de CHAPA (largura/
-- altura/qtd de peças) — só existiam em pedido_itens. Quem solicitava um
-- item de chapa só conseguia digitar uma quantidade genérica, sem L×A, e
-- media de novo na hora de gerar o pedido. Mesmas colunas de pedido_itens
-- (ver 20260625000000_remote_schema.sql), mesma semântica: "quantidade"
-- guarda a contagem de peças quando é chapa (não a área).
ALTER TABLE solicitacao_itens
  ADD COLUMN IF NOT EXISTS largura_m numeric,
  ADD COLUMN IF NOT EXISTS altura_m  numeric,
  ADD COLUMN IF NOT EXISTS qtd_pecas numeric;

-- Mesma assinatura de sempre — CREATE OR REPLACE substitui limpo, sem
-- risco de overload ambíguo (só muda o corpo, não a lista de parâmetros).
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
    quantidade, unidade, observacoes, cor_id,
    largura_m, altura_m, qtd_pecas
  )
  SELECT
    v_sol_id,
    NULLIF(item->>'produto_id', '')::uuid,
    NULLIF(item->>'descricao_manual', ''),
    (item->>'quantidade')::numeric,
    item->>'unidade',
    NULLIF(item->>'observacoes', ''),
    NULLIF(item->>'cor_id', '')::uuid,
    NULLIF(item->>'largura_m', '')::numeric,
    NULLIF(item->>'altura_m', '')::numeric,
    NULLIF(item->>'qtd_pecas', '')::numeric
  FROM jsonb_array_elements(p_itens) AS item;

  RETURN jsonb_build_object('id', v_sol_id, 'numero', v_numero);
END;
$$;
