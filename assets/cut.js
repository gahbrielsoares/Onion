/* Onion · OnionCut — montagem e render do vídeo no navegador */
const Cut = (() => {
  const SR = Voice.SR, FPS = 30, XF = 0.6, GAP = 0.35;

  const TEMPLATES = {
    "Oração serena":      { filter: "saturate(1.05) contrast(1.02)", tint: "rgba(255,196,140,.10)", vig: .45, leak: .10, grain: .03 },
    "Noite de fé":        { filter: "saturate(.9) brightness(.92)",  tint: "rgba(40,60,150,.18)",   vig: .65, leak: 0,   grain: .04 },
    "Luz divina":         { filter: "brightness(1.05) saturate(1.05)", tint: "rgba(255,240,200,.08)", vig: .30, leak: .22, grain: .02 },
    "Salmo":              { filter: "sepia(.25) saturate(.95)",       tint: "rgba(180,140,80,.10)",  vig: .50, leak: .06, grain: .06 },
    "Documentário escuro":{ filter: "saturate(.7) contrast(1.12)",    tint: "rgba(0,0,0,.12)",       vig: .70, leak: 0,   grain: .05 },
    "Mistério":           { filter: "saturate(.6) contrast(1.15) brightness(.9)", tint: "rgba(20,70,70,.16)", vig: .75, leak: 0, grain: .07 },
    "Clean":              { filter: "none", tint: null, vig: 0, leak: 0, grain: 0 }
  };

  /* ---------- análise do áudio ---------- */
  function envelope(f32, hop = 480) {
    const n = Math.floor(f32.length / hop), env = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; const o = i * hop; for (let j = 0; j < hop; j++) { const x = f32[o + j]; s += x * x; } env[i] = Math.sqrt(s / hop); }
    return env;
  }
  function threshold(env) {
    const a = Array.from(env).sort((x, y) => x - y);
    return Math.max(0.006, a[Math.floor(a.length * .9)] * 0.12);
  }
  function pauses(f32, minLen = 0.18) {
    const env = envelope(f32), thr = threshold(env), out = []; let st = -1;
    for (let i = 0; i <= env.length; i++) {
      const sil = i < env.length && env[i] < thr;
      if (sil && st < 0) st = i;
      if (!sil && st >= 0) { const s = st * .01, e = i * .01; if (e - s >= minLen) out.push({ s, e }); st = -1; }
    }
    return out;
  }
  function speechBounds(f32) {
    const env = envelope(f32), thr = threshold(env);
    let a = 0, b = env.length - 1;
    while (a < env.length && env[a] < thr) a++;
    while (b > a && env[b] < thr) b--;
    return [a * .01, (b + 1) * .01];
  }
  // tempo de cada palavra sem IA: ancora o fim das frases nas pausas da voz e distribui as palavras no meio
  function localAlign(f32, text) {
    const toks = text.split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const [s0, s1] = speechBounds(f32);
    const ps = pauses(f32).filter(p => p.s > s0 + .1 && p.e < s1 - .1);
    const wts = toks.map(t => t.length + 1), tot = wts.reduce((a, b) => a + b, 0);
    const cum = []; wts.reduce((a, b, i) => (cum[i] = a + b), 0);
    const anchors = [{ k: -1, t: s0 }]; let used = -1;
    toks.forEach((t, k) => {
      if (k === toks.length - 1) return;
      const strong = /[.!?…]["”’)]*$/.test(t), weak = /[,;:—–]["”’)]*$/.test(t);
      if (!strong && !weak) return;
      const exp = s0 + cum[k] / tot * (s1 - s0), tol = strong ? 1.2 : .5;
      let best = -1, bd = 1e9;
      for (let j = used + 1; j < ps.length; j++) { const m = (ps[j].s + ps[j].e) / 2, d = Math.abs(m - exp); if (d < bd && d <= tol) { bd = d; best = j; } }
      if (best >= 0) { used = best; anchors.push({ k, t: ps[best].s, next: ps[best].e }); }
    });
    anchors.push({ k: toks.length - 1, t: s1 });
    const out = [];
    for (let a = 0; a < anchors.length - 1; a++) {
      const A = anchors[a], B = anchors[a + 1];
      const from = A.next != null ? A.next : A.t, to = B.t;
      const ids = []; for (let k = A.k + 1; k <= B.k; k++) ids.push(k);
      const sw = ids.reduce((x, k) => x + wts[k], 0) || 1; let c = from;
      ids.forEach(k => { const d = (to - from) * wts[k] / sw; out.push({ w: toks[k], s: c, e: c + d * .92 }); c += d; });
    }
    return out;
  }

  /* ---------- preparar: áudio, palavras, cenas, legendas ---------- */
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
  async function prepare(P, { onStatus, signal } = {}) {
    try { await Promise.all(["80px Anton", "700 80px Cinzel", "700 40px \"Space Mono\"", "800 40px Figtree"].map(f => document.fonts.load(f))); } catch (e) {}
    const N = P.narr; if (!N || !N.chunks?.length) throw { code: "no_audio", message: "Gere a narração no Estúdio antes de montar." };
    const pcm = [];
    for (let i = 0; i < N.chunks.length; i++) {
      onStatus && onStatus(`abrindo o áudio (${i + 1} de ${N.chunks.length})`);
      const b = await Store.get(`p${P.id}:audio:${i}`);
      if (!b) throw { code: "no_audio", message: `O trecho ${i + 1} da narração sumiu deste navegador. Gere a narração de novo.` };
      pcm.push(await Voice.decode(b));
    }
    const audio = Voice.normalize(Voice.concat(pcm, GAP)), dur = audio.length / SR;
    // palavras com tempo
    let words = [], off = 0, exact = 0;
    const cutP = AI.get().cut.provider;
    for (let i = 0; i < N.chunks.length; i++) {
      if (signal?.aborted) throw { code: "cancelled" };
      const ch = N.chunks[i];
      let ws = ch.words || ch.tw;
      if (!ws && cutP !== "local" && AI.stageReady("cut")) {
        onStatus && onStatus(`marcando o tempo das palavras (${i + 1} de ${N.chunks.length})`);
        try { ws = await Voice.transcribe(await Store.get(`p${P.id}:audio:${i}`), { signal }); if (ws && ws.length) { ch.tw = ws; } } catch (e) { if (e.code === "cancelled") throw e; ws = null; }
      }
      if (ws && ws.length) exact++;
      else ws = localAlign(pcm[i], ch.text);
      ws.forEach(w => words.push({ w: w.w, s: w.s + off, e: w.e + off }));
      off += pcm[i].length / SR + GAP;
    }
    onStatus && onStatus("cortando nas pausas da voz");
    const ps = pauses(audio, .22);
    // cenas: começam onde o trecho delas aparece na fala, ajustadas pra cair numa pausa
    const nw = words.map(w => norm(w.w));
    const sc = P.scenes.length || 1; let from = 0; const starts = [];
    for (let j = 0; j < sc; j++) {
      let t = null;
      if (j === 0) t = 0;
      else {
        const key = (P.scenes[j].trecho || "").split(/\s+/).map(norm).filter(Boolean).slice(0, 4);
        if (key.length >= 2) {
          for (let k = from; k < nw.length - key.length; k++) {
            let ok = 0; key.forEach((x, q) => { if (nw[k + q] === x) ok++; });
            if (ok >= Math.min(3, key.length)) { t = words[k].s; from = k + 1; break; }
          }
        }
        if (t == null) t = dur * j / sc;
      }
      starts.push(t);
    }
    // corrige ordem e duração mínima, e encaixa nas pausas
    let hits = 0;
    for (let j = 1; j < sc; j++) {
      let best = null, bd = 1.5;
      for (const p of ps) { const m = (p.s + p.e) / 2, d = Math.abs(m - starts[j]); if (d < bd) { bd = d; best = m; } }
      if (best != null) { starts[j] = best; hits++; }
      if (starts[j] < starts[j - 1] + 1.5) starts[j] = Math.min(dur - 1, starts[j - 1] + 1.5);
    }
    const scenes = [];
    const col = !!P.board;
    starts.forEach((s, j) => { const e = j < sc - 1 ? starts[j + 1] : dur + .6, len = e - s, k = !col && len > 10 ? Math.ceil(len / 7) : 1;
      for (let m = 0; m < k; m++) { let a = s + len * m / k; if (m > 0) { let best = null, bd = 1.2; for (const p of ps) { const mm = (p.s + p.e) / 2, d = Math.abs(mm - a); if (d < bd) { bd = d; best = mm; } } if (best != null) a = best; }
        scenes.push({ s: a, e: 0, j, v: (j * 2 + m * 3) % 6, beat: col ? P.board.beats[j] : null }); } });
    scenes.forEach((x, i) => x.e = i < scenes.length - 1 ? scenes[i + 1].s : dur + .6);
    // legendas: frases curtas
    const phrases = []; let cur = [];
    words.forEach((w, i) => {
      cur.push(w);
      const nx = words[i + 1];
      if (cur.length >= 4 || /[.!?…,;:]["”’)]*$/.test(w.w) || !nx || nx.s - w.e > .45) { phrases.push(cur); cur = []; }
    });
    const caps = phrases.map((ws, i) => ({ ws, s: ws[0].s, e: Math.min(ws[ws.length - 1].e + .35, phrases[i + 1] ? phrases[i + 1][0].s : 1e9) }));
    // imagens
    onStatus && onStatus("carregando as imagens");
    const assets = {};
    const doc = col && P.board.kind === "doc";
    if (col) for (const a of P.board.assets) { if (a.img !== "ok") continue; const b = await Store.get(`p${P.id}:asset:${a.id}`); try { if (b) assets[a.id] = { bmp: await createImageBitmap(b), real: !!a.real, nome: (a.real || doc) ? a.nome : "" }; } catch (e) {} }
    // documentário: batida sem imagem usa a última imagem válida
    if (doc) { let lastImg = Object.keys(assets)[0] || ""; scenes.forEach(s => { const b = s.beat; if (!b) return; if (b.img && assets[b.img]) lastImg = b.img; else if (b.tipo !== "retrato") b.img = lastImg; }); }
    const bitmaps = [];
    for (let j = 0; j < sc; j++) {
      const b = col ? null : await Store.get(`p${P.id}:scene:${j}`);
      try { bitmaps.push(b ? await createImageBitmap(b) : null); } catch (e) { bitmaps.push(null); }
    }
    // cena sem imagem usa a vizinha mais próxima
    for (let j = 0; j < sc; j++) if (!bitmaps[j]) { for (let d = 1; d < sc; d++) { const v = bitmaps[j - d] || bitmaps[j + d]; if (v) { bitmaps[j] = v; break; } } }
    // forma de onda pra linha do tempo
    const env = envelope(audio, Math.max(480, Math.floor(audio.length / 240))); const mx = Math.max(...env) || 1;
    const wave = Array.from(env).map(v => v / mx);
    // trilha e efeitos sonoros
    const END = (P.kind !== "short" && P.idea && P.idea.mural && P.idea.mural.on) ? 6 : 0;
    const voiceEnd = END ? Voice.concat([audio, new Float32Array(Math.floor(END * SR))]) : audio;
    let mixed = voiceEnd; const snd = P.sound || {};
    if (snd.mood !== "Sem trilha" || snd.sfx) {
      onStatus && onStatus("mixando trilha e efeitos");
      let music = null;
      if (snd.custom) { const mb = await Store.get(`p${P.id}:music:0`); if (mb) try { music = await Sound.custom(mb); } catch (e) {} }
      if (!music && snd.mood && snd.mood !== "Sem trilha") music = await Sound.loop(snd.mood);
      const ev = snd.sfx === false ? [] : doc ? Doc.events(scenes) : col ? scenes.filter((s, i) => i > 0 && i % 2 === 0).map(s => ({ t: s.s - .25, kind: "whoosh", gain: .35 })) : [];
      mixed = await Sound.mix(voiceEnd, { music, events: ev, musicGain: snd.custom ? .14 : .11 });
    }
    return { audio: mixed, voice: audio, endCard: END, dur, words, scenes, caps, bitmaps, assets, mode: doc ? "doc" : col ? "colagem" : "cinema", pauses: ps, hits, exact, chunks: N.chunks.length, wave, nImages: col ? Object.keys(assets).length : sc };
  }

  /* ---------- desenhar um quadro ---------- */
  const cache = new Map();
  function overlays(W, H) {
    const key = W + "x" + H; if (cache.has(key)) return cache.get(key);
    const v = document.createElement("canvas"); v.width = W; v.height = H;
    const g = v.getContext("2d"); const r = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, Math.hypot(W, H) * .55);
    r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = r; g.fillRect(0, 0, W, H);
    const n = document.createElement("canvas"); n.width = n.height = 256; const ng = n.getContext("2d"); const id = ng.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const x = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = x; id.data[i + 3] = 255; }
    ng.putImageData(id, 0, 0);
    const o = { vig: v, noise: n }; cache.set(key, o); return o;
  }
  function drawImg(g, bmp, kind, p, W, H, fallback) {
    if (!bmp) { g.fillStyle = fallback || "#222"; g.fillRect(0, 0, W, H); return; }
    const base = Math.max(W / bmp.width, H / bmp.height), e = Math.min(1.2, Math.max(0, p)), q = e * e * (3 - 2 * Math.min(1, e));
    let z = 1.12, x = 0, y = 0;
    if (kind === 0) z = 1 + .12 * q;
    else if (kind === 1) z = 1.14 - .12 * q;
    else if (kind === 2) { z = 1.14; x = -.5 + q; }
    else if (kind === 3) { z = 1.14; x = .5 - q; y = .2 - .4 * q; }
    else if (kind === 4) { z = 1.18 + .1 * q; x = -.55; y = -.45; }
    else { z = 1.18 + .1 * q; x = .55; y = -.3; }
    const s = base * z, dw = bmp.width * s, dh = bmp.height * s;
    const fx = (W - dw) / 2 + x * (dw - W) * .9, fy = (H - dh) / 2 + y * (dh - H) * .9;
    g.drawImage(bmp, fx, fy, dw, dh);
  }
  // mural de inscritos nos últimos segundos
  function mural(g, t, R, o) {
    const { W, H } = o, card = R.endCard > 0, start = card ? R.dur + .15 : R.dur - 7; if (t < start) return;
    const q = Math.min(1, (t - start) / .8), nomes = (o.mural.nomes || []).slice(0, 18), S2 = Math.min(W, H) / 1080, doc = o.ink === "doc";
    g.save(); g.globalAlpha = card ? 1 : q * .82; g.fillStyle = "#000000"; g.fillRect(0, 0, W, H); g.globalAlpha = q;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = doc ? "#E3A93C" : "#ffffff";
    g.font = `${doc ? "700" : "800"} ${Math.round(52 * S2)}px ${doc ? "Cinzel, Georgia, serif" : "Figtree, Arial, sans-serif"}`;
    g.fillText(nomes.length ? "OBRIGADO AOS NOVOS INSCRITOS" : "SEU NOME PODE APARECER AQUI", W / 2, H * .2);
    g.font = `600 ${Math.round(30 * S2)}px Figtree, Arial, sans-serif`; g.fillStyle = "#d8d3c8";
    if (!nomes.length) g.fillText("Inscreva-se e apareça no mural do próximo vídeo", W / 2, H * .3);
    const cols = W > H ? 3 : 2, rows = Math.ceil(nomes.length / cols), lh = 54 * S2;
    nomes.forEach((n, k) => {
      const c = k % cols, r = Math.floor(k / cols), d = Math.min(1, Math.max(0, (t - start - .5 - k * .12) / .4));
      g.globalAlpha = q * d; g.font = `700 ${Math.round(36 * S2)}px Figtree, Arial, sans-serif`; g.fillStyle = "#ffffff";
      g.fillText(n, W * (c + .5) / cols, H * .52 + (r - (rows - 1) / 2) * lh + (1 - d) * 14 * S2);
    });
    g.restore(); g.textAlign = "start"; g.textBaseline = "alphabetic";
  }
  function frame(g, t, R, o) {
    if (o.mural && R.endCard > 0 && t > R.dur + .15) { mural(g, t, R, o); if (t > R.dur + R.endCard) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (t - R.dur - R.endCard) / .6)})`; g.fillRect(0, 0, o.W, o.H); } return; }
    frame0(g, t, R, o); if (o.mural) mural(g, t, R, o);
  }
  function frame0(g, t, R, o) {
    if (R.mode === "doc") { Doc.frame(g, t, R, o); if (o.captions !== "Sem legenda") drawCaption(g, t, R, o); return; }
    if (R.mode === "colagem") { Collage.frame(g, t, R, o); if (o.captions !== "Sem legenda") drawCaption(g, t, R, o); return; }
    const { W, H } = o, tp = TEMPLATES[o.template] || TEMPLATES["Clean"];
    g.save();
    g.filter = tp.filter || "none";
    let j = 0; while (j < R.scenes.length - 1 && t >= R.scenes[j + 1].s) j++;
    const S0 = R.scenes[j], pj = (t - S0.s) / Math.max(.5, S0.e - S0.s), img = x => R.bitmaps[x.j != null ? x.j : R.scenes.indexOf(x)], kv = (x, i) => x.v != null ? x.v : i % 4;
    if (j > 0 && t - S0.s < XF) {
      const P0 = R.scenes[j - 1]; drawImg(g, img(P0), kv(P0, j - 1), (t - P0.s) / Math.max(.5, P0.e - P0.s), W, H);
      g.globalAlpha = (t - S0.s) / XF;
    }
    drawImg(g, img(S0), kv(S0, j), pj, W, H);
    g.globalAlpha = 1; g.filter = "none"; g.restore();
    const ov = overlays(W, H);
    if (tp.tint) { g.fillStyle = tp.tint; g.fillRect(0, 0, W, H); }
    if (tp.leak) {
      const a = tp.leak * (.7 + .3 * Math.sin(t * .6));
      const r = g.createRadialGradient(W * .15, H * .05, 0, W * .15, H * .05, W * .7);
      r.addColorStop(0, `rgba(255,236,190,${a})`); r.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = r; g.fillRect(0, 0, W, H);
    }
    if (tp.vig) { g.globalAlpha = tp.vig; g.drawImage(ov.vig, 0, 0); g.globalAlpha = 1; }
    if (tp.grain) {
      g.globalAlpha = tp.grain; g.globalCompositeOperation = "overlay";
      const ox = (Math.random() * 256) | 0, oy = (Math.random() * 256) | 0;
      for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(ov.noise, x, y);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    }
    if (t < .5) { g.fillStyle = `rgba(0,0,0,${1 - t / .5})`; g.fillRect(0, 0, W, H); }
    if (t > R.dur) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (t - R.dur) / .6)})`; g.fillRect(0, 0, W, H); }
    if (o.captions !== "Sem legenda") drawCaption(g, t, R, o);
  }
  function drawCaption(g, t, R, o) {
    const { W, H } = o; const c = R.caps.find(c => t >= c.s && t < c.e); if (!c) return;
    const portrait = H > W; let fs = Math.round(portrait ? W * .085 : H * .072);
    g.font = `${fs}px Anton, Impact, "Arial Black", sans-serif`; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    const words = c.ws.map(w => w.w.replace(/[“”"]/g, "").toUpperCase());
    const sp = fs * .28; let widths = words.map(w => g.measureText(w).width); let total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    if (total > W * .86) { const k = W * .86 / total; fs = Math.floor(fs * k); g.font = `${fs}px Anton, Impact, "Arial Black", sans-serif`; widths = words.map(w => g.measureText(w).width); total = widths.reduce((a, b) => a + b, 0) + sp * k * (words.length - 1); }
    let x = (W - total) / 2; const y = portrait ? H * .8 : H * .86;
    const curIdx = c.ws.findIndex(w => t >= w.s && t < w.e + .08);
    const lastSaid = c.ws.reduce((a, w, i) => (t >= w.s ? i : a), -1);
    words.forEach((w, i) => {
      let col = "#ffffff", scale = 1, lift = 0;
      if (o.captions === "Palavra por palavra") { if (i === curIdx || (curIdx < 0 && i === lastSaid)) { col = "#f2c14e"; lift = Math.round(fs * .04); } }
      else if (o.captions === "Karaokê") { if (i <= lastSaid) col = "#f2c14e"; }
      g.save(); g.translate(x + widths[i] / 2, y - (typeof lift === "number" ? lift : 0)); g.scale(scale, scale);
      g.lineWidth = Math.max(4, fs * .14); g.strokeStyle = "rgba(0,0,0,.85)"; g.strokeText(w, -widths[i] / 2, 0);
      g.fillStyle = col; g.fillText(w, -widths[i] / 2, 0); g.restore();
      x += widths[i] + sp * (fs / Math.round(portrait ? W * .085 : H * .072));
    });
  }

  /* ---------- prévia ao vivo ---------- */
  function preview(R, canvas, o, { from = 0, onTime, onEnd } = {}) {
    const ac = new AudioContext({ sampleRate: SR });
    const buf = ac.createBuffer(1, R.audio.length, SR); buf.copyToChannel(R.audio, 0);
    const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
    const t0 = ac.currentTime + .05; src.start(t0, Math.min(from, R.dur));
    const g = canvas.getContext("2d"); let raf, stopped = false;
    const opts = { ...o, W: canvas.width, H: canvas.height };
    const loop = () => { if (stopped) return; const t = from + Math.max(0, ac.currentTime - t0); frame(g, t, R, opts); onTime && onTime(t); if (t >= R.dur + (R.endCard || 0) + .5) { stop(); onEnd && onEnd(); return; } raf = requestAnimationFrame(loop); };
    loop();
    function stop() { stopped = true; cancelAnimationFrame(raf); try { src.stop(); } catch (e) {} ac.close(); }
    return { stop };
  }
  function still(R, canvas, o, t) { frame(canvas.getContext("2d"), t, R, { ...o, W: canvas.width, H: canvas.height }); }

  /* ---------- render final (MP4) ---------- */
  function supported() { return "VideoEncoder" in window && "AudioEncoder" in window && "VideoFrame" in window && !!window.Mp4Muxer; }
  async function pickConfigs(W, H) {
    const vbr = H > W ? 5_000_000 : W > 1280 ? 4_500_000 : 2_800_000;
    const vc = [W * H > 1280 * 720 ? "avc1.640028" : "avc1.4d401f", "avc1.640028", "avc1.4d0028", "avc1.420028"];
    let video = null;
    for (const codec of vc) { const cfg = { codec, width: W, height: H, bitrate: vbr, framerate: FPS, avc: { format: "avc" } }; try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) { video = cfg; break; } } catch (e) {} }
    if (!video) throw { code: "codec", message: "Este navegador não consegue gerar vídeo H.264. Use o Chrome ou o Edge no computador." };
    let audio = null, acodec = null;
    for (const [codec, name] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) {
      const cfg = { codec, sampleRate: SR, numberOfChannels: 1, bitrate: 128000 };
      try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) { audio = cfg; acodec = name; break; } } catch (e) {}
    }
    if (!audio) throw { code: "codec", message: "Este navegador não consegue codificar o áudio. Use o Chrome ou o Edge no computador." };
    return { video, audio, acodec };
  }
  async function render(R, o, { fileHandle, onProgress, signal } = {}) {
    const W = o.res === "short" ? 1080 : o.res === "720p" ? 1280 : 1920, H = o.res === "short" ? 1920 : o.res === "720p" ? 720 : 1080;
    const cfg = await pickConfigs(W, H);
    try { await Promise.all(["80px Anton", "700 80px Cinzel", "700 40px \"Space Mono\"", "800 40px Figtree"].map(f => document.fonts.load(f))); } catch (e) {}
    const writable = fileHandle ? await fileHandle.createWritable() : null;
    const target = writable ? new Mp4Muxer.FileSystemWritableFileStreamTarget(writable) : new Mp4Muxer.ArrayBufferTarget();
    const muxer = new Mp4Muxer.Muxer({ target, fastStart: writable ? false : "in-memory", firstTimestampBehavior: "offset",
      video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: { codec: cfg.acodec, numberOfChannels: 1, sampleRate: SR } });
    let err = null;
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => err = e }); ve.configure(cfg.video);
    const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => err = e }); ae.configure(cfg.audio);
    const totalDur = R.dur + (R.endCard || 0) + .6, audioAll = new Float32Array(Math.ceil(totalDur * SR)); audioAll.set(R.audio.subarray(0, audioAll.length));
    for (let off = 0; off < audioAll.length; off += SR) {
      const n = Math.min(SR, audioAll.length - off);
      const ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round(off / SR * 1e6), data: audioAll.slice(off, off + n) });
      ae.encode(ad); ad.close();
    }
    await ae.flush();
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const g = canvas.getContext("2d", { alpha: false });
    const opts = { ...o, W, H }, total = Math.ceil(totalDur * FPS), t0 = performance.now();
    try {
      for (let f = 0; f < total; f++) {
        if (signal?.aborted) throw { code: "cancelled", message: "Interrompido" };
        if (err) throw { code: "encode", message: "O codificador de vídeo falhou: " + (err.message || err) };
        frame(g, f / FPS, R, opts);
        const vf = new VideoFrame(canvas, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        ve.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
        while (ve.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
        if (f % 15 === 0) {
          const el = (performance.now() - t0) / 1000, sp = (f + 1) / Math.max(.01, el);
          onProgress && onProgress({ f, total, fps: sp, eta: (total - f) / sp, canvas });
          await new Promise(r => setTimeout(r, 0));
        }
      }
      await ve.flush(); muxer.finalize();
      if (writable) { await writable.close(); return { saved: true }; }
      return { blob: new Blob([target.buffer], { type: "video/mp4" }) };
    } catch (e) {
      try { ve.close(); ae.close(); } catch (x) {}
      if (writable) { try { await writable.abort(); } catch (x) {} }
      throw e;
    }
  }

  return { pauses, TEMPLATES, prepare, preview, still, render, supported };
})();
