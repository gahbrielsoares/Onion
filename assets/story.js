/* Onion · Estúdio de Stories
 * Você envia o seu vídeo (e fotos/vídeos do produto), diz o que quer transmitir,
 * a IA estuda e o Onion edita: cortes de pausas, inserções do produto no momento certo,
 * textos de destaque, legendas, trilha e efeitos.
 */
const Story = (() => {
  const SR = Voice.SR;
  const fail = (code, message) => ({ code, message });
  const FORMATS = { vertical: [1080, 1920], horizontal: [1920, 1080], quadrado: [1080, 1080] };

  function loadVideo(blob) {
    return new Promise((res, rej) => {
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous";
      v.src = URL.createObjectURL(blob);
      v.onloadeddata = () => res(v); v.onerror = () => rej(fail("video", "Não consegui abrir esse vídeo neste navegador. Tente MP4 (H.264)."));
    });
  }
  const seek = (v, t) => new Promise(r => { const on = () => { v.removeEventListener("seeked", on); r(); }; v.addEventListener("seeked", on); v.currentTime = Math.max(0, Math.min(t, (v.duration || 1) - .05)); });
  function snap(src, w, q = .7) {
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height, k = w / Math.max(sw, sh);
    const c = document.createElement("canvas"); c.width = Math.round(sw * k); c.height = Math.round(sh * k); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q).split(",")[1];
  }
  function b64(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return btoa(s); }
  async function audioOf(blob) { try { return await Voice.decode(blob); } catch (e) { return null; } }
  async function googleModel() {
    const c = AI.get(); if (c.text.provider === "google" && c.text.model) return c.text.model;
    let ids = AI.cachedModels("google", "text"); if (!ids.length) ids = await AI.listModels("google", "text");
    return AI.pickDefault("text", ids);
  }

  /* ---------- estudo ---------- */
  async function study({ file, desc, dest, media, onStatus, signal }) {
    const k = AI.get().keys.google; if (!k) throw fail("no_key", "O estudo do vídeo usa o Gemini: cole a sua chave do Google na Administração.");
    onStatus && onStatus("assistindo o vídeo");
    const v = await loadVideo(file), dur = v.duration;
    const N = Math.max(6, Math.min(24, Math.ceil(dur / 2))), frames = [];
    for (let i = 0; i < N; i++) { const t = (i + .5) * dur / N; await seek(v, t); frames.push({ t, data: snap(v, 384) }); }
    onStatus && onStatus("ouvindo o áudio");
    const pcm = await audioOf(file); let audioPart = null;
    if (pcm) { const d16 = new Float32Array(Math.floor(Math.min(pcm.length, SR * 420) / 3)); for (let i = 0; i < d16.length; i++) d16[i] = (pcm[i * 3] + pcm[i * 3 + 1] + pcm[i * 3 + 2]) / 3;
      audioPart = { inline_data: { mime_type: "audio/wav", data: b64(new Uint8Array(await Voice.wav(d16, 16000).arrayBuffer())) } }; }
    const mparts = [];
    for (const m of media) { try { const el = m.type.startsWith("video") ? await loadVideo(m.blob).then(async x => { await seek(x, .3); return x; }) : await createImageBitmap(m.blob); mparts.push({ text: `Mídia ${m.id} (${m.type.startsWith("video") ? "vídeo" : "foto"}, "${m.name}"):` }, { inline_data: { mime_type: "image/jpeg", data: snap(el, 256) } }); } catch (e) {} }
    onStatus && onStatus("pensando na edição");
    const prompt = `Você é editor de vídeo de redes sociais (Stories, Reels, Shorts, TikTok e YouTube). O criador gravou o vídeo abaixo e quer transmitir isto:
"""${desc || "(sem descrição)"}"""
Destino: ${dest}. Duração do vídeo: ${dur.toFixed(1)} s. Abaixo vão quadros do vídeo com o tempo de cada um${pcm ? " e o áudio completo" : " (o vídeo não tem áudio)"}${media.length ? ", e as mídias do produto que podem ser inseridas" : ""}.
Planeje a edição. Responda só com JSON:
{"resumo": "o que o vídeo mostra, em 1-2 frases",
 "tem_fala": true ou false,
 "transcricao": [{"inicio": s, "fim": s, "texto": "frase falada"}] (todas as falas, com tempos em segundos do vídeo original),
 "remover": [{"inicio": s, "fim": s, "motivo": "..."}] (só trechos claramente ruins: erro de gravação, repetição, silêncio longo; pode ficar vazio),
 "insercoes": [{"inicio": s, "fim": s, "midia": "id da mídia", "motivo": "..."}] (mostre a mídia do produto quando a fala ou a cena falar dele; 1,5 a 4 s cada; nunca sobrepostas),
 "textos": [{"inicio": s, "fim": s, "texto": "1 a 4 palavras de destaque"}] (benefício, preço, oferta, chamada pra ação; poucos e nos momentos fortes),
 "titulo": "título curto pro post",
 "legenda_post": "legenda pronta pro post, com 3 a 5 hashtags",
 "sugestoes": {"legendas": "Palavra por palavra" | "Karaokê" | "Frase curta" | "Sem legenda", "trilha": um destes [${Object.keys(Sound.MOODS).join(", ")}, Sem trilha], "efeitos": um destes [${Sound.SFX_SETS.join(", ")}], "formato": "vertical" | "horizontal" | "quadrado"}}`;
    const parts = [{ text: prompt }];
    frames.forEach(f => parts.push({ text: `[quadro em t=${f.t.toFixed(1)}s]` }, { inline_data: { mime_type: "image/jpeg", data: f.data } }));
    if (audioPart) parts.push({ text: "[áudio completo do vídeo]" }, audioPart);
    parts.push(...mparts);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(await googleModel())}:generateContent`, { method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": k }, body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json" } }) });
    if (!r.ok) { let m = ""; try { m = (await r.json()).error?.message || ""; } catch (e) {} throw fail("http", "O estudo falhou: " + (m || r.status)); }
    const j = await r.json(), txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    let o; try { o = JSON.parse(txt.replace(/```json|```/g, "").trim()); } catch (e) { throw fail("invalid_json", "A IA respondeu fora do formato. Tente estudar de novo."); }
    URL.revokeObjectURL(v.src);
    const num = x => Math.max(0, Math.min(dur, +x || 0)), ids = new Set(media.map(m => m.id));
    return {
      dur, resumo: String(o.resumo || ""), tem_fala: !!o.tem_fala && !!pcm,
      transcricao: (o.transcricao || []).map(x => ({ a: num(x.inicio), b: num(x.fim), t: String(x.texto || "") })).filter(x => x.b > x.a && x.t),
      remover: (o.remover || []).map(x => ({ a: num(x.inicio), b: num(x.fim), why: String(x.motivo || "") })).filter(x => x.b - x.a > .3),
      insercoes: (o.insercoes || []).map(x => ({ a: num(x.inicio), b: num(x.fim), m: String(x.midia || ""), why: String(x.motivo || "") })).filter(x => x.b > x.a && ids.has(x.m)),
      textos: (o.textos || []).map(x => ({ a: num(x.inicio), b: num(x.fim), t: String(x.texto || "").replace(/\*/g, "") })).filter(x => x.b > x.a && x.t),
      titulo: String(o.titulo || ""), legenda_post: String(o.legenda_post || ""), sugestoes: o.sugestoes || {}
    };
  }

  /* ---------- montagem ---------- */
  // trechos mantidos: tira o que a IA marcou e as pausas longas (> 0,9 s, deixa 0,25 s)
  function keepSegments(st, pcm, cutPauses) {
    let rm = st.remover.map(x => [x.a, x.b]);
    if (cutPauses && pcm) Cut.pauses(pcm, .9).forEach(p => rm.push([p.s + .12, p.e - .13]));
    rm = rm.filter(r => r[1] - r[0] > .25).sort((x, y) => x[0] - y[0]);
    const keep = []; let cur = 0;
    rm.forEach(([a, b]) => { if (a > cur + .05) keep.push([cur, a]); cur = Math.max(cur, b); });
    if (cur < st.dur - .05) keep.push([cur, st.dur]);
    return keep.length ? keep : [[0, st.dur]];
  }
  const mapper = keep => { const offs = []; let o = 0; keep.forEach(k => { offs.push(o); o += k[1] - k[0]; }); return { total: o, at: t => { for (let i = 0; i < keep.length; i++) if (t >= keep[i][0] && t <= keep[i][1]) return offs[i] + t - keep[i][0]; return null; } }; };
  function wordsOf(st, map) {
    const out = [];
    st.transcricao.forEach(seg => { const ws = seg.t.split(/\s+/).filter(Boolean), tot = ws.reduce((a, w) => a + w.length + 1, 0); let c = seg.a;
      ws.forEach(w => { const d = (seg.b - seg.a) * (w.length + 1) / tot, s = map.at(c), e = map.at(c + d * .92); if (s != null && e != null) out.push({ w, s, e }); c += d; }); });
    return out;
  }
  const ease = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  function drawFit(g, src, W, H, bgSmall) {
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height; if (!sw) return;
    const ar = sw / sh, oar = W / H;
    if (Math.abs(ar - oar) / oar < .12) { const s = Math.max(W / sw, H / sh); g.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s); return; }
    // fundo desfocado (desenho pequeno ampliado) + vídeo inteiro no centro
    const bs = bgSmall.getContext("2d"); bs.drawImage(src, 0, 0, bgSmall.width, bgSmall.height);
    g.save(); g.imageSmoothingQuality = "low"; g.drawImage(bgSmall, -W * .05, -H * .05, W * 1.1, H * 1.1); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 0, W, H); g.restore();
    const s = Math.min(W / sw, H / sh); g.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s);
  }
  function drawText(g, txt, p, W, H, accent) {
    const portrait = H > W, fs = Math.round(Math.min(W, H) * (portrait ? .1 : .085)), e = ease(p / .3);
    g.save(); g.font = `${fs}px Anton, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    const t = txt.toUpperCase(), tw = Math.min(g.measureText(t).width, W * .86), y = H * (portrait ? .2 : .18);
    g.translate(W / 2, y); g.scale(.7 + .3 * e, .7 + .3 * e); g.rotate(-2 * Math.PI / 180); g.globalAlpha = Math.min(1, p / .15);
    g.fillStyle = accent; g.fillRect(-tw / 2 - fs * .4, -fs * .65, tw + fs * .8, fs * 1.3);
    g.fillStyle = "#111"; g.fillText(t, 0, fs * .04, W * .86); g.restore();
  }
  async function render({ id, file, media, st, opts, onProgress, signal }) {
    const fmt = FORMATS[opts.formato] || FORMATS.vertical, [W, H] = fmt;
    try { await Promise.all(["40px Anton", "800 40px Figtree"].map(f => document.fonts.load(f))); } catch (e) {}
    const pcm = await audioOf(file), keep = keepSegments(st, pcm, opts.cortar), map = mapper(keep), total = map.total;
    // áudio: trechos mantidos + trilha (abaixa sob a voz) + efeitos nas inserções e textos
    const voice = pcm ? Voice.concat(keep.map(([a, b]) => pcm.subarray(Math.floor(a * SR), Math.floor(b * SR)))) : new Float32Array(Math.ceil(total * SR));
    let music = null;
    if (opts.musica === "custom") { const mb = await Store.get(`st${id}:music`); if (mb) try { music = await Voice.decode(mb); } catch (e) {} }
    else if (opts.musica && opts.musica !== "Sem trilha") music = await Sound.loop(opts.musica);
    const ins = st.insercoes.map(x => ({ ...x, oa: map.at(x.a), ob: map.at(x.b) })).filter(x => x.oa != null && x.ob != null && x.ob > x.oa);
    const txts = st.textos.map(x => ({ ...x, oa: map.at(x.a), ob: map.at(x.b) })).filter(x => x.oa != null && x.ob != null && x.ob > x.oa);
    const ev = opts.efeitos === "Sem efeitos" ? [] : [...ins.map(x => ({ t: x.oa - .2, kind: /Promocional/.test(opts.efeitos) ? "pop" : "whoosh", gain: .5 })), ...txts.map(x => ({ t: x.oa, kind: /Promocional/.test(opts.efeitos) ? "sparkle" : /Cinemat/.test(opts.efeitos) ? "impact" : "pop", gain: .55 }))];
    const audio = (music || ev.length) ? await Sound.mix(Voice.normalize(voice), { music, events: ev, musicGain: st.tem_fala ? .1 : .32 }) : Voice.normalize(voice);
    const caps = opts.legendas !== "Sem legenda" && st.tem_fala ? Cut.capsFromWords(wordsOf(st, map)) : [];
    // mídias do produto
    const mel = {};
    for (const m of media) { try { mel[m.id] = m.type.startsWith("video") ? await loadVideo(m.blob) : await createImageBitmap(m.blob); } catch (e) {} }
    const out = await Cut.writer(W, H), canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const g = canvas.getContext("2d", { alpha: false }), bgSmall = document.createElement("canvas"); bgSmall.width = 48; bgSmall.height = Math.round(48 * H / W);
    const accent = opts.cor || "#FFD23F";
    await out.audio(audio.subarray(0, Math.ceil((total + .4) * SR)));
    const v = await loadVideo(file);
    let curIns = null;
    const draw = (t) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      drawFit(g, v, W, H, bgSmall);
      const it = ins.find(x => t >= x.oa && t < x.ob);
      if (it && mel[it.m]) {
        const el = mel[it.m], p = (t - it.oa) / (it.ob - it.oa), fade = Math.min(1, (t - it.oa) / .25, (it.ob - t) / .25);
        if (el.tagName === "VIDEO" && curIns !== it) { curIns = it; el.currentTime = 0; el.play().catch(() => {}); }
        g.save(); g.globalAlpha = Math.max(0, fade);
        if (el.tagName === "VIDEO") drawFit(g, el, W, H, bgSmall);
        else { const s = Math.max(W / el.width, H / el.height) * (1.04 + .08 * p); g.drawImage(el, (W - el.width * s) / 2, (H - el.height * s) / 2, el.width * s, el.height * s); }
        g.restore();
      } else if (curIns) { if (curIns.m && mel[curIns.m] && mel[curIns.m].tagName === "VIDEO") mel[curIns.m].pause(); curIns = null; }
      txts.forEach(x => { if (t >= x.oa && t < x.ob) drawText(g, x.t, t - x.oa, W, H, accent); });
      if (caps.length) Cut.drawCaption(g, t, { caps }, { W, H, captions: opts.legendas });
      if (t > total - .4) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (t - total + .4) / .4)})`; g.fillRect(0, 0, W, H); }
    };
    // toca cada trecho mantido em tempo real e grava os quadros
    let done = 0;
    for (let i = 0; i < keep.length; i++) {
      const [a, b] = keep[i], base = map.at(a) ?? done;
      await seek(v, a);
      await new Promise((res, rej) => {
        let stop = false, lastTick = performance.now();
        const finish = () => { if (stop) return; stop = true; v.pause(); clearInterval(guard); v.removeEventListener("ended", finish); res(); };
        v.addEventListener("ended", finish);
        // se o vídeo parar de mandar quadros (fim do arquivo), encerra o trecho
        const guard = setInterval(() => { if (!stop && performance.now() - lastTick > 1500 && (v.paused || v.ended || v.currentTime >= b - .15)) finish(); }, 300);
        const tick = async (now, meta) => {
          lastTick = performance.now();
          if (stop) return;
          if (signal && signal.aborted) { stop = true; v.pause(); clearInterval(guard); return rej(fail("cancelled", "Interrompido")); }
          const src = meta ? meta.mediaTime : v.currentTime;
          if (src >= b - .01 || v.ended) return finish();
          const t = base + Math.max(0, src - a); draw(t);
          try { await out.frame(canvas, t); } catch (e) { stop = true; v.pause(); clearInterval(guard); return rej(e); }
          onProgress && onProgress(Math.min(1, t / total));
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else setTimeout(() => tick(0, null), 33);
        };
        v.play().then(() => { if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else tick(0, null); }).catch(e => rej(fail("play", "O navegador não deixou tocar o vídeo pra montar. Mantenha a aba aberta e visível.")));
      });
      done = base + (b - a);
    }
    // fade final
    for (let k = 1; k <= 12; k++) { const t = total + k / 30; draw(t); await out.frame(canvas, t); }
    Object.values(mel).forEach(el => { if (el.tagName === "VIDEO") { el.pause(); URL.revokeObjectURL(el.src); } });
    URL.revokeObjectURL(v.src);
    return { blob: await out.finish(), secs: total, W, H };
  }

  return { FORMATS, study, render, loadVideo };
})();
