// Arquivo de agenda .ics (RFC 5545), aberto pelo app de calendário do celular.
import { pad, horaTxt } from './datas';
import type { Passo, Porta } from './tipos';

type Ev = { uid: string; inicio: Date; fim: Date; titulo: string; desc: string; alarme: boolean };
const icsData = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const icsTxt = (t: string) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function dobrar(linha: string) { // até 75 octetos por linha, sem cortar caractere UTF-8
  const enc = new TextEncoder(), out: string[] = []; let cur = '', bytes = 0;
  for (const ch of linha) { const b = enc.encode(ch).length; if (bytes + b > 75) { out.push(cur); cur = ' '; bytes = 1; } cur += ch; bytes += b; }
  out.push(cur); return out.join('\r\n');
}
export function gerarIcs(eventos: Ev[]) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MIRA//App//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'], agora = icsData(new Date());
  for (const e of eventos) {
    L.push('BEGIN:VEVENT', `UID:${e.uid}@mira`, `DTSTAMP:${agora}`, `DTSTART:${icsData(e.inicio)}`, `DTEND:${icsData(e.fim)}`, `SUMMARY:${icsTxt(e.titulo)}`, `DESCRIPTION:${icsTxt(e.desc)}`);
    if (e.alarme) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTxt(e.titulo)}`, 'TRIGGER:-PT1H', 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(dobrar).join('\r\n') + '\r\n';
}
export const evPasso = (x: Passo, origem: string, site?: string): Ev => {
  const ini = new Date(x.quando);
  return { uid: x.id, inicio: ini, fim: new Date(ini.getTime() + 3600e3), titulo: x.acao, alarme: !!x.lembrete, desc: `Seu passo no plano da MIRA. Origem: ${origem}.${site ? ` Site oficial: ${site}` : ''}` };
};
export const evPrazo = (p: Porta, alarme = true): Ev => {
  const d = new Date(p.prazo!.data);
  return { uid: `prazo-${p.id}`, inicio: new Date(d.getTime() - 3600e3), fim: d, alarme, titulo: `Prazo: ${p.prazo!.txt} (${p.t}), fecha às ${horaTxt(d)}`, desc: `Confira no site oficial antes de se programar.${p.site ? ` ${p.site}` : ''}` };
};
export function baixarIcs(eventos: Ev[], nome: string) {
  try {
    const url = URL.createObjectURL(new Blob([gerarIcs(eventos)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); return true;
  } catch { return false; }
}
