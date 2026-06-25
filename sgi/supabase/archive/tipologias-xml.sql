-- Colunas extras para tipologias importadas via XML
ALTER TABLE tipologias_obra
  ADD COLUMN IF NOT EXISTS codigo_esquadria varchar(100),
  ADD COLUMN IF NOT EXISTS tipo             varchar(100),
  ADD COLUMN IF NOT EXISTS largura_mm       int,
  ADD COLUMN IF NOT EXISTS altura_mm        int,
  ADD COLUMN IF NOT EXISTS tratamento       varchar(200),
  ADD COLUMN IF NOT EXISTS descricao        text,
  ADD COLUMN IF NOT EXISTS peso_unit        numeric(10,3),
  ADD COLUMN IF NOT EXISTS preco_unit       numeric(12,2);
