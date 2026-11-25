// Regras derivadas: tudo calculado a partir do estado + dados. Nada aqui chama a IA.
import { VAGAS, PORTAS, MAPA, CONTAGEM } from './dados';
import { BASE, REQ } from './competencias';
import type { Estado } from './store';
import type { Porta, Vaga, Passo, Origem, Regra } from './tipos';

const nVagas = () => VAGAS.length; // a lista muda quando chegam vagas do banco
// ---------- provas ----------
export const provaDe = (s: Estado, c: string) => s.leitura?.provas.find(p => p.comp === c);
export const provaOk = (s: Estado, c: string) => s.provas[c] === 'ok' && !!provaDe(s, c);
export const confirmadas = (s: Estado) => (s.leitura?.provas || []).filter(p => s.provas[p.comp] === 'ok');
export const totalProvas = (s: Estado) => confirmadas(s).length;
export const vontadeDe = (s: Estado, comp?: string) => (comp ? s.leitura?.vontades.find(v => v.comp === comp) : undefined);
export const concluido = (s: Estado, k: string) => s.passos.some(x => x.feito && x.conclui === k);

export function tem(s: Estado, req: string): boolean {
  const o = s.sobre;
  switch (req) {
    case 'idade': return o.idade !== '25 ou mais';
    case 'em': return o.em === 'Completo';
    case 'manha': return o.turnos.includes('Manhã');
    case 'tarde': return o.turnos.includes('Tarde');
    case 'noite': return o.turnos.includes('Noite');
    case 'fimsemana': return o.turnos.includes('Fim de semana');
    case 'matricula': case 'tecnico': return concluido(s, 'matricula');
    case 'experiencia': return false;
    default: return provaOk(s, req) || concluido(s, req);
  }
}
const SOBRE = ['idade', 'em', 'manha', 'tarde', 'noite', 'fimsemana'];
export const portaQueResolve = (req: string): Porta | undefined =>
  req === 'matricula' ? PORTAS.find(p => p.id === 'etec') || PORTAS.find(p => p.abre === 'matricula') : PORTAS.find(p => p.conclui?.req === req && p.tipo !== 'Estudo');
export const planoDe = (req: string) => !SOBRE.includes(req) && !!portaQueResolve(req);

export function avaliar(s: Estado, v: Vaga) {
  const fo = v.obrig.filter(r => !tem(s, r));
  return {
    okO: v.obrig.length - fo.length, nO: v.obrig.length, okD: v.desej.filter(r => tem(s, r)).length, nD: v.desej.length, faltam: fo,
    grupo: fo.length === 0 ? 'cumpre' : fo.length === 1 && planoDe(fo[0]) ? 'plano' : 'longe',
  } as const;
}
export const contagemTxt = (req: string) => `${CONTAGEM[req] || 0} de ${nVagas()}`;
export const abreVagas = (s: Estado, req: string) => VAGAS.filter(v => { const f = v.obrig.filter(r => !tem(s, r)); return f.length === 1 && f[0] === req; }).length;

// ---------- mapa ----------
export const mapaTem = (s: Estado) => MAPA.filter(m => tem(s, m.k));
export const mapaNovos = (s: Estado) => (s.mapaBase ? mapaTem(s).filter(m => !s.mapaBase!.itens.includes(m.k)) : []);

// ---------- plano ----------
export const passou = (x: Passo) => Date.parse(x.quando) < Date.now();
export const pendentes = (s: Estado) => s.passos.filter(x => !x.feito).sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando));
export const proximoPasso = (s: Estado) => { const P = pendentes(s); return P.find(x => !passou(x)) || P[0] || null; };
export const proxDaPorta = (s: Estado, id: string) => pendentes(s).find(x => x.origem.tipo === 'porta' && x.origem.id === id && !passou(x)) || null;
export const portaDoPasso = (o: Origem) => (o.tipo === 'porta' ? PORTAS.find(x => x.id === o.id) : undefined);
/** Lacunas do mapa que já têm um passo marcado (um passo não vira competência: fica "a caminho"). */
export function aCaminho(s: Estado) {
  const R: Record<string, Passo> = {};
  for (const x of pendentes(s)) {
    const req = x.conclui || portaDoPasso(x.origem)?.conclui?.req;
    const k = req === 'matricula' ? 'tecnico' : req;
    if (k && MAPA.some(m => m.k === k) && !R[k] && !tem(s, k)) R[k] = x;
  }
  return R;
}
export function origemTxt(o: Origem) {
  if (o.tipo === 'porta') return PORTAS.find(x => x.id === o.id)?.t || 'Porta';
  if (o.tipo === 'vaga') return VAGAS.find(x => x.id === o.id)?.titulo || 'Vaga';
  return 'Sugestão da MIRA';
}

// ---------- áreas ----------
export const minhaArea = (s: Estado, x: { area?: string; areas?: string[] }) => !!s.areas.length && (x.area ? s.areas.includes(x.area) : (x.areas || []).some(a => s.areas.includes(a)));
export const areaDe = (s: Estado, x: { area?: string; areas?: string[] }) => x.area || (x.areas || []).find(a => s.areas.includes(a));
export const areasTxt = (s: Estado) => (s.areas.length ? s.areas.join(', ') : 'Todas');

// ---------- portas ----------
export const fecha = (s: Estado, p: Porta) => !!((p.abre && !tem(s, p.abre)) || (p.req && !tem(s, p.req)));
export type Motivo = { selo: 'SV' | 'SG' | 'SM' | 'SR'; peso: number; txt: string; cita?: string[] };
export function porque(s: Estado, p: Porta): Motivo[] {
  const R: Motivo[] = [];
  const pr = p.req ? provaDe(s, p.req) : undefined, vt = vontadeDe(s, p.req);
  if (pr && provaOk(s, pr.comp)) R.push({ selo: 'SV', peso: 3, cita: pr.trechos, txt: 'Aqui isso vira certificado.' });
  else if (vt) R.push({ selo: 'SV', peso: 3, cita: [vt.disse], txt: 'Aqui você treina isso.' });
  if (p.req && CONTAGEM[p.req]) R.push({ selo: 'SG', peso: 2, txt: `${REQ[p.req]} aparece em ${CONTAGEM[p.req]} das ${nVagas()} vagas da sua lista.` });
  if (p.abre && CONTAGEM[p.abre]) R.push({ selo: 'SG', peso: 2, txt: `Estágio pede estar matriculado num curso: é o caso de ${CONTAGEM[p.abre]} das ${nVagas()} vagas da sua lista.` });
  if (p.sel) { const n = VAGAS.filter(v => v.selecao.includes(p.sel!)).length; if (n) R.push({ selo: 'SG', peso: 2, txt: `${n} das ${nVagas()} vagas da sua lista têm ${p.sel.toLowerCase()} na seleção.` }); }
  if (p.obj && s.objetivos.includes(p.obj)) R.push({ selo: 'SM', peso: 2, txt: `Você marcou “${p.obj}” como objetivo.` });
  if (minhaArea(s, p)) R.push({ selo: 'SM', peso: 3, txt: `Combina com a área que você escolheu: ${areaDe(s, p)}.` });
  if (p.fmt === 'Online') R.push({ selo: 'SR', peso: 1, txt: 'Online e no seu ritmo: cabe em qualquer turno.' });
  return R;
}
type St = 'ok' | 'no' | 'q' | 'fato';
export type RegraAval = { r: Regra; st: St; selo: 'SM' | 'SR' | 'SRESP' | 'F'; ev: string; antes?: string; pergunta?: 'enem' | 'escola' };
export function regraDe(s: Estado, r: Regra): Omit<RegraAval, 'r'> {
  const o = s.sobre;
  if (r.fato) return { st: 'fato', selo: 'F', ev: r.fato };
  switch (r.c) {
    case 'gratis': return s.objetivos.includes('Estudar de graça') ? { st: 'ok', selo: 'SM', ev: 'Você marcou “Estudar de graça” como objetivo.' } : { st: 'ok', selo: 'F', ev: 'Você não paga mensalidade.' };
    case 'gratisDesafio': return { st: 'ok', selo: 'F', ev: 'Você não paga para participar, e a formação do começo também é gratuita.' };
    case 'idade1822': return o.idade === '18 a 20' ? { st: 'ok', selo: 'SM', ev: 'Em “Sobre você”: 18 a 20 anos.' }
      : o.idade === '21 a 24' ? { st: 'q', selo: 'SM', ev: 'Você marcou 21 a 24 anos. Vale se você tiver até 22.' } : { st: 'no', selo: 'SM', ev: 'Você marcou 25 anos ou mais.' };
    case 'aprendiz': return s.objetivos.includes('Jovem aprendiz') ? { st: 'ok', selo: 'SM', ev: 'Você marcou “Jovem aprendiz” como objetivo.' } : { st: 'q', selo: 'SM', ev: 'Se você quer ser aprendiz, isso já conta.' };
    case 'em': return o.em === 'Completo' ? { st: 'ok', selo: 'SM', ev: 'Em “Sobre você”: ensino médio completo.' } : { st: 'no', selo: 'SM', ev: `Em “Sobre você”: ensino médio ${o.em.toLowerCase()}.`, antes: 'terminar o ensino médio' };
    case 'noite': return o.turnos.includes('Noite') ? { st: 'ok', selo: 'SR', ev: 'Você marcou a noite como livre.' } : { st: 'q', selo: 'SR', ev: 'Você não marcou a noite como livre. Confira outros horários no site oficial.' };
    case 'online': return { st: 'ok', selo: 'SR', ev: 'Online, cabe em qualquer turno. As atividades no polo têm dia marcado.' };
    case 'enem': return o.enem === 'Sim' ? { st: 'q', selo: 'SRESP', ev: 'Você respondeu que já fez. Falta conferir se a nota atinge o mínimo.' }
      : o.enem === 'Ainda não' ? { st: 'no', selo: 'SRESP', ev: 'Você respondeu “Ainda não”.', antes: 'fazer o Enem' } : { st: 'q', selo: 'F', ev: '', pergunta: 'enem' };
    case 'escola': return o.escola === 'Sim' ? { st: 'ok', selo: 'SRESP', ev: 'Você respondeu que fez o médio em escola pública.' }
      : o.escola === 'Não' ? { st: 'q', selo: 'SRESP', ev: 'Você respondeu que não. Existem exceções: confira no site oficial.' } : { st: 'q', selo: 'F', ev: '', pergunta: 'escola' };
    case 'renda': return { st: 'q', selo: 'F', ev: 'A MIRA não pergunta sua renda. Confira com sua família.' };
  }
  return { st: 'q', selo: 'F', ev: '' };
}
export function vocePode(s: Estado, p: Porta) {
  const L: RegraAval[] = (p.regras || []).map(r => ({ r, ...regraDe(s, r) })), C = L.filter(x => x.st !== 'fato');
  return { L, n: C.length, ok: C.filter(x => x.st === 'ok').length, no: C.filter(x => x.st === 'no'), q: C.filter(x => x.st === 'q').length };
}
export const fitPorta = (s: Estado, p: Porta) => { if (!p.regras) return 0; const v = vocePode(s, p); return v.no.length ? 0 : v.q ? 1 : 3; };
export const pontos = (s: Estado, p: Porta) => porque(s, p).reduce((t, x) => t + x.peso, 0) + fitPorta(s, p) + (p.tipo === 'Estudo' && s.objetivos.includes('Estudar de graça') ? 4 : 0) - (p.status ? 3 : 0);
export function veredito(v: ReturnType<typeof vocePode>) {
  const coisas = (n: number) => `${n} ${n > 1 ? 'coisas' : 'coisa'}`;
  if (v.no.some(x => !x.antes)) return { t: 'Por enquanto, não é pra você.', s: `${v.no.filter(x => !x.antes).map(x => x.r.txt).join(' e ')}: não bate com o que você marcou. Veja outras portas.`, cor: 'var(--no)' };
  if (v.no.length) return { t: 'É pra você, com um passo antes.', s: `Antes: ${v.no.map(x => x.antes).join(' e ')}.${v.q ? ` E ${coisas(v.q)} a confirmar.` : ''}`, cor: 'var(--indigo)' };
  if (v.q) return { t: 'Pode ser pra você.', s: `Falta confirmar ${coisas(v.q)}. Veja abaixo.`, cor: 'var(--indigo)' };
  return { t: 'É pra você, sim.', s: `${v.ok} de ${v.n} requisitos batem com o que você marcou.`, cor: 'var(--ok)' };
}
export function resumoPode(s: Estado, p: Porta) {
  const v = vocePode(s, p);
  if (v.no.some(x => !x.antes)) return { ic: 'x', cor: 'var(--no)', txt: 'Não bate com o que você marcou', extra: '' };
  if (v.no.length) return { ic: 'flag', cor: 'var(--no)', txt: v.no.length > 1 ? `Faltam ${v.no.length} passos antes` : 'Falta um passo antes', extra: v.q ? `· ${v.q} a confirmar` : '' };
  if (v.q) return { ic: 'help', cor: 'var(--indigo)', txt: `${v.q} a confirmar`, extra: v.ok ? `· ${v.ok} ${v.ok > 1 ? 'batem' : 'bate'} com você` : '' };
  return { ic: 'check', cor: 'var(--ok)', txt: `${v.ok} de ${v.n} batem com você`, extra: '' };
}

// ---------- sugestões do plano (feitas com a história de cada pessoa) ----------
export type Sug = { id: string; acao: string; selo: 'SV' | 'SG' | 'SE' | 'SF'; cita?: string[]; why: string; dl: [string, string][]; origem: Origem; conclui?: string; porta?: Porta };
export function sugestoes(s: Estado): Sug[] {
  const L: Sug[] = [];
  const conf = confirmadas(s);
  if (conf.length) L.push({
    id: 'vagas', acao: 'Candidatar-se a 3 vagas que pedem o que você já tem', selo: 'SV', origem: { tipo: 'sugestao', id: 'vagas' },
    why: `${conf.slice(0, 2).map(p => p.nome).join(' e ')} já ${conf.length > 1 ? 'estão' : 'está'} nas suas provas. Cada vaga traz o currículo e a entrevista prontos.`,
    dl: [['Quando', 'esta semana'], ['Custo', 'R$ 0'], ['Tempo', 'cerca de 1 hora'], ['Feitas', `${Math.min(s.candidaturas.length, 3)} de 3`]],
  });
  const cursos = PORTAS.filter(p => p.tipo === 'Cursos' && p.conclui && !tem(s, p.conclui.req) && !s.sugPuladas.includes(p.id))
    .sort((a, b) => nota(b) - nota(a));
  function nota(p: Porta) { const r = p.conclui!.req; return (vontadeDe(s, r) ? 100 : 0) + abreVagas(s, r) * 10 + (CONTAGEM[r] || 0) + (minhaArea(s, p) ? 5 : 0); }
  const c = cursos[0];
  if (c) {
    const r = c.conclui!.req, vt = vontadeDe(s, r), ab = abreVagas(s, r);
    L.push({
      id: 'curso:' + c.id, acao: c.conclui!.passo, selo: c.real ? 'SF' : 'SE', porta: c, origem: { tipo: 'porta', id: c.id }, conclui: r,
      cita: vt ? [vt.disse] : undefined,
      why: vt ? 'Com o certificado, isso entra em “Você já tem” no seu mapa.' : `${REQ[r]} aparece em ${CONTAGEM[r] || 0} das ${nVagas()} vagas da sua lista.`,
      dl: [['Quando', 'nas próximas 3 semanas'], ['Custo', `${c.custo === 'Gratuito' ? 'R$ 0' : c.custo}${c.cert ? ', com certificado' : ''}`], ['Tempo', c.quando], ...(ab ? [['Abre', `mais ${ab} vagas`] as [string, string]] : [])],
    });
  }
  if (!tem(s, 'matricula')) {
    const est = PORTAS.filter(p => p.tipo === 'Estudo' && p.abre === 'matricula').sort((a, b) => prazoFuturo(b) - prazoFuturo(a) || fitPorta(s, b) - fitPorta(s, a))[0];
    if (est) {
      const fut = prazoFuturo(est) > 0;
      L.push({
        id: 'estudo:' + est.id, acao: fut ? `Inscrever-se: ${est.prazo!.txt} (${est.t})` : est.proximos[0], selo: est.real ? 'SF' : 'SE', porta: est, origem: { tipo: 'porta', id: est.id },
        why: 'Estágio exige estar matriculado num curso (Lei 11.788/2008). Um técnico ou uma faculdade sem mensalidade abre essa porta.',
        dl: [...(fut ? [['Inscrição', est.prazo!.curto] as [string, string]] : []), ['Custo', est.custo], ['Leva a', est.leva || '']],
      });
    }
  }
  return L;
}
const prazoFuturo = (p: Porta) => (p.prazo && Date.parse(p.prazo.data) > Date.now() ? 1 : 0);
export function sugEstado(s: Estado, g: Sug): 'feito' | 'plano' | null {
  if (g.id === 'vagas') return s.candidaturas.length >= 3 ? 'feito' : s.passos.some(x => x.origem.tipo === 'sugestao' && x.origem.id === 'vagas') ? 'plano' : null;
  const P = s.passos.filter(x => x.origem.tipo === g.origem.tipo && x.origem.id === g.origem.id);
  if (g.conclui && P.some(x => x.feito && x.conclui === g.conclui)) return 'feito';
  return P.length ? 'plano' : null;
}

// ---------- currículo ----------
export const cursosFeitos = (s: Estado) => PORTAS.filter(p => p.conclui && p.cert && s.passos.some(x => x.feito && x.conclui === p.conclui!.req && x.origem.id === p.id));
export function textoCurriculo(s: Estado, v?: Vaga | null) {
  const L = confirmadas(s), exp = s.leitura?.experiencias || [], cursos = cursosFeitos(s);
  const form = `Ensino médio ${s.sobre.em.toLowerCase()}${s.sobre.escola === 'Sim' ? ', escola pública' : ''}`;
  return [
    `OBJETIVO\n${v ? v.objetivo : s.objetivos.filter(o => o !== 'Ainda não sei').join(' ou ') || 'Jovem Aprendiz ou primeiro emprego'}`,
    `FORMAÇÃO\n${form}`,
    `EXPERIÊNCIAS E VIVÊNCIAS\n${exp.join('\n')}${exp.length ? '\n' : ''}${L.map(p => '• ' + p.linha).join('\n')}`,
    ...(cursos.length ? [`CURSOS\n${cursos.map(p => `• ${p.t} (${p.org}), com certificado`).join('\n')}`] : []),
  ].join('\n\n');
}
export const temBase = (r: string) => r in BASE;
