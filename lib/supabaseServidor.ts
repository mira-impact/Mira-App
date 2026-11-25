// Cliente do Supabase SÓ para o servidor, com a chave secreta (grava na tabela de vagas).
// A chave secreta nunca pode ter NEXT_PUBLIC_ no nome: isso a mandaria para o navegador.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let c: SupabaseClient | null = null;
export function supabaseServidor(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, chave = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return (c ??= createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } }));
}
