-- Onion Park · assinaturas (Mercado Pago)
-- Cole no Supabase › SQL Editor › New query › Run (depois do schema.sql).

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preapproval_id text unique,
  status text not null default 'pending',          -- pending | authorized | paused | cancelled
  payer_email text,
  next_payment_date timestamptz,
  access_until timestamptz,                          -- até quando o acesso vale (mês já pago)
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
alter table public.subscriptions enable row level security;
create policy "assinatura: ler a minha" on public.subscriptions for select using (auth.uid() = user_id);
create policy "assinatura: admin lê todas" on public.subscriptions for select using ((auth.jwt() ->> 'email') in (select email from public.admins));
-- só as funções do servidor (com a chave service_role) gravam nessa tabela
