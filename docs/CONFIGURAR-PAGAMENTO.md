# Ligar o pagamento (Mercado Pago Assinaturas)

## 1. Credenciais do Mercado Pago
1. Entre em **mercadopago.com.br/developers/panel/app** e clique em **Criar aplicação** (nome: Onion Park, tipo: pagamentos online, produto: **Assinaturas**).
2. Em **Credenciais de produção**, copie o **Access Token** (começa com `APP_USR-`). É secreto: não mande pra ninguém e não coloque no site.

## 2. Tabela das assinaturas
Supabase › **SQL Editor** › New query › cole `supabase/pagamento.sql` › **Run**.

## 3. Segredos (Supabase › Edge Functions › Secrets)
- `MP_ACCESS_TOKEN` = o Access Token do passo 1
- `APP_URL` = `https://gahbrielsoares.github.io/Onion/app/`
- `PRICE` = `9.90`
- `MP_WEBHOOK_SECRET` = (preencha depois do passo 5)

## 4. Funções (Supabase › Edge Functions › Deploy a new function › Via Editor)
- **mp-checkout**: cole `supabase/functions/mp-checkout/index.ts` › Deploy. Deixe **Verify JWT ligado**.
- **mp-webhook**: cole `supabase/functions/mp-webhook/index.ts` › Deploy. Em Details, **desligue Verify JWT**.

## 5. Avisos do Mercado Pago (webhook)
No painel da aplicação › **Webhooks** › Configurar notificações:
- URL de produção: `https://jvjuwgobzjhnssnkrnzu.supabase.co/functions/v1/mp-webhook`
- Eventos: **Planos e assinaturas** (subscription_preapproval e subscription_authorized_payment)
- Salve, copie a **Assinatura secreta** e coloque em `MP_WEBHOOK_SECRET` (passo 3).

## 6. Testar e ligar a cobrança
1. Com `requirePayment: false`, assine pela Administração do parque com o seu cartão e confira no painel `admin.html` se a assinatura aparece **ativa**. Depois, cancele pelo botão **Cancelar assinatura**.
2. Funcionou? Em `assets/config.js`, troque para `requirePayment: true`. A partir daí, só entra quem tem assinatura ativa.
