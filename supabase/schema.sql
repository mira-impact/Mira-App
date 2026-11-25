-- MIRA · conta opcional
-- Rode este arquivo inteiro uma vez em: Supabase → SQL Editor → New query → Run.

-- 1) Uma linha por pessoa, com o progresso dela na MIRA.
--    "dados" guarda SÓ: provas confirmadas, plano, vagas/portas salvas, respostas de "Sobre você".
--    Nunca a história inteira, nunca o áudio (o app filtra antes de enviar: lib/conta.ts → paraNuvem).
create table if not exists public.estado_mira (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  dados         jsonb       not null,
  versao        int         not null default 1,
  atualizado_em timestamptz not null default now()
);

-- Proteção contra envio de coisa grande demais (o normal fica bem abaixo de 50 KB).
alter table public.estado_mira drop constraint if exists estado_mira_tamanho;
alter table public.estado_mira add constraint estado_mira_tamanho check (pg_column_size(dados) < 200000);

-- 2) Cada pessoa só enxerga e altera a própria linha. O banco recusa qualquer outra.
alter table public.estado_mira enable row level security;

drop policy if exists "dono le"      on public.estado_mira;
drop policy if exists "dono cria"    on public.estado_mira;
drop policy if exists "dono altera"  on public.estado_mira;
drop policy if exists "dono apaga"   on public.estado_mira;

create policy "dono le"     on public.estado_mira for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono cria"   on public.estado_mira for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono altera" on public.estado_mira for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono apaga"  on public.estado_mira for delete to authenticated using ((select auth.uid()) = user_id);

-- Permissões da API: só quem está logado acessa a tabela (e as regras acima limitam à própria linha).
-- Necessário se "Grant API access to new tables automatically" estiver desligado no projeto.
revoke all on table public.estado_mira from anon;
grant select, insert, update, delete on table public.estado_mira to authenticated;

-- Atualiza a data sozinho a cada alteração.
create or replace function public.estado_mira_toca() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end; $$;
drop trigger if exists estado_mira_toca on public.estado_mira;
create trigger estado_mira_toca before update on public.estado_mira for each row execute function public.estado_mira_toca();

-- 3) "Apagar minha conta": apaga o login e, em cascata, o progresso guardado.
--    Só apaga a conta de quem está chamando (auth.uid()); ninguém apaga a conta de outra pessoa.
create or replace function public.apagar_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  delete from auth.users where id = auth.uid();
end; $$;
revoke all on function public.apagar_minha_conta() from public, anon;
grant execute on function public.apagar_minha_conta() to authenticated;
