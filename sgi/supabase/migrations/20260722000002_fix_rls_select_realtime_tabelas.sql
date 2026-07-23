-- 18 tabelas usadas por canais Realtime do SquadFrame tinham RLS habilitado
-- automaticamente (event trigger rls_auto_enable, dispara em todo CREATE
-- TABLE) sem NENHUMA política — mesmo bug já corrigido em notificacoes
-- (20260721000007) e usuarios (indiretamente, via fn_auth_user_db_id).
-- Com RLS ligado e zero políticas, o Postgres nega SELECT por padrão pra
-- qualquer role que não seja service_role — o canal Realtime do navegador
-- (rodando como o usuário autenticado) nunca conseguia "ver" a linha pra
-- emitir o evento, mesmo com a tabela corretamente na publication.
--
-- Política permissiva de leitura pra authenticated: o controle de acesso
-- real desse dado já é feito na camada de aplicação (verificarPermissao()
-- nas actions/pages, sempre via service_role) — nenhum usuário logado
-- hoje é impedido de ver esses dados pela UI, então essa policy só
-- restaura o que já era o comportamento efetivo, sem abrir nada novo.
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'cargo_permissoes', 'cargos', 'categorias_perfil', 'compra_historico',
    'fornecedores', 'frame_pacote_compras', 'frame_pacote_necessidades',
    'linhas', 'lotes_obra', 'obras', 'produto_aliases', 'produto_arquivos',
    'produto_cores', 'produtos', 'setores', 'solicitacao_itens',
    'tipologias_obra', 'usuarios'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_select" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_select" ON %I FOR SELECT TO authenticated USING (true)',
      t
    );
  END LOOP;
END;
$$;
