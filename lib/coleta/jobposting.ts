// Lê vagas publicadas no formato padrão JobPosting (schema.org), o mesmo que o Google usa
// para mostrar vagas na busca. Funções puras: recebem HTML, devolvem dados. Testes em test/coleta.test.ts

export type VagaBruta = {
  url: string;
  titulo: string;
  empresa: string;
  cidade: string;
  descricao: string;        // texto limpo, sem HTML
  publicadaEm?: string;     // AAAA-MM-DD
  validaAte?: string;       // AAAA-MM-DD
  tipoContrato?: string;    // employmentType, ex.: INTERN, FULL_TIME
  metodo?: 'jsonld' | 'microdados' | 'gupy'; // como a vaga foi lida
};

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
export function textoLimpo(html: string): string {
  return String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|div|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTIDADES[e.toLowerCase()] ?? m)
    .replace(/[ \t\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const dia = (x: unknown) => { const m = typeof x === 'string' ? x.match(/^\d{4}-\d{2}-\d{2}/) : null; return m ? m[0] : undefined; };
const tipos = (o: any): string[] => (Array.isArray(o?.['@type']) ? o['@type'] : [o?.['@type']]).map(String);

/** Acha todos os objetos JobPosting em blocos <script type="application/ld+json">, inclusive dentro de @graph ou listas. */
export function extrairJobPostings(html: string, url: string): VagaBruta[] {
  const out: VagaBruta[] = [];
  const blocos = String(html || '').matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const b of blocos) {
    let dados: unknown;
    try { dados = JSON.parse(b[1].trim().replace(/^<!--|-->$/g, '')); } catch { continue; } // JSON quebrado: ignora o bloco
    const fila: unknown[] = [dados];
    while (fila.length) {
      const o = fila.shift() as any;
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o)) { fila.push(...o); continue; }
      if (Array.isArray(o['@graph'])) fila.push(...o['@graph']);
      if (!tipos(o).includes('JobPosting')) continue;
      const loc = Array.isArray(o.jobLocation) ? o.jobLocation[0] : o.jobLocation;
      const end = loc?.address || {};
      const org = Array.isArray(o.hiringOrganization) ? o.hiringOrganization[0] : o.hiringOrganization;
      const titulo = textoLimpo(o.title || o.name || '');
      if (!titulo) continue;
      out.push({
        url: typeof o.url === 'string' && /^https?:\/\//.test(o.url) ? o.url : url,
        titulo,
        empresa: textoLimpo(typeof org === 'string' ? org : org?.name || ''),
        cidade: textoLimpo([end.addressLocality, end.addressRegion].filter(Boolean).join(' · ') || (o.jobLocationType === 'TELECOMMUTE' ? 'Remoto' : '')),
        descricao: textoLimpo(o.description || '').slice(0, 12000),
        publicadaEm: dia(o.datePosted),
        validaAte: dia(o.validThrough),
        tipoContrato: Array.isArray(o.employmentType) ? o.employmentType.join(',') : o.employmentType || undefined,
      });
    }
  }
  return out;
}

/** Mesmo formato, escrito como microdados (itemtype=".../JobPosting" + itemprop=...) em vez de JSON-LD. */
export function extrairMicrodados(html: string, url: string): VagaBruta[] {
  const out: VagaBruta[] = [], h = String(html || '');
  const re = /<([a-z0-9]+)[^>]*itemtype\s*=\s*["'][^"']*schema\.org\/JobPosting["'][^>]*>/gi;
  for (const m of h.matchAll(re)) {
    const bloco = h.slice(m.index!, m.index! + 60000);
    const prop = (nome: string) => {
      const a = bloco.match(new RegExp(`<[^>]*itemprop\\s*=\\s*["']${nome}["'][^>]*content\\s*=\\s*["']([^"']*)["']`, 'i'))
        || bloco.match(new RegExp(`<[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*itemprop\\s*=\\s*["']${nome}["']`, 'i'));
      if (a) return textoLimpo(a[1]);
      const b = bloco.match(new RegExp(`<([a-z0-9]+)[^>]*itemprop\\s*=\\s*["']${nome}["'][^>]*>([\\s\\S]*?)</\\1>`, 'i'));
      return b ? textoLimpo(b[2]) : '';
    };
    const titulo = prop('title');
    if (!titulo) continue;
    out.push({ url, titulo, empresa: prop('name'), cidade: [prop('addressLocality'), prop('addressRegion')].filter(Boolean).join(' · '),
      descricao: prop('description').slice(0, 12000), publicadaEm: prop('datePosted').slice(0, 10) || undefined, validaAte: prop('validThrough').slice(0, 10) || undefined, tipoContrato: prop('employmentType') || undefined });
  }
  return out;
}

/** O que a página tem de dados estruturados: para o diagnóstico do npm run fontes. */
export function diagnosticar(html: string) {
  const h = String(html || '');
  const tiposLd = [...h.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(b => [...b[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]*")/g)].map(t => t[1].replace(/["\[\]\s]/g, '')));
  const microdados = [...h.matchAll(/itemtype\s*=\s*["']([^"']+)["']/gi)].map(m => m[1].split('/').pop()!);
  const nd = h.match(/<script[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  let nextChaves: string[] = [];
  if (nd) { try { const pp = JSON.parse(nd[1])?.props?.pageProps || {}; nextChaves = Object.keys(pp).slice(0, 15).map(k => { const v = pp[k]; return v && typeof v === 'object' && !Array.isArray(v) ? `${k}{${Object.keys(v).slice(0, 12).join(',')}}` : k; }); } catch { nextChaves = ['(JSON inválido)']; } }
  return { bytes: h.length, jsonLd: [...new Set(tiposLd)], microdados: [...new Set(microdados)], nextData: !!nd, nextChaves, scriptsNext: /\/_next\/static\//.test(h), rsc: /self\.__next_f\.push/.test(h) };
}

/** Filtro rápido, sem IA, antes de gastar com o Gemini: tira só o que claramente NÃO é para quem está começando
 *  (cargos de liderança, sênior/pleno, ou anúncio que exige anos de experiência). O resto o Gemini avalia. */
export function pareceEntrada(v: Pick<VagaBruta, 'titulo' | 'descricao' | 'tipoContrato'>): boolean {
  const t = `${v.titulo} ${v.tipoContrato || ''}`;
  if (/\b(jovem\s+aprendiz|aprendiz|est[aá]gi[aáo]ri[oa]?|est[aá]gio|primeiro\s+emprego|INTERN)\b/i.test(t) || /apprentice|internship|vacancy_type_(apprentice|internship)/i.test(t)) return true;
  if (/\b(s[eê]nior|sr\.?|pleno|pl\.?|coordenador[a]?|gerente|supervisor[a]?|especialista|diretor[a]?|l[ií]der|head|consultor[a]?\s+s[eê]nior|engenheir[oa]|m[eé]dic[oa]|advogad[oa]|analista\s+(ii|iii|2|3))\b/i.test(t)) return false;
  const d = v.descricao.slice(0, 6000);
  if (/experi[eê]ncia\s+(m[ií]nima\s+)?(de|com)?\s*(\d+|um|dois|tr[eê]s|quatro|cinco)\s+(anos?|meses)/i.test(d) || /experi[eê]ncia\s+comprovada/i.test(d) || /ensino\s+superior\s+completo/i.test(d)) return false;
  return true;
}

/** Links para páginas de vaga dentro do mesmo site (em href ou dentro de JSON da página, como no Next.js). */
export function linksDeVagas(html: string, base: string): string[] {
  const host = new URL(base).host, achados = new Set<string>();
  const padrao = /\/(jobs?|vagas?|oportunidades?|carreiras?\/vagas?|positions?|openings?)\/[^\s"'<>\\?#]+/i;
  const h = String(html).replace(/\\\//g, '/').replace(/\\u002F/gi, '/'); // JSON escapa "/" como "\/"
  const candidatos = [
    ...[...h.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]),
    ...[...h.matchAll(/["'](https?:\/\/[^"'\s<>]+|\/[^"'\s<>]{2,200})["']/g)].map(m => m[1]),
  ];
  for (const c of candidatos) {
    let u: URL;
    try { u = new URL(c, base); } catch { continue; }
    if (u.host !== host || !/^https?:$/.test(u.protocol) || !padrao.test(u.pathname)) continue;
    if (/\.(png|jpe?g|svg|css|js|ico|webp|pdf)$/i.test(u.pathname)) continue;
    u.hash = '';
    achados.add(u.toString());
  }
  return [...achados];
}

/** Endereços de um sitemap.xml (páginas ou outros sitemaps). */
export function lerSitemap(xml: string): { paginas: string[]; sitemaps: string[] } {
  const locs = (tag: string) => [...String(xml).matchAll(new RegExp(`<${tag}>[\\s\\S]*?<loc>\\s*([^<\\s]+)\\s*</loc>`, 'gi'))].map(m => m[1].replace(/&amp;/g, '&'));
  return { paginas: locs('url'), sitemaps: locs('sitemap') };
}
