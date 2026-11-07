/* Onion · camada de IA
 * A chave fica SOMENTE no localStorage do navegador de quem usa.
 * Nunca coloque chaves neste repositório: o GitHub Pages é público.
 */
const AI = (() => {
  const KEY = "onion-keys-v1";
  const DEFAULTS = { anthropicKey: "", model: "claude-sonnet-5-5", quickModel: "claude-haiku-5-5" };
  let cfg = { ...DEFAULTS };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function get() { return { ...cfg }; }
  function set(patch) { Object.assign(cfg, patch); persist(); }
  function clear() { cfg = { ...DEFAULTS }; try { localStorage.removeItem(KEY); } catch (e) {} }
  function ready() { return !!cfg.anthropicKey; }

  function fail(code, message) { return { code, message }; }

  async function call(prompt, { tier = "default", onText, signal, maxTokens = 8000 } = {}) {
    if (!ready()) throw fail("no_key", "Coloque sua chave da Anthropic na Administração.");
    const model = tier === "quick" ? cfg.quickModel : cfg.model;
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model, max_tokens: maxTokens, stream: true,
          messages: [{ role: "user", content: prompt }]
        })
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("cancelled", "Interrompido");
      throw fail("network", "Sem conexão com a API da Anthropic.");
    }
    if (!res.ok) {
      let msg = ""; try { msg = (await res.json()).error?.message || ""; } catch (e) {}
      if (res.status === 401) throw fail("auth", "Chave da Anthropic inválida. Confira na Administração.");
      if (res.status === 404) throw fail("model", "Modelo não encontrado: " + model + ". Ajuste o modelo na Administração.");
      if (res.status === 429) throw fail("rate_limited", "Limite de uso atingido. Espere um pouco.");
      if (res.status === 529 || res.status >= 500) throw fail("overloaded", "A API está sobrecarregada. Tente de novo em instantes.");
      throw fail("http_" + res.status, msg || ("Erro " + res.status));
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", stop = null;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const line = chunk.split("\n").find(l => l.startsWith("data:"));
          if (!line) continue;
          let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            text += ev.delta.text;
            if (onText) onText({ text, delta: ev.delta.text });
          } else if (ev.type === "message_delta") {
            stop = ev.delta?.stop_reason || stop;
          } else if (ev.type === "error") {
            throw fail("stream", ev.error?.message || "Erro durante a geração");
          }
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { ...fail("cancelled", "Interrompido"), text };
      throw e;
    }
    return { text, truncated: stop === "max_tokens" };
  }

  async function json(prompt, opts = {}) {
    const { text } = await call(prompt + "\n\nResponda apenas com o JSON, sem crases, sem texto antes ou depois.", opts);
    const clean = text.replace(/```json|```/g, "").trim();
    const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
    try { return JSON.parse(clean.slice(a, b + 1)); }
    catch (e) { throw { ...fail("invalid_json", "Resposta fora do formato"), text }; }
  }

  async function test() {
    const r = await call("Responda só com a palavra OK.", { tier: "quick", maxTokens: 10 });
    return r.text.trim();
  }

  return { get, set, clear, ready, call, json, test };
})();
