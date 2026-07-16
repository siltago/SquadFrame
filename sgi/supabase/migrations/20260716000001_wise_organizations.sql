-- ============================================================
-- SquadWise — Bloco 1.1: Organizations (empresas, unidades, módulos)
-- ============================================================
-- Aditivo por completo: nenhuma tabela existente é alterada. O Frame
-- continua lendo 100% de `usuarios`/`setores`/`cargos`/`permissoes` —
-- este bloco só cria as tabelas novas do Wise e semeia a empresa atual.
-- Ver docs/squadwise/fase-1-arquitetura.md, seção 4.1/4.2/4.10/4.11.
-- ============================================================

-- ── wise_empresas ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_empresas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           varchar(255) NOT NULL,
  slug           varchar(60) NOT NULL,
  cnpj           varchar(18),
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_empresas_slug_unique UNIQUE (slug),
  CONSTRAINT wise_empresas_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

DROP TRIGGER IF EXISTS trg_wise_empresas_atualizado_em ON wise_empresas;
CREATE TRIGGER trg_wise_empresas_atualizado_em
  BEFORE UPDATE ON wise_empresas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ── wise_unidades ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_unidades (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES wise_empresas(id),
  nome        varchar(255) NOT NULL,
  codigo      varchar(20) NOT NULL,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_unidades_empresa_codigo_unique UNIQUE (empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_wise_unidades_empresa ON wise_unidades (empresa_id);

-- ── wise_modulos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_modulos (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave  varchar(30) NOT NULL,
  nome   varchar(100) NOT NULL,
  ativo  boolean NOT NULL DEFAULT true,
  CONSTRAINT wise_modulos_chave_unique UNIQUE (chave)
);

-- ── wise_empresa_modulos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_empresa_modulos (
  empresa_id     uuid NOT NULL REFERENCES wise_empresas(id) ON DELETE CASCADE,
  modulo_id      uuid NOT NULL REFERENCES wise_modulos(id) ON DELETE CASCADE,
  habilitado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, modulo_id)
);

-- ============================================================
-- Seed — empresa atual (SMS Esquadrias) + catálogo de módulos
-- ============================================================

INSERT INTO wise_empresas (nome, slug)
VALUES ('SMS Esquadrias', 'sms-esquadrias')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO wise_unidades (empresa_id, nome, codigo)
SELECT id, 'Matriz', 'MATRIZ'
FROM wise_empresas
WHERE slug = 'sms-esquadrias'
ON CONFLICT (empresa_id, codigo) DO NOTHING;

INSERT INTO wise_modulos (chave, nome, ativo) VALUES
  ('wise',    'SquadWise',   true),
  ('frame',   'SquadFrame',  true),
  ('board',   'SquadBoard',  true),
  ('flow',    'SquadFlow',   false),
  ('stock',   'SquadStock',  false),
  ('measure', 'SquadMeasure', false)
ON CONFLICT (chave) DO NOTHING;

-- Módulos hoje em uso ficam habilitados pra empresa seed (frame + board).
-- wise fica de fora até o Bloco 1.3 dar a primeira UI real.
INSERT INTO wise_empresa_modulos (empresa_id, modulo_id)
SELECT e.id, m.id
FROM wise_empresas e
CROSS JOIN wise_modulos m
WHERE e.slug = 'sms-esquadrias'
  AND m.chave IN ('frame', 'board')
ON CONFLICT (empresa_id, modulo_id) DO NOTHING;
