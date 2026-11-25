'use client';
// Estado. "useS" fica guardado NESTE celular (localStorage). "useUI" é só da sessão.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Leitura, Passo, Origem, Prova } from './tipos';

export type Estado = {
  tela: string; concluiu: boolean;
  consent: { a18: boolean; li: boolean; testes: boolean };
  sobre: { idade: string; em: string; zona: string; turnos: string[]; enem: string | null; escola: string | null };
  objetivos: string[]; areas: string[]; antes: string;
  relato: string;                 // rascunho: é apagado assim que a leitura dá certo
  leitura: Leitura | null;        // o que a IA achou, já conferido
  provas: Record<string, 'ok' | 'no'>;
  motivos: Record<string, { motivo?: string; txt?: string }>;
  iPergunta: number;
  passos: Passo[]; acompanho: string[]; portaAberta: string;
  mapaBase: { itens: string[]; em: string } | null;
  candidaturas: string[]; salvas: string[]; vistas: string[];
  voltarPara: string | null; sugPuladas: string[];
  contaConviteFechado: boolean;
};

export const novo = (): Estado => ({
  tela: 'abertura', concluiu: false, consent: { a18: false, li: false, testes: false },
  sobre: { idade: '18 a 20', em: 'Completo', zona: 'Zona Leste', turnos: [], enem: null, escola: null },
  objetivos: [], areas: [], antes: '', relato: '', leitura: null, provas: {}, motivos: {}, iPergunta: 0,
  passos: [], acompanho: [], portaAberta: 'fatec', mapaBase: null, candidaturas: [], salvas: [], vistas: [],
  voltarPara: null, sugPuladas: [], contaConviteFechado: false,
});

export const useS = create<Estado>()(persist(novo, { name: 'mira-v1', version: 1 }));
export const S = () => useS.getState();
/** Muda o estado como no protótipo: recebe um rascunho e mexe nele. */
export function mut(f: (d: Estado) => void) {
  const d = structuredClone(useS.getState()) as Estado;
  f(d); useS.setState(d, true);
}

export type Sheet = { tipo: 'recusa'; comp: string } | { tipo: 'areas' } | { tipo: 'passo' } | { tipo: 'resp'; campo: 'enem' | 'escola' } | { tipo: 'conta' } | null;
export type PassoSheet = { origem: Origem; ops: string[]; acao: string; dia: string; hora: string; lembrete: boolean; prazo: boolean; editId: string | null };
export type UIState = {
  hist: string[]; tr: 'fwd' | 'back' | 'fade'; trN: number;
  tradI: number; teste: string | null; testados: string[];
  aba: string; filtro: string; portaFiltro: string; portasTodas: boolean; vaga: string; confirmaApagar: boolean; todasAreas: boolean;
  lendo: { fase: 'ia' | 'marcando' | 'pronto'; n: number; relato: string; marcas: { txt: string; cls: 'mk' | 'vt' }[] } | null;
  resp: { porta: string; i?: number; livre?: string; carregando?: boolean; sabe?: boolean; resposta?: string; regra?: string | null } | null;
  duvida: string; ps: PassoSheet | null; feitosAberto: boolean; tirado: Passo | null; mais: string | null;
  ganhou: { k: string; de: number; para: number; abre: number; animado: boolean } | null;
  sheet: Sheet; toast: { id: number; msg: string; info?: boolean; acao?: { label: string; go?: string; fn?: () => void } } | null;
  treino: { vaga: string; resp: string; fase: 0 | 1 | 2; usou: string[]; erro?: boolean } | null;
  respPerg: Record<string, { texto: string; fase: 0 | 1 | 2; prova: Prova | null; erro?: boolean }>;
  anima: string | null; realce: string | null; novosMapa: string[];
  vagasCarregadas: boolean; vagasVersao: number;
};
export const useUI = create<UIState>()(() => ({
  hist: [], tr: 'fade', trN: 0, tradI: 0, teste: null, testados: [],
  aba: 'Combinam', filtro: 'Todas', portaFiltro: 'Estudo gratuito', portasTodas: false, vaga: '', confirmaApagar: false, todasAreas: false,
  lendo: null, resp: null, duvida: '', ps: null, feitosAberto: false, tirado: null, mais: null, ganhou: null,
  sheet: null, toast: null, treino: null, respPerg: {}, anima: null, realce: null, novosMapa: [],
  vagasCarregadas: false, vagasVersao: 0,
}));
export const UI = () => useUI.getState();
export const setUI = (p: Partial<UIState>) => useUI.setState(p);
/** Lista vazia estável (seletores do zustand não podem criar [] novo a cada render). */
export const VAZIO: never[] = Object.freeze([]) as unknown as never[];
