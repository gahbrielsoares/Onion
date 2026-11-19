/* Onion Park · cadastro e login (Supabase)
 * Sem configuração em assets/config.js, nada aqui é ativado: o parque abre direto. */
const Auth = (() => {
  const C = window.ONION_CFG || {};
  const enabled = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase);
  const H = new URLSearchParams((location.hash || "").replace(/^#/, "")), Q = new URLSearchParams(location.search);
  let recovering = H.get("type") === "recovery" || Q.get("type") === "recovery";
  const linkError = H.get("error_code") || Q.get("error_code") || "";
  const sb = enabled ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "implicit" } }) : null;
  if (sb) sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") recovering = true; });
  const inApp = /\/app\/?(index\.html)?$/.test(location.pathname);
  const appUrl = inApp ? location.origin + location.pathname : new URL(C.appPath || "app/", location.href).href;
  const termsUrl = new URL(inApp ? "../termos.html" : "termos.html", location.href).href;
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const digits = t => String(t || "").replace(/\D/g, "");
  function fmtPhone(v) { const d = digits(v).slice(0, 13); if (d.length <= 2) return d.length ? `(${d}` : ""; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`; }
  function ptErr(m) {
    m = String(m || "");
    if (/rate limit|too many|security purposes/i.test(m)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    if (/not authorized/i.test(m)) return "Não conseguimos enviar o e-mail agora. Tente entrar com o Google ou fale com o suporte.";
    if (/same.*password|different from the old/i.test(m)) return "A nova senha precisa ser diferente da anterior.";
    if (/weak|at least|characters/i.test(m)) return "Senha fraca: use pelo menos 8 caracteres.";
    if (/expired|invalid.*(token|link)|otp/i.test(m)) return "Este link expirou ou já foi usado. Peça um novo em Esqueci a senha.";
    if (/invalid login|credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/registered|already/i.test(m)) return "Esse e-mail já tem conta. Use a aba Já tenho conta.";
    return m || "Algo deu errado. Tente de novo.";
  }
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
    if (C.requirePayment && !sub.active) {
      const { data: adm } = await sb.from("admins").select("email").eq("email", user.email).maybeSingle();
      if (!adm) return { ok: false, step: "plan", user, p, sub };
    }
    return { ok: true, user, p, sub };
  }
  async function subscription(uid) {
    const { data } = await sb.from("subscriptions").select("*").eq("user_id", uid).maybeSingle();
    const s = data || { status: "none" }, now = Date.now();
    s.active = s.status === "authorized" || (!!s.access_until && new Date(s.access_until).getTime() > now);
    return s;
  }
  async function quote(coupon) {
    const { data, error } = await sb.functions.invoke("mp-checkout", { body: { action: "quote", coupon } });
    if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) {} throw new Error(m); }
    if (data && data.error) throw new Error(data.error);
    return data.price;
  }
  async function checkout(payerEmail, coupon) {
    const { data, error } = await sb.functions.invoke("mp-checkout", { body: { payer_email: payerEmail, coupon } });
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
  .oa-logo{display:flex;align-items:center;gap:8px;font:700 18px "Pixelify Sans",monospace;color:#1B1424;margin-bottom:6px}.oa-logo b{color:#7A2E8E}
  .oa-plan{position:relative;border:2px solid #1B1424;border-radius:16px;box-shadow:4px 4px 0 #1B1424;padding:20px 16px 14px;background:#fff;margin:16px 0 14px}
  .oa-badge{position:absolute;top:-12px;left:14px;background:#1B1424;color:#fff;font:800 11.5px Figtree,sans-serif;letter-spacing:.06em;border-radius:999px;padding:4px 11px}
  .oa-was{font:600 14px Figtree,sans-serif;color:#5d5268}.oa-was s{text-decoration-thickness:1.5px}
  .oa-price{font:800 40px/1.05 "Bricolage Grotesque",Figtree,sans-serif;letter-spacing:-.02em}.oa-price small{font:600 15px Figtree,sans-serif;color:#5d5268;letter-spacing:0}
  .oa-save{margin-top:8px;background:#e7f6ec;color:#1d5b33;border-radius:9px;padding:6px 10px;font:600 13px/1.4 Figtree,sans-serif}
  .oa-list{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:8px;font-size:14.5px;line-height:1.4}.oa-list li{display:flex;gap:9px}
  .oa-hint{font-size:12.5px;color:#6d6377;margin:-4px 0 12px}
  .oa-coupon{margin:0 0 14px}.oa-coupon summary{cursor:pointer;font:700 14px Figtree,sans-serif;color:#7A2E8E}
  .oa-coupon input{flex:1;min-width:0;font:16px Figtree,sans-serif;padding:10px 12px;border:2px solid #d9cfc2;border-radius:11px;text-transform:uppercase;background:#fff;color:#1B1424}
  .oa-secure{margin-top:14px;border:1.5px solid #cfe8d6;background:#f4fbf6;border-radius:12px;padding:11px 12px}
  .oa-secure-h{display:flex;align-items:center;gap:7px;font-size:14px;color:#1d5b33}.oa-mp{margin-left:auto;font:800 11px Figtree,sans-serif;color:#009ee3;border:1.5px solid #009ee3;border-radius:6px;padding:1px 6px}
  .oa-secure p{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:#3d5a46}
  .oa-spin{width:15px;height:15px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:oaspin .8s linear infinite}
  @keyframes oaspin{to{transform:rotate(360deg)}}`;
  function ensureCss() { if (document.getElementById("oa-css")) return; const s = document.createElement("style"); s.id = "oa-css"; s.textContent = CSS; document.head.appendChild(s); }
  const G = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.9 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

  function open({ step = "signup", blocking = false, onDone, userEmail = "", flash = "" } = {}) {
    if (!enabled) { onDone && onDone(); return; }
    ensureCss();
    document.querySelectorAll(".oa-modal").forEach(m => m.remove());
    const m = document.createElement("div"); m.className = "oa-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "oaTitle");
    document.body.appendChild(m);
    let cur = step, email = userEmail, msg = flash ? { t: flash } : null, coupon = "", couponPrice = null;
    const close = () => { if (!blocking) m.remove(); };
    m.addEventListener("click", e => { if (e.target === m) close(); });
    const head = (t, s) => `${blocking ? "" : `<button class="oa-x" aria-label="Fechar" data-x>×</button>`}<div class="oa-logo"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3c1 3 1 4 0 6" stroke="#5aa83f" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M17 9c-7 3-12 8-12 14 0 5 5 8 12 8s12-3 12-8c0-6-5-11-12-14z" fill="#7A2E8E" stroke="#1B1424" stroke-width="1.5"/><path d="M17 10c-3 3-5 8-5 13s2 7 5 8M17 10c3 3 5 8 5 13s-2 7-5 8" stroke="#c66bb5" stroke-width="1.6" fill="none"/></svg><span>Onion <b>Park</b></span></div><h2 id="oaTitle">${t}</h2><p class="oa-sub">${s}</p>${msg ? `<div class="oa-msg ${msg.ok ? "ok" : "err"}">${esc(msg.t)}</div>` : ""}`;
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
      else if (cur === "plan") { const pr = couponPrice != null ? couponPrice.toFixed(2).replace(".", ",") : (C.price || "29,90");
        h = head("Crie vídeos prontos em menos de 2 minutos", "Roteiro, narração, imagens e edição feitos pra você. Assine para liberar o acesso completo.") +
        `<div class="oa-plan">
          ${C.priceWas && couponPrice == null ? `<span class="oa-badge">BLACK NOVEMBER · ATÉ 30/11</span>` : ""}
          ${couponPrice != null ? `<div class="oa-was">Cupom ${esc(coupon)} aplicado</div>` : C.priceWas ? `<div class="oa-was">de <s>R$ ${esc(C.priceWas)}</s> por</div>` : ""}
          <div class="oa-price">R$ ${esc(pr)}<small>/mês</small></div>
          ${C.priceWas && couponPrice == null ? `<div class="oa-save">Você economiza R$ 40 por mês. Preço garantido enquanto for assinante.</div>` : ""}
          <ul class="oa-list">${["Vídeos, Shorts, Reels e stories prontos em menos de 2 minutos", "Roteiro, narração, imagens, legendas e edição automáticos", "Produção ilimitada, para a sua marca ou para seus clientes", "Sem fidelidade: cancele quando quiser"].map(t => `<li><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="flex:none;margin-top:2px"><circle cx="12" cy="12" r="11" fill="#7A2E8E"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t}</span></li>`).join("")}</ul>
        </div>
        <div class="oa-f"><label for="oaPayer">E-mail da sua conta Mercado Pago</label><input id="oaPayer" type="email" autocomplete="email" value="${esc(email)}"></div>
        <p class="oa-hint">Use o mesmo e-mail da conta Mercado Pago que fará o pagamento.</p>
        <details class="oa-coupon" ${coupon ? "open" : ""}><summary>Tenho um cupom de desconto</summary>
          <div style="display:flex;gap:8px;margin-top:8px"><input id="oaCoupon" value="${esc(coupon)}" placeholder="Código do cupom" autocapitalize="characters" spellcheck="false"><button class="oa-btn" style="width:auto;padding:10px 16px" data-coupon>Aplicar</button></div></details>
        <button class="oa-btn pri" data-pay>Assinar por R$ ${esc(pr)}/mês</button>
        <div class="oa-secure">
          <div class="oa-secure-h"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1zm2 0h8V8a4 4 0 1 0-8 0z" fill="#1d5b33"/></svg><b>Pagamento 100% seguro</b><span class="oa-mp">Mercado Pago</span></div>
          <p>O pagamento é processado pelo Mercado Pago, com criptografia. Os dados do seu cartão não passam pelo Onion Park.</p>
          <p>Cobrança mensal automática no cartão. Cancele a qualquer momento pela Administração, sem multa.</p>
        </div>
        <div style="text-align:center;margin-top:12px"><button class="oa-link" data-logout>Entrar com outra conta</button></div>`; }
      else if (cur === "waiting") h = head("Confirmando o seu pagamento", "Assim que o Mercado Pago confirmar, o acesso é liberado automaticamente. Isso costuma levar poucos segundos.") +
        `<div style="display:flex;justify-content:center;padding:10px"><span class="oa-spin" style="width:32px;height:32px;border-color:#e3d9cc;border-top-color:#7A2E8E"></span></div>
        <button class="oa-btn" data-tab="plan">Voltar para a assinatura</button>`;
      else if (cur === "forgot") h = head("Esqueceu a senha?", "Entre com a sua conta Google: é mais rápido e você não precisa de outra senha.") +
        `<button class="oa-btn pri" data-google style="background:#fff;color:#1B1424">${G} Entrar com o Google</button>
        <p class="oa-sub" style="font-size:13.5px;margin:12px 0 0">Se o seu e-mail for do Gmail, você entra direto na mesma conta, com tudo o que já tinha. A senha passa a ser a do próprio Google.</p>
        <details class="oa-coupon" style="margin:14px 0 0"><summary>Não uso Gmail: receber um link por e-mail</summary>
          <div class="oa-f" style="margin-top:10px"><label for="oaEmail">E-mail da sua conta</label><input id="oaEmail" type="email" autocomplete="email" value="${esc(email)}" placeholder="voce@exemplo.com"></div>
          <button class="oa-btn" data-sendreset>Enviar link de recuperação</button></details>
        <div style="text-align:center;margin-top:14px"><button class="oa-link" data-tab="login">Voltar para o login</button></div>`;
      else if (cur === "forgotSent") h = head("Confira o seu e-mail", `Se existir uma conta com <b>${esc(email)}</b>, enviamos um link para criar uma senha nova. O link vale por 1 hora.`) +
        `<p class="oa-sub" style="font-size:13.5px">Não chegou em alguns minutos? Veja a caixa de spam e a aba Promoções. Se você criou a conta com o Google, use o botão Continuar com o Google, que não precisa de senha.</p>
        <button class="oa-btn" data-tab="login">Voltar para o login</button>
        <div style="text-align:center;margin-top:12px"><button class="oa-link" data-forgot>Enviar de novo</button></div>`;
      else if (cur === "newpass") h = head("Crie uma senha nova", "Escolha uma senha com pelo menos 8 caracteres.") +
        `<div class="oa-f"><label for="oaNew">Nova senha</label><div style="display:flex;gap:6px"><input id="oaNew" type="password" autocomplete="new-password" style="flex:1;min-width:0"><button class="oa-btn" style="width:auto;padding:8px 12px;font-size:13px" data-eye="oaNew">Mostrar</button></div></div>
        <div class="oa-f"><label for="oaNew2">Repita a nova senha</label><input id="oaNew2" type="password" autocomplete="new-password"></div>
        <button class="oa-btn pri" data-newpass>Salvar nova senha</button>`;
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
          if (error) return fail(ptErr(error.message));
          if (data.session && data.user && data.user.email_confirmed_at) return done();
          cur = "confirm"; msg = null; render();
        } else {
          if (!pass) return fail("Digite a senha.");
          busy(go, true);
          const { error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) return fail(/confirm/i.test(error.message) ? "Confirme o seu e-mail primeiro (veja a caixa de entrada)." : ptErr(error.message));
          const s = await state(); if (s.ok) return done(); cur = s.step; msg = null; render();
        }
      };
      const fg = q("[data-forgot]"); if (fg) fg.onclick = () => { const e = q("#oaEmail"); if (e) email = e.value.trim(); cur = "forgot"; msg = null; render(); };
      const sr = q("[data-sendreset]"); if (sr) sr.onclick = async () => {
        email = q("#oaEmail").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Digite um e-mail válido.");
        busy(sr, true); const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl });
        if (error) return fail(ptErr(error.message));
        cur = "forgotSent"; msg = null; render();
      };
      const np = q("[data-newpass]"); if (np) np.onclick = async () => {
        const a = q("#oaNew").value, b = q("#oaNew2").value;
        if (a.length < 8) return fail("A senha precisa ter pelo menos 8 caracteres."); if (a !== b) return fail("As duas senhas não são iguais.");
        busy(np, true); const { error } = await sb.auth.updateUser({ password: a });
        if (error) return fail(ptErr(error.message));
        recovering = false; history.replaceState(null, "", location.pathname);
        const s = await state(); if (s.ok) { if (window.toast) setTimeout(() => toast("Senha alterada com sucesso"), 300); return done(); }
        cur = s.step; msg = { ok: true, t: "Senha alterada com sucesso." }; render();
      };
      m.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => { const i = q("#" + b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "Mostrar" : "Ocultar"; });
      const rs = q("[data-resend]"); if (rs) rs.onclick = async () => { busy(rs, true); await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: appUrl } }); msg = { ok: true, t: "E-mail reenviado." }; render(); };
      const fin = q("[data-finish]"); if (fin) fin.onclick = async () => {
        const phone = q("#oaPhone").value; if (!phoneOk(phone)) return fail("Digite o telefone com DDD."); if (!q("#oaTerms").checked) return fail("Aceite os termos de uso pra continuar.");
        busy(fin, true); const { data: { user } } = await sb.auth.getUser();
        const { error } = await sb.from("profiles").update({ phone: phoneStore(phone), accepted_terms_at: new Date().toISOString() }).eq("id", user.id);
        if (error) return fail("Não deu pra salvar: " + error.message); done();
      };
      const pay = q("[data-pay]"); if (pay) pay.onclick = async () => {
        const pe = q("#oaPayer").value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pe)) return fail("Digite o e-mail da sua conta do Mercado Pago.");
        email = pe; busy(pay, true); try { location.href = await checkout(pe, couponPrice != null ? coupon : ""); } catch (e) { fail(e.message || "Não deu pra abrir o pagamento."); }
      };
      const cb = q("[data-coupon]"); if (cb) cb.onclick = async () => {
        const c = q("#oaCoupon").value.trim().toUpperCase(), pe = q("#oaPayer"); if (pe) email = pe.value.trim();
        if (!c) return; busy(cb, true);
        try { couponPrice = await quote(c); coupon = c; msg = null; } catch (e) { couponPrice = null; coupon = c; msg = { t: e.message || "Cupom inválido." }; }
        render();
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
    await new Promise(r => setTimeout(r, 300)); // dá tempo do Supabase ler o link
    const { data: { session } } = await sb.auth.getSession();
    if (recovering && session) return new Promise(res => open({ step: "newpass", blocking: true, onDone: () => { track("abriu"); res(true); } }));
    if (linkError) { history.replaceState(null, "", location.pathname); return new Promise(res => open({ step: "login", blocking: true, flash: /expired/i.test(linkError) ? "Este link expirou ou já foi usado. Peça um novo em Esqueci a senha." : "Não foi possível usar este link. Tente de novo.", onDone: () => { track("abriu"); res(true); } })); }
    const s = await state();
    if (s.ok) {
      track("abriu");
      if (/preapproval_id/.test(location.search)) { history.replaceState(null, "", location.pathname); setTimeout(() => { if (window.openPanel) openPanel("admin"); if (window.toast) toast("Pagamento enviado! A confirmação do Mercado Pago aparece aqui em alguns segundos."); }, 1200); }
      return true;
    }
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
