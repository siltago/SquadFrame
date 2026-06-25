-- Tipos de catálogo que cada fornecedor atende (ex: PERFIL, VIDRO)
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS tipos text[] NOT NULL DEFAULT '{}';
