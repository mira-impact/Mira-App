// GET /api/vagas  →  { vagas: Vaga[] }  (só as publicadas; guardado em cache por 1 hora)
import { createClient } from '@supabase/supabase-js';
import { connection } from 'next/server';


export async function GET() {
  await connection(); // sempre na hora do pedido (nunca congelada no build); o cache fica com a CDN (Cache-Control)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return Response.json({ vagas: [] });
  const sb = createClient(url, chave, { auth: { persistSession: false } });
  const { data, error } = await sb.from('vagas').select('dados').eq('publicada', true).order('lida_em', { ascending: false }).limit(300);
  if (error) { console.error('vagas: não leu', error.message); return Response.json({ vagas: [] }, { headers: { 'Cache-Control': 'no-store' } }); }
  return Response.json({ vagas: (data || []).map(r => r.dados).filter(Boolean) }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
