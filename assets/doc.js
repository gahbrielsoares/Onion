/* Onion · Documentário cinematográfico
 * Fotos de arquivo tratadas, molduras de filme antigo, nomes com legenda dourada,
 * títulos grandes em serifa dourada, capítulos, citações, cartões de retrato e diagramas.
 */
const Doc = (() => {
  const TPL = {
    "Azul noturno": { filter: "grayscale(.85) contrast(1.12) brightness(.92)", tint: "rgba(28,52,70,.22)", vig: .62, grain: .07 },
    "Arquivo P&B":  { filter: "grayscale(1) contrast(1.18) brightness(.95)", tint: null, vig: .58, grain: .09 },
    "Sépia":        { filter: "sepia(.55) contrast(1.08) brightness(.95)", tint: "rgba(60,40,20,.12)", vig: .6, grain: .08 },
    "Cor natural":  { filter: "saturate(.9) contrast(1.06)", tint: null, vig: .45, grain: .04 },
    "Natural limpo":   { theme: "moderno", filter: "saturate(1.05) contrast(1.04)", tint: null, vig: .22, grain: 0 },
    "Frio azulado":    { theme: "moderno", filter: "saturate(.95) contrast(1.06)", tint: "rgba(30,60,110,.12)", vig: .3, grain: 0 },
    "Quente":          { theme: "moderno", filter: "saturate(1.08) contrast(1.03)", tint: "rgba(255,170,90,.08)", vig: .3, grain: 0, accent: "#FF8A3D" },
    "Noturno moderno": { theme: "moderno", filter: "brightness(.9) saturate(.9) contrast(1.1)", tint: "rgba(10,20,40,.2)", vig: .45, grain: .02 },
    "Vibrante":        { theme: "promocional", filter: "saturate(1.25) contrast(1.08)", tint: null, vig: .12, grain: 0 },
    "Elegante preto e dourado": { theme: "promocional", filter: "contrast(1.1) saturate(.8)", tint: "rgba(0,0,0,.2)", vig: .45, grain: 0, accent: "#D4AF37", accent2: "#ffffff" },
    "Clean claro":     { theme: "promocional", filter: "brightness(1.05) saturate(1.05)", tint: null, vig: 0, grain: 0, accent: "#FF5A5F" },
    "Neon":            { theme: "promocional", filter: "saturate(1.3) contrast(1.15)", tint: "rgba(80,0,120,.15)", vig: .35, grain: 0, accent: "#39FF14", accent2: "#FF2BD6" },
    "Cores vivas":     { theme: "cinetico", filter: "saturate(1.1)", tint: null, vig: 0, grain: 0, palette: ["#FF5A5F", "#4F8CFF", "#2EC4B6", "#9B5DE5", "#F15BB5"], accent: "#FFFFFF", accent2: "#FFD23F" },
    "Preto e amarelo": { theme: "cinetico", filter: "contrast(1.05)", tint: null, vig: .2, grain: 0, palette: ["#111111", "#1a1a1a"], accent: "#FFD23F", accent2: "#FFFFFF" },
    "Pastel":          { theme: "cinetico", filter: "saturate(1)", tint: null, vig: 0, grain: 0, palette: ["#FFD6E0", "#C1E7E3", "#FFF1B6", "#D7C9FF"], accent: "#1d1d1d", accent2: "#5a3df0", ink: "#1d1d1d" }
  };
  const DEF = { documentario: "Azul noturno", moderno: "Natural limpo", promocional: "Vibrante", cinetico: "Cores vivas" };
  const tplFor = v => Object.keys(TPL).filter(k => (TPL[k].theme || "documentario") === (v || "documentario"));
  let GOLD = "#E3A93C", GOLD2 = "#F2C46A", TF = `Cinzel, "Playfair Display", Georgia, serif`, TW = 700, TH_ = null;
  const THEMES = {
    documentario: { font: `Cinzel, "Playfair Display", Georgia, serif`, w: 700, a: "#E3A93C", a2: "#F2C46A", upper: true, film: true, box: "dark" },
    moderno:      { font: `Figtree, Arial, sans-serif`, w: 800, a: "#4F8CFF", a2: "#9CC2FF", upper: false, film: false, box: "bar" },
    promocional:  { font: `Anton, Impact, sans-serif`, w: 400, a: "#FFD23F", a2: "#FF5A5F", upper: true, film: false, box: "sticker" },
    cinetico:     { font: `Anton, Impact, sans-serif`, w: 400, a: "#FFD23F", a2: "#FFFFFF", upper: true, film: false, box: "none", solid: true }
  };
  function setTheme(v) { const t = THEMES[v] || THEMES.documentario; TH_ = t; GOLD = t.a; GOLD2 = t.a2; TF = t.font; TW = t.w; }
  const STYLE = {
    reconstrucao: "Cinematic historical reconstruction, dramatic moody lighting, muted desaturated palette, photographic realism with a slightly painterly documentary-reenactment look, wide 16:9 composition. No text, no captions, no watermark, no logos.",
    diagrama: "Clean 3D isometric architectural cutaway diagram, white clay render on a light grey background, soft ambient occlusion, precise technical illustration style, 16:9. No text, no labels, no watermark.",
    objeto: "Studio photograph of a single historical object on a dark neutral background, dramatic side light, high detail, 16:9. No text, no watermark.",
    produto: "Clean commercial product photography, soft studio lighting, appealing realistic colors, simple elegant background, 16:9. No text, no logos, no watermark.",
    moderno: "Modern editorial photograph, natural light, realistic colors, clean composition, 16:9. No text, no watermark."
  };

  const INTRO = {
    documentario: `um documentário de YouTube no estilo "história contada com material de arquivo": fotos e filmes históricos reais tratados em tons frios, molduras de filme antigo, nomes de pessoas com legenda dourada, títulos grandes em serifa dourada nos momentos de impacto, cartões de capítulo, citações e diagramas 3D quando o assunto é um lugar ou uma estrutura.`,
    moderno: `um vídeo moderno e limpo: fotos atuais e de boa qualidade em tela cheia, nomes e títulos em tipografia moderna, cartões de capítulo e diagramas quando ajudarem a explicar.`,
    promocional: `um vídeo promocional de marca/loja: imagens do produto, da loja e de clientes, títulos curtos de benefício e de oferta em destaque (tipo "titulo", ex.: "50% OFF", "FRETE GRÁTIS"), preço ou condição no "subtexto", e a última batida sempre uma chamada pra ação (ex.: "COMPRE AGORA", "CHAMA NO WHATSAPP", "LINK NA BIO"). Imagens de produto são "ia" com estilo "produto" (o criador pode trocar pelas fotos reais dele).`,
    cinetico: `um vídeo de "texto em destaque": a MAIORIA das batidas (uns 70%) é "titulo" ou "citacao" com 1 a 5 palavras fortes que acompanham a fala, sobre fundo de cor lisa; imagens só em umas 30% das batidas, como apoio.`
  };
  function storyboardPrompt(P, { maxAssets, maxAI, beats, isShort, reuse, base }) {
    const v = (P.config && P.config.visual) || "documentario";
    return `Você é o diretor de arte de ${INTRO[v] || INTRO.documentario}
Canal: ${cfgText()}
Título: "${P.title}".${isShort ? " Formato: SHORT vertical de ~1 minuto, cortes rápidos." : ""}
Roteiro:
"""${scriptText().slice(0, 26000)}"""

Crie:
1) "imagens": no máximo ${maxAssets} imagens, cada uma com:
   - "id" curto (i1, i2…), "nome" (pessoa, lugar ou coisa, em ${P.config.idioma}),
   - "tipo": "real" (foto ou pintura histórica real de domínio público, buscada no Wikimedia Commons) ou "ia" (gerada por IA). Prefira SEMPRE "real" para pessoas, lugares e eventos históricos. Use "ia" no máximo ${maxAI} vezes, só para reconstruções do que não tem foto, diagramas de lugares e objetos.
   - "busca": termo de busca CURTO, de 2 a 5 palavras, do jeito que uma pessoa digitaria no Google (ex.: "Winston Churchill 1945", "Führerbunker", "Berlim ruínas 1945"). Nada de frases longas cheias de detalhes.
   - "busca_ampla": uma versão ainda mais genérica, de 1 a 3 palavras, pra quando a primeira não achar (ex.: "cangaceiros mortos", "bunker", "Berlim 1945").
   - "estilo": para "ia": "reconstrucao", "diagrama", "objeto", "produto" ou "moderno".
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
    g.font = `${TW} ${fs}px ${TF}`; g.fillStyle = color;
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
    const prog = p / dur, ty0 = b.tipo || "foto", ty = (ty0 === "filme" && !TH_.film) ? "foto" : ty0;
    g.save(); g.filter = tp.filter;
    // texto em destaque / sem imagem: fundo de cor lisa da paleta do template
    if ((TH_.solid && (!img || /titulo|data|capitulo|citacao/.test(ty))) || (!img && ty !== "retrato")) {
      const pal = tp.palette || ["#111318"]; g.filter = "none"; g.fillStyle = pal[j % pal.length]; g.fillRect(0, 0, W, H);
      if (img && !TH_.solid) cover(g, img, W, H, prog, j);
      else if (img) { const cw = W * (portrait ? .8 : .42), ch = cw * .62, cx = (W - cw) / 2, cy = portrait ? H * .56 : H * .5 - ch * .1; g.save(); roundRect(g, cx, cy, cw, ch, 22 * S); g.clip(); cover(g, img, W, H, prog, j, cx, cy, cw, ch); g.restore(); }
    } else if (ty === "filme") {
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
        g.save(); g.globalAlpha = q; const nm = (a.nome || "").toUpperCase(), fs = Math.round(34 * S); g.font = `${TW} ${fs}px ${TF}`;
        const lines = wrap(g, nm, cw * 1.2); lines.forEach((l, k) => serif(g, l, x + cw / 2, y - 22 * S - (lines.length - 1 - k) * fs * 1.05, fs, GOLD2)); g.restore();
      });
    } else {
      cover(g, img, W, H, prog, j);
    }
    g.restore(); g.filter = "none";
    // tratamento da imagem
    if (tp.tint && ty !== "retrato") { g.fillStyle = tp.tint; g.fillRect(0, 0, W, H); }
    // textos por tipo
    const ink = tp.ink || "#ffffff", solidBg = TH_.solid && (!img || /titulo|data|capitulo|citacao/.test(ty));
    if (ty === "nome") {
      const q = ease((p - .2) / .45), nm = (b.texto || "").toUpperCase(), fs = Math.round((portrait ? 56 : 62) * S);
      const lg = g.createLinearGradient(0, 0, W * .55, 0); lg.addColorStop(0, "rgba(0,0,0,.55)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(0, 0, W * .6, H);
      g.font = `${TW} ${fs}px ${TF}`; const lines = wrap(g, nm, W * (portrait ? .7 : .32));
      const bx = W * (portrait ? .08 : .07), by = H * (portrait ? .62 : .5) - lines.length * fs * .55;
      g.save(); g.globalAlpha = q;
      const bw = Math.max(...lines.map(l => g.measureText(l.replace(/\*/g, "")).width)) + 36 * S, bh = lines.length * fs * 1.08 + 22 * S;
      if (TH_.box === "bar") { g.fillStyle = GOLD; g.fillRect(bx - 22 * S, by - fs * .95, 8 * S, bh); }
      else if (TH_.box === "sticker") { g.fillStyle = GOLD; g.fillRect(bx - 18 * S, by - fs * .95, bw, bh); }
      else { g.fillStyle = "rgba(10,10,12,.82)"; g.fillRect(bx - 18 * S, by - fs * .95, bw, bh); }
      lines.forEach((l, k) => serif(g, l, bx, by + k * fs * 1.08, fs, TH_.box === "sticker" ? "#111111" : TH_.box === "bar" ? "#ffffff" : GOLD, "left"));
      if (b.subtexto) { const n2 = Math.floor(b.subtexto.length * Math.min(1, Math.max(0, (p - .55) / .7))); let sub = b.subtexto.slice(0, n2); if ((sub.match(/\*/g) || []).length % 2) sub += "*"; rich(g, sub, bx, by + lines.length * fs * 1.08 + 30 * S, Math.round(30 * S), "left", ink); }
      g.restore();
    } else if (ty === "titulo" || ty === "data") {
      if (!solidBg) { g.fillStyle = "rgba(0,0,0,.42)"; g.fillRect(0, 0, W, H); }
      const q = ease((p - .05) / .5), txt = (b.texto || "").toUpperCase(), fs0 = Math.round((ty === "data" ? (portrait ? 84 : 96) : (portrait ? 110 : 150)) * S);
      g.font = `${TW} ${fs0}px ${TF}`; const fs = Math.min(fs0, Math.floor(fs0 * W * .86 / Math.max(1, g.measureText(txt.replace(/\*/g, "")).width)));
      g.save(); g.globalAlpha = q; g.translate(W / 2, H / 2); g.scale(1.06 - .06 * q, 1.06 - .06 * q);
      g.font = `${TW} ${fs}px ${TF}`; const tw = g.measureText(txt.replace(/\*/g, "")).width;
      if (ty === "data") { g.fillStyle = "rgba(8,8,10,.85)"; g.fillRect(-tw / 2 - 30 * S, -fs * .78, tw + 60 * S, fs * 1.15); }
      else if (TH_.box === "sticker" && !solidBg) { g.rotate(-2 * Math.PI / 180); g.fillStyle = GOLD; g.fillRect(-tw / 2 - 34 * S, -fs * .8, tw + 68 * S, fs * 1.2); }
      serif(g, txt, 0, fs * .32, fs, (TH_.box === "sticker" && !solidBg && ty !== "data") ? "#111111" : GOLD, "center", ty === "titulo" && TH_.upper ? 4 * S : 1);
      if (b.subtexto) rich(g, b.subtexto, 0, fs * .32 + 70 * S, Math.round(40 * S), "center", ink);
      g.restore();
    } else if (ty === "capitulo") {
      if (!solidBg) { g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(0, 0, W, H); }
      const q = ease((p - .15) / .6), fs = Math.round((portrait ? 76 : 104) * S); g.font = `${TW} ${fs}px ${TF}`;
      const lines = wrap(g, (b.texto || "").toUpperCase(), W * (portrait ? .8 : .55));
      g.save(); g.globalAlpha = q; const x = W * (portrait ? .1 : .1), y0 = H / 2 - lines.length * fs * .5;
      if (b.subtexto) { g.font = `${TW} ${Math.round(30 * S)}px ${TF}`; g.fillStyle = "#e8e2d6"; g.textAlign = "left"; g.fillText(b.subtexto.toUpperCase(), x, y0 - 20 * S); }
      lines.forEach((l, k) => serif(g, l, x, y0 + (k + 1) * fs * 1.02, fs, GOLD, "left")); g.restore();
    } else if (ty === "citacao") {
      if (!solidBg) { g.fillStyle = "rgba(0,0,0,.66)"; g.fillRect(0, 0, W, H); }
      const q = ease((p - .1) / .7), fs = Math.round((portrait ? 54 : 64) * S); g.font = `${TW} ${fs}px ${TF}`;
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
    setTheme(o.theme || "documentario");
    const { W, H } = o, tp = TPL[o.template] || TPL[DEF[o.theme || "documentario"]] || TPL["Azul noturno"];
    if (tp.accent) GOLD = tp.accent; if (tp.accent2) GOLD2 = tp.accent2;
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
    g.globalCompositeOperation = "source-over"; if (TH_.film) { g.globalAlpha = .025 * Math.random(); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); } g.globalAlpha = 1;
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
  return { TPL, DEF, tplFor, THEMES, STYLE, storyboardPrompt, frame, events };
})();
