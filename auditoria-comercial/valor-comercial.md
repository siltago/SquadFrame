# Valor comercial, benefícios e ROI

## Tese de valor

O diferencial comprovável é a verticalização: o sistema modela obras, tipologias, lotes, pacotes, perfis, cores, fornecedores, solicitações, pedidos, recebimentos, beneficiamentos e estoque no mesmo produto. Isso é mais difícil de replicar do que um CRUD genérico e reduz a distância entre software e processo real.

## Benefícios vendáveis

| Grupo | Benefício | Evidência no produto | Dado necessário para calcular |
|---|---|---|---|
| Financeiro | Menos compra duplicada e saldo/adiantamento mais visível | solicitações, pedidos, carteiras, pendências | gastos, duplicidades e ajustes atuais |
| Operacional | Menos planilhas e mensagens dispersas | hub, obras, Kanban, documentos | horas semanais gastas consolidando dados |
| Gerencial | Visão de status e dashboards | dashboards, relatórios, timeline | tempo atual de fechamento e indicadores |
| Controle | Aprovação e permissão por ação | RBAC, state machines, RPCs | matriz real de alçadas |
| Rastreabilidade | Histórico, auditoria, recebimentos e movimentações | Wise audit, timeline, Stock | incidência atual de divergências |
| Produtividade | Reuso de catálogo e automações | aliases, XML/DXF, cron, busca | volume mensal e tempo manual por operação |
| Estratégico | Base única entre setores | Frame/Board/Stock/Wise | custo de sistemas atuais e integração |

## Indicadores para piloto

- tempo entre solicitação e emissão de pedido;
- pedidos devolvidos/reabertos e compras duplicadas;
- divergência pedido × recebido × saldo;
- atraso médio e percentual de cobranças automáticas efetivas;
- horas para gerar relatório diário/semanal;
- itens sem código mestre/fornecedor/cor;
- material parado, perdas e ajustes de estoque;
- obras com informação incompleta e tarefas vencidas;
- usuários ativos e operações por módulo;
- disponibilidade, erros e tempo de resposta.

## Cenários comerciais de referência

Faixas abaixo são hipóteses para negociação, não preços de mercado comprovados pelo repo.

| Oferta | Faixa preliminar | Raciocínio |
|---|---:|---|
| Diagnóstico + implantação piloto | R$ 15–35 mil | configuração, saneamento, treinamento e risco inicial |
| Implantação completa empresa única | R$ 30–80 mil | módulos, migração, processos e acompanhamento |
| Mensalidade modular | R$ 1,5–8 mil/mês | usuários, módulos, suporte e infraestrutura |
| Licença anual | R$ 18–96 mil/ano | equivalente mensal com compromisso anual |
| Suporte/manutenção | R$ 1–5 mil/mês | horas/SLA/criticidade |
| Treinamento | R$ 2–8 mil por ciclo | perfis, material e acompanhamento |
| Migração de dados | R$ 5–30 mil | depende de qualidade e volume |
| Customização/evolução | R$ 100–180/h | especialização e responsabilidade técnica |

Outros modelos possíveis: venda por módulos, contrato de desenvolvimento restante, implantação + mensalidade, projeto exclusivo ou licenciamento interno. SaaS multiempresa não deve ser ofertado como pronto: a documentação confirma a remoção de multi-tenancy.

## Barreiras de entrada e riscos comerciais

Barreiras: conhecimento setorial, modelo SQL extenso, integrações entre módulos e histórico de regras. Riscos: dependência do autor, ausência de homologação formal, suporte ainda não estruturado, licenciamento indefinido e escopo de módulos planejados confundido com entregue.

## Recomendação de proposta

1. Vender primeiro um **piloto assistido de empresa única**, com escopo fechado.
2. Cobrar implantação separada de recorrência.
3. Vincular expansão a métricas do piloto.
4. Incluir cláusulas sobre roadmap, dados, backup, SLA e integrações externas.
5. Não prometer ROI numérico sem baseline da empresa.

