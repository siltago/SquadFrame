-- ============================================================
-- SquadWise — Compatibilidade Frame ↔ Wise
-- Garante que qualquer INSERT em obras/lotes_obra via SquadFrame
-- (que não passa empresa_id) seja automaticamente vinculado à
-- empresa correta — sem exigir mudanças no código do Frame.
-- ============================================================

-- ── 1. Trigger: obras → empresa_id automático ───────────────────────────────

CREATE OR REPLACE FUNCTION wise_set_obra_empresa_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT id INTO NEW.empresa_id
    FROM wise_empresas
    ORDER BY criado_em
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obras_empresa_id ON obras;
CREATE TRIGGER trg_obras_empresa_id
  BEFORE INSERT ON obras
  FOR EACH ROW EXECUTE FUNCTION wise_set_obra_empresa_id();

-- ── 2. Trigger: lotes_obra → empresa_id automático ─────────────────────────

CREATE OR REPLACE FUNCTION wise_set_lote_empresa_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT o.empresa_id INTO NEW.empresa_id
    FROM obras o
    WHERE o.id = NEW.obra_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lotes_obra_empresa_id ON lotes_obra;
CREATE TRIGGER trg_lotes_obra_empresa_id
  BEFORE INSERT ON lotes_obra
  FOR EACH ROW EXECUTE FUNCTION wise_set_lote_empresa_id();

-- ── 3. Trigger: lotes_obra → módulos padrão automáticos ────────────────────
-- Quando Frame criar um lote, ele não chama wise_pacote_modulos.
-- Este trigger garante que frame + board sejam habilitados por padrão.

CREATE OR REPLACE FUNCTION wise_init_pacote_modulos()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO wise_pacote_modulos (pacote_id, modulo, habilitado)
  VALUES
    (NEW.id, 'frame', true),
    (NEW.id, 'board', true),
    (NEW.id, 'flow',  false),
    (NEW.id, 'stock', false),
    (NEW.id, 'measure', false)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lotes_obra_modulos ON lotes_obra;
CREATE TRIGGER trg_lotes_obra_modulos
  AFTER INSERT ON lotes_obra
  FOR EACH ROW EXECUTE FUNCTION wise_init_pacote_modulos();

-- ── 4. Reprocessar backfills (idempotentes) ─────────────────────────────────
-- Garante que registros criados antes desta migration também sejam cobertos.

-- obras sem empresa_id
UPDATE obras
SET empresa_id = (SELECT id FROM wise_empresas ORDER BY criado_em LIMIT 1)
WHERE empresa_id IS NULL;

-- lotes sem empresa_id (derivar da obra)
UPDATE lotes_obra l
SET empresa_id = o.empresa_id
FROM obras o
WHERE l.obra_id = o.id
  AND l.empresa_id IS NULL
  AND o.empresa_id IS NOT NULL;

-- lotes ainda sem empresa_id (obra não tem — fallback direto)
UPDATE lotes_obra
SET empresa_id = (SELECT id FROM wise_empresas ORDER BY criado_em LIMIT 1)
WHERE empresa_id IS NULL;

-- módulos padrão para lotes que ainda não têm
INSERT INTO wise_pacote_modulos (pacote_id, modulo, habilitado)
SELECT l.id, m.modulo, (m.modulo IN ('frame', 'board'))
FROM lotes_obra l
CROSS JOIN (VALUES ('frame'), ('board'), ('flow'), ('stock'), ('measure')) AS m(modulo)
WHERE NOT EXISTS (
  SELECT 1 FROM wise_pacote_modulos wm
  WHERE wm.pacote_id = l.id AND wm.modulo = m.modulo
)
ON CONFLICT DO NOTHING;
