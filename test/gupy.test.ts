import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairGupy, canonicoGupy, linksGupy, ehGupy } from '../lib/coleta/gupy';
import { pareceEntrada } from '../lib/coleta/jobposting';

const pagina = (pageProps: object) => `<html><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script></body></html>`;
// mesmo formato que o diagnóstico mostrou: pageProps.job{id,name,description,prerequisites,addressCity,addressStateShortName,...}
const VAGA = { job: { id: 12785699, name: 'Jovem Aprendiz - Loja', description: '<p>Atender clientes &amp; repor produtos</p>', prerequisites: '<ul><li>Ensino médio completo</li></ul>', handicapped: false, addressCity: 'São Paulo', addressState: 'São Paulo', addressStateShortName: 'SP', addressCountry: 'Brasil', type: 'vacancy_type_apprentice', publishedDate: '2026-11-20T12:00:00.000Z', applicationDeadline: '2026-12-15' }, subdomain: 'redemoura', canonicalUrl: 'https://redemoura.gupy.io/jobs/12785699' };

test('reconhece endereços da Gupy', () => {
  assert.ok(ehGupy('https://redemoura.gupy.io/jobs/1'));
  assert.ok(!ehGupy('https://portal.gupy.io/job-search'));
  assert.ok(!ehGupy('https://exemplo.com/vagas/1'));
});

test('os dois formatos de link viram o mesmo endereço', () => {
  assert.equal(canonicoGupy('https://redemoura.gupy.io/job/eyJqb2JJZCI6MTI3ODU2OTksInNvdXJjZSI6Imd1cHlfcG9ydGFsIn0=?jobBoardSource=gupy_portal'), 'https://redemoura.gupy.io/jobs/12785699');
  assert.equal(canonicoGupy('https://redemoura.gupy.io/jobs/12785699?jobBoardSource=gupy_public_page'), 'https://redemoura.gupy.io/jobs/12785699');
});

test('lê a vaga do bloco interno da página', () => {
  const [v] = extrairGupy(pagina(VAGA), 'https://redemoura.gupy.io/job/abc?jobBoardSource=gupy_portal');
  assert.equal(v.titulo, 'Jovem Aprendiz - Loja');
  assert.equal(v.url, 'https://redemoura.gupy.io/jobs/12785699');
  assert.equal(v.empresa, 'redemoura');
  assert.equal(v.cidade, 'São Paulo · SP');
  assert.match(v.descricao, /Atender clientes & repor produtos[\s\S]*Ensino médio completo/);
  assert.equal(v.publicadaEm, '2026-11-20');
  assert.equal(v.validaAte, '2026-12-15');
  assert.ok(pareceEntrada(v));
  assert.deepEqual(extrairGupy(pagina({ outra: 1 }), 'https://x.gupy.io/jobs/1'), []);
  assert.deepEqual(extrairGupy(pagina(VAGA), 'https://exemplo.com/jobs/1'), [], 'só em sites da Gupy');
});

test('acha a lista de vagas na página inicial da empresa', () => {
  const L = linksGupy(pagina({ careerPage: { name: 'Rede Moura' }, jobs: [{ id: 12785699, name: 'Aprendiz' }, { id: 12931619, title: 'Estágio' }, { id: 7, name: 'id curto não é vaga' }] }), 'https://redemoura.gupy.io/');
  assert.deepEqual(L.sort(), ['https://redemoura.gupy.io/jobs/12785699', 'https://redemoura.gupy.io/jobs/12931619']);
});

test('rastreia uma empresa da Gupy pela página inicial (rede simulada)', async () => {
  process.env.MIRA_COLETA_ESPERA_MS = '0';
  const paginas: Record<string, string> = {
    'https://redemoura.gupy.io/robots.txt': 'User-agent: *\nDisallow: /candidates\n',
    'https://redemoura.gupy.io/': pagina({ careerPage: { name: 'Rede Moura' }, jobs: [{ id: 12785699, name: 'Aprendiz' }, { id: 222222, name: 'Gerente' }] }),
    'https://redemoura.gupy.io/jobs/12785699': pagina(VAGA),
    'https://redemoura.gupy.io/jobs/222222': pagina({ job: { id: 222222, name: 'Gerente de Loja', description: 'x' } }),
  };
  const original = globalThis.fetch;
  globalThis.fetch = (async (u: string) => { const t = paginas[String(u)]; return new Response(t ?? 'não', { status: t ? 200 : 404 }); }) as typeof fetch;
  try {
    const { rastrearFonte } = await import('../lib/coleta/rastrear');
    const r = await rastrearFonte('https://redemoura.gupy.io/', { empresa: 'Rede Moura' });
    assert.equal(r.situacao, 'ok');
    assert.deepEqual(r.vagas.map(v => v.titulo).sort(), ['Gerente de Loja', 'Jovem Aprendiz - Loja']);
    assert.ok(r.vagas.every(v => v.metodo === 'gupy'));
    assert.equal(r.vagas.find(v => v.titulo.startsWith('Jovem'))!.empresa, 'Rede Moura');
  } finally { globalThis.fetch = original; }
});
