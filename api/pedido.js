import { writeJSON, uid, clean, body, json } from './_lib.js';

/* Recebe o formulário de orçamento do site. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido' });
  const b = await body(req);
  if (b.site_url) return json(res, 200, { ok: true }); // armadilha para robôs
  const p = {
    nome: clean(b.nome, 120), whats: clean(b.whats, 40), negocio: clean(b.negocio, 160), segmento: clean(b.segmento, 80),
    tipo: clean(b.tipo, 80), estilo: clean(b.estilo, 80),
    recursos: Array.isArray(b.recursos) ? b.recursos.slice(0, 12).map((x) => clean(x, 60)) : [],
    logo: clean(b.logo, 30), dominio: clean(b.dominio, 30), orcamento: clean(b.orcamento, 40), prazo: clean(b.prazo, 40),
    refs: clean(b.refs, 500), msg: clean(b.msg, 2000), status: 'novo', t: Date.now()
  };
  if (!p.nome || p.whats.replace(/\D/g, '').length < 10 || !p.negocio) return json(res, 400, { erro: 'Preencha nome, WhatsApp e negócio.' });
  const id = uid();
  await writeJSON(`pedidos/${id}.json`, { ...p, id });
  json(res, 200, { ok: true, id });
}
