'use client';
import { Fragment } from 'react';
import { useS, useUI, mut, setUI } from '@/lib/store';
import { ir, toast, abrirPasso, abrirSheet, perguntarPorta, rolarPara } from '@/lib/acoes';
import { porque, pontos, fitPorta, fecha, abreVagas, minhaArea, vocePode, veredito, resumoPode, proxDaPorta, tem, provaDe, provaOk, type Motivo } from '@/lib/regras';
import { PORTAS, VAGAS, CONTAGEM } from '@/lib/dados';
import { REQ } from '@/lib/competencias';
import { quandoTxt } from '@/lib/datas';
import { Ic, sx, Hd, Nav, seloDe, SL, SC, Cita } from '../pecas';
import { Ganho } from './mapa';
import { TIPO, abrirPortaId } from './plano';
import type { Porta } from '@/lib/tipos';

const ST: Record<string, [string, string, string, string]> = { ok: ['check', 'var(--ok)', '#E4F2E9', 'Bate com você'], no: ['x', 'var(--no)', '#FBE9E7', 'Falta'], q: ['help', 'var(--indigo)', 'var(--lilas)', 'A confirmar'], fato: ['info', 'var(--soft)', 'var(--lei-bg)', 'Como se entra'] };
const StIc = ({ st }: { st: string }) => <span className="st" style={{ color: ST[st][1], background: ST[st][2] }} aria-hidden="true"><Ic n={ST[st][0]} /></span>;
const metaPorta = (p: Porta) => p.tipo === 'Estudo' ? [p.custo, p.quando].join(' · ') : [p.fmt, p.quando, p.custo + (p.cert ? ', com certificado' : '')].join(' · ');
const MotivoTxt = ({ x }: { x: Motivo }) => <>{x.cita && <>Você contou <Cita t={x.cita} />. </>}{x.txt}</>;
const RESP = { enem: { q: 'Você já fez o Enem?', ops: ['Sim', 'Ainda não'] }, escola: { q: 'Você fez o ensino médio em escola pública?', ops: ['Sim', 'Não'] } } as const;
export { RESP };

export function Portas() {
  const s = useS(), pf = useUI(u => u.portaFiltro), todas = useUI(u => u.portasTodas);
  const tipo = pf === 'Estudo gratuito' ? 'Estudo' : pf, estudo = pf === 'Estudo gratuito';
  const nota = (p: Porta) => (fecha(s, p) ? 10 : 0) + (estudo ? fitPorta(s, p) * 2 + (minhaArea(s, p) ? 1 : 0) : pontos(s, p));
  const lista = PORTAS.filter(p => pf === 'Todas' || p.tipo === tipo).sort((x, y) => nota(y) - nota(x));
  const vis = todas ? lista : lista.slice(0, 4), top = vis[0], resto = vis.slice(1);
  const PorQue = ({ p }: { p: Porta }) => fecha(s, p) ? <span className="pq" style={sx('border-top:0;padding-top:0')}><Ic n="mapa" /><span><strong style={sx('font-weight:600')}>Fecha o que falta no seu mapa:</strong> {p.abre ? 'matriculado, você pode fazer estágio.' : REQ[p.req!].toLowerCase() + '.'}{abreVagas(s, (p.abre || p.req)!) ? ` Abre mais ${abreVagas(s, (p.abre || p.req)!)} vagas da sua lista.` : ''}</span></span> : null;
  const Tag = ({ p }: { p: Porta }) => s.acompanho.includes(p.id) ? <span className="ok"><Ic n="check" />Você acompanha</span> : minhaArea(s, p) ? <span className="selo" style={sx('background:var(--lilas);color:var(--indigo)')}><Ic n="flag" />Sua área</span> : null;
  const Rot = ({ p }: { p: Porta }) => <span className="tipo"><Ic n={TIPO[p.tipo][0]} />{p.sub || TIPO[p.tipo][1]}</span>;
  const Quem = ({ p }: { p: Porta }) => p.org ? <span className="sm" style={sx('font-weight:500')}>{p.org}</span> : null;
  const Aviso = ({ p }: { p: Porta }) => p.statusCurto ? <span className="sm" style={sx('display:flex;gap:6px;align-items:flex-start;color:var(--no);font-weight:500')}><Ic n="clock" s="width:16px;height:16px;margin-top:3px" />{p.statusCurto}</span> : null;
  const Destaque = ({ p }: { p: Porta }) => {
    const cab = <><div className="row wrap"><span className="k" style={sx('color:var(--indigo)')}>A mais indicada para você</span><Tag p={p} /></div>
      <div style={sx('display:flex;flex-direction:column;gap:6px')}><Rot p={p} /><h3 className="hx" style={sx('margin:0;font-size:24px;line-height:1.15')}>{p.t}</h3><Quem p={p} />{p.leva && <span className="sm">Leva a: {p.leva}</span>}<span className="soft sm">{metaPorta(p)}</span><Aviso p={p} /></div><PorQue p={p} /></>;
    if (p.regras) { const v = vocePode(s, p), ve = veredito(v); return <section className="destaque">{cab}
      <div className="box"><div className="row wrap"><strong style={sx('font-weight:600;white-space:nowrap')}>Você pode</strong>{seloDe('F', p.real)}</div>{v.L.filter(x => x.st !== 'fato').map(x => <div key={x.r.id} style={sx('display:flex;gap:10px;align-items:center')}><StIc st={x.st} /><span className="sm">{x.r.txt}</span></div>)}<strong style={{ fontWeight: 600, color: ve.cor }}>{ve.t}</strong></div>
      <button type="button" className="bp" onClick={() => abrirPortaId(p.id)}>Ver a porta<Ic n="go" /></button></section>; }
    const R = porque(s, p);
    return <section className="destaque">{cab}<div className="box"><strong style={sx('font-weight:600')}>Por que é pra você</strong>{R.slice(0, 2).map((x, i) => <div key={i} style={sx('display:flex;flex-direction:column;gap:4px;align-items:flex-start')}>{seloDe(x.selo)}<span className="sm"><MotivoTxt x={x} /></span></div>)}{R.length > 2 && <span className="soft sm">+{R.length - 2} {R.length > 3 ? 'motivos' : 'motivo'} nos detalhes</span>}</div>
      <button type="button" className="bp" onClick={() => abrirPortaId(p.id)}>Ver detalhes<Ic n="go" /></button></section>;
  };
  const Cartao = ({ x }: { x: Porta }) => { const on = s.acompanho.includes(x.id), R = x.regras ? null : porque(s, x), r = x.regras ? resumoPode(s, x) : null; return (
    <button type="button" className="card vg" onClick={() => abrirPortaId(x.id)} style={on ? sx('border:1.5px solid var(--indigo)') : undefined}>
      <span className="row wrap"><Rot p={x} /><Tag p={x} /></span><strong style={sx('font-weight:600;font-size:18px;line-height:1.3')}>{x.t}</strong><Quem p={x} />{x.leva && <span className="sm">Leva a: {x.leva}</span>}<span className="soft sm">{metaPorta(x)}</span><Aviso p={x} />
      {r && <span className="pq"><Ic n={r.ic} s={`color:${r.cor}`} /><span><strong style={sx('font-weight:600')}>{r.txt}</strong>{r.extra && <span className="soft"> {r.extra}</span>}</span></span>}
      {R && R[0] && <span className="pq"><Ic n="bulb" /><span><MotivoTxt x={R[0]} />{R.length > 1 && <span className="soft"> +{R.length - 1} {R.length > 2 ? 'motivos' : 'motivo'}</span>}</span></span>}
    </button>); };
  return (<>
    <div className="top"><Hd t="Portas" back={false} /><h1 className="h1">{estudo ? 'Onde estudar de graça' : 'Outras portas para você'}</h1><p className="sub">{estudo ? 'Técnico ou faculdade, sem mensalidade. Primeiro, as que fecham o que falta no seu mapa.' : 'Primeiro, as que fecham o que falta no seu mapa. Depois, as que combinam com sua história e seu turno.'}</p></div>
    <main className="main">
      <div className="sx" role="group" aria-label="Filtrar portas">{['Estudo gratuito', 'Cursos', 'Desafios', 'Eventos', 'Todas'].map(x => <button key={x} type="button" className={`op sm2${pf === x ? ' on' : ''}`} style={sx('white-space:nowrap')} aria-pressed={pf === x} onClick={() => setUI({ portaFiltro: x, portasTodas: false })}>{x}</button>)}</div>
      {top && <Destaque p={top} />}
      {resto.map(x => <Cartao key={x.id} x={x} />)}{!top && <p className="soft">Nada nesse filtro.</p>}
      {lista.length > 4 && <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={() => setUI({ portasTodas: !todas })}>{todas ? 'Ver menos' : `Ver todas (${lista.length})`}<Ic n={todas ? 'back' : 'list'} /></button>}
      <p className="note">{estudo ? 'Requisitos das portas de estudo resumidos dos sites oficiais. Datas e documentos mudam: confira no edital.' : 'Cursos, desafios e eventos reais, conferidos em 19/10/2026. O que muda com frequência, como datas e documentos, aparece como “A confirmar”.'}</p>
    </main><Nav on="portas" />
  </>);
}

function VocePode({ p }: { p: Porta }) {
  const s = useS(), anima = useUI(u => u.anima), realce = useUI(u => u.realce);
  const v = vocePode(s, p), ve = veredito(v);
  const responder = (c: 'enem' | 'escola', o: string) => { mut(d => { d.sobre[c] = o; }); setUI({ anima: 'veredito' }); toast('Anotado. Fica salvo em “Você”.'); };
  return (
    <section className="card" id="voce-pode" aria-labelledby="vp-h">
      <div className="row wrap"><h2 className="h2" id="vp-h" style={sx('white-space:nowrap')}>Você pode</h2>{seloDe('F', p.real)}</div>
      <div role="status" className={anima === 'veredito' ? 'pop' : ''} style={sx('display:flex;flex-direction:column;gap:2px')}><p className="hx" style={{ margin: 0, fontSize: 25, lineHeight: 1.15, color: ve.cor }}>{ve.t}</p><span className="soft sm">{ve.s}</span></div>
      <ul style={sx('list-style:none;margin:0;padding:0')}>{v.L.map(x => (
        <li key={x.r.id} className={`rq${realce === x.r.id ? ' realce' : ''}`} id={'rq-' + x.r.id}><StIc st={x.st} /><span style={sx('display:flex;flex-direction:column;gap:5px;min-width:0;flex:1;align-items:flex-start')}>
          <span className="k" style={{ fontSize: 12, color: ST[x.st][1] }}>{x.st === 'fato' && x.r.rot ? x.r.rot : ST[x.st][3]}</span><strong style={sx('font-weight:600')}>{x.r.txt}</strong>{x.ev && <span className="soft sm">{x.ev}</span>}{seloDe(x.selo, p.real)}
          {x.pergunta ? <div className="flat" style={sx('padding:12px 14px;gap:8px;margin-top:4px;width:100%')}><strong style={sx('font-weight:600')}>{RESP[x.pergunta].q}</strong><div className="ops" style={sx('gap:8px')}>{RESP[x.pergunta].ops.map(o => <button key={o} type="button" className="op sm2" onClick={() => responder(x.pergunta!, o)}>{o}</button>)}</div><span className="soft sm">Fica salvo em “Você” e vale para as outras portas.</span></div>
            : (x.r.c === 'enem' || x.r.c === 'escola') ? <button type="button" className="bl sm" style={sx('min-height:36px')} onClick={() => abrirSheet({ tipo: 'resp', campo: x.r.c as 'enem' | 'escola' })}>Mudar resposta</button> : null}
        </span></li>))}</ul>
    </section>);
}

function Pergunte({ p }: { p: Porta }) {
  const R0 = useUI(u => u.resp), duvida = useUI(u => u.duvida), anima = useUI(u => u.anima);
  const R = R0 && R0.porta === p.id ? R0 : null;
  const P = R && R.i !== undefined && R.i >= 0 ? p.perguntas![R.i] : null;
  const regraId = P ? P.regra : R?.regra || null, rg = regraId ? p.regras?.find(r => r.id === regraId) : undefined;
  const texto = P ? P.r : R?.resposta;
  const realcar = (id: string) => { const el = document.getElementById('rq-' + id); rolarPara(el, true); setUI({ realce: null }); setTimeout(() => setUI({ realce: id }), 20); setTimeout(() => setUI({ realce: null }), 2600); };
  return (
    <section className="card" id="pergunte" aria-labelledby="pg-h">
      <h2 className="h2" id="pg-h" style={sx('display:flex;gap:10px;align-items:center')}><Ic n="balao" s="color:var(--indigo);width:22px;height:22px" />Pergunte à MIRA</h2>
      <p className="soft sm" style={sx('margin:-6px 0 0')}>Sobre {p.art || 'o'} {p.t}. Toque numa dúvida ou escreva a sua.</p>
      {p.perguntas && <div style={sx('display:flex;flex-direction:column;gap:8px')}>{p.perguntas.map((x, i) => { const on = !!(R && !R.livre && R.i === i); return <button key={i} type="button" className={`op lst${on ? ' on' : ''}`} aria-pressed={on} onClick={() => { setUI({ resp: { porta: p.id, i }, anima: 'resp' }); setTimeout(() => rolarPara(document.getElementById('resp-mira')), 50); }}>{x.q}</button>; })}</div>}
      {R && <div id="resp-mira" role="status" aria-live="polite" className={anima === 'resp' ? 'pop' : ''} style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px')}>
        <span className="soft sm">Você perguntou: <strong style={sx('font-weight:600;color:var(--ink)')}>{R.livre || P?.q}</strong></span>
        {R.carregando ? <span style={sx('display:flex;gap:10px;align-items:center')} className="soft"><span className="spin" />A MIRA está lendo a ficha…</span>
          : texto ? <><p style={sx('margin:0')}>{texto}</p>{rg && <div style={sx('display:flex;flex-direction:column;gap:8px;align-items:flex-start;border-top:1px solid var(--lilas2);padding-top:10px')}><div style={sx('display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center')}><span className="k" style={sx('font-size:12px')}>De onde veio</span>{seloDe('F', p.real)}</div><button type="button" className="chip" aria-label={`Ver o requisito ${rg.txt} no Você pode`} onClick={() => realcar(rg.id)}><Ic n="doc" />{rg.txt}</button><span className="soft sm" style={sx('margin-top:-2px')}>Toque para ver no “Você pode”.</span></div>}</>
            : <><p style={sx('margin:0')}>Ainda não tenho essa resposta na ficha. Dá pra conferir no site oficial.</p>{p.site && <a className="bl" style={sx('align-self:flex-start')} href={p.site} target="_blank" rel="noopener noreferrer"><Ic n="ext" />Abrir o site oficial {p.art === 'o' ? 'do' : 'da'} {p.t}</a>}</>}
      </div>}
      <div style={sx('display:flex;flex-direction:column;gap:8px')}><label className="k" htmlFor="duvida">Sua dúvida sobre {p.art || 'o'} {p.t}</label>
        <div style={sx('display:flex;gap:8px')}><input id="duvida" className="box" value={duvida} maxLength={300} autoComplete="off" enterKeyHint="send" style={sx('font-size:16px;padding:10px 14px;flex:1;min-width:0')} onChange={e => setUI({ duvida: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); perguntarPorta(); } }} /><button type="button" className="bs" disabled={!!R?.carregando} onClick={() => perguntarPorta()}>Perguntar</button></div></div>
      <p className="note">A IA responde só com o que está na ficha desta porta. Se não souber, ela diz.</p>
    </section>);
}

export function PortaTela() {
  const s = useS(), anima = useUI(u => u.anima);
  const p = PORTAS.find(x => x.id === s.portaAberta) || PORTAS[0], R = porque(s, p), on = s.acompanho.includes(p.id), estudo = p.tipo === 'Estudo', prox = proxDaPorta(s, p.id);
  const nV = p.abre ? CONTAGEM[p.abre] || 0 : p.req ? CONTAGEM[p.req] || 0 : p.sel ? VAGAS.filter(v => v.selecao.includes(p.sel!)).length : 0;
  const pr = p.req ? provaDe(s, p.req) : undefined;
  const mapa = p.req ? (tem(s, p.req) ? <><strong style={sx('font-weight:600')}>{REQ[p.req]}</strong> já está em “Você já tem”. O certificado reforça no seu currículo.</>
    : pr && provaOk(s, pr.comp) ? <><strong style={sx('font-weight:600')}>{REQ[p.req]}</strong> já tem prova na sua história. O certificado reforça no currículo.</>
      : <>Ao terminar, <strong style={sx('font-weight:600')}>{REQ[p.req]}</strong> passa para “Você já tem” no seu mapa.</>) : null;
  const fe = fecha(s, p), ab = abreVagas(s, (p.abre || p.req || '') as string);
  const prazoPassou = p.prazo && Date.parse(p.prazo.data) < Date.now();
  return (<>
    <div className="top"><Hd t={estudo ? 'Porta de estudo' : 'Oportunidade'} /><h1 className="h1">{p.t}</h1>
      <div style={sx('display:flex;flex-wrap:wrap;gap:4px 16px')} className="sm soft"><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n={TIPO[p.tipo][0]} s="width:18px;height:18px" />{p.sub || TIPO[p.tipo][1]}</span><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n="pin" s="width:18px;height:18px" />{p.fmt}</span><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n="clock" s="width:18px;height:18px" />{p.quando}</span></div>
      {p.org && <span className="sm" style={sx('font-weight:500')}>{p.org}</span>}{p.leva && <span className="sm" style={sx('font-weight:500')}>Leva a: {p.leva}</span>}</div>
    <main className="main">
      {on && <section className={`flat${anima === 'acompanha' ? ' pop' : ''}`} style={sx('flex-direction:row;align-items:flex-start;gap:12px;padding:16px 18px')}><Ic n="check" s="color:var(--ok);margin-top:3px;stroke-width:2.4" /><div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><strong style={sx('font-weight:600')}>Você acompanha esta porta</strong><span className="sm">{prox ? `Próximo passo: ${quandoTxt(prox.quando)} · ${prox.acao}` : 'Ainda sem passo marcado.'}</span><button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={() => ir('plano')}>Ver no meu plano<Ic n="go" /></button></div></section>}
      <div style={sx('display:flex;gap:8px 16px;flex-wrap:wrap;align-items:center')}><button type="button" className="bs" onClick={() => abrirPasso({ tipo: 'porta', id: p.id })}><Ic n="cal" />Escolher meu próximo passo</button>{p.site && <a className="bl" href={p.site} target="_blank" rel="noopener noreferrer"><Ic n="ext" />Ver página oficial</a>}</div>
      {p.status && <section className="flat" role="note" style={sx('flex-direction:row;align-items:flex-start;gap:12px;background:var(--lei-bg);border-color:transparent')}><Ic n="clock" s="color:var(--no);margin-top:2px" /><div style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><strong style={sx('font-weight:600')}>Inscrições fechadas</strong><span className="sm">{p.status}</span><span className="soft sm">Dá para acompanhar a porta e marcar um lembrete para conferir.</span></div></section>}
      {p.regras && <VocePode p={p} />}
      <Pergunte p={p} />
      {R.length > 0 && <section className="card"><h2 className="h2">Por que é pra você</h2><ul style={sx('list-style:none;margin:0;padding:0')}>{R.map((x, i) => <li key={i} style={sx('display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding:14px 0;border-top:1px solid var(--line)')}>{seloDe(x.selo)}<span><MotivoTxt x={x} /></span></li>)}</ul></section>}
      <section className="card"><h2 className="h2">O que você ganha</h2><p style={sx('margin:0')}>{p.ganho}</p>
        {p.lei && <div style={sx('display:flex;flex-direction:column;gap:6px;align-items:flex-start')}><SL /><span className="sm">{p.lei} <span className="soft">Lei 11.788/2008, art. 1º</span></span></div>}
        {fe && ab > 0 && <Ganho n={ab} txt={p.abre ? 'passam a ser possíveis.' : 'passam a pedir só o que você tem.'} estagio={!!p.abre} />}
        {mapa && <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px')}><span className="k">No seu mapa</span><span className="sm">{mapa}</span><button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={() => ir('mapa')}>Ver meu mapa<Ic n="go" /></button></div>}
        {nV > 0 && !(fe && ab) && <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:6px')}><span className="k">Nas suas vagas</span><span className="sm">Ajuda em {nV} das {VAGAS.length} vagas da sua lista.</span><button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={() => ir('vagas')}>Ver vagas<Ic n="go" /></button></div>}</section>
      <section className="card"><div className="row wrap"><h2 className="h2" style={sx('white-space:nowrap')}>Como funciona</h2>{seloDe('F', p.real)}</div>
        <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px')}>{p.passos.map((x, i) => <li key={i} style={sx('display:flex;align-items:center;gap:12px')}><span className="pt" style={sx('background:var(--lilas);color:var(--indigo);font-weight:600;width:30px;height:30px')}>{i + 1}</span>{x}</li>)}</ol>
        <dl className="dl" style={sx('font-size:15px;padding-top:12px;border-top:1px solid var(--line)')}>
          {([['Custo', p.custo], ['Formato', p.fmt], ['Quando', p.quando], ...(estudo ? [['Leva a', p.leva], ...(p.prazo ? [['Inscrição', p.prazo.curto + (prazoPassou ? ' (já passou)' : '')]] : [])] : [['Certificado', p.certTxt || (p.cert ? 'Sim' : 'Não')], ...(p.org ? [['Quem oferece', p.org]] : []), ...(p.fonte ? [['Fonte', p.fonte]] : [])])] as [string, string][]).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
        </dl>
        {p.conf && <div style={sx('display:flex;flex-direction:column;gap:6px;align-items:flex-start;padding-top:12px;border-top:1px solid var(--line)')}><SC /><span className="soft sm">{p.conf}</span></div>}</section>
      <div style={sx('display:flex;flex-direction:column;gap:10px')}><button type="button" className="bp" onClick={() => abrirPasso({ tipo: 'porta', id: p.id })}><Ic n="cal" />Escolher meu próximo passo</button>{p.site && <a className="bs w100" href={p.site} target="_blank" rel="noopener noreferrer">Abrir a página oficial<Ic n="ext" /></a>}
        <button type="button" className="bl" style={sx('align-self:center')} aria-pressed={on} onClick={() => { mut(d => { d.acompanho = on ? d.acompanho.filter(x => x !== p.id) : [...d.acompanho, p.id]; }); toast(on ? 'Você deixou de acompanhar esta porta.' : 'Você acompanha esta porta. Ela fica no seu plano.', on ? undefined : { label: 'Ver', go: 'plano' }); }}>{on ? 'Deixar de acompanhar' : 'Só acompanhar, sem marcar passo'}</button>
        <p className="cap">O passo vai para o seu plano e, se você quiser, para a agenda do celular.</p></div>
      <p className="note">{p.real ? 'Ficha montada com informação pública, conferida em 19/10/2026. Datas e regras podem mudar: confira no site antes de ir.' : 'Ficha resumida do site oficial. Requisitos, datas e valores mudam: confira no edital.'}</p>
    </main><Nav on="portas" />
  </>);
}
