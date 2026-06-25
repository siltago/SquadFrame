-- Adiciona campos de endereço na tabela fornecedores
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS endereco     TEXT,
  ADD COLUMN IF NOT EXISTS numero       TEXT,
  ADD COLUMN IF NOT EXISTS complemento  TEXT,
  ADD COLUMN IF NOT EXISTS bairro       TEXT,
  ADD COLUMN IF NOT EXISTS cidade       TEXT,
  ADD COLUMN IF NOT EXISTS estado       TEXT,
  ADD COLUMN IF NOT EXISTS cep          TEXT;
