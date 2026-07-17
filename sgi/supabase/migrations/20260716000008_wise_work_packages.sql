-- ============================================================
-- SquadWise — Bloco 3: Pacotes de Trabalho
-- Eleva lotes_obra ao status de entidade mestre do Wise.
-- Mantém todas as FKs existentes (Board, Frame) intactas.
-- ============================================================

-- 1. Estender lotes_obra com campos institucionais do Wise
ALTER TABLE lotes_obra
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES wise_empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'RASCUNHO'
                              CHECK (status IN ('RASCUNHO','ATIVO','SUSPENSO','CONCLUIDO','CANCELADO')),
  ADD COLUMN IF NOT EXISTS tipo       text,
  ADD COLUMN IF NOT EXISTS revisao    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS codigo     text;

CREATE INDEX IF NOT EXISTS lotes_obra_empresa_id_idx ON lotes_obra(empresa_id);
CREATE INDEX IF NOT EXISTS lotes_obra_status_idx     ON lotes_obra(status);

-- Backfill empresa_id a partir da obra proprietária
UPDATE lotes_obra l
SET empresa_id = o.empresa_id
FROM obras o
WHERE l.obra_id = o.id
  AND l.empresa_id IS NULL
  AND o.empresa_id IS NOT NULL;

-- Backfill código para pacotes existentes (PAT-AAAAMMDD-NNNN)
-- Usa row_number dentro de cada obra para evitar colisão
UPDATE lotes_obra l
SET codigo = 'PAT-' || to_char(l.criado_em, 'YYYYMMDD') || '-' || lpad(rn::text, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY obra_id ORDER BY criado_em) AS rn
  FROM lotes_obra
  WHERE codigo IS NULL
) sub
WHERE l.id = sub.id;

-- Pacotes legados (já tinham nome e responsável) passam a ATIVO automaticamente
-- para não ficarem "invisíveis" na nova UI (sem RASCUNHO sem contexto).
UPDATE lotes_obra
SET status = 'ATIVO'
WHERE status = 'RASCUNHO'
  AND responsavel_id IS NOT NULL;

-- 2. Módulos participantes de um pacote
-- Permite que o Wise publique eventos apenas para módulos selecionados.
CREATE TABLE IF NOT EXISTS wise_pacote_modulos (
  pacote_id  uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  modulo     text NOT NULL CHECK (modulo IN ('frame','board','flow','stock','measure')),
  habilitado boolean NOT NULL DEFAULT true,
  PRIMARY KEY (pacote_id, modulo)
);

-- Backfill: pacotes existentes participam de frame e board por padrão
INSERT INTO wise_pacote_modulos (pacote_id, modulo, habilitado)
SELECT l.id, m.modulo, true
FROM lotes_obra l
CROSS JOIN (VALUES ('frame'), ('board')) AS m(modulo)
ON CONFLICT DO NOTHING;

-- 3. Escopo físico do pacote (nós da estrutura da obra)
CREATE TABLE IF NOT EXISTS wise_pacote_escopo_estrutura (
  pacote_id    uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  estrutura_id uuid NOT NULL REFERENCES wise_obra_estrutura(id) ON DELETE CASCADE,
  PRIMARY KEY (pacote_id, estrutura_id)
);

-- 4. Escopo de tipologias do pacote
CREATE TABLE IF NOT EXISTS wise_pacote_escopo_tipologias (
  pacote_id    uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  tipologia_id uuid NOT NULL REFERENCES tipologias_obra(id) ON DELETE CASCADE,
  quantidade   integer,
  PRIMARY KEY (pacote_id, tipologia_id)
);

-- Backfill: tipologias_obra que já têm lote_id entram no escopo
INSERT INTO wise_pacote_escopo_tipologias (pacote_id, tipologia_id, quantidade)
SELECT t.lote_id, t.id, t.quantidade
FROM tipologias_obra t
WHERE t.lote_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Bus de eventos inter-módulos (publicação assíncrona)
CREATE TABLE IF NOT EXISTS wise_eventos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL REFERENCES wise_empresas(id) ON DELETE CASCADE,
  tipo         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}',
  obra_id      uuid REFERENCES obras(id) ON DELETE SET NULL,
  pacote_id    uuid REFERENCES lotes_obra(id) ON DELETE SET NULL,
  publicado_em timestamptz NOT NULL DEFAULT now(),
  consumido_por text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS wise_eventos_empresa_idx ON wise_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS wise_eventos_tipo_idx    ON wise_eventos(tipo);
CREATE INDEX IF NOT EXISTS wise_eventos_pacote_idx  ON wise_eventos(pacote_id);
CREATE INDEX IF NOT EXISTS wise_eventos_pub_idx     ON wise_eventos(publicado_em DESC);

-- 6. Permissões de Pacotes no catálogo Wise
INSERT INTO wise_permissoes (chave, nome, modulo) VALUES
  ('wise.pacotes.visualizar', 'Visualizar pacotes de trabalho', 'wise'),
  ('wise.pacotes.criar',      'Criar pacotes de trabalho',      'wise'),
  ('wise.pacotes.editar',     'Editar pacotes de trabalho',     'wise'),
  ('wise.pacotes.publicar',   'Publicar/ativar pacotes',        'wise'),
  ('wise.pacotes.arquivar',   'Arquivar/cancelar pacotes',      'wise')
ON CONFLICT (chave) DO NOTHING;

-- Conceder ao papel admin
INSERT INTO wise_papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM wise_papeis p
CROSS JOIN wise_permissoes perm
WHERE p.is_admin = true
  AND perm.chave LIKE 'wise.pacotes.%'
ON CONFLICT DO NOTHING;
