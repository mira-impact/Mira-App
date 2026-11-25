'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Parte } from '@/lib/tipos';
import { voltar, ir } from '@/lib/acoes';

// estilo inline escrito como no protótipo: sx("display:flex;gap:8px")
const cache = new Map<string, CSSProperties>();
export function sx(s: string): CSSProperties {
  let o = cache.get(s);
  if (!o) {
    o = {};
    for (const decl of s.split(';')) {
      const i = decl.indexOf(':'); if (i < 0) continue;
      const k = decl.slice(0, i).trim(), v = decl.slice(i + 1).trim(); if (!k) continue;
      const kk = k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      (o as Record<string, string>)[kk] = v;
    }
    cache.set(s, o);
  }
  return o;
}

const I: Record<string, string> = {
  back: '<path d="M15 5l-7 7 7 7"/>', go: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  balao: '<path d="M4 5h16v11H9l-5 4z"/>', mala: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', home: '<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',
  mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', plano: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>', cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  refresh: '<path d="M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3.5 2.5 8.5 2.5 12 0v-5"/>', flag: '<path d="M5 21V4h12l-2.5 4L17 12H5"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  escola: '<path d="M3 10l9-6 9 6M5 10v10h14V10M10 20v-5h4v5"/>',
  porta: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21M3.5 21h17M14.5 12.5v.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.5M12 16.8v.1"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
export const Ic = ({ n, s }: { n: string; s?: string }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true" style={s ? sx(s) : undefined} dangerouslySetInnerHTML={{ __html: I[n] || '' }} />;

// ---------- selos: de onde vem cada informação ----------
const Selo = ({ cls, i, t }: { cls: string; i: string; t: string }) => <span className={`selo ${cls}`}><Ic n={i} />{t}</span>;
export const SV = () => <Selo cls="s-voce" i="balao" t="Você contou" />;
export const SG = () => <Selo cls="s-vagas" i="mala" t="As vagas pedem" />;
export const SL = () => <Selo cls="s-lei" i="doc" t="Está escrito" />;
export const SE = () => <Selo cls="s-ex" i="info" t="A conferir no edital" />;
export const SC = () => <Selo cls="s-ex" i="help" t="A confirmar" />;
export const SRESP = () => <Selo cls="s-lei" i="user" t="Você respondeu" />;
export const SF = () => <Selo cls="s-lei" i="check" t="Conferido em 19/10" />;
export const SM = () => <Selo cls="s-lei" i="user" t="Você marcou" />;
export const SR = () => <Selo cls="s-lei" i="clock" t="Sua rotina" />;
export const OK = () => <span className="ok"><Ic n="check" />trecho conferido</span>;
export const seloDe = (k: string, real?: boolean) => ({ SV: <SV />, SG: <SG />, SM: <SM />, SR: <SR />, SRESP: <SRESP />, SE: <SE />, SF: <SF />, F: real ? <SF /> : <SE /> } as Record<string, ReactNode>)[k];

// ---------- peças ----------
export const Hd = ({ t, dir, back = true }: { t: ReactNode; dir?: ReactNode; back?: boolean }) => (
  <header className="hd">{back && <button type="button" className="back" aria-label="Voltar" onClick={() => voltar()}><Ic n="back" /></button>}<span className="t">{t}</span>{dir ? <span className="sm" style={sx('font-weight:600')}>{dir}</span> : null}</header>
);
export const Dots = ({ n, on }: { n: number; on: number }) => (
  <div className="dots" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>{Array.from({ length: n }, (_, i) => <span key={i} className={`dot${i < on ? ' on' : ''}`} />)}</div>
);
export const Logo = () => (
  <div style={sx('position:relative;align-self:flex-start;padding:8px 14px;color:var(--indigo)')}>
    <span className="cn" style={sx('top:0;left:0;border-width:2px 0 0 2px')} /><span className="cn" style={sx('top:0;right:0;border-width:2px 2px 0 0')} />
    <span className="cn" style={sx('bottom:0;left:0;border-width:0 0 2px 2px')} /><span className="cn" style={sx('bottom:0;right:0;border-width:0 2px 2px 0')} />
    <span className="hx" style={sx('font-size:24px;line-height:1')}>mira</span>
  </div>
);
export function Nav({ on }: { on: string }) {
  return (
    <nav className="nav" aria-label="Menu principal">
      {[['inicio', 'Início', 'home'], ['mapa', 'Mapa', 'mapa'], ['plano', 'Plano', 'plano'], ['portas', 'Portas', 'porta'], ['vagas', 'Vagas', 'mala']].map(([t, l, i]) => (
        <button key={t} type="button" className={`nv${on === t ? ' on' : ''}`} aria-current={on === t ? 'page' : undefined} onClick={() => ir(t, { tr: 'fade' })}><span className="ic"><Ic n={i} /></span>{l}</button>
      ))}
    </nav>
  );
}
export const Chk = ({ on, onClick, label, small }: { on: boolean; onClick: () => void; label: ReactNode; small?: ReactNode }) => (
  <button type="button" className={`chk${on ? ' on' : ''}`} role="checkbox" aria-checked={on} onClick={onClick}>
    <span className="bx">{on && <Ic n="check" />}</span><span>{label}{small ? <span className="soft sm" style={sx('display:block')}>{small}</span> : null}</span>
  </button>
);
/** Texto com trechos grifados (amarelo = o que fez, lilás = o que quer). */
export function Marcado({ texto, marcas, cls = 'mk', anim }: { texto: string; marcas: string[] | { txt: string; cls: string }[]; cls?: string; anim?: number }) {
  const L = (marcas as (string | { txt: string; cls: string })[]).map(m => (typeof m === 'string' ? { txt: m, cls } : m));
  const pos: { ini: number; fim: number; cls: string; k: number }[] = [];
  L.forEach((m, k) => { const i = texto.indexOf(m.txt); if (i >= 0 && !pos.some(p => i < p.fim && i + m.txt.length > p.ini)) pos.push({ ini: i, fim: i + m.txt.length, cls: m.cls, k }); });
  pos.sort((a, b) => a.ini - b.ini);
  const out: ReactNode[] = []; let cur = 0;
  pos.forEach(p => { if (p.ini > cur) out.push(texto.slice(cur, p.ini)); out.push(<span key={p.ini} className={`${p.cls}${anim === p.k ? ` ${p.cls}-in` : ''}`}>{texto.slice(p.ini, p.fim)}</span>); cur = p.fim; });
  out.push(texto.slice(cur));
  return <>{out}</>;
}
export const Partes = ({ p }: { p: Parte[] }) => <>{p.map(([t, m], i) => (m ? <span key={i} className="mk">{t}</span> : <span key={i}>{t}</span>))}</>;
export const Cita = ({ t }: { t: string[] }) => <>“{t.map((x, i) => <span key={i}>{i ? ' … ' : ''}<span className="mk">{x}</span></span>)}”</>;

// ---------- gravar áudio: o Gemini transcreve e o texto entra na caixa para a pessoa conferir ----------
const MAX_SEG = 300; // 5 minutos por gravação
function tipoGravacao() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}
export function useGravador(aoTranscrever: (t: string) => void, aoErro: (msg: string) => void) {
  const [fase, setFase] = useState<'parado' | 'gravando' | 'transcrevendo'>('parado');
  const [seg, setSeg] = useState(0);
  const rec = useRef<MediaRecorder | null>(null), partes = useRef<Blob[]>([]), timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cb = useRef({ aoTranscrever, aoErro }); cb.current = { aoTranscrever, aoErro };
  const pararTudo = () => { if (timer.current) clearInterval(timer.current); timer.current = null; rec.current?.stream.getTracks().forEach(t => t.stop()); };
  useEffect(() => () => { rec.current?.state === 'recording' && rec.current.stop(); pararTudo(); }, []);
  async function enviar(blob: Blob) {
    setFase('transcrevendo');
    try {
      const r = await fetch('/api/transcrever', { method: 'POST', headers: { 'Content-Type': blob.type.split(';')[0] || 'audio/webm' }, body: blob });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.erro || 'Não deu para transcrever agora.');
      if (!j.texto) cb.current.aoErro('Não deu para entender o áudio. Tente falar mais perto do celular.');
      else cb.current.aoTranscrever(j.texto);
    } catch (e) { cb.current.aoErro((e as Error).message || 'Não deu para transcrever agora.'); }
    finally { setFase('parado'); }
  }
  async function iniciar() {
    const tipo = tipoGravacao();
    if (tipo === null || !navigator.mediaDevices?.getUserMedia) { cb.current.aoErro('Este navegador não grava áudio. Tente pelo Chrome ou Safari atualizados.'); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { cb.current.aoErro('A MIRA precisa de permissão para usar o microfone. Libere nas configurações do navegador.'); return; }
    const r = new MediaRecorder(stream, { ...(tipo ? { mimeType: tipo } : {}), audioBitsPerSecond: 32000 });
    partes.current = [];
    r.ondataavailable = e => { if (e.data.size) partes.current.push(e.data); };
    r.onstop = () => { pararTudo(); const blob = new Blob(partes.current, { type: r.mimeType || tipo || 'audio/webm' }); partes.current = []; if (blob.size > 1000) enviar(blob); else { setFase('parado'); cb.current.aoErro('O áudio ficou curto demais.'); } };
    rec.current = r; r.start(1000); setSeg(0); setFase('gravando');
    timer.current = setInterval(() => setSeg(x => { if (x + 1 >= MAX_SEG) r.state === 'recording' && r.stop(); return x + 1; }), 1000);
  }
  const parar = () => { if (rec.current?.state === 'recording') rec.current.stop(); };
  const cancelar = () => { if (rec.current) { rec.current.onstop = () => { pararTudo(); partes.current = []; setFase('parado'); }; if (rec.current.state === 'recording') rec.current.stop(); } };
  return { fase, seg, iniciar, parar, cancelar };
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export function BotaoMic({ aoFalar, rotulo = 'Gravar áudio em vez de escrever', onSemSuporte }: { aoFalar: (t: string) => void; rotulo?: string; onSemSuporte: (msg?: string) => void }) {
  const g = useGravador(aoFalar, msg => onSemSuporte(msg));
  if (g.fase === 'gravando') return (
    <div role="status" style={sx('display:flex;flex-direction:column;gap:10px;border:1.5px solid var(--no);border-radius:10px;padding:12px 14px;background:var(--bg)')}>
      <span style={sx('display:flex;align-items:center;gap:10px;font-weight:600')}><span style={sx('width:12px;height:12px;border-radius:50%;background:var(--no);flex:none;animation:pisca 1s infinite')} />Gravando · {mmss(g.seg)}</span>
      <span className="soft sm" style={sx('margin-top:-6px')}>Até {MAX_SEG / 60} minutos. Fale com calma.</span>
      <div style={sx('display:flex;gap:8px')}><button type="button" className="bs fill" style={sx('flex:1')} onClick={g.parar}><Ic n="check" />Terminei</button><button type="button" className="bs" onClick={g.cancelar}>Cancelar</button></div>
    </div>);
  if (g.fase === 'transcrevendo') return <div className="flat" role="status" style={sx('flex-direction:row;align-items:center;gap:12px;padding:12px 16px')}><span className="spin" /><span>Transformando seu áudio em texto…</span></div>;
  return <button type="button" className="bs" style={sx('align-self:flex-start')} onClick={g.iniciar}><Ic n="mic" />{rotulo}</button>;
}
