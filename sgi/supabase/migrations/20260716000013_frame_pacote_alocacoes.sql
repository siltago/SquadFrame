-- ============================================================
-- SquadFrame — Bloco B: Alocação de solicitação/pedido/recebimento
-- ancorada na Necessidade de Material
-- ============================================================
-- Referência: documento mestre "Arquitetura de Pacotes de Trabalho",
-- Etapa 3 — versão enxuta acordada (sem infraestrutura de outbox
-- nova, sem Zod). A necessidade é a âncora de rastreabilidade — o
-- pacote é resolvido via necessidade → contexto → pacote, nunca por
-- soma implícita ou por lote_id de cabeçalho.
--
-- Princípio: solicitado, pedido e recebido são fatos diferentes,
-- cada um com sua tabela de alocação própria — nunca somados entre
-- si nem inferidos um do outro (seção 15.2/16.1 do doc mestre).
-- ============================================================

-- ── Alocação de item de solicitação ─────────────────────────
CREATE TABLE IF NOT EXISTS frame_solicitacao_item_alocacoes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_item_id    uuid NOT NULL REFERENCES solicitacao_itens(id),
  necessidade_id         uuid NOT NULL REFERENCES frame_pacote_necessidades(id),
  quantidade_alocada     numeric(14,3) NOT NULL CHECK (quantidade_alocada > 0),
  estado_administrativo  text NOT NULL DEFAULT 'ATIVA' CHECK (estado_administrativo IN ('ATIVA', 'CANCELADA')),
  motivo_cancelamento    text,
  criado_por             uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  cancelado_por          uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  cancelado_em           timestamptz,
  CONSTRAINT frame_sol_item_aloc_uk UNIQUE (solicitacao_item_id, necessidade_id),
  CONSTRAINT frame_sol_item_aloc_cancelamento_ck CHECK (
    (estado_administrativo = 'ATIVA' AND motivo_cancelamento IS NULL AND cancelado_por IS NULL AND cancelado_em IS NULL)
    OR
    (estado_administrativo = 'CANCELADA' AND motivo_cancelamento IS NOT NULL AND cancelado_por IS NOT NULL AND cancelado_em IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_frame_sol_item_aloc_item ON frame_solicitacao_item_alocacoes (solicitacao_item_id, estado_administrativo);
CREATE INDEX IF NOT EXISTS idx_frame_sol_item_aloc_necessidade ON frame_solicitacao_item_alocacoes (necessidade_id, estado_administrativo);

-- ── Alocação de item de pedido ───────────────────────────────
CREATE TABLE IF NOT EXISTS frame_pedido_item_alocacoes (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id                uuid NOT NULL REFERENCES pedido_itens(id),
  necessidade_id                uuid NOT NULL REFERENCES frame_pacote_necessidades(id),
  solicitacao_item_alocacao_id  uuid REFERENCES frame_solicitacao_item_alocacoes(id),
  quantidade_alocada            numeric(14,3) NOT NULL CHECK (quantidade_alocada > 0),
  origem_alocacao               text NOT NULL CHECK (origem_alocacao IN ('SOLICITACAO', 'COMPRA_DIRETA')),
  justificativa_compra_direta   text,
  estado_administrativo         text NOT NULL DEFAULT 'ATIVA' CHECK (estado_administrativo IN ('ATIVA', 'CANCELADA')),
  motivo_cancelamento           text,
  criado_por                    uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em                     timestamptz NOT NULL DEFAULT now(),
  cancelado_por                 uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  cancelado_em                  timestamptz,
  CONSTRAINT frame_ped_item_aloc_uk UNIQUE (pedido_item_id, necessidade_id),
  CONSTRAINT frame_ped_item_aloc_direta_ck CHECK (
    (origem_alocacao <> 'COMPRA_DIRETA') OR justificativa_compra_direta IS NOT NULL
  ),
  CONSTRAINT frame_ped_item_aloc_solicitacao_ck CHECK (
    (origem_alocacao <> 'SOLICITACAO') OR solicitacao_item_alocacao_id IS NOT NULL
  ),
  CONSTRAINT frame_ped_item_aloc_cancelamento_ck CHECK (
    (estado_administrativo = 'ATIVA' AND motivo_cancelamento IS NULL AND cancelado_por IS NULL AND cancelado_em IS NULL)
    OR
    (estado_administrativo = 'CANCELADA' AND motivo_cancelamento IS NOT NULL AND cancelado_por IS NOT NULL AND cancelado_em IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_frame_ped_item_aloc_item ON frame_pedido_item_alocacoes (pedido_item_id, estado_administrativo);
CREATE INDEX IF NOT EXISTS idx_frame_ped_item_aloc_necessidade ON frame_pedido_item_alocacoes (necessidade_id, estado_administrativo);

-- ── Alocação de item de recebimento ──────────────────────────
CREATE TABLE IF NOT EXISTS frame_recebimento_item_alocacoes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_item_id       uuid NOT NULL REFERENCES recebimento_itens(id),
  pedido_item_alocacao_id   uuid NOT NULL REFERENCES frame_pedido_item_alocacoes(id),
  quantidade_alocada        numeric(14,3) NOT NULL CHECK (quantidade_alocada > 0),
  estado_administrativo     text NOT NULL DEFAULT 'ATIVA' CHECK (estado_administrativo IN ('ATIVA', 'ESTORNADA')),
  motivo_estorno            text,
  criado_por                uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em                 timestamptz NOT NULL DEFAULT now(),
  estornado_por             uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  estornado_em              timestamptz,
  CONSTRAINT frame_rec_item_aloc_uk UNIQUE (recebimento_item_id, pedido_item_alocacao_id),
  CONSTRAINT frame_rec_item_aloc_estorno_ck CHECK (
    (estado_administrativo = 'ATIVA' AND motivo_estorno IS NULL AND estornado_por IS NULL AND estornado_em IS NULL)
    OR
    (estado_administrativo = 'ESTORNADA' AND motivo_estorno IS NOT NULL AND estornado_por IS NOT NULL AND estornado_em IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_frame_rec_item_aloc_item ON frame_recebimento_item_alocacoes (recebimento_item_id, estado_administrativo);
CREATE INDEX IF NOT EXISTS idx_frame_rec_item_aloc_pedido_aloc ON frame_recebimento_item_alocacoes (pedido_item_alocacao_id, estado_administrativo);

-- ============================================================
-- RPCs — cada uma valida saldo com lock antes de gravar (mesmo
-- padrão de registrar_recebimento: FOR UPDATE + revalidação).
-- ============================================================

-- ── SolicitaÃ§Ã£o ──
CREATE OR REPLACE FUNCTION fn_frame_allocate_requisition_item(
  p_solicitacao_item_id uuid,
  p_necessidade_id uuid,
  p_quantidade numeric,
  p_usuario_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd_item numeric;
  v_ja_alocado numeric;
  v_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  SELECT quantidade INTO v_qtd_item FROM solicitacao_itens WHERE id = p_solicitacao_item_id FOR UPDATE;
  IF v_qtd_item IS NULL THEN
    RAISE EXCEPTION 'Item de solicitação não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(quantidade_alocada), 0) INTO v_ja_alocado
  FROM frame_solicitacao_item_alocacoes
  WHERE solicitacao_item_id = p_solicitacao_item_id
    AND estado_administrativo = 'ATIVA'
    AND necessidade_id <> p_necessidade_id;

  IF v_ja_alocado + p_quantidade > v_qtd_item THEN
    RAISE EXCEPTION 'Quantidade alocada (%) excede a quantidade do item (%)', v_ja_alocado + p_quantidade, v_qtd_item
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO frame_solicitacao_item_alocacoes (solicitacao_item_id, necessidade_id, quantidade_alocada, criado_por)
  VALUES (p_solicitacao_item_id, p_necessidade_id, p_quantidade, p_usuario_id)
  ON CONFLICT (solicitacao_item_id, necessidade_id)
    DO UPDATE SET quantidade_alocada = EXCLUDED.quantidade_alocada
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_frame_cancel_requisition_allocation(
  p_id uuid, p_usuario_id uuid, p_motivo text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE frame_solicitacao_item_alocacoes
  SET estado_administrativo = 'CANCELADA', motivo_cancelamento = p_motivo,
      cancelado_por = p_usuario_id, cancelado_em = now()
  WHERE id = p_id;
END;
$$;

-- ── Pedido ──
CREATE OR REPLACE FUNCTION fn_frame_allocate_purchase_item(
  p_pedido_item_id uuid,
  p_necessidade_id uuid,
  p_quantidade numeric,
  p_origem text,
  p_solicitacao_item_alocacao_id uuid,
  p_justificativa text,
  p_usuario_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd_item numeric;
  v_ja_alocado numeric;
  v_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  IF p_origem = 'COMPRA_DIRETA' AND (p_justificativa IS NULL OR trim(p_justificativa) = '') THEN
    RAISE EXCEPTION 'Compra direta exige justificativa' USING ERRCODE = 'check_violation';
  END IF;

  SELECT quantidade_pedida INTO v_qtd_item FROM pedido_itens WHERE id = p_pedido_item_id FOR UPDATE;
  IF v_qtd_item IS NULL THEN
    RAISE EXCEPTION 'Item de pedido não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(quantidade_alocada), 0) INTO v_ja_alocado
  FROM frame_pedido_item_alocacoes
  WHERE pedido_item_id = p_pedido_item_id
    AND estado_administrativo = 'ATIVA'
    AND necessidade_id <> p_necessidade_id;

  IF v_ja_alocado + p_quantidade > v_qtd_item THEN
    RAISE EXCEPTION 'Quantidade alocada (%) excede a quantidade do item (%)', v_ja_alocado + p_quantidade, v_qtd_item
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO frame_pedido_item_alocacoes (
    pedido_item_id, necessidade_id, solicitacao_item_alocacao_id,
    quantidade_alocada, origem_alocacao, justificativa_compra_direta, criado_por
  ) VALUES (
    p_pedido_item_id, p_necessidade_id, p_solicitacao_item_alocacao_id,
    p_quantidade, p_origem, p_justificativa, p_usuario_id
  )
  ON CONFLICT (pedido_item_id, necessidade_id)
    DO UPDATE SET quantidade_alocada = EXCLUDED.quantidade_alocada
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_frame_cancel_purchase_allocation(
  p_id uuid, p_usuario_id uuid, p_motivo text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE frame_pedido_item_alocacoes
  SET estado_administrativo = 'CANCELADA', motivo_cancelamento = p_motivo,
      cancelado_por = p_usuario_id, cancelado_em = now()
  WHERE id = p_id;
END;
$$;

-- ── Recebimento ──
CREATE OR REPLACE FUNCTION fn_frame_allocate_receipt_item(
  p_recebimento_item_id uuid,
  p_pedido_item_alocacao_id uuid,
  p_quantidade numeric,
  p_usuario_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd_recebida numeric;
  v_ja_alocado_no_recebimento numeric;
  v_qtd_alocacao_pedido numeric;
  v_ja_recebido_da_alocacao numeric;
  v_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  SELECT quantidade_recebida INTO v_qtd_recebida FROM recebimento_itens WHERE id = p_recebimento_item_id FOR UPDATE;
  IF v_qtd_recebida IS NULL THEN
    RAISE EXCEPTION 'Item de recebimento não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(quantidade_alocada), 0) INTO v_ja_alocado_no_recebimento
  FROM frame_recebimento_item_alocacoes
  WHERE recebimento_item_id = p_recebimento_item_id
    AND estado_administrativo = 'ATIVA'
    AND pedido_item_alocacao_id <> p_pedido_item_alocacao_id;

  IF v_ja_alocado_no_recebimento + p_quantidade > v_qtd_recebida THEN
    RAISE EXCEPTION 'Quantidade alocada (%) excede a quantidade recebida (%)', v_ja_alocado_no_recebimento + p_quantidade, v_qtd_recebida
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT quantidade_alocada INTO v_qtd_alocacao_pedido
  FROM frame_pedido_item_alocacoes WHERE id = p_pedido_item_alocacao_id FOR UPDATE;
  IF v_qtd_alocacao_pedido IS NULL THEN
    RAISE EXCEPTION 'Alocação de pedido não encontrada' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT COALESCE(SUM(quantidade_alocada), 0) INTO v_ja_recebido_da_alocacao
  FROM frame_recebimento_item_alocacoes
  WHERE pedido_item_alocacao_id = p_pedido_item_alocacao_id
    AND estado_administrativo = 'ATIVA'
    AND recebimento_item_id <> p_recebimento_item_id;

  IF v_ja_recebido_da_alocacao + p_quantidade > v_qtd_alocacao_pedido THEN
    RAISE EXCEPTION 'Quantidade recebida (%) excede o saldo da alocação de pedido (%)', v_ja_recebido_da_alocacao + p_quantidade, v_qtd_alocacao_pedido
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO frame_recebimento_item_alocacoes (recebimento_item_id, pedido_item_alocacao_id, quantidade_alocada, criado_por)
  VALUES (p_recebimento_item_id, p_pedido_item_alocacao_id, p_quantidade, p_usuario_id)
  ON CONFLICT (recebimento_item_id, pedido_item_alocacao_id)
    DO UPDATE SET quantidade_alocada = EXCLUDED.quantidade_alocada
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_frame_reverse_receipt_allocation(
  p_id uuid, p_usuario_id uuid, p_motivo text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do estorno é obrigatório' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE frame_recebimento_item_alocacoes
  SET estado_administrativo = 'ESTORNADA', motivo_estorno = p_motivo,
      estornado_por = p_usuario_id, estornado_em = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_frame_allocate_requisition_item(uuid, uuid, numeric, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_cancel_requisition_allocation(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_allocate_purchase_item(uuid, uuid, numeric, text, uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_cancel_purchase_allocation(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_allocate_receipt_item(uuid, uuid, numeric, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_reverse_receipt_allocation(uuid, uuid, text) TO authenticated, service_role;

ALTER TABLE frame_solicitacao_item_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_pedido_item_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_recebimento_item_alocacoes ENABLE ROW LEVEL SECURITY;
