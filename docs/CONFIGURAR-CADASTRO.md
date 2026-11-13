# Ligar o cadastro do Onion Park (Supabase + Google)

Leva uns 20 minutos, uma vez só. Enquanto `assets/config.js` estiver vazio, o parque abre sem cadastro.

## 1. Criar o projeto no Supabase (grátis)
1. Entre em **supabase.com** e crie uma conta.
2. **New project** › nome `onion-park` › região **South America (São Paulo)** › crie uma senha forte pro banco (guarde).

## 2. Criar as tabelas
1. Abra o arquivo `supabase/schema.sql` e troque `SEU-EMAIL@gmail.com` pelo e-mail que vai ver o painel de contas.
2. No Supabase: **SQL Editor › New query**, cole o arquivo inteiro e clique em **Run**.

## 3. E-mail validado
1. **Authentication › Sign In / Providers › Email**: deixe ligado, com **Confirm email** ativado.
2. **Authentication › URL Configuration**:
   - **Site URL:** `https://gahbrielsoares.github.io/Onion/app/`
   - **Redirect URLs:** adicione `https://gahbrielsoares.github.io/Onion/**`

## 4. Entrar com o Google
1. Em **console.cloud.google.com**, crie um projeto (ex.: Onion Park).
2. **APIs e serviços › Tela de consentimento OAuth**: tipo **Externo**, nome **Onion Park**, seu e-mail de suporte. Salve.
3. **APIs e serviços › Credenciais › Criar credenciais › ID do cliente OAuth** › tipo **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, cole o endereço que o Supabase mostra em **Authentication › Providers › Google** (algo como `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
5. Copie o **ID do cliente** e a **Chave secreta** e cole no Supabase em **Authentication › Providers › Google**. Ligue e salve.

## 5. Ligar no site
Em **Project Settings › API**, copie a **Project URL** e a chave **anon public** e coloque em `assets/config.js`:

```js
supabaseUrl: "https://SEU-PROJETO.supabase.co",
supabaseAnonKey: "eyJhbGciOi...",
```

A chave anon é pública por natureza: quem protege os dados são as regras (RLS) criadas no passo 2. **Nunca** coloque a chave `service_role` no site.

## 6. Ver as contas
- Painel pronto: `https://gahbrielsoares.github.io/Onion/admin.html` (entre com o e-mail do passo 2). Mostra cada conta, telefone (com link pro WhatsApp), data do cadastro, último uso, status (ativo, parado, nunca abriu), aberturas, projetos, vídeos e stories, com busca e exportação em CSV.
- Ou direto no Supabase: **Table Editor › profiles**.

## Bom saber
- O envio de e-mails do próprio Supabase tem limite baixo por hora. Quando os cadastros crescerem, configure um SMTP próprio (ex.: Resend ou Brevo) em **Authentication › Emails › SMTP Settings**.
- No plano grátis, projetos sem uso por um tempo podem ser pausados. Com gente usando todo dia, isso não acontece.
- O telefone é guardado como informado (não há verificação por SMS, que tem custo).
