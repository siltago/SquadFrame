-- Permite "fechar" o banner de destaques do dashboard por hoje — mesmo
-- padrão de usuario_pendencia_snooze (20260803000001): uma linha por
-- usuário (upsert), nunca acumula histórico. O banner some enquanto
-- snoozed_em == hoje; no dia seguinte a comparação de data já falha
-- sozinha e os destaques voltam a aparecer, sem precisar de job/cron.
CREATE TABLE IF NOT EXISTS "public"."usuario_destaque_snooze" (
    "usuario_id"  uuid NOT NULL PRIMARY KEY REFERENCES "public"."usuarios"("id") ON DELETE CASCADE,
    "snoozed_em"  date NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."usuario_destaque_snooze" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."usuario_destaque_snooze" TO "anon";
GRANT ALL ON TABLE "public"."usuario_destaque_snooze" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario_destaque_snooze" TO "service_role";
