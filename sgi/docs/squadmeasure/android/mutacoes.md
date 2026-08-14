# Mutações persistentes

`PendingMutationEntity` armazena proprietário, visita, entidade, operação, JSON, versão esperada, status, tentativas, datas e erro. A ordem é `createdAt`. O processador evita enviar elemento antes do ambiente confirmado e medida antes do elemento confirmado.

Estados: `LOCAL_ONLY`, `PENDING`, `SYNCING`, `SYNCED`, `ERROR`, `CONFLICT` e `DELETED_PENDING`. Em erro ou conflito o registro permanece no Room. Retry pode ser manual ou pelo WorkManager.
