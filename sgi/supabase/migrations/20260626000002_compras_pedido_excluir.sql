-- Adiciona permissão de excluir pedidos de compra
INSERT INTO permissoes (chave, nome, modulo)
VALUES ('compras.pedido.excluir', 'Excluir pedidos de compra', 'COMPRAS')
ON CONFLICT (chave) DO NOTHING;
