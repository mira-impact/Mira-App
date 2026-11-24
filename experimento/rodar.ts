// Roda Gemini (como a MIRA usa hoje), Jev (17 perguntas) e a combinação nas mesmas histórias.
//
//   npx tsx experimento/rodar.ts              -> execução real (precisa das chaves no .env.local)
//   npx tsx experimento/rodar.ts --simular    -> sem chaves, com respostas falsas, só para testar o fluxo
//   npx tsx experimento/rodar.ts --limite 5   -> só as 5 primeiras histórias (bom para um teste rápido)
//
// Ao final grava experimento/resultados/execucao-*.json e gera o relatório HTML.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMP, COMP_KEYS } from '../lib/competencias';
import { TOP_COMPS } from '../lib/dados';
import { redigir, validarLeitura, acharTrecho } from '../lib/verificar';
import { lerFalso } from '../lib/iaFalsa';
import { LIMIAR_ACEITA, LIMIAR_DUVIDA, PAUSA_MS } from './config';
import {
  chamarGemini, chamarJev, SYSTEM_LER, SCHEMA_LER, systemLocalizar, schemaLocalizar,
  provedorGemini, provedorJev, checarChaves, type RespGemini, type RespJev,
} from './provedores';
import { gerarRelatorio } from './analisar';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
// Carrega as chaves do .env.local sem depender de pacote extra nem de versão do Node.
for (const f of ['.env.local', '.env']) {
  const p = join(RAIZ, f);
  if (!existsSync(p)) continue;
  for (const linha of readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = linha.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || linha.trim().startsWith('#')) continue;
    const valor = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (valor && process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
}

const args = process.argv.slice(2);
const SIMULAR = args.includes('--simular');
const LIMITE = args.includes('--limite') ? Number(args[args.indexOf('--limite') + 1]) : Infinity;

export type Historia = { id: string; texto: string; gabarito: string[]; discutivel: string[]; tags: string[]; nota?: string };
export type Item = {
  id: string; texto: string;
  gemini?: { aceitas: string[]; brutas: string[]; barradasVerificador: string[]; trechos: Record<string, string[]>; tentadas: Record<string, string[]>; latMs: number; tokensEntrada: number; tokensSaida: number; custoUSD: number; erro?: string };
  jev?: { probs: Record<string, number>; latMs: number; tokensEntrada: number; custoUSD: number; erro?: string };
  hibrido?: { aceitasJev: string[]; duvida: string[]; provas: string[]; semTrecho: string[]; trechos: Record<string, string[]>; latMs: number; custoUSD: number; chamouGemini: boolean; erro?: string };
};

// ------------------------------------------------------------------ modo simulado (sem chave)
// Gemini simulado = a "IA falsa" de palavras-chave que já existe na MIRA (lib/iaFalsa.ts).
// Jev simulado = probabilidades sorteadas em volta do gabarito. Serve SÓ para testar o fluxo.
let semente = 42;
const aleat = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
async function geminiSimulado(texto: string): Promise<RespGemini> {
  return { bruto: lerFalso(texto), latMs: 1800 + aleat() * 2500, tokensEntrada: 1400, tokensSaida: 600, custoUSD: (1400 * 0.75 + 600 * 3.75) / 1e6, modelo: 'SIMULADO(iaFalsa)' };
}
async function localizarSimulado(texto: string, aceitas: string[]): Promise<RespGemini> {
  const pedaco = texto.split(/\s+/).slice(0, 5).join(' ');
  return { bruto: { provas: aceitas.map(comp => ({ comp, trechos: [pedaco], linha: '' })) }, latMs: 900 + aleat() * 800, tokensEntrada: 700, tokensSaida: 200, custoUSD: (700 * 0.75 + 200 * 3.75) / 1e6, modelo: 'SIMULADO' };
}
function jevSimulado(h: Historia): RespJev {
  const probs: Record<string, number> = {};
  for (const k of COMP_KEYS) {
    const base = h.gabarito.includes(k) ? 0.78 : h.discutivel.includes(k) ? 0.5 : 0.1;
    probs[k] = Math.min(0.99, Math.max(0.01, base + (aleat() - 0.5) * 0.5));
  }
  return { probs, latMs: 120 + aleat() * 150, tokensEntrada: 2300, tokensSaida: 0, custoUSD: (2300 * 0.042) / 1e6, modelo: 'SIMULADO' };
}

// ------------------------------------------------------------------ análise das respostas
function lerGemini(r: RespGemini, texto: string) {
  const leitura = validarLeitura(r.bruto, texto, TOP_COMPS);
  const brutas: string[] = [], barradas: string[] = [];
  const tentadas: Record<string, string[]> = {};
  for (const p of Array.isArray(r.bruto?.provas) ? r.bruto.provas : []) {
    const comp = String(p?.comp || '');
    if (!COMP[comp] || brutas.includes(comp)) continue;
    brutas.push(comp);
    const ts = (Array.isArray(p?.trechos) ? p.trechos : []).map(String);
    tentadas[comp] = ts;
    if (!ts.some((t: string) => acharTrecho(texto, t))) barradas.push(comp); // citou algo que a pessoa não escreveu
  }
  const trechos = Object.fromEntries(leitura.provas.map(p => [p.comp, p.trechos]));
  return { aceitas: leitura.provas.map(p => p.comp), brutas, barradasVerificador: barradas, trechos, tentadas };
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const historias: Historia[] = JSON.parse(readFileSync(join(AQUI, 'dados/historias.json'), 'utf8')).slice(0, LIMITE);

  if (!SIMULAR) {
    const falta = checarChaves();
    if (falta.length) {
      console.error(`\nFaltam chaves no .env.local: ${falta.join(', ')}\nVeja experimento/LEIA-ME.md, ou rode com --simular para testar sem chave.\n`);
      process.exit(1);
    }
  }

  const meta = {
    data: new Date().toISOString(), simulado: SIMULAR, n: historias.length,
    gemini: SIMULAR ? 'simulado' : `${provedorGemini()}:${process.env.GEMINI_MODEL || 'gemini-3.6-flash'}`,
    jev: SIMULAR ? 'simulado' : `${provedorJev()}:${process.env.JEV_MODEL || 'padrão'}`,
    limiarAceita: LIMIAR_ACEITA, limiarDuvida: LIMIAR_DUVIDA,
  };
  mkdirSync(join(AQUI, 'resultados'), { recursive: true });
  const carimbo = meta.data.slice(0, 16).replace(/[-:T]/g, '');
  const arq = join(AQUI, 'resultados', `execucao-${SIMULAR ? 'SIMULADA-' : ''}${carimbo}.json`);
  const itens: Item[] = [];

  console.log(`\nMIRA · Gemini x Jev · ${historias.length} histórias${SIMULAR ? ' · MODO SIMULADO' : ''}`);
  console.log(`Gemini: ${meta.gemini} · Jev: ${meta.jev}\n`);

  for (const [i, h] of historias.entries()) {
    const texto = redigir(h.texto).trim();
    const prompt = `<historia>\n${texto}\n</historia>`;
    const it: Item = { id: h.id, texto };

    // 1) Gemini como a MIRA usa hoje
    try {
      const r = SIMULAR ? await geminiSimulado(texto) : await chamarGemini(SYSTEM_LER, prompt, SCHEMA_LER);
      it.gemini = { ...lerGemini(r, texto), latMs: r.latMs, tokensEntrada: r.tokensEntrada, tokensSaida: r.tokensSaida, custoUSD: r.custoUSD };
    } catch (e: any) { it.gemini = { aceitas: [], brutas: [], barradasVerificador: [], trechos: {}, tentadas: {}, latMs: 0, tokensEntrada: 0, tokensSaida: 0, custoUSD: 0, erro: String(e?.message || e) }; }

    // 2) Jev com as 17 perguntas
    let jev: RespJev | null = null;
    try {
      jev = SIMULAR ? jevSimulado(h) : await chamarJev(texto);
      it.jev = { probs: jev.probs, latMs: jev.latMs, tokensEntrada: jev.tokensEntrada, custoUSD: jev.custoUSD };
    } catch (e: any) { it.jev = { probs: {}, latMs: 0, tokensEntrada: 0, custoUSD: 0, erro: String(e?.message || e) }; }

    // 3) Combinação: Jev decide, Gemini só acha a frase, dúvida vira pergunta rápida
    if (jev) {
      const aceitasJev = COMP_KEYS.filter(k => jev!.probs[k] >= LIMIAR_ACEITA);
      const duvida = COMP_KEYS.filter(k => jev!.probs[k] >= LIMIAR_DUVIDA && jev!.probs[k] < LIMIAR_ACEITA);
      const hib: NonNullable<Item['hibrido']> = { aceitasJev, duvida, provas: [], semTrecho: [], trechos: {}, latMs: jev.latMs, custoUSD: jev.custoUSD, chamouGemini: false };
      if (aceitasJev.length) {
        try {
          const r = SIMULAR ? await localizarSimulado(texto, aceitasJev) : await chamarGemini(systemLocalizar(aceitasJev), prompt, schemaLocalizar(aceitasJev));
          const L = validarLeitura({ provas: r.bruto?.provas || [], vontades: [], barradas: [], experiencias: [], perguntas: [] }, texto, []);
          hib.provas = L.provas.map(p => p.comp).filter(c => aceitasJev.includes(c));
          hib.trechos = Object.fromEntries(L.provas.map(p => [p.comp, p.trechos]));
          hib.semTrecho = aceitasJev.filter(c => !hib.provas.includes(c));
          hib.latMs += r.latMs; hib.custoUSD += r.custoUSD; hib.chamouGemini = true;
        } catch (e: any) { hib.erro = String(e?.message || e); }
      }
      it.hibrido = hib;
    }

    itens.push(it);
    writeFileSync(arq, JSON.stringify({ meta, itens }, null, 2)); // grava a cada história: se cair, não perde o que já rodou
    const ok = (s?: { erro?: string }) => (!s ? 'pulado' : s.erro ? 'ERRO' : 'ok');
    console.log(`[${String(i + 1).padStart(2)}/${historias.length}] ${h.id}  Gemini ${ok(it.gemini)} (${it.gemini?.aceitas.join(', ') || '—'})  ·  Jev ${ok(it.jev)}  ·  combinado ${ok(it.hibrido)} (${it.hibrido?.provas.join(', ') || '—'})`);
    if (it.gemini?.erro) console.log(`      Gemini: ${it.gemini.erro}`);
    if (it.jev?.erro) console.log(`      Jev: ${it.jev.erro}`);
    if (!SIMULAR) await esperar(PAUSA_MS);
  }

  console.log(`\nResultados brutos: ${arq}`);
  const rel = gerarRelatorio(arq);
  console.log(`Relatório: ${rel}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
