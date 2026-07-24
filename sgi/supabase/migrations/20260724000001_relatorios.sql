-- Documentos/Relatórios: tabela de "receitas" salvas (nome + filtros), reexecutadas com
-- dados frescos a cada visita. Primeiro tipo suportado: 'pedidos' (Relatório de Pedidos).
CREATE TABLE relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'pedidos',
  nome text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}',
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- rls_auto_enable habilita RLS sem política nenhuma em toda CREATE TABLE — sem isso,
-- leituras via role "authenticated" (Realtime, etc.) ficariam bloqueadas silenciosamente.
-- Autorização real de escrita continua via verificarPermissao() nas actions (service_role).
CREATE POLICY "authenticated_select" ON relatorios FOR SELECT TO authenticated USING (true);

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.relatorio.gerenciar', 'Criar e editar relatórios/documentos', 'COMPRAS')
ON CONFLICT (chave) DO NOTHING;
