-- Amplia a publication supabase_realtime pra cobrir as tabelas usadas
-- pelas telas do módulo SquadFrame que ainda não tinham nenhum
-- RealtimeRefresher montado (Catálogo, Fornecedores, Lotes, Financeiro/
-- Carteiras, Obras, Usuários/Cargos) — sem isso, mesmo colocando o
-- componente no frontend, o Postgres nunca emite o evento WAL.
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'produtos', 'linhas', 'categorias_perfil',
    'produto_cores', 'produto_aliases', 'produto_arquivos',
    'fornecedores',
    'frame_pacote_necessidades', 'frame_pacote_compras',
    'carteiras', 'carteira_movimentacoes',
    'obras',
    'usuarios', 'cargos', 'setores', 'permissoes', 'cargo_permissoes'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END;
$$;
