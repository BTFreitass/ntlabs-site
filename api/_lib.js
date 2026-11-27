import { put, get, list, del } from '@vercel/blob';
import crypto from 'node:crypto';
import { SEED_PROJETOS, SEED_CLIENTES } from './_seed.js';

const OPT = { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' };

export async function readJSON(path, fallback) {
  try {
    const r = await get(path, { access: 'private', useCache: false });
    if (!r || !r.stream) return fallback;
    return await new Response(r.stream).json();
  } catch {
    return fallback;
  }
}
export async function writeJSON(path, data) {
  await put(path, JSON.stringify(data), OPT);
}
export async function listAll(prefix, max = 20000) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor && out.length < max);
  return out;
}
export { put, get, del };

export const getProjetos = () => readJSON('data/projetos.json', SEED_PROJETOS);
export const getClientes = () => readJSON('data/clientes.json', SEED_CLIENTES);
export const getConteudo = () => readJSON('data/conteudo.json', null);

export const uid = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export async function body(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const txt = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(txt || '{}'); } catch { return {}; }
}
export async function rawBody(req, limit = 4_000_000) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('Arquivo grande demais');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

const str = (v, n = 300) => String(v ?? '').slice(0, n).trim();
export const clean = (v, n) => str(v, n);

/* sessão do painel: token assinado com HMAC, válido por 30 dias */
const secret = () => process.env.SESSION_SECRET || '';
export function makeToken() {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const sig = crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
  return exp + '.' + sig;
}
export function checkToken(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [exp, sig] = t.split('.');
  if (!exp || !sig || !secret() || Number(exp) < Date.now()) return false;
  const good = crypto.createHmac('sha256', secret()).update(exp).digest('hex');
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
export function checkPassword(p) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(p || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}
export function json(res, code, data, headers = {}) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}
