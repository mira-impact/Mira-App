-- MIRA · vagas coletadas automaticamente (rode uma vez no SQL Editor do Supabase, depois do schema.sql)
-- Só o servidor (com a chave secreta) grava. Qualquer pessoa pode LER as vagas publicadas: vaga não é dado pessoal.
create table if not exists public.vagas (
  url        text primary key,                 -- endereço da vaga: evita repetir
  publicada  boolean     not null default false, -- false = lida e descartada (não é de entrada): não lê de novo
  dados      jsonb,                            -- a ficha no formato da MIRA (null quando descartada)
  fonte      text        not null,             -- página de carreiras de onde veio
  lida_em    date        not null default (now() at time zone 'America/Sao_Paulo')::date,
  valida_ate date,
  criado_em  timestamptz not null default now()
);
create index if not exists vagas_publicadas on public.vagas (publicada, lida_em desc);

alter table public.vagas enable row level security;
drop policy if exists "todos leem vagas publicadas" on public.vagas;
create policy "todos leem vagas publicadas" on public.vagas for select to anon, authenticated using (publicada);

revoke all on table public.vagas from anon, authenticated;
grant select on table public.vagas to anon, authenticated;
-- sem permissão de escrita para anon/authenticated: só a chave secreta (servidor) grava
