# SquadEngineer — MVP

## Incluído nesta fase

- solução .NET 8 com Desktop, Agent, Core e Infrastructure;
- WPF com arquivo/revisão mais recente, status do Agent e lista real de revisões;
- leitura de `Documentos\SquadSystem\SquadEngineering\Versoes`;
- plugin AutoCAD integrado com paleta, `SaveComplete`, versões locais e abertura da pasta;
- contrato reservado para Named Pipes.

## Executar

Na raiz do repositório:

```powershell
dotnet build .\apps\squadengineer-desktop\SquadEngineer.sln
dotnet run --project .\apps\squadengineer-desktop\src\SquadEngineer.Desktop
```

Na aba **Arquivos do servidor**, use **Selecionar pasta** e escolha a pasta compartilhada ou informe-a pelo seletor do Windows, por exemplo `\\SERVIDOR\Engenharia`. O caminho fica salvo somente no perfil local do Windows, em `%LOCALAPPDATA%\SquadSystem\SquadEngineer\settings.json`. Um duplo clique abre o arquivo com o aplicativo padrão da máquina.

Para conferir o leitor sem abrir a interface:

```powershell
dotnet run --project .\apps\squadengineer-desktop\src\SquadEngineer.Agent -- --scan
```

## Testar com AutoCAD

Compile o projeto da integração passando a pasta que contém `AcMgd.dll`. Instale o bundle conforme o processo Autodesk já usado pelo protótipo, abra um DWG, execute `SQUADENGINEERING` e salve. Uma nova revisão deve aparecer no diretório local; reinicie o Desktop para recarregar a lista nesta fase.

## Próximos incrementos

1. MVVM completo, seleção de projeto/arquivo e atualização automática por `FileSystemWatcher`.
2. SQLite para catálogo, fila offline e sessões.
3. serviço Windows/Agent e protocolo Named Pipes versionado.
4. detecção de presença, locks e conflitos.
5. autenticação e API do SquadWise, somente depois de definir o contrato seguro.
6. sincronização, aprovações e liberação para produção.
