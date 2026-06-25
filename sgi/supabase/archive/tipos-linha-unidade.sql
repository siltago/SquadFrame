ALTER TABLE tipos_linha ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'UN';
-- Exemplos: BARRA, CHAPA, ML (metro linear), M2 (metro quadrado), UN, KG, CX
