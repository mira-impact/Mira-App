'use client';
import { useS, useUI, mut, setUI, UI, VAZIO } from '@/lib/store';
import { ir, toast, abrirSheet, fimProvas, rolarPara, enviarResposta, decidirPergunta, proxPergunta } from '@/lib/acoes';
import { totalProvas } from '@/lib/regras';
import { COMP } from '@/lib/competencias';
import { Ic, sx, Hd, Dots, SV, SG, OK, Partes, BotaoMic } from '../pecas';
import { cap1 } from '@/lib/datas';

export function Vontades() {
  const L = useS(s => s.leitura?.vontades ?? VAZIO), concluiu = useS(s => s.concluiu);
  if (!L.length) return null;
  const vira = (v: (typeof L)[number]) => v.comp ? { t: 'É uma vontade, não uma experiência. Virou sugestão no seu plano: um curso gratuito, com certificado.', go: 'plano', i: 'plano', l: 'Ver no meu plano' }
    : v.area ? { t: `As vagas de ${v.area.toLowerCase()} aparecem primeiro para você.`, go: 'vagas', i: 'mala', l: 'Ver vagas' }
      : { t: 'Fica anotado. Ajuda a MIRA a escolher as portas que aparecem primeiro.', go: 'portas', i: 'porta', l: 'Ver as portas' };
  return (
    <section className="flat" style={sx('border:1.5px solid var(--lilas2);gap:12px;margin-top:6px')}>
      <h2 className="h2">O que você quer</h2><span className="soft sm" style={sx('margin-top:-6px')}>Vontade não vira prova. Vira caminho.</span>
      {L.map(v => { const x = vira(v); return <div key={v.disse} style={sx('display:flex;flex-direction:column;gap:2px')}><span style={sx('font-weight:500')}>“<span className="vt">{cap1(v.disse)}</span>”</span><span className="soft sm">{x.t}</span>{concluiu && <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={() => ir(x.go)}><Ic n={x.i} />{x.l}</button>}</div>; })}
    </section>
  );
}
export function Barradas() {
  const L = useS(s => s.leitura?.barradas ?? VAZIO);
  if (!L.length) return null;
  return (
    <section className="flat" style={sx('border:1.5px solid #F1C7C2;gap:12px;margin-top:6px')}>
      <h2 className="h2">A MIRA barrou {L.length}</h2><span className="soft sm" style={sx('margin-top:-6px')}>Seria exagero. A MIRA não inventa.</span>
      {L.map(b => <div key={b.nome} style={sx('display:flex;flex-direction:column;gap:2px')}><span className="strike" style={sx('font-weight:600')}>{b.nome}</span><span className="soft sm">{b.motivo}</span></div>)}
    </section>
  );
}

export function Provas() {
  const provas = useS(s => s.leitura?.provas ?? VAZIO), dec = useS(s => s.provas), motivos = useS(s => s.motivos), concluiu = useS(s => s.concluiu), nPerg = useS(s => s.leitura?.perguntas.length || 0);
  const N = provas.length, decN = provas.filter(p => dec[p.comp]).length, falta = N - decN;
  const proxima = (comp: string) => setTimeout(() => {
    const s = useS.getState(), L = s.leitura?.provas || [], i = L.findIndex(p => p.comp === comp);
    const prox = [...L.slice(i + 1), ...L.slice(0, i)].find(p => !s.provas[p.comp]);
    if (prox) rolarPara(document.getElementById('pv-' + prox.comp), true);
  }, 60);
  return (<>
    <div className="top"><Hd t="Suas provas" dir={`${decN} de ${N}`} /><Dots n={Math.max(N, 1)} on={decN} />
      <h1 className="h1">{N ? `Encontramos ${N} ${N > 1 ? 'coisas' : 'coisa'} que as vagas pedem.` : 'Ainda não achamos provas.'}</h1>
      <p className="sub">{N ? 'Cada uma vem de uma frase sua. Só fica o que você confirmar.' : 'Conte com mais detalhes o que você faz: onde, com quem, com que frequência.'}</p></div>
    <main className="main" style={sx('gap:14px;padding-top:24px')}>
      {N > 0 && <div className="row wrap"><SV /><OK /></div>}
      {provas.map(p => { const st = dec[p.comp], m = motivos[p.comp]; return (
        <article key={p.comp} className={`card prova-li${st === 'ok' ? ' pv-ok' : st === 'no' ? ' pv-no' : ''}`} id={'pv-' + p.comp}>
          <div className="pv-txt" style={sx('display:flex;flex-direction:column;gap:12px')}><p style={sx('margin:0;font-size:18px;line-height:1.5')}>“<Partes p={p.partes} />”</p>
            <div style={sx('display:flex;flex-direction:column;gap:0')}><span className="soft sm">Para as vagas, isso é</span><h2 className="hx" style={sx('margin:0;font-size:22px;line-height:1.15;color:var(--indigo);text-wrap:balance')}>{p.nome}</h2></div></div>
          {st === 'no' && m?.motivo && <span className="soft sm">Você tirou: {m.motivo}</span>}
          <div className="pv-bts">
            <button type="button" className={`bs${st === 'ok' ? ' on' : ''}`} aria-pressed={st === 'ok'} onClick={() => { mut(d => { d.provas[p.comp] = 'ok'; delete d.motivos[p.comp]; }); proxima(p.comp); }}><Ic n="check" />{st === 'ok' ? 'Confirmada' : 'É isso'}</button>
            <button type="button" className={`bs${st === 'no' ? ' on' : ''}`} aria-pressed={st === 'no'} onClick={() => abrirSheet({ tipo: 'recusa', comp: p.comp })}><Ic n="x" />{st === 'no' ? 'Tirada' : 'Não é isso'}</button>
          </div>
        </article>); })}
      {falta > 0 && <button type="button" className="bs w100 quebra" onClick={() => { mut(d => { for (const p of provas) if (!d.provas[p.comp]) d.provas[p.comp] = 'ok'; }); toast('Provas confirmadas. Dá para mudar depois, em “Ver minhas provas”.'); }}><Ic n="check" />Estão certas: confirmar {falta === N ? 'todas' : `as ${falta} que faltam`}</button>}
      {!N && <button type="button" className="bs w100" onClick={() => ir('relato')}><Ic n="plus" />Contar com mais detalhes</button>}
      <Vontades /><Barradas />
    </main>
    <div className="foot"><button type="button" className="bp" disabled={falta > 0} aria-disabled={falta > 0} onClick={() => fimProvas()}>{falta ? `Falta decidir ${falta}` : concluiu ? <>Ver meu mapa<Ic n="go" /></> : nPerg ? <>Continuar: {nPerg} {nPerg > 1 ? 'perguntas rápidas' : 'pergunta rápida'}<Ic n="go" /></> : <>Ver meu mapa<Ic n="go" /></>}</button></div>
  </>);
}

export function ProvasLista() {
  const provas = useS(s => s.leitura?.provas ?? VAZIO), dec = useS(s => s.provas), motivos = useS(s => s.motivos), concluiu = useS(s => s.concluiu);
  const total = useS(totalProvas);
  return (<>
    <div className="top"><Hd t="Todas as suas provas" /><h1 className="h1">{total} {total === 1 ? 'confirmada' : 'confirmadas'}</h1><p className="sub">Toque para mudar. O mapa, as vagas e o currículo mudam junto.</p></div>
    <main className="main">
      {provas.map(p => { const st = dec[p.comp]; return (
        <article key={p.comp} className="flat" style={sx('gap:8px')}>
          <div className="row wrap" style={sx('align-items:flex-start')}><strong style={sx('font-weight:600;font-size:18px')}>{p.nome}</strong>{st === 'ok' ? <span className="ok"><Ic n="check" />Confirmada</span> : st === 'no' ? <span className="no"><Ic n="x" />Recusada</span> : <span className="soft sm">A decidir</span>}</div>
          <p style={sx('margin:0')}>“<Partes p={p.partes} />”</p>
          {p.origem === 'pergunta' && <span className="soft sm">Das perguntas rápidas</span>}
          {st === 'no' && motivos[p.comp]?.motivo && <span className="soft sm">Motivo: {motivos[p.comp].motivo}</span>}
          <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className={`bs${st === 'ok' ? ' on' : ''}`} onClick={() => mut(d => { d.provas[p.comp] = 'ok'; delete d.motivos[p.comp]; })}><Ic n="check" />Confirmar</button><button type="button" className={`bs${st === 'no' ? ' on' : ''}`} onClick={() => abrirSheet({ tipo: 'recusa', comp: p.comp })}><Ic n="x" />Recusar</button></div>
        </article>); })}
      {!provas.length && <div className="flat"><strong style={sx('font-weight:600')}>Nenhuma prova ainda.</strong><button type="button" className="bl" onClick={() => ir('relato')}><Ic n="plus" />Contar minha história</button></div>}
      <Vontades /><Barradas />
      <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={() => ir('relato')}><Ic n="plus" />Contar mais da minha história</button>
      <button type="button" className="bp" onClick={() => fimProvas()}>{concluiu ? 'Ver meu mapa' : 'Continuar'}</button>
    </main>
  </>);
}

export function Perguntas() {
  const L = useS(s => s.leitura?.perguntas ?? VAZIO), i = useS(s => s.iPergunta), dec = useS(s => s.provas);
  const respPerg = useUI(u => u.respPerg);
  const k = Math.min(i, Math.max(L.length - 1, 0)), q = L[k];
  if (!q) return null;
  const r = respPerg[q.comp] || { texto: '', fase: 0 as const, prova: null }, st = r.prova ? dec[r.prova.comp] : undefined;
  const setTexto = (t: string) => setUI({ respPerg: { ...UI().respPerg, [q.comp]: { ...r, texto: t.slice(0, 1000), fase: 0, prova: null } } });
  return (<>
    <div className="top"><Hd t={`Mais ${L.length} ${L.length > 1 ? 'perguntas rápidas' : 'pergunta rápida'}`} dir={`${k + 1} de ${L.length}`} /><Dots n={L.length} on={k + 1} /></div>
    <main className="main" key={q.comp}>
      <section className="card pop" style={sx('gap:10px')}><SG /><p style={sx('margin:0')} className="soft sm">Muitas vagas pedem <strong style={sx('color:var(--ink);font-weight:600')}>{COMP[q.comp].nome.toLowerCase()}</strong>. Você ainda não falou disso.</p><h1 className="hx" style={sx('margin:0;font-size:clamp(20px,6vw,23px);line-height:1.2')}>{q.q}</h1></section>
      <label className="k" htmlFor="resp">Sua resposta</label>
      <textarea id="resp" rows={3} value={r.texto} disabled={r.fase === 1} onChange={e => setTexto(e.target.value)} />
      <div style={sx('display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center')}>
        <BotaoMic rotulo="Falar" aoFalar={t => setTexto((r.texto ? r.texto + ' ' : '') + t)} onSemSuporte={m => toast(m || 'Não deu para gravar aqui.', undefined, true)} />
        <button type="button" className="bl" onClick={() => proxPergunta()}>Não lembro de nada assim</button>
      </div>
      {r.erro && <div className="aviso-erro" role="alert"><Ic n="info" s="color:var(--no)" /><span>A IA não respondeu. Tente de novo.</span></div>}
      {r.fase !== 2 && <button type="button" className="bs w100" disabled={r.texto.trim().length < 8 || r.fase === 1} onClick={() => enviarResposta(q.comp, q.q)}>{r.fase === 1 ? <><span className="spin" />Conferindo…</> : 'Ver o que a MIRA achou'}</button>}
      {r.fase === 2 && (r.prova ? (
        <section aria-label="Nova prova" className="flat pop" style={sx(`border:2px solid ${st === 'no' ? 'var(--line2)' : 'var(--ok)'};gap:10px`)}>
          <div className="row" style={sx('flex-wrap:wrap')}><span className="k" style={sx(`color:${st === 'no' ? 'var(--soft)' : 'var(--ok)'}`)}>Nova prova</span><OK /></div>
          <h2 className="h3">{r.prova.nome}</h2>
          <p className="q" style={sx('font-size:18px')}>“<Partes p={r.prova.partes} />”</p>
          <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px')}>
            <button type="button" className={`bs${st === 'ok' ? ' on' : ''}`} onClick={() => decidirPergunta(r.prova!, 'ok')}><Ic n="check" />Confirmar</button>
            <button type="button" className={`bs${st === 'no' ? ' on' : ''}`} onClick={() => decidirPergunta(r.prova!, 'no')}><Ic n="x" />Recusar</button>
          </div>
        </section>
      ) : <div className="flat pop" style={sx('gap:6px')}><strong style={sx('font-weight:600')}>Nessa resposta, a MIRA não achou uma prova.</strong><span className="soft sm">Sem problema. Dá para contar com mais detalhes ou seguir em frente.</span></div>)}
    </main>
    <div className="foot" style={sx('flex-direction:row;align-items:center;gap:12px')}><button type="button" className="bl" style={sx('color:var(--ink);padding:0 8px')} onClick={() => proxPergunta()}>Pular</button><button type="button" className="bp" onClick={() => proxPergunta()}>{k < L.length - 1 ? 'Próxima pergunta' : 'Ver meu mapa'}</button></div>
  </>);
}
