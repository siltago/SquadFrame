-- ============================================================
-- Fase 1, Passo 3 — remove de vez o schema de multiempresa do Wise.
-- O sistema deixou de ser multi-tenant (nunca teve mais de uma empresa
-- real em produção — só o seed "sms-esquadrias" e um registro "teste"
-- vazio, sem usuários/setores/cargos). O Passo 1 já neutralizou as RLS
-- policies (USING true / wise_fn_tem_permissao, sem escopo de empresa)
-- e o Passo 2 já removeu toda referência a empresa_id do código — esta
-- migration só derruba o que sobrou no schema.
--
-- Mantido de propósito: `wise_unidades` e `obras.unidade_id`/
-- `lotes_obra` continuam existindo — "unidade" (filial/local físico) é
-- um conceito diferente de "empresa" (tenant), não é resquício de
-- multi-tenant, só perde o `empresa_id` que a escopava por tenant.
-- ============================================================

-- ── 1. Tabela de junção empresa↔módulo — vira supérflua ─────────────
-- (não fazia sentido em single-tenant: "módulo habilitado" agora é só
-- wise_modulos.ativo, sem toggle por cliente)
DROP TABLE IF EXISTS wise_empresa_modulos;

-- ── 2. Triggers de compatibilidade Frame↔Wise que preenchiam
--      empresa_id automaticamente em obras/lotes_obra — não fazem
--      mais sentido sem a coluna ─────────────────────────────────────
DROP TRIGGER IF EXISTS trg_obras_empresa_id ON obras;
DROP FUNCTION IF EXISTS wise_set_obra_empresa_id();
DROP TRIGGER IF EXISTS trg_lotes_obra_empresa_id ON lotes_obra;
DROP FUNCTION IF EXISTS wise_set_lote_empresa_id();

-- ── 3. Remove empresa_id de toda tabela wise_* (nesta ordem: colunas
--      que referenciam wise_empresas primeiro, a tabela raiz por
--      último) ──────────────────────────────────────────────────────

ALTER TABLE wise_mapeamento_legado DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE wise_unidades DROP CONSTRAINT IF EXISTS wise_unidades_empresa_codigo_unique;
ALTER TABLE wise_unidades DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE wise_unidades ADD CONSTRAINT wise_unidades_codigo_unique UNIQUE (codigo);

ALTER TABLE wise_setores DROP CONSTRAINT IF EXISTS wise_setores_empresa_nome_unique;
ALTER TABLE wise_setores DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE wise_setores ADD CONSTRAINT wise_setores_nome_unique UNIQUE (nome);

ALTER TABLE wise_cargos DROP CONSTRAINT IF EXISTS wise_cargos_empresa_nome_unique;
ALTER TABLE wise_cargos DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE wise_cargos ADD CONSTRAINT wise_cargos_nome_unique UNIQUE (nome);

ALTER TABLE wise_usuarios DROP CONSTRAINT IF EXISTS wise_usuarios_empresa_email_unique;
ALTER TABLE wise_usuarios DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE wise_usuarios ADD CONSTRAINT wise_usuarios_email_unique UNIQUE (email);

ALTER TABLE wise_papeis DROP CONSTRAINT IF EXISTS wise_papeis_empresa_nome_unique;
ALTER TABLE wise_papeis DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE wise_papeis ADD CONSTRAINT wise_papeis_nome_unique UNIQUE (nome);

ALTER TABLE wise_auditoria DROP COLUMN IF EXISTS empresa_id;
CREATE INDEX IF NOT EXISTS idx_wise_auditoria_entidade_v2 ON wise_auditoria (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_wise_auditoria_criado_em_v2 ON wise_auditoria (criado_em DESC);

ALTER TABLE wise_eventos DROP COLUMN IF EXISTS empresa_id;

-- ── 4. Tabelas do Frame que só ganharam empresa_id pra servir o Wise ─
-- (unidade_id fica — ver nota no topo do arquivo)
ALTER TABLE obras DROP COLUMN IF EXISTS empresa_id;
ALTER TABLE lotes_obra DROP COLUMN IF EXISTS empresa_id;

-- ── 5. Tabela raiz — por último, depois que nada mais referencia ────
DROP TABLE IF EXISTS wise_empresas;

-- ── 6. Função de RLS que resolvia auth.uid() → empresa_id — não é
--      mais usada por policy nenhuma desde o Passo 1 ─────────────────
DROP FUNCTION IF EXISTS wise_fn_auth_empresa_id();
