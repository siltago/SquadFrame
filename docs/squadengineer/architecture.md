# SquadEngineer — arquitetura inicial

O SquadEngineer é um produto desktop Windows separado do Next.js em `sgi/`. Nesta fase não há autenticação, Supabase, nuvem ou alterações de migrations.

## Projetos

- `SquadEngineer.Desktop`: shell WPF e apresentação das revisões locais.
- `SquadEngineer.Agent`: futuro processo residente para fila offline, sincronização e IPC.
- `SquadEngineer.Core`: entidades, estados, contratos e protocolo compartilhado.
- `SquadEngineer.Infrastructure`: acesso ao sistema de arquivos e, futuramente, SQLite.
- `SquadEngineer.AutoCAD`: integração Autodesk isolada, compatível com o protótipo validado.

O fluxo atual é `AutoCAD SaveComplete -> DWG + JSON local -> Infrastructure -> Desktop`. O fluxo futuro será `AutoCAD <-> Named Pipe <-> Agent <-> SQLite/fila <-> API`, preservando operação offline. O nome reservado do pipe é `SquadEngineer.Agent.v1`; nenhum servidor ou cliente de pipe foi ativado ainda.

## Decisões de compatibilidade

O plugin mantém a pasta por desenho baseada no nome e nos oito primeiros caracteres do SHA-256 do caminho normalizado, arquivos `*_R0001_yyyyMMdd_HHmmss.dwg` e metadados JSON com os campos já existentes. O Desktop lê JSON de forma tolerante e ignora metadados inválidos sem interromper os demais itens.

SQLite deverá ser adicionado na próxima fase à Infrastructure, sem misturar persistência ou regras com a camada WPF.

## Acesso inicial ao servidor de arquivos

O Desktop lê diretamente uma raiz local ou UNC selecionada pelo usuário. A configuração é local e não contém credenciais; o acesso utiliza a identidade Windows que executa o aplicativo. Diretórios sem permissão são ignorados durante a enumeração e uma raiz indisponível é informada na interface.
