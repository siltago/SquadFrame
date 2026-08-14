# Arquitetura atual

## Visão geral

Monólito modular Next.js hospedável na Vercel. Server Components e Server Actions acessam Supabase, frequentemente por cliente administrativo. O navegador usa cliente anon para Auth, Realtime e casos específicos. Regras estão concentradas em `sgi/modules`; Wise adota separação repository/service/action mais explícita.

```mermaid
flowchart LR
  U[Usuário web/PWA] --> MW[Next Middleware]
  MW --> APP[Next.js App Router]
  APP --> MOD[Modules: Frame, Board, Stock, Wise]
  MOD --> ACT[Server Actions / Route Handlers]
  ACT --> DB[(Supabase PostgreSQL)]
  ACT --> ST[Supabase Storage]
  U <--> RT[Supabase Realtime]
  ACT --> TR[Trello API]
  ACT --> TW[Twilio WhatsApp]
  ACT --> WP[Web Push]
  VC[Vercel Cron] --> API[Rotas /api/cron]
  API --> ACT
```

## Autenticação

```mermaid
sequenceDiagram
  participant B as Browser
  participant M as Middleware
  participant A as Supabase Auth
  participant N as Next Server
  participant D as PostgreSQL
  B->>M: requisição + cookies
  M->>A: getUser()
  alt sem sessão
    M-->>B: redirect /login
  else autenticado
    M->>N: segue requisição
    N->>D: carrega usuário/cargo/permissões
    N-->>B: página autorizada
  end
```

## Fluxo de dados

```mermaid
flowchart TD
  UI[Formulário/componente] --> SA[Server Action]
  SA --> AUTH[getUsuarioAtual/verificarPermissão]
  AUTH -->|permitido| RPC[RPC ou operação admin]
  RPC --> PG[(PostgreSQL)]
  PG --> EVT[Realtime/eventos]
  EVT --> UI
  SA --> REV[revalidatePath/tag]
  REV --> UI
```

## Compras

```mermaid
flowchart LR
  N[Necessidade] --> S[Solicitação]
  S --> A{Aprovação}
  A -->|aprovada| P[Pedido]
  A -->|retorno| S
  P --> F[Fornecedor]
  P --> R[Recebimento parcial/total]
  R --> E[Estoque]
  P --> D[Devolução/beneficiamento/romaneio]
  P --> C[Carteira/financeiro]
```

## Produção

```mermaid
flowchart LR
  O[Obra] --> L[Lotes/tipologias]
  L --> PK[Pacote de trabalho]
  PK --> ENG[Pipeline Engenharia]
  PK --> COM[Pipeline Compras]
  PK --> EST[Disponibilidade em estoque]
  PK -. parcial/planejado .-> OP[Ordem de produção]
  OP -. planejado .-> CH[Chão de fábrica]
```

## Estoque

```mermaid
flowchart LR
  CAT[Catálogo] --> ITEM[Produto/material]
  FOR[Fornecedor] --> ITEM
  PED[Pedido] --> REC[Recebimento]
  REC --> LOC[Local de estoque]
  LOC --> SAL[Saldo]
  SAL --> MOV[Movimentações]
  MOV -. futuro .-> PK[Abastecimento de pacote]
```

## Permissões

```mermaid
flowchart TD
  AU[Usuário autenticado] --> US[Usuário do sistema]
  US --> CA[Cargo legado]
  CA --> CP[Cargo-permissões]
  US -. migração .-> WP[Papéis Wise]
  WP --> PP[Papel-permissões]
  CP --> CHECK[verificação em Action/RPC]
  PP --> CHECK
  CHECK --> CMD[Comando autorizado]
```

## Relação modular

```mermaid
flowchart TD
  HOME[SquadSystem Hub] --> FRAME[SquadFrame]
  HOME --> BOARD[SquadBoard]
  HOME --> STOCK[SquadStock]
  HOME -. inativo .-> WISE[SquadWise]
  HOME -. planejado .-> FLOW[SquadFlow]
  WISE --> FRAME
  FRAME --> BOARD
  FRAME --> STOCK
  FRAME --> FLOW
  STOCK --> FLOW
  MEASURE[SquadMeasure] -. conceito .-> FRAME
  HUB[SquadHub] -. hardware/conceito .-> FLOW
```

## Segurança e armazenamento

- Middleware protege páginas, mas exclui `/api`; cada API precisa autenticação própria.
- `createAdminClient` ignora RLS e aparece amplamente. Segurança depende da correção de Actions/services/RPCs.
- Há 132 ocorrências de criação de policies e migrations específicas de RLS, mas a documentação registra lacunas históricas.
- Storage é usado para arquivos/imagens; política de retenção/backup não está documentada no código.
- Realtime usa publicações específicas; filtros client-side não substituem RLS.

## Deploy e operação

Vercel em `gru1`, `maxDuration` 30 s, três crons. Não há Docker nem CI versionado. Deploy automático por push é descrito em `sgi/DEPLOY.md`, mas não substitui gates de qualidade.

