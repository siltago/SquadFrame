-- ============================================================
-- Corrige trigger wise_init_pacote_modulos, que ainda inseria em
-- wise_pacote_modulos (dropada em 20260805000002_lote_satelites_
-- sem_prefixo_wise.sql). Passa a inserir em lote_modulos, que só
-- aceita os módulos frame/flow/stock (board/measure ficaram para
-- trás junto com o Wise).
-- ============================================================

CREATE OR REPLACE FUNCTION wise_init_pacote_modulos()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO lote_modulos (pacote_id, modulo, habilitado)
  VALUES
    (NEW.id, 'frame', true),
    (NEW.id, 'flow',  false),
    (NEW.id, 'stock', false)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
