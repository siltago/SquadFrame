-- Cor RAL por item da solicitação de compra
ALTER TABLE solicitacao_itens
  ADD COLUMN IF NOT EXISTS cor_id uuid REFERENCES cores_ral(id);
