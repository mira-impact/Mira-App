import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.MIRA_COLETA_ESPERA_MS = '0';
const vaga = (t: string) => `<html><script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title: t, description: 'x', hiringOrganization: { name: 'Loja' } })}</script></html>`;
const SITE: Record<string, [number, string]> = {
  '/robots.txt': [200, 'User-agent: *\nDisallow: /vagas/interna\nSitemap: http://HOST/sitemap.xml'],
  '/carreiras': [200, '<a href="/vagas/1">a</a><a href="/vagas/2">b</a><a href="/vagas/interna">c</a><a href="/vagas/3">d</a>'],
  '/vagas/1': [200, vaga('Jovem Aprendiz Caixa')],
  '/vagas/2': [200, vaga('Analista Sênior')],
  '/vagas/3': [200, '<html>sem dados estruturados</html>'],
  '/vagas/interna': [200, vaga('NÃO DEVIA SER LIDA')],
  '/so-js': [200, '<div id="root"></div>'],
  '/sitemap.xml': [200, '<urlset><url><loc>http://HOST/vagas/1</loc></url></urlset>'],
};
const visitas: string[] = [];
const srv = http.createServer((req, res) => { visitas.push(req.url!); const [st, corpo] = SITE[req.url!] || [404, 'não']; res.writeHead(st, { 'content-type': 'text/html' }); res.end(corpo.replaceAll('HOST', `127.0.0.1:${(srv.address() as any).port}`)); });

test('rastreia com educação: obedece robots, acha vagas, cai no sitemap quando a página não tem links', async () => {
  await new Promise<void>(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(srv.address() as any).port}`;
  const { rastrearFonte, AGENTE } = await import('../lib/coleta/rastrear');
  const r = await rastrearFonte(`${base}/carreiras`);
  assert.equal(r.situacao, 'ok');
  assert.deepEqual(r.vagas.map(v => v.titulo).sort(), ['Analista Sênior', 'Jovem Aprendiz Caixa']);
  assert.ok(!visitas.includes('/vagas/interna'), 'robots.txt proibiu');
  const r2 = await rastrearFonte(`${base}/so-js`);
  assert.deepEqual(r2.vagas.map(v => v.titulo), ['Jovem Aprendiz Caixa'], 'achou pelo sitemap');
  const r3 = await rastrearFonte(`${base}/carreiras`, { maxPaginas: 2 });
  assert.ok(r3.paginasAbertas <= 2, 'respeita o limite de páginas');
  assert.match(AGENTE, /^MIRA-bot\/1\.0/);
  srv.close();
});
