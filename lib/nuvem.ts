// O que sobe para a conta e como juntar com o que já está no celular.
// Funções puras (sem Supabase) para dar para testar: test/nuvem.test.ts
import type { Estado } from './store';
import type { Passo, Prova } from './tipos';

/** Exatamente o que fica guardado no servidor. Nada de história, áudio, vontades, motivos de recusa ou treino. */
export type DadosNuvem = {
  v: 1;
  concluiu: boolean;
  sobre: Estado['sobre'];
  objetivos: string[];
  areas: string[];
  antes: string;
  provasConfirmadas: Prova[]; // só as que a pessoa confirmou (com o trecho curto de cada uma)
  experiencias: string[];     // contexto para o currículo, ex.: "Comércio familiar, aos sábados"
  passos: Passo[];
  acompanho: string[];
  candidaturas: string[];
  salvas: string[];
  vistas: string[];
  sugPuladas: string[];
};

export function paraNuvem(s: Estado): DadosNuvem {
  const provasConfirmadas = (s.leitura?.provas || []).filter(p => s.provas[p.comp] === 'ok')
    .map(({ comp, nome, trechos, partes, linha, origem }) => ({ comp, nome, trechos, partes, linha, origem }));
  return {
    v: 1, concluiu: s.concluiu, sobre: s.sobre, objetivos: s.objetivos, areas: s.areas, antes: s.antes,
    provasConfirmadas, experiencias: s.leitura?.experiencias || [],
    passos: s.passos, acompanho: s.acompanho, candidaturas: s.candidaturas, salvas: s.salvas, vistas: s.vistas, sugPuladas: s.sugPuladas,
  };
}

const uniao = (a: string[], b: string[]) => [...new Set([...(a || []), ...(b || [])])];
const lista = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/** Junta o que veio da conta com o que está no celular. Nada se perde: o que existe nos dois lados fica. */
export function mesclar(local: Estado, r: Partial<DadosNuvem> | null | undefined): Estado {
  if (!r || r.v !== 1) return local;
  const s: Estado = structuredClone(local);
  const novoAparelho = !local.concluiu && !!r.concluiu;

  // provas: as do celular continuam como estão; as da conta entram confirmadas
  const remotas = lista<Prova>(r.provasConfirmadas);
  if (remotas.length) {
    s.leitura ??= { provas: [], vontades: [], barradas: [], perguntas: [], experiencias: [] };
    for (const p of remotas) {
      if (!p?.comp || s.leitura.provas.some(x => x.comp === p.comp)) continue;
      s.leitura.provas.push(p);
      if (!s.provas[p.comp]) s.provas[p.comp] = 'ok';
    }
    s.leitura.perguntas = s.leitura.perguntas.filter(q => !s.leitura!.provas.some(p => p.comp === q.comp));
  }
  if (s.leitura) s.leitura.experiencias = uniao(s.leitura.experiencias, lista<string>(r.experiencias)).slice(0, 4);

  // passos: junta pelo id; se um lado marcou como feito, vale o feito
  const porId = new Map<string, Passo>();
  for (const x of lista<Passo>(r.passos)) if (x?.id) porId.set(x.id, x);
  for (const x of s.passos) { const o = porId.get(x.id); porId.set(x.id, o && o.feito && !x.feito ? o : x); }
  s.passos = [...porId.values()];

  s.acompanho = uniao(s.acompanho, lista(r.acompanho));
  s.candidaturas = uniao(s.candidaturas, lista(r.candidaturas));
  s.salvas = uniao(s.salvas, lista(r.salvas));
  s.vistas = uniao(s.vistas, lista(r.vistas));
  s.sugPuladas = uniao(s.sugPuladas, lista(r.sugPuladas));

  // respostas de "Sobre você": num celular novo, valem as da conta; senão, as deste celular
  if (novoAparelho) {
    if (r.sobre) s.sobre = { ...s.sobre, ...r.sobre };
    s.objetivos = lista(r.objetivos); s.areas = lista(r.areas); s.antes = r.antes || '';
    s.consent = { ...s.consent, a18: true, li: true }; // aceitou o combinado ao criar a conta
    s.concluiu = true;
    if (['abertura', 'experimente', 'combinado', 'sobre', 'objetivo', 'relato'].includes(s.tela)) s.tela = 'inicio';
  }
  return s;
}
