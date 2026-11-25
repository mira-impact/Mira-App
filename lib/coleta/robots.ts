// Regras do robots.txt: o site diz o que robôs podem ou não abrir. A MIRA obedece.
// Implementação do essencial da RFC 9309: grupos por User-agent, Allow/Disallow, * e $, a regra mais longa vence.

export const ROBO = 'MIRA-bot';

type Regra = { permite: boolean; padrao: string };
export type Robots = { regras: Regra[]; sitemaps: string[]; espera?: number };

export function lerRobots(txt: string, robo = ROBO): Robots {
  const grupos: { agentes: string[]; regras: Regra[]; espera?: number }[] = [];
  const sitemaps: string[] = [];
  let atual: (typeof grupos)[number] | null = null, ultimoFoiAgente = false;
  for (const linhaBruta of String(txt || '').split(/\r?\n/)) {
    const linha = linhaBruta.replace(/#.*/, '').trim(); if (!linha) continue;
    const i = linha.indexOf(':'); if (i < 0) continue;
    const campo = linha.slice(0, i).trim().toLowerCase(), valor = linha.slice(i + 1).trim();
    if (campo === 'sitemap') { if (valor) sitemaps.push(valor); continue; }
    if (campo === 'user-agent') {
      if (!atual || !ultimoFoiAgente) { atual = { agentes: [], regras: [] }; grupos.push(atual); }
      atual.agentes.push(valor.toLowerCase()); ultimoFoiAgente = true; continue;
    }
    ultimoFoiAgente = false;
    if (!atual) continue;
    if (campo === 'allow' || campo === 'disallow') { if (valor || campo === 'allow') atual.regras.push({ permite: campo === 'allow', padrao: valor }); }
    else if (campo === 'crawl-delay') { const n = Number(valor); if (n > 0) atual.espera = n; }
  }
  const nome = robo.toLowerCase();
  const meu = grupos.filter(g => g.agentes.some(a => a !== '*' && nome.startsWith(a)));
  const escolhidos = meu.length ? meu : grupos.filter(g => g.agentes.includes('*'));
  return { regras: escolhidos.flatMap(g => g.regras), sitemaps, espera: escolhidos.find(g => g.espera)?.espera };
}

const casa = (padrao: string, caminho: string) => {
  if (!padrao) return false;
  const fim = padrao.endsWith('$'), p = fim ? padrao.slice(0, -1) : padrao;
  const re = new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (fim ? '$' : ''));
  return re.test(caminho);
};
/** Pode abrir este caminho? Sem regra que case = pode. Empate entre Allow e Disallow = Allow. */
export function permitido(r: Robots, url: string): boolean {
  const u = new URL(url), caminho = u.pathname + u.search;
  let melhor: Regra | null = null;
  for (const g of r.regras) {
    if (!casa(g.padrao, caminho)) continue;
    if (!melhor || g.padrao.length > melhor.padrao.length || (g.padrao.length === melhor.padrao.length && g.permite)) melhor = g;
  }
  return melhor ? melhor.permite : true;
}
