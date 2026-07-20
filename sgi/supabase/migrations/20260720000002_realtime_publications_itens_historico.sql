-- A migration anterior (20260626000003) habilitou Realtime só nas tabelas
-- "pai" (pedidos_compra, solicitacoes_compra). Os RealtimeRefresher de
-- app/squadframe/compras/pedidos/[id]/page.tsx e solicitacoes/[id]/page.tsx
-- também assinam pedido_itens, recebimentos, compra_historico e
-- solicitacao_itens — sem essas tabelas na publication, o Postgres nunca
-- emite o evento WAL pro Realtime, então editar um item, registrar um
-- recebimento ou adicionar histórico não atualiza a tela de outros
-- usuários mesmo com o componente já montado (só dá pra ver com F5).
DO $$
DECLARE
  tabelas TEXT[] := ARRAY['pedido_itens','recebimentos','compra_historico','solicitacao_itens'];
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
