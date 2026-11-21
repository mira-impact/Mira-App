'use client';
import { useEffect, useRef } from 'react';
import { useS, useUI, mut, setUI, UI } from '@/lib/store';
import { fecharSheet, toast, salvarPasso, HORAS } from '@/lib/acoes';
import { portaDoPasso } from '@/lib/regras';
import { hojeISO, somaDias, difDias, dowISO, ddmm, DSEM, diaTxt, cap1, quandoTxt, isoBRT } from '@/lib/datas';
import { Ic, sx, Chk, SE, SF } from './pecas';
import { ChipsAreas } from './telas/entrada';
import { RESP } from './telas/portas';

const MOTIVOS = ['Não fiz isso', 'Exagerou', 'Foi outra pessoa', 'Outro motivo'];

function Recusa({ comp }: { comp: string }) {
  const p = useS(s => s.leitura?.provas.find(x => x.comp === comp)), m = useS(s => s.motivos[comp]) || {};
  if (!p) return null;
  return (<>
    <span className="grab" aria-hidden="true" />
    <h2 className="hx" style={sx('margin:0;font-size:24px')}>O que não está certo?</h2>
    <p className="soft sm" style={sx('margin:-8px 0 0')}>Prova: {p.nome}</p>
    <div className="ops">{MOTIVOS.map(x => <button key={x} type="button" className={`op${m.motivo === x ? ' on' : ''}`} aria-pressed={m.motivo === x} onClick={() => mut(d => { d.motivos[comp] = { ...d.motivos[comp], motivo: x }; })}>{m.motivo === x && <Ic n="check" />}{x}</button>)}</div>
    <label className="k" htmlFor="mot-txt">Quer explicar? (opcional)</label>
    <textarea id="mot-txt" rows={2} maxLength={300} style={sx('font-size:16px')} value={m.txt || ''} onChange={e => mut(d => { d.motivos[comp] = { ...d.motivos[comp], txt: e.target.value }; })} />
    <button type="button" className="bp" disabled={!m.motivo} onClick={() => { mut(d => { d.provas[comp] = 'no'; }); fecharSheet(); toast('Prova retirada. Obrigado por explicar.'); }}>Tirar esta prova</button>
    <button type="button" className="bl" style={sx('align-self:center')} onClick={fecharSheet}>Voltar, está certo sim</button>
    <p className="cap">O motivo fica neste celular. Nos testes, a equipe só vê se você deixou.</p>
  </>);
}

function Areas() {
  return (<>
    <span className="grab" aria-hidden="true" /><h2 className="hx" style={sx('margin:0;font-size:24px')}>Que áreas te interessam?</h2>
    <p className="soft sm" style={sx('margin:-6px 0 0')}>Vagas mostra primeiro as dessas áreas. As portas da área sobem na lista.</p>
    <ChipsAreas /><button type="button" className="bp" onClick={fecharSheet}>Pronto</button>
  </>);
}

function Passo() {
  const ps = useUI(u => u.ps);
  if (!ps) return null;
  const up = (p: Partial<typeof ps>) => setUI({ ps: { ...UI().ps!, ...p } });
  const p = portaDoPasso(ps.origem), hoje = hojeISO(), dias = Array.from({ length: 8 }, (_, k) => somaDias(hoje, k));
  if (!dias.includes(ps.dia)) dias.push(ps.dia);
  const tarde = (h: string) => Date.parse(isoBRT(ps.dia, h)) <= Date.now(), invalido = tarde(ps.hora);
  const prazoOk = !!(p?.prazo && Date.parse(p.prazo.data) > Date.now() && !ps.editId);
  return (<>
    <span className="grab" aria-hidden="true" />
    <div style={sx('display:flex;flex-direction:column;gap:2px')}><h2 className="hx" style={sx('margin:0;font-size:24px')}>{ps.editId ? 'Remarcar passo' : 'Seu próximo passo'}</h2><span className="soft sm">{p ? p.t : 'Sugestão da MIRA'}</span></div>
    {ps.ops.length > 1 && !ps.editId ? <fieldset><legend style={sx('margin-bottom:4px')}>Qual passo você vai fazer primeiro?</legend><div role="radiogroup" style={sx('display:flex;flex-direction:column;gap:8px')}>{ps.ops.map(o => <button key={o} type="button" role="radio" aria-checked={ps.acao === o} className={`op lst${ps.acao === o ? ' on' : ''}`} onClick={() => up({ acao: o })}>{ps.acao === o && <Ic n="check" />}{o}</button>)}</div></fieldset>
      : <div className="flat" style={sx('padding:14px 16px;gap:4px')}><span className="k">O passo</span><strong style={sx('font-weight:600')}>{ps.acao}</strong></div>}
    <fieldset><legend style={sx('margin-bottom:0')}>Quando?</legend>
      <div className="grade4" role="radiogroup" aria-label="Dia">{dias.map(d => { const k = difDias(hoje, d); return <button key={d} type="button" role="radio" aria-checked={ps.dia === d} aria-label={cap1(diaTxt(d, true))} className={`op dia${ps.dia === d ? ' on' : ''}`} onClick={() => up({ dia: d })}>{k === 0 ? 'Hoje' : k === 1 ? 'Amanhã' : cap1(DSEM[dowISO(d)])}<small>{ddmm(d)}</small></button>; })}</div>
      <div className="grade4" role="radiogroup" aria-label="Hora">{HORAS.map(h => <button key={h} type="button" role="radio" aria-checked={ps.hora === h} className={`op sm2${ps.hora === h ? ' on' : ''}`} disabled={tarde(h)} aria-disabled={tarde(h)} onClick={() => up({ hora: h })}>{+h}h</button>)}</div>
      <span className="sm" role="status" style={{ fontWeight: 600, color: invalido ? 'var(--no)' : 'var(--indigo)' }}>{invalido ? 'Esse horário já passou. Escolha outro.' : cap1(quandoTxt(isoBRT(ps.dia, ps.hora), true))}</span>
    </fieldset>
    <Chk on={ps.lembrete} onClick={() => up({ lembrete: !ps.lembrete })} label="Lembrar 1 hora antes" small="O aviso vai junto no arquivo da agenda." />
    {prazoOk && <Chk on={ps.prazo} onClick={() => up({ prazo: !ps.prazo })} label="Também pôr o prazo de inscrição na agenda" small={<>{p!.prazo!.txt} {p!.prazo!.curto}. Vai junto no arquivo da agenda.<span style={sx('display:block;margin-top:6px')}>{p!.real ? <SF /> : <SE />}</span></>} />}
    <button type="button" className="bp" disabled={invalido} onClick={() => salvarPasso(false)}>{ps.editId ? 'Salvar nova data' : 'Salvar no meu plano'}</button>
    <button type="button" className="bs w100 quebra" disabled={invalido} onClick={() => salvarPasso(true)}><Ic n="cal" />Adicionar à agenda do celular (.ics)</button>
    <p className="cap">Os dois botões guardam o passo no seu plano. O segundo também cria o arquivo para a agenda.</p>
    <button type="button" className="bl" style={sx('align-self:center')} onClick={fecharSheet}>Cancelar</button>
  </>);
}

function Resp({ campo }: { campo: 'enem' | 'escola' }) {
  const val = useS(s => s.sobre[campo]), R = RESP[campo];
  const set = (v: string | null) => { mut(d => { d.sobre[campo] = v; }); fecharSheet(); };
  return (<>
    <span className="grab" aria-hidden="true" /><h2 className="hx" style={sx('margin:0;font-size:24px')}>{R.q}</h2><p className="soft sm" style={sx('margin:-6px 0 0')}>Vale para todas as portas.</p>
    <div className="ops">{R.ops.map(o => <button key={o} type="button" className={`op${val === o ? ' on' : ''}`} aria-pressed={val === o} onClick={() => set(o)}>{val === o && <Ic n="check" />}{o}</button>)}</div>
    <button type="button" className="bs w100" onClick={() => set(null)}>Apagar esta resposta</button>
    <button type="button" className="bl" style={sx('align-self:center')} onClick={fecharSheet}>Fechar</button>
  </>);
}

export function Camada() {
  const sheet = useUI(u => u.sheet), ref = useRef<HTMLElement>(null), antes = useRef<Element | null>(null);
  useEffect(() => {
    if (sheet) { antes.current = document.activeElement; const h = ref.current?.querySelector('h2') as HTMLElement | null; if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
    else if (antes.current instanceof HTMLElement && antes.current.isConnected) { antes.current.focus({ preventScroll: true }); antes.current = null; }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && UI().sheet) fecharSheet(); };
    addEventListener('keydown', esc); return () => removeEventListener('keydown', esc);
  }, [sheet?.tipo]);
  if (!sheet) return null;
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) fecharSheet(); }}>
      <section className="sheet" role="dialog" aria-modal="true" ref={ref}>
        {sheet.tipo === 'recusa' ? <Recusa comp={sheet.comp} /> : sheet.tipo === 'areas' ? <Areas /> : sheet.tipo === 'passo' ? <Passo /> : <Resp campo={sheet.campo} />}
      </section>
    </div>
  );
}
