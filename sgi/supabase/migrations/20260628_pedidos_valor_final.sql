-- Valor real confirmado pelo fornecedor ao emitir/receber o pedido
ALTER TABLE pedidos_compra
  ADD COLUMN IF NOT EXISTS valor_final numeric;

COMMENT ON COLUMN pedidos_compra.valor_final IS
  'Valor final confirmado pelo comprador após emissão do pedido. Quando nulo, o valor é estimado pela soma dos itens.';
