-- solicitacoes_compra nunca teve fornecedor_id nem tipo_linha — só
-- pedidos_compra tinha. Quem abria uma solicitação não conseguia indicar
-- de qual tipo de material se trata (vidro, perfil etc.) nem, se já
-- soubesse, o fornecedor — informação que se perdia e tinha que ser
-- redigitada do zero na hora de gerar o pedido. fornecedor_id fica
-- opcional (diferente de pedidos_compra.fornecedor_id, que é obrigatório):
-- quem solicita nem sempre já sabe de quem vai comprar.
ALTER TABLE solicitacoes_compra
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES fornecedores(id),
  ADD COLUMN IF NOT EXISTS tipo_linha text;

-- Mesma assinatura + 2 params novos no final (com DEFAULT NULL) — segue o
-- padrão já usado nesta sessão pra registrar_recebimento: DROP explícito
-- do overload antigo antes do CREATE OR REPLACE, senão PostgREST não
-- consegue resolver a chamada quando os novos params são omitidos
-- (PGRST203, mesma armadilha de criar_pedido/criar_solicitacao antigos).
DROP FUNCTION IF EXISTS criar_solicitacao(uuid, text, text, text, text, uuid, jsonb, uuid, text);

CREATE OR REPLACE FUNCTION criar_solicitacao(
  p_obra_id         uuid,
  p_origem          text,
  p_prioridade      text,
  p_justificativa   text,
  p_observacoes     text,
  p_solicitante_id  uuid,
  p_itens           jsonb,
  p_lote_id         uuid DEFAULT NULL,
  p_origem_contexto text DEFAULT NULL,
  p_fornecedor_id   uuid DEFAULT NULL,
  p_tipo_linha      text DEFAULT NULL
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
    lote_id, origem_contexto, fornecedor_id, tipo_linha
  ) VALUES (
    p_obra_id, p_origem, p_prioridade, p_justificativa, p_observacoes, p_solicitante_id,
    p_lote_id, p_origem_contexto, p_fornecedor_id, p_tipo_linha
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

GRANT EXECUTE ON FUNCTION criar_solicitacao(uuid, text, text, text, text, uuid, jsonb, uuid, text, uuid, text) TO authenticated, service_role;
