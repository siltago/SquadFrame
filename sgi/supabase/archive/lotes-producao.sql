-- Rodar no Supabase SQL Editor
-- Colunas XML nas tipologias (se ainda não rodou tipologias-xml.sql)
ALTER TABLE tipologias_obra
  ADD COLUMN IF NOT EXISTS codigo_esquadria varchar(100),
  ADD COLUMN IF NOT EXISTS tipo             varchar(100),
  ADD COLUMN IF NOT EXISTS largura_mm       int,
  ADD COLUMN IF NOT EXISTS altura_mm        int,
  ADD COLUMN IF NOT EXISTS tratamento       varchar(200),
  ADD COLUMN IF NOT EXISTS descricao        text,
  ADD COLUMN IF NOT EXISTS peso_unit        numeric(10,3),
  ADD COLUMN IF NOT EXISTS preco_unit       numeric(12,2);

-- Tabela de lotes (agrupamento por importação XML)
CREATE TABLE IF NOT EXISTS lotes_obra (
  id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id   uuid         NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome      varchar(200) NOT NULL DEFAULT 'Importação',
  criado_em timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lotes_obra_obra_id_idx ON lotes_obra(obra_id);

-- Vincula tipologia ao seu lote; excluir lote exclui suas tipologias
ALTER TABLE tipologias_obra
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES lotes_obra(id) ON DELETE CASCADE;

-- Status de produção por tipologia
ALTER TABLE tipologias_obra
  ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'pendente';
