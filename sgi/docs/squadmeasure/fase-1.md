# SquadMeasure — Fase 1

## Implementado

- fundação PostgreSQL, índices, constraints, permissões e RLS;
- schemas Zod, repository, service e Server Actions;
- dashboard, listagem filtrada/paginada, criação, detalhe e edição de visitas;
- registro inicial de ambientes, elementos, medidas e observações;
- revisão básica, histórico e dossiê imprimível;
- testes de regras, schemas e contrato de segurança da migration.

## Não implementado

Android, CameraX, Room, WorkManager, offline, sincronização nativa, arquivos, fotos, vídeos, editores, croquis, ARCore, overlays AR, PDF e iOS. As páginas de sincronização/configuração informam essa limitação sem dados simulados.

## Aplicação

Execute `supabase db push` no ambiente correto após revisar a migration. Depois atribua as permissões necessárias aos cargos não administrativos. Nenhuma variável de ambiente nova foi adicionada.
