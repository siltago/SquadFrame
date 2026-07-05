-- SquadBoard migrations v2 — board_card_activity
-- Run after migrations.sql (v1)

-- Tabela de atividade local do SquadSystem (complementa eventos do provider)
create table if not exists board_card_activity (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,           -- ex: 'trello'
  card_id     text not null,
  board_id    text not null,
  tipo        text not null,           -- ex: 'RELATE_ENTITY', 'UNRELATE_ENTITY', 'SQUAD_COMMENT'
  descricao   text not null,           -- texto legível
  autor_id    uuid references auth.users(id) on delete set null,
  autor_nome  text,
  payload     jsonb,                   -- dados extras (entityType, entityId, etc.)
  criado_em   timestamptz not null default now()
);

create index if not exists board_card_activity_card_id_idx
  on board_card_activity (card_id, criado_em desc);

-- RLS: apenas usuários autenticados
alter table board_card_activity enable row level security;

create policy "Autenticado pode ler atividade"
  on board_card_activity for select
  using (auth.uid() is not null);

create policy "Autenticado pode inserir atividade"
  on board_card_activity for insert
  with check (auth.uid() is not null);
