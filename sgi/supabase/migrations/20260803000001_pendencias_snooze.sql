-- Permite "minimizar" o banner de pendências de compras por hoje — sem
-- justificar pedido por pedido, só adia a cobrança pro próximo acesso do dia
-- seguinte. Uma linha por usuário (upsert), nunca acumula histórico: é um
-- estado de "snooze", não um log (ver pedido_pendencia_justificativas pra
-- isso). detectarPendenciasComprador some com o banner enquanto
-- snoozed_em == hoje; no dia seguinte a comparação de data já falha
-- sozinha e as pendências voltam a aparecer, sem precisar de job/cron.
CREATE TABLE IF NOT EXISTS "public"."usuario_pendencia_snooze" (
    "usuario_id"  uuid NOT NULL PRIMARY KEY REFERENCES "public"."usuarios"("id") ON DELETE CASCADE,
    "snoozed_em"  date NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."usuario_pendencia_snooze" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."usuario_pendencia_snooze" TO "anon";
GRANT ALL ON TABLE "public"."usuario_pendencia_snooze" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario_pendencia_snooze" TO "service_role";
