# Inventário funcional

## Critério

Status baseado em rota + UI + ação/repositório + persistência quando encontrados. “Funcional” significa fluxo codificado, não homologação. Nenhum item é classificado como pronto para produção sem testes/monitoramento.

## SquadFrame — obras e operação

| Funcionalidade | Beneficiário / problema | Evidência | Status/completude | Dependências, riscos e valor |
|---|---|---|---|---|
| Obras | Gestor centraliza cadastro, status e contexto | `app/squadframe/obras`, `modules/squadframe/actions/obras` | Funcional, 80% | Supabase/RBAC; alto valor de rastreabilidade |
| Workspace de obra | Equipe reúne dashboard, tarefas, compras, financeiro e timeline | `components/obras/*-tab.tsx` | Funcional, 75% | Componentes grandes; alto valor gerencial |
| Lotes/tipologias | Engenharia estrutura entregáveis da obra | `modules/wise/works`, migrations `20260716*` | MVP funcional, 65% | Coexistência Frame/Wise; valor setorial alto |
| Pacotes de trabalho | Planejamento agrupa execução e pipelines | `wise/work-packages`, `lotes_obra`, `pacote_pipeline_status` | MVP, 60% | Contextos Stock/Flow incompletos |
| Tarefas/Kanban | Usuários controlam trabalho e responsáveis | `actions/tarefas/actions.ts`, `components/kanban` | Funcional, 80% | Arquivo de ação com 1.083 linhas; realtime |
| Documentos/assinatura | Compras/gestão geram e assinam documentos | `app/api/assinatura`, `components/documentos`, `assinar-modal.tsx` | MVP funcional, 65% | Validade jurídica/processo de assinatura não comprovados |
| Busca global | Usuário localiza registros | `app/api/busca`, `busca-global.tsx` | Funcional, 70% | Escalabilidade depende de volume/índices |

## Compras e suprimentos

| Funcionalidade | Beneficiário / problema | Evidência | Status/completude | Dependências, riscos e valor |
|---|---|---|---|---|
| Solicitações | Solicitante formaliza necessidade antes da compra | `compras/solicitacoes`, RPCs `criar_solicitacao` | Funcional, 80% | Permissões/RPC; reduz pedido informal |
| Pedidos | Comprador cria, edita, visualiza e acompanha | `compras/pedidos/**`, `actions/compras/pedidos.ts` | Funcional, 85% | Fluxo crítico sem testes; valor muito alto |
| Aprovações/retorno | Gestor aprova ou devolve pedido | páginas `retornar`, `devolver`, state machine | Funcional, 75% | Regras complexas; exige matriz de aprovação validada |
| Fornecedores | Compras mantém cadastro e vínculos de catálogo | `fornecedores-lista.tsx`, ações | Funcional, 80% | Qualidade/deduplicação de dados |
| Recebimentos | Almoxarifado registra parcial/total e saldo | páginas `receber`, `recebimentos.ts` | Funcional, 80% | Integra Stock; concorrência precisa testes |
| Devoluções | Compras registra retorno de material | `devolucao.ts`, `devolucoes-lista.tsx` | MVP funcional, 70% | Realtime e financeiro associados |
| Beneficiamento | Compras controla serviços externos | `beneficiamento/**`, migration `20260730000001` | MVP funcional, 65% | Fluxo recente; homologação necessária |
| Romaneios/entregas | Logística registra transporte/entrega | `novo-romaneio-cliente.tsx`, `entregas/**` | MVP funcional, 65% | PDF e recebimento; risco operacional |
| Pendências | Sistema bloqueia/avisa inconsistências | `services/pendencias`, `pendencias-gate.tsx` | Em desenvolvimento, 55% | Implementação recente; alto valor preventivo |
| Cobrança de prazos | Automatiza lembretes de pedidos/solicitações | cron `cobranca-prazos`, Twilio | MVP funcional, 65% | Template/WhatsApp e custo externo |
| Relatório diário | Gestor recebe resumo de Compras | cron `relatorio-diario`, serviço correspondente | MVP funcional, 65% | Dependência Twilio e dados de produção |

## Financeiro

| Funcionalidade | Evidência | Status | Valor/risco |
|---|---|---|---|
| Carteiras por obra/fornecedor | `financeiro/carteiras`, `carteira-ajustes.ts` | Funcional, 75% | Controle de adiantamentos; cálculos exigem reconciliação |
| Contratos | `financeiro/contratos/**`, migrations `20260728000005-08` | MVP funcional, 65% | Fluxo recente e sem testes |
| Faturamento direto | `faturamento-direto-content.tsx`, migration específica | MVP, 60% | Regras fiscais não auditadas |
| Dashboards/gráficos | Recharts em componentes financeiro/cobrança | Funcional, 70% | Valor gerencial; precisão depende da origem |
| PDF/relatórios | `services/relatorios`, html2pdf | Funcional, 70% | Layout/impressão precisam homologação |

## SquadStock

| Funcionalidade | Evidência | Status | Valor/risco |
|---|---|---|---|
| Catálogo técnico | `squadstock/catalogo/**`, 35 arquivos no módulo | Funcional, 80% | Grande valor setorial; ação com 1.043 linhas |
| Cores/aliases/fornecedores | abas de catálogo e migrations | Funcional, 75% | Padronização reduz erro de compra |
| Arquivos e preview DXF | `aba-arquivos.tsx`, libs DXF/Sharp | MVP funcional, 65% | Processamento pesado e arquivos não testados |
| Locais/saldos | `squadstock/locais`, migrations stock | MVP funcional, 70% | Integridade concorrente é crítica |
| Movimentações | `movimentacoes/**`, actions | MVP funcional, 70% | Rastreabilidade; exige inventário físico |
| Recebimento integrado | `squadstock/recebimento/**` | MVP funcional, 70% | Acoplado a pedidos de compras |
| Atualização preço/kg | cron `preco-kg-perfis` | MVP, 60% | Regra agendada; monitoramento ausente |

## SquadBoard

| Funcionalidade | Evidência | Status | Valor/risco |
|---|---|---|---|
| Quadro operacional | `squad-board-view.tsx`, pipelines, pacotes/pedidos | Funcional, 75% | Visibilidade intersetorial |
| Quadro interno | `components/internal`, 79 arquivos | Funcional, 75% | Schema parcialmente fora de migrations oficiais |
| Cards/checklists/anexos | componentes Kanban e ações `board-content.ts` | Funcional, 70% | Tabelas sem migration oficial documentadas |
| Etiquetas/responsáveis | managers e migrations do módulo | Funcional, 70% | Autorização e consistência precisam revisão |
| Trello | provider completo CRUD/checklist/comentários | MVP funcional, 65% | Token/configuração e limites da API |
| Cache | `actions/cache.ts`, TTL e stale/revalidate | Parcial, 55% | Cache próprio aumenta complexidade |

## SquadWise e governança

| Funcionalidade | Evidência | Status | Valor/risco |
|---|---|---|---|
| Usuários/cargos/setores | rotas protegidas + `wise/identity` | MVP funcional, 65% | Coexiste com tabelas legadas |
| Papéis/permissões | `wise/access`, `wise_fn_tem_permissao` | MVP funcional, 65% | Paridade não coberta por testes automatizados |
| Unidades | `wise/organizations` | MVP funcional, 60% | Sistema hoje é empresa única, conforme docs |
| Auditoria | `wise/audit`, tela `/auditoria` | MVP funcional, 60% | Atomicidade ampla não comprovada |
| Convites/ativação | `/squadwise/ativar`, identity actions | MVP, 60% | E-mail/fluxo operacional não auditado |
| Obras/pacotes Wise | `wise/works`, `work-packages` | Em desenvolvimento, 60% | Migração gradual de fonte de verdade |

## Plataforma

| Funcionalidade | Evidência | Status/limite |
|---|---|---|
| Login/cadastro/reset | rotas públicas e Supabase Auth | Funcional; políticas de senha dependem do Supabase |
| RBAC | `auth.ts`, `permissions.ts`, RPCs | Funcional parcial; service role é fronteira frequente |
| Realtime | `realtime-refresher`, Kanban e publicações | Funcional parcial |
| Push | `web-push.ts`, subscription API | MVP; depende de VAPID/browser |
| PWA/offline | manifest, service worker, banners | Instalável; offline é limitado a cache/fallback |
| Tema/responsividade | ThemeProvider, Tailwind, mobile-nav | Implementado |
| Treinamento | `/treinamento/**` | Conteúdo funcional para Compras/Financeiro |

## Conceitos/estruturas sem produto completo

- `SquadFlow`: 12 arquivos predominantemente scaffold; produção completa/ordens não comprovadas.
- `SquadMeasure`: 7 arquivos de interfaces/scaffold; medição real não comprovada.
- `SquadHub`: 10 arquivos com pastas Bluetooth/MQTT/WebSocket, mas sem evidência de hardware operacional.
- BLE, NFC e hardware: nenhuma implementação funcional comprovada; não vender como entregue.
- Produção: existe aba/contexto/pacotes, mas ordens e chão de fábrica permanecem parciais conforme documentos.

