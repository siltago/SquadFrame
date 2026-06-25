


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."atualizar_search_produto"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.search_vector :=
        to_tsvector('portuguese', coalesce(new.nome_tecnico, ''))
        || to_tsvector('simple', coalesce(new.codigo_mestre, ''));
    return new;
end;
$$;


ALTER FUNCTION "public"."atualizar_search_produto"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gerar_codigo_obra"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.codigo is null or new.codigo = '' then
        new.codigo := 'OB-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('obra_codigo_seq')::text, 4, '0');
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."gerar_codigo_obra"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.usuarios (auth_id, nome, email, empresa)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'empresa'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."acabamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "ativo" boolean DEFAULT true
);


ALTER TABLE "public"."acabamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assinatura_eventos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "entidade" "text" NOT NULL,
    "entidade_id" "uuid" NOT NULL,
    "acao" "text" NOT NULL,
    "texto" "text" NOT NULL,
    "assinado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assinatura_eventos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assinaturas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assinaturas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "modulo" character varying(50),
    "acao" character varying(100),
    "entidade" character varying(50),
    "entidade_id" "uuid",
    "dados_antes" "jsonb",
    "dados_depois" "jsonb",
    "ip" "inet",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
)
PARTITION BY RANGE ("criado_em");


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_log_2026_06" (
    "id" bigint DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass") NOT NULL,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "modulo" character varying(50),
    "acao" character varying(100),
    "entidade" character varying(50),
    "entidade_id" "uuid",
    "dados_antes" "jsonb",
    "dados_depois" "jsonb",
    "ip" "inet",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log_2026_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log_2026_07" (
    "id" bigint DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass") NOT NULL,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "modulo" character varying(50),
    "acao" character varying(100),
    "entidade" character varying(50),
    "entidade_id" "uuid",
    "dados_antes" "jsonb",
    "dados_depois" "jsonb",
    "ip" "inet",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log_2026_07" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cargo_permissoes" (
    "cargo_id" "uuid" NOT NULL,
    "permissao_id" "uuid" NOT NULL
);


ALTER TABLE "public"."cargo_permissoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cargos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "nivel" integer DEFAULT 1,
    "setor_id" "uuid",
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "cor" character varying(7) DEFAULT '#475569'::character varying,
    "is_admin" boolean DEFAULT false,
    "ordem" integer DEFAULT 0
);


ALTER TABLE "public"."cargos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_perfil" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "linha_id" "uuid",
    "nome" character varying(100) NOT NULL,
    "ordem" integer DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "tipo" "text" DEFAULT 'OUTROS'::"text" NOT NULL
);


ALTER TABLE "public"."categorias_perfil" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "razao_social" character varying(255),
    "documento" character varying(20),
    "email" character varying(255),
    "telefone" character varying(30),
    "endereco" character varying(255),
    "cidade" character varying(100),
    "estado" character(2),
    "cep" character varying(10),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colunas_kanban" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "tipo" "text" DEFAULT 'CUSTOM'::"text" NOT NULL,
    "setor_id" "uuid",
    "usuario_id" "uuid",
    "cor" "text",
    "aceita_automaticas" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "colunas_kanban_tipo_check" CHECK (("tipo" = ANY (ARRAY['PADRAO'::"text", 'CUSTOM'::"text"])))
);


ALTER TABLE "public"."colunas_kanban" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compra_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entidade" "text" NOT NULL,
    "entidade_id" "uuid" NOT NULL,
    "usuario_id" "uuid",
    "acao" "text" NOT NULL,
    "dados" "jsonb",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compra_historico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_ral" character varying(20) NOT NULL,
    "nome" character varying(100) NOT NULL,
    "hex_preview" character varying(7),
    "ativo" boolean DEFAULT true
);


ALTER TABLE "public"."cores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cores_ral" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_ral" character varying(20) NOT NULL,
    "nome" character varying(100),
    "hex" character varying(7),
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acabamento_id" "uuid",
    "tipos" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "public"."cores_ral" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresa" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "nome" "text",
    "nome_fantasia" "text",
    "cnpj" "text",
    "telefone" "text",
    "email" "text",
    "site" "text",
    "endereco" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "logo_url" "text",
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "ie" "text"
);


ALTER TABLE "public"."empresa" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etiquetas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#6366f1'::"text" NOT NULL,
    "setor_id" "uuid",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."etiquetas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."formas_pagamento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."formas_pagamento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fornecedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "razao_social" character varying(255),
    "cnpj" character varying(18),
    "email" character varying(255),
    "telefone" character varying(30),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "contato" "text",
    "tipos" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "endereco" "text",
    "numero" "text",
    "complemento" "text",
    "bairro" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text"
);


ALTER TABLE "public"."fornecedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."linhas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "fabricante" character varying(100),
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "tipo" character varying(20) DEFAULT 'PERFIL'::character varying NOT NULL
);


ALTER TABLE "public"."linhas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lotes_obra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "obra_id" "uuid" NOT NULL,
    "nome" character varying(200) DEFAULT 'Importação'::character varying NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lotes_obra" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."obra_codigo_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."obra_codigo_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."obra_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "obra_id" "uuid" NOT NULL,
    "usuario_id" "uuid",
    "acao" character varying(100) NOT NULL,
    "campo_alterado" character varying(100),
    "valor_anterior" "jsonb",
    "valor_novo" "jsonb",
    "motivo" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."obra_historico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."obra_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "cor" character varying(7),
    "ordem" integer,
    "is_final" boolean DEFAULT false,
    "ativo" boolean DEFAULT true
);


ALTER TABLE "public"."obra_status" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."obras_numero_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."obras_numero_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."obras" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "endereco" character varying(255),
    "cidade" character varying(100),
    "estado" character(2),
    "cep" character varying(10),
    "responsavel_comercial_id" "uuid",
    "responsavel_tecnico_id" "uuid",
    "status_id" "uuid" NOT NULL,
    "data_prevista" "date",
    "observacoes" "text",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "numero" integer DEFAULT "nextval"('"public"."obras_numero_seq"'::"regclass")
);


ALTER TABLE "public"."obras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."papeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "ativo" boolean DEFAULT true
);


ALTER TABLE "public"."papeis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."papel_permissoes" (
    "papel_id" "uuid" NOT NULL,
    "permissao_id" "uuid" NOT NULL
);


ALTER TABLE "public"."papel_permissoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedido_anotacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pedido_id" "uuid" NOT NULL,
    "usuario_id" "uuid",
    "status_pedido" "text",
    "texto" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pedido_anotacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedido_documentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pedido_id" "uuid" NOT NULL,
    "usuario_id" "uuid",
    "nome_arquivo" "text" NOT NULL,
    "caminho_storage" "text" NOT NULL,
    "tamanho_bytes" bigint,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pedido_documentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedido_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pedido_id" "uuid" NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "descricao_snapshot" "text" NOT NULL,
    "quantidade_pedida" numeric(12,3) NOT NULL,
    "unidade" "text" NOT NULL,
    "preco_unitario" numeric(15,4),
    "codigo_fornecedor" "text",
    "obra_id" "uuid",
    "solicitacao_item_id" "uuid",
    "largura_m" numeric,
    "altura_m" numeric,
    "qtd_pecas" integer,
    "cor_id" "uuid"
);


ALTER TABLE "public"."pedido_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedidos_compra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero" "text" DEFAULT ((('PC-'::"text" || "to_char"("now"(), 'YYYYMMDD'::"text")) || '-'::"text") || "substr"(("gen_random_uuid"())::"text", 1, 6)) NOT NULL,
    "status" "text" DEFAULT 'RASCUNHO'::"text" NOT NULL,
    "fornecedor_id" "uuid" NOT NULL,
    "obra_id" "uuid",
    "comprador_id" "uuid",
    "prazo_entrega" "date",
    "observacoes" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "forma_pagamento_id" "uuid",
    "tipo_linha" "text",
    "cor_id" "uuid"
);


ALTER TABLE "public"."pedidos_compra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chave" character varying(100) NOT NULL,
    "nome" character varying(255),
    "modulo" character varying(50)
);


ALTER TABLE "public"."permissoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produto_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "alias" character varying(255) NOT NULL,
    "fornecedor_id" "uuid",
    "peso_metro" numeric,
    "preco_metro" numeric,
    "tamanho_mm" numeric
);


ALTER TABLE "public"."produto_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produto_arquivos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "tipo" character varying(20) NOT NULL,
    "nome_original" character varying(255),
    "url" character varying(500),
    "url_preview" character varying(500),
    "is_principal" boolean DEFAULT false,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."produto_arquivos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produto_cores" (
    "produto_id" "uuid" NOT NULL,
    "cor_id" "uuid" NOT NULL,
    "acabamento_id" "uuid"
);


ALTER TABLE "public"."produto_cores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produto_fornecedor" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "fornecedor_id" "uuid" NOT NULL,
    "codigo_fornecedor" character varying(100) NOT NULL,
    "preco_referencia" numeric(15,4),
    "ativo" boolean DEFAULT true
);


ALTER TABLE "public"."produto_fornecedor" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produto_fornecedores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "fornecedor_id" "uuid" NOT NULL,
    "codigo_fornecedor" character varying(100),
    "preco_referencia" numeric(12,4),
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."produto_fornecedores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_mestre" character varying(50) NOT NULL,
    "nome_tecnico" character varying(255) NOT NULL,
    "linha_id" "uuid",
    "categoria_id" "uuid",
    "unidade" character varying(20),
    "descricao" "text",
    "observacoes" "text",
    "status" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "search_vector" "tsvector",
    "nome" character varying(255) NOT NULL,
    "fornecedor_mestre_id" "uuid",
    "peso_metro" numeric,
    "preco_metro" numeric,
    "tamanho_mm" numeric
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recebimento_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recebimento_id" "uuid" NOT NULL,
    "pedido_item_id" "uuid" NOT NULL,
    "quantidade_recebida" numeric(12,3) NOT NULL,
    "observacoes" "text"
);


ALTER TABLE "public"."recebimento_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recebimentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pedido_id" "uuid" NOT NULL,
    "responsavel_id" "uuid",
    "data_recebimento" "date" NOT NULL,
    "observacoes" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recebimentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."setores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "cor" character varying(7) DEFAULT '#475569'::character varying,
    "ordem" integer DEFAULT 0
);


ALTER TABLE "public"."setores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solicitacao_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "solicitacao_id" "uuid" NOT NULL,
    "produto_id" "uuid",
    "quantidade" numeric(12,3) NOT NULL,
    "unidade" "text" NOT NULL,
    "observacoes" "text",
    "descricao_manual" "text",
    "cor_id" "uuid",
    CONSTRAINT "sol_item_descricao_check" CHECK ((("produto_id" IS NOT NULL) OR ("descricao_manual" IS NOT NULL)))
);


ALTER TABLE "public"."solicitacao_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solicitacoes_compra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "numero" "text" DEFAULT ((('SC-'::"text" || "to_char"("now"(), 'YYYYMMDD'::"text")) || '-'::"text") || "substr"(("gen_random_uuid"())::"text", 1, 6)) NOT NULL,
    "status" "text" DEFAULT 'ABERTA'::"text" NOT NULL,
    "prioridade" "text" DEFAULT 'NORMAL'::"text" NOT NULL,
    "origem" "text" DEFAULT 'OBRA'::"text" NOT NULL,
    "obra_id" "uuid",
    "solicitante_id" "uuid",
    "justificativa" "text",
    "observacoes" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cor_id" "uuid",
    CONSTRAINT "solicitacoes_compra_status_check" CHECK (("status" = ANY (ARRAY['ABERTA'::"text", 'AGUARDANDO_APROVACAO'::"text", 'APROVADA'::"text", 'REJEITADA'::"text", 'CANCELADA'::"text", 'EM_PEDIDO'::"text"])))
);


ALTER TABLE "public"."solicitacoes_compra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_arquivos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "nome" "text" NOT NULL,
    "url" "text" NOT NULL,
    "tipo" "text",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_arquivos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_checklist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "texto" "text" NOT NULL,
    "concluido" boolean DEFAULT false NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_checklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_comentarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "usuario_id" "uuid",
    "texto" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_comentarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_etiquetas" (
    "tarefa_id" "uuid" NOT NULL,
    "etiqueta_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tarefa_etiquetas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_historico" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "usuario_id" "uuid",
    "acao" "text" NOT NULL,
    "dados" "jsonb",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_historico" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "titulo" "text" NOT NULL,
    "url" "text" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefa_movimentacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tarefa_id" "uuid",
    "usuario_id" "uuid",
    "coluna_origem_id" "uuid",
    "coluna_destino_id" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tarefa_movimentacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tarefas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "coluna_id" "uuid",
    "ordem" integer DEFAULT 0 NOT NULL,
    "setor_id" "uuid",
    "usuario_responsavel_id" "uuid",
    "criado_por" "uuid",
    "origem" "text" DEFAULT 'MANUAL'::"text" NOT NULL,
    "entidade_ref" "text",
    "entidade_ref_id" "uuid",
    "obra_id" "uuid",
    "pedido_id" "uuid",
    "orcamento_id" "uuid",
    "prioridade" "text" DEFAULT 'MEDIA'::"text" NOT NULL,
    "data_limite" "date",
    "status" "text" DEFAULT 'SEM_DONO'::"text" NOT NULL,
    "aceita_em" timestamp with time zone,
    "concluida_em" timestamp with time zone,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "tarefas_origem_check" CHECK (("origem" = ANY (ARRAY['MANUAL'::"text", 'COMPRA'::"text", 'PRODUCAO'::"text", 'QUALIDADE'::"text", 'EXPEDICAO'::"text", 'OBRA'::"text"]))),
    CONSTRAINT "tarefas_prioridade_check" CHECK (("prioridade" = ANY (ARRAY['BAIXA'::"text", 'MEDIA'::"text", 'ALTA'::"text", 'CRITICA'::"text"]))),
    CONSTRAINT "tarefas_status_check" CHECK (("status" = ANY (ARRAY['SEM_DONO'::"text", 'ACEITA'::"text", 'EM_ANDAMENTO'::"text", 'AGUARDANDO'::"text", 'CONCLUIDA'::"text", 'CANCELADA'::"text"])))
);


ALTER TABLE "public"."tarefas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipologia_cores" (
    "tipologia_id" "uuid" NOT NULL,
    "cor_id" "uuid" NOT NULL,
    "acabamento_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tipologia_cores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipologia_perfis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipologia_id" "uuid" NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "quantidade" numeric(10,3) DEFAULT 1 NOT NULL,
    "unidade" character varying(20),
    "observacoes" "text"
);


ALTER TABLE "public"."tipologia_perfis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipologias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(255) NOT NULL,
    "linha_id" "uuid",
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tipologias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipologias_obra" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "obra_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "quantidade" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "codigo_esquadria" character varying(100),
    "tipo" character varying(100),
    "largura_mm" integer,
    "altura_mm" integer,
    "tratamento" character varying(200),
    "descricao" "text",
    "peso_unit" numeric(10,3),
    "preco_unit" numeric(12,2),
    "lote_id" "uuid",
    "status" character varying(50) DEFAULT 'pendente'::character varying NOT NULL
);


ALTER TABLE "public"."tipologias_obra" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tipos_linha" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "unidade" "text" DEFAULT 'UN'::"text" NOT NULL
);


ALTER TABLE "public"."tipos_linha" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuario_papeis" (
    "usuario_id" "uuid" NOT NULL,
    "papel_id" "uuid" NOT NULL
);


ALTER TABLE "public"."usuario_papeis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuario_permissoes" (
    "usuario_id" "uuid" NOT NULL,
    "permissao_id" "uuid" NOT NULL,
    "concedida" boolean DEFAULT true
);


ALTER TABLE "public"."usuario_permissoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_id" "uuid",
    "nome" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "telefone" character varying(30),
    "cargo_id" "uuid",
    "setor_id" "uuid",
    "foto_url" character varying(500),
    "ativo" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "ultimo_acesso" timestamp with time zone,
    "empresa" "text"
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_pedido_itens" AS
 WITH "recebidos" AS (
         SELECT "recebimento_itens"."pedido_item_id",
            "sum"("recebimento_itens"."quantidade_recebida") AS "total_recebido"
           FROM "public"."recebimento_itens"
          GROUP BY "recebimento_itens"."pedido_item_id"
        )
 SELECT "pi"."id",
    "pi"."pedido_id",
    "pi"."produto_id",
    "pi"."descricao_snapshot",
    "pi"."quantidade_pedida",
    "pi"."unidade",
    "pi"."preco_unitario",
    "pi"."codigo_fornecedor",
    "pi"."obra_id",
    "pi"."solicitacao_item_id",
    "pi"."largura_m",
    "pi"."altura_m",
    "pi"."qtd_pecas",
    "pi"."cor_id",
    COALESCE("r"."total_recebido", (0)::numeric) AS "quantidade_recebida",
    ("pi"."quantidade_pedida" - COALESCE("r"."total_recebido", (0)::numeric)) AS "saldo_pendente"
   FROM ("public"."pedido_itens" "pi"
     LEFT JOIN "recebidos" "r" ON (("r"."pedido_item_id" = "pi"."id")));


ALTER VIEW "public"."vw_pedido_itens" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log" ATTACH PARTITION "public"."audit_log_2026_06" FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');



ALTER TABLE ONLY "public"."audit_log" ATTACH PARTITION "public"."audit_log_2026_07" FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');



ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."acabamentos"
    ADD CONSTRAINT "acabamentos_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."acabamentos"
    ADD CONSTRAINT "acabamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assinatura_eventos"
    ADD CONSTRAINT "assinatura_eventos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assinaturas"
    ADD CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assinaturas"
    ADD CONSTRAINT "assinaturas_usuario_id_key" UNIQUE ("usuario_id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id", "criado_em");



ALTER TABLE ONLY "public"."audit_log_2026_06"
    ADD CONSTRAINT "audit_log_2026_06_pkey" PRIMARY KEY ("id", "criado_em");



ALTER TABLE ONLY "public"."audit_log_2026_07"
    ADD CONSTRAINT "audit_log_2026_07_pkey" PRIMARY KEY ("id", "criado_em");



ALTER TABLE ONLY "public"."cargo_permissoes"
    ADD CONSTRAINT "cargo_permissoes_pkey" PRIMARY KEY ("cargo_id", "permissao_id");



ALTER TABLE ONLY "public"."cargos"
    ADD CONSTRAINT "cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_perfil"
    ADD CONSTRAINT "categorias_perfil_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colunas_kanban"
    ADD CONSTRAINT "colunas_kanban_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compra_historico"
    ADD CONSTRAINT "compra_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cores"
    ADD CONSTRAINT "cores_codigo_ral_key" UNIQUE ("codigo_ral");



ALTER TABLE ONLY "public"."cores"
    ADD CONSTRAINT "cores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cores_ral"
    ADD CONSTRAINT "cores_ral_codigo_ral_key" UNIQUE ("codigo_ral");



ALTER TABLE ONLY "public"."cores_ral"
    ADD CONSTRAINT "cores_ral_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa"
    ADD CONSTRAINT "empresa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."formas_pagamento"
    ADD CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."fornecedores"
    ADD CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."linhas"
    ADD CONSTRAINT "linhas_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."linhas"
    ADD CONSTRAINT "linhas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lotes_obra"
    ADD CONSTRAINT "lotes_obra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."obra_historico"
    ADD CONSTRAINT "obra_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."obra_status"
    ADD CONSTRAINT "obra_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."papeis"
    ADD CONSTRAINT "papeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."papel_permissoes"
    ADD CONSTRAINT "papel_permissoes_pkey" PRIMARY KEY ("papel_id", "permissao_id");



ALTER TABLE ONLY "public"."pedido_anotacoes"
    ADD CONSTRAINT "pedido_anotacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedido_documentos"
    ADD CONSTRAINT "pedido_documentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_numero_key" UNIQUE ("numero");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissoes"
    ADD CONSTRAINT "permissoes_chave_key" UNIQUE ("chave");



ALTER TABLE ONLY "public"."permissoes"
    ADD CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produto_aliases"
    ADD CONSTRAINT "produto_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produto_arquivos"
    ADD CONSTRAINT "produto_arquivos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produto_cores"
    ADD CONSTRAINT "produto_cores_pkey" PRIMARY KEY ("produto_id", "cor_id");



ALTER TABLE ONLY "public"."produto_fornecedor"
    ADD CONSTRAINT "produto_fornecedor_fornecedor_id_codigo_fornecedor_key" UNIQUE ("fornecedor_id", "codigo_fornecedor");



ALTER TABLE ONLY "public"."produto_fornecedor"
    ADD CONSTRAINT "produto_fornecedor_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produto_fornecedores"
    ADD CONSTRAINT "produto_fornecedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produto_fornecedores"
    ADD CONSTRAINT "produto_fornecedores_produto_id_fornecedor_id_key" UNIQUE ("produto_id", "fornecedor_id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_codigo_mestre_linha_key" UNIQUE ("codigo_mestre", "linha_id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recebimento_itens"
    ADD CONSTRAINT "recebimento_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recebimentos"
    ADD CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."setores"
    ADD CONSTRAINT "setores_nome_key" UNIQUE ("nome");



ALTER TABLE ONLY "public"."setores"
    ADD CONSTRAINT "setores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitacao_itens"
    ADD CONSTRAINT "solicitacao_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_numero_key" UNIQUE ("numero");



ALTER TABLE ONLY "public"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_arquivos"
    ADD CONSTRAINT "tarefa_arquivos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_checklist"
    ADD CONSTRAINT "tarefa_checklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_comentarios"
    ADD CONSTRAINT "tarefa_comentarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_etiquetas"
    ADD CONSTRAINT "tarefa_etiquetas_pkey" PRIMARY KEY ("tarefa_id", "etiqueta_id");



ALTER TABLE ONLY "public"."tarefa_historico"
    ADD CONSTRAINT "tarefa_historico_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_links"
    ADD CONSTRAINT "tarefa_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefa_movimentacoes"
    ADD CONSTRAINT "tarefa_movimentacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipologia_cores"
    ADD CONSTRAINT "tipologia_cores_pkey" PRIMARY KEY ("tipologia_id", "cor_id", "acabamento_id");



ALTER TABLE ONLY "public"."tipologia_perfis"
    ADD CONSTRAINT "tipologia_perfis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipologias_obra"
    ADD CONSTRAINT "tipologias_obra_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipologias"
    ADD CONSTRAINT "tipologias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_linha"
    ADD CONSTRAINT "tipos_linha_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tipos_linha"
    ADD CONSTRAINT "tipos_linha_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_pkey" PRIMARY KEY ("usuario_id", "papel_id");



ALTER TABLE ONLY "public"."usuario_permissoes"
    ADD CONSTRAINT "usuario_permissoes_pkey" PRIMARY KEY ("usuario_id", "permissao_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_auth_id_key" UNIQUE ("auth_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



CREATE INDEX "assinatura_eventos_entidade_idx" ON "public"."assinatura_eventos" USING "btree" ("entidade", "entidade_id");



CREATE UNIQUE INDEX "idx_aliases_unico" ON "public"."produto_aliases" USING "btree" ("lower"(("alias")::"text"));



CREATE INDEX "idx_obra_historico_obra" ON "public"."obra_historico" USING "btree" ("obra_id", "criado_em" DESC);



CREATE INDEX "idx_obras_cliente" ON "public"."obras" USING "btree" ("cliente_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_obras_status" ON "public"."obras" USING "btree" ("status_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_produtos_linha" ON "public"."produtos" USING "btree" ("linha_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_produtos_search" ON "public"."produtos" USING "gin" ("search_vector");



CREATE INDEX "lotes_obra_obra_id_idx" ON "public"."lotes_obra" USING "btree" ("obra_id");



ALTER INDEX "public"."audit_log_pkey" ATTACH PARTITION "public"."audit_log_2026_06_pkey";



ALTER INDEX "public"."audit_log_pkey" ATTACH PARTITION "public"."audit_log_2026_07_pkey";



CREATE OR REPLACE TRIGGER "trg_codigo_obra" BEFORE INSERT ON "public"."obras" FOR EACH ROW EXECUTE FUNCTION "public"."gerar_codigo_obra"();



CREATE OR REPLACE TRIGGER "trg_search_produto" BEFORE INSERT OR UPDATE ON "public"."produtos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_search_produto"();



ALTER TABLE ONLY "public"."assinatura_eventos"
    ADD CONSTRAINT "assinatura_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."assinaturas"
    ADD CONSTRAINT "assinaturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cargo_permissoes"
    ADD CONSTRAINT "cargo_permissoes_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cargo_permissoes"
    ADD CONSTRAINT "cargo_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cargos"
    ADD CONSTRAINT "cargos_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id");



ALTER TABLE ONLY "public"."categorias_perfil"
    ADD CONSTRAINT "categorias_perfil_linha_id_fkey" FOREIGN KEY ("linha_id") REFERENCES "public"."linhas"("id");



ALTER TABLE ONLY "public"."colunas_kanban"
    ADD CONSTRAINT "colunas_kanban_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."colunas_kanban"
    ADD CONSTRAINT "colunas_kanban_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compra_historico"
    ADD CONSTRAINT "compra_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."cores_ral"
    ADD CONSTRAINT "cores_ral_acabamento_id_fkey" FOREIGN KEY ("acabamento_id") REFERENCES "public"."acabamentos"("id");



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."etiquetas"
    ADD CONSTRAINT "etiquetas_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lotes_obra"
    ADD CONSTRAINT "lotes_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."obra_historico"
    ADD CONSTRAINT "obra_historico_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id");



ALTER TABLE ONLY "public"."obra_historico"
    ADD CONSTRAINT "obra_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_responsavel_comercial_id_fkey" FOREIGN KEY ("responsavel_comercial_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_responsavel_tecnico_id_fkey" FOREIGN KEY ("responsavel_tecnico_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."obras"
    ADD CONSTRAINT "obras_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."obra_status"("id");



ALTER TABLE ONLY "public"."papel_permissoes"
    ADD CONSTRAINT "papel_permissoes_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "public"."papeis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."papel_permissoes"
    ADD CONSTRAINT "papel_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pedido_anotacoes"
    ADD CONSTRAINT "pedido_anotacoes_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pedido_anotacoes"
    ADD CONSTRAINT "pedido_anotacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."pedido_documentos"
    ADD CONSTRAINT "pedido_documentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pedido_documentos"
    ADD CONSTRAINT "pedido_documentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores_ral"("id");



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id");



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_compra"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."pedido_itens"
    ADD CONSTRAINT "pedido_itens_solicitacao_item_id_fkey" FOREIGN KEY ("solicitacao_item_id") REFERENCES "public"."solicitacao_itens"("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores_ral"("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "public"."formas_pagamento"("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id");



ALTER TABLE ONLY "public"."pedidos_compra"
    ADD CONSTRAINT "pedidos_compra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id");



ALTER TABLE ONLY "public"."produto_aliases"
    ADD CONSTRAINT "produto_aliases_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id");



ALTER TABLE ONLY "public"."produto_aliases"
    ADD CONSTRAINT "produto_aliases_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produto_arquivos"
    ADD CONSTRAINT "produto_arquivos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produto_cores"
    ADD CONSTRAINT "produto_cores_acabamento_id_fkey" FOREIGN KEY ("acabamento_id") REFERENCES "public"."acabamentos"("id");



ALTER TABLE ONLY "public"."produto_cores"
    ADD CONSTRAINT "produto_cores_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores_ral"("id");



ALTER TABLE ONLY "public"."produto_cores"
    ADD CONSTRAINT "produto_cores_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produto_fornecedor"
    ADD CONSTRAINT "produto_fornecedor_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id");



ALTER TABLE ONLY "public"."produto_fornecedor"
    ADD CONSTRAINT "produto_fornecedor_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produto_fornecedores"
    ADD CONSTRAINT "produto_fornecedores_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id");



ALTER TABLE ONLY "public"."produto_fornecedores"
    ADD CONSTRAINT "produto_fornecedores_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_perfil"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_fornecedor_mestre_id_fkey" FOREIGN KEY ("fornecedor_mestre_id") REFERENCES "public"."fornecedores"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_linha_id_fkey" FOREIGN KEY ("linha_id") REFERENCES "public"."linhas"("id");



ALTER TABLE ONLY "public"."recebimento_itens"
    ADD CONSTRAINT "recebimento_itens_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "public"."pedido_itens"("id");



ALTER TABLE ONLY "public"."recebimento_itens"
    ADD CONSTRAINT "recebimento_itens_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "public"."recebimentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recebimentos"
    ADD CONSTRAINT "recebimentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos_compra"("id");



ALTER TABLE ONLY "public"."recebimentos"
    ADD CONSTRAINT "recebimentos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."solicitacao_itens"
    ADD CONSTRAINT "solicitacao_itens_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores_ral"("id");



ALTER TABLE ONLY "public"."solicitacao_itens"
    ADD CONSTRAINT "solicitacao_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."solicitacao_itens"
    ADD CONSTRAINT "solicitacao_itens_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes_compra"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores_ral"("id");



ALTER TABLE ONLY "public"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id");



ALTER TABLE ONLY "public"."solicitacoes_compra"
    ADD CONSTRAINT "solicitacoes_compra_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefa_arquivos"
    ADD CONSTRAINT "tarefa_arquivos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefa_arquivos"
    ADD CONSTRAINT "tarefa_arquivos_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_checklist"
    ADD CONSTRAINT "tarefa_checklist_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_comentarios"
    ADD CONSTRAINT "tarefa_comentarios_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_comentarios"
    ADD CONSTRAINT "tarefa_comentarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefa_etiquetas"
    ADD CONSTRAINT "tarefa_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiquetas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_etiquetas"
    ADD CONSTRAINT "tarefa_etiquetas_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_historico"
    ADD CONSTRAINT "tarefa_historico_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_historico"
    ADD CONSTRAINT "tarefa_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefa_links"
    ADD CONSTRAINT "tarefa_links_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_movimentacoes"
    ADD CONSTRAINT "tarefa_movimentacoes_coluna_destino_id_fkey" FOREIGN KEY ("coluna_destino_id") REFERENCES "public"."colunas_kanban"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tarefa_movimentacoes"
    ADD CONSTRAINT "tarefa_movimentacoes_coluna_origem_id_fkey" FOREIGN KEY ("coluna_origem_id") REFERENCES "public"."colunas_kanban"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tarefa_movimentacoes"
    ADD CONSTRAINT "tarefa_movimentacoes_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefa_movimentacoes"
    ADD CONSTRAINT "tarefa_movimentacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_coluna_id_fkey" FOREIGN KEY ("coluna_id") REFERENCES "public"."colunas_kanban"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tarefas"
    ADD CONSTRAINT "tarefas_usuario_responsavel_id_fkey" FOREIGN KEY ("usuario_responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tipologia_cores"
    ADD CONSTRAINT "tipologia_cores_acabamento_id_fkey" FOREIGN KEY ("acabamento_id") REFERENCES "public"."acabamentos"("id");



ALTER TABLE ONLY "public"."tipologia_cores"
    ADD CONSTRAINT "tipologia_cores_cor_id_fkey" FOREIGN KEY ("cor_id") REFERENCES "public"."cores"("id");



ALTER TABLE ONLY "public"."tipologia_cores"
    ADD CONSTRAINT "tipologia_cores_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "public"."tipologias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tipologia_perfis"
    ADD CONSTRAINT "tipologia_perfis_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."tipologia_perfis"
    ADD CONSTRAINT "tipologia_perfis_tipologia_id_fkey" FOREIGN KEY ("tipologia_id") REFERENCES "public"."tipologias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tipologias"
    ADD CONSTRAINT "tipologias_linha_id_fkey" FOREIGN KEY ("linha_id") REFERENCES "public"."linhas"("id");



ALTER TABLE ONLY "public"."tipologias_obra"
    ADD CONSTRAINT "tipologias_obra_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes_obra"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tipologias_obra"
    ADD CONSTRAINT "tipologias_obra_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_papel_id_fkey" FOREIGN KEY ("papel_id") REFERENCES "public"."papeis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_papeis"
    ADD CONSTRAINT "usuario_papeis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_permissoes"
    ADD CONSTRAINT "usuario_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "public"."permissoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuario_permissoes"
    ADD CONSTRAINT "usuario_permissoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "public"."setores"("id");



ALTER TABLE "public"."acabamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_all_arquivos" ON "public"."tarefa_arquivos" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_checklist" ON "public"."tarefa_checklist" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_colunas" ON "public"."colunas_kanban" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_comentarios" ON "public"."tarefa_comentarios" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_etiquetas" ON "public"."etiquetas" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_historico" ON "public"."tarefa_historico" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_links" ON "public"."tarefa_links" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_movimentacoes" ON "public"."tarefa_movimentacoes" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_tarefas" ON "public"."tarefas" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_te" ON "public"."tarefa_etiquetas" USING (true) WITH CHECK (true);



ALTER TABLE "public"."assinatura_eventos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assinaturas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log_2026_06" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log_2026_07" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "autenticado_le_empresa" ON "public"."empresa" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cargo_permissoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cargos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_perfil" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."colunas_kanban" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compra_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cores_ral" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."empresa" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."etiquetas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."formas_pagamento" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fornecedores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."linhas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lotes_obra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."obra_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."obra_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."obras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."papeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."papel_permissoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedido_anotacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedido_documentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedido_itens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedidos_compra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produto_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produto_arquivos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produto_cores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produto_fornecedor" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produto_fornecedores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recebimento_itens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recebimentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."setores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitacao_itens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitacoes_compra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_arquivos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_checklist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_comentarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_etiquetas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_historico" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefa_movimentacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tarefas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipologia_cores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipologia_perfis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipologias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipologias_obra" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tipos_linha" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuario_papeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuario_permissoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."atualizar_search_produto"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_search_produto"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_search_produto"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gerar_codigo_obra"() TO "anon";
GRANT ALL ON FUNCTION "public"."gerar_codigo_obra"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."gerar_codigo_obra"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."acabamentos" TO "anon";
GRANT ALL ON TABLE "public"."acabamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."acabamentos" TO "service_role";



GRANT ALL ON TABLE "public"."assinatura_eventos" TO "anon";
GRANT ALL ON TABLE "public"."assinatura_eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."assinatura_eventos" TO "service_role";



GRANT ALL ON TABLE "public"."assinaturas" TO "anon";
GRANT ALL ON TABLE "public"."assinaturas" TO "authenticated";
GRANT ALL ON TABLE "public"."assinaturas" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log_2026_06" TO "anon";
GRANT ALL ON TABLE "public"."audit_log_2026_06" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log_2026_06" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log_2026_07" TO "anon";
GRANT ALL ON TABLE "public"."audit_log_2026_07" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log_2026_07" TO "service_role";



GRANT ALL ON TABLE "public"."cargo_permissoes" TO "anon";
GRANT ALL ON TABLE "public"."cargo_permissoes" TO "authenticated";
GRANT ALL ON TABLE "public"."cargo_permissoes" TO "service_role";



GRANT ALL ON TABLE "public"."cargos" TO "anon";
GRANT ALL ON TABLE "public"."cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."cargos" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_perfil" TO "anon";
GRANT ALL ON TABLE "public"."categorias_perfil" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_perfil" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."colunas_kanban" TO "anon";
GRANT ALL ON TABLE "public"."colunas_kanban" TO "authenticated";
GRANT ALL ON TABLE "public"."colunas_kanban" TO "service_role";



GRANT ALL ON TABLE "public"."compra_historico" TO "anon";
GRANT ALL ON TABLE "public"."compra_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."compra_historico" TO "service_role";



GRANT ALL ON TABLE "public"."cores" TO "anon";
GRANT ALL ON TABLE "public"."cores" TO "authenticated";
GRANT ALL ON TABLE "public"."cores" TO "service_role";



GRANT ALL ON TABLE "public"."cores_ral" TO "anon";
GRANT ALL ON TABLE "public"."cores_ral" TO "authenticated";
GRANT ALL ON TABLE "public"."cores_ral" TO "service_role";



GRANT ALL ON TABLE "public"."empresa" TO "anon";
GRANT ALL ON TABLE "public"."empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa" TO "service_role";



GRANT ALL ON TABLE "public"."etiquetas" TO "anon";
GRANT ALL ON TABLE "public"."etiquetas" TO "authenticated";
GRANT ALL ON TABLE "public"."etiquetas" TO "service_role";



GRANT ALL ON TABLE "public"."formas_pagamento" TO "anon";
GRANT ALL ON TABLE "public"."formas_pagamento" TO "authenticated";
GRANT ALL ON TABLE "public"."formas_pagamento" TO "service_role";



GRANT ALL ON TABLE "public"."fornecedores" TO "anon";
GRANT ALL ON TABLE "public"."fornecedores" TO "authenticated";
GRANT ALL ON TABLE "public"."fornecedores" TO "service_role";



GRANT ALL ON TABLE "public"."linhas" TO "anon";
GRANT ALL ON TABLE "public"."linhas" TO "authenticated";
GRANT ALL ON TABLE "public"."linhas" TO "service_role";



GRANT ALL ON TABLE "public"."lotes_obra" TO "anon";
GRANT ALL ON TABLE "public"."lotes_obra" TO "authenticated";
GRANT ALL ON TABLE "public"."lotes_obra" TO "service_role";



GRANT ALL ON SEQUENCE "public"."obra_codigo_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."obra_codigo_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."obra_codigo_seq" TO "service_role";



GRANT ALL ON TABLE "public"."obra_historico" TO "anon";
GRANT ALL ON TABLE "public"."obra_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."obra_historico" TO "service_role";



GRANT ALL ON TABLE "public"."obra_status" TO "anon";
GRANT ALL ON TABLE "public"."obra_status" TO "authenticated";
GRANT ALL ON TABLE "public"."obra_status" TO "service_role";



GRANT ALL ON SEQUENCE "public"."obras_numero_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."obras_numero_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."obras_numero_seq" TO "service_role";



GRANT ALL ON TABLE "public"."obras" TO "anon";
GRANT ALL ON TABLE "public"."obras" TO "authenticated";
GRANT ALL ON TABLE "public"."obras" TO "service_role";



GRANT ALL ON TABLE "public"."papeis" TO "anon";
GRANT ALL ON TABLE "public"."papeis" TO "authenticated";
GRANT ALL ON TABLE "public"."papeis" TO "service_role";



GRANT ALL ON TABLE "public"."papel_permissoes" TO "anon";
GRANT ALL ON TABLE "public"."papel_permissoes" TO "authenticated";
GRANT ALL ON TABLE "public"."papel_permissoes" TO "service_role";



GRANT ALL ON TABLE "public"."pedido_anotacoes" TO "anon";
GRANT ALL ON TABLE "public"."pedido_anotacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido_anotacoes" TO "service_role";



GRANT ALL ON TABLE "public"."pedido_documentos" TO "anon";
GRANT ALL ON TABLE "public"."pedido_documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido_documentos" TO "service_role";



GRANT ALL ON TABLE "public"."pedido_itens" TO "anon";
GRANT ALL ON TABLE "public"."pedido_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."pedido_itens" TO "service_role";



GRANT ALL ON TABLE "public"."pedidos_compra" TO "anon";
GRANT ALL ON TABLE "public"."pedidos_compra" TO "authenticated";
GRANT ALL ON TABLE "public"."pedidos_compra" TO "service_role";



GRANT ALL ON TABLE "public"."permissoes" TO "anon";
GRANT ALL ON TABLE "public"."permissoes" TO "authenticated";
GRANT ALL ON TABLE "public"."permissoes" TO "service_role";



GRANT ALL ON TABLE "public"."produto_aliases" TO "anon";
GRANT ALL ON TABLE "public"."produto_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."produto_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."produto_arquivos" TO "anon";
GRANT ALL ON TABLE "public"."produto_arquivos" TO "authenticated";
GRANT ALL ON TABLE "public"."produto_arquivos" TO "service_role";



GRANT ALL ON TABLE "public"."produto_cores" TO "anon";
GRANT ALL ON TABLE "public"."produto_cores" TO "authenticated";
GRANT ALL ON TABLE "public"."produto_cores" TO "service_role";



GRANT ALL ON TABLE "public"."produto_fornecedor" TO "anon";
GRANT ALL ON TABLE "public"."produto_fornecedor" TO "authenticated";
GRANT ALL ON TABLE "public"."produto_fornecedor" TO "service_role";



GRANT ALL ON TABLE "public"."produto_fornecedores" TO "anon";
GRANT ALL ON TABLE "public"."produto_fornecedores" TO "authenticated";
GRANT ALL ON TABLE "public"."produto_fornecedores" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."recebimento_itens" TO "anon";
GRANT ALL ON TABLE "public"."recebimento_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."recebimento_itens" TO "service_role";



GRANT ALL ON TABLE "public"."recebimentos" TO "anon";
GRANT ALL ON TABLE "public"."recebimentos" TO "authenticated";
GRANT ALL ON TABLE "public"."recebimentos" TO "service_role";



GRANT ALL ON TABLE "public"."setores" TO "anon";
GRANT ALL ON TABLE "public"."setores" TO "authenticated";
GRANT ALL ON TABLE "public"."setores" TO "service_role";



GRANT ALL ON TABLE "public"."solicitacao_itens" TO "anon";
GRANT ALL ON TABLE "public"."solicitacao_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitacao_itens" TO "service_role";



GRANT ALL ON TABLE "public"."solicitacoes_compra" TO "anon";
GRANT ALL ON TABLE "public"."solicitacoes_compra" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitacoes_compra" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_arquivos" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_arquivos" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_arquivos" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_checklist" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_checklist" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_checklist" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_comentarios" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_comentarios" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_comentarios" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_etiquetas" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_etiquetas" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_etiquetas" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_historico" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_historico" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_historico" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_links" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_links" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_links" TO "service_role";



GRANT ALL ON TABLE "public"."tarefa_movimentacoes" TO "anon";
GRANT ALL ON TABLE "public"."tarefa_movimentacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefa_movimentacoes" TO "service_role";



GRANT ALL ON TABLE "public"."tarefas" TO "anon";
GRANT ALL ON TABLE "public"."tarefas" TO "authenticated";
GRANT ALL ON TABLE "public"."tarefas" TO "service_role";



GRANT ALL ON TABLE "public"."tipologia_cores" TO "anon";
GRANT ALL ON TABLE "public"."tipologia_cores" TO "authenticated";
GRANT ALL ON TABLE "public"."tipologia_cores" TO "service_role";



GRANT ALL ON TABLE "public"."tipologia_perfis" TO "anon";
GRANT ALL ON TABLE "public"."tipologia_perfis" TO "authenticated";
GRANT ALL ON TABLE "public"."tipologia_perfis" TO "service_role";



GRANT ALL ON TABLE "public"."tipologias" TO "anon";
GRANT ALL ON TABLE "public"."tipologias" TO "authenticated";
GRANT ALL ON TABLE "public"."tipologias" TO "service_role";



GRANT ALL ON TABLE "public"."tipologias_obra" TO "anon";
GRANT ALL ON TABLE "public"."tipologias_obra" TO "authenticated";
GRANT ALL ON TABLE "public"."tipologias_obra" TO "service_role";



GRANT ALL ON TABLE "public"."tipos_linha" TO "anon";
GRANT ALL ON TABLE "public"."tipos_linha" TO "authenticated";
GRANT ALL ON TABLE "public"."tipos_linha" TO "service_role";



GRANT ALL ON TABLE "public"."usuario_papeis" TO "anon";
GRANT ALL ON TABLE "public"."usuario_papeis" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario_papeis" TO "service_role";



GRANT ALL ON TABLE "public"."usuario_permissoes" TO "anon";
GRANT ALL ON TABLE "public"."usuario_permissoes" TO "authenticated";
GRANT ALL ON TABLE "public"."usuario_permissoes" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."vw_pedido_itens" TO "anon";
GRANT ALL ON TABLE "public"."vw_pedido_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_pedido_itens" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































