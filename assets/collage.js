/* Onion · Colagem animada (estilo explicador)
 * Fundo liso, personagens e objetos recortados entrando no ritmo da fala,
 * palavras-chave na tela, título da seção no topo e imagens reais de domínio público.
 */
const Collage = (() => {
  const TPL = {
    "Azul explicador": { bg: "#BFE3F2", ink: "#1d2733", accent: "#d64545" },
    "Papel creme":     { bg: "#F3EAD8", ink: "#2b2118", accent: "#b8452f" },
    "Menta":           { bg: "#CDEBDC", ink: "#1b2a23", accent: "#c0392b" },
    "Branco limpo":    { bg: "#F8F7F3", ink: "#1d1d1d", accent: "#d64545" },
    "Noite":           { bg: "#1E2433", ink: "#F2EEE6", accent: "#ffcc4d" }
  };
  const DRAW_STYLE = "Flat 2D editorial illustration in a clean, modern educational-explainer style: confident dark outlines, soft muted colors with gentle cel shading, slightly stylized proportions, expressive but tasteful. Single subject, complete and centered, isolated on a pure flat white background (#FFFFFF). No background scenery, no ground shadow, no frame, no text, no letters, no watermark.";

  /* ---------- recorte: tira o fundo branco/liso a partir das bordas ---------- */
  async function cutout(blob) {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const W = c.width, H = c.height, id = g.getImageData(0, 0, W, H), d = id.data;
    // cor do fundo = média dos cantos
    const pick = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const cs = [pick(2, 2), pick(W - 3, 2), pick(2, H - 3), pick(W - 3, H - 3)];
    const bg = [0, 1, 2].map(k => cs.reduce((a, c2) => a + c2[k], 0) / 4);
    const near = i => { const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2]; return dr * dr + dg * dg + db * db < 34 * 34 * 3; };
    const seen = new Uint8Array(W * H), stack = [];
    for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
    while (stack.length) {
      const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
      if (!near(p * 4)) continue;
      d[p * 4 + 3] = 0;
      const x = p % W, y = (p / W) | 0;
      if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
    }
    // borda suave de 1 px e recorte do espaço vazio
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x; if (d[p * 4 + 3] === 0) continue;
      if ((x > 0 && d[(p - 1) * 4 + 3] === 0) || (x < W - 1 && d[(p + 1) * 4 + 3] === 0) || (y > 0 && d[(p - W) * 4 + 3] === 0) || (y < H - 1 && d[(p + W) * 4 + 3] === 0)) d[p * 4 + 3] = 170;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    g.putImageData(id, 0, 0);
    if (x1 <= x0 || y1 <= y0) return blob;
    const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return await new Promise(r => o.toBlob(b => r(b || blob), "image/png"));
  }

  /* ---------- imagens reais de domínio público (Wikimedia Commons) ---------- */
  const strip = h => (h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  async function commons(query) {
    const u = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", format: "json", origin: "*", generator: "search", gsrsearch: query + " filetype:bitmap",
      gsrnamespace: "6", gsrlimit: "10", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "1280"
    });
    const r = await fetch(u); if (!r.ok) return null;
    const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) {
      const ii = p.imageinfo?.[0]; if (!ii) continue;
      const m = ii.extmetadata || {}, lic = strip(m.LicenseShortName?.value);
      if (!/public domain|domínio público|^pd|cc0|cc[ -]by/i.test(lic) || /nc|nd/i.test(lic)) continue;
      if ((ii.width || 0) < 360 || (ii.height || 0) < 300) continue;
      const img = await fetch(ii.thumburl || ii.url); if (!img.ok) continue;
      const blob = await img.blob(); if (!/image/.test(blob.type)) continue;
      return { blob, credit: `${strip(m.Artist?.value) || "Autor desconhecido"} — ${lic}, via Wikimedia Commons (${p.title.replace(/^File:/, "")})` };
    }
    return null;
  }

  /* ---------- storyboard ---------- */
  function storyboardPrompt(P, { maxAssets, beats, reuse, isShort, battle }) {
    return `Você é o diretor de arte de um canal de vídeos explicativos em estilo "colagem animada": fundo liso, personagens e objetos desenhados e recortados que entram na tela no ritmo da narração, uma palavra-chave curta às vezes, o nome do assunto atual no topo e, quando fizer sentido, imagens reais de domínio público (retratos históricos antigos, pinturas, mapas, monumentos e lugares famosos).
Canal: ${cfgText()}
Título: "${P.title}".${isShort ? " Formato: SHORT vertical de ~1 minuto, cortes rápidos." : ""}${battle ? " Formato: BATALHA entre dois lados. Na 1ª batida mostre os dois lutadores com o texto \"VS\". Em cada rodada mostre os dois e use o texto pra placar curto (ex.: \"FORÇA: A +1\"). No final, o vencedor sozinho." : ""}
Roteiro:
"""${scriptText().slice(0, 26000)}"""

Crie:
1) "elenco": no máximo ${maxAssets} elementos visuais REUTILIZÁVEIS (personagens, objetos, lugares, mapas). Reutilize muito: um personagem principal aparece em várias batidas. Cada um com:
   - "id" curto (a1, a2…), "nome" (como aparece na tela, em ${P.config.idioma}),
   - "tipo": "real" só para retratos/pinturas históricas antigas, mapas, monumentos e lugares famosos que certamente existem em domínio público; "desenho" para todo o resto. NUNCA "real" para pessoas vivas ou que morreram há menos de 70 anos.
   - "busca": para "real", o termo de busca no Wikimedia Commons em inglês (ex.: "Hypatia portrait 1908", "Pyramids of Giza"); vazio para desenho.
   - "descricao": prompt em inglês descrevendo SÓ o elemento isolado, corpo inteiro se for pessoa, roupa e época corretas (ex.: "ancient Greek female philosopher in a grey himation holding a scroll"). Personagens de pessoas vivas viram personagens genéricos, sem imitar a aparência real.
${reuse ? `   Use APENAS estes elementos que já existem (não crie novos): ${reuse}\n` : ""}2) "batidas": cerca de ${beats} batidas consecutivas cobrindo o roteiro inteiro, uma a cada ${isShort ? "2 a 3" : "3 a 5"} segundos de fala. Cada batida:
   - "trecho": as primeiras 6 a 10 palavras daquele pedaço do roteiro, exatamente como estão no texto,
   - "elementos": 1 a 3 ids do elenco que aparecem juntos (em ordem da esquerda pra direita),
   - "texto": 0 a 4 palavras de destaque (data, número, palavra-chave) ou "" ,
   - "titulo": o nome do assunto/seção atual (ex.: nome da pessoa) ou "",
   - "avatar": id do elenco para o canto superior direito (o protagonista da seção) ou "".
Responda só com JSON: {"elenco":[...],"batidas":[...]}`;
  }

  /* ---------- desenho de um quadro ---------- */
  const ease = p => { p = Math.min(1, Math.max(0, p)); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  function slots(n, W, H, portrait, hasText) {
    if (portrait) {
      const top = H * .2, bot = H * .7;
      if (n === 1) return [{ x: W * .1, y: top, w: W * .8, h: bot - top }];
      if (n === 2) return [{ x: W * .04, y: top + H * .08, w: W * .44, h: bot - top - H * .08 }, { x: W * .52, y: top + H * .08, w: W * .44, h: bot - top - H * .08 }];
      return [{ x: W * .02, y: top + H * .14, w: W * .32, h: bot - top - H * .14 }, { x: W * .34, y: top + H * .1, w: W * .32, h: bot - top - H * .1 }, { x: W * .66, y: top + H * .14, w: W * .32, h: bot - top - H * .14 }];
    }
    const top = H * .17, bot = H * .9;
    if (n === 1) return [{ x: hasText ? W * .16 : W * .27, y: top, w: W * .46, h: bot - top }];
    if (n === 2) return [{ x: W * .08, y: top, w: W * .38, h: bot - top }, { x: W * .54, y: top, w: W * .38, h: bot - top }];
    return [{ x: W * .04, y: top + H * .06, w: W * .29, h: bot - top - H * .06 }, { x: W * .355, y: top, w: W * .29, h: bot - top }, { x: W * .67, y: top + H * .06, w: W * .29, h: bot - top - H * .06 }];
  }
  function drawAsset(g, a, s, p, t, i, ink) {
    const bmp = a.bmp; if (!bmp) return;
    const k = Math.min(s.w / bmp.width, s.h / bmp.height) * (a.real ? .9 : 1);
    const w = bmp.width * k, h = bmp.height * k, e = ease(p), sc = .86 + .14 * e;
    const cx = s.x + s.w / 2, by = a.real ? s.y + s.h / 2 + h / 2 : s.y + s.h;
    const bob = a.real ? 0 : Math.sin(t * 1.6 + i * 1.3) * s.h * .004;
    g.save(); g.globalAlpha = Math.min(1, p * 1.6);
    g.translate(cx, by + (1 - e) * s.h * .04 + bob); g.scale(sc, sc);
    if (a.real) {
      const pad = Math.max(6, w * .025);
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(-w / 2 - pad + 6, -h - pad + 8, w + pad * 2, h + pad * 2);
      g.fillStyle = "#ffffff"; g.fillRect(-w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2);
      g.drawImage(bmp, -w / 2, -h, w, h);
      if (a.nome) { g.fillStyle = ink; g.font = `600 ${Math.round(s.h * .045)}px Figtree, Arial, sans-serif`; g.textAlign = "center"; g.fillText(a.nome, 0, pad + s.h * .06); }
    } else g.drawImage(bmp, -w / 2, -h, w, h);
    g.restore();
  }
  function frame(g, t, R, o) {
    const { W, H } = o, portrait = H > W, tp = TPL[o.template] || TPL["Azul explicador"];
    g.fillStyle = tp.bg; g.fillRect(0, 0, W, H);
    let j = 0; while (j < R.scenes.length - 1 && t >= R.scenes[j + 1].s) j++;
    const S0 = R.scenes[j], b = S0.beat || {}, prev = j > 0 ? (R.scenes[j - 1].beat || {}) : {};
    const ids = (b.elementos || []).filter(id => R.assets[id]).slice(0, portrait ? 3 : 3);
    const vs = /^vs$/i.test((b.texto || "").trim());
    const sl = slots(ids.length || 1, W, H, portrait, !!b.texto && !vs && ids.length === 1);
    ids.forEach((id, i) => {
      const same = (prev.elementos || [])[i] === id && (prev.elementos || []).length === ids.length;
      const p = same ? 1 : (t - S0.s - i * .16) / .32;
      if (p > 0) drawAsset(g, R.assets[id], sl[i], p, t, i, tp.ink);
    });
    // palavra de destaque
    if (b.texto) {
      const p = Math.min(1, Math.max(0, (t - S0.s - .25) / .25)), txt = b.texto.trim();
      g.save(); g.globalAlpha = p; g.textAlign = "center"; g.textBaseline = "middle";
      if (vs) {
        const fs = Math.round(H * (portrait ? .1 : .16));
        g.font = `${fs}px Anton, Impact, sans-serif`; g.lineWidth = fs * .12; g.strokeStyle = tp.ink; g.lineJoin = "round";
        const y = portrait ? H * .48 : H * .55; g.translate(W / 2, y); g.scale(.7 + .3 * ease(p), .7 + .3 * ease(p));
        g.strokeText("VS", 0, 0); g.fillStyle = tp.accent; g.fillText("VS", 0, 0);
      } else {
        const fs = Math.round(H * (portrait ? .034 : .052)); g.font = `800 ${fs}px Figtree, Arial, sans-serif`; g.fillStyle = tp.ink;
        const x = ids.length === 1 && !portrait ? W * .8 : W / 2, y = ids.length === 1 && !portrait ? H * .5 : (portrait ? H * .17 : H * .2);
        const lines = txt.length > 14 && txt.includes(" ") ? [txt.slice(0, txt.lastIndexOf(" ", Math.ceil(txt.length / 2) + 3)), txt.slice(txt.lastIndexOf(" ", Math.ceil(txt.length / 2) + 3) + 1)] : [txt];
        lines.forEach((l, i) => g.fillText(l, x, y + (i - (lines.length - 1) / 2) * fs * 1.2));
      }
      g.restore();
    }
    // título da seção e avatar
    if (b.titulo) {
      g.fillStyle = tp.ink; g.textAlign = "center"; g.textBaseline = "top";
      g.font = `700 ${Math.round(H * (portrait ? .022 : .036))}px Figtree, Arial, sans-serif`;
      g.fillText(b.titulo, W / 2, H * (portrait ? .09 : .035));
    }
    const av = b.avatar && R.assets[b.avatar];
    if (av && av.bmp) {
      const s = H * (portrait ? .06 : .1), k = s / Math.max(av.bmp.width, av.bmp.height);
      const w = av.bmp.width * k, h = av.bmp.height * k, x = W - W * .03 - w, y = H * (portrait ? .085 : .025);
      if (av.real) { g.fillStyle = "#fff"; g.fillRect(x - 3, y - 3, w + 6, h + 6); }
      g.drawImage(av.bmp, x, y, w, h);
    }
    g.textAlign = "start"; g.textBaseline = "alphabetic";
    // entrada e saída
    if (t < .35) { g.fillStyle = tp.bg; g.globalAlpha = 1 - t / .35; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (t > R.dur) { g.fillStyle = `rgba(0,0,0,${Math.min(1, (t - R.dur) / .6)})`; g.fillRect(0, 0, W, H); }
  }

  return { TPL, DRAW_STYLE, cutout, commons, storyboardPrompt, frame };
})();
