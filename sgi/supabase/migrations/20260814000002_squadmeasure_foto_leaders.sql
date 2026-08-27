-- Permite observações com leader no mesmo overlay vetorial das cotas.
ALTER TABLE measure_foto_cotas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cota'
    CHECK (tipo IN ('cota', 'leader')),
  ADD COLUMN IF NOT EXISTS texto text;

ALTER TABLE measure_foto_cotas
  DROP CONSTRAINT IF EXISTS measure_foto_cotas_texto_por_tipo_check;

ALTER TABLE measure_foto_cotas
  ADD CONSTRAINT measure_foto_cotas_texto_por_tipo_check
  CHECK (tipo <> 'leader' OR btrim(coalesce(texto, '')) <> '');

