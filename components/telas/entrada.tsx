'use client';
import { useEffect } from 'react';
import { useS, useUI, mut, setUI, UI } from '@/lib/store';
import { ir, toast, lerHistoria, cancelarLeitura, abrirSheet } from '@/lib/acoes';
import { TRAD, TRAD_AB, VAGAS, type Trad } from '@/lib/dados';
import { AREAS } from '@/lib/competencias';
import { Ic, sx, Hd, Dots, Logo, Chk, Marcado, BotaoMic } from '../pecas';
import { useInstalar, instalar } from '@/lib/instalar';

export function BotaoInstalar() {
  const ev = useInstalar(u => u.evento);
  if (!ev) return null;
  return <button type="button" className="bl" style={sx('align-self:center')} onClick={async () => { if (await instalar()) toast('MIRA instalada. Ela fica na tela inicial do celular.'); }}><Ic n="phone" />Instalar a MIRA no celular</button>;
}

const vagasDeTrad = (t: Trad) => VAGAS.filter(v => v.obrig.concat(v.desej).includes(t.req));

function TradCard({ t, anima, extra }: { t: Trad; anima?: boolean; extra?: React.ReactNode }) {
  return (
    <div className={`trad${anima ? ' anima' : ''}`}>
      <span className="k">Você diz</span>
      <p className="trad-diz">“<Marcado texto={t.diz} marcas={[t.marca]} />”</p>
      <span className="trad-seta" aria-hidden="true" />
      <span className="k trad-k2" style={sx('color:var(--indigo)')}>{t.rotulo || 'Na vaga está escrito'}</span>
      <p className="hx trad-vaga">{t.vaga}</p>{extra}
    </div>
  );
}

export function Abertura() {
  const concluiu = useS(s => s.concluiu), tradI = useUI(u => u.tradI);
  useEffect(() => { // troca o exemplo a cada 4 s (parado com movimento reduzido)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (document.hidden || UI().sheet) return; setUI({ tradI: (UI().tradI + 1) % TRAD_AB.length }); }, 4200);
    return () => clearInterval(t);
  }, []);
  const t = TRAD.find(x => x.id === TRAD_AB[tradI])!;
  return (<>
    <div className="top ab-top">
      <header className="hd"><Logo /></header>
      <h1 className="hx ab-h1" style={sx('margin:24px 0 0;font-size:clamp(32px,10vw,40px);line-height:1.04;letter-spacing:-0.03em;text-wrap:balance')}>Você fala de um jeito.<br />A vaga, de outro.</h1>
      <p className="sub" style={sx('margin-top:12px')}>A MIRA traduz o que você já faz para a língua das vagas e mostra o caminho grátis até elas.</p>
    </div>
    <main className="main ab-main" style={sx('padding-top:22px;padding-bottom:16px;gap:12px')}>
      <div className="trad-ab" style={sx('display:flex;flex-direction:column;gap:4px')}>
        <TradCard key={tradI} t={t} anima />
        <div className="trad-dots">{TRAD_AB.map((_, k) => <button key={k} type="button" aria-label={`Exemplo ${k + 1} de ${TRAD_AB.length}`} aria-current={k === tradI} onClick={() => setUI({ tradI: k })}><span /></button>)}</div>
      </div>
      <p className="soft sm" style={sx('margin:0;display:flex;gap:10px;align-items:flex-start')}><Ic n="clock" s="width:18px;height:18px;margin-top:2px;color:var(--indigo)" /><span>Em uns 10 minutos, você vê o que já tem, o que falta e por onde começar.</span></p>
      <div style={sx('flex:1;min-height:4px')} />
    </main>
    <div className="foot" style={sx('border-top:0;padding-top:8px')}>
      <button type="button" className="bp" onClick={() => ir('experimente')}>Experimentar agora<Ic n="go" /></button>
      <p className="cap">Grátis. Sem nome, sem CPF.</p>
      {concluiu && <button type="button" className="bl" style={sx('align-self:center')} onClick={() => ir('inicio')}>Já usei a MIRA neste celular</button>}
      <BotaoInstalar />
    </div>
  </>);
}

export function Experimente() {
  const teste = useUI(u => u.teste), testados = useUI(u => u.testados);
  const li = useS(s => s.consent.li);
  const t = teste ? TRAD.find(x => x.id === teste) : undefined, vs = t ? vagasDeTrad(t) : [], viu = testados.length > 0;
  const extra = !t ? null : (<>
    <p className="sm trad-mais" style={sx('margin:10px 0 0')}>{t.porque}</p>
    {vs.length ? (
      <div className="trad-mais" style={sx('display:flex;flex-direction:column;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)')}>
        <span className="soft sm">{vs.length === 1 ? 'Vaga da lista que pede isso' : `${vs.length} vagas da lista pedem isso`}</span>
        {vs.slice(0, 2).map(v => <span key={v.id} style={sx('display:flex;gap:8px;align-items:flex-start;font-weight:500;font-size:15px;line-height:1.35')}><Ic n="mala" s="width:18px;height:18px;margin-top:1px;color:var(--indigo)" />{v.titulo}</span>)}
        {vs.length > 2 && <span className="soft sm">e mais {vs.length - 2}</span>}
      </div>
    ) : <p className="soft sm trad-mais" style={sx('margin:8px 0 0')}>No currículo, isso entra como {t.vaga.toLowerCase()}.</p>}
  </>);
  return (<>
    <div className="top"><Hd t="Experimente" /><h1 className="h1">{viu ? 'Viu? Isso já conta para as vagas.' : 'Toque em algo que você faz.'}</h1><p className="sub">{viu ? 'Toque em outra frase, ou conte a sua história.' : 'A MIRA mostra como isso aparece nas vagas.'}</p></div>
    <main className="main" style={sx('padding-top:22px;gap:18px')}>
      {t && <TradCard key={t.id} t={t} anima extra={extra} />}
      <div style={sx('display:flex;flex-direction:column;gap:10px')}>{t && <span className="k">Tente outra</span>}
        <div className="frases" role="group" aria-label="Frases de exemplo">{TRAD.map(x => <button key={x.id} type="button" className={`frase${teste === x.id ? ' on' : ''}`} aria-pressed={teste === x.id}
          onClick={() => { setUI({ teste: x.id, testados: testados.includes(x.id) ? testados : [...testados, x.id] }); document.getElementById('scroller')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>“{x.diz}”</button>)}</div></div>
      <section style={sx('display:flex;flex-direction:column;gap:12px;padding-top:4px')}><h2 className="h3">Com a sua história completa</h2>
        <ol style={sx('list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px')}>{['Você conta uma semana sua, do seu jeito.', 'A MIRA acha o que as vagas pedem, e você confere cada coisa.', 'Você recebe o seu mapa: o que já tem, o que falta e o caminho grátis até lá.'].map((x, i) =>
          <li key={i} style={sx('display:flex;align-items:flex-start;gap:12px')}><span className="pt" style={sx('background:var(--lilas);color:var(--indigo);font-weight:600;width:30px;height:30px')}>{i + 1}</span><span style={sx('padding-top:2px')}>{x}</span></li>)}</ol></section>
      <p className="note">Estas frases são exemplos. Com a sua história, a IA lê o que você escrever.</p>
    </main>
    <div className="foot"><button type="button" className="bp" onClick={() => ir(li ? 'sobre' : 'combinado')}>Contar minha história<Ic n="go" /></button><p className="cap">Antes, um combinado e 2 telas rápidas.</p></div>
  </>);
}

export function Combinado() {
  const c = useS(s => s.consent), ok = c.a18 && c.li;
  const item = (i: string, t: string, d: string) => <li style={sx('display:flex;gap:14px;align-items:flex-start')}><span style={sx('flex:none;width:40px;height:40px;border-radius:8px;background:var(--lilas);color:var(--indigo);display:flex;align-items:center;justify-content:center')}><Ic n={i} s="width:22px;height:22px" /></span><span style={sx('display:flex;flex-direction:column')}><strong style={sx('font-weight:600')}>{t}</strong><span className="soft sm">{d}</span></span></li>;
  const tog = (k: 'a18' | 'li' | 'testes') => mut(d => { d.consent[k] = !d.consent[k]; });
  return (<>
    <div className="top"><Hd t="Antes de começar" /><h1 className="h1">Nosso combinado</h1></div>
    <main className="main">
      <ul className="card" style={sx('list-style:none;margin:0;gap:16px')}>
        {item('phone', 'Fica neste celular', 'Suas respostas, as provas que você confirmar, seu plano e as vagas salvas.')}
        {item('cloud', 'Só sua história sai do celular', 'Para a IA ler, em texto ou áudio. Nada fica guardado depois. A leitura é feita pelo Google Gemini, uma IA de outra empresa.')}
        {item('lock', 'A MIRA não pede', 'Nome completo, CPF, endereço nem telefone. Se você escrever algum, a MIRA apaga antes de enviar.')}
        {item('eye', 'Nos testes', 'Se você deixar, a equipe vê só o que você confirmou ou recusou e por quê. Sem sua história.')}
        {item('trash', 'Apagar é com você', 'Um botão em “Você” apaga tudo.')}
      </ul>
      <div style={sx('display:flex;flex-direction:column;gap:6px')}>
        <Chk on={c.a18} onClick={() => tog('a18')} label="Tenho 18 anos ou mais" />
        <Chk on={c.li} onClick={() => tog('li')} label="Li e concordo com o combinado" />
        <div style={sx('border-top:1px solid var(--line);margin:6px 0')} />
        <Chk on={c.testes} onClick={() => tog('testes')} label="Pode usar minhas confirmações nos testes" small="Opcional. Dá para usar a MIRA sem marcar." />
      </div>
    </main>
    <div className="foot"><button type="button" className="bp" disabled={!ok} aria-disabled={!ok} onClick={() => ir('sobre')}>Combinado</button>{!ok && <p className="cap">Marque as duas primeiras caixas para continuar.</p>}</div>
  </>);
}

function Ops({ campo, itens, multi }: { campo: 'idade' | 'em' | 'zona' | 'turnos'; itens: string[]; multi?: boolean }) {
  const val = useS(s => s.sobre[campo]);
  return <div className="ops">{itens.map(x => { const on = multi ? (val as string[]).includes(x) : val === x; return (
    <button key={x} type="button" className={`op${on ? ' on' : ''}`} aria-pressed={on} onClick={() => mut(d => { if (multi) { const L = d.sobre.turnos; d.sobre.turnos = L.includes(x) ? L.filter(y => y !== x) : [...L, x]; } else (d.sobre as Record<string, unknown>)[campo] = x; })}>{multi && on && <Ic n="check" />}{x}</button>); })}</div>;
}
export function Sobre() {
  const ed = useS(s => s.voltarPara === 'voce'), turnos = useS(s => s.sobre.turnos.length);
  return (<>
    <div className="top"><Hd t="Sobre você" dir={ed ? undefined : '1 de 3'} />{!ed && <Dots n={3} on={1} />}
      <h1 className="h1">{ed ? 'Mude o que precisar' : 'Para achar o que cabe na sua rotina'}</h1>
      <p className="sub">{ed ? 'A MIRA refaz suas vagas e seu plano na hora.' : 'Sem nome, sem CPF. Só toque nas respostas.'}</p></div>
    <main className="main" style={sx('gap:28px')}>
      <fieldset><legend>Sua idade</legend><Ops campo="idade" itens={['18 a 20', '21 a 24', '25 ou mais']} /></fieldset>
      <fieldset><legend>Ensino médio</legend><Ops campo="em" itens={['Cursando', 'Completo', 'EJA, cursando', 'Parei']} /></fieldset>
      <fieldset><legend>Onde você mora</legend><Ops campo="zona" itens={['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste', 'Grande SP']} /></fieldset>
      <fieldset><legend style={sx('margin-bottom:2px')}>Quando você está livre?</legend><span className="soft sm" style={sx('margin-bottom:4px')}>Pode marcar mais de um.</span><Ops campo="turnos" multi itens={['Manhã', 'Tarde', 'Noite', 'Fim de semana']} /></fieldset>
    </main>
    <div className="foot"><button type="button" className="bp" disabled={!turnos} onClick={() => {
      if (ed) { mut(d => { d.voltarPara = null; }); toast('Pronto. Suas vagas e seu plano foram atualizados.'); ir('voce', { tr: 'back' }); } else ir('objetivo');
    }}>{ed ? 'Salvar' : 'Continuar'}</button>{!turnos && <p className="cap">Marque pelo menos um turno.</p>}</div>
  </>);
}

export function ChipsAreas() {
  const areas = useS(s => s.areas);
  const set = (v: string) => { mut(d => { d.areas = !v ? [] : d.areas.includes(v) ? d.areas.filter(x => x !== v) : [...d.areas, v]; }); setUI({ todasAreas: false }); };
  return <div className="ops" style={sx('gap:8px')}>{AREAS.map(a => { const on = areas.includes(a); return <button key={a} type="button" className={`op sm2${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set(a)}>{on && <Ic n="check" />}{a}</button>; })}
    <button type="button" className={`op sm2${areas.length ? '' : ' on'}`} aria-pressed={!areas.length} onClick={() => set('')}>{!areas.length && <Ic n="check" />}Ainda não sei</button></div>;
}
export function Objetivo() {
  const objetivos = useS(s => s.objetivos), antes = useS(s => s.antes);
  const ob = (t: string, d: string) => { const on = objetivos.includes(t); return (
    <button key={t} type="button" aria-pressed={on} onClick={() => mut(x => { x.objetivos = on ? x.objetivos.filter(y => y !== t) : [...x.objetivos, t]; })}
      style={sx(`text-align:left;min-height:72px;border-radius:10px;border:${on ? '2px solid var(--indigo)' : '1px solid var(--line2)'};background:${on ? 'var(--lilas)' : 'var(--bg)'};padding:12px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;width:100%`)}>
      <span style={sx(`flex:none;width:26px;height:26px;border-radius:8px;${on ? 'background:var(--indigo);color:#FFFFFF;' : 'border:2px solid var(--muted);'}display:flex;align-items:center;justify-content:center`)}>{on && <Ic n="check" s="width:18px;height:18px;stroke-width:3" />}</span>
      <span style={sx('display:flex;flex-direction:column;line-height:1.35')}><strong style={sx('font-weight:600;font-size:18px')}>{t}</strong><span className="soft sm">{d}</span></span></button>); };
  return (<>
    <div className="top"><Hd t="Seu objetivo" dir="2 de 3" /><Dots n={3} on={2} /><h1 className="h1">O que você quer agora?</h1><p className="sub">Pode marcar mais de um.</p></div>
    <main className="main" style={sx('gap:12px')}>
      {ob('Jovem aprendiz', 'Trabalho com curso junto, com contrato')}{ob('Estágio', 'Precisa estar matriculado num curso')}{ob('Primeiro emprego', 'Carteira assinada (CLT)')}{ob('Estudar de graça', 'Técnico ou faculdade, sem mensalidade')}{ob('Ainda não sei', 'A MIRA mostra as opções')}
      <fieldset style={sx('margin-top:18px;gap:10px')}><legend style={sx('margin-bottom:2px')}>Que áreas te interessam?</legend><span className="soft sm">Opcional. Vagas mostra primeiro as dessas áreas, e você pode ver as outras quando quiser.</span><ChipsAreas /></fieldset>
      <div style={sx('display:flex;flex-direction:column;gap:8px;margin-top:18px')}>
        <label htmlFor="antes" style={sx('font-weight:600;font-size:18px;line-height:1.35')}>Se fosse se candidatar hoje, o que você escreveria no campo “experiência”?</label>
        <span className="soft sm">Opcional. Pode ser “nenhuma”. No fim, a MIRA mostra o antes e o depois.</span>
        <input id="antes" className="box" value={antes} autoComplete="off" maxLength={200} onChange={e => mut(d => { d.antes = e.target.value; })} />
      </div>
    </main>
    <div className="foot"><button type="button" className="bp" disabled={!objetivos.length} onClick={() => ir('relato')}>Continuar</button></div>
  </>);
}

export function Relato() {
  const relato = useS(s => s.relato), concluiu = useS(s => s.concluiu);
  const set = (t: string) => mut(d => { d.relato = t.slice(0, 4000); });
  const add = (t: string) => { set((S_relato() + (S_relato().trim() ? (/[.!?]\s*$/.test(S_relato()) ? ' ' : '. ') : '') + t).trimStart()); };
  return (<>
    <div className="top"><Hd t="Sua história" dir={concluiu ? undefined : '3 de 3'} />{!concluiu && <Dots n={3} on={3} />}<h1 className="h1">{concluiu ? 'Conte mais.' : 'Conte uma semana sua.'}</h1><p className="sub">{concluiu ? 'O que você ainda não contou: bicos, casa, escola, igreja, time. As provas novas entram junto das que você já tem.' : 'Do seu jeito. Não precisa ser emprego de carteira.'}</p></div>
    <main className="main" style={sx('padding-top:24px')}>
      <div className="guia" aria-label="O que contar">
        <div><span className="k"><span className="mk" style={sx('padding:0 3px;color:var(--ink)')}>O que você faz</span></span><span>Casa, família, escola, bico.</span></div>
        <div><span className="k" style={sx('color:var(--indigo)')}><span className="vt" style={sx('padding:0 3px')}>O que você quer</span></span><span>O que queria aprender e com o que tem vontade de trabalhar.</span></div>
      </div>
      <div style={sx('display:flex;flex-direction:column;gap:12px')}>
        <div className="flat" style={sx('gap:10px;padding:14px 16px')}>
          <span style={sx('font-weight:600')}>Prefere falar?</span>
          <span className="soft sm" style={sx('margin-top:-6px')}>Grave um áudio contando sua semana. A MIRA transforma em texto aqui embaixo, e você confere antes de ler.</span>
          <BotaoMic rotulo="Gravar minha história" aoFalar={t => { add(t); toast('Pronto, virou texto. Confira e corrija se precisar.'); }} onSemSuporte={m => toast(m || 'Não deu para gravar aqui.', undefined, true)} />
        </div>
        <label className="sr" htmlFor="rel">Sua história</label>
        <textarea id="rel" rows={11} value={relato} maxLength={4000} placeholder="Ex.: Todo sábado eu ajudo no bar da minha tia. Atendo os clientes e…" onChange={e => set(e.target.value)} />
        <span className="soft sm" style={sx('text-align:right;margin-top:-6px')}>{relato.length} / 4000</span>
        <div style={sx('display:flex;flex-direction:column;gap:8px')}><span className="soft sm">Para contar o que você quer, comece com:</span>
          <div className="dicas">{['Queria aprender', 'Tenho vontade de trabalhar com', 'Gosto de'].map(d => <button key={d} type="button" className="op sm2" onClick={() => { add(d + ' '); setTimeout(() => { const r = document.getElementById('rel') as HTMLTextAreaElement | null; if (r) { r.focus(); r.setSelectionRange(r.value.length, r.value.length); } }); }}><Ic n="plus" />{d}…</button>)}</div></div>
      </div>
      <p style={sx('margin:0;display:flex;gap:10px;align-items:flex-start;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px')} className="sm"><Ic n="shield" s="color:var(--indigo);margin-top:2px" /><span>Não escreva nomes de pessoas, endereço, documentos nem informações de saúde.</span></p>
    </main>
    <div className="foot"><button type="button" className="bp" disabled={relato.trim().length <= 20} onClick={() => lerHistoria()}>Ler minha história</button><p className="cap">Sua história (e o áudio, se gravar) sai do celular só para a IA ler. Não fica guardada.</p></div>
  </>);
}
const S_relato = () => useS.getState().relato;

function PassoLendo({ kind, t, sub }: { kind: 'done' | 'now' | 'fail' | 'todo'; t: string; sub?: string }) {
  const p = kind === 'done' ? <span className="pt" style={sx('background:var(--indigo);color:#FFFFFF')}><Ic n="check" /></span>
    : kind === 'now' ? <span className="pt" style={sx('border:1.5px solid var(--indigo)')}><span className="spin" style={sx('width:14px;height:14px;border-width:2px')} /></span>
      : kind === 'fail' ? <span className="pt" style={sx('border:2px solid var(--no);color:var(--no)')}><Ic n="x" /></span>
        : <span className="pt" style={sx('border:2px dashed #A9ACB8')} />;
  return <li className="step" style={kind === 'todo' ? sx('color:var(--muted)') : undefined}>{p}<span>{t}{sub && <span className="soft sm" style={sx('display:block;font-weight:400')}>{sub}</span>}</span></li>;
}
export { PassoLendo };

export function Lendo() {
  const l = useUI(u => u.lendo), relatoS = useS(s => s.relato);
  const fase = l?.fase || 'ia', relato = l?.relato || relatoS, n = l?.n || 0, tot = l?.marcas.length || 0, pronto = fase === 'pronto';
  const nProvas = l?.marcas.filter(m => m.cls === 'mk').length || 0;
  return (<>
    <div className="top" style={sx('padding-top:28px')}><h1 className="h1" role="status">{pronto ? 'Sua história foi lida.' : 'Lendo sua história…'}</h1><p className="sub">{pronto ? (nProvas ? 'Agora é você quem decide o que fica.' : 'A MIRA não achou trechos que virem prova. Dá para contar com mais detalhes.') : 'Leva alguns segundos.'}</p></div>
    <main className="main" style={sx('padding-top:24px;padding-bottom:24px;gap:16px')}>
      <ol className="card" style={sx('list-style:none;margin:0;gap:0;padding:8px 20px')}>
        <PassoLendo kind={fase === 'ia' ? 'now' : 'done'} t={fase === 'ia' ? 'A IA está lendo' : 'A IA leu'} />
        <PassoLendo kind={pronto ? 'done' : fase === 'marcando' ? 'now' : 'todo'} t={pronto ? 'Um programa conferiu cada trecho' : 'Um programa confere cada trecho'} sub={fase !== 'ia' ? `${Math.min(n, tot)} de ${tot} conferidos` : undefined} />
        <PassoLendo kind={pronto ? 'done' : 'todo'} t="Pronto para você decidir" />
      </ol>
      <div className="flat" style={sx('padding:16px 18px')}><p style={sx('margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap')}><Marcado texto={relato} marcas={(l?.marcas || []).slice(0, n)} anim={n - 1} /></p></div>
      <p className="soft sm" style={sx('margin:0')}>Em amarelo, o que você já fez: pode virar prova. Em lilás, o que você quer: vira caminho, não prova.</p>
    </main>
    <div className="foot">
      {pronto && <button type="button" className="bp pop" onClick={() => ir(nProvas || useS.getState().leitura?.provas.length ? 'provas' : 'relato')}>{nProvas || useS.getState().leitura?.provas.length ? 'Ver minhas provas' : 'Contar com mais detalhes'}<Ic n="go" /></button>}
      {!pronto && <button type="button" className="bl" style={sx('align-self:center')} onClick={() => cancelarLeitura()}>Cancelar e editar minha história</button>}
    </div>
  </>);
}

export function Falha() {
  const relato = useS(s => s.relato);
  return (
    <>
      <div className="top" style={sx('padding-top:28px')} role="alert"><h1 className="h1">A leitura falhou</h1><p className="sub">Não foi nada que você fez. Sua história continua aqui, é só tentar de novo.</p></div>
      <main className="main">
        <ol className="card" style={sx('list-style:none;margin:0;gap:4px;padding:10px 18px')}><PassoLendo kind="fail" t="A IA não respondeu" sub="nenhuma prova foi criada" /><PassoLendo kind="todo" t="Um programa confere" /><PassoLendo kind="todo" t="Pronto para você decidir" /></ol>
        <div className="flat" style={sx('max-height:170px;overflow:hidden;position:relative')}><p style={sx('margin:0;font-size:16px;line-height:1.55')}>{relato.slice(0, 240)}{relato.length > 240 ? '…' : ''}</p><span style={sx('position:absolute;left:0;right:0;bottom:0;height:56px;background:linear-gradient(rgba(255,255,255,0),var(--bg))')} /></div>
        <div style={sx('flex:1')} />
        <div style={sx('display:flex;flex-direction:column;gap:10px')}>
          <button type="button" className="bp" onClick={() => lerHistoria()}><Ic n="refresh" />Tentar de novo</button>
          <button type="button" className="bs w100" onClick={() => ir('relato', { tr: 'back' })}>Editar minha história</button>
          <p className="cap">Se continuar falhando, tente mais tarde. Sua história fica aqui até você tentar de novo ou apagar.</p>
        </div>
      </main>
    </>
  );
}
export const abrirAreas = () => abrirSheet({ tipo: 'areas' });
