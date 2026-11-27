import { put, uid, hoje, body, json } from './_lib.js';

/* Conta uma visita. Os dados ficam no nome do arquivo: visitas/AAAA-MM-DD/id-m|d-l|r.json */
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido' });
  const ua = String(req.headers['user-agent'] || '');
  if (/bot|crawl|spider|preview|monitor/i.test(ua)) return json(res, 200, { ok: true });
  const b = await body(req);
  const name = `visitas/${hoje()}/${uid()}-${b.cel ? 'm' : 'd'}-${b.origem === 'link' ? 'l' : 'r'}.json`;
  await put(name, '{}', { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
  json(res, 200, { ok: true });
}
