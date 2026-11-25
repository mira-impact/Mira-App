'use client';
import { useEffect } from 'react';
import { useS, useUI, mut, setUI } from '@/lib/store';
import { ir, toast, abrirPasso, feitoPasso, apagarTudo, abrirSheet } from '@/lib/acoes';
import { mapaTem, tem, aCaminho, abreVagas, portaQueResolve, vontadeDe, totalProvas, proximoPasso, pendentes, passou, origemTxt, avaliar, minhaArea, sugestoes, sugEstado, textoCurriculo, contagemTxt, mapaNovos, provaDe } from '@/lib/regras';
import { MAPA, TOTAL_MAPA, VAGAS, PORTAS } from '@/lib/dados';
import { REQ } from '@/lib/competencias';
import { quandoTxt, cap1, diaISO, difDias, hojeISO, diaTxt, horaTxt, diasDesde } from '@/lib/datas';
import { Ic, sx, Hd, Nav, Logo, SV, SG, SL, SE, SF } from '../pecas';
import { BotaoInstalar } from './entrada';
import { SecaoConta, ConviteConta } from '../conta';
import type { Passo } from '@/lib/tipos';

const ringSegs = (n: number, prox: boolean) => Array.from({ length: TOTAL_MAPA }, (_, i) => (i < n ? '#4338CA' : prox && i === n ? '#A5A0F0' : i === TOTAL_MAPA - 1 ? '#E3E4EA' : '#D4D1FA'));
const Bol = ({ c }: { c: string }) => <span style={sx(`flex:none;width:14px;height:14px;border-radius:50%;${c}`)} />;
export const Ganho = ({ n, txt, estagio }: { n: number; txt: string; estagio?: boolean }) => n ? <div className="ganho"><span className="hx ganho-n">+{n}</span><span><strong style={sx('font-weight:600')}>{n === 1 ? 'vaga' : 'vagas'}{estagio ? ' de estágio' : ''} da sua lista</strong> {txt}</span></div> : null;

export function Mapa() {
  const s = useS(), g = useUI(u => u.ganhou), novos = useUI(u => u.novosMapa);
  const temL = mapaTem(s), n = temL.length, ac = aCaminho(s), nS = g && !g.animado ? g.de : n;
  useEffect(() => { if (g && !g.animado) { const t = setTimeout(() => setUI({ ganhou: { ...g, animado: true } }), 700); return () => clearTimeout(t); } }, [g]);
  const comps = MAPA.filter(m => !['em', 'tecnico', 'experiencia'].includes(m.k) && !tem(s, m.k));
  const comCurso = comps.filter(m => portaQueResolve(m.k)).slice(0, 2), semCurso = comps.filter(m => !portaQueResolve(m.k));
  const NoPlano = ({ x }: { x: Passo }) => <><div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:2px')}><span className="k" style={sx('color:var(--indigo)')}>A caminho · no seu plano</span><strong style={sx('font-weight:600')}>{x.acao}</strong><span className="soft sm">{cap1(quandoTxt(x.quando))}</span></div><button type="button" className="bs" style={sx('justify-content:space-between')} onClick={() => ir('plano')}>Ver no meu plano<Ic n="go" /></button></>;
  const est = PORTAS.find(p => p.id === 'etec') || PORTAS.find(p => p.abre === 'matricula');
  const prazoFut = est?.prazo && Date.parse(est.prazo.data) > Date.now() ? est.prazo : null;
  const abreT = abreVagas(s, 'matricula');
  return (<>
    <div className="top"><Hd t="Seu mapa" back={false} />
      <div className="mapa-hd">
        <div className="mapa-ring"><svg className="ring" viewBox="0 0 128 128" role="img" aria-label={`${n} de ${TOTAL_MAPA}`} style={sx('transform:rotate(-90deg)')}><g fill="none" strokeWidth="16">{ringSegs(nS, comps.length > 0 || !!(g && !g.animado)).map((c, k) => <circle key={k} cx="64" cy="64" r="52" stroke={c} strokeDasharray="35.84 290.89" strokeDashoffset={(-40.84 * k).toFixed(2)} />)}</g></svg><span className="hx" style={sx('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;color:var(--indigo)')}>{nS}/{TOTAL_MAPA}</span></div>
        <div style={sx('display:flex;flex-direction:column;gap:4px;min-width:0')}><h1 className="h1">Você já tem {nS} das {TOTAL_MAPA}.</h1><span className="soft sm" style={sx('font-weight:500')}>{TOTAL_MAPA - nS === 1 ? 'Falta 1' : `Faltam ${TOTAL_MAPA - nS}`}. Abaixo, como resolver.</span></div>
        <p className="sub sm" style={sx('grid-column:1 / -1')}>As {TOTAL_MAPA} coisas que mais aparecem nas {VAGAS.length} vagas de entrada da lista da MIRA.</p>
      </div></div>
    <main className="main">
      {g && <section className="card mudou pop" role="status" style={sx('gap:10px')}><span className="k" style={sx('color:var(--indigo)')}>Seu mapa mudou</span><h2 className="h2">De {g.de} para {g.para} das {TOTAL_MAPA}.</h2><span className="sm">Você marcou o passo como feito. <strong style={sx('font-weight:600')}>{MAPA.find(m => m.k === g.k)?.n}</strong> entrou em “Você já tem”.</span><Ganho n={g.abre} txt="passam a pedir só o que você tem." />{g.abre > 0 && <button type="button" className="bp" onClick={() => { setUI({ aba: 'Combinam', filtro: 'Todas', todasAreas: true }); ir('vagas'); }}>Ver {g.abre === 1 ? 'a vaga' : 'as vagas'}<Ic n="go" /></button>}</section>}
      <section className="tint"><h2 className="h2" style={sx('display:flex;align-items:center;gap:10px')}><Bol c="background:var(--indigo)" />Você já tem · {n}</h2><SV />
        <div style={sx('display:flex;flex-wrap:wrap;gap:8px')}>{temL.map(m => novos.includes(m.k) ? <span key={m.k} className="chip novo pop"><Ic n="check" />{m.n}<span className="tag">Novo</span></span> : <span key={m.k} className="chip"><Ic n="check" />{m.n}</span>)}{!n && <span className="soft sm">Ainda nada. Confirme suas provas.</span>}</div>
        <button type="button" className="bl" onClick={() => ir('provasLista')}>Ver minhas provas<Ic n="go" /></button></section>
      {semCurso.length > 0 && <section className="flat"><h2 className="h2">Ainda sem prova</h2>{semCurso.map(m => <span key={m.k}>{m.n} <span className="soft sm">· aparece em {contagemTxt(m.k)} vagas</span></span>)}<span className="soft sm">Se você já fez isso, conte mais. A MIRA não inventa.</span><button type="button" className="bl" onClick={() => ir('relato')}><Ic n="plus" />Contar mais da minha história</button></section>}
      {comCurso.map(m => { const p = portaQueResolve(m.k)!, vt = vontadeDe(s, m.k), x = ac[m.k], fp = provaDe(s, m.k); return (
        <section key={m.k} className="card"><h2 className="h2" style={sx('display:flex;align-items:center;gap:10px')}><Bol c="background:#A5A0F0" />Dá pra resolver rápido</h2>
          <div style={sx('display:flex;flex-direction:column;gap:6px;align-items:flex-start')}><strong style={sx('font-weight:600;font-size:19px')}>{m.n}</strong><span className="soft sm">Aparece em {contagemTxt(m.k)} vagas da lista.</span><SG /></div>
          <Ganho n={abreVagas(s, m.k)} txt="passam a pedir só o que você tem." />
          <dl className="dl" style={sx('font-size:15px')}><dt>Como</dt><dd>{p.sub?.toLowerCase()}: {p.t}</dd><dt>Custo</dt><dd>{p.custo === 'Gratuito' ? 'R$ 0' : p.custo}{p.cert ? ', com certificado' : ''}</dd><dt>Tempo</dt><dd>{p.quando.toLowerCase()}</dd></dl>
          {vt && <span className="sm">Você disse “<span className="vt">{vt.disse}</span>”.</span>}
          {fp && s.provas[m.k] === 'no' && <span className="soft sm">Você recusou a prova de {m.n.toLowerCase()}. O curso é outro caminho.</span>}
          {x ? <NoPlano x={x} /> : <button type="button" className="bp" onClick={() => abrirPasso({ tipo: 'porta', id: p.id }, { acao: p.conclui!.passo })}><Ic n="plus" />Pôr no meu plano</button>}
          <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={() => { mut(d => { d.portaAberta = p.id; }); setUI({ resp: null, duvida: '' }); ir('porta'); }}><Ic n="cap" />Ver o curso</button></section>); })}
      {!tem(s, 'tecnico') && est && <section className="card"><h2 className="h2" style={sx('display:flex;align-items:center;gap:10px')}><Bol c="background:#D4D1FA" />Leva mais tempo, abre muitas portas</h2>
        <div style={sx('display:flex;flex-direction:column;gap:2px')}><strong style={sx('font-weight:600;font-size:19px')}>Curso técnico ou superior</strong><span className="soft sm">Há opções sem mensalidade, com turmas à noite.</span></div>
        <Ganho n={abreT} txt="passam a ser possíveis." estagio />
        <div style={sx('display:flex;flex-direction:column;gap:6px;align-items:flex-start')}><SL /><span className="sm">Estágio é para quem está matriculado e frequentando um curso. <span className="soft">Lei 11.788/2008, art. 1º</span></span></div>
        {prazoFut && <div style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px')}><div className="row wrap"><strong style={sx('font-weight:600')}>{prazoFut.txt} · {est.t}</strong>{est.real ? <SF /> : <SE />}</div><dl className="dl"><dt>Inscrição</dt><dd>{prazoFut.curto}</dd><dt>Aulas</dt><dd>{est.custo.toLowerCase()}</dd></dl></div>}
        {ac.tecnico ? <NoPlano x={ac.tecnico} /> : null}
        <button type="button" className={ac.tecnico ? 'bl' : 'bp'} style={ac.tecnico ? sx('align-self:flex-start') : undefined} onClick={() => { setUI({ portaFiltro: 'Estudo gratuito', portasTodas: false }); ir('portas'); }}><Ic n="porta" />Ver portas de estudo</button></section>}
      <section className="flat" style={sx('border:2px dashed var(--line2)')}><h2 className="h2 soft" style={sx('display:flex;align-items:center;gap:10px')}><Bol c="border:2px dashed #A9ACB8" />Fica pra depois</h2><strong style={sx('font-weight:600')}>Experiência registrada de 6 meses</strong><p style={sx('margin:0')} className="soft">Não depende de você agora. A aprendizagem ou o estágio dão essa experiência.</p></section>
      <p className="soft sm" style={sx('margin:0;display:flex;gap:8px')}><Ic n="info" s="width:18px;height:18px;margin-top:3px" />Contagem de vagas, não chance de aprovação.</p>
      <button type="button" className="bs w100" onClick={() => ir('plano')}>{pendentes(s).length ? 'Ver meu plano' : 'Ver meu plano e as sugestões'}<Ic n="go" /></button>
    </main><Nav on="mapa" />
  </>);
}

export function Inicio() {
  const s = useS();
  const n = mapaTem(s).length, prox = proximoPasso(s), pend = pendentes(s), hoje = hojeISO();
  const evoNovos = mapaNovos(s), evoAc = Object.entries(aCaminho(s)).slice(0, 2);
  const salvaVelha = s.salvas.map(id => VAGAS.find(v => v.id === id)).find(v => v && diasDesde(v.lidaEm) > 30);
  const perto = pend.filter(x => !passou(x) && difDias(hoje, diaISO(x.quando)) <= 1).slice(0, 2);
  const prazos = PORTAS.filter(p => p.prazo && Date.parse(p.prazo.data) > Date.now() && (s.acompanho.includes(p.id) || (p.abre === 'matricula' && !tem(s, 'matricula'))))
    .map(p => ({ p, d: difDias(hoje, diaISO(p.prazo!.data)) })).filter(x => x.d <= 30).sort((a, b) => a.d - b.d).slice(0, 2);
  const combina = VAGAS.filter(v => avaliar(s, v).grupo === 'cumpre' && (!s.areas.length || minhaArea(s, v)) && !s.vistas.includes(v.id)).sort((a, b) => b.lidaEm.localeCompare(a.lidaEm))[0];
  const Nov = ({ i, children, selo, link, go }: { i: string; children: React.ReactNode; selo?: React.ReactNode; link: string; go: () => void }) => <li style={sx('display:flex;gap:12px;padding:14px 0;border-top:1px solid var(--line)')}><span style={sx('flex:none;width:36px;height:36px;border-radius:8px;background:var(--lilas);color:var(--indigo);display:flex;align-items:center;justify-content:center')}><Ic n={i} /></span><span style={sx('display:flex;flex-direction:column;gap:6px;min-width:0;margin-bottom:-8px')}><span>{children}</span>{selo}<button type="button" className="bl" style={sx('align-self:flex-start')} onClick={go}>{link}<Ic n="go" /></button></span></li>;
  const abrirPorta = (id: string) => { mut(d => { d.portaAberta = id; }); setUI({ resp: null, duvida: '' }); ir('porta'); };
  const abrirVaga = (id: string) => { setUI({ vaga: id }); mut(d => { if (!d.vistas.includes(id)) d.vistas.push(id); }); ir('vaga'); };
  const lista = [
    ...perto.map(x => <Nov key={x.id} i="bell" link="Ver no plano" go={() => ir('plano')}>Você marcou para {diaTxt(diaISO(x.quando))}, {horaTxt(x.quando)}: <strong style={sx('font-weight:600')}>{x.acao}</strong>.</Nov>),
    ...prazos.map(({ p, d }) => <Nov key={p.id} i="clock" selo={p.real ? <SF /> : <SE />} link={s.acompanho.includes(p.id) ? 'Ver no plano' : 'Ver a porta'} go={() => s.acompanho.includes(p.id) ? ir('plano') : abrirPorta(p.id)}><strong style={sx('font-weight:600')}>{d <= 0 ? 'Fecha hoje' : `Faltam ${d} ${d > 1 ? 'dias' : 'dia'}`}</strong>: {p.prazo!.txt} ({p.t}), {p.prazo!.curto}.</Nov>),
    combina ? <Nov key="vaga" i="mala" selo={<SG />} link="Ver vaga" go={() => abrirVaga(combina.id)}>Vaga que combina com você: <strong style={sx('font-weight:600')}>{combina.titulo}</strong>, {combina.onde.split(' · ')[1] || combina.onde}, {combina.turno}.</Nov> : null,
    salvaVelha ? <Nov key="velha" i="bell" link="Conferir a vaga" go={() => abrirVaga(salvaVelha.id)}>Uma vaga que você salvou pode ter fechado: {salvaVelha.titulo} (lida há mais de 30 dias).</Nov> : null,
  ].filter(Boolean);
  const atrasado = prox && passou(prox);
  const curso = sugestoes(s).find(g => g.id.startsWith('curso:'));
  return (<>
    <div className="top"><header className="hd" style={sx('justify-content:space-between')}><Logo /><button type="button" className="bl" aria-label="Você e seus dados" onClick={() => ir('voce')} style={sx('gap:8px')}><span style={sx('width:36px;height:36px;border-radius:50%;background:var(--lilas);display:flex;align-items:center;justify-content:center')}><Ic n="user" /></span>Você</button></header><h1 className="h1">Oi de novo.</h1></div>
    <main className="main">
      {prox ? <section className="card" style={sx(`border:1.5px solid ${atrasado ? 'var(--no)' : 'var(--indigo)'};gap:10px`)}><span className="k" style={sx(`color:${atrasado ? 'var(--no)' : 'var(--indigo)'}`)}>{atrasado ? 'Passou do dia' : 'Seu próximo passo'}</span>
        <span style={sx(`display:flex;gap:8px;align-items:center;font-weight:600;color:${atrasado ? 'var(--no)' : 'var(--indigo)'}`)}><Ic n="cal" />{cap1(quandoTxt(prox.quando, true))}</span>
        <h2 className="h3" style={sx('font-size:20px')}>{prox.acao}</h2><span className="soft sm" style={sx('margin-top:-4px')}>{origemTxt(prox.origem)}</span>
        <div className="grid2" style={sx('margin-top:4px')}><button type="button" className="bs fill" onClick={() => feitoPasso(prox.id)}><Ic n="check" />Feito</button><button type="button" className="bs" onClick={() => atrasado ? abrirPasso(prox.origem, { editId: prox.id }) : ir('plano')}>{atrasado ? 'Remarcar' : 'Ver plano'}</button></div></section>
        : <section className="card" style={sx('border:1.5px dashed var(--line2);gap:10px')}><span className="k" style={sx('color:var(--indigo)')}>Seu próximo passo</span><h2 className="h3" style={sx('font-size:20px')}>{s.passos.length ? 'Tudo feito por enquanto.' : 'Você ainda não marcou um próximo passo.'}</h2><span className="soft sm" style={sx('margin-top:-4px')}>Escolha seu {s.passos.length ? 'próximo' : 'primeiro'} passo no plano. Ele aparece aqui, com dia e hora.</span><button type="button" className="bp" style={sx('margin-top:4px')} onClick={() => ir('plano')}>Ver sugestões<Ic n="go" /></button></section>}
      <button type="button" className="tint" onClick={() => ir('mapa')} style={sx('gap:10px;border:0;text-align:left;cursor:pointer;width:100%')}>
        <div className="row" style={sx('width:100%')}><h2 className="h2">Sua evolução</h2></div>
        <div className="evo" style={sx('flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:2px 8px;width:100%')}><span className="soft sm">Antes, você escreveria</span><strong style={sx('font-weight:600;min-width:0')}>“{s.antes || 'nada'}”</strong></div>
        <div style={sx('display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%')}>
          <div className="evo"><span className="soft sm">Agora</span><span><span className="evo-n hx">{totalProvas(s)}</span> <span className="sm" style={sx('font-weight:600')}>provas</span></span></div>
          <div className="evo"><span className="soft sm">Seu mapa</span><span><span className="evo-n hx">{n}</span> <span className="sm" style={sx('font-weight:600')}>de {TOTAL_MAPA}</span></span></div>
        </div>
        {evoNovos.length > 0 && <span className="evo-linha" style={sx('color:var(--ok);font-weight:600')}><Ic n="check" s="stroke-width:2.4" /><span>+{evoNovos.length} no seu mapa: {evoNovos.map(m => m.n).join(', ')}</span></span>}
        {evoAc.map(([k, x]) => <span key={k} className="evo-linha"><span style={sx('flex:none;width:12px;height:12px;border-radius:50%;background:#A5A0F0;margin:5px 3px 0')} /><span><strong style={sx('font-weight:600')}>A caminho: {MAPA.find(m => m.k === k)?.n}</strong> <span className="soft">· {x.acao}, {quandoTxt(x.quando)}</span></span></span>)}
        {!evoNovos.length && !evoAc.length && curso && <span className="soft sm">Com “{curso.porta!.t}”, o mapa vai para {n + 1} de {TOTAL_MAPA}{abreVagas(s, curso.conclui!) ? ` e abre mais ${abreVagas(s, curso.conclui!)} vagas` : ''}.</span>}
        <span className="bl" style={sx('min-height:0;margin-top:2px')}>Ver meu mapa<Ic n="go" /></span>
      </button>
      <ConviteConta />
      {lista.length > 0 && <section className="card" style={sx('gap:0')}><div className="row" style={sx('padding-bottom:6px;align-items:flex-start')}><div><h2 className="h2">Novidades</h2><span className="soft sm">para você agora</span></div><span className="selo" style={sx('background:var(--indigo);color:#FFFFFF;flex:none')}>{lista.length}</span></div><ul style={sx('list-style:none;margin:0;padding:0')}>{lista}</ul></section>}
      <button type="button" className="bl" style={sx('align-self:flex-start')} onClick={() => ir('relato')}><Ic n="plus" />Contar mais da minha história</button>
      <BotaoInstalar />
    </main><Nav on="inicio" />
  </>);
}

export function Voce() {
  const s = useS(), confirma = useUI(u => u.confirmaApagar);
  const Linha = ({ k, v, on }: { k: string; v: string; on: () => void }) => <li className="row" style={sx('padding:10px 0;border-top:1px solid var(--line)')}><span style={sx('display:flex;flex-direction:column;line-height:1.35;min-width:0')}><span className="soft sm">{k}</span><strong style={sx('font-weight:600')}>{v}</strong></span><button type="button" className="bl" onClick={on}>Mudar</button></li>;
  const mudarSobre = () => { mut(d => { d.voltarPara = 'voce'; }); ir('sobre'); };
  const RESP = { enem: 'Já fez o Enem', escola: 'Médio em escola pública' } as const;
  return (<>
    <div className="top"><Hd t="Você" /><h1 className="h1">O que a MIRA sabe de você</h1><p className="sub">Fica tudo neste celular. Sem nome, sem CPF, sem telefone.</p></div>
    <main className="main">
      <section className="card" style={sx('gap:10px')}><div><span className="k">Antes</span><div className="soft">No campo “experiência”, você escreveria: “{s.antes || 'nada'}”</div></div>
        <div style={sx('border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:6px')}><span className="k" style={sx('color:var(--indigo)')}>Agora</span><span className="hx" style={sx('font-size:26px;line-height:1.1')}>{totalProvas(s)} provas que você confirmou</span><SV /></div>
        <button type="button" className="bl" onClick={() => ir('provasLista')}>Ver minhas provas<Ic n="go" /></button></section>
      <section className="flat"><h2 className="h2">Sobre você</h2><p className="soft sm" style={sx('margin:0')}>Se mudar alguma coisa, a MIRA refaz suas vagas e seu plano.</p>
        <ul style={sx('list-style:none;margin:0;padding:0')}>
          <Linha k="Idade" v={s.sobre.idade + ' anos'} on={mudarSobre} /><Linha k="Ensino médio" v={s.sobre.em} on={mudarSobre} /><Linha k="Onde mora" v={s.sobre.zona} on={mudarSobre} /><Linha k="Turnos livres" v={s.sobre.turnos.join(', ') || 'nenhum'} on={mudarSobre} />
          <Linha k="O que você quer agora" v={s.objetivos.join(' e ') || '—'} on={() => ir('objetivo')} />
          <Linha k="Áreas de interesse" v={s.areas.length ? s.areas.join(', ') : 'Ainda não sei'} on={() => abrirSheet({ tipo: 'areas' })} />
          {(['enem', 'escola'] as const).filter(c => s.sobre[c]).map(c => <Linha key={c} k={`${RESP[c]} · respondido numa porta`} v={s.sobre[c]!} on={() => abrirSheet({ tipo: 'resp', campo: c })} />)}
        </ul></section>
      <SecaoConta />
      <section className="flat"><h2 className="h2">Sua história</h2><p className="soft sm" style={sx('margin:0')}>A história inteira não fica guardada. Ficam só os trechos das provas.</p><button type="button" className="bl" onClick={() => ir('relato')}><Ic n="plus" />Contar mais da minha história</button></section>
      <section className="flat"><h2 className="h2">Guardado neste celular</h2><dl style={sx('margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px')}>{([['Provas confirmadas', totalProvas(s)], ['Passos no plano', s.passos.length], ['Portas que você acompanha', s.acompanho.length], ['Vagas salvas', s.salvas.length]] as [string, number][]).map(([k, v]) => <div key={k} style={sx('background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px')}><dt className="soft sm">{k}</dt><dd className="hx" style={sx('margin:0;font-size:28px;color:var(--indigo)')}>{v}</dd></div>)}</dl></section>
      <div style={sx('display:flex;flex-direction:column;gap:6px')}><button type="button" className="bs w100" onClick={() => ir('curriculo')}><Ic n="doc" />Ver meu currículo base</button><p className="cap">Suas provas e seu currículo, prontos para copiar.</p></div>
      {confirma ? <section className="flat" role="alert" style={sx('border:2px solid var(--no)')}><strong style={sx('font-weight:600')}>Apagar tudo deste celular?</strong><span className="soft sm">Respostas, provas, plano e vagas salvas somem deste celular. Não dá para desfazer. Se você tiver conta, ela continua guardada.</span><div style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className="bs danger" onClick={() => apagarTudo()}><Ic n="trash" />Sim, apagar tudo</button><button type="button" className="bs" onClick={() => setUI({ confirmaApagar: false })}>Cancelar</button></div></section>
        : <div style={sx('display:flex;flex-direction:column;gap:6px')}><button type="button" className="bs w100 danger" onClick={() => setUI({ confirmaApagar: true })}><Ic n="trash" />Apagar tudo agora</button><p className="cap">Apaga deste celular e não dá para desfazer.</p></div>}
    </main>
  </>);
}

export function copiarCurriculo(txt: string) {
  const ok = () => toast('Currículo copiado. Cole no formulário da vaga.');
  try { navigator.clipboard.writeText(txt).then(ok, () => toast('Não deu para copiar aqui. Selecione o texto e copie.', undefined, true)); } catch { toast('Não deu para copiar aqui. Selecione o texto e copie.', undefined, true); }
}
export function Curriculo() {
  const s = useS(), txt = textoCurriculo(s);
  return (<>
    <div className="top"><Hd t="Seu currículo base" /><h1 className="h1">Antes e depois</h1></div>
    <main className="main">
      <section className="card" style={sx('gap:10px')}><span className="k">Antes, no campo experiência</span><div style={sx('font-size:20px')} className="soft">“{s.antes || 'nada'}”</div></section>
      <section className="card" style={sx('gap:10px')}><span className="k" style={sx('color:var(--indigo)')}>Agora, feito só com suas provas</span><pre style={sx('margin:0;white-space:pre-wrap;font:inherit;font-size:16px;line-height:1.5')}>{txt}</pre>
        <button type="button" className="bs" style={sx('align-self:flex-start')} onClick={() => copiarCurriculo(txt)}><Ic n="copy" />Copiar</button></section>
      <p className="soft sm" style={sx('margin:0')}>Cada vaga tem uma versão própria, com as palavras dela.</p>
      <button type="button" className="bp" onClick={() => ir('vagas')}>Ver vagas</button>
    </main>
  </>);
}
