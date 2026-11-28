// API do site da NT Labs (Vercel Function).
// Guarda tudo num Redis (Upstash, criado pela aba Storage da Vercel).
// Variáveis de ambiente:
//   KV_REST_API_URL / KV_REST_API_TOKEN  (criadas pela Vercel ao conectar o Redis;
//                                         também aceita UPSTASH_REDIS_REST_URL / _TOKEN)
//   ADMIN_PASSWORD                        senha do painel (/#painel)
//   SESSION_SECRET                        texto aleatório longo para assinar o cookie de sessão
import crypto from 'node:crypto';

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const COLS = ['projetos', 'clientes', 'pedidos'];
const COOKIE = 'nt_sessao';
const DIA_SESSAO = 30; // dias

/* ---------- Redis (REST do Upstash, sem dependências) ---------- */
async function redis(...cmd) {
  if (!RURL || !RTOK) throw new Erro(503, 'Banco de dados não configurado');
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: `Bearer ${RTOK}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function pipe(cmds) {
  if (!cmds.length) return [];
  if (!RURL || !RTOK) throw new Erro(503, 'Banco de dados não configurado');
  const r = await fetch(RURL + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${RTOK}` }, body: JSON.stringify(cmds) });
  const j = await r.json();
  const e = Array.isArray(j) ? j.find((x) => x.error) : j;
  if (!Array.isArray(j) || e) throw new Error((e && e.error) || 'Falha no banco');
  return j.map((x) => x.result);
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const hashLista = (arr) => { const o = []; for (let i = 0; i < (arr || []).length; i += 2) { const v = json(arr[i + 1]); if (v) o.push({ ...v, id: arr[i] }); } return o; };

/* ---------- utilidades ---------- */
class Erro extends Error { constructor(s, m) { super(m); this.status = s; } }
const uid = () => Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
const idOk = (id) => typeof id === 'string' && /^[\w-]{1,40}$/.test(id);
const txt = (v, n) => typeof v === 'string' && v.length <= n;
const opt = (v, n) => v === undefined || txt(v, n);
function limpo(o) {
  const c = { ...(o || {}) }; delete c.id; delete c.src;
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  return c;
}
function corpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return json(req.body || '') || {};
}
function ip(req) { return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x'; }

/* ---------- sessão (cookie assinado com HMAC) ---------- */
function assinar(v) {
  const seg = process.env.SESSION_SECRET;
  if (!seg || seg.length < 16) throw new Erro(503, 'SESSION_SECRET não configurado');
  return crypto.createHmac('sha256', seg).update(v).digest('base64url');
}
function lerCookie(req) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
function ehAdmin(req) {
  try {
    const [exp, sig] = lerCookie(req).split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    const a = Buffer.from(sig), b = Buffer.from(assinar('adm:' + exp));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}
function criarSessao(res) {
  const exp = String(Date.now() + DIA_SESSAO * 864e5);
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${assinar('adm:' + exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIA_SESSAO * 86400}`);
}
function apagarSessao(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`); }
function exigirAdmin(req) { if (!ehAdmin(req)) throw new Erro(401, 'login'); }

/* ---------- validações públicas (iguais às antigas regras do Firestore) ---------- */
const CAMPOS_PEDIDO = ['nome', 'whats', 'negocio', 'segmento', 'tipo', 'estilo', 'recursos', 'logo', 'dominio', 'orcamento', 'prazo', 'refs', 'msg', 'status', 't'];
function validarPedido(p) {
  if (!p || typeof p !== 'object') return false;
  if (Object.keys(p).some((k) => !CAMPOS_PEDIDO.includes(k))) return false;
  return txt(p.nome, 120) && p.nome.trim().length > 0
    && txt(p.whats, 40) && p.whats.length >= 10
    && txt(p.negocio, 160) && p.negocio.trim().length > 0
    && opt(p.segmento, 80) && opt(p.tipo, 80) && opt(p.estilo, 80)
    && (p.recursos === undefined || (Array.isArray(p.recursos) && p.recursos.length <= 12 && p.recursos.every((x) => txt(x, 80))))
    && opt(p.logo, 30) && opt(p.dominio, 30) && opt(p.orcamento, 40) && opt(p.prazo, 40)
    && opt(p.refs, 500) && opt(p.msg, 2000);
}
async function limitar(chave, max, seg) {
  const [n] = await pipe([['INCR', chave], ['EXPIRE', chave, String(seg), 'NX']]);
  if (n > max) throw new Erro(429, 'Muitas tentativas. Tente de novo mais tarde.');
}
const diaOk = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/* ---------- ações ---------- */
const GET = {
  // conteúdo público do site
  async site() {
    const [c, p] = await pipe([['GET', 'site:conteudo'], ['HGETALL', 'projetos']]);
    return { conteudo: json(c), projetos: hashLista(p) };
  },
  // está logado?
  async eu(req) { return { owner: ehAdmin(req) }; },
  // tudo do painel
  async admin(req, q) {
    exigirAdmin(req);
    const dias = String(q.dias || '').split(',').filter(diaOk).slice(0, 31);
    const r = await pipe([
      ['GET', 'site:conteudo'], ['HGETALL', 'projetos'], ['HGETALL', 'clientes'], ['HGETALL', 'pedidos'],
      ['GET', 'site:iniciado'], ['GET', 'vis:total'], ...dias.map((d) => ['GET', 'vis:' + d])
    ]);
    const porDia = {}; dias.forEach((d, i) => { porDia[d] = Number(r[6 + i]) || 0; });
    return {
      conteudo: json(r[0]), projetos: hashLista(r[1]), clientes: hashLista(r[2]),
      pedidos: hashLista(r[3]).sort((a, b) => (b.t || 0) - (a.t || 0)),
      iniciado: !!r[4], visitas: { total: Number(r[5]) || 0, dias: porDia }
    };
  }
};

const POST = {
  async login(req, b, res) {
    const senha = process.env.ADMIN_PASSWORD;
    if (!senha) throw new Erro(503, 'ADMIN_PASSWORD não configurada');
    await limitar('login:' + ip(req), 10, 900);
    const a = crypto.createHash('sha256').update(String(b.senha || '')).digest();
    const e = crypto.createHash('sha256').update(senha).digest();
    if (!crypto.timingSafeEqual(a, e)) throw new Erro(403, 'Senha incorreta.');
    criarSessao(res);
    return { ok: true };
  },
  async logout(req, b, res) { apagarSessao(res); return { ok: true }; },

  // formulário de orçamento (público)
  async pedido(req, b) {
    const p = { ...(b.item || {}) }; delete p.src; delete p.id;
    p.status = 'novo'; p.t = Date.now();
    if (!validarPedido(p)) throw new Erro(400, 'Pedido inválido');
    await limitar('ped:' + ip(req), 20, 3600);
    await redis('HSET', 'pedidos', uid(), JSON.stringify(p));
    return { ok: true };
  },
  // contador de visitas (público)
  async visita(req, b) {
    const d = b.dia;
    if (!diaOk(d)) throw new Erro(400, 'Dia inválido');
    await pipe([['INCR', 'vis:total'], ['INCR', 'vis:' + d]]);
    return { ok: true };
  },

  /* --- só o painel --- */
  async salvar(req, b) {
    exigirAdmin(req);
    const col = b.col, it = b.item || {};
    if (!COLS.includes(col)) throw new Erro(400, 'Coleção inválida');
    if (col === 'pedidos') {
      if (!idOk(it.id)) throw new Erro(400, 'id');
      const atual = json(await redis('HGET', 'pedidos', it.id));
      if (!atual) throw new Erro(404, 'Pedido não encontrado');
      atual.status = String(it.status || '').slice(0, 40);
      await redis('HSET', 'pedidos', it.id, JSON.stringify(atual));
      return { id: it.id };
    }
    const id = it.src === 'novo' || !idOk(it.id) ? uid() : it.id;
    const dado = JSON.stringify(limpo(it));
    if (dado.length > 200000) throw new Erro(413, 'Registro grande demais');
    await redis('HSET', col, id, dado);
    return { id };
  },
  async apagar(req, b) {
    exigirAdmin(req);
    if (!COLS.includes(b.col) || !idOk(b.id)) throw new Erro(400, 'Parâmetros inválidos');
    await redis('HDEL', b.col, b.id);
    return { ok: true };
  },
  async conteudo(req, b) {
    exigirAdmin(req);
    const s = JSON.stringify(b.conteudo || {});
    if (s.length > 200000) throw new Erro(413, 'Conteúdo grande demais');
    await redis('SET', 'site:conteudo', s);
    return { ok: true };
  },
  // primeira vez: grava os projetos e clientes de exemplo
  async iniciar(req, b) {
    exigirAdmin(req);
    const cmds = [];
    for (const col of ['projetos', 'clientes']) for (const it of (b[col] || []).slice(0, 100)) if (idOk(it.id)) cmds.push(['HSETNX', col, it.id, JSON.stringify(limpo(it))]);
    cmds.push(['SET', 'site:iniciado', '1']);
    await pipe(cmds);
    return { ok: true };
  },
  async importar(req, b) {
    exigirAdmin(req);
    const d = b.dados || {}, cmds = [];
    if (d.conteudo) cmds.push(['SET', 'site:conteudo', JSON.stringify(d.conteudo)]);
    for (const col of ['projetos', 'clientes']) for (const it of (d[col] || []).slice(0, 500)) cmds.push(['HSET', col, idOk(it.id) ? it.id : uid(), JSON.stringify(limpo(it))]);
    await pipe(cmds);
    return { ok: true };
  },
  async img(req, b) {
    exigirAdmin(req);
    const d = String(b.data || '');
    if (!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(d)) throw new Erro(400, 'Imagem inválida');
    if (d.length > 1000000) throw new Erro(413, 'Imagem grande demais');
    const id = uid();
    await redis('SET', 'img:' + id, d);
    return { id };
  }
};

/* ---------- handler ---------- */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = req.query || {}, a = String(q.a || '');
    // imagem: devolve o arquivo em si, com cache longo (cada envio gera um id novo)
    if (req.method === 'GET' && a === 'img') {
      if (!idOk(q.id)) throw new Erro(400, 'id');
      const d = await redis('GET', 'img:' + q.id);
      const m = /^data:(image\/[\w+]+);base64,(.+)$/.exec(d || '');
      if (!m) throw new Erro(404, 'Imagem não encontrada');
      res.setHeader('Content-Type', m[1]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(Buffer.from(m[2], 'base64'));
    }
    let fn;
    if (req.method === 'GET') fn = GET[a];
    else if (req.method === 'POST') {
      // só aceita JSON (junto com o cookie SameSite=Strict, bloqueia envios de outros sites)
      if (!String(req.headers['content-type'] || '').includes('application/json')) throw new Erro(415, 'Use JSON');
      fn = POST[a];
    }
    if (!fn) throw new Erro(404, 'Ação desconhecida');
    const out = await fn(req, req.method === 'POST' ? corpo(req) : q, res);
    return res.status(200).json(out);
  } catch (e) {
    const st = e.status || 500;
    if (st === 500) console.error('[api/dados]', e);
    return res.status(st).json({ erro: st === 500 ? 'Erro no servidor' : e.message });
  }
}
