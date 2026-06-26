-- =============================================================================
-- Migration: 20260625000004_compras_permissoes.sql
-- Granulariza permissões de compras (de 4 genéricas para 14 específicas)
-- e migra automaticamente os cargos existentes para as novas chaves.
-- Idempotente: ON CONFLICT DO NOTHING em todos os INSERTs.
-- Não remove as permissões antigas (backward compat).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Inserir permissões granulares de compras
-- ---------------------------------------------------------------------------
INSERT INTO permissoes (chave, nome, modulo) VALUES
  ('compras.solicitacao.criar',        'Criar solicitações de compra',          'COMPRAS'),
  ('compras.solicitacao.aprovar',      'Aprovar solicitações de compra',        'COMPRAS'),
  ('compras.solicitacao.rejeitar',     'Rejeitar solicitações de compra',       'COMPRAS'),
  ('compras.pedido.criar',             'Criar pedidos de compra',               'COMPRAS'),
  ('compras.pedido.aprovar',           'Aprovar pedidos de compra',             'COMPRAS'),
  ('compras.pedido.cancelar',          'Cancelar pedidos de compra',            'COMPRAS'),
  ('compras.recebimento.registrar',    'Registrar recebimentos de pedidos',     'COMPRAS'),
  ('compras.documento.upload',         'Fazer upload de documentos em pedidos', 'COMPRAS'),
  ('compras.documento.excluir',        'Excluir documentos de pedidos',         'COMPRAS'),
  ('compras.anotacao.criar',           'Adicionar anotações em pedidos',        'COMPRAS'),
  ('compras.formapagamento.gerenciar', 'Gerenciar formas de pagamento',         'COMPRAS'),
  ('compras.fornecedor.criar',         'Criar fornecedores',                    'COMPRAS'),
  ('compras.fornecedor.editar',        'Editar fornecedores',                   'COMPRAS'),
  ('compras.fornecedor.excluir',       'Excluir fornecedores',                  'COMPRAS')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Migrar cargos existentes: mapear permissões antigas → novas
--
-- Mapeamento:
--   compras.criar        → solicitacao.criar, pedido.criar, anotacao.criar,
--                          documento.upload, recebimento.registrar
--   compras.editar       → fornecedor.criar, fornecedor.editar,
--                          formapagamento.gerenciar
--   compras.alterar_status → solicitacao.aprovar, solicitacao.rejeitar,
--                            pedido.aprovar, pedido.cancelar
--   compras.apagar       → pedido.cancelar, fornecedor.excluir,
--                          documento.excluir
-- ---------------------------------------------------------------------------
WITH mapeamento (chave_antiga, chave_nova) AS (
  VALUES
    ('compras.criar',          'compras.solicitacao.criar'),
    ('compras.criar',          'compras.pedido.criar'),
    ('compras.criar',          'compras.anotacao.criar'),
    ('compras.criar',          'compras.documento.upload'),
    ('compras.criar',          'compras.recebimento.registrar'),
    ('compras.editar',         'compras.fornecedor.criar'),
    ('compras.editar',         'compras.fornecedor.editar'),
    ('compras.editar',         'compras.formapagamento.gerenciar'),
    ('compras.alterar_status', 'compras.solicitacao.aprovar'),
    ('compras.alterar_status', 'compras.solicitacao.rejeitar'),
    ('compras.alterar_status', 'compras.pedido.aprovar'),
    ('compras.alterar_status', 'compras.pedido.cancelar'),
    ('compras.apagar',         'compras.pedido.cancelar'),
    ('compras.apagar',         'compras.fornecedor.excluir'),
    ('compras.apagar',         'compras.documento.excluir')
)
INSERT INTO cargo_permissoes (cargo_id, permissao_id)
SELECT DISTINCT cp.cargo_id, p_new.id
FROM cargo_permissoes cp
JOIN permissoes p_old ON p_old.id = cp.permissao_id
JOIN mapeamento m     ON m.chave_antiga = p_old.chave
JOIN permissoes p_new ON p_new.chave    = m.chave_nova
ON CONFLICT DO NOTHING;
