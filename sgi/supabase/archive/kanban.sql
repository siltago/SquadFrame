-- colunas_kanban
CREATE TABLE colunas_kanban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'CUSTOM' CHECK (tipo IN ('PADRAO','CUSTOM')),
  setor_id uuid REFERENCES setores(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  cor text,
  aceita_automaticas boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- etiquetas
CREATE TABLE etiquetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#6366f1',
  setor_id uuid REFERENCES setores(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefas
CREATE TABLE tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  coluna_id uuid REFERENCES colunas_kanban(id) ON DELETE SET NULL,
  ordem int NOT NULL DEFAULT 0,
  setor_id uuid REFERENCES setores(id) ON DELETE CASCADE,
  usuario_responsavel_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES usuarios(id),
  origem text NOT NULL DEFAULT 'MANUAL' CHECK (origem IN ('MANUAL','COMPRA','PRODUCAO','QUALIDADE','EXPEDICAO','OBRA')),
  entidade_ref text,
  entidade_ref_id uuid,
  obra_id uuid REFERENCES obras(id) ON DELETE SET NULL,
  pedido_id uuid,
  orcamento_id uuid,
  prioridade text NOT NULL DEFAULT 'MEDIA' CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA')),
  data_limite date,
  status text NOT NULL DEFAULT 'SEM_DONO' CHECK (status IN ('SEM_DONO','ACEITA','EM_ANDAMENTO','AGUARDANDO','CONCLUIDA','CANCELADA')),
  aceita_em timestamptz,
  concluida_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- tarefa_etiquetas
CREATE TABLE tarefa_etiquetas (
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  etiqueta_id uuid REFERENCES etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (tarefa_id, etiqueta_id)
);

-- tarefa_links
CREATE TABLE tarefa_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  url text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefa_arquivos
CREATE TABLE tarefa_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text,
  criado_por uuid REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefa_checklist
CREATE TABLE tarefa_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  texto text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefa_comentarios
CREATE TABLE tarefa_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id),
  texto text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefa_historico (append-only)
CREATE TABLE tarefa_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id),
  acao text NOT NULL,
  dados jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- tarefa_movimentacoes
CREATE TABLE tarefa_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES usuarios(id),
  coluna_origem_id uuid REFERENCES colunas_kanban(id) ON DELETE SET NULL,
  coluna_destino_id uuid REFERENCES colunas_kanban(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- RLS básico
ALTER TABLE colunas_kanban ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (admin client bypassa RLS)
CREATE POLICY "allow_all_colunas" ON colunas_kanban USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tarefas" ON tarefas USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_etiquetas" ON etiquetas USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_te" ON tarefa_etiquetas USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_links" ON tarefa_links USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_arquivos" ON tarefa_arquivos USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_checklist" ON tarefa_checklist USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comentarios" ON tarefa_comentarios USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_historico" ON tarefa_historico USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movimentacoes" ON tarefa_movimentacoes USING (true) WITH CHECK (true);

-- Bucket storage para arquivos de tarefas
INSERT INTO storage.buckets (id, name, public) VALUES ('tarefas', 'tarefas', true) ON CONFLICT DO NOTHING;
