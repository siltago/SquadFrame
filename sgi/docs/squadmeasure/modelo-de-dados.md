# Modelo de dados — Fase 1

Migration: `20260806000001_squadmeasure_fase1.sql`.

Tabelas: `measure_visitas`, `measure_visita_membros`, `measure_ambientes`, `measure_elementos`, `measure_medidas`, `measure_observacoes` e `measure_historico`.

Uma visita referencia `obras` e `usuarios`. Cliente é obtido pela obra; um snapshot JSONB preserva o contexto histórico. Observações sempre possuem uma visita e no máximo um alvo específico com FK: ambiente, elemento ou medida. Todas as entidades mutáveis usam versão e exclusão lógica quando aplicável.

Mídia, dispositivos, operation log, conflitos, sincronização e AR serão adicionados apenas em suas fases.
