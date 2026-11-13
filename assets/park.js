/* Onion Park · mundo em pixel art 2.5D isométrica
 * Grade fina (1 pixel do mundo = 1 px CSS no zoom 1), bordas sem suavização,
 * luz do dia vinda do alto à esquerda, sombras em blocos de pixel.
 * Só desenha. Estado, etapas e painéis ficam em onion.js.
 */

/* ============ MUNDO / ISO ============ */
const TW = 32, TH = 16, GW = 48, GH = 44;
const ME = 11;   // margem de cidade em volta do campus (em tiles)
const OX = (GH + 2 * ME) * TW / 2 + 60, OY = ME * TH + 120;
const WORLD_W = (GW + GH + 4 * ME) * TW / 2 + 120, WORLD_H = (GW + GH + 4 * ME) * TH / 2 + 200;
const EX = [TW / 2, TH / 2], EY = [-TW / 2, TH / 2];          // vetores de 1 tile em x e em y
function W(gx, gy) { return [(gx - gy) * TW / 2 + OX, (gx + gy) * TH / 2 + OY]; }
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const R = rng(7);

/* ---------- cor ---------- */
function hex2(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
function shade(c, f) { const [r, g, b] = hex2(c); const t = f > 0 ? 255 : 0, k = Math.abs(f); return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`; }
function rgba(c, a) { const [r, g, b] = hex2(c); return `rgba(${r},${g},${b},${a})`; }

/* ---------- desenho sem suavização ---------- */
function fillPoly(g, pts, col) {
  let y0 = Infinity, y1 = -Infinity; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  g.fillStyle = col;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const yc = y + .5; let xl = Infinity, xr = -Infinity;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xa, ya] = pts[j], [xb, yb] = pts[i];
      if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) { const x = xa + (yc - ya) / (yb - ya) * (xb - xa); xl = Math.min(xl, x); xr = Math.max(xr, x); }
    }
    if (xr > xl) { const a = Math.round(xl), b = Math.round(xr); if (b > a) g.fillRect(a, y, b - a, 1); }
  }
}
function line(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle = col; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function blob(g, cx, cy, rx, ry, col) { g.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + .5)) ** 2))); if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); } }
function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const up = (p, h) => [p[0], p[1] - h];
const add = (p, u, v) => [p[0] + u * EX[0] + v * EY[0], p[1] + u * EX[1] + v * EY[1]];

// caixa isométrica com contorno: o = canto de trás (no chão), w/d em tiles, h em px
function box(g, o, w, d, h, top, lf, rt, edge) {
  const p00 = o, p10 = add(o, w, 0), p11 = add(o, w, d), p01 = add(o, 0, d);
  fillPoly(g, [p01, p11, up(p11, h), up(p01, h)], lf);
  fillPoly(g, [p10, p11, up(p11, h), up(p10, h)], rt);
  fillPoly(g, [up(p00, h), up(p10, h), up(p11, h), up(p01, h)], top);
  if (edge) {
    line(g, ...up(p01, h), ...up(p11, h), edge); line(g, ...up(p11, h), ...up(p10, h), edge);
    line(g, ...p01, ...p11, edge); line(g, ...p11, ...p10, edge);
    line(g, ...p11, ...up(p11, h), edge);
  }
  return { p00, p10, p11, p01 };
}


/* ============ SPRITES ============ */
// árvores com sombreado por pixel (luz do alto à esquerda)
function makeTree(kind, seed) {
  const r = rng(seed);
  if (kind === "pine") {
    const h = 26 + (r() * 10 | 0), w = 15 + (r() * 4 | 0), c = canvas(w + 2, h + 6), g = c.getContext("2d");
    const P = ["#24513a", "#2f6646", "#3b7b52", "#4f9463", "#6aad75"];
    const cx = (w + 2) / 2, tiers = 4;
    for (let t = 0; t < tiers; t++) {
      const top = t * (h - 8) / tiers, bot = top + (h - 8) / tiers + 6, half = 3 + (t + 1) * (w / 2 - 2) / tiers;
      for (let y = Math.floor(top); y < bot; y++) {
        const k = (y - top) / (bot - top), hw = Math.round(1 + half * k);
        for (let x = -hw; x <= hw; x++) {
          const l = -x / hw * .6 - k * .3 + (r() - .5) * .5;
          const edgeP = Math.abs(x) === hw || y === Math.ceil(bot) - 1;
          px(g, cx + x, y, edgeP ? P[0] : P[Math.max(1, Math.min(4, Math.round(2 + l * 2)))]);
        }
      }
    }
    g.fillStyle = "#6a4528"; g.fillRect(cx - 1, h - 2, 3, 5); g.fillStyle = "#4e321d"; g.fillRect(cx + 1, h - 2, 1, 5);
    return { c, ax: cx, ay: h + 3, sw: 7 };
  }
  const bush = kind === "bush", R0 = bush ? 5 + (r() * 2 | 0) : 9 + (r() * 4 | 0);
  const cw = R0 * 2 + 8, ch = bush ? R0 * 2 + 4 : R0 * 2 + 16, c = canvas(cw, ch), g = c.getContext("2d");
  const pal = kind === "round2" ? ["#2d5c2a", "#3e7a36", "#579b45", "#76b956", "#9ad36c"] : bush ? ["#2f612c", "#40803a", "#58a047", "#7bbf5a", "#a0d673"] : ["#2b5a2b", "#3a7535", "#4f9443", "#6cb453", "#90cc68"];
  const cx = cw / 2, cy = R0 + 3;
  if (!bush) { g.fillStyle = "#6e4a2b"; g.fillRect(cx - 1, cy + R0 - 3, 3, ch - cy - R0 + 2); g.fillStyle = "#4f331d"; g.fillRect(cx + 1, cy + R0 - 3, 1, ch - cy - R0 + 2); }
  const lobes = [[0, 0, R0]]; for (let i = 0; i < 4; i++) { const a = r() * 6.28; lobes.push([Math.cos(a) * R0 * .55, Math.sin(a) * R0 * .45, R0 * (.5 + r() * .25)]); }
  const inside = (x, y) => lobes.some(([lx, ly, lr]) => (x - lx) ** 2 + ((y - ly) * 1.1) ** 2 <= lr * lr);
  for (let y = -R0 - 3; y <= R0 + 3; y++) for (let x = -R0 - 4; x <= R0 + 4; x++) {
    if (!inside(x, y)) continue;
    const isEdge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const l = (-x - y * 1.2) / R0 * .55 + (r() - .5) * .55;
    let i = Math.max(1, Math.min(4, Math.round(2.2 + l * 2)));
    if (isEdge) i = !inside(x, y + 1) || !inside(x + 1, y) ? 0 : Math.min(i, 2);
    px(g, cx + x, cy + y, pal[i]);
  }
  if (bush && r() < .45) { const fc = ["#ff8fb8", "#ffffff", "#ffd166"][(r() * 3) | 0]; for (let i = 0; i < 6; i++) px(g, cx + (r() - .5) * R0 * 1.4, cy + (r() - .6) * R0, fc); }
  return { c, ax: cx, ay: bush ? cy + R0 : ch - 2, sw: bush ? R0 : R0 * .8 };
}
const TREE_SPR = { round: [], round2: [], pine: [], bush: [] };
Object.keys(TREE_SPR).forEach((k, i) => { for (let s = 0; s < 6; s++) TREE_SPR[k].push(makeTree(k, 100 + i * 37 + s * 11)); });

// pessoas: sentadas (de costas, digitando) e andando (frente e costas)
const SKIN = ["#f3cfb0", "#e2ad86", "#c48a5c", "#8d5a37", "#6a4128"], HAIR = ["#2b1d14", "#5a3a1e", "#c9963f", "#1c1c22", "#9a9aa2", "#a8432d", "#e3c27a"];
const SHIRT = ["#7a64d8", "#4f8fdc", "#d8649b", "#3f9d6a", "#e3a43f", "#5e6578", "#d9584c", "#46a7b5", "#f1f1ee"], PANTS = ["#3a3f5c", "#2d3240", "#5b4a3a", "#304a6b"];
function person(r = R) { return { skin: SKIN[r() * SKIN.length | 0], hair: HAIR[r() * HAIR.length | 0], shirt: SHIRT[r() * SHIRT.length | 0], pants: PANTS[r() * PANTS.length | 0], style: r() * 3 | 0 }; }
const spriteCache = new Map();
function personSprite(p, pose, f) {
  const key = [p.skin, p.hair, p.shirt, p.pants, p.style, pose, f].join("|");
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = canvas(9, 17), g = c.getContext("2d");
  const S = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const sh = p.shirt, shL = shade(sh, .18), shD = shade(sh, -.22), hr = p.hair, hrD = shade(hr, -.25), sk = p.skin, skD = shade(sk, -.15);
  if (pose === "sit") {
    // de costas na cadeira
    S(2, 3, 5, 1, hr); S(1, 4, 7, 4, hr); S(6, 4, 2, 4, hrD); if (p.style === 1) S(2, 8, 5, 2, hr); if (p.style === 2) S(3, 2, 3, 2, hr);
    S(1, 8, 7, 5, sh); S(1, 8, 2, 5, shL); S(6, 8, 2, 5, shD);
    if (f) { S(0, 10, 1, 2, sk); S(8, 11, 1, 2, skD); } else { S(0, 11, 1, 2, sk); S(8, 10, 1, 2, skD); }
    S(2, 11, 5, 3, "#3d4252"); S(2, 11, 5, 1, "#565c70"); S(4, 14, 1, 2, "#2c303b"); S(2, 16, 5, 1, "#2c303b");
  } else {
    const back = pose === "back";
    S(2, 1, 5, 1, hr); S(1, 2, 7, 2, hr);
    if (back) { S(1, 4, 7, 3, hr); S(6, 2, 2, 5, hrD); }
    else { S(2, 4, 5, 3, sk); S(6, 4, 1, 3, skD); S(1, 3, 1, 3, hr); S(7, 3, 1, 3, hr); S(3, 5, 1, 1, "#2a2030"); S(5, 5, 1, 1, "#2a2030"); }
    if (p.style === 1) { S(1, 4, 1, 4, hr); S(7, 4, 1, 4, hr); if (back) S(2, 7, 5, 2, hr); }
    if (p.style === 2) S(3, 0, 3, 1, hr);
    S(1, 7, 7, 5, sh); S(1, 7, 2, 5, shL); S(6, 7, 2, 5, shD);
    const a = f ? 1 : 0; S(0, 8 + a, 1, 3, sk); S(8, 9 - a, 1, 3, skD);
    const pa = p.pants, paD = shade(pa, -.25);
    if (f) { S(2, 12, 2, 3, pa); S(5, 12, 2, 2, paD); S(2, 15, 2, 1, "#222"); S(5, 14, 2, 1, "#222"); }
    else { S(2, 12, 2, 2, pa); S(5, 12, 2, 3, paD); S(2, 14, 2, 1, "#222"); S(5, 15, 2, 1, "#222"); }
  }
  spriteCache.set(key, c); return c;
}
function drawPersonAt(g, x, y, p, pose, f) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = "rgba(20,50,20,.28)"; g.fillRect(x - 3, y, 7, 1); g.fillRect(x - 2, y + 1, 5, 1);
  g.drawImage(personSprite(p, pose, f), x - 4, y - 16);
}

// mesa de escritório com monitor (a tela é desenhada por cima, viva)
const DESK = (() => {
  const c = canvas(30, 22), g = c.getContext("2d"), o = [15, 8];
  box(g, o, .8, .45, 6, "#efe9df", "#c9bba5", "#ad9d86", "#8f8170");
  const m = add(o, .3, .05); g.fillStyle = "#23252e"; g.fillRect(Math.round(m[0]) - 5, Math.round(m[1]) - 15, 11, 8); g.fillStyle = "#3a3d49"; g.fillRect(Math.round(m[0]), Math.round(m[1]) - 7, 2, 2);
  return { c, ox: 15, oy: 8, sx: Math.round(m[0]) - 4, sy: Math.round(m[1]) - 14 };
})();

// cebola em pixel (estátua e OnionCut)
function makeOnion(r0) {
  const w = r0 * 2 + 6, h = Math.round(r0 * 2.9) + 4, c = canvas(w, h), g = c.getContext("2d"), cx = w / 2, cy = r0 * 1.55;
  const P = ["#5a1d52", "#7b2c70", "#97408b", "#b65aa8", "#d892cc"];
  for (let y = -r0 * 1.15; y <= r0; y++) for (let x = -r0 - 2; x <= r0 + 2; x++) {
    const yy = y / r0, half = yy < 0 ? r0 * Math.sqrt(Math.max(0, 1 - (yy * yy) / 1.35)) * (1 + yy * .55) : r0 * Math.sqrt(Math.max(0, 1 - yy * yy));
    if (Math.abs(x) > half) continue;
    const edgeP = Math.abs(x) > half - 1 || y >= r0 - .5;
    const stripe = Math.abs(Math.abs(x) - half * .5) < .8 || Math.abs(x) < .6;
    let i = Math.round(2 + (-x / r0 - yy) * .9); i = Math.max(1, Math.min(4, i));
    px(g, cx + x, cy + y, edgeP ? P[0] : stripe ? P[Math.min(4, i + 1)] : P[i]);
  }
  g.fillStyle = "#6cbf4e"; g.fillRect(cx, 0, 1, cy - r0 * 1.1); g.fillRect(cx - 2, 2, 1, cy - r0 * 1.1 - 2); g.fillRect(cx + 2, 1, 1, cy - r0 * 1.1 - 1);
  g.fillStyle = "#4a9a37"; g.fillRect(cx + 1, 3, 1, cy - r0 * 1.1 - 3);
  g.fillStyle = "#e9d8b4"; for (let i = -2; i <= 2; i += 2) g.fillRect(cx + i, cy + r0, 1, 2 + (i === 0 ? 1 : 0));
  return { c, ax: cx, ay: cy + r0 };
}
const ONION_BIG = makeOnion(11), ONION_STATUE = makeOnion(8);

// pato
function duckSprite(f) {
  const c = canvas(8, 6), g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(1, 2, 5, 3); g.fillRect(4, 0, 2, 3); g.fillStyle = "#dcdcdc"; g.fillRect(1, 4, 5, 1);
  g.fillStyle = "#f5a623"; g.fillRect(6, 1, 2, 1); g.fillStyle = "#222"; g.fillRect(5, 1, 1, 1);
  g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(f ? 0 : 1, 5, 7, 1);
  return c;
}
const DUCK = [duckSprite(0), duckSprite(1)];

function drawTreeObj(g, t) {
  const [x, y] = W(t.x, t.y); const s = t.spr;
  g.drawImage(s.c, Math.round(x - s.ax), Math.round(y - s.ay));
}
function treeShadow(g, t) {
  const [x, y] = W(t.x, t.y); blob(g, x + t.spr.sw * .5 + 2, y + 1, Math.round(t.spr.sw * 1.05), Math.max(2, Math.round(t.spr.sw * .38)), "rgba(28,70,24,.30)");
}
function drawLamp(g, l) {
  const [x0, y0] = W(l.x, l.y), x = Math.round(x0), y = Math.round(y0);
  g.fillStyle = "rgba(28,70,24,.28)"; g.fillRect(x + 1, y, 6, 1);
  g.fillStyle = "#2e3440"; g.fillRect(x, y - 18, 1, 18); g.fillStyle = "#4a5263"; g.fillRect(x - 1, y - 1, 3, 1);
  g.fillStyle = "#2e3440"; g.fillRect(x - 2, y - 22, 5, 1); g.fillStyle = "#fff1c4"; g.fillRect(x - 1, y - 21, 3, 3); g.fillStyle = "#2e3440"; g.fillRect(x - 1, y - 18, 3, 1);
}
function drawBench(g, b) {
  const o = W(b.x, b.y);
  box(g, o, .55, .2, 3, "#b98a55", "#9a6f42", "#7f5a35", "#6b4a2b");
  const bk = add(o, 0, -.02); fillPoly(g, [bk, add(bk, .55, 0), up(add(bk, .55, 0), 6), up(bk, 6)], "#a87a48"); line(g, ...up(bk, 6), ...up(add(bk, .55, 0), 6), "#6b4a2b");
}

function glassWall(g, A, Bp, H, accent, front, r) {
  const a = up(A, SLAB), b2 = up(Bp, SLAB);
  fillPoly(g, [a, b2, up(b2, H), up(a, H)], front ? "rgba(214,236,250,.16)" : rgba(accent, .13));
  if (front) {   // reflexo do vidro
    const L = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
    for (let s = 6; s < L - 4; s += 13 + (r() * 9 | 0)) {
      const t = s / L, bx = a[0] + (b2[0] - a[0]) * t, by = a[1] + (b2[1] - a[1]) * t;
      line(g, bx, by - 3, bx + 4, by - H + 4, "rgba(255,255,255,.28)");
      line(g, bx + 2, by - 3, bx + 6, by - H + 6, "rgba(255,255,255,.14)");
    }
  }
  const dark = shade(accent, -.25);
  line(g, ...up(a, Math.round(H * .55)), ...up(b2, Math.round(H * .55)), rgba(accent, .45));
  line(g, ...up(a, H), ...up(b2, H), dark); line(g, ...up(a, H - 1), ...up(b2, H - 1), accent);
  line(g, ...a, ...b2, dark);
}
function posts(g, A, Bp, n, H, accent) {
  const dark = shade(accent, -.25);
  for (let i = 0; i <= n; i++) { const t = i / n, x = A[0] + (Bp[0] - A[0]) * t, y = A[1] + (Bp[1] - A[1]) * t - SLAB; line(g, x, y, x, y - H, dark); }
}
// itens encostados na parede do fundo (lado gy). u0..u1 em tiles ao longo de x

function wallItem(g, b, kind, u, len, r) {
  const o = up(W(b.gx + u, b.gy + .12), SLAB), acc = b.c;
  if (kind === "shelf") {
    const s = box(g, o, len, .35, 18, "#8a6240", "#a77a50", "#7a5536", "#5e4029");
    for (let row = 0; row < 3; row++) for (let q = .05; q < len - .05; q += .07) {
      const p = up(add(o, q, .35), 3 + row * 5); const col = ["#d9584c", "#4f8fdc", "#e3a43f", "#3f9d6a", "#7a64d8", "#efe9df"][(r() * 6) | 0];
      g.fillStyle = col; g.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 1, 4);
    }
  } else if (kind === "screens") {
    box(g, o, len, .15, 20, "#30333f", "#262833", "#1e2029", "#15161d");
    const p = add(o, .05, .15);
    for (let q = 0; q < len - .1; q += .9) {
      const s = up(add(p, q, 0), 18); const w = 22, h = 13;
      fillPoly(g, [s, add(s, .75, 0), up(add(add(s, .75, 0), 0, 0), -h), up(s, -h)], "#123047");
      for (let k = 0; k < 6; k++) { const bh = 2 + (r() * 8 | 0), bx = add(s, .1 + k * .1, 0); g.fillStyle = k % 2 ? acc : "#6fe0a0"; g.fillRect(Math.round(bx[0]), Math.round(bx[1] + h - bh - 1), 2, bh); }
    }
  } else if (kind === "board") {
    box(g, o, len, .1, 16, "#d8d8d8", "#ffffff", "#cfcfcf", "#9a9aa2");
    for (let k = 0; k < len * 9; k++) { const p = up(add(o, .1 + r() * (len - .25), .1), 4 + r() * 9); g.fillStyle = ["#ffd166", "#ff8fb8", "#8fd3ff", "#b7f08a"][(r() * 4) | 0]; g.fillRect(Math.round(p[0]), Math.round(p[1]), 3, 2); }
  } else if (kind === "frames") {
    for (let q = 0; q < len - .3; q += .7) { const s = up(add(o, q, .05), 18); const col = ["#ff8fb8", "#8fd3ff", "#ffd166", "#c7a8ff"][(r() * 4) | 0];
      fillPoly(g, [s, add(s, .55, 0), up(add(s, .55, 0), -9), up(s, -9)], "#2b2b33"); fillPoly(g, [add(s, .05, 0), add(s, .5, 0), up(add(s, .5, 0), -8), up(add(s, .05, 0), -8)].map((p, i) => i < 2 ? [p[0], p[1] + 1] : p), col); }
  } else if (kind === "booth") {
    for (let q = 0; q < len - .9; q += 1.4) {
      const bo = add(o, q, 0); box(g, bo, 1.1, .9, 20, "#4a3f63", "#5a4d78", "#3e3454", "#2a2238");
      const m = up(add(bo, .55, .9), 9); g.fillStyle = "#1a1a1f"; g.fillRect(Math.round(m[0]), Math.round(m[1]) - 6, 1, 6); g.fillStyle = "#9aa0b0"; g.fillRect(Math.round(m[0]) - 1, Math.round(m[1]) - 9, 3, 3);
      g.fillStyle = "#ff4d4d"; g.fillRect(Math.round(m[0]) + 6, Math.round(m[1]) - 14, 2, 1);
    }
  } else if (kind === "cabinet") {
    for (let q = 0; q < len - .3; q += .45) { const co = add(o, q, 0); box(g, co, .4, .35, 15, "#c3c8d2", "#d6dae2", "#a9aebb", "#7d8290");
      for (let k = 0; k < 3; k++) { const p = up(add(co, .08, .35), 3 + k * 4); g.fillStyle = "#8a909e"; g.fillRect(Math.round(p[0]), Math.round(p[1]), 6, 1); } }
  } else if (kind === "timeline") {
    box(g, o, len, .12, 22, "#2a2433", "#1c1824", "#16121c", "#0f0c14");
    const s = up(add(o, .1, .12), 20);
    for (let k = 0; k < 3; k++) { let q = 0; while (q < len - .3) { const l = .2 + r() * .5; const a = add(s, q, 0); const b2 = add(s, Math.min(len - .2, q + l), 0);
      fillPoly(g, [[a[0], a[1] + 3 + k * 5], [b2[0], b2[1] + 3 + k * 5], [b2[0], b2[1] + 6 + k * 5], [a[0], a[1] + 6 + k * 5]], ["#a98bff", "#ff8fb8", "#6fe0a0"][k]); q += l + .06; } }
  } else if (kind === "easel") {
    for (let q = 0; q < len - .3; q += .9) { const e = up(add(o, q, .25), 0); const col = ["#ff8fb8", "#8fd3ff", "#ffd166"][(r() * 3) | 0];
      line(g, e[0] + 2, e[1], e[0] + 6, e[1] - 16, "#7a5536"); line(g, e[0] + 12, e[1], e[0] + 8, e[1] - 16, "#7a5536");
      g.fillStyle = "#f4f1ea"; g.fillRect(Math.round(e[0]) + 2, Math.round(e[1]) - 16, 11, 9); g.fillStyle = col; g.fillRect(Math.round(e[0]) + 4, Math.round(e[1]) - 14, 7, 5); }
  }
}

function plant(g, p, r) {
  const o = up(p, SLAB); box(g, add(o, -.1, -.1), .2, .2, 4, "#c97d4e", "#b56c40", "#954f2b", "#7a3f22");
  const t = up(o, 6); for (let y = -5; y <= 2; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y * 1.6 < 17 + r() * 4) px(g, t[0] + x, t[1] + y, (x - y < 0) ? "#7cc35a" : (x + y > 3 ? "#2f6b2c" : "#4f9a40"));
}

/* ============ O CAMPUS (inspirado no Apple Park) ============ */
const C0 = [24, 22], RING = 9.5;
const rect = (x, y, w, d) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
const ngon = (c, r, n) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + Math.PI / n; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
const LAYOUT = {
  ideias:   { pts: [[3, 3], [14, 3], [14, 7], [9.5, 7], [9.5, 12], [3, 12]], h: 24, desks: 5 },
  stories:  { pts: rect(18, 2, 8, 6), h: 24, desks: 3 },
  titulos:  { pts: rect(30, 4, 5, 5), h: 46, desks: 2 },
  arquivo:  { pts: rect(39, 3, 7, 8), h: 30, desks: 0 },
  roteiro:  { pts: rect(2, 16, 8, 7), h: 24, desks: 4 },
  descricao:{ pts: ngon([42.5, 20.5], 3, 8), h: 22, desks: 2, round: true },
  imagens:  { pts: [[3, 28], [13, 28], [13, 32], [8.5, 32], [8.5, 38], [3, 38]], h: 24, desks: 4 },
  narracao: { pts: ngon([19, 38.5], 3.4, 8), h: 22, desks: 2, round: true },
  montagem: { pts: ngon([32, 37.5], 4.6, 20), h: 26, desks: 4, round: true, pavilion: true },
  admin:    { pts: rect(40, 27, 5, 4), h: 22, desks: 1 }
};
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; }
function inPolyG(x, y, p) { let ins = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
// geometria de cada prédio: contorno, centro, porta (voltada pro centro do campus) e mesas
B.forEach(b => {
  const L = LAYOUT[b.k]; if (!L) return;
  b.poly = L.pts; b.h = L.h; b.round = !!L.round; b.pavilion = !!L.pavilion; b.ndesks = L.desks;
  const xs = b.poly.map(p => p[0]), ys = b.poly.map(p => p[1]);
  b.gx = Math.min(...xs); b.gy = Math.min(...ys); b.w = Math.max(...xs) - b.gx; b.d = Math.max(...ys) - b.gy;
  let cx = 0, cy = 0, n = 0; for (let x = b.gx; x <= b.gx + b.w; x += .25) for (let y = b.gy; y <= b.gy + b.d; y += .25) if (inPolyG(x, y, b.poly)) { cx += x; cy += y; n++; }
  b.cx = cx / n; b.cy = cy / n;
  const dx = C0[0] - b.cx, dy = C0[1] - b.cy, dl = Math.hypot(dx, dy); let t = 0;
  while (inPolyG(b.cx + dx / dl * t, b.cy + dy / dl * t, b.poly) && t < 20) t += .1;
  b.door = [b.cx + dx / dl * (t + .7), b.cy + dy / dl * (t + .7)];
  b.area = Math.abs(polyArea(b.poly));
});
const inBuildingAt = (x, y, m = 0) => B.find(b => b.poly && (inPolyG(x, y, b.poly) || (m && [[m, 0], [-m, 0], [0, m], [0, -m]].some(([a, c]) => inPolyG(x + a, y + c, b.poly)))));
// ruas: o anel em volta do jardim, caminhos curvos até cada prédio, a rua do estacionamento e as trilhas do jardim
const PARK_LOT = [40, 36, 7.5, 7.5], EXIT = [43.5, 39.5], CAFE = [28.6, 17.2];
function bez(a, c, b, n = 28) { return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }); }
const SPOKES = [];
function addSpoke(from, bend) {
  const dx = from[0] - C0[0], dy = from[1] - C0[1], a = Math.atan2(dy, dx);
  const ringPt = [C0[0] + Math.cos(a + bend * .25) * RING, C0[1] + Math.sin(a + bend * .25) * RING];
  const mid = [(from[0] + ringPt[0]) / 2, (from[1] + ringPt[1]) / 2], nx = -(ringPt[1] - from[1]), ny = ringPt[0] - from[0], nl = Math.hypot(nx, ny) || 1;
  SPOKES.push(bez(from, [mid[0] + nx / nl * bend * 1.8, mid[1] + ny / nl * bend * 1.8], ringPt));
}
B.forEach((b, i) => { if (b.door) addSpoke(b.door, i % 2 ? .9 : -.9); });
addSpoke([PARK_LOT[0] + .5, PARK_LOT[1] + 1], .6);
const GATES = [[16, .05], [.05, 25.5], [25, GH - .05], [GW - .05, 25]].map(([x, y]) => ({ in: [x, y], out: [x < .5 ? -.7 : x > GW - .5 ? GW + .7 : x, y < .5 ? -.7 : y > GH - .5 ? GH + .7 : y] }));
GATES.forEach(gt => addSpoke(gt.in, .25));
// trilhas internas do jardim: um círculo em volta do lago e 3 ligações curvas até o anel
const INNER = 4.8;
for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 - .4; SPOKES.push(bez([C0[0] + Math.cos(a) * INNER, C0[1] + Math.sin(a) * INNER], [C0[0] + Math.cos(a + .5) * 7.4, C0[1] + Math.sin(a + .5) * 7.4], [C0[0] + Math.cos(a + .35) * RING, C0[1] + Math.sin(a + .35) * RING], 16)); }
SPOKES.push(bez([C0[0] + 3.5, C0[1] - 3.4], [CAFE[0] - 1, CAFE[1] + 1], CAFE, 10));
function distSeg(x, y, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t); }
function distSpokes(x, y) { let m = 99; for (const s of SPOKES) for (let i = 0; i < s.length - 1; i++) { const d = distSeg(x, y, s[i], s[i + 1]); if (d < m) m = d; } return m; }
const PW = .62;
function terrainAt(x, y) {
  if (x < 0 || y < 0 || x >= GW || y >= GH) return "void";
  const d = Math.hypot(x - C0[0], y - C0[1]);
  if (d < 1.1) return "island";
  if (d < 2.9) return "water";
  if (d < 3.25) return "sand";
  if (Math.abs(d - INNER) < .38) return "path";
  if (Math.hypot(x - CAFE[0], y - CAFE[1]) < 2.1) return "plaza";
  if (x >= PARK_LOT[0] && x < PARK_LOT[0] + PARK_LOT[2] && y >= PARK_LOT[1] && y < PARK_LOT[1] + PARK_LOT[3]) return "asphalt";
  if (inBuildingAt(x, y)) return "lot";
  if (Math.abs(d - RING) < PW || distSpokes(x, y) < (d < RING ? .4 : PW)) return "path";
  return d < RING ? "garden" : "grass";
}
// grade de tiles pra rotas e plantio
const TILE = []; for (let y = 0; y < GH; y++) { TILE.push([]); for (let x = 0; x < GW; x++) TILE[y].push(terrainAt(x + .5, y + .5)); }
const tileType = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? "void" : TILE[y][x];
const isWalk = t => t === "path" || t === "plaza" || t === "asphalt";

const ground = canvas(WORLD_W, WORLD_H);
function paintGround() {
  const g = ground.getContext("2d"), r = rng(11), S4 = 4, step = 1 / S4;
  const COL = { grass: ["#62b04c", "#5ca947", "#68b752"], garden: ["#6dbb55", "#66b350", "#73c25b"], path: ["#dcbd8e", "#d6b586", "#e1c497"], plaza: ["#d3cdc2", "#c9c2b6"], asphalt: ["#5d6068", "#585b63"], water: ["#4aa3d3"], sand: ["#e6d19f"], island: ["#c9c2b6"], lot: ["#5aa246"] };
  const cls = [];
  for (let sy = 0; sy < GH * S4; sy++) { cls.push([]); for (let sx = 0; sx < GW * S4; sx++) cls[sy].push(terrainAt((sx + .5) * step, (sy + .5) * step)); }
  for (let sy = 0; sy < GH * S4; sy++) for (let sx = 0; sx < GW * S4; sx++) {
    const t = cls[sy][sx], x = sx * step, y = sy * step, pal = COL[t] || COL.grass;
    let col = pal[((Math.floor(x * .7) * 7 + Math.floor(y * .7) * 13) + (Math.sin(x * 1.3 + y * .7) > .6 ? 1 : 0)) % pal.length];
    if (t === "water") { const d = Math.hypot(x - C0[0], y - C0[1]); col = d < 2.2 ? "#3f93c5" : "#4aa3d3"; }
    if (t === "plaza" || t === "island") col = pal[(sx + sy) % 2];
    fillPoly(g, [W(x, y), W(x + step, y), W(x + step, y + step), W(x, y + step)], col);
    // contorno das ruas e da água
    const nb = (a, b) => (cls[sy + b] || [])[sx + a];
    if (t === "path" && [nb(1, 0), nb(-1, 0), nb(0, 1), nb(0, -1)].some(n => n === "grass" || n === "garden")) fillPoly(g, [W(x, y), W(x + step, y), W(x + step, y + step), W(x, y + step)], "#c9a87a");
    if (t === "water" && [nb(1, 0), nb(-1, 0), nb(0, 1), nb(0, -1)].some(n => n === "sand")) fillPoly(g, [W(x, y), W(x + step, y), W(x + step, y + step), W(x, y + step)], "#2f7aa8");
  }
  // textura: tufos, flores, pedrinhas, faixas do estacionamento
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const t = tileType(x, y), n = t === "grass" || t === "garden" ? 12 : t === "path" ? 5 : 0;
    for (let i = 0; i < n; i++) {
      const [qx, qy] = W(x + r(), y + r()), q = r();
      if (t === "path") { px(g, qx, qy, q < .5 ? "#c4a272" : "#ead2a6"); continue; }
      if (q < .45) { px(g, qx, qy, "#4b9139"); px(g, qx, qy - 1, "#4b9139"); }
      else if (q < .78) px(g, qx, qy, "#7cc662");
      else if (q < .9) { px(g, qx, qy - 1, ["#ffffff", "#ffe066", "#ff9ec4", "#c7a8ff"][(r() * 4) | 0]); px(g, qx, qy, "#3f7d31"); }
    }
  }
  for (let i = 0; i < 7; i++) { const x = PARK_LOT[0] + .6 + i * 1, a = W(x, PARK_LOT[1] + .5), b2 = W(x, PARK_LOT[1] + 2.2); line(g, ...a, ...b2, "#d9dbe0"); const c = W(x, PARK_LOT[1] + 5.3), d = W(x, PARK_LOT[1] + 7); line(g, ...c, ...d, "#d9dbe0"); }
  // brilho da água e vitórias-régias
  const rr = rng(5);
  for (let i = 0; i < 40; i++) { const a = rr() * 6.283, d = 1.3 + rr() * 1.4, [x, y] = W(C0[0] + Math.cos(a) * d, C0[1] + Math.sin(a) * d); g.fillStyle = "#7cc6ea"; g.fillRect(Math.round(x), Math.round(y), 2 + (rr() * 3 | 0), 1); }
  [[1.8, .4], [-1.6, 1.2], [.5, -2.1]].forEach(([dx, dy]) => { const [x, y] = W(C0[0] + dx, C0[1] + dy); blob(g, x, y, 5, 2, "#3f8f3a"); blob(g, x - 1, y - 1, 3, 1, "#62b04c"); px(g, x + 2, y - 1, "#ff9ec4"); });
  paintCity(g);
}

/* ============ A CIDADE EM VOLTA ============ */
function ringM(x, y) { const dx = x < 0 ? -x : x > GW ? x - GW : 0, dy = y < 0 ? -y : y > GH ? y - GH : 0; return Math.max(dx, dy); }
function cityAt(x, y) { const m = ringM(x, y); if (m <= 1.2) return "sidewalk"; if (m <= 4.4) return "road"; if (m <= 5.4) return "sidewalk"; return "block"; }
// caminhar em volta do quarteirão (retângulo a uma distância m do campus)
function perimLen(m) { return 2 * (GW + 2 * m) + 2 * (GH + 2 * m); }
function perimAt(m, s) { const L0 = GW + 2 * m, L1 = GH + 2 * m; s = ((s % perimLen(m)) + perimLen(m)) % perimLen(m);
  if (s < L0) return [-m + s, -m, 0]; s -= L0; if (s < L1) return [GW + m, -m + s, 1]; s -= L1; if (s < L0) return [GW + m - s, GH + m, 2]; s -= L0; return [-m, GH + m - s, 3]; }
function perimOf(m, p) { const [x, y] = p, L0 = GW + 2 * m, L1 = GH + 2 * m, c = [[Math.abs(y + m), x + m], [Math.abs(x - GW - m), L0 + y + m], [Math.abs(y - GH - m), L0 + L1 + (GW + m - x)], [Math.abs(x + m), 2 * L0 + L1 + (GH + m - y)]]; c.sort((a, b) => a[0] - b[0]); return c[0][1]; }
function perimRoute(m, a, b) {
  const L = perimLen(m), sa = perimOf(m, a), sb = perimOf(m, b); let fwd = ((sb - sa) % L + L) % L; const dir = fwd <= L / 2 ? 1 : -1, dist = dir > 0 ? fwd : L - fwd;
  const pts = []; for (let t = 0; t <= dist; t += .5) { const q = perimAt(m, sa + dir * t); if (!pts.length || q[2] !== pts[pts.length - 1][2]) pts.push(q); }
  const out = pts.map(q => [q[0], q[1]]); out.push(perimAt(m, sb).slice(0, 2)); return out;
}
// estabelecimentos do bairro (os funcionários também vão lá)
const SHOPS = [
  { n: "CAFÉ", x: 8, y: -10.4, w: 6, d: 3.8, wall: "#f4e3c8", aw: "#8b5a3c", roof: "#7a6a5a", icon: "☕" },
  { n: "ACADEMIA", x: 30, y: -10.4, w: 8, d: 3.8, wall: "#dfe6ef", aw: "#d9584c", roof: "#5e6578", icon: "🏋" },
  { n: "", x: 19.5, y: -10.4, w: 7, d: 3.8, wall: "#c9d4e3", aw: "#4f8fdc", roof: "#6b7385" },
  { n: "RESTAURANTE", x: -10.4, y: 11, w: 3.8, d: 8, wall: "#f2d7c9", aw: "#3f9d6a", roof: "#8a5a4a", icon: "🍽" },
  { n: "", x: -10.4, y: 30, w: 3.8, d: 6, wall: "#e6dccb", aw: "#c96f4a", roof: "#7a6a5a" },
  { n: "MERCADO", x: GW + 6.6, y: 8, w: 3.8, d: 8, wall: "#e9f0e1", aw: "#e3a43f", roof: "#5e6a55", icon: "🛒" },
  { n: "", x: GW + 6.6, y: 29, w: 3.8, d: 6, wall: "#dcd3e8", aw: "#7a64d8", roof: "#625a75" },
  { n: "PIZZARIA", x: 8, y: GH + 6.6, w: 7, d: 3.8, wall: "#f6e0c0", aw: "#d94a3c", roof: "#8a5a4a", icon: "🍕" },
  { n: "", x: 31, y: GH + 6.6, w: 7, d: 3.8, wall: "#d7e4dc", aw: "#46a7b5", roof: "#5a6b66" }
];
SHOPS.length = 0; // os prédios do bairro foram retirados (ficam ruas, calçadas, carros e árvores)
SHOPS.forEach(sh => {
  const cx = sh.x + sh.w / 2, cy = sh.y + sh.d / 2;
  // porta virada pro campus
  const side = sh.y + sh.d < 0 ? "n" : sh.y > GH ? "s" : sh.x + sh.w < 0 ? "w" : "e";
  sh.door = side === "n" ? [cx, sh.y + sh.d + .35] : side === "s" ? [cx, sh.y - .35] : side === "w" ? [sh.x + sh.w + .35, cy] : [sh.x - .35, cy];
  sh.cross1 = side === "n" ? [cx, -4.9] : side === "s" ? [cx, GH + 4.9] : side === "w" ? [-4.9, cy] : [GW + 4.9, cy];
  sh.cross0 = side === "n" ? [cx, -.7] : side === "s" ? [cx, GH + .7] : side === "w" ? [-.7, cy] : [GW + .7, cy];
  sh.side = side;
});
const OPEN_SHOPS = SHOPS.filter(sh => sh.n);
function shopOpen() { return NF < .9; }
function drawShop(g, sh) {
  const o = W(sh.x, sh.y), H = 22, lit = NF > .3 && shopOpen() && sh.n;
  g.fillStyle = "rgba(28,40,24,.22)"; fillPoly(g, [W(sh.x + sh.w, sh.y), W(sh.x + sh.w + 1.1, sh.y + .4), W(sh.x + sh.w + 1.1, sh.y + sh.d + .4), W(sh.x + sh.w, sh.y + sh.d)], "rgba(28,40,24,.18)");
  box(g, o, sh.w, sh.d, H, sh.roof, shade(sh.wall, -.04), shade(sh.wall, -.16), "#2b2340");
  // janelas nas duas faces visíveis
  const winL = (u0, u1, hy0, hy1) => [up(W(sh.x + u0, sh.y + sh.d), hy0), up(W(sh.x + u1, sh.y + sh.d), hy0), up(W(sh.x + u1, sh.y + sh.d), hy1), up(W(sh.x + u0, sh.y + sh.d), hy1)];
  const winR = (v0, v1, hy0, hy1) => [up(W(sh.x + sh.w, sh.y + v0), hy0), up(W(sh.x + sh.w, sh.y + v1), hy0), up(W(sh.x + sh.w, sh.y + v1), hy1), up(W(sh.x + sh.w, sh.y + v0), hy1)];
  const wc = lit ? "#ffd98a" : "#7fa6c4";
  for (let u = .4; u < sh.w - .5; u += 1.3) { fillPoly(g, winL(u, u + .8, 4, 13), wc); line(g, ...winL(u, u + .8, 4, 13)[3], ...winL(u, u + .8, 4, 13)[2], "#2b2340"); }
  for (let v = .4; v < sh.d - .5; v += 1.3) { fillPoly(g, winR(v, v + .8, 4, 13), shade(wc, -.08)); line(g, ...winR(v, v + .8, 4, 13)[3], ...winR(v, v + .8, 4, 13)[2], "#2b2340"); }
  // toldo listrado (toque de cartoon)
  for (let u = 0; u < sh.w; u += .5) fillPoly(g, [up(W(sh.x + u, sh.y + sh.d + .25), 14), up(W(sh.x + Math.min(sh.w, u + .5), sh.y + sh.d + .25), 14), up(W(sh.x + Math.min(sh.w, u + .5), sh.y + sh.d), 18), up(W(sh.x + u, sh.y + sh.d), 18)], (u * 2) % 2 ? "#fff6e6" : sh.aw);
  for (let v = 0; v < sh.d; v += .5) fillPoly(g, [up(W(sh.x + sh.w + .25, sh.y + v), 14), up(W(sh.x + sh.w + .25, sh.y + Math.min(sh.d, v + .5)), 14), up(W(sh.x + sh.w, sh.y + Math.min(sh.d, v + .5)), 18), up(W(sh.x + sh.w, sh.y + v), 18)], (v * 2) % 2 ? "#fff6e6" : shade(sh.aw, -.1));
  // ar-condicionado no telhado e placa
  const t = up(W(sh.x + sh.w * .3, sh.y + sh.d * .4), H); box(g, t, .7, .6, 4, "#d9dce3", "#c3c7cf", "#a7abb5", "#2b2340");
  if (sh.n) { const [x, y] = up(W(sh.x + sh.w / 2, sh.y + sh.d / 2), H + 2); g.font = `700 9px "Pixelify Sans", monospace`; const tw = Math.round(g.measureText(sh.n).width) + 10, bx = Math.round(x - tw / 2), by = Math.round(y - 20);
    g.fillStyle = "#2b2340"; g.fillRect(bx + 2, by + 2, tw, 13); g.fillStyle = lit ? "#fff3c8" : "#ffffff"; g.fillRect(bx, by, tw, 13); g.fillStyle = sh.aw; g.fillRect(bx, by, tw, 2);
    g.fillStyle = "#2b2340"; g.fillRect(bx, by, tw, 1); g.fillRect(bx, by + 12, tw, 1); g.fillRect(bx, by, 1, 13); g.fillRect(bx + tw - 1, by, 1, 13); g.fillRect(Math.round(x) - 1, by + 13, 2, 5);
    g.textBaseline = "middle"; g.fillText(sh.n, bx + 5, by + 7.5); }
}
function paintCity(g) {
  const r = rng(91);
  for (let y = -ME; y < GH + ME; y++) for (let x = -ME; x < GW + ME; x++) {
    if (x >= 0 && y >= 0 && x < GW && y < GH) continue;
    const t = cityAt(x + .5, y + .5), q = r();
    const col = t === "road" ? (q < .5 ? "#5b5e66" : "#585b63") : t === "sidewalk" ? ((x + y) % 2 ? "#d7d2c8" : "#cfc9bd") : (q < .5 ? "#8fbf6a" : "#88b864");
    fillPoly(g, [W(x, y), W(x + 1, y), W(x + 1, y + 1), W(x, y + 1)], col);
    if (t === "block" && q < .25) px(g, ...W(x + r(), y + r()), "#6ea24e");
  }
  // faixa central tracejada e meio-fio
  for (let s = 0; s < perimLen(2.8); s += 1.4) { const a = perimAt(2.8, s), b = perimAt(2.8, s + .6); if (a[2] === b[2]) line(g, ...W(a[0], a[1]), ...W(b[0], b[1]), "#f2c14e"); }
  [1.2, 4.4].forEach(m => { for (let s = 0; s < perimLen(m); s += .5) { const a = perimAt(m, s), b = perimAt(m, s + .5); if (a[2] === b[2]) line(g, ...W(a[0], a[1]), ...W(b[0], b[1]), "#a7a197"); } });
  // faixas de pedestre nos portões e na frente das lojas
  const zebra = (p, horiz) => { for (let k = 0; k < 6; k++) { const o = 1.4 + k * .5; const a = horiz ? [p[0] - .6, p[1]] : [p[0], p[1]]; if (horiz) { const y = p[1] < 0 ? -o : GH + o; line(g, ...W(p[0] - .6, y), ...W(p[0] + .6, y), "#eeeeee"); } else { const x = p[0] < 0 ? -o : GW + o; line(g, ...W(x, p[1] - .6), ...W(x, p[1] + .6), "#eeeeee"); } } };
  [...GATES.map(gt => gt.out), ...SHOPS.filter(sh => sh.n).map(sh => sh.cross0)].forEach(p => zebra(p, p[1] < 0 || p[1] > GH));
  // cerca viva em volta do campus, aberta nos portões e no estacionamento
  const open = (x, y) => GATES.some(gt => Math.hypot(gt.in[0] - x, gt.in[1] - y) < 1.3) || (x >= PARK_LOT[0] - .2 && y >= PARK_LOT[1] - .2);
  const hedge = (a, b) => { fillPoly(g, [a, b, up(b, 4), up(a, 4)], "#3f8a35"); fillPoly(g, [up(a, 4), up(b, 4), up(b, 5), up(a, 5)], "#5fae49"); };
  for (let x = 0; x < GW; x += .5) { if (!open(x + .25, 0)) hedge(W(x, 0), W(x + .5, 0)); }
  for (let y = 0; y < GH; y += .5) { if (!open(0, y + .25)) hedge(W(0, y), W(0, y + .5)); }
  for (let x = 0; x < GW; x += .5) { if (!open(x + .25, GH)) hedge(W(x, GH), W(x + .5, GH)); }
  for (let y = 0; y < GH; y += .5) { if (!open(GW, y + .25)) hedge(W(GW, y), W(GW, y + .5)); }
}
// carros passando nas duas mãos
const traffic = Array.from({ length: 9 }, (_, i) => ({ m: i % 2 ? 3.6 : 2.0, s: i * 23.7, sp: (i % 2 ? -1 : 1) * (.05 + (i % 3) * .012), c: ["#d9584c", "#4f8fdc", "#e8e4dc", "#2e3440", "#3f9d6a", "#e3a43f", "#9aa0ad", "#7a64d8", "#46a7b5"][i] }));
function drawMovingCar(g, car) {
  const [x, y, seg] = perimAt(car.m, car.s), horiz = seg === 0 || seg === 2, w = horiz ? 1.05 : .55, d = horiz ? .55 : 1.05, o = W(x - w / 2, y - d / 2);
  g.fillStyle = "rgba(0,0,0,.18)"; fillPoly(g, [W(x - w / 2 + .1, y - d / 2 + .15), W(x + w / 2 + .1, y - d / 2 + .15), W(x + w / 2 + .1, y + d / 2 + .15), W(x - w / 2 + .1, y + d / 2 + .15)], "rgba(0,0,0,.18)");
  box(g, o, w, d, 5, car.c, shade(car.c, -.1), shade(car.c, -.25), "#1c1c22");
  box(g, up(W(x - w * .3, y - d * .3), 5), w * .6, d * .6, 4, shade(car.c, .15), "#9fc6e0", "#7fa8c4", "#1c1c22");
  if (NF > .4) { const f = W(x + (horiz ? (car.sp > 0 === (seg === 0) ? w / 2 : -w / 2) : 0), y + (horiz ? 0 : (car.sp > 0 === (seg === 1) ? d / 2 : -d / 2))); g.fillStyle = "#fff6c8"; g.fillRect(Math.round(f[0]) - 1, Math.round(f[1]) - 3, 3, 2); }
}
// pedestres do bairro
const cityWalkers = Array.from({ length: 7 }, (_, i) => ({ m: i % 2 ? 5.0 : .7, s: i * 31, sp: (i % 3 ? 1 : -1) * (.025 + (i % 4) * .006), dir: 1, ph: i * 3, ...person() }));

/* ============ NATUREZA E OBJETOS ============ */
const trees = [], lamps = [], benches = [], umbrellas = [], cars = [];
(function placeNature() {
  const r = rng(23);
  // pomar em arcos dentro do anel (como no Apple Park)
  [6.2, 7.3, 8.4].forEach((rad, k) => { for (let a = 0; a < Math.PI * 2; a += 1.05 / rad) { const x = C0[0] + Math.cos(a + k * .3) * rad, y = C0[1] + Math.sin(a + k * .3) * rad; if (terrainAt(x, y) === "garden" && distSpokes(x, y) > .9 && Math.hypot(x - CAFE[0], y - CAFE[1]) > 2.6 && r() < .85) trees.push({ x, y, spr: TREE_SPR[r() < .7 ? "round2" : "bush"][(r() * 6) | 0] }); } });
  // bosques e floresta nas bordas
  for (let i = 0; i < 3200; i++) {
    const x = r() * GW, y = r() * GH, t = terrainAt(x, y); if (t !== "grass") continue;
    const edge = x < 2.5 || y < 2.5 || x > GW - 3 || y > GH - 3;
    if (inBuildingAt(x, y, 1.2) || distSpokes(x, y) < 1.2 || Math.abs(Math.hypot(x - C0[0], y - C0[1]) - RING) < 1.4) continue;
    if (x > PARK_LOT[0] - 1 && y > PARK_LOT[1] - 1) continue;
    const clump = (Math.sin(x * .55) + Math.cos(y * .6)) > .7;
    if (r() > (edge ? .8 : clump ? .1 : .035)) continue;
    if (trees.some(t2 => Math.abs(t2.x - x) + Math.abs(t2.y - y) < (edge ? .8 : 1.15))) continue;
    const q = r(); trees.push({ x, y, spr: TREE_SPR[q < .38 ? "pine" : q < .64 ? "round" : q < .82 ? "round2" : "bush"][(r() * 6) | 0] });
  }
  // bairro: árvores nas quadras (fora das lojas) e postes na calçada de fora
  for (let i = 0; i < 2600; i++) {
    const x = -ME + r() * (GW + 2 * ME), y = -ME + r() * (GH + 2 * ME); if (ringM(x, y) < 5.9) continue;
    if (SHOPS.some(sh => x > sh.x - .8 && x < sh.x + sh.w + .8 && y > sh.y - .8 && y < sh.y + sh.d + .8)) continue;
    if (r() > .22) continue; if (trees.some(t2 => Math.abs(t2.x - x) + Math.abs(t2.y - y) < 1.1)) continue;
    const q = r(); trees.push({ x, y, spr: TREE_SPR[q < .3 ? "pine" : q < .6 ? "round" : q < .85 ? "round2" : "bush"][(r() * 6) | 0] });
  }
  for (let s2 = 3; s2 < perimLen(4.95); s2 += 7.5) { const q = perimAt(4.95, s2); lamps.push({ x: q[0], y: q[1] }); }
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, x = C0[0] + Math.cos(a) * (RING + .95), y = C0[1] + Math.sin(a) * (RING + .95); if (terrainAt(x, y) === "grass" || terrainAt(x, y) === "garden") lamps.push({ x, y }); }
  SPOKES.slice(0, B.length + 1).forEach(s => { const p = s[Math.floor(s.length / 2)]; const x = p[0] + .8, y = p[1] + .4; if (terrainAt(x, y) === "grass") lamps.push({ x, y }); });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3, x = C0[0] + Math.cos(a) * (INNER + .7), y = C0[1] + Math.sin(a) * (INNER + .7); if (terrainAt(x, y) === "garden") benches.push({ x, y }); }
  [[-1.2, -.6, "#e8836a"], [1, -.9, "#5fbf95"], [.2, 1.1, "#e0b14a"]].forEach(([dx, dy, c]) => umbrellas.push({ x: CAFE[0] + dx, y: CAFE[1] + dy, c }));
  const CC = ["#d9584c", "#4f8fdc", "#e8e4dc", "#2e3440", "#3f9d6a", "#e3a43f", "#9aa0ad"];
  for (let i = 0; i < 12; i++) cars.push({ x: PARK_LOT[0] + .5 + (i % 7), y: PARK_LOT[1] + (i < 7 ? 1.2 : 6), c: CC[i % CC.length] });
})();
const outerOf = p => p[0] < .5 ? [-4.9, p[1]] : p[0] > GW - .5 ? [GW + 4.9, p[1]] : p[1] < .5 ? [p[0], -4.9] : [p[0], GH + 4.9];
function gateFor(sh) { let best = GATES[0], bd = 1e9; GATES.forEach(gt => { const d = Math.hypot(gt.out[0] - sh.cross1[0], gt.out[1] - sh.cross1[1]); if (d < bd) { bd = d; best = gt; } }); return best; }
// do campus até a loja (pelo portão, faixa de pedestre e calçada) e de volta
function toShop(sh) { const gt = gateFor(sh), o = outerOf(gt.in); return [gt.in, gt.out, o, ...perimRoute(4.9, o, sh.cross1), sh.door]; }
function fromShop(sh) { return toShop(sh).reverse().slice(1); }
const SPOTS = [...benches.map(b => [b.x + .25, b.y + .5]), ...umbrellas.map(u => [u.x + .5, u.y + .4]), [CAFE[0], CAFE[1] + .2]];
function drawUmbrella(g, u) {
  const [x0, y0] = W(u.x, u.y), x = Math.round(x0), y = Math.round(y0);
  g.fillStyle = "rgba(28,70,24,.25)"; g.fillRect(x - 6, y + 1, 14, 2);
  box(g, W(u.x - .2, u.y - .2), .4, .4, 5, "#e8e4dc", "#cfc9bd", "#b8b2a6", "#8f8a80");
  g.fillStyle = "#4a4f5c"; g.fillRect(x, y - 16, 1, 12);
  blob(g, x, y - 17, 9, 3, shade(u.c, -.2)); blob(g, x, y - 18, 8, 2, u.c);
}
function drawCar(g, c) {
  const o = W(c.x, c.y); box(g, o, .55, 1.05, 5, c.c, shade(c.c, -.1), shade(c.c, -.25), "#1c1c22");
  const t = up(add(o, .1, .25), 9); box(g, add(o, .08, .25), .4, .55, 9, shade(c.c, .15), "#9fc6e0", "#7fa8c4", "#1c1c22");
}

/* ============ PRÉDIOS COM FORMAS ============ */
function wallH(b) { return b.h || 24; }
const SLAB = 4;
function hull(pts) { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = []; for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (const q of p.slice().reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); } return lo.slice(0, -1).concat(hi.slice(0, -1)); }
function buildingHull(b) { const H = wallH(b) + SLAB, g = b.poly.map(p => W(p[0], p[1])); return hull([...g, ...g.map(p => up(p, H))]); }
function bbox(b) { const h = buildingHull(b); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; h.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return { x: Math.floor(x0) - 10, y: Math.floor(y0) - 40, w: Math.ceil(x1 - x0) + 20, h: Math.ceil(y1 - y0) + 52 }; }
function edgesOf(b) { const p = b.poly, A = polyArea(p), out = []; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length], dx = c[0] - a[0], dy = c[1] - a[1], n = A > 0 ? [dy, -dx] : [-dy, dx]; out.push({ a, c, front: n[0] + n[1] > .001, len: Math.hypot(dx, dy) }); } return out; }
function deskSpots(b) {
  if (!b.ndesks) return [];
  const c = [];
  for (let x = b.gx + .9; x < b.gx + b.w - .6; x += 1.25) for (let y = b.gy + 1.1; y < b.gy + b.d - .5; y += 1.4)
    if ([[0, 0], [.7, 0], [-.7, 0], [0, .8], [0, -.8]].every(([a, d]) => inPolyG(x + a, y + d, b.poly))) c.push([x, y]);
  c.sort((p, q) => Math.hypot(p[0] - b.cx, p[1] - b.cy) - Math.hypot(q[0] - b.cx, q[1] - b.cy));
  return c.slice(0, b.ndesks);
}
// porta de vidro com toldo na cor do prédio, voltada pro caminho
function drawDoor(g, b, e, H) {
  const len = e.len, dx = (e.c[0] - e.a[0]) / len, dy = (e.c[1] - e.a[1]) / len;
  const t = Math.max(.6, Math.min(len - .6, (b.door[0] - e.a[0]) * dx + (b.door[1] - e.a[1]) * dy));
  const A = [e.a[0] + dx * (t - .45), e.a[1] + dy * (t - .45)], Cc = [e.a[0] + dx * (t + .45), e.a[1] + dy * (t + .45)];
  const out = [b.door[0] - (e.a[0] + dx * t), b.door[1] - (e.a[1] + dy * t)], ol = Math.hypot(...out) || 1, n = [out[0] / ol * .32, out[1] / ol * .32];
  const pa = up(W(...A), SLAB), pc = up(W(...Cc), SLAB), DH = 17;
  fillPoly(g, [W(A[0] + n[0] * 2.2, A[1] + n[1] * 2.2), W(Cc[0] + n[0] * 2.2, Cc[1] + n[1] * 2.2), W(...Cc), W(...A)], "#b8a27a");
  fillPoly(g, [pa, pc, up(pc, DH), up(pa, DH)], "rgba(52,70,96,.72)");
  const mid = [(pa[0] + pc[0]) / 2, (pa[1] + pc[1]) / 2]; line(g, mid[0], mid[1], mid[0], mid[1] - DH, "#2b2340");
  [pa, pc].forEach(q => { g.fillStyle = "#2b2340"; g.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - DH, 2, DH); });
  line(g, pa[0], pa[1] - DH, pc[0], pc[1] - DH, "#2b2340");
  const a1 = up(W(A[0] + n[0], A[1] + n[1]), SLAB + DH + 2), c1 = up(W(Cc[0] + n[0], Cc[1] + n[1]), SLAB + DH + 2);
  fillPoly(g, [up(pa, DH + 5), up(pc, DH + 5), c1, a1], b.c);
  for (let k = 1; k < 4; k += 2) { const u = k / 4, v = (k + 1) / 4, P = (p, q2, w) => [p[0] + (q2[0] - p[0]) * w, p[1] + (q2[1] - p[1]) * w]; fillPoly(g, [P(up(pa, DH + 5), up(pc, DH + 5), u), P(up(pa, DH + 5), up(pc, DH + 5), v), P(a1, c1, v), P(a1, c1, u)], "#fff6e6"); }
  line(g, ...a1, ...c1, "#2b2340");
  g.fillStyle = "#ffd36b"; const kn = W(Cc[0] - dx * .25, Cc[1] - dy * .25); g.fillRect(Math.round(kn[0]) - 1, Math.round(kn[1]) - SLAB - 9, 2, 2);
}
function renderBuilding(b, locked) {
  const bb = bbox(b), c = canvas(bb.w, bb.h), f = canvas(bb.w, bb.h), g = c.getContext("2d"), gf = f.getContext("2d"), r = rng(300 + Math.round(b.gx * 7 + b.gy));
  g.translate(-bb.x, -bb.y); gf.translate(-bb.x, -bb.y);
  const H = wallH(b), acc = b.c, E = edgesOf(b), dk = b.dark, P = b.poly.map(p => W(p[0], p[1]));
  if (b.k === "arquivo") {
    const p00 = W(b.gx, b.gy), p10 = W(b.gx + b.w, b.gy), p11 = W(b.gx + b.w, b.gy + b.d), p01 = W(b.gx, b.gy + b.d);
    box(g, p00, b.w, b.d, SLAB, "#b9bcc4", "#9a9ea8", "#7f838d", "#6a6e78");
    b.leds = [];
    for (let i = 0; i < 3; i++) { const o = up(W(b.gx + .6 + i * 1.6, b.gy + .7), SLAB); box(g, o, .9, b.d - 3.4, 28, "#4a5168", "#30364a", "#232838", "#171a26");
      for (let q = .08; q < b.d - 3.5; q += .24) for (let row = 0; row < 6; row++) { const p = up(add(o, .9, q), 4 + row * 4); b.leds.push([p[0] + 1, p[1] - 1, (r() * 3) | 0]); g.fillStyle = "#1a1d28"; g.fillRect(Math.round(p[0]), Math.round(p[1]) - 2, 4, 3); } }
    for (let i = 0; i < 3; i++) { const o = up(W(b.gx + .8 + i * 2.1, b.gy + b.d - 2.2), SLAB); box(g, o, 1.6, .9, 9, "#d9dce3", "#c3c7cf", "#a7abb5", "#7f838d"); const t = up(add(o, .8, .45), 9); blob(g, t[0], t[1], 6, 2, "#5f6470"); }
    const fence = (A, Bp, gg) => { line(gg, ...up(A, 14), ...up(Bp, 14), "#6a6e78"); const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]); for (let t = 0; t <= L; t += 6) { const x = A[0] + (Bp[0] - A[0]) * t / L, y = A[1] + (Bp[1] - A[1]) * t / L; line(gg, x, y, x, y - 14, "#7d818b"); } };
    fence(p00, p01, g); fence(p00, p10, g); fence(p01, p11, gf); fence(p10, p11, gf);
  } else {
    // laje: lados da frente e piso
    E.filter(e => e.front).forEach(e => { const A = W(...e.a), C2 = W(...e.c); fillPoly(g, [A, C2, up(C2, SLAB), up(A, SLAB)], dk ? "#2d2740" : "#cfc7b9"); line(g, ...A, ...C2, dk ? "#191526" : "#9b9384"); });
    fillPoly(g, P.map(p => up(p, SLAB)), dk ? "#3b3350" : "#ece7de");
    for (let x = b.gx; x < b.gx + b.w; x += .5) for (let y = b.gy; y < b.gy + b.d; y += .5) if (((x + y) * 2) % 2 === 1 && inPolyG(x + .25, y + .25, b.poly) && inPolyG(x + .01, y + .01, b.poly) && inPolyG(x + .49, y + .49, b.poly)) fillPoly(g, [up(W(x, y), SLAB), up(W(x + .5, y), SLAB), up(W(x + .5, y + .5), SLAB), up(W(x, y + .5), SLAB)], dk ? "#352e48" : "#e4dfd4");
    // tapete
    const rug = ngon([b.cx, b.cy + .3], Math.min(b.w, b.d) * .22, 12).map(p => up(W(...p), SLAB)); fillPoly(g, rug, rgba(acc, dk ? .35 : .2));
    // paredes de trás (vidro) e o que fica encostado nelas
    E.filter(e => !e.front).forEach(e => { glassWall(g, W(...e.a), W(...e.c), H, acc, false, r); posts(g, W(...e.a), W(...e.c), Math.max(1, Math.round(e.len / 2)), H, acc); });
    if (!b.round) { const top = E.filter(e => !e.front && Math.abs(e.a[1] - e.c[1]) < .01).sort((p, q) => q.len - p.len)[0];
      if (top) { const x0 = Math.min(top.a[0], top.c[0]), len = top.len - .8; const kinds = { ideias: "board", stories: "frames", titulos: "board", roteiro: "shelf", imagens: "easel", admin: "cabinet" }; if (kinds[b.k] && len > 1) wallItem(g, { gx: x0, gy: top.a[1], c: acc }, kinds[b.k], .4, Math.min(len, 5.5), r); } }
    if (b.k === "narracao") { const o = up(W(b.cx - .8, b.cy - 1.6), SLAB); box(g, o, 1.6, .9, 18, "#4a3f63", "#5a4d78", "#3e3454", "#2a2238"); const m = up(add(o, .8, .9), 9); g.fillStyle = "#9aa0b0"; g.fillRect(Math.round(m[0]) - 1, Math.round(m[1]) - 9, 3, 3); g.fillStyle = "#ff4d4d"; g.fillRect(Math.round(m[0]) + 6, Math.round(m[1]) - 14, 2, 1); }
    if (b.k === "montagem") { const o = up(W(b.cx - 1.6, b.cy - 2.6), SLAB); wallItem(g, { gx: b.cx - 1.6, gy: b.cy - 2.7, c: acc }, "timeline", 0, 3.2, r); }
    const pl = [[b.gx + b.w * .15, b.gy + b.d * .82], [b.gx + b.w * .85, b.gy + b.d * .2]].filter(p => inPolyG(p[0], p[1], b.poly)); pl.forEach(p => plant(g, W(...p), r));
    const dEdge = E.slice().sort((p, q) => distSeg(b.door[0], b.door[1], p.a, p.c) - distSeg(b.door[0], b.door[1], q.a, q.c))[0];
    if (!dEdge.front) drawDoor(g, b, dEdge, H);
    E.filter(e => !e.front).forEach(e => line(g, ...up(W(...e.a), SLAB + H), ...up(W(...e.c), SLAB + H), "#3b3350"));
    // paredes da frente
    E.filter(e => e.front).forEach(e => { glassWall(gf, W(...e.a), W(...e.c), H, acc, true, r); posts(gf, W(...e.a), W(...e.c), Math.max(1, Math.round(e.len / 2)), H, acc); });
    if (dEdge.front) drawDoor(gf, b, dEdge, H);
    E.filter(e => e.front).forEach(e => { line(gf, ...up(W(...e.a), SLAB + H), ...up(W(...e.c), SLAB + H), "#2b2340"); line(gf, ...W(...e.a), ...W(...e.c), "#2b2340"); });
    E.forEach(e => { const q = up(W(...e.a), SLAB); (e.front ? gf : g).fillStyle = "#2b2340"; (e.front ? gf : g).fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - H, 2, H); });
    if (b.pavilion) { const top = P.map(p => up(p, SLAB + H)); for (let i = 0; i < top.length; i++) line(gf, ...top[i], ...top[(i + 1) % top.length], "#ffffff"); }
  }
  if (locked) { const dim = cv2 => { const k = canvas(cv2.width, cv2.height), kg = k.getContext("2d"); kg.filter = "grayscale(.75) brightness(.82)"; kg.drawImage(cv2, 0, 0); return k; }; return { back: dim(c), front: dim(f), bb }; }
  return { back: c, front: f, bb };
}
const bCache = new Map();
function layers(b) { const L = !isUnlocked(b.k), key = b.k + (L ? ":L" : ""); if (!bCache.has(key)) bCache.set(key, renderBuilding(b, L)); return bCache.get(key); }
function buildingShadow(g, b) { const H = wallH(b) * .5; const P = b.poly.map(p => W(p[0], p[1])); fillPoly(g, hull([...P, ...P.map(p => [p[0] + H * .9, p[1] + H * .35])]), "rgba(28,70,24,.22)"); }
B.forEach(b => { if (b.poly) b.desks = deskSpots(b).map(([x, y]) => ({ x, y })); });

/* ============ ESTÁTUA NA ILHA ============ */
function drawFountain(g) {
  const [cx, cy] = W(C0[0], C0[1]);
  blob(g, cx, cy, 16, 7, "#9d978c"); blob(g, cx, cy - 2, 15, 6, "#bdb6aa");
  box(g, [cx, cy - 8], .55, .55, 8, "#d2cbbf", "#bdb5a8", "#a59d90", "#857e72");
  g.drawImage(ONION_STATUE.c, Math.round(cx - ONION_STATUE.ax), Math.round(cy - 2 - 8 - ONION_STATUE.ay));
}

/* ============ DIA E NOITE ============ */
function parkCfg() { if (!S.park) S.park = { time: "auto", amb: true, alert: true }; return S.park; }
function brasiliaHour() { try { const s = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()); const [h, m] = s.split(":").map(Number); return h + m / 60; } catch (e) { const d = new Date(); return d.getHours() + d.getMinutes() / 60; } }
let NF = 0, DUSK = 0;
function updateDaylight() {
  const mode = parkCfg().time;
  if (mode === "dia") { NF = 0; DUSK = 0; return; }
  if (mode === "noite") { NF = 1; DUSK = 0; return; }
  const h = brasiliaHour();
  NF = h >= 19 || h < 5 ? 1 : h >= 17 ? (h - 17) / 2 : h < 7 ? 1 - (h - 5) / 2 : 0;
  DUSK = (h >= 16.5 && h < 19.3) || (h >= 5 && h < 7.3) ? Math.max(0, 1 - Math.abs(NF - .5) * 2) : 0;
}
updateDaylight(); setInterval(updateDaylight, 30000);
const GLOW = (() => { const c = canvas(64, 64), g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,210,140,.8)"); r.addColorStop(1, "rgba(255,210,140,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c; })();

/* ============ SONS DO PARQUE ============ */
const ParkAudio = (() => {
  let ac = null, nextAmb = 0;
  function ensure() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === "suspended") ac.resume(); return ac; }
  function tone(f, t, d, type, gain, slideTo) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d * .7); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .02); }
  function chirp() { const t = ac.currentTime, n = 2 + (Math.random() * 3 | 0), base = 2600 + Math.random() * 1400; for (let i = 0; i < n; i++) tone(base + Math.random() * 600, t + i * .13, .09, "sine", .012, base * 1.6); }
  function cricket() { const t = ac.currentTime, n = 3 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) tone(4300 + Math.random() * 200, t + i * .085, .045, "sine", .006); }
  function jingle() { if (!ensure()) return; const t = ac.currentTime + .05; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * .1, .14, "square", .14)); tone(1318.5, t + .45, .35, "square", .14); tone(261.6, t + .45, .4, "triangle", .2); tone(392, t + .45, .4, "triangle", .12); }
  function tick() { const cfg = parkCfg(); if (!ac || !cfg.amb || ac.state !== "running") return; const now = performance.now(); if (now < nextAmb) return; if (NF < .5) chirp(); else cricket(); nextAmb = now + (NF < .5 ? 6000 + Math.random() * 10000 : 8000 + Math.random() * 14000); }
  ["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => ensure(), { once: true }));
  return { ensure, jingle, tick };
})();
window.parkJingle = () => { if (parkCfg().alert === false) return; ParkAudio.jingle(); };

/* ============ EQUIPE COM ROTINA ============ */
function routeTo(fx, fy, tx, ty) {
  const key = (x, y) => y * GW + x, cost = (x, y) => { const t = tileType(x, y); if (t === "void" || t === "water" || t === "lot" || t === "island" || t === "sand") return Infinity; return isWalk(t) ? 1 : 3; };
  const sx = Math.max(0, Math.min(GW - 1, Math.floor(fx))), sy = Math.max(0, Math.min(GH - 1, Math.floor(fy))), ex = Math.max(0, Math.min(GW - 1, Math.floor(tx))), ey = Math.max(0, Math.min(GH - 1, Math.floor(ty)));
  const dist = new Map([[key(sx, sy), 0]]), prev = new Map(), open = [[0, sx, sy]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]); const [d, x, y] = open.shift();
    if (x === ex && y === ey) break; if (d > (dist.get(key(x, y)) ?? Infinity)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const c = (nx === ex && ny === ey) ? 1 : cost(nx, ny); if (!isFinite(c)) continue; const nd = d + c; if (nd < (dist.get(key(nx, ny)) ?? Infinity)) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), [x, y]); open.push([nd, nx, ny]); } }
  }
  const path = []; let cur = [ex, ey];
  if (!prev.has(key(ex, ey))) return [[tx, ty]];
  while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift([cur[0] + .5, cur[1] + .5]); cur = prev.get(key(cur[0], cur[1])); }
  path.push([tx, ty]); return path;
}
const staff = [];
(function hire() { const r = rng(77); B.forEach(b => (b.desks || []).forEach((d, i) => staff.push({ b: b.k, desk: i, x: d.x, y: d.y, state: "desk", path: [], next: "desk", until: performance.now() + 10000 + r() * 40000, dir: 1, ph: r() * 16 | 0, ...person(r) }))); })();
const visitors = [];
(function guests() { const pts = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (TILE[y][x] === "path") pts.push([x + .5, y + .5]); for (let i = 0; i < 6; i++) { const p = pts[(R() * pts.length) | 0]; visitors.push({ x: p[0], y: p[1], tx: p[0], ty: p[1], sp: .03 + R() * .015, dir: 1, ph: R() * 8 | 0, ...person() }); } })();
function deskOf(s) { const b = BK[s.b]; return b.desks[s.desk]; }
function plan(s, want) {
  const from = BK[s.b]; let pts = [];
  if (s.shop) { const sh = s.shop, back = fromShop(sh); s.shop = null; pts = back.slice(0, -1); s.x = sh.door[0]; s.y = sh.door[1];
    const gi = back[back.length - 1]; pts.push(gi);
    const goal = want === "away" ? EXIT : from.door; pts.push(...routeTo(gi[0], gi[1], goal[0], goal[1])); if (want === "desk") { const d = deskOf(s); pts.push([d.x, d.y]); }
    if (want === "break") want = "desk";
    s.path = pts; s.state = "walk"; s.next = want; return; }
  const inside = s.state === "desk" || (from && inPolyG(s.x, s.y, from.poly));
  if (inside) pts.push(from.door);
  const start = pts.length ? pts[pts.length - 1] : [s.x, s.y];
  let goal, final = null;
  if (want === "desk") { goal = from.door; final = deskOf(s); }
  else if (want === "away") goal = EXIT;
  else if (OPEN_SHOPS.length && shopOpen() && NF < .3 && Math.random() < .35) { const sh = OPEN_SHOPS[(Math.random() * OPEN_SHOPS.length) | 0], gt = gateFor(sh); pts.push(...routeTo(start[0], start[1], gt.in[0], gt.in[1]), ...toShop(sh).slice(1)); s.path = pts; s.state = "walk"; s.next = "break"; s.goingShop = sh; return; }
  else { const sp = SPOTS[(Math.random() * SPOTS.length) | 0]; goal = [sp[0] + (Math.random() - .5) * .5, sp[1] + (Math.random() - .5) * .5]; }
  pts.push(...routeTo(start[0], start[1], goal[0], goal[1]));
  if (final) pts.push([final.x, final.y]);
  if (s.state === "away") { s.x = EXIT[0]; s.y = EXIT[1]; }
  s.path = pts; s.state = "walk"; s.next = want;
}
function nightNow() { return NF > .6; }
function thinkStaff() {
  const now = performance.now();
  staff.forEach(s => {
    if (s.state === "walk") return;
    const working = busy && busy.k === s.b;
    let want = s.state;
    if (nightNow() && !working) want = "away";
    else if (working) want = "desk";
    else if (s.state === "away") want = "desk";
    else if (s.state === "desk" && now > s.until) { if (Math.random() < .45) { want = "break"; } s.until = now + 20000 + Math.random() * 40000; }
    else if (s.state === "break" && now > s.until) want = "desk";
    if (want !== s.state) { plan(s, want); s.until = now + (want === "break" ? 15000 + Math.random() * 25000 : 20000 + Math.random() * 40000); }
  });
}
setInterval(thinkStaff, 1000);
function moveStaff() {
  staff.forEach(s => {
    if (s.state !== "walk" || !s.path.length) return;
    const [tx, ty] = s.path[0], dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy), sp = .06;
    if (d <= sp) { s.x = tx; s.y = ty; s.path.shift(); if (!s.path.length) { s.state = s.next; if (s.goingShop) { s.shop = s.goingShop; s.goingShop = null; } } }
    else { s.x += dx / d * sp; s.y += dy / d * sp; s.dir = (dx + dy) >= 0 ? 1 : -1; }
  });
  visitors.forEach(w => {
    const dx = w.tx - w.x, dy = w.ty - w.y, dist = Math.hypot(dx, dy);
    if (dist < .05) { const cx = Math.floor(w.x), cy = Math.floor(w.y); const o = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cx + a, cy + b]).filter(([a, b]) => tileType(a, b) === "path"); if (o.length) { const n = o[(R() * o.length) | 0]; w.tx = n[0] + .5; w.ty = n[1] + .5; } }
    else { w.x += dx / dist * w.sp; w.y += dy / dist * w.sp; w.dir = (dx + dy) >= 0 ? 1 : -1; }
  });
}
const presentCount = () => staff.filter(s => s.state !== "away").length;
function buildingLit(b) { return (busy && busy.k === b.k) || staff.some(s => s.b === b.k && s.state !== "away" && (s.state === "desk" || inPolyG(s.x, s.y, b.poly))); }

/* ============ GERENTE (piloto automático) ============ */
let manager = null;
const MGR_LOOK = { skin: "#e2ad86", hair: "#1c1c22", shirt: "#2b3142", pants: "#1f2330", style: 0 };
function doorOf(k) { const b = BK[k]; return b && b.door ? b.door : [C0[0], C0[1] - RING]; }
function mgrGo(k, say) {
  return new Promise(res => {
    const [tx, ty] = doorOf(k);
    if (!manager) { manager = { x: C0[0], y: C0[1] - RING, path: [], dir: 1, say: "" }; }
    manager.say = say || ("indo pra " + (BK[k] ? BK[k].n : "praça")); manager.k = k;
    if (manager.res) manager.res();
    manager.path = routeTo(manager.x, manager.y, tx, ty); manager.res = res;
    if (document.hidden) mgrArrive();
  });
}
function mgrArrive() { if (!manager) return; const p = manager.path[manager.path.length - 1]; if (p) { manager.x = p[0]; manager.y = p[1]; } manager.path = []; const r = manager.res; manager.res = null; if (r) r(); }
function mgrSay(t) { if (manager) manager.say = t; }
function mgrLeave() { manager = null; }
document.addEventListener("visibilitychange", () => { if (document.hidden && manager && manager.path.length) mgrArrive(); });
function updateManager() {
  if (!manager || !manager.path.length) return;
  const [tx, ty] = manager.path[0], dx = tx - manager.x, dy = ty - manager.y, d = Math.hypot(dx, dy), sp = .17;
  if (d <= sp) { manager.x = tx; manager.y = ty; manager.path.shift(); if (!manager.path.length) mgrArrive(); }
  else { manager.x += dx / d * sp; manager.y += dy / d * sp; manager.dir = (dx + dy) >= 0 ? 1 : -1; }
}

/* ============ RENDER ============ */
const cv = document.getElementById("park"), ctx = cv.getContext("2d");
const low = canvas(10, 10), lc = low.getContext("2d");
let zoom = 1, camX = 0, camY = 0, vw = 0, vh = 0, dpr = 1, frame = 0, hoverK = null;
const groundFinal = canvas(WORLD_W, WORLD_H);
function bakeGround() { paintGround(); const g = groundFinal.getContext("2d"); g.drawImage(ground, 0, 0); B.forEach(b => { if (b.poly) buildingShadow(g, b); }); trees.forEach(t => treeShadow(g, t)); }
bakeGround();
function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); vw = window.innerWidth; vh = window.innerHeight; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2; clampCam(); }
function center() { zoom = vw > 2200 ? 2 : vw < 700 ? .5 : 1; low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2; const [cx, cy] = W(C0[0], C0[1]); camX = cx - vw / zoom / 2; camY = cy - vh / zoom / 2 + 10; clampCam(); }
function clampCam() { const mw = vw / zoom, mh = vh / zoom; camX = Math.max(-mw * .35, Math.min(WORLD_W - mw * .65, camX)); camY = Math.max(-mh * .35, Math.min(WORLD_H - mh * .65, camY)); }
function drawDesk(g, dk, b, locked, isBusy, i, sitter) {
  const [x0, y0] = W(dk.x, dk.y), x = Math.round(x0), y = Math.round(y0) - SLAB;
  g.drawImage(DESK.c, x - DESK.ox, y - DESK.oy - 4);
  const sx = x - DESK.ox + DESK.sx, sy = y - DESK.oy - 4 + DESK.sy, on = !locked && sitter;
  if (!on) { g.fillStyle = "#2a2c33"; g.fillRect(sx, sy, 9, 6); }
  else { const fl = isBusy ? ((frame + dk.ph) >> 1) % 5 : -1; g.fillStyle = fl === 0 ? "#ffffff" : (isBusy ? b.c : "#9fd3f0"); g.fillRect(sx, sy, 9, 6); g.fillStyle = isBusy ? "rgba(255,255,255,.7)" : "rgba(40,90,130,.55)"; for (let k = 0; k < 3; k++) g.fillRect(sx + 1, sy + 1 + k * 2, 2 + (((dk.ph || i) + k * 3 + (isBusy ? frame >> 2 : 0)) % 6), 1); }
  if (sitter) { const typing = isBusy ? ((frame + sitter.ph) >> 1) % 2 : ((frame + sitter.ph) >> 4) % 6 === 0 ? 1 : 0; drawPersonAt(g, x + 1, y + 9, sitter, "sit", typing); }
}
function drawBuilding(g, b) {
  const L = layers(b), locked = !isUnlocked(b.k), isBusy = busy && busy.k === b.k;
  g.drawImage(L.back, L.bb.x, L.bb.y);
  if (b.k === "arquivo") (b.leds || []).forEach(([x, y, c], i) => { if (((frame >> 2) + i * 7) % 9 === 0) return; px(g, x, y, c === 0 ? "#5fe08a" : c === 1 ? "#7ab8ff" : ((frame >> 3) + i) % 4 ? "#5fe08a" : "#ffb347"); });
  else {
    const mine = staff.filter(s => s.b === b.k);
    b.desks.map((dk, i) => ({ dk, i })).sort((p, q) => (p.dk.x + p.dk.y) - (q.dk.x + q.dk.y)).forEach(({ dk, i }) => drawDesk(g, dk, b, locked, isBusy, i, mine.find(s => s.desk === i && s.state === "desk")));
    staff.filter(s => s.state === "walk" && inPolyG(s.x, s.y, b.poly)).sort((p, q) => (p.x + p.y) - (q.x + q.y)).forEach(s => { const [x, y] = W(s.x, s.y); drawPersonAt(g, x, y - SLAB, s, s.dir > 0 ? "front" : "back", ((frame + s.ph) >> 3) % 2); });
  }
  if (b.k === "montagem" && !locked) { const [cx, cy] = W(b.cx, b.cy), bob = Math.round(Math.sin(frame / 10) * 2); blob(g, cx + 3, cy - SLAB + 1, 12, 4, "rgba(60,30,80,.28)"); g.drawImage(ONION_BIG.c, Math.round(cx - ONION_BIG.ax), Math.round(cy - 30 + bob - ONION_BIG.ay)); }
  g.drawImage(L.front, L.bb.x, L.bb.y);
  if (hoverK === b.k) { const h = buildingHull(b); for (let i = 0; i < h.length; i++) { const a = h[i], c = h[(i + 1) % h.length]; line(g, a[0], a[1] - 1, c[0], c[1] - 1, "#ffffff"); } }
  if (locked) { const [cx, cy] = W(b.cx, b.cy), y = Math.round(cy - wallH(b) / 2 - 6), x = Math.round(cx); g.fillStyle = "#3a3f4b"; g.fillRect(x - 5, y, 11, 9); g.fillStyle = "#e9c46a"; g.fillRect(x - 4, y + 1, 9, 7); g.fillStyle = "#3a3f4b"; g.fillRect(x, y + 3, 1, 3); g.fillRect(x - 3, y - 5, 1, 5); g.fillRect(x + 3, y - 5, 1, 5); g.fillRect(x - 2, y - 6, 5, 1); }
}
function render() {
  frame++; updateManager(); moveStaff();
  walkers.forEach(w => { if (!w.courier) return; w.t += 1 / 110; const e = Math.min(1, w.t), nx = w.fx + (w.tox - w.fx) * e, ny = w.fy + (w.toy - w.fy) * e; w.dir = (nx + ny) >= (w.x + w.y) ? 1 : -1; w.x = nx; w.y = ny; if (w.t >= 1.15) w.dead = true; });
  for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].dead) walkers.splice(i, 1);
  if (manager && typeof AP !== "undefined" && AP.on && AP.follow && !drag) { const [mx, my] = W(manager.x, manager.y), visW = (panelKey && vw > 720) ? vw - Math.min(470, vw) : vw; camX += (mx - visW / zoom / 2 - camX) * .07; camY += (my - vh / zoom / 2 - camY) * .07; clampCam(); }
  const g = lc; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#88b864"; g.fillRect(0, 0, low.width, low.height);
  const cx = Math.round(camX), cy = Math.round(camY); g.translate(-cx, -cy); g.drawImage(groundFinal, 0, 0);
  for (let i = 0; i < 10; i++) { const a = (i * 2.399 + Math.floor(frame / 6) * .7) % 6.283, d = 1.3 + ((i * 37) % 10) / 10 * 1.4, [sx, sy] = W(C0[0] + Math.cos(a) * d, C0[1] + Math.sin(a) * d); g.fillStyle = "#d8f1ff"; g.fillRect(Math.round(sx), Math.round(sy), (i + frame >> 3) % 3 + 1, 1); }
  for (let i = 0; i < 2; i++) { const a = frame * .004 + i * 3, [sx, sy] = W(C0[0] + Math.cos(a) * 2, C0[1] + Math.sin(a) * 1.8); g.drawImage(DUCK[(frame >> 4) % 2], Math.round(sx) - 4, Math.round(sy) - 5); }
  const objs = [], present = presentCount();
  trees.forEach(t => objs.push({ d: t.x + t.y, f: () => drawTreeObj(g, t) }));
  lamps.forEach(l => objs.push({ d: l.x + l.y, f: () => drawLamp(g, l) }));
  benches.forEach(b2 => objs.push({ d: b2.x + b2.y, f: () => drawBench(g, b2) }));
  umbrellas.forEach(u => objs.push({ d: u.x + u.y, f: () => drawUmbrella(g, u) }));
  cars.slice(0, Math.max(2, Math.round(present / 2.4))).forEach(c => objs.push({ d: c.x + c.y, f: () => drawCar(g, c) }));
  staff.forEach(s => { if (s.state === "away" || s.state === "desk" || (s.state === "break" && s.shop)) return; if (s.state === "walk" && inBuildingAt(s.x, s.y)) return; objs.push({ d: s.x + s.y, f: () => { const [x, y] = W(s.x, s.y); const idle = s.state === "break"; drawPersonAt(g, x, y - (idle && ((frame + s.ph) >> 4) % 5 === 0 ? 1 : 0), s, s.dir > 0 ? "front" : "back", idle ? 0 : ((frame + s.ph) >> 3) % 2); } }); });
  if (NF < .8) visitors.forEach(w => objs.push({ d: w.x + w.y, f: () => { const [x, y] = W(w.x, w.y); drawPersonAt(g, x, y, w, w.dir > 0 ? "front" : "back", ((frame + w.ph) >> 3) % 2); } }));
  walkers.forEach(w => objs.push({ d: w.x + w.y, f: () => { const [x, y] = W(w.x, w.y); drawPersonAt(g, x, y, w, w.dir > 0 ? "front" : "back", (frame >> 3) % 2); g.fillStyle = "#e3a43f"; g.fillRect(Math.round(x) - 3, Math.round(y) - 21, 7, 5); } }));
  B.forEach(b => { if (b.poly) objs.push({ d: b.cx + b.cy, f: () => drawBuilding(g, b) }); });
  SHOPS.forEach(sh => objs.push({ d: sh.x + sh.w * .6 + sh.y + sh.d * .6, f: () => drawShop(g, sh) }));
  traffic.forEach(car => { car.s += car.sp; const q = perimAt(car.m, car.s); objs.push({ d: q[0] + q[1], f: () => drawMovingCar(g, car) }); });
  cityWalkers.forEach(w => { w.s += w.sp; const q = perimAt(w.m, w.s); objs.push({ d: q[0] + q[1], f: () => { const [x, y] = W(q[0], q[1]); drawPersonAt(g, x, y, w, (w.sp > 0) === (q[2] < 2) ? "front" : "back", ((frame + w.ph) >> 3) % 2); } }); });
  objs.push({ d: C0[0] + C0[1], f: () => drawFountain(g) });
  if (manager) objs.push({ d: manager.x + manager.y + .01, f: () => drawManager(g) });
  objs.sort((a, b2) => a.d - b2.d).forEach(o => o.f());
  // fim de tarde e noite: escurece, acende postes e as salas com gente
  if (DUSK > 0) { g.fillStyle = `rgba(255,140,70,${.13 * DUSK})`; g.fillRect(cx, cy, low.width, low.height); }
  if (NF > 0) {
    g.fillStyle = `rgba(14,18,52,${.58 * NF})`; g.fillRect(cx, cy, low.width, low.height);
    g.save(); g.globalCompositeOperation = "lighter";
    lamps.forEach(l => { const [x, y] = W(l.x, l.y); g.globalAlpha = .75 * NF; g.drawImage(GLOW, Math.round(x) - 32, Math.round(y) - 52); });
    SHOPS.forEach(sh => { if (!sh.n || !shopOpen()) return; for (let u = .8; u < sh.w; u += 1.6) { const [x, y] = up(W(sh.x + u, sh.y + sh.d), 9); g.globalAlpha = .5 * NF; g.drawImage(GLOW, Math.round(x) - 32, Math.round(y) - 32); } for (let v = .8; v < sh.d; v += 1.6) { const [x, y] = up(W(sh.x + sh.w, sh.y + v), 9); g.globalAlpha = .4 * NF; g.drawImage(GLOW, Math.round(x) - 32, Math.round(y) - 32); } });
    B.forEach(b => { if (!b.poly || b.k === "arquivo" || !buildingLit(b)) return; g.globalAlpha = .32 * NF; fillPoly(g, b.poly.map(p => up(W(p[0], p[1]), SLAB + 2)), "#ffcf8a"); g.globalAlpha = .14 * NF; fillPoly(g, buildingHull(b), "#ffd9a0"); });
    g.restore();
  }
  ParkAudio.tick();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = zoom < 1;
  ctx.drawImage(low, 0, 0, low.width, low.height, -(camX - cx) * zoom * dpr, -(camY - cy) * zoom * dpr, low.width * zoom * dpr, low.height * zoom * dpr);
  drawLabels(); drawManagerLabel();
  const ag = document.getElementById("agents"); if (ag && frame % 20 === 0) ag.textContent = present;
}
function toScreen(wx, wy) { return [(wx - camX) * zoom, (wy - camY) * zoom]; }
function labelAnchor(b) { const h = buildingHull(b); let top = h[0]; h.forEach(p => { if (p[1] < top[1]) top = p; }); const [cx] = W(b.cx, b.cy); return [cx, top[1] - 10]; }
function drawLabels() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ns = nextStage(), INK = "#2b2340";
  B.forEach(b => {
    if (!b.poly) return;
    const [wx, wy] = labelAnchor(b); const [x, y] = toScreen(wx, wy);
    if (x < -220 || x > vw + 220 || y < -60 || y > vh + 60) return;
    const locked = !isUnlocked(b.k), working = busy && busy.k === b.k, active = working || (ns === b.k && !busy), hov = hoverK === b.k;
    ctx.font = `700 13px "Pixelify Sans", monospace`; ctx.textBaseline = "middle";
    const txt = b.n, tw = ctx.measureText(txt).width, bw = Math.round(tw + 30), bh = 24, bx = Math.round(x - bw / 2), by = Math.round(y - 13) - (hov ? 2 : 0);
    // botão com sombra deslocada, no estilo do site
    const bg = locked ? "#ece8f1" : active ? "#f2c14e" : "#fff8ec";
    ctx.fillStyle = locked ? "rgba(43,35,64,.35)" : INK; ctx.fillRect(bx + 3, by + 3, bw, bh);
    ctx.fillStyle = bg; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = locked ? "#9d94ab" : INK; ctx.fillRect(bx, by, bw, 2); ctx.fillRect(bx, by + bh - 2, bw, 2); ctx.fillRect(bx, by, 2, bh); ctx.fillRect(bx + bw - 2, by, 2, bh);
    ctx.fillStyle = locked ? "#b9b3c4" : b.c; ctx.fillRect(bx + 8, by + bh / 2 - 4, 8, 8); ctx.fillStyle = locked ? "#9d94ab" : INK; ctx.fillRect(bx + 8, by + bh / 2 - 4, 8, 1); ctx.fillRect(bx + 8, by + bh / 2 + 3, 8, 1); ctx.fillRect(bx + 8, by + bh / 2 - 4, 1, 8); ctx.fillRect(bx + 15, by + bh / 2 - 4, 1, 8);
    ctx.fillStyle = locked ? "#8f879c" : INK; ctx.fillText(txt, bx + 22, by + bh / 2 + 1);
    if (working) {
      ctx.font = `500 12px "Figtree", sans-serif`; const t1 = busy.role || b.role, t2 = busy.action || "trabalhando";
      const w2 = Math.round(Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 24), yb = by + bh + 7, xb = Math.round(x - w2 / 2);
      ctx.fillStyle = INK; ctx.fillRect(xb + 3, yb + 3, w2, 38); ctx.fillStyle = "#ffffff"; ctx.fillRect(xb, yb, w2, 38);
      ctx.fillStyle = INK; ctx.fillRect(xb, yb, w2, 2); ctx.fillRect(xb, yb + 36, w2, 2); ctx.fillRect(xb, yb, 2, 38); ctx.fillRect(xb + w2 - 2, yb, 2, 38);
      ctx.fillStyle = b.c; ctx.fillRect(xb + 2, yb + 2, 4, 34);
      ctx.fillStyle = "#6c5f7b"; ctx.fillText(t1, xb + 12, yb + 12); ctx.fillStyle = "#231a2e"; ctx.font = `700 12px "Figtree", sans-serif`; ctx.fillText(t2, xb + 12, yb + 27);
    }
    if (ns === b.k && !busy) {
      // seta maior, piscando de leve
      const bob = Math.round(Math.sin(frame / 6) * 4), al = .65 + .35 * Math.abs(Math.sin(frame / 9)), ax = Math.round(x), ay = by - 26 + bob;
      ctx.globalAlpha = al;
      ctx.fillStyle = INK; for (let i = 0; i < 12; i++) ctx.fillRect(ax - 11 + i, ay + i, 23 - i * 2, 1);
      ctx.fillRect(ax - 5, ay - 9, 11, 10);
      ctx.fillStyle = "#f2c14e"; for (let i = 0; i < 9; i++) ctx.fillRect(ax - 8 + i, ay + 1 + i, 17 - i * 2, 1);
      ctx.fillRect(ax - 3, ay - 7, 7, 9);
      ctx.globalAlpha = 1;
    }
  });
}
const walkers = [];

function drawManager(g) {
  const [x0, y0] = W(manager.x, manager.y), x = Math.round(x0), y = Math.round(y0), walking = manager.path.length > 0;
  blob(g, x, y + 1, 7, 2, "rgba(224,177,74,.45)");
  drawPersonAt(g, x, y, MGR_LOOK, manager.dir > 0 ? "front" : "back", walking ? (frame >> 2) % 2 : 0);
  g.fillStyle = "#e0b14a"; g.fillRect(x - 1, y - 9, 2, 3);            // gravata
  g.fillStyle = "#c9a26b"; g.fillRect(x + 4, y - 10, 4, 5); g.fillStyle = "#ffffff"; g.fillRect(x + 5, y - 9, 2, 3);   // prancheta
  const s = ((frame >> 3) % 2) ? "#ffd166" : "#f2b82e"; g.fillStyle = s; g.fillRect(x - 1, y - 25, 3, 1); g.fillRect(x, y - 26, 1, 3);   // estrela
}


function drawManagerLabel() {
  if (!manager) return;
  const [wx, wy] = W(manager.x, manager.y); const [x, y] = toScreen(wx, wy - 30);
  ctx.font = `700 12px "Figtree", sans-serif`; ctx.textBaseline = "middle";
  const t1 = "Gerente", t2 = manager.say || ""; const w = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 22;
  const bx = Math.round(x - w / 2), by = Math.round(y - 40);
  ctx.fillStyle = "rgba(40,30,60,.25)"; ctx.fillRect(bx + 2, by + 2, Math.round(w), 34);
  ctx.fillStyle = "#fff8e6"; ctx.fillRect(bx, by, Math.round(w), 34); ctx.fillStyle = "#e0b14a"; ctx.fillRect(bx, by, Math.round(w), 2);
  ctx.fillStyle = "#8a6a1f"; ctx.fillText("★ " + t1, bx + 9, by + 11);
  ctx.fillStyle = "#2b2340"; ctx.font = `500 12px "Figtree", sans-serif`; ctx.fillText(t2, bx + 9, by + 25);
  ctx.fillStyle = "#fff8e6"; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x) - 5 + i, by + 34 + i, 11 - i * 2, 1);
}
let last = 0;
function loop(t) { if (t - last > 45) { last = t; render(); } requestAnimationFrame(loop); }

/* ============ ENTRADA ============ */
let drag = null;
function worldAt(sx, sy) { return [sx / zoom + camX, sy / zoom + camY]; }
function pointInPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
function hitBuilding(sx, sy) {
  const [wx, wy] = worldAt(sx, sy);
  for (let i = B.length - 1; i >= 0; i--) if (B[i].poly && pointInPoly(wx, wy, buildingHull(B[i]))) return B[i];
  for (const b of B) { if (!b.poly) continue; const [lx, ly] = labelAnchor(b); const [x, y] = toScreen(lx, ly); if (Math.abs(sx - x) < 90 && sy > y - 14 && sy < y + 12) return b; }
  return null;
}
// toque: dedo tem uma tolerância maior pra não virar "arrastar"; dois dedos dão zoom
const touches = new Map(); let pinch = null;
cv.addEventListener("pointerdown", e => {
  touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; return; }
  drag = { x: e.clientX, y: e.clientY, cx: camX, cy: camY, moved: false, tol: e.pointerType === "touch" ? 12 : 5 }; try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener("pointercancel", e => { touches.delete(e.pointerId); pinch = null; drag = null; cv.classList.remove("drag"); });
cv.addEventListener("touchend", e => e.preventDefault(), { passive: false });
cv.addEventListener("pointermove", e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && touches.size === 2) { const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (d / pinch.d > 1.35) { stepZoom(1, mx, my); pinch.d = d; } else if (d / pinch.d < .74) { stepZoom(-1, mx, my); pinch.d = d; } return; }
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > drag.tol) { drag.moved = true; cv.classList.add("drag"); } if (drag.moved) { camX = drag.cx - dx / zoom; camY = drag.cy - dy / zoom; clampCam(); } return; }
  const b = hitBuilding(e.clientX, e.clientY); const k = b ? b.k : null;
  if (k !== hoverK) { hoverK = k; cv.classList.toggle("hover", !!b); showInfo(b || BK[nextStage()] || null); }
});
cv.addEventListener("pointerup", e => { touches.delete(e.pointerId); if (pinch) { if (touches.size < 2) pinch = null; drag = null; return; } cv.classList.remove("drag"); if (drag && !drag.moved) { const b = hitBuilding(e.clientX, e.clientY); if (b) openPanel(b.k); } drag = null; });
cv.addEventListener("wheel", e => { e.preventDefault(); stepZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY); }, { passive: false });
// níveis de zoom: no celular dá pra afastar (0,5) e ver o campus inteiro
const ZL = [.5, 1, 2, 3, 4];
function stepZoom(dir, sx, sy) { const i = ZL.indexOf(zoom); setZoom(ZL[Math.max(0, Math.min(ZL.length - 1, (i < 0 ? 1 : i) + dir))], sx, sy); }
function setZoom(z, sx = vw / 2, sy = vh / 2) {
  z = Math.max(.5, Math.min(4, z)); if (z === zoom) return;
  const [wx, wy] = worldAt(sx, sy); zoom = z; camX = wx - sx / zoom; camY = wy - sy / zoom;
  low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2; clampCam();
}
document.getElementById("zoomIn").onclick = () => stepZoom(1);
document.getElementById("zoomOut").onclick = () => stepZoom(-1);
document.getElementById("libBtn").onclick = () => openPanel("arquivo");
document.getElementById("autoBtn").onclick = () => openPanel("auto");
document.getElementById("admBtn").onclick = () => openPanel("admin");
window.addEventListener("resize", resize);
document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });


/* ============ INÍCIO ============ */
resize(); center(); showInfo(null); renderProd();
requestAnimationFrame(loop);
