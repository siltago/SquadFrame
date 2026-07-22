-- A policy criada em 20260721000002 usava uma subquery inline em
-- `usuarios` (`usuario_id IN (SELECT id FROM usuarios WHERE auth_id =
-- auth.uid())`), avaliada com o privilégio do role chamador (authenticated).
-- `usuarios` também tem RLS habilitado (mesmo event trigger rls_auto_enable)
-- sem NENHUMA política — a subquery sempre retornava vazio, então a policy
-- de notificacoes nunca deixava ninguém ver a própria notificação via
-- Realtime/REST autenticado, mesmo com JWT correto.
--
-- Corrige trocando pra fn_auth_user_db_id() (já existe, criada em
-- 20260629000001_rpc_security.sql pro mesmo propósito em pedidos_compra) —
-- é SECURITY DEFINER, roda com o dono da função (bypassa RLS de usuarios),
-- exatamente o padrão que o restante do projeto já usa pra isso.
DROP POLICY IF EXISTS "usuarios veem as proprias notificacoes" ON notificacoes;

CREATE POLICY "usuarios veem as proprias notificacoes"
ON notificacoes
FOR SELECT
TO authenticated
USING (usuario_id = fn_auth_user_db_id());
