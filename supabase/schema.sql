-- Onion Park · cadastro e uso
-- Cole tudo no Supabase › SQL Editor › New query › Run.
-- Antes de rodar, troque SEU-EMAIL@gmail.com pelo e-mail que vai ver o painel de contas.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  opens int not null default 0,
  projects int not null default 0,
  videos int not null default 0,
  stories int not null default 0
);
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
create table if not exists public.admins (email text primary key);
insert into public.admins(email) values ('SEU-EMAIL@gmail.com') on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.admins enable row level security;

-- cada pessoa vê e edita só o próprio cadastro
create policy "perfil: ler o meu" on public.profiles for select using (auth.uid() = id);
create policy "perfil: editar o meu" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- o administrador vê todos
create policy "perfil: admin lê todos" on public.profiles for select using ((auth.jwt() ->> 'email') in (select email from public.admins));
create policy "uso: admin lê todos" on public.usage_events for select using ((auth.jwt() ->> 'email') in (select email from public.admins));
create policy "admins: ler o meu" on public.admins for select using (email = (auth.jwt() ->> 'email'));

-- cria o perfil sozinho quando alguém se cadastra (por e-mail ou pelo Google)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, accepted_terms_at)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'phone', ''),
          case when (new.raw_user_meta_data ->> 'accepted_terms') = 'true' then now() else null end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- registra o uso (abriu o parque, começou um projeto, renderizou um vídeo ou um story)
create or replace function public.track(kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.usage_events (user_id, kind) values (auth.uid(), kind);
  update public.profiles set
    last_seen_at = now(),
    opens = opens + (kind = 'abriu')::int,
    projects = projects + (kind = 'projeto')::int,
    videos = videos + (kind = 'video')::int,
    stories = stories + (kind = 'story')::int
  where id = auth.uid();
end $$;
grant execute on function public.track(text) to authenticated;
