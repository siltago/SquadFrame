-- Número externo do lote: identificador manual vindo de outro software
-- (ERP externo), distinto do código auto-gerado do SquadFrame
-- (lotes_obra.codigo, formato PAT-AAAAMMDD-NNNN).
alter table public.lotes_obra
  add column if not exists numero_externo text;
