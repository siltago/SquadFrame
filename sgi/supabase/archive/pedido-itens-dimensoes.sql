-- Dimensões para itens de tipo CHAPA (vidro, etc.)
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS largura_m  numeric;
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS altura_m   numeric;
-- qtd_pecas: número de peças (chapas); quantidade_pedida continua sendo a unidade de pedido
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS qtd_pecas  integer;
