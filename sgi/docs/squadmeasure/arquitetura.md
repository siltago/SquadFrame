# SquadMeasure — arquitetura

O SquadMeasure é um módulo single-tenant do SquadSystem. O painel web vive em `/squadmeasure` e reutiliza Supabase Auth, `usuarios`, `clientes`, `obras`, o RBAC legado e o SquadUI.

## Camadas

`app` compõe páginas; `actions` autentica, valida com Zod e revalida; `services` contém regras; `repositories` acessa Supabase. O aplicativo Android, mídia, offline, sincronização e AR não fazem parte da Fase 1.

## Segurança

Server Actions validam permissão antes de chamar services. As tabelas possuem RLS explícita e helpers `SECURITY DEFINER` com `search_path=public`. O cliente administrativo do servidor não substitui essas verificações. Não existe `organizacao_id`.
