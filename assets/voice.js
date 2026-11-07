/* Onion · narração (TTS), transcrição e utilitários de áudio */
const Voice = (() => {
  const fail = (code, message) => ({ code, message });

  /* ---------- vozes ---------- */
  const GEMINI_VOICES = [
    ["Charon","masculina","informativa"],["Orus","masculina","firme"],["Iapetus","masculina","clara"],["Algenib","masculina","grave, rouca"],
    ["Rasalgethi","masculina","informativa"],["Alnilam","masculina","firme"],["Schedar","masculina","equilibrada"],["Sadaltager","masculina","sábia"],
    ["Enceladus","masculina","soprada, íntima"],["Achird","masculina","amigável"],["Puck","masculina","animada"],["Fenrir","masculina","empolgada"],
    ["Algieba","masculina","suave"],["Umbriel","masculina","tranquila"],["Zubenelgenubi","masculina","casual"],
    ["Gacrux","feminina","madura"],["Sulafat","feminina","calorosa"],["Vindemiatrix","feminina","gentil"],["Kore","feminina","firme"],
    ["Achernar","feminina","macia"],["Despina","feminina","suave"],["Erinome","feminina","clara"],["Aoede","feminina","leve"],
    ["Callirrhoe","feminina","tranquila"],["Autonoe","feminina","brilhante"],["Leda","feminina","jovem"],["Pulcherrima","feminina","direta"],
    ["Zephyr","feminina","brilhante"],["Laomedeia","feminina","animada"],["Sadachbia","feminina","viva"]
  ].map(([id, g, d]) => ({ id, name: id, gender: g, desc: d }));
  const OPENAI_VOICES = [
    ["onyx","masculina","grave"],["echo","masculina","neutra"],["ash","masculina","expressiva"],["verse","masculina","versátil"],["fable","masculina","contador de histórias"],
    ["sage","feminina","calma"],["coral","feminina","calorosa"],["shimmer","feminina","clara"],["nova","feminina","jovem"],["alloy","neutra","equilibrada"],["ballad","masculina","suave"]
  ].map(([id, g, d]) => ({ id, name: id[0].toUpperCase() + id.slice(1), gender: g, desc: d }));

  async function list() {
    const c = AI.get(), p = c.voice.provider;
    if (p === "google") return GEMINI_VOICES;
    if (p === "openai") return OPENAI_VOICES;
    if (p === "elevenlabs") {
      const k = c.keys.elevenlabs; if (!k) throw fail("no_key", "Cole a chave da ElevenLabs na Administração.");
      const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": k } });
      if (!r.ok) throw fail("http", "Não deu pra carregar as vozes da ElevenLabs (" + r.status + ").");
      const j = await r.json();
      return (j.voices || []).map(v => ({
        id: v.voice_id, name: v.name, preview: v.preview_url,
        gender: v.labels?.gender === "male" ? "masculina" : v.labels?.gender === "female" ? "feminina" : "neutra",
        desc: [v.labels?.age, v.labels?.accent, v.labels?.description || v.labels?.descriptive, v.labels?.use_case || v.labels?.use_case].filter(Boolean).join(", ")
      }));
    }
    return [];
  }
  function maxChars() { const p = AI.get().voice.provider; return p === "google" ? 1400 : p === "openai" ? 3500 : 2400; }

  /* ---------- dividir o roteiro ---------- */
  function chunkScript(text, max = maxChars()) {
    const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    const out = []; let cur = "";
    const pushCur = () => { if (cur.trim()) out.push(cur.trim()); cur = ""; };
    for (const p of paras) {
      if (p.length > max) {
        pushCur();
        const sents = p.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [p];
        let s2 = "";
        for (const s of sents) { if ((s2 + s).length > max && s2) { out.push(s2.trim()); s2 = ""; } s2 += s; }
        if (s2.trim()) out.push(s2.trim());
      } else if ((cur + "\n\n" + p).length > max) { pushCur(); cur = p; }
      else cur = cur ? cur + "\n\n" + p : p;
    }
    pushCur();
    return out;
  }

  /* ---------- síntese ---------- */
  function b64Bytes(b64) { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function pcmToWav(bytes, rate) {
    const h = new ArrayBuffer(44), v = new DataView(h), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + bytes.length, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, bytes.length, true);
    return new Blob([h, bytes], { type: "audio/wav" });
  }
  function httpFail(status, p, msg) {
    if (status === 401 || status === 403) return fail("auth", "Chave de " + AI.PROVIDERS[p].name + " recusada na narração.");
    if (status === 429) return fail("rate_limited", "Limite de uso de " + AI.PROVIDERS[p].name + " atingido.");
    if (status >= 500) return fail("overloaded", AI.PROVIDERS[p].name + " está instável agora.");
    return fail("http_" + status, msg || ("Erro " + status + " na narração"));
  }
  async function errText(r) { try { const j = await r.json(); return j.error?.message || j.detail?.message || (typeof j.detail === "string" ? j.detail : "") || ""; } catch (e) { return ""; } }

  // devolve {blob, words?:[{w,s,e}]} — words só quando o provedor dá o tempo exato
  async function synth(text, { voiceId, speed = 1, style = "", prev = "", next = "", signal } = {}) {
    const c = AI.get(), p = c.voice.provider, k = c.keys[p], model = c.voice.model;
    if (!k) throw fail("no_key", "Cole a chave de " + AI.PROVIDERS[p].name + " no cartão Narração.");
    if (!model) throw fail("model", "Escolha o modelo de narração na Administração.");
    if (!voiceId) throw fail("voice", "Escolha uma voz.");
    try {
      if (p === "google") {
        const pace = speed < .95 ? "at a slightly slower, unhurried pace" : speed > 1.05 ? "at a slightly faster, energetic pace" : "at a natural pace";
        const instr = `Read the following narration aloud ${pace}${style ? ", " + style : ""}. Read only the text, exactly as written:\n\n`;
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": k },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: instr + text }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } } } })
        });
        if (!r.ok) throw httpFail(r.status, p, await errText(r));
        const j = await r.json();
        const part = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData || x.inline_data);
        if (!part) throw fail("no_audio", "O Gemini não devolveu áudio neste trecho. Tente de novo.");
        const d = part.inlineData || part.inline_data, mime = d.mimeType || d.mime_type || "";
        const bytes = b64Bytes(d.data);
        if (/wav|mpeg|mp3|ogg/i.test(mime)) return { blob: new Blob([bytes], { type: mime }) };
        const rate = +((mime.match(/rate=(\d+)/) || [0, 24000])[1]);
        return { blob: pcmToWav(bytes, rate) };
      }
      if (p === "openai") {
        const body = { model, voice: voiceId, input: text, response_format: "mp3", speed };
        if (/gpt-4o/i.test(model) && style) body.instructions = style;
        const r = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", signal,
          headers: { "content-type": "application/json", Authorization: "Bearer " + k }, body: JSON.stringify(body) });
        if (!r.ok) throw httpFail(r.status, p, await errText(r));
        return { blob: await r.blob() };
      }
      if (p === "elevenlabs") {
        const body = { text, model_id: model, voice_settings: { stability: .5, similarity_boost: .75, speed: Math.max(.7, Math.min(1.2, speed)) } };
        if (prev) body.previous_text = prev.slice(-800);
        if (next) body.next_text = next.slice(0, 800);
        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
          method: "POST", signal, headers: { "content-type": "application/json", "xi-api-key": k }, body: JSON.stringify(body) });
        if (!r.ok) throw httpFail(r.status, p, await errText(r));
        const j = await r.json();
        const blob = new Blob([b64Bytes(j.audio_base64)], { type: "audio/mpeg" });
        return { blob, words: alignToWords(j.alignment || j.normalized_alignment) };
      }
      throw fail("provider", "Este provedor não faz narração.");
    } catch (e) {
      if (e && e.name === "AbortError") throw fail("cancelled", "Interrompido");
      if (e && e.code) throw e;
      throw fail("network", "Sem conexão com " + AI.PROVIDERS[p].name + ".");
    }
  }
  function alignToWords(a) {
    if (!a || !a.characters) return null;
    const out = []; let w = "", s = 0, e = 0;
    a.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) { if (w) out.push({ w, s, e }); w = ""; return; }
      if (!w) s = a.character_start_times_seconds[i];
      w += ch; e = a.character_end_times_seconds[i];
    });
    if (w) out.push({ w, s, e });
    return out;
  }

  /* ---------- transcrição (tempo exato de cada palavra) ---------- */
  async function transcribe(blob, { signal } = {}) {
    const c = AI.get(), p = c.cut.provider, k = c.keys[p];
    if (p === "local") return null;
    if (!k) throw fail("no_key", "Cole a chave de " + AI.PROVIDERS[p].name + " no cartão OnionCut.");
    const ext = /wav/.test(blob.type) ? "wav" : "mp3";
    const fd = new FormData();
    if (p === "elevenlabs") {
      fd.append("model_id", c.cut.model || "scribe_v1"); fd.append("file", blob, "voz." + ext); fd.append("timestamps_granularity", "word");
      const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", signal, headers: { "xi-api-key": k }, body: fd });
      if (!r.ok) throw httpFail(r.status, p, await errText(r));
      const j = await r.json();
      return (j.words || []).filter(w => w.type === "word" || !w.type).map(w => ({ w: w.text.trim(), s: w.start, e: w.end })).filter(w => w.w);
    }
    if (p === "openai") {
      fd.append("model", "whisper-1"); fd.append("file", blob, "voz." + ext);
      fd.append("response_format", "verbose_json"); fd.append("timestamp_granularities[]", "word");
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", signal, headers: { Authorization: "Bearer " + k }, body: fd });
      if (!r.ok) throw httpFail(r.status, p, await errText(r));
      return ((await r.json()).words || []).map(w => ({ w: w.word.trim(), s: w.start, e: w.end })).filter(w => w.w);
    }
    return null;
  }

  /* ---------- áudio ---------- */
  const SR = 48000;
  async function decode(blob) {
    const ctx = new OfflineAudioContext(1, 1, SR);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (buf.numberOfChannels === 1) return buf.getChannelData(0).slice();
    const out = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels; }
    return out;
  }
  function concat(parts, gap = 0) {
    const g = Math.round(gap * SR); const len = parts.reduce((a, p) => a + p.length, 0) + g * Math.max(0, parts.length - 1);
    const out = new Float32Array(len); let o = 0;
    parts.forEach((p, i) => { out.set(p, o); o += p.length + (i < parts.length - 1 ? g : 0); });
    return out;
  }
  function wav(f32, rate = SR) {
    const bytes = new Uint8Array(f32.length * 2), v = new DataView(bytes.buffer);
    for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return pcmToWav(bytes, rate);
  }

  return { list, synth, transcribe, chunkScript, decode, concat, wav, SR };
})();
