-- Bloco D do plano incremental (Apêndice C do documento mestre) +
-- primeiro consumidor real de wise_eventos (fecha o critério de
-- aceite original do Bloco A: "dado um pacote ativo com frame
-- habilitado, existe exatamente 1 linha em frame_pacote_compras" —
-- hoje só acontece se um humano clicar em "Preparar contexto de
-- Compras"; wise_eventos publica wise.work_package.ativo desde a
-- Fase 2 mas nunca teve consumidor, exatamente a dívida write-only
-- já flagueada duas vezes no documento).
--
-- Escopo deliberadamente mínimo (decisão já tomada nesta sessão pra
-- Etapa 5: sem infra_evento_entregas, sem dispatcher, sem consumer
-- registry — adaptação mínima do que já existe).

-- ============================================================
-- 1. idempotency_key em wise_eventos e eventos_dominio
-- ============================================================
-- Toda linha ganha uma chave — produtores que não passam uma
-- explícita recebem o próprio id (equivalente a "sempre única",
-- que já era o comportamento implícito de hoje). Produtores que
-- passam uma chave semântica (ex: "wise.work_package.ativo:<pacote_id>")
-- ganham deduplicação de verdade via upsert.

ALTER TABLE wise_eventos    ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE eventos_dominio ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE wise_eventos    SET idempotency_key = id::text WHERE idempotency_key IS NULL;
UPDATE eventos_dominio SET idempotency_key = id::text WHERE idempotency_key IS NULL;

ALTER TABLE wise_eventos    ALTER COLUMN idempotency_key SET NOT NULL;
ALTER TABLE eventos_dominio ALTER COLUMN idempotency_key SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE wise_eventos ADD CONSTRAINT wise_eventos_idempotency_key_unique UNIQUE (idempotency_key);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE eventos_dominio ADD CONSTRAINT eventos_dominio_idempotency_key_unique UNIQUE (idempotency_key);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION trg_default_idempotency_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.idempotency_key IS NULL THEN
    NEW.idempotency_key := NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wise_eventos_idempotency ON wise_eventos;
CREATE TRIGGER trg_wise_eventos_idempotency
  BEFORE INSERT ON wise_eventos
  FOR EACH ROW EXECUTE FUNCTION trg_default_idempotency_key();

DROP TRIGGER IF EXISTS trg_eventos_dominio_idempotency ON eventos_dominio;
CREATE TRIGGER trg_eventos_dominio_idempotency
  BEFORE INSERT ON eventos_dominio
  FOR EACH ROW EXECUTE FUNCTION trg_default_idempotency_key();

-- ============================================================
-- 2. Primeiro consumidor real: auto-criar frame_pacote_compras
--    quando o pacote ativa com 'frame' entre os módulos.
-- ============================================================
-- Variante "sistêmica" da RPC de Bloco A — sem fn_exigir_permissao,
-- porque quem chama não é uma ação de usuário (é reconciliação
-- disparada por um evento de domínio já validado no Wise). Só
-- alcançável via service_role, nunca exposta a authenticated.
CREATE OR REPLACE FUNCTION fn_frame_ensure_package_procurement_context_system(
  p_pacote_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contexto_id uuid;
BEGIN
  SELECT id INTO v_contexto_id FROM frame_pacote_compras WHERE pacote_id = p_pacote_id;
  IF v_contexto_id IS NOT NULL THEN
    RETURN v_contexto_id;
  END IF;

  INSERT INTO frame_pacote_compras (pacote_id, criado_por)
  VALUES (p_pacote_id, NULL)
  ON CONFLICT (pacote_id) DO NOTHING
  RETURNING id INTO v_contexto_id;

  IF v_contexto_id IS NULL THEN
    SELECT id INTO v_contexto_id FROM frame_pacote_compras WHERE pacote_id = p_pacote_id;
  END IF;

  RETURN v_contexto_id;
END;
$$;

REVOKE ALL ON FUNCTION fn_frame_ensure_package_procurement_context_system(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_frame_ensure_package_procurement_context_system(uuid) TO service_role;
