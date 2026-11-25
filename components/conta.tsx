'use client';
import { useEffect, useState } from 'react';
import { useS, mut } from '@/lib/store';
import { ir, toast, fecharSheet, abrirSheet } from '@/lib/acoes';
import { useConta, contaDisponivel, enviarCodigo, confirmarCodigo, sair, apagarConta } from '@/lib/conta';
import { Ic, sx, Hd, Chk } from './pecas';

const O_QUE_GUARDA = 'Seu e-mail, as provas que você confirmou, seu plano, as vagas e portas que você salvou e suas respostas de “Sobre você”.';
const NUNCA = 'Sua história inteira, o áudio, as respostas do treino e as provas que você recusou.';

// ---------- folha "Guardar meu progresso" ----------
export function ContaSheet() {
  const [fase, setFase] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState(''), [codigo, setCodigo] = useState(''), [aceito, setAceito] = useState(false);
  const [carregando, setCarregando] = useState(false), [erro, setErro] = useState(''), [espera, setEspera] = useState(0);
  const logado = useConta(c => c.userId);
  useEffect(() => { if (logado) fecharSheet(); }, [logado]);
  useEffect(() => { if (!espera) return; const t = setTimeout(() => setEspera(espera - 1), 1000); return () => clearTimeout(t); }, [espera]);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  async function pedir() {
    if (!emailOk || !aceito || espera) return;
    setCarregando(true); setErro('');
    const e = await enviarCodigo(email); setCarregando(false);
    if (e) { setErro(e); return; }
    setFase('codigo'); setEspera(60);
  }
  async function confirmar() {
    if (codigo.replace(/\D/g, '').length < 6) return;
    setCarregando(true); setErro('');
    const e = await confirmarCodigo(email, codigo); setCarregando(false);
    if (e) setErro(e); // se deu certo, o login acontece e a folha fecha sozinha
  }

  if (fase === 'codigo') return (<>
    <span className="grab" aria-hidden="true" />
    <h2 className="hx" style={sx('margin:0;font-size:24px')}>Confira seu e-mail</h2>
    <p style={sx('margin:-6px 0 0')}>Mandamos para <strong style={sx('font-weight:600')}>{email.trim()}</strong> um link e um código de 6 números.</p>
    <p className="soft sm" style={sx('margin:0')}>Toque no link do e-mail, ou digite o código aqui. Se não chegar em 2 minutos, olhe o spam.</p>
    <label className="k" htmlFor="codigo">Código do e-mail</label>
    <input id="codigo" className="box" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={codigo} style={sx('font-size:24px;letter-spacing:.3em;text-align:center')}
      onChange={e => { setCodigo(e.target.value.replace(/\D/g, '')); setErro(''); }} onKeyDown={e => { if (e.key === 'Enter') confirmar(); }} />
    {erro && <div className="aviso-erro" role="alert"><Ic n="info" s="color:var(--no)" /><span>{erro}</span></div>}
    <button type="button" className="bp" disabled={codigo.length < 6 || carregando} onClick={confirmar}>{carregando ? <><span className="spin" />Entrando…</> : 'Entrar'}</button>
    <div style={sx('display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px')}>
      <button type="button" className="bl" onClick={() => { setFase('email'); setCodigo(''); setErro(''); }}>Trocar o e-mail</button>
      <button type="button" className="bl" disabled={!!espera || carregando} onClick={pedir}>{espera ? `Mandar de novo em ${espera}s` : 'Mandar de novo'}</button>
    </div>
  </>);

  return (<>
    <span className="grab" aria-hidden="true" />
    <h2 className="hx" style={sx('margin:0;font-size:24px')}>Guardar meu progresso</h2>
    <p className="soft sm" style={sx('margin:-6px 0 0')}>Opcional. Com uma conta, você não perde nada se trocar de celular ou limpar o navegador. Não tem senha: a MIRA manda um link para o seu e-mail.</p>
    <div className="flat" style={sx('gap:8px;padding:14px 16px')}>
      <span style={sx('display:flex;gap:8px;align-items:flex-start')} className="sm"><Ic n="cloud" s="color:var(--indigo);margin-top:2px;flex:none" /><span><strong style={sx('font-weight:600')}>Fica guardado:</strong> {O_QUE_GUARDA}</span></span>
      <span style={sx('display:flex;gap:8px;align-items:flex-start')} className="sm"><Ic n="lock" s="color:var(--indigo);margin-top:2px;flex:none" /><span><strong style={sx('font-weight:600')}>Nunca fica guardado:</strong> {NUNCA}</span></span>
    </div>
    <label className="k" htmlFor="email">Seu e-mail</label>
    <input id="email" className="box" type="email" inputMode="email" autoComplete="email" maxLength={120} value={email} placeholder="voce@exemplo.com"
      onChange={e => { setEmail(e.target.value); setErro(''); }} onKeyDown={e => { if (e.key === 'Enter') pedir(); }} />
    <Chk on={aceito} onClick={() => setAceito(!aceito)} label="Concordo que a MIRA guarde esses dados até eu apagar" small="Você pode apagar a conta quando quiser, em “Você”." />
    <button type="button" className="bl sm" style={sx('align-self:flex-start;min-height:36px')} onClick={() => { fecharSheet(); ir('privacidade'); }}><Ic n="doc" />Ler a política de privacidade</button>
    {erro && <div className="aviso-erro" role="alert"><Ic n="info" s="color:var(--no)" /><span>{erro}</span></div>}
    <button type="button" className="bp" disabled={!emailOk || !aceito || carregando} onClick={pedir}>{carregando ? <><span className="spin" />Mandando…</> : 'Mandar o link'}</button>
    <button type="button" className="bl" style={sx('align-self:center')} onClick={fecharSheet}>Agora não</button>
  </>);
}

// ---------- seção na tela "Você" ----------
const syncTxt = (s: string, em: number | null) => s === 'salvando' ? 'Salvando…' : s === 'offline' ? 'Sem internet. Salva quando conectar.' : s === 'erro' ? 'Não deu para salvar agora. A MIRA tenta de novo.' : em ? 'Tudo salvo na sua conta.' : 'Conectando…';
export function SecaoConta() {
  const email = useConta(c => c.email), sync = useConta(c => c.sync), salvoEm = useConta(c => c.salvoEm);
  const [confirma, setConfirma] = useState(false), [carregando, setCarregando] = useState(false);
  if (!contaDisponivel) return null;
  if (!email) return (
    <section className="flat" style={sx('gap:8px')}><h2 className="h2">Sua conta</h2>
      <p className="soft sm" style={sx('margin:0')}>Sem conta, tudo fica só neste celular. Com uma conta (opcional, sem senha), você não perde seu progresso.</p>
      <button type="button" className="bs" style={sx('align-self:flex-start')} onClick={() => abrirSheet({ tipo: 'conta' })}><Ic n="cloud" />Guardar meu progresso</button>
    </section>);
  return (
    <section className="flat" style={sx('gap:10px')}><h2 className="h2">Sua conta</h2>
      <div style={sx('display:flex;flex-direction:column;gap:2px')}><span className="soft sm">Entrou como</span><strong style={sx('font-weight:600;word-break:break-all')}>{email}</strong></div>
      <span className="sm" role="status" style={{ display: 'flex', gap: 8, alignItems: 'center', color: sync === 'erro' ? 'var(--no)' : sync === 'salvo' ? 'var(--ok)' : 'var(--soft)' }}>{sync === 'salvando' ? <span className="spin" style={sx('width:14px;height:14px')} /> : <Ic n={sync === 'salvo' ? 'check' : 'cloud'} s="width:18px;height:18px" />}{syncTxt(sync, salvoEm)}</span>
      <p className="soft sm" style={sx('margin:0')}>Fica guardado: {O_QUE_GUARDA}</p>
      {confirma ? <div className="flat" role="alert" style={sx('border:2px solid var(--no);gap:8px')}><strong style={sx('font-weight:600')}>Apagar sua conta?</strong><span className="soft sm">O que está guardado na conta some para sempre. O que está neste celular continua aqui.</span>
        <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}><button type="button" className="bs danger" disabled={carregando} onClick={async () => { setCarregando(true); const e = await apagarConta(); setCarregando(false); setConfirma(false); toast(e || 'Conta apagada. O que está neste celular continua aqui.', undefined, !!e); }}><Ic n="trash" />{carregando ? 'Apagando…' : 'Sim, apagar a conta'}</button>
          <button type="button" className="bs" onClick={() => setConfirma(false)}>Cancelar</button></div></div>
        : <div style={sx('display:flex;gap:8px 16px;flex-wrap:wrap')}><button type="button" className="bs" onClick={async () => { await sair(); toast('Você saiu da conta. O que está neste celular continua aqui.'); }}>Sair da conta</button>
          <button type="button" className="bl" style={sx('color:var(--no)')} onClick={() => setConfirma(true)}><Ic n="trash" />Apagar minha conta</button></div>}
    </section>);
}

// ---------- convite no Início (aparece uma vez, dá para fechar) ----------
export function ConviteConta() {
  const email = useConta(c => c.email), fechado = useS(s => s.contaConviteFechado), concluiu = useS(s => s.concluiu);
  if (!contaDisponivel || email || fechado || !concluiu) return null;
  return (
    <section className="flat" style={sx('gap:8px;border:1.5px solid var(--lilas2)')}>
      <div className="row" style={sx('align-items:flex-start')}><h2 className="h3" style={sx('display:flex;gap:8px;align-items:center')}><Ic n="cloud" s="color:var(--indigo)" />Não perca seu progresso</h2>
        <button type="button" className="bl" aria-label="Fechar convite" style={sx('min-height:32px;padding:0 4px')} onClick={() => mut(d => { d.contaConviteFechado = true; })}><Ic n="x" /></button></div>
      <p className="soft sm" style={sx('margin:0')}>Hoje tudo fica só neste celular. Com uma conta (sem senha), suas provas e seu plano ficam guardados.</p>
      <button type="button" className="bs" style={sx('align-self:flex-start')} onClick={() => abrirSheet({ tipo: 'conta' })}>Guardar meu progresso</button>
    </section>);
}

/** Na abertura: para quem já tem conta e está num celular novo. */
export function EntrarAbertura() {
  const email = useConta(c => c.email);
  if (!contaDisponivel || email) return null;
  return <button type="button" className="bl" style={sx('align-self:center')} onClick={() => abrirSheet({ tipo: 'conta' })}><Ic n="user" />Já tenho conta: entrar</button>;
}

/** Avisa depois do login pelo link do e-mail. */
export function AvisoEntrou() {
  const entrou = useConta(c => c.acabouDeEntrar);
  useEffect(() => {
    if (!entrou) return;
    useConta.setState({ acabouDeEntrar: false });
    const s = useS.getState();
    toast('Pronto, você entrou. Seu progresso está guardado.');
    if (s.concluiu && ['abertura', 'experimente', 'combinado'].includes(s.tela)) ir('inicio', { semHist: true, tr: 'fade' });
  }, [entrou]);
  return null;
}

// ---------- política de privacidade ----------
// ATENÇÃO: rascunho para revisão jurídica. Preencha os campos entre [colchetes] antes de publicar.
export function Privacidade() {
  const S2 = ({ t, children }: { t: string; children: React.ReactNode }) => <section style={sx('display:flex;flex-direction:column;gap:6px')}><h2 className="h3">{t}</h2><div className="sm" style={sx('display:flex;flex-direction:column;gap:6px;line-height:1.55')}>{children}</div></section>;
  return (<>
    <div className="top"><Hd t="Privacidade" /><h1 className="h1">Política de privacidade da MIRA</h1><p className="sub">Versão de [DATA]. Em linguagem simples.</p></div>
    <main className="main" style={sx('gap:22px')}>
      <S2 t="Quem cuida dos seus dados">[NOME DO RESPONSÁVEL / INSTITUIÇÃO], que responde pela MIRA. Contato para qualquer pedido sobre seus dados: [E-MAIL DE CONTATO].</S2>
      <S2 t="Sem conta"><p style={sx('margin:0')}>Suas respostas, provas, plano e vagas salvas ficam só neste celular. Ninguém da equipe vê.</p><p style={sx('margin:0')}>Sua história (texto ou áudio) sai do celular só para a IA ler. Ela é enviada ao Google Gemini, uma IA de outra empresa, e não é guardada pela MIRA. Antes de enviar, a MIRA apaga CPF, telefone e e-mail que você tenha escrito.</p></S2>
      <S2 t="Com conta (opcional)"><p style={sx('margin:0')}><strong style={sx('font-weight:600')}>O que guardamos:</strong> {O_QUE_GUARDA}</p><p style={sx('margin:0')}><strong style={sx('font-weight:600')}>O que nunca guardamos:</strong> {NUNCA}</p><p style={sx('margin:0')}><strong style={sx('font-weight:600')}>Para quê:</strong> só para você recuperar seu progresso em outro celular. Não vendemos nem compartilhamos com empresas ou recrutadores.</p><p style={sx('margin:0')}><strong style={sx('font-weight:600')}>Onde:</strong> num banco de dados do Supabase, na região [REGIÃO, ex.: São Paulo].</p><p style={sx('margin:0')}><strong style={sx('font-weight:600')}>Por quanto tempo:</strong> até você apagar a conta. [Contas sem uso por mais de X meses podem ser apagadas.]</p></S2>
      <S2 t="Seus direitos">Você pode ver, corrigir e apagar seus dados quando quiser. Em “Você”, o botão “Apagar minha conta” apaga tudo o que estava guardado na conta. Para outros pedidos, escreva para [E-MAIL DE CONTATO].</S2>
      <S2 t="Base legal">[A DEFINIR COM O JURÍDICO: consentimento (LGPD, art. 7º, I), que você dá ao criar a conta e pode retirar apagando a conta.]</S2>
      <p className="note">Rascunho. Precisa de revisão jurídica antes de abrir para jovens.</p>
    </main>
  </>);
}
