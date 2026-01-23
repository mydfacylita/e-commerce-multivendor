# 🚀 Deploy iOS com Codemagic

## Passo 1: Criar conta no Codemagic

1. Acesse [https://codemagic.io](https://codemagic.io)
2. Clique em **"Start building"**
3. Faça login com GitHub, GitLab ou Bitbucket

## Passo 2: Preparar o Repositório

Seu código precisa estar em um repositório Git. Se ainda não está:

```bash
# Na pasta mydshop-app
git init
git add .
git commit -m "Initial commit - MYDSHOP App"

# Conecte ao seu repositório remoto
git remote add origin https://github.com/seu-usuario/mydshop-app.git
git push -u origin main
```

## Passo 3: Conectar Repositório no Codemagic

1. No dashboard do Codemagic, clique em **"Add application"**
2. Selecione seu provedor Git (GitHub, GitLab, etc.)
3. Autorize o acesso
4. Selecione o repositório `mydshop-app`
5. Escolha **"Capacitor"** como tipo de projeto

## Passo 4: Configurar Code Signing iOS

### 4.1 Criar Apple Developer Account
- Você precisa de uma conta Apple Developer ($99/ano)
- Acesse [developer.apple.com](https://developer.apple.com)

### 4.2 Criar App ID
1. Vá em **Certificates, Identifiers & Profiles**
2. Clique em **Identifiers** > **+**
3. Selecione **App IDs** > **App**
4. Preencha:
   - Description: `MYDSHOP`
   - Bundle ID: `com.mydshop.app`
5. Clique em **Register**

### 4.3 Criar Certificado de Distribuição
1. Vá em **Certificates** > **+**
2. Selecione **Apple Distribution**
3. Siga as instruções para criar CSR e baixar o certificado

### 4.4 Criar Provisioning Profile
1. Vá em **Profiles** > **+**
2. Selecione **App Store** (ou Ad Hoc para testes)
3. Selecione o App ID `com.mydshop.app`
4. Selecione o certificado de distribuição
5. Baixe o profile

### 4.5 Configurar no Codemagic
1. No Codemagic, vá em **Teams** > **Code signing identities**
2. Upload do certificado `.p12` e provisioning profile `.mobileprovision`
3. Ou use **Automatic code signing** conectando sua Apple Developer Account

## Passo 5: Configurar Variáveis de Ambiente

No Codemagic, vá em **Environment variables** e adicione:

| Variável | Descrição |
|----------|-----------|
| `APP_STORE_CONNECT_KEY_ID` | Key ID da App Store Connect API |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Chave privada (.p8) |

## Passo 6: Iniciar Build

1. No dashboard, clique no seu app
2. Clique em **"Start new build"**
3. Selecione a branch `main`
4. Selecione workflow **"iOS Build"**
5. Clique em **"Start build"**

## Passo 7: Publicar na App Store

### Via TestFlight (Recomendado para testes)
- O build automaticamente envia para TestFlight quando configurado
- Convide testadores pelo App Store Connect

### Via App Store
1. Acesse [App Store Connect](https://appstoreconnect.apple.com)
2. Crie um novo app se necessário
3. Preencha as informações do app
4. Selecione o build do TestFlight
5. Envie para revisão

---

## 📱 Build Android

O mesmo arquivo `codemagic.yaml` também configura builds Android.

### Configurar Keystore Android

1. Gere uma keystore de release:
```bash
keytool -genkey -v -keystore mydshop-release.keystore -alias mydshop -keyalg RSA -keysize 2048 -validity 10000
```

2. No Codemagic, vá em **Code signing identities** > **Android**
3. Upload da keystore e configure as credenciais

### Publicar no Google Play

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ative a **Google Play Android Developer API**
3. Crie uma **Service Account** com permissões de publicação
4. Baixe o JSON da service account
5. Configure no Codemagic como `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`

---

## 🔧 Comandos Úteis

```bash
# Build local
npm run build
npx cap sync

# Abrir no Xcode (Mac)
npx cap open ios

# Abrir no Android Studio
npx cap open android

# Atualizar plugins
npm update @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

## 📋 Checklist antes do Build

- [ ] Bundle ID configurado: `com.mydshop.app`
- [ ] Versão do app atualizada no `capacitor.config.ts`
- [ ] Ícones e splash screens gerados
- [ ] Código commitado e pushado
- [ ] Certificados configurados no Codemagic
- [ ] Variáveis de ambiente configuradas

## 🆘 Suporte

- [Documentação Codemagic](https://docs.codemagic.io)
- [Documentação Capacitor](https://capacitorjs.com/docs)
- [Apple Developer](https://developer.apple.com)
