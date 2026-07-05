-- SquadBoard migrations v3 — responsáveis via SquadSystem
-- Run after migrations-v2.sql

-- Tabela local de responsáveis por card (usuários do SquadSystem, não do Trello)
create table if not exists board_card_responsaveis (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,       -- 'trello'
  card_id     text not null,
  board_id    text not null,
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (provider, card_id, usuario_id)
);

create index if not exists board_card_responsaveis_card_idx
  on board_card_responsaveis (provider, card_id);

alter table board_card_responsaveis enable row level security;

create policy "Autenticado pode ler responsáveis"
  on board_card_responsaveis for select
  using (auth.uid() is not null);

create policy "Autenticado pode gerenciar responsáveis"
  on board_card_responsaveis for all
  using (auth.uid() is not null);
