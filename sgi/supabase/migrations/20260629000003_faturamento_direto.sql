-- =============================================================================
-- Migration: 20260629_faturamento_direto.sql
-- Adiciona suporte a "Faturamento Direto" como tipo especial de forma de pagamento.
-- Ao selecionar essa forma em um pedido, usa_carteira é marcado automaticamente.
-- =============================================================================

ALTER TABLE formas_pagamento
  ADD COLUMN IF NOT EXISTS is_faturamento_direto boolean NOT NULL DEFAULT false;

-- Seed: registro padrão de Faturamento Direto (idempotente)
INSERT INTO formas_pagamento (nome, descricao, is_faturamento_direto)
VALUES (
  'Faturamento Direto',
  'Débito automático da carteira da obra ao emitir o pedido.',
  true
)
ON CONFLICT DO NOTHING;
