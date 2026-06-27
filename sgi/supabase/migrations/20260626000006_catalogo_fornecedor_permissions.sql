-- Novas permissões: gestão de fornecedores migrada para o catálogo
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('catalogo.fornecedor.criar',    'Cadastrar fornecedores',          'CATALOGO'),
  ('catalogo.fornecedor.editar',   'Editar fornecedores',             'CATALOGO'),
  ('catalogo.fornecedor.excluir',  'Excluir fornecedores',            'CATALOGO'),
  ('catalogo.linha.gerenciar',     'Criar e editar linhas do catálogo',     'CATALOGO'),
  ('catalogo.categoria.gerenciar', 'Criar e editar categorias do catálogo', 'CATALOGO')
ON CONFLICT (chave) DO NOTHING;

-- Copia os assignments de cargo de compras.fornecedor.* → catalogo.fornecedor.*
-- (backward-compat: cargos que tinham acesso via compras passam a ter também via catálogo)
INSERT INTO cargo_permissoes (cargo_id, permissao_id)
SELECT cp.cargo_id, np.id
FROM cargo_permissoes cp
JOIN permissoes op ON op.id = cp.permissao_id AND op.chave LIKE 'compras.fornecedor.%'
JOIN permissoes np ON np.chave = REPLACE(op.chave, 'compras.fornecedor.', 'catalogo.fornecedor.')
ON CONFLICT DO NOTHING;

-- Copia os assignments de usuário de compras.fornecedor.* → catalogo.fornecedor.*
INSERT INTO usuario_permissoes (usuario_id, permissao_id)
SELECT up.usuario_id, np.id
FROM usuario_permissoes up
JOIN permissoes op ON op.id = up.permissao_id AND op.chave LIKE 'compras.fornecedor.%'
JOIN permissoes np ON np.chave = REPLACE(op.chave, 'compras.fornecedor.', 'catalogo.fornecedor.')
ON CONFLICT DO NOTHING;
