# Sincronização básica

O `BasicSyncWorker` usa trabalho único `squadmeasure-basic-sync`, exige rede, aplica backoff exponencial, limita retries pelo WorkManager e valida o proprietário da sessão antes de enviar. Existe execução periódica única e solicitação imediata após edição.

Esta implementação é sequencial e cobre dependência direta. Lotes atômicos, merge de conflitos e grafo completo pertencem à Fase 3.
