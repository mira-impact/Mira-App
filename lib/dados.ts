import vagasJson from '@/data/vagas.json';
import portasJson from '@/data/portas.json';
import tradJson from '@/data/traducoes.json';
import { COMP } from './competencias';
import type { Vaga, Porta } from './tipos';

export const VAGAS = vagasJson as unknown as (Vaga & { exemplo?: boolean })[];
export const PORTAS = portasJson as unknown as Porta[];
export type Trad = { id: string; diz: string; marca: string; vaga: string; req: string; porque: string; rotulo?: string };
export const TRAD = tradJson as Trad[];
export const TRAD_AB = ['troco', 'atendo', 'repor', 'festa'];

/** Quantas vagas da lista pedem cada competência (obrigatório ou desejável). */
export const CONTAGEM: Record<string, number> = {};
for (const v of VAGAS) for (const r of new Set([...v.obrig, ...v.desej])) CONTAGEM[r] = (CONTAGEM[r] || 0) + 1;

/** As competências que mais aparecem nas vagas: são elas que a MIRA pergunta quando faltam. */
export const TOP_COMPS = Object.keys(COMP).sort((a, b) => (CONTAGEM[b] || 0) - (CONTAGEM[a] || 0)).filter(k => CONTAGEM[k]);

/** O mapa: ensino médio + as 5 competências mais pedidas + curso técnico + experiência registrada = 8. */
export const MAPA: { k: string; n: string }[] = [
  { k: 'em', n: 'Ensino médio completo' },
  ...TOP_COMPS.slice(0, 5).map(k => ({ k, n: COMP[k].nome })),
  { k: 'tecnico', n: 'Curso técnico ou superior' },
  { k: 'experiencia', n: 'Experiência registrada de 6 meses' },
];
export const TOTAL_MAPA = MAPA.length;
