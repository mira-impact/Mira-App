// Lê um arquivo de resultados e gera o relatório HTML com todas as métricas.
//   npx tsx experimento/analisar.ts experimento/resultados/execucao-XXXX.json
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMP, COMP_KEYS } from '../lib/competencias';
import { LIMIAR_ACEITA, LIMIAR_DUVIDA, DOLAR_EM_REAIS, PRECO } from './config';
import type { Historia, Item } from './rodar';

const AQUI = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------ métricas básicas
type Conta = { vp: number; fp: number; fn: number; vn: number };
const zero = (): Conta => ({ vp: 0, fp: 0, fn: 0, vn: 0 });
const prf = (c: Conta) => {
  const p = c.vp + c.fp ? c.vp / (c.vp + c.fp) : NaN;
  const r = c.vp + c.fn ? c.vp / (c.vp + c.fn) : NaN;
  const f = p + r ? (2 * p * r) / (p + r) : 0;
  return { p, r, f: Number.isNaN(p) || Number.isNaN(r) ? (c.vp + c.fp + c.fn === 0 ? NaN : 0) : f };
};
type Sistema = { id: string; nome: string; cor: string; prediz: (it: Item, h: Historia) => Set<string> };

function contar(sis: Sistema, pares: [Item, Historia][], filtroComp?: string): Conta {
  const c = zero();
  for (const [it, h] of pares) {
    const pred = sis.prediz(it, h);
    for (const k of filtroComp ? [filtroComp] : COMP_KEYS) {
      if (h.discutivel.includes(k)) continue; // pares discutíveis ficam fora da nota
      const y = h.gabarito.includes(k), yh = pred.has(k);
      if (y && yh) c.vp++; else if (!y && yh) c.fp++; else if (y && !yh) c.fn++; else c.vn++;
    }
  }
  return c;
}

function bootstrap(sA: Sistema, sB: Sistema, pares: [Item, Historia][], vezes = 2000) {
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const difs: number[] = [];
  for (let b = 0; b < vezes; b++) {
    const am = Array.from({ length: pares.length }, () => pares[Math.floor(rnd() * pares.length)]);
    difs.push(prf(contar(sA, am)).f - prf(contar(sB, am)).f);
  }
  difs.sort((a, b) => a - b);
  return { ini: difs[Math.floor(vezes * 0.025)], fim: difs[Math.floor(vezes * 0.975)] };
}

const quantil = (xs: number[], q: number) => { if (!xs.length) return NaN; const o = [...xs].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.floor(q * o.length))]; };
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

// ------------------------------------------------------------------ formatação
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(0)}%` : '—');
const num = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '—');
const ms = (x: number) => (Number.isFinite(x) ? (x >= 1000 ? `${num(x / 1000, 1)} s` : `${Math.round(x)} ms`) : '—');
const usd = (x: number) => (Number.isFinite(x) ? `US$ ${x < 0.01 ? x.toFixed(6) : x.toFixed(4)}`.replace('.', ',') : '—');
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const nomeC = (k: string) => COMP[k]?.nome || k;

// ------------------------------------------------------------------ relatório
export function gerarRelatorio(arqResultados: string): string {
  const { meta, itens } = JSON.parse(readFileSync(arqResultados, 'utf8')) as { meta: any; itens: Item[] };
  const historias: Historia[] = JSON.parse(readFileSync(join(AQUI, 'dados/historias.json'), 'utf8'));
  const porId = new Map(historias.map(h => [h.id, h]));

  const todos = itens.map(it => [it, porId.get(it.id)!] as [Item, Historia]).filter(([, h]) => h);
  const comErro = todos.filter(([it]) => it.gemini?.erro || it.jev?.erro || it.hibrido?.erro);
  const pares = todos.filter(([it]) => !(it.gemini?.erro || it.jev?.erro || it.hibrido?.erro)); // comparação justa: mesmas histórias

  const S: Record<string, Sistema> = {
    gemini: { id: 'gemini', nome: 'Gemini (como a MIRA usa hoje)', cor: 'var(--s1)', prediz: it => new Set(it.gemini?.aceitas || []) },
    jev: { id: 'jev', nome: `Jev (aceita se ≥ ${num(LIMIAR_ACEITA, 1)})`, cor: 'var(--s2)', prediz: it => new Set(COMP_KEYS.filter(k => (it.jev?.probs[k] ?? 0) >= LIMIAR_ACEITA)) },
    hib: { id: 'hib', nome: 'Combinado: Jev decide + Gemini acha a frase', cor: 'var(--s3)', prediz: it => new Set(it.hibrido?.provas || []) },
    hibTeto: { id: 'hibTeto', nome: 'Combinado + pergunta rápida resolvendo as dúvidas (teto)', cor: 'var(--s3)', prediz: (it, h) => new Set([...(it.hibrido?.provas || []), ...(it.hibrido?.duvida || []).filter(k => h.gabarito.includes(k))]) },
    geminiBruto: { id: 'geminiBruto', nome: 'Gemini sem o verificador (referência)', cor: 'var(--muted)', prediz: it => new Set(it.gemini?.brutas || []) },
  };
  const principais = [S.gemini, S.jev, S.hib, S.hibTeto, S.geminiBruto];
  const res = Object.fromEntries(principais.map(s => { const c = contar(s, pares); return [s.id, { c, ...prf(c) }]; }));

  const bJG = bootstrap(S.jev, S.gemini, pares);
  const bHG = bootstrap(S.hib, S.gemini, pares);

  // ---- calibração do Jev
  const pontos: { p: number; y: number }[] = [];
  for (const [it, h] of pares) for (const k of COMP_KEYS) if (!h.discutivel.includes(k) && it.jev?.probs[k] !== undefined) pontos.push({ p: it.jev.probs[k], y: h.gabarito.includes(k) ? 1 : 0 });
  const faixas = Array.from({ length: 10 }, (_, i) => {
    const ini = i / 10, fim = (i + 1) / 10;
    const dentro = pontos.filter(x => x.p >= ini && (i === 9 ? x.p <= fim : x.p < fim));
    return { ini, fim, n: dentro.length, mp: media(dentro.map(x => x.p)), obs: media(dentro.map(x => x.y)) };
  });
  const ece = faixas.reduce((a, f) => a + (f.n ? (f.n / pontos.length) * Math.abs(f.mp - f.obs) : 0), 0);
  const brier = media(pontos.map(x => (x.p - x.y) ** 2));
  const taxaBase = media(pontos.map(x => x.y));

  // ---- varredura de limiar do Jev
  const limiares = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const varredura = limiares.map(t => {
    const s: Sistema = { id: 't', nome: '', cor: '', prediz: it => new Set(COMP_KEYS.filter(k => (it.jev?.probs[k] ?? 0) >= t)) };
    return { t, ...prf(contar(s, pares)) };
  });
  const totalPares = pares.reduce((a, [, h]) => a + COMP_KEYS.filter(k => !h.discutivel.includes(k)).length, 0);
  const paresDuvida = pares.reduce((a, [it, h]) => a + (it.hibrido?.duvida || []).filter(k => !h.discutivel.includes(k)).length, 0);
  const perguntasPorHistoria = media(pares.map(([it]) => (it.hibrido?.duvida || []).length));
  const acertoNaDuvida = media(pares.flatMap(([it, h]) => (it.hibrido?.duvida || []).filter(k => !h.discutivel.includes(k)).map(k => (h.gabarito.includes(k) ? 1 : 0))));

  // ---- alucinação do Gemini
  const brutasTot = pares.reduce((a, [it]) => a + (it.gemini?.brutas.length || 0), 0);
  const barradasTot = pares.reduce((a, [it]) => a + (it.gemini?.barradasVerificador.length || 0), 0);
  const exageros = pares.flatMap(([it, h]) => (it.gemini?.aceitas || []).filter(k => !h.gabarito.includes(k) && !h.discutivel.includes(k)).map(k => ({ id: h.id, k, trechos: it.gemini?.trechos[k] || [] })));
  const exagerosHib = pares.flatMap(([it, h]) => (it.hibrido?.provas || []).filter(k => !h.gabarito.includes(k) && !h.discutivel.includes(k)).map(k => ({ id: h.id, k, trechos: it.hibrido?.trechos[k] || [] })));
  const semTrecho = pares.reduce((a, [it]) => a + (it.hibrido?.semTrecho.length || 0), 0);
  const semTrechoCertas = pares.reduce((a, [it, h]) => a + (it.hibrido?.semTrecho || []).filter(k => h.gabarito.includes(k)).length, 0);

  // ---- custo e tempo
  const lat = { gemini: pares.map(([it]) => it.gemini!.latMs), jev: pares.map(([it]) => it.jev!.latMs), hib: pares.map(([it]) => it.hibrido!.latMs) };
  const cus = { gemini: pares.map(([it]) => it.gemini!.custoUSD), jev: pares.map(([it]) => it.jev!.custoUSD), hib: pares.map(([it]) => it.hibrido!.custoUSD) };
  const tok = { geminiE: media(pares.map(([it]) => it.gemini!.tokensEntrada)), geminiS: media(pares.map(([it]) => it.gemini!.tokensSaida)), jevE: media(pares.map(([it]) => it.jev!.tokensEntrada)) };
  const chamadasGeminiHib = pares.filter(([it]) => it.hibrido?.chamouGemini).length;

  // ---- recortes por tipo de história
  const TAGS: [string, string][] = [['informal', 'Português bem informal (gíria, abreviação)'], ['base', 'Casos diretos'], ['vontade', 'Tem vontade misturada'], ['terceiro', 'Quem fez foi outra pessoa'], ['negacao', 'Tem negação'], ['falso-amigo', 'Falso amigo (ex.: "caixa de som")'], ['autoavaliacao', 'Só autoavaliação'], ['rede-pessoal', 'Rede social pessoal'], ['injecao', 'Tenta manipular a IA'], ['vago', 'Vago']];
  const recortes = TAGS.map(([tag, rot]) => {
    const sub = pares.filter(([, h]) => h.tags.includes(tag));
    return { tag, rot, n: sub.length, v: [S.gemini, S.jev, S.hib].map(s => { const c = contar(s, sub); return { ...prf(c), fp: c.fp }; }) };
  }).filter(r => r.n);
  const naoInformal = pares.filter(([, h]) => !h.tags.includes('informal'));
  const formalF = [S.gemini, S.jev, S.hib].map(s => prf(contar(s, naoInformal)).f);

  const porComp = COMP_KEYS.map(k => {
    const suporte = pares.filter(([, h]) => h.gabarito.includes(k)).length;
    return { k, suporte, v: [S.gemini, S.jev, S.hib].map(s => prf(contar(s, pares, k))) };
  });

  // ------------------------------------------------------------------ leitura automática
  const R = res;
  const dif = (a: number, b: number) => `${a - b >= 0 ? '+' : ''}${num((a - b) * 100, 0)} p.p.`;
  const sig = (b: { ini: number; fim: number }) => (b.ini > 0 || b.fim < 0 ? 'diferença consistente (o intervalo de 95% não cruza zero)' : 'diferença NÃO conclusiva com 40 histórias (o intervalo de 95% cruza zero)');
  const leitura: string[] = [
    `<b>Qualidade (F1):</b> Gemini ${num(R.gemini.f)} · Jev ${num(R.jev.f)} · Combinado ${num(R.hib.f)}. Jev vs. Gemini: ${dif(R.jev.f, R.gemini.f)}, ${sig(bJG)} [${num(bJG.ini * 100, 0)} a ${num(bJG.fim * 100, 0)} p.p.]. Combinado vs. Gemini: ${dif(R.hib.f, R.gemini.f)}, ${sig(bHG)} [${num(bHG.ini * 100, 0)} a ${num(bHG.fim * 100, 0)} p.p.].`,
    `<b>Exagero (precisão):</b> o Gemini acerta ${pct(R.gemini.p)} do que aceita; o Jev, ${pct(R.jev.p)}; o combinado, ${pct(R.hib.p)}. Para a MIRA, precisão pesa mais que cobertura: uma competência falsa no currículo é pior que uma que faltou (que ainda pode virar pergunta rápida).`,
    `<b>Calibração do Jev:</b> erro de calibração (ECE) ${num(ece, 3)} e Brier ${num(brier, 3)} em ${pontos.length} pares. ${ece < 0.05 ? 'Bem calibrado: dá para usar a probabilidade como limiar.' : ece < 0.1 ? 'Calibração razoável: o limiar funciona, mas precisa ser ajustado com dados.' : 'Mal calibrado neste domínio: a probabilidade não deve ser lida ao pé da letra.'}`,
    `<b>Custo por 1.000 histórias:</b> Gemini ${usd(media(cus.gemini) * 1000)} · Jev ${usd(media(cus.jev) * 1000)} · Combinado ${usd(media(cus.hib) * 1000)}. <b>Tempo mediano:</b> ${ms(quantil(lat.gemini, 0.5))} · ${ms(quantil(lat.jev, 0.5))} · ${ms(quantil(lat.hib, 0.5))}.`,
    `<b>Português informal:</b> F1 nas histórias informais — Gemini ${num(recortes.find(r => r.tag === 'informal')?.v[0].f ?? NaN)}, Jev ${num(recortes.find(r => r.tag === 'informal')?.v[1].f ?? NaN)} (nas demais: ${num(formalF[0])} e ${num(formalF[1])}). Só ${recortes.find(r => r.tag === 'informal')?.n ?? 0} histórias: leia como sinal, não como prova.`,
    `<b>Zona de dúvida (${num(LIMIAR_DUVIDA, 1)}–${num(LIMIAR_ACEITA, 1)}):</b> ${pct(paresDuvida / totalPares)} dos pares, ${num(perguntasPorHistoria, 1)} pergunta(s) rápida(s) por história; nessa faixa, ${pct(acertoNaDuvida)} eram de fato competências. ${perguntasPorHistoria > 2 ? 'É pergunta demais para o jovem: a MIRA hoje faz no máximo 2.' : 'Cabe no limite de 2 perguntas que a MIRA já usa.'}`,
  ];

  // ------------------------------------------------------------------ SVG de calibração
  const W = 420, H = 420, m = { l: 52, r: 16, t: 16, b: 48 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
  const X = (v: number) => m.l + v * pw, Y = (v: number) => m.t + (1 - v) * ph;
  const maxN = Math.max(1, ...faixas.map(f => f.n));
  const grade = [0, 0.2, 0.4, 0.6, 0.8, 1].map(v => `<line x1="${X(0)}" x2="${X(1)}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="tick">${pct(v)}</text><text x="${X(v)}" y="${H - m.b + 18}" text-anchor="middle" class="tick">${num(v, 1)}</text>`).join('');
  const barrasN = faixas.map(f => f.n ? `<rect x="${X(f.ini) + 2}" y="${Y(0) - (f.n / maxN) * 60}" width="${pw / 10 - 4}" height="${(f.n / maxN) * 60}" rx="2" class="hist"><title>${num(f.ini, 1)}–${num(f.fim, 1)}: ${f.n} pares</title></rect>` : '').join('');
  const cheias = faixas.filter(f => f.n);
  const linha = cheias.map((f, i) => `${i ? 'L' : 'M'}${X(f.mp).toFixed(1)},${Y(f.obs).toFixed(1)}`).join(' ');
  const pts = cheias.map(f => `<circle cx="${X(f.mp)}" cy="${Y(f.obs)}" r="${Math.max(4, Math.min(9, 3 + Math.sqrt(f.n)))}" class="pt"><title>Jev disse em média ${pct(f.mp)} · acertou ${pct(f.obs)} · ${f.n} pares</title></circle>`).join('');
  const svgCal = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de calibração do Jev">${grade}${barrasN}<line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" class="diag"/><path d="${linha}" class="cal"/>${pts}<text x="${m.l + pw / 2}" y="${H - 8}" text-anchor="middle" class="eixo">O que o Jev disse (probabilidade)</text><text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" class="eixo">Quantas vezes era verdade</text></svg>`;

  // ------------------------------------------------------------------ SVG custo x qualidade
  const sistemasPlot = [{ s: S.gemini, f: R.gemini.f, c: media(cus.gemini) * 1000 }, { s: S.jev, f: R.jev.f, c: media(cus.jev) * 1000 }, { s: S.hib, f: R.hib.f, c: media(cus.hib) * 1000 }];
  const barW = 380, barH = 30, gap = 14;
  const maxC = Math.max(...sistemasPlot.map(x => x.c), 1e-9);
  const svgCusto = `<svg viewBox="0 0 ${barW + 230} ${sistemasPlot.length * (barH + gap)}" role="img" aria-label="Custo por mil histórias">${sistemasPlot.map((x, i) => `<text x="0" y="${i * (barH + gap) + barH / 2 + 5}" class="lab">${esc(x.s.nome.split(' (')[0].split(':')[0])}</text><rect x="120" y="${i * (barH + gap)}" width="${Math.max(3, (x.c / maxC) * barW)}" height="${barH}" rx="4" fill="${x.s.cor}"><title>${usd(x.c)} por 1.000 histórias</title></rect><text x="${126 + Math.max(3, (x.c / maxC) * barW)}" y="${i * (barH + gap) + barH / 2 + 5}" class="val">${usd(x.c)}</text>`).join('')}</svg>`;

  // ------------------------------------------------------------------ tabelas
  const linhaRes = (s: Sistema) => { const r = R[s.id]; return `<tr${s.id === 'geminiBruto' ? ' class="ref"' : ''}><td><span class="dot" style="background:${s.cor}"></span>${esc(s.nome)}</td><td>${pct(r.p)}</td><td>${pct(r.r)}</td><td><b>${num(r.f)}</b></td><td>${r.c.vp}</td><td>${r.c.fp}</td><td>${r.c.fn}</td></tr>`; };
  const chips = (ks: string[], ok: (k: string) => boolean, sig?: Record<string, number>) => ks.length ? ks.map(k => `<span class="chip ${ok(k) ? 'ok' : 'erro'}">${esc(nomeC(k))}${sig ? ` ${num(sig[k], 2)}` : ''}</span>`).join(' ') : '<span class="vazio">—</span>';
  const detalhe = todos.map(([it, h]) => {
    const certo = (k: string) => h.gabarito.includes(k) || h.discutivel.includes(k);
    const jevAce = COMP_KEYS.filter(k => (it.jev?.probs[k] ?? 0) >= LIMIAR_ACEITA);
    const faltG = h.gabarito.filter(k => !(it.gemini?.aceitas || []).includes(k));
    const faltJ = h.gabarito.filter(k => !jevAce.includes(k));
    return `<tr><td class="id">${h.id}<div class="tags">${h.tags.join(' · ')}</div></td><td class="hist">${esc(h.texto)}${h.nota ? `<div class="nota">${esc(h.nota)}</div>` : ''}</td>
      <td>${chips(h.gabarito, () => true)}${h.discutivel.length ? `<div class="disc">discutível: ${h.discutivel.map(nomeC).join(', ')}</div>` : ''}</td>
      <td>${it.gemini?.erro ? `<span class="chip erro">erro</span>` : chips(it.gemini!.aceitas, certo)}${faltG.length ? `<div class="falta">faltou: ${faltG.map(nomeC).join(', ')}</div>` : ''}${it.gemini?.barradasVerificador.length ? `<div class="barr">verificador barrou: ${it.gemini.barradasVerificador.map(nomeC).join(', ')}</div>` : ''}</td>
      <td>${it.jev?.erro ? `<span class="chip erro">erro</span>` : chips(jevAce, certo, it.jev!.probs)}${faltJ.length ? `<div class="falta">faltou: ${faltJ.map(k => `${nomeC(k)} (${num(it.jev?.probs[k] ?? NaN)})`).join(', ')}</div>` : ''}${it.hibrido?.duvida.length ? `<div class="duv">dúvida → pergunta: ${it.hibrido.duvida.map(k => `${nomeC(k)} (${num(it.jev?.probs[k] ?? NaN)})`).join(', ')}</div>` : ''}</td>
      <td>${it.hibrido?.erro ? `<span class="chip erro">erro</span>` : chips(it.hibrido?.provas || [], certo)}${it.hibrido?.semTrecho.length ? `<div class="barr">sem frase que prove: ${it.hibrido.semTrecho.map(nomeC).join(', ')}</div>` : ''}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MIRA · Gemini x Jev · relatório</title>
<style>
:root{color-scheme:light;--bg:#fcfcfb;--card:#fff;--ink:#0b0b0b;--ink2:#52514e;--muted:#8a8984;--line:#e6e5e0;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--ok:#e7f4ec;--okb:#008300;--err:#fde8e8;--errb:#c43837;--warn:#fff4d6}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#1a1a19;--card:#232322;--ink:#f0efec;--ink2:#c3c2b7;--muted:#8a8984;--line:#3a3a37;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--ok:#173323;--okb:#0ca30c;--err:#3d1f1f;--errb:#e66767;--warn:#3a3218}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1180px;margin:0 auto;padding:40px 24px 80px}h1{font-size:28px;margin:0 0 6px}h2{font-size:20px;margin:44px 0 12px}h3{font-size:16px;margin:24px 0 8px}
.sub{color:var(--ink2)}.aviso{background:var(--warn);border:1px solid var(--line);padding:14px 18px;border-radius:10px;margin:18px 0;font-weight:600}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:860px){.grid2{grid-template-columns:1fr}}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}@media(max-width:760px){.kpis{grid-template-columns:1fr 1fr}}
.kpi .v{font-size:26px;font-weight:700}.kpi .l{color:var(--ink2);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--ink2);font-weight:600;font-size:13px}
tr.ref td{color:var(--muted)}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle}
ul.leitura li{margin:8px 0}
svg{width:100%;height:auto;font-family:inherit}.grid{stroke:var(--line)}.tick{fill:var(--muted);font-size:11px}.eixo{fill:var(--ink2);font-size:12px}
.diag{stroke:var(--muted);stroke-dasharray:4 4}.cal{fill:none;stroke:var(--s2);stroke-width:2}.pt{fill:var(--s2);stroke:var(--card);stroke-width:2}.hist{fill:var(--line)}
.lab{fill:var(--ink);font-size:13px}.val{fill:var(--ink2);font-size:12px}
.chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;margin:2px 2px 2px 0;border:1px solid}.chip.ok{background:var(--ok);border-color:var(--okb)}.chip.erro{background:var(--err);border-color:var(--errb)}
.vazio{color:var(--muted)}.falta,.barr,.duv,.disc,.nota,.tags{font-size:12px;color:var(--ink2);margin-top:4px}.falta::before{content:"✕ ";color:var(--errb)}.barr::before{content:"⛔ "}.duv::before{content:"? "}
td.hist{max-width:340px}td.id{white-space:nowrap;font-weight:600}.det td{font-size:13px}
.legenda{font-size:13px;color:var(--ink2)}
</style></head><body><main>
<h1>MIRA · Gemini x Jev na identificação de competências</h1>
<div class="sub">${esc(meta.data.slice(0, 16).replace('T', ' '))} · ${pares.length} histórias comparadas${comErro.length ? ` (${comErro.length} com erro ficaram de fora)` : ''} · Gemini: ${esc(meta.gemini)} · Jev: ${esc(meta.jev)} · arquivo ${esc(basename(arqResultados))}</div>
${meta.simulado ? '<div class="aviso">⚠ EXECUÇÃO SIMULADA. Os números abaixo vêm de respostas falsas (sem chamar nenhuma IA) e servem só para testar o fluxo. Não use para decidir nada.</div>' : ''}

<div class="kpis">
<div class="card kpi"><div class="l">F1 Gemini (hoje)</div><div class="v" style="color:var(--s1)">${num(R.gemini.f)}</div></div>
<div class="card kpi"><div class="l">F1 Jev (≥ ${num(LIMIAR_ACEITA, 1)})</div><div class="v" style="color:var(--s2)">${num(R.jev.f)}</div></div>
<div class="card kpi"><div class="l">F1 combinado</div><div class="v" style="color:var(--s3)">${num(R.hib.f)}</div></div>
<div class="card kpi"><div class="l">Calibração do Jev (ECE, menor é melhor)</div><div class="v">${num(ece, 3)}</div></div>
</div>

<h2>O que os números dizem</h2>
<div class="card"><ul class="leitura">${leitura.map(l => `<li>${l}</li>`).join('')}</ul>
<p class="legenda">Leitura gerada automaticamente a partir dos números. Antes de apresentar, revise e confira com a tabela de histórias no fim.</p></div>

<h2>1. Precisão, cobertura e F1</h2>
<div class="card"><table><thead><tr><th>Sistema</th><th>Precisão<br><span class="legenda">do que aceitou, quanto estava certo</span></th><th>Cobertura (recall)<br><span class="legenda">do que existia, quanto achou</span></th><th>F1</th><th>Acertos</th><th>Exageros</th><th>Faltas</th></tr></thead><tbody>${principais.map(linhaRes).join('')}</tbody></table>
<p class="legenda">${totalPares} pares história × competência. Os pares marcados como "discutível" no gabarito ficam fora da conta. "Teto" supõe que a pergunta rápida ao jovem resolve corretamente toda dúvida: é o melhor caso possível, não um resultado medido.</p></div>

<h2>2. Calibração do Jev</h2>
<div class="grid2"><div class="card">${svgCal}<p class="legenda">Se o Jev fosse perfeitamente calibrado, os pontos laranja ficariam sobre a diagonal tracejada: quando ele diz 0,8, seria verdade 80% das vezes. As barras cinza mostram quantos pares caíram em cada faixa (faixas com poucos pares são pouco confiáveis). Passe o mouse nos pontos.</p></div>
<div class="card"><table><thead><tr><th>Faixa</th><th>Pares</th><th>Jev disse (média)</th><th>Era verdade</th></tr></thead><tbody>${faixas.map(f => `<tr><td>${num(f.ini, 1)}–${num(f.fim, 1)}</td><td>${f.n}</td><td>${pct(f.mp)}</td><td>${pct(f.obs)}</td></tr>`).join('')}</tbody></table>
<p class="legenda">ECE ${num(ece, 3)} · Brier ${num(brier, 3)} (um modelo que sempre chutasse a taxa base de ${pct(taxaBase)} teria Brier ${num(taxaBase * (1 - taxaBase), 3)}).</p>
<h3>E se o limiar fosse outro?</h3><table><thead><tr><th>Aceita se ≥</th><th>Precisão</th><th>Cobertura</th><th>F1</th></tr></thead><tbody>${varredura.map(v => `<tr${v.t === LIMIAR_ACEITA ? ' style="font-weight:700"' : ''}><td>${num(v.t, 1)}</td><td>${pct(v.p)}</td><td>${pct(v.r)}</td><td>${num(v.f)}</td></tr>`).join('')}</tbody></table>
<p class="legenda">Atenção: escolher o limiar olhando estas mesmas 40 histórias superestima o resultado. Para valer, escolha aqui e confirme num segundo conjunto de histórias.</p></div></div>

<h2>3. Alucinação do Gemini e o papel do verificador</h2>
<div class="grid2"><div class="card"><table><tbody>
<tr><td>Competências que o Gemini sugeriu</td><td><b>${brutasTot}</b></td></tr>
<tr><td>Barradas pelo verificador (citou frase que a pessoa não escreveu)</td><td><b>${barradasTot}</b> (${pct(barradasTot / brutasTot)})</td></tr>
<tr><td>Exageros que passaram pelo verificador (frase existe, mas não prova)</td><td><b>${exageros.length}</b></td></tr>
<tr><td>No combinado: Jev aprovou mas o Gemini não achou frase</td><td><b>${semTrecho}</b> (${semTrechoCertas} delas eram competências reais)</td></tr>
<tr><td>Exageros no combinado</td><td><b>${exagerosHib.length}</b></td></tr>
</tbody></table><p class="legenda">O verificador só garante que a frase existe na história. Ele não garante que a frase prova a competência: esse é o erro da linha "exageros que passaram".</p></div>
<div class="card"><h3 style="margin-top:0">Exageros do Gemini que passaram</h3>${exageros.length ? `<table><tbody>${exageros.map(e => `<tr><td>${e.id}</td><td>${esc(nomeC(e.k))}</td><td>${e.trechos.map(t => `"${esc(t)}"`).join('<br>')}</td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nenhum.</p>'}</div></div>

<h2>4. Custo e tempo por história</h2>
<div class="grid2"><div class="card"><h3 style="margin-top:0">Custo por 1.000 histórias</h3>${svgCusto}
<p class="legenda">Em reais (US$ 1 = R$ ${num(DOLAR_EM_REAIS)}): Gemini R$ ${num(media(cus.gemini) * 1000 * DOLAR_EM_REAIS)} · Jev R$ ${num(media(cus.jev) * 1000 * DOLAR_EM_REAIS)} · Combinado R$ ${num(media(cus.hib) * 1000 * DOLAR_EM_REAIS)}. Preço do Gemini promocional até 31/12/2026 (${usd(PRECO.gemini.entrada)}/${usd(PRECO.gemini.saida)} por milhão); a partir de 2027 o dobro.</p></div>
<div class="card"><table><thead><tr><th></th><th>Gemini</th><th>Jev</th><th>Combinado</th></tr></thead><tbody>
<tr><td>Tempo mediano</td><td>${ms(quantil(lat.gemini, 0.5))}</td><td>${ms(quantil(lat.jev, 0.5))}</td><td>${ms(quantil(lat.hib, 0.5))}</td></tr>
<tr><td>Tempo p95 (os 5% mais lentos)</td><td>${ms(quantil(lat.gemini, 0.95))}</td><td>${ms(quantil(lat.jev, 0.95))}</td><td>${ms(quantil(lat.hib, 0.95))}</td></tr>
<tr><td>Custo médio por história</td><td>${usd(media(cus.gemini))}</td><td>${usd(media(cus.jev))}</td><td>${usd(media(cus.hib))}</td></tr>
<tr><td>Tokens de entrada (média)</td><td>${Math.round(tok.geminiE)}</td><td>${Math.round(tok.jevE)}</td><td>—</td></tr>
<tr><td>Tokens de saída + raciocínio (média)</td><td>${Math.round(tok.geminiS)}</td><td>0 (grátis)</td><td>—</td></tr>
<tr><td>Histórias que precisaram chamar o Gemini</td><td>${pares.length}</td><td>0</td><td>${chamadasGeminiHib}</td></tr>
</tbody></table><p class="legenda">O Gemini da MIRA também devolve vontades, perguntas, experiências e linhas de currículo; o Jev só decide sim/não. O custo compara o mesmo pedido que cada um faz hoje, não o mesmo produto final.</p></div></div>

<h2>5. Por tipo de história (casos difíceis e português informal)</h2>
<div class="card"><table><thead><tr><th>Tipo</th><th>Histórias</th><th>F1 Gemini</th><th>F1 Jev</th><th>F1 Combinado</th><th>Exageros G / J / C</th></tr></thead><tbody>
${recortes.map(r => `<tr><td>${esc(r.rot)}</td><td>${r.n}</td><td>${num(r.v[0].f)}</td><td>${num(r.v[1].f)}</td><td>${num(r.v[2].f)}</td><td>${r.v[0].fp} / ${r.v[1].fp} / ${r.v[2].fp}</td></tr>`).join('')}
</tbody></table><p class="legenda">Uma história pode ter mais de um tipo. Em histórias sem nenhuma competência (vontade pura, terceiro), o F1 fica indefinido (—): olhe a coluna de exageros, que é o que importa nelas.</p></div>

<h2>6. Por competência</h2>
<div class="card"><table><thead><tr><th>Competência</th><th>Aparece em</th><th>F1 Gemini</th><th>F1 Jev</th><th>F1 Combinado</th></tr></thead><tbody>
${porComp.map(c => `<tr><td>${esc(nomeC(c.k))}</td><td>${c.suporte}</td>${c.v.map(v => `<td>${num(v.f)}</td>`).join('')}</tr>`).join('')}
</tbody></table><p class="legenda">Com poucas ocorrências por competência, esta tabela serve para achar padrões de erro (ex.: o Jev confunde "caixa de som" com caixa?), não para ranquear.</p></div>

<h2>7. História por história</h2>
<p class="legenda">Verde = de acordo com o gabarito (ou discutível). Vermelho = exagero. No Jev, o número é a probabilidade.</p>
<div class="card"><table class="det"><thead><tr><th>Id</th><th>História</th><th>Gabarito</th><th>Gemini</th><th>Jev</th><th>Combinado</th></tr></thead><tbody>${detalhe}</tbody></table></div>
${comErro.length ? `<h3>Histórias com erro de chamada</h3><div class="card"><ul>${comErro.map(([it]) => `<li>${it.id}: ${esc(it.gemini?.erro || it.jev?.erro || it.hibrido?.erro || '')}</li>`).join('')}</ul></div>` : ''}
</main></body></html>`;

  const saida = arqResultados.replace(/\.json$/, '.html');
  writeFileSync(saida, html);
  return saida;
}

if (process.argv[1] && /analisar\.ts$/.test(process.argv[1])) {
  const arq = process.argv[2];
  if (!arq) { console.error('Uso: npx tsx experimento/analisar.ts experimento/resultados/execucao-XXXX.json'); process.exit(1); }
  console.log(`Relatório: ${gerarRelatorio(arq)}`);
}
