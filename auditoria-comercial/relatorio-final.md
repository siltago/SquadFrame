# Relatório técnico e comercial consolidado — SquadSystem

## 1. Resumo executivo

O SquadSystem é um ativo de software vertical com cobertura relevante da operação de esquadrias. Há produto funcional em obras, compras, Kanban e catálogo/estoque, porém a ausência de testes, CI, monitoramento e backup comprovado impede classificá-lo como pronto para produção. A melhor entrada comercial é um piloto assistido de empresa única.

## 2. O que é o SquadSystem

Plataforma web modular Next.js/Supabase composta por SquadFrame, SquadBoard, SquadStock, SquadWise e conceitos futuros de Flow, Measure e Hub. O hub de produção marca Frame, Board e Stock como ativos (`sgi/modules/home/data/modules.ts`).

## 3. Problemas que resolve

Centraliza informações antes dispersas em planilhas/mensagens; formaliza compras; acompanha obra, tarefas, materiais e finanças; padroniza catálogo; cria rastreabilidade e automações de cobrança/relatório.

## 4. Módulos

| Módulo | Maturidade estimada |
|---|---|
| SquadFrame | Funcional — 78% |
| SquadBoard | MVP funcional — 68% |
| SquadStock | MVP funcional — 67% |
| SquadWise | Em desenvolvimento — 58% |
| SquadFlow | Arquitetado — 20% |
| SquadMeasure / SquadHub | Conceito — 10% cada |

## 5. Funcionalidades

Obras, lotes, tipologias, pacotes, solicitações, pedidos, aprovações, fornecedores, recebimentos, devoluções, beneficiamento, romaneios, carteiras, contratos, tarefas, Kanban, catálogo, cores, aliases, locais, movimentações, Trello, usuários, permissões, auditoria, PWA, push, realtime, XML, DXF e PDF. Produção completa, medição, BLE/NFC e hardware não estão entregues.

## 6. Arquitetura

Monólito modular Next.js com UI React, Server Actions/Route Handlers, PostgreSQL/RPC/RLS no Supabase e providers externos. Acesso administrativo é frequente; Realtime conecta mudanças ao browser. Vercel hospeda e agenda crons. Diagramas completos estão em `arquitetura-sistema.md`.

## 7. Stack

Next.js 14, React 18, TypeScript 5, Tailwind 3, Supabase SSR/JS, PostgreSQL, Vercel, DnD Kit, TipTap, Recharts, Web Push, Sharp, DXF, PDF Parse, html2pdf, Twilio e Trello.

## 8. Tamanho do projeto

715 arquivos analisáveis, 263 pastas, 77.255 linhas e 64.361 linhas úteis estimadas. São 82 páginas, 205 componentes, 7 APIs, 300 exports de Server Actions, 32 serviços, 73 migrations e zero testes automatizados detectados. Método em `inventario-tecnico.md`.

## 9. Histórico de desenvolvimento

189 commits entre 16/06 e 02/08/2026, 34 dias e 7 semanas ativas. Thiago Silva/Thiago respondem por 188 commits (provável identidade única). Julho concentrou 115 commits; semana 27 teve 57. Compras, correções, integrações e UI dominam os assuntos.

## 10. Horas rastreáveis

**Horas rastreáveis pelo histórico Git:** 60,4 h conservadoras, 95,4 h prováveis e 130,2 h ampliadas, calculadas pelas regras de sessão solicitadas. Não equivalem a horas apontadas.

## 11. Dedicação total estimada

**Horas estimadas de dedicação total:** mínimo 90 h, provável 180 h, ampliado 320 h. Incluem aproximação para planejamento, requisitos, arquitetura, pesquisa/prompts, design, revisão, testes manuais e implantação.

## 12. Investimento já realizado

Na taxa de R$ 100/h: R$ 9 mil (mínimo), R$ 18 mil (provável) e R$ 32 mil (ampliado). A matriz de R$ 60–150/h está em `estimativa-custos.md`. Custo não é valor comercial.

## 13. Custos atuais

Supabase, Vercel, Twilio, Trello, domínio/GitHub podem gerar recorrência. Sem contas, planos e volume não existe valor exato auditável. Tiers gratuitos podem atender desenvolvimento, não garantem SLA de produção.

## 14. Custos futuros

Backup, observabilidade, suporte, domínio/e-mail, storage crescente e mensagens WhatsApp precisam entrar na proposta. Preço precisa ser validado comercialmente no momento da proposta.

## 15. Esforço restante

Estimativa técnica preliminar: 160–280 h para MVP interno estável; 400–700 h para homologação; 800–1.400 h para produção; 1.600–2.800 h para SaaS; 3.500–6.000 h para todos os módulos. Não é compromisso de prazo.

## 16. Valor estratégico

O ativo incorpora conhecimento específico de esquadrias e integra departamentos. O modelo de catálogo, obras, lotes, tipologias, pacotes e compras cria barreira de entrada e pode valer mais que seu custo histórico.

## 17. Benefícios para a empresa

Menor retrabalho, menos compras duplicadas, rastreabilidade, controle de recebimento/estoque, visibilidade financeira, padronização, automação de cobranças/relatórios e menor dependência de planilhas. ROI exige baseline real.

## 18. Diferenciais

- verticalização para esquadrias;
- fluxo obra → compra → recebimento → estoque;
- catálogo com cores/aliases/fornecedores;
- XML, DXF, PDF, PWA e realtime;
- Kanban operacional e integração Trello;
- arquitetura de pacotes de trabalho.

## 19. Riscos

P0: testes ausentes, schema Board incompleto, service role amplo, falta de CI e backup não testado. P1: monitoramento, dualidade Wise/legado, LGPD, arquivos grandes, finanças sem reconciliação automatizada. Ver matriz em `riscos-pendencias.md`.

## 20. Pendências

Consolidar schema; criar testes/CI; revisar autorização; implantar observabilidade/backup; homologar compras ponta a ponta; concluir migração Wise; medir desempenho; formalizar suporte, SLA, LGPD e licenciamento.

## 21. Cenários comerciais

Piloto assistido R$ 15–35 mil; implantação completa R$ 30–80 mil; mensalidade modular R$ 1,5–8 mil; suporte R$ 1–5 mil/mês; customização R$ 100–180/h. Faixas são hipóteses justificadas por escopo/risco, não preços finais. Venda por módulos, licença anual e projeto exclusivo são alternativas.

## 22. Dados faltantes

- gastos reais com ferramentas, IA, domínio, servidores e equipamentos;
- data real de início e horas fora do Git;
- usuários, obras, pedidos, produtos, fornecedores e arquivos projetados;
- storage, mensagens, realtime e crescimento;
- baseline de erros, perdas, retrabalho e horas;
- migração, treinamento, suporte e SLA;
- hardware e integrações futuras;
- política LGPD, backup e retenção;
- titularidade, licença e estratégia comercial.

## 23. Conclusão

Há substância suficiente para uma proposta profissional e um piloto com valor operacional claro. A recomendação é separar três contratos: estabilização técnica, implantação/processos e recorrência de suporte/infraestrutura. A venda deve distinguir rigorosamente recursos funcionais de conceitos futuros. Após resolver P0 e medir um piloto, o SquadSystem pode evoluir de ativo interno especializado para produto comercial robusto; SaaS multiempresa requer investimento arquitetural adicional.

---

**Grau de confiança geral:** alto para inventário e Git; médio para maturidade; médio-baixo para horas/custos; baixo para ROI e preço final sem dados da empresa.

