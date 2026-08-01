-- Log de justificativas de pendências de pedido — o comprador registra por
-- que uma pendência (aprovado sem emitir, prazo vencido, recebido sem valor
-- final, rascunho esquecido) ainda não foi resolvida. A pendência em si
-- nunca é "fechada" por aqui: só some do banner quando o pedido muda de
-- fato (ver detectarPendenciasComprador). Cada dia sem resolução gera uma
-- nova linha, então o histórico por pedido/tipo funciona como log.
CREATE TABLE IF NOT EXISTS "public"."pedido_pendencia_justificativas" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "pedido_id" uuid NOT NULL REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE,
    "usuario_id" uuid NOT NULL REFERENCES "public"."usuarios"("id"),
    "tipo_pendencia" text NOT NULL,
    "motivo" text NOT NULL,
    "criado_em" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pedido_pendencia_justificativas_pedido_tipo_idx"
    ON "public"."pedido_pendencia_justificativas" ("pedido_id", "tipo_pendencia", "criado_em" DESC);

ALTER TABLE "public"."pedido_pendencia_justificativas" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."pedido_pendencia_justificativas" TO "anon";
GRANT ALL ON TABLE "public"."pedido_pendencia_justificativas" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido_pendencia_justificativas" TO "service_role";
