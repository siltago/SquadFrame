-- Gate de conformidade progressivo (Compras): schema de prorrogação/exceção
-- de pendência crítica + log de dedup do escalonamento diário.
--
-- Uma "solicitação de exceção pendente" NÃO é uma entidade separada — é só
-- uma prorrogação com status='PENDENTE_APROVACAO' em vez de 'ATIVA'. Isso
-- evita duplicar a lógica de "qual é a prorrogação vigente pra esse
-- pedido+tipo" em duas tabelas.
--
-- Sem coluna de contador de prorrogações: "já usou a prorrogação sozinho"
-- é sempre COUNT(*) WHERE origem='COMPRADOR' (nunca desincroniza). A 2ª
-- tentativa do mesmo pedido+tipo sempre vira PENDENTE_APROVACAO, vencida ou
-- não a primeira — isso já implementa sozinho "não pode adiar de novo pelo
-- mesmo usuário".
--
-- Sem estado EXPIRADA persistido, sem trigger, sem job pra "voltar o
-- bloqueio": cobertura é sempre recalculada on-read (ver
-- verificar-bloqueio.ts) — uma prorrogação só cobre se status='ATIVA' E
-- nova_data_compromisso >= hoje. Assim que vence, para de contar sozinha.

CREATE TYPE "public"."motivo_pendencia_padrao" AS ENUM (
  'FORNECEDOR_ATRASOU',
  'AGUARDANDO_FINANCEIRO',
  'ERRO_CADASTRAL',
  'AGUARDANDO_APROVACAO_INTERNA',
  'PROBLEMA_LOGISTICO',
  'OUTRO'
);

CREATE TYPE "public"."status_prorrogacao_pendencia" AS ENUM (
  'ATIVA',
  'PENDENTE_APROVACAO',
  'REVOGADA'
);

CREATE TABLE IF NOT EXISTS "public"."pedido_pendencia_prorrogacoes" (
    "id"                    uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "pedido_id"             uuid NOT NULL REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE,
    "tipo_pendencia"        text NOT NULL,
    "solicitado_por"        uuid NOT NULL REFERENCES "public"."usuarios"("id"),
    "motivo_padrao"         "public"."motivo_pendencia_padrao" NOT NULL,
    "motivo_detalhe"        text,
    "nova_data_compromisso" date NOT NULL,
    "responsavel_id"        uuid NOT NULL REFERENCES "public"."usuarios"("id"),
    "evidencia_url"         text,
    "origem"                text NOT NULL CHECK ("origem" IN ('COMPRADOR', 'GESTOR')),
    "status"                "public"."status_prorrogacao_pendencia" NOT NULL DEFAULT 'ATIVA',
    "aprovado_por"          uuid REFERENCES "public"."usuarios"("id"),
    "decidido_em"           timestamp with time zone,
    "motivo_decisao_gestor" text,
    "criado_em"             timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "pedido_pendencia_prorrogacoes_pedido_tipo_idx"
    ON "public"."pedido_pendencia_prorrogacoes" ("pedido_id", "tipo_pendencia", "criado_em" DESC);
CREATE INDEX "pedido_pendencia_prorrogacoes_status_idx"
    ON "public"."pedido_pendencia_prorrogacoes" ("status") WHERE "status" IN ('ATIVA', 'PENDENTE_APROVACAO');
CREATE INDEX "pedido_pendencia_prorrogacoes_solicitado_por_idx"
    ON "public"."pedido_pendencia_prorrogacoes" ("solicitado_por");

ALTER TABLE "public"."pedido_pendencia_prorrogacoes" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."pedido_pendencia_prorrogacoes" TO "anon";
GRANT ALL ON TABLE "public"."pedido_pendencia_prorrogacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido_pendencia_prorrogacoes" TO "service_role";

-- Log de dedup do cron de escalonamento — mesmo padrão "reserva antes de
-- enviar" via UNIQUE já usado em cobranca_log (executar-cobranca.ts):
-- insere, conflito de UNIQUE = já escalado hoje, pula.
CREATE TABLE IF NOT EXISTS "public"."pendencia_escalonamento_log" (
    "id"              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "pedido_id"       uuid NOT NULL REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE,
    "tipo_pendencia"  text NOT NULL,
    "data_referencia" date NOT NULL,
    "criado_em"       timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE ("pedido_id", "tipo_pendencia", "data_referencia")
);

ALTER TABLE "public"."pendencia_escalonamento_log" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "public"."pendencia_escalonamento_log" TO "anon";
GRANT ALL ON TABLE "public"."pendencia_escalonamento_log" TO "authenticated";
GRANT ALL ON TABLE "public"."pendencia_escalonamento_log" TO "service_role";
