# SquadMeasure Mobile

Aplicativo de medição de obras em React Native para Android e iOS. A lógica de negócio e a interface ficam em TypeScript; os projetos nativos servem para empacotar e executar o mesmo aplicativo nas duas plataformas.

## Configuração

Requisitos no Windows para Android:

- Node.js 22.11 ou superior;
- JDK 17 ou superior;
- Android Studio, SDK e um emulador ou aparelho com depuração USB.

Copie `.env.example` para `.env` e preencha:

```dotenv
SQUADMEASURE_SUPABASE_URL=https://seu-projeto.supabase.co
SQUADMEASURE_SUPABASE_ANON_KEY=sua-chave-anon
SQUADMEASURE_API_BASE_URL=http://10.0.2.2:3000
```

No emulador Android, `10.0.2.2` aponta para o computador. Em um aparelho físico, use o IP local do computador e mantenha os dois dispositivos na mesma rede.

## Executar no Android

```powershell
npm install
npm start
```

Em outro terminal:

```powershell
npm run android
```

Também é possível instalar o APK de depuração gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Executar no iOS

O build de iOS exige macOS e Xcode. No Mac:

```sh
npm install
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Verificações

```powershell
npx tsc --noEmit
npm run lint
npm test -- --runInBand
cd android
.\gradlew.bat test lint assembleDebug --no-daemon
```

## Funcionamento offline

A sessão fica no Keychain/Keystore. Dados de cada usuário, visitas e alterações pendentes ficam persistidos localmente. A fila tenta sincronizar quando a conexão retorna ou quando o aplicativo volta ao primeiro plano. Erros continuam visíveis para nova tentativa, sem descartar os dados coletados.
