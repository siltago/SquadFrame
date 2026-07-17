-- ============================================================
-- SquadFrame — Bloco A: Contexto de Compras do Pacote de Trabalho
-- ============================================================
-- Referência: docs/producao/arquitetura-alvo-pacote-unico.md (auditoria)
-- + documento mestre "Arquitetura de Pacotes de Trabalho" (Etapas 1-4,
-- versão enxuta acordada: sem Lista de Materiais formal versionada,
-- sem wise_pacote_revisoes, sem ledger de eventos — reaproveita
-- lotes_obra.revisao (já existe) e o event bus existente).
--
-- lotes_obra continua sendo o Pacote de Trabalho canônico (Wise).
-- Este bloco cria o CONTEXTO OPERACIONAL de Compras (Frame) — não
-- duplica o pacote, só referencia lotes_obra.id.
--
-- Princípio (seção 13.4 do doc mestre): frame_pacote_compras NÃO
-- persiste status_suprimentos — é sempre calculado a partir das
-- necessidades e alocações reais, nunca gravado manualmente.
-- ============================================================

-- ── Contexto de Compras — 1 linha por pacote ────────────────
CREATE TABLE IF NOT EXISTS frame_pacote_compras (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id       uuid NOT NULL REFERENCES lotes_obra(id),
  responsavel_id  uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  bloqueado       boolean NOT NULL DEFAULT false,
  motivo_bloqueio text,
  bloqueado_por   uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  bloqueado_em    timestamptz,
  criado_por      uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT frame_pacote_compras_pacote_uk UNIQUE (pacote_id),
  CONSTRAINT frame_pacote_compras_bloqueio_ck CHECK (
    (bloqueado = false AND motivo_bloqueio IS NULL AND bloqueado_por IS NULL AND bloqueado_em IS NULL)
    OR
    (bloqueado = true AND motivo_bloqueio IS NOT NULL AND bloqueado_por IS NOT NULL AND bloqueado_em IS NOT NULL)
  )
);

-- ── Necessidade de Material — direto no pacote, sem Lista formal ──
-- (decisão: nascer simples; versionamento/imutabilidade entram
-- quando o primeiro caso real de revisão exigir)
CREATE TABLE IF NOT EXISTS frame_pacote_necessidades (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id              uuid NOT NULL REFERENCES lotes_obra(id),
  produto_id             uuid REFERENCES produtos(id) ON DELETE SET NULL,
  descricao_livre        text,
  quantidade_necessaria  numeric(14,3) NOT NULL CHECK (quantidade_necessaria > 0),
  unidade                varchar(20) NOT NULL,
  criticidade            text NOT NULL DEFAULT 'NORMAL'
                            CHECK (criticidade IN ('BAIXA', 'NORMAL', 'ALTA', 'BLOQUEANTE')),
  etapa_necessaria       text
                            CHECK (etapa_necessaria IN ('corte', 'usinagem', 'montagem', 'vedacao', 'vidro', 'embalagem', 'expedicao')),
  estado_administrativo  text NOT NULL DEFAULT 'ATIVA'
                            CHECK (estado_administrativo IN ('ATIVA', 'CANCELADA')),
  motivo_cancelamento    text,
  criado_por             uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  atualizado_em          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT frame_necessidade_item_ck CHECK (produto_id IS NOT NULL OR descricao_livre IS NOT NULL),
  CONSTRAINT frame_necessidade_cancelamento_ck CHECK (
    (estado_administrativo = 'ATIVA' AND motivo_cancelamento IS NULL)
    OR
    (estado_administrativo = 'CANCELADA' AND motivo_cancelamento IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_frame_pacote_necessidades_pacote
  ON frame_pacote_necessidades (pacote_id, estado_administrativo);
CREATE INDEX IF NOT EXISTS idx_frame_pacote_necessidades_criticidade
  ON frame_pacote_necessidades (criticidade, etapa_necessaria);

-- ── Permissões dedicadas (não repete o padrão sem-permissão de
--    pacote_pipeline_status) ──
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('frame.pacotes.compras.visualizar', 'Visualizar contexto de Compras do pacote', 'FRAME'),
  ('frame.pacotes.compras.gerenciar',  'Gerenciar necessidades e bloqueio de Compras do pacote', 'FRAME')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- RPCs — cada operação sensível passa por aqui (permissão dentro
-- da transação, igual ao resto de Compras).
-- ============================================================

-- Garante exatamente 1 contexto por pacote — idempotente.
CREATE OR REPLACE FUNCTION fn_frame_ensure_package_procurement_context(
  p_pacote_id uuid,
  p_usuario_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contexto_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  SELECT id INTO v_contexto_id FROM frame_pacote_compras WHERE pacote_id = p_pacote_id;
  IF v_contexto_id IS NOT NULL THEN
    RETURN v_contexto_id;
  END IF;

  INSERT INTO frame_pacote_compras (pacote_id, criado_por)
  VALUES (p_pacote_id, p_usuario_id)
  ON CONFLICT (pacote_id) DO NOTHING
  RETURNING id INTO v_contexto_id;

  IF v_contexto_id IS NULL THEN
    SELECT id INTO v_contexto_id FROM frame_pacote_compras WHERE pacote_id = p_pacote_id;
  END IF;

  RETURN v_contexto_id;
END;
$$;

-- Cria uma necessidade de material.
CREATE OR REPLACE FUNCTION fn_frame_add_material_need(
  p_pacote_id uuid,
  p_usuario_id uuid,
  p_produto_id uuid,
  p_descricao_livre text,
  p_quantidade numeric,
  p_unidade text,
  p_criticidade text,
  p_etapa_necessaria text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_necessidade_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');
  PERFORM fn_frame_ensure_package_procurement_context(p_pacote_id, p_usuario_id);

  INSERT INTO frame_pacote_necessidades (
    pacote_id, produto_id, descricao_livre, quantidade_necessaria,
    unidade, criticidade, etapa_necessaria, criado_por
  ) VALUES (
    p_pacote_id, p_produto_id, p_descricao_livre, p_quantidade,
    p_unidade, COALESCE(p_criticidade, 'NORMAL'), p_etapa_necessaria, p_usuario_id
  )
  RETURNING id INTO v_necessidade_id;

  RETURN v_necessidade_id;
END;
$$;

-- Cancela uma necessidade (soft — nunca hard delete, preserva rastreabilidade).
CREATE OR REPLACE FUNCTION fn_frame_cancel_material_need(
  p_necessidade_id uuid,
  p_usuario_id uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE frame_pacote_necessidades
  SET estado_administrativo = 'CANCELADA',
      motivo_cancelamento = p_motivo,
      atualizado_em = now()
  WHERE id = p_necessidade_id;
END;
$$;

-- Bloqueia/desbloqueia o contexto de Compras (motivo obrigatório).
CREATE OR REPLACE FUNCTION fn_frame_block_package_procurement(
  p_pacote_id uuid,
  p_usuario_id uuid,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contexto_id uuid;
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'Motivo do bloqueio é obrigatório' USING ERRCODE = 'check_violation';
  END IF;

  v_contexto_id := fn_frame_ensure_package_procurement_context(p_pacote_id, p_usuario_id);

  UPDATE frame_pacote_compras
  SET bloqueado = true,
      motivo_bloqueio = p_motivo,
      bloqueado_por = p_usuario_id,
      bloqueado_em = now(),
      atualizado_em = now()
  WHERE id = v_contexto_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_frame_unblock_package_procurement(
  p_pacote_id uuid,
  p_usuario_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_exigir_permissao(p_usuario_id, 'frame.pacotes.compras.gerenciar');

  UPDATE frame_pacote_compras
  SET bloqueado = false,
      motivo_bloqueio = NULL,
      bloqueado_por = NULL,
      bloqueado_em = NULL,
      atualizado_em = now()
  WHERE pacote_id = p_pacote_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_frame_ensure_package_procurement_context(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_add_material_need(uuid, uuid, uuid, text, numeric, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_cancel_material_need(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_block_package_procurement(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_frame_unblock_package_procurement(uuid, uuid) TO authenticated, service_role;

-- RLS ligado, sem policy — mesmo padrão do resto do Frame (acesso via
-- service_role/admin client; RPCs acima já fazem o gate de permissão).
ALTER TABLE frame_pacote_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE frame_pacote_necessidades ENABLE ROW LEVEL SECURITY;
