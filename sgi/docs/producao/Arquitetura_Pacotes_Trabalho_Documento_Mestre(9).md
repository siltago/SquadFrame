# Arquitetura Mestre — Pacotes de Trabalho e Contextos Operacionais do SquadSystem

> **Documento vivo de arquitetura e implementação incremental.** Este arquivo será evoluído em etapas, sempre preservando as decisões já validadas. Ele consolida a auditoria do legado, a migração de Obras/Pacotes para o SquadWise e o desenho dos contextos de Compras, Estoque e Produção.
>
> **Estado atual:** Etapa 9 concluída — estratégia de qualidade, testes, observabilidade, performance, recuperação e critérios objetivos de go/no-go definida. A Etapa 10 continua em elaboração e nenhuma migration deve ser gerada a partir dela antes da respectiva validação.

---

## Controle do documento

| Campo | Valor |
|---|---|
| Documento | Arquitetura Mestre de Pacotes de Trabalho |
| Fonte institucional | SquadWise |
| Módulos consumidores | SquadFrame, SquadBoard, SquadStock, SquadFlow e SquadMeasure |
| Natureza | Arquitetura, domínio, migração e critérios de implementação |
| Estratégia | Evolução incremental do mesmo documento |
| Regra de implementação | Nenhuma migration deve ser gerada a partir de uma seção ainda marcada como **Em elaboração** |

### Documentos de origem consolidados

Este documento nasce da combinação de três frentes já auditadas:

1. Auditoria do legado de pacotes, compras e produção.
2. Implementação de Obras, escopo e Pacotes de Trabalho no SquadWise.
3. Arquitetura de pacote único com contextos operacionais por módulo.

O documento não deve repetir decisões conflitantes. Quando houver divergência, prevalecem as decisões consolidadas nesta Parte I.

---

# Plano de construção do documento

O documento será desenvolvido nas etapas abaixo. Cada etapa será incorporada neste mesmo arquivo e passará por revisão antes da próxima.

| Etapa | Conteúdo | Estado |
|---:|---|---|
| 1 | Fundamentos, glossário, fontes de verdade, limites e invariantes | **Concluída** |
| 2 | Modelo de Compras: contexto, necessidades, catálogo, revisões e tipologias | **Concluída** |
| 3 | Alocação de solicitações, pedidos e recebimentos entre pacotes | **Concluída** |
| 4 | Cobertura, estados calculados, bloqueios e portões de liberação | **Concluída** |
| 5 | Eventos, idempotência, reconciliação, auditoria, segurança e permissões | **Concluída** |
| 6 | Contratos internos, Services, Repositories, RPCs e arquitetura de código | **Concluída** |
| 7 | UI/UX do pacote e contexto de Compras seguindo integralmente o SquadUI | **Concluída** |
| 8 | Migração do legado, backfill, compatibilidade, rollback e reconciliação | **Concluída** |
| 9 | Testes, observabilidade, performance e critérios de aceite | **Concluída** |
| 10 | **Expansão operacional: SquadStock, SquadFlow e Ordens de Produção** | Pendente |

### Convenção de numeração

Neste documento, **Etapa** identifica uma fase do plano de construção apresentado na tabela acima. Já **Parte**, **seção** e **apêndice** identificam apenas a organização interna do texto.

Portanto:

- **Etapa 10** é exclusivamente a expansão operacional para SquadStock, SquadFlow e Ordens de Produção;
- os conteúdos preliminares preservados na Parte II não utilizam mais numeração que possa ser confundida com as etapas;
- a antiga seção `10. Eventos preliminares` foi reclassificada como **Apêndice Técnico B**.

### Regra de avanço

Uma etapa só é considerada concluída quando:

- suas decisões não contradizem as etapas anteriores;
- o proprietário de cada dado está explícito;
- estados persistidos e estados calculados estão separados;
- integrações possuem estratégia de falha e reconciliação;
- o desenho não cria uma segunda fonte de verdade;
- critérios de aceite objetivos estão definidos.

---

# Parte I — Fundamentos arquiteturais

## 1. Visão executiva

A arquitetura definitiva do SquadSystem parte de uma entidade canônica:

> **A Obra e o Pacote de Trabalho pertencem ao SquadWise. Cada módulo especializado cria apenas o seu contexto operacional, sempre referenciando o mesmo `pacote_id`.**

O Pacote de Trabalho é uma divisão oficial do escopo da obra. Ele não é um card, um pedido, uma ordem de produção ou um lote físico. Ele existe antes dessas operações e fornece o eixo comum de rastreabilidade.

```text
SquadWise
└── Obra
    └── Pacote de Trabalho
        ├── Contexto de Engenharia / acompanhamento
        ├── Contexto de Compras no SquadFrame
        ├── Contexto de Abastecimento no SquadStock
        ├── Contexto de Produção no SquadFlow
        ├── Pipeline visual no SquadBoard
        └── Registros relacionados no SquadMeasure
```

Nenhum módulo cria uma cópia independente do pacote. Os contextos possuem autonomia operacional, mas compartilham a mesma identidade institucional.

---

## 2. Reconciliação com o que já está em produção

O pacote canônico já existe fisicamente em `lotes_obra` e foi evoluído para atender ao domínio do SquadWise. A tabela mantém o nome legado por compatibilidade, mas seu significado atual é **Pacote de Trabalho**.

Já estão presentes:

- `status` institucional: `RASCUNHO`, `ATIVO`, `SUSPENSO`, `CONCLUIDO`, `CANCELADO`;
- `codigo` e `revisao`;
- vínculo com empresa e obra;
- escopo físico e tipologias;
- módulos participantes;
- `etapa`, `liberado_compras`, `liberado_producao` e `tipo_producao`;
- eventos institucionais `wise.work_package.*`;
- visualização no detalhe do pacote.

### Decisão consolidada sobre portões

Os campos abaixo permanecem no Wise:

```text
etapa
liberado_compras
liberado_producao
```

Eles são **portões institucionais**, não estados operacionais detalhados.

```text
Wise                                Módulos operacionais
────────────────────────────        ──────────────────────────────
Pode Compras começar?               Como Compras está andando?
Pode Produção começar?              Quanto foi pedido/recebido?
Qual macroetapa foi autorizada?     Qual ordem está bloqueada?
```

Exemplo válido:

```text
Wise:
liberado_compras = true
liberado_producao = false

Frame:
status_suprimentos_calculado = RECEBIMENTO_PARCIAL

Flow:
prontidao = AGUARDANDO_MATERIAL_CRITICO
```

Não existe conflito porque cada camada responde a uma pergunta diferente.

---

## 3. Invariantes arquiteturais

As regras abaixo são obrigatórias e não devem ser alteradas por decisões locais de implementação.

### 3.1 Um único pacote canônico

Só existe um Pacote de Trabalho institucional. Frame, Board, Stock, Flow e Measure não criam pacotes paralelos.

### 3.2 Contexto não é cópia

Um contexto de Compras ou Produção armazena somente dados próprios do módulo:

- responsável setorial;
- bloqueios operacionais;
- prazos específicos;
- métricas e estados do domínio;
- operações pertencentes ao módulo.

Ele não replica nome, código, obra, escopo ou tipologias como fonte oficial.

### 3.3 Wise define; módulos executam

O Wise controla:

- obra;
- pacote;
- escopo;
- tipologias da obra;
- módulos participantes;
- status institucional;
- portões de liberação.

Os módulos controlam suas próprias transações.

### 3.4 Nenhum módulo escreve no domínio de outro

O Frame não altera reservas do Stock. O Stock não altera pedidos do Frame. O Board não se torna proprietário da Ordem de Produção. O Wise não edita o andamento operacional detalhado dos módulos.

### 3.5 Métrica derivável não deve nascer como fonte manual

Cobertura solicitada, pedida, recebida, disponível e reservada devem ser calculadas a partir das transações que as originam. Uma tabela-resumo só poderá ser introduzida posteriormente como projeção/materialização, nunca como segunda fonte de verdade.

### 3.6 Evento não é a única garantia

Eventos aceleram integração, mas todo consumidor crítico deve possuir operação idempotente de reconciliação, por exemplo:

```text
ensureFramePackageContext(pacoteId)
```

Se o evento falhar, a abertura, sincronização ou rotina de reconciliação deve restaurar o estado esperado.

### 3.7 Catálogo é a referência padrão

Necessidades de material devem apontar preferencialmente para o item mestre do catálogo. `descricao_livre` é exceção controlada para itens extraordinários, serviços específicos ou transição do legado.

### 3.8 Pedido e recebimento possuem alocações diferentes

Saber que 120 unidades foram compradas para um pacote não prova que 120 foram recebidas para ele. A arquitetura deve separar:

```text
frame_pedido_item_alocacoes
frame_recebimento_item_alocacoes
```

### 3.9 Tipologia não é necessidade de material

`tipologias_obra` representa o objeto final de engenharia/produção. Necessidade de material representa os recursos necessários para produzir uma ou várias tipologias.

### 3.10 Legado é compatibilidade temporária

Campos e tabelas existentes podem continuar durante a migração, mas nenhum mecanismo legado pode permanecer indefinidamente como fonte concorrente.

---

## 4. Glossário oficial

### Obra

Entidade mestre institucional, pertencente ao SquadWise. É compartilhada por todos os módulos.

### Pacote de Trabalho

Agrupamento oficial de escopo de uma obra. Pode abranger torres, blocos, pavimentos, fachadas e tipologias. Fisicamente, continua representado por `lotes_obra` enquanto o nome legado for necessário.

### Contexto de Compras

Extensão operacional do pacote no SquadFrame. Controla necessidade, aquisição e recebimento, sem duplicar o pacote.

### Necessidade de Material

Demanda de material ou serviço vinculada ao pacote. Pode ser originada por uma ou várias tipologias, uma revisão de engenharia ou uma necessidade extraordinária.

### Alocação de Pedido

Distribuição da quantidade de um item de pedido entre um ou mais pacotes e, quando aplicável, entre necessidades específicas.

### Alocação de Recebimento

Distribuição da quantidade efetivamente recebida entre as alocações de pedido/pacotes. Não deve ser inferida automaticamente sem regra explícita.

### Contexto de Estoque

Visão operacional futura do SquadStock, responsável por saldo, disponibilidade, reserva, separação, transferência e consumo relacionados ao pacote.

### Contexto de Produção

Visão agregada futura do SquadFlow, responsável por prontidão, planejamento, bloqueios e progresso produtivo do pacote.

### Ordem de Produção

Autorização operacional do Flow para fabricar determinado escopo. Um pacote pode gerar nenhuma, uma ou várias ordens.

### Pipeline visual

Representação do andamento no SquadBoard. Não substitui a fonte transacional dos módulos.

### Portão institucional

Autorização macro controlada pelo Wise, como `liberado_compras` ou `liberado_producao`.

### Estado operacional

Resultado detalhado do módulo, como `RECEBIMENTO_PARCIAL`, `RESERVA_PARCIAL` ou `EM_PRODUCAO`.

---

## 5. Fontes de verdade

| Entidade ou informação | Proprietário | Observação |
|---|---|---|
| Obra | SquadWise | Cadastro institucional compartilhado |
| Pacote de Trabalho | SquadWise | `lotes_obra` como implementação física atual |
| Escopo e tipologias | SquadWise | Estrutura oficial do pacote |
| Módulos participantes | SquadWise | Define quais contextos podem existir |
| Portões institucionais | SquadWise | Autoriza macroetapas |
| Contexto de Compras | SquadFrame | 1 por pacote participante do Frame |
| Necessidades de material | SquadFrame | Demanda de suprimentos |
| Solicitações, pedidos e recebimentos | SquadFrame | Transações de compra |
| Alocações de pedido e recebimento | SquadFrame | Rastreabilidade quantitativa por pacote |
| Saldo, disponibilidade e reservas | SquadStock | Não criar substituto no Frame |
| Contexto produtivo e Ordens de Produção | SquadFlow | Não pertencem ao Wise ou Board |
| Coluna e ordenação visual | SquadBoard | Somente projeção operacional |
| Medições, fotos e levantamentos | SquadMeasure | Referenciam obra/pacote |

---

## 6. Modelo de relação entre Compras e Produção

Compras e Produção não recebem cópias do pacote. Elas se relacionam com o mesmo pacote por contextos independentes.

```text
Pacote PAT-001
│
├── Frame — Contexto de Compras
│   ├── necessidades
│   ├── solicitações
│   ├── pedidos
│   ├── alocações de pedido
│   ├── recebimentos
│   └── alocações de recebimento
│
├── Stock — Contexto de Abastecimento
│   ├── disponibilidade
│   ├── reservas
│   ├── separação
│   └── consumo
│
└── Flow — Contexto de Produção
    ├── prontidão
    ├── Ordens de Produção
    ├── apontamentos
    └── bloqueios
```

### Exemplo de independência

```text
PAT-001 — ATIVO

Wise:
Compras autorizada
Produção ainda não autorizada

Frame:
Compra 100% pedida
Recebimento 60%

Stock:
40% reservado

Flow:
Planejamento criado
Aguardando material bloqueante
```

Nenhum desses estados deve sobrescrever os demais.

---

## 7. Fronteiras e itens fora de escopo imediato

A primeira implementação operacional deve concentrar-se no contexto de Compras. Não devem ser criadas prematuramente tabelas completas de Stock ou Flow enquanto esses módulos não tiverem serviços e consumidores reais.

Ficam fora da primeira entrega:

- reservas reais de estoque;
- consumo produtivo;
- roteiro de produção completo;
- apontamentos de máquina;
- lote físico de fabricação;
- expedição;
- integração com hardware;
- cálculo automático de materiais a partir de composição técnica ainda inexistente.

Entretanto, o modelo de Compras deve deixar contratos claros para essas extensões futuras.

---

## 8. Resultado esperado ao concluir todas as etapas

O fluxo consolidado deverá ser rastreável de ponta a ponta:

```text
Obra
→ Pacote de Trabalho
→ Revisão / origem de engenharia
→ Necessidade de Material
→ Solicitação
→ Pedido
→ Alocação do item pedido
→ Recebimento
→ Alocação do item recebido
→ Disponibilidade no Stock
→ Reserva
→ Prontidão
→ Ordem de Produção
→ Produção e consumo
```

Cada seta deverá possuir proprietário, regra, histórico, permissão e estratégia de reconciliação.

---

# Parte II — Base técnica existente a refinar

> As seções abaixo foram preservadas do documento anterior como registro da evolução arquitetural. Os modelos preliminares de `frame_pacote_compras` e `frame_pacote_necessidades` foram **substituídos pelas definições das seções 13 e 14**. O modelo preliminar de `pedido_item_pacotes` foi **substituído pela cadeia de alocações da seção 15**. Cobertura e eventos ainda serão refinados nas Etapas 4 e 5.

## Apêndice Técnico A — Modelo de dados preliminar sujeito a refinamento

### A.1 `frame_pacote_compras` — contexto de Compras

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

### A.2 `frame_pacote_necessidades`

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

### A.3 Alocação item↔pacote — rateio opcional preservado como referência histórica

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

### A.4 Estoque e Produção — esqueleto preliminar

`stock_pacote_abastecimento` e `flow_pacote_producao`/`flow_ordens_producao` seguem exatamente o desenho já proposto nas seções 8-12 do prompt do usuário — não repetido aqui porque **Stock e Flow ainda não são módulos reais no código** (confirmado: nenhum diretório `modules/squadstock`/`modules/squadflow` com conteúdo além de placeholder). Construir essas tabelas antes desses módulos existirem seria especular sobre um schema sem consumidor — ficam desenhadas conceitualmente (idênticas ao prompt original, seções 8 e 11), mas **fora do plano incremental abaixo** até o módulo em si começar a ser implementado.

### A.5 Pipeline `estoque`

```sql
ALTER TABLE pacote_pipeline_status DROP CONSTRAINT pacote_pipeline_status_pipeline_check;
ALTER TABLE pacote_pipeline_status ADD CONSTRAINT pacote_pipeline_status_pipeline_check
  CHECK (pipeline IN ('engenharia', 'compras', 'estoque', 'producao'));
```
Aditivo — amplia o `CHECK` existente, não recria a tabela. Só vale a pena aplicar quando Stock existir de fato (senão é uma coluna de pipeline vazia sem consumidor).

---

## Apêndice Técnico B — Eventos preliminares

Reaproveitar `wise_eventos` (já existe, já publica `wise.work_package.created`/`.ativo`/etc) em vez de criar um terceiro sistema de eventos — mas **precisa ganhar consumidores reais**, senão repete o mesmo debt write-only já flagueado duas vezes (`eventos_dominio` e agora `wise_eventos`).

| Evento | Produtor | Consumidor | Payload mínimo |
|---|---|---|---|
| `wise.work_package.ativo` (já existe) | Wise | Frame (cria `frame_pacote_compras` se `frame` está em `wise_pacote_modulos`) | `pacote_id`, `modulos` |
| `frame.material_need.created` | Frame | Wise (opcional, só pra timeline) | `pacote_id`, `necessidade_id`, `criticidade` |
| `frame.purchase_item.allocated` | Frame | Frame (recalcula `status_suprimentos`) | `pacote_id`, `pedido_item_id`, `quantidade_destinada` |
| `frame.material.received` | Frame (já teria via `registrar_recebimento`) | Frame (recalcula cobertura) | `pacote_id`, `recebimento_item_id` |

Todos com `idempotency key = (tipo, pacote_id, entidade_id)` — nenhum dos dois sistemas de evento existentes tem isso hoje; é a correção mínima antes de depender de eventos pra recálculo de status (senão um consumidor duplicado recalcula errado).

---

## Apêndice Técnico C — Plano incremental preliminar

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

## Apêndice Técnico D — Decisões técnicas herdadas

1. **Portões (`etapa`/`liberado_*`) ficam no Wise** — são institucionais (quando pode começar), não operacionais (como está andando). Nada revertido do que já foi entregue.
2. **Decisão histórica de rateio:** o rascunho `pedido_item_pacotes` foi substituído na Etapa 3 pela cadeia definitiva `frame_solicitacao_item_alocacoes` → `frame_pedido_item_alocacoes` → `frame_recebimento_item_alocacoes`, ancorada na necessidade.
3. **Estoque/Produção ficam fora do plano incremental** até os módulos existirem de fato — evita desenhar schema pra um consumidor que não existe.


---

# Parte III — Definições definitivas construídas por etapa

## 13. Modelo definitivo do contexto de Compras

**Estado:** Concluído — Etapa 2.

### 13.1 Finalidade do contexto

O Contexto de Compras é a extensão operacional criada pelo SquadFrame para um Pacote de Trabalho que tenha o módulo Frame habilitado em `wise_pacote_modulos`.

Ele existe para responder perguntas administrativas e operacionais do domínio de suprimentos, sem replicar os dados institucionais do pacote:

- quem responde pelas compras daquele pacote;
- qual é o prazo setorial;
- existe bloqueio manual;
- qual Lista de Materiais está vigente;
- quais necessidades estão ativas;
- quais solicitações, pedidos e recebimentos atendem essas necessidades;
- qual é a situação calculada de suprimentos.

O contexto **não copia**:

- código ou nome do pacote;
- obra;
- escopo físico;
- tipologias oficiais;
- prioridade institucional;
- módulos participantes;
- portões `liberado_compras` e `liberado_producao`.

Essas informações continuam sendo lidas do SquadWise.

### 13.2 Agregado de domínio

O agregado de Compras é organizado da seguinte forma:

```text
Pacote de Trabalho — Wise
└── Contexto de Compras — Frame
    ├── Listas de Materiais
    │   └── Necessidades de Material
    │       └── Vínculos com Tipologias
    ├── Solicitações e seus itens
    ├── Pedidos e seus itens
    ├── Alocações de pedido por pacote/necessidade
    ├── Recebimentos
    ├── Alocações de recebimento
    └── Projeção calculada de cobertura e situação
```

A raiz operacional é `frame_pacote_compras`. As Listas de Materiais são versionadas e cada necessidade pertence a uma lista específica.

### 13.3 Tabela `frame_pacote_compras`

A tabela deve persistir apenas informações que não podem ser reconstruídas a partir de outras transações.

Modelo lógico definitivo:

```sql
CREATE TABLE frame_pacote_compras (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id             uuid NOT NULL,
  responsavel_id        uuid,
  prazo_alvo            date,
  bloqueado             boolean NOT NULL DEFAULT false,
  motivo_bloqueio       text,
  bloqueado_por         uuid,
  bloqueado_em          timestamptz,
  observacoes           text,
  criado_por            uuid NOT NULL,
  atualizado_por        uuid,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT frame_pacote_compras_pacote_uk UNIQUE (pacote_id),
  CONSTRAINT frame_pacote_compras_bloqueio_ck CHECK (
    (bloqueado = false AND motivo_bloqueio IS NULL AND bloqueado_por IS NULL AND bloqueado_em IS NULL)
    OR
    (bloqueado = true AND motivo_bloqueio IS NOT NULL AND bloqueado_por IS NOT NULL AND bloqueado_em IS NOT NULL)
  )
);
```

As FKs concretas deverão ser resolvidas na migration contra os nomes reais do schema vigente:

- `pacote_id` → `lotes_obra.id`;
- `responsavel_id`, `bloqueado_por`, `criado_por`, `atualizado_por` → identidade/usuário vigente.

#### Decisão sobre exclusão

A FK de `pacote_id` não deve utilizar `ON DELETE CASCADE` como regra geral.

A política definitiva é:

- pacote em rascunho e sem operações pode ser removido por fluxo controlado;
- pacote ativado, com lista liberada, solicitação, pedido ou recebimento não deve sofrer exclusão física;
- cancelamento e encerramento devem preservar o histórico;
- a implementação deverá preferir `ON DELETE RESTRICT` e uma operação de domínio para exclusão de rascunhos.

Isso impede que a exclusão de um pacote apague silenciosamente o histórico de Compras.

### 13.4 Dados que não serão persistidos no contexto

Os campos abaixo não devem existir como valores editáveis em `frame_pacote_compras`:

```text
status_suprimentos
cobertura_solicitada
cobertura_pedida
cobertura_recebida
cobertura_disponivel
quantidade_faltante
```

Eles serão calculados por consulta, view ou serviço de leitura a partir das necessidades e das transações reais.

Caso o cálculo se torne custoso, poderá ser adicionada uma projeção materializada ou tabela-resumo atualizada por eventos. Essa projeção nunca substituirá as transações como fonte de verdade.

### 13.5 Criação idempotente

O contexto deve ser criado por uma operação idempotente:

```text
ensureFramePackageContext(pacoteId)
```

Regras:

1. verificar se o pacote existe;
2. verificar se o pacote possui o módulo Frame habilitado;
3. verificar a permissão do chamador;
4. retornar o contexto existente, se já houver;
5. criar exatamente um contexto, se ainda não houver;
6. suportar concorrência através de `UNIQUE (pacote_id)` e tratamento de conflito;
7. registrar auditoria e evento somente quando houver criação real.

O consumidor de `wise.work_package.ativo` poderá chamar essa operação, mas o evento não será a única forma de garantia.

A mesma operação deverá ser utilizada por:

- ativação do pacote;
- abertura do pacote no Frame;
- rotina de reconciliação;
- backfill de pacotes legados;
- reparo administrativo.

### 13.6 Condições para existência

Um contexto de Compras pode existir quando:

- o pacote possui o módulo Frame habilitado;
- o pacote está em `RASCUNHO`, `ATIVO` ou `SUSPENSO`, conforme a operação;
- o pacote ainda não está fisicamente excluído;
- a empresa, obra e pacote pertencem ao mesmo tenant resolvido.

O contexto poderá ser preparado enquanto `liberado_compras = false`. Nesse estado, Compras pode organizar responsáveis, revisar a lista e preparar o planejamento, mas não deve emitir operações transacionais bloqueadas pelo portão institucional.

### 13.7 Portão de Compras

O campo `lotes_obra.liberado_compras` continua sendo controlado pelo Wise.

O comportamento esperado é:

```text
liberado_compras = false
├── criar contexto: permitido
├── elaborar lista: permitido
├── revisar lista: permitido
├── simular cobertura: permitido
├── criar solicitação efetiva: bloqueado
├── aprovar solicitação: bloqueado
└── emitir pedido vinculado ao pacote: bloqueado
```

```text
liberado_compras = true
└── operações transacionais seguem permissões e regras normais do Frame
```

A liberação institucional não substitui aprovação de solicitação ou pedido. Ela apenas abre a possibilidade de iniciar o processo.

### 13.8 Bloqueios manuais

O bloqueio do contexto é uma decisão operacional humana e exige:

- motivo obrigatório;
- usuário responsável pelo bloqueio;
- timestamp;
- auditoria;
- permissão específica;
- operação explícita de desbloqueio.

Exemplos:

- documentação inconsistente;
- fornecedor impedido;
- revisão sob contestação;
- decisão gerencial;
- divergência de especificação.

O bloqueio manual não deve apagar o status calculado. A leitura consolidada poderá mostrar:

```text
Situação calculada: PEDIDOS_EMITIDOS
Bloqueio manual: SIM
Motivo: revisão de acabamento em análise
```

### 13.9 Lista de Materiais como entidade versionada

As necessidades não devem ficar soltas diretamente no contexto. Elas pertencem a uma Lista de Materiais vinculada a uma revisão do pacote.

Modelo lógico:

```sql
CREATE TABLE frame_pacote_listas_materiais (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contexto_compras_id   uuid NOT NULL,
  revisao_pacote_id     uuid,
  numero                integer NOT NULL,
  status                text NOT NULL DEFAULT 'RASCUNHO',
  origem                text NOT NULL DEFAULT 'MANUAL',
  descricao             text,
  hash_conteudo         text,
  liberada_por          uuid,
  liberada_em           timestamptz,
  cancelada_por         uuid,
  cancelada_em          timestamptz,
  motivo_cancelamento   text,
  criado_por            uuid NOT NULL,
  atualizado_por        uuid,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT frame_lista_materiais_numero_uk
    UNIQUE (contexto_compras_id, numero),

  CONSTRAINT frame_lista_materiais_status_ck CHECK (
    status IN ('RASCUNHO','EM_REVISAO','LIBERADA','SUBSTITUIDA','CANCELADA')
  ),

  CONSTRAINT frame_lista_materiais_origem_ck CHECK (
    origem IN ('MANUAL','IMPORTACAO','COMPOSICAO','COPIA_REVISAO')
  ),

  CONSTRAINT frame_lista_materiais_liberacao_ck CHECK (
    (status <> 'LIBERADA')
    OR
    (liberada_por IS NOT NULL AND liberada_em IS NOT NULL)
  ),

  CONSTRAINT frame_lista_materiais_cancelamento_ck CHECK (
    (status <> 'CANCELADA')
    OR
    (cancelada_por IS NOT NULL AND cancelada_em IS NOT NULL AND motivo_cancelamento IS NOT NULL)
  )
);
```

O nome concreto da entidade de revisão do Wise será confirmado contra o schema real. Enquanto existir apenas o campo escalar `lotes_obra.revisao`, a implementação poderá utilizar temporariamente:

```text
pacote_id + revisao_numero
```

A arquitetura alvo, entretanto, utiliza uma identidade própria de revisão, descrita na seção 14.5.

### 13.10 Regras da Lista de Materiais

1. Uma lista em `RASCUNHO` pode ser alterada.
2. Uma lista em `EM_REVISAO` pode receber correções controladas, mantendo auditoria.
3. Uma lista `LIBERADA` é imutável.
4. Correções após liberação exigem uma nova lista/revisão.
5. Quando uma nova lista é liberada, a anterior passa para `SUBSTITUIDA`, sem perder vínculos históricos.
6. Uma lista só pode ser cancelada mediante motivo.
7. Itens já utilizados em solicitação, pedido ou recebimento nunca são apagados; permanecem vinculados à revisão que os originou.
8. `hash_conteudo` pode ser utilizado para impedir importações duplicadas.
9. A lista pode ser preparada antes do portão de Compras, mas a criação de transações efetivas respeita `liberado_compras`.
10. O contexto deve possuir no máximo uma lista vigente para operação corrente, sem impedir consulta às anteriores.

### 13.11 Situação consolidada do contexto

A consulta do contexto deverá retornar pelo menos:

```text
pacote
responsavel
prazo_alvo
bloqueio_manual
lista_vigente
revisao_vigente
quantidade_de_necessidades
necessidades_ativas
situacao_suprimentos_calculada
cobertura_solicitada
cobertura_pedida
cobertura_recebida
cobertura_disponivel_futura
pendencias_bloqueantes
ultima_atualizacao_operacional
```

Os cálculos exatos de cobertura e situação serão definidos na Etapa 4.

### 13.12 Estados calculados esperados

A Etapa 2 define apenas o contrato semântico. A fórmula será especificada na Etapa 4.

Estados esperados:

```text
SEM_LISTA
LISTA_EM_ELABORACAO
AGUARDANDO_LIBERACAO_INSTITUCIONAL
PENDENTE_DE_COMPRA
COMPRA_PARCIAL
PEDIDOS_EMITIDOS
RECEBIMENTO_PARCIAL
MATERIAL_RECEBIDO
BLOQUEADO
ENCERRADO
```

`BLOQUEADO` poderá aparecer como sobreposição ao estado calculado, e não necessariamente como substituição destrutiva.

### 13.13 Critérios de aceite do contexto

A modelagem do contexto será considerada válida quando:

- existir no máximo um contexto de Compras por pacote;
- a criação for idempotente;
- pacotes sem Frame habilitado não gerarem contexto;
- o contexto não duplicar dados institucionais;
- o bloqueio exigir motivo e auditoria;
- não houver status de cobertura editável manualmente;
- a lista vigente puder ser identificada sem apagar listas antigas;
- listas liberadas forem imutáveis;
- a exclusão de pacote não apagar histórico operacional;
- o Wise puder exibir o resumo em modo somente leitura;
- o Frame permanecer proprietário das edições operacionais.

---

## 14. Necessidades, catálogo, revisões e tipologias

**Estado:** Concluído — Etapa 2.

### 14.1 Definição da necessidade

Necessidade de Material é uma demanda quantitativa criada para atender um Pacote de Trabalho dentro de uma Lista de Materiais específica.

Ela pode representar:

- material de catálogo;
- componente;
- perfil;
- chapa;
- vidro;
- insumo;
- embalagem;
- serviço comprado;
- item extraordinário ainda não catalogado.

Ela não representa:

- pedido;
- item de estoque;
- reserva;
- recebimento;
- tipologia pronta;
- Ordem de Produção.

### 14.2 Fonte de identidade do item

A referência padrão é o Catálogo Mestre compartilhado pelo SquadWise.

Toda necessidade deverá utilizar uma das duas origens:

```text
CATALOGO
LIVRE
```

#### Origem `CATALOGO`

Utilizada quando o item já existe no catálogo oficial.

A necessidade mantém:

- FK para o item mestre;
- código em snapshot;
- descrição em snapshot;
- unidade em snapshot;
- especificação técnica relevante em snapshot, quando aplicável.

Os snapshots preservam o histórico caso o cadastro mestre seja alterado futuramente.

#### Origem `LIVRE`

Permitida somente para:

- compra extraordinária;
- serviço específico;
- item ainda em processo de cadastro;
- migração do legado;
- situação autorizada por permissão específica.

Um item livre deve possuir descrição e unidade obrigatórias. O sistema deverá oferecer posteriormente a opção de vincular ou promover esse item ao Catálogo Mestre sem alterar o histórico da necessidade original.

### 14.3 Modelo definitivo de `frame_pacote_necessidades`

```sql
CREATE TABLE frame_pacote_necessidades (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_materiais_id         uuid NOT NULL,
  item_catalogo_id           uuid,
  origem_item                text NOT NULL,
  abrangencia                text NOT NULL DEFAULT 'GERAL_PACOTE',
  codigo_item_snapshot       text,
  descricao_snapshot         text NOT NULL,
  unidade_id                 uuid,
  unidade_codigo_snapshot    text NOT NULL,
  quantidade_necessaria      numeric(14,3) NOT NULL,
  criticidade                text NOT NULL DEFAULT 'NORMAL',
  etapa_necessaria           text,
  origem_geracao             text NOT NULL DEFAULT 'MANUAL',
  estado_administrativo      text NOT NULL DEFAULT 'ATIVA',
  substitui_necessidade_id   uuid,
  motivo_cancelamento        text,
  sequencia                  integer NOT NULL DEFAULT 0,
  observacoes                text,
  criado_por                 uuid NOT NULL,
  atualizado_por             uuid,
  criado_em                  timestamptz NOT NULL DEFAULT now(),
  atualizado_em              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT frame_necessidade_quantidade_ck CHECK (
    quantidade_necessaria > 0
  ),

  CONSTRAINT frame_necessidade_origem_item_ck CHECK (
    origem_item IN ('CATALOGO','LIVRE')
  ),

  CONSTRAINT frame_necessidade_item_ck CHECK (
    (origem_item = 'CATALOGO' AND item_catalogo_id IS NOT NULL)
    OR
    (origem_item = 'LIVRE' AND item_catalogo_id IS NULL)
  ),

  CONSTRAINT frame_necessidade_abrangencia_ck CHECK (
    abrangencia IN ('GERAL_PACOTE','TIPOLOGIAS_ESPECIFICAS','EXTRAORDINARIA')
  ),

  CONSTRAINT frame_necessidade_criticidade_ck CHECK (
    criticidade IN ('BAIXA','NORMAL','ALTA','BLOQUEANTE')
  ),

  CONSTRAINT frame_necessidade_etapa_ck CHECK (
    etapa_necessaria IS NULL
    OR etapa_necessaria IN ('corte','usinagem','montagem','vedacao','vidro','embalagem','expedicao')
  ),

  CONSTRAINT frame_necessidade_origem_geracao_ck CHECK (
    origem_geracao IN ('MANUAL','IMPORTACAO','COMPOSICAO','AJUSTE_REVISAO')
  ),

  CONSTRAINT frame_necessidade_estado_ck CHECK (
    estado_administrativo IN ('ATIVA','CANCELADA','SUBSTITUIDA')
  ),

  CONSTRAINT frame_necessidade_cancelamento_ck CHECK (
    (estado_administrativo <> 'CANCELADA')
    OR motivo_cancelamento IS NOT NULL
  )
);
```

As FKs concretas deverão ligar:

- `lista_materiais_id` → lista versionada;
- `item_catalogo_id` → item mestre real do catálogo;
- `unidade_id` → registry/unidade compartilhada, quando existir;
- `substitui_necessidade_id` → necessidade anterior;
- usuários → estrutura de identidade vigente.

### 14.4 Decisões sobre persistência

A necessidade persiste apenas:

- identidade do item;
- snapshot histórico;
- quantidade exigida pela revisão;
- criticidade;
- etapa em que será necessária;
- abrangência;
- origem da geração;
- estado administrativo;
- autoria e auditoria.

Não persistir diretamente:

```text
quantidade_solicitada
quantidade_pedida
quantidade_recebida
quantidade_disponivel
quantidade_reservada
quantidade_faltante
status_operacional
```

Esses valores serão calculados a partir das alocações e transações reais.

O campo `estado_administrativo` não representa atendimento. Ele serve somente para indicar se a linha continua válida, foi cancelada ou foi substituída por outra necessidade.

### 14.5 Modelo definitivo de revisão do pacote

O campo escalar `lotes_obra.revisao` é insuficiente como fonte histórica definitiva, porque não identifica autoria, publicação, motivo ou conteúdo de cada revisão.

A arquitetura alvo prevê uma entidade institucional no Wise:

```sql
CREATE TABLE wise_pacote_revisoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id             uuid NOT NULL,
  numero                integer NOT NULL,
  status                text NOT NULL DEFAULT 'RASCUNHO',
  descricao             text,
  motivo                text,
  criada_por            uuid NOT NULL,
  publicada_por         uuid,
  publicada_em          timestamptz,
  criada_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wise_pacote_revisoes_numero_uk UNIQUE (pacote_id, numero),

  CONSTRAINT wise_pacote_revisoes_status_ck CHECK (
    status IN ('RASCUNHO','PUBLICADA','SUBSTITUIDA','CANCELADA')
  ),

  CONSTRAINT wise_pacote_revisoes_publicacao_ck CHECK (
    (status <> 'PUBLICADA')
    OR
    (publicada_por IS NOT NULL AND publicada_em IS NOT NULL)
  )
);
```

Regras:

1. revisão publicada é imutável;
2. correção gera nova revisão;
3. `UNIQUE (pacote_id, numero)` impede duplicidade;
4. uma nova revisão publicada pode substituir a anterior sem apagá-la;
5. `lotes_obra.revisao` pode permanecer temporariamente como número corrente de conveniência;
6. a arquitetura definitiva deve preferir `revisao_atual_id` ou projeção equivalente;
7. revisão de pacote e Lista de Materiais não são a mesma entidade, mas a lista referencia a revisão que a originou;
8. publicar uma revisão não autoriza automaticamente Compras;
9. o portão `liberado_compras` continua sendo uma decisão separada.

### 14.6 Relação entre revisão e Lista de Materiais

```text
Pacote PAT-001
├── Revisão 01 — publicada
│   └── Lista de Materiais 01 — substituída
│       └── necessidades históricas
│
└── Revisão 02 — publicada e atual
    └── Lista de Materiais 02 — liberada
        └── necessidades vigentes
```

Uma revisão pode existir sem Lista de Materiais pronta. A lista poderá ser elaborada e revisada antes da liberação para Compras.

O vínculo recomendado é:

```text
frame_pacote_listas_materiais.revisao_pacote_id
→ wise_pacote_revisoes.id
```

### 14.7 Vínculo N:N com tipologias

Uma necessidade pode atender várias tipologias e uma tipologia pode originar várias necessidades.

Exemplo:

```text
500 parafusos
├── J01
├── J02
└── P03
```

Portanto, `tipologia_id` não deve permanecer diretamente como único vínculo dentro de `frame_pacote_necessidades`.

Modelo lógico:

```sql
CREATE TABLE frame_necessidade_tipologias (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  necessidade_id              uuid NOT NULL,
  tipologia_id                uuid NOT NULL,
  quantidade_tipologias       numeric(14,3),
  quantidade_material_atribuida numeric(14,3),
  origem_vinculo              text NOT NULL DEFAULT 'MANUAL',
  observacoes                 text,
  criado_por                  uuid NOT NULL,
  criado_em                   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT frame_necessidade_tipologia_uk
    UNIQUE (necessidade_id, tipologia_id),

  CONSTRAINT frame_necessidade_tipologia_qtd_tip_ck CHECK (
    quantidade_tipologias IS NULL OR quantidade_tipologias > 0
  ),

  CONSTRAINT frame_necessidade_tipologia_qtd_mat_ck CHECK (
    quantidade_material_atribuida IS NULL OR quantidade_material_atribuida > 0
  ),

  CONSTRAINT frame_necessidade_tipologia_origem_ck CHECK (
    origem_vinculo IN ('MANUAL','IMPORTACAO','COMPOSICAO')
  )
);
```

Regras:

- a tipologia vinculada deve pertencer ao escopo do mesmo pacote;
- `TIPOLOGIAS_ESPECIFICAS` exige pelo menos um vínculo ativo;
- `GERAL_PACOTE` pode não possuir vínculos individuais;
- `EXTRAORDINARIA` pode ser desvinculada de tipologias;
- a soma de `quantidade_material_atribuida` não precisa obrigatoriamente ser igual à quantidade total, pois podem existir materiais compartilhados, perdas, embalagens e consumo geral;
- qualquer diferença deve ser visível na interface;
- validações entre pacote, escopo e tipologia devem ocorrer em RPC/Service transacional.

### 14.8 Alterações entre revisões

Uma nova revisão nunca atualiza silenciosamente uma necessidade já utilizada por Compras.

O sistema deverá comparar a lista anterior com a atual e classificar cada linha como:

```text
ADICIONADA
AUMENTADA
REDUZIDA
REMOVIDA
SEM_ALTERACAO
SUBSTITUIDA
```

Exemplo:

```text
Revisão 01: 120 barras
Revisão 02: 135 barras
Delta: +15 barras
```

```text
Revisão 01: 120 barras
Revisão 02: 100 barras
Já pedido: 120 barras
Excedente potencial: 20 barras
```

A comparação deverá considerar, quando possível:

- item do catálogo;
- unidade;
- etapa necessária;
- abrangência;
- tipologias vinculadas;
- substituições explícitas.

O resultado será uma projeção de leitura, não uma coluna manual na necessidade.

### 14.9 Regras para impacto em Compras

Ao liberar uma nova lista:

1. preservar a lista anterior e todos os seus vínculos;
2. marcar a lista anterior como `SUBSTITUIDA`;
3. calcular diferenças;
4. identificar necessidades adicionais;
5. identificar redução ou excesso potencial;
6. não cancelar pedidos automaticamente;
7. não redistribuir recebimentos automaticamente;
8. exigir decisão humana para alterar compras já emitidas;
9. registrar a relação entre necessidade nova e anterior através de `substitui_necessidade_id`, quando aplicável;
10. exibir impacto consolidado antes de confirmar a nova lista.

### 14.10 Importação e composição futura

A arquitetura suporta três formas principais de criação:

#### Manual

Compras ou Engenharia adiciona necessidades linha a linha.

#### Importação

Um arquivo externo gera uma lista em rascunho. A importação deve:

- validar catálogo;
- sugerir correspondências;
- marcar itens livres;
- gerar `hash_conteudo`;
- impedir duplicidade;
- não liberar automaticamente.

#### Composição técnica futura

Uma estrutura de composição poderá gerar necessidades a partir das tipologias e quantidades do pacote.

Essa geração deverá produzir uma lista em rascunho, nunca alterar diretamente uma lista liberada.

### 14.11 Unidades e precisão

As quantidades deverão utilizar precisão suficiente para barras, metros, metros quadrados, quilos, litros, unidades e serviços:

```text
numeric(14,3)
```

A unidade oficial deve vir do Registry/Catálogo quando disponível e ser preservada em snapshot na necessidade.

Não permitir soma ou rateio de quantidades com unidades incompatíveis.

Conversões automáticas só poderão existir quando houver uma tabela oficial de conversão e regra explícita.

### 14.12 Índices mínimos esperados

Na implementação, avaliar no mínimo:

```text
frame_pacote_compras(pacote_id) UNIQUE
frame_pacote_listas_materiais(contexto_compras_id, status)
frame_pacote_listas_materiais(revisao_pacote_id)
frame_pacote_necessidades(lista_materiais_id, estado_administrativo)
frame_pacote_necessidades(item_catalogo_id)
frame_pacote_necessidades(criticidade, etapa_necessaria)
frame_necessidade_tipologias(necessidade_id)
frame_necessidade_tipologias(tipologia_id)
wise_pacote_revisoes(pacote_id, numero) UNIQUE
```

Índices adicionais deverão ser justificados por consultas reais, evitando indexação indiscriminada.

### 14.13 Regras de integridade que exigem Service/RPC

Algumas regras não devem depender apenas de `CHECK` simples:

- pacote possui módulo Frame habilitado;
- tipologia pertence ao mesmo pacote;
- lista pertence ao contexto do pacote correto;
- revisão pertence ao mesmo pacote;
- lista liberada não pode ser alterada;
- só existe uma lista vigente operacionalmente;
- item livre exige permissão específica;
- usuário possui acesso ao tenant e à obra;
- pacote cancelado ou concluído bloqueia novas necessidades;
- nova lista não apaga vínculos anteriores;
- publicação e substituição ocorrem na mesma transação.

Essas regras deverão ser centralizadas em Services/RPCs, detalhados na Etapa 6.

### 14.14 Consultas de leitura necessárias

A camada de leitura deverá oferecer pelo menos:

```text
obterContextoCompras(pacoteId)
listarListasMateriais(pacoteId)
obterListaVigente(pacoteId)
listarNecessidades(listaId)
obterNecessidade(necessidadeId)
compararListas(listaAnteriorId, listaAtualId)
listarTipologiasDaNecessidade(necessidadeId)
listarNecessidadesDaTipologia(tipologiaId)
```

As consultas podem ser implementadas como Services, views ou RPCs conforme o custo e a necessidade de autorização.

### 14.15 Critérios de aceite da Etapa 2

A Etapa 2 é considerada concluída arquiteturalmente quando:

- o contexto de Compras possui responsabilidade clara;
- não há status operacional manual persistido;
- existe uma Lista de Materiais versionada;
- listas liberadas são imutáveis;
- o Catálogo Mestre é a referência padrão;
- itens livres são exceção controlada;
- snapshots preservam o histórico;
- necessidades pertencem a uma lista/revisão;
- a revisão do pacote possui identidade própria na arquitetura alvo;
- uma necessidade pode referenciar várias tipologias;
- uma tipologia pode originar várias necessidades;
- alterações de revisão não sobrescrevem compras existentes;
- deltas entre listas podem ser calculados;
- quantidades transacionais continuam fora da necessidade;
- o desenho está pronto para receber as alocações da Etapa 3.

## 15. Alocação de solicitações, pedidos e recebimentos

**Estado:** Concluído — Etapa 3.

### 15.1 Objetivo da etapa

Esta etapa define como uma Necessidade de Material percorre o processo de Compras sem perder sua ligação com o Pacote de Trabalho que a originou.

O fluxo quantitativo oficial passa a ser:

```text
Pacote de Trabalho
└── Lista de Materiais / revisão
    └── Necessidade de Material
        ├── Alocação em item de solicitação
        ├── Alocação em item de pedido
        └── Alocação em item de recebimento
```

A necessidade é o eixo de rastreabilidade. O pacote é resolvido através do caminho:

```text
necessidade
→ lista de materiais
→ contexto de Compras
→ pacote de trabalho
```

Essa decisão evita manter `pacote_id` e `necessidade_id` como duas fontes concorrentes dentro da mesma alocação.

### 15.2 Princípios obrigatórios

1. Um documento pode conter itens de um pacote, de vários pacotes ou itens gerais sem pacote.
2. Um item de solicitação ou pedido pode atender várias necessidades, inclusive de pacotes diferentes, desde que o item e a unidade sejam compatíveis.
3. Uma necessidade pode ser atendida por várias solicitações, vários pedidos e vários recebimentos.
4. Quantidade solicitada, pedida e recebida são fatos diferentes e não podem ser inferidos uns dos outros.
5. A alocação de recebimento nunca será deduzida automaticamente apenas pela alocação do pedido.
6. O vínculo de cabeçalho `lote_id` permanece temporariamente como contexto de navegação e compatibilidade, não como fonte oficial do rateio.
7. Alocações consolidadas em documentos aprovados, emitidos ou finalizados não são apagadas ou sobrescritas silenciosamente.
8. Realocações posteriores exigem operação de domínio, justificativa, permissão e auditoria.
9. A mesma unidade de medida deve ser utilizada entre necessidade, item e alocação, salvo conversão oficial e explícita.
10. Toda gravação que altera quantidades deve ocorrer de forma transacional e protegida contra concorrência.

### 15.3 Por que a necessidade é a âncora

Um pacote pode possuir várias necessidades do mesmo item.

Exemplo:

```text
PAT-001
├── Necessidade N-001 — Perfil X — corte — 80 barras
└── Necessidade N-002 — Perfil X — montagem — 40 barras
```

Um item de pedido com 120 barras não deve ser vinculado apenas a `PAT-001`, pois isso perderia a origem interna da demanda.

O rateio correto é:

```text
Pedido Item PI-001 — Perfil X — 120 barras
├── N-001 — 80 barras
└── N-002 — 40 barras
```

Como cada necessidade pertence a uma lista e a um contexto, o pacote permanece rastreável sem duplicação de identidade.

### 15.4 Escopos derivados do documento

Solicitações e pedidos poderão ser classificados em leitura como:

```text
GERAL
PACOTE_UNICO
MULTIPACOTE
MISTO
```

Esses valores devem ser derivados das alocações ativas:

- `GERAL`: nenhum item possui alocação a necessidade de pacote;
- `PACOTE_UNICO`: todas as alocações resolvem para o mesmo pacote;
- `MULTIPACOTE`: existem alocações para dois ou mais pacotes e não há parcela geral;
- `MISTO`: existe parcela alocada a pacotes e parcela geral/não alocada.

Não é necessário persistir essa classificação no MVP. Ela pode ser retornada por view ou Service de leitura.

### 15.5 Papel dos campos legados de cabeçalho

Os campos atuais:

```text
solicitacoes_compra.lote_id
pedidos_compra.lote_id
```

passam a ter somente as seguintes funções temporárias:

- abrir o formulário já contextualizado por um pacote;
- facilitar filtros legados;
- permitir backfill progressivo;
- preservar compatibilidade enquanto telas antigas ainda existirem.

Regras de convivência:

1. nenhuma cobertura será calculada pelo `lote_id` do cabeçalho;
2. novas operações devem gravar alocações por item;
3. se todas as alocações resolverem para um único pacote, o cabeçalho poderá manter esse pacote como conveniência;
4. se o documento se tornar multipacote ou misto, o cabeçalho deverá ficar `NULL` ou ser tratado explicitamente como legado não autoritativo;
5. o cabeçalho nunca poderá sobrescrever as alocações existentes;
6. a remoção definitiva desses campos será tratada apenas na Etapa 8.

### 15.6 Alocação do item de solicitação

A solicitação representa intenção formal de aquisição. Sua alocação informa quanto de cada item solicitado foi destinado a cada necessidade.

Modelo lógico recomendado:

```sql
CREATE TABLE frame_solicitacao_item_alocacoes (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_item_id      uuid NOT NULL,
  necessidade_id           uuid NOT NULL,
  quantidade_alocada       numeric(14,3) NOT NULL,
  origem_alocacao          text NOT NULL DEFAULT 'MANUAL',
  estado_administrativo    text NOT NULL DEFAULT 'ATIVA',
  justificativa_excedente  text,
  motivo_cancelamento      text,
  criado_por               uuid NOT NULL,
  cancelado_por            uuid,
  criado_em                timestamptz NOT NULL DEFAULT now(),
  cancelado_em             timestamptz,

  CONSTRAINT frame_sol_item_aloc_qtd_ck CHECK (
    quantidade_alocada > 0
  ),

  CONSTRAINT frame_sol_item_aloc_origem_ck CHECK (
    origem_alocacao IN ('MANUAL','GERADA_DA_NECESSIDADE','IMPORTACAO','COPIA')
  ),

  CONSTRAINT frame_sol_item_aloc_estado_ck CHECK (
    estado_administrativo IN ('ATIVA','CANCELADA')
  ),

  CONSTRAINT frame_sol_item_aloc_cancelamento_ck CHECK (
    (estado_administrativo = 'ATIVA'
      AND motivo_cancelamento IS NULL
      AND cancelado_por IS NULL
      AND cancelado_em IS NULL)
    OR
    (estado_administrativo = 'CANCELADA'
      AND motivo_cancelamento IS NOT NULL
      AND cancelado_por IS NOT NULL
      AND cancelado_em IS NOT NULL)
  ),

  CONSTRAINT frame_sol_item_aloc_uk
    UNIQUE (solicitacao_item_id, necessidade_id)
);
```

FKs esperadas:

- `solicitacao_item_id` → `solicitacao_itens.id`;
- `necessidade_id` → `frame_pacote_necessidades.id`;
- usuários → identidade vigente.

A política recomendada é `ON DELETE RESTRICT`. Itens em rascunho poderão ser removidos por uma operação transacional que primeiro remova ou cancele suas alocações. Documentos que já avançaram no fluxo não poderão perder histórico por cascade.

### 15.7 Regras da alocação de solicitação

1. A necessidade deve estar `ATIVA`.
2. A Lista de Materiais deve estar liberada ou em situação permitida pela regra do fluxo.
3. O portão `liberado_compras` deve estar aberto para submissão/aprovação efetiva.
4. O item solicitado deve ser compatível com o item de catálogo ou snapshot da necessidade.
5. A unidade deve ser idêntica ou possuir conversão oficial.
6. A soma das alocações ativas de um item não pode exceder sua quantidade solicitada.
7. A soma alocada a uma necessidade pode exceder sua quantidade somente mediante permissão e `justificativa_excedente`.
8. Uma solicitação pode consolidar necessidades equivalentes de vários pacotes.
9. Uma solicitação geral pode possuir itens sem alocação.
10. Após aprovação, alterações quantitativas exigem reabertura controlada, cancelamento ou nova solicitação.

### 15.8 Alocação do item de pedido

O pedido representa compromisso comercial com o fornecedor. Sua alocação informa quanto da quantidade pedida está comprometida com cada necessidade.

Modelo lógico recomendado:

```sql
CREATE TABLE frame_pedido_item_alocacoes (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id                  uuid NOT NULL,
  necessidade_id                  uuid NOT NULL,
  solicitacao_item_alocacao_id    uuid,
  quantidade_alocada              numeric(14,3) NOT NULL,
  origem_alocacao                 text NOT NULL,
  justificativa_compra_direta     text,
  justificativa_excedente         text,
  estado_administrativo           text NOT NULL DEFAULT 'ATIVA',
  motivo_cancelamento             text,
  criado_por                      uuid NOT NULL,
  cancelado_por                   uuid,
  criado_em                       timestamptz NOT NULL DEFAULT now(),
  cancelado_em                    timestamptz,

  CONSTRAINT frame_ped_item_aloc_qtd_ck CHECK (
    quantidade_alocada > 0
  ),

  CONSTRAINT frame_ped_item_aloc_origem_ck CHECK (
    origem_alocacao IN ('SOLICITACAO','COMPRA_DIRETA','AJUSTE')
  ),

  CONSTRAINT frame_ped_item_aloc_direta_ck CHECK (
    (origem_alocacao <> 'COMPRA_DIRETA')
    OR justificativa_compra_direta IS NOT NULL
  ),

  CONSTRAINT frame_ped_item_aloc_solicitacao_ck CHECK (
    (origem_alocacao <> 'SOLICITACAO')
    OR solicitacao_item_alocacao_id IS NOT NULL
  ),

  CONSTRAINT frame_ped_item_aloc_estado_ck CHECK (
    estado_administrativo IN ('ATIVA','CANCELADA')
  ),

  CONSTRAINT frame_ped_item_aloc_cancelamento_ck CHECK (
    (estado_administrativo = 'ATIVA'
      AND motivo_cancelamento IS NULL
      AND cancelado_por IS NULL
      AND cancelado_em IS NULL)
    OR
    (estado_administrativo = 'CANCELADA'
      AND motivo_cancelamento IS NOT NULL
      AND cancelado_por IS NOT NULL
      AND cancelado_em IS NOT NULL)
  ),

  CONSTRAINT frame_ped_item_aloc_uk
    UNIQUE (pedido_item_id, necessidade_id)
);
```

FKs esperadas:

- `pedido_item_id` → `pedido_itens.id`;
- `necessidade_id` → `frame_pacote_necessidades.id`;
- `solicitacao_item_alocacao_id` → alocação da solicitação;
- usuários → identidade vigente.

### 15.9 Pedido originado de solicitação

Quando o pedido nasce de uma solicitação:

1. as alocações podem ser copiadas como proposta inicial;
2. a cópia não substitui validação transacional;
3. um item solicitado pode ser dividido em vários itens de pedido;
4. vários itens solicitados equivalentes podem ser consolidados em um item de pedido;
5. a origem deve permanecer rastreável por `solicitacao_item_alocacao_id` quando houver correspondência direta;
6. a necessidade referenciada no pedido deve ser a mesma da alocação da solicitação;
7. a quantidade acumulada pedida a partir de uma alocação não pode exceder sua quantidade ativa sem justificativa e permissão;
8. cancelamento da solicitação não cancela automaticamente pedido já emitido.

Exemplo de divisão:

```text
Solicitação — Perfil X — 200 barras
└── Alocação N-001 — 200

Pedidos
├── Fornecedor A — 120 barras → N-001
└── Fornecedor B — 80 barras  → N-001
```

### 15.10 Compra direta

Um pedido poderá atender uma necessidade sem solicitação anterior quando o processo da empresa permitir compra direta.

Requisitos mínimos:

- permissão específica;
- motivo obrigatório;
- necessidade ativa;
- portão de Compras aberto;
- auditoria;
- validação de quantidade e unidade;
- indicação `origem_alocacao = 'COMPRA_DIRETA'`.

A compra direta não cria uma solicitação artificial apenas para preencher o fluxo.

### 15.11 Quantidade geral e quantidade de pacote no mesmo item

A soma das alocações ativas de um item de pedido pode ser menor que a quantidade total do item.

Exemplo:

```text
Pedido Item — Perfil X — 250 barras
├── PAT-001 / N-001 — 120
├── PAT-002 / N-008 — 80
└── Parcela geral não alocada — 50
```

A parcela não alocada é tratada como compra geral ou futura entrada de estoque, não como quantidade de qualquer pacote.

O sistema deve exibir explicitamente:

```text
Quantidade do item: 250
Alocada a pacotes: 200
Geral/não alocada: 50
```

Não criar uma “necessidade genérica” fictícia para representar estoque geral.

### 15.12 Alocação do item de recebimento

O recebimento representa o fato físico de entrada. A alocação de recebimento informa quanto da quantidade efetivamente aceita foi recebida para cada alocação de pedido.

Modelo lógico recomendado:

```sql
CREATE TABLE frame_recebimento_item_alocacoes (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_item_id        uuid NOT NULL,
  pedido_item_alocacao_id    uuid NOT NULL,
  quantidade_alocada         numeric(14,3) NOT NULL,
  estado_administrativo      text NOT NULL DEFAULT 'ATIVA',
  motivo_estorno             text,
  criado_por                 uuid NOT NULL,
  estornado_por              uuid,
  criado_em                  timestamptz NOT NULL DEFAULT now(),
  estornado_em               timestamptz,

  CONSTRAINT frame_rec_item_aloc_qtd_ck CHECK (
    quantidade_alocada > 0
  ),

  CONSTRAINT frame_rec_item_aloc_estado_ck CHECK (
    estado_administrativo IN ('ATIVA','ESTORNADA')
  ),

  CONSTRAINT frame_rec_item_aloc_estorno_ck CHECK (
    (estado_administrativo = 'ATIVA'
      AND motivo_estorno IS NULL
      AND estornado_por IS NULL
      AND estornado_em IS NULL)
    OR
    (estado_administrativo = 'ESTORNADA'
      AND motivo_estorno IS NOT NULL
      AND estornado_por IS NOT NULL
      AND estornado_em IS NOT NULL)
  ),

  CONSTRAINT frame_rec_item_aloc_uk
    UNIQUE (recebimento_item_id, pedido_item_alocacao_id)
);
```

FKs esperadas:

- `recebimento_item_id` → `recebimento_itens.id`;
- `pedido_item_alocacao_id` → `frame_pedido_item_alocacoes.id`;
- usuários → identidade vigente.

A necessidade e o pacote são obtidos da alocação do pedido. Não devem ser duplicados na alocação do recebimento.

### 15.13 Regra de alocação explícita no recebimento

Considere:

```text
Pedido: 200 barras
├── PAT-001 / N-001 — 120
└── PAT-002 / N-008 — 80

Primeiro recebimento: 100 barras
```

O sistema não deve assumir distribuição proporcional de 60/40, FIFO ou qualquer outra regra silenciosa.

A interface pode sugerir as alocações pendentes, mas um usuário ou uma política formal deve confirmar o destino:

```text
Recebimento 01 — 100 barras
└── PAT-001 / N-001 — 100
```

Depois:

```text
Recebimento 02 — 100 barras
├── PAT-001 / N-001 — 20
└── PAT-002 / N-008 — 80
```

Essa distinção é necessária para saber qual pacote realmente recebeu material, e não apenas para qual pacote o material foi comprado.

### 15.14 Regras do recebimento

1. A alocação deve apontar para uma alocação ativa do item de pedido correspondente.
2. A soma das alocações ativas de um item de recebimento não pode exceder a quantidade aceita/recebida do item.
3. A soma recebida para uma alocação de pedido não pode exceder sua quantidade pedida, salvo fluxo explícito de tolerância ou recebimento excedente.
4. Material rejeitado, devolvido ou ainda em inspeção não compõe cobertura recebida válida.
5. Enquanto o domínio atual não diferenciar aceite e rejeição, utilizar provisoriamente `recebimento_itens.quantidade_recebida`, documentando a limitação.
6. Um recebimento poderá ter parcela geral não destinada a pacote quando o item de pedido também tiver parcela geral.
7. A confirmação final do recebimento deve validar todas as alocações em uma única transação.
8. Após finalização, correções exigem estorno ou ajuste auditável; não editar a linha diretamente.
9. O estorno reduz novamente a cobertura da necessidade.
10. A alocação de recebimento não equivale a reserva de estoque. Reserva continuará pertencendo ao SquadStock.

### 15.15 Compatibilidade de item e unidade

Uma mesma linha documental só poderá consolidar necessidades quando houver compatibilidade real.

Validações mínimas:

- mesmo item de catálogo, quando ambos forem catalogados;
- mesma especificação técnica relevante;
- mesma unidade ou conversão oficial;
- mesmo acabamento, cor, dimensão ou variante quando esses atributos alterarem o produto comprado;
- itens livres devem possuir snapshots compatíveis.

Não consolidar apenas porque as descrições textuais são parecidas.

### 15.16 Regras de excesso e tolerância

Compras podem exigir múltiplos comerciais, embalagens fechadas, perdas ou mínimos de fornecedor. Portanto, a arquitetura deve permitir cobertura acima de 100%, mas nunca silenciosamente.

Quando uma operação fizer a quantidade acumulada exceder a necessidade:

- exibir o delta;
- exigir `justificativa_excedente`;
- exigir permissão de override conforme limite definido;
- manter o excedente visível na cobertura;
- não aumentar automaticamente a quantidade necessária;
- não atribuir o excedente a outro pacote sem nova alocação.

Exemplo:

```text
Necessário: 90 unidades
Embalagem mínima: 100 unidades
Excedente planejado: 10 unidades
```

O destino físico do excedente será tratado pelo Stock quando existir. Até lá, o Frame registra apenas o fato de que foi comprado/recebido acima da necessidade.

### 15.17 Estados e imutabilidade por fase

#### Solicitação em rascunho

- alocações podem ser criadas, alteradas e removidas transacionalmente;
- nenhum histórico operacional é perdido porque o documento ainda não foi submetido.

#### Solicitação aprovada

- alocações tornam-se imutáveis;
- correção exige reabertura autorizada, cancelamento ou nova solicitação.

#### Pedido em rascunho

- alocações podem ser ajustadas;
- origem da solicitação deve permanecer rastreável.

#### Pedido emitido

- alocações tornam-se compromisso histórico;
- correção exige cancelamento, aditivo ou operação de realocação auditável;
- não permitir exclusão física.

#### Recebimento em rascunho

- a distribuição pode ser alterada antes da confirmação.

#### Recebimento confirmado

- alocações tornam-se fatos históricos;
- correção exige estorno com motivo e permissão.

### 15.18 Realocação entre necessidades ou pacotes

A possibilidade de realocação depende do estágio:

```text
Antes da aprovação/emissão/confirmação
→ editar dentro da mesma transação
```

```text
Depois da aprovação/emissão
→ cancelar/ajustar a alocação antiga
→ criar nova alocação
→ registrar motivo, usuário e diferença
```

```text
Depois do recebimento confirmado
→ estornar alocação de recebimento
→ refazer distribuição, se ainda estiver no domínio do recebimento
```

Depois que o material estiver disponível, reservado ou consumido no Stock, mudar o destino deixa de ser realocação de compra e passa a ser uma transferência/movimentação de estoque. O Frame não deverá simular essa operação.

### 15.19 Efeito das revisões do pacote

Quando uma nova revisão ou Lista de Materiais substituir necessidades anteriores:

1. alocações históricas permanecem ligadas às necessidades originais;
2. nenhuma solicitação, pedido ou recebimento é migrado automaticamente para a nova necessidade;
3. necessidades novas recebem novas alocações;
4. redução de quantidade gera excesso potencial, não cancelamento automático;
5. substituição de item exige decisão humana sobre pedidos já emitidos;
6. a interface deve mostrar compromissos da revisão anterior e delta da revisão atual;
7. uma necessidade `SUBSTITUIDA` continua consultável e mantém sua cobertura histórica;
8. operações novas devem apontar preferencialmente para necessidades vigentes.

### 15.20 Validações quantitativas

As operações de gravação deverão validar no mínimo:

```text
Σ alocações de solicitação ativas por item
≤ quantidade do item solicitado
```

```text
Σ alocações de pedido ativas por item
≤ quantidade do item pedido
```

```text
Σ alocações de recebimento ativas por item
≤ quantidade aceita/recebida do item
```

```text
Σ recebimentos ativos por alocação de pedido
≤ quantidade da alocação de pedido + tolerância autorizada
```

```text
Σ pedidos ativos derivados de uma alocação de solicitação
≤ quantidade solicitada + override autorizado
```

O atendimento da necessidade será calculado na Etapa 4. Não somar etapas como se fossem quantidades adicionais; solicitado, pedido e recebido são níveis diferentes do mesmo funil.

### 15.21 Concorrência e transações

Toda operação de alocação deverá:

1. abrir transação;
2. bloquear o item documental e as alocações relacionadas com estratégia equivalente a `SELECT ... FOR UPDATE`;
3. reler os totais ativos;
4. validar estado do documento;
5. validar necessidade, lista, pacote e portões;
6. validar unidade e item;
7. aplicar inserção, ajuste, cancelamento ou estorno;
8. registrar auditoria;
9. confirmar a transação;
10. publicar evento somente após sucesso.

A constraint `UNIQUE` evita duplicidade estrutural, mas não substitui o lock necessário para impedir duas gravações concorrentes de ultrapassarem a quantidade do item.

### 15.22 Operações de domínio necessárias

A arquitetura deverá oferecer operações equivalentes a:

```text
alocarSolicitacaoItem(input)
substituirAlocacoesSolicitacaoItem(input)
cancelarAlocacaoSolicitacao(input)

alocarPedidoItem(input)
criarPedidoAPartirDeSolicitacao(input)
cancelarAlocacaoPedido(input)
realocarPedidoAntesDaEmissao(input)

alocarRecebimentoItem(input)
confirmarRecebimentoComAlocacoes(input)
estornarAlocacaoRecebimento(input)

obterRastreabilidadeDaNecessidade(necessidadeId)
obterDistribuicaoDoItemPedido(pedidoItemId)
obterDistribuicaoDoItemRecebido(recebimentoItemId)
validarConsistenciaDasAlocacoes(documentoId)
```

Os contratos detalhados de Service, Repository e RPC serão definidos na Etapa 6.

### 15.23 Consultas de leitura necessárias

A camada de leitura deverá conseguir responder:

- quais solicitações atendem uma necessidade;
- quanto foi solicitado por pacote e necessidade;
- quais pedidos derivaram de uma solicitação;
- quanto de um item foi destinado a cada pacote;
- quanto ainda não foi alocado;
- quanto foi efetivamente recebido para cada necessidade;
- quais recebimentos estão pendentes de distribuição;
- quais alocações foram canceladas ou estornadas;
- qual revisão originou cada demanda;
- quais itens de um pedido atendem vários pacotes;
- quais necessidades possuem excesso comprado ou recebido.

Consultas mínimas sugeridas:

```text
listarAlocacoesDaSolicitacao(solicitacaoId)
listarAlocacoesDoPedido(pedidoId)
listarAlocacoesDoRecebimento(recebimentoId)
obterFunilDaNecessidade(necessidadeId)
obterDistribuicaoPorPacote(itemId)
listarDocumentosDoPacote(pacoteId)
listarPendenciasDeAlocacao(documentoId)
```

### 15.24 Índices mínimos esperados

Na implementação, avaliar no mínimo:

```text
frame_solicitacao_item_alocacoes(solicitacao_item_id, estado_administrativo)
frame_solicitacao_item_alocacoes(necessidade_id, estado_administrativo)

frame_pedido_item_alocacoes(pedido_item_id, estado_administrativo)
frame_pedido_item_alocacoes(necessidade_id, estado_administrativo)
frame_pedido_item_alocacoes(solicitacao_item_alocacao_id)

frame_recebimento_item_alocacoes(recebimento_item_id, estado_administrativo)
frame_recebimento_item_alocacoes(pedido_item_alocacao_id, estado_administrativo)
```

Índices parciais para registros ativos poderão ser adotados conforme o padrão e o volume real do PostgreSQL.

### 15.25 Segurança e permissões específicas da etapa

Permissões conceituais mínimas:

```text
frame.pacotes.compras.alocacoes.visualizar
frame.pacotes.compras.alocacoes.gerenciar
frame.pacotes.compras.compra_direta
frame.pacotes.compras.alocacoes.excedente
frame.pacotes.compras.alocacoes.realocar
frame.pacotes.compras.recebimentos.estornar
```

A implementação deverá respeitar as convenções de chaves já existentes no projeto. O nome final pode ser adaptado, mas as capacidades acima não devem ser condensadas em uma única permissão administrativa genérica.

### 15.26 Eventos conceituais gerados

A etapa prevê os seguintes fatos de domínio, a detalhar na Etapa 5:

```text
frame.purchase_request_item.allocated
frame.purchase_request_item.allocation_cancelled
frame.purchase_order_item.allocated
frame.purchase_order_item.allocation_cancelled
frame.receipt_item.allocated
frame.receipt_item.allocation_reversed
```

Os eventos não serão utilizados como fonte dos totais. Eles servirão para:

- auditoria e timeline;
- atualização de projeções;
- notificação;
- reconciliação de módulos consumidores.

### 15.27 Exemplo completo multipacote

```text
Necessidades
PAT-001 / N-001 — Perfil X — 120 barras
PAT-002 / N-008 — Perfil X — 80 barras
```

```text
Solicitação SC-100 / Item 1 — Perfil X — 200 barras
├── N-001 — 120
└── N-008 — 80
```

```text
Pedido PC-145 / Item 1 — Perfil X — 200 barras
├── N-001 — 120
└── N-008 — 80
```

```text
Recebimento RC-01 / Item 1 — 100 barras
└── alocação do pedido para N-001 — 100
```

```text
Recebimento RC-02 / Item 1 — 100 barras
├── alocação do pedido para N-001 — 20
└── alocação do pedido para N-008 — 80
```

Resultado rastreável:

```text
PAT-001 / N-001
Necessário: 120
Solicitado: 120
Pedido: 120
Recebido: 120

PAT-002 / N-008
Necessário: 80
Solicitado: 80
Pedido: 80
Recebido: 80
```

### 15.28 Critérios de aceite da Etapa 3

A Etapa 3 é considerada concluída arquiteturalmente quando:

- a necessidade é a âncora de todas as alocações de pacote;
- um item pode atender necessidades de vários pacotes;
- uma necessidade pode ser atendida por vários documentos;
- existem alocações distintas para solicitação, pedido e recebimento;
- o recebimento não é distribuído automaticamente sem confirmação;
- documentos podem possuir parcela geral e parcela de pacotes;
- os campos `lote_id` de cabeçalho deixam de ser fonte de verdade;
- quantidades não podem ultrapassar o item sem override explícito;
- excesso exige justificativa e permanece visível;
- documentos consolidados preservam histórico;
- realocação posterior é auditável;
- revisões não sobrescrevem compromissos anteriores;
- unidades incompatíveis não podem ser consolidadas;
- operações concorrentes são protegidas transacionalmente;
- a modelagem permite calcular cobertura de forma confiável na Etapa 4.

## 16. Cobertura, estados calculados, bloqueios e portões

**Estado:** Concluído — Etapa 4.

### 16.1 Objetivo da etapa

Esta etapa define como o SquadSystem transforma necessidades, solicitações, pedidos e recebimentos em uma leitura confiável do andamento de suprimentos do Pacote de Trabalho.

O objetivo não é apenas exibir um percentual. A arquitetura deve responder, sem ambiguidade:

- quanto o pacote realmente necessita;
- quanto já foi solicitado;
- quanto já se tornou compromisso de compra;
- quanto foi fisicamente recebido e aceito;
- quanto ainda falta em cada nível do funil;
- quais necessidades estão bloqueando o início de uma etapa;
- quais valores representam excesso;
- se a informação é confirmada, planejada ou ainda indisponível;
- se o Wise pode recomendar ou impedir a abertura de um portão institucional.

A cadeia quantitativa oficial é:

```text
Necessidade vigente
    ↓
Solicitação alocada
    ↓
Pedido alocado
    ↓
Recebimento alocado e aceito
    ↓
Disponibilidade / Reserva — SquadStock futuro
    ↓
Consumo — SquadFlow / SquadStock futuro
```

Cada nível é uma leitura independente do mesmo funil. Os valores **não são somados entre si**.

Exemplo incorreto:

```text
120 solicitado + 100 pedido + 60 recebido = 280 atendido
```

Exemplo correto:

```text
Necessário: 120
Solicitado: 120
Pedido: 100
Recebido: 60

Saldo para solicitar: 0
Saldo para pedir: 20
Saldo para receber do que foi pedido: 40
Saldo da necessidade ainda não recebido: 60
```

### 16.2 Princípios obrigatórios

1. Cobertura é calculada por necessidade, nunca pelo `lote_id` legado do cabeçalho.
2. Solicitação, pedido e recebimento são níveis diferentes; um não é adicionado ao outro.
3. Somente documentos e alocações em estados válidos entram nos totais oficiais.
4. Rascunhos podem aparecer como planejamento, mas não como compromisso confirmado.
5. Pedido emitido não significa material recebido.
6. Material recebido não significa material disponível, reservado, separado ou consumido.
7. Sem SquadStock, disponibilidade e reserva devem ser retornadas como `NAO_DISPONIVEL`, `NULL` ou equivalente — nunca como zero.
8. Excesso em uma necessidade não compensa automaticamente a falta de outra.
9. Quantidades de unidades incompatíveis não podem ser somadas para produzir um percentual físico global do pacote.
10. Estados consolidados são derivados; não serão editáveis em `frame_pacote_compras`.
11. Bloqueios manuais não apagam o estado calculado subjacente.
12. Portões do Wise continuam institucionais e não serão alterados automaticamente por uma query de cobertura.
13. A recomendação de liberação pode ser automática; a decisão institucional continua auditável.
14. Revisões antigas permanecem rastreáveis, mas não compõem automaticamente a cobertura corrente.
15. Toda comparação quantitativa deve respeitar precisão, unidade e tolerância configurada.

### 16.3 Escopos de cobertura

A arquitetura deverá produzir leituras em quatro níveis.

#### Cobertura da necessidade

É a leitura exata de uma linha de necessidade:

```text
N-001 — Perfil X — 120 barras
```

É o único nível no qual um percentual físico de quantidade é sempre semanticamente seguro, porque numerador e denominador utilizam a mesma unidade.

#### Cobertura por grupo homogêneo

Agrupa necessidades que possuam:

- mesmo item de catálogo ou identidade técnica equivalente aprovada;
- mesma unidade de medida;
- mesma variante relevante;
- mesma política de conversão.

Exemplo:

```text
Perfil X / barra
Necessário em 3 necessidades: 300 barras
Pedido: 250 barras
Cobertura pedida: 83,33%
```

#### Cobertura da Lista de Materiais

Consolida o estado das necessidades da lista vigente por:

- quantidade de linhas;
- criticidade;
- etapa necessária;
- estado de atendimento;
- grupos homogêneos.

A lista não recebe um percentual físico bruto obtido pela soma de unidades incompatíveis.

#### Cobertura do Pacote de Trabalho

É uma projeção executiva do contexto de Compras. Deve indicar:

- estado base de suprimentos;
- bloqueios e alertas;
- número de necessidades por estágio;
- necessidades bloqueantes pendentes;
- cobertura por criticidade e etapa;
- situação da lista e da revisão;
- situação dos portões institucionais.

### 16.4 Universo vigente do cálculo

A cobertura corrente do pacote será calculada a partir de:

1. contexto de Compras do pacote;
2. Lista de Materiais vigente;
3. revisão à qual a lista vigente pertence;
4. necessidades com `estado_administrativo = 'ATIVA'`;
5. alocações ativas vinculadas a essas necessidades;
6. documentos em estados considerados válidos para cada nível.

Não compõem a cobertura corrente:

- necessidades `CANCELADA`;
- necessidades `SUBSTITUIDA`;
- listas `CANCELADA`;
- listas anteriores marcadas como `SUBSTITUIDA`;
- alocações canceladas ou estornadas;
- documentos cancelados, rejeitados ou anulados;
- recebimentos rejeitados, devolvidos ou ainda não aceitos, quando essa distinção existir.

Esses registros continuam disponíveis na cobertura histórica.

### 16.5 Seleção da Lista de Materiais vigente

A Lista de Materiais vigente para cálculo é a lista `LIBERADA` mais recente reconhecida como atual para o contexto e revisão.

Regras:

1. uma lista em `RASCUNHO` ou `EM_REVISAO` não substitui a última lista liberada;
2. uma lista nova só passa a ser vigente depois da liberação transacional;
3. ao liberar a nova lista, a anterior passa para `SUBSTITUIDA`;
4. alocações históricas permanecem na lista anterior;
5. nenhuma quantidade é migrada silenciosamente para necessidades novas;
6. a leitura deve indicar quando existe uma revisão/lista mais nova ainda pendente de liberação;
7. se a revisão do pacote avançou e não existe lista compatível liberada, retornar alerta `REVISAO_SEM_LISTA_LIBERADA`;
8. se nunca houve lista liberada, o estado do pacote será `SEM_LISTA` ou `LISTA_EM_ELABORACAO`, conforme existam rascunhos.

### 16.6 Quantidades oficiais por necessidade

Para cada necessidade ativa `n`, o read model deverá calcular pelo menos as quantidades abaixo.

```text
q_necessaria(n)
q_solicitada_planejada(n)
q_solicitada_confirmada(n)
q_pedida_planejada(n)
q_pedida_comprometida(n)
q_recebida_bruta(n)
q_recebida_aceita(n)
q_disponivel(n)          — futuro Stock
q_reservada(n)           — futuro Stock
q_separada(n)            — futuro Stock
q_consumida(n)           — futuro Stock/Flow
```

#### `q_necessaria`

É `frame_pacote_necessidades.quantidade_necessaria` para a necessidade vigente.

#### `q_solicitada_planejada`

Soma das alocações ativas em solicitações ainda em preparação, submissão ou análise, conforme o mapeamento central de estados.

É informativa. Não representa aprovação nem obrigação comercial.

#### `q_solicitada_confirmada`

Soma das alocações ativas em solicitações aprovadas e ainda válidas.

#### `q_pedida_planejada`

Soma das alocações ativas em pedidos em rascunho ou aprovação, ainda sem compromisso comercial definitivo.

#### `q_pedida_comprometida`

Soma das alocações ativas em pedidos aprovados/emitidos e não cancelados.

Esse é o valor utilizado para cobertura oficial de compra.

#### `q_recebida_bruta`

Soma das alocações de recebimentos registrados ou confirmados antes dos descontos por rejeição, devolução ou estorno, quando o modelo atual permitir a distinção.

#### `q_recebida_aceita`

Soma das alocações de recebimento válidas e aceitas, descontando:

- estornos;
- rejeições;
- devoluções que retornaram ao fornecedor;
- quantidades em inspeção ainda não aceitas.

Enquanto o Frame não possuir esses estados granulares, utilizar provisoriamente a quantidade confirmada atual e retornar uma limitação explícita no read model:

```text
qualidade_dado_recebimento = PROVISORIA_SEM_INSPECAO
```

#### Quantidades do Stock

`q_disponivel`, `q_reservada`, `q_separada` e `q_consumida` somente poderão ser preenchidas por contratos públicos do SquadStock.

Antes da existência do módulo:

```text
q_disponivel = null
q_reservada = null
q_separada = null
q_consumida = null
origem_disponibilidade = MODULO_NAO_DISPONIVEL
```

Nunca converter ausência de integração em quantidade zero.

### 16.7 Mapeamento central de estados documentais

A definição de quais status entram em cada quantidade não deve ficar espalhada em componentes ou queries locais.

Deverá existir um mapeamento central equivalente a:

```text
classificarStatusSolicitacao(status)
→ RASCUNHO | EM_PROCESSO | CONFIRMADA | ENCERRADA | INVALIDA

classificarStatusPedido(status)
→ RASCUNHO | EM_APROVACAO | COMPROMETIDO | ENCERRADO | INVALIDO

classificarStatusRecebimento(status)
→ RASCUNHO | EM_INSPECAO | ACEITO | REJEITADO | ESTORNADO
```

O adaptador traduz os nomes reais do schema legado para categorias semânticas do domínio.

Isso evita que uma mudança de `APROVADO` para `EMITIDO`, por exemplo, altere silenciosamente cálculos em vários arquivos.

Regras mínimas:

- rascunho entra apenas nas quantidades planejadas;
- solicitação aprovada entra em `q_solicitada_confirmada`;
- pedido emitido/comprometido entra em `q_pedida_comprometida`;
- pedido cancelado não entra;
- recebimento confirmado e aceito entra em `q_recebida_aceita`;
- recebimento estornado deixa de entrar;
- documento excluído logicamente ou anulado nunca compõe cobertura corrente.

Os nomes concretos serão fechados contra o schema real na Etapa 6.

### 16.8 Fórmulas por necessidade

Para uma necessidade ativa com `q_necessaria > 0`:

```text
cobertura_solicitada = min(q_solicitada_confirmada / q_necessaria, 1)
cobertura_pedida     = min(q_pedida_comprometida / q_necessaria, 1)
cobertura_recebida   = min(q_recebida_aceita / q_necessaria, 1)
```

Os percentuais de apresentação serão:

```text
percentual = cobertura × 100
```

Os saldos serão calculados separadamente:

```text
saldo_para_solicitar = max(q_necessaria - q_solicitada_confirmada, 0)
saldo_para_pedir     = max(q_necessaria - q_pedida_comprometida, 0)
saldo_para_receber_da_necessidade = max(q_necessaria - q_recebida_aceita, 0)
saldo_do_pedido_a_receber = max(q_pedida_comprometida - q_recebida_aceita, 0)
```

Os excessos serão:

```text
excesso_solicitado = max(q_solicitada_confirmada - q_necessaria, 0)
excesso_pedido     = max(q_pedida_comprometida - q_necessaria, 0)
excesso_recebido   = max(q_recebida_aceita - q_necessaria, 0)
```

A cobertura visual é limitada a 100%, mas o excesso permanece exposto separadamente.

Exemplo:

```text
Necessário: 90
Pedido: 100

Cobertura pedida: 100%
Excesso pedido: 10
```

Não exibir `111,11%` como única informação, porque isso esconde o fato de que 10 unidades são excesso e exigem destino posterior.

### 16.9 Precisão e tolerância

As comparações deverão utilizar a precisão da unidade e uma tolerância operacional.

Exemplo conceitual:

```text
epsilon(unidade)
```

Possíveis valores:

```text
unidade inteira: 0
kg com 3 casas: 0,001
metro com 3 casas: 0,001
```

Uma necessidade será considerada integralmente coberta quando:

```text
q_estagio + epsilon >= q_necessaria
```

A tolerância não autoriza compra excedente, não altera o valor gravado e não deve esconder diferença comercial relevante. Ela existe apenas para evitar falsos saldos gerados por arredondamento e conversão decimal.

### 16.10 Conversão de unidade

Quando necessidade e documento utilizarem unidades diferentes, a quantidade só poderá entrar na cobertura se existir uma conversão oficial e versionada.

Exemplo:

```text
1 caixa = 100 unidades
```

A alocação deverá preservar:

- quantidade na unidade do documento;
- fator de conversão aplicado;
- quantidade normalizada na unidade da necessidade;
- origem e versão da conversão.

A cobertura sempre utiliza a quantidade normalizada.

Sem conversão oficial, a alocação deve ser rejeitada e retornar erro de integridade. Conversão por interpretação textual ou regra local de UI é proibida.

### 16.11 Estado calculado de cada necessidade

O estado operacional de uma necessidade ativa será derivado pela seguinte precedência:

```text
1. RECEBIDA_COMPLETA
2. RECEBIDA_PARCIAL
3. PEDIDA_COMPLETA
4. PEDIDA_PARCIAL
5. SOLICITADA_COMPLETA
6. SOLICITADA_PARCIAL
7. NAO_SOLICITADA
```

Algoritmo conceitual:

```text
se q_recebida_aceita >= q_necessaria
  → RECEBIDA_COMPLETA
senão se q_recebida_aceita > 0
  → RECEBIDA_PARCIAL
senão se q_pedida_comprometida >= q_necessaria
  → PEDIDA_COMPLETA
senão se q_pedida_comprometida > 0
  → PEDIDA_PARCIAL
senão se q_solicitada_confirmada >= q_necessaria
  → SOLICITADA_COMPLETA
senão se q_solicitada_confirmada > 0
  → SOLICITADA_PARCIAL
senão
  → NAO_SOLICITADA
```

A necessidade também poderá possuir marcadores independentes:

```text
EXCESSO_SOLICITADO
EXCESSO_PEDIDO
EXCESSO_RECEBIDO
ATRASADA
EM_RISCO
BLOQUEANTE_PENDENTE
REVISAO_ANTERIOR
DADO_INCONSISTENTE
```

Esses marcadores não substituem o estado principal.

### 16.12 Por que não existe percentual físico global simples

Um pacote pode conter:

```text
120 barras de perfil
800 parafusos
45 m² de vidro
20 litros de selante
```

Somar `120 + 800 + 45 + 20` não produz uma quantidade física válida.

Portanto, o pacote não terá um campo oficial como:

```text
cobertura_recebida_quantitativa = 72,4%
```

calculado pela soma bruta de unidades diferentes.

As métricas agregadas permitidas são:

- percentual de necessidades integralmente cobertas;
- percentual de necessidades bloqueantes cobertas;
- percentual de necessidades por etapa cobertas;
- contagem por estado;
- cobertura quantitativa por grupo homogêneo;
- cobertura ponderada por criticidade apenas como indicador visual, nunca como fonte de portão.

### 16.13 Métricas consolidadas da lista e do pacote

O resumo deverá retornar pelo menos:

```text
total_necessidades_ativas
necessidades_nao_solicitadas
necessidades_solicitadas_parcialmente
necessidades_solicitadas_completamente
necessidades_pedidas_parcialmente
necessidades_pedidas_completamente
necessidades_recebidas_parcialmente
necessidades_recebidas_completamente
necessidades_com_excesso
necessidades_bloqueantes_total
necessidades_bloqueantes_pendentes
necessidades_atrasadas
necessidades_em_risco
```

Percentuais por quantidade de linhas:

```text
percentual_linhas_solicitadas_completas
percentual_linhas_pedidas_completas
percentual_linhas_recebidas_completas
percentual_bloqueantes_recebidas
```

Esses percentuais usam número de necessidades, não soma de quantidades incompatíveis.

Exemplo:

```text
10 necessidades ativas
8 integralmente pedidas

Percentual de linhas pedidas: 80%
```

A interface deverá rotular explicitamente como **linhas de necessidade**, e não como percentual físico total de materiais.

### 16.14 Cobertura por criticidade

A criticidade define prioridade e efeito em portões, não peso matemático obrigatório.

```text
BAIXA
NORMAL
ALTA
BLOQUEANTE
```

O resumo deverá separar:

```text
bloqueantes: 4/5 recebidas
altas: 6/8 recebidas
normais: 12/20 recebidas
baixas: 3/6 recebidas
```

Uma necessidade `BLOQUEANTE` pendente pode impedir a recomendação de liberação de uma etapa mesmo que 95% das demais linhas estejam atendidas.

Excesso em uma necessidade normal não compensa falta em uma necessidade bloqueante.

### 16.15 Cobertura por etapa necessária

A leitura deverá agrupar necessidades por `etapa_necessaria`:

```text
corte
usinagem
montagem
vedacao
vidro
embalagem
expedicao
```

Consulta conceitual:

```text
avaliarMateriaisParaEtapa(pacoteId, etapa)
```

O resultado deverá incluir:

- necessidades aplicáveis;
- necessidades bloqueantes;
- recebimento aceito;
- disponibilidade/reserva, quando Stock existir;
- faltas;
- excessos;
- alertas;
- recomendação.

Enquanto o Flow ainda não possuir roteiros configuráveis, a sequência padrão acima poderá ser utilizada como referência. A Etapa 10 substituirá a ordem fixa por roteiro/versionamento de produção quando necessário.

Regra adicional:

- necessidade `BLOQUEANTE` deve possuir `etapa_necessaria` definida;
- se estiver sem etapa, o Service deve impedir liberação da lista ou exigir correção;
- necessidades não bloqueantes sem etapa participam da cobertura geral, mas não bloqueiam automaticamente uma etapa específica.

### 16.16 Estado base do contexto de Compras

O estado consolidado definitivo é calculado e não persistido.

Valores canônicos:

```text
NAO_APLICAVEL
CONTEXTO_PENDENTE
SEM_LISTA
LISTA_EM_ELABORACAO
SEM_NECESSIDADES
AGUARDANDO_LIBERACAO_INSTITUCIONAL
PENDENTE_DE_COMPRA
COMPRA_PARCIAL
PEDIDOS_EMITIDOS
RECEBIMENTO_PARCIAL
MATERIAL_RECEBIDO
ENCERRADO
```

Definições:

#### `NAO_APLICAVEL`

O pacote não possui o módulo Frame/Compras participante.

#### `CONTEXTO_PENDENTE`

O módulo participa, mas `frame_pacote_compras` ainda não existe. Indica falha ou atraso de reconciliação, não estado operacional normal.

#### `SEM_LISTA`

Não existe Lista de Materiais.

#### `LISTA_EM_ELABORACAO`

Existe lista em rascunho ou revisão, mas nenhuma lista liberada vigente.

#### `SEM_NECESSIDADES`

Existe lista liberada vigente, porém não há necessidades ativas.

#### `AGUARDANDO_LIBERACAO_INSTITUCIONAL`

Existe lista liberada e necessidade ativa, mas `lotes_obra.liberado_compras = false`.

#### `PENDENTE_DE_COMPRA`

Compras está liberada e nenhuma quantidade foi comprometida em pedido, ou ainda existem necessidades sem qualquer pedido comprometido.

O subestado poderá indicar:

```text
NAO_SOLICITADO
SOLICITACOES_EM_ANDAMENTO
SOLICITACOES_APROVADAS
AGUARDANDO_PEDIDO
```

#### `COMPRA_PARCIAL`

Existe pelo menos uma quantidade pedida/comprometida, mas uma ou mais necessidades ativas ainda não estão integralmente cobertas por pedidos.

#### `PEDIDOS_EMITIDOS`

Todas as necessidades ativas estão integralmente cobertas por pedidos comprometidos e ainda não existe recebimento aceito relevante, ou o recebimento é zero.

#### `RECEBIMENTO_PARCIAL`

Existe recebimento aceito, mas pelo menos uma necessidade ativa ainda não está integralmente recebida.

#### `MATERIAL_RECEBIDO`

Todas as necessidades ativas estão integralmente cobertas por recebimentos aceitos.

Esse estado **não significa** material disponível, reservado, separado ou pronto para produção.

#### `ENCERRADO`

O pacote/contexto foi concluído ou cancelado institucionalmente. O motivo e o resultado final devem permanecer visíveis.

### 16.17 Algoritmo de precedência do estado base

A leitura deverá aplicar a seguinte ordem:

```text
1. pacote não participa do Frame
   → NAO_APLICAVEL

2. deveria existir contexto, mas não existe
   → CONTEXTO_PENDENTE

3. pacote CANCELADO ou CONCLUIDO
   → ENCERRADO

4. nenhuma lista existe
   → SEM_LISTA

5. nenhuma lista liberada, mas existe rascunho/revisão
   → LISTA_EM_ELABORACAO

6. lista liberada sem necessidades ativas
   → SEM_NECESSIDADES

7. liberado_compras = false
   → AGUARDANDO_LIBERACAO_INSTITUCIONAL

8. todas as necessidades recebidas integralmente
   → MATERIAL_RECEBIDO

9. alguma quantidade recebida, mas cobertura não é integral
   → RECEBIMENTO_PARCIAL

10. todas as necessidades integralmente pedidas
    → PEDIDOS_EMITIDOS

11. existe pedido comprometido, mas cobertura não é integral
    → COMPRA_PARCIAL

12. caso contrário
    → PENDENTE_DE_COMPRA
```

O algoritmo deve usar quantidades confirmadas, não rascunhos.

### 16.18 Estado base, estado de exibição e sobreposições

O sistema não deverá destruir o estado base quando existir bloqueio.

Read model recomendado:

```text
estado_base: RECEBIMENTO_PARCIAL
bloqueado: true
estado_exibicao: BLOQUEADO
bloqueios:
  - tipo: MANUAL
    motivo: revisão de acabamento em análise
```

A UI poderá destacar `BLOQUEADO`, mas deverá mostrar que o processo subjacente permanece em `RECEBIMENTO_PARCIAL`.

Sobreposições possíveis:

```text
BLOQUEADO_MANUALMENTE
PENDENCIA_BLOQUEANTE
REVISAO_PENDENTE
DADOS_INCONSISTENTES
ATRASADO
EM_RISCO
PORTAO_FECHADO
```

Nem todas são bloqueios duros. `ATRASADO` e `EM_RISCO`, por exemplo, são alertas.

### 16.19 Bloqueio manual do contexto

O bloqueio manual utiliza os campos definidos em `frame_pacote_compras`:

```text
bloqueado
motivo_bloqueio
bloqueado_por
bloqueado_em
```

Regras:

1. motivo obrigatório;
2. usuário e timestamp obrigatórios;
3. permissão específica;
4. operação de domínio para bloquear;
5. operação de domínio para desbloquear;
6. auditoria antes/depois;
7. evento semântico;
8. bloqueio não cancela solicitações, pedidos ou recebimentos existentes;
9. novas operações sensíveis podem ser impedidas conforme política;
10. desbloqueio não altera automaticamente portões do Wise.

O modelo atual admite um bloqueio manual consolidado por contexto. Se o domínio futuro exigir vários bloqueios simultâneos com responsáveis diferentes, uma entidade própria poderá ser introduzida sem alterar o contrato de leitura. Até lá, o booleano e o motivo são a fonte manual oficial.

### 16.20 Impedimentos calculados

Além do bloqueio manual, o read model deverá gerar impedimentos calculados, sem gravá-los como estado editável.

Tipos mínimos:

```text
CONTEXTO_AUSENTE
LISTA_AUSENTE
LISTA_NAO_LIBERADA
PORTAO_COMPRAS_FECHADO
REVISAO_SEM_LISTA_LIBERADA
NECESSIDADE_BLOQUEANTE_NAO_ATENDIDA
ALOCACAO_INCONSISTENTE
UNIDADE_INCOMPATIVEL
PEDIDO_CANCELADO_COM_COBERTURA_ORFA
RECEBIMENTO_ESTORNADO
INTEGRACAO_STOCK_INDISPONIVEL
```

Cada impedimento deverá retornar:

```text
codigo
tipo
severidade
escopo
entidade_id
mensagem
acao_recomendada
bloqueia_operacao
```

Severidades:

```text
INFO
ALERTA
ALTA
CRITICA
```

Somente impedimentos explicitamente classificados como `bloqueia_operacao = true` impedem a operação correspondente.

### 16.21 Alertas de prazo e risco

O prazo não deve alterar quantidades, mas deve produzir sinais operacionais.

Possíveis alertas:

```text
PRAZO_COMPRAS_VENCIDO
PEDIDO_SEM_PREVISAO
ENTREGA_PREVISTA_APOS_PRAZO
NECESSIDADE_BLOQUEANTE_SEM_PEDIDO
NECESSIDADE_ALTA_SEM_SOLICITACAO
RECEBIMENTO_ATRASADO
```

Regras recomendadas:

- `ATRASADO`: prazo alvo já venceu e ainda existe necessidade ativa não recebida integralmente;
- `EM_RISCO`: previsão de entrega supera prazo alvo ou necessidade bloqueante ainda não possui compromisso de compra dentro da janela configurada;
- alertas são calculados por data e não persistidos como status principal;
- mudanças de previsão devem atualizar a leitura imediatamente;
- falta de previsão é diferente de atraso confirmado e deve possuir código próprio.

### 16.22 Portão institucional de Compras

`lotes_obra.liberado_compras` permanece sob propriedade do Wise.

Antes de abrir o portão, a operação de domínio deverá validar:

1. pacote existe;
2. pacote está em estado institucional compatível, preferencialmente `ATIVO`;
3. módulo Frame está habilitado no pacote;
4. contexto de Compras existe ou pode ser reconciliado;
5. existe Lista de Materiais liberada vigente;
6. a lista pertence à revisão vigente esperada;
7. não existem inconsistências críticas de escopo, unidade ou catálogo;
8. usuário possui permissão;
9. override, quando permitido, possui justificativa.

A abertura do portão não cria automaticamente solicitação ou pedido. Ela apenas permite que o Frame execute operações efetivas.

Ao fechar um portão já aberto:

- impedir novas submissões/aprovações/emissões vinculadas ao pacote;
- não cancelar documentos existentes;
- mostrar impacto antes da confirmação;
- exigir motivo quando houver compromissos ativos;
- registrar auditoria e evento;
- manter recebimentos necessários para pedidos já emitidos, conforme política de negócio.

### 16.23 Elegibilidade para operações de Compras

A autorização de uma ação não depende apenas do portão.

Exemplo conceitual:

```text
podeCriarSolicitacao =
  pacote ativo
  AND Frame participante
  AND contexto existente
  AND lista vigente liberada
  AND liberado_compras
  AND não bloqueado para criação
  AND permissão do usuário
```

```text
podeEmitirPedido =
  pode operar Compras
  AND pedido válido
  AND alocações consistentes
  AND aprovações concluídas
  AND nenhuma inconsistência crítica
```

O Service deve retornar decisões explicáveis:

```text
permitido: false
motivos:
  - PORTAO_COMPRAS_FECHADO
  - LISTA_NAO_LIBERADA
```

A UI não deve reproduzir a regra por conta própria.

### 16.24 Recomendação de liberação para Produção

`lotes_obra.liberado_producao` continua sendo uma decisão institucional do Wise.

O sistema poderá calcular uma recomendação, mas não deverá alterar esse campo silenciosamente.

Estados de recomendação:

```text
NAO_AVALIAVEL
NAO_PRONTO
PRONTO_COM_RESSALVAS
PRONTO
```

#### `NAO_AVALIAVEL`

Utilizado quando faltam dados essenciais, por exemplo:

- lista vigente inexistente;
- revisão inconsistente;
- Flow não participante;
- roteiro/etapa alvo desconhecido;
- Stock necessário, mas ainda não integrado.

#### `NAO_PRONTO`

Existe pelo menos uma pendência bloqueante aplicável à etapa alvo.

#### `PRONTO_COM_RESSALVAS`

Nenhuma necessidade bloqueante está pendente, porém existem:

- necessidades altas ou normais incompletas;
- alertas de prazo;
- integração de disponibilidade parcial;
- override autorizado;
- itens recebidos mas ainda não reservados, quando a política permitir análise preliminar.

#### `PRONTO`

Todos os pré-requisitos obrigatórios da etapa foram comprovados pela fonte competente.

### 16.25 Recebimento não é prontidão produtiva

Enquanto o SquadStock não existir, o Frame só poderá afirmar:

```text
MATERIAL_RECEBIDO_PARA_O_PACOTE
```

Ele não poderá afirmar:

```text
MATERIAL_DISPONIVEL
MATERIAL_RESERVADO
MATERIAL_SEPARADO
PRONTO_PARA_PRODUCAO
```

Esses fatos pertencem ao Stock.

Portanto, sem Stock:

- a recomendação para Produção pode chegar no máximo a um estado preliminar baseado em recebimento;
- a UI deve mostrar `Disponibilidade não verificada`;
- a abertura de `liberado_producao` exige decisão humana/override institucional quando a política depender de disponibilidade física;
- a ausência do Stock não deve ser interpretada como indisponibilidade zero.

Com Stock integrado, a avaliação passa a utilizar:

```text
q_disponivel
q_reservada
q_separada
```

conforme a etapa e política do pacote.

### 16.26 Prontidão por etapa produtiva

Para cada etapa, a política poderá definir o nível necessário:

```text
RECEBIDO
DISPONIVEL
RESERVADO
SEPARADO
```

Exemplo:

```text
Corte
Perfis bloqueantes: RESERVADO
Componentes de montagem: não exigidos ainda
Vidros: não exigidos ainda
```

```text
Montagem
Perfis e componentes bloqueantes: SEPARADO ou RESERVADO
```

```text
Expedição
Todos os materiais e itens de embalagem bloqueantes: DISPONIVEL/SEPARADO
```

A política será definida futuramente pelo Wise/Flow. O contrato da Etapa 4 deve aceitar:

```text
avaliarProntidaoEtapa({
  pacoteId,
  etapa,
  nivelMaterialExigido
})
```

Sem a fonte necessária, retornar `NAO_AVALIAVEL`, nunca presumir sucesso.

### 16.27 Regras de criticidade para portões

Política padrão:

- `BLOQUEANTE`: deve atingir 100% do nível exigido para liberar a etapa;
- `ALTA`: gera ressalva forte e pode bloquear conforme configuração;
- `NORMAL`: não bloqueia por padrão, mas permanece na pendência geral;
- `BAIXA`: apenas informativa, salvo regra específica.

A política poderá variar por tipo de pacote, etapa ou empresa, mas qualquer alteração deverá ser versionada e auditável.

Override de necessidade bloqueante exige:

- permissão específica;
- justificativa;
- usuário;
- timestamp;
- escopo do override;
- validade ou etapa afetada;
- registro na timeline.

Override não altera a quantidade da necessidade nem a marca como atendida.

### 16.28 Impacto das revisões nos estados e portões

Quando uma nova revisão é criada:

1. a lista liberada anterior continua sendo a base histórica até a nova lista ser liberada;
2. o sistema retorna alerta `REVISAO_PENDENTE`;
3. o Wise pode impedir novas operações de compra na revisão antiga conforme política;
4. a liberação da nova lista recalcula toda a cobertura corrente;
5. alocações antigas não são copiadas automaticamente;
6. compromissos reaproveitáveis exigem decisão explícita de realocação ou futura movimentação de Stock;
7. redução de necessidade pode gerar excesso potencial;
8. aumento pode reabrir estado de compra mesmo que o pacote estivesse como `MATERIAL_RECEBIDO`;
9. `liberado_compras` não deve ser fechado automaticamente sem regra institucional, mas a leitura pode retornar `REVISAO_PENDENTE_BLOQUEANTE`;
10. `liberado_producao` deve ser reavaliado quando a nova revisão alterar necessidades bloqueantes.

Exemplo:

```text
Revisão 01
Necessário: 100
Recebido: 100
Estado: MATERIAL_RECEBIDO

Revisão 02 liberada
Necessário: 120
Recebido explicitamente alocado à nova necessidade: 0
Estado corrente: PENDENTE_DE_COMPRA
Compromisso histórico da revisão anterior: 100
```

Qualquer reaproveitamento físico dos 100 deverá ser confirmado pelo processo apropriado, não presumido pela cobertura.

### 16.29 Integridade e anomalias

A consulta de cobertura deverá detectar pelo menos:

```text
ALOCACAO_SOLICITACAO_ACIMA_DO_ITEM
ALOCACAO_PEDIDO_ACIMA_DO_ITEM
ALOCACAO_RECEBIMENTO_ACIMA_DO_ITEM
PEDIDO_ACIMA_DA_SOLICITACAO_SEM_OVERRIDE
RECEBIMENTO_ACIMA_DO_PEDIDO_SEM_TOLERANCIA
ALOCACAO_ATIVA_EM_NECESSIDADE_CANCELADA
ALOCACAO_ATIVA_EM_DOCUMENTO_CANCELADO
ITEM_INCOMPATIVEL_COM_NECESSIDADE
UNIDADE_SEM_CONVERSAO
LISTA_VIGENTE_DUPLICADA
CONTEXTO_DUPLICADO
REVISAO_DIVERGENTE
RECEBIMENTO_SEM_DESTINO
```

Anomalias críticas devem:

- impedir decisões automáticas de liberação;
- aparecer no resumo do pacote;
- oferecer ação recomendada;
- ser auditáveis;
- poder ser consultadas por rotina de reconciliação.

A query não deve corrigir automaticamente fatos históricos.

### 16.30 Read model da cobertura da necessidade

Contrato conceitual:

```ts
type NecessidadeCobertura = {
  necessidadeId: string;
  pacoteId: string;
  listaMateriaisId: string;
  revisaoId: string | null;
  item: {
    itemCatalogoId: string | null;
    codigo: string | null;
    descricao: string;
    unidade: string;
  };
  quantidadeNecessaria: number;
  quantidades: {
    solicitadaPlanejada: number;
    solicitadaConfirmada: number;
    pedidaPlanejada: number;
    pedidaComprometida: number;
    recebidaBruta: number;
    recebidaAceita: number;
    disponivel: number | null;
    reservada: number | null;
    separada: number | null;
    consumida: number | null;
  };
  saldos: {
    paraSolicitar: number;
    paraPedir: number;
    daNecessidadeParaReceber: number;
    doPedidoParaReceber: number;
  };
  excessos: {
    solicitado: number;
    pedido: number;
    recebido: number;
  };
  percentuais: {
    solicitado: number;
    pedido: number;
    recebido: number;
  };
  estado: string;
  criticidade: string;
  etapaNecessaria: string | null;
  marcadores: string[];
  alertas: Array<{
    codigo: string;
    severidade: string;
    mensagem: string;
  }>;
  qualidadeDados: {
    recebimento: string;
    estoque: string;
  };
};
```

O contrato concreto será fechado na Etapa 6, mantendo a semântica acima.

### 16.31 Read model consolidado do contexto

Contrato conceitual:

```ts
type ResumoComprasPacote = {
  pacoteId: string;
  contextoComprasId: string | null;
  estadoBase: string;
  estadoExibicao: string;
  subestado: string | null;
  bloqueado: boolean;
  portoes: {
    comprasLiberadas: boolean;
    producaoLiberada: boolean;
  };
  listaVigente: {
    id: string;
    numero: number;
    status: string;
    revisaoId: string | null;
  } | null;
  metricas: {
    totalNecessidades: number;
    recebidasCompletamente: number;
    pedidasCompletamente: number;
    bloqueantesPendentes: number;
    atrasadas: number;
    emRisco: number;
    comExcesso: number;
  };
  percentuaisPorLinhas: {
    solicitadas: number;
    pedidas: number;
    recebidas: number;
    bloqueantesRecebidas: number;
  };
  porCriticidade: Record<string, unknown>;
  porEtapa: Record<string, unknown>;
  gruposHomogeneos: unknown[];
  bloqueios: unknown[];
  alertas: unknown[];
  anomalias: unknown[];
  recomendacaoProducao: {
    estado: string;
    motivos: string[];
  };
  atualizadoEm: string;
};
```

### 16.32 Consultas e projeções necessárias

A camada de leitura deverá oferecer operações equivalentes a:

```text
obterCoberturaDaNecessidade(necessidadeId)
listarCoberturaDasNecessidades(pacoteId, filtros)
obterResumoDeComprasDoPacote(pacoteId)
obterCoberturaPorGrupoHomogeneo(pacoteId)
obterCoberturaPorCriticidade(pacoteId)
obterCoberturaPorEtapa(pacoteId, etapa)
listarNecessidadesBloqueantesPendentes(pacoteId, etapa?)
listarExcessosDoPacote(pacoteId)
listarAnomaliasDeCobertura(pacoteId)
avaliarElegibilidadeDeCompras(pacoteId, operacao)
avaliarRecomendacaoDeProducao(pacoteId, etapa?)
```

A implementação inicial poderá utilizar views e consultas SQL com CTEs. Não criar tabela-resumo como fonte principal no MVP.

### 16.33 Estratégia de cálculo e materialização

Fase inicial:

- cálculo sob demanda;
- views/RPCs de leitura;
- índices sobre alocações ativas, documentos e necessidades;
- cache curto apenas na camada de aplicação quando seguro;
- invalidação por tags/eventos para UI.

Somente considerar projeção materializada quando houver evidência de custo real, como:

- milhares de necessidades por pacote;
- dashboards consultados continuamente;
- latência acima da meta;
- joins de recebimento/estoque comprovadamente caros.

Se uma projeção for criada:

- deverá guardar `calculado_em`;
- deverá indicar versão do algoritmo;
- deverá possuir reconciliação completa;
- deverá ser descartável e reconstruível;
- nunca aceitar edição manual;
- nunca substituir as transações como fonte de verdade.

### 16.34 Índices mínimos para leitura de cobertura

Além dos índices da Etapa 3, avaliar:

```text
frame_pacote_listas_materiais(contexto_compras_id, status, numero)
frame_pacote_necessidades(lista_materiais_id, estado_administrativo)
frame_pacote_necessidades(criticidade, etapa_necessaria)

solicitacoes_compra(status)
pedidos_compra(status)
recebimentos(status)

índices parciais das alocações com estado_administrativo = 'ATIVA'
índices sobre datas previstas e prazos utilizados nos alertas
```

Os nomes reais de colunas e status serão confirmados antes da migration.

### 16.35 Permissões relacionadas à Etapa 4

Permissões conceituais mínimas:

```text
frame.pacotes.compras.cobertura.visualizar
frame.pacotes.compras.bloquear
frame.pacotes.compras.desbloquear
frame.pacotes.compras.override_excesso
frame.pacotes.compras.override_bloqueio

wise.pacotes.liberar_compras
wise.pacotes.fechar_compras
wise.pacotes.liberar_producao
wise.pacotes.revogar_liberacao_producao
wise.pacotes.override_liberacao
```

A Etapa 5 definirá auditoria e idempotência. A Etapa 6 definirá onde cada verificação será executada.

### 16.36 Eventos semânticos da cobertura

Não publicar eventos a cada alteração decimal ou recálculo de percentual.

Publicar apenas transições semânticas relevantes, por exemplo:

```text
frame.package_procurement.state_changed
frame.package_procurement.blocked
frame.package_procurement.unblocked
frame.package_procurement.blocking_need_resolved
frame.package_procurement.all_blocking_needs_received
frame.package_procurement.all_needs_ordered
frame.package_procurement.all_needs_received
frame.package_procurement.risk_detected
frame.package_procurement.data_inconsistency_detected
wise.work_package.purchase_gate_opened
wise.work_package.purchase_gate_closed
wise.work_package.production_gate_opened
wise.work_package.production_gate_closed
```

A deduplicação, payload, versão e idempotência serão especificados na Etapa 5.

### 16.37 Exemplo completo de cobertura

```text
Pacote PAT-001
Lista vigente: LM-03 / Revisão 03
liberado_compras: true
```

```text
N-001 — Perfil X — BLOQUEANTE — corte
Necessário: 120 barras
Solicitado confirmado: 120
Pedido comprometido: 120
Recebido aceito: 100

Estado: RECEBIDA_PARCIAL
Saldo da necessidade para receber: 20
Bloqueia corte: SIM
```

```text
N-002 — Parafuso Y — NORMAL — montagem
Necessário: 800 unidades
Solicitado confirmado: 1000
Pedido comprometido: 1000
Recebido aceito: 1000

Estado: RECEBIDA_COMPLETA
Excesso recebido: 200
Bloqueia corte: NÃO
```

Resumo correto:

```text
Necessidades ativas: 2
Recebidas completamente: 1/2
Necessidades bloqueantes pendentes para corte: 1
Estado base: RECEBIMENTO_PARCIAL
Recomendação para corte: NAO_PRONTO
```

Resumo incorreto e proibido:

```text
Cobertura total = (100 barras + 1000 parafusos) / (120 barras + 800 parafusos)
```

### 16.38 Exemplo de portão de Produção sem Stock

```text
Todas as necessidades bloqueantes foram recebidas no Frame.
SquadStock ainda não está integrado.
```

Resultado:

```text
estado_compras: MATERIAL_RECEBIDO
recebimento_bloqueante: 100%
disponibilidade: NAO_VERIFICADA
reserva: NAO_VERIFICADA
recomendacao_producao: PRONTO_COM_RESSALVAS ou NAO_AVALIAVEL,
conforme política institucional
```

O Wise poderá liberar produção com override e justificativa, mas o sistema não deverá afirmar que o material está fisicamente reservado.

### 16.39 Critérios de aceite da Etapa 4

A Etapa 4 é considerada concluída arquiteturalmente quando:

- cobertura é calculada por necessidade e alocações ativas;
- rascunhos e compromissos confirmados aparecem em buckets separados;
- solicitação, pedido e recebimento não são somados entre si;
- saldos e excessos possuem fórmulas explícitas;
- percentuais físicos só são calculados com unidades compatíveis;
- não existe percentual bruto global misturando barras, unidades, metros ou litros;
- pacote possui métricas por linhas, criticidade, etapa e grupos homogêneos;
- `MATERIAL_RECEBIDO` não é confundido com disponível ou reservado;
- ausência do Stock retorna desconhecido, não zero;
- estados consolidados são calculados e possuem precedência definida;
- bloqueio manual preserva o estado base;
- impedimentos e alertas possuem códigos e severidades;
- portão de Compras permanece institucional no Wise;
- fechamento do portão não cancela compromissos existentes;
- recomendação de Produção não altera automaticamente `liberado_producao`;
- necessidades bloqueantes são avaliadas por etapa;
- revisão nova recalcula cobertura sem migrar compromissos silenciosamente;
- anomalias críticas impedem liberação automática;
- read models de necessidade e pacote estão definidos;
- cálculo inicial é sob demanda e qualquer materialização futura é reconstruível;
- eventos são semânticos, e não disparados a cada variação percentual;
- a arquitetura está pronta para receber disponibilidade, reserva e consumo do SquadStock sem mudar a fonte de verdade do Frame.

## 17. Eventos, idempotência, reconciliação, auditoria e segurança

**Estado:** Concluída — Etapa 5.

### 17.1 Objetivo da etapa

Esta etapa define como as decisões e transações das Etapas 1 a 4 serão integradas com segurança entre SquadWise, SquadFrame e, futuramente, SquadStock, SquadFlow, SquadBoard e SquadMeasure.

O objetivo não é transformar o SquadSystem em uma arquitetura distribuída artificialmente. O sistema continua podendo operar como monólito modular sobre o mesmo PostgreSQL, mas deverá respeitar contratos de domínio suficientemente claros para que:

- uma falha de evento não apague ou invalide a transação original;
- uma mensagem repetida não duplique contexto, alocação, recebimento ou projeção;
- uma mensagem fora de ordem não faça o sistema voltar para um estado antigo;
- consumidores possam ser reexecutados com segurança;
- projeções possam ser reconstruídas a partir das fontes de verdade;
- ações críticas possuam autoria, motivo, antes/depois e resultado;
- o uso de `service_role` não substitua autorização de negócio;
- nenhum usuário consiga operar pacote, obra ou empresa fora do seu escopo;
- overrides sejam explícitos, restritos e auditáveis;
- eventos, auditoria e timeline não sejam confundidos.

A arquitetura adota o seguinte princípio:

> **A transação de negócio é a fonte de verdade. O evento comunica o fato ocorrido. A reconciliação restaura projeções e contextos derivados. A auditoria registra quem fez o quê, por quê e com qual resultado.**

---

### 17.2 Quatro conceitos que não podem ser misturados

#### 17.2.1 Comando

Um comando expressa uma intenção e pode falhar por regra de negócio ou permissão.

Exemplos:

```text
Ativar pacote
Liberar Compras
Publicar lista de materiais
Alocar item de pedido
Confirmar alocação de recebimento
Bloquear contexto de Compras
Executar reconciliação
```

O comando:

- possui autor;
- exige permissão;
- valida estado e escopo;
- pode ser idempotente;
- produz uma resposta de sucesso, conflito, negação ou erro;
- pode gerar zero ou mais eventos depois de efetivamente alterar o estado.

Comandos não devem ser enviados ao barramento como substituto da camada de aplicação.

#### 17.2.2 Evento de domínio

Um evento descreve um fato que já ocorreu e foi persistido.

Exemplos:

```text
wise.work_package.activated
frame.material_list.released
frame.purchase_order_item.allocated
frame.receipt_item.allocation_reversed
frame.package_procurement.blocked
```

O evento:

- é escrito no passado;
- é imutável;
- não pede autorização ao consumidor para ter existido;
- não substitui a linha transacional que originou o fato;
- pode ser entregue mais de uma vez;
- deve possuir versão e identidade estáveis.

#### 17.2.3 Registro de auditoria

Auditoria registra a execução de uma ação sob a ótica de segurança e governança.

Exemplo:

```text
Usuário Maria abriu o portão de Compras do PAT-001,
usando a permissão wise.pacotes.liberar_compras,
com a justificativa “revisão 03 aprovada”.
```

O registro de auditoria pode conter:

- ator;
- permissão utilizada;
- origem;
- antes e depois;
- justificativa;
- resultado;
- correlação com comando e evento.

Ele não deve ser usado como fila de integração.

#### 17.2.4 Timeline operacional

A timeline é uma projeção amigável para usuários.

Exemplo:

```text
10:35 — Lista LM-03 liberada para Compras por Maria.
11:12 — Pedido PC-145 destinou 120 barras ao pacote.
14:20 — Recebimento parcial de 100 barras confirmado.
```

A timeline pode combinar eventos, auditoria e comentários humanos, mas não é fonte de verdade para cálculos.

---

### 17.3 Topologia de integração

A topologia recomendada é uma **outbox transacional por domínio com contrato comum**, sem criar um terceiro barramento concorrente.

```text
Comando
  ↓
Service / RPC transacional
  ├── grava estado de negócio
  ├── grava auditoria crítica
  └── grava evento na outbox local
          ↓ commit
Dispatcher
  ↓
Registro de entrega por consumidor
  ↓
Consumidor idempotente
  ├── atualiza projeção/contexto derivado
  ├── registra resultado
  └── dispara reconciliação quando necessário
```

#### Decisão sobre as estruturas atuais

Já existem duas estruturas físicas:

```text
wise_eventos
    eventos produzidos pelo SquadWise

eventos_dominio
    eventos produzidos pelo SquadFrame e infraestrutura operacional existente
```

A decisão consolidada é:

1. não criar uma terceira tabela de outbox nesta fase;
2. evoluir `wise_eventos` e `eventos_dominio` para um envelope lógico compatível;
3. encapsular ambas atrás de um contrato único na camada de código;
4. usar uma estrutura compartilhada de entregas por consumidor;
5. permitir futura consolidação física sem alterar produtores e consumidores;
6. fazer SquadStock e SquadFlow utilizarem o contrato comum quando forem criados, preferencialmente sobre a infraestrutura operacional compartilhada, em vez de inaugurarem novas filas independentes.

A unificação física das duas tabelas não é pré-requisito para implementar Compras. A unificação lógica é obrigatória.

---

### 17.4 Garantia de entrega adotada

O SquadSystem adotará:

```text
Entrega ao menos uma vez
+
Consumidores idempotentes
+
Reconciliação determinística
```

O sistema não deverá prometer processamento “exatamente uma vez”, pois:

- o dispatcher pode falhar depois de executar o consumidor e antes de registrar sucesso;
- conexões podem cair;
- workers podem expirar;
- retries podem ocorrer;
- eventos podem chegar fora de ordem.

A correção é obtida por:

- chaves idempotentes;
- constraints únicas;
- transações;
- registros de entrega por consumidor;
- operações `ensure*` e `reconcile*`;
- comparação com a fonte transacional atual.

---

### 17.5 Invariantes dos eventos

Todos os eventos do novo domínio deverão respeitar:

1. O evento só existe depois que o fato foi validado.
2. Estado de negócio, auditoria crítica e outbox são gravados na mesma transação quando participam do mesmo comando.
3. Nenhum evento é publicado externamente antes do commit.
4. Um rollback remove também o evento ainda não confirmado.
5. Eventos são imutáveis depois de gravados.
6. Alteração de payload exige nova versão; não se edita evento antigo.
7. Evento não contém segredos, tokens, arquivos binários ou dados pessoais desnecessários.
8. Um evento pode ter vários consumidores independentes.
9. O sucesso de um consumidor não marca o evento como processado para todos os demais.
10. O evento não é usado para recalcular quantidades quando a consulta às fontes de verdade é possível.
11. Eventos de transição só são emitidos quando há mudança semântica real.
12. Uma reconciliação que não altera nada não deve gerar novamente o mesmo evento de domínio.
13. Eventos históricos nunca são apagados por cancelamento da entidade.
14. Eventos de migração e backfill devem identificar claramente sua origem.
15. Consumidores não devem confiar cegamente em snapshots antigos quando a ordem for relevante; devem consultar o estado atual ou comparar versão do agregado.

---

### 17.6 Envelope canônico de evento

`wise_eventos` e `eventos_dominio` deverão expor, física ou logicamente, o seguinte contrato:

```text
id

tipo
versao_evento
versao_envelope

modulo_produtor
aggregate_type
aggregate_id
aggregate_version

empresa_id
obra_id
pacote_id
entidade_id

payload
metadata

correlation_id
causation_id
idempotency_key

ocorrido_em
disponivel_em
criado_em
```

#### Significado dos campos

`id`
: Identidade única da ocorrência do evento.

`tipo`
: Nome canônico, estável e escrito no passado.

`versao_evento`
: Versão do payload daquele tipo específico.

`versao_envelope`
: Versão da estrutura comum do barramento.

`modulo_produtor`
: `wise`, `frame`, `stock`, `flow`, `board`, `measure` ou `system`.

`aggregate_type` e `aggregate_id`
: Entidade cuja sequência de mudanças originou o evento, por exemplo `work_package`, `material_list`, `purchase_order_item_allocation`.

`aggregate_version`
: Versão monotônica opcional, obrigatória quando a ordem relativa das mudanças for semanticamente relevante.

`empresa_id`, `obra_id`, `pacote_id`
: Contexto de isolamento e roteamento. Devem ser derivados no servidor, nunca aceitos cegamente do cliente.

`entidade_id`
: Identidade da entidade específica mencionada no evento quando diferente do agregado.

`payload`
: Dados mínimos necessários para o consumidor compreender o fato.

`metadata`
: Informações técnicas, como origem, importação, versão da aplicação ou identificador da execução. Não deve conter regra de negócio principal.

`correlation_id`
: Une todas as operações originadas pela mesma jornada.

`causation_id`
: Identifica o comando ou evento que causou a ocorrência atual.

`idempotency_key`
: Identidade semântica da ocorrência para impedir publicação duplicada.

`ocorrido_em`
: Momento em que o fato de negócio ocorreu.

`disponivel_em`
: Momento a partir do qual pode ser processado, permitindo retry agendado.

#### Campos que não pertencem ao evento global

Não usar um único campo como:

```text
processado = true
```

Um evento pode ter vários consumidores. O estado de processamento pertence à relação evento × consumidor, não ao evento isolado.

---

### 17.7 Registro de entrega por consumidor

A infraestrutura deverá possuir um ledger compartilhado conceitualmente equivalente a:

```text
infra_evento_entregas
- origem_evento
- evento_id
- consumidor
- versao_consumidor
- estado
- tentativas
- proxima_tentativa_em
- bloqueado_por
- bloqueado_em
- lease_expira_em
- processado_em
- ultimo_erro_codigo
- ultimo_erro_resumo
- resultado_metadata
- criado_em
- atualizado_em
```

Constraint principal:

```text
UNIQUE (origem_evento, evento_id, consumidor)
```

Estados recomendados:

```text
PENDENTE
PROCESSANDO
RETRY
PROCESSADO
IGNORADO
DEAD_LETTER
```

Regras:

- `PROCESSADO` significa sucesso apenas para aquele consumidor;
- `IGNORADO` exige motivo técnico explícito, como módulo não participante;
- `RETRY` possui próxima tentativa;
- `DEAD_LETTER` exige intervenção ou reconciliação;
- leases vencidos retornam com segurança à fila;
- workers concorrentes usam locking transacional, preferencialmente `FOR UPDATE SKIP LOCKED`;
- o resultado não armazena dados sensíveis ou respostas inteiras desnecessárias.

---

### 17.8 Nomenclatura e versionamento

#### Convenção de nomes

Formato:

```text
<modulo>.<agregado>.<fato_no_passado>
```

Exemplos:

```text
wise.work_package.activated
wise.work_package.purchase_gate_opened
frame.material_list.released
frame.purchase_order_item.allocated
frame.receipt_item.allocation_reversed
frame.package_procurement.state_changed
```

Não usar nomes de comando:

```text
abrir_compras
criar_contexto
processar_pedido
```

Não usar nomes genéricos demais:

```text
updated
data_changed
status_changed
```

sem informar o agregado.

#### Versão

A versão deve ficar em campo próprio:

```text
tipo = frame.purchase_order_item.allocated
versao_evento = 1
```

Não é necessário incluir `.v1` no nome persistido, desde que a versão esteja explícita no envelope.

#### Compatibilidade

Mudanças aditivas opcionais podem manter a mesma versão quando consumidores antigos continuarem funcionando.

Mudanças incompatíveis exigem:

- nova versão;
- adapter de compatibilidade quando necessário;
- período de transição;
- consumidores declarando versões suportadas.

#### Evento legado do pacote

Se o ambiente atual publicar:

```text
wise.work_package.ativo
```

esse nome será tratado como alias legado de:

```text
wise.work_package.activated
```

Novos produtores devem usar o nome canônico. Um adapter temporário converte o evento legado, sem reescrever o histórico.

---

### 17.9 Catálogo canônico de eventos do SquadWise

#### Eventos institucionais de pacote

```text
wise.work_package.created
wise.work_package.updated
wise.work_package.activated
wise.work_package.suspended
wise.work_package.concluded
wise.work_package.cancelled
wise.work_package.modules_changed
wise.work_package.scope_changed
wise.work_package.revision_published
wise.work_package.purchase_gate_opened
wise.work_package.purchase_gate_closed
wise.work_package.production_gate_opened
wise.work_package.production_gate_closed
```

#### Regras

`created`
: Comunica criação institucional, mas não obriga os módulos a criar contexto antes da ativação.

`activated`
: Dispara `ensure` nos módulos participantes.

`modules_changed`
: Consumidores verificam participação atual. A remoção do módulo não apaga histórico ou transações.

`scope_changed`
: Só pode ocorrer conforme as regras de revisão. Não move alocações ou ordens silenciosamente.

`revision_published`
: Informa que uma nova revisão institucional tornou-se vigente.

`purchase_gate_opened/closed`
: Comunica portão institucional. Não altera automaticamente status operacional, pedidos ou recebimentos.

`production_gate_opened/closed`
: Comunica decisão institucional. Não inventa disponibilidade ou reserva.

#### Payload mínimo de ativação

```json
{
  "pacote_id": "uuid",
  "empresa_id": "uuid",
  "obra_id": "uuid",
  "revisao": 3,
  "modulos_participantes": ["frame", "board"],
  "status_institucional": "ATIVO"
}
```

O consumidor deverá confirmar os módulos na fonte atual antes de agir, porque o payload pode estar antigo no momento do retry.

---

### 17.10 Catálogo canônico de eventos do SquadFrame

#### Contexto de Compras

```text
frame.package_procurement.context_created
frame.package_procurement.context_deactivated
frame.package_procurement.blocked
frame.package_procurement.unblocked
frame.package_procurement.state_changed
frame.package_procurement.risk_detected
frame.package_procurement.data_inconsistency_detected
frame.package_procurement.blocking_need_resolved
frame.package_procurement.all_blocking_needs_received
frame.package_procurement.all_needs_ordered
frame.package_procurement.all_needs_received
```

#### Lista de Materiais

```text
frame.material_list.created
frame.material_list.revision_started
frame.material_list.released
frame.material_list.superseded
frame.material_list.cancelled
```

#### Necessidades

```text
frame.material_need.created
frame.material_need.updated
frame.material_need.cancelled
frame.material_need.substituted
frame.material_need.manual_item_authorized
```

#### Solicitações

```text
frame.purchase_request_item.allocated
frame.purchase_request_item.allocation_cancelled
frame.purchase_request_item.allocation_reallocated
```

#### Pedidos

```text
frame.purchase_order_item.allocated
frame.purchase_order_item.allocation_cancelled
frame.purchase_order_item.allocation_reallocated
frame.purchase_order_item.excess_authorized
```

#### Recebimentos

```text
frame.receipt_item.allocated
frame.receipt_item.allocation_reversed
frame.receipt_item.allocation_reallocated
frame.receipt_item.excess_authorized
```

#### Regras de emissão

- eventos de criação/cancelamento de alocação são emitidos pela operação transacional correspondente;
- `state_changed` só é emitido quando `estado_anterior != estado_novo`;
- eventos `all_*` são marcos semânticos, não disparados a cada recálculo;
- `risk_detected` deve possuir código de risco estável e não ser repetido enquanto o mesmo risco permanecer aberto;
- `data_inconsistency_detected` identifica anomalia e não corrige automaticamente documento aprovado;
- recálculo sem mudança gera `NOOP`, sem evento semântico duplicado.

---

### 17.11 Payload mínimo e payload proibido

O payload deve carregar apenas os dados necessários ao fato.

Exemplo de alocação de pedido:

```json
{
  "alocacao_id": "uuid",
  "pedido_item_id": "uuid",
  "necessidade_id": "uuid",
  "pacote_id": "uuid",
  "quantidade_destinada": "120.000",
  "unidade_canonica": "BARRA",
  "estado_administrativo": "ATIVA"
}
```

Não incluir:

- linha completa do pedido;
- dados bancários;
- tokens ou URLs privadas permanentes;
- objeto inteiro do usuário;
- documentos anexos em base64;
- segredos do fornecedor;
- snapshots gigantes do pacote;
- campos que o consumidor pode consultar de forma segura.

Antes/depois detalhado pertence à auditoria, não ao payload de todos os consumidores.

---

### 17.12 Publicação transacional

A operação crítica deverá seguir:

```text
BEGIN

1. autenticar o ator;
2. resolver empresa, obra e pacote no servidor;
3. exigir permissão e escopo;
4. validar portões e estado;
5. obter locks necessários;
6. executar alteração de negócio;
7. registrar auditoria;
8. inserir evento na outbox local;
9. confirmar idempotência do comando;

COMMIT
```

Se os passos 6, 7 ou 8 forem obrigatórios para a operação e um deles falhar, a transação deve ser revertida.

Notificação por e-mail, webhook, Slack ou WhatsApp nunca deve ocorrer dentro da transação principal. Ela é consequência posterior do evento.

---

### 17.13 Idempotência de comandos

Idempotência não se limita a consumidores de eventos. Comandos sensíveis também deverão suportar repetição segura.

Exemplos:

- ativar pacote;
- criar contexto de Compras;
- publicar lista;
- criar alocação;
- realocar quantidade;
- confirmar recebimento;
- estornar recebimento;
- abrir ou fechar portão;
- executar importação;
- executar reconciliação corretiva.

#### Estratégia

Usar primeiro constraints naturais:

```text
UNIQUE (pacote_id) em frame_pacote_compras
UNIQUE da identidade ativa da alocação conforme modelo definido
UNIQUE da revisão dentro do pacote
```

Quando a operação não possuir chave natural suficiente, usar registro conceitual equivalente a:

```text
infra_comando_idempotencia
- empresa_id
- ator_id
- comando
- idempotency_key
- payload_hash
- estado
- resultado_referencia
- criado_em
- concluido_em
- expira_em
```

Constraint:

```text
UNIQUE (empresa_id, ator_id, comando, idempotency_key)
```

#### Regras

1. A chave identifica uma intenção, não uma tentativa de rede.
2. A mesma chave com o mesmo payload retorna o resultado anterior.
3. A mesma chave com payload diferente retorna conflito de idempotência.
4. Falha transitória antes de alterar estado permite retry.
5. Falha de negócio concluída pode ser armazenada para evitar repetição abusiva, conforme o comando.
6. O resultado persistido deve referenciar entidades, não armazenar respostas grandes ou sensíveis.
7. Retenção é configurável e nunca deve remover constraints naturais.
8. Comandos de importação usam identificador estável da origem, arquivo e linha quando possível.

Exemplo:

```text
comando: frame.recebimento.alocar
idempotency_key: UI-OP-7f8c...
payload_hash: sha256(...)
```

Dois cliques no botão não criam duas alocações.

---

### 17.14 Idempotência de produção de eventos

Cada ocorrência semântica deve possuir chave estável.

Exemplos conceituais:

```text
work-package:{pacote_id}:activated:{versao_do_pacote}
material-list:{lista_id}:released:{revisao}
order-allocation:{alocacao_id}:created
receipt-allocation:{alocacao_id}:reversed:{versao}
procurement-context:{contexto_id}:state:{versao_estado}
```

A infraestrutura deverá impedir duplicidade por algo equivalente a:

```text
UNIQUE (modulo_produtor, tipo, idempotency_key)
```

A chave não deve ser apenas um UUID aleatório novo a cada retry, pois isso não deduplica a ocorrência.

---

### 17.15 Idempotência de consumidores

Todo consumidor deve:

1. registrar ou reservar a entrega evento × consumidor;
2. detectar processamento anterior;
3. executar dentro de transação quando altera banco;
4. utilizar constraints e operações `upsert` controladas;
5. consultar estado atual quando o evento puder estar antigo;
6. registrar `PROCESSADO`, `IGNORADO`, `RETRY` ou `DEAD_LETTER`;
7. não emitir novamente o mesmo fato em loop;
8. permitir reprocessamento seguro.

Exemplo do consumidor de ativação:

```text
Evento: wise.work_package.activated
Consumidor: frame.ensure_package_procurement_context
```

Comportamento:

```text
1. carregar pacote atual;
2. verificar se está ATIVO;
3. verificar se Frame ainda participa;
4. chamar ensureFramePackageContext(pacote_id);
5. se já existir, retornar NOOP;
6. se criar, emitir context_created uma única vez;
7. registrar sucesso da entrega.
```

Receber o mesmo evento dez vezes continua resultando em um único contexto.

---

### 17.16 Retry, lease e dead letter

#### Retry

Falhas transitórias devem utilizar backoff exponencial com jitter.

Exemplos transitórios:

- timeout;
- conexão indisponível;
- lock temporário;
- serviço externo fora do ar;
- rate limit;
- worker interrompido.

Exemplos não transitórios:

- versão de evento não suportada;
- entidade inválida definitivamente;
- constraint que revela inconsistência de dados;
- permissão técnica do consumidor ausente;
- payload obrigatório malformado.

Falhas não transitórias não devem ficar em loop rápido.

#### Lease

Ao reservar uma entrega:

- identificar worker;
- gravar início e expiração;
- renovar apenas enquanto estiver processando;
- permitir recuperação depois da expiração;
- impedir dois workers de processarem simultaneamente a mesma entrega.

#### Dead letter

Depois do limite configurável de tentativas ou de falha classificada como permanente:

```text
estado = DEAD_LETTER
```

A dead letter deverá guardar:

- consumidor;
- evento;
- tentativas;
- código do último erro;
- resumo sanitizado;
- primeira e última falha;
- versão do consumidor;
- possibilidade de replay.

#### Replay

Replay exige:

- permissão específica;
- justificativa;
- auditoria;
- seleção explícita de consumidor;
- compatibilidade de versão;
- opção de dry-run quando possível;
- nova tentativa da mesma entrega, e não criação de um novo evento falso.

Replay não pode alterar o payload histórico.

---

### 17.17 Ordem, concorrência e versões do agregado

Eventos podem chegar fora de ordem. A arquitetura não dependerá de ordem global.

Quando a ordem for relevante:

- usar `aggregate_version` monotônica;
- comparar a versão recebida com a versão aplicada pela projeção;
- ignorar eventos mais antigos quando a projeção já estiver adiante;
- consultar a fonte atual para consumidores do tipo `ensure`;
- não usar timestamp como única ordenação semântica.

Exemplo:

```text
v5 — purchase_gate_opened
v6 — purchase_gate_closed
```

Se `v5` chegar depois de `v6`, o Frame não deve reabrir operações. O consumidor consulta o pacote atual ou rejeita a versão obsoleta.

#### Concorrência em alocações

Operações que alteram somas devem bloquear o menor agregado necessário:

- item de solicitação;
- item de pedido;
- item de recebimento;
- necessidade;
- lista/revisão quando aplicável.

Usar:

- `SELECT ... FOR UPDATE`;
- advisory lock transacional quando múltiplas tabelas formarem o agregado;
- versionamento otimista para edições longas de UI;
- constraints como última linha de defesa.

O cálculo “ler, validar, gravar” sem lock é proibido em rateios concorrentes.

---

### 17.18 Reconciliação como requisito obrigatório

Evento não é a única garantia. O SquadSystem deverá possuir rotinas determinísticas e idempotentes de reconciliação.

Uma reconciliação:

- lê as fontes de verdade;
- compara com o estado derivado esperado;
- informa diferenças;
- corrige apenas o que é seguro e autorizado;
- não altera documentos imutáveis silenciosamente;
- pode operar em `dry-run`;
- produz relatório;
- registra auditoria quando aplicar correção;
- pode ser executada novamente sem efeitos adicionais.

#### Modos

```text
DRY_RUN
APLICAR_CORRECOES_SEGURAS
APLICAR_COM_OVERRIDES_AUTORIZADOS
```

O modo padrão administrativo deve ser `DRY_RUN`.

---

### 17.19 Rotinas mínimas de reconciliação

#### `ensureFramePackageContext(pacoteId)`

Garante exatamente um contexto de Compras quando:

- pacote existe;
- pacote está em estado compatível;
- Frame participa;
- contexto não foi encerrado definitivamente por regra válida.

Não apaga contexto se Frame deixar de participar. Nesse caso, preserva histórico e aplica estado de inativação conforme regra futura.

#### `reconcileFramePackageContexts(scope)`

Compara todos os pacotes elegíveis com os contextos existentes.

Detecta:

- pacote ativo com Frame e sem contexto;
- contexto duplicado;
- contexto de pacote inexistente;
- contexto ativo para módulo removido;
- divergência de empresa/obra derivada.

#### `reconcileMaterialList(packageId)`

Verifica:

- uma única lista vigente por pacote e revisão;
- lista liberada imutável;
- necessidades pertencendo à lista correta;
- vínculos N:N de tipologias válidos;
- snapshots históricos presentes;
- substituições e cancelamentos coerentes.

#### `reconcilePurchaseAllocations(packageId | documentId)`

Verifica:

- soma alocada por item;
- unidades compatíveis;
- necessidade e pacote coerentes;
- estado administrativo ativo/cancelado;
- alocação de pedido derivada de solicitação quando aplicável;
- excessos com autorização;
- cabeçalhos legados apenas como conveniência.

#### `reconcileReceiptAllocations(receiptId | packageId)`

Verifica:

- recebimento não excedendo quantidade aceita sem override;
- vínculo com alocação do pedido;
- estornos;
- distribuição pendente;
- excesso recebido autorizado;
- item rejeitado não contado como recebido aceito.

#### `recalculatePackageProcurement(packageId)`

Reconstrói o read model da Etapa 4 a partir de:

- lista vigente;
- necessidades ativas;
- alocações ativas;
- pedidos válidos;
- recebimentos aceitos;
- bloqueios manuais;
- portões atuais.

Emite `state_changed` somente se houver transição semântica real.

#### `reconcileEventDeliveries(scope)`

Detecta:

- evento sem entrega registrada para consumidor obrigatório;
- lease vencido;
- retry atrasado;
- versão não suportada;
- dead letter;
- entrega marcada como processada sem projeção esperada.

#### `rebuildPackageProcurementProjection(packageId)`

Descarta e reconstrói somente projeções materializadas, nunca transações.

---

### 17.20 Gatilhos de reconciliação

A reconciliação poderá ocorrer:

1. depois de mutações críticas;
2. ao consumir eventos;
3. ao abrir um pacote cujo contexto esperado não existe;
4. em job periódico configurável;
5. em backfill/migração;
6. por comando administrativo;
7. depois de dead letter resolvida;
8. depois de deploy que altere algoritmo de projeção.

A abertura de tela pode executar apenas `ensure` barato e específico. Reconciliação ampla não deve bloquear toda navegação.

---

### 17.21 Resultado padrão de reconciliação

Toda rotina deverá retornar contrato semelhante a:

```text
reconciliation_id
scope
mode
started_at
finished_at
algorithm_version

checked
created
updated
unchanged
warnings
errors
requires_manual_action

changes[]
anomalies[]
```

Cada alteração deve informar:

- entidade;
- regra;
- antes;
- depois;
- correção aplicada ou sugerida;
- severidade;
- possibilidade de rollback.

O resultado detalhado poderá ser persistido como artefato administrativo com retenção controlada, sem transformar o relatório em fonte de verdade.

---

### 17.22 Limites da correção automática

Reconciliação pode corrigir automaticamente:

- contexto ausente que pode ser criado idempotentemente;
- projeção materializada desatualizada;
- entrega de evento ausente;
- lease expirado;
- estado calculado inconsistente com as fontes;
- índice de busca/projeção reconstruível.

Reconciliação não pode corrigir silenciosamente:

- quantidade de pedido emitido;
- quantidade recebida confirmada;
- lista de materiais liberada;
- revisão institucional publicada;
- alocação aprovada;
- estorno financeiro;
- portão institucional;
- exclusão lógica de documento;
- mudança de pacote de item já recebido.

Nesses casos, deverá:

- gerar anomalia;
- bloquear automações dependentes quando necessário;
- exigir operação de ajuste, realocação, substituição ou estorno;
- registrar motivo e autoria.

---

### 17.23 Camadas de auditoria

A arquitetura separa quatro camadas:

| Camada | Finalidade | Imutável | Fonte de cálculo |
|---|---|---:|---:|
| Transação de domínio | Estado oficial | Conforme entidade | Sim |
| Evento de domínio | Integração e fato semântico | Sim | Não |
| Auditoria | Segurança, autoria e antes/depois | Sim | Não |
| Timeline | Leitura humana | Reconstruível | Não |

Não usar comentário de timeline como justificativa formal de override.

---

### 17.24 Contrato canônico de auditoria

Reutilizar a infraestrutura de auditoria já existente no SquadWise quando ela atender ao contrato. Se houver tabelas distintas por módulo, elas devem expor a mesma interface lógica antes de criar outra estrutura.

Contrato mínimo:

```text
id
empresa_id
obra_id
pacote_id

modulo
acao
entidade_tipo
entidade_id

ator_tipo
ator_usuario_id
ator_servico
ator_impersonado_id

permissao_utilizada
escopo_autorizacao

origem
request_id
session_id
correlation_id
causation_id
idempotency_key

resultado
motivo
codigo_erro

antes_json
apos_json
diff_json
metadata

ocorrido_em
```

#### Valores recomendados

`ator_tipo`:

```text
USER
SYSTEM
SERVICE
MIGRATION
IMPORT
```

`origem`:

```text
UI
SERVER_ACTION
RPC
EVENT_CONSUMER
RECONCILIATION
MIGRATION
IMPORT
ADMIN_TOOL
```

`resultado`:

```text
SUCCESS
DENIED
FAILED
NOOP
NOOP_DUPLICATE
```

---

### 17.25 Regras de imutabilidade da auditoria

1. Registros são append-only.
2. Usuários da aplicação não recebem `UPDATE` ou `DELETE` direto.
3. Correção de descrição de auditoria gera novo registro, não edição do anterior.
4. Antes/depois são sanitizados.
5. Campos sensíveis podem ser mascarados ou omitidos.
6. Exportação exige permissão específica.
7. A política de retenção será definida por ambiente e contrato, mas o MVP não deverá executar hard delete automático de auditoria operacional crítica.
8. Jobs de retenção nunca removem a transação de domínio.
9. Acesso à auditoria também pode ser auditado quando envolver dados sensíveis.
10. Uma cadeia criptográfica de hashes pode ser adicionada futuramente se houver requisito regulatório; não é pré-requisito do MVP.

---

### 17.26 Ações que exigem auditoria obrigatória

#### SquadWise

- criar, editar, ativar, suspender, concluir ou cancelar pacote;
- alterar escopo;
- publicar revisão;
- adicionar ou remover módulo participante;
- abrir ou fechar portão de Compras;
- abrir ou fechar portão de Produção;
- executar override de liberação;
- modificar responsável ou prazo institucional quando afetar operação ativa.

#### SquadFrame

- criar ou bloquear contexto de Compras;
- desbloquear contexto;
- criar, revisar, liberar, substituir ou cancelar Lista de Materiais;
- criar item livre;
- alterar necessidade ativa;
- cancelar ou substituir necessidade;
- alocar, realocar ou cancelar item de solicitação;
- alocar, realocar ou cancelar item de pedido;
- autorizar excesso;
- alocar, realocar ou estornar recebimento;
- executar compra direta;
- aplicar override de bloqueio ou cobertura;
- executar reconciliação corretiva.

#### Infraestrutura

- replay de evento;
- mover entrega para dead letter;
- retirar de dead letter;
- alterar configuração de consumidor;
- executar backfill;
- importar dados;
- conceder permissão de override;
- exportar auditoria.

---

### 17.27 Motivos e overrides

Overrides não podem ser um booleano invisível.

Toda operação de exceção deverá registrar:

```text
codigo_do_override
motivo
ator
permissao_especifica
estado_anterior
estado_resultante
impactos conhecidos
correlation_id
```

Motivo obrigatório para:

- liberar Produção com disponibilidade não verificada;
- alocar acima da necessidade;
- receber acima da alocação;
- realocar item já comprometido;
- estornar recebimento;
- alterar lista em estado protegido;
- reabrir pacote concluído;
- replay manual;
- aplicar correção destrutiva autorizada.

Motivos vagos como “ajuste”, “erro” ou “teste” podem ser rejeitados conforme política de validação.

O override não deve apagar o impedimento original. O read model deverá mostrar:

```text
impedimento: MATERIAL_NAO_RESERVADO
override_aplicado: true
motivo: "produção autorizada para corte com saldo físico conferido manualmente"
```

---

### 17.28 Limite de segurança entre cliente, servidor e banco

Fluxo obrigatório para mutações:

```text
Client Component
  ↓
Server Action / Route Handler
  ↓
Service de domínio
  ↓
Repository / RPC segura
  ↓
PostgreSQL
```

Regras:

- Client Component não escreve diretamente em tabelas críticas;
- IDs enviados pelo cliente são tratados como não confiáveis;
- empresa, obra e pacote são resolvidos novamente no servidor;
- validação Zod não substitui constraint do banco;
- Service aplica permissão e regra de domínio;
- Repository não decide autorização;
- RPC crítica repete as invariantes que precisam de garantia transacional;
- respostas não expõem stack trace, SQL ou dados de outro escopo.

---

### 17.29 `service_role` não é autorização

O uso de cliente administrativo do Supabase deve ser restrito ao servidor.

Mesmo quando a operação usa `service_role`, ela deverá receber contexto explícito:

```text
actor_user_id
actor_type
empresa_id resolvida
permission_key
correlation_id
```

E validar:

- usuário autenticado quando a origem for humana;
- permissão efetiva;
- escopo organizacional;
- módulo participante;
- portões e estados;
- motivo de override.

É proibido interpretar “a query passou com service role” como “a operação estava autorizada”.

Consumers de evento atuam como identidades técnicas específicas, não como um administrador genérico sem rastreabilidade.

---

### 17.30 RLS e acesso direto

Para novas tabelas:

1. habilitar RLS;
2. negar escrita direta de `anon` e `authenticated` por padrão;
3. não usar `GRANT ALL` genérico;
4. preferir leitura por views/RPCs sanitizadas quando a tabela contiver dados internos;
5. derivar `empresa_id` pelo pacote no servidor;
6. validar coerência entre `empresa_id`, `obra_id`, `pacote_id` e entidades filhas;
7. impedir referência cross-empresa mesmo quando o UUID for conhecido;
8. manter policies pequenas e testáveis;
9. não confiar em coluna `empresa_id` enviada pelo cliente;
10. auditar exceções administrativas.

Durante a fase monoempresa, as mesmas invariantes deverão permanecer preparadas. A existência de uma empresa única hoje não autoriza criar tabelas impossíveis de isolar amanhã.

---

### 17.31 Hardening de RPCs `SECURITY DEFINER`

Toda RPC crítica `SECURITY DEFINER` deverá:

- usar schema qualificado;
- definir `search_path` seguro e mínimo;
- revogar execução pública;
- conceder execução somente aos papéis necessários;
- chamar `fn_exigir_permissao` ou contrato equivalente;
- validar ator e empresa;
- não usar SQL dinâmico com entrada do usuário;
- não aceitar resultado de autorização pronto do cliente;
- tratar `NULL` explicitamente;
- obter locks antes de validar somas concorrentes;
- produzir auditoria e evento na mesma transação;
- retornar códigos de domínio previsíveis;
- não retornar dados sensíveis desnecessários.

Exemplo conceitual:

```sql
ALTER FUNCTION frame_alocar_item_pedido(...) SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION frame_alocar_item_pedido(...) FROM PUBLIC;
```

Os nomes e schemas exatos serão fechados na Etapa 6.

---

### 17.32 Modelo de autorização efetiva

Autorização não é apenas “possui a string da permissão”.

Resultado efetivo:

```text
Autorizado =
  permissão funcional
  AND escopo organizacional
  AND acesso à obra/pacote
  AND módulo participante
  AND estado compatível
  AND portão compatível
  AND ausência de bloqueio duro
```

Quando existir override:

```text
Autorizado com override =
  permissão normal
  AND permissão de override específica
  AND motivo obrigatório
  AND auditoria
  AND regra permite exceção
```

Uma permissão administrativa genérica não deve ignorar todas as invariantes.

---

### 17.33 Escopos de autorização

As permissões podem ser limitadas por:

```text
empresa
unidade
obra
pacote
setor
função no pacote
```

Exemplos:

- comprador visualiza todos os pacotes de sua unidade;
- responsável da obra gerencia somente seus pacotes;
- recebedor aloca recebimentos, mas não publica Lista de Materiais;
- gestor de Produção pode abrir portão apenas em obras sob sua responsabilidade;
- auditor possui leitura sem permissão de mutação.

O escopo deve ser calculado no servidor e, quando possível, reforçado no banco.

---

### 17.34 Catálogo conceitual de permissões do SquadWise

```text
wise.pacotes.visualizar
wise.pacotes.criar
wise.pacotes.editar
wise.pacotes.escopo.gerenciar
wise.pacotes.modulos.gerenciar
wise.pacotes.revisoes.publicar
wise.pacotes.ativar
wise.pacotes.suspender
wise.pacotes.concluir
wise.pacotes.cancelar

wise.pacotes.liberar_compras
wise.pacotes.fechar_compras
wise.pacotes.liberar_producao
wise.pacotes.revogar_liberacao_producao
wise.pacotes.override_liberacao
```

Permissão de editar pacote não implica permissão de abrir portões.

---

### 17.35 Catálogo conceitual de permissões do SquadFrame

#### Contexto

```text
frame.pacotes.compras.visualizar
frame.pacotes.compras.gerenciar
frame.pacotes.compras.bloquear
frame.pacotes.compras.desbloquear
frame.pacotes.compras.override_bloqueio
```

#### Lista de Materiais

```text
frame.pacotes.compras.listas.visualizar
frame.pacotes.compras.listas.criar
frame.pacotes.compras.listas.editar
frame.pacotes.compras.listas.revisar
frame.pacotes.compras.listas.liberar
frame.pacotes.compras.listas.cancelar
```

#### Necessidades

```text
frame.pacotes.compras.necessidades.visualizar
frame.pacotes.compras.necessidades.gerenciar
frame.pacotes.compras.necessidades.item_livre
frame.pacotes.compras.necessidades.cancelar
frame.pacotes.compras.necessidades.substituir
```

#### Alocações

```text
frame.pacotes.compras.alocacoes.visualizar
frame.pacotes.compras.alocacoes.gerenciar
frame.pacotes.compras.compra_direta
frame.pacotes.compras.alocacoes.excedente
frame.pacotes.compras.alocacoes.realocar
frame.pacotes.compras.recebimentos.alocar
frame.pacotes.compras.recebimentos.realocar
frame.pacotes.compras.recebimentos.estornar
```

#### Cobertura

```text
frame.pacotes.compras.cobertura.visualizar
frame.pacotes.compras.override_excesso
```

As chaves finais devem respeitar o padrão real já adotado pelo projeto. Capacidades distintas não devem ser condensadas em `frame.pacotes.compras.admin`.

---

### 17.36 Permissões de infraestrutura e auditoria

```text
system.eventos.visualizar
system.eventos.reprocessar
system.eventos.dead_letter.gerenciar
system.eventos.consumidores.gerenciar

system.reconciliacao.visualizar
system.reconciliacao.executar_dry_run
system.reconciliacao.aplicar
system.reconciliacao.aplicar_override

system.auditoria.visualizar
system.auditoria.exportar
system.auditoria.visualizar_dados_sensiveis
```

Replay, reconciliação corretiva e exportação não devem ficar disponíveis apenas porque o usuário é gestor de Compras.

---

### 17.37 Identidades técnicas dos consumidores

Cada consumidor deve possuir identidade estável:

```text
frame.ensure_package_procurement_context
frame.recalculate_package_procurement
board.sync_operational_package
stock.sync_package_supply_context
flow.sync_package_production_context
```

A identidade técnica será registrada em:

- entregas;
- auditoria;
- logs;
- métricas;
- dead letters.

Consumers não herdam automaticamente permissões de um usuário humano. Eles recebem capabilities técnicas mínimas para sua função.

Quando um evento originado por usuário causar uma mutação derivada, a auditoria deverá preservar:

```text
ator_tipo = SERVICE
ator_servico = frame.ensure_package_procurement_context
causation_id = evento_id
correlation_id = comando_original
originador_usuario_id = usuário que causou a cadeia, quando disponível
```

---

### 17.38 Privacidade e minimização de dados

Eventos e auditoria devem seguir minimização:

- usar IDs em vez de cópias completas;
- não replicar CPF, endereço pessoal ou dados bancários sem necessidade;
- não registrar tokens;
- mascarar segredos em before/after;
- não armazenar conteúdo de anexos;
- não incluir URLs públicas permanentes de arquivos privados;
- separar metadado técnico de payload de domínio;
- controlar exportação;
- definir retenção por categoria.

Logs técnicos não devem receber payload integral por padrão.

---

### 17.39 Modelo de ameaças mínimo

| Ameaça | Mitigação obrigatória |
|---|---|
| Usuário troca `pacote_id` no request | Resolver pacote e escopo no servidor; RLS/RPC |
| Clique duplo cria alocação duplicada | Idempotency key + constraint + transação |
| Evento repetido cria dois contextos | `UNIQUE(pacote_id)` + consumidor idempotente |
| Evento antigo reabre portão | `aggregate_version` + consulta ao estado atual |
| Dois compradores rateiam o mesmo saldo | Lock transacional + revalidação de soma |
| `service_role` ignora autorização | Service exige permissão e ator explícito |
| Replay executado sem controle | Permissão específica + motivo + auditoria |
| Evento contém informação sensível | Envelope mínimo + sanitização |
| Auditoria é alterada por usuário | Append-only + privilégios restritos |
| Módulo removido apaga histórico | Inativação lógica; sem cascade destrutivo operacional |
| Reconciliação altera pedido emitido | Limites de correção automática |
| Worker morre processando evento | Lease expirável + retry |
| Consumidor com bug entra em loop | Tentativas limitadas + dead letter |
| Cross-empresa por UUID conhecido | Empresa derivada + FK/validação + escopo |
| Alteração de revisão move compromissos | Nova revisão + comparação; sem migração silenciosa |

---

### 17.40 Códigos de erro e resultado

A camada de domínio deverá utilizar códigos estáveis, por exemplo:

```text
PERMISSION_DENIED
SCOPE_DENIED
PACKAGE_NOT_FOUND
PACKAGE_NOT_ACTIVE
MODULE_NOT_ENABLED
PURCHASE_GATE_CLOSED
PRODUCTION_GATE_CLOSED
CONTEXT_BLOCKED
REVISION_CONFLICT
IDEMPOTENCY_CONFLICT
ALLOCATION_EXCEEDS_AVAILABLE
UNIT_INCOMPATIBLE
RECEIPT_ALREADY_ALLOCATED
EVENT_VERSION_UNSUPPORTED
RECONCILIATION_REQUIRED
DATA_INCONSISTENCY
```

Mensagens humanas podem mudar. Códigos usados por UI, testes e observabilidade devem permanecer estáveis.

Erros não devem revelar se uma entidade de outra empresa existe. Para recursos fora do escopo, o comportamento poderá ser equivalente a “não encontrado”.

---

### 17.41 Transações que devem falhar fechadas

Falha fechada significa não confirmar parcialmente a operação.

Devem falhar fechadas:

- alteração de portão sem auditoria;
- publicação de lista sem revisão válida;
- alocação sem vínculo coerente;
- recebimento sem saldo ou override;
- mutação crítica sem event outbox quando o evento for parte do contrato de integração;
- override sem motivo;
- comando com conflito de idempotência;
- operação cross-empresa;
- cálculo sob concorrência sem lock necessário.

Falhas em consumidores posteriores não revertem uma transação já confirmada; são tratadas por retry e reconciliação.

---

### 17.42 Observabilidade mínima desta etapa

A Etapa 9 aprofundará observabilidade, mas a infraestrutura desta etapa deverá expor desde o início:

- quantidade de eventos pendentes;
- idade do evento pendente mais antigo;
- entregas em retry;
- dead letters por consumidor;
- tempo médio de processamento;
- taxa de falha por tipo;
- reconciliações executadas;
- anomalias encontradas;
- comandos deduplicados;
- conflitos de idempotência;
- acessos negados;
- overrides aplicados.

Todas as métricas devem permitir filtro por módulo e ambiente. IDs pessoais e payloads não devem virar labels de alta cardinalidade.

---

### 17.43 Fluxo completo de exemplo

#### Ativação

```text
Usuário ativa PAT-001 no Wise
    ↓
permissão wise.pacotes.ativar validada
    ↓
lotes_obra.status = ATIVO
    ↓
auditoria SUCCESS
    ↓
wise.work_package.activated gravado na outbox
    ↓ commit
```

#### Consumo

```text
Dispatcher registra entrega para:
frame.ensure_package_procurement_context
    ↓
consumer confirma que Frame participa
    ↓
ensureFramePackageContext(PAT-001)
    ↓
contexto criado ou NOOP
    ↓
entrega PROCESSADO
```

#### Falha recuperável

```text
consumer perde conexão antes de registrar sucesso
    ↓
lease expira
    ↓
evento é entregue novamente
    ↓
UNIQUE(pacote_id) detecta contexto existente
    ↓
ensure retorna NOOP
    ↓
entrega PROCESSADO
```

Nenhum contexto duplicado é criado.

---

### 17.44 Fluxo de alocação com idempotência e auditoria

```text
Comprador destina 120 barras do pedido PC-145 à N-001
    ↓
Server Action envia operation_id
    ↓
Service valida usuário, escopo, unidade e saldo
    ↓
lock no pedido_item e alocações ativas
    ↓
cria frame_pedido_item_alocacoes
    ↓
registra auditoria
    ↓
grava frame.purchase_order_item.allocated
    ↓
confirma idempotência
    ↓ commit
```

Se o navegador repetir a chamada:

```text
mesma idempotency_key + mesmo hash
    ↓
retorna alocação já criada
    ↓
resultado NOOP_DUPLICATE
```

Se repetir com 130 barras usando a mesma chave:

```text
IDEMPOTENCY_CONFLICT
```

---

### 17.45 Fluxo de reconciliação de recebimento

```text
Recebimento R-010 possui 100 barras aceitas
Alocações registradas somam 80
```

`DRY_RUN` retorna:

```text
anomalia: RECEIPT_UNALLOCATED_QUANTITY
quantidade_aceita: 100
quantidade_alocada: 80
pendente_distribuicao: 20
correcao_automatica: NÃO
```

O sistema não distribui automaticamente as 20 barras entre pacotes. Um usuário autorizado confirma o destino ou registra parcela geral conforme regra da Etapa 3.

---

### 17.46 Fluxo de dead letter e recuperação

```text
Evento frame.receipt_item.allocated v2
Consumidor aceita somente v1
    ↓
EVENT_VERSION_UNSUPPORTED
    ↓
DEAD_LETTER
```

Depois do deploy compatível:

```text
Administrador abre a dead letter
    ↓
executa dry-run
    ↓
informa motivo
    ↓
reprocessa somente o consumidor afetado
    ↓
mesma entrega volta a PENDENTE/RETRY
    ↓
consumer processa idempotentemente
```

O evento histórico não é editado nem duplicado.

---

### 17.47 Decisões que ficam para a Etapa 6

Esta etapa define o comportamento, mas a Etapa 6 fechará:

- interfaces TypeScript exatas;
- estrutura de pastas;
- nomes de Services e Repositories;
- assinatura das Server Actions;
- assinatura e retorno das RPCs;
- schemas Zod;
- adapters de `wise_eventos` e `eventos_dominio`;
- dispatcher e workers;
- mecanismo concreto de locks;
- contratos de erro;
- composição transacional entre auditoria, outbox e domínio.

Nenhuma implementação poderá reduzir as garantias estabelecidas aqui.

---

### 17.48 Critérios de aceite da Etapa 5

A Etapa 5 é considerada concluída arquiteturalmente quando:

- comando, evento, auditoria e timeline estão separados;
- `wise_eventos` e `eventos_dominio` possuem estratégia de unificação lógica sem terceira outbox concorrente;
- envelope canônico está definido;
- entrega é modelada por evento × consumidor;
- garantia é declarada como ao menos uma vez;
- consumidores obrigatoriamente são idempotentes;
- eventos são gravados depois da validação e junto da transação quando críticos;
- não existe `processado=true` global para vários consumidores;
- nomenclatura, versionamento e alias legado estão definidos;
- catálogos mínimos de eventos Wise e Frame estão definidos;
- payloads seguem minimização;
- idempotência de comandos, produtores e consumidores está separada;
- mesma chave com payload diferente gera conflito;
- retry, lease e dead letter estão definidos;
- replay exige permissão, motivo e auditoria;
- ordem global não é presumida;
- `aggregate_version` e consulta ao estado atual tratam eventos obsoletos;
- concorrência de alocações exige lock e revalidação;
- reconciliação é determinística, idempotente e possui dry-run;
- rotinas mínimas de contexto, listas, alocações, recebimentos, cobertura e entregas estão especificadas;
- correções automáticas não alteram documentos imutáveis;
- auditoria é append-only e separada de eventos;
- ações críticas e overrides exigem auditoria;
- `service_role` não substitui autorização;
- novas tabelas seguem RLS default-deny e não usam `GRANT ALL` genérico;
- RPCs `SECURITY DEFINER` possuem hardening definido;
- autorização combina permissão, escopo, módulo, estado, portão e bloqueios;
- permissões de domínio e infraestrutura estão separadas;
- consumers possuem identidade técnica própria;
- dados sensíveis são minimizados;
- ameaças principais possuem mitigação explícita;
- códigos de erro estáveis estão previstos;
- métricas mínimas de eventos, reconciliação, idempotência e segurança estão definidas;
- o documento está pronto para transformar essas regras em contratos de código e RPCs na Etapa 6.

## 18. Contratos internos e arquitetura de código

**Estado:** Concluída — Etapa 6.

Esta etapa transforma as decisões de domínio, segurança, eventos e consistência das Etapas 1 a 5 em contratos concretos de implementação para Next.js, TypeScript, Supabase e PostgreSQL.

A arquitetura definida aqui é obrigatória para todo código novo relacionado a:

- Pacotes de Trabalho no SquadWise;
- contexto de Compras no SquadFrame;
- listas e necessidades de materiais;
- alocações de solicitação, pedido e recebimento;
- cobertura e estados calculados;
- auditoria, outbox, idempotência e reconciliação;
- integrações futuras com Board, Stock e Flow.

O objetivo não é criar abstrações por estética. Cada camada existe para impedir:

- acesso direto ao banco pela UI;
- regras duplicadas em Actions e componentes;
- transações partidas entre várias chamadas Supabase;
- uso de `service_role` como substituto de autorização;
- DTOs acoplados ao schema físico;
- dependência circular entre módulos;
- eventos publicados fora da transação crítica;
- divergência entre comandos, auditoria e outbox.

---

### 18.1 Princípio estrutural

O fluxo padrão será:

```text
React Server Component / Client Component
        ↓
Server Action ou Route Handler
        ↓
Application Service
        ↓
Domain Policy / Domain Calculation
        ↓
Repository de leitura OU RPC transacional
        ↓
PostgreSQL / Supabase
```

Para consultas:

```text
Page / Loader
    ↓
Query Service
    ↓
Read Repository
    ↓
View / função SQL / query tipada
    ↓
DTO de leitura
```

Para mutações críticas:

```text
Server Action
    ↓
Command Service
    ↓
RPC transacional única
    ├── valida estado persistido
    ├── aplica lock
    ├── grava domínio
    ├── grava auditoria
    ├── grava idempotência
    └── grava outbox
```

A UI nunca deverá coordenar uma transação distribuindo a operação em várias chamadas independentes.

---

### 18.2 Camadas oficiais

#### Presentation

Responsável por:

- páginas;
- componentes;
- formulários;
- Server Actions;
- Route Handlers;
- transformação de resultado para feedback de UI.

Não pode:

- consultar tabelas diretamente;
- aplicar regra de negócio;
- calcular cobertura oficial;
- decidir transição de estado;
- publicar evento;
- usar `service_role`.

#### Application

Responsável por:

- orquestrar casos de uso;
- resolver ator e escopo;
- chamar Policies;
- selecionar Repository ou RPC;
- mapear erros de infraestrutura para erros de aplicação;
- disparar revalidação após commit.

#### Domain

Responsável por:

- tipos e estados;
- regras puras;
- cálculos de cobertura;
- precedência de status;
- validação de transições;
- decisões de prontidão;
- invariantes independentes de framework.

O domínio não importa Supabase, React, Next.js ou APIs externas.

#### Infrastructure

Responsável por:

- clientes Supabase;
- repositories;
- adapters de evento;
- adapters de auditoria;
- dispatcher;
- workers;
- logging;
- métricas;
- integração com PostgreSQL.

#### Database

Responsável por:

- integridade referencial;
- constraints;
- RLS;
- locks;
- transações críticas;
- RPCs;
- outbox;
- idempotência persistida;
- auditoria append-only.

---

### 18.3 Fronteiras dos módulos

A estrutura de código deverá respeitar os proprietários dos dados.

```text
modules/
├── squadwise/
│   ├── works/
│   └── work-packages/
│
├── squadframe/
│   ├── procurement/
│   ├── package-procurement/
│   └── receiving/
│
├── squadboard/
│   └── operational-packages/
│
├── squadstock/
│   └── package-supply/              # futuro
│
├── squadflow/
│   ├── package-production/          # futuro
│   └── production-orders/           # futuro
│
└── shared/
    ├── auth/
    ├── database/
    ├── events/
    ├── audit/
    ├── idempotency/
    ├── errors/
    └── observability/
```

Regras:

1. `squadframe` pode consumir o contrato público de `squadwise/work-packages`, mas não importar arquivos internos.
2. `squadwise` não importa Services do Frame para escrever Compras.
3. `squadboard` consome read models e comandos públicos; não consulta tabelas operacionais arbitrariamente.
4. Código compartilhado não pode conter regra específica de Compras, Estoque ou Produção.
5. Nenhum módulo importa componentes internos de outro módulo.

---

### 18.4 Estrutura interna por domínio

Estrutura padrão:

```text
modules/squadframe/package-procurement/
├── actions/
│   ├── create-material-list.action.ts
│   ├── publish-material-list.action.ts
│   ├── allocate-purchase-order-item.action.ts
│   ├── allocate-receipt-item.action.ts
│   └── reconcile-package-procurement.action.ts
│
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── mappers/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── calculations/
│   ├── transitions/
│   └── errors/
│
├── infrastructure/
│   ├── repositories/
│   ├── rpc/
│   ├── event-consumers/
│   └── adapters/
│
├── schemas/
├── types/
├── components/
└── index.ts
```

O arquivo `index.ts` é a única superfície pública permitida para importações externas.

---

### 18.5 Contratos públicos dos módulos

Cada módulo deverá expor somente contratos estáveis.

Exemplo do Wise:

```ts
export type WorkPackageSummaryDTO = Readonly<{
  id: string;
  companyId: string;
  workId: string;
  code: string;
  name: string;
  institutionalStatus: WorkPackageInstitutionalStatus;
  stage: WorkPackageStage;
  purchasingReleased: boolean;
  productionReleased: boolean;
  enabledModules: readonly SquadModuleCode[];
  revision: number;
}>;

export interface WorkPackagePublicQueries {
  getSummary(input: GetWorkPackageSummaryInput): Promise<WorkPackageSummaryDTO>;
  assertAccessible(input: AssertWorkPackageAccessibleInput): Promise<void>;
}
```

Exemplo do Frame:

```ts
export interface PackageProcurementPublicQueries {
  getPackageProcurementView(
    input: GetPackageProcurementViewInput,
  ): Promise<PackageProcurementViewDTO>;
}

export interface PackageProcurementPublicCommands {
  ensureContext(input: EnsurePackageProcurementContextInput): Promise<EnsureContextResult>;
}
```

Esses contratos não expõem:

- nomes de tabelas;
- tipos gerados do Supabase;
- detalhes de RLS;
- payloads internos de evento;
- estruturas de persistência.

---

### 18.6 Identificadores e tipos nominais

Para impedir mistura acidental de UUIDs, o domínio deverá utilizar tipos nominais nas fronteiras internas.

```ts
type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type WorkPackageId = Brand<string, 'WorkPackageId'>;
export type WorkId = Brand<string, 'WorkId'>;
export type MaterialNeedId = Brand<string, 'MaterialNeedId'>;
export type MaterialListId = Brand<string, 'MaterialListId'>;
export type PurchaseOrderItemId = Brand<string, 'PurchaseOrderItemId'>;
export type ReceiptItemId = Brand<string, 'ReceiptItemId'>;
export type UserId = Brand<string, 'UserId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
```

Na entrada externa, Zod valida a string UUID. O mapper converte para o tipo nominal.

Não utilizar `as WorkPackageId` diretamente em componentes.

---

### 18.7 Dinheiro, quantidade e unidade

Quantidades não devem circular como `number` sem contexto.

```ts
export type Quantity = Readonly<{
  value: string;
  unitCode: string;
}>;
```

Regras:

- valores decimais trafegam como string entre PostgreSQL e TypeScript;
- conversão para `number` só é permitida em apresentação não crítica;
- cálculos oficiais usam biblioteca decimal ou PostgreSQL `numeric`;
- unidade deve ser explícita;
- uma Quantity não é somada a outra sem compatibilidade validada;
- arredondamento deve indicar escala e modo.

Contrato de valor:

```ts
export interface QuantityMath {
  add(a: Quantity, b: Quantity): Quantity;
  subtract(a: Quantity, b: Quantity): Quantity;
  compare(a: Quantity, b: Quantity): -1 | 0 | 1;
  convert(input: ConvertQuantityInput): Quantity;
}
```

A implementação oficial de cobertura ficará no PostgreSQL ou em função de domínio com biblioteca decimal, nunca em ponto flutuante disperso pela UI.

---

### 18.8 Ator e escopo de execução

Toda mutação recebe um contexto resolvido no servidor.

```ts
export type ActorContext = Readonly<{
  actorType: 'USER' | 'SERVICE';
  actorId: string;
  userId?: UserId;
  serviceCode?: string;
  companyId: CompanyId;
  permissions: ReadonlySet<string>;
  correlationId: string;
  requestId: string;
}>;
```

Esse objeto não é enviado pelo cliente. Ele é construído por:

```ts
resolveActorContext()
```

A resolução deverá:

1. validar sessão;
2. resolver empresa ativa;
3. carregar permissões efetivas;
4. gerar ou propagar `requestId` e `correlationId`;
5. recusar empresa informada pelo cliente quando divergente;
6. diferenciar usuário humano de identidade técnica.

---

### 18.9 Contrato de resultados

Services não devem retornar exceções genéricas para erros esperados.

```ts
export type AppResult<T> =
  | { ok: true; data: T; meta?: ResultMeta }
  | { ok: false; error: AppError };

export type ResultMeta = Readonly<{
  requestId: string;
  correlationId: string;
  idempotentReplay?: boolean;
}>;
```

Contrato de erro:

```ts
export type AppError = Readonly<{
  code: AppErrorCode;
  message: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  retryable: boolean;
  requestId: string;
}>;
```

`AppErrorCode` deverá incluir no mínimo os códigos da Etapa 5.

Erros inesperados podem lançar exceção internamente, mas devem ser capturados na fronteira e convertidos para:

```text
INTERNAL_ERROR
```

sem vazar SQL, stack ou existência de entidades fora do escopo.

---

### 18.10 Server Actions

Server Actions são adaptadores finos.

Padrão obrigatório:

```ts
'use server';

export async function allocatePurchaseOrderItemAction(
  rawInput: unknown,
): Promise<ActionResult<AllocatePurchaseOrderItemOutput>> {
  const parsed = allocatePurchaseOrderItemSchema.safeParse(rawInput);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const actor = await resolveActorContext();
  const result = await allocatePurchaseOrderItemService.execute({
    actor,
    input: parsed.data,
  });

  if (result.ok) {
    revalidateTag(packageProcurementTag(parsed.data.packageId));
    revalidateTag(purchaseOrderTag(parsed.data.purchaseOrderId));
  }

  return toActionResult(result);
}
```

A Action pode:

- validar formato;
- resolver ator;
- chamar um Service;
- revalidar cache depois do sucesso;
- mapear resposta.

A Action não pode:

- abrir transação;
- consultar saldo para depois gravar;
- publicar evento;
- escrever auditoria;
- executar múltiplos `.from().insert()` para compor caso crítico;
- decidir permissão por componente visível.

---

### 18.11 Schemas Zod

Cada comando externo possuirá schema versionado.

Exemplo:

```ts
export const allocatePurchaseOrderItemSchema = z.object({
  operationId: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  needId: z.string().uuid(),
  quantity: decimalStringSchema,
  unitCode: unitCodeSchema,
  reason: z.string().trim().max(500).optional(),
});
```

Regras:

- `operationId` é obrigatório em mutações idempotentes;
- IDs são UUID;
- decimal usa string normalizada;
- enum de domínio usa `z.enum` compartilhado;
- texto livre possui trim e limite;
- schema de UI não substitui validação de domínio;
- payload de evento possui schema separado do comando;
- versão do schema deverá ser explícita quando houver contrato externo duradouro.

Schemas não devem consultar o banco. Existência, permissão, saldo e estado pertencem ao Service/RPC.

---

### 18.12 Commands e Queries

Usar separação conceitual entre escrita e leitura.

```ts
export type AllocatePurchaseOrderItemCommand = Readonly<{
  operationId: string;
  purchaseOrderItemId: PurchaseOrderItemId;
  needId: MaterialNeedId;
  quantity: Quantity;
  reason?: string;
}>;

export type GetPackageProcurementViewQuery = Readonly<{
  packageId: WorkPackageId;
  includeCancelled?: boolean;
}>;
```

Commands expressam intenção. Queries expressam necessidade de leitura.

Não usar objetos de linha do banco como Command ou DTO.

---

### 18.13 Services de aplicação

Services oficiais do contexto de Compras:

```text
EnsurePackageProcurementContextService
CreateMaterialListService
AddMaterialNeedService
UpdateDraftMaterialNeedService
PublishMaterialListService
CancelMaterialNeedService
AllocateRequisitionItemService
AllocatePurchaseOrderItemService
AllocateReceiptItemService
ReallocateReceiptItemService
BlockPackageProcurementService
UnblockPackageProcurementService
ReconcilePackageProcurementService
GetPackageProcurementViewService
GetMaterialCoverageService
CompareMaterialListRevisionsService
```

Contrato padrão:

```ts
export interface ApplicationService<TInput, TOutput> {
  execute(args: {
    actor: ActorContext;
    input: TInput;
  }): Promise<AppResult<TOutput>>;
}
```

Services são stateless e recebem dependências por injeção explícita.

---

### 18.14 Policies de domínio

Regras reutilizáveis deverão existir em Policies, não duplicadas em cada Service.

```text
CanAccessWorkPackagePolicy
CanOpenPurchasingGatePolicy
CanManageMaterialListPolicy
CanPublishMaterialListPolicy
CanAllocatePurchaseOrderItemPolicy
CanAllocateReceiptItemPolicy
CanOverrideAllocationPolicy
CanBlockProcurementContextPolicy
CanReconcilePackagePolicy
```

Exemplo:

```ts
export interface CanAllocatePurchaseOrderItemPolicy {
  evaluate(input: {
    actor: ActorContext;
    package: WorkPackageSnapshot;
    context: PackageProcurementSnapshot;
    need: MaterialNeedSnapshot;
    purchaseOrderItem: PurchaseOrderItemSnapshot;
  }): PolicyDecision;
}
```

```ts
export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; code: AppErrorCode; reason: string };
```

A Policy não consulta banco. O Service carrega snapshots necessários e entrega à Policy.

---

### 18.15 Funções puras de cálculo

Os cálculos definidos na Etapa 4 deverão possuir contratos puros.

```ts
export interface MaterialNeedCoverageCalculator {
  calculate(input: MaterialNeedCoverageInput): MaterialNeedCoverage;
}

export interface ProcurementStatusResolver {
  resolve(input: ProcurementStatusInput): ProcurementCalculatedStatus;
}

export interface ProductionReadinessRecommendationResolver {
  resolve(input: ProductionReadinessInput): ProductionReadinessRecommendation;
}
```

Essas funções:

- não consultam banco;
- não escrevem estado;
- não usam data atual implicitamente;
- recebem relógio ou data de referência quando necessário;
- possuem testes determinísticos;
- não usam `Math.round` para quantidades oficiais.

O PostgreSQL poderá possuir implementação equivalente para read model. Os dois contratos deverão usar casos de teste compartilhados para evitar divergência.

---

### 18.16 Repositories: regra geral

Repository representa acesso a um agregado ou read model, não uma tabela genérica.

Não criar:

```text
GenericRepository<T>
BaseCrudRepository
SupabaseRepository<T>
```

Essas abstrações escondem regra e facilitam acesso indevido.

Criar contratos específicos:

```ts
export interface WorkPackageRepository {
  findSnapshotForUpdate(id: WorkPackageId): Promise<WorkPackageSnapshot | null>;
  findPublicSummary(id: WorkPackageId): Promise<WorkPackageSummaryDTO | null>;
}

export interface PackageProcurementRepository {
  findContext(packageId: WorkPackageId): Promise<PackageProcurementSnapshot | null>;
  getView(packageId: WorkPackageId): Promise<PackageProcurementViewDTO | null>;
}
```

Repositories de escrita direta só serão usados em operações não críticas ou dentro de adapters internos. Casos críticos usam RPC transacional.

---

### 18.17 Separação entre Command Repository e Query Repository

Quando útil, separar:

```ts
export interface MaterialListCommandRepository {
  findDraftForUpdate(packageId: WorkPackageId): Promise<MaterialListSnapshot | null>;
}

export interface MaterialListQueryRepository {
  listRevisions(packageId: WorkPackageId): Promise<readonly MaterialListRevisionDTO[]>;
  getRevisionDetails(listId: MaterialListId): Promise<MaterialListDetailsDTO | null>;
}
```

Queries podem usar views otimizadas. Commands precisam de snapshots consistentes e, quando necessário, lock.

---

### 18.18 RPCs transacionais obrigatórias

As seguintes operações deverão ser implementadas como RPCs PostgreSQL atômicas:

```text
fn_frame_ensure_package_procurement_context
fn_frame_create_material_list
fn_frame_add_material_need
fn_frame_update_draft_material_need
fn_frame_publish_material_list
fn_frame_cancel_material_need
fn_frame_allocate_requisition_item
fn_frame_allocate_purchase_order_item
fn_frame_allocate_receipt_item
fn_frame_reallocate_receipt_item
fn_frame_block_package_procurement
fn_frame_unblock_package_procurement
fn_frame_reconcile_package_procurement
fn_events_claim_deliveries
fn_events_mark_delivery_succeeded
fn_events_mark_delivery_failed
fn_events_requeue_dead_letter
```

A nomenclatura concreta segue:

```text
fn_<modulo>_<verbo>_<entidade>
```

Funções internas auxiliares podem usar prefixo:

```text
fn_internal_*
```

Elas não recebem grant direto para clientes.

---

### 18.19 Assinatura padrão de RPC de comando

Exemplo conceitual:

```sql
fn_frame_allocate_purchase_order_item(
  p_operation_id uuid,
  p_purchase_order_item_id uuid,
  p_need_id uuid,
  p_quantity numeric,
  p_unit_code text,
  p_reason text default null,
  p_correlation_id uuid default null
) returns jsonb
```

O retorno padronizado deverá conter:

```json
{
  "ok": true,
  "data": {
    "allocation_id": "uuid",
    "package_id": "uuid",
    "need_id": "uuid",
    "quantity": "120.000",
    "unit_code": "BR"
  },
  "meta": {
    "idempotent_replay": false,
    "audit_id": "uuid",
    "event_ids": ["uuid"]
  }
}
```

Em erro esperado, a RPC poderá lançar exceção com código SQLSTATE interno controlado ou retornar envelope padronizado. A escolha deverá ser única em todo o domínio.

Recomendação consolidada:

- violações de domínio esperadas retornam `jsonb` com `ok=false`;
- falhas de integridade inesperadas levantam exceção e abortam;
- o adapter TypeScript converte ambos para `AppResult`.

---

### 18.20 Assinatura padrão de RPC de consulta

Consultas complexas podem ser funções estáveis:

```sql
fn_frame_get_package_procurement_view(
  p_package_id uuid
) returns jsonb
```

ou views tipadas:

```text
vw_frame_package_procurement_summary
vw_frame_material_need_coverage
vw_frame_material_list_revision_comparison
```

Critérios:

- view para leitura tabular reutilizável;
- função para parâmetros, agregações condicionais ou autorização contextual;
- nenhuma view pública deverá expor linhas cross-empresa sem RLS/escopo adequado;
- consultas do Wise sobre dados do Frame usam contrato público, não acesso livre a qualquer tabela.

---

### 18.21 Composição transacional

Operação crítica deverá executar nesta ordem lógica dentro da mesma transação:

```text
1. validar idempotência
2. resolver e bloquear agregados
3. revalidar escopo e estado
4. aplicar mutação
5. gravar auditoria
6. gravar evento na outbox
7. gravar resultado idempotente
8. retornar
9. commit
```

Se qualquer passo de 1 a 7 falhar, nada é confirmado.

A auditoria de tentativa negada poderá ser registrada em transação separada controlada quando a operação principal não puder iniciar, sem mascarar o erro original.

---

### 18.22 Locks concretos

A estratégia oficial será híbrida.

#### Lock de linha

Usar `SELECT ... FOR UPDATE` para:

- item de pedido;
- item de recebimento;
- necessidade;
- lista em publicação;
- contexto em bloqueio/desbloqueio.

#### Advisory transaction lock

Usar `pg_advisory_xact_lock` para serializar operações que agregam várias linhas sob a mesma chave lógica.

Chaves conceituais:

```text
purchase_order_item:<id>
receipt_item:<id>
material_need:<id>
package_procurement:<package_id>
material_list:<list_id>
```

A chave bigint deverá ser derivada por função SQL única e documentada, evitando colisões práticas entre namespaces.

Regras:

- lock sempre dentro de transação;
- ordem fixa de aquisição para múltiplos recursos;
- não manter lock durante chamada externa;
- timeout controlado;
- falha de lock retorna erro retryable quando adequado;
- depois do lock, todas as somas são recalculadas.

---

### 18.23 Idempotency Store

Contrato TypeScript:

```ts
export interface IdempotencyStore {
  begin(input: BeginIdempotentOperationInput): Promise<IdempotencyBeginResult>;
  complete(input: CompleteIdempotentOperationInput): Promise<void>;
  fail(input: FailIdempotentOperationInput): Promise<void>;
}
```

No caminho crítico, o uso efetivo fica dentro da RPC, não em chamadas separadas do Node.

A tabela deverá armazenar:

- `scope`;
- `operation_id`;
- hash canônico do comando;
- estado;
- resultado serializado mínimo;
- ator;
- timestamps;
- expiração quando aplicável.

O hash deve ser calculado sobre payload normalizado, sem campos voláteis como `requestId`.

---

### 18.24 Contrato de auditoria

```ts
export interface AuditWriter {
  append(entry: AuditEntryInput): Promise<AuditEntryId>;
}
```

Entretanto, em mutação crítica, o writer concreto é executado dentro da RPC.

Campos mínimos do adapter:

```ts
export type AuditEntryInput = Readonly<{
  actor: ActorReference;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  companyId: CompanyId;
  before?: unknown;
  after?: unknown;
  reason?: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED' | 'NOOP';
  correlationId: string;
  causationId?: string;
}>;
```

O adapter deve sanitizar segredos e limitar tamanho de snapshots.

---

### 18.25 Contrato de eventos

Envelope TypeScript canônico:

```ts
export type DomainEventEnvelope<TPayload> = Readonly<{
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  companyId: CompanyId;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion?: number;
  actor: ActorReference;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;
  payload: TPayload;
}>;
```

Adapter público:

```ts
export interface EventOutboxWriter {
  append<TPayload>(event: DomainEventEnvelope<TPayload>): Promise<string>;
}
```

Em operações críticas, a escrita é chamada pela função SQL interna, usando os mesmos campos lógicos.

---

### 18.26 Adapters para `wise_eventos` e `eventos_dominio`

Não será criada terceira outbox.

Criar dois adapters de persistência sob uma interface lógica:

```text
WiseEventOutboxAdapter
FrameDomainEventOutboxAdapter
```

Interface:

```ts
export interface EventSourceAdapter {
  claimDeliveries(input: ClaimDeliveriesInput): Promise<readonly ClaimedDelivery[]>;
  markSucceeded(input: MarkDeliverySucceededInput): Promise<void>;
  markFailed(input: MarkDeliveryFailedInput): Promise<void>;
  requeue(input: RequeueDeliveryInput): Promise<void>;
}
```

Um `CompositeEventDispatcher` poderá consultar ambas as fontes sem misturar seus proprietários físicos.

O contrato lógico deverá normalizar:

- tipo;
- versão;
- aggregate;
- ator;
- correlação;
- causação;
- payload;
- estado de entrega.

---

### 18.27 Dispatcher e workers

Estrutura sugerida:

```text
shared/events/
├── dispatcher/
│   ├── event-dispatcher.ts
│   ├── consumer-registry.ts
│   └── delivery-runner.ts
├── adapters/
│   ├── wise-event-source.adapter.ts
│   └── frame-event-source.adapter.ts
├── consumers/
└── schemas/
```

Contrato de consumidor:

```ts
export interface DomainEventConsumer<TPayload = unknown> {
  readonly consumerCode: string;
  readonly supportedEvents: readonly SupportedEventDescriptor[];

  handle(args: {
    event: DomainEventEnvelope<TPayload>;
    serviceActor: ActorContext;
  }): Promise<ConsumerResult>;
}
```

```ts
export type ConsumerResult =
  | { status: 'PROCESSED' }
  | { status: 'NOOP'; reason: string }
  | { status: 'RETRY'; reason: string }
  | { status: 'DEAD_LETTER'; reason: string };
```

Consumers não confirmam entrega diretamente. O runner interpreta o resultado e atualiza o ledger.

---

### 18.28 Consumer Registry

O registro de consumidores deverá ser explícito.

```ts
consumerRegistry.register({
  eventType: 'wise.work_package.activated',
  minVersion: 1,
  maxVersion: 1,
  consumer: ensurePackageProcurementContextConsumer,
});
```

Regras:

- sem descoberta mágica por import lateral;
- código do consumidor único e estável;
- versões suportadas declaradas;
- consumidor incompatível envia para dead letter;
- remoção de consumidor exige estratégia para entregas pendentes;
- registro inicializado somente no servidor.

---

### 18.29 Consumidor de ativação do pacote

Contrato concreto:

```text
consumerCode:
frame.ensure_package_procurement_context

consome:
wise.work_package.activated v1
wise.work_package.modules.changed v1
```

Algoritmo:

```text
1. validar schema do evento
2. consultar estado atual do pacote
3. confirmar status e participação do Frame
4. executar EnsurePackageProcurementContextService
5. retornar PROCESSED ou NOOP
```

O consumidor não confia somente no payload histórico. Consulta o estado atual para impedir que evento antigo recrie contexto após módulo ser removido.

---

### 18.30 Reconciliação como caso de uso

Contrato:

```ts
export interface ReconcilePackageProcurementService {
  execute(args: {
    actor: ActorContext;
    input: {
      packageId: WorkPackageId;
      mode: 'DRY_RUN' | 'APPLY_SAFE_FIXES';
      reason?: string;
    };
  }): Promise<AppResult<PackageProcurementReconciliationReport>>;
}
```

Relatório:

```ts
export type PackageProcurementReconciliationReport = Readonly<{
  packageId: WorkPackageId;
  anomalies: readonly ReconciliationAnomaly[];
  safeFixes: readonly ReconciliationFix[];
  manualActions: readonly ReconciliationManualAction[];
  appliedFixes: readonly ReconciliationFix[];
}>;
```

`APPLY_SAFE_FIXES` executa RPC transacional. `DRY_RUN` não altera estado.

---

### 18.31 Read models oficiais

DTOs principais:

```text
WorkPackageSummaryDTO
PackageProcurementViewDTO
MaterialListSummaryDTO
MaterialListDetailsDTO
MaterialNeedCoverageDTO
PurchaseAllocationDTO
ReceiptAllocationDTO
ProcurementBlockerDTO
PackageProcurementTimelineDTO
RevisionComparisonDTO
```

`PackageProcurementViewDTO` deverá ser composto, no mínimo, por:

```ts
export type PackageProcurementViewDTO = Readonly<{
  package: WorkPackageSummaryDTO;
  context: PackageProcurementContextDTO;
  currentMaterialList: MaterialListSummaryDTO | null;
  calculatedStatus: ProcurementCalculatedStatus;
  needs: readonly MaterialNeedCoverageDTO[];
  blockers: readonly ProcurementBlockerDTO[];
  readinessRecommendation: ProductionReadinessRecommendationDTO;
  inconsistencies: readonly DataInconsistencyDTO[];
  updatedAt: string;
}>;
```

Read models podem desnormalizar para leitura. Não viram fonte de escrita.

---

### 18.32 Mappers

Mappers oficiais:

```text
WorkPackagePersistenceMapper
PackageProcurementPersistenceMapper
MaterialListPersistenceMapper
MaterialNeedPersistenceMapper
EventEnvelopeMapper
AuditEntryMapper
AppErrorMapper
```

Responsabilidades:

- converter snake_case para camelCase;
- transformar decimal em string normalizada;
- validar enum desconhecido;
- impedir vazamento de campos internos;
- converter nullabilidade;
- aplicar tipos nominais;
- rejeitar registros inconsistentes em vez de silenciosamente inventar valor.

Componentes não fazem mapping de linha de banco.

---

### 18.33 Tipos gerados do Supabase

Os tipos gerados são contratos de infraestrutura, não de domínio.

Permitido:

```ts
import type { Database } from '@/lib/supabase/database.types';
```

somente em:

- repositories;
- adapters;
- camada RPC;
- testes de integração de infraestrutura.

Proibido em:

- componentes;
- domain;
- contratos públicos;
- Services como tipo de retorno;
- schemas de formulário.

Após migration, regenerar os tipos e verificar diff no CI.

---

### 18.34 Cliente Supabase

Clientes oficiais:

```text
createUserServerClient
createServiceRoleClient
createBrowserClient
```

Regras:

- Browser Client somente para recursos explicitamente permitidos por RLS e realtime;
- User Server Client para consultas no contexto do usuário;
- Service Role Client somente em Infrastructure/worker autorizado;
- Service Role nunca importado por componente ou Action genérica;
- cada uso de Service Role exige ator técnico, escopo explícito e auditoria quando houver mutação;
- nenhum singleton global deve carregar sessão de usuário entre requests.

---

### 18.35 Autorização na camada de aplicação e banco

A autorização ocorre em duas camadas complementares.

#### Application Service

Valida:

- permissão;
- módulo participante;
- intenção;
- estado institucional;
- bloqueio;
- motivo de override.

#### RPC/RLS

Revalida:

- ator autenticado ou identidade técnica válida;
- empresa;
- acesso à entidade;
- permissão crítica;
- estado persistido atual;
- constraints e saldos.

A validação no Service melhora clareza e UX. A validação no banco garante segurança e concorrência.

Nenhuma delas substitui a outra.

---

### 18.36 Contrato de permissão

```ts
export interface PermissionChecker {
  require(actor: ActorContext, permission: string): void;
  requireAny(actor: ActorContext, permissions: readonly string[]): void;
}
```

No banco, usar função central equivalente:

```text
fn_exigir_permissao
```

As chaves definidas na Etapa 5 serão constantes centralizadas:

```ts
export const PackageProcurementPermissions = {
  VIEW: 'frame.pacotes.compras.visualizar',
  MANAGE: 'frame.pacotes.compras.gerenciar',
  MANAGE_NEEDS: 'frame.pacotes.compras.necessidades.gerenciar',
  PUBLISH_LIST: 'frame.pacotes.compras.lista.publicar',
  ALLOCATE_ORDER: 'frame.pedidos.alocar_pacote',
  ALLOCATE_RECEIPT: 'frame.recebimentos.alocar_pacote',
  BLOCK: 'frame.pacotes.compras.bloquear',
  OVERRIDE: 'frame.pacotes.compras.override',
  RECONCILE: 'frame.pacotes.compras.reconciliar',
} as const;
```

Evitar strings repetidas em componentes.

---

### 18.37 Revalidação e cache

Tags oficiais:

```text
wise:work-package:<package_id>
frame:package-procurement:<package_id>
frame:material-list:<list_id>
frame:purchase-order:<pedido_id>
frame:receipt:<recebimento_id>
board:operational-package:<package_id>
```

Regras:

- revalidar somente após sucesso confirmado;
- Services não importam `revalidateTag`;
- Action ou adapter de apresentação executa revalidação;
- consumidor de evento pode invalidar read model específico por adapter de cache;
- cache nunca substitui verificação de permissão;
- informações críticas de saldo em tela de mutação devem ser revalidadas pela RPC no commit.

---

### 18.38 Realtime

Realtime poderá atualizar projeções visuais, mas não será requisito de consistência.

Pode ser usado para:

- timeline;
- estado calculado após recebimento;
- novos bloqueios;
- alteração de coluna no Board;
- atualização de cobertura.

Não pode ser usado como:

- confirmação de commit;
- lock;
- fonte oficial de saldo;
- garantia de entrega de evento;
- autorização.

Se o realtime falhar, refresh/revalidação deve restaurar a leitura correta.

---

### 18.39 Logging estruturado

Contrato:

```ts
export interface AppLogger {
  info(event: string, data: LogContext): void;
  warn(event: string, data: LogContext): void;
  error(event: string, data: LogContext & { error: unknown }): void;
}
```

Contexto mínimo:

```text
request_id
correlation_id
module
service
operation
actor_type
company_id
entity_type
entity_id
result
error_code
```

Não registrar payload integral, documentos, dados pessoais ou tokens.

---

### 18.40 Relógio e geração de IDs

Dependências não determinísticas devem ser injetáveis.

```ts
export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  uuid(): string;
}
```

No banco, operações transacionais usam `now()` e `gen_random_uuid()` como fonte oficial do commit.

No código, Clock e IdGenerator facilitam testes e geração de `operationId`/correlation.

---

### 18.41 Contratos de tempo e timezone

Persistência:

```text
timestamptz em UTC
```

Apresentação:

```text
timezone da empresa ou usuário
```

Regras:

- datas sem horário usam tipo semântico próprio;
- prazos de obra não são convertidos como instante quando representarem apenas dia;
- eventos usam ISO 8601 UTC;
- o cliente não define `criado_em` ou `atualizado_em`;
- comparação de atraso recebe timezone explícito.

---

### 18.42 Versionamento de contratos

Versionar quando a mudança puder quebrar consumidor.

Eventos:

```text
eventVersion
```

Payloads HTTP públicos futuros:

```text
/api/v1/...
```

Contratos internos TypeScript seguem versionamento do repositório, mas mudanças incompatíveis exigem migração coordenada.

Não criar `v2` apenas por adicionar campo opcional. Criar nova versão quando semântica, obrigatoriedade ou interpretação mudar.

---

### 18.43 Anti-corruption layer do legado

Enquanto `lotes_obra`, `lote_id` e campos legados coexistirem, criar adapters explícitos.

```text
LegacyWorkPackageAdapter
LegacyPurchaseDocumentPackageHintAdapter
LegacyBoardPackageAdapter
```

Eles deverão:

- traduzir legado para contrato canônico;
- marcar origem;
- impedir escrita nova no caminho antigo quando bloqueada;
- emitir métrica de uso legado;
- permitir remoção na Etapa 8.

Novo código não acessa `lote_id` diretamente para decidir alocação oficial.

---

### 18.44 Contrato do contexto de Compras

Snapshot interno:

```ts
export type PackageProcurementSnapshot = Readonly<{
  id: string;
  packageId: WorkPackageId;
  responsibleUserId: UserId | null;
  blocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  blockedBy: ActorReference | null;
  createdAt: string;
  updatedAt: string;
}>;
```

O snapshot não possui cobertura ou status operacional como fonte persistida.

O DTO de leitura adiciona:

```text
calculatedStatus
calculatedCoverage
blockers
readinessRecommendation
```

---

### 18.45 Contrato da Lista de Materiais

```ts
export type MaterialListSnapshot = Readonly<{
  id: MaterialListId;
  packageId: WorkPackageId;
  packageRevisionId: string;
  listRevision: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'CANCELLED';
  publishedAt: string | null;
  publishedBy: ActorReference | null;
  createdAt: string;
  updatedAt: string;
}>;
```

Regras de Service:

- somente DRAFT é editável;
- publicação exige ao menos uma necessidade ativa;
- publicação gera snapshot de catálogo;
- nova revisão não altera lista publicada;
- substituição mantém histórico;
- publicação é RPC atômica com auditoria e evento.

---

### 18.46 Contrato da Necessidade de Material

```ts
export type MaterialNeedSnapshot = Readonly<{
  id: MaterialNeedId;
  materialListId: MaterialListId;
  packageId: WorkPackageId;
  catalogItemId: string | null;
  freeDescription: string | null;
  itemCodeSnapshot: string | null;
  itemDescriptionSnapshot: string;
  requiredQuantity: Quantity;
  criticality: 'LOW' | 'NORMAL' | 'HIGH' | 'BLOCKING';
  requiredStage: ProductionStage | null;
  administrativeState: 'ACTIVE' | 'CANCELLED' | 'REPLACED';
  createdAt: string;
  updatedAt: string;
}>;
```

Estado `SOLICITADO`, `PEDIDO`, `RECEBIDO_PARCIAL` ou `ATENDIDO` não pertence a esse snapshot; é calculado.

---

### 18.47 Contrato das alocações

Contrato-base de leitura:

```ts
export type AllocationDTO = Readonly<{
  id: string;
  needId: MaterialNeedId;
  packageId: WorkPackageId;
  sourceType: 'REQUISITION_ITEM' | 'PURCHASE_ORDER_ITEM' | 'RECEIPT_ITEM';
  sourceId: string;
  quantity: Quantity;
  state: 'ACTIVE' | 'CANCELLED' | 'REALLOCATED';
  createdAt: string;
  createdBy: ActorReference;
}>;
```

Na persistência, cada estágio possui tabela própria e relação explícita com o estágio anterior quando aplicável.

A leitura pode unificar por DTO, mas a escrita nunca usa tabela polimórfica genérica para os três processos.

---

### 18.48 Contrato das operações de alocação

```ts
export type AllocatePurchaseOrderItemInput = Readonly<{
  operationId: string;
  purchaseOrderItemId: PurchaseOrderItemId;
  needId: MaterialNeedId;
  quantity: Quantity;
  reason?: string;
}>;

export type AllocatePurchaseOrderItemOutput = Readonly<{
  allocationId: string;
  packageId: WorkPackageId;
  needId: MaterialNeedId;
  allocatedQuantity: Quantity;
  remainingOrderItemQuantity: Quantity;
  needCoverage: MaterialNeedCoverageDTO;
}>;
```

A operação deverá validar:

- pedido emitido ou estado permitido;
- item não cancelado;
- mesma empresa;
- unidade compatível;
- necessidade ativa;
- pacote acessível;
- saldo não alocado;
- limite ou override;
- permissão;
- idempotência.

---

### 18.49 Contrato de recebimento

```ts
export type AllocateReceiptItemInput = Readonly<{
  operationId: string;
  receiptItemId: ReceiptItemId;
  purchaseAllocationId: string;
  quantity: Quantity;
  acceptedQuantityReference?: string;
  reason?: string;
}>;
```

A RPC deverá bloquear:

- item de recebimento;
- alocação de pedido relacionada;
- alocações de recebimento existentes.

Ela recalcula:

- quantidade aceita;
- quantidade já distribuída;
- saldo da alocação do pedido;
- saldo da necessidade;
- excesso permitido.

Nenhuma distribuição proporcional automática é feita sem comando explícito.

---

### 18.50 Contrato de bloqueios

```ts
export type BlockPackageProcurementInput = Readonly<{
  operationId: string;
  packageId: WorkPackageId;
  reasonCode: string;
  reason: string;
}>;
```

Desbloqueio exige nova operação e não edita a auditoria anterior.

```ts
export type UnblockPackageProcurementInput = Readonly<{
  operationId: string;
  packageId: WorkPackageId;
  reason: string;
}>;
```

O contexto persiste estado atual do bloqueio. O histórico fica na auditoria/timeline.

---

### 18.51 Consulta consolidada e desempenho

A consulta principal do detalhe do pacote não deverá executar N+1 por necessidade.

Preferir:

- view agregada;
- função SQL que retorna JSON estruturado;
- poucas queries paralelas com limites claros;
- índices definidos nas Etapas 2 a 4.

A consulta deverá suportar paginação quando listas ultrapassarem limite configurado.

Não carregar:

- todos os eventos;
- todos os documentos completos;
- todos os anexos;
- histórico ilimitado

na abertura inicial.

---

### 18.52 Contratos de paginação e filtros

```ts
export type CursorPageInput = Readonly<{
  cursor?: string;
  limit: number;
}>;

export type CursorPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
}>;
```

Usar cursor para timelines e listas extensas. Paginação por offset pode permanecer em tabelas administrativas pequenas.

Filtros devem ser validados por schema e mapeados para campos permitidos. Não concatenar ordenação ou coluna arbitrária enviada pelo cliente.

---

### 18.53 Route Handlers e APIs internas

Server Actions são preferenciais para mutações originadas pela UI Next.js.

Route Handlers serão usados para:

- workers agendados;
- webhooks;
- integrações externas;
- downloads/exportações;
- endpoints consumidos por dispositivos ou módulos separados.

Todo Route Handler deverá:

- autenticar;
- validar schema;
- criar ActorContext;
- aplicar rate limit quando necessário;
- chamar Service;
- retornar envelope de erro estável;
- propagar correlação.

Não acessar Repository diretamente para caso de uso complexo.

---

### 18.54 Exportação e arquivos

Exportações não devem montar grandes datasets no Client Component.

Fluxo:

```text
Route Handler autorizado
    ↓
Query Service paginado/streaming
    ↓
geração de arquivo
    ↓
URL assinada temporária ou resposta stream
```

Anexos e documentos relacionados a Compras permanecem em seus domínios. O Pacote guarda vínculo, não conteúdo duplicado.

---

### 18.55 Dependências entre Services

Um Service pode depender de:

- contrato público de Query de outro módulo;
- Policy;
- Repository;
- RPC Gateway;
- Logger;
- Metrics;
- Clock.

Evitar Service chamando Action ou componente.

Quando um caso de uso exigir mutação em dois módulos proprietários diferentes:

1. confirmar a transação no módulo de origem;
2. publicar evento;
3. consumidor aplica no outro módulo;
4. reconciliação garante convergência.

Não tentar transação distribuída via frontend.

---

### 18.56 RPC Gateways

A camada TypeScript deverá encapsular chamadas RPC.

```ts
export interface PackageProcurementRpcGateway {
  ensureContext(input: EnsureContextRpcInput): Promise<RpcResult<EnsureContextRpcOutput>>;
  createMaterialList(input: CreateMaterialListRpcInput): Promise<RpcResult<CreateMaterialListRpcOutput>>;
  publishMaterialList(input: PublishMaterialListRpcInput): Promise<RpcResult<PublishMaterialListRpcOutput>>;
  allocatePurchaseOrderItem(input: AllocatePurchaseOrderItemRpcInput): Promise<RpcResult<AllocatePurchaseOrderItemRpcOutput>>;
  allocateReceiptItem(input: AllocateReceiptItemRpcInput): Promise<RpcResult<AllocateReceiptItemRpcOutput>>;
  reconcile(input: ReconcilePackageProcurementRpcInput): Promise<RpcResult<ReconciliationRpcOutput>>;
}
```

O Gateway:

- chama o nome físico da RPC;
- converte parâmetros;
- valida retorno;
- mapeia erro;
- registra duração e código;
- não aplica regra de negócio.

---

### 18.57 Validação do retorno SQL

Retorno `jsonb` deverá ser validado por Zod antes de entrar na aplicação.

```ts
const rpcResponse = allocatePurchaseOrderItemRpcResponseSchema.parse(data);
```

Isso detecta:

- migration incompatível;
- enum novo não tratado;
- campo obrigatório ausente;
- regressão de contrato.

Falha de parsing gera:

```text
DATA_CONTRACT_VIOLATION
```

com log técnico e resposta segura ao usuário.

---

### 18.58 Factories e composição de dependências

Criar composição explícita no servidor:

```text
modules/squadframe/package-procurement/application/container.ts
```

Exemplo:

```ts
export function createAllocatePurchaseOrderItemService() {
  return new AllocatePurchaseOrderItemService({
    workPackageQueries: createWorkPackagePublicQueries(),
    rpcGateway: createPackageProcurementRpcGateway(),
    permissionChecker,
    logger,
    metrics,
  });
}
```

Não usar service locator global mutável.

Factories facilitam substituição por fakes em testes.

---

### 18.59 Convenções de nomes

#### TypeScript

```text
camelCase para valores e funções
PascalCase para tipos/classes/componentes
*.action.ts para Server Actions
*.service.ts para Services
*.repository.ts para contratos/implementações
*.policy.ts para Policies
*.schema.ts para Zod
*.mapper.ts para mappers
*.consumer.ts para consumidores
*.dto.ts para DTOs
```

#### PostgreSQL

```text
snake_case
fn_<module>_<verb>_<entity>
vw_<module>_<subject>
trg_<table>_<timing>_<action>
idx_<table>_<columns>
ck_<table>_<rule>
uq_<table>_<columns>
fk_<table>_<reference>
```

#### Eventos

```text
<module>.<aggregate>.<past_tense_fact>
```

Exemplo:

```text
frame.purchase_order_item.allocated
```

---

### 18.60 Proibições arquiteturais

Não implementar:

- `.from('frame_pacote_necessidades')` dentro de componente;
- Service que retorna `Database['public']['Tables'][...]`;
- Action com várias escritas independentes para operação crítica;
- evento publicado depois do commit por chamada separada sem outbox;
- status calculado persistido manualmente sem projeção controlada;
- `service_role` em utilitário genérico acessível a qualquer módulo;
- Repository CRUD genérico;
- importação de arquivo interno de outro módulo;
- uso de `lote_id` legado como fonte oficial de rateio;
- cálculo de quantidade com ponto flutuante sem decimal;
- permissão baseada somente em esconder botão;
- consumer sem idempotência;
- catch vazio ou conversão de todo erro para mensagem genérica sem código;
- UUID de empresa aceito diretamente do cliente como fonte de escopo.

---

### 18.61 Sequência de implementação técnica

A implementação futura deverá seguir esta ordem:

```text
1. tipos de domínio e enums
2. schemas Zod
3. contratos DTO/AppResult/AppError
4. contratos públicos entre módulos
5. Policies e cálculos puros
6. migrations/RPCs da etapa correspondente
7. tipos Supabase regenerados
8. RPC Gateways e Repositories
9. Services
10. Server Actions/Route Handlers
11. adapters de auditoria/eventos
12. consumers e dispatcher
13. read models
14. UI da Etapa 7
```

Não iniciar UI definitiva antes de o caso de uso possuir contrato e resultado estáveis.

---

### 18.62 Exemplo completo: alocar item de pedido

```text
allocatePurchaseOrderItemAction
    ↓ valida formato com Zod
resolveActorContext
    ↓
AllocatePurchaseOrderItemService
    ├── require frame.pedidos.alocar_pacote
    ├── consulta resumo institucional do pacote
    ├── verifica participação do Frame e portão
    └── chama PackageProcurementRpcGateway
            ↓
fn_frame_allocate_purchase_order_item
    ├── valida idempotência
    ├── resolve empresa pelo banco
    ├── exige permissão
    ├── lock item/necessidade
    ├── recalcula saldos
    ├── grava alocação
    ├── grava auditoria
    ├── grava evento
    ├── grava resultado idempotente
    └── retorna envelope
            ↓
Gateway valida retorno
    ↓
Service retorna AppResult
    ↓
Action revalida tags
    ↓
UI atualiza
```

Nenhuma regra crítica depende do valor que a tela mostrou antes do clique.

---

### 18.63 Exemplo completo: publicação de Lista de Materiais

```text
publishMaterialListAction
    ↓
PublishMaterialListService
    ├── valida permissão
    ├── verifica pacote e portão
    └── chama RPC
            ↓
fn_frame_publish_material_list
    ├── lock lista + pacote
    ├── confirma DRAFT
    ├── valida necessidades
    ├── captura snapshots do catálogo
    ├── marca PUBLISHED
    ├── substitui revisão anterior quando aplicável
    ├── auditoria
    ├── frame.material_list.published
    └── idempotência
```

Depois do commit, consumidores podem atualizar timeline ou projeções. A lista publicada já é válida independentemente do processamento do evento.

---

### 18.64 Exemplo completo: ativação do pacote e contexto

```text
Wise ativa pacote
    ↓
RPC Wise grava status + auditoria + evento
    ↓
Dispatcher entrega wise.work_package.activated
    ↓
EnsurePackageProcurementContextConsumer
    ↓
consulta estado atual + módulos participantes
    ↓
EnsurePackageProcurementContextService
    ↓
fn_frame_ensure_package_procurement_context
    ↓
cria, reativa ou retorna NOOP
```

Se o consumidor falhar, a reconciliação ou abertura no Frame executa o mesmo `ensure` idempotente.

---

### 18.65 Decisões que ficam para a Etapa 7

A Etapa 7 fechará:

- arquitetura de telas;
- navegação Wise → Frame;
- detalhe consolidado do pacote;
- formulários de lista e necessidade;
- editor de rateio;
- experiência de recebimento;
- visualização de cobertura;
- bloqueios e overrides;
- feedback de idempotência/retry;
- loading, empty, error e sem permissão;
- responsividade;
- componentes que entram no SquadUI.

A UI deverá consumir os contratos definidos nesta etapa, sem reinterpretar regras.

---

### 18.66 Critérios de aceite da Etapa 6

A Etapa 6 é considerada concluída arquiteturalmente quando:

- fluxo Presentation → Application → Domain/Infrastructure → Database está definido;
- limites entre Wise, Frame, Board, Stock e Flow estão explícitos;
- estrutura de pastas e superfície pública por `index.ts` estão definidas;
- tipos físicos do Supabase não vazam para domínio ou UI;
- IDs nominais, Quantity e decimal string estão definidos;
- ActorContext é resolvido exclusivamente no servidor;
- AppResult e AppError possuem contrato estável;
- Server Actions são finas e não coordenam transações;
- schemas Zod validam formato, não regra persistida;
- Commands e Queries estão separados conceitualmente;
- Services oficiais do contexto de Compras estão listados;
- Policies e cálculos puros estão separados;
- Repositories específicos substituem CRUD genérico;
- RPCs transacionais obrigatórias estão enumeradas;
- envelope de retorno SQL está padronizado;
- mutações críticas compõem domínio, auditoria, outbox e idempotência em uma transação;
- lock de linha e advisory transaction lock possuem regra concreta;
- contratos de idempotência, auditoria e eventos estão definidos;
- adapters de `wise_eventos` e `eventos_dominio` preservam duas fontes físicas e um contrato lógico;
- dispatcher, runner, consumer e registry possuem interfaces;
- consumidor de ativação do pacote está especificado;
- reconciliação possui contrato de Service e relatório;
- read models e DTOs principais estão definidos;
- mappers impedem vazamento do schema;
- clientes Supabase possuem usos permitidos;
- autorização é revalidada no Service e no banco;
- tags de cache e regras de realtime estão definidas;
- logging, Clock, IdGenerator, timezone e versionamento estão definidos;
- adapters do legado estão previstos;
- contratos de contexto, lista, necessidade, alocação, recebimento e bloqueio estão definidos;
- paginação, filtros, Route Handlers e exportações possuem regras;
- RPC Gateway valida retorno com Zod;
- composição de dependências é explícita;
- convenções e proibições arquiteturais estão registradas;
- sequência técnica de implementação está definida;
- os casos de uso críticos possuem fluxo ponta a ponta;
- o documento está pronto para desenhar a UI/UX na Etapa 7 sem criar regra nova na camada visual.

## 19. UI/UX do Pacote de Trabalho e do contexto de Compras

**Estado:** Concluído — Etapa 7.

Esta etapa define a experiência oficial de uso do Pacote de Trabalho no SquadWise e do contexto operacional de Compras no SquadFrame. A UI não cria novas regras de domínio: ela apresenta, coleta e encaminha dados conforme os contratos, estados calculados, permissões, portões e RPCs já definidos nas etapas anteriores.

A experiência será dividida em duas superfícies complementares:

```text
SquadWise
└── visão institucional e consolidada do pacote
    ├── identidade
    ├── escopo
    ├── revisão
    ├── módulos participantes
    ├── portões
    └── projeções somente leitura dos módulos

SquadFrame
└── workspace operacional de suprimentos
    ├── Lista de Materiais
    ├── necessidades
    ├── solicitações
    ├── pedidos
    ├── alocações
    ├── recebimentos
    ├── cobertura
    └── bloqueios e histórico
```

O usuário deve reconhecer que está trabalhando com o mesmo `pacote_id`, embora esteja em módulos diferentes. A navegação entre Wise e Frame será contextual, preservará obra, pacote, filtros relevantes e uma trilha clara de origem.

---

### 19.1 Princípios obrigatórios da experiência

#### 19.1.1 O Wise apresenta e governa; o Frame opera

No SquadWise, o usuário poderá:

- consultar identidade, escopo, tipologias e revisão do pacote;
- editar campos institucionais quando possuir permissão;
- controlar módulos participantes;
- acionar portões institucionais;
- consultar o resumo operacional dos módulos;
- navegar para o módulo proprietário da operação.

No Wise, o usuário não poderá:

- editar necessidades de material;
- ratear itens de solicitação ou pedido;
- confirmar recebimentos;
- alterar status calculado de suprimentos;
- substituir dados operacionais do Frame.

No SquadFrame, o usuário poderá executar operações de Compras, mas não poderá alterar silenciosamente:

- obra do pacote;
- código institucional;
- escopo oficial;
- tipologias do pacote;
- revisão institucional;
- módulos participantes;
- portões `liberado_compras` e `liberado_producao`, salvo ação pública e autorizada do Wise.

#### 19.1.2 Toda informação deve revelar sua fonte

Informações operacionais exibidas no Wise deverão indicar a origem:

```text
Compras · SquadFrame
Atualizado há 8 minutos
```

Informações institucionais exibidas no Frame deverão indicar que vêm do Wise:

```text
Escopo oficial · SquadWise
Somente leitura
```

A interface não precisa exibir o nome técnico da tabela, mas deve deixar claro qual módulo é responsável pelo dado e onde ele pode ser alterado.

#### 19.1.3 Estado calculado não parece campo editável

Estados como `RECEBIMENTO_PARCIAL`, cobertura pedida ou quantidade faltante devem ser apresentados como leitura calculada.

Não utilizar:

- Select para estado calculado;
- botão “Salvar status”;
- edição inline de percentual;
- drag and drop que altere estado derivado sem executar uma operação real de domínio.

Quando existir uma ação manual legítima, ela deverá ser separada do estado calculado. Exemplo:

```text
Situação calculada: PEDIDOS_EMITIDOS
Bloqueio manual: Ativo
```

#### 19.1.4 Uma cor não substitui texto

Badges e indicadores devem combinar:

- texto;
- ícone quando útil;
- cor semântica;
- tooltip ou descrição para estados menos óbvios.

Não representar criticidade, bloqueio ou prontidão somente por cor.

#### 19.1.5 A interface deve explicar inconsistências

Quando o read model retornar uma inconsistência, a UI deve mostrar:

- o que foi encontrado;
- qual impacto existe;
- se há correção segura;
- qual ação exige decisão humana;
- referência para auditoria ou reconciliação.

Não ocultar inconsistências com fallback silencioso.

---

### 19.2 Design system obrigatório

Toda interface desta etapa utilizará exclusivamente o **SquadUI** como design system oficial.

#### Tipografia

```text
Cairo
```

Pesos recomendados:

- Cairo Light/Regular: descrições e conteúdo;
- Cairo Semibold: labels, controles e títulos menores;
- Cairo Bold/Black: PageHeader, números importantes e identificação do pacote.

#### Paleta do SquadWise

```text
#1e202c
#31323e
#60519b
#bfc0d1
```

#### Paleta do SquadFrame

```text
#222831
#283b48
#00a6c0
#d8d7ce
```

Os valores hexadecimais alimentam tokens de tema. Não devem ser espalhados diretamente pelos componentes.

#### Tokens semânticos esperados

```text
background
surface
surface-raised
surface-overlay
foreground
foreground-muted
foreground-subtle
border
border-strong
primary
primary-hover
primary-active
primary-foreground
success
warning
danger
info
focus-ring
selection
disabled
```

A identidade de cada módulo será aplicada por contexto, sem transformar todas as telas em grandes blocos violeta ou ciano.

- No Wise, `primary` utiliza a identidade violeta.
- No Frame, `primary` utiliza a identidade ciano.
- `success`, `warning`, `danger` e `info` mantêm significado semântico global e não são substituídos pela cor do módulo.

#### Tema claro e escuro

As telas deverão funcionar integralmente nos dois temas.

O tema claro não será uma inversão automática do escuro. Deve possuir:

- superfícies claras próprias;
- bordas suficientes para separar regiões;
- contraste adequado;
- estados hover/focus verificáveis;
- tabelas legíveis em alta densidade.

---

### 19.3 Arquitetura de rotas

A nomenclatura concreta deverá respeitar o App Router atual, mas a experiência alvo seguirá estas rotas conceituais.

#### SquadWise

```text
/squadwise/obras
/squadwise/obras/[obraId]
/squadwise/obras/[obraId]/pacotes
/squadwise/obras/[obraId]/pacotes/novo
/squadwise/obras/[obraId]/pacotes/[pacoteId]
/squadwise/obras/[obraId]/pacotes/[pacoteId]/editar
/squadwise/obras/[obraId]/pacotes/[pacoteId]/revisoes
```

#### SquadFrame

```text
/squadframe/pacotes
/squadframe/pacotes/[pacoteId]/compras
/squadframe/pacotes/[pacoteId]/compras/listas
/squadframe/pacotes/[pacoteId]/compras/listas/[listaId]
/squadframe/pacotes/[pacoteId]/compras/necessidades/[necessidadeId]
/squadframe/pacotes/[pacoteId]/compras/solicitacoes
/squadframe/pacotes/[pacoteId]/compras/pedidos
/squadframe/pacotes/[pacoteId]/compras/recebimentos
/squadframe/pacotes/[pacoteId]/compras/historico
```

As rotas poderão ser implementadas com segmentos internos diferentes, mas a URL deve permanecer previsível e compartilhável.

#### Deep links

Toda projeção operacional exibida no Wise deve oferecer acesso direto à superfície proprietária.

Exemplo:

```text
Compras
Status: Recebimento parcial
12 necessidades ativas
[ Abrir no SquadFrame ]
```

O link deverá abrir o mesmo pacote, e não apenas a home do Frame.

Toda página operacional do Frame deverá oferecer retorno contextual:

```text
[ Ver pacote no SquadWise ]
```

---

### 19.4 Navegação e breadcrumbs

#### Breadcrumb no Wise

```text
SquadWise / Obras / Residencial Alto das Torres / Pacotes / PAT-001
```

#### Breadcrumb no Frame

```text
SquadFrame / Pacotes / PAT-001 / Compras / Lista de Materiais 02
```

O breadcrumb deve:

- permitir voltar à obra;
- permitir voltar à lista de pacotes;
- indicar o módulo atual;
- não repetir o título da página de forma desnecessária;
- funcionar em mobile com redução progressiva dos níveis intermediários.

#### Context switcher

No cabeçalho do pacote, poderá existir um seletor contextual para trocar de pacote dentro da mesma obra, desde que:

- faça busca server-side;
- preserve o módulo atual quando o pacote possuir aquele módulo participante;
- informe quando o contexto não existe;
- não crie contexto automaticamente só porque o usuário selecionou o pacote.

---

### 19.5 PageHeader canônico do Pacote de Trabalho

O detalhe do pacote, tanto no Wise quanto no Frame, deve reutilizar uma composição canônica de cabeçalho.

Conteúdo mínimo:

```text
Código: PAT-001
Nome: Torre A — Pavimentos 01 ao 05
Obra: Residencial Alto das Torres
Revisão institucional: 02
Status institucional: ATIVO
Prioridade: ALTA
Prazo: 30/09/2026
Responsável geral: João da Silva
```

Estrutura visual:

```text
Breadcrumb

PAT-001 · Torre A — Pavimentos 01 ao 05             [Ações]
Residencial Alto das Torres

[ATIVO] [Revisão 02] [Prioridade alta] [Prazo 30/09]
```

No Frame, acrescentar identificação discreta:

```text
Contexto de Compras · SquadFrame
```

No Wise, acrescentar:

```text
Pacote Mestre · SquadWise
```

#### Ações no Wise

Dependendo de estado e permissão:

- Editar pacote;
- Criar revisão;
- Gerenciar módulos;
- Liberar Compras;
- Liberar Produção;
- Suspender;
- Concluir;
- Cancelar;
- Abrir no módulo participante.

#### Ações no Frame

Dependendo de estado e permissão:

- Criar Lista de Materiais;
- Criar solicitação;
- Abrir pedido;
- Registrar recebimento;
- Bloquear contexto;
- Reconciliar;
- Exportar;
- Ver pacote no Wise.

A ação primária deve ser única por estado. As demais ficam em menu secundário quando competirem visualmente.

---

### 19.6 Detalhe do pacote no SquadWise

A página institucional deverá usar tabs ou navegação secundária estável.

Tabs recomendadas:

```text
Resumo
Escopo
Tipologias
Revisões
Módulos
Operação
Histórico
```

Não criar uma tab para cada módulo quando isso gerar muitas abas vazias. A tab `Operação` pode consolidar cards de módulo e deep links.

#### Resumo

Apresenta:

- dados institucionais;
- portões;
- resumo do escopo;
- revisão atual;
- responsáveis;
- módulos participantes;
- bloqueios institucionais;
- alertas consolidados;
- atualização operacional mais recente.

#### Escopo

Apresenta hierarquia física:

```text
Obra
└── Torre A
    ├── Pavimento 01
    ├── Pavimento 02
    ├── Pavimento 03
    ├── Pavimento 04
    └── Pavimento 05
```

Deve permitir:

- visualização em árvore;
- busca;
- filtros por torre/bloco/pavimento;
- contagem de tipologias;
- destaque de nós incluídos;
- edição somente mediante permissão e estado institucional permitido.

#### Tipologias

Tabela sugerida:

| Código | Descrição | Dimensões | Quantidade | Escopo | Status institucional | Ações |
|---|---|---:|---:|---|---|---|

Não exibir o status produtivo legado como se fosse situação oficial da produção futura. Quando o campo legado existir, identificar claramente como dado provisório/legado.

#### Revisões

Exibe uma timeline de revisões institucionais:

- número;
- data de publicação;
- autor;
- motivo;
- resumo das alterações;
- listas de materiais associadas;
- impacto de Compras;
- status vigente/substituída.

#### Módulos

Apresenta módulos participantes:

```text
SquadFrame     Ativo     Contexto criado
SquadBoard     Ativo     Pipelines sincronizados
SquadStock     Inativo   Não participa
SquadFlow      Ativo     Contexto ainda não implementado
SquadMeasure   Inativo   Não participa
```

Diferenciar:

- módulo não contratado;
- módulo contratado, mas não participante;
- módulo participante;
- contexto ainda não criado;
- integração com erro;
- contexto reconciliado.

#### Operação

Cards somente leitura por módulo.

Exemplo de Compras:

```text
Compras · SquadFrame
Recebimento parcial

12 necessidades ativas
8 totalmente pedidas
5 totalmente recebidas
2 bloqueantes pendentes

Última atualização: 17/07/2026 13:15
[ Abrir no SquadFrame ]
```

Exemplo de módulo ainda não implementado:

```text
Produção · SquadFlow
Módulo participante
Contexto produtivo será habilitado em etapa futura.
```

Não apresentar métricas fictícias nem zeros quando o módulo não existe.

#### Histórico

Consolida:

- eventos institucionais do Wise;
- alterações de escopo;
- revisões;
- portões;
- módulos participantes;
- referências resumidas a eventos operacionais relevantes.

O histórico completo de Compras continua no Frame.

---

### 19.7 Portões institucionais no Wise

Os portões `liberado_compras` e `liberado_producao` devem possuir um componente próprio, não um Switch simples.

Motivo: a ação possui impacto entre módulos, pode exigir justificativa, pré-condições e auditoria.

Componente conceitual:

```text
InstitutionalGateCard
```

Exemplo:

```text
Compras
Liberado em 15/07/2026 por Maria Souza
Revisão vinculada: 02

A equipe de Compras pode criar operações efetivas para este pacote.
[ Revogar liberação ]
```

Quando não liberado:

```text
Compras
Ainda não liberado

Pré-condições:
✓ Escopo definido
✓ Revisão publicada
! Lista de materiais ainda não liberada no Frame

[ Liberar Compras ]
```

A lista do Frame pode ser preparada antes do portão, mas operações efetivas devem respeitar a Policy definida nas etapas anteriores.

#### Dialog de liberação

Deve apresentar:

- ação que será executada;
- pacote e revisão;
- módulos afetados;
- pré-condições;
- avisos não bloqueantes;
- campo de justificativa quando exigido;
- confirmação explícita.

Não usar confirmação genérica “Tem certeza?”.

#### Revogação

A revogação deve informar:

- se já existem transações operacionais;
- quais efeitos serão apenas preventivos;
- que dados históricos não serão apagados;
- motivo obrigatório;
- possíveis bloqueios para revogar.

---

### 19.8 Lista de pacotes no Wise

A página `/squadwise/obras/[obraId]/pacotes` deverá possuir:

- busca por código/nome;
- filtro por status institucional;
- filtro por revisão;
- filtro por responsável;
- filtro por prioridade;
- filtro por prazo;
- filtro por módulos participantes;
- filtro por portões;
- ordenação;
- paginação server-side;
- ação `Novo pacote`.

Tabela recomendada:

| Pacote | Escopo resumido | Revisão | Responsável | Módulos | Portões | Status | Prazo | Ações |
|---|---|---:|---|---|---|---|---|---|

Em telas menores, utilizar cards compactos, preservando:

- código;
- nome;
- status;
- prazo;
- responsável;
- portões principais.

Não carregar todos os pacotes e filtrar apenas no cliente.

---

### 19.9 Criação e edição do pacote no Wise

A criação do pacote deve ser uma página dedicada ou fluxo em etapas, não um Dialog pequeno.

Etapas recomendadas:

```text
1. Identificação
2. Escopo físico
3. Tipologias
4. Responsáveis e prazo
5. Módulos participantes
6. Revisão e confirmação
```

#### Identificação

Campos:

- código, com sugestão automática e possibilidade de edição conforme regra;
- nome;
- descrição;
- tipo de pacote;
- prioridade.

#### Escopo físico

Utilizar árvore com seleção hierárquica e resumo da seleção.

Regras visuais:

- selecionar torre não deve marcar silenciosamente todos os descendentes sem mostrar consequência;
- seleção parcial deve possuir estado indeterminado;
- permitir revisar quantidade de nós selecionados;
- impedir escopo vazio quando obrigatório.

#### Tipologias

Permitir:

- selecionar tipologias da obra;
- filtrar por código, descrição, pavimento e face;
- visualizar quantidade disponível no escopo;
- impedir vincular tipologia fora do escopo sem override autorizado;
- indicar tipologias já vinculadas a outros pacotes quando isso for relevante, sem assumir exclusividade se o domínio permitir sobreposição.

#### Módulos participantes

Usar cards ou checkboxes ricos, indicando:

- função do módulo;
- disponibilidade/contratação;
- dependências;
- contexto que será criado;
- consequências de desativar depois.

#### Confirmação

Resumo final:

- identidade;
- escopo;
- tipologias;
- responsáveis;
- módulos;
- portões iniciais;
- possíveis avisos.

A criação deverá usar idempotency key e apresentar resultado estável em caso de duplo clique/reenvio.

---

### 19.10 Workspace operacional de Compras no SquadFrame

A rota principal do contexto será:

```text
/squadframe/pacotes/[pacoteId]/compras
```

A página funcionará como workspace e terá navegação interna estável:

```text
Visão geral
Lista de Materiais
Necessidades
Solicitações
Pedidos
Recebimentos
Histórico
```

Se o contexto ainda não existir, a página executará o fluxo `ensure` no servidor quando permitido.

Estados possíveis na abertura:

```text
CONTEXTO_EXISTENTE
CONTEXTO_CRIADO
MODULO_NAO_PARTICIPANTE
PACOTE_INATIVO
SEM_PERMISSAO
ERRO_RECONCILIAVEL
ERRO_CRITICO
```

A interface não deverá mostrar uma tela vazia genérica. Cada estado possui mensagem e ação própria.

---

### 19.11 Visão geral do contexto de Compras

A visão geral deverá responder rapidamente:

- qual lista está vigente;
- qual revisão institucional está atendida;
- qual é o estado calculado;
- o contexto está bloqueado?;
- quais necessidades são críticas;
- quanto está solicitado, pedido e recebido;
- quais etapas produtivas estão em risco;
- existem inconsistências?;
- Compras está institucionalmente liberado?;
- Produção tem recomendação de liberação?;

Layout sugerido:

```text
PageHeader

[Estado calculado] [Portão Compras] [Bloqueio] [Revisão]

Alertas prioritários

Resumo da Lista de Materiais
Cobertura por estágio
Necessidades bloqueantes
Prontidão por etapa
Atividade recente
```

#### Cards executivos

Não usar cards apenas decorativos. Cada card deve conter dado acionável.

Exemplos:

```text
Lista vigente
LM-02 · Liberada
Revisão 02
12 necessidades
```

```text
Compras comprometidas
8 de 12 necessidades totalmente pedidas
3 parciais
1 sem pedido
```

```text
Recebimento
5 atendidas
4 parciais
3 sem recebimento
```

```text
Bloqueantes
2 pendentes para corte
[Ver necessidades]
```

#### Não criar percentual global enganoso

A tela não deve exibir:

```text
Compras: 73%
```

quando o cálculo mistura barras, peças, metros e metros quadrados.

Permitir percentuais somente:

- por necessidade;
- por grupo homogêneo;
- por contagem de linhas, com label explícito;
- por criticidade/etapa, com denominador descrito.

Exemplo aceitável:

```text
8 de 12 necessidades totalmente pedidas
```

Exemplo aceitável:

```text
Perfil SU-001: 83,3% da quantidade pedida
```

---

### 19.12 Barra de situação do contexto

Componente conceitual:

```text
ProcurementContextStatusBar
```

Conteúdo:

- estado calculado base;
- bloqueio manual;
- portão institucional;
- lista vigente;
- revisão;
- última atualização;
- inconsistências.

Exemplo:

```text
RECEBIMENTO_PARCIAL
Bloqueado manualmente · revisão de acabamento
Compras liberado · Revisão 02 · LM-02
Atualizado há 3 minutos
```

Se houver dado provisório:

```text
Recebimento calculado com qualidade provisória: o fluxo de inspeção ainda não está implementado.
```

---

### 19.13 Lista de Materiais — visão de versões

A tab `Lista de Materiais` deve mostrar primeiro as versões, não abrir diretamente um formulário gigante.

Tabela sugerida:

| Lista | Revisão | Status | Origem | Necessidades | Criada por | Liberada em | Ações |
|---|---:|---|---|---:|---|---|---|

Estados:

```text
RASCUNHO
EM_REVISAO
LIBERADA
SUBSTITUIDA
CANCELADA
```

A lista vigente deve ser destacada por texto e badge:

```text
Vigente para operação
```

Listas históricas devem permanecer acessíveis, mas sem ações incompatíveis.

#### Ações por estado

`RASCUNHO`:

- continuar edição;
- duplicar;
- enviar para revisão;
- cancelar.

`EM_REVISAO`:

- revisar;
- devolver para rascunho, se permitido;
- liberar;
- cancelar.

`LIBERADA`:

- visualizar;
- comparar;
- criar nova revisão a partir dela;
- exportar.

`SUBSTITUIDA`:

- visualizar histórico;
- comparar;
- exportar.

`CANCELADA`:

- visualizar;
- consultar motivo e auditoria.

Não oferecer edição de lista liberada.

---

### 19.14 Editor da Lista de Materiais

O editor deve ser página dedicada.

Estrutura:

```text
PageHeader da lista
Resumo da revisão
Toolbar
Tabela de necessidades
Painel de validação
Ações de fluxo
```

Toolbar:

- adicionar item do catálogo;
- adicionar item livre, com permissão;
- importar;
- copiar da versão anterior;
- filtros;
- busca;
- alternar agrupamento;
- validar lista.

Tabela principal:

| Sequência | Item | Origem | Quantidade | Unidade | Criticidade | Etapa | Abrangência | Tipologias | Validação | Ações |
|---:|---|---|---:|---|---|---|---|---:|---|---|

Regras:

- edição inline apenas para campos simples em rascunho;
- campos complexos abrem Drawer;
- salvar linha não publica lista;
- validações locais são imediatas;
- validações persistidas são retornadas pela RPC;
- lista grande usa paginação ou virtualização controlada;
- não carregar comboboxes completos com milhares de itens.

#### Auto-save

Não usar auto-save irrestrito em operações críticas.

Pode existir salvamento de rascunho com debounce somente quando:

- a operação for idempotente;
- houver indicador `Salvando...` / `Salvo` / `Falha ao salvar`;
- conflitos de revisão forem detectados;
- o usuário puder repetir a ação.

A publicação é sempre explícita.

---

### 19.15 Seletor do Catálogo Mestre

Componente de domínio apoiado em primitivas do SquadUI:

```text
CatalogItemSelector
```

Requisitos:

- busca server-side por código, descrição, fabricante, linha e categoria;
- filtros progressivos;
- paginação;
- preview técnico;
- unidade padrão;
- indicação de item ativo/inativo;
- aviso de duplicidade na lista;
- suporte a teclado;
- não carregar o catálogo inteiro no cliente.

Ao selecionar o item, a UI deve mostrar quais snapshots serão capturados:

```text
Código: PERF-SU-001
Descrição: Perfil montante Suprema
Unidade: barra
```

O usuário poderá ajustar dados permitidos da necessidade, mas não alterar o Catálogo Mestre dentro do formulário de Compras.

Quando precisar corrigir o catálogo:

```text
[ Abrir item no SquadWise ]
```

---

### 19.16 Item livre como exceção controlada

A ação `Adicionar item livre` deverá:

- ser secundária;
- exigir permissão específica;
- apresentar explicação de uso excepcional;
- exigir descrição e unidade;
- permitir marcar serviço/extraordinário quando aplicável;
- registrar motivo;
- sugerir busca no catálogo antes da confirmação.

Não utilizar item livre como caminho mais rápido e visualmente dominante.

Exemplo de aviso:

```text
Itens livres não possuem identidade compartilhada com Estoque e Produção.
Use apenas quando o item não puder ser cadastrado no Catálogo Mestre agora.
```

---

### 19.17 Editor de necessidade

O Drawer ou página de detalhe da necessidade deve agrupar campos por assunto.

#### Identidade

- item de catálogo ou descrição livre;
- código/descrição snapshot;
- unidade.

#### Planejamento

- quantidade necessária;
- criticidade;
- etapa necessária;
- abrangência;
- sequência;
- observações.

#### Tipologias

- vínculo N:N;
- quantidade de tipologias;
- quantidade material atribuída;
- origem do vínculo;
- diferença não atribuída.

#### Rastreabilidade

- lista;
- revisão;
- substitui necessidade;
- autoria;
- histórico.

#### Cobertura

Em modo somente leitura:

- solicitado;
- pedido;
- recebido;
- falta;
- excessos;
- documentos vinculados.

A edição da necessidade só é permitida enquanto a lista estiver em estado compatível.

---

### 19.18 Vínculo N:N com tipologias

Componente conceitual:

```text
MaterialNeedTypologyAssignment
```

Deve permitir:

- buscar tipologias do pacote;
- selecionar múltiplas;
- informar quantidade de tipologias;
- informar material atribuído, quando aplicável;
- mostrar total atribuído;
- mostrar diferença em relação à necessidade;
- explicar que a diferença pode ser material geral, perda ou embalagem;
- impedir tipologia fora do pacote sem override permitido.

Exemplo:

```text
Necessidade: 500 parafusos

J01     20 esquadrias     200 parafusos
J02     15 esquadrias     180 parafusos
P03     10 esquadrias      80 parafusos

Atribuído: 460
Não atribuído: 40
Motivo: reserva técnica e perdas
```

A UI não deve forçar igualdade quando o domínio permite diferença, mas deve torná-la explícita.

---

### 19.19 Validação e publicação da Lista de Materiais

Antes de liberar a lista, apresentar um painel de validação dividido em:

```text
Bloqueios
Avisos
Informações
```

Exemplos de bloqueio:

- necessidade sem quantidade;
- item de catálogo inativo sem override;
- unidade incompatível;
- item específico sem tipologia;
- revisão institucional incompatível;
- duplicidade não resolvida.

Exemplos de aviso:

- item livre;
- necessidade bloqueante sem etapa;
- diferença de atribuição às tipologias;
- nova lista reduz quantidade já comprada em revisão anterior.

#### Dialog de publicação

Conteúdo:

- pacote;
- revisão;
- número da lista;
- quantidade de necessidades;
- bloqueios resolvidos;
- avisos pendentes;
- impacto sobre a lista vigente;
- declaração de imutabilidade;
- justificativa, quando necessária.

A ação primária deve indicar o resultado:

```text
Liberar LM-02 e substituir LM-01
```

Não usar apenas `Confirmar`.

---

### 19.20 Comparação de revisões

A comparação deve oferecer três níveis.

#### Resumo

```text
Necessidades adicionadas: 3
Necessidades removidas: 1
Quantidades aumentadas: 4
Quantidades reduzidas: 2
Itens substituídos: 1
Excesso potencial: 2 itens
Compra adicional necessária: 5 itens
```

#### Tabela de diferenças

| Item | Anterior | Atual | Diferença | Já comprometido | Impacto | Ação |
|---|---:|---:|---:|---:|---|---|

#### Detalhe

Mostrar:

- snapshots anteriores e atuais;
- tipologias afetadas;
- documentos vinculados;
- quantidade já solicitada/pedida/recebida;
- excesso potencial;
- necessidade adicional;
- decisão registrada.

Cores de diff devem ser acompanhadas por sinais `+`, `−`, texto e ícones.

---

### 19.21 Tab de Necessidades

A tab `Necessidades` apresenta a lista vigente como visão operacional de cobertura.

Tabela recomendada:

| Item | Necessário | Solicitado | Pedido | Recebido | Falta | Criticidade | Etapa | Estado | Ações |
|---|---:|---:|---:|---:|---:|---|---|---|---|

As quantidades devem manter a unidade na mesma célula:

```text
120 barras
```

Não colocar a unidade apenas no cabeçalho quando linhas puderem possuir unidades distintas.

#### Agrupamentos

Permitir agrupar por:

- criticidade;
- etapa produtiva;
- categoria do catálogo;
- estado calculado;
- tipologia;
- fornecedor previsto, quando existir.

#### Filtros

- busca por código/descrição;
- sem solicitação;
- sem pedido;
- recebimento parcial;
- bloqueantes;
- etapa;
- criticidade;
- origem livre;
- inconsistências;
- excesso.

#### Linha expandida

Pode mostrar:

- funil completo;
- solicitações vinculadas;
- pedidos vinculados;
- recebimentos vinculados;
- tipologias;
- auditoria resumida.

Não quebrar navegação por teclado nem seleção de linhas.

---

### 19.22 Funil visual da necessidade

Componente conceitual:

```text
MaterialNeedFunnel
```

Exemplo:

```text
Necessário     120 barras
Solicitado     120 barras
Aprovado       120 barras
Pedido         100 barras
Recebido        60 barras
Disponível       —
Reservado        —
```

Antes do Stock existir, mostrar `—` com explicação:

```text
Disponibilidade será informada pelo SquadStock quando o módulo estiver ativo.
```

Nunca mostrar zero para ausência de integração.

---

### 19.23 Criação de solicitação a partir do pacote

A experiência preferencial é iniciar pela necessidade.

Fluxo:

```text
Selecionar necessidades
    ↓
Criar solicitação
    ↓
Informar quantidades
    ↓
Agrupar itens compatíveis
    ↓
Revisar alocações
    ↓
Salvar/enviar
```

A interface deve permitir selecionar várias necessidades e criar uma solicitação, respeitando:

- fornecedor ainda não obrigatório, conforme fluxo atual;
- unidades compatíveis;
- saldos para solicitar;
- necessidades de pacotes diferentes somente quando o fluxo explicitamente permitir documento multipacote;
- permissão e portão institucional.

O contexto do pacote pode preencher o cabeçalho legado `lote_id` como conveniência, mas a UI deverá gravar alocações por necessidade como fonte oficial.

---

### 19.24 Editor de alocação de solicitação

Componente conceitual:

```text
RequestItemAllocationEditor
```

Deve exibir:

- quantidade do item da solicitação;
- necessidades elegíveis;
- pacote de cada necessidade;
- saldo para solicitar;
- quantidade alocada;
- parcela geral/não destinada, quando permitida;
- total alocado;
- diferença.

Validação em tempo real:

```text
Quantidade do item: 200 barras
Alocado: 180 barras
Não destinado: 20 barras
```

Quando o documento nasceu dentro de um pacote, pré-preencher a necessidade selecionada, mas permitir revisão antes de confirmar.

Não salvar alocação implícita invisível ao usuário.

---

### 19.25 Editor de alocação de pedido

Componente conceitual:

```text
PurchaseItemAllocationEditor
```

Exemplo:

```text
Pedido PC-145
Item: Perfil X
Quantidade pedida: 200 barras

PAT-001 · N-001       120 barras
PAT-002 · N-014        80 barras

Total alocado         200 barras
Diferença               0 barra
```

Requisitos:

- buscar necessidades elegíveis;
- mostrar obra e pacote;
- respeitar item/unidade/variante;
- mostrar saldo ainda necessário;
- prevenir soma acima do item;
- prevenir alocação acima da necessidade sem override;
- permitir excesso planejado com motivo, conforme regra;
- bloquear edição após emissão, usando fluxo de ajuste/realocação auditável;
- suportar compra direta quando permitido;
- preservar rastreabilidade da solicitação de origem.

#### Caso simples

Quando um item atende uma única necessidade, a UI poderá apresentar um seletor simples, mas deverá persistir pela mesma estrutura oficial de alocação.

#### Caso multipacote

O editor deve mostrar claramente cada pacote. Não ocultar o rateio dentro de uma coluna genérica.

---

### 19.26 Recebimento e alocação do recebido

O recebimento é uma operação distinta do pedido. A UI deve obrigar o usuário a confirmar para onde a quantidade recebida foi destinada quando o item possui múltiplas alocações.

Componente conceitual:

```text
ReceiptItemAllocationEditor
```

Exemplo:

```text
Pedido: 200 barras
Recebimento atual: 100 barras

Alocações planejadas do pedido
PAT-001    120
PAT-002     80

Destino deste recebimento
PAT-001    100
PAT-002      0
```

Requisitos:

- sugerir distribuição, sem confirmar silenciosamente;
- respeitar saldo de cada alocação do pedido;
- permitir distribuição diferente da ordem planejada quando autorizada;
- exigir motivo para desvio significativo;
- permitir parcela não destinada quando o domínio permitir;
- mostrar recebimentos anteriores;
- mostrar saldo restante do pedido e de cada pacote;
- impedir soma acima da quantidade recebida;
- impedir alocar a necessidade incompatível;
- apresentar qualidade do dado quando inspeção ainda não existe.

#### Sugestões de distribuição

A UI poderá oferecer ações explícitas:

```text
[ Priorizar bloqueantes ]
[ Seguir alocação do pedido ]
[ Distribuir manualmente ]
```

Nenhuma opção será aplicada sem revisão do usuário.

---

### 19.27 Realocação e correção

Após emissão, aprovação ou confirmação, não editar diretamente registros históricos.

A UI deve oferecer fluxo de correção:

```text
Realocar quantidade
```

O fluxo apresenta:

- origem;
- destino;
- quantidade;
- documento afetado;
- impacto de cobertura;
- motivo obrigatório;
- permissão necessária;
- evento/auditoria resultante.

Exemplo:

```text
Mover 20 barras
De: PAT-001 · N-001
Para: PAT-002 · N-014
Motivo: alteração de prioridade da obra
```

Quando a realocação não for segura, a UI deve orientar para cancelamento/estorno e nova operação.

---

### 19.28 Bloqueios manuais

O bloqueio do contexto de Compras deve ser uma ação explícita.

Drawer/Dialog:

- tipo do bloqueio;
- motivo obrigatório;
- descrição detalhada;
- impacto esperado;
- data de revisão opcional;
- responsável pela resolução;
- anexos/referências, quando suportados;
- confirmação.

A página continuará exibindo o estado calculado subjacente.

Exemplo:

```text
Bloqueado
Motivo: acabamento indefinido
Responsável: Engenharia
Revisar em: 20/07/2026

Estado calculado sem bloqueio: PEDIDOS_EMITIDOS
```

Desbloqueio exige registro de resolução.

---

### 19.29 Overrides

Overrides não serão ações rápidas em menus de linha.

Devem ocorrer em fluxo dedicado, contendo:

- regra que será excepcionalmente ignorada;
- motivo;
- risco;
- quantidade/documento afetado;
- validade ou escopo;
- permissão exigida;
- confirmação reforçada.

Exemplos:

- alocar acima da necessidade;
- usar item de catálogo inativo;
- vincular tipologia fora do escopo;
- liberar com aviso não resolvido;
- realocar após recebimento.

A UI deve distinguir `override permitido` de `erro técnico`.

---

### 19.30 Histórico, auditoria e timeline

A experiência terá duas leituras diferentes.

#### Timeline operacional

Voltada ao usuário:

```text
17/07 13:20 — Recebimento parcial registrado
100 barras destinadas ao PAT-001
por Carlos Mendes
```

```text
16/07 09:40 — Pedido PC-145 emitido
200 barras distribuídas entre PAT-001 e PAT-002
```

#### Auditoria técnica

Disponível para perfis autorizados:

- ator;
- ação;
- antes/depois;
- motivo;
- correlação;
- idempotency key;
- origem;
- IP/user agent quando permitido;
- evento associado.

Não mostrar payload JSON cru como experiência padrão. Pode existir visualização técnica expansível.

#### Filtros

- período;
- tipo de entidade;
- ação;
- usuário;
- documento;
- pacote;
- somente overrides;
- somente falhas/reconciliações.

---

### 19.31 Reconciliação na interface

A reconciliação é ferramenta administrativa, não botão comum para todos.

Fluxo:

```text
Executar diagnóstico
    ↓
Mostrar anomalias
    ↓
Separar correções seguras e ações manuais
    ↓
Aplicar somente correções seguras autorizadas
    ↓
Gerar relatório
```

A interface deverá possuir modos:

```text
DRY_RUN
APPLY_SAFE_FIXES
```

Exemplo:

```text
3 anomalias encontradas

2 correções seguras
✓ Contexto ausente para pacote ativo
✓ Projeção de cobertura desatualizada

1 ação manual
! Recebimento alocado acima do pedido após ajuste legado
```

Nunca usar `Reconciliar` como ação opaca que altera dados sem preview.

---

### 19.32 Feedback de idempotência e repetição

Quando o usuário repetir uma operação por duplo clique, retry de rede ou retorno tardio, a UI deve tratar o resultado idempotente como sucesso estável.

Exemplo:

```text
A solicitação já havia sido criada. Abrimos o registro existente.
```

Não mostrar erro técnico de chave duplicada.

Estados de botão:

```text
Pronto
Enviando
Processando
Concluído
Falhou — tentar novamente
```

Durante envio:

- desabilitar ação duplicada;
- preservar possibilidade de navegação quando seguro;
- usar progressivo/Spinner sem bloquear toda a aplicação;
- manter `idempotencyKey` no retry da mesma intenção.

---

### 19.33 Estados padrão de página

Toda tela deve implementar estados completos.

#### Loading inicial

- Skeleton coerente com o layout;
- não usar Spinner central para tabelas grandes;
- preservar PageHeader quando dados institucionais já estiverem disponíveis.

#### Loading parcial

- atualizar apenas região afetada;
- manter dados anteriores com indicador `Atualizando` quando seguro;
- não zerar tabela durante troca de filtro.

#### Empty state estrutural

Exemplo:

```text
Ainda não existe Lista de Materiais para este pacote.
Crie um rascunho para começar a organizar as necessidades.
[ Criar Lista de Materiais ]
```

#### Empty state por filtro

```text
Nenhuma necessidade corresponde aos filtros aplicados.
[ Limpar filtros ]
```

#### Erro recuperável

```text
Não foi possível atualizar a cobertura.
Os dados exibidos podem estar desatualizados.
[ Tentar novamente ]
```

#### Erro crítico

```text
Não foi possível carregar o contexto de Compras.
Código: CONTEXT_READ_FAILED
Correlação: ...
```

#### Sem permissão

Explicar se o usuário pode visualizar, mas não editar.

```text
Você pode consultar este pacote, mas não possui permissão para liberar a Lista de Materiais.
```

#### Módulo não participante

```text
O SquadFrame não participa deste pacote.
A participação deve ser configurada no SquadWise.
[ Abrir módulos do pacote ]
```

#### Pacote suspenso/cancelado

Apresentar banner persistente e desabilitar mutações incompatíveis, sem esconder o histórico.

---

### 19.34 Qualidade e atualidade do dado

O read model pode informar:

- `updatedAt`;
- origem;
- qualidade;
- integração indisponível;
- projeção desatualizada;
- dados provisórios.

A UI deverá representar isso.

Exemplos:

```text
Atualizado há 2 minutos
```

```text
Disponibilidade de estoque indisponível: SquadStock ainda não está ativo.
```

```text
Recebimentos exibidos sem etapa de inspeção. Qualidade provisória.
```

Evitar timestamps técnicos excessivos em toda linha; usar no cabeçalho e oferecer detalhe quando necessário.

---

### 19.35 Sistema de badges e estados

O SquadUI deverá possuir uma primitiva genérica de badge/chip, mas o mapeamento de estados fica no domínio.

Exemplo:

```ts
const procurementStatusPresentation = {
  SEM_LISTA: { tone: 'neutral', label: 'Sem lista' },
  LISTA_EM_ELABORACAO: { tone: 'info', label: 'Lista em elaboração' },
  AGUARDANDO_LIBERACAO_INSTITUCIONAL: { tone: 'warning', label: 'Aguardando liberação' },
  PENDENTE_DE_COMPRA: { tone: 'warning', label: 'Pendente de compra' },
  COMPRA_PARCIAL: { tone: 'info', label: 'Compra parcial' },
  PEDIDOS_EMITIDOS: { tone: 'info', label: 'Pedidos emitidos' },
  RECEBIMENTO_PARCIAL: { tone: 'warning', label: 'Recebimento parcial' },
  MATERIAL_RECEBIDO: { tone: 'success', label: 'Material recebido' },
  ENCERRADO: { tone: 'success', label: 'Encerrado' },
} as const;
```

O componente não deve conhecer regra de transição.

---

### 19.36 Tabelas administrativas

Tabelas desta etapa deverão utilizar padrão comum do SquadUI.

Recursos:

- ordenação server-side quando aplicável;
- filtros;
- paginação;
- seleção múltipla;
- ações por linha;
- colunas responsivas;
- sticky header quando útil;
- densidade confortável/compacta;
- skeleton;
- empty states;
- erros parciais;
- exportação assíncrona quando grande.

#### Colunas numéricas

- alinhamento à direita;
- casas decimais conforme unidade;
- unidade na célula;
- tooltip para valor completo quando truncado;
- não converter `numeric` para float impreciso.

#### Seleção múltipla

A seleção deve permanecer estável apenas dentro do conjunto/página explicitamente selecionado. Para “selecionar todos os resultados”, exigir ação própria e informar quantidade.

---

### 19.37 Filtros e busca

Utilizar `FilterBar` ou composição equivalente do SquadUI.

Requisitos:

- filtros refletidos na URL quando úteis;
- possibilidade de compartilhar visão;
- botão `Limpar`;
- contagem de filtros ativos;
- chips removíveis;
- busca com debounce;
- resultados server-side;
- presets futuros sem criar lógica local fragmentada.

Parâmetros devem passar por schema Zod e contrato de Query definido na Etapa 6.

---

### 19.38 Drawer, Dialog e página dedicada

#### Drawer

Usar para:

- detalhe rápido de necessidade;
- filtros avançados;
- vínculo de tipologias;
- bloqueio;
- informações contextuais.

#### Dialog

Usar para:

- confirmação de liberação;
- cancelamento;
- revogação;
- operações pequenas e irreversíveis;
- decisão de retry/reconciliação segura.

#### Página dedicada

Usar para:

- criação/edição de pacote;
- editor completo da Lista de Materiais;
- comparação de revisão;
- alocação complexa multipacote;
- recebimento com vários itens;
- auditoria avançada.

Não encaixar fluxos complexos em modais estreitos.

---

### 19.39 Formulários

Padrão:

```text
Seção
├── Título
├── Descrição curta
├── Campos
└── Erros/contexto
```

Regras:

- label sempre visível;
- placeholder não substitui label;
- erros junto ao campo e resumo quando múltiplos;
- campos obrigatórios identificados de forma acessível;
- cancelamento explícito;
- ação primária previsível;
- Enter não confirma ação destrutiva inadvertidamente;
- mudanças não salvas geram proteção de navegação;
- campos derivados são somente leitura e visualmente distintos.

#### Barra de ações

Em formulários longos, utilizar barra fixa inferior ou superior, sem cobrir conteúdo:

```text
Alterações não salvas                     [Cancelar] [Salvar rascunho]
```

---

### 19.40 Responsividade

#### Desktop

- sidebar completa;
- tabelas densas;
- painéis laterais;
- resumo em grid;
- comparação lado a lado.

#### Tablet

- sidebar recolhível;
- cards em duas colunas;
- tabelas com colunas prioritárias;
- Drawers amplos;
- ações agrupadas.

#### Mobile

- navegação em Drawer;
- PageHeader empilhado;
- tabs roláveis ou seletor de seção;
- tabelas transformadas em cards quando a leitura tabular não for essencial;
- alocações em etapas verticais;
- barra de ação fixa;
- targets de toque adequados;
- nenhuma funcionalidade crítica removida.

O editor multipacote em mobile pode usar fluxo passo a passo, mas deve preservar o mesmo contrato de domínio.

---

### 19.41 Acessibilidade

Requisitos mínimos:

- navegação por teclado;
- foco visível;
- ordem lógica de tabulação;
- labels associados;
- mensagens de erro anunciadas;
- `aria-live` para salvamento e resultados assíncronos;
- headings hierárquicos;
- tabelas com cabeçalhos corretos;
- menus e Drawers com gerenciamento de foco;
- contraste adequado;
- cor nunca como único indicador;
- botões com nomes acessíveis;
- atalhos documentados;
- áreas de toque mínimas.

#### Matriz de alocação

Editores de rateio devem funcionar sem drag and drop obrigatório. O usuário deve poder preencher valores por teclado e navegar entre células.

#### Gráficos

Qualquer gráfico futuro deve possuir tabela/resumo textual equivalente.

---

### 19.42 Atalhos de teclado

Podem ser adicionados em superfícies de alta repetição:

```text
/        focar busca
N        nova necessidade, quando permitido
Ctrl+S   salvar rascunho
Esc      fechar Drawer/Dialog
```

Regras:

- não interceptar campos de texto indevidamente;
- exibir atalhos em tooltips/menu de ajuda;
- não tornar atalho obrigatório;
- respeitar convenções do navegador.

---

### 19.43 Concorrência e conflitos de edição

Quando duas pessoas editarem o mesmo rascunho, a UI deverá detectar versão divergente.

Mensagem:

```text
Esta Lista de Materiais foi alterada por outro usuário às 13:42.
Suas mudanças ainda não foram aplicadas.

[Recarregar versão atual] [Comparar alterações]
```

Não sobrescrever silenciosamente.

Para operações críticas, o banco continua como autoridade por lock e versão. A UI apenas apresenta o conflito retornado.

---

### 19.44 Realtime

Realtime deve ser usado seletivamente.

Bom uso:

- atualizar atividade recente;
- indicar que cobertura foi recalculada;
- atualizar status de evento/processamento;
- avisar que outro usuário alterou a lista;
- refletir novo recebimento.

Evitar:

- substituir toda a tela a cada evento;
- perder seleção/filtros;
- aplicar valores de formulário sobre edição local;
- usar Realtime como única fonte de consistência.

Quando houver edição local, mostrar banner:

```text
Há uma versão mais recente disponível.
[Recarregar após salvar] [Descartar e atualizar]
```

---

### 19.45 Notificações e toasts

Toast é adequado para:

- rascunho salvo;
- operação concluída;
- cópia de link;
- exportação iniciada;
- retry realizado.

Alert/banner é adequado para:

- bloqueio;
- pacote suspenso;
- revisão incompatível;
- erro persistente;
- módulo indisponível;
- dado provisório;
- inconsistência.

Não usar toast como único registro de erro que exige ação.

---

### 19.46 Permissões na UI

A UI pode ocultar ou desabilitar ações por conveniência, mas a autorização real continua no servidor e banco.

Padrões:

- ocultar ação irrelevante quando usuário nunca poderá usá-la;
- desabilitar com explicação quando o estado atual impede a ação;
- não inferir permissão somente por cargo exibido;
- carregar capabilities/permissões efetivas do contrato público;
- manter tela de leitura quando permitido;
- mostrar `Sem permissão` sem revelar dados sensíveis.

Exemplo:

```text
[ Liberar Lista de Materiais ] — desabilitado
Motivo: falta a permissão frame.pacotes.compras.lista.liberar
```

Em produção, avaliar se revelar a chave técnica é apropriado; usuários comuns recebem texto amigável, administradores podem ver detalhe técnico.

---

### 19.47 Componentes que pertencem ao SquadUI

Componentes genéricos ou semânticos compartilháveis:

```text
AppShell
Sidebar
Topbar
Container
PageHeader
Section
Breadcrumb
Tabs
Card
StatCard
DataTable
FilterBar
SearchInput
Select
Combobox
AsyncCombobox
Checkbox
Radio
Switch
Chip
Badge
Alert
Tooltip
Popover
DropdownMenu
Dialog
Drawer
Accordion
Pagination
Skeleton
Spinner
EmptyState
ErrorState
PermissionState
Timeline
DiffViewer
FormSection
StickyActionBar
UnsavedChangesGuard
```

Se algum não existir, avaliar implementação no SquadUI antes de criar cópia local.

O SquadUI define:

- aparência;
- acessibilidade;
- tamanhos;
- estados;
- tokens;
- interação genérica.

Ele não conhece regras de Pacote, Compras ou Produção.

---

### 19.48 Componentes específicos do SquadWise

Permanecem no domínio Wise:

```text
WorkPackageHeader
WorkPackageSummary
WorkPackageScopeTree
WorkPackageTypologyTable
WorkPackageRevisionTimeline
WorkPackageModuleManager
InstitutionalGateCard
WorkPackageOperationalProjection
WorkPackageStatusActions
```

Eles podem compor componentes do SquadUI, mas carregam semântica institucional.

---

### 19.49 Componentes específicos do SquadFrame

Permanecem no domínio Frame:

```text
PackageProcurementHeader
ProcurementContextStatusBar
ProcurementOverview
MaterialListVersionTable
MaterialListEditor
MaterialNeedTable
MaterialNeedEditor
CatalogItemSelector
MaterialNeedTypologyAssignment
MaterialNeedFunnel
MaterialCoverageSummary
RequestItemAllocationEditor
PurchaseItemAllocationEditor
ReceiptItemAllocationEditor
RevisionImpactSummary
ProcurementBlockerPanel
ProcurementReadinessPanel
ProcurementReconciliationPanel
PackageProcurementTimeline
```

Não mover esses componentes para o SquadUI apenas porque aparecem em mais de uma página do Frame.

---

### 19.50 Composição de dados na UI

As páginas devem consumir os read models oficiais da Etapa 6.

Exemplo:

```text
PackageProcurementViewDTO
├── package
├── context
├── currentMaterialList
├── calculatedStatus
├── needs
├── blockers
├── readinessRecommendation
├── inconsistencies
└── updatedAt
```

A página não deverá:

- consultar cinco tabelas diretamente;
- recalcular cobertura no componente;
- inferir status por contagens locais;
- misturar tipo físico gerado do Supabase com props de apresentação;
- repetir regras de unidade.

Mappers de apresentação podem transformar DTO em labels/tons, sem criar regra de negócio.

---

### 19.51 Server Components e Client Components

#### Server Components

Usar por padrão para:

- carregamento inicial;
- PageHeader;
- tabelas sem interação local complexa;
- resumo;
- histórico paginado;
- estados de permissão;
- leitura institucional.

#### Client Components

Usar quando necessário para:

- editores de alocação;
- seleção hierárquica;
- formulário com estado local;
- comparação interativa;
- Drawers/Dialogs;
- filtros com transição;
- Realtime seletivo;
- proteção de mudanças não salvas.

Não marcar páginas inteiras como client apenas por um botão interativo.

---

### 19.52 Performance da interface

Regras:

- paginação server-side;
- busca server-side;
- lazy loading de tabs não visitadas;
- não carregar histórico completo;
- não carregar catálogo inteiro;
- virtualizar apenas quando necessário e sem quebrar acessibilidade;
- usar `Promise.all` somente para consultas independentes;
- evitar cascatas de requests por linha;
- read model agregado para visão geral;
- prefetch de deep links importantes;
- cache por tags conforme Etapa 6;
- revalidar apenas regiões afetadas.

#### Tabelas grandes

A primeira entrega deve preferir paginação previsível. Virtualização pode ser adicionada após medição real.

---

### 19.53 Exportação

Exportações devem respeitar filtros e permissões.

Tipos iniciais:

- Lista de Materiais;
- cobertura das necessidades;
- alocações de pedido;
- recebimentos por pacote;
- comparação de revisão;
- timeline/auditoria autorizada.

Para pequenos conjuntos, exportação pode ser imediata. Para conjuntos grandes:

```text
Solicitar exportação
    ↓
Job assíncrono
    ↓
Notificação de conclusão
    ↓
Link temporário autorizado
```

Nunca gerar arquivos grandes no browser com dados incompletos da página atual sem informar limitação.

---

### 19.54 Microcopy oficial

Textos devem usar termos do glossário.

Preferir:

```text
Pacote de Trabalho
Lista de Materiais
Necessidade de Material
Quantidade destinada
Recebimento parcial
Liberar Compras
```

Evitar:

```text
Lote
Coisa
Item vinculado
Status 4
Enviar tudo
Dar baixa
```

`Lote` poderá aparecer apenas quando se referir ao legado ou ao futuro Lote de Produção físico, nunca como sinônimo indiscriminado de Pacote de Trabalho na UI nova.

#### Botões

Usar verbos específicos:

```text
Salvar rascunho
Enviar para revisão
Liberar Lista de Materiais
Registrar recebimento
Aplicar correções seguras
Realocar quantidade
```

---

### 19.55 Wireframe textual — detalhe do pacote no Wise

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SquadWise / Obras / Alto das Torres / Pacotes / PAT-001             │
├─────────────────────────────────────────────────────────────────────┤
│ PAT-001 · Torre A — Pavimentos 01 ao 05             [Ações ▾]      │
│ Residencial Alto das Torres · Pacote Mestre                         │
│ [ATIVO] [Revisão 02] [Alta] [Prazo 30/09]                          │
├─────────────────────────────────────────────────────────────────────┤
│ Resumo | Escopo | Tipologias | Revisões | Módulos | Operação | ... │
├─────────────────────────────────────────────────────────────────────┤
│ Portões institucionais                                              │
│ ┌──────────────────────┐  ┌──────────────────────┐                  │
│ │ Compras              │  │ Produção             │                  │
│ │ LIBERADO             │  │ NÃO LIBERADO         │                  │
│ │ 15/07 · Maria        │  │ 2 pré-condições      │                  │
│ └──────────────────────┘  └──────────────────────┘                  │
│                                                                     │
│ Escopo resumido              Módulos participantes                  │
│ Torre A · P01-P05            Frame · Board · Flow                   │
│ 85 esquadrias                                                       │
│                                                                     │
│ Operação                                                           │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ Compras · SquadFrame                                          │   │
│ │ Recebimento parcial · 12 necessidades · 2 bloqueantes         │   │
│ │ Atualizado há 3 min                       [Abrir no Frame]      │   │
│ └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 19.56 Wireframe textual — visão geral de Compras

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SquadFrame / Pacotes / PAT-001 / Compras                            │
├─────────────────────────────────────────────────────────────────────┤
│ PAT-001 · Torre A — P01-P05                         [Ações ▾]       │
│ Contexto de Compras · Dados institucionais do SquadWise             │
│ [RECEBIMENTO PARCIAL] [Compras liberado] [Revisão 02]               │
├─────────────────────────────────────────────────────────────────────┤
│ Visão geral | Lista | Necessidades | Solicitações | Pedidos | ...  │
├─────────────────────────────────────────────────────────────────────┤
│ ! Bloqueio manual: acabamento em revisão            [Ver bloqueio] │
│                                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│ │ Lista vigente│ │ Pedidas      │ │ Recebidas    │ │ Bloqueantes │ │
│ │ LM-02        │ │ 8/12 linhas  │ │ 5/12 linhas  │ │ 2 pendentes │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│                                                                     │
│ Necessidades bloqueantes                                            │
│ Perfil X · 120 barras · Corte · Pedido 100 · Recebido 60           │
│ Componente Y · 200 un · Montagem · Sem pedido                      │
│                                                                     │
│ Prontidão por etapa                                                  │
│ Corte: bloqueado · Usinagem: parcial · Montagem: não avaliada       │
│                                                                     │
│ Atividade recente                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 19.57 Wireframe textual — editor de alocação de pedido

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Alocar item do pedido                                               │
│ PC-145 · Perfil X · 200 barras                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Buscar necessidade...                                               │
│                                                                     │
│ Necessidade                          Saldo       Destinar            │
│ PAT-001 · N-001 · Corte              120         [120,000]           │
│ PAT-002 · N-014 · Corte               80          [80,000]           │
│                                                                     │
│ Parcela geral / não destinada                     [0,000]           │
├─────────────────────────────────────────────────────────────────────┤
│ Quantidade do item             200,000 barras                       │
│ Total destinado                200,000 barras                       │
│ Diferença                        0,000 barra                         │
│                                                     [Cancelar]      │
│                                                     [Confirmar]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 19.58 Wireframe textual — recebimento multipacote

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Registrar recebimento                                               │
│ PC-145 · Perfil X                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Pedido: 200 barras             Já recebido: 0                       │
│ Recebimento atual: [100,000] barras                                 │
│                                                                     │
│ Destino deste recebimento                                           │
│ PAT-001 · N-001    planejado 120    receber agora [100,000]         │
│ PAT-002 · N-014    planejado  80    receber agora [  0,000]         │
│                                                                     │
│ [Priorizar bloqueantes] [Seguir plano] [Distribuir manualmente]     │
│                                                                     │
│ Total destinado: 100,000                                            │
│ Diferença: 0,000                                                    │
│                                                     [Confirmar]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 19.59 Fluxo completo — criação e liberação da lista

```text
Usuário abre pacote no Frame
    ↓
contexto é garantido de forma idempotente
    ↓
cria Lista de Materiais em rascunho
    ↓
adiciona itens do Catálogo Mestre
    ↓
vincula tipologias e criticidade
    ↓
salva rascunho
    ↓
envia para revisão
    ↓
validação server-side
    ↓
resolve bloqueios
    ↓
libera lista
    ↓
lista anterior é substituída
    ↓
auditoria + evento + revalidação
    ↓
visão de cobertura passa a usar a nova lista
```

---

### 19.60 Fluxo completo — compra e recebimento multipacote

```text
Necessidades de PAT-001 e PAT-002
    ↓
solicitação multipacote
    ↓
alocações por necessidade
    ↓
aprovação
    ↓
pedido com 200 barras
    ↓
alocação planejada 120/80
    ↓
recebimento parcial de 100
    ↓
usuário destina 100 ao PAT-001
    ↓
RPC valida e grava recebimento + alocações
    ↓
cobertura do PAT-001 muda
    ↓
PAT-002 continua aguardando
    ↓
timeline, auditoria e evento
```

---

### 19.61 Proibições de UI

Não implementar:

- status calculado como Select manual;
- pacote duplicado por módulo;
- edição de Compras dentro do Wise;
- edição do escopo institucional dentro do Frame;
- percentual global misturando unidades;
- alocação implícita invisível;
- distribuição automática de recebimento sem confirmação;
- item livre como opção principal;
- formulário complexo em Dialog pequeno;
- cálculo de cobertura no componente React;
- acesso direto da UI às tabelas;
- botão que executa várias mutações independentes no cliente;
- confirmação genérica para ação crítica;
- exclusão física de histórico operacional;
- uso de cor como único indicador;
- Spinner de página inteira para qualquer atualização;
- dados do Stock representados como zero antes da integração;
- `service_role` no browser;
- payload técnico de erro exposto ao usuário comum;
- novo design system local.

---

### 19.62 Sequência de implementação da UI

#### Bloco UI-1 — Fundação compartilhada

- validar componentes SquadUI existentes;
- completar PageHeader, DataTable, FilterBar, EmptyState, ErrorState, Timeline, DiffViewer e StickyActionBar quando necessário;
- mapear tokens Wise/Frame;
- definir apresentações de estados;
- criar layout responsivo e shells.

#### Bloco UI-2 — Pacote institucional no Wise

- lista de pacotes;
- PageHeader;
- resumo;
- escopo;
- tipologias;
- módulos;
- portões;
- projeções operacionais;
- deep links.

#### Bloco UI-3 — Workspace de Compras

- rota do contexto;
- ensure idempotente;
- visão geral;
- estado calculado;
- alertas;
- cobertura por necessidade;
- histórico resumido.

#### Bloco UI-4 — Lista de Materiais

- versões;
- criação de rascunho;
- editor;
- Catálogo Mestre;
- item livre;
- tipologias;
- validação;
- publicação;
- comparação.

#### Bloco UI-5 — Alocações

- solicitação;
- pedido;
- multipacote;
- compra direta;
- realocação;
- validações.

#### Bloco UI-6 — Recebimentos

- registro;
- alocação por pacote/necessidade;
- recebimento parcial;
- histórico;
- qualidade provisória.

#### Bloco UI-7 — Administração operacional

- bloqueios;
- overrides;
- reconciliação;
- auditoria;
- exportações;
- observabilidade para administradores.

Cada bloco deve ser liberado por feature flag/capability quando necessário e possuir critérios de aceite próprios.

---

### 19.63 Critérios de aceite da Etapa 7

A Etapa 7 é considerada concluída arquiteturalmente quando:

- Wise e Frame possuem papéis visuais distintos e complementares;
- a UI deixa claro o módulo proprietário de cada dado;
- rotas e deep links preservam o mesmo `pacote_id`;
- PageHeader canônico do pacote está definido;
- detalhe institucional do Wise possui resumo, escopo, tipologias, revisões, módulos, operação e histórico;
- portões institucionais usam fluxo auditável, não Switch simples;
- lista e criação de pacotes estão especificadas;
- workspace de Compras possui navegação interna completa;
- visão geral responde às principais perguntas operacionais;
- não existe percentual global misturando unidades;
- versões da Lista de Materiais possuem ações coerentes por estado;
- listas liberadas não parecem editáveis;
- editor de lista, seletor de catálogo e item livre estão definidos;
- necessidade possui editor com tipologias N:N e cobertura somente leitura;
- validação e publicação possuem preview de impacto;
- comparação de revisões evidencia compra adicional e excesso potencial;
- tabela de necessidades mostra funil quantitativo por unidade;
- alocações de solicitação, pedido e recebimento possuem editores distintos;
- recebimento multipacote exige confirmação do destino;
- correção ocorre por realocação/estorno auditável, não edição histórica;
- bloqueios e overrides possuem UX reforçada;
- timeline e auditoria não são confundidas;
- reconciliação possui `DRY_RUN` e preview;
- resultado idempotente é tratado como sucesso estável;
- loading, vazio, erro, sem permissão, módulo ausente e pacote suspenso estão definidos;
- qualidade e atualidade do dado são visíveis;
- componentes do SquadUI e componentes de domínio estão separados;
- Server Components e Client Components possuem usos claros;
- responsividade e acessibilidade estão especificadas;
- concorrência e Realtime não sobrescrevem edição local;
- permissões visuais não substituem autorização no servidor;
- wireframes textuais dos fluxos críticos estão registrados;
- proibições de UI estão explícitas;
- a sequência incremental de implementação está definida;
- nenhuma regra de negócio nova depende exclusivamente da camada visual.

### 19.64 Decisões que ficam para a Etapa 8

A Etapa 8 deverá definir:

- como as rotas e telas novas convivem com as telas atuais do Frame;
- migração de `lotes_obra` e `tipologias_obra` sem quebra;
- backfill de pacotes, listas e contextos;
- tratamento dos `lote_id` legados;
- dual read/dual write temporário, caso necessário;
- estratégia de feature flags;
- importação do legado para Lista de Materiais;
- reconciliação pré e pós-migração;
- rollback por bloco;
- critérios para bloquear novas gravações no legado;
- remoção futura de caminhos antigos;
- comunicação visual de dados legados durante a transição.

## 20. Migração do legado, backfill, compatibilidade, feature flags, rollback e reconciliação

**Estado:** Concluída — Etapa 8.

Esta etapa define como a arquitetura descrita nas Partes 1 a 7 será introduzida sobre o sistema já em produção sem interromper Compras, Obras, Board ou os fluxos atuais do SquadFrame.

A estratégia oficial é:

```text
EXPANDIR
    ↓
PREENCHER
    ↓
VALIDAR EM PARALELO
    ↓
TROCAR LEITURA
    ↓
TROCAR ESCRITA
    ↓
BLOQUEAR LEGADO
    ↓
CONTRAIR
```

Não haverá migração do tipo `big bang`, clonagem completa do domínio ou troca imediata de todas as rotas. Cada avanço deverá ser reversível por configuração até que os dados, os contratos e a operação tenham sido validados.

---

### 20.1 Objetivos desta etapa

A migração deverá:

- preservar todos os registros existentes de Obras, Pacotes, Tipologias, Solicitações, Pedidos e Recebimentos;
- preservar os UUIDs já referenciados por outros módulos;
- introduzir contextos de Compras, listas, necessidades e alocações sem criar uma segunda identidade de pacote;
- impedir novas divergências entre campos legados e estruturas novas;
- classificar registros históricos ambíguos sem inventar rastreabilidade inexistente;
- permitir ativação gradual por empresa, obra, pacote ou grupo de usuários;
- permitir comparação entre o resultado legado e o novo read model;
- manter rollback operacional por feature flag;
- produzir relatórios de reconciliação antes e depois de cada mudança de fonte de leitura;
- bloquear gravações legadas somente quando todos os critérios de aceite forem cumpridos;
- remover mecanismos antigos apenas em uma etapa futura de contração controlada.

A migração não deverá:

- apagar ou recriar IDs existentes;
- transformar todos os pedidos históricos em necessidades fictícias;
- assumir que um `lote_id` no cabeçalho prova a destinação de todos os itens;
- assumir que material recebido foi destinado ao mesmo pacote do pedido;
- executar dual write independente em duas fontes de verdade;
- deixar fallback legado permanente;
- usar a UI para esconder inconsistências sem registrá-las;
- remover tabelas ou colunas na mesma release em que a nova leitura é ativada.

---

### 20.2 Decisão sobre a identidade canônica

A tabela física `lotes_obra` já foi evoluída e hoje representa o Pacote de Trabalho do SquadWise.

Portanto, a migração **não criará uma nova tabela paralela `wise_pacotes_trabalho` para copiar esses registros**.

A decisão definitiva é:

```text
Identidade física atual: lotes_obra.id
Significado de domínio: Pacote de Trabalho canônico do SquadWise
```

Os UUIDs existentes serão preservados e continuarão sendo utilizados por:

- `tipologias_obra.lote_id`;
- `pacote_pipeline_status.lote_id` ou `pacote_id`, conforme o schema real;
- `solicitacoes_compra.lote_id`;
- `pedidos_compra.lote_id`;
- entidades do Board;
- novos contextos de Compras;
- futuras referências do Stock e do Flow.

Não será necessária tabela de mapeamento entre `lotes_obra` e um novo pacote do Wise porque a própria linha existente é a entidade canônica.

Tabela de mapeamento só poderá ser usada para fontes externas ou para entidades realmente substituídas, nunca para duplicar o mesmo pacote.

---

### 20.3 Decisão sobre Tipologias

A tabela `tipologias_obra` também continuará com seus UUIDs atuais.

Seu significado consolidado é:

> Item final de engenharia pertencente a uma obra e, opcionalmente, vinculado a um Pacote de Trabalho.

A migração poderá ampliar suas validações, permissões e relacionamento com o Wise, mas não deverá copiar tipologias para uma nova tabela apenas para alterar o namespace.

Tipologias sem `lote_id` devem ser classificadas em uma das categorias:

```text
SEM_PACOTE_VALIDO
AGUARDANDO_CLASSIFICACAO
NAO_SE_APLICA_A_PACOTE
VINCULADA
```

A classificação poderá ser persistida em tabela técnica de migração ou retornada em relatório. Não criar automaticamente um pacote genérico para esconder tipologias sem vínculo.

---

### 20.4 Inventário de estruturas legadas

Antes de qualquer backfill, o processo deverá gerar um inventário contendo, no mínimo:

| Estrutura | Papel atual | Papel após a migração |
|---|---|---|
| `obras` | Obra utilizada pelo Frame | Obra mestre consumida pelo Wise e módulos |
| `lotes_obra` | Lote/Pacote legado | Pacote de Trabalho canônico |
| `tipologias_obra` | Tipologias da obra | Tipologias institucionais do Wise |
| `pacote_pipeline_status` | Posição visual por pipeline | Projeção operacional do Board |
| `solicitacoes_compra.lote_id` | Vínculo único de cabeçalho | Metadado legado/conveniência |
| `pedidos_compra.lote_id` | Vínculo único de cabeçalho | Metadado legado/conveniência |
| `solicitacao_itens` | Itens sem rateio por pacote | Fonte transacional original |
| `pedido_itens` | Itens sem rateio por pacote | Fonte transacional original |
| `recebimento_itens` | Quantidade recebida sem destino detalhado | Fonte transacional original |
| `origem_contexto` | Metadado de criação | Evidência auxiliar, nunca fonte única |
| tabelas do Board | Conteúdo e vínculo visual | Mantidas, com schema versionado |

O inventário deverá registrar:

- total de linhas;
- registros ativos e cancelados;
- campos nulos;
- FKs órfãs;
- duplicidades;
- status inválidos;
- datas incoerentes;
- pacotes sem obra;
- tipologias sem obra;
- tipologias sem pacote;
- solicitações e pedidos sem pacote;
- documentos com pacote diferente entre origem e destino;
- recebimentos acima da quantidade pedida;
- itens com unidade ausente ou incompatível;
- registros que não podem ser migrados automaticamente.

---

### 20.5 Princípio Expand–Migrate–Contract

Cada mudança de schema ou contrato deverá seguir três macrofases.

#### Expandir

Adicionar, sem quebrar consumidores atuais:

- novas tabelas;
- novas colunas nullable ou com default seguro;
- novas RPCs;
- novos Services e Repositories;
- read models V2;
- adapters de compatibilidade;
- flags de rollout;
- relatórios de divergência.

Nenhum campo legado é removido nessa fase.

#### Migrar

Executar:

- backfill idempotente;
- reconciliação;
- shadow read;
- comparação V1 × V2;
- ativação gradual da nova leitura;
- redirecionamento das escritas para o caminho canônico;
- monitoramento de erros e divergências.

#### Contrair

Somente após estabilidade:

- bloquear gravações legadas;
- remover fallback;
- arquivar adapters;
- marcar campos como deprecated;
- remover código morto;
- posteriormente remover colunas ou tabelas comprovadamente desnecessárias.

A contração não faz parte da mesma migration que introduz a estrutura nova.

---

### 20.6 Unidade de migração

A unidade principal de migração será o `pacote_id`.

Uma execução deverá ser capaz de operar por:

- pacote individual;
- obra;
- empresa;
- intervalo de datas;
- conjunto explícito de IDs;
- todos os pacotes elegíveis.

Toda rotina deverá aceitar `dry_run`.

Exemplo conceitual:

```ts
interface MigratePackageInput {
  packageId: PackageId;
  dryRun: boolean;
  force?: boolean;
  correlationId: string;
}
```

O processo global nunca deverá depender de uma única transação cobrindo todos os pacotes.

Cada pacote deve ser migrado em transação própria ou em unidades pequenas e retomáveis.

---

### 20.7 Estados técnicos da migração

Cada pacote poderá possuir um estado técnico de migração sem alterar seu status institucional.

Sugestão:

```text
NAO_AVALIADO
ELEGIVEL
EM_PROCESSAMENTO
MIGRADO
MIGRADO_COM_ALERTAS
BLOQUEADO
FALHOU
VALIDADO
ATIVADO_V2
LEGADO_BLOQUEADO
```

Esses estados não devem ser gravados em `lotes_obra.status`.

Podem existir em estrutura técnica:

```sql
migration_package_state
- package_id
- migration_name
- state
- source_fingerprint
- target_fingerprint
- warnings_count
- errors_count
- last_run_id
- migrated_at
- validated_at
- metadata jsonb
```

A tabela técnica deverá possuir:

```text
UNIQUE (package_id, migration_name)
```

Ela não é fonte de domínio; serve apenas para controle, retomada e observabilidade.

---

### 20.8 Execuções e itens de migração

A migração deverá registrar cada execução.

Estrutura conceitual:

```sql
migration_runs
- id
- migration_name
- mode              -- DRY_RUN | APPLY | RECONCILE | ROLLBACK_ASSISTED
- scope_type        -- PACKAGE | WORK | COMPANY | GLOBAL
- scope_value
- status            -- RUNNING | COMPLETED | PARTIAL | FAILED | CANCELLED
- started_by
- correlation_id
- started_at
- finished_at
- counters jsonb
- error_summary jsonb
```

```sql
migration_run_items
- id
- run_id
- entity_type
- entity_id
- action
- status
- source_snapshot jsonb
- target_snapshot jsonb
- warnings jsonb
- errors jsonb
- started_at
- finished_at
```

O snapshot deve conter somente campos necessários para diagnóstico. Não duplicar grandes documentos ou dados pessoais sem necessidade.

---

### 20.9 Fingerprints e detecção de alteração concorrente

Antes de migrar um pacote, o processo deverá calcular um fingerprint das fontes relevantes.

Exemplo de fonte:

```text
pacote
módulos participantes
escopo
tipologias
solicitações vinculadas
pedidos vinculados
recebimentos vinculados
```

O fingerprint poderá ser um hash determinístico de uma representação ordenada.

Fluxo:

```text
1. Ler fonte
2. Calcular source_fingerprint
3. Preparar transformação
4. Obter lock
5. Ler novamente os campos críticos
6. Comparar fingerprint
7. Persistir ou abortar com SOURCE_CHANGED
```

Isso evita aplicar um backfill baseado em dados que mudaram durante a execução.

---

### 20.10 Feature flags e capabilities

Feature flag e capability possuem finalidades diferentes.

#### Capability

Representa se a organização contratou ou habilitou funcionalmente um recurso.

Exemplo:

```text
frame.package_procurement
wise.work_packages
```

#### Feature flag

Controla rollout técnico temporário.

Exemplos recomendados:

```text
migration.package_context_v2
frame.package_procurement_read_v2
frame.package_procurement_write_v2
frame.material_lists_v2
frame.purchase_allocations_v2
frame.receipt_allocations_v2
wise.package_operational_projection_v2
legacy.package_write_enabled
legacy.header_package_link_enabled
migration.shadow_compare_enabled
```

Uma capability não deve ser usada como mecanismo de rollback técnico.

Uma feature flag não deve representar contratação comercial permanente.

---

### 20.11 Escopo das feature flags

As flags deverão suportar, conforme necessidade:

```text
GLOBAL
EMPRESA
OBRA
PACOTE
USUARIO
```

A precedência recomendada é:

```text
PACOTE
→ OBRA
→ EMPRESA
→ GLOBAL
```

Flag por usuário só deve ser utilizada para testes internos da interface, nunca para permitir que dois usuários gravem o mesmo pacote por contratos diferentes ao mesmo tempo.

Para escrita, o escopo deve ser consistente por pacote.

---

### 20.12 Coortes de rollout

A ativação deverá ocorrer por coortes controladas.

Sugestão:

```text
Coorte 0 — ambiente local e testes automatizados
Coorte 1 — staging com cópia sanitizada
Coorte 2 — usuários administradores internos
Coorte 3 — uma obra piloto sem operação crítica
Coorte 4 — uma obra ativa com volume controlado
Coorte 5 — empresa atual completa
Coorte 6 — novas empresas por padrão
```

Cada coorte exige:

- janela de observação;
- relatório de divergência;
- métricas de erros;
- aceite operacional;
- plano de rollback testado.

---

### 20.13 Estratégia de leitura paralela

A migração utilizará quatro modos de leitura.

#### LEGACY_ONLY

A interface utiliza apenas o read model atual.

#### SHADOW_COMPARE

A resposta exibida ainda vem do legado, mas o backend calcula o V2 e registra diferenças.

Não executar duas chamadas independentes no browser. A comparação ocorre no servidor.

#### V2_WITH_LEGACY_FALLBACK

O V2 é primário. O fallback só é usado para registros ainda classificados como não migrados ou bloqueados.

Todo fallback deve gerar métrica e log estruturado.

#### V2_ONLY

A leitura depende exclusivamente dos contratos novos.

O modo final deve ser `V2_ONLY`. O fallback possui prazo de remoção.

---

### 20.14 Comparação semântica V1 × V2

A comparação não deve exigir igualdade estrutural entre DTOs diferentes.

Deverá normalizar os dois lados para um contrato semântico comum.

Exemplo:

```ts
interface PackageProcurementComparison {
  packageId: PackageId;
  requestDocumentIds: string[];
  purchaseDocumentIds: string[];
  receiptDocumentIds: string[];
  allocatedRequestedQuantityByUnit: Record<string, string>;
  allocatedOrderedQuantityByUnit: Record<string, string>;
  allocatedReceivedQuantityByUnit: Record<string, string>;
}
```

Diferenças devem ser classificadas:

```text
EXPECTED_MODEL_DIFFERENCE
LEGACY_DATA_LIMITATION
BACKFILL_MISSING
TRANSFORMATION_BUG
SOURCE_CHANGED
UNKNOWN
```

Nem toda diferença é erro. O legado pode simplesmente não possuir granularidade suficiente.

---

### 20.15 Estratégia de escrita

A arquitetura não adotará dual write independente do tipo:

```text
Action → tabela nova
Action → tabela antiga
```

Isso criaria duas transações, duas possibilidades de falha e duas fontes concorrentes.

A escrita deverá possuir um único caminho canônico.

Durante a compatibilidade:

```text
UI nova ou UI antiga
        ↓
Adapter de comando
        ↓
Application Service canônico
        ↓
RPC transacional
        ├── escreve estrutura nova
        └── atualiza projeção/campo legado quando ainda necessário
```

Se algum campo legado precisar ser mantido temporariamente, sua atualização ocorrerá dentro da mesma RPC ou como projeção reconciliável, nunca por uma segunda Action independente.

---

### 20.16 Adapter de comandos legados

Actions antigas que criam solicitações ou pedidos a partir de um pacote deverão ser adaptadas.

Exemplo:

```text
criarPedidoLegado(input com lote_id)
        ↓
LegacyPurchaseCommandAdapter
        ↓
resolve pacote e necessidades elegíveis
        ↓
CreatePurchaseOrderService
        ↓
RPC canônica
```

Quando não for possível inferir a necessidade:

- o documento poderá ser criado com vínculo de cabeçalho legado;
- deverá ser marcado como `ALOCACAO_PENDENTE` no read model;
- não poderá contribuir como cobertura confirmada de uma necessidade até ser alocado;
- a UI deverá exibir a pendência;
- uma rotina de reconciliação deverá listá-lo.

Não criar uma necessidade genérica invisível apenas para fazer a soma fechar.

---

### 20.17 Campos `lote_id` de cabeçalho

Durante a transição, estes campos permanecem:

```text
solicitacoes_compra.lote_id
pedidos_compra.lote_id
```

Seu significado passa a ser:

> Contexto de origem ou pacote predominante do documento, usado para navegação, filtros e compatibilidade.

Eles não serão mais a fonte oficial para calcular quanto de cada item atende cada necessidade.

Regras:

- um documento multipacote pode ter `lote_id = null` ou pacote predominante, conforme decisão do contrato atual;
- a UI não deve concluir que todos os itens pertencem ao cabeçalho;
- alocações são a fonte de verdade;
- alteração do cabeçalho não realoca itens;
- remoção futura será avaliada apenas após todas as consultas terem migrado.

---

### 20.18 Backfill do contexto de Compras

O primeiro backfill funcional criará `frame_pacote_compras`.

Elegibilidade mínima:

```text
pacote existe
AND pacote não está CANCELADO, salvo migração histórica explícita
AND Frame participa do pacote ou há evidência de documentos de compra vinculados
```

A operação deve utilizar o mesmo contrato idempotente definido na Parte 6:

```text
ensureFramePackageContext(packageId)
```

Resultado esperado:

```text
0 ou 1 linha por pacote
```

Se o pacote não possuir o módulo Frame, mas tiver compras históricas, registrar alerta:

```text
FRAME_MODULE_MISSING_WITH_LEGACY_PURCHASES
```

Não ativar automaticamente o módulo sem política explícita.

---

### 20.19 Backfill de revisões e listas de materiais

O sistema legado não possui necessariamente uma Lista de Materiais versionada.

Portanto, não será permitido reconstruir uma lista oficial apenas somando itens de pedidos históricos.

As estratégias são:

#### Fonte confiável disponível

Quando existir uma lista de engenharia, importação ou documento estruturado comprovadamente utilizado como origem:

- criar revisão importada;
- registrar `origem = LEGACY_IMPORT`;
- guardar referência à fonte;
- criar lista em estado `IMPORTADA` ou equivalente definido no domínio;
- exigir validação antes de tratá-la como revisão oficial ativa.

#### Apenas compras históricas disponíveis

Criar uma **visão histórica de atendimento**, não uma Lista de Materiais oficial.

Os itens serão exibidos como:

```text
HISTORICO_SEM_NECESSIDADE_ORIGINAL
```

Eles podem ser classificados manualmente ou associados posteriormente a uma necessidade.

#### Nenhuma fonte confiável

O pacote começa sem lista material migrada.

A UI informa:

```text
Este pacote possui documentos históricos, mas não havia uma Lista de Materiais versionada no legado.
```

---

### 20.20 Backfill de necessidades

Uma necessidade só poderá ser criada automaticamente quando houver evidência suficiente de:

- item ou descrição identificável;
- quantidade necessária;
- unidade;
- pacote;
- origem da quantidade;
- revisão ou contexto histórico.

Níveis de confiança:

```text
HIGH
MEDIUM
LOW
UNMIGRATABLE
```

Somente `HIGH` poderá ser ativado automaticamente como necessidade válida.

`MEDIUM` deverá exigir revisão humana.

`LOW` e `UNMIGRATABLE` permanecem em fila de classificação e não afetam cobertura.

---

### 20.21 Backfill de vínculos com Catálogo Mestre

O casamento entre item legado e Catálogo Mestre deverá utilizar uma ordem segura:

```text
1. ID já existente e válido
2. Código/SKU exato dentro da mesma empresa
3. Código externo mapeado explicitamente
4. Alias previamente aprovado
5. Revisão manual
```

Não realizar vínculo automático apenas por similaridade textual frouxa.

Cada match deve registrar:

```text
match_strategy
match_confidence
source_value
target_item_id
approved_by
approved_at
```

O snapshot textual histórico permanece mesmo após o vínculo ao catálogo.

---

### 20.22 Backfill da relação necessidade × tipologia

Não inferir automaticamente que todo material comprado para um pacote atende todas as tipologias do pacote.

A relação N:N só poderá ser migrada quando existir:

- composição técnica confiável;
- fonte de engenharia;
- importação estruturada;
- associação explícita já presente;
- confirmação humana.

Caso contrário, a necessidade permanece no nível do pacote sem vínculo específico a tipologia.

Isso é válido e preferível a inventar precisão.

---

### 20.23 Backfill das alocações de solicitação

Para cada item de solicitação legado:

#### Caso seguro 1 — documento de pacote único e necessidade equivalente única

Criar alocação com a quantidade do item, respeitando unidade e tolerância.

#### Caso seguro 2 — vínculo explícito preexistente

Migrar o vínculo preservando a origem.

#### Caso ambíguo

Não ratear automaticamente.

Marcar:

```text
PENDING_ALLOCATION
```

#### Caso geral sem pacote

Permanecer como demanda geral, fora da cobertura de pacote, até classificação.

A soma das alocações não pode exceder a quantidade solicitada.

---

### 20.24 Backfill das alocações de pedido

O backfill de pedido seguirá o vínculo da solicitação quando existir rastreabilidade item a item confiável.

Prioridade:

```text
1. pedido_item → solicitacao_item → alocações da solicitação
2. vínculo explícito existente
3. documento de pacote único + necessidade única compatível
4. classificação manual
```

Se um item de pedido atender várias necessidades, as quantidades devem ser registradas explicitamente.

Não distribuir proporcionalmente apenas porque há duas necessidades abertas.

A quantidade não alocada deverá permanecer visível como:

```text
quantidade_geral_ou_pendente
```

---

### 20.25 Backfill das alocações de recebimento

Recebimento exige regra ainda mais conservadora.

Ter um pedido alocado não prova como um recebimento parcial foi distribuído.

Migração automática só é segura quando:

- o item do pedido possui uma única alocação ativa; e
- a quantidade recebida não excede o saldo dessa alocação; e
- não existe evidência de redirecionamento.

Quando o pedido possui múltiplos pacotes ou necessidades:

- não distribuir proporcionalmente;
- não usar a ordem das linhas como evidência;
- registrar `PENDING_RECEIPT_ALLOCATION`;
- exigir classificação manual ou fonte externa confiável.

Recebimentos concluídos sem destino conhecido permanecem contabilizados no documento, mas não como quantidade recebida da necessidade.

---

### 20.26 Registros cancelados, estornados e excluídos logicamente

O backfill deverá respeitar o estado histórico.

Não entram na cobertura ativa:

- solicitações canceladas;
- itens cancelados;
- pedidos cancelados;
- quantidades estornadas;
- recebimentos revertidos;
- alocações anuladas.

Entretanto, esses registros devem permanecer na auditoria e timeline histórica.

Se o legado não possuir estorno formal e houver apenas edição destrutiva, registrar limitação:

```text
LEGACY_HISTORY_INCOMPLETE
```

---

### 20.27 Documentos multipacote

Documentos multipacote deverão ser detectados quando:

- itens possuem alocações para mais de um pacote;
- a origem agrega solicitações de pacotes distintos;
- o usuário classifica manualmente o documento;
- há evidência de rateio histórico.

A interface deverá mostrar:

```text
Documento multipacote
```

E não um único badge de pacote como se fosse fonte exclusiva.

O filtro por pacote utilizará as alocações, não apenas `documento.lote_id`.

---

### 20.28 Compras gerais e parcela não alocada

Um item poderá possuir:

```text
quantidade total = quantidade alocada a pacotes + quantidade geral/não alocada
```

A parcela geral não deve ser vinculada a uma necessidade artificial.

O read model deverá exibir:

- quantidade total;
- quantidade alocada;
- quantidade geral;
- quantidade pendente de classificação.

A diferença entre geral intencional e pendente deverá ser explícita.

---

### 20.29 Dados ambíguos e fila de exceções

Toda ambiguidade deverá gerar issue de reconciliação.

Estrutura conceitual:

```sql
migration_reconciliation_issues
- id
- migration_name
- entity_type
- entity_id
- package_id
- code
- severity
- status
- details jsonb
- suggested_actions jsonb
- assigned_to
- resolved_by
- resolved_at
- resolution jsonb
```

Severidades:

```text
INFO
WARNING
ERROR
BLOCKING
```

Estados:

```text
OPEN
IN_REVIEW
RESOLVED
ACCEPTED_LIMITATION
IGNORED_WITH_JUSTIFICATION
```

Uma issue `BLOCKING` impede `V2_ONLY` para o pacote.

---

### 20.30 Reconciliação pré-migração

Antes do `APPLY`, o `DRY_RUN` deverá gerar:

- contagem de contextos a criar;
- listas/revisões importáveis;
- necessidades de alta confiança;
- solicitações alocáveis;
- pedidos alocáveis;
- recebimentos alocáveis;
- registros ambíguos;
- violações de integridade;
- impactos previstos;
- tempo estimado apenas como métrica técnica interna, não promessa de execução assíncrona ao usuário;
- tamanho dos lotes;
- flags necessárias.

Nenhuma mutação de domínio ocorre em `DRY_RUN`.

---

### 20.31 Reconciliação pós-migração

Após o backfill, comparar:

#### Identidade

- todos os pacotes continuam com o mesmo UUID;
- nenhuma obra ou tipologia foi clonada;
- FKs continuam válidas.

#### Documentos

- quantidade de solicitações, pedidos e recebimentos preservada;
- totais financeiros não alterados;
- status documentais preservados;
- vínculos históricos acessíveis.

#### Alocações

- soma alocada não excede o item;
- unidade é compatível;
- pacote da necessidade corresponde ao contexto;
- recebimento não excede pedido alocado;
- alocações canceladas não entram na cobertura.

#### Contextos

- máximo de um contexto de Compras por pacote;
- pacotes elegíveis possuem contexto;
- pacotes inelegíveis não foram ativados indevidamente.

#### Cobertura

- resultados calculados são reproduzíveis;
- divergências possuem issue classificada;
- nenhum percentual mistura unidades.

---

### 20.32 Reconciliação contínua

A reconciliação não termina no cutover.

Enquanto existir compatibilidade, uma rotina deverá verificar periodicamente:

- documentos criados pelo caminho legado sem alocação;
- pacotes ativos sem contexto;
- contexto sem módulo participante;
- cabeçalho `lote_id` divergente das alocações;
- recebimentos não alocados;
- alocações acima dos saldos;
- eventos não processados;
- fallback de leitura ainda utilizado;
- registros alterados após validação.

A frequência será definida na Parte 9 conforme volume e criticidade.

---

### 20.33 Compatibilidade de rotas

Rotas antigas não devem quebrar links existentes imediatamente.

Estratégia:

```text
Rota antiga
    ↓
resolver entidade e permissão
    ↓
redirect permanente ou temporário para a rota canônica
```

Exemplos conceituais:

```text
/squadframe/obras/[obraId]/lotes/[loteId]
→ /squadwise/obras/[obraId]/pacotes/[pacoteId]
```

```text
/squadframe/pacotes/[pacoteId]/compras
→ permanece como workspace operacional do Frame
```

A rota institucional deve apontar para o Wise.

A rota operacional de Compras deve apontar para o Frame.

Não redirecionar uma tela de edição operacional para uma tela apenas de leitura.

---

### 20.34 Compatibilidade de componentes e UI

Durante a transição, componentes antigos podem consumir adapters V1.

Regras:

- componentes novos usam DTOs V2;
- componentes antigos não acessam tabelas novas diretamente;
- adapters devem possuir prazo de remoção;
- badges indicam dados históricos ou pendentes;
- nenhuma tela exibe estado calculado como campo editável;
- a origem do dado deve estar visível quando relevante.

Badges sugeridos:

```text
LEGADO
MIGRADO
PENDENTE DE CLASSIFICAÇÃO
ALOCADO PARCIALMENTE
DADO HISTÓRICO
LIMITAÇÃO ACEITA
```

---

### 20.35 Comunicação visual durante a migração

A UI não deverá alarmar usuários comuns com detalhes técnicos desnecessários.

Para operadores:

```text
Alguns itens históricos ainda precisam ser distribuídos entre os pacotes.
```

Para administradores:

- código da issue;
- entidade afetada;
- motivo;
- impacto;
- ações possíveis;
- link para reconciliação.

A interface deve diferenciar:

```text
Dado ainda não migrado
Dado migrado com alerta
Dado historicamente impossível de detalhar
Erro atual corrigível
```

---

### 20.36 Versionamento de contratos

Contratos públicos que mudarem de forma incompatível deverão receber versão.

Exemplo:

```text
PackageProcurementSummaryV1
PackageProcurementSummaryV2
```

RPCs poderão utilizar sufixo temporário:

```text
fn_obter_contexto_compras_v2
```

Depois do cutover e remoção do V1, o projeto poderá decidir manter o nome versionado ou promover um nome canônico em mudança futura.

Não alterar silenciosamente o formato de retorno usado por telas antigas.

---

### 20.37 Compatibilidade de eventos

Durante a migração, eventos antigos podem continuar sendo publicados.

Estratégia:

- produtor canônico publica evento V2;
- adapter poderá produzir evento legado derivado quando consumidor antigo ainda existir;
- evento legado derivado deve carregar `causation_id` do evento V2;
- não publicar dois fatos independentes para a mesma mutação;
- consumidores novos ignoram eventos legados;
- métricas mostram consumidores ainda dependentes do V1.

Eventos de backfill deverão possuir:

```text
metadata.origin = MIGRATION
```

E não devem disparar notificações humanas históricas como se fossem acontecimentos atuais.

---

### 20.38 Supressão de efeitos colaterais no backfill

Backfill não deve:

- enviar e-mail ou push sobre evento antigo;
- criar tarefas de acompanhamento retroativas automaticamente;
- alterar portões institucionais;
- mover cards do Board como se a operação tivesse acabado de ocorrer;
- recalcular financeiro histórico de forma destrutiva;
- disparar integração externa sem necessidade.

Consumers devem verificar:

```text
metadata.origin
metadata.suppress_side_effects
```

O fato pode entrar na auditoria técnica sem gerar efeitos operacionais atuais.

---

### 20.39 Permissões durante a migração

Novas permissões serão introduzidas antes da ativação das telas.

Perfis existentes deverão receber backfill controlado de permissões, baseado em equivalência explícita.

Exemplo:

```text
permissão antiga de gerir pedidos
≠ automaticamente permissão de realocar recebimentos históricos
```

Permissões sensíveis de migração:

```text
system.migrations.view
system.migrations.execute_dry_run
system.migrations.apply
system.migrations.reconcile
system.migrations.resolve_issue
system.migrations.activate_v2
system.migrations.block_legacy
system.migrations.rollback
```

Essas permissões não devem ser atribuídas a perfis operacionais comuns.

---

### 20.40 RLS e service role

Backfills administrativos poderão exigir identidade técnica, mas deverão seguir:

- execução somente no servidor;
- escopo explícito;
- logs com `actor_type = SYSTEM` e identidade do usuário que iniciou;
- nenhuma exposição de `service_role` ao frontend;
- validação de empresa quando o domínio passar a suportar multiempresa;
- funções `SECURITY DEFINER` com `search_path` fixo;
- revogação de execução pública;
- grants mínimos.

A migration SQL estrutural não deve executar automaticamente um backfill de alto volume sem controle operacional.

---

### 20.41 Estratégia de migrations SQL

Separar:

```text
1. migration estrutural
2. deploy do código compatível
3. backfill operacional
4. validação
5. ativação por flag
6. migration de contração futura
```

Migrations estruturais devem ser:

- aditivas;
- pequenas;
- reproduzíveis;
- sem chamadas HTTP;
- sem depender de UI;
- sem processar milhões de linhas em uma única transação;
- com índices criados de forma segura para o volume real;
- sem `DROP` antecipado.

---

### 20.42 Scripts de backfill

Scripts devem residir em diretório versionado, separado das migrations de schema.

Sugestão:

```text
scripts/migrations/package-procurement-v2/
├── dry-run.ts
├── apply.ts
├── reconcile.ts
├── report.ts
├── rollback-assist.ts
├── transforms/
├── repositories/
├── schemas/
└── README.md
```

Cada script deve aceitar:

- ambiente explícito;
- escopo;
- limite;
- cursor;
- `dry_run`;
- correlation ID;
- usuário responsável;
- saída JSON e resumo legível.

Não permitir execução de produção por default implícito.

---

### 20.43 Paginação, lotes e retomada

O processamento deverá usar paginação estável por chave.

Preferir:

```text
WHERE id > :last_id
ORDER BY id
LIMIT :batch_size
```

ou cursor equivalente.

Evitar `OFFSET` para grandes volumes mutáveis.

Cada lote deve registrar seu cursor final.

Em falha:

- itens concluídos permanecem concluídos;
- lote atual pode ser reexecutado de forma idempotente;
- próximo processamento retoma do cursor seguro;
- nenhum pacote fica parcialmente migrado sem estado explícito.

---

### 20.44 Concorrência com operação diária

Durante o backfill, usuários podem continuar criando pedidos e recebimentos.

Medidas:

- fingerprint antes e após leitura;
- lock por pacote ou item no momento de persistir;
- transações curtas;
- retry limitado para conflitos transitórios;
- shadow read para detectar novos registros;
- reconciliação após o lote;
- janela controlada apenas para o cutover final de escrita, se necessária.

Não bloquear toda a empresa durante o backfill histórico.

---

### 20.45 Ordem dos backfills

A ordem obrigatória é:

```text
1. Contextos de Compras
2. Revisões/listas importáveis
3. Necessidades confiáveis
4. Relações necessidade-tipologia confiáveis
5. Alocações de solicitação
6. Alocações de pedido
7. Alocações de recebimento
8. Read models
9. Comparação e reconciliação
10. Ativação da leitura V2
```

Não migrar recebimentos antes de pedidos e suas alocações.

Não migrar pedidos antes de necessidades quando a alocação depender delas.

---

### 20.46 Estratégia de rollback

Rollback será dividido em níveis.

#### Nível 1 — Rollback de interface

Desativar telas V2 e voltar à rota antiga.

Não altera dados.

#### Nível 2 — Rollback de leitura

Trocar de `V2_ONLY` ou `V2_WITH_FALLBACK` para `LEGACY_ONLY`.

As estruturas novas permanecem para diagnóstico.

#### Nível 3 — Rollback de escrita

Reativar adapter legado apenas se o contrato tiver sido mantido e a segurança permitir.

Esse rollback deve ser testado antes do cutover.

#### Nível 4 — Compensação de dados migrados

Não executar `DELETE` genérico.

Usar o `run_id` e a origem `MIGRATION` para:

- cancelar ou desativar projeções criadas;
- restaurar estado técnico;
- remover somente registros comprovadamente criados pelo run e ainda sem dependências posteriores;
- gerar compensações quando houver eventos ou dependências.

#### Nível 5 — Recuperação de banco

PITR ou restauração de backup é último recurso para falha catastrófica, não rollback cotidiano.

Sua disponibilidade deverá ser confirmada operacionalmente antes do cutover.

---

### 20.47 Regra de não destruição no rollback

Se um registro criado pelo backfill já recebeu edição humana ou operação posterior, ele não poderá ser apagado automaticamente.

Exemplo:

```text
necessidade importada
→ usuário revisou
→ pedido novo foi alocado
```

Nesse caso, o rollback de leitura pode ocorrer, mas os dados novos permanecem preservados e marcados para análise.

A rotina deverá retornar:

```text
ROLLBACK_REQUIRES_MANUAL_REVIEW
```

---

### 20.48 Rollback por bloco

Cada bloco deve possuir seu próprio plano.

| Bloco | Rollback principal |
|---|---|
| Contexto de Compras | desativar leitura; remover apenas contextos vazios criados pelo run |
| Listas/necessidades | desativar versão importada; não apagar se usada |
| Alocações de solicitação | cancelar alocações de origem migration sem dependentes |
| Alocações de pedido | cancelar somente se não houver recebimento associado |
| Alocações de recebimento | compensação auditável, nunca edição silenciosa |
| UI V2 | feature flag |
| Eventos V2 | desativar consumer/adapter, preservar outbox |
| Bloqueio legado | reativar flag após verificar compatibilidade |

---

### 20.49 Critérios para trocar a leitura

Um pacote poderá usar leitura V2 quando:

- contexto existe;
- read model é calculável;
- nenhuma issue `BLOCKING` está aberta;
- somas e unidades foram validadas;
- documentos relevantes estão classificados ou explicitamente marcados como históricos não alocados;
- comparação shadow não apresenta bug de transformação;
- permissões estão aplicadas;
- UI suporta todos os estados existentes;
- fallback foi testado.

A troca pode ocorrer por pacote ou obra.

---

### 20.50 Critérios para trocar a escrita

A escrita V2 poderá ser ativada quando:

- RPCs transacionais estão em produção;
- Actions antigas usam adapter canônico;
- idempotência está validada;
- locks e concorrência foram testados;
- auditoria e outbox são atômicos;
- permissões estão ativas;
- rollback de escrita foi ensaiado;
- não há consumidor crítico dependendo exclusivamente do formato antigo;
- reconciliação detecta escrita fora do caminho canônico.

Não ativar escrita V2 apenas porque a tela nova está pronta.

---

### 20.51 Critérios para bloquear gravações legadas

`legacy.package_write_enabled` só poderá ser desligada quando:

- 100% das rotas conhecidas usam Services canônicos;
- buscas no repositório não encontram escrita direta não autorizada;
- logs não registram gravação legada por período definido na Parte 9;
- consumidores externos foram atualizados;
- fallback de escrita não foi usado na coorte;
- reconciliação não detecta documentos sem alocação originados após o cutover;
- suporte possui procedimento de contingência;
- administradores aprovaram a mudança.

Ao bloquear, o sistema deve retornar erro explícito:

```text
LEGACY_WRITE_DISABLED
```

Nunca falhar silenciosamente.

---

### 20.52 Critérios para remover fallback de leitura

O fallback pode ser removido quando:

- todos os pacotes ativos estão em `V2_ONLY`;
- pacotes históricos possuem tratamento definido;
- taxa de fallback é zero pelo período de observação;
- issues abertas restantes são limitações aceitas sem impacto operacional;
- relatórios e exportações usam V2;
- links antigos redirecionam corretamente;
- testes de regressão cobrem os casos legados.

---

### 20.53 Depreciação dos campos de cabeçalho

A depreciação de `solicitacoes_compra.lote_id` e `pedidos_compra.lote_id` seguirá:

```text
ATIVO COMO LEGADO
→ SOMENTE LEITURA
→ NÃO USADO EM CÁLCULOS
→ NÃO EXPOSTO EM NOVOS CONTRATOS
→ NULL PARA NOVOS DOCUMENTOS MULTIPACOTE
→ CANDIDATO A REMOÇÃO
```

A remoção física só ocorrerá se:

- não houver consulta, índice, policy, trigger ou integração dependente;
- dados históricos continuarem navegáveis por alocações;
- o ganho superar o custo de compatibilidade.

Pode ser tecnicamente aceitável manter a coluna histórica sem torná-la fonte de verdade.

---

### 20.54 Tratamento de pacotes históricos

Pacotes concluídos ou cancelados podem ser migrados em modo reduzido.

Categorias:

```text
HISTORICO_COMPLETO
HISTORICO_PARCIAL
HISTORICO_APENAS_DOCUMENTAL
NAO_MIGRADO_COM_LIMITACAO_ACEITA
```

Não é obrigatório reconstruir granularidade impossível para pacotes antigos, desde que:

- documentos originais permaneçam acessíveis;
- a limitação seja indicada;
- o pacote não seja usado para decisões operacionais atuais;
- relatórios não apresentem o dado incompleto como exato.

---

### 20.55 Novos pacotes após o cutover

Após ativação da escrita V2 para uma empresa:

- todo novo pacote elegível cria contexto de Compras por operação idempotente;
- listas e necessidades usam contratos V2;
- solicitações e pedidos criados a partir do pacote exigem alocação coerente;
- recebimentos multipacote exigem destino explícito;
- campos legados são apenas projeção quando ainda necessários;
- qualquer tentativa de usar Action antiga deve passar pelo adapter ou falhar.

Novos dados não devem aumentar a dívida do legado.

---

### 20.56 Migração do Board

O Board continuará usando o mesmo `pacote_id`.

Não haverá clonagem de cards para representar a migração.

Ajustes:

- leitura institucional do pacote vem do Wise;
- pipeline visual continua em `pacote_pipeline_status`;
- status operacional detalhado vem dos read models dos módulos;
- coluna do Board não substitui estado de Compras;
- cards legados mantêm seus IDs quando possível;
- rotas do card apontam para o detalhe institucional ou contexto operacional correto;
- backfill não movimenta colunas automaticamente sem regra explícita.

---

### 20.57 Migração de relatórios e exportações

Relatórios deverão declarar sua fonte.

Durante a transição:

```text
Relatório V1 — baseado em lote_id de cabeçalho
Relatório V2 — baseado em alocações e necessidades
```

Não misturar linhas de V1 e V2 sem indicador.

Antes de substituir um relatório:

- comparar totais financeiros;
- comparar quantidade de documentos;
- explicar diferenças de cobertura;
- validar filtros multipacote;
- validar documentos gerais;
- testar exportação e arredondamentos.

---

### 20.58 Migração de buscas e filtros

Filtros antigos por `lote_id` devem evoluir.

Consulta V2 de “documentos do pacote” considera:

- alocação de item;
- pacote de origem do documento;
- documentos históricos de cabeçalho ainda não classificados;
- parcela geral, quando solicitada pelo filtro.

A UI poderá oferecer:

```text
Vinculado por alocação
Vinculado apenas pelo legado
Pendente de classificação
```

---

### 20.59 Backup e recuperação

Antes do primeiro `APPLY` em produção:

- confirmar política de backup do Supabase/PostgreSQL;
- confirmar retenção e possibilidade de PITR;
- testar restauração em ambiente isolado quando viável;
- exportar relatório de contagem e fingerprints;
- registrar versão do código e migrations;
- registrar flags ativas;
- registrar usuário responsável e janela de mudança.

Backup não substitui rollback por feature flag, mas protege contra falha catastrófica.

---

### 20.60 Métricas de rollout

A migração deverá expor métricas como:

```text
packages_evaluated_total
packages_migrated_total
packages_blocked_total
migration_items_failed_total
migration_warnings_total
legacy_reads_total
legacy_fallback_reads_total
legacy_writes_total
v2_reads_total
v2_writes_total
unallocated_request_items_total
unallocated_purchase_items_total
unallocated_receipt_items_total
reconciliation_issues_open_total
event_delivery_failures_total
```

As metas e alertas serão definidos na Parte 9.

---

### 20.61 Logs e correlação

Cada execução deverá propagar:

```text
correlation_id
migration_run_id
package_id
work_id
company_id, quando aplicável
actor_id
actor_type
feature_flag_state
code_version
```

Nunca registrar tokens, segredos ou payloads completos com dados sensíveis.

---

### 20.62 Cenários de falha obrigatórios

A implementação deverá possuir resposta definida para:

#### Contexto já existe

Retornar sucesso idempotente.

#### Pacote alterado durante o backfill

Abortar o item e reprogramar com `SOURCE_CHANGED`.

#### Necessidade sem item de catálogo

Manter snapshot e fila de revisão; não bloquear toda a migração se descrição livre for permitida.

#### Pedido multipacote ambíguo

Criar issue; não ratear automaticamente.

#### Recebimento parcial multipacote

Criar pendência de alocação; não distribuir proporcionalmente.

#### Evento duplicado

Consumer retorna sucesso idempotente.

#### Consumer indisponível

Outbox mantém pendência e retry.

#### Read model V2 falha

Usar fallback apenas se a flag permitir e registrar métrica.

#### Migração parcial de pacote

Estado técnico fica `FAILED` ou `MIGRADO_COM_ALERTAS`; não marcar validado.

#### Usuário tenta editar pelo caminho legado após bloqueio

Retornar erro explícito e linkar para a tela nova.

---

### 20.63 Matriz de compatibilidade por fase

| Fase | Leitura | Escrita | Legado | Novas estruturas |
|---|---|---|---|---|
| 0 — Preparação | V1 | V1 | ativo | schema vazio/oculto |
| 1 — Backfill | V1 | V1 por adapter compatível | ativo | preenchidas |
| 2 — Shadow | V1 exibido + V2 comparado | canônica com projeção | ativo monitorado | validadas |
| 3 — Piloto | V2 com fallback | V2 | fallback | primárias na coorte |
| 4 — Cutover | V2 | V2 | escrita bloqueada | fonte operacional |
| 5 — Estabilização | V2 | V2 | leitura histórica limitada | fonte oficial |
| 6 — Contração | V2 | V2 | adapters removidos | contrato canônico |

---

### 20.64 Plano incremental de migração

#### MIG-0 — Auditoria e preparação

- inventário real;
- formalização do schema do Board, se ainda pendente;
- relatórios de qualidade;
- feature flags;
- tabelas técnicas de runs/issues;
- backup e procedimentos.

#### MIG-1 — Expandir schema e contratos

- contexto de Compras;
- revisões/listas/necessidades;
- alocações;
- RPCs;
- Services;
- adapters V1/V2;
- permissões.

#### MIG-2 — Backfill de contextos

- ensure idempotente;
- pacotes elegíveis;
- issues de módulo participante;
- validação 1:1.

#### MIG-3 — Backfill de listas e necessidades

- fontes confiáveis;
- níveis de confiança;
- catálogo;
- tipologias;
- histórico sem inferência indevida.

#### MIG-4 — Backfill de alocações

- solicitações;
- pedidos;
- recebimentos;
- fila de ambiguidades;
- reconciliação quantitativa.

#### MIG-5 — Shadow read e comparação

- DTO semântico;
- relatórios de divergência;
- correções;
- observação por coorte.

#### MIG-6 — Ativação da UI e leitura V2

- Wise institucional;
- Frame operacional;
- deep links;
- badges de legado;
- fallback monitorado.

#### MIG-7 — Escrita V2

- Actions canônicas;
- adapters legados;
- idempotência;
- outbox;
- bloqueio gradual de caminhos diretos.

#### MIG-8 — Bloqueio do legado

- desativar escrita antiga;
- monitorar erros;
- suporte assistido;
- reconciliação contínua.

#### MIG-9 — Estabilização

- remover fallback;
- fechar issues;
- classificar limitações aceitas;
- migrar relatórios e integrações restantes.

#### MIG-10 — Contração futura

- remover código morto;
- descontinuar adapters;
- avaliar colunas legadas;
- limpar flags temporárias;
- atualizar documentação definitiva.

---

### 20.65 Critérios de aceite da Etapa 8

A Etapa 8 é considerada concluída arquiteturalmente quando:

- a estratégia Expand–Migrate–Contract está definida;
- `lotes_obra.id` permanece como identidade canônica do Pacote de Trabalho;
- `tipologias_obra.id` é preservado;
- não há proposta de clonar pacotes para uma nova tabela;
- a unidade de migração e os estados técnicos estão definidos;
- runs, itens e issues possuem modelo conceitual;
- fingerprints e tratamento de alteração concorrente estão descritos;
- capabilities e feature flags estão separadas;
- escopos e coortes de rollout estão definidos;
- modos de leitura paralela e comparação semântica estão definidos;
- dual write independente está proibido;
- existe caminho único de escrita com adapter legado;
- o papel temporário dos `lote_id` de cabeçalho está explícito;
- backfill de contexto de Compras está definido;
- listas e necessidades históricas não são inventadas;
- níveis de confiança do backfill estão definidos;
- match com Catálogo Mestre possui critérios seguros;
- relação necessidade-tipologia não é inferida sem evidência;
- regras de backfill para solicitações, pedidos e recebimentos estão separadas;
- recebimento multipacote não é rateado proporcionalmente por padrão;
- documentos gerais e parcelas não alocadas são preservados;
- fila de exceções e severidades estão definidas;
- reconciliação pré, pós e contínua está especificada;
- rotas, componentes e UI possuem estratégia de compatibilidade;
- contratos e eventos possuem versionamento;
- efeitos colaterais históricos são suprimidos no backfill;
- permissões de migração estão separadas das permissões operacionais;
- uso de service role e RLS está limitado;
- migrations estruturais e scripts de backfill estão separados;
- paginação, retomada e concorrência estão especificadas;
- ordem dos backfills está definida;
- rollback possui níveis e regra de não destruição;
- cada bloco possui estratégia de rollback;
- critérios de troca de leitura e escrita estão definidos;
- critérios de bloqueio do legado estão definidos;
- critérios de remoção do fallback estão definidos;
- pacotes históricos possuem categorias de tratamento;
- novos pacotes não geram dívida legada adicional;
- Board, relatórios, buscas e filtros possuem plano de migração;
- backup, métricas, logs e cenários de falha estão contemplados;
- matriz de compatibilidade por fase está registrada;
- plano incremental MIG-0 a MIG-10 está definido;
- nenhuma remoção destrutiva é executada nesta etapa.

### 20.66 Decisões que ficam para a Etapa 9

A Etapa 9 deverá transformar os critérios desta parte em estratégia verificável de qualidade e operação, definindo:

- pirâmide de testes;
- testes de migrations e backfills;
- geração de massas representativas;
- testes de propriedade para somas e alocações;
- testes de concorrência e idempotência;
- testes de segurança e RLS;
- testes de contrato V1/V2;
- testes de rollback;
- testes de performance e volume;
- SLOs e indicadores de observabilidade;
- thresholds das métricas de rollout;
- critérios objetivos de go/no-go por coorte;
- plano de testes de recuperação;
- matriz final de critérios de aceite funcional, técnico e operacional.

# Parte IX — Qualidade, testes, observabilidade, performance e go-live

## 21. Objetivo e papel desta parte

Esta parte transforma as decisões arquiteturais das Partes I a VIII em critérios verificáveis de qualidade e operação.

O objetivo não é apenas definir quais testes devem existir. O objetivo é estabelecer um sistema de **quality gates** capaz de responder objetivamente:

- a arquitetura implementada respeita as fontes de verdade definidas?
- os cálculos de cobertura permanecem corretos em todos os estados?
- eventos duplicados, atrasados ou fora de ordem são seguros?
- migrations e backfills podem ser interrompidos e retomados?
- uma coorte pode avançar de `LEGACY_ONLY` para `V2_ONLY`?
- o sistema suporta rollback sem perda ou invenção de dados?
- RLS, permissões e identidades técnicas impedem acesso indevido?
- o desempenho é suficiente para o volume real da empresa?
- falhas críticas são detectadas antes de o usuário perceber?

A qualidade deste domínio será medida em cinco dimensões:

```text
Correção funcional
+ Integridade transacional
+ Segurança
+ Operabilidade
+ Capacidade de recuperação
```

Nenhuma delas pode ser substituída pelas demais. Um fluxo rápido, mas que aloca quantidades incorretamente, não está pronto. Um fluxo correto, mas impossível de reconciliar após falha, também não está pronto.

---

## 21.1 Princípios obrigatórios de qualidade

### 21.1.1 O banco é parte do produto

Constraints, FKs, índices, RPCs, locks, RLS, outbox e migrations devem ser testados como código de aplicação.

Não é suficiente testar apenas Services TypeScript com mocks.

### 21.1.2 Invariantes são mais importantes que exemplos isolados

Além de casos conhecidos, devem existir testes de propriedade que validem regras gerais, por exemplo:

```text
Para qualquer item de pedido:
SUM(alocações válidas) <= quantidade_pedida
```

```text
Para qualquer recebimento:
SUM(alocações confirmadas) <= quantidade_recebida
```

```text
Para qualquer necessidade ativa:
quantidade_faltante >= 0
```

### 21.1.3 Teste não pode depender de ordem oculta

Cada teste deve criar seu próprio contexto, executar sua ação e limpar ou isolar seus dados.

Não deve existir suíte que só passa quando executada em determinada sequência.

### 21.1.4 Produção não é ambiente de descoberta de migration

Toda migration deve ser exercitada previamente em:

- banco vazio;
- cópia representativa do schema atual;
- base com dados legados;
- cenário parcialmente migrado;
- cenário de rollback lógico.

### 21.1.5 Nenhum rollout sem observabilidade

Uma feature flag só pode ser ativada quando existirem métricas e logs capazes de identificar:

- erros;
- divergências;
- lentidão;
- filas acumuladas;
- eventos não processados;
- falhas de reconciliação.

### 21.1.6 Rollback deve ser testado

Rollback não pode existir apenas como parágrafo de documentação.

O procedimento deve ser executado em ambiente de homologação com dados representativos.

### 21.1.7 Operações críticas devem ser determinísticas

Reconciliação, cálculo de cobertura e construção dos read models devem produzir o mesmo resultado quando executados repetidamente sobre o mesmo conjunto de fatos.

### 21.1.8 Métricas derivadas não substituem integridade

Uma dashboard mostrando “100% de cobertura” não prova correção. A origem das quantidades e as invariantes transacionais continuam sendo a fonte de verificação.

---

## 21.2 Pirâmide de testes do domínio

A estratégia deverá combinar diferentes níveis. Nenhum nível isolado cobre o risco completo.

```text
                 E2E crítico
              Integração entre módulos
           RPCs, banco, RLS e eventos
        Services, Policies e Repositories
     Cálculos puros, schemas e invariantes
```

Distribuição inicial recomendada por esforço de suíte:

| Nível | Objetivo | Característica |
|---|---|---|
| Unitário | validar regras puras rapidamente | maior volume, execução muito rápida |
| Banco/RPC | validar atomicidade e integridade | banco real, sem mocks de SQL |
| Integração | validar contratos entre camadas | Services + gateways + banco |
| Contrato | impedir quebra entre módulos e versões | payloads e DTOs versionados |
| E2E | provar jornadas críticas | menor volume, alto valor |
| Migração | provar transição e recuperação | dados legados representativos |
| Performance | medir capacidade e regressões | volumes e concorrência controlados |
| Segurança | provar isolamento e autorização | atores, escopos e RLS reais |

Os testes unitários devem ser numerosos, mas nenhuma operação crítica será considerada coberta apenas por testes unitários.

---

## 21.3 Ambientes de teste

### 21.3.1 Ambiente unitário

Destinado a:

- cálculos puros;
- schemas Zod;
- Policies;
- mapeadores;
- construção de chaves de idempotência;
- classificação de estados;
- comparadores semânticos V1/V2.

Não depende de rede ou banco.

### 21.3.2 Banco efêmero de integração

Cada pipeline de CI deverá ser capaz de iniciar um PostgreSQL/Supabase limpo, aplicar todas as migrations e executar:

- testes de constraints;
- testes de RPCs;
- testes de RLS;
- testes de triggers;
- testes de concorrência;
- testes do outbox.

### 21.3.3 Homologação persistente

Ambiente para:

- E2E;
- smoke tests;
- testes manuais guiados;
- feature flags;
- backfills completos;
- testes de volume;
- ensaio de rollback;
- validação por usuários-chave.

### 21.3.4 Snapshot anonimizado

Quando houver necessidade de testar com distribuição realista, utilizar snapshot anonimizado ou massa sintética equivalente.

Dados sensíveis não podem ser copiados de produção sem anonimização.

### 21.3.5 Produção

Em produção serão permitidos somente:

- synthetic checks seguros e somente leitura;
- canários controlados;
- shadow comparison;
- reconciliação em `dry-run`;
- smoke tests não destrutivos;
- métricas e alertas.

Testes destrutivos nunca serão executados contra dados reais.

---

## 21.4 Estratégia de massas de dados

A suíte deve possuir factories e builders determinísticos.

### 21.4.1 Entidades mínimas

Factories obrigatórias:

- empresa;
- usuário e ator técnico;
- obra;
- pacote;
- revisão;
- tipologia;
- item de catálogo;
- contexto de Compras;
- lista de materiais;
- necessidade;
- solicitação e item;
- pedido e item;
- recebimento e item;
- alocações;
- evento e entrega de consumidor.

### 21.4.2 Cenários canônicos

A massa padrão deve cobrir:

1. pacote sem necessidade;
2. pacote com uma necessidade simples;
3. pacote com várias unidades compatíveis;
4. pedido atendendo um pacote;
5. pedido atendendo vários pacotes;
6. necessidade atendida por vários pedidos;
7. recebimento parcial;
8. recebimento multipacote;
9. revisão com aumento;
10. revisão com redução;
11. substituição de material;
12. pedido cancelado;
13. recebimento estornado;
14. excesso por embalagem mínima;
15. item livre fora do catálogo;
16. pacote legado com confiança baixa;
17. evento duplicado;
18. evento fora de ordem;
19. lock concorrente;
20. consumidor em dead letter.

### 21.4.3 Sementes reproduzíveis

Testes aleatórios e property-based devem registrar a seed usada. Qualquer falha precisa ser reproduzível localmente.

### 21.4.4 Volumes de referência

A massa de performance deverá possuir ao menos três perfis:

| Perfil | Finalidade | Exemplo de escala inicial |
|---|---|---|
| Pequeno | desenvolvimento local | dezenas de pacotes e centenas de itens |
| Realista | homologação | centenas de pacotes e dezenas de milhares de fatos |
| Estresse | descobrir limites | milhares de pacotes e centenas de milhares de fatos |

Os números finais devem ser calibrados com telemetria real. Esses perfis são categorias, não limites fixos do produto.

---

## 21.5 Testes unitários e de domínio

### 21.5.1 Cálculo de quantidades

Testar isoladamente:

- quantidade necessária;
- quantidade solicitada;
- quantidade pedida;
- quantidade recebida;
- quantidade cancelada;
- quantidade estornada;
- quantidade faltante;
- excesso;
- tolerância;
- conversão de unidade permitida.

### 21.5.2 Classificação de estados

Para cada combinação relevante, validar os estados calculados:

```text
SEM_NECESSIDADES
LISTA_EM_ELABORACAO
AGUARDANDO_LIBERACAO
PENDENTE_DE_COMPRA
COMPRA_PARCIAL
PEDIDOS_EMITIDOS
RECEBIMENTO_PARCIAL
MATERIAL_DISPONIVEL
BLOQUEADO
```

A precedência definida na Parte IV deve ser testada explicitamente.

### 21.5.3 Portões e recomendações

Testar:

- `liberado_compras` como portão institucional;
- recomendação de liberação para Produção;
- materiais bloqueantes por etapa;
- impacto de override autorizado;
- revisão posterior à liberação;
- pacote suspenso ou cancelado.

### 21.5.4 Policies

Cada Policy deve possuir tabela de casos positivos e negativos:

- ator com permissão e escopo correto;
- ator com permissão sem escopo;
- ator sem permissão;
- módulo não participante;
- pacote em estado incompatível;
- operação bloqueada por portão;
- ator técnico autorizado;
- ator técnico com finalidade incorreta.

### 21.5.5 Schemas e DTOs

Testar:

- payload válido;
- campos ausentes;
- UUID inválido;
- enum desconhecido;
- quantidade negativa;
- decimal com precisão excedida;
- versão de contrato incompatível;
- retorno SQL inválido.

---

## 21.6 Testes de propriedade

Testes property-based são obrigatórios para as regras quantitativas mais sensíveis.

### 21.6.1 Conservação de quantidade no pedido

Para qualquer conjunto válido de alocações:

```text
0 <= soma_alocada_pedido <= quantidade_pedida_ativa
```

Cancelamentos e estornos devem reduzir a base correspondente antes do cálculo.

### 21.6.2 Conservação de quantidade no recebimento

```text
0 <= soma_alocada_recebimento <= quantidade_recebida_confirmada
```

### 21.6.3 Necessidade nunca possui falta negativa

```text
quantidade_faltante = max(0, quantidade_necessaria_ativa - quantidade_atendida)
```

### 21.6.4 Repetição idempotente

Executar o mesmo comando com a mesma chave deve produzir:

- a mesma identidade lógica;
- nenhum registro duplicado;
- nenhum evento duplicado semanticamente;
- nenhuma soma adicional.

### 21.6.5 Reconciliação determinística

Para o mesmo snapshot de fatos:

```text
reconcile(snapshot) = reconcile(snapshot)
```

Executar duas vezes não deve gerar uma segunda correção.

### 21.6.6 Comparação V1/V2

O comparador semântico deve considerar tolerâncias e diferenças conhecidas, sem marcar divergência por ordenação ou formatação irrelevante.

---

## 21.7 Testes do banco e das RPCs

### 21.7.1 Migrations em banco vazio

O pipeline deve:

1. criar banco vazio;
2. aplicar todas as migrations na ordem;
3. validar schema esperado;
4. executar smoke tests de RPCs;
5. verificar que não existem objetos órfãos.

### 21.7.2 Migrations sobre legado

Aplicar migrations em base que contenha:

- registros antigos;
- campos nulos;
- pacotes incompletos;
- documentos com `lote_id` de cabeçalho;
- tabelas Board previamente criadas;
- eventos pendentes.

### 21.7.3 Constraints

Testar tentativa de violar:

- `NOT NULL`;
- `CHECK` de status;
- quantidade positiva;
- unicidade de contexto por pacote;
- unicidade das chaves de idempotência;
- FKs;
- exclusões proibidas;
- relacionamento entre alocações.

### 21.7.4 Atomicidade

Induzir falha em pontos intermediários da RPC e comprovar rollback de:

- mutação principal;
- auditoria;
- outbox;
- registro de idempotência;
- alocações filhas.

Nenhuma parte pode permanecer gravada isoladamente.

### 21.7.5 Locks

Executar transações concorrentes sobre:

- mesmo item de pedido;
- mesma necessidade;
- mesmo recebimento;
- mesma revisão;
- mesmo contexto de Compras.

A soma final deve respeitar as invariantes, independentemente da ordem de conclusão.

### 21.7.6 RPCs SECURITY DEFINER

Para cada RPC:

- `search_path` fixo;
- permissões explícitas;
- sem SQL injection por identificador dinâmico;
- ator derivado de contexto seguro;
- validação de escopo;
- retorno padronizado;
- nenhuma exposição acidental de dados de outro tenant.

---

## 21.8 Testes de integração

### 21.8.1 Ativação de pacote

Fluxo:

```text
Pacote ativo no Wise
+ Frame participante
→ contexto de Compras criado uma única vez
```

Validar evento e reconciliação idempotente.

### 21.8.2 Lista liberada

```text
Lista rascunho
→ liberação
→ necessidades ativas
→ evento correspondente
→ read model atualizado
```

### 21.8.3 Solicitação até pedido

Validar preservação da rastreabilidade:

```text
necessidade
→ alocação da solicitação
→ alocação do pedido
```

### 21.8.4 Pedido até recebimento

Validar que recebimento não é atribuído implicitamente a um pacote quando o item é multipacote.

### 21.8.5 Revisão

Validar:

- diferença entre revisões;
- manutenção do histórico;
- necessidade complementar;
- excesso potencial;
- ausência de alteração retroativa da lista liberada.

### 21.8.6 Eventos

Validar:

- publicação na mesma transação;
- entrega ao menos uma vez;
- deduplicação no consumidor;
- retry;
- dead letter;
- replay controlado;
- reconciliação quando evento não chega.

---

## 21.9 Testes de contrato

### 21.9.1 Contratos públicos entre módulos

Cada contrato público deve possuir fixtures versionadas e testes do produtor e consumidor.

Exemplos:

- `WiseWorkPackageSummaryV1`;
- `FramePackageProcurementSummaryV1`;
- `MaterialNeedReadModelV1`;
- envelopes de `wise.work_package.*`;
- envelopes de `frame.material_need.*`.

### 21.9.2 Compatibilidade V1/V2

Durante a migração, testar:

- shape antigo ainda aceito pelo adapter;
- novo shape exposto aos consumidores V2;
- campos opcionais e defaults;
- enum desconhecido tratado explicitamente;
- remoção de campo proibida sem nova versão.

### 21.9.3 Consumer-driven contracts

Consumidores críticos devem declarar o subconjunto de dados que utilizam. Uma mudança só pode avançar quando todos os contratos consumidores continuarem válidos.

---

## 21.10 Testes de segurança

### 21.10.1 Matriz de atores

Testar ao menos:

- usuário sem sessão;
- usuário autenticado sem vínculo;
- usuário da empresa correta;
- usuário de outra empresa;
- responsável do pacote;
- comprador;
- gestor;
- administrador;
- ator técnico de eventos;
- service role em job autorizado.

### 21.10.2 RLS

Cada tabela nova deve possuir testes explícitos de:

- `SELECT` permitido;
- `SELECT` negado;
- `INSERT` permitido;
- `INSERT` negado;
- `UPDATE` permitido;
- `UPDATE` negado;
- isolamento cross-tenant;
- comportamento de registros legados sem escopo completo.

### 21.10.3 Permissões de domínio

Testar cada chave listada na Parte V, incluindo combinações de:

```text
permissão + escopo + estado + portão + módulo participante
```

### 21.10.4 Overrides

Nenhum override poderá ocorrer sem:

- permissão específica;
- justificativa não vazia;
- auditoria;
- identificação do ator;
- estado compatível.

### 21.10.5 Vazamento em logs

Testes automatizados devem impedir logs contendo:

- tokens;
- secrets;
- payloads completos sensíveis;
- dados pessoais desnecessários;
- connection strings.

---

## 21.11 Testes end-to-end

A suíte E2E deve ser pequena e focada nas jornadas de maior risco.

### 21.11.1 Jornada principal

```text
Criar obra
→ criar pacote
→ definir escopo
→ ativar Frame
→ criar contexto de Compras
→ criar revisão
→ elaborar lista
→ liberar lista
→ criar solicitação
→ aprovar solicitação
→ criar pedido
→ emitir pedido
→ receber parcialmente
→ alocar recebimento
→ verificar cobertura
→ receber saldo
→ verificar recomendação de liberação
```

### 21.11.2 Pedido multipacote

```text
1 item de pedido
→ 2 necessidades
→ 2 pacotes
→ recebimento parcial
→ alocação explícita
→ coberturas independentes corretas
```

### 21.11.3 Revisão após compra

```text
Revisão 1 liberada
→ compra parcial
→ Revisão 2 aumenta quantidade
→ necessidade complementar
→ histórico preservado
```

E o cenário inverso:

```text
Revisão 2 reduz quantidade
→ excesso potencial identificado
→ pedido histórico não alterado
```

### 21.11.4 Falha e retomada

Interromper consumidor, produzir eventos, reativá-lo e comprovar processamento sem duplicação.

### 21.11.5 Permissão negada

A UI deve exibir estado adequado, e o backend deve negar a operação mesmo se a Action for chamada diretamente.

---

## 21.12 Testes de migrations, backfills e rollout

### 21.12.1 Teste de schema

Validar:

- todas as migrations aplicam;
- migrations são ordenadas;
- não existem objetos duplicados;
- migrations de formalização do Board não alteram comportamento;
- `db diff` não apresenta surpresa não documentada.

### 21.12.2 Teste de backfill

Cada backfill deve ser testado para:

- execução inicial;
- reexecução;
- interrupção;
- retomada;
- paginação;
- registro de progresso;
- fingerprint alterado;
- issue de confiança baixa;
- `dry-run`;
- ausência de efeitos colaterais externos.

### 21.12.3 Shadow comparison

Para registros elegíveis:

- executar leitura V1;
- executar leitura V2;
- normalizar semanticamente;
- comparar;
- registrar divergência;
- classificar severidade.

### 21.12.4 Rollback de leitura

Com V2 habilitado em coorte:

1. capturar baseline;
2. mudar para `V2_WITH_LEGACY_FALLBACK`;
3. simular falha;
4. retornar a `LEGACY_ONLY` ou fallback;
5. confirmar continuidade operacional;
6. preservar dados escritos no caminho canônico.

### 21.12.5 Rollback de escrita

Só pode ser testado quando a estratégia do bloco correspondente estiver documentada. Não significa desfazer fatos válidos; significa interromper o novo writer e restaurar um adapter compatível sem corromper a fonte canônica.

---

## 21.13 Testes de recuperação e resiliência

### 21.13.1 Falhas obrigatórias a simular

- timeout de RPC;
- conexão interrompida após commit;
- conexão interrompida antes do commit;
- evento duplicado;
- evento não entregue;
- consumidor indisponível;
- lease expirado;
- dead letter acumulando;
- lock timeout;
- job de backfill interrompido;
- cache desatualizado;
- serviço externo indisponível;
- falha de deploy após migration expand.

### 21.13.2 Resultado esperado

Para cada falha deve estar documentado:

- impacto percebido;
- se há retry automático;
- se é seguro repetir;
- como reconciliar;
- como alertar;
- quem é responsável;
- qual evidência confirma recuperação.

### 21.13.3 Recovery Point Objective

Para o banco transacional, a meta de RPO deve ser definida pela estratégia de backup do ambiente. Arquiteturalmente, nenhuma integração assíncrona pode exigir perda de fato já confirmado no banco.

### 21.13.4 Recovery Time Objective

Deve existir RTO por categoria:

| Categoria | Exemplo | Expectativa arquitetural |
|---|---|---|
| Interação síncrona | criar alocação | recuperação imediata por retry seguro ou mensagem clara |
| Consumer assíncrono | criar contexto derivado | recuperar por retry/reconciliação |
| Read model | visão consolidada | reconstruível a partir das fontes |
| Backfill | migração em lote | retomável pelo último checkpoint |
| Incidente de rollout | regressão V2 | reversão de flag/coorte sem perda de dados |

Os tempos exatos devem ser acordados antes do go-live com base na criticidade operacional.

---

## 21.14 Estratégia de performance

### 21.14.1 Princípios

- medir p50, p95 e p99;
- separar latência do banco, aplicação e rede;
- avaliar consultas frias e quentes;
- medir concorrência, não apenas execução serial;
- testar com distribuição realista;
- regressão de performance deve falhar o gate quando exceder tolerância definida.

### 21.14.2 SLOs iniciais de experiência

Metas iniciais para homologação, sujeitas a calibração com infraestrutura real:

| Operação | SLO inicial p95 |
|---|---:|
| Abrir resumo do pacote | até 800 ms no backend/read model |
| Abrir lista de necessidades paginada | até 800 ms |
| Buscar Catálogo Mestre | até 500 ms |
| Criar/editar item em rascunho | até 1 s |
| Liberar lista transacionalmente | até 2 s |
| Criar alocação de pedido | até 1,5 s |
| Confirmar alocação de recebimento | até 1,5 s |
| Recalcular cobertura de um pacote | até 1 s |
| Reconciliar um pacote em dry-run | até 3 s |

Esses valores são metas de produto, não garantia de rede do usuário. A UI deve continuar exibindo feedback apropriado quando a operação demorar mais.

### 21.14.3 SLOs operacionais

| Indicador | Meta inicial |
|---|---:|
| Disponibilidade das operações críticas | 99,5% mensal na fase inicial |
| Taxa de erro de RPC crítica | < 1% em janela de 15 min |
| Eventos processados sem DLQ | >= 99,9% |
| Lag p95 de eventos não urgentes | < 60 s |
| Reconciliação sem divergência crítica | 100% antes de promover coorte |
| Backfill com erro não classificado | 0 |

Os SLOs devem ser revisados conforme o produto amadurecer.

### 21.14.4 Consultas a medir

- resumo consolidado do pacote;
- necessidades por pacote;
- busca e filtros;
- diferenças entre revisões;
- somas de alocações;
- cobertura por necessidade;
- cobertura agregada por grupo de unidade;
- timeline;
- fila de eventos;
- fila de migration issues;
- reconciliação.

### 21.14.5 Índices mínimos a validar

Os índices exatos deverão acompanhar os planos de consulta reais. No mínimo, avaliar:

- FKs usadas em joins;
- `pacote_id` em contextos, revisões, necessidades e alocações indiretas;
- `necessidade_id` nas alocações;
- `pedido_item_id`;
- `recebimento_item_id`;
- status ativos/parciais usados em filtros;
- `empresa_id` quando aplicável;
- `criado_em` para timeline;
- `idempotency_key`;
- eventos por status e próxima tentativa;
- migration runs/items/issues.

Não criar índices por intuição sem verificar `EXPLAIN (ANALYZE, BUFFERS)` em massa representativa.

### 21.14.6 N+1 e payloads

Read models devem impedir:

- uma consulta por linha;
- carregamento de histórico completo sem paginação;
- payloads de anexos ou descrições extensas em listagens;
- busca de permissões repetida por item;
- reprocessamento integral da obra para recalcular um único pacote.

---

## 21.15 Observabilidade

### 21.15.1 Três pilares

A operação deve combinar:

- logs estruturados;
- métricas;
- traces/correlação.

### 21.15.2 Contexto mínimo de correlação

Quando aplicável, registrar:

```text
correlation_id
request_id
command_id
idempotency_key
event_id
event_type
consumer_name
actor_id
actor_type
empresa_id
obra_id
pacote_id
necessidade_id
pedido_id
recebimento_id
migration_run_id
feature_flag_mode
contract_version
```

Campos inexistentes no contexto não devem ser inventados.

### 21.15.3 Logs estruturados

Cada log deve possuir:

- timestamp UTC;
- nível;
- código do evento de log;
- mensagem curta;
- contexto de correlação;
- duração quando aplicável;
- resultado;
- erro normalizado.

Não registrar payload completo por padrão.

### 21.15.4 Catálogo mínimo de métricas

#### Aplicação

- taxa de comandos por tipo;
- sucesso/erro por Action e Service;
- duração de RPC;
- erros por código;
- timeouts;
- conflitos de concorrência.

#### Domínio

- pacotes ativos;
- contextos de Compras ausentes;
- necessidades ativas;
- necessidades bloqueantes;
- pedidos multipacote;
- recebimentos aguardando alocação;
- divergências de cobertura;
- overrides ativos.

#### Eventos

- eventos publicados;
- eventos pendentes;
- lag;
- retries;
- dead letters;
- deduplicações;
- replays.

#### Migração

- itens processados;
- itens pendentes;
- itens bloqueados;
- issues por severidade;
- divergências shadow;
- throughput do backfill;
- tempo restante estimado apenas como métrica interna, nunca como promessa ao usuário.

#### Banco

- conexões;
- locks;
- lock waits;
- deadlocks;
- queries lentas;
- cache hit ratio;
- crescimento de tabelas e índices.

### 21.15.5 Dashboards mínimos

1. **Saúde do domínio de Compras**
   - comandos, erros, latência, bloqueios, recebimentos pendentes.

2. **Eventos e consumers**
   - lag, retries, DLQ, throughput e consumidor.

3. **Migração e rollout**
   - coortes, modos, divergências, backfill e issues.

4. **Banco e performance**
   - RPCs lentas, locks, conexões e crescimento.

5. **Segurança**
   - acessos negados, overrides, uso de service role e tentativas cross-tenant.

---

## 21.16 Alertas

### 21.16.1 Severidades

| Severidade | Significado | Resposta esperada |
|---|---|---|
| P1 | risco de perda, corrupção ou vazamento | interromper rollout e atuar imediatamente |
| P2 | operação crítica indisponível ou divergência relevante | atuar com prioridade e considerar rollback de flag |
| P3 | degradação ou fila crescente sem impacto imediato | investigar dentro da janela operacional |
| P4 | tendência ou manutenção preventiva | acompanhar e planejar correção |

### 21.16.2 Alertas obrigatórios

- falha repetida de RPC crítica;
- divergência crítica na reconciliação;
- dead letter nova;
- lag de eventos acima do threshold;
- consumer sem heartbeat;
- lock wait anormal;
- deadlock;
- backfill sem progresso;
- migration issue crítica;
- shadow divergence acima do permitido;
- tentativa cross-tenant;
- uso de override acima do padrão;
- uso inesperado de service role;
- aumento abrupto de latência;
- erro de contrato ou payload inválido;
- ausência de contexto de Compras em pacote elegível.

### 21.16.3 Alertas acionáveis

Todo alerta deve conter:

- o que falhou;
- escopo afetado;
- quando começou;
- métrica atual e threshold;
- correlação ou IDs relevantes;
- runbook associado;
- responsável primário.

Alertas sem ação conhecida devem ser removidos ou transformados em métricas de acompanhamento.

---

## 21.17 Runbooks operacionais

Devem existir runbooks versionados para:

1. RPC crítica com alta taxa de erro;
2. evento preso em retry;
3. dead letter;
4. contexto de Compras ausente;
5. divergência de cobertura;
6. recebimento sem alocação;
7. backfill interrompido;
8. fingerprint alterado durante migração;
9. rollback de feature flag;
10. falha de migration expand;
11. lock/deadlock recorrente;
12. suspeita de vazamento cross-tenant;
13. restauração de read model;
14. reconciliação em lote.

Cada runbook deverá informar:

- sinais;
- impacto;
- diagnóstico;
- ação segura;
- ações proibidas;
- validação pós-correção;
- necessidade ou não de auditoria.

---

## 21.18 Critérios de rollout por coorte

### 21.18.1 Estados de decisão

Cada coorte deverá estar em um destes estados:

```text
NAO_ELEGIVEL
PRONTA_PARA_SHADOW
SHADOW_EM_VALIDACAO
PRONTA_PARA_LEITURA_V2
PRONTA_PARA_ESCRITA_V2
ESTABILIZACAO
V2_ONLY
BLOQUEADA
ROLLBACK
```

### 21.18.2 Gate para iniciar shadow

Exigir:

- migrations aplicadas;
- backfill básico concluído;
- nenhuma issue crítica aberta;
- contratos implantados;
- observabilidade ativa;
- reconciliação executável;
- rollback de leitura testado.

### 21.18.3 Gate para leitura V2

Exigir janela mínima definida de shadow com:

- zero divergência crítica;
- divergências médias classificadas;
- latência dentro do SLO;
- taxa de erro dentro do threshold;
- read model reconciliável;
- suporte e usuários-chave informados.

### 21.18.4 Gate para escrita V2

Exigir:

- RPCs críticas aprovadas em teste de concorrência;
- idempotência aprovada;
- rollback/adapters validados;
- auditoria e outbox atômicos;
- segurança e RLS aprovadas;
- E2E das jornadas críticas aprovado;
- backfill não concorrente ou protegido;
- plano de resposta a incidente ativo.

### 21.18.5 Gate para V2_ONLY

Exigir:

- nenhuma gravação legada no período acordado;
- fallback não utilizado;
- zero divergência crítica;
- reconciliação 100% limpa ou com exceções formalmente aceitas;
- relatórios e integrações migrados;
- rollback de flag testado;
- aprovação formal de produto, engenharia e operação.

### 21.18.6 Critérios de no-go imediato

Qualquer um dos itens abaixo bloqueia promoção:

- perda ou duplicação de quantidade;
- inconsistência não reconciliável;
- falha cross-tenant;
- RPC sem atomicidade;
- rollback não testado;
- evento crítico sem idempotência;
- issue crítica de migration aberta;
- ausência de observabilidade do novo caminho;
- divergência crítica V1/V2;
- latência incompatível com operação;
- dependência de correção manual não documentada.

---

## 21.19 Checklist de go-live

### Banco e migrations

- [ ] Todas as migrations aplicam em banco vazio.
- [ ] Todas as migrations aplicam sobre snapshot legado.
- [ ] `db diff` foi revisado.
- [ ] Constraints críticas possuem testes.
- [ ] Índices foram validados com planos reais.
- [ ] Não existem tabelas ativas fora do histórico oficial sem documentação.
- [ ] Backup e restauração foram testados.

### Domínio e backend

- [ ] Invariantes quantitativas estão cobertas.
- [ ] RPCs críticas são atômicas.
- [ ] Idempotência foi validada.
- [ ] Concorrência foi testada.
- [ ] Auditoria e outbox participam da transação.
- [ ] Erros possuem códigos estáveis.
- [ ] Reconciliação é determinística.

### Segurança

- [ ] RLS foi testada por tabela e operação.
- [ ] Permissões foram testadas por matriz de atores.
- [ ] Acesso cross-tenant foi negado nos testes.
- [ ] Service role está restrita aos jobs necessários.
- [ ] Overrides exigem permissão e justificativa.
- [ ] Logs não vazam secrets ou dados desnecessários.

### Eventos

- [ ] Consumers são idempotentes.
- [ ] Retry e lease foram testados.
- [ ] DLQ possui runbook.
- [ ] Replay foi testado.
- [ ] Lag possui métrica e alerta.
- [ ] Evento perdido é recuperável por reconciliação.

### Migração

- [ ] Backfill pode ser retomado.
- [ ] Dry-run foi executado.
- [ ] Fingerprints foram validados.
- [ ] Issues críticas estão zeradas.
- [ ] Shadow comparison está dentro dos thresholds.
- [ ] Feature flags e coortes estão configuradas.
- [ ] Rollback de leitura e de flag foi ensaiado.

### UI/UX

- [ ] Wise apresenta visão institucional sem editar domínio alheio.
- [ ] Frame apresenta workspace operacional.
- [ ] Estados calculados não são editáveis.
- [ ] Casos vazios, loading, erro e sem permissão estão implementados.
- [ ] Fluxos multipacote são compreensíveis.
- [ ] Responsividade e teclado foram testados.
- [ ] Acessibilidade básica foi validada.

### Operação

- [ ] Dashboards estão disponíveis.
- [ ] Alertas estão ativos e acionáveis.
- [ ] Runbooks estão publicados.
- [ ] Responsáveis de plantão estão definidos.
- [ ] Usuários-chave foram orientados.
- [ ] Janela de rollout foi definida.
- [ ] Plano de comunicação e suporte está pronto.

---

## 21.20 Matriz de casos críticos

| Caso | Evidência obrigatória | Resultado esperado |
|---|---|---|
| Pedido dividido entre dois pacotes | teste de integração + banco | somas corretas e independentes |
| Recebimento parcial multipacote | E2E | nenhuma alocação implícita indevida |
| Mesma idempotency key repetida | teste de RPC | um único efeito lógico |
| Duas alocações concorrentes | teste de concorrência | invariant preservada |
| Revisão aumenta quantidade | integração | necessidade complementar rastreável |
| Revisão reduz quantidade | integração | excesso potencial sem apagar histórico |
| Pedido cancelado | integração | cobertura recalculada |
| Recebimento estornado | integração | cobertura reduzida e auditada |
| Evento duplicado | consumer test | nenhum efeito duplicado |
| Evento não entregue | reconciliação | estado derivado restaurado |
| Consumer fora do ar | resiliência | retry e retomada |
| DLQ | operação | alerta e runbook executável |
| Usuário de outra empresa | segurança | acesso negado |
| Override sem justificativa | segurança | operação negada |
| Backfill interrompido | migração | retomada no checkpoint |
| Fingerprint alterado | migração | item bloqueado para revisão |
| Divergência V1/V2 crítica | rollout | promoção bloqueada |
| Falha após migration expand | recuperação | app antigo continua funcional |
| Cache stale | integração/UI | revalidação sem perda de consistência |
| Read model corrompido | recuperação | reconstrução a partir das fontes |

---

## 21.21 Critérios finais de aceite da Etapa 9

A Etapa 9 é considerada concluída arquiteturalmente quando:

- princípios de qualidade estão explícitos;
- pirâmide de testes está definida;
- ambientes e massas de teste estão definidos;
- cálculos, estados e Policies possuem estratégia unitária;
- invariantes quantitativas possuem testes de propriedade;
- migrations são testadas em banco vazio e legado;
- constraints, atomicidade, locks e RPCs possuem estratégia de teste;
- integrações críticas estão cobertas;
- contratos públicos são versionados e testáveis;
- RLS, permissões, service role e overrides possuem matriz de segurança;
- jornadas E2E críticas estão identificadas;
- backfill, shadow, feature flags e rollback possuem testes;
- falhas e recuperação possuem cenários obrigatórios;
- SLOs iniciais de experiência e operação estão definidos;
- consultas e índices críticos estão identificados;
- logs, métricas, correlação e dashboards estão definidos;
- alertas possuem severidade e ação;
- runbooks mínimos estão listados;
- gates de shadow, leitura V2, escrita V2 e V2_ONLY estão definidos;
- critérios objetivos de no-go estão registrados;
- checklist de go-live está completo;
- matriz de casos críticos está definida;
- nenhuma promoção de coorte depende apenas de avaliação subjetiva;
- nenhuma implementação da Etapa 10 é iniciada sem respeitar estes gates.

---

## 21.22 Entregáveis de implementação derivados desta parte

Quando esta arquitetura for transformada em código, deverão ser produzidos:

1. suíte de testes unitários do domínio;
2. suíte de property-based tests;
3. harness de banco efêmero;
4. testes automatizados de migrations;
5. testes de RPCs e concorrência;
6. matriz automatizada de RLS e permissões;
7. testes de contrato;
8. E2E das jornadas críticas;
9. scripts de carga e performance;
10. dashboards de aplicação, eventos, migração e banco;
11. regras de alerta;
12. runbooks;
13. relatório de shadow comparison;
14. relatório de reconciliação por coorte;
15. checklist de go-live assinado;
16. relatório de pós-rollout.

---

## 21.23 Encaminhamentos para a Etapa 10

A Etapa 10 deverá aplicar as fundações, contratos e quality gates deste documento à expansão operacional para:

- SquadStock;
- contexto de abastecimento;
- disponibilidade, reserva, separação e consumo;
- SquadFlow;
- contexto produtivo;
- Ordens de Produção;
- lotes de fabricação;
- etapas, apontamentos e bloqueios;
- prontidão integrada por etapa;
- relação entre materiais, OPs e pacote;
- projeções consolidadas no Wise e no Board;
- roadmap final de implementação.

# Parte X — Expansão operacional

## 22. Etapa 10 — SquadStock, SquadFlow e Ordens de Produção

**Estado:** Pendente. Esta é a única seção correspondente à Etapa 10 do plano de construção. Seu conteúdo será desenvolvido após validação formal das Partes 1 a 9.

**Escopo reservado:**

- contexto de abastecimento do pacote no SquadStock;
- disponibilidade, reserva, separação, transferência, consumo, devolução e sobras;
- contexto produtivo do pacote no SquadFlow;
- prontidão produtiva por etapa;
- Ordens de Produção e seus itens;
- lotes de fabricação;
- roteiros, operações e apontamentos;
- bloqueios, pausas, retrabalho e qualidade;
- integração entre necessidades, recebimentos, estoque, reservas, OPs e consumo;
- projeções consolidadas no SquadWise e no SquadBoard;
- estratégia de implementação, migração, testes e go-live dessa expansão.
