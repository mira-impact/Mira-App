// GET /api/vagas/atualizar  · chamado 1x por dia pela Vercel (vercel.json → crons). Protegido por CRON_SECRET.
// Visita as fontes aprovadas (fontes/aprovadas.json), lê as vagas novas em JobPosting, o Gemini preenche a ficha,
// grava no Supabase e apaga as vagas vencidas. Cada execução faz um pouco (limite de tempo das funções); o resto fica para o dia seguinte.
import fontes from '@/fontes/aprovadas.json';
import { supabaseServidor } from '@/lib/supabaseServidor';
import { rastrearFonte } from '@/lib/coleta/rastrear';
import { pareceEntrada } from '@/lib/coleta/jobposting';
import { extrairVaga } from '@/lib/extrairVaga';
import { hojeISO, somaDias } from '@/lib/datas';

export const maxDuration = 60;
const ORCAMENTO_MS = 45_000, MAX_IA_POR_DIA = Number(process.env.COLETA_MAX_IA || 30), VALIDADE_DIAS = 30;

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) return Response.json({ erro: 'não autorizado' }, { status: 401 });
  const sb = supabaseServidor();
  if (!sb) return Response.json({ erro: 'Supabase do servidor não configurado (SUPABASE_SECRET_KEY)' }, { status: 503 });
  const inicio = Date.now(), hoje = hojeISO(), lista = fontes as { nome: string; url: string }[];
  const relatorio = { fontes: 0, novas: 0, publicadas: 0, descartadas: 0, erros: 0, apagadas: 0, situacoes: {} as Record<string, string> };

  // 1) limpeza: vencidas pela data da vaga ou lidas há mais de 30 dias
  const { count: c1 } = await sb.from('vagas').delete({ count: 'exact' }).lt('valida_ate', hoje);
  const { count: c2 } = await sb.from('vagas').delete({ count: 'exact' }).lt('lida_em', somaDias(hoje, -VALIDADE_DIAS));
  relatorio.apagadas = (c1 || 0) + (c2 || 0);

  // 2) o que já conhecemos (publicadas e descartadas): não abre de novo
  const { data: conhecidas, error } = await sb.from('vagas').select('url');
  if (error) return Response.json({ erro: 'não leu a tabela vagas: ' + error.message }, { status: 500 });
  const ja = new Set((conhecidas || []).map(r => r.url as string));

  // 3) começa por uma fonte diferente a cada dia, para todas serem visitadas mesmo se o tempo acabar
  const desloc = lista.length ? Number(hoje.replace(/-/g, '')) % lista.length : 0;
  const ordem = [...lista.slice(desloc), ...lista.slice(0, desloc)];
  let usosIA = 0;
  for (const f of ordem) {
    if (Date.now() - inicio > ORCAMENTO_MS) break;
    relatorio.fontes++;
    const r = await rastrearFonte(f.url, { maxPaginas: 15, ignorar: ja, empresa: f.nome });
    relatorio.situacoes[f.nome] = `${r.situacao} (${r.vagas.length} lidas)`;
    for (const b of r.vagas) {
      if (ja.has(b.url) || Date.now() - inicio > ORCAMENTO_MS) continue;
      if (b.validaAte && b.validaAte < hoje) continue;
      relatorio.novas++;
      const base = { url: b.url, fonte: f.url, lida_em: hoje, valida_ate: b.validaAte || null };
      if (!pareceEntrada(b)) { await sb.from('vagas').upsert({ ...base, publicada: false, dados: null }); ja.add(b.url); relatorio.descartadas++; continue; }
      if (usosIA >= MAX_IA_POR_DIA) continue; // fica para amanhã
      usosIA++;
      try {
        const ficha = await extrairVaga(b, hoje);
        await sb.from('vagas').upsert({ ...base, publicada: !!ficha, dados: ficha });
        ja.add(b.url);
        if (ficha) relatorio.publicadas++; else relatorio.descartadas++;
      } catch (e) { relatorio.erros++; console.error('coleta: IA falhou em', b.url, (e as Error).message); }
    }
  }
  return Response.json({ ok: true, hoje, ...relatorio, segundos: Math.round((Date.now() - inicio) / 1000) });
}
