-- pedido_retornos e devolucoes_compra ficaram de fora das migrations de
-- Realtime anteriores (20260626000003, 20260720000002) — o RealtimeRefresher
-- de app/squadframe/compras/pedidos/[id]/page.tsx agora assina essas tabelas,
-- mas sem elas na publication o Postgres nunca emite o evento WAL, então
-- abrir/aprovar/rejeitar retorno e criar/avançar devolução não atualiza a
-- tela de outros usuários (só dá pra ver com F5).
DO $$
DECLARE
  tabelas TEXT[] := ARRAY['pedido_retornos','devolucoes_compra'];
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
