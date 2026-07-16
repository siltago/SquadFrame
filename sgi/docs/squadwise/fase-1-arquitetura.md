# SquadWise — Arquitetura da Fase 1

> Documento de arquitetura, não de implementação. Nenhuma migration foi criada a partir deste documento — ele existe pra validar decisões antes de escrever a primeira linha de SQL. Grounded no schema real de produção (lido em `supabase/migrations/*.sql` em 2026-07-15), não em suposições.

**Relação com a "Visão Geral do SquadWise"**: o usuário forneceu, em paralelo, um documento de visão de longo prazo cobrindo o SquadWise completo — arquitetura em camadas com Cache Layer, 14+ domínios (`organizations, identity, access, registry, configuration, catalog, works, suppliers, customers, pipeline-models, package-types, integrations, capabilities, audit, events, shared`), Configuration Center, Registry, Catálogo Mestre, Modelo de Obras, e uma estratégia de migração em 4 fases por domínio (Implantação → Compatibilidade → Transferência de Responsabilidade → Desativação). **Confirmado com o usuário**: esse documento é a visão arquitetural final (o norte de longo prazo), não o escopo pra implementar agora. Este documento de Fase 1 continua deliberadamente enxuto — só `organizations`/`identity`/`access`/`audit` — e os demais domínios entram em fases futuras, um de cada vez. Onde a Visão Geral trouxe um refinamento válido pra decisões já tomadas aqui (terminologia de migração, ordem recomendada de domínios futuros), esse refinamento foi incorporado abaixo; onde ela propôs algo fora do escopo da Fase 1 (Cache Layer, Equipe como nível organizacional, Capabilities como conceito distinto de módulo), fica registrado como decisão futura, não implementado agora — **confirmado com o usuário**: sem cache na Fase 1.

---

## 1. Diagnóstico

### O que existe hoje, de fato (não o que parece existir)

Levantei o schema real antes de propor qualquer coisa nova. Três fatos mudam a proposta em relação a um "greenfield":

**1.1 — RLS está ligado, mas não faz nada.** `usuarios`, `obras`, `fornecedores`, `permissoes`, `cargo_permissoes`, `usuario_permissoes`, `papel_permissoes` têm `ENABLE ROW LEVEL SECURITY`, mas **nenhuma tem uma única `CREATE POLICY`**. Nesse estado, RLS bloqueia 100% do acesso pras roles `anon`/`authenticated` — só `service_role` passa. Ou seja: RLS hoje não é a fronteira de segurança de nada, é decorativo (provavelmente ligado só pra silenciar o linter do Supabase, que reclama de tabela pública sem RLS). A fronteira real de autorização hoje é **100% código de aplicação**: `verificarPermissao()` nas Server Actions (que usam `createAdminClient()`, service role, que ignora RLS) e, dentro de algumas RPCs `SECURITY DEFINER` (`criar_pedido`, `editar_pedido`), uma chamada a `fn_exigir_permissao(usuario_id, chave)`.

**1.2 — Já existe um `check_permission`, só que subutilizado.** As funções `fn_auth_user_db_id()` (mapeia `auth.uid()` → `usuarios.id`), `fn_tem_permissao(usuario_id, chave)`, `fn_exigir_permissao(usuario_id, chave)` (lança exceção se não tiver) e `fn_auth_is_admin()` já existem (`supabase/migrations/20260629000001_rpc_security.sql`). É exatamente o mecanismo pedido na seção 13 do prompt — só que hoje só é chamado de dentro de duas RPCs específicas, nunca como `USING`/`WITH CHECK` de uma policy. O Wise vai **reaproveitar essas funções**, não recriar.

**1.3 — Existe uma exceção real onde RLS importa, e ela está desprotegida.** `notificacoes` é lida **direto do browser** (client com chave `anon`, não service role) via Supabase Realtime — `NotificacoesBadge` assina `postgres_changes` filtrado por `usuario_id=eq.X`. Só que `notificacoes` não tem RLS habilitado. O filtro é uma conveniência de query, não uma fronteira de segurança — sem RLS, um client que se inscrevesse sem o filtro tecnicamente enxergaria o `payload.new` de notificações de qualquer usuário. Não é escopo deste documento corrigir isso (não é tabela do Wise), mas é o precedente que **decide** a estratégia de RLS abaixo: qualquer tabela do Wise exposta a Realtime ou a leitura direta do client precisa de RLS de verdade — o padrão "RLS ligado e vazio" não é aceitável pra elas.

**1.4 — Multiempresa não existe hoje, apesar da intenção.** `usuarios.empresa` é uma coluna `text` solta (nome livre, sem FK). Não existe tabela `empresas`, não existe `empresa_id` em nenhuma tabela core. O sistema é mono-tenant na prática. "Multiempresa desde o início" pro Wise é, portanto, uma decisão **nova**, não uma continuação — o Frame não vai ganhar `empresa_id` nesta fase (só o Wise nasce multiempresa; o Frame se junta na Fase 5, migração).

### Riscos identificados

- **Duplicação de fonte de verdade durante a transição** é o maior risco prático. Toda tabela migrada (fornecedor, obra, catálogo) vai ter uma janela onde existe cadastro no Frame E no Wise. A regra que evita inconsistência: **em cada bloco da Fase 5, existe exatamente uma direção de escrita ativa por vez** — nunca os dois sistemas aceitando escrita simultânea pro mesmo conceito. Detalhado na seção 8.
- **Cargo ≠ papel de autorização, e hoje eles são a mesma coisa.** `cargos` hoje carrega tanto organograma (nome, setor, cor, ordem — visual) quanto autorização (`cargo_permissoes`, 1 cargo = 1 conjunto fixo de permissões). Isso impede "múltiplos papéis por usuário" (pedido explícito na seção 13). A Fase 1 separa os dois conceitos — detalhado na seção 4.
- **Nomenclatura de permissão inconsistente se eu não decidir agora.** Chaves atuais (`compras.pedido.aprovar`, `catalogo.editar`) não têm prefixo de módulo. **Decisão confirmada com o usuário**: chaves antigas ficam como estão (pertencem implicitamente ao Frame); só chaves novas (Wise, Board, Flow, Stock, Measure) usam prefixo de módulo (`wise.*`, `board.*`, etc). Renomear as ~30 chaves existentes fica fora de escopo — risco desnecessário pra um ganho cosmético.
- **RLS real só no Wise é uma bifurcação de modelo de segurança dentro do mesmo banco.** É uma decisão consciente (confirmada com o usuário), não um descuido — precisa estar documentada pra quem mexer no código depois não achar que é inconsistência.

---

## 2. Limites do domínio

### Pertence ao Wise (Fase 1)

Organização (empresas, unidades), identidade corporativa (usuários, setores, cargos), autorização (papéis, permissões, papel↔permissão, usuário↔papel), registro de módulos (módulos, módulos habilitados por empresa), auditoria.

**Fora da Fase 1, mas already-scoped pro Wise em fases futuras** (não desenhado agora, só citado pra não confundir escopo, na ordem recomendada pela Visão Geral): unidades organizacionais adicionais (departamento, equipe — a Fase 1 já tem empresa/unidade/setor/cargo; "equipe" como nível abaixo de setor não é modelado agora), obras (cadastro mestre), fornecedores, clientes, catálogo mestre (produtos, perfis, componentes, vidros, chapas, serviços, fabricantes), registry (tipos/categorias/tags/unidades de medida — dado de referência compartilhado), configuration center (configuração versionada por escopo, com cache — é o primeiro lugar do Wise onde cache se justifica, não a Fase 1), modelos de pipeline/pacote, integrations, capabilities (entitlement de feature por empresa — related a `wise_empresa_modulos`, mas mais granular; se `wise_empresa_modulos` se mostrar insuficiente, capabilities é a evolução natural, não uma tabela nova do zero).

### Não pertence ao Wise, nunca

Pedidos, solicitações, recebimentos, financeiro, carteira (Frame). Cards, checklists preenchidos, comentários (Board). Apontamentos, pacotes reais (Flow). Saldo, movimentações (Stock). Medições, fotos (Measure). Regra do prompt original, mantida ao pé da letra: **Wise = definição, módulo operacional = execução.**

### Como um módulo consome o Wise

Nunca consulta a tabela direto. Sempre via `modules/wise/*/services`, chamado a partir da Server Action do módulo consumidor:

```
Frame Server Action
  → import { verificarPermissaoWise } from "@/modules/wise/access/services"
  → import { buscarUsuarioPorAuthId } from "@/modules/wise/identity/services"
```

Nos hot-paths que já são RPC Postgres (`criar_pedido`, `editar_pedido`), a chamada continua sendo `fn_exigir_permissao(...)` — essa função passa a "pertencer" conceitualmente ao domínio de acesso do Wise, mas fisicamente continua sendo uma função SQL comum (não faz sentido movê-la de schema por uma questão de propriedade conceitual).

---

## 3. Arquitetura proposta

Camadas, sem exceção: **UI → Server Action → Service → Repository → Supabase.** UI nunca importa Supabase client. Repository nunca decide regra — só query.

```
modules/wise/
├── organizations/
│   ├── repository.ts     # wise_empresas, wise_unidades — CRUD cru
│   ├── service.ts        # regra: 1ª empresa é seed; ativar/desativar; validações
│   ├── actions.ts         "use server" — fino, chama service
│   ├── schema.ts          Zod
│   └── types.ts
├── identity/
│   ├── repository.ts     # wise_usuarios, wise_setores, wise_cargos
│   ├── service.ts        # convite, ativação, bloqueio, troca de setor/cargo
│   ├── actions.ts
│   ├── schema.ts
│   └── types.ts
├── access/
│   ├── repository.ts     # wise_papeis, wise_permissoes, wise_papel_permissoes, wise_usuario_papeis
│   ├── service.ts        # atribuir papel, revogar, checar permissão (wrapper de fn_tem_permissao)
│   ├── actions.ts
│   ├── schema.ts
│   └── types.ts
├── modules-registry/
│   ├── repository.ts     # wise_modulos, wise_empresa_modulos
│   ├── service.ts
│   ├── actions.ts
│   └── types.ts
├── audit/
│   ├── repository.ts     # wise_auditoria (só insert + leitura paginada)
│   ├── service.ts        # registrarAuditoria(...) — chamado pelos outros services
│   └── types.ts
└── shared/
    ├── supabase-wise-client.ts   # se necessário um client dedicado (ver seção 6)
    └── events.ts                  # publicação dos eventos wise.* no event bus existente
```

**Por que essa granularidade e não `repositories/`, `services/`, `actions/` únicos na raiz** (como o esqueleto do prompt original sugeria): com 5 agregados desde o dia 1, um `repository.ts` único vira um arquivo de centenas de linhas rapidamente. O próprio Frame já resolveu isso na prática (`actions/compras/pedidos.ts`, `actions/compras/fornecedores.ts`, `actions/catalogo/actions.ts` — um arquivo por sub-domínio). A estrutura acima é a mesma ideia aplicada de forma consistente desde o início, em vez de crescer organicamente e precisar ser quebrada depois.

**Contrato duro do Service** (o que garante que "a UI não acessa banco diretamente" não vire só um comentário):
- Único lugar que valida (Zod).
- Único lugar que autoriza (`fn_tem_permissao` via RPC, ou checagem em código quando não fizer sentido pagar round-trip extra).
- Único lugar que abre transação quando a operação toca mais de uma tabela (via RPC `SECURITY DEFINER`, mesmo padrão de `criar_pedido`).
- Único lugar que publica evento (`wise.*`).
- Único lugar que grava auditoria quando a ação é sensível (ver seção 4.12).

Repository é burro por design: um `select`/`insert`/`update` por método, sem `if` de regra de negócio dentro dele. Isso não é purismo — é o que permite trocar a fonte de dados de uma entidade (ex: quando o Frame migrar pra consumir `wise_obras` em vez da `obras` local, na Fase 5) trocando só o repository, sem tocar em service nem action.

---

## 4. Modelo de dados — Fase 1

**Convenção de nomenclatura**: prefixo `wise_` em toda tabela nova, nomes e colunas em português — consistente com 100% do schema existente (`pedidos_compra`, `usuarios`, `obras`). Mantém tudo no schema `public` (sem schema Postgres separado): múltiplos schemas exigiriam gerenciar `search_path` e `GRANT`s extras em cada função/RPC do sistema inteiro pra um ganho puramente organizacional — complexidade prematura pro tamanho atual do projeto. O prefixo já resolve "de onde é essa tabela" ao ler o nome.

**Cargo × Papel — por que os dois existem.** Hoje `cargos` faz dois trabalhos ao mesmo tempo: organograma (nome, setor, cor, ordem — o que aparece na tela de Cargos) e autorização (`cargo_permissoes` — 1 cargo tem exatamente 1 conjunto fixo de permissões). Isso impede "múltiplos papéis por usuário", pedido explícito no prompt. A Fase 1 separa: **`wise_cargos`** continua sendo organograma (onde a pessoa está na estrutura, pra exibição e relatório); **`wise_papeis`** é autorização pura (RBAC) — um usuário tem 1 cargo, mas pode ter N papéis. Um "Comprador Sênior" pode ter os papéis `Comprador` + `Aprovador de Compras` + `Gestor de Obras (só leitura)` ao mesmo tempo, sem precisar de um cargo específico pra cada combinação.

---

### 4.1 `wise_empresas`

Finalidade: tenant raiz. Toda entidade multiempresa do Wise referencia esta tabela.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `nome` | `varchar(255)` NOT NULL | Razão social ou nome fantasia |
| `slug` | `varchar(60)` NOT NULL | Usado em URL/subdomínio futuro |
| `cnpj` | `varchar(18)` | Nullable — nem toda empresa seed precisa ter CNPJ preenchido no dia 1 |
| `ativo` | `boolean` NOT NULL default `true` | |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |
| `atualizado_em` | `timestamptz` NOT NULL default `now()` | Trigger `set_atualizado_em()` (já existe no banco, reaproveitar) |

- **Unique**: `slug`.
- **Check**: `slug ~ '^[a-z0-9-]+$'` (evita slug com espaço/maiúscula por erro de cadastro).
- **Índices**: implícito via PK e unique de `slug`.
- **Exclusão**: nunca hard delete. `ativo = false` — uma empresa desativada não pode ser reativada por engano sem log (auditoria cobre isso).
- **Escopo multiempresa**: é o próprio root, não tem `empresa_id`.

### 4.2 `wise_unidades`

Finalidade: filial/unidade física de uma empresa (obrigatório pro modelo de escopo por unidade pedido na seção 13).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `nome` | `varchar(255)` NOT NULL | |
| `codigo` | `varchar(20)` NOT NULL | Ex: "SP-01" |
| `ativo` | `boolean` NOT NULL default `true` | |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Unique**: `(empresa_id, codigo)`.
- **Índices**: `(empresa_id)`.
- **Exclusão**: soft (`ativo`).
- **Escopo**: `empresa_id`.

### 4.3 `wise_setores`

Finalidade: substitui `setores` do Frame a longo prazo (Fase 5); nasce já multiempresa.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `nome` | `varchar(100)` NOT NULL | |
| `cor` | `varchar(7)` default `'#475569'` | Mantém o padrão visual atual |
| `ordem` | `integer` default `0` | |
| `ativo` | `boolean` NOT NULL default `true` | |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Unique**: `(empresa_id, nome)`.
- **Índices**: `(empresa_id, ordem)` — a listagem de setores já é sempre ordenada.
- **Exclusão**: soft.
- **Escopo**: `empresa_id`.

### 4.4 `wise_cargos`

Finalidade: organograma. **Não carrega permissão** (ver justificativa acima).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `setor_id` | `uuid` FK → `wise_setores.id` | Nullable — cargo pode não estar preso a um setor |
| `nome` | `varchar(100)` NOT NULL | |
| `nivel` | `integer` default `1` | Mantém semântica atual (hierarquia visual) |
| `cor` | `varchar(7)` default `'#475569'` | |
| `ordem` | `integer` default `0` | |
| `ativo` | `boolean` NOT NULL default `true` | |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Unique**: `(empresa_id, nome)`.
- **Índices**: `(empresa_id, setor_id)`.
- **Exclusão**: soft.
- **Escopo**: `empresa_id`.
- **Nota**: `is_admin` do `cargos` atual **não é migrado como coluna** — vira o papel especial `Administrador` (ver 4.6), porque autorização agora vive em papel, não em cargo. Ver seção 8 pra estratégia de migração desse campo especificamente.

### 4.5 `wise_usuarios`

Finalidade: identidade corporativa. É o equivalente Wise de `usuarios`, mas **nasce sincronizada, não substitui `usuarios` na Fase 1** (ver seção 8 — Bloco 1.2).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `auth_id` | `uuid` NOT NULL FK → `auth.users.id` (via `references auth.users`) | |
| `unidade_id` | `uuid` FK → `wise_unidades.id` | Nullable |
| `setor_id` | `uuid` FK → `wise_setores.id` | Nullable |
| `cargo_id` | `uuid` FK → `wise_cargos.id` | Nullable |
| `nome` | `varchar(255)` NOT NULL | |
| `email` | `varchar(255)` NOT NULL | |
| `telefone` | `varchar(30)` | |
| `foto_url` | `varchar(500)` | |
| `status` | `text` NOT NULL default `'ativo'` | Ver check abaixo — substitui o booleano `ativo` por um enum, porque a seção 12 do prompt pede "usuário bloqueado" como estado distinto de "inativo" |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |
| `ultimo_acesso` | `timestamptz` | |

- **Check**: `status IN ('ativo', 'inativo', 'bloqueado', 'convidado')`.
- **Unique**: `(empresa_id, email)` — mesmo e-mail pode existir em empresas diferentes (multiempresa real); `auth_id` é globalmente único por natureza do Supabase Auth, então **unique separado em `auth_id`** cobre o caso de um mesmo login pertencer a só uma empresa por enquanto (decisão da Fase 1 — ver seção 10, "usuário multi-empresa" fica em aberto).
- **Índices**: `(empresa_id, status)`, `(auth_id)`.
- **Exclusão**: nunca hard delete (auditoria e histórico de outros módulos referenciam `usuario_id`). `status = 'bloqueado'`/`'inativo'`.
- **Escopo**: `empresa_id`.

### 4.6 `wise_papeis`

Finalidade: papel de autorização (RBAC). Substitui a ligação direta cargo→permissão.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `nome` | `varchar(100)` NOT NULL | Ex: "Comprador", "Aprovador de Compras", "Administrador" |
| `descricao` | `text` | |
| `is_admin` | `boolean` NOT NULL default `false` | Papel com `is_admin = true` tem TODAS as permissões implicitamente (mesma semântica do `cargos.is_admin` de hoje) |
| `ativo` | `boolean` NOT NULL default `true` | |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Unique**: `(empresa_id, nome)`.
- **Índices**: `(empresa_id)`.
- **Exclusão**: soft — revogar um papel em uso precisa continuar auditável.
- **Escopo**: `empresa_id`.

### 4.7 `wise_permissoes`

Finalidade: catálogo de chaves de permissão. Substitui `permissoes` a longo prazo, mas nasce recebendo TANTO as chaves antigas (sem prefixo, replicadas por evento — ver seção 8) QUANTO as novas chaves `wise.*`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `chave` | `varchar(150)` NOT NULL | Ex: `wise.usuarios.editar`, `compras.pedido.aprovar` (legado, sem prefixo) |
| `nome` | `varchar(255)` NOT NULL | Label pra UI |
| `modulo` | `varchar(30)` NOT NULL | `wise`/`frame`/`board`/`flow`/`stock`/`measure` — **coluna derivada, não fonte de verdade**: pra chave nova, é o primeiro segmento; pra chave legada, é sempre `'frame'` fixo (não existe segmento explícito) |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Unique**: `chave` (global, não por empresa — a chave de permissão é a mesma definição de código em todo tenant; o que varia por empresa é qual papel tem qual permissão, não a permissão em si).
- **Índices**: `(modulo)`.
- **Exclusão**: nunca — permissão órfã quebra `wise_papel_permissoes`. Se uma feature for descontinuada, a chave fica no catálogo sem uso.
- **Escopo**: **não é multiempresa** — é catálogo global de código (mesma natureza de `permissoes` hoje, que também não tem `empresa_id`).

### 4.8 `wise_papel_permissoes`

Finalidade: N:N papel↔permissão.

| Campo | Tipo | Notas |
|---|---|---|
| `papel_id` | `uuid` NOT NULL FK → `wise_papeis.id` ON DELETE CASCADE | |
| `permissao_id` | `uuid` NOT NULL FK → `wise_permissoes.id` ON DELETE CASCADE | |

- **PK composta**: `(papel_id, permissao_id)`.
- **Índices**: PK já cobre `papel_id`; índice adicional em `(permissao_id)` pra consulta reversa ("quem tem essa permissão").
- **Exclusão**: hard delete (é uma tabela de associação pura, sem significado próprio fora do par).
- **Escopo**: implícito via `papel_id` → `wise_papeis.empresa_id`.

### 4.9 `wise_usuario_papeis`

Finalidade: N:N usuário↔papel — é isso que habilita "múltiplos papéis por usuário".

| Campo | Tipo | Notas |
|---|---|---|
| `usuario_id` | `uuid` NOT NULL FK → `wise_usuarios.id` ON DELETE CASCADE | |
| `papel_id` | `uuid` NOT NULL FK → `wise_papeis.id` ON DELETE CASCADE | |
| `atribuido_em` | `timestamptz` NOT NULL default `now()` | |
| `atribuido_por` | `uuid` FK → `wise_usuarios.id` | Quem concedeu — auditoria light embutida na própria tabela, além do log em `wise_auditoria` |

- **PK composta**: `(usuario_id, papel_id)`.
- **Índices**: adicional em `(papel_id)`.
- **Exclusão**: hard delete (revogar papel = remover a linha; o histórico de "teve esse papel entre X e Y" vive em `wise_auditoria`, não aqui).
- **Escopo**: implícito.

**Permissão direta (exceção)**: a seção 13 pede "permissões diretas, se necessário". Em vez de uma tabela nova (`wise_usuario_permissoes`) desde o dia 1, a recomendação é **não criar agora** — é fácil adicionar depois (mesma forma de `wise_usuario_papeis` trocando `papel_id` por `permissao_id`) e, sem um caso de uso concreto hoje, é a abstração genérica que o prompt pede pra evitar ("não criar estrutura excessivamente genérica sem necessidade"). Fica registrado como decisão em aberto na seção 10.

### 4.10 `wise_modulos`

Finalidade: registro estático dos módulos existentes do SquadSystem (não é "tabela de configuração dinâmica" — é praticamente um enum com metadata, popular via seed/migration, não via UI).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `chave` | `varchar(30)` NOT NULL | `wise`, `frame`, `board`, `flow`, `stock`, `measure` |
| `nome` | `varchar(100)` NOT NULL | Label |
| `ativo` | `boolean` NOT NULL default `true` | Módulo existe no código mas pode estar desligado globalmente (ex: em desenvolvimento) |

- **Unique**: `chave`.
- **Exclusão**: nunca.
- **Escopo**: não é multiempresa (é o catálogo de módulos que o *código* sabe servir).

### 4.11 `wise_empresa_modulos`

Finalidade: quais módulos cada empresa contratou/tem habilitado — a base do modelo SaaS futuro.

| Campo | Tipo | Notas |
|---|---|---|
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` ON DELETE CASCADE | |
| `modulo_id` | `uuid` NOT NULL FK → `wise_modulos.id` ON DELETE CASCADE | |
| `habilitado_em` | `timestamptz` NOT NULL default `now()` | |

- **PK composta**: `(empresa_id, modulo_id)`.
- **Exclusão**: hard delete = desabilitar módulo pra empresa.
- **Escopo**: `empresa_id`.
- **Seed da Fase 1**: a empresa atual recebe todos os módulos hoje ativos (`frame`, `board`) habilitados; `flow`/`stock`/`measure`/`wise` ficam registrados em `wise_modulos` mas sem necessariamente estarem em `wise_empresa_modulos` até o módulo de fato existir em código.

### 4.12 `wise_auditoria`

Finalidade: trilha de auditoria pras ações sensíveis listadas na seção 17 do prompt.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `empresa_id` | `uuid` NOT NULL FK → `wise_empresas.id` | |
| `usuario_id` | `uuid` FK → `wise_usuarios.id` | Nullable — ação de sistema (cron, migração) não tem usuário |
| `entidade` | `text` NOT NULL | `'usuario'`, `'papel'`, `'permissao'`, `'empresa_modulo'`, etc |
| `entidade_id` | `uuid` NOT NULL | |
| `acao` | `text` NOT NULL | `'CRIADO'`, `'ATUALIZADO'`, `'BLOQUEADO'`, `'PAPEL_ATRIBUIDO'`, `'PAPEL_REVOGADO'`, etc |
| `dados_antes` | `jsonb` | Snapshot antes — aqui `jsonb` é apropriado (é log, não é campo pesquisável/filtrável por estrutura interna) |
| `dados_depois` | `jsonb` | Snapshot depois |
| `origem` | `text` NOT NULL default `'ui'` | `'ui'` / `'api'` / `'sistema'` |
| `criado_em` | `timestamptz` NOT NULL default `now()` | |

- **Índices**: `(empresa_id, entidade, entidade_id)`, `(empresa_id, criado_em DESC)` (listagem cronológica).
- **Exclusão**: nunca — auditoria é append-only por definição.
- **Escopo**: `empresa_id`.
- **Nota sobre `jsonb`**: é a única tabela da Fase 1 onde `jsonb` é a escolha certa — o conteúdo é um log de snapshot, não um dado que precisa ser filtrado por campo interno ou ter integridade referencial. Em todo o resto do modelo (papéis, permissões, usuários), os campos que importam têm coluna própria — nenhum "campo mestre" da Fase 1 está escondido dentro de `jsonb`, seguindo a restrição explícita do prompt.

---

## 5. Fluxos principais

**Criação de empresa** — `POST` só possível por um usuário `wise.empresas.criar` (permissão global, concedida manualmente via seed/SQL na primeira empresa; depois, só quem já é admin de alguma empresa pode criar outra — não existe self-service de criação de empresa na Fase 1). Cria `wise_empresas`, e em transação: `wise_papeis` seed (`Administrador`, `is_admin=true`), `wise_unidades` seed ("Matriz"), `wise_empresa_modulos` com os módulos padrão. Publica `wise.empresa.criada`.

**Convite de usuário** — Admin da empresa cria linha em `wise_usuarios` com `status='convidado'` e `auth_id=null`. Sistema dispara e-mail (reaproveita o mesmo problema de rate limit do Supabase já mapeado na sessão anterior — recomendo usar o mesmo padrão "sem e-mail" adotado no fluxo de senha: gerar um link de convite com token próprio, não depender do e-mail transacional do Supabase). Publica `wise.usuario.convidado`.

**Ativação de usuário** — usuário acessa o link de convite, define senha via `supabase.auth.admin.createUser()` (server-side, mesmo padrão já usado em `redefinirSenhaSemEmail`), o `auth_id` retornado é gravado em `wise_usuarios.auth_id`, `status` passa pra `'ativo'`. Publica `wise.usuario.ativado`.

**Login** — inalterado, continua 100% Supabase Auth. O que muda: depois do login, a resolução de "quem é esse usuário" passa a consultar `wise_usuarios` (Fase 5) em vez de `usuarios` — na Fase 1, roda em paralelo, sem trocar a fonte usada pelo Frame.

**Resolução da empresa ativa** — Fase 1 tem exatamente 1 empresa por instância (não existe seletor de empresa na UI ainda); a "empresa ativa" é resolvida como `wise_usuarios.empresa_id` do usuário logado, sem seletor. Multi-empresa por usuário fica em aberto (seção 10).

**Verificação de permissão** — `service.ts` de cada módulo chama `verificarPermissaoWise(usuarioId, chave)`, que por baixo executa a RPC `wise_fn_tem_permissao(p_usuario_id, p_chave)` (ver seção 7) — nunca query direto em `wise_papel_permissoes` de dentro do código de aplicação.

**Bloqueio de usuário** — Admin muda `status` pra `'bloqueado'`. Efeito imediato: RLS de `wise_usuarios` (seção 6) já impede o próprio usuário bloqueado de se autoconsultar além do necessário pra tela de "conta bloqueada"; o código de aplicação (Frame, Board) precisa checar `status='ativo'` na resolução de sessão — **isso é um ponto de integração que a Fase 5 precisa cobrir explicitamente**, porque hoje `getUsuarioAtual()` do Frame olha `usuarios.ativo`, não `wise_usuarios.status`.

**Troca de setor / alteração de papel** — `UPDATE wise_usuarios SET setor_id = ...` / `INSERT`/`DELETE` em `wise_usuario_papeis`. Ambos passam por `service.ts`, que grava em `wise_auditoria` antes de confirmar (mesma transação).

---

## 6. Estratégia de RLS

RLS real, com policies de verdade, **só nas tabelas do Wise** — decisão confirmada, não é o padrão do resto do banco. A estratégia inteira depende de duas funções auxiliares (uma pra identidade, uma pra permissão), seguindo o mesmo padrão já validado em produção pelas `fn_auth_*` existentes — não invento um padrão novo.

### 6.1 Funções auxiliares

```sql
-- Mapeia auth.uid() -> wise_usuarios.id, já filtrando por status ativo.
-- STABLE + SECURITY DEFINER: evita que a policy tenha que repetir esse join
-- em toda tabela, e evita RLS recursivo (ver 6.3).
CREATE OR REPLACE FUNCTION wise_fn_auth_usuario_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM wise_usuarios
  WHERE auth_id = auth.uid() AND status = 'ativo'
  LIMIT 1;
$$;

-- Empresa do usuário autenticado. Separada da função acima porque é
-- consultada MUITO mais vezes (toda policy de toda tabela escopada por
-- empresa_id chama essa função) — mantém a query mínima possível.
CREATE OR REPLACE FUNCTION wise_fn_auth_empresa_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT empresa_id FROM wise_usuarios
  WHERE auth_id = auth.uid() AND status = 'ativo'
  LIMIT 1;
$$;

-- Checagem de permissão — reaproveita a MESMA tabela de junção que o
-- código de aplicação usa (papel -> papel_permissoes -> permissoes),
-- garantindo que a policy e o service nunca respondam coisas diferentes
-- pra mesma pergunta.
CREATE OR REPLACE FUNCTION wise_fn_tem_permissao(p_usuario_id uuid, p_chave text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM wise_usuario_papeis up
    JOIN wise_papeis p ON p.id = up.papel_id AND p.ativo
    JOIN wise_papel_permissoes pp ON pp.papel_id = p.id
    JOIN wise_permissoes perm ON perm.id = pp.permissao_id
    WHERE up.usuario_id = p_usuario_id
      AND (p.is_admin OR perm.chave = p_chave)
  );
$$;
```

### 6.2 Policies — padrão por tabela

Toda tabela `empresa_id`-escopada segue o mesmo molde de 4 policies (select/insert/update/delete), trocando só a condição de escrita quando a tabela exige uma permissão específica:

```sql
ALTER TABLE wise_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY wise_setores_select ON wise_setores
  FOR SELECT TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id());

CREATE POLICY wise_setores_insert ON wise_setores
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = wise_fn_auth_empresa_id()
    AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar')
  );

CREATE POLICY wise_setores_update ON wise_setores
  FOR UPDATE TO authenticated
  USING (empresa_id = wise_fn_auth_empresa_id())
  WITH CHECK (
    empresa_id = wise_fn_auth_empresa_id()
    AND wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.setores.gerenciar')
  );

-- delete: N/A pra tabelas com soft delete (setores usa "ativo=false" via UPDATE,
-- não existe policy de DELETE — a ausência da policy já bloqueia hard delete
-- pra authenticated, only service_role/superuser pode.
```

**`wise_usuarios`** tem uma policy de SELECT adicional além da regra de empresa — o próprio usuário sempre pode ler a própria linha, mesmo sem permissão de gestão de usuários (senão a UI de perfil não funciona pra ninguém):

```sql
CREATE POLICY wise_usuarios_select ON wise_usuarios
  FOR SELECT TO authenticated
  USING (
    empresa_id = wise_fn_auth_empresa_id()
    AND (id = wise_fn_auth_usuario_id() OR wise_fn_tem_permissao(wise_fn_auth_usuario_id(), 'wise.usuarios.visualizar'))
  );
```

**`wise_permissoes` e `wise_modulos`** não são multiempresa (catálogo global) — policy de SELECT liberada pra qualquer `authenticated`, sem policy de escrita nenhuma pra `authenticated` (só `service_role` escreve, via migration/seed, nunca via UI).

**`wise_auditoria`** — SELECT exige permissão explícita (`wise.auditoria.visualizar`), nunca é o próprio usuário por padrão (auditoria não é "meu histórico", é ferramenta de governança). Sem policy de INSERT/UPDATE/DELETE pra `authenticated` — gravação de auditoria só acontece via `service.ts` com `service_role` (mesmo client admin já usado em todo o resto do sistema), nunca pelo client anônimo.

### 6.3 Risco de recursão — e por que o desenho acima evita

Recursão de RLS acontece quando a policy de uma tabela consulta a própria tabela (ou uma tabela cuja policy consulta a primeira de volta) **sem** passar por uma função `SECURITY DEFINER`. `SECURITY DEFINER` roda com os privilégios de quem *criou* a função (o dono, tipicamente `postgres`), não do usuário que a chama — isso faz a query interna da função **ignorar RLS**, quebrando o ciclo. As três funções da seção 6.1 são `SECURITY DEFINER` exatamente por isso: `wise_fn_auth_usuario_id()` consulta `wise_usuarios`, e `wise_usuarios` tem RLS — se a função não fosse `SECURITY DEFINER`, chamá-la de dentro de uma policy de `wise_usuarios` seria recursão direta.

Regra prática pra qualquer policy nova no Wise: **nunca fazer um `SELECT` direto em outra tabela com RLS dentro de uma `USING`/`WITH CHECK`** — sempre por uma função `SECURITY DEFINER` já testada (as três da seção 6.1 cobrem os dois casos mais comuns: "quem sou eu" e "eu posso fazer X").

### 6.4 O que isso NÃO muda

O Frame continua usando `createAdminClient()` (service role, ignora RLS) pra tudo. As policies acima só importam pra: (a) qualquer client direto do browser que um dia consultar tabela do Wise (hoje não existe, mas Realtime é o precedente da seção 1.3), e (b) uma segunda camada de defesa caso um bug de autorização escape do `service.ts` — RLS aqui é rede de segurança, não a única fronteira (autorização em `service.ts` continua sendo a primeira, igual o resto do sistema).

---

## 7. Estratégia de permissões

**Padrão dos códigos**: `modulo.recurso.acao` — igual ao padrão já em uso (`compras.pedido.aprovar`). Confirmado: chaves legadas (Frame) continuam sem prefixo explícito de módulo; toda chave nova (Wise, Board futuro, Flow futuro, Stock futuro, Measure futuro) usa o prefixo do módulo. `wise_permissoes.modulo` é uma coluna derivada calculada na inserção — pra chave nova, primeiro segmento do `chave`; pra chave legada, fixo `'frame'`.

**Tabelas**: `wise_permissoes` (catálogo), `wise_papeis` (agrupador), `wise_papel_permissoes` (N:N), `wise_usuario_papeis` (N:N, multi-papel). Detalhadas na seção 4.

**Cache**: não introduzir cache de permissão na Fase 1. `wise_fn_tem_permissao` é uma query de 3 joins em tabelas pequenas (centenas de linhas, não milhões) — otimizar antes de medir é a complexidade prematura que o prompt pede pra evitar. Se um dia o perfil de uso mostrar que checagem de permissão é hot-path real, a resposta é um `STABLE` bem posicionado (já é) + índice, não uma camada de cache.

**Resolução**: sempre passa pela mesma pergunta — "esse usuário, considerando todos os papéis que ele tem, tem essa chave (ou um papel `is_admin`)?". Sem hierarquia implícita de papel (não existe "papel X inclui papel Y automaticamente") — cada papel lista suas permissões explicitamente. Simplicidade deliberada: hierarquia de papéis é uma feature real, mas sem um caso de uso concreto hoje ela é abstração adiantada.

**Precedência**: não existe "permissão nega permissão" (sem DENY explícito) — union simples de tudo que os papéis do usuário concedem. Se um dia surgir a necessidade de negar uma permissão especificamente pra um usuário mesmo tendo um papel que a concede, isso é a "permissão direta" da seção 4.9 evoluindo pra suportar `tipo: 'concede' | 'nega'` — não desenhado agora, fica em aberto (seção 10).

**Escopos**: `empresa_id` é o único escopo real da Fase 1 (embutido em `wise_fn_auth_empresa_id()`). Escopo por unidade/setor/obra (pedido na seção 13) **não é modelado como coluna extra em `wise_papel_permissoes`** — a razão é que "aprovador de compras só pra obra X" é uma regra que pertence ao Frame (é o Frame que sabe o que é uma obra e quais pedidos pertencem a ela), não ao Wise. O Wise responde "esse usuário pode aprovar pedidos" (sim/não); o Frame, ao aplicar isso, decide se filtra por obra usando dado que já é dele. Se isso se mostrar insuficiente na prática, o próximo passo é o Frame consultar `wise_usuario_papeis` com um filtro adicional próprio, não o Wise ganhar uma coluna `obra_id` genérica.

**Função `check_permission`**: é a `wise_fn_tem_permissao(p_usuario_id uuid, p_chave text)` da seção 6.1 — mesma função usada tanto pelas RLS policies quanto pelo wrapper TypeScript `verificarPermissaoWise()` chamado do `service.ts` (que faz `admin.rpc("wise_fn_tem_permissao", {...})`), garantindo que policy e código de aplicação nunca divirjam sobre a mesma pergunta.

---

## 8. Estratégia de migração

**Tabela de mapeamento — avaliação da proposta do prompt.** A tabela `legacy_entity_mappings` proposta é adequada, com um ajuste: nomear em português (consistência) e adicionar `unique(origem_tabela, origem_id)` — sem isso, nada impede o mesmo registro legado ser "migrado" duas vezes por engano.

```sql
CREATE TABLE wise_mapeamento_legado (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      uuid NOT NULL REFERENCES wise_empresas(id),
  origem_modulo   text NOT NULL,       -- 'frame'
  origem_tabela   text NOT NULL,       -- 'usuarios', 'setores', 'cargos'
  origem_id       uuid NOT NULL,
  destino_tabela  text NOT NULL,       -- 'wise_usuarios', 'wise_setores'
  destino_id      uuid NOT NULL,
  migrado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem_tabela, origem_id)
);
CREATE INDEX ON wise_mapeamento_legado (destino_tabela, destino_id);
```

**Como migrar usuários/setores/cargos/permissões existentes — passo a passo:**

1. **Setores**: `INSERT INTO wise_setores (empresa_id, nome, cor, ordem, ativo) SELECT :empresa_seed, nome, cor, ordem, ativo FROM setores`, gravando o par em `wise_mapeamento_legado` a cada linha (via `RETURNING` + segundo insert, ou uma única query com CTE).
2. **Cargos**: mesma lógica, resolvendo `setor_id` novo via join com `wise_mapeamento_legado` do passo 1. **`is_admin=true` vira, além do cargo migrado, uma linha em `wise_papeis` chamada "Administrador" com `is_admin=true`** — não existe coluna `is_admin` em `wise_cargos` (ver 4.4).
3. **Permissões**: `INSERT INTO wise_permissoes (chave, nome, modulo) SELECT chave, nome, 'frame' FROM permissoes ON CONFLICT (chave) DO NOTHING` — chave legada nunca ganha prefixo.
4. **Papéis derivados de cargo**: pra cada `cargo_permissoes` existente, criar um `wise_papeis` com o mesmo nome do cargo de origem (ex: cargo "Comprador" → papel "Comprador"), e replicar as permissões desse cargo em `wise_papel_permissoes`. Isso preserva o comportamento atual (cargo determina permissão) enquanto a base nova já suporta multi-papel pra quem precisar dele depois.
5. **Usuários**: `INSERT INTO wise_usuarios (empresa_id, auth_id, setor_id, cargo_id, nome, email, ..., status)` resolvendo `setor_id`/`cargo_id` via `wise_mapeamento_legado`, `status = CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END`. Em seguida, `INSERT INTO wise_usuario_papeis` ligando cada usuário ao papel derivado do cargo (passo 4).

**Impedir duplicação**: o `UNIQUE (origem_tabela, origem_id)` do mapeamento é a garantia técnica; o script de migração roda dentro de uma transação e é **idempotente por construção** (usa `ON CONFLICT DO NOTHING` nos catálogos e verifica existência em `wise_mapeamento_legado` antes de inserir nos relacionais) — rodar duas vezes não duplica.

**Rollback**: como a Fase 1 é aditiva (tabelas novas, zero alteração em tabela existente do Frame), rollback é `TRUNCATE` nas tabelas `wise_*` novas + `DROP` — não há dado do Frame em risco em nenhum momento até a Fase 5 de fato trocar a leitura de origem.

**Nomenclatura das fases de migração — alinhada com a Visão Geral.** A Visão Geral formaliza a migração de cada domínio em 4 fases (Implantação → Compatibilidade → Transferência de Responsabilidade → Desativação); esse vocabulário é mais preciso que o que este documento usava antes ("Fase 1–4" / "Fase 5" genéricos) e passa a valer pra identity/access também, não só pros domínios futuros:

- **Implantação** — é este documento: `wise_*` é criado, populado (seção acima), mas **nada lê dele em produção**. Equivale aos Blocos 1.1–1.4.
- **Compatibilidade** — Frame continua sendo a fonte de verdade lida pelo código; `wise_*` existe em paralelo, sincronizada via evento (`wise.usuario.criado` etc., disparado a partir de uma trigger/rotina no Frame, nunca o contrário). Dura até o primeiro consumidor migrar.
- **Transferência de Responsabilidade** — bloco a bloco (fora do escopo deste documento — é a "Fase 5" mencionada nos blocos acima), um consumidor específico passa a ler exclusivamente do Wise. **Nunca os dois escrevem no mesmo conceito ao mesmo tempo** durante essa transição — a regra de "uma direção de escrita ativa por vez" da seção 1 é o que torna esse corte seguro.
- **Desativação** — só depois de: (1) cadastro exclusivamente no Wise, (2) todo consumidor migrado pra API do Wise, (3) nenhuma escrita na estrutura legada, (4) dado validado via query de reconciliação (zero linhas órfãs), (5) testes de regressão passando, (6) auditoria confirmando consistência, (7) rollback testado e documentado — só então a tabela legada (`usuarios`, `setores`, `cargos`, `permissoes` do Frame) é oficialmente desativada/removida. Nenhuma dessas 7 condições é opcional; é a mesma disciplina que evita o risco de "duplicação de fonte de verdade" já identificado na seção 1.

**Verificação de integridade**: uma query de reconciliação (`SELECT count(*) FROM usuarios WHERE id NOT IN (SELECT origem_id FROM wise_mapeamento_legado WHERE origem_tabela='usuarios')`) roda como critério de aceite de cada bloco — zero linhas órfãs antes de considerar o bloco fechado, e é a mesma query reusada como condição (4) de Desativação quando essa fase chegar pra identity/access.

---

## 9. Plano incremental — blocos da Fase 1

Cada bloco é implantável e revertível isoladamente. Nenhum bloco altera tabela existente do Frame.

### Bloco 1.1 — Empresas, unidades, módulos

- **Migrations**: `wise_empresas`, `wise_unidades`, `wise_modulos`, `wise_empresa_modulos`. Seed: 1 empresa (dados reais da empresa atual), 1 unidade ("Matriz"), módulos `frame`+`board` habilitados.
- **Backend**: `modules/wise/organizations/` completo (repository, service, actions, schema).
- **UI**: nenhuma ainda — validação via SQL direto/Supabase Studio é suficiente pro tamanho deste bloco.
- **Testes**: unique de `slug`, `(empresa_id, codigo)` de unidade; seed idempotente (rodar migration duas vezes não duplica).
- **Critério de aceite**: `SELECT * FROM wise_empresas` retorna 1 linha; `wise_empresa_modulos` reflete os módulos certos.

### Bloco 1.2 — Setores, cargos, usuários (espelhados, sem RLS ainda)

- **Migrations**: `wise_setores`, `wise_cargos`, `wise_usuarios`, `wise_mapeamento_legado`. Script de migração dos passos 1/2/5 da seção 8 (sem papéis ainda — cargo sem permissão por enquanto).
- **Backend**: `modules/wise/identity/`.
- **UI**: nenhuma.
- **Testes**: contagem `wise_setores`/`wise_cargos`/`wise_usuarios` bate com a origem; `wise_mapeamento_legado` sem duplicata; nenhum `auth_id` órfão (todo `wise_usuarios.auth_id` existe em `auth.users`).
- **Critério de aceite**: query de reconciliação da seção 8 retorna zero.

### Bloco 1.3 — Permissões, papéis, RLS

- **Migrations**: `wise_permissoes`, `wise_papeis`, `wise_papel_permissoes`, `wise_usuario_papeis`, as 3 funções da seção 6.1, todas as policies da seção 6.2. Script de migração dos passos 3/4 da seção 8.
- **Backend**: `modules/wise/access/` completo, incluindo `verificarPermissaoWise()`.
- **UI**: primeira tela real — `/squadwise/usuarios` (listar, com papéis exibidos) e `/squadwise/papeis` (CRUD de papel + atribuição de permissão), só leitura de usuário nesta fase (edição fica pro bloco seguinte).
- **Testes**: `wise_fn_tem_permissao` retorna o mesmo resultado que `fn_tem_permissao` legado pra todo usuário existente (teste de paridade — garante que a migração não mudou quem pode o quê); teste de RLS (usuário da empresa A não enxerga linha da empresa B, mesmo autenticado).
- **Critério de aceite**: teste de paridade 100% verde; nenhuma policy permite acesso cross-empresa em teste manual com 2 empresas seed.

### Bloco 1.4 — Auditoria + fluxos de escrita (convite, bloqueio, troca de papel)

- **Migrations**: `wise_auditoria`.
- **Backend**: `registrarAuditoria()` em `modules/wise/audit/`, chamado pelos `service.ts` de identity/access nas ações sensíveis (bloquear usuário, atribuir/revogar papel, editar permissão de papel). Eventos `wise.*` publicados no event bus existente.
- **UI**: completar `/squadwise/usuarios` com convite/bloqueio/edição de setor-cargo-papéis; tela de auditoria (`/squadwise/auditoria`, só leitura, paginada).
- **Testes**: toda ação sensível gera exatamente 1 linha de auditoria com `dados_antes`/`dados_depois` corretos.
- **Critério de aceite**: bloquear um usuário via UI reflete em `wise_usuarios.status` E em `wise_auditoria` na mesma operação.

**Fora da Fase 1 por definição** (não é "próximo bloco", é fora de escopo deste documento): qualquer coisa da Fase 2 em diante do prompt original (fornecedores, obras, catálogo mestre, modelos de pipeline) e toda a Fase 5 (migração dos módulos consumidores pra ler do Wise). Fase 1 termina quando o Wise tem identidade e autorização funcionando em paralelo ao Frame, auditado, sem que o Frame tenha mudado uma linha sequer.

---

## 10. Riscos e decisões em aberto

**Usuário pertencente a mais de uma empresa.** O modelo atual (`UNIQUE auth_id` implícito em `wise_usuarios`) assume 1 login = 1 empresa. Pra um cenário SaaS real, uma pessoa pode legitimamente trabalhar em/consultar mais de uma empresa (ex: um fornecedor com portal próprio, ou um consultor). Opções: (a) manter 1:1 na Fase 1 e resolver isso só quando o primeiro cliente SaaS real pedir — recomendado, porque é reversível (virar 1:N depois é uma migration aditiva, não destrutiva); (b) já desenhar `wise_usuarios` como N:N com `auth.users` agora. **Recomendação: (a)** — não pagar complexidade de um cenário sem usuário real hoje.

**Permissão negativa (DENY explícito).** Hoje não modelado (seção 7). Se surgir necessidade real ("esse usuário específico NÃO pode aprovar, mesmo tendo o papel"), a extensão é direta (permissão direta com `tipo: concede|nega`, resolvida com DENY vencendo ALLOW). **Recomendação: não implementar até aparecer um caso real** — é a abstração que o prompt pede explicitamente pra evitar sem necessidade.

**`wise_cargos` referenciar `wise_setores` como obrigatório ou opcional.** Desenhado como opcional (nullable) pra não travar cadastro de cargo "corporativo" sem setor. Se na prática isso nunca acontecer, trocar pra `NOT NULL` é uma migration simples depois — manter opcional agora é a escolha reversível.

**Convite por e-mail vs. link manual — DECIDIDO.** Confirmado com o usuário: **link manual (Opção A)**, a princípio. Convite gera um link com token (`/squadwise/ativar?token=...`) exibido pro admin copiar e enviar manualmente (WhatsApp, etc.) — sem e-mail transacional, sem depender do rate limit do Supabase, mesmo padrão já adotado no reset de senha sem e-mail. Reversível: se um SMTP dedicado existir por outro motivo no futuro, trocar pra e-mail automático é uma mudança isolada no `service.ts` de identity, sem impacto no modelo de dados.

**`status` enum-texto vs. dois booleanos — DECIDIDO.** Confirmado com o usuário: **enum-texto (Opção A)**, a princípio. `wise_usuarios.status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','bloqueado','convidado'))` — mantido como já modelado na seção 4.5, mesmo quebrando a consistência visual com o `ativo boolean` do resto do schema, porque com 4 estados reais um enum evita estado inválido por construção em vez de depender de um CHECK adicional pra impedir combinação inválida entre dois booleanos.

---

## Sequência recomendada pra começar

As duas decisões bloqueantes já estão confirmadas (seção 10: convite sem e-mail via link manual; `status` como enum-texto) — nada mais impede começar o Bloco 1.1.

1. Bloco 1.1 (empresas/unidades/módulos) — menor risco, zero dependência de dado existente, valida a estrutura de pastas `modules/wise/*` e o padrão repository/service/action antes de tocar em dado sensível (usuário/permissão).
2. Bloco 1.2 (setores/cargos/usuários espelhados) — primeira migração de dado real, sem RLS e sem autorização ainda (só espelhamento), pra isolar "migração de dado" de "migração de segurança" como duas validações separadas.
3. Bloco 1.3 (permissões/papéis/RLS) — o bloco de maior risco técnico (RLS, recursão, paridade com o sistema legado); só começa depois dos dois anteriores estarem validados em produção (mesmo que sem UI).
4. Bloco 1.4 (auditoria + primeira UI de escrita) — só depois do 1.3 provar, com o teste de paridade, que `wise_fn_tem_permissao` responde igual ao sistema atual pra 100% dos usuários existentes.

Cada bloco é um PR isolado. Não começar o bloco N+1 sem o critério de aceite do bloco N fechado.

---

## Apêndice — roadmap de domínios pós-Fase 1 (informativo, não implementar agora)

Registrado aqui só pra quem ler este documento não achar que "Fase 1" é o SquadWise inteiro. Ordem recomendada pela Visão Geral pra fases futuras, cada uma seguindo o ciclo Implantação → Compatibilidade → Transferência de Responsabilidade → Desativação da seção 8: (1) Organização — já coberta pela Fase 1 (`wise_empresas`/`wise_unidades`); (2) Usuários — já coberta (`wise_usuarios`); (3) Papéis e Permissões — já coberta (`wise_papeis`/`wise_permissoes`); (4) Obras (cadastro mestre institucional — código, nome, cliente, endereço, datas, status; nunca dado operacional, que continua no Frame); (5) Fornecedores; (6) Clientes; (7) Catálogo Mestre (produtos, perfis, componentes, vidros, chapas, serviços, fabricantes — distintos de fornecedores: "um fabricante pode ser representado por vários fornecedores"); (8) Registry (tipos/categorias/tags/unidades de medida — dado de referência compartilhado entre módulos); (9) Configuration Center (configuração versionada por escopo Global→Empresa→Unidade→Setor→Equipe→Usuário — primeiro domínio do Wise onde cache se justifica de verdade); (10) Modelos Operacionais (pipeline/pacote — usados por Board/Flow). Cada item começa como um documento de arquitetura próprio, no mesmo formato deste, só depois que o item anterior tiver os critérios de aceite fechados.
