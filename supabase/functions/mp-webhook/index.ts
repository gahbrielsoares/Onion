// Onion Park · recebe os avisos do Mercado Pago e atualiza a assinatura.
// Publique com "Verify JWT" DESLIGADO (o Mercado Pago não manda login).
// Segredos: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET (assinatura secreta das notificações)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)))].map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const type = String((body as any).type || u.searchParams.get("type") || u.searchParams.get("topic") || "");
  const id = String((body as any)?.data?.id || u.searchParams.get("data.id") || u.searchParams.get("id") || "");
  if (!id) return new Response("ok");

  // confere a assinatura secreta (x-signature) quando o segredo estiver configurado
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (secret) {
    const sig = req.headers.get("x-signature") || "", reqId = req.headers.get("x-request-id") || "";
    const parts = Object.fromEntries(sig.split(",").map(s => s.trim().split("=")));
    const manifest = `id:${(u.searchParams.get("data.id") || id).toLowerCase()};request-id:${reqId};ts:${parts.ts};`;
    if (!parts.v1 || (await hmac(secret, manifest)) !== parts.v1) return new Response("assinatura inválida", { status: 401 });
  }

  const MP = Deno.env.get("MP_ACCESS_TOKEN")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let pre: any = null;
  if (/preapproval/.test(type)) {
    const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, { headers: { Authorization: `Bearer ${MP}` } }); if (r.ok) pre = await r.json();
  } else if (/authorized_payment/.test(type)) {
    const r = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, { headers: { Authorization: `Bearer ${MP}` } });
    if (r.ok) { const ap = await r.json(); if (ap.preapproval_id) { const r2 = await fetch(`https://api.mercadopago.com/preapproval/${ap.preapproval_id}`, { headers: { Authorization: `Bearer ${MP}` } }); if (r2.ok) pre = await r2.json(); } }
  }
  if (!pre || !pre.external_reference) return new Response("ok");

  const next = pre.next_payment_date || null;
  const row: Record<string, unknown> = { user_id: pre.external_reference, preapproval_id: pre.id, status: pre.status, payer_email: pre.payer_email || null, next_payment_date: next, updated_at: new Date().toISOString() };
  if (pre.status === "authorized" && next) row.access_until = next;   // pago até a próxima cobrança
  await admin.from("subscriptions").upsert(row);
  return new Response("ok");
});
