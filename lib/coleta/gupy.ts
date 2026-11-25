// Leitor das páginas de vaga da Gupy (empresa.gupy.io).
// A Gupy NÃO publica as vagas no formato padrão JobPosting: os dados vêm num bloco interno do site
// (__NEXT_DATA__ → props.pageProps.job). Ler isso depende de como a Gupy monta o site hoje:
// se ela mudar, este leitor para de achar vagas (o npm run fontes mostra). O robots.txt continua valendo.
import { textoLimpo, type VagaBruta } from './jobposting';

export const ehGupy = (url: string) => { try { return /(^|\.)gupy\.io$/i.test(new URL(url).hostname) && !/^(portal|www|api)\./i.test(new URL(url).hostname); } catch { return false; } };

function nextData(html: string): any | null {
  const m = String(html || '').match(/<script[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
const dia = (x: unknown) => { const m = typeof x === 'string' ? x.match(/^\d{4}-\d{2}-\d{2}/) : null; return m ? m[0] : undefined; };
const txt = (x: unknown) => (typeof x === 'string' ? textoLimpo(x) : '');

/** Endereço único de uma vaga da Gupy: https://empresa.gupy.io/jobs/<id> (os dois formatos de link viram este). */
export function canonicoGupy(url: string): string {
  try {
    const u = new URL(url);
    if (!ehGupy(url)) return url;
    let id = u.pathname.match(/^\/jobs\/(\d+)/)?.[1];
    const b64 = u.pathname.match(/^\/job\/([A-Za-z0-9+/_-]+=*)/)?.[1];
    if (!id && b64) { try { id = String(JSON.parse(Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))?.jobId || ''); } catch { /* não era base64 */ } }
    return id ? `${u.origin}/jobs/${id}` : url;
  } catch { return url; }
}

/** A vaga da página (pageProps.job). */
export function extrairGupy(html: string, url: string): VagaBruta[] {
  if (!ehGupy(url)) return [];
  const pp = nextData(html)?.props?.pageProps;
  const j = pp?.job;
  if (!j || typeof j !== 'object' || !j.name) return [];
  const host = new URL(url);
  const empresa = txt(pp?.careerPage?.name || pp?.company?.name || j?.company?.name || j?.careerPageName) || String(pp?.subdomain || host.hostname.split('.')[0]);
  const partes = [j.description, j.responsibilities, j.prerequisites, j.relevantExperiences].map(txt).filter(Boolean);
  return [{
    url: j.id ? `${host.origin}/jobs/${j.id}` : canonicoGupy(url),
    titulo: txt(j.name),
    empresa,
    cidade: [txt(j.addressCity), txt(j.addressStateShortName || j.addressState)].filter(Boolean).join(' · ') || (/remote/i.test(String(j.workplaceType || '')) ? 'Remoto' : ''),
    descricao: partes.join('\n\n').slice(0, 12000),
    publicadaEm: dia(j.publishedDate || j.publishedAt || j.createdAt),
    validaAte: dia(j.applicationDeadline || j.deadline),
    tipoContrato: [j.type, j.jobType, j.workplaceType].filter(x => typeof x === 'string').join(',') || undefined,
  }];
}

/** Na página inicial da empresa (empresa.gupy.io/), a lista de vagas: objetos com id + nome dentro do bloco interno. */
export function linksGupy(html: string, base: string): string[] {
  if (!ehGupy(base)) return [];
  const raiz = nextData(html)?.props?.pageProps;
  if (!raiz) return [];
  const ids = new Set<string>(), fila: unknown[] = [raiz];
  let passos = 0;
  while (fila.length && passos++ < 20000) {
    const o = fila.shift() as any;
    if (!o || typeof o !== 'object') continue;
    if (Array.isArray(o)) {
      for (const x of o) if (x && typeof x === 'object' && /^\d{4,}$/.test(String(x.id ?? '')) && typeof (x.name ?? x.title) === 'string') ids.add(String(x.id));
      fila.push(...o);
    } else fila.push(...Object.values(o));
  }
  const origem = new URL(base).origin;
  return [...ids].map(id => `${origem}/jobs/${id}`);
}
