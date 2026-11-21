'use client';
// "Instalar app" do Chrome (Android/computador). O evento só chega se o app ainda não estiver instalado.
import { create } from 'zustand';

type Evento = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export const useInstalar = create<{ evento: Evento | null; instalado: boolean }>()(() => ({ evento: null, instalado: false }));

let iniciado = false;
export function iniciarPWA() {
  if (iniciado || typeof window === 'undefined') return; iniciado = true;
  if (matchMedia('(display-mode: standalone)').matches) useInstalar.setState({ instalado: true });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); useInstalar.setState({ evento: e as Evento }); });
  addEventListener('appinstalled', () => useInstalar.setState({ evento: null, instalado: true }));
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/sw.js').catch(() => {});
}
export async function instalar() {
  const e = useInstalar.getState().evento; if (!e) return false;
  await e.prompt(); const r = await e.userChoice;
  useInstalar.setState({ evento: null, instalado: r.outcome === 'accepted' });
  return r.outcome === 'accepted';
}
