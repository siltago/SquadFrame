-- ============================================================
-- Empresa — dados da firma para uso em documentos/PDFs
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS empresa (
  id           TEXT PRIMARY KEY DEFAULT 'default',
  nome         TEXT,
  nome_fantasia TEXT,
  cnpj         TEXT,
  telefone     TEXT,
  email        TEXT,
  site         TEXT,
  endereco     TEXT,
  numero       TEXT,
  complemento  TEXT,
  bairro       TEXT,
  cidade       TEXT,
  estado       TEXT,
  cep          TEXT,
  ie           TEXT,
  logo_url     TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que sempre existe uma linha
INSERT INTO empresa (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticado_le_empresa" ON empresa FOR SELECT TO authenticated USING (true);

-- Bucket público para logo (execute no SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa', 'empresa', true)
ON CONFLICT (id) DO NOTHING;
