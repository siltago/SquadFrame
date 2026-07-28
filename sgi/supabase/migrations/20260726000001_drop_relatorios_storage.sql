-- Relatórios de pedidos passaram a ser gerados on-the-fly a partir de
-- filtros na URL (período ou obra), sem persistir nada — o usuário só
-- imprime ou salva o PDF. A tabela de "receitas salvas" não é mais usada.
DROP TABLE IF EXISTS relatorios;
