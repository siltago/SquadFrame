# SquadSystem

<p align="center">
  <img src="sgi/public/logo-system.png" alt="Logo do SquadSystem" width="96" />
</p>

Plataforma modular de gestão para empresas de esquadrias.

O SquadSystem conecta obras, compras, estoque, tarefas, documentos, finanças e
operação em uma experiência única. Cada área do negócio possui um módulo próprio,
mas todos compartilham usuários, permissões, dados e fluxos de trabalho.

> O projeto está em desenvolvimento ativo. Recursos e módulos podem mudar até a
> publicação da primeira versão estável.

## Visão do produto

Empresas de esquadrias normalmente distribuem sua operação entre planilhas,
mensagens, arquivos e sistemas que não conversam entre si. O SquadSystem foi
criado para reunir esse trabalho em uma plataforma modular, rastreável e preparada
para acompanhar a obra desde o planejamento até a entrega.

O hub central permite acessar os módulos disponíveis para cada usuário:

| Módulo | Finalidade | Situação atual |
| --- | --- | --- |
| **SquadFrame** | Obras, compras, tarefas, documentos e financeiro operacional | Ativo |
| **SquadBoard** | Quadros visuais, cards, listas e pipelines de trabalho | Ativo |
| **SquadStock** | Catálogo, materiais, locais, movimentações e recebimentos | Ativo |
| **SquadWise** | Organizações, usuários, cargos, papéis, permissões e auditoria | Em evolução |
| **SquadFlow** | Produção e gestão do chão de fábrica | Planejado |

## O que já existe

### Gestão de obras

- cadastro, edição, status e visão consolidada das obras;
- estrutura por lotes, tipologias e pacotes de trabalho;
- timeline, tarefas, arquivos e configurações por obra;
- importação de dados técnicos por XML;
- histórico e rastreabilidade das operações.

### Compras e suprimentos

- solicitações, pedidos e lotes de compra;
- fornecedores, formas de pagamento e dados da empresa;
- recebimentos, devoluções, retornos e beneficiamentos;
- romaneios, documentos e geração de relatórios;
- pendências operacionais e fluxos de aprovação;
- acompanhamento financeiro por carteira, obra e fornecedor.

### Estoque e catálogo

- catálogo técnico organizado por linhas e produtos;
- cores, acabamentos, aliases e vínculos com fornecedores;
- locais de estoque e saldos de materiais;
- entradas, saídas e movimentações;
- recebimento de materiais associado aos pedidos.

### Colaboração e acompanhamento

- quadros Kanban internos e pipelines por setor;
- cards, etiquetas, checklists, anexos e relacionamentos;
- tarefas pessoais e vinculadas às obras;
- busca global;
- notificações em tempo real e notificações push;
- interface responsiva, temas claro/escuro e instalação como PWA.

### Governança

- autenticação e recuperação de acesso;
- usuários, cargos e permissões;
- unidades, setores e papéis;
- trilha de auditoria;
- políticas de segurança no banco com Row Level Security.

## Arquitetura

O produto principal é uma aplicação web localizada em [`sgi/`](sgi/), construída
com:

- **Next.js 14**, React 18 e TypeScript;
- **Supabase** para PostgreSQL, autenticação, armazenamento e Realtime;
- **Tailwind CSS** e uma biblioteca própria de componentes e tokens visuais;
- **Vercel** para hospedagem e rotinas agendadas;
- PWA, Web Push, geração de PDF e processamento de XML/DXF.

O código é organizado por módulos de negócio. Rotas ficam em `sgi/app`, regras e
componentes em `sgi/modules`, recursos compartilhados em `sgi/shared` e `sgi/ui`,
e a evolução do banco em `sgi/supabase/migrations`.

```text
SquadFrame/
├── README.md
├── docs/
└── sgi/
    ├── app/                  # páginas, layouts e endpoints
    ├── modules/              # módulos e regras de negócio
    ├── shared/               # autenticação e infraestrutura compartilhada
    ├── ui/                   # componentes e identidade visual
    ├── public/               # ícones, logos e PWA
    └── supabase/
        ├── migrations/       # evolução versionada do banco
        └── seed/             # dados iniciais de referência
```

## Desenvolvimento local

### Pré-requisitos

- Node.js 20 ou superior;
- npm;
- um projeto Supabase configurado;
- Supabase CLI para aplicar migrations localmente ou em um projeto remoto.

### Configuração

```bash
cd sgi
npm install
cp .env.example .env.local
```

Preencha ao menos as variáveis abaixo em `sgi/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

As demais integrações, como cron, Web Push e WhatsApp, são opcionais no ambiente
local e estão documentadas em [`sgi/.env.example`](sgi/.env.example).

Depois, aplique as migrations do diretório `sgi/supabase/migrations` no projeto
Supabase correspondente e inicie a aplicação:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Comandos úteis

```bash
npm run dev      # servidor de desenvolvimento com Turbopack
npm run build    # build de produção
npm run start    # inicia o build de produção
npm run lint     # análise estática
```

## Deploy

O deploy de referência utiliza Vercel com o diretório raiz configurado como
`sgi`. As credenciais do Supabase e demais segredos devem ser cadastrados como
variáveis de ambiente, nunca versionados no repositório.

As instruções operacionais estão em [`sgi/DEPLOY.md`](sgi/DEPLOY.md). Antes de
publicar, aplique as migrations pendentes e valide `npm run build`.

## Segurança e dados

- Nunca envie `.env.local`, chaves `service_role` ou tokens ao Git.
- Não execute migrations diretamente em produção sem revisão e plano de retorno.
- Operações privilegiadas devem permanecer no servidor.
- As políticas RLS são parte da segurança do produto e não devem ser desativadas
  para contornar erros de acesso.
- Utilize dados fictícios em ambientes de desenvolvimento e demonstração.

## Estado do repositório

O projeto está em desenvolvimento e ainda não possui condições públicas de
licenciamento definidas neste repositório. Consulte os responsáveis pelo
SquadSystem antes de reutilizar ou redistribuir o código.

---

**SquadSystem** — gestão conectada para a operação de esquadrias.
