import vagasJson from '@/data/vagas.json';
import portasJson from '@/data/portas.json';
import tradJson from '@/data/traducoes.json';
import { COMP } from './competencias';
import type { Vaga, Porta } from './tipos';

export type VagaLista = Vaga & { exemplo?: boolean };
const BASE = vagasJson as unknown as VagaLista[];

/** A lista de vagas em uso. Começa com data/vagas.json e recebe as vagas do banco quando elas chegam (definirVagas). */
export const VAGAS: VagaLista[] = [...BASE];
export const PORTAS = portasJson as unknown as Porta[];
export type Trad = { id: string; diz: string; marca: string; vaga: string; req: string; porque: string; rotulo?: string };
export const TRAD = tradJson as Trad[];
export const TRAD_AB = ['troco', 'atendo', 'repor', 'festa'];

/** Quantas vagas da lista pedem cada competência (obrigatório ou desejável). */
export const CONTAGEM: Record<string, number> = {};
/** As competências que mais aparecem nas vagas: são elas que a MIRA pergunta quando faltam. */
export const TOP_COMPS: string[] = [];
/** O mapa: ensino médio + as 5 competências mais pedidas + curso técnico + experiência registrada = 8. */
export const MAPA: { k: string; n: string }[] = [];
export const TOTAL_MAPA = 8;

function recalcular() {
  for (const k of Object.keys(CONTAGEM)) delete CONTAGEM[k];
  for (const v of VAGAS) for (const r of new Set([...v.obrig, ...v.desej])) CONTAGEM[r] = (CONTAGEM[r] || 0) + 1;
  TOP_COMPS.splice(0, TOP_COMPS.length, ...Object.keys(COMP).sort((a, b) => (CONTAGEM[b] || 0) - (CONTAGEM[a] || 0)).filter(k => CONTAGEM[k]));
  const top5 = [...TOP_COMPS.slice(0, 5), ...['atendimento', 'equipe', 'organizacao', 'responsabilidade', 'comunicacao'].filter(k => !TOP_COMPS.includes(k))].slice(0, 5);
  MAPA.splice(0, MAPA.length,
    { k: 'em', n: 'Ensino médio completo' },
    ...top5.map(k => ({ k, n: COMP[k].nome })),
    { k: 'tecnico', n: 'Curso técnico ou superior' },
    { k: 'experiencia', n: 'Experiência registrada de 6 meses' },
  );
}
recalcular();

/** Troca a lista pelas vagas do banco. Com vagas reais suficientes, as de exemplo saem; as da curadoria ficam. */
export function definirVagas(doBanco: VagaLista[]) {
  const urls = new Set(doBanco.map(v => v.url).filter(Boolean));
  const curadas = BASE.filter(v => !v.exemplo && !(v.url && urls.has(v.url)));
  const lista = doBanco.length >= 5 ? [...curadas, ...doBanco] : [...BASE, ...doBanco];
  VAGAS.splice(0, VAGAS.length, ...lista);
  recalcular();
}
