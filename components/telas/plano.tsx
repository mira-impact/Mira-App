'use client';
import { Fragment } from 'react';
import { useS, useUI, mut, setUI, UI } from '@/lib/store';
import { ir, toast, abrirPasso, feitoPasso } from '@/lib/acoes';
import { pendentes, passou, origemTxt, sugestoes, sugEstado, type Sug } from '@/lib/regras';
import { PORTAS } from '@/lib/dados';
import { quandoTxt, cap1, diaISO, difDias, hojeISO, dowISO, ddmm } from '@/lib/datas';
import { baixarIcs, evPasso, evPrazo } from '@/lib/ics';
import { Ic, sx, Hd, Nav, seloDe, Cita } from '../pecas';
import type { Origem, Passo } from '@/lib/tipos';

const TIPO: Record<string, [string, string]> = { Estudo: ['escola', 'Estudo gratuito'], Cursos: ['cap', 'Curso'], Desafios: ['flag', 'Desafio'], Eventos: ['cal', 'Evento'] };
export { TIPO };
export const abrirPortaId = (id: string) => { mut(d => { d.portaAberta = id; }); setUI({ resp: null, duvida: '' }); ir('porta'); };
export const abrirVagaId = (id: string) => { setUI({ vaga: id }); mut(d => { if (!d.vistas.includes(id)) d.vistas.push(id); }); ir('vaga'); };

function OrigemBtn({ o }: { o: Origem }) {
  const i = o.tipo === 'vaga' ? 'mala' : o.tipo === 'porta' ? 'porta' : 'bulb';
  const go = o.tipo === 'porta' ? () => abrirPortaId(o.id) : o.tipo === 'vaga' ? () => abrirVagaId(o.id) : o.id === 'vagas' ? () => ir('vagas') : null;
  return go ? <button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={go}><Ic n={i} />{origemTxt(o)}</button>
    : <span className="soft sm" style={sx('display:flex;gap:6px;align-items:center')}><Ic n={i} s="width:18px;height:18px" />{origemTxt(o)}</span>;
}

export function Plano() {
  const s = useS(), mais = useUI(u => u.mais), feitosAberto = useUI(u => u.feitosAberto);
  const pend = pendentes(s), venc = pend.filter(passou), fut = pend.filter(x => !passou(x));
  const feitos = s.passos.filter(x => x.feito).sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || ''));
  const acomp = s.acompanho.map(id => PORTAS.find(p => p.id === id)).filter(Boolean) as typeof PORTAS;
  const prazos = acomp.filter(p => p.prazo && Date.parse(p.prazo.data) > Date.now());
  const semPasso = acomp.filter(p => !pend.some(x => x.origem.tipo === 'porta' && x.origem.id === p.id));
  const vazio = !s.passos.length && !acomp.length, hoje = hojeISO(), fimSemana = (7 - dowISO(hoje)) % 7;
  const tirar = (id: string) => { const x = s.passos.find(y => y.id === id); if (!x) return; mut(d => { d.passos = d.passos.filter(y => y.id !== id); }); setUI({ tirado: x, mais: null });
    toast('Tirei do seu plano.', { label: 'Desfazer', fn: () => { const t = UI().tirado; if (t) { mut(d => { d.passos.push(t); }); setUI({ tirado: null }); toast('Voltou para o seu plano.'); } } }); };
  const Item = ({ x, atrasado }: { x: Passo; atrasado?: boolean }) => (
    <article className="card" style={sx(`gap:10px;${atrasado ? 'border:1.5px solid #F1C7C2;' : ''}`)}>
      <div className="row wrap"><span style={sx(`display:flex;gap:6px;align-items:center;font-weight:600;color:${atrasado ? 'var(--no)' : 'var(--indigo)'}`)}><Ic n="cal" s="width:18px;height:18px" />{cap1(quandoTxt(x.quando))}</span>{x.lembrete && !atrasado && <span className="soft sm" style={sx('display:flex;gap:4px;align-items:center')}><Ic n="bell" s="width:16px;height:16px" /><span className="sr">aviso </span>1h antes</span>}</div>
      <h3 className="h3">{x.acao}</h3><OrigemBtn o={x.origem} />
      <div style={sx('display:flex;gap:8px')}><button type="button" className="bs fill" style={sx('flex:1')} onClick={() => atrasado ? abrirPasso(x.origem, { editId: x.id }) : feitoPasso(x.id)}>{atrasado ? <><Ic n="clock" />Remarcar</> : <><Ic n="check" />Feito</>}</button><button type="button" className="bs mais" aria-expanded={mais === x.id} aria-label="Mais opções" onClick={() => setUI({ mais: mais === x.id ? null : x.id })}><Ic n="mais" s="fill:currentColor;stroke:none" /></button></div>
      {mais === x.id && <div className="pop" style={sx('display:flex;flex-wrap:wrap;gap:0 20px;border-top:1px solid var(--line);padding-top:4px')}>
        {atrasado ? <button type="button" className="bl" onClick={() => feitoPasso(x.id)}><Ic n="check" />Marcar como feito</button>
          : <><button type="button" className="bl" onClick={() => { const p = PORTAS.find(y => y.id === x.origem.id); if (baixarIcs([evPasso(x, origemTxt(x.origem), p?.site)], 'mira-passo.ics')) toast('Arquivo da agenda criado. Abra para salvar no calendário.'); }}><Ic n="cal" />Pôr na agenda</button><button type="button" className="bl" onClick={() => abrirPasso(x.origem, { editId: x.id })}><Ic n="clock" />Remarcar</button></>}
        <button type="button" className="bl" style={sx('color:var(--soft)')} onClick={() => tirar(x.id)}><Ic n="trash" />Tirar do plano</button></div>}
    </article>);
  const grupos: [string, (x: Passo) => boolean][] = [['Esta semana', x => difDias(hoje, diaISO(x.quando)) <= fimSemana], ['Próximas semanas', x => difDias(hoje, diaISO(x.quando)) <= fimSemana + 21], ['Mais pra frente', () => true]];
  const usados = new Set<string>();
  const blocos = grupos.map(([t, f]) => { const L = fut.filter(x => !usados.has(x.id) && f(x)); L.forEach(x => usados.add(x.id)); return L.length ? <div key={t} style={sx('display:flex;flex-direction:column;gap:14px')}><h3 className="k" style={sx('color:var(--indigo);margin:6px 0 -6px')}>{t}</h3>{L.map(x => <Item key={x.id} x={x} />)}</div> : null; });
  const todas = sugestoes(s), sugs = vazio ? todas : todas.filter(g => !sugEstado(s, g));
  const Sugestao = ({ g }: { g: Sug }) => { const e = sugEstado(s, g); return (
    <article className="card" style={sx(`gap:10px;${e ? 'opacity:.8;' : ''}`)}>
      <h3 className="h3" style={sx('font-size:19px')}>{g.acao}</h3>{seloDe(g.selo)}<p style={sx('margin:0')} className="soft sm">{g.cita && <>Você disse <Cita t={g.cita} />. </>}{g.why}</p>
      <dl className="dl" style={sx('font-size:15px')}>{g.dl.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      {e ? <span className="ok"><Ic n="check" />{e === 'feito' ? 'Feito' : 'No seu plano'}</span>
        : <button type="button" className="bs fill w100" onClick={() => abrirPasso(g.origem, { acao: g.acao })}><Ic n="plus" />Pôr no meu plano</button>}
      <div className="grid2">{g.id === 'vagas' ? <button type="button" className="bs" onClick={() => ir('vagas')}><Ic n="mala" />Ver vagas</button>
        : <>{g.porta?.site && <a className="bs" href={g.porta.site} target="_blank" rel="noopener noreferrer"><Ic n="ext" />Site oficial</a>}<button type="button" className="bs" onClick={() => abrirPortaId(g.porta!.id)}><Ic n={g.porta!.tipo === 'Cursos' ? 'cap' : 'porta'} />Ver {g.porta!.tipo === 'Cursos' ? 'o curso' : 'a porta'}</button></>}</div>
    </article>); };
  const pularCurso = () => { const c = todas.find(g => g.id.startsWith('curso:')); if (!c) return; mut(d => { d.sugPuladas.push(c.porta!.id); }); const nova = sugestoes(useS.getState()).find(g => g.id.startsWith('curso:'));
    toast(nova ? 'Trocamos a sugestão de curso.' : 'Por enquanto, não há outra sugestão de curso. Veja as portas.', nova ? undefined : { label: 'Portas', go: 'portas' }); };
  return (<>
    <div className="top"><Hd t="Meu plano" back={false} /><h1 className="h1">{pend.length ? `${pend.length} ${pend.length > 1 ? 'passos marcados' : 'passo marcado'}` : vazio ? 'Monte seu plano' : 'Nenhum passo marcado'}</h1>
      <p className="sub">{pend.length ? 'Com dia e hora, do jeito que cabe na sua rotina.' : vazio ? 'Seu plano ainda está vazio. Escolha um primeiro passo: ele ganha dia e hora e aparece no Início.' : 'O que você escolher aparece aqui, com dia e hora.'}{feitos.length ? ` ${feitos.length} ${feitos.length > 1 ? 'feitos' : 'feito'} até agora.` : ''}</p></div>
    <main className="main">
      {venc.length > 0 && <section style={sx('display:flex;flex-direction:column;gap:14px')}><h2 className="h2" style={sx('color:var(--no)')}>Passou do dia</h2><p className="soft sm" style={sx('margin:-6px 0 0')}>Remarque para um dia que caiba, ou marque como feito.</p>{venc.map(x => <Item key={x.id} x={x} atrasado />)}</section>}
      {fut.length ? <section style={sx('display:flex;flex-direction:column;gap:14px')}><h2 className="h2">Próximos passos</h2>{blocos}</section>
        : !vazio && <section className="flat" style={sx('align-items:flex-start')}><strong style={sx('font-weight:600')}>Nenhum passo com data pela frente.</strong><span className="soft sm">Escolha o próximo numa porta ou numa sugestão abaixo.</span><button type="button" className="bl" onClick={() => ir('portas')}>Ver as portas<Ic n="go" /></button></section>}
      {prazos.length > 0 && <section style={sx('display:flex;flex-direction:column;gap:14px')}><h2 className="h2">Prazos das portas que você acompanha</h2>{prazos.map(p => { const d = difDias(hoje, diaISO(p.prazo!.data)); return (
        <article key={p.id} className="flat" style={sx('gap:8px')}><strong style={sx('font-weight:600')}>{p.t}: {p.prazo!.txt.charAt(0).toLowerCase() + p.prazo!.txt.slice(1)} {p.prazo!.curto}</strong><span className="soft sm">{d <= 0 ? 'Fecha hoje.' : `Faltam ${d} ${d > 1 ? 'dias' : 'dia'}.`}</span>{seloDe('F', p.real)}
          <div style={sx('display:flex;gap:8px 16px;flex-wrap:wrap;align-items:center')}><button type="button" className="bs" onClick={() => { if (baixarIcs([evPrazo(p)], `mira-prazo-${p.id}.ics`)) toast('Prazo na agenda, com aviso 1 hora antes.'); }}><Ic n="cal" />Pôr na agenda</button><button type="button" className="bl" onClick={() => abrirPortaId(p.id)}>Ver a porta</button></div></article>); })}</section>}
      {semPasso.length > 0 && <section style={sx('display:flex;flex-direction:column;gap:14px')}><h2 className="h2">Portas que você quer, sem passo marcado</h2>{semPasso.map(p => <article key={p.id} className="flat" style={sx('gap:8px')}><span className="tipo"><Ic n={TIPO[p.tipo][0]} />{p.sub || TIPO[p.tipo][1]}</span><strong style={sx('font-weight:600;font-size:18px')}>{p.t}</strong><div style={sx('display:flex;gap:8px 16px;flex-wrap:wrap;align-items:center')}><button type="button" className="bs fill" onClick={() => abrirPasso({ tipo: 'porta', id: p.id })}><Ic n="cal" />Escolher passo</button><button type="button" className="bl" onClick={() => abrirPortaId(p.id)}>Ver a porta</button></div></article>)}</section>}
      {sugs.length > 0 && <section style={sx(`display:flex;flex-direction:column;gap:14px;${vazio ? '' : 'margin-top:8px;padding-top:24px;border-top:1px solid var(--line)'}`)}>
        <div style={sx('display:flex;flex-direction:column;gap:6px')}><h2 className="h2">{vazio ? 'Comece por uma sugestão da MIRA' : 'Mais sugestões da MIRA'}</h2><p className="soft sm" style={sx('margin:0')}>Feitas com a sua história. Faça o curso junto com as candidaturas, não antes.</p></div>
        {sugs.map(g => <Sugestao key={g.id} g={g} />)}
        {todas.some(g => g.id.startsWith('curso:')) && <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={pularCurso}><Ic n="swap" />Pedir outra sugestão de curso</button>}
      </section>}
      {vazio && <section className="flat" style={sx('gap:8px')}><h2 className="h3">Prefere outro caminho?</h2><p className="sm" style={sx('margin:0')}>Nas portas tem técnico e faculdade sem mensalidade, cursos, desafios e eventos.</p><button type="button" className="bs" style={sx('align-self:flex-start;margin-top:4px')} onClick={() => ir('portas')}><Ic n="porta" />Ver as portas</button></section>}
      {feitos.length > 0 && <section className="flat" style={sx('gap:0;padding:6px 20px')}><button type="button" className="bl w100" style={sx('justify-content:space-between;color:var(--ink)')} aria-expanded={feitosAberto} onClick={() => setUI({ feitosAberto: !feitosAberto })}><span style={sx('display:flex;gap:8px;align-items:center')}><Ic n="check" s="color:var(--ok)" />Feitos ({feitos.length})</span><span className="soft sm">{feitosAberto ? 'Recolher' : 'Ver'}</span></button>
        {feitosAberto && <ul style={sx('list-style:none;margin:0;padding:0 0 8px')}>{feitos.map(x => <li key={x.id} className="row" style={sx('padding:12px 0;border-top:1px solid var(--line);align-items:flex-start')}><span style={sx('display:flex;flex-direction:column;min-width:0')}><strong style={sx('font-weight:600')}>{x.acao}</strong><span className="soft sm">{origemTxt(x.origem)}{x.feitoEm ? ` · feito em ${ddmm(diaISO(x.feitoEm))}` : ''}</span></span>
          <button type="button" className="bl sm" style={sx('flex:none')} onClick={() => {
            if (x.origem.tipo === 'vaga') { mut(d => { d.candidaturas = d.candidaturas.filter(c => c !== x.origem.id); d.passos = d.passos.filter(y => y.id !== x.id); }); toast('Candidatura desmarcada.'); }
            else { mut(d => { const y = d.passos.find(z => z.id === x.id)!; y.feito = false; delete y.feitoEm; }); toast(passou(x) ? 'Voltou para o plano. A data já passou: remarque.' : 'Voltou para os próximos passos.'); }
          }}>Desfazer</button></li>)}</ul>}</section>}
      <p className="note">Seus passos ficam neste celular. Datas e regras das portas podem mudar: confira no site oficial.</p>
    </main><Nav on="plano" />
  </>);
}
