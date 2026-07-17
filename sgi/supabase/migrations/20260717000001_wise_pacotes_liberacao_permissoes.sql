-- Permissões pra liberar/revogar os portões institucionais do pacote
-- (liberado_compras/liberado_producao em lotes_obra). Antes desta
-- migration, atualizarLoteAction não tinha NENHUMA checagem de
-- permissão além de "é um usuário Wise autenticado" — qualquer
-- usuário conseguia abrir/fechar os portões de qualquer lote.
INSERT INTO wise_permissoes (chave, nome, modulo) VALUES
  ('wise.pacotes.liberar_compras',  'Liberar/revogar pacote para Compras',  'wise'),
  ('wise.pacotes.liberar_producao', 'Liberar/revogar pacote para Produção', 'wise')
ON CONFLICT (chave) DO NOTHING;
