# NT Labs — site

Site da NT Labs ([ntlabs.dev.br](https://ntlabs.dev.br)), com portfólio de projetos, formulário de orçamento e painel de gestão.

## Estrutura

- `public/index.html` — o site inteiro (HTML, CSS e JS num arquivo só) + painel em `/#painel`
- `api/` — funções da Vercel
  - `site.js` — textos, serviços e projetos públicos
  - `pedido.js` — recebe o formulário de orçamento
  - `visita.js` — conta visitas
  - `img.js` — entrega os prints dos projetos
  - `admin.js` — painel: login, pedidos, clientes, projetos, textos, upload de imagens, backup
- Dados no **Vercel Blob** (store privado): `data/*.json`, `pedidos/`, `visitas/`, `imgs/`

## Variáveis de ambiente (Vercel)

| Nome | Para quê |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | criada automaticamente ao conectar o Blob store |
| `ADMIN_PASSWORD` | senha do painel |
| `SESSION_SECRET` | assina o login do painel (texto aleatório longo) |

## Publicação

Cada `push` na branch `main` publica o site automaticamente na Vercel.

---
Desenvolvido por [Bruno Freitas](https://github.com/BTFreitass) · NT Labs
