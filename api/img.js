import { get } from './_lib.js';

/* Serve os prints dos projetos enviados pelo painel. */
export default async function handler(req, res) {
  const id = String(req.query.id || '');
  if (!/^[a-z0-9]{8,40}$/i.test(id)) { res.statusCode = 404; return res.end(); }
  try {
    const r = await get(`imgs/${id}`, { access: 'private' });
    if (!r || !r.stream) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', r.blob.contentType || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
    res.end(buf);
  } catch {
    res.statusCode = 404; res.end();
  }
}
