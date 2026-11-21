// Datas sempre no horário de Brasília (UTC-3, sem horário de verão).
export const pad = (n: number) => String(n).padStart(2, '0');
export const brt = (t: string | number | Date) => new Date(new Date(t).getTime() - 3 * 3600e3); // ler com getUTC*
export const diaISO = (t: string | number | Date) => { const b = brt(t); return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}`; };
export const hojeISO = () => diaISO(Date.now());
export const somaDias = (iso: string, n: number) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const difDias = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
export const dowISO = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();
export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const isoBRT = (dia: string, hora: string) => `${dia}T${hora}:00-03:00`;
export const DSEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DSEML = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const horaTxt = (t: string | number | Date) => { const b = brt(t), m = b.getUTCMinutes(); return `${b.getUTCHours()}h${m ? pad(m) : ''}`; };
export const diaTxt = (iso: string, longo?: boolean) => { const k = difDias(hojeISO(), iso); return k === 0 ? 'hoje' : k === 1 ? 'amanhã' : k === -1 ? 'ontem' : `${(longo ? DSEML : DSEM)[dowISO(iso)]}, ${ddmm(iso)}`; };
export const quandoTxt = (t: string, longo?: boolean) => `${diaTxt(diaISO(t), longo)}, ${horaTxt(t)}`;
export const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const novoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const diasDesde = (iso: string) => Math.max(0, difDias(iso.slice(0, 10), hojeISO()));
