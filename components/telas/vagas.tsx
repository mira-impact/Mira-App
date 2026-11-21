'use client';
import { useS, useUI, mut, setUI } from '@/lib/store';
import { ir, toast, treinoLer } from '@/lib/acoes';
import { avaliar, tem, provaDe, provaOk, confirmadas, minhaArea, areasTxt, totalProvas, planoDe, portaQueResolve, textoCurriculo, concluido } from '@/lib/regras';
import { VAGAS } from '@/lib/dados';
import { REQ, BASE } from '@/lib/competencias';
import { diasDesde } from '@/lib/datas';
import { Ic, sx, Hd, Nav, SV, SG, OK, Partes, BotaoMic } from '../pecas';
import { PassoLendo } from './entrada';
import { abrirSheet } from '@/lib/acoes';
import { abrirVagaId, abrirPortaId } from './plano';
import { copiarCurriculo } from './mapa';
import type { Vaga } from '@/lib/tipos';

export function Vagas() {
  const s = useS(), f = useUI(u => u.filtro), aba = useUI(u => u.aba), todasAreas = useUI(u => u.todasAreas);
  const filtraArea = s.areas.length > 0 && !todasAreas && aba === 'Combinam';
  let base = VAGAS.filter(v => f === 'Todas' || v.tipo === f);
  const fora = filtraArea ? base.filter(v => !minhaArea(s, v) && avaliar(s, v).grupo === 'cumpre') : [];
  if (filtraArea) base = base.filter(v => minhaArea(s, v));
  if (aba === 'Salvas') base = base.filter(v => s.salvas.includes(v.id));
  if (aba === 'Vistas') base = base.filter(v => s.vistas.includes(v.id));
  const av = base.map(v => ({ v, a: avaliar(s, v) }));
  const comb = VAGAS.filter(v => avaliar(s, v).grupo !== 'longe' && (!filtraArea || minhaArea(s, v)));
  const Card = ({ v, a }: { v: Vaga; a: ReturnType<typeof avaliar> }) => { const salva = s.salvas.includes(v.id), cand = s.candidaturas.includes(v.id), lida = diasDesde(v.lidaEm); return (
    <button type="button" className="card vg" onClick={() => abrirVagaId(v.id)} style={salva ? sx('border:1.5px solid var(--indigo)') : undefined}>
      {s.areas.length > 0 && !filtraArea && minhaArea(s, v) && <span className="selo" style={sx('background:var(--lilas);color:var(--indigo);align-self:flex-start')}><Ic n="flag" />Sua área</span>}
      <span className="row" style={sx('align-items:flex-start')}><strong style={sx('font-weight:600;font-size:18px;line-height:1.3')}>{v.titulo}</strong>{salva && <span style={sx('color:var(--indigo)')} aria-label="Salva"><Ic n="save" s="width:22px;height:22px;fill:currentColor" /></span>}</span>
      <span className="soft sm">{v.onde} · {v.turno}</span>
      <span style={sx('display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;font-size:15px')}><span className="ok" style={sx('color:var(--ink);font-weight:600')}><Ic n="check" s="color:var(--ok)" />{a.okO} dos {a.nO} obrigatórios</span>{a.nD > 0 && <span className="soft" style={sx('white-space:nowrap')}>{a.okD} dos {a.nD} desejáveis</span>}</span>
      {a.grupo === 'plano' && <span className="soft sm" style={sx('display:flex;gap:6px;align-items:center')}><Ic n="plano" s="width:16px;height:16px" />Falta {REQ[a.faltam[0]].toLowerCase()} · {a.faltam[0] === 'matricula' ? 'uma porta de estudo resolve' : 'um curso gratuito resolve'}</span>}
      {lida > 30 && <span style={sx('align-self:flex-start;display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--soft);border:1.5px dashed #A9ACB8;border-radius:6px;padding:3px 10px;margin-top:4px')}><Ic n="clock" s="width:16px;height:16px" />lida há {lida} dias · pode ter fechado</span>}
      {cand && <span className="ok"><Ic n="check" />Você se candidatou</span>}
    </button>); };
  const Grupo = ({ g, titulo, icone }: { g: string; titulo: string; icone: React.ReactNode }) => { const L = av.filter(x => x.a.grupo === g); return L.length ? <><h3 className="h3" style={sx('display:flex;gap:8px;align-items:center;margin-top:6px')}>{icone}{titulo}</h3>{L.map(x => <Card key={x.v.id} {...x} />)}</> : null; };
  const vazio = !(aba === 'Combinam' ? av.filter(x => x.a.grupo !== 'longe') : av).length;
  return (<>
    <div className="top"><Hd t="Vagas" back={false} /><h1 className="h1">{comb.length} {comb.length === 1 ? 'vaga combina' : 'vagas combinam'} com você</h1>{filtraArea && <p className="sub">Na área que você escolheu: {areasTxt(s)}.</p>}</div>
    <main className="main">
      <button type="button" className="card" onClick={() => ir('curriculo')} style={sx('flex-direction:row;align-items:center;gap:14px;padding:14px 16px;text-align:left;cursor:pointer;width:100%')}><span style={sx('flex:none;width:44px;height:44px;border-radius:8px;background:var(--lilas);color:var(--indigo);display:flex;align-items:center;justify-content:center')}><Ic n="doc" s="width:22px;height:22px" /></span><span style={sx('flex:1;display:flex;flex-direction:column;line-height:1.35;min-width:0')}><strong style={sx('font-weight:600')}>Seu currículo base</strong><span className="soft sm">Antes: “{s.antes || 'nada'}”. Agora: feito com suas {totalProvas(s)} provas.</span></span><Ic n="go" s="width:22px;height:22px;color:var(--indigo)" /></button>
      <div className="tabs" role="tablist">{([['Combinam', comb.length], ['Salvas', s.salvas.length], ['Vistas', s.vistas.length]] as [string, number][]).map(([t, n]) => <button key={t} type="button" role="tab" className={`tab${aba === t ? ' on' : ''}`} aria-selected={aba === t} onClick={() => setUI({ aba: t })}>{t} ({n})</button>)}</div>
      {aba === 'Combinam' && <div className="flat" style={sx('flex-direction:row;align-items:center;gap:10px;padding:10px 12px 10px 16px')}><Ic n="flag" s="color:var(--indigo)" /><span className="sm" style={sx('flex:1;min-width:0')}>{s.areas.length ? (filtraArea ? <>Só <strong style={sx('font-weight:600')}>{areasTxt(s)}</strong></> : 'Mostrando todas as áreas') : 'Todas as áreas'}</span>{s.areas.length > 0 && <button type="button" className="bl sm" style={sx('min-height:40px;flex:none')} onClick={() => setUI({ todasAreas: !todasAreas })}>{filtraArea ? 'Ver todas' : 'Só as minhas'}</button>}<button type="button" className="bl sm" style={sx('min-height:40px;flex:none')} onClick={() => abrirSheet({ tipo: 'areas' })}>{s.areas.length ? 'Mudar' : 'Escolher área'}</button></div>}
      <div className="sx">{['Todas', 'Aprendiz', 'Estágio', 'Primeiro emprego'].map(x => <button key={x} type="button" className={`op sm2${f === x ? ' on' : ''}`} style={sx('white-space:nowrap')} onClick={() => setUI({ filtro: x })}>{x}</button>)}</div>
      {aba === 'Combinam' ? <><Grupo g="cumpre" titulo="Você já cumpre o obrigatório" icone={<Ic n="check" s="width:22px;height:22px;color:var(--ok)" />} /><Grupo g="plano" titulo="Falta um item que dá para resolver" icone={<Ic n="plano" s="width:22px;height:22px;color:var(--indigo)" />} /></> : av.map(x => <Card key={x.v.id} {...x} />)}
      {vazio && <div className="flat" style={sx('align-items:flex-start')}><strong style={sx('font-weight:600')}>{aba === 'Salvas' ? 'Nenhuma vaga salva' : aba === 'Vistas' ? 'Nenhuma vaga vista ainda' : filtraArea ? 'Nenhuma vaga da sua área combina ainda' : 'Nenhuma vaga nesse filtro'}</strong><span className="soft sm">{aba === 'Combinam' ? (filtraArea ? 'Veja as vagas de outras áreas ou mude suas áreas.' : 'Tente outro filtro, mude seus turnos em “Você” ou confirme mais provas.') : 'Abra uma vaga para ela aparecer aqui.'}</span></div>}
      {fora.length > 0 && <section className="flat" style={sx('gap:8px')}><strong style={sx('font-weight:600')}>{fora.length} {fora.length > 1 ? 'vagas de outras áreas pedem' : 'vaga de outra área pede'} o que você já tem</strong><span className="sm">{fora.map(v => v.titulo).join(' · ')}</span><button type="button" className="bs" style={sx('align-self:flex-start;margin-top:4px')} onClick={() => setUI({ todasAreas: true })}>Ver também essas vagas</button></section>}
      <p className="soft sm" style={sx('margin:0;display:flex;gap:8px')}><Ic n="info" s="width:18px;height:18px;margin-top:3px" />Contagem de requisitos, não chance de aprovação. Vagas lidas há mais de 30 dias podem ter fechado.</p>
      {VAGAS.some(v => (v as { exemplo?: boolean }).exemplo) && <p className="note">Algumas vagas desta lista ainda são de exemplo.</p>}
    </main><Nav on="vagas" />
  </>);
}

/** A prova que melhor responde à pergunta da vaga: a primeira competência da vaga que a pessoa confirmou. */
const relevantes = (s: ReturnType<typeof useS.getState>, v: Vaga) => {
  const ordem = [...v.desej, ...v.obrig, 'responsabilidade', 'problemas', 'equipe', 'atendimento'].filter((c, i, L) => !(c in BASE) && L.indexOf(c) === i);
  const conf = confirmadas(s);
  return [...ordem.map(c => conf.find(p => p.comp === c)).filter(Boolean), ...conf.filter(p => !ordem.includes(p.comp))] as ReturnType<typeof confirmadas>;
};

export function VagaTela() {
  const s = useS(), id = useUI(u => u.vaga);
  const v = VAGAS.find(x => x.id === id) || VAGAS[0], a = avaliar(s, v), salva = s.salvas.includes(v.id), cand = s.candidaturas.includes(v.id);
  const reqsVaga = new Set([...v.obrig, ...v.desej]), conf = confirmadas(s), usa = relevantes(s, v)[0];
  const faltaCurriculo = [...reqsVaga].filter(r => !(r in BASE) && !tem(s, r));
  const Req = ({ tipo, r }: { tipo: string; r: string }) => { const ok = tem(s, r), pr = provaDe(s, r), porta = portaQueResolve(r); return (
    <li style={sx('display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--line)')}>{ok ? <Ic n="check" s="width:20px;height:20px;color:var(--ok);stroke-width:2.6" /> : <span style={sx('flex:none;width:18px;height:18px;border-radius:50%;border:2px dashed #A9ACB8;margin:1px')} />}
      <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0')}><span className="k" style={sx('font-size:12px')}>{tipo}{ok ? '' : ' · falta'}</span><strong style={sx('font-weight:600')}>{REQ[r]}</strong>
        <span className="soft sm">{['idade', 'em'].includes(r) ? 'Você informou' : ['manha', 'tarde', 'noite', 'fimsemana'].includes(r) ? (ok ? 'Cabe no seu turno livre' : 'Você não marcou esse turno') : r === 'matricula' ? (ok ? 'Matrícula feita, no seu plano' : 'Uma porta de estudo resolve: técnico ou faculdade sem mensalidade')
          : pr && provaOk(s, r) ? <>“<Partes p={pr.partes} />” · Você contou</> : concluido(s, r) ? 'Curso do seu plano, concluído' : porta ? `Curso gratuito: ${porta.t}` : 'Ainda sem prova. Se você já fez isso, conte mais.'}</span>
        {!ok && r === 'matricula' && <button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={() => { setUI({ portaFiltro: 'Estudo gratuito' }); ir('portas'); }}>Ver portas de estudo<Ic n="go" /></button>}
        {!ok && r !== 'matricula' && planoDe(r) && porta && <button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:40px')} onClick={() => abrirPortaId(porta.id)}>Ver o curso<Ic n="go" /></button>}
      </span></li>); };
  const txt = textoCurriculo(s, v);
  const anuncio = () => { if (v.url) window.open(v.url, '_blank', 'noopener'); else toast('Esta vaga ainda não tem link do anúncio.', undefined, true); };
  return (<>
    <div className="top"><Hd t="Vaga" /><h1 className="h1">{v.titulo}</h1>
      <div style={sx('display:flex;flex-wrap:wrap;gap:4px 16px')} className="sm soft"><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n="pin" s="width:18px;height:18px" />{v.onde.split(' · ')[1] || v.onde}</span><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n="sun" s="width:18px;height:18px" />{v.turno}</span><span style={sx('display:flex;gap:6px;align-items:center')}><Ic n="eye" s="width:18px;height:18px" />lida há {diasDesde(v.lidaEm)} dias</span></div></div>
    <main className="main">
      <div style={sx('display:flex;gap:12px;flex-wrap:wrap;align-items:center')}><button type="button" className={`bs${salva ? ' on' : ''}`} aria-pressed={salva} onClick={() => { mut(d => { d.salvas = salva ? d.salvas.filter(x => x !== v.id) : [...d.salvas, v.id]; }); toast(salva ? 'Vaga tirada das salvas.' : 'Vaga salva.'); }}><Ic n="save" s={salva ? 'fill:currentColor' : undefined} />{salva ? 'Salva' : 'Salvar'}</button>{v.url && <button type="button" className="bl" onClick={anuncio}><Ic n="ext" />Ver anúncio original</button>}</div>
      <section className="card"><div className="row" style={sx('flex-wrap:wrap')}><h2 className="h2">Você e esta vaga</h2><SG /></div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${a.nD ? 2 : 1},minmax(0,1fr))`, gap: 10 }}><div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px')}><span className="hx" style={sx('font-size:28px;color:var(--indigo);display:block;line-height:1.1')}>{a.okO} dos {a.nO}</span>obrigatórios</div>{a.nD > 0 && <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px')}><span className="hx" style={sx('font-size:28px;color:var(--indigo);display:block;line-height:1.1')}>{a.okD} dos {a.nD}</span>desejáveis</div>}</div>
        <ul style={sx('list-style:none;margin:0;padding:0')}>{v.obrig.map(r => <Req key={r} tipo="Obrigatório" r={r} />)}{v.desej.map(r => <Req key={r} tipo="Desejável" r={r} />)}</ul></section>
      <section className="card"><div className="row" style={sx('flex-wrap:wrap')}><h2 className="h2">Como é a seleção</h2><SG /></div><ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px')}>{v.selecao.map((x, i) => <li key={i} style={sx('display:flex;align-items:center;gap:12px')}><span className="pt" style={sx('background:var(--lilas);color:var(--indigo);font-weight:600;width:30px;height:30px')}>{i + 1}</span>{x}</li>)}</ol></section>
      <section className="card"><h2 className="h2">Seu currículo para esta vaga</h2><span className="soft sm">Pronto para copiar. Tudo vem das suas provas.</span>
        <div style={sx('border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.45')}>
          <div><span className="k" style={sx('font-size:12px')}>Objetivo</span><div>{v.objetivo}</div></div>
          <div><span className="k" style={sx('font-size:12px')}>Formação</span><div>Ensino médio {s.sobre.em.toLowerCase()}{s.sobre.escola === 'Sim' ? ', escola pública' : ''}</div></div>
          <div><span className="k" style={sx('font-size:12px')}>Experiências e vivências</span>{(s.leitura?.experiencias || []).map(e => <div key={e}>{e}</div>)}
            <ul style={sx('margin:4px 0 0;padding-left:18px')}>{conf.length ? conf.map(p => <li key={p.comp}>{reqsVaga.has(p.comp) ? <strong style={sx('font-weight:600;color:var(--indigo)')}>{p.linha}</strong> : p.linha}</li>) : <li className="soft">Confirme provas para preencher aqui.</li>}</ul></div>
        </div>
        <span style={sx('display:flex;gap:8px;color:var(--indigo)')} className="sm"><Ic n="bulb" s="width:18px;height:18px;margin-top:2px" />Em azul, o que esta vaga pede.</span>
        {faltaCurriculo.map(r => <div key={r} style={sx('display:flex;gap:10px;border-top:1px solid var(--line);padding-top:12px')}><Ic n="x" s="width:20px;height:20px;color:var(--no);stroke-width:2.6;margin-top:2px" /><div><span className="strike" style={sx('font-weight:600')}>{REQ[r]}</span> <span className="no" style={sx('font-size:13px;letter-spacing:.04em;text-transform:uppercase')}>Ficou de fora</span><div className="soft sm">Ainda sem prova. A MIRA não põe no currículo o que você não confirmou.</div></div></div>)}
        <button type="button" className="bs" style={sx('align-self:flex-start')} onClick={() => copiarCurriculo(txt)}><Ic n="copy" />Copiar currículo</button></section>
      <section className="card"><h2 className="h2">Prepare a entrevista</h2><div><span className="k">Pergunta provável</span><p style={sx('margin:2px 0 0;font-weight:600;font-size:18px;line-height:1.4')}>{v.pergunta}</p></div>
        <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px')}><div className="row" style={sx('flex-wrap:wrap')}><span className="k">Responda com sua história</span><SV /></div>
          {usa ? <><p className="q" style={sx('font-size:18px')}>“<Partes p={usa.partes} />”</p><OK /></> : <><span className="soft sm">Você ainda não confirmou uma prova para esta pergunta.</span><button type="button" className="bl" onClick={() => ir('provasLista')}>Ver minhas provas</button></>}</div>
        <button type="button" className="bs w100" onClick={() => { setUI({ treino: { vaga: v.id, resp: '', fase: 0, usou: [] } }); ir('treino'); }}><Ic n="balao" />Treinar minha resposta</button></section>
      <div style={sx('display:flex;flex-direction:column;gap:10px')}>
        {v.url && <button type="button" className="bp" onClick={anuncio}>Abrir o anúncio e me candidatar<Ic n="ext" /></button>}
        <button type="button" className={`bs w100${cand ? ' on' : ''}`} aria-pressed={cand} onClick={() => {
          mut(d => {
            if (cand) { d.candidaturas = d.candidaturas.filter(x => x !== v.id); d.passos = d.passos.filter(x => !(x.origem.tipo === 'vaga' && x.origem.id === v.id)); }
            else { const agora = new Date().toISOString(); d.candidaturas.push(v.id); d.passos.push({ id: 'c' + Date.now().toString(36), origem: { tipo: 'vaga', id: v.id }, acao: 'Candidatura: ' + v.titulo.split(' · ').pop(), quando: agora, lembrete: false, feito: true, feitoEm: agora }); }
          });
          if (!cand) { const n = useS.getState().candidaturas.length; toast(n >= 3 ? 'Três candidaturas! A sugestão da MIRA está feita.' : `Anotado no seu plano. ${n} de 3 candidaturas da sugestão.`, { label: 'Ver', go: 'plano' }); }
        }}><Ic n="check" />{cand ? 'Você se candidatou' : 'Já me candidatei'}</button>
        <p className="cap">Marcar ajuda a MIRA a lembrar você do próximo passo.</p></div>
    </main><Nav on="vagas" />
  </>);
}

export function Treino() {
  const s = useS(), tr = useUI(u => u.treino), id = useUI(u => u.vaga);
  const v = VAGAS.find(x => x.id === (tr?.vaga || id)) || VAGAS[0];
  const t = tr && tr.vaga === v.id ? tr : { vaga: v.id, resp: '', fase: 0 as const, usou: [] as string[] };
  const rel = relevantes(s, v), usou = rel.filter(p => t.usou.includes(p.comp)), falta = rel.filter(p => !t.usou.includes(p.comp)).slice(0, 2);
  const set = (resp: string) => setUI({ treino: { ...t, resp: resp.slice(0, 2000), fase: 0 } });
  return (<>
    <div className="top"><Hd t="Treinar entrevista" /><span className="soft sm">{v.titulo}</span><h1 className="h1">“{v.pergunta}”</h1><p className="sub">Responda como se estivesse na entrevista. A MIRA mostra o que da sua história cabe na resposta.</p></div>
    <main className="main" style={sx('padding-top:22px;gap:16px')}>
      <div style={sx('display:flex;flex-direction:column;gap:10px')}>
        <label htmlFor="treino" style={sx('font-weight:600;font-size:18px')}>Sua resposta</label>
        <textarea id="treino" rows={5} value={t.resp} disabled={t.fase === 1} onChange={e => set(e.target.value)} />
        <BotaoMic aoFalar={x => set((t.resp ? t.resp + ' ' : '') + x)} onSemSuporte={m => toast(m || 'Não deu para gravar aqui.', undefined, true)} />
      </div>
      {t.erro && <div className="aviso-erro" role="alert"><Ic n="info" s="color:var(--no)" /><span>A IA não respondeu. Tente de novo.</span></div>}
      {t.fase === 1 && <ol className="card" role="status" style={sx('list-style:none;margin:0;gap:0;padding:8px 20px')}><PassoLendo kind="now" t="A IA está lendo sua resposta" /><PassoLendo kind="todo" t="Comparando com as suas provas" /></ol>}
      {t.fase === 2 && <section className="card retorno pop" role="status" style={sx('gap:16px')}>
        <h2 className="h2">O que a MIRA viu na sua resposta</h2>
        {usou.length ? <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="k">Você já usou</span>{usou.map(x => <span key={x.comp} className="ok" style={sx('white-space:normal')}><Ic n="check" />{x.nome}</span>)}</div>
          : <p style={sx('margin:0')}>Sua resposta ainda não conta uma experiência sua. Na entrevista, um exemplo do que você já fez ajuda.</p>}
        {falta.length ? <div style={sx('display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);padding-top:14px')}><span className="k" style={sx('color:var(--indigo)')}>Da sua história, também cabe aqui</span>
          {falta.map(x => <div key={x.comp} style={sx('display:flex;flex-direction:column;gap:4px')}><p style={sx('margin:0;font-size:17px;line-height:1.5')}>“<Partes p={x.partes} />”</p><span style={sx('font-weight:600;color:var(--indigo)')}>{x.nome}</span></div>)}
          <div className="row wrap" style={sx('justify-content:flex-start;gap:8px')}><SV /><OK /></div></div>
          : <p style={sx('margin:0;border-top:1px solid var(--line);padding-top:14px')} className="sm">{rel.length ? 'Você usou tudo o que confirmou e que cabe nesta pergunta.' : 'Confirme provas para a MIRA sugerir o que contar.'}</p>}
        <div style={sx('display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:14px')}><span className="k">Um jeito de organizar</span>
          <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px')}>{['Onde e o que você fazia', 'Um exemplo de um dia', 'Como terminou'].map((x, i) => <li key={i} style={sx('display:flex;align-items:center;gap:12px')}><span className="pt" style={sx('background:var(--lilas);color:var(--indigo);font-weight:600;width:30px;height:30px')}>{i + 1}</span>{x}</li>)}</ol></div>
      </section>}
      <p className="note">Sua resposta não fica guardada.</p>
    </main>
    <div className="foot">{t.fase === 2 ? <button type="button" className="bp" onClick={() => setUI({ treino: { ...t, fase: 0, usou: [] } })}><Ic n="refresh" />Responder de novo</button>
      : <button type="button" className="bp" disabled={t.resp.trim().length < 15 || t.fase === 1} onClick={() => { if (!tr || tr.vaga !== v.id) setUI({ treino: t }); treinoLer(v.pergunta, rel); }}>Ver o retorno da MIRA</button>}<p className="cap">A MIRA não dá nota. Ela só usa o que você confirmou.</p></div>
  </>);
}
