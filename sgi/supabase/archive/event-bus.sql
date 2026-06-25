-- Event bus: tabela de domínio para observabilidade e replay de eventos
CREATE TABLE IF NOT EXISTS eventos_dominio (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text        NOT NULL,
  payload     jsonb       NOT NULL DEFAULT '{}',
  company_id  text        NOT NULL DEFAULT 'default',
  processado  boolean     NOT NULL DEFAULT false,
  erro        text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_dominio_tipo       ON eventos_dominio (tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_processado ON eventos_dominio (processado) WHERE NOT processado;
CREATE INDEX IF NOT EXISTS idx_eventos_dominio_company    ON eventos_dominio (company_id);
