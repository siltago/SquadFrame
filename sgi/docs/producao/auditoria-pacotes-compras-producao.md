# Auditoria — Pacotes de Trabalho, Compras e Produção

> Relatório de auditoria, não de implementação. Nenhuma migration foi criada a partir deste documento. Grounded 100% em leitura de código e schema real (`supabase/migrations/*.sql`, `modules/squadframe/`, `modules/squadboard/`) em 2026-07-16 — nenhuma afirmação abaixo é suposição; onde algo não existe, está dito explicitamente.

---

## 1. Resumo executivo

**Estado atual**: a base para "Pacote de Trabalho + pipelines setoriais" já existe e está bem desenhada — `lotes_obra` (pacote canônico) + `pacote_pipeline_status` (fork de status por setor, sem duplicar dado) é exatamente o modelo "pacote único com projeções setoriais" que a seção 20 do prompt original propõe como intenção. Essa parte **não precisa ser reconstruída**.

O que **não existe de forma alguma**: necessidade de material, alocação de compra por item (rateio), qualquer entidade de Produção (ordem, lote de produção, item de produção). "Produção" hoje é literalmente só um valor de `CHECK` (`'producao'`) dentro de `pacote_pipeline_status.pipeline` — não há tabela, RPC, permissão ou evento associado. Isso é greenfield real dentro do domínio, não uma duplicação a evitar.

**Principais riscos** (detalhados na seção 5):
- **Crítico**: cinco tabelas do SquadBoard (`board_descricao`, `board_checklist`, `board_checklist_item`, `board_anexo`, `board_etiquetas`/`lote_board_etiqueta`) são usadas ativamente em código de produção mas **não têm nenhuma migration no repositório** — schema não reproduzível, sem versionamento, sem RLS auditável.
- **Alto**: não existe alocação por item — um item de pedido não pode ser dividido entre pacotes hoje (só o cabeçalho de pedido/solicitação tem `lote_id`, nullable, single-valued).
- **Alto**: `lotes_obra`/`pacote_pipeline_status` são manipulados por `admin.from(...)` direto (upsert/update via client), sem RPC, sem `SECURITY DEFINER`, sem gate de permissão — inconsistente com o resto de Compras, que passa tudo por RPC + `fn_exigir_permissao`.

**Recomendação geral**: não recriar o pacote canônico nem o mecanismo de pipeline — evoluir em cima deles. Endereçar a dívida crítica do Board (schema não versionado) antes ou em paralelo ao Bloco 1, já que qualquer nova tabela de Produção que siga o mesmo padrão informal repetiria o mesmo risco. Depois disso, construir Necessidade de Material → Alocação de Compra → Ordem de Produção como blocos incrementais e independentes, cada um com RPC + permissão dedicada desde o primeiro dia (não repetir o padrão "sem permissão ainda" de `pacote_pipeline_status`).

---

## 2. Inventário técnico atual

| Tabela | Conceito real (confirmado no código) | Escrita | Leitura | Migration | Problemas |
|---|---|---|---|---|---|
| `lotes_obra` | Pacote de Trabalho (renomeado só conceitualmente — nome interno preservado por compatibilidade) | Frame (`admin.from`, direto, sem RPC) | Frame + Board (Quadro Operacional) | `20260625000000_remote_schema.sql` (base) + `20260703_lotes_obra_pacote_trabalho.sql` (colunas de negócio) | Sem RPC/permissão; RLS ligado sem policy |
| `pacote_pipeline_status` | Fork de status por pipeline (engenharia/compras/produção) — **1 linha por pacote×pipeline**, não duplica o pacote | Board (`moverPacotePipeline`, upsert direto) | Board (Quadro Operacional) | `20260703000002_pacote_pipeline_status.sql` | Sem RPC/permissão; RLS ligado sem policy; `GRANT ALL` a `anon`/`authenticated` |
| `tipologias_obra` | Item/esquadria dentro de um pacote (opcionalmente) | Frame | Frame | `20260625000000_remote_schema.sql` | `lote_id` nullable — item pode não pertencer a nenhum pacote; `status` é `varchar` livre, sem `CHECK` |
| `solicitacoes_compra` / `pedidos_compra` | Documentos de compra — `lote_id` **opcional, no cabeçalho** | Frame (via RPC `criar_solicitacao`/`criar_pedido`) | Frame + Board | `20260703000001_compras_lote_vinculo.sql` | Vínculo é só de cabeçalho — todo o documento pertence a no máximo 1 pacote, nunca a vários |
| `solicitacao_itens` / `pedido_itens` | Itens do documento | Frame | Frame | `20260625000000_remote_schema.sql` | **Zero** referência a pacote/lote — não há como um item ser dividido entre pacotes |
| `recebimentos` / `recebimento_itens` | Registro de recebimento físico | Frame | Frame | `20260625000000_remote_schema.sql` | Sem referência a pacote (herda indiretamente via `pedido_id`) |
| `board_card_entities` / `board_card_activity` / `board_card_responsaveis` | Vínculo Quadro Interno (Trello) ↔ entidades SquadSystem | Board | Board (Quadro Interno) | **`modules/squadboard/sql/migrations*.sql`** — fora de `supabase/migrations/`, não rastreado pelo CLI | Schema fora do histórico de migration oficial |
| `board_descricao` / `board_checklist` / `board_checklist_item` / `board_anexo` | Conteúdo de card do Quadro Operacional (descrição/checklist/anexo por `entity_type`+`entity_id`) | Board | Board | **Nenhuma** — zero arquivo `.sql` em todo o repositório define essas tabelas | **Crítico** — schema inexistente no repo, só inferível pelo código TS que as consome |
| `lote_board_etiqueta` / `board_etiquetas` | Etiquetas de pacote no Quadro Operacional | Board | Board | **Nenhuma** — mesmo problema acima | **Crítico** |
| `eventos_dominio` | Event bus (outbox simplificado) | Frame | Frame (consumidores in-process) | `20260625000001_compras_fixes.sql` | Sem retry/outbox real, sem idempotência — ver seção 6 |
| — (não existe) | Necessidade de material | — | — | — | Conceito inexistente |
| — (não existe) | Ordem de Produção / Lote de Produção / Item de Produção | — | — | — | Conceito inexistente — "produção" é só um valor de enum |

---

## 3. Diagrama do fluxo atual (confirmado no código)

```
Obra
 └─ lotes_obra ("Pacote de Trabalho")
     ├─ tipologias_obra (lote_id nullable)
     ├─ pacote_pipeline_status (1 linha por pipeline: engenharia/compras/producao)
     │     └─ lida/escrita SÓ pelo Quadro Operacional do Board
     ├─ solicitacoes_compra (lote_id opcional, cabeçalho) ──┐
     │                                                       ├─→ pedidos_compra (lote_id herdado ou opcional)
     │                                                       │      ├─ pedido_itens (SEM vínculo a pacote)
     │                                                       │      └─ recebimentos → recebimento_itens
     └─ solicitacao_itens (SEM vínculo a pacote)

Quadro Operacional (Board) ──lê direto──→ lotes_obra + pacote_pipeline_status  (id do card = lotes_obra.id, SEM duplicação)
Quadro Interno (Board)     ──independente──→ Trello (via provider) + board_card_entities/activity/responsaveis (schema fora do repo)
```

Não existe, em nenhum ponto deste fluxo, uma entidade de "necessidade de material" nem qualquer tabela de Produção — a seta de "produção" simplesmente não existe hoje além do valor `'producao'` no `CHECK` de `pacote_pipeline_status.pipeline`.

---

## 4. Glossário — como o sistema usa esses termos HOJE

- **Lote** — nome interno/físico da tabela `lotes_obra`. Preservado por decisão explícita de compatibilidade (comentário na migration: "Tabela e nome interno NÃO mudam"). Ninguém deveria renomear a tabela — o custo de migration não se justifica.
- **Pacote / Pacote de Trabalho** — o significado conceitual atual de uma linha de `lotes_obra`, desde que a migration de 2026-07-03 adicionou `descricao`, `responsavel_id`, `prioridade`, `prazo`. É o termo usado na UI e nos comentários de código.
- **Pipeline** — um dos 3 tracks fixos (`engenharia`, `compras`, `producao`) em que um pacote pode ter posição própria, via `pacote_pipeline_status`. Não é uma entidade rica (sem responsável, checklist, bloqueio próprios — só `coluna` + `ordem`).
- **Solicitação / Pedido** — documentos de compra padrão, com vínculo opcional e único a um pacote (nunca a vários).
- **Recebimento** — registro de entrada física, vinculado só ao pedido (não ao pacote diretamente).
- **Ordem (de produção)** — **não é um termo usado em lugar nenhum do código ou schema**. Zero ocorrência.

---

## 5. Problemas encontrados

### Crítico
1. **Schema do Board não versionado.** `board_descricao`, `board_checklist`, `board_checklist_item`, `board_anexo`, `board_etiquetas`, `lote_board_etiqueta` são usados ativamente (`modules/squadboard/actions/board-content.ts`, `modules/squadboard/actions/pacotes.ts`) mas não têm **nenhuma** migration em `supabase/migrations/`. Isso significa: schema irreproduzível a partir do repositório, sem controle de RLS/constraint auditável, e risco real de as próximas migrations de Produção colidirem com algo que o histórico do Supabase CLI não conhece.
2. **`board_card_entities`/`activity`/`responsaveis` fora do histórico de migration oficial** — vivem em `modules/squadboard/sql/migrations*.sql`, scripts rodados manualmente, não capturados por `supabase migration list`. Mesma classe de risco do item 1, um degrau abaixo (pelo menos o SQL está no repo).

### Alto
3. **Sem alocação por item.** `solicitacao_itens`/`pedido_itens` não têm nenhuma coluna de pacote. Um item de pedido não pode hoje ser dividido entre dois pacotes (o cenário do prompt original, "120 barras → 120/80 entre dois pacotes", **não é suportado**). Se esse requisito é real, precisa de tabela nova — não existe hoje nem a Alternativa A (lote_id no item) nem a B (rateio).
4. **`lotes_obra`/`pacote_pipeline_status` fora do padrão de segurança do resto de Compras.** Todo o resto do domínio (`criar_pedido`, `criar_solicitacao`, `registrar_recebimento`) passa por RPC `SECURITY DEFINER` com `fn_exigir_permissao()`. `lotes_obra` e `pacote_pipeline_status` são escritos via `admin.from(...).upsert(...)` direto do código TypeScript, sem RPC e **sem nenhuma chave de permissão** — é uma decisão documentada ("este módulo ainda não tem chaves de permissão dedicadas"), não um bug, mas é uma inconsistência real que qualquer evolução (Ordem de Produção) não deveria herdar.
5. **Necessidade de material não existe.** Pré-requisito de tudo que o prompt original pede nas seções de cobertura/criticidade/liberação — precisa ser construído do zero, sem atalho.
6. **Produção não existe como domínio operacional.** Zero tabela, RPC, evento ou permissão. A introdução de Ordem de Produção é greenfield nessa fatia específica — não há nada pra "não duplicar" aqui, mas ela precisa se conectar ao `pacote_pipeline_status` existente (pipeline `'producao'`) em vez de criar um segundo mecanismo de status paralelo.

### Médio
7. **`origem_contexto` é write-only.** Totalmente conectado (link → form → action → RPC → coluna), mas nenhum código lê esse valor de volta pra filtrar ou ramificar comportamento — hoje é só metadado de auditoria acumulando sem uso.
8. **`Setor` (Board/Quadro Interno) e `PipelineId` (Board/Quadro Operacional)** são dois `type` TypeScript independentes com os mesmos 3 valores literais — não compartilham declaração. Baixo risco (valores idênticos), mas é dívida de DRY que facilita divergência futura.
9. **Event bus sem outbox real.** `eventos_dominio` grava e processa consumidores in-process, síncrono, sem retry/idempotência — aceitável pro que existe hoje (notificação, espelho de kanban), mas não deveria sustentar lógica crítica de prontidão-para-produção sem endurecer primeiro (idempotency key, ao menos).

### Dívida técnica (baixa, mas real)
10. RLS ligado sem policy em `lotes_obra`/`tipologias_obra`/`pacote_pipeline_status` — mesmo padrão já documentado e aceito no resto do Frame (não é um problema novo introduzido por este domínio).

---

## 6. Conflitos conceituais

- **"Pacote de Compras" / "Pacote de Produção" não são entidades separadas hoje** — são só o mesmo `lotes_obra` visto através de `pacote_pipeline_status.pipeline = 'compras'` / `'producao'`. Ou seja, a **Opção A** da seção 20 do prompt original (pipelines setoriais do mesmo pacote) já é, na prática, o modelo implementado — confirma-se tecnicamente que evitar duplicação com projeções setoriais é viável, porque já está funcionando assim pro par Engenharia/Compras.
- **Duas árvores de card completamente diferentes dentro do Board** (Quadro Operacional = dado real do Frame, sem duplicação; Quadro Interno = Trello + tabelas próprias fora do histórico de migration) não devem ser confundidas ao desenhar onde a Ordem de Produção vai aparecer. Se ela precisar aparecer no Board, o caminho natural é o Quadro Operacional (que já lê `lotes_obra`/`pacote_pipeline_status` sem duplicar), não o Quadro Interno.
- **Multiempresa**: nenhuma das tabelas deste domínio (`lotes_obra`, `pacote_pipeline_status`, `solicitacoes_compra`, `pedidos_compra`, etc.) tem `empresa_id` — o Frame continua mono-tenant, exatamente como já documentado na arquitetura do SquadWise. Qualquer tabela nova de Produção precisa decidir explicitamente se nasce com `empresa_id` (alinhada ao Wise) ou sem (alinhada ao resto do Frame hoje) — não é uma decisão técnica trivial, é uma escolha de rumo que precisa confirmação antes do Bloco 1 de implementação.

---

## 7. Arquitetura alvo (proposta, não implementada)

Baseada no que já existe e funciona:

- **Pacote de Trabalho** = `lotes_obra`, inalterado conceitualmente. Continua sendo o agregador de escopo.
- **Pipeline setorial** = `pacote_pipeline_status`, estendido (não recriado) com os campos que hoje faltam pra virar uma instância setorial rica: `responsavel_id`, `equipe_id`, `prazo`, `bloqueado`/`motivo_bloqueio`. Continua 1 linha por pacote×pipeline.
- **Necessidade de Material** — tabela nova (`pacote_necessidades_materiais` ou nome equivalente), referenciando `lotes_obra.id`, com campo de criticidade e etapa necessária, exatamente como esboçado na seção 12 do prompt original — mas só depois de confirmar que não faz mais sentido derivar isso de `tipologias_obra` (que já tem `lote_id`) antes de criar uma tabela paralela.
- **Alocação de Compra por item** — só se o requisito de rateio (seção 11) for confirmado como real; senão, `lote_id` direto no item (mais simples) resolve o caso comum.
- **Ordem de Produção** — entidade nova, referenciando `lotes_obra.id` (não recriando o pacote), com seu próprio ciclo de status (não reusar `pacote_pipeline_status.coluna` genérico) e conectada ao pipeline `'producao'` existente pra refletir prontidão agregada.

---

## 8. Matriz de responsabilidade (proposta)

| Entidade | Wise | Frame | Board | Flow (futuro) | Stock (futuro) |
|---|---|---|---|---|---|
| Tipo de pacote / modelo de pipeline | Define (futuro) | — | — | — | — |
| Pacote real (`lotes_obra`) | — | **Dono** | Visualiza (Quadro Operacional) | — | — |
| Pipeline setorial (`pacote_pipeline_status`) | — | **Dono** | Visualiza + move | Consulta (pipeline produção) | — |
| Necessidade de material | — | **Dono** (Compras) | Visualiza | Consulta | Consulta |
| Pedido/Solicitação | — | **Dono** | Visualiza | Consulta | Consulta |
| Ordem de Produção | Modelo (futuro) | — | Visualiza | **Dono** (quando existir) | Consulta |
| Estoque/reserva | — | — | — | Consulta | **Dono** (quando existir) |

---

## 9. Estratégia de migração — princípios (não plano de blocos ainda)

- **Reaproveitar sem tocar**: `lotes_obra` e `pacote_pipeline_status` continuam existindo com esses nomes — zero rename, zero migration destrutiva.
- **Corrigir a dívida crítica primeiro**: reverse-engenheirar `board_descricao`/`board_checklist`/`board_checklist_item`/`board_anexo`/`board_etiquetas`/`lote_board_etiqueta` (e as 3 tabelas do Quadro Interno) para migrations reais em `supabase/migrations/`, mesmo sem alterar comportamento — só pra sair do estado "schema não existe no repo".
- **Todo componente novo nasce com RPC + permissão** — não repetir o padrão "acesso via service_role, sem chave de permissão" que hoje existe em `pacote_pipeline_status`.
- **Necessidade de Material antes de Ordem de Produção** — a Ordem depende de saber "o que precisa" antes de "o que fabricar".

---

## 10. Decisões — resolvidas

1. **`empresa_id` nas tabelas novas de Produção: mono-tenant.** Confirmado — nascem sem `empresa_id`, alinhadas ao resto do Frame hoje. Não abrir uma ilha multiempresa dentro de um domínio mono-tenant.
2. **Rateio de item entre pacotes: modelar, mas como caminho opcional.** Confirmado como "bom ter, mas nem sempre será usado" — a tabela de alocação (`pedido_item_pacotes` ou equivalente) é desenhada para o caso 1:N, mas o caso comum (1 item → 1 pacote) precisa continuar simples de escrever (não forçar toda gravação a passar por uma tabela de rateio com 1 linha só). Ver seção 11 do plano incremental.
3. **Dívida crítica do schema do Board: bloco separado, antes.** Confirmado. Vira o **Bloco 0** do plano incremental (seção 11) — corrige o schema não versionado antes de qualquer migration nova de Produção tocar essa vizinhança.
4. **Necessidade de Material NÃO deriva de `tipologias_obra` — são conceitos diferentes.** Investigação follow-up (grounded em código, ver achados abaixo) mostra que `tipologias_obra` representa a **esquadria pronta** (unidade final a ser fabricada/entregue — código, dimensões, peso, status `pendente→em_producao→pronto→entregue`), alimentada majoritariamente por importação de XML (`importarTipologias`, `modules/squadframe/actions/obras/actions.ts:147-185`) e sem nenhum vínculo com catálogo (nenhuma referência a `produto_id` em lugar algum). Ou seja: `tipologias_obra` já é, na prática, o embrião do conceito **Item de Produção** do prompt original (seção 8) — não o de Necessidade de Material. Necessidade de Material (perfis/vidro/ferragem necessários pra fabricar essas esquadrias) continua **inexistente e genuinamente greenfield** — não há atalho aproveitando `tipologias_obra` para isso.

   Achados de suporte (arquivo `modules/squadframe/actions/obras/actions.ts`, `modules/squadframe/components/obras/aba-producao.tsx`):
   - `status` em uso real (sem `CHECK` no banco, mas com domínio fechado em código — `aba-producao.tsx:19-25`): `pendente`, `em_producao`, `pronto`, `entregue`, `cancelado`.
   - `lote_id` só é setado no momento da importação de XML (`actions.ts:173`, dentro da mesma transação que cria o `lotes_obra`); tipologias adicionadas manualmente (`adicionarTipologia`, `actions.ts:245-262`) nascem com `lote_id = null` e **não existe nenhuma ação de "atribuir depois a um pacote"** — são um beco sem saída na consulta de "sem lote" (`page.tsx:234-239`).
   - Uso contido: só 5 arquivos referenciam `tipologias_obra` (2 actions, 3 componentes/páginas) — recurso secundário centrado na aba "Produção" da obra, não espalhado pelo resto do sistema.

---

## 11. Plano incremental (proposto)

Todos os blocos abaixo são aditivos — nenhum renomeia ou altera destrutivamente `lotes_obra`, `pacote_pipeline_status`, `tipologias_obra` ou qualquer tabela de Compras existente.

### Bloco 0 — Sanear o schema do Board (pré-requisito, decisão 3)
- Reverse-engenheirar `board_descricao`, `board_checklist`, `board_checklist_item`, `board_anexo`, `board_etiquetas`, `lote_board_etiqueta` (hoje sem nenhuma migration) e as 3 tabelas do Quadro Interno (`board_card_entities`, `board_card_activity`, `board_card_responsaveis`, hoje só em `modules/squadboard/sql/*.sql`, fora do histórico do CLI) para migrations reais em `supabase/migrations/`.
- **Sem mudar comportamento** — só trazer o schema real de produção pro controle de versão (`CREATE TABLE IF NOT EXISTS`, idempotente, sem `DROP`/`ALTER` destrutivo).
- Critério de aceite: `supabase migration list` reconhece essas tabelas; `supabase db diff` (ou inspeção manual) confirma que a migration nova não altera nada que já existe em produção, só formaliza.

### Bloco 1 — Necessidade de Material (fundação)
- Tabela nova `pacote_necessidades_materiais` (nome sujeito a revisão), referenciando `lotes_obra.id`, mono-tenant, com RPC + permissão dedicada desde o dia 1 (`producao.necessidade.criar`/`.gerenciar` — não repetir o padrão sem permissão de `pacote_pipeline_status`).
- Não deriva de `tipologias_obra` (decisão 4) — é uma entidade nova e independente.
- Critério de aceite: dado um pacote, listar suas necessidades de material via RPC, com criticidade e etapa necessária.

### Bloco 2 — Alocação de Compra (opcional, por pedido/item)
- Caminho simples (padrão): `lote_id` único no item do pedido/solicitação (hoje só existe no cabeçalho — subir pra `pedido_itens`/`solicitacao_itens`).
- Caminho de rateio (quando necessário, decisão 2): tabela de alocação `pedido_item_pacotes(pedido_item_id, pacote_id, quantidade_destinada)`, usada só quando o item realmente atende mais de um pacote — não obrigatória pro caso comum.
- Critério de aceite: cobertura de uma necessidade de material consegue somar quanto já foi pedido, olhando pro item (não só pro cabeçalho do pedido).

### Bloco 3 — Ordem de Produção (MVP)
- Tabela nova, referenciando `lotes_obra.id` (não recriando o pacote), com ciclo de status próprio (não reusar `pacote_pipeline_status.coluna`).
- Escopo essencial pro MVP (cabeçalho + itens, sem roteiro/etapas ainda — isso é fase seguinte, per seção 15 do prompt original).
- Conectada ao pipeline `'producao'` já existente em `pacote_pipeline_status`, refletindo prontidão agregada sem duplicar o mecanismo de coluna/ordem.
- Critério de aceite: criar uma Ordem de Produção a partir de um pacote, com permissão dedicada (`producao.ordem.criar`), auditável.

### Bloco 4 — Prontidão e bloqueios
- Cálculo de "pode liberar produção" a partir de Necessidade de Material (Bloco 1) + Alocação (Bloco 2) — ver seção 17 do prompt original.
- Não implementar antes dos Blocos 1-3 estarem validados — prontidão depende dos dois.

### Bloco 5 — UI integrada
- Tela do pacote com abas Resumo/Engenharia/Compras/Materiais/Ordens de Produção/Histórico (seção 29 do prompt original), usando SquadUI.

Cada bloco é isolado e revertível — não iniciar o bloco N+1 sem o critério de aceite do bloco N fechado (mesmo princípio já usado no plano do SquadWise).

---

## Próximo passo

Bloco 0 é o próximo passo concreto: sanear o schema do Board. Antes de escrever essa migration, preciso confirmar o nome exato/colunas atuais de cada uma das 9 tabelas do Board direto em produção (via Supabase Studio ou uma leitura de `information_schema`), já que nenhuma delas tem `CREATE TABLE` completo em nenhum arquivo do repositório — o que existe hoje em `modules/squadboard/sql/*.sql` cobre só 3 das 9.
