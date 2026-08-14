# Rede e contratos

Configuração em `local.properties`: `SQUADMEASURE_SUPABASE_URL`, `SQUADMEASURE_SUPABASE_ANON_KEY` e `SQUADMEASURE_API_BASE_URL`. URLs são normalizadas e validadas; a chave nunca é exibida ou registrada. Em debug, configuração ausente aparece como estado técnico.

Contratos: `GET bootstrap`, `GET visits/{id}`, `POST/PATCH environments`, `POST/PATCH elements`, `POST/PATCH measurements`, `POST/PATCH observations` e `POST visits/{id}/transition`. Todos validam bearer, usuário de domínio, permissão, acesso e payload. Updates usam `expectedVersion`; conflitos retornam `VERSION_CONFLICT`.

Erros são convertidos para `AppError`, sem SQL ou stack trace na interface.
