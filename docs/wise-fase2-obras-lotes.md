# SquadWise — Fase 2: Módulo de Obras e Lotes

**Data:** 2026-07-16  
**Branch:** main

---

## Contexto

O SquadWise é a camada administrativa multi-tenant do sistema. A Fase 2 integra o módulo de **Obras** — já existente no SquadFrame — ao painel do Wise, sem quebrar o funcionamento atual do Frame. O conceito central é o **Lote de Trabalho**: unidade operacional que serve múltiplos setores (compras, produção, etc.) de forma simultânea.

---

## Migrações SQL

### `20260716000007_wise_obras.sql`
- Cria `obra_status` (tabela de status configurável com cor, ordem e flag `is_final`)
- Cria `obras` com FK para `clientes`, `usuarios` (responsáveis) e `wise_unidades`
- Cria `wise_obra_estrutura` para hierarquia física (Torre → Bloco → Pavimento → Ambiente)

### `20260716000008_wise_work_packages.sql`
- Cria `lotes_obra` como unidade de trabalho dentro de uma obra
  - FK: `obra_id`, `responsavel_id`
  - Campo `prioridade` enum: `BAIXA | MEDIA | ALTA | CRITICA`
  - Campo `modulos` (array de texto) para indicar quais setores usam o lote
- Cria `tipologias_obra` com FK para `lotes_obra` e `obras`
  - Campos: tipo, codigo_esquadria, descricao, dimensão (mm), quantidade, tratamento, status, peso_unit, preco_unit

### `20260716000009_wise_triggers_empresa.sql`
- **Trigger `trg_obras_empresa_id`** (BEFORE INSERT on `obras`): auto-preenche `empresa_id` quando nulo, buscando pela `empresa_id` do responsável ou a primeira `wise_empresas`
- **Trigger `trg_lotes_obra_empresa_id`** (BEFORE INSERT on `lotes_obra`): mesmo padrão
- **Trigger `trg_lotes_obra_modulos`** (AFTER INSERT on `lotes_obra`): adiciona módulos padrão `['frame', 'board']`
- Backfill idempotente para registros já existentes
- **Garante compatibilidade total com o Frame**: código legado que não passa `empresa_id` continua funcionando

### `20260716000010_lote_configuracao.sql`
- Adiciona campos operacionais a `lotes_obra`:
  - `etapa` (enum: `configuracao | compras | producao | entrega | concluido`, default `configuracao`)
  - `liberado_compras` (boolean, default `false`)
  - `liberado_producao` (boolean, default `false`)
  - `tipo_producao` (text: `fabricacao_interna | terceirizado | misto`)
- Backfill: lotes com responsável e tipologias → `etapa='compras'`, `liberado_compras=true`

---

## Módulo: `modules/wise/works`

### `types.ts`
- `WiseObra`, `WiseCliente`, `WiseResponsavel`, `WiseObraStatusRow`
- `WiseObraEstrutura` (árvore recursiva)
- `WiseTipologia` — todos os campos incluindo tratamento, descricao, peso_unit, preco_unit
- `WiseLoteComTipologias` — lote + campos operacionais (etapa, liberações) + tipologias[]
- `WiseLotePedido` — pedido de compra vinculado ao lote
- `WiseLoteSolicitacao` — solicitação de compra vinculada ao lote
- `ServiceResult<T>` — union type: `{ ok: true; data: T } | { ok: false; erro: string }`

### `repository.ts`
- CRUD completo de obras (listar, buscar, inserir, atualizar, arquivar)
- Listagem de status e clientes
- Estrutura física (listar, inserir, atualizar, excluir)
- `atualizarLote(loteId, dados)` — atualiza campos operacionais do lote

### `service.ts`
- Camada de validação e regras de negócio sobre o repository
- `construirArvore()` — transforma lista flat em árvore de estrutura física
- `atualizarLote()` — propaga para repository com tratamento de erro

### `actions.ts` (`"use server"`)
- Todas as actions verificam sessão e empresa via `contexto()`
- CRUD obras + estrutura física com `revalidatePath`
- `atualizarLoteAction(loteId, obraId, dados)` — salva alterações do lote e revalida a página

---

## Componentes: `works/components`

### `obras-lista.tsx`
- Tabela de obras com status badge (cor configurável), cliente, responsável, data prevista
- Link para página de detalhe de cada obra

### `obra-form.tsx`
- Formulário de criação/edição de obra
- Selects de cliente, status, responsável comercial e técnico

### `obra-detalhe.tsx`
- **2 abas**: Informações | Edição
- Aba Informações: cards de identificação (cliente, responsáveis, endereço, observações)
- Aba Edição: lista compacta de lotes com contagem de tipologias, barra de progresso por status e link para a página do lote

### `lote-detalhe.tsx`
- **3 abas**: Dashboard | Itens | Liberação

**Dashboard**
- Stepper visual das 5 etapas com marcação da etapa atual
- Pills de estado: "Compras liberada/não liberada", "Produção liberada/não liberada"
- Alerta vermelho quando há pedidos com prazo vencido
- Lista de pedidos de compra com status badge e prazo (destaque vermelho se atrasado)
- Lista de solicitações de compra com status badge

**Itens**
- Gráfico de pizza SVG (donut) por status das tipologias
- Percentual de conclusão (pronto + entregue / total)
- Tabela com colunas: Tipo → Código → Descrição → Dimensão → Qtd → Tratamento → Status
- Linha expansível mostrando: Peso unit, Peso total, Área total, Preço unit, Valor total

**Liberação**
- Seletor visual de etapa (botões, com atalhos Voltar/Avançar)
- Toggles switch para `liberado_compras` e `liberado_producao`
- Seletor de `tipo_producao`: Não definido | Fabricação Interna | Terceirizado | Misto
- Botão "Salvar alterações" com feedback de sucesso/erro via `useTransition`

---

## Pages

### `app/squadwise/(protegido)/obras/page.tsx`
- Lista todas as obras da empresa com `listarObrasAction()`

### `app/squadwise/(protegido)/obras/[id]/page.tsx`
- Busca obra + lotes + tipologias em paralelo
- Lotes e tipologias buscados separadamente e agrupados por `Map<lote_id, tipologia[]>` (evita ambiguidade de FK no PostgREST)
- Usa `created_at` (não `criado_em`) para ordenar tipologias_obra

### `app/squadwise/(protegido)/obras/[id]/lotes/[loteId]/page.tsx`
- Busca lote (com campos operacionais), tipologias, pedidos e solicitações em paralelo
- Passa tudo para `<LoteDetalhe>`
- BackButton retorna para `/squadwise/obras/[id]?aba=lotes`

---

## Sidebar

`modules/wise/components/shell/sidebar.tsx` — adicionado grupo **Planejamento** com link **Obras** (`/squadwise/obras`).

---

## Decisões técnicas relevantes

| Problema | Solução |
|---|---|
| Frame não passa `empresa_id` | Triggers BEFORE INSERT que auto-preenchem via lookup |
| PostgREST retornava `null` no join tipologias←lotes | Busca separada + groupBy em TypeScript com `Map` |
| `tipologias_obra` usa `created_at`, não `criado_em` | Ordenação corrigida para `.order("created_at")` |
| `peso_unit` e área calculada eram imprecisos | Removidos dos cards globais; disponíveis apenas na linha expandível de cada tipologia |
| Lote como hub multi-setor | Migration 010 adiciona campos de controle sem tocar na estrutura do Frame |
