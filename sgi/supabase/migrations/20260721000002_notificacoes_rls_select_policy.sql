-- notificacoes teve RLS habilitado automaticamente pelo event trigger
-- rls_auto_enable (dispara em todo CREATE TABLE) quando foi criada em
-- 20260625000005_kanban_melhorias.sql, mas nunca ganhou nenhuma política —
-- com RLS ligado e zero políticas, Postgres nega SELECT por padrão pra
-- qualquer role que não seja o dono/bypassrls (service_role).
--
-- Isso não afeta as leituras do backend (buscarNotificacoes, contagem no
-- layout) porque elas usam createAdminClient() (service_role, ignora RLS),
-- mas o canal Realtime do navegador roda como o usuário autenticado — sem
-- uma policy de SELECT, o Postgres nunca deixa esse role enxergar a linha
-- pra emitir o evento, então o banner/contador nunca atualiza sozinho,
-- só depois de um F5 (que bate no backend com service_role).
-- Reusa fn_auth_user_db_id() (auth.uid() -> usuarios.id), já criada em
-- 20260629000001_rpc_security.sql para o mesmo propósito nas policies de
-- pedidos_compra — mesmo padrão, não reimplementa a resolução de usuário.
DROP POLICY IF EXISTS "usuarios veem as proprias notificacoes" ON notificacoes;

CREATE POLICY "usuarios veem as proprias notificacoes"
ON notificacoes
FOR SELECT
TO authenticated
USING (usuario_id = fn_auth_user_db_id());
