-- Seed: Todas as permissões do sistema
-- Consolida schema.sql + compras-permissions.sql

INSERT INTO permissoes (chave, nome, modulo) VALUES
  -- OBRAS
  ('obras.ver',     'Visualizar obras',  'OBRAS'),
  ('obras.criar',   'Criar obras',       'OBRAS'),
  ('obras.editar',  'Editar obras',      'OBRAS'),
  ('obras.excluir', 'Excluir obras',     'OBRAS'),
  -- COMPRAS
  ('compras.solicitacao.criar',       'Criar solicitações de compra',          'COMPRAS'),
  ('compras.solicitacao.aprovar',     'Aprovar solicitações de compra',        'COMPRAS'),
  ('compras.solicitacao.rejeitar',    'Rejeitar solicitações de compra',       'COMPRAS'),
  ('compras.pedido.criar',            'Criar pedidos de compra',               'COMPRAS'),
  ('compras.pedido.aprovar',          'Aprovar pedidos de compra',             'COMPRAS'),
  ('compras.pedido.cancelar',         'Cancelar pedidos de compra',            'COMPRAS'),
  ('compras.pedido.excluir',          'Excluir pedidos de compra',             'COMPRAS'),
  ('compras.recebimento.registrar',   'Registrar recebimentos de pedidos',     'COMPRAS'),
  ('compras.documento.upload',        'Fazer upload de documentos em pedidos', 'COMPRAS'),
  ('compras.documento.excluir',       'Excluir documentos de pedidos',         'COMPRAS'),
  ('compras.anotacao.criar',          'Adicionar anotações em pedidos',        'COMPRAS'),
  ('compras.formapagamento.gerenciar','Gerenciar formas de pagamento',         'COMPRAS'),
  ('compras.fornecedor.criar',        'Criar fornecedores',                    'COMPRAS'),
  ('compras.fornecedor.editar',       'Editar fornecedores',                   'COMPRAS'),
  ('compras.fornecedor.excluir',      'Excluir fornecedores',                  'COMPRAS')
ON CONFLICT (chave) DO NOTHING;
