-- ============================================================
-- Relatório diário de Compras via WhatsApp (texto + CTA)
-- ============================================================
-- 1. permissao "compras.notificacao.relatorio_diario" — quem recebe
-- 2. relatorio_diario_log — histórico de envios + deduplicação diária
-- ============================================================

INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.notificacao.relatorio_diario', 'Receber relatório diário de Compras (WhatsApp)', 'COMPRAS')
ON CONFLICT (chave) DO NOTHING;

CREATE TABLE IF NOT EXISTS relatorio_diario_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid REFERENCES usuarios(id),
  destino         character varying(20) NOT NULL,
  data_referencia date NOT NULL,
  mensagem        text NOT NULL,
  sucesso         boolean NOT NULL,
  erro            text,
  enviado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, data_referencia)
);

CREATE INDEX IF NOT EXISTS idx_relatorio_diario_log_data ON relatorio_diario_log(data_referencia);

ALTER TABLE relatorio_diario_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relatorio_diario_log_leitura" ON relatorio_diario_log;
CREATE POLICY "relatorio_diario_log_leitura" ON relatorio_diario_log
  FOR SELECT TO authenticated
  USING (fn_auth_is_admin());
