-- "permissoes" ficou de fora da migration 20260722000002 (que liberou SELECT
-- pra authenticated em 18 tabelas usadas pelos canais realtime do squadframe)
-- — mesmo bug: RLS habilitado por rls_auto_enable, zero políticas, então o
-- canal Realtime da tela de Cargos nunca recebe eventos de mudança em
-- permissoes (autorização real de escrita continua via verificarPermissao()
-- nas actions, service_role — esta política só destrava leitura).
CREATE POLICY "authenticated_select" ON permissoes FOR SELECT TO authenticated USING (true);
