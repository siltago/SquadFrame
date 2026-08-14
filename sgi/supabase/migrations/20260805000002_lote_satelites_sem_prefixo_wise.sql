-- ============================================================
-- Lote deixa de ser administrado pelo Wise — recria as tabelas
-- satélite de pacote sem o prefixo wise_, de propriedade do Frame.
-- wise_eventos NÃO é tocada aqui: é o event bus geral do Wise
-- (tem obra_id além de pacote_id), só para de receber payload de
-- lote/pacote no código novo (ver modules/wise/works/actions.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS lote_modulos (
  pacote_id  uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  modulo     text NOT NULL CHECK (modulo IN ('frame','flow','stock')),
  habilitado boolean NOT NULL DEFAULT true,
  PRIMARY KEY (pacote_id, modulo)
);

CREATE TABLE IF NOT EXISTS lote_escopo_estrutura (
  pacote_id    uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  estrutura_id uuid NOT NULL REFERENCES wise_obra_estrutura(id) ON DELETE CASCADE,
  PRIMARY KEY (pacote_id, estrutura_id)
);

CREATE TABLE IF NOT EXISTS lote_escopo_tipologias (
  pacote_id    uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  tipologia_id uuid NOT NULL REFERENCES tipologias_obra(id) ON DELETE CASCADE,
  quantidade   integer,
  PRIMARY KEY (pacote_id, tipologia_id)
);

-- Migra dados existentes (só os módulos frame/flow/stock — board/measure
-- não têm equivalente na nova governança, ficam para trás junto com o Wise).
INSERT INTO lote_modulos (pacote_id, modulo, habilitado)
SELECT pacote_id, modulo, habilitado
FROM wise_pacote_modulos
WHERE modulo IN ('frame', 'flow', 'stock')
ON CONFLICT DO NOTHING;

INSERT INTO lote_escopo_estrutura (pacote_id, estrutura_id)
SELECT pacote_id, estrutura_id FROM wise_pacote_escopo_estrutura
ON CONFLICT DO NOTHING;

INSERT INTO lote_escopo_tipologias (pacote_id, tipologia_id, quantidade)
SELECT pacote_id, tipologia_id, quantidade FROM wise_pacote_escopo_tipologias
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS wise_pacote_modulos;
DROP TABLE IF EXISTS wise_pacote_escopo_estrutura;
DROP TABLE IF EXISTS wise_pacote_escopo_tipologias;

ALTER TABLE lote_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_escopo_estrutura ENABLE ROW LEVEL SECURITY;
ALTER TABLE lote_escopo_tipologias ENABLE ROW LEVEL SECURITY;
