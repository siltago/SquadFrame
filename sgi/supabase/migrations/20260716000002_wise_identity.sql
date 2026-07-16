-- ============================================================
-- SquadWise — Bloco 1.2: Identity (setores, cargos, usuários
-- espelhados — sem RLS e sem autorização ainda)
-- ============================================================
-- Aditivo: nenhuma tabela do Frame é alterada. `usuarios`/`setores`/
-- `cargos` continuam sendo a fonte de verdade lida pelo código — este
-- bloco só espelha o dado atual em wise_*, isolando "migração de dado"
-- de "migração de segurança" (Bloco 1.3).
-- Ver docs/squadwise/fase-1-arquitetura.md, seção 4.3/4.4/4.5 e 8.
-- ============================================================

CREATE TABLE IF NOT EXISTS wise_mapeamento_legado (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES wise_empresas(id),
  origem_modulo   text NOT NULL,
  origem_tabela   text NOT NULL,
  origem_id       uuid NOT NULL,
  destino_tabela  text NOT NULL,
  destino_id      uuid NOT NULL,
  migrado_em      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_mapeamento_legado_origem_unique UNIQUE (origem_tabela, origem_id)
);

CREATE INDEX IF NOT EXISTS idx_wise_mapeamento_legado_destino
  ON wise_mapeamento_legado (destino_tabela, destino_id);

-- ── wise_setores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_setores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES wise_empresas(id),
  nome        varchar(100) NOT NULL,
  cor         varchar(7) DEFAULT '#475569',
  ordem       integer DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_setores_empresa_nome_unique UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_wise_setores_empresa_ordem ON wise_setores (empresa_id, ordem);

-- ── wise_cargos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_cargos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  uuid NOT NULL REFERENCES wise_empresas(id),
  setor_id    uuid REFERENCES wise_setores(id),
  nome        varchar(100) NOT NULL,
  nivel       integer DEFAULT 1,
  cor         varchar(7) DEFAULT '#475569',
  ordem       integer DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wise_cargos_empresa_nome_unique UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_wise_cargos_empresa_setor ON wise_cargos (empresa_id, setor_id);

-- ── wise_usuarios ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wise_usuarios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES wise_empresas(id),
  auth_id        uuid NOT NULL REFERENCES auth.users(id),
  unidade_id     uuid REFERENCES wise_unidades(id),
  setor_id       uuid REFERENCES wise_setores(id),
  cargo_id       uuid REFERENCES wise_cargos(id),
  nome           varchar(255) NOT NULL,
  email          varchar(255) NOT NULL,
  telefone       varchar(30),
  foto_url       varchar(500),
  status         text NOT NULL DEFAULT 'ativo',
  criado_em      timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso  timestamptz,
  CONSTRAINT wise_usuarios_status_check CHECK (status IN ('ativo', 'inativo', 'bloqueado', 'convidado')),
  CONSTRAINT wise_usuarios_empresa_email_unique UNIQUE (empresa_id, email),
  CONSTRAINT wise_usuarios_auth_id_unique UNIQUE (auth_id)
);

CREATE INDEX IF NOT EXISTS idx_wise_usuarios_empresa_status ON wise_usuarios (empresa_id, status);

-- ============================================================
-- Migração de dado — setores → cargos → usuários (idempotente:
-- cada linha só migra se ainda não existe em wise_mapeamento_legado)
-- ============================================================

DO $$
DECLARE
  v_empresa_id     uuid;
  v_setor          RECORD;
  v_novo_setor_id  uuid;
  v_cargo          RECORD;
  v_novo_cargo_id  uuid;
  v_usuario        RECORD;
  v_novo_usuario_id uuid;
  v_status         text;
BEGIN
  SELECT id INTO v_empresa_id FROM wise_empresas WHERE slug = 'sms-esquadrias';
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'wise_empresas seed (slug=sms-esquadrias) não encontrada — rode o Bloco 1.1 antes deste.';
  END IF;

  -- ── Setores ──
  FOR v_setor IN SELECT * FROM setores LOOP
    IF NOT EXISTS (
      SELECT 1 FROM wise_mapeamento_legado WHERE origem_tabela = 'setores' AND origem_id = v_setor.id
    ) THEN
      INSERT INTO wise_setores (empresa_id, nome, cor, ordem, ativo)
      VALUES (v_empresa_id, v_setor.nome, v_setor.cor, v_setor.ordem, v_setor.ativo)
      RETURNING id INTO v_novo_setor_id;

      INSERT INTO wise_mapeamento_legado (empresa_id, origem_modulo, origem_tabela, origem_id, destino_tabela, destino_id)
      VALUES (v_empresa_id, 'frame', 'setores', v_setor.id, 'wise_setores', v_novo_setor_id);
    END IF;
  END LOOP;

  -- ── Cargos (setor_id resolvido via mapeamento do passo anterior) ──
  FOR v_cargo IN SELECT * FROM cargos LOOP
    IF NOT EXISTS (
      SELECT 1 FROM wise_mapeamento_legado WHERE origem_tabela = 'cargos' AND origem_id = v_cargo.id
    ) THEN
      INSERT INTO wise_cargos (empresa_id, setor_id, nome, nivel, cor, ordem, ativo)
      VALUES (
        v_empresa_id,
        (SELECT destino_id FROM wise_mapeamento_legado WHERE origem_tabela = 'setores' AND origem_id = v_cargo.setor_id),
        v_cargo.nome, v_cargo.nivel, v_cargo.cor, v_cargo.ordem, v_cargo.ativo
      )
      RETURNING id INTO v_novo_cargo_id;

      INSERT INTO wise_mapeamento_legado (empresa_id, origem_modulo, origem_tabela, origem_id, destino_tabela, destino_id)
      VALUES (v_empresa_id, 'frame', 'cargos', v_cargo.id, 'wise_cargos', v_novo_cargo_id);
      -- Nota: cargos.is_admin NÃO é migrado como coluna (wise_cargos não
      -- tem essa coluna por design — ver seção 4.4). Vira papel
      -- "Administrador" no Bloco 1.3, junto com o resto de wise_papeis.
    END IF;
  END LOOP;

  -- ── Usuários (setor_id/cargo_id resolvidos via mapeamento) ──
  FOR v_usuario IN SELECT * FROM usuarios LOOP
    IF NOT EXISTS (
      SELECT 1 FROM wise_mapeamento_legado WHERE origem_tabela = 'usuarios' AND origem_id = v_usuario.id
    ) THEN
      v_status := CASE WHEN v_usuario.ativo THEN 'ativo' ELSE 'inativo' END;

      INSERT INTO wise_usuarios (
        empresa_id, auth_id, setor_id, cargo_id, nome, email, telefone, foto_url, status, criado_em, ultimo_acesso
      )
      VALUES (
        v_empresa_id,
        v_usuario.auth_id,
        (SELECT destino_id FROM wise_mapeamento_legado WHERE origem_tabela = 'setores' AND origem_id = v_usuario.setor_id),
        (SELECT destino_id FROM wise_mapeamento_legado WHERE origem_tabela = 'cargos' AND origem_id = v_usuario.cargo_id),
        v_usuario.nome, v_usuario.email, v_usuario.telefone, v_usuario.foto_url, v_status, v_usuario.criado_em, v_usuario.ultimo_acesso
      )
      RETURNING id INTO v_novo_usuario_id;

      INSERT INTO wise_mapeamento_legado (empresa_id, origem_modulo, origem_tabela, origem_id, destino_tabela, destino_id)
      VALUES (v_empresa_id, 'frame', 'usuarios', v_usuario.id, 'wise_usuarios', v_novo_usuario_id);
    END IF;
  END LOOP;
END $$;
