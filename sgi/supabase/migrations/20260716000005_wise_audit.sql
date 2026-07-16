-- ============================================================
-- SquadWise — Bloco 1.4: Auditoria + fluxos de escrita
-- (convite sem e-mail, bloqueio, troca de papel)
-- ============================================================
-- Aditivo, exceto por uma mudança pontual em wise_usuarios: auth_id
-- vira nullable (usuário convidado ainda não tem login no Supabase
-- Auth até ativar a conta) — decisão confirmada com o usuário, ver
-- seção 10 do documento de arquitetura. Nenhum usuário migrado no
-- Bloco 1.2 é afetado (todos já tinham auth_id preenchido).
-- ============================================================

ALTER TABLE wise_usuarios ALTER COLUMN auth_id DROP NOT NULL;
ALTER TABLE wise_usuarios ADD COLUMN IF NOT EXISTS convite_token varchar(64);
ALTER TABLE wise_usuarios ADD COLUMN IF NOT EXISTS convite_expira_em timestamptz;

DO $$ BEGIN
  ALTER TABLE wise_usuarios ADD CONSTRAINT wise_usuarios_convite_token_unique UNIQUE (convite_token);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── wise_auditoria ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_auditoria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid NOT NULL REFERENCES wise_empresas(id),
  usuario_id    uuid REFERENCES wise_usuarios(id),
  entidade      text NOT NULL,
  entidade_id   uuid NOT NULL,
  acao          text NOT NULL,
  dados_antes   jsonb,
  dados_depois  jsonb,
  origem        text NOT NULL DEFAULT 'ui',
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wise_auditoria_entidade ON wise_auditoria (empresa_id, entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_wise_auditoria_criado_em ON wise_auditoria (empresa_id, criado_em DESC);

-- ── Permissão nova pro Bloco 1.4 ──
INSERT INTO wise_permissoes (chave, nome, modulo) VALUES
  ('wise.auditoria.visualizar', 'Visualizar auditoria', 'wise')
ON CONFLICT (chave) DO NOTHING;

-- ── RLS — wise_auditoria: leitura só com permissão explícita, escrita só service_role ──
ALTER TABLE wise_auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_auditoria_select ON wise_auditoria;
CREATE POLICY wise_auditoria_select ON wise_auditoria
  FOR SELECT TO authenticated
  USING (
    empresa_id = wise_fn_auth_empresa_id()
    AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.auditoria.visualizar')
  );
-- Sem policy de INSERT/UPDATE/DELETE pra authenticated: auditoria só é
-- gravada via service_role, nunca pelo client.
