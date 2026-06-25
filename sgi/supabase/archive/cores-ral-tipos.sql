-- Associa cores RAL às abas do catálogo (ex: PERFIS, VIDROS)
-- Substitui a relação com acabamentos (que era genérica demais)
ALTER TABLE cores_ral ADD COLUMN IF NOT EXISTS tipos text[] NOT NULL DEFAULT '{}';

-- Cor selecionada no pedido de compra
ALTER TABLE pedidos_compra ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES cores_ral(id);
