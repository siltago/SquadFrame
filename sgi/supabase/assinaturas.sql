-- ============================================================
-- SGI — Assinaturas Eletrônicas (carimbo textual)
-- Cole no SQL Editor do Supabase e execute.
-- ============================================================

-- 1. Tabela de assinaturas (uma por usuário — texto livre tipo "THIAGO S. PROJETISTA")
create table if not exists assinaturas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuarios(id) on delete cascade,
  unique (usuario_id),
  texto         text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 2. Log de eventos assinados (guarda o texto + momento exato da assinatura)
create table if not exists assinatura_eventos (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references usuarios(id),
  entidade     text not null,   -- 'solicitacao', 'pedido', etc.
  entidade_id  uuid not null,
  acao         text not null,   -- 'CRIADA', 'STATUS_APROVADA', etc.
  texto        text not null,   -- snapshot do texto no momento
  assinado_em  timestamptz not null default now()
);

create index if not exists assinatura_eventos_entidade_idx
  on assinatura_eventos (entidade, entidade_id);
