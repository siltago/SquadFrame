-- Insere permissão catalogo.editar usada em todas as actions do catálogo
-- (produtos, arquivos, cores, aliases, specs, etc.)
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('catalogo.editar', 'Editar catálogo (produtos, arquivos, cores, aliases)', 'CATALOGO')
ON CONFLICT (chave) DO NOTHING;
