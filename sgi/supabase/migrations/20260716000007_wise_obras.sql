-- ============================================================
-- SquadWise — Bloco 1: Obras
-- Transfere a propriedade institucional de `obras` para o Wise
-- sem alterar a leitura/escrita do SquadFrame (compatibilidade total).
-- ============================================================

-- 1. Vincular obras existentes ao Wise (empresa + unidade)
ALTER TABLE obras
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES wise_empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES wise_unidades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS obras_empresa_id_idx ON obras(empresa_id);
CREATE INDEX IF NOT EXISTS obras_unidade_id_idx ON obras(unidade_id);

-- Backfill: vincular obras legadas à única empresa existente
UPDATE obras
SET empresa_id = (SELECT id FROM wise_empresas ORDER BY criado_em LIMIT 1)
WHERE empresa_id IS NULL;

-- 2. Estrutura física da obra
-- Árvore hierárquica reutilizável por todos os módulos.
-- Tipos suportados nesta fase: TORRE → BLOCO → PAVIMENTO.
-- AMBIENTE e OUTRO reservados para expansão futura (não criar UI agora).
CREATE TABLE IF NOT EXISTS wise_obra_estrutura (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES wise_obra_estrutura(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('TORRE','BLOCO','PAVIMENTO','AMBIENTE','OUTRO')),
  nome        text NOT NULL,
  codigo      text,
  ordem       integer NOT NULL DEFAULT 0,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wise_obra_estrutura_obra_idx   ON wise_obra_estrutura(obra_id);
CREATE INDEX IF NOT EXISTS wise_obra_estrutura_parent_idx ON wise_obra_estrutura(parent_id);

-- 3. CHECK constraint em tipologias_obra.status (domínio estava só em código)
ALTER TABLE tipologias_obra
  DROP CONSTRAINT IF EXISTS tipologias_obra_status_check;

ALTER TABLE tipologias_obra
  ADD CONSTRAINT tipologias_obra_status_check
  CHECK (status IN ('pendente','em_producao','pronto','entregue','cancelado'));

-- 4. Permissões do domínio Obras no catálogo Wise
INSERT INTO wise_permissoes (chave, nome, modulo) VALUES
  ('wise.obras.visualizar', 'Visualizar obras',        'wise'),
  ('wise.obras.criar',      'Criar obras',             'wise'),
  ('wise.obras.editar',     'Editar obras',            'wise'),
  ('wise.obras.arquivar',   'Arquivar/cancelar obras', 'wise')
ON CONFLICT (chave) DO NOTHING;

-- Conceder permissões de obras ao papel admin de cada empresa
INSERT INTO wise_papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM wise_papeis p
CROSS JOIN wise_permissoes perm
WHERE p.is_admin = true
  AND perm.chave LIKE 'wise.obras.%'
ON CONFLICT DO NOTHING;
