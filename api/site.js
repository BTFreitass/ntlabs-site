import { getConteudo, getProjetos, json } from './_lib.js';

/* Conteúdo público do site: textos, serviços e projetos visíveis. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { erro: 'Método não permitido' });
  const [conteudo, projetos] = await Promise.all([getConteudo(), getProjetos()]);
  const pub = projetos
    .filter((p) => p.visivel !== false)
    .map(({ cliente, ...p }) => p);
  json(res, 200, { conteudo, projetos: pub }, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=120' });
}
