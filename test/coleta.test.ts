import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairJobPostings, pareceEntrada, linksDeVagas, lerSitemap, textoLimpo } from '../lib/coleta/jobposting';
import { lerRobots, permitido } from '../lib/coleta/robots';

const pagina = (json: string) => `<html><head><script type="application/ld+json">${json}</script></head><body>oi</body></html>`;

test('lê um JobPosting simples', () => {
  const v = extrairJobPostings(pagina(JSON.stringify({
    '@context': 'https://schema.org/', '@type': 'JobPosting', title: 'Jovem Aprendiz &#8211; Administrativo',
    description: '<p>Requisitos:<br>Ensino médio completo</p><ul><li>Manhã</li></ul>', datePosted: '2026-11-20T10:00:00-03:00', validThrough: '2026-12-20',
    employmentType: 'INTERN', hiringOrganization: { '@type': 'Organization', name: 'Rede Exemplo' },
    jobLocation: { '@type': 'Place', address: { addressLocality: 'São Paulo', addressRegion: 'SP' } },
  })), 'https://ex.com/vagas/1');
  assert.equal(v.length, 1);
  assert.equal(v[0].titulo, 'Jovem Aprendiz – Administrativo');
  assert.equal(v[0].empresa, 'Rede Exemplo');
  assert.equal(v[0].cidade, 'São Paulo · SP');
  assert.equal(v[0].publicadaEm, '2026-11-20');
  assert.equal(v[0].validaAte, '2026-12-20');
  assert.match(v[0].descricao, /Ensino médio completo\nManhã/);
  assert.equal(v[0].url, 'https://ex.com/vagas/1');
});

test('acha JobPosting dentro de @graph e de listas, ignora JSON quebrado e outros tipos', () => {
  const html = pagina('{quebrado') + pagina(JSON.stringify({ '@graph': [{ '@type': 'Organization', name: 'X' }, { '@type': ['JobPosting'], title: 'Estagiário' }] }))
    + pagina(JSON.stringify([{ '@type': 'JobPosting', title: 'Repositor', url: 'https://ex.com/jobs/9' }, { '@type': 'JobPosting' }]));
  const v = extrairJobPostings(html, 'https://ex.com/');
  assert.deepEqual(v.map(x => x.titulo), ['Estagiário', 'Repositor']);
  assert.equal(v[1].url, 'https://ex.com/jobs/9');
});

test('filtro de entrada', () => {
  assert.ok(pareceEntrada({ titulo: 'Programa Jovem Aprendiz 2027', descricao: '' }));
  assert.ok(pareceEntrada({ titulo: 'Estágio em Atendimento', descricao: '' }));
  assert.ok(pareceEntrada({ titulo: 'Auxiliar', descricao: 'Vaga pelo programa de aprendizagem', tipoContrato: 'FULL_TIME' }));
  assert.ok(!pareceEntrada({ titulo: 'Analista Sênior de Dados', descricao: 'aprendiz' }));
  assert.ok(pareceEntrada({ titulo: 'Operador(a) de Caixa', descricao: 'Não exigimos experiência anterior.' }), 'cargo de entrada passa para o Gemini avaliar');
  assert.ok(pareceEntrada({ titulo: 'Estagiário de Engenharia', descricao: 'Cursando ensino superior' }), 'estágio de faculdade também');
  assert.ok(!pareceEntrada({ titulo: 'Coordenador de Loja', descricao: '' }));
  assert.ok(!pareceEntrada({ titulo: 'Atendente', descricao: 'Requisitos: experiência comprovada em atendimento' }));
  assert.ok(!pareceEntrada({ titulo: 'Auxiliar Administrativo', descricao: 'Ensino superior completo em Administração' }));
  assert.ok(!pareceEntrada({ titulo: 'Vendedor', descricao: 'experiência de 2 anos' }));
});

test('acha links de vagas do mesmo site, inclusive dentro de JSON do Next.js', () => {
  const html = `<a href="/vagas/123">x</a><a href="https://outro.com/jobs/1">y</a><a href="/sobre">z</a>
    <script id="__NEXT_DATA__">{"jobs":[{"url":"https:\\/\\/empresa.exemplo.io\\/jobs\\/456?jobBoardSource=x"},{"path":"/job/eyJqb2JJZCI6MX0="}]}</script><img src="/vagas/foto.png">`;
  const L = linksDeVagas(html, 'https://empresa.exemplo.io/');
  assert.ok(L.includes('https://empresa.exemplo.io/vagas/123'));
  assert.ok(L.some(l => l.startsWith('https://empresa.exemplo.io/jobs/456')));
  assert.ok(L.includes('https://empresa.exemplo.io/job/eyJqb2JJZCI6MX0='));
  assert.ok(!L.some(l => l.includes('outro.com') || l.endsWith('.png') || l.endsWith('/sobre')));
});

test('sitemap', () => {
  const s = lerSitemap('<urlset><url><loc>https://ex.com/vagas/1</loc></url><url><loc> https://ex.com/a?x=1&amp;y=2 </loc></url></urlset><sitemapindex><sitemap><loc>https://ex.com/sitemap-jobs.xml</loc></sitemap></sitemapindex>');
  assert.deepEqual(s.paginas, ['https://ex.com/vagas/1', 'https://ex.com/a?x=1&y=2']);
  assert.deepEqual(s.sitemaps, ['https://ex.com/sitemap-jobs.xml']);
});

test('robots.txt: grupo próprio vence o *, regra mais longa vence, Allow empata a favor', () => {
  const r = lerRobots(`# comentário
User-agent: *
Disallow: /
Sitemap: https://ex.com/sitemap.xml

User-agent: MIRA-bot
User-agent: outro
Disallow: /admin
Allow: /vagas/
Disallow: /vagas/privadas
Disallow: /*.pdf$
Crawl-delay: 3`);
  assert.ok(permitido(r, 'https://ex.com/vagas/1'));
  assert.ok(!permitido(r, 'https://ex.com/vagas/privadas/2'));
  assert.ok(!permitido(r, 'https://ex.com/admin/x'));
  assert.ok(!permitido(r, 'https://ex.com/edital.pdf'));
  assert.ok(permitido(r, 'https://ex.com/edital.pdf?v=1'));
  assert.equal(r.espera, 3);
  assert.deepEqual(r.sitemaps, ['https://ex.com/sitemap.xml']);
  const todos = lerRobots('User-agent: *\nDisallow: /');
  assert.ok(!permitido(todos, 'https://ex.com/vagas/1'), 'bloqueio geral vale para a MIRA');
  assert.ok(permitido(lerRobots(''), 'https://ex.com/qualquer'), 'sem regras = pode');
});

test('texto limpo tira HTML e entidades', () => {
  assert.equal(textoLimpo('<b>Olá</b>&nbsp;&amp; <script>x()</script>tchau'), 'Olá & tchau');
});

import { extrairMicrodados, diagnosticar } from '../lib/coleta/jobposting';
test('lê JobPosting em microdados', () => {
  const html = `<div itemscope itemtype="https://schema.org/JobPosting"><h1 itemprop="title">Jovem Aprendiz Loja</h1>
    <meta itemprop="datePosted" content="2026-11-20"><div itemprop="description"><p>Ensino médio</p></div>
    <span itemprop="hiringOrganization" itemscope itemtype="https://schema.org/Organization"><span itemprop="name">Loja X</span></span>
    <span itemprop="addressLocality">São Paulo</span></div>`;
  const v = extrairMicrodados(html, 'https://ex.com/vagas/1');
  assert.equal(v.length, 1);
  assert.equal(v[0].titulo, 'Jovem Aprendiz Loja');
  assert.equal(v[0].empresa, 'Loja X');
  assert.equal(v[0].publicadaEm, '2026-11-20');
  assert.equal(v[0].cidade, 'São Paulo');
});
test('diagnóstico descreve a página', () => {
  const d = diagnosticar(`<script type="application/ld+json">{"@type":"Organization"}</script><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"job":{"name":"x","description":"y"},"careerPage":{}}}}</script><script src="/_next/static/a.js"></script>`);
  assert.deepEqual(d.jsonLd, ['Organization']);
  assert.ok(d.nextData && d.scriptsNext);
  assert.ok(d.nextChaves.includes('job{name,description}'));
});
