# NT Labs — site

Site da NT Labs ([ntlabs.dev.br](https://ntlabs.dev.br)): portfólio de projetos, formulário de orçamento e painel de gestão em `/#painel`.

## Como funciona

- **Firebase Hosting** serve a pasta `public/`
- **Firestore** guarda textos, serviços, projetos, clientes, pedidos, visitas e prints dos projetos
- **Login do painel** com a conta Google autorizada (definida em `public/firebase-config.js` e em `firestore.rules`)
- Cada `push` na branch `main` publica o site pelo GitHub Actions (`.github/workflows/deploy.yml`)

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `public/index.html` | o site inteiro e o painel |
| `public/firebase-config.js` | configuração do app Web do Firebase e e-mail do administrador |
| `firestore.rules` | quem pode ler e gravar cada coleção |
| `firebase.json` / `.firebaserc` | configuração do Hosting e do projeto |

## Primeira configuração

1. No Firebase, crie o projeto e um app **Web**; cole a configuração em `public/firebase-config.js` e o ID do projeto em `.firebaserc`.
2. Ative o **Firestore** (região `southamerica-east1`) e, em **Authentication**, o login com **Google**.
3. Em Authentication › Configurações › Domínios autorizados, adicione `ntlabs.dev.br`.
4. Em Configurações do projeto › Contas de serviço, gere uma chave e salve o JSON no GitHub em *Settings › Secrets › Actions* com o nome `FIREBASE_SERVICE_ACCOUNT`.
5. Em Hosting, adicione o domínio `ntlabs.dev.br` e crie no Registro.br os registros DNS que o Firebase mostrar.

Para publicar do seu computador: `npx firebase-tools login` e depois `npx firebase-tools deploy`.

---
Desenvolvido por [Bruno Freitas](https://github.com/BTFreitass) · NT Labs
