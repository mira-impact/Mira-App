// O "programa que confere cada frase": nada que a IA devolve vira prova se o trecho
// não estiver, letra por letra (ignorando acento, maiúscula e espaço), na história da pessoa.
import { COMP, COMP_KEYS, AREAS } from './competencias';
import type { Leitura, Prova, Vontade, Barrada, PerguntaRapida, Parte } from './tipos';

// ---------- dados pessoais: sai do texto antes de ir para a IA ----------
export function redigir(t: string): string {
  return String(t)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail removido]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF removido]')
    .replace(/(\(?\b\d{2}\)?[\s-]?)?\b9?\d{4}[\s-]?\d{4}\b/g, '[telefone removido]');
}

// ---------- normalização com mapa de volta para o texto original ----------
function normalizarComMapa(s: string) {
  let out = '';
  const mapa: number[] = [];
  let espaco = false;
  for (let i = 0; i < s.length; i++) {
    const n = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (/\s/.test(n)) {
      if (!espaco && out.length) { out += ' '; mapa.push(i); }
      espaco = true;
      continue;
    }
    espaco = false;
    for (const c of n) { out += c; mapa.push(i); }
  }
  return { out, mapa };
}
const limparPontas = (t: string) => t.trim().replace(/^[“”"'«».,;:…\s-]+|[“”"'«».,;:…\s-]+$/g, '');

/** Acha o trecho no texto. Devolve o pedaço ORIGINAL do texto (com os acentos da pessoa) ou null. */
export function acharTrecho(texto: string, trecho: string): { ini: number; fim: number; txt: string } | null {
  const alvo = limparPontas(String(trecho || ''));
  if (alvo.length < 3) return null;
  const exato = texto.indexOf(alvo);
  if (exato >= 0) return { ini: exato, fim: exato + alvo.length, txt: alvo };
  const T = normalizarComMapa(texto), A = normalizarComMapa(alvo).out.trim();
  if (!A) return null;
  const k = T.out.indexOf(A);
  if (k < 0) return null;
  const ini = T.mapa[k], fim = T.mapa[k + A.length - 1] + 1;
  return { ini, fim, txt: texto.slice(ini, fim) };
}

// ---------- monta o "“frase com trecho grifado”" de cada prova ----------
function fraseEm(texto: string, pos: number) {
  let ini = pos, fim = pos;
  while (ini > 0 && !/[.!?\n]/.test(texto[ini - 1])) ini--;
  while (fim < texto.length && !/[.!?\n]/.test(texto[fim])) fim++;
  return { ini, fim };
}
export function partesDe(texto: string, achados: { ini: number; fim: number }[]): Parte[] {
  const ord = [...achados].sort((a, b) => a.ini - b.ini);
  const grupos: { ini: number; fim: number; marcas: { ini: number; fim: number }[] }[] = [];
  for (const a of ord) {
    const f = fraseEm(texto, a.ini);
    const g = grupos.find(x => x.ini === f.ini);
    if (g) { g.marcas.push(a); g.fim = Math.max(g.fim, a.fim, f.fim); } else grupos.push({ ini: f.ini, fim: Math.max(f.fim, a.fim), marcas: [a] });
  }
  const P: Parte[] = [];
  grupos.forEach((g, gi) => {
    if (gi) P.push([' … ', false]);
    let ini = g.ini, fim = g.fim;
    // frase muito longa: recorta uma janela em volta dos grifos
    if (fim - ini > 170) { ini = Math.max(g.ini, g.marcas[0].ini - 50); fim = Math.min(g.fim, g.marcas[g.marcas.length - 1].fim + 50); }
    let cur = ini;
    const pre = ini > g.ini ? '…' : '';
    if (pre) P.push([pre, false]);
    for (const m of g.marcas) {
      if (m.ini < cur) continue;
      if (m.ini > cur) P.push([texto.slice(cur, m.ini).replace(/^\s+/, cur === ini ? '' : ' '), false]);
      P.push([texto.slice(m.ini, m.fim), true]);
      cur = m.fim;
    }
    if (fim > cur) P.push([texto.slice(cur, fim).replace(/\s+$/, ''), false]);
    if (fim < g.fim) P.push(['…', false]);
  });
  return P.filter(p => p[0].length);
}

const str = (x: unknown, max = 200) => (typeof x === 'string' ? x.trim().slice(0, max) : '');

// ---------- valida a leitura inteira ----------
export function validarLeitura(bruto: any, texto: string, perguntasPadrao: string[]): Leitura {
  const provas: Prova[] = [];
  for (const p of Array.isArray(bruto?.provas) ? bruto.provas : []) {
    const comp = str(p?.comp, 40);
    if (!COMP[comp] || provas.some(x => x.comp === comp)) continue;
    const achados = (Array.isArray(p?.trechos) ? p.trechos : []).map((t: unknown) => acharTrecho(texto, str(t, 300))).filter(Boolean) as { ini: number; fim: number; txt: string }[];
    const unicos = achados.filter((a, i) => achados.findIndex(b => b.ini === a.ini) === i).slice(0, 3);
    if (!unicos.length) continue; // a IA citou algo que a pessoa não escreveu: barrado
    provas.push({ comp, nome: COMP[comp].nome, trechos: unicos.map(a => a.txt), partes: partesDe(texto, unicos), linha: str(p?.linha, 120) || COMP[comp].nome, origem: 'historia' });
    if (provas.length >= 10) break;
  }

  const vontades: Vontade[] = [];
  for (const v of Array.isArray(bruto?.vontades) ? bruto.vontades : []) {
    const a = acharTrecho(texto, str(v?.trecho, 300));
    if (!a || vontades.some(x => x.disse === a.txt)) continue;
    const tipo = ['aprender', 'trabalhar', 'gosto'].includes(v?.tipo) ? v.tipo : 'gosto';
    const comp = COMP[str(v?.comp, 40)] ? str(v?.comp, 40) : undefined;
    const area = AREAS.includes(str(v?.area, 60)) ? str(v?.area, 60) : undefined;
    vontades.push({ disse: a.txt, tipo, comp, area });
    if (vontades.length >= 4) break;
  }

  const barradas: Barrada[] = [];
  for (const b of Array.isArray(bruto?.barradas) ? bruto.barradas : []) {
    const nome = str(b?.nome, 60), motivo = str(b?.motivo, 160);
    if (!nome || !motivo) continue;
    const a = acharTrecho(texto, str(b?.trecho, 300));
    barradas.push({ nome, motivo, trecho: a ? a.txt : undefined });
    if (barradas.length >= 3) break;
  }

  const temComp = new Set(provas.map(p => p.comp));
  const perguntas: PerguntaRapida[] = [];
  for (const q of Array.isArray(bruto?.perguntas) ? bruto.perguntas : []) {
    const comp = str(q?.comp, 40), txt = str(q?.q, 220);
    if (!COMP[comp] || temComp.has(comp) || perguntas.some(x => x.comp === comp) || txt.length < 10) continue;
    perguntas.push({ comp, q: txt });
    if (perguntas.length >= 2) break;
  }
  for (const comp of perguntasPadrao) { // se a IA não perguntou, a MIRA pergunta do jeito padrão
    if (perguntas.length >= 2) break;
    if (COMP[comp] && !temComp.has(comp) && !perguntas.some(x => x.comp === comp)) perguntas.push({ comp, q: COMP[comp].pergunta });
  }

  const experiencias = (Array.isArray(bruto?.experiencias) ? bruto.experiencias : []).map((e: unknown) => str(e, 120)).filter(Boolean).slice(0, 3);
  return { provas, vontades, barradas, perguntas, experiencias };
}

/** Resposta de uma pergunta rápida: no máximo uma prova, da competência perguntada. */
export function validarResposta(bruto: any, texto: string, comp: string): Prova | null {
  if (!COMP[comp] || !bruto?.temProva) return null;
  const achados = (Array.isArray(bruto?.trechos) ? bruto.trechos : []).map((t: unknown) => acharTrecho(texto, str(t, 300))).filter(Boolean) as { ini: number; fim: number; txt: string }[];
  if (!achados.length) return null;
  const u = achados.slice(0, 3);
  return { comp, nome: COMP[comp].nome, trechos: u.map(a => a.txt), partes: partesDe(texto, u), linha: str(bruto?.linha, 120) || COMP[comp].nome, origem: 'pergunta' };
}

export const compsValidas = (L: unknown, permitidas: string[]) => (Array.isArray(L) ? L : []).filter((c): c is string => typeof c === 'string' && permitidas.includes(c) && COMP_KEYS.includes(c));
