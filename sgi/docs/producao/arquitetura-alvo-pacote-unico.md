# Arquitetura alvo — Pacote de Trabalho único com contextos por módulo

> Documento de arquitetura, não de implementação. Nenhuma migration foi criada a partir deste documento. Constrói em cima de dois documentos anteriores: `docs/producao/auditoria-pacotes-compras-producao.md` (auditoria do legado) e `docs/wise-fase2-obras-lotes.md` (o que uma sessão paralela já implementou nas migrations `20260716000007-010`, hoje em produção). Não repete o que já foi auditado — só reconcilia e estende.

---

## 0. Reconciliação com o que já está em produção

Antes de propor qualquer tabela nova, este documento resolve um conflito real entre o que o usuário pediu agora e o que já foi implementado por outra sessão:

**O que já existe** (`lotes_obra`, estendida pelas migrations 008/010, com UI em `lote-detalhe.tsx`):
- Campos institucionais: `status` (RASCUNHO/ATIVO/SUSPENSO/CONCLUIDO/CANCELADO), `codigo`, `revisao`, `empresa_id`.
- Campos de **portão de liberação**: `etapa` (configuracao→compras→producao→entrega→concluido), `liberado_compras`, `liberado_producao`, `tipo_producao`.
- `wise_pacote_modulos` (módulos participantes), `wise_pacote_escopo_estrutura`/`wise_pacote_escopo_tipologias` (escopo físico), `wise_eventos` (write-only, publica `wise.work_package.*`, nada consome ainda — mesmo padrão write-only já flagueado em `eventos_dominio`).

**Decisão de reconciliação (confirmada com o usuário)**: `etapa`/`liberado_compras`/`liberado_producao` **continuam no Wise** — não são "status operacional detalhado", são **portões institucionais**: o Wise decide *quando* cada etapa pode começar, não *como* ela está andando. Essa distinção é o que separa este campo de, por exemplo, `RECEBIMENTO_PARCIAL` (isso sim é operacional, granular, e pertence ao contexto de Compras do Frame).

Ou seja, o modelo final não é "Wise só tem status binário simples" — é:

```
Wise (lotes_obra)                    Frame/Stock/Flow (contexto por módulo)
─────────────────────                ──────────────────────────────────────
status institucional                 status operacional detalhado
(RASCUNHO/ATIVO/...)                 (SEM_NECESSIDADES/COMPRA_PARCIAL/...)

etapa + liberado_*                   cobertura, bloqueios, responsável
(portão: "pode começar?")            (o que está de fato acontecendo)
```

Nada do que já foi entregue precisa ser revertido. O que falta é construir os contextos operacionais por módulo — que hoje **não existem em lugar nenhum** (confirmado na auditoria anterior).

---

## 1. Modelo de domínio (alvo)

| Camada | Dono | Já existe? |
|---|---|---|
| Pacote de Trabalho (institucional + portões) | Wise (`lotes_obra`) | **Sim** — migrations 008/010 |
| Contexto de Compras | Frame | **Não** |
| Necessidade de Material | Frame | **Não** |
| Alocação de item↔pacote | Frame | **Não** |
| Contexto de Estoque | Stock | **Não** (Stock nem existe como módulo ainda) |
| Contexto de Produção | Flow | **Não** (Flow nem existe como módulo ainda) |
| Ordem de Produção | Flow | **Não** |
| Pipeline visual | Board | **Sim, parcial** — `pacote_pipeline_status` só cobre `engenharia`/`compras`/`producao` (falta `estoque`) |

---

## 2. Matriz de responsabilidade (final)

| Entidade | Fonte de verdade |
|---|---|
| Obra | Wise (`obras`, já compartilhada com Frame) |
| Pacote de Trabalho (institucional + portões) | Wise (`lotes_obra`) |
| Tipologia / escopo | Wise (`tipologias_obra`, `wise_pacote_escopo_*`) |
| Contexto de Compras + necessidades + alocação | Frame |
| Solicitação / Pedido / Recebimento | Frame (já existente) |
| Contexto de Estoque | Stock (futuro) |
| Contexto de Produção + Ordens de Produção | Flow (futuro) |
| Pipeline visual (coluna/ordem por setor) | Board (`pacote_pipeline_status`, já existente) |

Nenhum módulo escreve em tabela de domínio de outro — o Frame nunca escreve em `lotes_obra` além dos campos que já escrevia antes (nome, responsável, prazo, prioridade); quem passa a controlar `status`/`etapa`/`liberado_*` é o Wise.

---

## 3. Modelo de dados — só o que falta construir

### 3.1 `frame_pacote_compras` (contexto de Compras)

```sql
CREATE TABLE frame_pacote_compras (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id            uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  responsavel_id       uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  status_suprimentos   text NOT NULL DEFAULT 'SEM_NECESSIDADES'
    CHECK (status_suprimentos IN (
      'SEM_NECESSIDADES','LISTA_EM_ELABORACAO','AGUARDANDO_LIBERACAO',
      'PENDENTE_DE_COMPRA','COMPRA_PARCIAL','PEDIDOS_EMITIDOS',
      'RECEBIMENTO_PARCIAL','MATERIAL_DISPONIVEL','BLOQUEADO'
    )),
  bloqueado            boolean NOT NULL DEFAULT false,
  motivo_bloqueio      text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pacote_id)
);
```
- `status_suprimentos`: `SEM_NECESSIDADES`/`LISTA_EM_ELABORACAO`/`AGUARDANDO_LIBERACAO` são manuais (dependem de ação humana em Engenharia/Compras); `PENDENTE_DE_COMPRA`/`COMPRA_PARCIAL`/`PEDIDOS_EMITIDOS`/`RECEBIMENTO_PARCIAL`/`MATERIAL_DISPONIVEL` são **calculados** a partir de `frame_pacote_necessidades` + pedidos + recebimentos (nunca escritos manualmente); `BLOQUEADO` é manual (motivo obrigatório).
- 1 linha por pacote (`UNIQUE(pacote_id)`) — criada de forma idempotente quando o pacote é ativado no Wise e `frame` está entre os módulos participantes (`wise_pacote_modulos`).

### 3.2 `frame_pacote_necessidades`

```sql
CREATE TABLE frame_pacote_necessidades (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id             uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  tipologia_id          uuid REFERENCES tipologias_obra(id) ON DELETE SET NULL,
  descricao_livre       text,
  quantidade_necessaria numeric(12,3) NOT NULL,
  unidade               text NOT NULL,
  criticidade           text NOT NULL DEFAULT 'NORMAL' CHECK (criticidade IN ('BAIXA','NORMAL','ALTA','BLOQUEANTE')),
  etapa_necessaria       text CHECK (etapa_necessaria IN ('corte','usinagem','montagem','vedacao','vidro','expedicao')),
  status                text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','SOLICITADO','PEDIDO','RECEBIDO_PARCIAL','ATENDIDO','CANCELADO')),
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT necessidade_descricao_check CHECK (tipologia_id IS NOT NULL OR descricao_livre IS NOT NULL)
);
CREATE INDEX ON frame_pacote_necessidades (pacote_id);
```
- Referencia `tipologia_id` quando dá pra amarrar numa tipologia específica (`tipologias_obra`, que — conforme a auditoria anterior — representa a esquadria pronta, não o material; a necessidade é o material que aquela tipologia consome), com fallback pra `descricao_livre` quando não há amarração direta.
- `status` é **calculado** a partir de solicitações/pedidos/recebimentos vinculados (via 3.3), nunca escrito manualmente exceto `CANCELADO`.

### 3.3 Alocação item↔pacote (rateio opcional, decisão já confirmada na auditoria anterior)

```sql
CREATE TABLE pedido_item_pacotes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id        uuid NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  pacote_id             uuid NOT NULL REFERENCES lotes_obra(id) ON DELETE CASCADE,
  necessidade_id        uuid REFERENCES frame_pacote_necessidades(id) ON DELETE SET NULL,
  quantidade_destinada  numeric(12,3) NOT NULL CHECK (quantidade_destinada > 0),
  criado_em             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_item_id, pacote_id)
);
CREATE INDEX ON pedido_item_pacotes (pacote_id);
CREATE INDEX ON pedido_item_pacotes (pedido_item_id);
```
- **Sempre existe pelo menos 1 linha por item vinculado a pacote** — mesmo no caso comum (1 item → 1 pacote), é 1 linha aqui, não um campo solto no item. Única fonte de verdade pra "quanto desse item vai pra qual pacote" (resolve o problema #3/Alto da auditoria anterior).
- `solicitacoes_compra.lote_id`/`pedidos_compra.lote_id` (cabeçalho, já existentes) passam a ser **apenas conveniência de UI/filtro** (ex: "pedido nasceu já filtrado por este pacote"), não mais a fonte de verdade de vínculo — essa migra pra cá. Não removidos, só reclassificados.
- Um `CHECK` a nível de aplicação (não de banco, pela complexidade de somar em trigger) garante que `SUM(quantidade_destinada)` por `pedido_item_id` não excede `pedido_itens.quantidade_pedida` — validado no `service.ts`, não no banco (mesmo padrão de validação de negócio já usado em `registrar_recebimento`).

### 3.4 Estoque e Produção — só o esqueleto (módulos ainda não existem)

`stock_pacote_abastecimento` e `flow_pacote_producao`/`flow_ordens_producao` seguem exatamente o desenho já proposto nas seções 8-12 do prompt do usuário — não repetido aqui porque **Stock e Flow ainda não são módulos reais no código** (confirmado: nenhum diretório `modules/squadstock`/`modules/squadflow` com conteúdo além de placeholder). Construir essas tabelas antes desses módulos existirem seria especular sobre um schema sem consumidor — ficam desenhadas conceitualmente (idênticas ao prompt original, seções 8 e 11), mas **fora do plano incremental abaixo** até o módulo em si começar a ser implementado.

### 3.5 Pipeline `estoque`

```sql
ALTER TABLE pacote_pipeline_status DROP CONSTRAINT pacote_pipeline_status_pipeline_check;
ALTER TABLE pacote_pipeline_status ADD CONSTRAINT pacote_pipeline_status_pipeline_check
  CHECK (pipeline IN ('engenharia', 'compras', 'estoque', 'producao'));
```
Aditivo — amplia o `CHECK` existente, não recria a tabela. Só vale a pena aplicar quando Stock existir de fato (senão é uma coluna de pipeline vazia sem consumidor).

---

## 4. Eventos

Reaproveitar `wise_eventos` (já existe, já publica `wise.work_package.created`/`.ativo`/etc) em vez de criar um terceiro sistema de eventos — mas **precisa ganhar consumidores reais**, senão repete o mesmo debt write-only já flagueado duas vezes (`eventos_dominio` e agora `wise_eventos`).

| Evento | Produtor | Consumidor | Payload mínimo |
|---|---|---|---|
| `wise.work_package.ativo` (já existe) | Wise | Frame (cria `frame_pacote_compras` se `frame` está em `wise_pacote_modulos`) | `pacote_id`, `modulos` |
| `frame.material_need.created` | Frame | Wise (opcional, só pra timeline) | `pacote_id`, `necessidade_id`, `criticidade` |
| `frame.purchase_item.allocated` | Frame | Frame (recalcula `status_suprimentos`) | `pacote_id`, `pedido_item_id`, `quantidade_destinada` |
| `frame.material.received` | Frame (já teria via `registrar_recebimento`) | Frame (recalcula cobertura) | `pacote_id`, `recebimento_item_id` |

Todos com `idempotency key = (tipo, pacote_id, entidade_id)` — nenhum dos dois sistemas de evento existentes tem isso hoje; é a correção mínima antes de depender de eventos pra recálculo de status (senão um consumidor duplicado recalcula errado).

---

## 5. Plano incremental (substitui a numeração da auditoria anterior — mais específico agora)

Bloco 0 (saneamento do schema do Board) e a Fase 2 de Obras/Lotes **já estão feitos** — não repetidos aqui.

### Bloco A — Contexto de Compras (fundação)
- `frame_pacote_compras` + `frame_pacote_necessidades`, RPC + permissão dedicada (`frame.pacotes.compras.gerenciar`) desde o dia 1.
- Trigger/consumidor de `wise.work_package.ativo`: cria `frame_pacote_compras` idempotente quando `frame` participa.
- Critério de aceite: dado um pacote ativo com `frame` habilitado, existe exatamente 1 linha em `frame_pacote_compras`.

### Bloco B — Alocação por item
- `pedido_item_pacotes`, migrando o vínculo de cabeçalho (`lote_id` em `solicitacoes_compra`/`pedidos_compra`) pra esse novo mecanismo nos itens, sem remover as colunas de cabeçalho (viram metadado de conveniência).
- Critério de aceite: um item de pedido pode ser alocado a 2+ pacotes, e a soma nunca excede a quantidade pedida.

### Bloco C — Cálculo de `status_suprimentos`
- Função (RPC ou trigger) que recalcula `status_suprimentos` a partir de necessidades + alocações + recebimentos.
- Critério de aceite: recebendo parcialmente um pedido alocado a um pacote, `status_suprimentos` muda pra `RECEBIMENTO_PARCIAL` sem intervenção manual.

### Bloco D — Idempotência nos eventos
- Adicionar chave de idempotência em `wise_eventos` e `eventos_dominio`; conectar o primeiro consumidor real (Bloco A já depende disso).

### Bloco E — UI do contexto de Compras no pacote
- Aba "Compras" em `lote-detalhe.tsx` (Wise), como projeção de leitura (mesmo padrão já usado pra pedidos/solicitações nessa tela) — "Abrir no SquadFrame" pra edição, não editável direto no Wise (seção 18/19 do prompt original).

### Fora deste plano (aguardando os módulos existirem)
- Contexto de Estoque, Contexto de Produção, Ordens de Produção — desenhados conceitualmente (seção 3.4), implementados só quando Stock/Flow tiverem o mínimo de módulo real pra sustentar.

---

## 6. Decisões já resolvidas nesta rodada

1. **Portões (`etapa`/`liberado_*`) ficam no Wise** — são institucionais (quando pode começar), não operacionais (como está andando). Nada revertido do que já foi entregue.
2. **Rateio de item entre pacotes: sempre 1 linha em `pedido_item_pacotes`**, mesmo no caso 1:1 — confirmado na auditoria anterior, mantido aqui.
3. **Estoque/Produção ficam fora do plano incremental** até os módulos existirem de fato — evita desenhar schema pra um consumidor que não existe.
