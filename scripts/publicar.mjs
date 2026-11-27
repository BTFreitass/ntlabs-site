// Publica o site da NT Labs no Firebase.
// Uso: node scripts/publicar.mjs   (ou dê duplo clique em publicar-firebase.bat)
// O que faz: escolhe o projeto, cria o app Web (se faltar), grava a configuração,
// cria o banco Firestore (se faltar) e publica o site + regras de segurança.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(raiz);
const PROJETO = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
const APP_NOME = 'NT Labs Site';
const REGIAO = 'southamerica-east1';
const FB = 'npx --yes firebase-tools@13';

const passo = (t) => console.log(`\n=== ${t} ===`);
function fb(args, { json = false, ok = false } = {}) {
  const cmd = `${FB} ${args} --project ${PROJETO}${json ? ' --json' : ''}`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: json ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: true });
    if (!json) return null;
    return JSON.parse(out.slice(out.indexOf('{')));
  } catch (e) {
    if (ok) return null;
    console.error(`\nFalhou: ${cmd}\n${e.stdout || ''}${e.stderr || ''}`);
    process.exit(1);
  }
}

passo(`Projeto: ${PROJETO}`);
try { execSync(`${FB} projects:list --json`, { stdio: 'ignore', shell: true }); }
catch { console.log('Você precisa entrar na sua conta Google do Firebase.'); execSync(`${FB} login`, { stdio: 'inherit', shell: true }); }

passo('App Web');
let apps = fb('apps:list WEB', { json: true })?.result || [];
let app = apps.find((a) => a.displayName === APP_NOME);
if (!app) {
  console.log(`Criando o app "${APP_NOME}"...`);
  app = fb(`apps:create WEB "${APP_NOME}"`, { json: true })?.result;
}
console.log('App:', app.appId);

passo('Configuração');
const sdk = fb(`apps:sdkconfig WEB ${app.appId}`, { json: true })?.result || {};
let cfg = sdk.sdkConfig;
if (!cfg && sdk.fileContents) { const m = sdk.fileContents.match(/\{[\s\S]*\}/); cfg = m ? JSON.parse(m[0]) : null; }
if (!cfg || !cfg.apiKey) { console.error('Não consegui ler a configuração do app.'); process.exit(1); }
const arq = 'public/firebase-config.js';
const atual = readFileSync(arq, 'utf8');
const email = (atual.match(/NT_ADMIN_EMAIL\s*=\s*"([^"]+)"/) || [])[1] || 'brunotavaresdefreitas@gmail.com';
writeFileSync(arq, `/* Configuração do Firebase (gerada por scripts/publicar.mjs).
   Esses valores são públicos por natureza; a proteção dos dados está em firestore.rules. */
window.NT_FIREBASE = ${JSON.stringify({ apiKey: cfg.apiKey, authDomain: cfg.authDomain, projectId: cfg.projectId, storageBucket: cfg.storageBucket, messagingSenderId: cfg.messagingSenderId, appId: cfg.appId }, null, 2)};
/* Única conta Google com acesso ao painel (tem que ser a mesma de firestore.rules). */
window.NT_ADMIN_EMAIL = "${email}";
`);
console.log('Gravado em', arq);

passo('Banco Firestore');
const dbs = fb('firestore:databases:list', { json: true, ok: true })?.result || [];
if (!dbs.some((d) => String(d.name || '').endsWith('/(default)'))) {
  console.log(`Criando o banco em ${REGIAO}...`);
  fb(`firestore:databases:create "(default)" --location ${REGIAO}`);
} else console.log('Banco já existe.');

passo('Site no Hosting');
const SITE_PREF = 'ntlabs-dev-br';
const conf = JSON.parse(readFileSync('firebase.json', 'utf8'));
const sites = (fb('hosting:sites:list', { json: true, ok: true })?.result?.sites || []).map((x) => String(x.name || '').split('/').pop());
let site = conf.hosting.site && sites.includes(conf.hosting.site) ? conf.hosting.site : sites.find((x) => x === SITE_PREF);
if (!site) {
  for (const tent of [SITE_PREF, 'ntlabs-site', 'ntlabs-' + Math.random().toString(36).slice(2, 7)]) {
    console.log(`Criando o site "${tent}"...`);
    if (fb(`hosting:sites:create ${tent}`, { json: true, ok: true })) { site = tent; break; }
  }
}
if (!site) { console.error('Não consegui criar um site no Hosting.'); process.exit(1); }
if (conf.hosting.site !== site) { conf.hosting.site = site; writeFileSync('firebase.json', JSON.stringify(conf, null, 2) + '\n'); }
console.log('Site:', site);

passo('Publicando site e regras');
fb('deploy --only hosting,firestore:rules');

console.log(`
Pronto! Site no ar em: https://${site}.web.app

Falta só uma coisa para o painel (/#painel) funcionar:
  Firebase Console > Authentication > Método de login > Google > Ativar
  https://console.firebase.google.com/project/${PROJETO}/authentication/providers
Depois, para usar o domínio: Hosting > Adicionar domínio personalizado > ntlabs.dev.br
`);
