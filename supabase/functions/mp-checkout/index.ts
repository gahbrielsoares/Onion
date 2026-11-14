// Onion Park · cria a assinatura no Mercado Pago e devolve o link do checkout.
// Também cancela (body: {action:"cancel"}).
// Segredos: MP_ACCESS_TOKEN, APP_URL (ex.: https://gahbrielsoares.github.io/Onion/app/), PRICE (opcional, padrão 9.90)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP = Deno.env.get("MP_ACCESS_TOKEN"); if (!MP) return json({ error: "MP_ACCESS_TOKEN não configurado" }, 500);
    const admin = createClient(url, service);
    const jwt = (req.headers.get("authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Faça login de novo." }, 401);
    const body = await req.json().catch(() => ({}));
    const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

    if (body.action === "cancel") {
      if (!sub?.preapproval_id) return json({ error: "Você não tem assinatura ativa." }, 400);
      const r = await fetch(`https://api.mercadopago.com/preapproval/${sub.preapproval_id}`, { method: "PUT", headers: { Authorization: `Bearer ${MP}`, "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
      if (!r.ok) return json({ error: "O Mercado Pago não aceitou o cancelamento: " + (await r.text()).slice(0, 200) }, 502);
      const until = sub.next_payment_date && new Date(sub.next_payment_date) > new Date() ? sub.next_payment_date : sub.access_until;
      await admin.from("subscriptions").update({ status: "cancelled", access_until: until, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      return json({ ok: true, access_until: until });
    }

    if (sub?.status === "authorized") return json({ error: "Sua assinatura já está ativa." }, 400);
    const payer = String(body.payer_email || user.email || "").trim();
    const price = Number(Deno.env.get("PRICE") || "9.90");
    const r = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST", headers: { Authorization: `Bearer ${MP}`, "content-type": "application/json" },
      body: JSON.stringify({
        reason: "Onion Park · assinatura mensal",
        external_reference: user.id,
        payer_email: payer,
        back_url: Deno.env.get("APP_URL") || "https://gahbrielsoares.github.io/Onion/app/",
        status: "pending",
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: price, currency_id: "BRL" }
      })
    });
    const p = await r.json();
    if (!r.ok || !p.init_point) return json({ error: "O Mercado Pago recusou: " + (p.message || JSON.stringify(p).slice(0, 200)) }, 502);
    await admin.from("subscriptions").upsert({ user_id: user.id, preapproval_id: p.id, status: "pending", payer_email: payer, updated_at: new Date().toISOString() });
    return json({ init_point: p.init_point });
  } catch (e) { return json({ error: String(e?.message || e) }, 500); }
});
