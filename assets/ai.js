/* Onion · camada de IA
 * Cada etapa (textos, imagens, narração, OnionCut) escolhe um provedor.
 * As chaves ficam SOMENTE no localStorage do navegador de quem usa.
 * Nunca coloque chaves neste repositório: o GitHub Pages é público.
 */
const AI = (() => {
  const KEY = "onion-ai-v2";

  const PROVIDERS = {
    anthropic:  { name: "Anthropic (Claude)", keyHint: "sk-ant-…", where: "platform.claude.com › Settings › API keys" },
    google:     { name: "Google Gemini",      keyHint: "AIza…",    where: "aistudio.google.com" },
    google_free:{ name: "Gemini grátis",      keyHint: "AIza… (de um projeto SEM faturamento)", where: "aistudio.google.com › Criar chave › Criar em um projeto novo, sem ativar o faturamento" },
    openai:     { name: "OpenAI",             keyHint: "sk-…",     where: "platform.openai.com" },
    elevenlabs: { name: "ElevenLabs",         keyHint: "sk_…",     where: "elevenlabs.io" },
    local:      { name: "Sem IA (no navegador)", noKey: true }
  };

  // O que cada provedor consegue fazer em cada etapa
  const STAGES = {
    text:  { name: "Textos", what: "Temas, títulos, roteiro, descrição, textos da capa e prompts das cenas",
             providers: ["anthropic", "google", "openai"] },
    image: { name: "Imagens e capas", what: "Gera as imagens de cada cena e a arte da thumbnail",
             providers: ["google", "google_free", "openai"],
             blocked: { anthropic: "O Claude escreve os prompts, mas não gera imagens." } },
    voice: { name: "Narração", what: "Transforma o roteiro em áudio com voz realista",
             providers: ["elevenlabs", "google", "openai"],
             blocked: { anthropic: "O Claude não gera áudio." } },
    cut:   { name: "OnionCut", what: "A montagem roda no seu navegador e não precisa de IA. Uma IA aqui só serve pra marcar o tempo de cada palavra, deixando as legendas palavra por palavra perfeitamente sincronizadas.",
             providers: ["local", "elevenlabs", "openai"],
             blocked: { google: "O Gemini ainda não devolve o tempo exato de cada palavra. Sem IA, o OnionCut sincroniza pelas pausas da voz." } }
  };

  const DEFAULTS = {
    keys: { anthropic: "", google: "", google_free: "", openai: "", elevenlabs: "" },
    text:  { provider: "anthropic", model: "", quick: "" },
    image: { provider: "google", model: "" },
    voice: { provider: "elevenlabs", model: "" },
    cut:   { provider: "local", model: "" },
    models: {} // cache: "provider:stage" -> [ids]
  };

  let cfg = structuredClone(DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) cfg = { ...cfg, ...saved, keys: { ...cfg.keys, ...saved.keys } };
    else {
      const old = JSON.parse(localStorage.getItem("onion-keys-v1") || "null"); // migração da v1
      if (old && old.anthropicKey) { cfg.keys.anthropic = old.anthropicKey; cfg.text.model = old.model || ""; cfg.text.quick = old.quickModel || ""; }
    }
  } catch (e) {}

  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} };
  const get = () => structuredClone(cfg);
  function setKey(p, k) { cfg.keys[p] = k.trim(); persist(); }
  function setStage(stage, patch) { Object.assign(cfg[stage], patch); persist(); }
  function clearAll() { cfg = structuredClone(DEFAULTS); try { localStorage.removeItem(KEY); localStorage.removeItem("onion-keys-v1"); } catch (e) {} }
  function stageReady(stage) {
    const p = cfg[stage].provider;
    return PROVIDERS[p].noKey || (!!cfg.keys[p] && !!cfg[stage].model);
  }
  const ready = () => stageReady("text");
  const fail = (code, message, extra) => ({ code, message, ...extra });

  /* ---------- descobrir modelos ---------- */
  function vsort(list) {
    const ver = s => (s.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
    return list.sort((a, b) => ver(b) - ver(a) || a.localeCompare(b));
  }
  async function httpErr(res, p) {
    let msg = "", j = {}; try { j = await res.json(); msg = j.error?.message || j.detail?.message || j.detail || ""; } catch (e) {}
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /key/i.test(msg)))
      return fail("auth", "Chave de " + PROVIDERS[p].name + " recusada. Confira se colou inteira.");
    if (res.status === 429) return rateErr(p, msg, j, res);
    if (res.status >= 500) return fail("overloaded", PROVIDERS[p].name + " está instável agora. Tente de novo em instantes.");
    return fail("http_" + res.status, msg || ("Erro " + res.status + " em " + PROVIDERS[p].name));
  }
  // lê o motivo real do limite (por minuto, por dia, cota grátis) e quanto tempo esperar
  function rateErr(p, msg, j, res) {
    const det = j.error?.details || [], qf = det.find(d => /QuotaFailure/.test(d["@type"] || "")), ri = det.find(d => /RetryInfo/.test(d["@type"] || ""));
    const v = (qf?.violations || [])[0] || {}, metric = (v.quotaMetric || "") + " " + (v.quotaId || "") + " " + msg;
    let retry = ri?.retryDelay ? parseFloat(ri.retryDelay) : +(res.headers.get("retry-after") || 0);
    const daily = /per.?day|PerDay|daily/i.test(metric), free = /free.?tier/i.test(metric), minute = /per.?minute|PerMinute/i.test(metric);
    const name = PROVIDERS[p].name, model = v.quotaDimensions?.model ? ` (${v.quotaDimensions.model})` : "";
    let text;
    if (free && p !== "google_free") text = `O Google tratou a sua chave como COTA GRÁTIS${model}: o projeto dessa chave está sem faturamento ativo ou a cota grátis do dia acabou. Confira em aistudio.google.com se o projeto da chave tem faturamento e veja os limites em aistudio.google.com/rate-limit.`;
    else if (daily) text = `Acabou a cota DIÁRIA de ${name}${model}. Ela renova à meia-noite do horário do Pacífico (5h no horário de Brasília). Dá pra trocar o modelo de imagem na Administração, usar o Gemini grátis ou enviar a imagem.`;
    else if (minute || retry) text = `Limite POR MINUTO de ${name}${model}. O Onion espera ${Math.round(retry || 30)} s e tenta de novo sozinho.`;
    else text = `Limite de uso atingido em ${name}${model}. ${msg ? "Mensagem do Google: " + msg.slice(0, 220) : "Espere um pouco."}`;
    return fail("rate_limited", text, { retryAfter: retry || (daily ? 0 : 30), daily, free });
  }
  async function listModels(provider, stage) {
    const k = cfg.keys[provider];
    if (!k) throw fail("no_key", "Cole a chave primeiro.");
    let ids = [];
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
      if (!r.ok) throw await httpErr(r, provider);
      ids = (await r.json()).data.map(m => m.id);
    } else if (provider === "google" || provider === "google_free") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: { "x-goog-api-key": k } });
      if (!r.ok) throw await httpErr(r, provider);
      const all = (await r.json()).models || [];
      const gen = all.filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", ""));
      const isImg = s => /image|nano-banana/i.test(s), isTts = s => /tts/i.test(s), isOther = s => /embed|live|veo|lyria|omni|aqa|learnlm|gemma|robotics|computer-use|native-audio/i.test(s);
      if (stage === "image") ids = gen.filter(isImg);
      else if (stage === "voice") ids = gen.filter(isTts);
      else ids = gen.filter(s => /gemini/i.test(s) && !isImg(s) && !isTts(s) && !isOther(s));
    } else if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + k } });
      if (!r.ok) throw await httpErr(r, provider);
      const all = (await r.json()).data.map(m => m.id);
      if (stage === "image") ids = all.filter(s => /image/i.test(s));
      else if (stage === "voice") ids = all.filter(s => /tts/i.test(s));
      else if (stage === "cut") ids = all.filter(s => /^whisper/i.test(s));
      else ids = all.filter(s => /^(gpt|o\d)/i.test(s) && !/image|tts|audio|realtime|transcribe|search|instruct|embedding/i.test(s));
    } else if (provider === "elevenlabs") {
      const r = await fetch("https://api.elevenlabs.io/v1/models", { headers: { "xi-api-key": k } });
      if (!r.ok) throw await httpErr(r, provider);
      const all = await r.json();
      ids = (stage === "cut")
        ? ["scribe_v1"]
        : all.filter(m => m.can_do_text_to_speech).map(m => m.model_id);
    }
    ids = vsort([...new Set(ids)]);
    cfg.models[provider + ":" + stage] = ids; persist();
    return ids;
  }
  function cachedModels(provider, stage) { return cfg.models[provider + ":" + stage] || []; }
  function pickDefault(stage, ids) {
    if (!ids.length) return "";
    const ver = x => (x.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
    const stable = ids.filter(x => !/preview|exp|lite|latest|\d{3,}$/i.test(x));
    const pool = stable.length ? stable : ids;
    if (stage === "text") {
      const claude = pool.find(x => /sonnet/i.test(x)); if (claude) return claude;
      // a versão mais nova; empate: pro > flash
      return [...pool].sort((a, b) => ver(b) - ver(a) || (/pro/i.test(b) - /pro/i.test(a)))[0];
    }
    return [...pool].sort((a, b) => ver(b) - ver(a))[0];
  }
  function pickQuick(ids) {
    return ids.find(s => /haiku/i.test(s)) || ids.find(s => /flash-lite|(^|-)mini\b/i.test(s)) || ids.find(s => /flash/i.test(s)) || "";
  }

  /* ---------- texto (streaming) ---------- */
  async function readSSE(res, onData, signal) {
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, "");
        for (const line of chunk.split(/\r?\n/)) if (line.startsWith("data:")) onData(line.slice(5).trim());
      }
    }
  }
  async function call(prompt, { tier = "default", onText, signal, maxTokens = 8000 } = {}) {
    const st = cfg.text, p = st.provider, k = cfg.keys[p];
    if (!k) throw fail("no_key", "Cole a chave de " + PROVIDERS[p].name + " na Administração.");
    const model = (tier === "quick" && st.quick) ? st.quick : st.model;
    if (!model) throw fail("model", "Escolha o modelo de Textos na Administração (clique em Testar e carregar modelos).");
    let text = "", stop = null;
    const push = t => { if (!t) return; text += t; onText && onText({ text, delta: t }); };
    try {
      let res;
      if (p === "anthropic") {
        res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal,
          headers: { "content-type": "application/json", "x-api-key": k, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, messages: [{ role: "user", content: prompt }] }) });
        if (!res.ok) throw await httpErr(res, p);
        await readSSE(res, d => { let ev; try { ev = JSON.parse(d); } catch (e) { return; }
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") push(ev.delta.text);
          else if (ev.type === "message_delta") stop = ev.delta?.stop_reason === "max_tokens" ? "max" : stop;
          else if (ev.type === "error") throw fail("stream", ev.error?.message || "Erro na geração"); });
      } else if (p === "google") {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, { method: "POST", signal,
          headers: { "content-type": "application/json", "x-goog-api-key": k },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192) } }) });
        if (!res.ok) throw await httpErr(res, p);
        await readSSE(res, d => { let ev; try { ev = JSON.parse(d); } catch (e) { return; }
          const c = ev.candidates?.[0]; (c?.content?.parts || []).forEach(pt => { if (!pt.thought) push(pt.text); });
          if (c?.finishReason === "MAX_TOKENS") stop = "max"; });
      } else if (p === "openai") {
        res = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", signal,
          headers: { "content-type": "application/json", Authorization: "Bearer " + k },
          body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: prompt }] }) });
        if (!res.ok) throw await httpErr(res, p);
        await readSSE(res, d => { if (d === "[DONE]") return; let ev; try { ev = JSON.parse(d); } catch (e) { return; }
          push(ev.choices?.[0]?.delta?.content); if (ev.choices?.[0]?.finish_reason === "length") stop = "max"; });
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("cancelled", "Interrompido", { text });
      if (e && e.code) throw e;
      throw fail("network", "Sem conexão com " + PROVIDERS[p].name + ".");
    }
    return { text, truncated: stop === "max" };
  }
  async function json(prompt, opts = {}) {
    const { text } = await call(prompt + "\n\nResponda apenas com o JSON, sem crases, sem texto antes ou depois.", opts);
    const clean = text.replace(/```json|```/g, "").trim();
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    try { return JSON.parse(clean.slice(a, b + 1)); }
    catch (e) { throw fail("invalid_json", "Resposta fora do formato", { text }); }
  }

  /* ---------- imagens ---------- */
  function b64Blob(b64, type) {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || "image/png" });
  }
  let lastFree = 0, freeQ = Promise.resolve();
  async function image(prompt, opts = {}) {
    const st = cfg.image;
    if (st.provider !== "google_free") return imageWith(st.provider, prompt, opts);
    // cota grátis: no máximo ~1 imagem a cada 5 s; se a cota do dia acabar, usa a chave paga (se permitido)
    const ticket = freeQ.then(async () => { const w = lastFree + 5000 - Date.now(); if (w > 0) await new Promise(r => setTimeout(r, w)); lastFree = Date.now(); });
    freeQ = ticket.catch(() => {}); await ticket;
    try { return await imageWith("google_free", prompt, opts); }
    catch (e) {
      if ((e.code === "rate_limited" || /quota|exhausted|limit/i.test(e.message || "")) && st.fallbackPaid !== false && cfg.keys.google) { usedPaid++; return imageWith("google", prompt, opts); }
      if (e.code === "rate_limited") throw fail("rate_limited", "A cota grátis de imagens do Gemini acabou por hoje (ou por este minuto). Ela renova à meia-noite (horário do Pacífico). Ative a reserva paga ou tente mais tarde.");
      throw e;
    }
  }
  let usedPaid = 0;
  async function imageWith(p, prompt, opts = {}) {
    try { return await imageModel(p, cfg.image.model, prompt, opts); }
    catch (e) {
      if (!(e.code === "rate_limited" && e.daily) || !(p === "google" || p === "google_free")) throw e;
      for (const m of cachedModels(p, "image").filter(m => m !== cfg.image.model)) {
        try { const b = await imageModel(p, m, prompt, opts); modelSwaps++; return b; } catch (e2) { if (!(e2.code === "rate_limited")) throw e2; }
      }
      throw e;
    }
  }
  let modelSwaps = 0;
  async function imageModel(p, model, prompt, { aspect = "16:9", signal } = {}) {
    const st = { ...cfg.image, model }, k = cfg.keys[p];
    if (!k) throw fail("no_key", "Cole a chave de " + PROVIDERS[p].name + " no cartão Imagens e capas da Administração.");
    if (!st.model) throw fail("model", "Escolha o modelo de imagem na Administração.");
    try {
      if (p === "google" || p === "google_free") {
        const go = (withCfg) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(st.model)}:generateContent`, {
          method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": k },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: withCfg ? prompt : prompt + ` Aspect ratio ${aspect}, landscape.` }] }],
            generationConfig: withCfg ? { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: aspect } } : { responseModalities: ["TEXT", "IMAGE"] }
          })
        });
        let res = await go(true);
        if (res.status === 400) {
          let m = ""; try { m = (await res.clone().json()).error?.message || ""; } catch (e) {}
          if (/image_?config|aspect/i.test(m)) res = await go(false);
        }
        if (!res.ok) throw await httpErr(res, p);
        const j = await res.json();
        const c = j.candidates?.[0];
        const part = (c?.content?.parts || []).find(x => x.inlineData || x.inline_data);
        if (!part) {
          const why = c?.finishReason || j.promptFeedback?.blockReason || "";
          if (/SAFETY|PROHIBIT|BLOCK|IMAGE_OTHER|RECITATION/i.test(why)) throw fail("blocked", "O filtro do Google barrou esta imagem. Ajuste o prompt e tente de novo.");
          throw fail("no_image", "O modelo não devolveu imagem. Tente de novo ou troque o modelo de imagem.");
        }
        const d = part.inlineData || part.inline_data;
        return b64Blob(d.data, d.mimeType || d.mime_type);
      }
      if (p === "openai") {
        const res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST", signal, headers: { "content-type": "application/json", Authorization: "Bearer " + k },
          body: JSON.stringify({ model: st.model, prompt, n: 1, size: aspect === "16:9" ? "1536x1024" : "1024x1024" })
        });
        if (!res.ok) throw await httpErr(res, p);
        const d = (await res.json()).data?.[0];
        if (d?.b64_json) return b64Blob(d.b64_json, "image/png");
        if (d?.url) return await (await fetch(d.url)).blob();
        throw fail("no_image", "O modelo não devolveu imagem.");
      }
      throw fail("provider", "Este provedor não gera imagens.");
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("cancelled", "Interrompido");
      if (e && e.code) throw e;
      throw fail("network", "Sem conexão com " + PROVIDERS[p].name + ".");
    }
  }

  return { image, paidFallbacks: () => usedPaid, PROVIDERS, STAGES, get, setKey, setStage, clearAll, ready, stageReady,
           listModels, cachedModels, pickDefault, pickQuick, call, json };
})();
