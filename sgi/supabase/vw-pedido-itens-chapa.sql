-- Recria vw_pedido_itens incluindo largura_m, altura_m, qtd_pecas (CHAPA)
-- Execute APÓS pedido-itens-dimensoes.sql
-- DROP é necessário pois CREATE OR REPLACE não permite mudar ordem de colunas

DROP VIEW IF EXISTS vw_pedido_itens;
CREATE VIEW vw_pedido_itens AS
WITH recebidos AS (
  SELECT
    pedido_item_id,
    SUM(quantidade_recebida) AS total_recebido
  FROM recebimento_itens
  GROUP BY pedido_item_id
)
SELECT
  pi.*,
  COALESCE(r.total_recebido, 0)                              AS quantidade_recebida,
  pi.quantidade_pedida - COALESCE(r.total_recebido, 0)       AS saldo_pendente
FROM pedido_itens pi
LEFT JOIN recebidos r ON r.pedido_item_id = pi.id;
