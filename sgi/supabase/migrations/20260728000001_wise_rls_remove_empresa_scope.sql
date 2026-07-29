-- ============================================================
-- Fase 1, Passo 1 — remover o escopo por empresa das RLS policies do
-- Wise, sem tocar em coluna nenhuma ainda (isso vem no Passo 3). O
-- sistema está deixando de ser multi-tenant (nunca teve mais de uma
-- empresa em produção — só o seed "sms-esquadrias"); autorização real
-- de escrita continua via wise_fn_tem_permissao() + service_role nas
-- actions, RLS de leitura só existe pra não quebrar Realtime/REST
-- direto do client, mesmo padrão authenticated_select já usado no
-- resto do sistema.
-- ============================================================

-- ── wise_empresas ──
DROP POLICY IF EXISTS wise_empresas_select ON wise_empresas;
CREATE POLICY wise_empresas_select ON wise_empresas
  FOR SELECT TO authenticated
  USING (true);

-- ── wise_unidades ──
DROP POLICY IF EXISTS wise_unidades_select ON wise_unidades;
DROP POLICY IF EXISTS wise_unidades_insert ON wise_unidades;
DROP POLICY IF EXISTS wise_unidades_update ON wise_unidades;
CREATE POLICY wise_unidades_select ON wise_unidades
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY wise_unidades_insert ON wise_unidades
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.unidades.gerenciar'));
CREATE POLICY wise_unidades_update ON wise_unidades
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.unidades.gerenciar'));

-- ── wise_setores ──
DROP POLICY IF EXISTS wise_setores_select ON wise_setores;
DROP POLICY IF EXISTS wise_setores_insert ON wise_setores;
DROP POLICY IF EXISTS wise_setores_update ON wise_setores;
CREATE POLICY wise_setores_select ON wise_setores
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY wise_setores_insert ON wise_setores
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar'));
CREATE POLICY wise_setores_update ON wise_setores
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar'));

-- ── wise_cargos ──
DROP POLICY IF EXISTS wise_cargos_select ON wise_cargos;
DROP POLICY IF EXISTS wise_cargos_insert ON wise_cargos;
DROP POLICY IF EXISTS wise_cargos_update ON wise_cargos;
CREATE POLICY wise_cargos_select ON wise_cargos
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY wise_cargos_insert ON wise_cargos
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.cargos.gerenciar'));
CREATE POLICY wise_cargos_update ON wise_cargos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.cargos.gerenciar'));

-- ── wise_usuarios: self-read continua liberado, resto por permissão ──
DROP POLICY IF EXISTS wise_usuarios_select ON wise_usuarios;
DROP POLICY IF EXISTS wise_usuarios_update ON wise_usuarios;
CREATE POLICY wise_usuarios_select ON wise_usuarios
  FOR SELECT TO authenticated
  USING (
    id = wise_fn_auth_usuario_id()
    OR wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.visualizar')
  );
CREATE POLICY wise_usuarios_update ON wise_usuarios
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar'));

-- ── wise_papeis ──
DROP POLICY IF EXISTS wise_papeis_select ON wise_papeis;
DROP POLICY IF EXISTS wise_papeis_insert ON wise_papeis;
DROP POLICY IF EXISTS wise_papeis_update ON wise_papeis;
CREATE POLICY wise_papeis_select ON wise_papeis
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY wise_papeis_insert ON wise_papeis
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));
CREATE POLICY wise_papeis_update ON wise_papeis
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));

-- ── wise_empresa_modulos (tabela some no Passo 3 — só destrava leitura por ora) ──
DROP POLICY IF EXISTS wise_empresa_modulos_select ON wise_empresa_modulos;
CREATE POLICY wise_empresa_modulos_select ON wise_empresa_modulos
  FOR SELECT TO authenticated
  USING (true);

-- ── wise_papel_permissoes ──
DROP POLICY IF EXISTS wise_papel_permissoes_select ON wise_papel_permissoes;
DROP POLICY IF EXISTS wise_papel_permissoes_insert ON wise_papel_permissoes;
DROP POLICY IF EXISTS wise_papel_permissoes_delete ON wise_papel_permissoes;
CREATE POLICY wise_papel_permissoes_select ON wise_papel_permissoes
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY wise_papel_permissoes_insert ON wise_papel_permissoes
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));
CREATE POLICY wise_papel_permissoes_delete ON wise_papel_permissoes
  FOR DELETE TO authenticated
  USING (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));

-- ── wise_usuario_papeis ──
DROP POLICY IF EXISTS wise_usuario_papeis_select ON wise_usuario_papeis;
DROP POLICY IF EXISTS wise_usuario_papeis_insert ON wise_usuario_papeis;
DROP POLICY IF EXISTS wise_usuario_papeis_delete ON wise_usuario_papeis;
CREATE POLICY wise_usuario_papeis_select ON wise_usuario_papeis
  FOR SELECT TO authenticated
  USING (
    usuario_id = wise_fn_auth_usuario_id()
    OR wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.visualizar')
  );
CREATE POLICY wise_usuario_papeis_insert ON wise_usuario_papeis
  FOR INSERT TO authenticated
  WITH CHECK (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar'));
CREATE POLICY wise_usuario_papeis_delete ON wise_usuario_papeis
  FOR DELETE TO authenticated
  USING (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar'));

-- ── wise_auditoria ──
DROP POLICY IF EXISTS wise_auditoria_select ON wise_auditoria;
CREATE POLICY wise_auditoria_select ON wise_auditoria
  FOR SELECT TO authenticated
  USING (wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.auditoria.visualizar'));
