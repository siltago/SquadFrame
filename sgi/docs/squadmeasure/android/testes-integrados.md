# Testes integrados

Testes locais cobrem regras de medidas, estados, UUID, duplicação, mutações e transições. Testes instrumentados cobrem Room, soft delete, isolamento, fila, migração e apresentação Compose.

Para integração real é necessário preencher as três propriedades, implantar os endpoints Next.js e usar usuário com permissões SquadMeasure. Validar login, bootstrap, detalhe, CRUD, conflito, perda/retorno da rede e troca de conta. Sem ambiente configurado esses cenários não podem ser declarados executados.
