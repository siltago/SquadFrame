-- Expõe tamanho_mm_especial (migration 20260901000001) na view usada
-- pela tela de editar pedido — sem isso, "select *" na view não trazia
-- a coluna nova mesmo já existindo na tabela.
CREATE OR REPLACE VIEW "public"."vw_pedido_itens" AS
 WITH "recebidos" AS (
         SELECT "recebimento_itens"."pedido_item_id",
            "sum"("recebimento_itens"."quantidade_recebida") AS "total_recebido"
           FROM "public"."recebimento_itens"
          GROUP BY "recebimento_itens"."pedido_item_id"
        )
 SELECT "pi"."id",
    "pi"."pedido_id",
    "pi"."produto_id",
    "pi"."descricao_snapshot",
    "pi"."quantidade_pedida",
    "pi"."unidade",
    "pi"."preco_unitario",
    "pi"."codigo_fornecedor",
    "pi"."obra_id",
    "pi"."solicitacao_item_id",
    "pi"."largura_m",
    "pi"."altura_m",
    "pi"."qtd_pecas",
    "pi"."cor_id",
    COALESCE("r"."total_recebido", (0)::numeric) AS "quantidade_recebida",
    ("pi"."quantidade_pedida" - COALESCE("r"."total_recebido", (0)::numeric)) AS "saldo_pendente",
    "pi"."tamanho_mm_especial"
   FROM ("public"."pedido_itens" "pi"
     LEFT JOIN "recebidos" "r" ON (("r"."pedido_item_id" = "pi"."id")));
