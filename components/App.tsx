'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useS, useUI, setUI, mut } from '@/lib/store';
import { ir } from '@/lib/acoes';
import { iniciarPWA } from '@/lib/instalar';
import { iniciarConta } from '@/lib/conta';
import { carregarVagas } from '@/lib/vagasRemotas';
import { Privacidade, AvisoEntrou } from './conta';
import { Ic } from './pecas';
import { Camada } from './sheets';
import { Abertura, Experimente, Combinado, Sobre, Objetivo, Relato, Lendo, Falha } from './telas/entrada';
import { Provas, ProvasLista, Perguntas } from './telas/provas';
import { Mapa, Inicio, Voce, Curriculo } from './telas/mapa';
import { Plano } from './telas/plano';
import { Portas, PortaTela } from './telas/portas';
import { Vagas, VagaTela, Treino } from './telas/vagas';

const TELAS: Record<string, () => React.ReactNode> = {
  abertura: Abertura, experimente: Experimente, combinado: Combinado, sobre: Sobre, objetivo: Objetivo, relato: Relato, lendo: Lendo, falha: Falha,
  provas: Provas, provasLista: ProvasLista, perguntas: Perguntas, mapa: Mapa, plano: Plano, portas: Portas, porta: PortaTela,
  vagas: Vagas, vaga: VagaTela, treino: Treino, curriculo: Curriculo, inicio: Inicio, voce: Voce, privacidade: Privacidade,
};
// telas que não fazem sentido sem os dados certos: volta para um lugar seguro
function telaSegura(t: string, s: ReturnType<typeof useS.getState>) {
  if (!TELAS[t]) return s.concluiu ? 'inicio' : 'abertura';
  if ((t === 'lendo' || t === 'falha') && !useUI.getState().lendo) return 'relato';
  if (['provas', 'perguntas'].includes(t) && !s.leitura) return 'relato';
  if (t === 'treino' && !useUI.getState().treino) return useUI.getState().vaga ? 'vaga' : 'vagas';
  if ((t === 'vaga') && !useUI.getState().vaga) return 'vagas';
  return t;
}

function Toasts() {
  const t = useUI(u => u.toast);
  const [sai, setSai] = useState(false);
  useEffect(() => {
    if (!t) return; setSai(false);
    const a = setTimeout(() => setSai(true), t.acao ? 6000 : 3200), b = setTimeout(() => setUI({ toast: null }), (t.acao ? 6000 : 3200) + 220);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [t?.id]);
  if (!t) return null;
  return (
    <div className={`toast${sai ? ' sai' : ''}`} role="status" style={t.acao ? { pointerEvents: 'auto' } : undefined}>
      <span className="t-ic" aria-hidden="true"><Ic n={t.info ? 'info' : 'check'} /></span><span className="t-tx">{t.msg}</span>
      {t.acao && <button type="button" className="tbtn" onClick={() => { setUI({ toast: null }); if (t.acao!.go) ir(t.acao!.go); t.acao!.fn?.(); }}>{t.acao.label}{t.acao.go && <Ic n="go" />}</button>}
    </div>
  );
}

export default function App() {
  const tela0 = useS(s => s.tela), tr = useUI(u => u.tr), trN = useUI(u => u.trN);
  useUI(u => u.vagasVersao); // quando chegam vagas do banco, a tela é desenhada de novo com a lista nova
  const device = useRef<HTMLDivElement>(null), scroller = useRef<HTMLDivElement>(null);
  const tela = telaSegura(tela0, useS.getState());
  useEffect(() => { if (tela !== tela0) mut(d => { d.tela = tela; }); }, [tela, tela0]);
  useEffect(() => { iniciarPWA(); iniciarConta(); carregarVagas(); }, []);
  useEffect(() => { // na primeira abertura, quem já terminou volta pelo Início
    const s = useS.getState(); if (s.concluiu && s.tela === 'abertura') ir('inicio', { semHist: true, tr: 'fade' });
  }, []);
  useLayoutEffect(() => { // moldura de celular no computador, tela cheia no celular
    const caber = () => { const d = device.current; if (!d) return; if (innerWidth <= 520) { d.style.transform = ''; return; } const k = Math.min(1, (innerHeight - 40) / 896, (innerWidth - 40) / 424); d.style.transform = `translate(-50%,-50%) scale(${k})`; };
    caber(); addEventListener('resize', caber); return () => removeEventListener('resize', caber);
  }, []);
  useEffect(() => { // ao trocar de tela: topo e foco no título (leitor de tela)
    scroller.current?.scrollTo({ top: 0 });
    const h = scroller.current?.querySelector('h1') as HTMLElement | null; if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    setUI({ anima: null });
  }, [tela, trN]);
  const Tela = TELAS[tela];
  return (
    <div className="stage"><div className="device" ref={device}><div className="screen">
      <div className="sbar" aria-hidden="true"><span>9:41</span><span className="ics" /></div><div className="island" aria-hidden="true" /><div className="home" aria-hidden="true" />
      <div className="shell" id="scroller" ref={scroller}>
        <div id="app" key={tela + ':' + trN} className="tr" data-tr={tr} style={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}><Tela /></div>
      </div>
      <div id="layer"><Camada /></div><AvisoEntrou /><div id="toasts"><Toasts /></div>
    </div></div></div>
  );
}
