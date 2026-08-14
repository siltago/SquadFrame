# Arquitetura Android

Aplicativo Kotlin/Compose local-first. O primeiro build usa um módulo Gradle `:app`, dividido em pacotes `core`, `data`, `ui` e features extraíveis. Fluxo: Compose → ViewModel → Repository → Room/API. DTOs, entidades e domínio são separados.
