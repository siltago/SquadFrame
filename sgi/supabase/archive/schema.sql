-- ============================================================
-- SGI — Sistema de Gestão Industrial (Esquadrias / Vidros)
-- FUNDAÇÃO: Obras + Usuários + Auditoria
-- Banco: PostgreSQL (Supabase)
-- ============================================================
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- ============================================================

-- Extensão para UUID (já vem habilitada no Supabase, mas garantimos)
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. ESTRUTURA ORGANIZACIONAL (Módulo 5)
-- ============================================================

create table setores (
    id          uuid primary key default gen_random_uuid(),
    nome        varchar(100) not null unique,
    ativo       boolean default true,
    criado_em   timestamptz default now()
);

create table cargos (
    id          uuid primary key default gen_random_uuid(),
    nome        varchar(100) not null,
    nivel       integer default 1,            -- 1=júnior ... 5=diretor
    setor_id    uuid references setores(id),
    ativo       boolean default true,
    criado_em   timestamptz default now()
);

-- Usuários do sistema.
-- Obs.: a autenticação (login/senha) fica no Supabase Auth.
-- Esta tabela guarda o PERFIL e liga ao auth via auth_id.
create table usuarios (
    id              uuid primary key default gen_random_uuid(),
    auth_id         uuid unique,              -- referência ao auth.users do Supabase
    nome            varchar(255) not null,
    email           varchar(255) unique not null,
    telefone        varchar(30),
    cargo_id        uuid references cargos(id),
    setor_id        uuid references setores(id),
    foto_url        varchar(500),
    ativo           boolean default true,
    criado_em       timestamptz default now(),
    ultimo_acesso   timestamptz
);

-- ============================================================
-- 2. PERMISSÕES (granulares, independentes do cargo)
-- ============================================================

create table permissoes (
    id      uuid primary key default gen_random_uuid(),
    chave   varchar(100) unique not null,     -- ex: 'obras.criar'
    nome    varchar(255),
    modulo  varchar(50)
);

create table papeis (
    id      uuid primary key default gen_random_uuid(),
    nome    varchar(100) unique not null,      -- ex: 'Gestor de Compras'
    ativo   boolean default true
);

create table papel_permissoes (
    papel_id      uuid references papeis(id) on delete cascade,
    permissao_id  uuid references permissoes(id) on delete cascade,
    primary key (papel_id, permissao_id)
);

create table usuario_papeis (
    usuario_id  uuid references usuarios(id) on delete cascade,
    papel_id    uuid references papeis(id) on delete cascade,
    primary key (usuario_id, papel_id)
);

-- Override direto: permite ou NEGA uma permissão específica a um usuário
create table usuario_permissoes (
    usuario_id    uuid references usuarios(id) on delete cascade,
    permissao_id  uuid references permissoes(id) on delete cascade,
    concedida     boolean default true,         -- false = negada explicitamente
    primary key (usuario_id, permissao_id)
);

-- ============================================================
-- 3. CLIENTES
-- ============================================================

create table clientes (
    id              uuid primary key default gen_random_uuid(),
    nome            varchar(255) not null,
    razao_social    varchar(255),
    documento       varchar(20),               -- CNPJ ou CPF
    email           varchar(255),
    telefone        varchar(30),
    endereco        varchar(255),
    cidade          varchar(100),
    estado          char(2),
    cep             varchar(10),
    observacoes     text,
    ativo           boolean default true,
    criado_em       timestamptz default now(),
    deleted_at      timestamptz
);

-- ============================================================
-- 4. OBRAS (Módulo 1 — entidade central)
-- ============================================================

-- Status configuráveis da obra
create table obra_status (
    id          uuid primary key default gen_random_uuid(),
    nome        varchar(100) not null,
    cor         varchar(7),                    -- hex para a UI
    ordem       integer,
    is_final    boolean default false,
    ativo       boolean default true
);

-- Sequência para o código interno legível
create sequence if not exists obra_codigo_seq start 1;

create table obras (
    id                        uuid primary key default gen_random_uuid(),
    codigo                    varchar(20) unique not null,
    nome                      varchar(255) not null,
    cliente_id                uuid not null references clientes(id),
    endereco                  varchar(255),
    cidade                    varchar(100),
    estado                    char(2),
    cep                       varchar(10),
    responsavel_comercial_id  uuid references usuarios(id),
    responsavel_tecnico_id    uuid references usuarios(id),
    status_id                 uuid not null references obra_status(id),
    data_prevista             date,
    observacoes               text,
    criado_por                uuid references usuarios(id),
    criado_em                 timestamptz not null default now(),
    atualizado_em             timestamptz default now(),
    deleted_at                timestamptz
);

create index idx_obras_status   on obras(status_id) where deleted_at is null;
create index idx_obras_cliente  on obras(cliente_id) where deleted_at is null;

-- Função que gera o código OB-ANO-0001 automaticamente
create or replace function gerar_codigo_obra()
returns trigger as $$
begin
    if new.codigo is null or new.codigo = '' then
        new.codigo := 'OB-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('obra_codigo_seq')::text, 4, '0');
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_codigo_obra
before insert on obras
for each row execute function gerar_codigo_obra();

-- ============================================================
-- 5. HISTÓRICO DA OBRA (append-only, nunca apaga)
-- ============================================================

create table obra_historico (
    id              uuid primary key default gen_random_uuid(),
    obra_id         uuid not null references obras(id),
    usuario_id      uuid references usuarios(id),
    acao            varchar(100) not null,
    campo_alterado  varchar(100),
    valor_anterior  jsonb,
    valor_novo      jsonb,
    motivo          text,
    criado_em       timestamptz not null default now()
);

create index idx_obra_historico_obra on obra_historico(obra_id, criado_em desc);

-- ============================================================
-- 6. AUDITORIA GLOBAL (Módulo 5 — append-only, particionada)
-- ============================================================

create table audit_log (
    id              bigserial,
    usuario_id      uuid,
    usuario_nome    varchar(255),              -- snapshot
    modulo          varchar(50),
    acao            varchar(100),              -- CREATE / UPDATE / DELETE / APPROVE
    entidade        varchar(50),
    entidade_id     uuid,
    dados_antes     jsonb,
    dados_depois    jsonb,
    ip              inet,
    criado_em       timestamptz not null default now(),
    primary key (id, criado_em)
) partition by range (criado_em);

-- Partição do mês corrente (criar uma nova a cada mês via job)
create table audit_log_2026_06 partition of audit_log
    for values from ('2026-06-01') to ('2026-07-01');
create table audit_log_2026_07 partition of audit_log
    for values from ('2026-07-01') to ('2026-08-01');

-- ============================================================
-- 7. DADOS INICIAIS (seed)
-- ============================================================

-- Setores
insert into setores (nome) values
    ('Engenharia'), ('Compras'), ('Produção'),
    ('Qualidade'), ('Expedição'), ('Instalação'), ('Administrativo');

-- Status padrão da obra (com cores)
insert into obra_status (nome, cor, ordem, is_final) values
    ('Orçamento',  '#94A3B8', 1, false),
    ('Contratada', '#0EA5E9', 2, false),
    ('Engenharia', '#6366F1', 3, false),
    ('Produção',   '#F59E0B', 4, false),
    ('Expedição',  '#8B5CF6', 5, false),
    ('Instalação', '#14B8A6', 6, false),
    ('Concluída',  '#22C55E', 7, true),
    ('Suspensa',   '#EAB308', 8, false),
    ('Cancelada',  '#EF4444', 9, true);

-- Permissões iniciais do módulo de obras
insert into permissoes (chave, nome, modulo) values
    ('obras.ver',     'Visualizar obras',  'OBRAS'),
    ('obras.criar',   'Criar obras',       'OBRAS'),
    ('obras.editar',  'Editar obras',      'OBRAS'),
    ('obras.excluir', 'Excluir obras',     'OBRAS');

-- ============================================================
-- FIM DA FUNDAÇÃO
-- Próximos módulos (Catálogo, Compras, Produção, Trello)
-- serão adicionados em arquivos de migração separados.
-- ============================================================
