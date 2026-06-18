-- ============================================================
-- SGI — Suporte a itens externos em solicitações
-- Cole no SQL Editor do Supabase e execute.
-- ============================================================

-- Permite produto_id nulo (item externo sem cadastro no catálogo)
alter table solicitacao_itens
  alter column produto_id drop not null;

-- Texto livre para itens não cadastrados
alter table solicitacao_itens
  add column if not exists descricao_manual text;

-- Pelo menos um dos dois deve estar preenchido
alter table solicitacao_itens
  add constraint sol_item_descricao_check
  check (produto_id is not null or descricao_manual is not null);
