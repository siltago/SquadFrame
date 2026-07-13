-- ============================================================
-- Cobrança de prazos via WhatsApp: schema base
-- ============================================================
-- 1. usuarios.whatsapp          → número individual (tela de Perfil)
-- 2. solicitacoes_compra.data_limite → prazo informativo
-- 3. whatsapp_grupos            → grupos de cobrança (setor/fornecedor)
-- 4. cobranca_log               → histórico de envios + deduplicação diária
-- 5. Índices parciais de suporte ao cron
-- ============================================================

-- ── usuarios.whatsapp ────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS whatsapp character varying(20);

-- ── solicitacoes_compra.data_limite ─────────────────────────
ALTER TABLE solicitacoes_compra
  ADD COLUMN IF NOT EXISTS data_limite date;

-- ── whatsapp_grupos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_grupos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo        text NOT NULL CHECK (escopo IN ('setor', 'fornecedor')),
  setor_id      uuid REFERENCES setores(id),
  fornecedor_id uuid REFERENCES fornecedores(id),
  group_jid     character varying(60) NOT NULL,
  ativo         boolean NOT NULL DEFAULT true,
  observacoes   text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_whatsapp_grupos_atualizado_em ON whatsapp_grupos;
CREATE TRIGGER trg_whatsapp_grupos_atualizado_em
  BEFORE UPDATE ON whatsapp_grupos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

ALTER TABLE whatsapp_grupos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_grupos_leitura" ON whatsapp_grupos;
CREATE POLICY "whatsapp_grupos_leitura" ON whatsapp_grupos
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin());

-- ── cobranca_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cobranca_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade        text NOT NULL CHECK (entidade IN ('pedido', 'solicitacao')),
  entidade_id     uuid NOT NULL,
  tipo_cobranca   text NOT NULL DEFAULT 'aguardando_aprovacao',
  data_referencia date NOT NULL,
  destino_tipo    text NOT NULL CHECK (destino_tipo IN ('individual', 'grupo')),
  destino         character varying(60) NOT NULL,
  usuario_id      uuid REFERENCES usuarios(id),
  grupo_id        uuid REFERENCES whatsapp_grupos(id),
  mensagem        text NOT NULL,
  sucesso         boolean NOT NULL,
  erro            text,
  enviado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entidade, entidade_id, tipo_cobranca, data_referencia, destino)
);

CREATE INDEX IF NOT EXISTS idx_cobranca_log_data ON cobranca_log(data_referencia);
CREATE INDEX IF NOT EXISTS idx_cobranca_log_entidade ON cobranca_log(entidade, entidade_id);

ALTER TABLE cobranca_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobranca_log_leitura" ON cobranca_log;
CREATE POLICY "cobranca_log_leitura" ON cobranca_log
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin());

-- ── Índices parciais de suporte ao cron diário ──────────────
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_aguardando_aprovacao
  ON pedidos_compra(id) WHERE status = 'AGUARDANDO_APROVACAO';

CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_aguardando_aprovacao
  ON solicitacoes_compra(id) WHERE status = 'AGUARDANDO_APROVACAO';
