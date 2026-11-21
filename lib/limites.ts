// Proteção básica das rotas de IA: limite por IP (por instância) e tamanho máximo.
// Em produção com muito tráfego, troque por Vercel Firewall (rate limiting) ou Upstash.
const janelas = new Map<string, { n: number; ate: number }>();
const MAX = Number(process.env.LIMITE_POR_10MIN || 30);

export function ipDe(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}
export function passouDoLimite(req: Request) {
  const ip = ipDe(req), agora = Date.now(), j = janelas.get(ip);
  if (!j || j.ate < agora) { janelas.set(ip, { n: 1, ate: agora + 10 * 60e3 }); return false; }
  j.n++;
  if (janelas.size > 5000) for (const [k, v] of janelas) if (v.ate < agora) janelas.delete(k);
  return j.n > MAX;
}
export const erro = (status: number, msg: string) => Response.json({ erro: msg }, { status, headers: { 'Cache-Control': 'no-store' } });
export const ok = (dados: unknown) => Response.json(dados, { headers: { 'Cache-Control': 'no-store' } });

export async function lerCorpo(req: Request, maxBytes = 20000): Promise<any> {
  const t = await req.text();
  if (t.length > maxBytes) throw new Error('grande');
  return JSON.parse(t || '{}');
}
