-- =========================================================
-- Tipo de pedido + fornecedor por código/alias
-- =========================================================

-- 1. Tipo do pedido (vidro, perfil, etc.)
ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS tipo_linha text;

-- 2. Alias vinculado a um fornecedor específico
ALTER TABLE produto_aliases
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES fornecedores(id);

-- 3. Código mestre vinculado ao fornecedor principal
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS fornecedor_mestre_id uuid REFERENCES fornecedores(id);
