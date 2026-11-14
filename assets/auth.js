/* Onion Park · cadastro e login (Supabase)
 * Sem configuração em assets/config.js, nada aqui é ativado: o parque abre direto. */
const Auth = (() => {
  const C = window.ONION_CFG || {};
  const enabled = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase);
  const sb = enabled ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "implicit" } }) : null;
  const inApp = /\/app\/?(index\.html)?$/.test(location.pathname);
  const appUrl = inApp ? location.origin + location.pathname : new URL(C.appPath || "app/", location.href).href;
  const termsUrl = new URL(inApp ? "../termos.html" : "termos.html", location.href).href;
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const digits = t => String(t || "").replace(/\D/g, "");
  function fmtPhone(v) { const d = digits(v).slice(0, 13); if (d.length <= 2) return d.length ? `(${d}` : ""; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`; }
  const phoneOk = v => { const d = digits(v); return d.length >= 10 && d.length <= 13; };
  const phoneStore = v => { const d = digits(v); return d.length <= 11 ? "+55" + d : "+" + d; };

  async function state() {
    if (!enabled) return { ok: true };
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { ok: false, step: "signup" };
    const user = session.user;
    const { data: p } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!user.email_confirmed_at) return { ok: false, step: "confirm", user };
    if (!p || !p.phone || !p.accepted_terms_at) return { ok: false, step: "complete", user, p };
    const sub = await subscription(user.id);
    if (C.requirePayment && !sub.active) return { ok: false, step: "plan", user, p, sub };
    return { ok: true, user, p, sub };
  }
  async function subscription(uid) {
    const { data } = await sb.from("subscriptions").select("*").eq("user_id", uid).maybeSingle();
    const s = data || { status: "none" }, now = Date.now();
    s.active = s.status === "authorized" || (!!s.access_until && new Date(s.access_until).getTime() > now);
    return s;
  }
  async function checkout(payerEmail) {
    const { data, error } = await sb.functions.invoke("mp-checkout", { body: { payer_email: payerEmail } });
    if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(m); }
    if (data && data.error) throw new Error(data.error);
    return data.init_point;
  }
  async function cancelSub() {
    const { data, error } = await sb.functions.invoke("mp-checkout", { body: { action: "cancel" } });
    if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(m); }
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  function track(kind) { if (!enabled) return; sb.rpc("track", { kind }).then(() => {}, () => {}); }

  /* ---------- janela ---------- */
  const CSS = `.oa-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:rgba(18,10,26,.6);padding:16px;font-family:Figtree,system-ui,sans-serif}
  .oa-box{background:#fffaf2;color:#1B1424;border:2.5px solid #1B1424;box-shadow:7px 7px 0 #1B1424;border-radius:20px;width:100%;max-width:420px;max-height:92vh;overflow:auto;padding:22px 22px 18px}
  .oa-box h2{font-family:"Bricolage Grotesque",Figtree,sans-serif;font-weight:800;font-size:25px;letter-spacing:-.02em;margin:6px 0 4px;line-height:1.1}
  .oa-box .oa-px{font-family:"Pixelify Sans",monospace;color:#7A2E8E}
  .oa-sub{color:#5d5268;font-size:15px;margin:0 0 14px}
  .oa-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;font:800 16px Figtree,sans-serif;padding:12px 16px;border-radius:13px;border:2.5px solid #1B1424;box-shadow:3px 3px 0 #1B1424;cursor:pointer;background:#fff;color:#1B1424;transition:transform .1s,box-shadow .1s}
  .oa-btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 #1B1424}.oa-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1B1424}
  .oa-btn.pri{background:#7A2E8E;color:#fff}.oa-btn:disabled{opacity:.6;cursor:default;transform:none}
  .oa-or{display:flex;align-items:center;gap:10px;color:#8a7f96;font-size:13px;margin:14px 0}.oa-or::before,.oa-or::after{content:"";flex:1;height:1.5px;background:#e3d9cc}
  .oa-tabs{display:flex;gap:6px;background:#efe6da;border-radius:12px;padding:4px;margin-bottom:12px}
  .oa-tabs button{flex:1;border:0;background:none;padding:8px;border-radius:9px;font:700 14px Figtree,sans-serif;color:#5d5268;cursor:pointer}
  .oa-tabs button[aria-selected="true"]{background:#fff;color:#1B1424;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .oa-f{display:grid;gap:4px;margin-bottom:10px}.oa-f label{font-size:13px;font-weight:700;color:#3d3348}
  .oa-f input{font:16px Figtree,sans-serif;padding:11px 12px;border:2px solid #d9cfc2;border-radius:11px;background:#fff;color:#1B1424}
  .oa-f input:focus{outline:none;border-color:#7A2E8E}
  .oa-terms{display:flex;gap:9px;align-items:flex-start;font-size:14px;color:#3d3348;margin:4px 0 12px}.oa-terms input{margin-top:3px;width:17px;height:17px;accent-color:#7A2E8E}.oa-terms a{color:#7A2E8E;font-weight:700}
  .oa-msg{font-size:14px;border-radius:11px;padding:9px 11px;margin:0 0 10px}.oa-msg.err{background:#fde8e6;color:#8a2116;border:1px solid #f3b9b1}.oa-msg.ok{background:#e7f6ec;color:#1d5b33;border:1px solid #b5e0c3}
  .oa-link{background:none;border:0;color:#7A2E8E;font:700 14px Figtree,sans-serif;cursor:pointer;padding:4px 0;text-decoration:underline}
  .oa-x{float:right;background:none;border:0;font-size:22px;cursor:pointer;color:#5d5268;line-height:1}
  .oa-spin{width:15px;height:15px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:oaspin .8s linear infinite}
  @keyframes oaspin{to{transform:rotate(360deg)}}`;
  function ensureCss() { if (document.getElementById("oa-css")) return; const s = document.createElement("style"); s.id = "oa-css"; s.textContent = CSS; document.head.appendChild(s); }
  const G = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.9 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

  function open({ step = "signup", blocking = false, onDone, userEmail = "" } = {}) {
    if (!enabled) { onDone && onDone(); return; }
    ensureCss();
    document.querySelectorAll(".oa-modal").forEach(m => m.remove());
    const m = document.createElement("div"); m.className = "oa-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "oaTitle");
    document.body.appendChild(m);
    let cur = step, email = userEmail, msg = null;
    const close = () => { if (!blocking) m.remove(); };
    m.addEventListener("click", e => { if (e.target === m) close(); });
    const head = (t, s) => `${blocking ? "" : `<button class="oa-x" aria-label="Fechar" data-x>×</button>`}<div style="font-size:30px">🧅</div><h2 id="oaTitle">${t}</h2><p class="oa-sub">${s}</p>${msg ? `<div class="oa-msg ${msg.ok ? "ok" : "err"}">${esc(msg.t)}</div>` : ""}`;
    const terms = `<label class="oa-terms"><input type="checkbox" id="oaTerms"> <span>Li e aceito os <a href="${termsUrl}" target="_blank" rel="noopener">Termos de uso e a Política de privacidade</a>.</span></label>`;
    function render() {
      let h = "";
      if (cur === "signup" || cur === "login") h = head(cur === "signup" ? `Crie sua conta no <span class="oa-px">Onion Park</span>` : `Entre no <span class="oa-px">Onion Park</span>`, cur === "signup" ? "Grátis por enquanto. Leva 1 minuto." : "Bom te ver de volta!") +
        `<button class="oa-btn" data-google>${G} Continuar com o Google</button><div class="oa-or">ou com e-mail</div>
        <div class="oa-tabs" role="tablist"><button role="tab" aria-selected="${cur === "signup"}" data-tab="signup">Criar conta</button><button role="tab" aria-selected="${cur === "login"}" data-tab="login">Já tenho conta</button></div>
        <div class="oa-f"><label for="oaEmail">E-mail</label><input id="oaEmail" type="email" autocomplete="email" value="${esc(email)}" placeholder="voce@gmail.com"></div>
        ${cur === "signup" ? `<div class="oa-f"><label for="oaPhone">Telefone (WhatsApp)</label><input id="oaPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 91234-5678"></div>` : ""}
        <div class="oa-f"><label for="oaPass">Senha</label><input id="oaPass" type="password" autocomplete="${cur === "signup" ? "new-password" : "current-password"}" placeholder="${cur === "signup" ? "mínimo 8 caracteres" : ""}"></div>
        ${cur === "signup" ? terms : `<div style="text-align:right;margin:-4px 0 8px"><button class="oa-link" data-forgot>Esqueci a senha</button></div>`}
        <button class="oa-btn pri" data-go>${cur === "signup" ? "Criar conta" : "Entrar"}</button>`;
      else if (cur === "confirm") h = head("Confira o seu e-mail 📬", `Enviamos um link de confirmação para <b>${esc(email)}</b>. Abra o e-mail e clique no link: você volta direto pra sua empresa.`) +
        `<button class="oa-btn" data-resend>Reenviar o e-mail</button><div style="text-align:center;margin-top:10px"><button class="oa-link" data-tab="login">Já confirmei: entrar</button></div><p class="oa-sub" style="margin-top:10px;font-size:13px">Não chegou? Olhe a caixa de spam ou promoções.</p>`;
      else if (cur === "plan") h = head(`Assine o <span class="oa-px">Onion Park</span>`, "Tudo liberado, sem limite de vídeos. Cancele quando quiser.") +
        `<div style="border:2.5px solid #1B1424;border-radius:16px;box-shadow:4px 4px 0 #1B1424;padding:16px;background:#fff;margin-bottom:12px">
          <div style="font:800 38px 'Bricolage Grotesque',Figtree,sans-serif">${C.priceWas ? `<div style="font:700 15px Figtree,sans-serif;color:#5d5268">Black November: de <s>R$ ${esc(C.priceWas)}</s> por</div>` : ""}R$ ${esc(C.price || "29,90")}<small style="font-size:16px;color:#5d5268">/mês</small></div>
          <ul style="list-style:none;padding:0;margin:10px 0 0;display:grid;gap:5px;font-size:14.5px">${["Todos os escritórios da sua empresa", "Vídeos longos, Shorts, Reels e stories", "Piloto automático e Estúdio de Stories", "Cancele quando quiser"].map(t => `<li>✓ ${t}</li>`).join("")}</ul></div>
        <div class="oa-f"><label for="oaPayer">E-mail da sua conta do Mercado Pago</label><input id="oaPayer" type="email" value="${esc(email)}"></div>
        <p class="oa-sub" style="font-size:12.5px;margin-top:-4px">O Mercado Pago só aprova se for o mesmo e-mail da conta que vai pagar.</p>
        <button class="oa-btn pri" data-pay>Assinar com Mercado Pago →</button>
        <div style="text-align:center;margin-top:10px"><button class="oa-link" data-logout>Usar outra conta</button></div>`;
      else if (cur === "waiting") h = head("Confirmando o pagamento…", "Assim que o Mercado Pago confirmar, a sua empresa abre sozinha. Costuma levar alguns segundos.") +
        `<div style="display:flex;justify-content:center;padding:10px"><span class="oa-spin" style="width:32px;height:32px;border-color:#e3d9cc;border-top-color:#7A2E8E"></span></div>
        <button class="oa-btn" data-tab="plan">Ainda não paguei: voltar</button>`;
      else if (cur === "complete") h = head("Falta só um detalhe", "Pra terminar o cadastro, informe o seu telefone e aceite os termos.") +
        `<div class="oa-f"><label for="oaPhone">Telefone (WhatsApp)</label><input id="oaPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 91234-5678"></div>${terms}<button class="oa-btn pri" data-finish>Concluir e entrar</button>
        <div style="text-align:center;margin-top:10px"><button class="oa-link" data-logout>Usar outra conta</button></div>`;
      m.innerHTML = `<div class="oa-box">${h}</div>`; bind();
    }
    const busy = (b, on, txt) => { b.disabled = on; b.innerHTML = on ? `<span class="oa-spin"></span>` : txt; };
    const fail = (t) => { msg = { t }; render(); };
    async function done() { m.remove(); onDone && onDone(); }
    function bind() {
      const q = s => m.querySelector(s);
      m.querySelectorAll("[data-x]").forEach(b => b.onclick = close);
      m.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { const e = q("#oaEmail"); if (e) email = e.value.trim(); cur = b.dataset.tab; msg = null; render(); });
      const ph = q("#oaPhone"); if (ph) ph.oninput = () => { ph.value = fmtPhone(ph.value); };
      const gb = q("[data-google]"); if (gb) gb.onclick = async () => { busy(gb, true); const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: appUrl } }); if (error) fail("Não deu pra abrir o login do Google: " + error.message); };
      const go = q("[data-go]"); if (go) go.onclick = async () => {
        email = q("#oaEmail").value.trim(); const pass = q("#oaPass").value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Digite um e-mail válido.");
        if (cur === "signup") {
          const phone = q("#oaPhone").value;
          if (!phoneOk(phone)) return fail("Digite o telefone com DDD.");
          if (pass.length < 8) return fail("A senha precisa ter pelo menos 8 caracteres.");
          if (!q("#oaTerms").checked) return fail("Pra criar a conta, aceite os termos de uso.");
          busy(go, true);
          const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: appUrl, data: { phone: phoneStore(phone), accepted_terms: true } } });
          if (error) return fail(/registered|already/i.test(error.message) ? "Esse e-mail já tem conta. Use a aba Já tenho conta." : error.message);
          if (data.session && data.user && data.user.email_confirmed_at) return done();
          cur = "confirm"; msg = null; render();
        } else {
          if (!pass) return fail("Digite a senha.");
          busy(go, true);
          const { error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) return fail(/confirm/i.test(error.message) ? "Confirme o seu e-mail primeiro (veja a caixa de entrada)." : "E-mail ou senha incorretos.");
          const s = await state(); if (s.ok) return done(); cur = s.step; msg = null; render();
        }
      };
      const fg = q("[data-forgot]"); if (fg) fg.onclick = async () => { email = q("#oaEmail").value.trim(); if (!email) return fail("Digite o seu e-mail acima e clique de novo."); await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl }); msg = { ok: true, t: "Se esse e-mail tiver conta, enviamos um link pra criar uma senha nova." }; render(); };
      const rs = q("[data-resend]"); if (rs) rs.onclick = async () => { busy(rs, true); await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: appUrl } }); msg = { ok: true, t: "E-mail reenviado." }; render(); };
      const fin = q("[data-finish]"); if (fin) fin.onclick = async () => {
        const phone = q("#oaPhone").value; if (!phoneOk(phone)) return fail("Digite o telefone com DDD."); if (!q("#oaTerms").checked) return fail("Aceite os termos de uso pra continuar.");
        busy(fin, true); const { data: { user } } = await sb.auth.getUser();
        const { error } = await sb.from("profiles").update({ phone: phoneStore(phone), accepted_terms_at: new Date().toISOString() }).eq("id", user.id);
        if (error) return fail("Não deu pra salvar: " + error.message); done();
      };
      const pay = q("[data-pay]"); if (pay) pay.onclick = async () => {
        const pe = q("#oaPayer").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pe)) return fail("Digite o e-mail da sua conta do Mercado Pago.");
        busy(pay, true); try { location.href = await checkout(pe); } catch (e) { fail(e.message || "Não deu pra abrir o pagamento."); }
      };
      if (cur === "waiting") { let n = 0; const tick = async () => { if (!document.body.contains(m) || cur !== "waiting") return; const { data: { user } } = await sb.auth.getUser(); const s = user && await subscription(user.id); if (s && s.active) return done(); if (++n < 40) setTimeout(tick, 3000); else { msg = { t: "Ainda não recebemos a confirmação. Se você já pagou, aguarde um minuto e recarregue a página." }; cur = "plan"; render(); } }; setTimeout(tick, 1500); }
      const lo = q("[data-logout]"); if (lo) lo.onclick = async () => { await sb.auth.signOut(); cur = "signup"; msg = null; render(); };
      setTimeout(() => { const f = m.querySelector("input"); if (f && matchMedia("(pointer:fine)").matches) f.focus(); }, 30);
    }
    render();
  }

  // no parque: sem cadastro completo, a janela abre e não fecha
  async function gate() {
    if (!enabled) return true;
    const s = await state();
    if (s.ok) { track("abriu"); return true; }
    const fromMP = /preapproval_id|collection_status|status=/.test(location.search);
    const step = s.step === "confirm" ? "login" : (s.step === "plan" && fromMP ? "waiting" : s.step);
    return new Promise(res => open({ step, blocking: true, userEmail: s.user && s.user.email, onDone: () => { track("abriu"); if (fromMP) history.replaceState(null, "", location.pathname); res(true); } }));
  }
  // na página inicial: os botões de entrar abrem a janela (ou vão direto, se já estiver tudo certo)
  function wireEnterButtons(sel = "a[href='app/'],a[href='./app/']") {
    if (!enabled) return;
    document.querySelectorAll(sel).forEach(a => a.addEventListener("click", async e => {
      e.preventDefault(); const s = await state();
      if (s.ok) { location.href = appUrl; return; }
      open({ step: s.step === "confirm" ? "login" : s.step, userEmail: s.user && s.user.email, onDone: () => { location.href = appUrl; } });
    }));
  }
  async function signOut() { if (enabled) await sb.auth.signOut(); }
  return { enabled, sb, state, open, gate, track, wireEnterButtons, signOut, subscription, cancelSub, requirePayment: !!C.requirePayment, price: C.price || "29,90" };
})();
window.Auth = Auth;
window.onionTrack = k => Auth.track(k);
