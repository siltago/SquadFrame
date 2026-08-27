# SquadMeasure Mobile

O cliente de campo está em `apps/squadmeasure-mobile` e usa React Native com TypeScript para compartilhar interface, regras e sincronização entre Android e iOS.

## Estrutura

- `App.tsx`: navegação e telas de login, visitas, campo e sincronização;
- `src/api.ts`: autenticação e comunicação com Supabase/API;
- `src/store.ts`: estado local-first, alterações pendentes, dependências e conflitos;
- `src/storage.ts`: sessão protegida e cache isolado por usuário;
- `android`: empacotamento Android, com bootstrap do aplicativo em Java;
- `ios`: empacotamento iOS em Swift.

## Recursos implementados

- login e renovação de sessão;
- visitas e detalhe de campo;
- ambientes, elementos, medições e observações;
- confirmação, revisão e invalidação de medições;
- arquivamento, restauração e duplicação;
- transições da visita;
- armazenamento offline e fila persistente;
- sincronização por conectividade/retorno ao primeiro plano;
- isolamento do cache por usuário e apresentação de conflitos/erros.

Os valores de conexão não são versionados. Crie o arquivo `.env` a partir de `.env.example` antes de executar o aplicativo.
