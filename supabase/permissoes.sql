-- Onion Park · libera as funções do servidor (chave service_role) para gravar as assinaturas.
-- Sem isso, o pagamento é aprovado no Mercado Pago mas o Onion Park nunca fica sabendo.
-- Cole no Supabase › SQL Editor › New query › Run. Pode rodar mais de uma vez.
grant usage on schema public to service_role;
grant all on public.subscriptions, public.profiles, public.admins, public.usage_events to service_role;
