-- ============================================================
-- Verificação de WhatsApp por código (OTP) no cadastro do usuário
-- ============================================================
-- usuarios.whatsapp continua sendo o número VERIFICADO (já existia).
-- As colunas abaixo guardam o estado de uma verificação em andamento,
-- só promovida para "whatsapp" depois que o usuário confirma o código.
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS whatsapp_pendente character varying(20),
  ADD COLUMN IF NOT EXISTS whatsapp_codigo character varying(6),
  ADD COLUMN IF NOT EXISTS whatsapp_codigo_expira_em timestamptz;
