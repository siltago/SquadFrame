-- ============================================================
-- SquadWise — endereço em wise_unidades
-- ============================================================
-- Campos aditivos pra futuramente controlar entregas/estoque por
-- unidade. Decisão de UX: Empresas deixa de ser uma lista gerenciável
-- (não existe self-service de criação de empresa na Fase 1 — só a
-- empresa seed existe na prática) e Unidades passa a ser gerenciada
-- de dentro da tela de Empresa, não mais como item de navegação
-- separado. Nenhuma mudança de schema em wise_empresas.
-- ============================================================

ALTER TABLE wise_unidades
  ADD COLUMN IF NOT EXISTS cep           varchar(9),
  ADD COLUMN IF NOT EXISTS logradouro    varchar(255),
  ADD COLUMN IF NOT EXISTS numero        varchar(20),
  ADD COLUMN IF NOT EXISTS complemento   varchar(100),
  ADD COLUMN IF NOT EXISTS bairro        varchar(100),
  ADD COLUMN IF NOT EXISTS cidade        varchar(100),
  ADD COLUMN IF NOT EXISTS estado        varchar(2);
