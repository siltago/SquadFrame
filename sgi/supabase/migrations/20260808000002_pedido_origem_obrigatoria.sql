-- Pedido com item digitado manual (sem vir de uma solicitação do sistema,
-- ou seja, sem solicitacao_item_id em nenhum item) precisa comprovar de
-- onde a compra veio (PDF, foto, e-mail etc.) antes de aprovar/emitir —
-- pedido 100% originado de solicitação já tem rastreio, não precisa duplicar
-- prova. O comprovante é só mais um pedido_documentos, com uma flag pra
-- distinguir do resto ("Documentos" já é usado pra devolutiva, romaneio
-- etc.) — a validação em si fica em código (alterarStatusPedido), não em
-- constraint de banco, mesmo padrão do resto do módulo Compras.
ALTER TABLE pedido_documentos
  ADD COLUMN IF NOT EXISTS eh_origem_pedido boolean NOT NULL DEFAULT false;
