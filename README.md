# NT Labs — site

Site da NT Labs ([ntlabs.dev.br](https://ntlabs.dev.br)): portfólio de projetos, formulário de orçamento e painel de gestão em `/#painel`.

## Como funciona

- **Vercel** serve a pasta `public/` e roda a API em `api/dados.mjs`
- **Redis (Upstash, pela aba Storage da Vercel)** guarda textos, serviços, projetos, clientes, pedidos, visitas e prints dos projetos
- **Login do painel** com senha (variável `ADMIN_PASSWORD`); a sessão fica num cookie assinado por 30 dias
- Cada `push` na branch `main` publica o site automaticamente (integração Vercel + GitHub)

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `public/index.html` | o site inteiro e o painel |
| `api/dados.mjs` | API: leitura pública do site, formulário, visitas, login e gravações do painel |
| `vercel.json` | pasta publicada, URLs limpas e cabeçalhos de segurança |

## Variáveis de ambiente (Vercel › Settings › Environment Variables)

| Nome | O que é |
| --- | --- |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | criadas sozinhas ao conectar o Redis ao projeto |
| `ADMIN_PASSWORD` | senha do painel |
| `SESSION_SECRET` | texto aleatório longo que assina o cookie de sessão (trocar desconecta todo mundo) |

Depois de mudar uma variável, publique de novo (Deployments › Redeploy) para ela valer.

## Primeira configuração

1. Na Vercel, abra o projeto › **Storage** › **Create Database** › **Upstash for Redis** (plano grátis) e conecte ao projeto `ntlabs-site`.
2. Cadastre `ADMIN_PASSWORD` e `SESSION_SECRET` nas variáveis de ambiente.
3. Em **Settings › Domains**, adicione `ntlabs.dev.br` e crie no Registro.br os registros DNS que a Vercel mostrar.

Para publicar do seu computador: `npx vercel deploy --prod`.

---
Desenvolvido por [Bruno Freitas](https://github.com/BTFreitass) · NT Labs
