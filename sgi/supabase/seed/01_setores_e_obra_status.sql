-- Seed: Setores padrão e status de obra
-- Idempotente: usa ON CONFLICT DO NOTHING

INSERT INTO setores (nome) VALUES
  ('Engenharia'), ('Compras'), ('Produção'),
  ('Qualidade'), ('Expedição'), ('Instalação'), ('Administrativo')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO obra_status (nome, cor, ordem, is_final) VALUES
  ('Orçamento',  '#94A3B8', 1, false),
  ('Contratada', '#0EA5E9', 2, false),
  ('Engenharia', '#6366F1', 3, false),
  ('Produção',   '#F59E0B', 4, false),
  ('Expedição',  '#8B5CF6', 5, false),
  ('Instalação', '#14B8A6', 6, false),
  ('Concluída',  '#22C55E', 7, true),
  ('Suspensa',   '#EAB308', 8, false),
  ('Cancelada',  '#EF4444', 9, true)
ON CONFLICT DO NOTHING;
