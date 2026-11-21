'use client';
// Ações que mexem nos dois estados (celular + sessão) e chamam as rotas /api.
import { S, mut, UI, setUI, useUI, novo, type Sheet } from './store';
import { mapaTem, mapaNovos, tem, abreVagas, portaDoPasso, origemTxt, passou } from './regras';
import { PORTAS } from './dados';
import { hojeISO, somaDias, dowISO, isoBRT, diaISO, brt, pad, novoId, quandoTxt } from './datas';
import { baixarIcs, evPasso, evPrazo } from './ics';
import type { Leitura, Origem, Prova } from './tipos';

const reduz = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const rolarTopo = (suave = true) => document.getElementById('scroller')?.scrollTo({ top: 0, behavior: suave && !reduz() ? 'smooth' : 'auto' });
export function rolarPara(el: Element | null, centro = false) {
  const sc = document.getElementById('scroller'); if (!el || !sc) return;
  const sr = sc.getBoundingClientRect(), er = el.getBoundingClientRect(), k = sr.height / sc.clientHeight || 1;
  const d = centro ? er.top - sr.top - sr.height / 2 + er.height / 2 : er.bottom > sr.bottom - 90 * k ? er.bottom - sr.bottom + 110 * k : er.top < sr.top ? er.top - sr.top - 20 * k : 0;
  if (d) sc.scrollBy({ top: d / k, behavior: reduz() ? 'auto' : 'smooth' });
}

// ---------- navegação ----------
export function ir(tela: string, o: { semHist?: boolean; tr?: 'fwd' | 'back' | 'fade' } = {}) {
  const s = S(), u = UI();
  const novosMapa = tela === 'mapa' ? mapaNovos(s).map(m => m.k) : u.novosMapa;
  setUI({ hist: !o.semHist && s.tela !== tela ? [...u.hist, s.tela] : u.hist, tr: o.tr || 'fwd', trN: u.trN + 1, mais: null, ganhou: tela === 'mapa' ? u.ganhou : null, toast: u.toast?.acao ? null : u.toast, novosMapa });
  mut(d => { d.tela = tela; if (tela === 'mapa') d.mapaBase = { itens: mapaTem(d).map(m => m.k), em: new Date().toISOString() }; });
}
export function voltar() {
  const u = UI(), h = [...u.hist], t = h.pop() || (S().concluiu ? 'inicio' : 'abertura');
  setUI({ hist: h, tr: 'back', trN: u.trN + 1, ganhou: null });
  mut(d => { d.tela = t; });
}
let toastN = 0;
export function toast(msg: string, acao?: { label: string; go?: string; fn?: () => void }, info = false) {
  setUI({ toast: { id: ++toastN, msg, acao, info } });
}
export const abrirSheet = (sheet: Sheet) => setUI({ sheet, toast: null });
export const fecharSheet = () => setUI({ sheet: null });

// ---------- leitura da história (IA + verificador) ----------
async function postar<T>(url: string, corpo: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.erro || 'falhou');
  return j as T;
}
function mesclar(antes: Leitura | null, nova: Leitura): Leitura {
  if (!antes) return nova;
  const provas = [...antes.provas, ...nova.provas.filter(p => !antes.provas.some(x => x.comp === p.comp))];
  const comps = new Set(provas.map(p => p.comp));
  return {
    provas,
    vontades: [...antes.vontades, ...nova.vontades.filter(v => !antes.vontades.some(x => x.disse === v.disse))].slice(0, 6),
    barradas: nova.barradas.length ? nova.barradas : antes.barradas,
    perguntas: [...nova.perguntas, ...antes.perguntas].filter((q, i, L) => !comps.has(q.comp) && L.findIndex(x => x.comp === q.comp) === i).slice(0, 2),
    experiencias: [...antes.experiencias, ...nova.experiencias.filter(e => !antes.experiencias.includes(e))].slice(0, 4),
  };
}
let leituraAtual = 0;
export async function lerHistoria() {
  const id = ++leituraAtual, relato = S().relato;
  setUI({ lendo: { fase: 'ia', n: 0, relato, marcas: [] } });
  if (S().tela !== 'lendo') ir('lendo');
  try {
    const { leitura, relato: limpo } = await postar<{ leitura: Leitura; relato: string }>('/api/ler', { relato });
    if (id !== leituraAtual || S().tela !== 'lendo') return; // a pessoa cancelou
    const antes = S().leitura;
    mut(d => {
      d.leitura = mesclar(d.leitura, leitura);
      d.relato = ''; // a história inteira não fica guardada: só os trechos das provas
      d.iPergunta = 0;
      for (const v of leitura.vontades) if (v.tipo === 'trabalhar' && v.area && !d.areas.includes(v.area)) d.areas.push(v.area);
    });
    const novas = leitura.provas.filter(p => !antes?.provas.some(x => x.comp === p.comp));
    const marcas = [...novas.flatMap(p => p.trechos.map(t => ({ txt: t, cls: 'mk' as const }))), ...leitura.vontades.map(v => ({ txt: v.disse, cls: 'vt' as const }))];
    setUI({ lendo: { fase: 'marcando', n: 0, relato: limpo, marcas } });
    const passo = () => {
      const l = UI().lendo; if (!l || id !== leituraAtual || S().tela !== 'lendo') return;
      if (l.n >= l.marcas.length) { setUI({ lendo: { ...l, fase: 'pronto' } }); return; }
      setUI({ lendo: { ...l, n: l.n + 1 } }); setTimeout(passo, reduz() ? 60 : 420);
    };
    setTimeout(passo, 300);
  } catch {
    if (id === leituraAtual && S().tela === 'lendo') ir('falha', { semHist: true });
  }
}
export function cancelarLeitura() { leituraAtual++; setUI({ lendo: null }); ir('relato', { tr: 'back' }); }

export function fimProvas() {
  const s = S();
  if (s.concluiu) return ir('mapa');
  const falta = (s.leitura?.provas || []).find(p => !s.provas[p.comp]);
  if (falta) return;
  if (s.leitura?.perguntas.length) { mut(d => { d.iPergunta = 0; }); return ir('perguntas'); }
  mut(d => { d.concluiu = true; }); ir('mapa');
}

// ---------- perguntas rápidas ----------
export async function enviarResposta(comp: string, pergunta: string) {
  const atual = UI().respPerg[comp]; if (!atual || atual.texto.trim().length < 8) return;
  setUI({ respPerg: { ...UI().respPerg, [comp]: { ...atual, fase: 1, erro: false } } });
  try {
    const { prova } = await postar<{ prova: Prova | null }>('/api/resposta', { comp, pergunta, resposta: atual.texto });
    setUI({ respPerg: { ...UI().respPerg, [comp]: { ...UI().respPerg[comp], fase: 2, prova } } });
  } catch {
    setUI({ respPerg: { ...UI().respPerg, [comp]: { ...UI().respPerg[comp], fase: 0, erro: true } } });
  }
}
export function decidirPergunta(prova: Prova, v: 'ok' | 'no') {
  mut(d => {
    if (!d.leitura) return;
    if (!d.leitura.provas.some(p => p.comp === prova.comp)) d.leitura.provas.push(prova);
    if (d.provas[prova.comp] === v) delete d.provas[prova.comp]; else d.provas[prova.comp] = v;
  });
}
export function proxPergunta() {
  const s = S(), n = s.leitura?.perguntas.length || 0;
  if (s.iPergunta < n - 1) { mut(d => { d.iPergunta++; }); setUI({ tr: 'fwd', trN: UI().trN + 1 }); rolarTopo(false); }
  else { mut(d => { d.concluiu = true; }); ir('mapa'); }
}

// ---------- Pergunte à MIRA ----------
export async function perguntarPorta() {
  const portaId = S().portaAberta, q = UI().duvida.trim();
  const p = PORTAS.find(x => x.id === portaId); if (!p) return;
  if (q.length < 3) return toast('Escreva sua dúvida antes de perguntar.', undefined, true);
  setUI({ resp: { porta: p.id, livre: q, carregando: true }, duvida: '', anima: 'resp' });
  try {
    const r = await postar<{ sabe: boolean; resposta: string; regra: string | null }>('/api/porta', { porta: p.id, pergunta: q });
    if (UI().resp?.livre === q) setUI({ resp: { porta: p.id, livre: q, ...r, carregando: false }, anima: 'resp' });
  } catch {
    if (UI().resp?.livre === q) setUI({ resp: { porta: p.id, livre: q, carregando: false, sabe: false, resposta: '' } });
  }
  setTimeout(() => rolarPara(document.getElementById('resp-mira')), 50);
}

// ---------- treino de entrevista ----------
export async function treinoLer(pergunta: string, provas: Prova[]) {
  const tr = UI().treino; if (!tr || tr.resp.trim().length < 15) return;
  setUI({ treino: { ...tr, fase: 1, erro: false } });
  try {
    const { usou } = await postar<{ usou: string[] }>('/api/treino', { pergunta, resposta: tr.resp, provas: provas.map(p => ({ comp: p.comp, nome: p.nome, trechos: p.trechos })) });
    const t2 = UI().treino; if (!t2 || t2.vaga !== tr.vaga || t2.fase !== 1) return;
    setUI({ treino: { ...t2, fase: 2, usou } });
    setTimeout(() => rolarPara(document.querySelector('.retorno')), 60);
  } catch {
    const t2 = UI().treino; if (t2) setUI({ treino: { ...t2, fase: 0, erro: true } });
  }
}

// ---------- plano ----------
export const HORAS = ['08', '09', '10', '12', '14', '16', '19', '20'];
function slotPadrao() { // o próximo turno livre de "Sobre você", com pelo menos 1 hora de folga
  const t = S().sobre.turnos, hoje = hojeISO(), lim = Date.now() + 3600e3;
  for (let k = 0; k < 8; k++) {
    const dia = somaDias(hoje, k), dw = dowISO(dia), H: string[] = [];
    if (t.includes('Manhã')) H.push('09'); if ((dw === 0 || dw === 6) && t.includes('Fim de semana')) H.push('10'); if (t.includes('Tarde')) H.push('14'); if (t.includes('Noite')) H.push('19');
    for (const h of H.sort()) if (Date.parse(isoBRT(dia, h)) > lim) return { dia, hora: h };
  }
  return { dia: somaDias(hoje, 1), hora: '10' };
}
export function abrirPasso(origem: Origem, o: { editId?: string; acao?: string } = {}) {
  const x = o.editId ? S().passos.find(y => y.id === o.editId) : undefined;
  const slot = x && !passou(x) ? { dia: diaISO(x.quando), hora: pad(brt(x.quando).getUTCHours()) } : slotPadrao();
  let ops: string[];
  if (x) ops = [x.acao];
  else if (o.acao) ops = [o.acao];
  else if (origem.tipo === 'porta') {
    const p = PORTAS.find(y => y.id === origem.id)!; ops = [...p.proximos];
    if (p.id === 'prouni' && S().sobre.enem === 'Sim') ops[0] = 'Conferir se minha nota do Enem atinge o mínimo';
  } else ops = ['Candidatar-se a 3 vagas que pedem o que você já tem'];
  setUI({ ps: { origem, ops, acao: ops[0], dia: slot.dia, hora: slot.hora, lembrete: x ? x.lembrete : true, prazo: false, editId: x ? x.id : null } });
  abrirSheet({ tipo: 'passo' });
}
export function salvarPasso(comIcs: boolean) {
  const ps = UI().ps; if (!ps) return;
  const quando = isoBRT(ps.dia, ps.hora); if (Date.parse(quando) <= Date.now()) return;
  const p = portaDoPasso(ps.origem);
  let id = ps.editId;
  mut(d => {
    if (ps.editId) { const x = d.passos.find(y => y.id === ps.editId); if (x) { x.quando = quando; x.lembrete = ps.lembrete; } return; }
    id = novoId();
    const conclui = p?.conclui && p.conclui.passo === ps.acao ? p.conclui.req : undefined;
    d.passos.push({ id, origem: ps.origem, acao: ps.acao, quando, lembrete: ps.lembrete, feito: false, conclui });
    if (p && !d.acompanho.includes(p.id)) d.acompanho.push(p.id);
  });
  setUI({ sheet: null, ps: null, anima: ps.editId ? null : 'acompanha' });
  if (comIcs) {
    const x = S().passos.find(y => y.id === id)!;
    const ev = [evPasso(x, origemTxt(x.origem), p?.site)];
    if (ps.prazo && p?.prazo) ev.push(evPrazo(p, ps.lembrete));
    if (!baixarIcs(ev, 'mira-proximo-passo.ics')) toast('Não deu para criar o arquivo da agenda neste navegador.', undefined, true);
  }
  if (S().tela === 'plano' && !ps.editId) rolarTopo();
  toast(ps.editId ? `Remarcado para ${quandoTxt(quando)}.` : comIcs ? 'Está no seu plano. Abra o arquivo para pôr na agenda.' : 'Está no seu plano.', S().tela === 'plano' ? undefined : { label: 'Ver', go: 'plano' });
}
export function feitoPasso(pid: string) {
  const s = S(), x = s.passos.find(y => y.id === pid); if (!x) return;
  const k = x.conclui, antes = k && !tem(s, k) ? { n: mapaTem(s).length, abre: abreVagas(s, k) } : null;
  mut(d => { const y = d.passos.find(z => z.id === pid)!; y.feito = true; y.feitoEm = new Date().toISOString(); });
  setUI({ mais: null });
  const s2 = S();
  if (antes && k && tem(s2, k) && mapaTem(s2).length > antes.n) {
    setUI({ ganhou: { k: k === 'matricula' ? 'tecnico' : k, de: antes.n, para: mapaTem(s2).length, abre: antes.abre, animado: false } });
    ir('mapa'); return;
  }
  toast('Feito! Está nos feitos do seu plano.');
}
export function apagarTudo() {
  try { localStorage.removeItem('mira-v1'); } catch { /* sem armazenamento */ }
  mut(d => { Object.assign(d, novo()); });
  useUI.setState({ hist: [], confirmaApagar: false, treino: null, respPerg: {}, resp: null, lendo: null });
  toast('Tudo apagado deste celular.');
}
