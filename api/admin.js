import {
  readJSON, writeJSON, listAll, put, del, getProjetos, getClientes, getConteudo,
  uid, body, rawBody, clean, makeToken, checkToken, checkPassword, json
} from './_lib.js';

const ARR = { clientes: 'data/clientes.json', projetos: 'data/projetos.json' };
const CAMPOS = {
  clientes: { nome: 120, negocio: 160, whats: 40, sistema: 400, status: 40, valor: 20, mensal: 20, inicio: 10, entrega: 10, link: 500, painel: 500, obs: 3000, t: 20, atualizado: 20 },
  projetos: { nome: 160, tipo: 80, status: 40, ordem: 6, desc: 600, site: 500, gh: 500, tema: 10, cor: 7, cliente: 40, visivel: 5, t: 20, atualizado: 20 }
};
function sanitize(col, it) {
  const out = { id: /^[\w-]{1,40}$/.test(it.id || '') ? it.id : uid() };
  for (const [k, n] of Object.entries(CAMPOS[col])) {
    const v = it[k];
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'number' || typeof v === 'boolean' ? v : clean(v, n);
  }
  if (col === 'projetos') {
    out.visivel = it.visivel !== false;
    out.ordem = Number(it.ordem) || 0;
    out.imgs = Array.isArray(it.imgs) ? it.imgs.filter((x) => /^[a-z0-9]{8,40}$/i.test(x)).slice(0, 12) : [];
  }
  for (const k of ['link', 'painel', 'site', 'gh']) if (out[k] && !/^https:\/\//i.test(out[k])) out[k] = '';
  return out;
}

async function pedidos() {
  const blobs = (await listAll('pedidos/', 2000)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 300);
  const docs = await Promise.all(blobs.map((b) => readJSON(b.pathname, null)));
  return docs.filter(Boolean);
}
async function visitas() {
  const blobs = await listAll('visitas/', 20000);
  return blobs.map((b) => {
    const [, dia, file] = b.pathname.split('/');
    return { dia, cel: /-m-/.test(file || ''), origem: /-l\.json$/.test(file || '') ? 'link' : 'direto' };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido' });
  const acao = String(req.query.acao || '');

  if (acao === 'login') {
    const b = await body(req);
    if (!checkPassword(b.senha)) {
      await new Promise((r) => setTimeout(r, 900));
      return json(res, 401, { erro: 'Senha incorreta' });
    }
    return json(res, 200, { token: makeToken() });
  }
  if (!checkToken(req)) return json(res, 401, { erro: 'Sessão expirada. Entre de novo.' });

  try {
    if (acao === 'dados') {
      const [pd, vs, cl, pj, ct] = await Promise.all([pedidos(), visitas(), getClientes(), getProjetos(), getConteudo()]);
      return json(res, 200, { pedidos: pd, visitas: vs, clientes: cl, projetos: pj, conteudo: ct });
    }
    if (acao === 'upload') {
      const type = String(req.headers['content-type'] || '');
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(type)) return json(res, 400, { erro: 'Envie uma imagem PNG, JPG ou WebP' });
      const buf = await rawBody(req);
      const id = uid();
      await put(`imgs/${id}`, buf, { access: 'private', addRandomSuffix: false, contentType: type });
      return json(res, 200, { id });
    }
    const b = await body(req);
    if (acao === 'salvar') {
      if (b.col === 'pedidos') {
        const id = String(b.item?.id || '');
        if (!/^[\w-]{1,40}$/.test(id)) return json(res, 400, { erro: 'Pedido inválido' });
        const atual = await readJSON(`pedidos/${id}.json`, null);
        if (!atual) return json(res, 404, { erro: 'Pedido não encontrado' });
        const st = clean(b.item.status, 30);
        await writeJSON(`pedidos/${id}.json`, { ...atual, status: st });
        return json(res, 200, { item: { ...atual, status: st } });
      }
      if (!ARR[b.col]) return json(res, 400, { erro: 'Coleção inválida' });
      const lista = b.col === 'clientes' ? await getClientes() : await getProjetos();
      const it = sanitize(b.col, b.item || {});
      const i = lista.findIndex((x) => x.id === it.id);
      if (i >= 0) lista[i] = it; else lista.push(it);
      await writeJSON(ARR[b.col], lista);
      return json(res, 200, { item: it });
    }
    if (acao === 'excluir') {
      const id = String(b.id || '');
      if (b.col === 'pedidos') { await del(`pedidos/${id}.json`).catch(() => {}); return json(res, 200, { ok: true }); }
      if (!ARR[b.col]) return json(res, 400, { erro: 'Coleção inválida' });
      const lista = b.col === 'clientes' ? await getClientes() : await getProjetos();
      await writeJSON(ARR[b.col], lista.filter((x) => x.id !== id));
      return json(res, 200, { ok: true });
    }
    if (acao === 'conteudo') {
      const c = b.conteudo || {};
      const s = JSON.stringify(c);
      if (s.length > 200000) return json(res, 400, { erro: 'Conteúdo grande demais' });
      await writeJSON('data/conteudo.json', { textos: c.textos || {}, servicos: c.servicos || [], passos: c.passos || [], difs: c.difs || [], atualizado: Date.now() });
      return json(res, 200, { ok: true });
    }
    if (acao === 'importar') {
      if (b.conteudo) await writeJSON('data/conteudo.json', b.conteudo);
      if (Array.isArray(b.projetos)) await writeJSON(ARR.projetos, b.projetos.map((p) => sanitize('projetos', p)));
      if (Array.isArray(b.clientes)) await writeJSON(ARR.clientes, b.clientes.map((c) => sanitize('clientes', c)));
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { erro: 'Ação desconhecida' });
  } catch (e) {
    return json(res, 500, { erro: 'Erro no servidor: ' + (e.message || 'desconhecido') });
  }
}
