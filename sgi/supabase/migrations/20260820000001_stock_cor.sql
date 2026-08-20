-- Beneficiamento com cor RAL do mesmo produto — o item pintado deixa de
-- exigir um produto NOVO no catálogo, passa a ser o MESMO produto (mesmo
-- codigo_mestre) com uma cor RAL vinculada (pedido_itens.cor_id, que já
-- existia e já era o padrão vigente pra "item de pedido com cor").
--
-- Pré-requisito disso funcionar sem misturar saldo: o estoque precisa
-- diferenciar "natural em estoque" de "já pintado em estoque" — hoje
-- stock_saldos/stock_movimentacoes só têm produto_id, sem cor (ver
-- comentário em 20260730000001_beneficiamento.sql, que documentava essa
-- limitação como o motivo de cru/pintado serem produtos diferentes — essa
-- premissa deixa de valer a partir desta migration).

-- ---------------------------------------------------------------------------
-- beneficiamento_itens.cor_id — cor RAL escolhida pro item pintado.
-- produto_pintado_id passa a ser sempre igual a produto_cru_id daqui pra
-- frente (mesmo produto do catálogo) — a coluna é mantida só por
-- compatibilidade com beneficiamentos antigos (produto genuinamente
-- diferente). Sem backfill: linhas antigas ficam com cor_id NULL e
-- continuam corretas do jeito que estão.
-- ---------------------------------------------------------------------------
ALTER TABLE beneficiamento_itens
  ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES cores_ral(id);

-- ---------------------------------------------------------------------------
-- cor_id em stock_movimentacoes/stock_saldos — cor_id IS NULL continua
-- significando "natural/sem cor", nenhuma linha existente muda de
-- significado.
-- ---------------------------------------------------------------------------
ALTER TABLE stock_movimentacoes ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES cores_ral(id);
ALTER TABLE stock_saldos        ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES cores_ral(id);

CREATE INDEX IF NOT EXISTS idx_stock_movimentacoes_produto_cor ON stock_movimentacoes (produto_id, cor_id);
CREATE INDEX IF NOT EXISTS idx_stock_saldos_produto_cor ON stock_saldos (produto_id, cor_id);

-- ---------------------------------------------------------------------------
-- Índices únicos de stock_saldos — de 2 (com/sem obra) pra 4 (cruzando
-- com/sem obra × com/sem cor). São só uma trava de segurança extra — a
-- trigger abaixo NÃO depende deles (usa UPDATE-depois-INSERT, não
-- ON CONFLICT, desde a correção em 20260729000006_fix_stock_saldo_upsert.sql).
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS stock_saldos_uniq_com_obra;
DROP INDEX IF EXISTS stock_saldos_uniq_sem_obra;

CREATE UNIQUE INDEX stock_saldos_uniq_com_obra_com_cor
  ON stock_saldos (produto_id, local_id, obra_id, cor_id)
  WHERE obra_id IS NOT NULL AND cor_id IS NOT NULL;

CREATE UNIQUE INDEX stock_saldos_uniq_com_obra_sem_cor
  ON stock_saldos (produto_id, local_id, obra_id)
  WHERE obra_id IS NOT NULL AND cor_id IS NULL;

CREATE UNIQUE INDEX stock_saldos_uniq_sem_obra_com_cor
  ON stock_saldos (produto_id, local_id, cor_id)
  WHERE obra_id IS NULL AND cor_id IS NOT NULL;

CREATE UNIQUE INDEX stock_saldos_uniq_sem_obra_sem_cor
  ON stock_saldos (produto_id, local_id)
  WHERE obra_id IS NULL AND cor_id IS NULL;

-- ---------------------------------------------------------------------------
-- stock_fn_aplicar_movimentacao — propaga cor_id (mesma técnica de
-- IS NOT DISTINCT FROM já usada pra obra_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stock_fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  UPDATE stock_saldos
  SET quantidade = quantidade + NEW.quantidade, atualizado_em = now()
  WHERE produto_id = NEW.produto_id
    AND local_id = NEW.local_id
    AND obra_id IS NOT DISTINCT FROM NEW.obra_id
    AND cor_id  IS NOT DISTINCT FROM NEW.cor_id;

  IF NOT FOUND THEN
    INSERT INTO stock_saldos (produto_id, local_id, obra_id, cor_id, quantidade, atualizado_em)
    VALUES (NEW.produto_id, NEW.local_id, NEW.obra_id, NEW.cor_id, NEW.quantidade, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- stock_fn_entrada_por_recebimento — lê cor_id do pedido_item e propaga.
-- É o elo que faz o recebimento do pedido de pintura (cujo pedido_itens.cor_id
-- carrega a cor escolhida na criação do beneficiamento) creditar estoque no
-- bucket certo, separado do natural.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stock_fn_entrada_por_recebimento() RETURNS trigger AS $$
DECLARE
  v_produto_id uuid;
  v_cor_id     uuid;
  v_obra_id    uuid;
  v_local_id   uuid;
BEGIN
  SELECT pi.produto_id, pi.cor_id, pc.obra_id INTO v_produto_id, v_cor_id, v_obra_id
  FROM pedido_itens pi JOIN pedidos_compra pc ON pc.id = pi.pedido_id
  WHERE pi.id = NEW.pedido_item_id;

  SELECT id INTO v_local_id FROM stock_locais WHERE nome = 'Não alocado';

  IF v_produto_id IS NOT NULL AND v_local_id IS NOT NULL THEN
    INSERT INTO stock_movimentacoes (numero, produto_id, local_id, obra_id, cor_id, tipo, quantidade, origem_tipo, origem_id)
    VALUES (gerar_numero_movimento_estoque(), v_produto_id, v_local_id, v_obra_id, v_cor_id, 'ENTRADA', NEW.quantidade_recebida, 'recebimento_pedido', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- criar_beneficiamento — p_itens muda de formato: cada item traz cor_id em
-- vez de produto_pintado_id (que deixa de vir do client, é sempre igual a
-- produto_cru_id). Mesma assinatura, mesma lógica de resto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION criar_beneficiamento(
  p_numero              text,
  p_pedido_origem_id    uuid,
  p_rota                text,
  p_obra_id             uuid,
  p_fornecedor_id       uuid,
  p_forma_pagamento_id  uuid,
  p_comprador_id        uuid,
  p_observacoes         text,
  p_itens               jsonb   -- [{pedido_item_origem_id, produto_cru_id, cor_id, descricao_snapshot, quantidade, unidade}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_pintura_id uuid;
  v_beneficiamento_id uuid;
  v_numero_benef      text;
  v_pedido_item_id    uuid;
  v_produto_id        uuid;
  v_cor_id            uuid;
  item                jsonb;
BEGIN
  PERFORM fn_exigir_permissao(p_comprador_id, 'compras.beneficiamento.criar');

  IF p_rota NOT IN ('VIA_FABRICA', 'DIRETO_FORNECEDOR') THEN
    RAISE EXCEPTION 'Rota inválida: %', p_rota;
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um item pra beneficiar.';
  END IF;

  INSERT INTO pedidos_compra (
    numero, obra_id, fornecedor_id, forma_pagamento_id, comprador_id, observacoes, origem_contexto
  ) VALUES (
    p_numero, p_obra_id, p_fornecedor_id, p_forma_pagamento_id, p_comprador_id, p_observacoes, 'BENEFICIAMENTO'
  )
  RETURNING id INTO v_pedido_pintura_id;

  v_numero_benef := 'BNF-' || nextval('beneficiamento_numero_seq')::text;

  INSERT INTO beneficiamentos (
    numero, pedido_origem_id, pedido_pintura_id, obra_id, rota, criado_por, observacoes
  ) VALUES (
    v_numero_benef, p_pedido_origem_id, v_pedido_pintura_id, p_obra_id, p_rota, p_comprador_id, p_observacoes
  )
  RETURNING id INTO v_beneficiamento_id;

  FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_produto_id := (item->>'produto_cru_id')::uuid;
    v_cor_id      := NULLIF(item->>'cor_id', '')::uuid;

    INSERT INTO pedido_itens (pedido_id, produto_id, cor_id, descricao_snapshot, quantidade_pedida, unidade)
    VALUES (
      v_pedido_pintura_id,
      v_produto_id,
      v_cor_id,
      item->>'descricao_snapshot',
      (item->>'quantidade')::numeric,
      item->>'unidade'
    )
    RETURNING id INTO v_pedido_item_id;

    INSERT INTO beneficiamento_itens (
      beneficiamento_id, pedido_item_origem_id, pedido_item_pintura_id,
      produto_cru_id, produto_pintado_id, cor_id, quantidade
    ) VALUES (
      v_beneficiamento_id,
      (item->>'pedido_item_origem_id')::uuid,
      v_pedido_item_id,
      v_produto_id,
      v_produto_id,
      v_cor_id,
      (item->>'quantidade')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_beneficiamento_id,
    'numero', v_numero_benef,
    'pedido_pintura_id', v_pedido_pintura_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION criar_beneficiamento(text, uuid, text, uuid, uuid, uuid, uuid, text, jsonb) TO authenticated, service_role;
