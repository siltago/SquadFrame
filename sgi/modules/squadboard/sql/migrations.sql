-- SquadBoard — Architecture Consolidation
-- Execute no Supabase SQL Editor (em ordem)

-- ─────────────────────────────────────────────────────────────────────
-- 1. Workspace hierarchy
-- ─────────────────────────────────────────────────────────────────────

create table if not exists board_workspaces (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  provider    text not null,            -- 'trello' | futuros providers
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists board_workspace_sectors (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references board_workspaces(id) on delete cascade,
  nome         text not null,           -- 'engenharia' | 'compras' | 'producao'
  label        text not null,
  ordem        int  not null default 1,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, nome)
);

create table if not exists board_workspace_boards (
  id                  uuid primary key default gen_random_uuid(),
  sector_id           uuid not null references board_workspace_sectors(id) on delete cascade,
  provider_board_id   text not null,    -- id do board no provider (ex: Trello board id)
  provider_board_nome text,
  label               text,
  ordem               int  not null default 1,
  ativo               boolean not null default true,
  list_config         jsonb,            -- lista de list IDs a exibir (null = todas)
  ultimo_sync         timestamptz,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. Cache de boards (stale-while-revalidate, TTL 5min)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists board_cache (
  key         text primary key,
  payload     jsonb not null,
  provider    text not null,
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Índice para limpeza de entradas expiradas
create index if not exists board_cache_expires_at_idx on board_cache (expires_at);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Relacionamentos genéricos card → entidade SquadSystem
-- ─────────────────────────────────────────────────────────────────────

create table if not exists board_card_entities (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,            -- 'trello'
  card_id      text not null,            -- id do card no provider
  board_id     text not null,            -- id do board no provider
  entity_type  text not null,            -- 'OBRA' | 'WORK_PACKAGE' | 'PEDIDO_COMPRA' | etc.
  entity_id    text not null,            -- UUID da entidade no SquadSystem
  entity_label text,                     -- label desnormalizado para exibição rápida
  created_at   timestamptz not null default now(),
  unique (provider, card_id, entity_type, entity_id)
);

create index if not exists board_card_entities_card_idx on board_card_entities (provider, card_id);
create index if not exists board_card_entities_entity_idx on board_card_entities (entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Tabelas antigas (remover após confirmar migração)
-- ─────────────────────────────────────────────────────────────────────

-- Desativar (não excluir ainda) enquanto não confirmar que tudo migrou:
-- drop table if exists board_provider_mappings;
-- drop table if exists board_card_links;
-- drop table if exists board_connections;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RLS — desabilitar (acesso via service_role key no server)
-- ─────────────────────────────────────────────────────────────────────

alter table board_workspaces          disable row level security;
alter table board_workspace_sectors   disable row level security;
alter table board_workspace_boards    disable row level security;
alter table board_cache               disable row level security;
alter table board_card_entities       disable row level security;
