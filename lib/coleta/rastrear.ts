// Visita uma fonte (página de carreiras de uma empresa) com educação e devolve as vagas em JobPosting.
// Educação = obedece o robots.txt, se identifica, espera entre pedidos, limita o tamanho e a quantidade.
import { lerRobots, permitido, ROBO, type Robots } from './robots';
import { extrairJobPostings as soJsonLd, extrairMicrodados, linksDeVagas, lerSitemap, diagnosticar, type VagaBruta } from './jobposting';
import { ehGupy, extrairGupy, linksGupy, canonicoGupy } from './gupy';
/** Tenta, nesta ordem: JSON-LD (padrão), microdados (padrão), dados internos da Gupy. */
const extrairJobPostings = (html: string, url: string): VagaBruta[] => {
  const a = soJsonLd(html, url).map(v => ({ ...v, metodo: 'jsonld' as const }));
  if (a.length) return a;
  const b = extrairMicrodados(html, url).map(v => ({ ...v, metodo: 'microdados' as const }));
  if (b.length) return b;
  return extrairGupy(html, url).map(v => ({ ...v, metodo: 'gupy' as const }));
};

export const AGENTE = `${ROBO}/1.0 (+${process.env.MIRA_CONTATO_URL || 'https://mira-alpha-one.vercel.app'})`;
const MAX_BYTES = 2_000_000;
const ESPERA_MIN = Number(process.env.MIRA_COLETA_ESPERA_MS ?? 1000); // 1 s entre pedidos ao mesmo site (só os testes baixam isso)

const ultimoPorHost = new Map<string, number>();
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function baixar(url: string, esperaSeg = 1): Promise<{ status: number; texto: string } | null> {
  const host = new URL(url).host, espera = Math.max(ESPERA_MIN, esperaSeg * 1000);
  const falta = (ultimoPorHost.get(host) || 0) + espera - Date.now();
  if (falta > 0) await dormir(falta);
  ultimoPorHost.set(host, Date.now());
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5', 'Accept-Language': 'pt-BR,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return { status: r.status, texto: new TextDecoder().decode(buf.slice(0, MAX_BYTES)) };
    return { status: r.status, texto: new TextDecoder().decode(buf) };
  } catch { return null; }
}

const robotsCache = new Map<string, Robots | 'erro'>();
export async function robotsDe(url: string): Promise<Robots | 'erro'> {
  const origem = new URL(url).origin;
  if (robotsCache.has(origem)) return robotsCache.get(origem)!;
  const r = await baixar(`${origem}/robots.txt`);
  // sem robots.txt (404) = pode tudo; servidor fora do ar ou erro 5xx = não arrisca
  const v: Robots | 'erro' = !r ? 'erro' : r.status >= 500 ? 'erro' : r.status >= 400 ? { regras: [], sitemaps: [] } : lerRobots(r.texto);
  robotsCache.set(origem, v);
  return v;
}

export type ResultadoFonte = {
  fonte: string;
  situacao: 'ok' | 'bloqueado-robots' | 'fora-do-ar' | 'sem-jobposting' | 'sem-links';
  paginasAbertas: number;
  vagas: VagaBruta[];
  amostraLinks: string[];
  diagnostico?: ReturnType<typeof diagnosticar> & { url: string; html: string };
};

/** Abre a página da fonte; se ela não tiver JobPosting, procura links de vagas (na página e no sitemap) e abre até `maxPaginas`. */
export async function rastrearFonte(fonte: string, o: { maxPaginas?: number; ignorar?: Set<string>; empresa?: string } = {}): Promise<ResultadoFonte> {
  const max = o.maxPaginas ?? 15, base: ResultadoFonte = { fonte, situacao: 'ok', paginasAbertas: 0, vagas: [], amostraLinks: [] };
  const robots = await robotsDe(fonte);
  if (robots === 'erro') return { ...base, situacao: 'fora-do-ar' };
  if (!permitido(robots, fonte)) return { ...base, situacao: 'bloqueado-robots' };
  const pg = await baixar(fonte, robots.espera); base.paginasAbertas++;
  if (!pg || pg.status >= 400) return { ...base, situacao: 'fora-do-ar' };

  const vagas = extrairJobPostings(pg.texto, fonte);
  let links = [...new Set([...linksDeVagas(pg.texto, fonte), ...linksGupy(pg.texto, fonte)].map(l => (ehGupy(l) ? canonicoGupy(l) : l)))];
  // poucos links na página (sites montados por JavaScript): tenta o sitemap
  if (links.length < 3) {
    const host = new URL(fonte).host;
    const mapas = robots.sitemaps.length ? robots.sitemaps : [`${new URL(fonte).origin}/sitemap.xml`];
    for (const m of mapas.slice(0, 3)) {
      if (!permitido(robots, m)) continue;
      const sm = await baixar(m, robots.espera); base.paginasAbertas++;
      if (!sm || sm.status >= 400) continue;
      const { paginas, sitemaps } = lerSitemap(sm.texto);
      for (const filho of sitemaps.filter(s => /job|vaga/i.test(s)).slice(0, 2)) {
        const f = await baixar(filho, robots.espera); base.paginasAbertas++;
        if (f && f.status < 400) paginas.push(...lerSitemap(f.texto).paginas);
      }
      links.push(...paginas.filter(p => { try { return new URL(p).host === host; } catch { return false; } }).filter(p => /\/(jobs?|vagas?|oportunidades?|positions?)\//i.test(p)));
    }
    links = [...new Set(links)];
  }
  base.amostraLinks = links.slice(0, 5);
  const jaTenho = new Set([...vagas.map(v => v.url), ...(o.ignorar || [])]);
  links = links.filter(l => !jaTenho.has(l)); // a vaga da própria página já foi lida
  for (const l of links) {
    if (base.paginasAbertas >= max) break;
    if (jaTenho.has(l) || !permitido(robots, l)) continue;
    const p = await baixar(l, robots.espera); base.paginasAbertas++;
    if (!p || p.status >= 400) continue;
    for (const v of extrairJobPostings(p.texto, l)) if (!jaTenho.has(v.url)) { jaTenho.add(v.url); vagas.push(v); }
  }
  // a página de vaga da Gupy não traz o nome da empresa, só o endereço (ex.: redemoura): usa o nome da lista de fontes
  if (o.empresa) for (const v of vagas) if (v.metodo === 'gupy' && v.empresa === new URL(v.url).hostname.split('.')[0]) v.empresa = o.empresa;
  if (!vagas.length) { // guarda o retrato de uma página para o diagnóstico
    const alvo = /\/(jobs?|vagas?)\//i.test(new URL(fonte).pathname) ? fonte : links[0];
    const d = alvo === fonte ? pg : alvo ? await baixar(alvo, robots.espera) : null;
    if (d && alvo) base.diagnostico = { ...diagnosticar(d.texto), url: alvo, html: d.texto };
  }
  return { ...base, vagas, situacao: vagas.length ? 'ok' : links.length ? 'sem-jobposting' : 'sem-links' };
}
