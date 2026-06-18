-- Adiciona status EM_PEDIDO para solicitações transformadas em pedido aprovado.
-- Se o campo status for um VARCHAR com CHECK constraint, execute:

ALTER TABLE solicitacoes_compra
  DROP CONSTRAINT IF EXISTS solicitacoes_compra_status_check;

ALTER TABLE solicitacoes_compra
  ADD CONSTRAINT solicitacoes_compra_status_check
  CHECK (status IN ('ABERTA','AGUARDANDO_APROVACAO','APROVADA','REJEITADA','CANCELADA','EM_PEDIDO'));
