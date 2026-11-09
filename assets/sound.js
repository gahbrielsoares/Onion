/* Onion · trilha e efeitos sonoros
 * Trilhas geradas aqui mesmo (sem direitos autorais), efeitos de transição
 * e mixagem com a música abaixando sozinha quando a voz fala.
 */
const Sound = (() => {
  const SR = 48000;
  const MOODS = {
    "Tensão (documentário)": { chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], cut: 700, pulse: true, wave: "sawtooth", rev: 3.2, gain: .9 },
    "Mistério":              { chords: [[50, 53, 57], [51, 55, 58], [50, 53, 56], [46, 50, 53]], cut: 520, pulse: false, wave: "sawtooth", rev: 4.5, gain: .85 },
    "Leve (curiosidades)":   { chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], cut: 1600, pulse: false, wave: "triangle", rev: 2.2, gain: .8 },
    "Inspirador":            { chords: [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]], cut: 1200, pulse: false, wave: "triangle", rev: 3.5, gain: .85 }
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function impulse(ctx, secs, decay) {
    const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  const cache = new Map();

  // um loop de 64 s (4 acordes de 8 s, duas voltas) que depois é repetido com emenda suave
  async function loop(mood) {
    if (cache.has(mood)) return cache.get(mood);
    const M = MOODS[mood] || MOODS["Tensão (documentário)"], L = 64, ctx = new OfflineAudioContext(2, SR * L, SR);
    const master = ctx.createGain(); master.gain.value = M.gain;
    const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, M.rev, 2.5);
    const wet = ctx.createGain(); wet.gain.value = .45; master.connect(ctx.destination); master.connect(rev); rev.connect(wet); wet.connect(ctx.destination);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = M.cut; lp.Q.value = .6; lp.connect(master);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .05; lfoG.gain.value = M.cut * .35; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    for (let k = 0; k < 8; k++) {
      const ch = M.chords[k % 4], t0 = k * 8;
      ch.forEach((m, i) => [-6, 6].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = M.wave; o.frequency.value = hz(m); o.detune.value = det + i;
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.05, t0 + 2.2); g.gain.setValueAtTime(.05, t0 + 6.5); g.gain.linearRampToValueAtTime(0, t0 + 9.8);
        o.connect(g); g.connect(lp); o.start(t0); o.stop(Math.min(L, t0 + 10));
      }));
      const sub = ctx.createOscillator(), sg = ctx.createGain(); sub.type = "sine"; sub.frequency.value = hz(ch[0] - 12);
      sg.gain.setValueAtTime(0, t0); sg.gain.linearRampToValueAtTime(.09, t0 + 2); sg.gain.setValueAtTime(.09, t0 + 6.5); sg.gain.linearRampToValueAtTime(0, t0 + 9.8);
      sub.connect(sg); sg.connect(master); sub.start(t0); sub.stop(Math.min(L, t0 + 10));
      if (M.pulse) for (let b = 0; b < 4; b++) {
        const tb = t0 + b * 2, o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(70, tb); o.frequency.exponentialRampToValueAtTime(38, tb + .35);
        g.gain.setValueAtTime(.0001, tb); g.gain.exponentialRampToValueAtTime(.16, tb + .02); g.gain.exponentialRampToValueAtTime(.0001, tb + .6);
        o.connect(g); g.connect(master); o.start(tb); o.stop(tb + .7);
      }
    }
    const buf = await ctx.startRendering(); const a = buf.getChannelData(0), b = buf.getChannelData(1), out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    cache.set(mood, out); return out;
  }

  /* ---------- efeitos ---------- */
  function noiseBuf(ctx, secs) { const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  async function render(secs, build) { const ctx = new OfflineAudioContext(1, Math.floor(SR * secs), SR); build(ctx); return (await ctx.startRendering()).getChannelData(0).slice(); }
  async function sfx(kind) {
    if (cache.has("sfx:" + kind)) return cache.get("sfx:" + kind);
    let out;
    if (kind === "whoosh") out = await render(.8, ctx => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, .8);
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4; f.frequency.setValueAtTime(350, 0); f.frequency.exponentialRampToValueAtTime(3200, .38); f.frequency.exponentialRampToValueAtTime(600, .78);
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, 0); g.gain.exponentialRampToValueAtTime(.9, .36); g.gain.exponentialRampToValueAtTime(.0001, .78);
      s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    });
    else if (kind === "impact") out = await render(2.2, ctx => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(110, 0); o.frequency.exponentialRampToValueAtTime(32, 1.2);
      og.gain.setValueAtTime(1, 0); og.gain.exponentialRampToValueAtTime(.0001, 1.9); o.connect(og);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, 2.2); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(2500, 0); f.frequency.exponentialRampToValueAtTime(200, .5);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(.7, 0); ng.gain.exponentialRampToValueAtTime(.0001, .6); s.connect(f); f.connect(ng);
      const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 2, 3); const wet = ctx.createGain(); wet.gain.value = .5;
      [og, ng].forEach(n => { n.connect(ctx.destination); n.connect(rev); }); rev.connect(wet); wet.connect(ctx.destination); o.start(); s.start();
    });
    else if (kind === "riser") out = await render(1.8, ctx => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, 1.8); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3;
      f.frequency.setValueAtTime(300, 0); f.frequency.exponentialRampToValueAtTime(6000, 1.75);
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, 0); g.gain.exponentialRampToValueAtTime(.6, 1.7); g.gain.linearRampToValueAtTime(0, 1.8);
      s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    });
    else out = await render(.25, ctx => {   // "shutter": clique de foto/projetor
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx, .25); const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800;
      const g = ctx.createGain(); g.gain.setValueAtTime(.8, 0); g.gain.exponentialRampToValueAtTime(.0001, .05); g.gain.setValueAtTime(.5, .09); g.gain.exponentialRampToValueAtTime(.0001, .16);
      s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    });
    cache.set("sfx:" + kind, out); return out;
  }

  /* ---------- mixagem ---------- */
  // voice: Float32 48k. events: [{t, kind}]. music: Float32 (qualquer duração, é repetida)
  async function mix(voice, { music, events = [], musicGain = .11, sfxGain = .3 }) {
    const n = voice.length + Math.floor(SR * 1.2), out = new Float32Array(n);
    out.set(voice);
    if (music && music.length) {
      // envelope da voz (abaixa a música quando há fala)
      const hop = 480, env = new Float32Array(Math.ceil(n / hop));
      for (let i = 0; i < env.length; i++) { let s = 0; const o = i * hop; for (let j = 0; j < hop && o + j < voice.length; j++) s += voice[o + j] * voice[o + j]; env[i] = Math.sqrt(s / hop) > .02 ? 1 : 0; }
      let g = musicGain * 1.6; const xf = SR * 2, L = music.length;
      for (let i = 0; i < n; i++) {
        if (i % hop === 0) { const target = env[(i / hop) | 0] ? musicGain : musicGain * 1.8; g += (target - g) * .08; }
        // repetição com emenda suave
        const p = i % (L - xf), m = p < xf && i >= L - xf ? music[p] * (p / xf) + music[p + L - xf] * (1 - p / xf) : music[p];
        out[i] += m * g * (i < SR * 1.5 ? i / (SR * 1.5) : 1) * (i > n - SR * 2 ? (n - i) / (SR * 2) : 1);
      }
    }
    for (const ev of events) {
      const s = await sfx(ev.kind), o = Math.floor(ev.t * SR), gain = sfxGain * (ev.gain || 1);
      for (let i = 0; i < s.length && o + i < n; i++) if (o + i >= 0) out[o + i] += s[i] * gain;
    }
    // limitador simples
    for (let i = 0; i < n; i++) { const x = out[i]; out[i] = x > .95 ? .95 + (x - .95) * .1 : x < -.95 ? -.95 + (x + .95) * .1 : x; }
    return out;
  }
  async function custom(blob) { return Voice.decode(blob); }

  return { MOODS, loop, sfx, mix, custom };
})();
