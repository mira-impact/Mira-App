'use client';
// Conta opcional (Supabase): login por link ou código no e-mail, sem senha, e sincronização do progresso.
// Sem as variáveis NEXT_PUBLIC_SUPABASE_*, tudo isto fica desligado e a MIRA funciona só no celular.
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useS, S, mut } from './store';
import { paraNuvem, mesclar, type DadosNuvem } from './nuvem';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const contaDisponivel = !!(SB_URL && SB_KEY);

let sb: SupabaseClient | null = null;
const cliente = () => (sb ??= createClient(SB_URL!, SB_KEY!, {
  // "implicit": o link do e-mail funciona mesmo se abrir em outro navegador do celular
  auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'mira-sessao' },
}));

export type Sync = 'parado' | 'salvando' | 'salvo' | 'offline' | 'erro';
export const useConta = create<{ email: string | null; userId: string | null; sync: Sync; salvoEm: number | null; acabouDeEntrar: boolean }>()(
  () => ({ email: null, userId: null, sync: 'parado', salvoEm: null, acabouDeEntrar: false }),
);

// ---------- sincronização ----------
let ultimoEnviado = '', timer: ReturnType<typeof setTimeout> | null = null, cancelarAssinatura: (() => void) | null = null;

async function enviar() {
  const { userId } = useConta.getState(); if (!userId) return;
  if (timer) { clearTimeout(timer); timer = null; }
  const dados = paraNuvem(S()), json = JSON.stringify(dados);
  if (json === ultimoEnviado) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) { useConta.setState({ sync: 'offline' }); return; }
  useConta.setState({ sync: 'salvando' });
  const { error } = await cliente().from('estado_mira').upsert({ user_id: userId, dados, versao: 1 });
  if (error) { console.error('conta: não salvou', error.message); useConta.setState({ sync: navigator.onLine ? 'erro' : 'offline' }); return; }
  ultimoEnviado = json; useConta.setState({ sync: 'salvo', salvoEm: Date.now() });
}
const agendar = () => { if (timer) clearTimeout(timer); timer = setTimeout(enviar, 2000); };

async function aoEntrar(session: Session, novoLogin: boolean) {
  useConta.setState({ email: session.user.email ?? null, userId: session.user.id, acabouDeEntrar: novoLogin });
  const { data, error } = await cliente().from('estado_mira').select('dados').eq('user_id', session.user.id).maybeSingle();
  if (error) { console.error('conta: não baixou', error.message); useConta.setState({ sync: 'erro' }); }
  else if (data?.dados) mut(d => { Object.assign(d, mesclar(d, data.dados as DadosNuvem)); });
  ultimoEnviado = '';
  cancelarAssinatura?.();
  cancelarAssinatura = useS.subscribe(agendar); // daqui em diante, cada mudança sobe sozinha (com 2 s de espera)
  await enviar();
}
function aoSair() {
  cancelarAssinatura?.(); cancelarAssinatura = null;
  if (timer) clearTimeout(timer); timer = null; ultimoEnviado = '';
  useConta.setState({ email: null, userId: null, sync: 'parado', salvoEm: null, acabouDeEntrar: false });
}

let iniciado = false;
export function iniciarConta() {
  if (!contaDisponivel || iniciado || typeof window === 'undefined') return; iniciado = true;
  cliente().auth.onAuthStateChange((evento, session) => {
    // a documentação do Supabase pede para não chamar o Supabase dentro deste callback: por isso o setTimeout
    setTimeout(() => {
      if (session && (evento === 'INITIAL_SESSION' || evento === 'SIGNED_IN') && session.user.id !== useConta.getState().userId) aoEntrar(session, evento === 'SIGNED_IN');
      if (evento === 'SIGNED_OUT') aoSair();
    }, 0);
  });
  addEventListener('online', () => { if (useConta.getState().userId) enviar(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(); });
}

// ---------- entrar, sair, apagar ----------
function traduzir(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('only request')) return 'Muitos pedidos seguidos. Espere um minuto e tente de novo.';
  if (m.includes('invalid') && m.includes('email')) return 'Esse e-mail não parece certo. Confira e tente de novo.';
  if (m.includes('expired') || m.includes('invalid') || m.includes('token')) return 'Código errado ou vencido. Confira ou peça um novo.';
  if (m.includes('fetch') || m.includes('network')) return 'Sem internet agora. Tente de novo quando conectar.';
  return 'Não deu certo agora. Tente de novo em instantes.';
}
export async function enviarCodigo(email: string) {
  const { error } = await cliente().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: location.origin, shouldCreateUser: true } });
  return error ? traduzir(error.message) : null;
}
export async function confirmarCodigo(email: string, codigo: string) {
  const { error } = await cliente().auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.replace(/\D/g, ''), type: 'email' });
  return error ? traduzir(error.message) : null;
}
/** Sai da conta. O que está neste celular continua aqui. */
export async function sair() {
  await enviar().catch(() => {});
  await cliente().auth.signOut({ scope: 'local' });
  aoSair();
}
/** Apaga a conta e tudo o que estava guardado nela. O que está neste celular continua aqui. */
export async function apagarConta() {
  const { error } = await cliente().rpc('apagar_minha_conta');
  if (error) return traduzir(error.message);
  await cliente().auth.signOut({ scope: 'local' }).catch(() => {});
  aoSair(); return null;
}
/** Usado por "Apagar tudo deste celular": sai antes, para não mandar o celular vazio para a conta. */
export async function sairSemEnviar() {
  if (!contaDisponivel || !useConta.getState().userId) return;
  aoSair();
  await cliente().auth.signOut({ scope: 'local' }).catch(() => {});
}
