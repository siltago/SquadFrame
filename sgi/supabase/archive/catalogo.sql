-- ============================================================
-- SGI — Módulo Catálogo Técnico
-- Execute no SQL Editor do Supabase após schema.sql
-- ============================================================

-- Linhas de produto (ex: Linha Premium, Linha Standard)
create table linhas (
  id          uuid        primary key default gen_random_uuid(),
  nome        varchar(255) not null,
  fabricante  varchar(255),
  descricao   text,
  ativo       boolean      not null default true,
  criado_em   timestamptz  not null default now()
);

-- Categorias de perfil dentro de uma linha
create table categorias_perfil (
  id        uuid        primary key default gen_random_uuid(),
  linha_id  uuid        not null references linhas(id) on delete cascade,
  nome      varchar(255) not null,
  tipo      varchar(50)  not null default 'OUTROS',
  criado_em timestamptz  not null default now()
);

create index idx_categorias_perfil_linha on categorias_perfil(linha_id);

-- Produtos do catálogo
create table produtos (
  id             uuid        primary key default gen_random_uuid(),
  codigo_mestre  varchar(100) unique not null,
  nome           varchar(255) not null,
  linha_id       uuid        not null references linhas(id),
  categoria_id   uuid        references categorias_perfil(id),
  unidade        varchar(20)  not null default 'UN',  -- UN, M, M², KG, BARRA, CX
  descricao      text,
  observacoes    text,
  ativo          boolean      not null default true,
  criado_em      timestamptz  not null default now()
);

create index idx_produtos_linha     on produtos(linha_id);
create index idx_produtos_categoria on produtos(categoria_id);

-- Cores RAL (paleta de cores para perfis de alumínio)
create table cores_ral (
  id          uuid        primary key default gen_random_uuid(),
  codigo_ral  varchar(20)  not null unique,  -- ex: RAL9010
  nome        varchar(100),
  hex         varchar(7),
  criado_em   timestamptz  not null default now()
);

-- Acabamentos (ex: Anodizado, Pintado, Termolacado)
create table acabamentos (
  id        uuid        primary key default gen_random_uuid(),
  nome      varchar(100) not null,
  criado_em timestamptz  not null default now()
);

-- Cores vinculadas a produtos (com acabamento opcional)
create table produto_cores (
  id            uuid        primary key default gen_random_uuid(),
  produto_id    uuid        not null references produtos(id) on delete cascade,
  cor_id        uuid        not null references cores_ral(id),
  acabamento_id uuid        references acabamentos(id),
  criado_em     timestamptz  not null default now(),
  unique (produto_id, cor_id, acabamento_id)
);

create index idx_produto_cores_produto on produto_cores(produto_id);

-- Aliases de busca (nomes alternativos para localizar o produto)
create table produto_aliases (
  id         uuid        primary key default gen_random_uuid(),
  produto_id uuid        not null references produtos(id) on delete cascade,
  alias      varchar(255) not null,
  criado_em  timestamptz  not null default now(),
  unique (produto_id, alias)
);

create index idx_produto_aliases_produto on produto_aliases(produto_id);

-- Fornecedores
create table fornecedores (
  id        uuid        primary key default gen_random_uuid(),
  nome      varchar(255) not null,
  ativo     boolean      not null default true,
  criado_em timestamptz  not null default now()
);

-- Fornecedores vinculados a produtos (com código e preço de referência)
create table produto_fornecedores (
  id                uuid        primary key default gen_random_uuid(),
  produto_id        uuid        not null references produtos(id) on delete cascade,
  fornecedor_id     uuid        not null references fornecedores(id),
  codigo_fornecedor varchar(100),
  preco_referencia  numeric(12, 4),
  criado_em         timestamptz  not null default now(),
  unique (produto_id, fornecedor_id)
);

create index idx_produto_fornecedores_produto on produto_fornecedores(produto_id);

-- Arquivos do produto (DXF, imagens, PDF)
create table produto_arquivos (
  id         uuid        primary key default gen_random_uuid(),
  produto_id uuid        not null references produtos(id) on delete cascade,
  nome       varchar(255) not null,
  url        text        not null,
  tipo       varchar(20)  not null,  -- dxf | imagem | pdf
  tamanho    bigint,
  criado_em  timestamptz  not null default now()
);

create index idx_produto_arquivos_produto on produto_arquivos(produto_id);

-- ============================================================
-- SEED: Cores RAL mais comuns para perfis de alumínio
-- ============================================================
insert into cores_ral (codigo_ral, nome, hex) values
  ('RAL9010', 'Branco puro',         '#F4F4F4'),
  ('RAL9016', 'Branco tráfego',      '#F6F6F6'),
  ('RAL9005', 'Preto intenso',       '#0A0A0A'),
  ('RAL7016', 'Cinza antracite',     '#293133'),
  ('RAL7021', 'Cinza preto',         '#23282B'),
  ('RAL7035', 'Cinza claro',         '#CBD0CC'),
  ('RAL6005', 'Verde musgo',         '#0F4336'),
  ('RAL5010', 'Azul genciana',       '#0E4C96'),
  ('RAL3009', 'Vermelho óxido',      '#6C3B2A'),
  ('RAL1015', 'Marfim claro',        '#E6D2B5'),
  ('RAL8017', 'Marrom chocolate',    '#44221A'),
  ('RAL6003', 'Verde oliva',         '#424632'),
  ('RAL1013', 'Branco ostra',        '#EAE6CA'),
  ('RAL9006', 'Alumínio branco',     '#A5A5A5'),
  ('RAL9007', 'Alumínio cinza',      '#8F8F8F');

-- SEED: Acabamentos padrão
insert into acabamentos (nome) values
  ('Anodizado natural'),
  ('Anodizado bronze'),
  ('Pintado eletrostático'),
  ('Termolacado'),
  ('Inox');

-- ============================================================
-- STORAGE: Criar bucket "catalogo" no Supabase Dashboard
-- Storage → New bucket → nome: catalogo → Public: true
-- ============================================================
