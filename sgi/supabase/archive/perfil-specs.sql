-- Especificações técnicas de perfis: peso/metro, preço/metro, tamanho da barra
ALTER TABLE produtos         ADD COLUMN IF NOT EXISTS peso_metro  numeric;
ALTER TABLE produtos         ADD COLUMN IF NOT EXISTS preco_metro numeric;
ALTER TABLE produtos         ADD COLUMN IF NOT EXISTS tamanho_mm  numeric;

ALTER TABLE produto_aliases  ADD COLUMN IF NOT EXISTS peso_metro  numeric;
ALTER TABLE produto_aliases  ADD COLUMN IF NOT EXISTS preco_metro numeric;
ALTER TABLE produto_aliases  ADD COLUMN IF NOT EXISTS tamanho_mm  numeric;
