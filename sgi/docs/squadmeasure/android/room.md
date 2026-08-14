# Room

Schema 2: `VisitEntity`, `EnvironmentEntity`, `ElementEntity`, `MeasurementEntity`, `ObservationEntity`, `MetadataEntity` e `PendingMutationEntity`.

As entidades de campo possuem UUID, proprietário, visita e pai, versão, timestamps, soft delete, estado de sincronização, última sincronização e último erro. Índices cobrem proprietário, visita, pais, estado, soft delete, sequência e atualização. As consultas sempre recebem `ownerId`.

A migração `1→2` preserva os ambientes criados no APK anterior e cria o novo schema e índices. Não existe `fallbackToDestructiveMigration`.
