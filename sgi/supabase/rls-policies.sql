-- ============================================================
-- RLS (Row Level Security) — SGI
-- Execute no SQL Editor do Supabase Dashboard
--
-- O app usa service_role em todos os server actions, então
-- o RLS não bloqueia o funcionamento. Ele protege contra
-- uso direto da anon key ou session token fora do app.
-- ============================================================

-- ── 1. Ativar RLS nas tabelas principais ─────────────────────

ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE setores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_permissoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_linha         ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_compra      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cores_ral           ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pagamento    ENABLE ROW LEVEL SECURITY;

-- Tabelas que podem existir dependendo das migrations rodadas:
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recebimentos') THEN
    EXECUTE 'ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recebimento_itens') THEN
    EXECUTE 'ALTER TABLE recebimento_itens ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assinaturas') THEN
    EXECUTE 'ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fornecedores_contato') THEN
    EXECUTE 'ALTER TABLE fornecedores_contato ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ── 2. Políticas de leitura para usuários autenticados ───────
-- Usuário autenticado pode ler todos os dados do sistema.
-- Escrita só via service_role (server actions).

CREATE POLICY "autenticado_le_usuarios"         ON usuarios         FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_cargos"           ON cargos           FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_setores"          ON setores          FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_permissoes"       ON permissoes       FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_cargo_permissoes" ON cargo_permissoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_obras"            ON obras            FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_tipos_linha"      ON tipos_linha      FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_produtos"         ON produtos         FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_fornecedores"     ON fornecedores     FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedidos"          ON pedidos_compra   FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_pedido_itens"     ON pedido_itens     FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_cores_ral"        ON cores_ral        FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado_le_formas_pagamento" ON formas_pagamento FOR SELECT TO authenticated USING (true);

-- ── 3. anon não tem acesso a nada (padrão quando RLS ativo) ──
-- Não é necessário criar políticas de negação explícitas —
-- quando RLS está ativo e não há policy para anon, o acesso
-- já é negado automaticamente.

-- ── 4. Verificar resultado ───────────────────────────────────
-- Execute isso para confirmar que RLS está ativo:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
