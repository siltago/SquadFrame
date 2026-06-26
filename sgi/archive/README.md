# Archive — SQL Histórico SGI

Este diretório contém os arquivos SQL originais que foram executados
manualmente no Supabase SQL Editor durante o desenvolvimento do sistema.

**IMPORTANTE:** Estes arquivos NÃO devem ser executados novamente.
O estado atual do banco está capturado no baseline:
`migrations/20260625143000_remote_schema.sql`

## Para que servem

- Referência histórica de como o banco foi construído
- Documentação das decisões de design
- Auditoria em caso de dúvida sobre a origem de uma coluna ou constraint

## Ordem original de execução (aproximada)

1. schema.sql               — Fundação: core tables + auth + obras
2. catalogo.sql             — Catálogo de produtos e fornecedores
3. assinaturas.sql          — Assinaturas eletrônicas
4. event-bus.sql            — Tabela de eventos de domínio
5. kanban.sql               — Módulo Kanban completo
6. empresa.sql              — Dados da empresa
7. fornecedores-endereco.sql
8. fornecedores-contato.sql
9. fornecedor-tipos.sql
10. pedido-itens-dimensoes.sql
11. pedido-tipo-codigos-fornecedor.sql
12. tipos-linha-unidade.sql
13. obras-numero.sql
14. perfil-specs.sql
15. solicitacao-itens-externos.sql
16. solicitacao-em-pedido.sql
17. solicitacao-cor.sql
18. pedido-itens-cor.sql
19. vw-pedido-itens-chapa.sql
20. cores-ral-tipos.sql
21. tipologias-xml.sql
22. lotes-producao.sql
23. compras-permissions.sql
24. rls-policies.sql
25. schema/compras.sql      — DDL completo do módulo compras
26. schema/compras-fixes.sql
27. schema/compras-rpc.sql
28. schema/kanban-fixes.sql

## Tabelas sem DDL de origem identificado

- tipologias_obra — DDL extraído do banco via pg_dump
- tipos_linha     — DDL extraído do banco via pg_dump
