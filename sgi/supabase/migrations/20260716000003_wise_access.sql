-- ============================================================
-- SquadWise — Bloco 1.3: Access (permissões, papéis, RLS)
-- ============================================================
-- Aditivo: nenhuma tabela do Frame é alterada. RLS real (com policies
-- de verdade) só nas tabelas do Wise — decisão documentada na seção 6
-- do docs/squadwise/fase-1-arquitetura.md. O Frame continua usando
-- createAdminClient() (service_role, ignora RLS) pra tudo — estas
-- policies só importam pra client direto do browser (Realtime/REST) e
-- como segunda camada de defesa.
-- ============================================================

-- ── wise_permissoes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_permissoes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave      varchar(150) NOT NULL,
  nome       varchar(255) NOT NULL,
  modulo     varchar(30) NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_permissoes_chave_unique UNIQUE (chave)
);

CREATE INDEX IF NOT EXISTS idx_wise_permissoes_modulo ON wise_permissoes (modulo);

-- ── wise_papeis ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_papeis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES wise_empresas(id),
  nome        varchar(100) NOT NULL,
  descricao   text,
  is_admin    boolean NOT NULL DEFAULT false,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_papeis_empresa_nome_unique UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_wise_papeis_empresa ON wise_papeis (empresa_id);

-- ── wise_papel_permissoes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_papel_permissoes (
  papel_id      uuid NOT NULL REFERENCES wise_papeis(id) ON DELETE CASCADE,
  permissao_id  uuid NOT NULL REFERENCES wise_permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (papel_id, permissao_id)
);

CREATE INDEX IF NOT EXISTS idx_wise_papel_permissoes_permissao ON wise_papel_permissoes (permissao_id);

-- ── wise_usuario_papeis ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_usuario_papeis (
  usuario_id     uuid NOT NULL REFERENCES wise_usuarios(id) ON DELETE CASCADE,
  papel_id       uuid NOT NULL REFERENCES wise_papeis(id) ON DELETE CASCADE,
  atribuido_em   timestamptz NOT NULL DEFAULT now(),
  atribuido_por  uuid REFERENCES wise_usuarios(id),
  PRIMARY KEY (usuario_id, papel_id)
);

CREATE INDEX IF NOT EXISTS idx_wise_usuario_papeis_papel ON wise_usuario_papeis (papel_id);

-- ── Permissões novas do Wise (catálogo de código pro Bloco 1.3) ──
INSERT INTO wise_permissoes (chave, nome, modulo) VALUES
  ('wise.empresas.criar',     'Criar empresa',                    'wise'),
  ('wise.unidades.gerenciar', 'Gerenciar unidades',                'wise'),
  ('wise.setores.gerenciar',  'Gerenciar setores',                 'wise'),
  ('wise.cargos.gerenciar',   'Gerenciar cargos',                  'wise'),
  ('wise.usuarios.visualizar','Visualizar usuários',               'wise'),
  ('wise.usuarios.gerenciar', 'Gerenciar usuários (convite/bloqueio/papéis)', 'wise'),
  ('wise.papeis.gerenciar',   'Gerenciar papéis e permissões',     'wise')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- Migração de dado — permissões legadas → wise_permissoes,
-- papéis derivados de cargo → wise_papeis/wise_papel_permissoes,
-- vínculo usuário→papel → wise_usuario_papeis (idempotente).
-- ============================================================

DO $$
DECLARE
  v_empresa_id      uuid;
  v_permissao       RECORD;
  v_nova_permissao_id uuid;
  v_cargo           RECORD;
  v_novo_papel_id    uuid;
  v_cargo_perm       RECORD;
  v_permissao_chave  text;
  v_wise_permissao_id uuid;
  v_wise_usuario     RECORD;
BEGIN
  SELECT id INTO v_empresa_id FROM wise_empresas WHERE slug = 'sms-esquadrias';
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'wise_empresas seed (slug=sms-esquadrias) não encontrada — rode o Bloco 1.1 antes deste.';
  END IF;

  -- ── Permissões legadas (sem prefixo → modulo fixo 'frame') ──
  FOR v_permissao IN SELECT * FROM permissoes LOOP
    INSERT INTO wise_permissoes (chave, nome, modulo)
    VALUES (v_permissao.chave, COALESCE(v_permissao.nome, v_permissao.chave), 'frame')
    ON CONFLICT (chave) DO NOTHING;
  END LOOP;

  -- ── Papéis derivados de cargo (1 papel por cargo existente) ──
  FOR v_cargo IN SELECT * FROM cargos LOOP
    IF NOT EXISTS (
      SELECT 1 FROM wise_mapeamento_legado WHERE origem_tabela = 'cargos_papel' AND origem_id = v_cargo.id
    ) THEN
      INSERT INTO wise_papeis (empresa_id, nome, descricao, is_admin)
      VALUES (
        v_empresa_id, v_cargo.nome,
        'Papel derivado automaticamente do cargo "' || v_cargo.nome || '" na migração do Wise.',
        v_cargo.is_admin
      )
      ON CONFLICT (empresa_id, nome) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id INTO v_novo_papel_id;

      INSERT INTO wise_mapeamento_legado (empresa_id, origem_modulo, origem_tabela, origem_id, destino_tabela, destino_id)
      VALUES (v_empresa_id, 'frame', 'cargos_papel', v_cargo.id, 'wise_papeis', v_novo_papel_id);

      -- Replica as permissões do cargo pro papel derivado (só se o
      -- cargo não for is_admin — papel admin já tem tudo implícito).
      IF NOT v_cargo.is_admin THEN
        FOR v_cargo_perm IN
          SELECT p.chave
          FROM cargo_permissoes cp
          JOIN permissoes p ON p.id = cp.permissao_id
          WHERE cp.cargo_id = v_cargo.id
        LOOP
          SELECT id INTO v_wise_permissao_id FROM wise_permissoes WHERE chave = v_cargo_perm.chave;
          IF v_wise_permissao_id IS NOT NULL THEN
            INSERT INTO wise_papel_permissoes (papel_id, permissao_id)
            VALUES (v_novo_papel_id, v_wise_permissao_id)
            ON CONFLICT DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- ── Vincula cada wise_usuario ao papel derivado do seu cargo ──
  FOR v_wise_usuario IN
    SELECT wu.id AS usuario_id, wu.cargo_id
    FROM wise_usuarios wu
    WHERE wu.cargo_id IS NOT NULL
  LOOP
    SELECT destino_id INTO v_novo_papel_id
    FROM wise_mapeamento_legado
    WHERE origem_tabela = 'cargos_papel'
      AND origem_id = (SELECT origem_id FROM wise_mapeamento_legado WHERE destino_tabela = 'wise_cargos' AND destino_id = v_wise_usuario.cargo_id);

    IF v_novo_papel_id IS NOT NULL THEN
      INSERT INTO wise_usuario_papeis (usuario_id, papel_id)
      VALUES (v_wise_usuario.usuario_id, v_novo_papel_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Funções auxiliares de RLS (SECURITY DEFINER — evita recursão,
-- ver seção 6.3 do documento de arquitetura)
-- ============================================================

CREATE OR REPLACE FUNCTION wise_fn_auth_usuario_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM wise_usuarios
  WHERE auth_id = auth.uid() AND status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION wise_fn_auth_empresa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM wise_usuarios
  WHERE auth_id = auth.uid() AND status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION wise_fn_tem_permissao(p_usuario_id uuid, p_chave text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Papel is_admin é checado fora do join com wise_papel_permissoes:
  -- um papel admin não precisa ter nenhuma permissão explícita
  -- atribuída (e o "Administrador" derivado da migração não tem — ver
  -- migração de dado acima), então um INNER JOIN direto em
  -- wise_papel_permissoes derrubaria o bypass de admin sempre que essa
  -- tabela não tivesse linha pro papel.
  SELECT EXISTS (
    SELECT 1
    FROM wise_usuario_papeis up
    JOIN wise_papeis p ON p.id = up.papel_id AND p.ativo
    WHERE up.usuario_id = p_usuario_id
      AND (
        p.is_admin
        OR EXISTS (
          SELECT 1
          FROM wise_papel_permissoes pp
          JOIN wise_permissoes perm ON perm.id = pp.permissao_id
          WHERE pp.papel_id = p.id AND perm.chave = p_chave
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION wise_fn_auth_usuario_id()          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wise_fn_auth_empresa_id()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wise_fn_tem_permissao(uuid, text)   TO authenticated, service_role;

-- ============================================================
-- RLS — habilita em toda tabela do Wise, com policies de verdade
-- (nunca "ligado e vazio" — ver seção 1.3 do documento)
-- ============================================================

-- ── wise_empresas: só lê a própria; escrita fora do escopo da Fase 1 UI ──
ALTER TABLE wise_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_empresas_select ON wise_empresas;
CREATE POLICY wise_empresas_select ON wise_empresas
  FOR SELECT TO authenticated
  USING (id = wise_fn_auth_empresa_id());

-- ── wise_unidades ──
ALTER TABLE wise_unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_unidades_select ON wise_unidades;
DROP POLICY IF EXISTS wise_unidades_insert ON wise_unidades;
DROP POLICY IF EXISTS wise_unidades_update ON wise_unidades;
CREATE POLICY wise_unidades_select ON wise_unidades
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());
CREATE POLICY wise_unidades_insert ON wise_unidades
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.unidades.gerenciar'));
CREATE POLICY wise_unidades_update ON wise_unidades
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.unidades.gerenciar'));

-- ── wise_setores ──
ALTER TABLE wise_setores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_setores_select ON wise_setores;
DROP POLICY IF EXISTS wise_setores_insert ON wise_setores;
DROP POLICY IF EXISTS wise_setores_update ON wise_setores;
CREATE POLICY wise_setores_select ON wise_setores
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());
CREATE POLICY wise_setores_insert ON wise_setores
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar'));
CREATE POLICY wise_setores_update ON wise_setores
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar'));

-- ── wise_cargos ──
ALTER TABLE wise_cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_cargos_select ON wise_cargos;
DROP POLICY IF EXISTS wise_cargos_insert ON wise_cargos;
DROP POLICY IF EXISTS wise_cargos_update ON wise_cargos;
CREATE POLICY wise_cargos_select ON wise_cargos
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());
CREATE POLICY wise_cargos_insert ON wise_cargos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.cargos.gerenciar'));
CREATE POLICY wise_cargos_update ON wise_cargos
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.cargos.gerenciar'));

-- ── wise_usuarios: self-read sempre liberado, além da regra de empresa ──
ALTER TABLE wise_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_usuarios_select ON wise_usuarios;
DROP POLICY IF EXISTS wise_usuarios_update ON wise_usuarios;
CREATE POLICY wise_usuarios_select ON wise_usuarios
  FOR SELECT TO authenticated
  USING (
    empresa_id = wise_fn_auth_empresa_id()
    AND (id = wise_fn_auth_usuario_id() OR wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.visualizar'))
  );
CREATE POLICY wise_usuarios_update ON wise_usuarios
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar'));

-- ── wise_papeis ──
ALTER TABLE wise_papeis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_papeis_select ON wise_papeis;
DROP POLICY IF EXISTS wise_papeis_insert ON wise_papeis;
DROP POLICY IF EXISTS wise_papeis_update ON wise_papeis;
CREATE POLICY wise_papeis_select ON wise_papeis
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());
CREATE POLICY wise_papeis_insert ON wise_papeis
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));
CREATE POLICY wise_papeis_update ON wise_papeis
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar'));

-- ── wise_permissoes / wise_modulos: catálogo global, só leitura ──
ALTER TABLE wise_permissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_permissoes_select ON wise_permissoes;
CREATE POLICY wise_permissoes_select ON wise_permissoes
  FOR SELECT TO authenticated
  USING (true);

ALTER TABLE wise_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_modulos_select ON wise_modulos;
CREATE POLICY wise_modulos_select ON wise_modulos
  FOR SELECT TO authenticated
  USING (true);

-- ── wise_empresa_modulos: leitura escopada por empresa, escrita só service_role ──
ALTER TABLE wise_empresa_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_empresa_modulos_select ON wise_empresa_modulos;
CREATE POLICY wise_empresa_modulos_select ON wise_empresa_modulos
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());

-- ── wise_papel_permissoes: leitura via join na empresa do papel ──
ALTER TABLE wise_papel_permissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_papel_permissoes_select ON wise_papel_permissoes;
DROP POLICY IF EXISTS wise_papel_permissoes_insert ON wise_papel_permissoes;
DROP POLICY IF EXISTS wise_papel_permissoes_delete ON wise_papel_permissoes;
CREATE POLICY wise_papel_permissoes_select ON wise_papel_permissoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wise_papeis p WHERE p.id = papel_id AND p.empresa_id = wise_fn_auth_empresa_id()));
CREATE POLICY wise_papel_permissoes_insert ON wise_papel_permissoes
  FOR INSERT TO authenticated
  WITH CHECK (
    wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar')
    AND EXISTS (SELECT 1 FROM wise_papeis p WHERE p.id = papel_id AND p.empresa_id = wise_fn_auth_empresa_id())
  );
CREATE POLICY wise_papel_permissoes_delete ON wise_papel_permissoes
  FOR DELETE TO authenticated
  USING (
    wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.papeis.gerenciar')
    AND EXISTS (SELECT 1 FROM wise_papeis p WHERE p.id = papel_id AND p.empresa_id = wise_fn_auth_empresa_id())
  );

-- ── wise_usuario_papeis: leitura via join na empresa do usuário ──
ALTER TABLE wise_usuario_papeis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wise_usuario_papeis_select ON wise_usuario_papeis;
DROP POLICY IF EXISTS wise_usuario_papeis_insert ON wise_usuario_papeis;
DROP POLICY IF EXISTS wise_usuario_papeis_delete ON wise_usuario_papeis;
CREATE POLICY wise_usuario_papeis_select ON wise_usuario_papeis
  FOR SELECT TO authenticated
  USING (
    usuario_id = wise_fn_auth_usuario_id()
    OR EXISTS (SELECT 1 FROM wise_usuarios u WHERE u.id = usuario_id AND u.empresa_id = wise_fn_auth_empresa_id() AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.visualizar'))
  );
CREATE POLICY wise_usuario_papeis_insert ON wise_usuario_papeis
  FOR INSERT TO authenticated
  WITH CHECK (
    wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar')
    AND EXISTS (SELECT 1 FROM wise_usuarios u WHERE u.id = usuario_id AND u.empresa_id = wise_fn_auth_empresa_id())
  );
CREATE POLICY wise_usuario_papeis_delete ON wise_usuario_papeis
  FOR DELETE TO authenticated
  USING (
    wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.gerenciar')
    AND EXISTS (SELECT 1 FROM wise_usuarios u WHERE u.id = usuario_id AND u.empresa_id = wise_fn_auth_empresa_id())
  );

-- ── wise_mapeamento_legado: tabela interna de migração — só service_role ──
ALTER TABLE wise_mapeamento_legado ENABLE ROW LEVEL SECURITY;
-- Sem policy pra authenticated: bloqueia por padrão. Só service_role
-- (que ignora RLS) escreve/lê essa tabela — ninguém no client precisa dela.
