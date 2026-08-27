-- Adiciona campo preco_kg em produto_aliases
-- Para barras/perfis comprados por peso: preco_metro = peso_metro × preco_kg
ALTER TABLE produto_aliases
  ADD COLUMN IF NOT EXISTS preco_kg numeric;

COMMENT ON COLUMN produto_aliases.preco_kg IS
  'Preço por quilograma (R$/kg). Quando informado, preco_metro é calculado automaticamente como peso_metro × preco_kg.';
