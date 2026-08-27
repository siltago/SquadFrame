# SquadMeasure — Fase 1

## Implementado

- fundação PostgreSQL, índices, constraints, permissões e RLS;
- schemas Zod, repository, service e Server Actions;
- dashboard, listagem filtrada/paginada, criação, detalhe e edição de visitas;
- registro inicial de ambientes, elementos, medidas e observações;
- revisão básica, histórico e dossiê imprimível;
- testes de regras, schemas e contrato de segurança da migration.

## Evolução posterior

O cliente de campo multiplataforma passou a ser implementado em React Native, em `apps/squadmeasure-mobile`. Consulte `mobile.md` para a arquitetura atual. Arquivos, fotos, vídeos, editores, croquis, recursos de realidade aumentada e PDF continuam fora do escopo desta fase.

## Aplicação

Execute `supabase db push` no ambiente correto após revisar a migration. Depois atribua as permissões necessárias aos cargos não administrativos.
