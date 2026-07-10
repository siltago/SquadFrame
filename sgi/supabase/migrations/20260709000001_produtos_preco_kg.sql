-- Preço/kg médio calculado automaticamente a partir dos pedidos de perfil
-- com valor final confirmado no mês corrente. Quando informado, preco_metro
-- é recalculado como peso_metro × preco_kg (mesmo padrão já usado em
-- produto_aliases.preco_kg, mas agora no produto mestre).
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_kg numeric;

COMMENT ON COLUMN produtos.preco_kg IS
  'Preço médio por quilograma (R$/kg) calculado a partir dos pedidos de perfil com valor final confirmado no mês corrente. Quando informado, preco_metro é recalculado como peso_metro × preco_kg.';
