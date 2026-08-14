# Maturidade por módulo

Percentuais são estimativas técnicas preliminares, não progresso contratual. Critérios: cobertura funcional, persistência, autorização, testes, observabilidade, documentação e deploy.

| Módulo | Estado | Conclusão | Concluído/parcial | Ausente ou pendente | Esforço restante | Prioridade |
|---|---|---:|---|---|---:|---|
| SquadFrame | Funcional | 78% | Obras, compras, tarefas, documentos, financeiro | testes, simplificação, observabilidade, homologação | 300–550 h | Crítica |
| SquadBoard | MVP funcional | 68% | quadros, cards, Trello, pipelines | schema oficial completo, testes, hardening | 180–320 h | Alta |
| SquadStock | MVP funcional | 67% | catálogo, locais, movimentos, recebimento | inventário, reconciliação, testes de concorrência | 220–400 h | Alta |
| SquadWise | Em desenvolvimento | 58% | identity, access, audit, obras/pacotes | migração completa do legado, paridade, governança | 300–550 h | Alta |
| SquadFlow | Arquitetado | 20% | scaffold e visão de produção | ordens, apontamentos, capacidade, qualidade | 500–900 h | Média-alta |
| SquadMeasure | Conceito | 10% | interfaces e estrutura | medição e integração de campo | 300–600 h | Média |
| SquadHub | Conceito | 10% | pastas de providers/protocolos | BLE/MQTT/WebSocket/hardware real | 350–700 h | Baixa até requisito |
| Plataforma/PWA | MVP funcional | 65% | auth, push, PWA, cron, deploy | CI, testes E2E, monitoramento, backup/DR | 250–450 h | Crítica |

## Justificativa

Nenhum módulo recebe “pronto para produção”: foram encontrados zero testes automatizados, nenhuma pipeline CI no repositório, nenhum monitoramento dedicado e nenhum teste de restauração de backup. Frame é o mais completo em código e telas, mas concentra arquivos grandes e regras críticas. Flow/Measure/Hub não podem ser apresentados como produto entregue.

## Dependências entre maturidades

- Frame/Board/Stock dependem de estabilização do modelo de usuários/permissões Wise.
- Flow depende do contrato canônico de pacotes e disponibilidade de materiais.
- Stock depende de recebimentos de Compras e catálogo mestre.
- SaaS depende de decisão arquitetural: documentação afirma empresa única, portanto multi-tenant não está implementado.

