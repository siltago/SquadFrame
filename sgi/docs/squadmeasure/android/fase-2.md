# SquadMeasure Android — Fase 2

A Fase 2 implementa os fluxos estruturados de campo sem mídia: autenticação, visitas, ambientes, elementos, medidas, observações, estados locais, mutações persistentes e sincronização básica. A origem de verdade da interface é o Room; o servidor confirma versões e transições.

O APK usa UUID criado no dispositivo também no backend. Alterações entram como `PENDING`, passam por `SYNCING` e somente viram `SYNCED` após resposta 2xx. Erros e conflitos preservam os dados locais. O envio para revisão fica bloqueado enquanto houver mutações da visita.

Não fazem parte desta fase: câmera, mídia, croquis, uploads, AR e grafo avançado de sincronização.
