/* Onion · Documentário cinematográfico
 * Fotos de arquivo tratadas, molduras de filme antigo, nomes com legenda dourada,
 * títulos grandes em serifa dourada, capítulos, citações, cartões de retrato e diagramas.
 */
const Doc = (() => {
  const TPL = {
    "Azul noturno": { filter: "grayscale(.85) contrast(1.12) brightness(.92)", tint: "rgba(28,52,70,.22)", vig: .62, grain: .07 },
    "Arquivo P&B":  { filter: "grayscale(1) contrast(1.18) brightness(.95)", tint: null, vig: .58, grain: .09 },
    "Sépia":        { filter: "sepia(.55) contrast(1.08) brightness(.95)", tint: "rgba(60,40,20,.12)", vig: .6, grain: .08 },
    "Cor natural":  { filter: "saturate(.9) contrast(1.06)", tint: null, vig: .45, grain: .04 }
  };
  const GOLD = "#E3A93C", GOLD2 = "#F2C46A";
  const STYLE = {
    reconstrucao: "Cinematic historical reconstruction, dramatic moody lighting, muted desaturated palette, photographic realism with a slightly painterly documentary-reenactment look, wide 16:9 composition. No text, no captions, no watermark, no logos.",
    diagrama: "Clean 3D isometric architectural cutaway diagram, white clay render on a light grey background, soft ambient occlusion, precise technical illustration style, 16:9. No text, no labels, no watermark.",
    objeto: "Studio photograph of a single historical object on a dark neutral background, dramatic side light, high detail, 16:9. No text, no watermark."
  };

  function storyboardPrompt(P, { maxAssets, maxAI, beats, isShort, reuse, base }) {
    return `Você é o diretor de arte de um documentário de YouTube no estilo "história contada com material de arquivo": fotos e filmes históricos reais tratados em tons frios, molduras de filme antigo, nomes de pessoas com legenda dourada, títulos grandes em serifa dourada nos momentos de impacto, cartões de capítulo, citações e diagramas 3D quando o assunto é um lugar ou uma estrutura.
Canal: ${cfgText()}
Título: "${P.title}".${isShort ? " Formato: SHORT vertical de ~1 minuto, cortes rápidos." : ""}
Roteiro:
"""${scriptText().slice(0, 26000)}"""

Crie:
1) "imagens": no máximo ${maxAssets} imagens, cada uma com:
   - "id" curto (i1, i2…), "nome" (pessoa, lugar ou coisa, em ${P.config.idioma}),
   - "tipo": "real" (foto ou pintura histórica real de domínio público, buscada no Wikimedia Commons) ou "ia" (gerada por IA). Prefira SEMPRE "real" para pessoas, lugares e eventos históricos. Use "ia" no máximo ${maxAI} vezes, só para reconstruções do que não tem foto, diagramas de lugares e objetos.
   - "busca": para "real", termo de busca em inglês, específico (ex.: "Winston Churchill Berlin 1945", "Führerbunker 1947 photo", "Berlin ruins 1945 aerial").
   - "estilo": para "ia": "reconstrucao", "diagrama" ou "objeto".
   - "descricao": para "ia", prompt em inglês da cena. NUNCA reconstrua o rosto de pessoas reais e não imite fotos de arquivo de eventos reais: uma reconstrução deve parecer reconstrução.
   - Pessoas vivas ou que morreram há menos de 70 anos: só como "real" se a foto for de domínio público; senão não use.
${reuse ? `   Use APENAS estas imagens que já existem: ${reuse}\n` : ""}${base ? `   Já existem estas imagens (de um Short do mesmo assunto). Reaproveite com o MESMO id sempre que fizer sentido e crie novas só pro que faltar: ${base}\n` : ""}2) "batidas": cerca de ${beats} batidas consecutivas cobrindo o roteiro inteiro, uma a cada ${isShort ? "2 a 3" : "3 a 5"} segundos de fala. Cada batida:
   - "trecho": as primeiras 6 a 10 palavras daquele pedaço do roteiro, exatamente como estão no texto,
   - "tipo": um destes:
     "foto" (imagem em tela cheia com movimento lento; a maioria das batidas),
     "filme" (imagem dentro de uma moldura de filme antigo, bom pra cenas de época),
     "nome" (primeira vez que uma pessoa aparece: foto + nome em dourado + quem ela é),
     "titulo" (momento de impacto: 1 a 3 palavras gigantes em dourado sobre a foto),
     "data" (uma data ou ano importante em destaque),
     "capitulo" (início de cada parte da história),
     "citacao" (frase marcante de alguém, entre aspas),
     "retrato" (1 a 3 retratos em cartões com os nomes, pra apresentar pessoas),
     "diagrama" (diagrama 3D com uma etiqueta curta),
   - "img": id da imagem principal; "imgs": lista de ids para "retrato",
   - "texto": nome, título, data, capítulo ou citação conforme o tipo (curto; em ${P.config.idioma}),
   - "subtexto": complemento curto (ex.: cargo da pessoa, "Cidade em *RUÍNAS*", número do capítulo). Palavras entre *asteriscos* ficam em dourado.
   Varie os tipos como num documentário profissional: muitas "foto", "nome" sempre que alguém novo entra, "titulo"/"data" nos picos, "capitulo" em cada virada.
Responda só com JSON: {"imagens":[...],"batidas":[...]}`;
  }

  /* ---------- desenho ---------- */
  const ease = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  function cover(g, bmp, W, H, p, kind, x0 = 0, y0 = 0, w0 = W, h0 = H) {
    if (!bmp) return;
    const base = Math.max(w0 / bmp.width, h0 / bmp.height), q = Math.min(1.2, Math.max(0, p));
    let z = 1.06 + .1 * q, dx = 0, dy = 0;
    if (kind % 3 === 1) { z = 1.16 - .1 * q; } else if (kind % 3 === 2) { z = 1.12; dx = (q - .5) * .06; }
    const s = base * z, w = bmp.width * s, h = bmp.height * s;
    g.drawImage(bmp, x0 + (w0 - w) / 2 + dx * w0, y0 + (h0 - h) / 2 + dy * h0, w, h);
  }
  function rich(g, text, x, y, fs, align, ink) {
    const parts = String(text).split(/(\*[^*]+\*)/).filter(Boolean);
    const font = b => `${b ? 800 : 600} ${fs}px Figtree, Arial, sans-serif`;
    let total = 0; parts.forEach(p => { g.font = font(p.startsWith("*")); total += g.measureText(p.replace(/\*/g, "")).width; });
    let cx = align === "center" ? x - total / 2 : x; g.textAlign = "left";
    parts.forEach(p => { const b = p.startsWith("*"); g.font = font(b); g.fillStyle = b ? GOLD2 : ink; const t = p.replace(/\*/g, ""); g.fillText(b ? t.toUpperCase() : t, cx, y); cx += g.measureText(b ? t.toUpperCase() : t).width; });
  }
  // *palavra* = destaque: a palavra sai em branco no meio do dourado (sem mostrar os asteriscos)
  function serif(g, text, x, y, fs, color, align = "center", spacing = 0) {
    g.font = `700 ${fs}px Cinzel, "Playfair Display", Georgia, serif`; g.fillStyle = color;
    if ("letterSpacing" in g) g.letterSpacing = spacing + "px";
    g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = fs * .25;
    const parts = String(text).split(/(\*[^*]+\*)/).filter(Boolean).map(p => ({ t: p.replace(/\*/g, ""), hi: /^\*.*\*$/.test(p) }));
    if (parts.length <= 1 && !(parts[0] && parts[0].hi)) { g.textAlign = align; g.fillText(String(text).replace(/\*/g, ""), x, y); }
    else {
      const total = parts.reduce((a, p) => a + g.measureText(p.t).width, 0);
      let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x; g.textAlign = "left";
      parts.forEach(p => { g.fillStyle = p.hi ? "#ffffff" : color; g.fillText(p.t, cx, y); cx += g.measureText(p.t).width; });
    }
    g.shadowBlur = 0; if ("letterSpacing" in g) g.letterSpacing = "0px";
  }
  function wrap(g, text, maxW) { const ws = String(text).split(/\s+/), lines = []; let l = ""; ws.forEach(w => { const t = l ? l + " " + w : w; if (g.measureText(t.replace(/\*/g, "")).width > maxW && l) { lines.push(l); l = w; } else l = t; }); if (l) lines.push(l); return lines; }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function drawBeat(g, b, R, t0, t, W, H, tp, j) {
    const S = Math.min(W, H) / 1080, portrait = H > W, p = t - t0, img = R.assets[b.img]?.bmp, dur = Math.max(1, b._len || 4);
    const prog = p / dur, ty = b.tipo || "foto";
    g.save(); g.filter = tp.filter;
    if (ty === "filme") {
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      const fw = W * (portrait ? .9 : .74), fh = portrait ? fw * .75 : H * .8, fx = (W - fw) / 2, fy = (H - fh) / 2;
      g.save(); roundRect(g, fx, fy, fw, fh, 26 * S); g.clip(); cover(g, img, W, H, prog, j, fx, fy, fw, fh);
      g.filter = "none"; const glow = g.createRadialGradient(W / 2, H / 2, fh * .35, W / 2, H / 2, fh * .75); glow.addColorStop(0, "rgba(0,0,0,0)"); glow.addColorStop(1, "rgba(0,0,0,.65)"); g.fillStyle = glow; g.fillRect(fx, fy, fw, fh);
      g.globalAlpha = .05 + .04 * Math.sin(t * 37); g.fillStyle = "#fff"; g.fillRect(fx, fy, fw, fh); g.globalAlpha = 1; g.restore();
    } else if (ty === "retrato") {
      g.filter = "none"; g.fillStyle = "#0b0d10"; g.fillRect(0, 0, W, H);
      const ids = (b.imgs && b.imgs.length ? b.imgs : [b.img]).filter(id => R.assets[id]).slice(0, 3), n = ids.length || 1;
      const cw = Math.min(W * (portrait ? .42 : .2), H * .34), ch = cw * 1.25, gap = cw * .25, tot = n * cw + (n - 1) * gap;
      ids.forEach((id, i) => {
        const a = R.assets[id], q = ease((p - i * .15) / .45); if (q <= 0) return;
        const x = (W - tot) / 2 + i * (cw + gap), y = (portrait ? H * .38 : H * .32) + (1 - q) * 40 * S;
        g.save(); g.globalAlpha = q; g.translate(x + cw / 2, y + ch / 2); g.rotate((i % 2 ? 2.2 : -2.4) * Math.PI / 180);
        g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30 * S; g.fillStyle = "#f2f0ea"; g.fillRect(-cw / 2 - 8 * S, -ch / 2 - 8 * S, cw + 16 * S, ch + 16 * S); g.shadowBlur = 0;
        g.beginPath(); g.rect(-cw / 2, -ch / 2, cw, ch); g.clip(); g.filter = tp.filter; cover(g, a.bmp, cw, ch, .3, 0, -cw / 2, -ch / 2, cw, ch); g.restore();
        g.save(); g.globalAlpha = q; const nm = (a.nome || "").toUpperCase(), fs = Math.round(34 * S); g.font = `700 ${fs}px Cinzel, Georgia, serif`;
        const lines = wrap(g, nm, cw * 1.2); lines.forEach((l, k) => serif(g, l, x + cw / 2, y - 22 * S - (lines.length - 1 - k) * fs * 1.05, fs, GOLD2)); g.restore();
      });
    } else {
      cover(g, img, W, H, prog, j);
    }
    g.restore(); g.filter = "none";
    // tratamento da imagem
    if (tp.tint && ty !== "retrato") { g.fillStyle = tp.tint; g.fillRect(0, 0, W, H); }
    // textos por tipo
    const ink = "#ffffff";
    if (ty === "nome") {
      const q = ease((p - .2) / .45), nm = (b.texto || "").toUpperCase(), fs = Math.round((portrait ? 56 : 62) * S);
      const lg = g.createLinearGradient(0, 0, W * .55, 0); lg.addColorStop(0, "rgba(0,0,0,.55)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, W * .6, H);
      g.font = `700 ${fs}px Cinzel, Georgia, serif`; const lines = wrap(g, nm, W * (portrait ? .7 : .32));
      const bx = W * (portrait ? .08 : .07), by = H * (portrait ? .62 : .5) - lines.length * fs * .55;
      g.save(); g.globalAlpha = q;
      g.fillStyle = "rgba(10,10,12,.82)"; g.fillRect(bx - 18 * S, by - fs * .95, Math.max(...lines.map(l => g.measureText(l).width)) + 36 * S, lines.length * fs * 1.08 + 22 * S);
      lines.forEach((l, k) => serif(g, l, bx, by + k * fs * 1.08, fs, GOLD, "left"));
      if (b.subtexto) { const n2 = Math.floor(b.subtexto.length * Math.min(1, Math.max(0, (p - .55) / .7))); let sub = b.subtexto.slice(0, n2); if ((sub.match(/\*/g) || []).length % 2) sub += "*"; rich(g, sub, bx, by + lines.length * fs * 1.08 + 30 * S, Math.round(30 * S), "left", ink); }
      g.restore();
    } else if (ty === "titulo" || ty === "data") {
      g.fillStyle = "rgba(0,0,0,.42)"; g.fillRect(0, 0, W, H);
      const q = ease((p - .05) / .5), txt = (b.texto || "").toUpperCase(), fs0 = Math.round((ty === "data" ? (portrait ? 84 : 96) : (portrait ? 110 : 150)) * S);
      g.font = `700 ${fs0}px Cinzel, Georgia, serif`; const fs = Math.min(fs0, Math.floor(fs0 * W * .86 / Math.max(1, g.measureText(txt.replace(/\*/g, "")).width)));
      g.save(); g.globalAlpha = q; g.translate(W / 2, H / 2); g.scale(1.06 - .06 * q, 1.06 - .06 * q);
      if (ty === "data") { g.font = `700 ${fs}px Cinzel, Georgia, serif`; const tw = g.measureText(txt.replace(/\*/g, "")).width; g.fillStyle = "rgba(8,8,10,.85)"; g.fillRect(-tw / 2 - 30 * S, -fs * .78, tw + 60 * S, fs * 1.15); }
      serif(g, txt, 0, fs * .32, fs, GOLD, "center", ty === "titulo" ? 4 * S : 1);
      if (b.subtexto) rich(g, b.subtexto, 0, fs * .32 + 70 * S, Math.round(40 * S), "center", ink);
      g.restore();
    } else if (ty === "capitulo") {
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, W, H);
      const q = ease((p - .15) / .6), fs = Math.round((portrait ? 76 : 104) * S); g.font = `700 ${fs}px Cinzel, Georgia, serif`;
      const lines = wrap(g, (b.texto || "").toUpperCase(), W * (portrait ? .8 : .55));
      g.save(); g.globalAlpha = q; const x = W * (portrait ? .1 : .1), y0 = H / 2 - lines.length * fs * .5;
      if (b.subtexto) { g.font = `600 ${Math.round(30 * S)}px Cinzel, Georgia, serif`; g.fillStyle = "#e8e2d6"; g.textAlign = "left"; g.fillText(b.subtexto.toUpperCase(), x, y0 - 20 * S); }
      lines.forEach((l, k) => serif(g, l, x, y0 + (k + 1) * fs * 1.02, fs, GOLD, "left")); g.restore();
    } else if (ty === "citacao") {
      g.fillStyle = "rgba(0,0,0,.66)"; g.fillRect(0, 0, W, H);
      const q = ease((p - .1) / .7), fs = Math.round((portrait ? 54 : 64) * S); g.font = `700 ${fs}px Cinzel, Georgia, serif`;
      const lines = wrap(g, `“${(b.texto || "").replace(/^["“]|["”]$/g, "").toUpperCase()}”`, W * .78);
      g.save(); g.globalAlpha = q; lines.forEach((l, k) => serif(g, l, W / 2, H / 2 + (k - (lines.length - 1) / 2) * fs * 1.15, fs, GOLD));
      if (b.subtexto) rich(g, "— " + b.subtexto, W / 2, H / 2 + lines.length * fs * .65 + 40 * S, Math.round(30 * S), "center", "#ddd"); g.restore();
    } else if (ty === "diagrama" && b.texto) {
      const lbl = b.texto.replace(/\*/g, ""), n2 = Math.floor(lbl.length * Math.min(1, Math.max(0, (p - .4) / .8)));
      g.font = `700 ${Math.round(40 * S)}px "Space Mono", "Courier New", monospace`; g.fillStyle = "#f4f4f4"; g.textAlign = "left";
      g.shadowColor = "rgba(0,0,0,.7)"; g.shadowBlur = 10 * S; g.fillText(lbl.toUpperCase().slice(0, n2), W * .58, H * .72); g.shadowBlur = 0;
    } else if ((ty === "foto" || ty === "filme") && b.texto) {
      const q = ease((p - .2) / .5); g.save(); g.globalAlpha = q;
      serif(g, b.texto.toUpperCase(), W / 2, H * (portrait ? .3 : .5), Math.round((portrait ? 70 : 84) * S), GOLD, "center", 2 * S);
      if (b.subtexto) rich(g, b.subtexto, W / 2, H * (portrait ? .3 : .5) + 56 * S, Math.round(40 * S), "center", ink);
      g.restore();
    }
    g.textAlign = "start";
  }
  let noise = null;
  function frame(g, t, R, o) {
    const { W, H } = o, tp = TPL[o.template] || TPL["Azul noturno"];
    let j = 0; while (j < R.scenes.length - 1 && t >= R.scenes[j + 1].s) j++;
    const S0 = R.scenes[j]; const b = S0.beat || {}; b._len = S0.e - S0.s;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const into = t - S0.s, hard = /titulo|capitulo|data/.test(b.tipo || "");
    if (j > 0 && into < .35 && !hard) {
      const P0 = R.scenes[j - 1], pb = P0.beat || {}; pb._len = P0.e - P0.s;
      drawBeat(g, pb, R, P0.s, t, W, H, tp, j - 1); g.globalAlpha = into / .35; drawBeat(g, b, R, S0.s, t, W, H, tp, j); g.globalAlpha = 1;
    } else drawBeat(g, b, R, S0.s, t, W, H, tp, j);
    if (hard && into < .12) { g.fillStyle = `rgba(255,255,255,${.5 * (1 - into / .12)})`; g.fillRect(0, 0, W, H); }
    // vinheta, grão e leve tremor de luz
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .6); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${tp.vig})`); g.fillStyle = v; g.fillRect(0, 0, W, H);
    if (!noise) { noise = document.createElement("canvas"); noise.width = noise.height = 256; const ng = noise.getContext("2d"), id = ng.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const x = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = x; id.data[i + 3] = 255; } ng.putImageData(id, 0, 0); }
    g.globalAlpha = tp.grain; g.globalCompositeOperation = "overlay"; const ox = (Math.random() * 256) | 0, oy = (Math.random() * 256) | 0;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(noise, x, y);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = .025 * Math.random(); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    if (t < .6) { g.fillStyle = `rgba(0,0,0,${1 - t / .6})`; g.fillRect(0, 0, W, H); }
    if (t > R.dur) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (t - R.dur) / .6)})`; g.fillRect(0, 0, W, H); }
  }
  // efeitos sonoros conforme o tipo da batida
  function events(scenes) {
    const ev = []; let last = -9;
    scenes.forEach((s, i) => {
      const ty = (s.beat && s.beat.tipo) || "foto";
      if (i === 0) return;
      if (ty === "capitulo") { ev.push({ t: s.s - 1.7, kind: "riser", gain: .8 }, { t: s.s, kind: "impact", gain: 1 }); last = s.s; }
      else if (ty === "titulo" || ty === "data") { ev.push({ t: s.s, kind: "impact", gain: .8 }); last = s.s; }
      else if (ty === "retrato") { ev.push({ t: s.s + .05, kind: "shutter", gain: .8 }); last = s.s; }
      else if (s.s - last > 2.2) { ev.push({ t: s.s - .3, kind: "whoosh", gain: .55 }); last = s.s; }
    });
    return ev;
  }
  return { TPL, STYLE, storyboardPrompt, frame, events };
})();
