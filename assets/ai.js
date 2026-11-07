/* Onion · camada de IA
 * Cada etapa (textos, imagens, narração, OnionCut) escolhe um provedor.
 * As chaves ficam SOMENTE no localStorage do navegador de quem usa.
 * Nunca coloque chaves neste repositório: o GitHub Pages é público.
 */
const AI = (() => {
  const KEY = "onion-ai-v2";

  const PROVIDERS = {
    anthropic:  { name: "Anthropic (Claude)", keyHint: "sk-ant-…", where: "console.anthropic.com" },
    google:     { name: "Google Gemini",      keyHint: "AIza…",    where: "aistudio.google.com" },
    openai:     { name: "OpenAI",             keyHint: "sk-…",     where: "platform.openai.com" },
    elevenlabs: { name: "ElevenLabs",         keyHint: "sk_…",     where: "elevenlabs.io" },
    local:      { name: "Sem IA (no navegador)", noKey: true }
  };

  // O que cada provedor consegue fazer em cada etapa
  const STAGES = {
    text:  { name: "Textos", what: "Temas, títulos, roteiro, descrição, textos da capa e prompts das cenas",
             providers: ["anthropic", "google", "openai"] },
    image: { name: "Imagens e capas", what: "Gera as imagens de cada cena e a arte da thumbnail",
             providers: ["google", "openai"],
             blocked: { anthropic: "O Claude escreve os prompts, mas não gera imagens." } },
    voice: { name: "Narração", what: "Transforma o roteiro em áudio com voz realista",
             providers: ["elevenlabs", "google", "openai"],
             blocked: { anthropic: "O Claude não gera áudio." } },
    cut:   { name: "OnionCut", what: "A montagem roda no seu navegador e não precisa de IA. Uma IA aqui só serve pra marcar o tempo de cada palavra, deixando as legendas palavra por palavra perfeitamente sincronizadas.",
             providers: ["local", "elevenlabs", "google", "openai"] }
  };

  const DEFAULTS = {
    keys: { anthropic: "", google: "", openai: "", elevenlabs: "" },
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
    let msg = ""; try { const j = await res.json(); msg = j.error?.message || j.detail?.message || j.detail || ""; } catch (e) {}
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /key/i.test(msg)))
      return fail("auth", "Chave de " + PROVIDERS[p].name + " recusada. Confira se colou inteira.");
    if (res.status === 429) return fail("rate_limited", "Limite de uso atingido em " + PROVIDERS[p].name + ". Espere um pouco.");
    if (res.status >= 500) return fail("overloaded", PROVIDERS[p].name + " está instável agora. Tente de novo em instantes.");
    return fail("http_" + res.status, msg || ("Erro " + res.status + " em " + PROVIDERS[p].name));
  }
  async function listModels(provider, stage) {
    const k = cfg.keys[provider];
    if (!k) throw fail("no_key", "Cole a chave primeiro.");
    let ids = [];
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" } });
      if (!r.ok) throw await httpErr(r, provider);
      ids = (await r.json()).data.map(m => m.id);
    } else if (provider === "google") {
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
      else if (stage === "cut") ids = all.filter(s => /transcribe|whisper/i.test(s));
      else ids = all.filter(s => /^(gpt|o\d)/i.test(s) && !/image|tts|audio|realtime|transcribe|search|instruct|embedding/i.test(s));
    } else if (provider === "elevenlabs") {
      const r = await fetch("https://api.elevenlabs.io/v1/models", { headers: { "xi-api-key": k } });
      if (!r.ok) throw await httpErr(r, provider);
      const all = await r.json();
      ids = (stage === "cut")
        ? ["scribe_v1"].concat(all.filter(m => /scribe/i.test(m.model_id)).map(m => m.model_id))
        : all.filter(m => m.can_do_text_to_speech).map(m => m.model_id);
    }
    ids = vsort([...new Set(ids)]);
    cfg.models[provider + ":" + stage] = ids; persist();
    return ids;
  }
  function cachedModels(provider, stage) { return cfg.models[provider + ":" + stage] || []; }
  function pickDefault(stage, ids) {
    if (!ids.length) return "";
    if (stage === "text") return ids.find(s => /sonnet/i.test(s)) || ids.find(s => /pro/i.test(s) && !/preview/i.test(s)) || ids.find(s => /flash/i.test(s) && !/lite|preview/i.test(s)) || ids[0];
    if (stage === "image") return ids.find(s => /flash/i.test(s) && !/lite/i.test(s)) || ids[0];
    if (stage === "voice") return ids.find(s => /multilingual|flash/i.test(s) && !/lite/i.test(s)) || ids[0];
    return ids[0];
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

  return { PROVIDERS, STAGES, get, setKey, setStage, clearAll, ready, stageReady,
           listModels, cachedModels, pickDefault, pickQuick, call, json };
})();
