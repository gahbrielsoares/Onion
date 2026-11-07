/* Onion Park · mundo em pixel art 2.5D isométrica
 * Grade fina (1 pixel do mundo = 1 px CSS no zoom 1), bordas sem suavização,
 * luz do dia vinda do alto à esquerda, sombras em blocos de pixel.
 * Só desenha. Estado, etapas e painéis ficam em onion.js.
 */

/* ============ MUNDO / ISO ============ */
const TW = 32, TH = 16, GW = 46, GH = 37;
const OX = GH * TW / 2 + 60, OY = 140;
const WORLD_W = (GW + GH) * TW / 2 + 120, WORLD_H = (GW + GH) * TH / 2 + 230;
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

/* ============ TERRENO ============ */
function isPath(x, y) { return (y === 12 || y === 13 || y === 24 || y === 25 || x === 14 || x === 15 || x === 26 || x === 27); }
function inPlaza(x, y) { return x >= 24 && x <= 29 && y >= 22 && y <= 26; }
function pondD(x, y) { const dx = (x + .5 - 41.6) / 3.7, dy = (y + .5 - 17.6) / 3.2; return dx * dx + dy * dy; }
function inPond(x, y) { return pondD(x, y) < 1; }
function inBuilding(x, y, m = 0) { return B.some(b => x >= b.gx - m && x < b.gx + b.w + m && y >= b.gy - m && y < b.gy + b.d + m); }
function tileType(x, y) {
  if (x < 0 || y < 0 || x >= GW || y >= GH) return "void";
  if (inPond(x, y)) return "water";
  if (pondD(x, y) < 1.45) return "sand";
  if (inPlaza(x, y)) return "plaza";
  if (inBuilding(x, y)) return "lot";
  if (isPath(x, y) && x > 0 && y > 0 && x < GW - 1 && y < GH - 1) return "path";
  return "grass";
}
const isWalk = t => t === "path" || t === "plaza";
const nearFountain = (x, y) => x >= 25 && x <= 28 && y >= 23 && y <= 25;

const ground = canvas(WORLD_W, WORLD_H);
function paintGround() {
  const g = ground.getContext("2d"), r = rng(11);
  const GR = ["#62b04c", "#5ca947", "#68b752", "#57a243"], PA = ["#dcbd8e", "#d6b586", "#e1c497"], PL = ["#d3cdc2", "#c9c2b6"];
  // tiles
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const t = tileType(x, y); const p0 = W(x, y), p1 = W(x + 1, y), p2 = W(x + 1, y + 1), p3 = W(x, y + 1);
    let col = GR[(x * 7 + y * 13 + (r() * 4 | 0)) % 4];
    if (t === "path") col = PA[(r() * 3) | 0];
    if (t === "plaza") col = PL[(x + y) % 2];

    if (t === "lot") col = "#5aa246";
    fillPoly(g, [p0, p1, p2, p3], col);
  }
  // textura: tufos, flores, pedrinhas, rejunte da praça, seixos do caminho
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const t = tileType(x, y);
    const n = t === "grass" || t === "sand" ? 14 : t === "path" ? 6 : 0;
    for (let i = 0; i < n; i++) {
      const u = r(), v = r(), [qx, qy] = W(x + u, y + v), q = r();
      if (t === "grass" || t === "sand") {
        if (q < .45) { px(g, qx, qy, "#4b9139"); px(g, qx, qy - 1, "#4b9139"); }
        else if (q < .8) { px(g, qx, qy, "#7cc662"); }
        else if (q < .9) { const fc = ["#ffffff", "#ffe066", "#ff9ec4", "#c7a8ff"][(r() * 4) | 0]; px(g, qx, qy - 1, fc); px(g, qx, qy, "#3f7d31"); }
        else if (q < .95) { px(g, qx, qy, "#a4a29a"); px(g, qx + 1, qy, "#8a887f"); }
      } else if (t === "path") { px(g, qx, qy, q < .5 ? "#c4a272" : "#ead2a6"); }
      else if (t === "water") { g.fillStyle = "#7cc6ea"; g.fillRect(Math.round(qx), Math.round(qy), 3, 1); }
      else if (t === "sand") { px(g, qx, qy, "#cdb57f"); }
    }
    if (t === "plaza") { const a = W(x, y), b2 = W(x + 1, y), c = W(x, y + 1); line(g, ...a, ...b2, "#b4ac9f"); line(g, ...a, ...c, "#b4ac9f"); }
  }
  // bordas dos caminhos e da areia (contorno mais escuro do lado da grama)
  const edge = (x, y, t, nt, col) => {
    if (tileType(x, y - 1) === nt) line(g, ...W(x, y), ...W(x + 1, y), col);
    if (tileType(x - 1, y) === nt) line(g, ...W(x, y), ...W(x, y + 1), col);
    if (tileType(x, y + 1) === nt) line(g, ...W(x, y + 1), ...W(x + 1, y + 1), col);
    if (tileType(x + 1, y) === nt) line(g, ...W(x + 1, y), ...W(x + 1, y + 1), col);
  };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const t = tileType(x, y);
    if (t === "path") edge(x, y, t, "grass", "#b6956a");
  }
  // lago com margem orgânica
  const [pcx, pcy] = W(41.6, 17.6), rr = rng(5);
  const wob = Array.from({ length: 200 }, (_, i) => Math.sin(i * .21) * .05 + Math.sin(i * .53 + 1) * .035 + (rr() - .5) * .02);
  const lake = (rx, ry, col, k = 1, dy = 0) => { g.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + .5)) ** 2)) * (1 + wob[(y + ry) % 200] * k)); if (w > 0) g.fillRect(Math.round(pcx - w + wob[(y + ry + 40) % 200] * 18 * k), Math.round(pcy + y + dy), w * 2, 1); } };
  lake(96, 48, "#d9c48f"); lake(92, 45, "#e8d4a2"); lake(82, 40, "#2f7aa8"); lake(80, 39, "#4aa3d3"); lake(62, 29, "#3f93c5", .6, 2); lake(36, 16, "#3787ba", .4, 3);
  for (let i = 0; i < 70; i++) { const a = rr() * 6.283, d = Math.sqrt(rr()) * .85; g.fillStyle = "#7cc6ea"; g.fillRect(Math.round(pcx + Math.cos(a) * 78 * d), Math.round(pcy + Math.sin(a) * 37 * d), 2 + (rr() * 4 | 0), 1); }
  for (let i = 0; i < 40; i++) { const a = rr() * 6.283; px(g, pcx + Math.cos(a) * 88, pcy + Math.sin(a) * 43, rr() < .5 ? "#c7ad75" : "#a4a29a"); }
  [[-40, 14], [30, -18], [52, 8]].forEach(([dx, dy]) => { blob(g, pcx + dx, pcy + dy, 5, 2, "#3f8f3a"); blob(g, pcx + dx - 1, pcy + dy - 1, 3, 1, "#62b04c"); px(g, pcx + dx + 2, pcy + dy - 1, "#ff9ec4"); });
  // penhasco nas bordas da frente (camadas de terra)
  const a = W(0, GH), b2 = W(GW, GH), c = W(GW, 0), H = 26;
  fillPoly(g, [a, b2, up(b2, -H), up(a, -H)], "#8a6844");
  fillPoly(g, [b2, c, up(c, -H), up(b2, -H)], "#6f5236");
  [[3, "#4d9a3a"], [5, "#7b5c3c"], [13, "#7f5f3e"], [20, "#73563a"]].forEach(([d, col]) => {
    fillPoly(g, [a, b2, up(b2, -d), up(a, -d)], col === "#4d9a3a" ? col : shade(col, 0));
  });
  fillPoly(g, [b2, c, up(c, -3), up(b2, -3)], "#3f8530");
  for (let i = 0; i < 900; i++) {
    const u = r(), d = 4 + r() * (H - 5);
    const onLeft = r() < .55, p = onLeft ? [a[0] + (b2[0] - a[0]) * u, a[1] + (b2[1] - a[1]) * u + d] : [b2[0] + (c[0] - b2[0]) * u, b2[1] + (c[1] - b2[1]) * u + d];
    px(g, p[0], p[1], r() < .5 ? (onLeft ? "#6e5134" : "#5a422b") : (onLeft ? "#a07c55" : "#836445"));
  }
  line(g, ...a, ...b2, "#3c7a2e"); line(g, ...b2, ...c, "#336a27");
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

/* ============ OBJETOS DO MAPA ============ */
const trees = [], lamps = [], benches = [], beds = [];
(function placeNature() {
  const r = rng(23);
  for (let i = 0; i < 2600; i++) {
    const x = r() * GW, y = r() * GH, tx = Math.floor(x), ty = Math.floor(y);
    const edge = tx < 3 || ty < 3 || tx > GW - 4 || ty > GH - 4;
    if (tileType(tx, ty) !== "grass" || inBuilding(tx, ty, 1) || inPlaza(tx, ty) || pondD(tx, ty) < 1.9) continue;
    let nearPath = false; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (isPath(tx + dx, ty + dy)) nearPath = true;
    const dense = edge ? .85 : nearPath ? .015 : .07;
    if (r() > dense) continue;
    if (trees.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) < (edge ? .75 : 1.1))) continue;
    const q = r(), kind = q < .38 ? "pine" : q < .62 ? "round" : q < .8 ? "round2" : "bush";
    trees.push({ x, y, spr: TREE_SPR[kind][(r() * 6) | 0] });
  }
  for (let x = 2; x < GW - 1; x += 5) { lamps.push({ x: x + .5, y: 11.75 }); lamps.push({ x: x + 2.5, y: 26.25 }); }
  for (let y = 3; y < GH - 1; y += 6) { lamps.push({ x: 13.75, y: y + .5 }); lamps.push({ x: 28.25, y: y + 3.5 }); }
  for (let i = lamps.length - 1; i >= 0; i--) { const l = lamps[i]; if (tileType(Math.floor(l.x), Math.floor(l.y)) !== "grass" || inBuilding(Math.floor(l.x), Math.floor(l.y), 1)) lamps.splice(i, 1); }
  [[23.6, 21.6], [30.4, 21.6], [23.6, 27.4], [37.5, 21.2], [44.2, 17.5], [8, 11.6], [20, 26.4]].forEach(([x, y]) => { if (tileType(Math.floor(x), Math.floor(y)) === "grass") benches.push({ x, y }); });
  B.forEach((b, i) => { if (b.k === "arquivo") return; const x = b.gx + b.w + .15, y = b.gy + 1; if (tileType(Math.floor(x), Math.floor(y)) === "grass") beds.push({ x, y, d: b.d - 2, seed: i }); });
})();

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
function drawBed(g, f) {
  const o = W(f.x, f.y), r = rng(50 + f.seed);
  box(g, o, .5, f.d, 3, "#6a4a2e", "#7d5a39", "#5f4329", "#4e3622");
  const cols = ["#ff8fb8", "#ffd166", "#ffffff", "#c7a8ff", "#ff7a59"];
  for (let i = 0; i < f.d * 9; i++) { const p = up(add(o, .08 + r() * .34, .1 + r() * (f.d - .2)), 4); px(g, p[0], p[1], "#3f8a35"); px(g, p[0], p[1] - 1, cols[(r() * cols.length) | 0]); }
}

/* ============ PRÉDIOS ============ */
function wallH(b) { return b.k === "titulos" ? 46 : b.k === "arquivo" ? 30 : 24; }
const SLAB = 4;
function buildingHull(b) {
  const H = wallH(b) + SLAB;
  const p00 = W(b.gx, b.gy), p10 = W(b.gx + b.w, b.gy), p11 = W(b.gx + b.w, b.gy + b.d), p01 = W(b.gx, b.gy + b.d);
  return [p01, p11, p10, up(p10, H), up(p00, H), up(p01, H)];
}
function bbox(b) {
  const h = buildingHull(b); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  h.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  return { x: Math.floor(x0) - 8, y: Math.floor(y0) - 34, w: Math.ceil(x1 - x0) + 16, h: Math.ceil(y1 - y0) + 44 };
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
const FEATURES = {
  virais: ["screens", "board"], ideias: ["board", "board"], titulos: ["board", "shelf"], roteiro: ["shelf", "shelf"], descricao: ["shelf", "board"],
  capa: ["frames", "easel"], imagens: ["easel", "frames"], narracao: ["booth"], montagem: ["timeline"], admin: ["cabinet"]
};
function renderBuilding(b, locked) {
  const bb = bbox(b), c = canvas(bb.w, bb.h), f = canvas(bb.w, bb.h), g = c.getContext("2d"), gf = f.getContext("2d"), r = rng(300 + b.gx * 7 + b.gy);
  g.translate(-bb.x, -bb.y); gf.translate(-bb.x, -bb.y);
  const H = wallH(b), acc = b.c;
  const p00 = W(b.gx, b.gy), p10 = W(b.gx + b.w, b.gy), p11 = W(b.gx + b.w, b.gy + b.d), p01 = W(b.gx, b.gy + b.d);
  if (b.k === "arquivo") {
    // pátio de servidores cercado
    box(g, p00, b.w, b.d, SLAB, "#b9bcc4", "#9a9ea8", "#7f838d", "#6a6e78");
    for (let i = 0; i < b.w * 2; i++) for (let j = 0; j < b.d * 2; j++) if ((i + j) % 2) fillPoly(g, [up(W(b.gx + i / 2, b.gy + j / 2), SLAB), up(W(b.gx + (i + 1) / 2, b.gy + j / 2), SLAB), up(W(b.gx + (i + 1) / 2, b.gy + (j + 1) / 2), SLAB), up(W(b.gx + i / 2, b.gy + (j + 1) / 2), SLAB)], "#b2b5bd");
    b.leds = [];
    for (let i = 0; i < 3; i++) {
      const o = up(W(b.gx + .5 + i * 1.3, b.gy + .6), SLAB);
      box(g, o, .8, b.d - 3.2, 28, "#4a5168", "#30364a", "#232838", "#171a26");
      for (let q = .08; q < b.d - 3.3; q += .22) for (let row = 0; row < 6; row++) { const p = up(add(o, .8, q), 4 + row * 4); b.leds.push([p[0] + 1, p[1] - 1, (r() * 3) | 0]); g.fillStyle = "#1a1d28"; g.fillRect(Math.round(p[0]), Math.round(p[1]) - 2, 4, 3); }
    }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const o = up(W(b.gx + 1 + i * 2, b.gy + b.d - 2.3 + j * 1.1), SLAB);
      box(g, o, 1.6, .9, 9, "#d9dce3", "#c3c7cf", "#a7abb5", "#7f838d");
      const t = up(add(o, .8, .45), 9); blob(g, t[0], t[1], 7, 3, "#5f6470"); blob(g, t[0], t[1], 5, 2, "#7c818d"); px(g, t[0], t[1], "#3a3d45");
    }
    // cerca de tela
    const fence = (A, Bp, gg) => { line(gg, ...up(A, 14), ...up(Bp, 14), "#6a6e78"); for (let t = 0; t <= 1.0001; t += 1 / (Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) / 6)) { const x = A[0] + (Bp[0] - A[0]) * t, y = A[1] + (Bp[1] - A[1]) * t; line(gg, x, y, x, y - 14, "#7d818b"); } };
    fence(p00, p01, g); fence(p00, p10, g); fence(p01, p11, gf); fence(p10, p11, gf);
  } else {
    // laje elevada
    const dk = b.dark;
    box(g, p00, b.w, b.d, SLAB, dk ? "#3b3350" : "#ece7de", dk ? "#2d2740" : "#cfc7b9", dk ? "#241f33" : "#b5ad9f", dk ? "#191526" : "#9b9384");
    for (let i = 0; i < b.w * 2; i++) for (let j = 0; j < b.d * 2; j++) if ((i + j) % 2) fillPoly(g, [up(W(b.gx + i / 2, b.gy + j / 2), SLAB), up(W(b.gx + (i + 1) / 2, b.gy + j / 2), SLAB), up(W(b.gx + (i + 1) / 2, b.gy + (j + 1) / 2), SLAB), up(W(b.gx + i / 2, b.gy + (j + 1) / 2), SLAB)], dk ? "#352e48" : "#e4dfd4");
    // tapete com a cor do prédio
    const rugA = W(b.gx + b.w * .3, b.gy + b.d * .55), rugD = [up(rugA, SLAB), up(W(b.gx + b.w * .7, b.gy + b.d * .55), SLAB), up(W(b.gx + b.w * .7, b.gy + b.d * .95), SLAB), up(W(b.gx + b.w * .3, b.gy + b.d * .95), SLAB)];
    fillPoly(g, rugD, rgba(acc, dk ? .35 : .22));
    // paredes do fundo
    glassWall(g, p01, p00, H, acc, false, r); glassWall(g, p00, p10, H, acc, false, r);
    posts(g, p01, p00, b.d, H, acc); posts(g, p00, p10, b.w, H, acc);
    // mezanino da torre
    if (b.k === "titulos") { const m = H * .52; fillPoly(g, [up(p00, SLAB + m), up(p10, SLAB + m), up(add(p10, 0, 2.2), SLAB + m), up(add(p00, 0, 2.2), SLAB + m)], "rgba(236,231,222,.9)"); line(g, ...up(add(p00, 0, 2.2), SLAB + m), ...up(add(p10, 0, 2.2), SLAB + m), shade(acc, -.25)); line(g, ...up(add(p00, 0, 2.2), SLAB + m + 4), ...up(add(p10, 0, 2.2), SLAB + m + 4), acc); }
    // móveis do fundo
    let u = .4; (FEATURES[b.k] || []).forEach(k => { const len = Math.min(b.w - u - .4, k === "booth" ? b.w - .8 : Math.max(2, (b.w - .8) / (FEATURES[b.k].length) - .3)); if (len > .6) { wallItem(g, b, k, u, len, r); u += len + .3; } });
    plant(g, W(b.gx + .35, b.gy + b.d - .4), r); plant(g, W(b.gx + b.w - .35, b.gy + .4), r);
    // paredes da frente (vidro com reflexo) e porta
    const door = Math.max(1, Math.floor(b.w / 2) - .5);
    glassWall(gf, p01, add(p01, door, 0), H, acc, true, r); glassWall(gf, add(p01, door + 1, 0), p11, H, acc, true, r);
    glassWall(gf, p10, p11, H, acc, true, r);
    posts(gf, p01, p11, b.w, H, acc); posts(gf, p10, p11, b.d, H, acc);
    const d0 = up(add(p01, door, 0), SLAB), d1 = up(add(p01, door + 1, 0), SLAB); line(gf, ...up(d0, H), ...up(d1, H), shade(acc, -.25)); line(gf, ...up(d0, H - 1), ...up(d1, H - 1), acc);
    fillPoly(g, [add(p01, door, 0), add(p01, door + 1, 0), add(p01, door + 1, .7), add(p01, door, .7)], "#cbb388");
  }
  if (locked) {
    const dim = (cv2) => { const k = canvas(cv2.width, cv2.height), kg = k.getContext("2d"); kg.filter = "grayscale(.75) brightness(.82)"; kg.drawImage(cv2, 0, 0); return k; };
    return { back: dim(c), front: dim(f), bb };
  }
  return { back: c, front: f, bb };
}
const bCache = new Map();
function layers(b) { const L = !isUnlocked(b.k), key = b.k + (L ? ":L" : ""); if (!bCache.has(key)) bCache.set(key, renderBuilding(b, L)); return bCache.get(key); }

// sombra dos prédios no chão (pra direita e pra baixo)
function buildingShadow(g, b) {
  const H = wallH(b) * .55, p10 = W(b.gx + b.w, b.gy), p11 = W(b.gx + b.w, b.gy + b.d), p01 = W(b.gx, b.gy + b.d);
  const off = [H * .9, H * .35];
  fillPoly(g, [p10, [p10[0] + off[0], p10[1] + off[1]], [p11[0] + off[0], p11[1] + off[1]], [p01[0] + off[0] * .6, p01[1] + off[1] * .6], p01, p11], "rgba(28,70,24,.24)");
}

/* ============ PRAÇA E ESTÁTUA ============ */
function drawFountain(g) {
  const [cx, cy] = W(27, 24);
  blob(g, cx + 6, cy + 4, 30, 10, "rgba(28,70,24,.16)");
  blob(g, cx, cy, 30, 13, "#9d978c"); blob(g, cx, cy - 2, 30, 13, "#bdb6aa"); blob(g, cx, cy - 2, 27, 11, "#4aa3d3"); blob(g, cx - 4, cy - 4, 18, 6, "#5cb4e0");
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + frame * .02; px(g, cx + Math.cos(a) * 20, cy - 2 + Math.sin(a) * 7, "#bfe6f8"); }
  box(g, [cx, cy - 10], .55, .55, 9, "#d2cbbf", "#bdb5a8", "#a59d90", "#857e72");
  g.drawImage(ONION_STATUE.c, Math.round(cx - ONION_STATUE.ax), Math.round(cy - 2 - 9 - ONION_STATUE.ay));
  for (let i = 0; i < 6; i++) { const ph = (frame * 2 + i * 9) % 30, a = i / 6 * 6.28; px(g, cx + Math.cos(a) * (6 + ph * .5), cy - 26 + ph * ph * .03 - ph * .4 + 10, "#d8f1ff"); }
}

/* ============ ANIMAÇÃO VIVA ============ */
const pathTiles = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (isWalk(tileType(x, y)) && !nearFountain(x, y)) pathTiles.push([x, y]);
const walkers = [];
for (let i = 0; i < 64; i++) { const p = pathTiles[R() * pathTiles.length | 0]; walkers.push({ x: p[0] + .5, y: p[1] + .5, tx: p[0] + .5, ty: p[1] + .5, ...person(), sp: .022 + R() * .018, dir: 1, ph: R() * 8 | 0 }); }
const chatters = [[24.4, 22.4], [24.9, 22.2], [29.4, 26.4], [29.0, 26.7], [24.3, 26.6]].map(([x, y]) => ({ x, y, ...person(), ph: R() * 20 | 0 }));
const ducks = [0, 1, 2].map(i => ({ a: i * 2.1, r: .55 + i * .12, sp: .004 + i * .0015 }));
const birds = [0, 1, 2].map(i => ({ x: -100 - i * 40, y: 120 + i * 35, sp: .7 + i * .15 }));
B.forEach(b => {
  b.desks = []; if (b.k === "arquivo") return;
  const r = rng(900 + b.gx * 3 + b.gy);
  const y0 = b.k === "titulos" ? 3 : 1.85;
  for (let j = y0; j < b.d - .7; j += 1.35) for (let i = 1.0; i < b.w - .7; i += 1.15) {
    if (b.k === "narracao" && j < 2) continue;
    b.desks.push({ x: b.gx + i, y: b.gy + j, ...person(r), ph: r() * 16 | 0 });
  }
});
document.getElementById("agents").textContent = B.reduce((a, b) => a + b.desks.length, 0) + walkers.length + chatters.length;

/* ============ RENDER ============ */
const cv = document.getElementById("park"), ctx = cv.getContext("2d");
const low = canvas(10, 10), lc = low.getContext("2d");
let zoom = 1, camX = 0, camY = 0, vw = 0, vh = 0, dpr = 1, frame = 0, hoverK = null;
const groundFinal = canvas(WORLD_W, WORLD_H);
function bakeGround() {
  paintGround();
  const g = groundFinal.getContext("2d"); g.drawImage(ground, 0, 0);
  B.forEach(b => buildingShadow(g, b));
  trees.forEach(t => treeShadow(g, t));
  beds.forEach(f => drawBed(g, f));
}
bakeGround();

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2); vw = window.innerWidth; vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2; clampCam();
}
function center() {
  zoom = vw > 2200 ? 2 : 1;
  low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2;
  camX = WORLD_W / 2 - vw / zoom / 2; camY = WORLD_H / 2 - vh / zoom / 2 + 20; clampCam();
}
function clampCam() {
  const mw = vw / zoom, mh = vh / zoom;
  camX = Math.max(-mw * .35, Math.min(WORLD_W - mw * .65, camX));
  camY = Math.max(-mh * .35, Math.min(WORLD_H - mh * .65, camY));
}
function drawDesk(g, dk, b, locked, isBusy, i) {
  const [x0, y0] = W(dk.x, dk.y), x = Math.round(x0), y = Math.round(y0) - SLAB;
  g.drawImage(DESK.c, x - DESK.ox, y - DESK.oy - 4);
  const sx = x - DESK.ox + DESK.sx, sy = y - DESK.oy - 4 + DESK.sy;
  if (locked) { g.fillStyle = "#2a2c33"; g.fillRect(sx, sy, 9, 6); }
  else {
    const fl = isBusy ? ((frame + dk.ph) >> 1) % 5 : -1;
    g.fillStyle = fl === 0 ? "#ffffff" : (isBusy ? b.c : "#9fd3f0"); g.fillRect(sx, sy, 9, 6);
    g.fillStyle = isBusy ? "rgba(255,255,255,.7)" : "rgba(40,90,130,.55)";
    for (let k = 0; k < 3; k++) g.fillRect(sx + 1, sy + 1 + k * 2, 2 + ((dk.ph + k * 3 + (isBusy ? frame >> 2 : 0)) % 6), 1);
  }
  if (!locked || i % 3 === 0) {
    const typing = !locked && (isBusy ? ((frame + dk.ph) >> 1) % 2 : ((frame + dk.ph) >> 4) % 6 === 0 ? 1 : 0);
    drawPersonAt(g, x + 1, y + 9, dk, "sit", typing);
  }
}
function drawBuilding(g, b) {
  const L = layers(b), locked = !isUnlocked(b.k), isBusy = busy && busy.k === b.k;
  g.drawImage(L.back, L.bb.x, L.bb.y);
  if (b.k === "arquivo") {
    (b.leds || []).forEach(([x, y, c], i) => { if (((frame >> 2) + i * 7) % 9 === 0) return; px(g, x, y, c === 0 ? "#5fe08a" : c === 1 ? "#7ab8ff" : ((frame >> 3) + i) % 4 ? "#5fe08a" : "#ffb347"); });
  } else {
    b.desks.slice().sort((a, c) => (a.x + a.y) - (c.x + c.y)).forEach((dk, i) => drawDesk(g, dk, b, locked, isBusy, i));
  }
  if (b.k === "montagem" && !locked) {
    const [cx, cy] = W(b.gx + b.w / 2, b.gy + b.d / 2), bob = Math.round(Math.sin(frame / 10) * 2);
    blob(g, cx + 3, cy - SLAB + 1, 12, 4, "rgba(60,30,80,.28)");
    g.drawImage(ONION_BIG.c, Math.round(cx - ONION_BIG.ax), Math.round(cy - 44 + bob - ONION_BIG.ay + 20));
    if (isBusy) for (let i = 0; i < 6; i++) { const a = frame * .08 + i * 1.05; px(g, cx + Math.cos(a) * 18, cy - 36 + bob + Math.sin(a) * 6, "#ffd166"); }
  }
  g.drawImage(L.front, L.bb.x, L.bb.y);
  if (hoverK === b.k) { const h = buildingHull(b); for (let i = 0; i < h.length; i++) { const a = h[i], c = h[(i + 1) % h.length]; line(g, a[0], a[1] - 1, c[0], c[1] - 1, "#ffffff"); } }
  if (locked) { const [cx, cy] = W(b.gx + b.w / 2, b.gy + b.d / 2); const y = Math.round(cy - wallH(b) / 2 - 6), x = Math.round(cx);
    g.fillStyle = "#3a3f4b"; g.fillRect(x - 5, y, 11, 9); g.fillStyle = "#e9c46a"; g.fillRect(x - 4, y + 1, 9, 7); g.fillStyle = "#3a3f4b"; g.fillRect(x, y + 3, 1, 3);
    g.fillStyle = "#3a3f4b"; g.fillRect(x - 3, y - 5, 1, 5); g.fillRect(x + 3, y - 5, 1, 5); g.fillRect(x - 2, y - 6, 5, 1); }
}
function updateWalkers() {
  walkers.forEach(w => {
    if (w.courier) { w.t += 1 / 110; const e = Math.min(1, w.t); const nx = w.fx + (w.tox - w.fx) * e, ny = w.fy + (w.toy - w.fy) * e; w.dir = (nx + ny) >= (w.x + w.y) ? 1 : -1; w.x = nx; w.y = ny; if (w.t >= 1.15) w.dead = true; return; }
    const dx = w.tx - w.x, dy = w.ty - w.y, dist = Math.hypot(dx, dy);
    if (dist < .05) {
      const cx = Math.floor(w.x), cy = Math.floor(w.y);
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cx + a, cy + b]).filter(([a, b]) => isWalk(tileType(a, b)) && !nearFountain(a, b));
      if (opts.length) { const o = opts[R() * opts.length | 0]; w.tx = o[0] + .5; w.ty = o[1] + .5; }
    } else { w.x += dx / dist * w.sp; w.y += dy / dist * w.sp; w.dir = (dx + dy) >= 0 ? 1 : -1; }
  });
  for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].dead) walkers.splice(i, 1);
}
function render() {
  frame++; updateWalkers();
  const g = lc; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#2f6b2a"; g.fillRect(0, 0, low.width, low.height);
  const cx = Math.round(camX), cy = Math.round(camY);
  g.translate(-cx, -cy);
  g.drawImage(groundFinal, 0, 0);
  // brilho da água
  for (let i = 0; i < 16; i++) { const a = (i * 2.399 + Math.floor(frame / 6) * .7) % 6.283, rr = ((i * 37) % 10) / 10 * .85; const x = 41.6 + Math.cos(a) * 3.2 * rr, y = 17.6 + Math.sin(a) * 2.7 * rr; if (inPond(Math.floor(x), Math.floor(y))) { const [sx, sy] = W(x, y); g.fillStyle = "#d8f1ff"; g.fillRect(Math.round(sx), Math.round(sy), (i + frame >> 3) % 3 + 1, 1); } }
  ducks.forEach((d, i) => { d.a += d.sp; const x = 41.6 + Math.cos(d.a) * 2.6 * d.r * 1.3, y = 17.6 + Math.sin(d.a) * 2.2 * d.r * 1.3; const [sx, sy] = W(x, y); g.drawImage(DUCK[(frame >> 4) % 2], Math.round(sx) - 4, Math.round(sy) - 5); });
  const objs = [];
  trees.forEach(t => objs.push({ d: t.x + t.y, f: () => drawTreeObj(g, t) }));
  lamps.forEach(l => objs.push({ d: l.x + l.y, f: () => drawLamp(g, l) }));
  benches.forEach(b2 => objs.push({ d: b2.x + b2.y, f: () => drawBench(g, b2) }));
  walkers.forEach(w => objs.push({ d: w.x + w.y, f: () => { const [x, y] = W(w.x, w.y); drawPersonAt(g, x, y, w, w.dir > 0 ? "front" : "back", ((frame + w.ph) >> 3) % 2);
    if (w.courier) { g.fillStyle = "#e3a43f"; g.fillRect(Math.round(x) - 3, Math.round(y) - 21, 7, 5); g.fillStyle = "#b8862a"; g.fillRect(Math.round(x) - 3, Math.round(y) - 21, 7, 1); } } }));
  chatters.forEach(p => objs.push({ d: p.x + p.y, f: () => { const [x, y] = W(p.x, p.y); drawPersonAt(g, x, y - (((frame + p.ph) >> 4) % 5 === 0 ? 1 : 0), p, "front", 0); } }));
  B.forEach(b => objs.push({ d: b.gx + b.gy + (b.w + b.d) / 2, f: () => drawBuilding(g, b) }));
  objs.push({ d: 27 + 24, f: () => drawFountain(g) });
  objs.sort((a, b2) => a.d - b2.d).forEach(o => o.f());
  // pássaros passando
  birds.forEach((bd, i) => { bd.x += bd.sp; if (bd.x > WORLD_W + 60) { bd.x = -80; bd.y = 60 + R() * 300; } const y = bd.y + Math.sin(frame / 15 + i) * 6, wing = (frame >> 2) % 2;
    g.fillStyle = "#2e3440"; g.fillRect(Math.round(bd.x), Math.round(y), 1, 1); g.fillRect(Math.round(bd.x) - 2, Math.round(y) - wing, 2, 1); g.fillRect(Math.round(bd.x) + 1, Math.round(y) - wing, 2, 1);
    g.fillStyle = "rgba(28,70,24,.18)"; g.fillRect(Math.round(bd.x) + 30, Math.round(y) + 140, 4, 1); });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, low.width, low.height, -(camX - cx) * zoom * dpr, -(camY - cy) * zoom * dpr, low.width * zoom * dpr, low.height * zoom * dpr);
  drawLabels();
}
function toScreen(wx, wy) { return [(wx - camX) * zoom, (wy - camY) * zoom]; }
function drawLabels() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ns = nextStage();
  B.forEach(b => {
    const H = wallH(b) + SLAB;
    const [wx, wy] = W(b.gx, b.gy); const [x, y] = toScreen(wx, wy - H - 10);
    if (x < -220 || x > vw + 220 || y < -60 || y > vh + 60) return;
    const locked = !isUnlocked(b.k);
    ctx.font = `600 13px "Pixelify Sans", monospace`; ctx.textBaseline = "middle";
    const txt = b.n, tw = ctx.measureText(txt).width;
    const bw = Math.round(tw + 26), bh = 21, bx = Math.round(x - bw / 2), by = Math.round(y - 12);
    ctx.fillStyle = "rgba(40,30,60,.25)"; ctx.fillRect(bx + 2, by + 2, bw, bh);
    ctx.fillStyle = locked ? "#e9e6ee" : "#ffffff"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = locked ? "#b9b3c4" : b.c; ctx.fillRect(bx, by, bw, 1); ctx.fillRect(bx, by + bh - 1, bw, 1); ctx.fillRect(bx, by, 1, bh); ctx.fillRect(bx + bw - 1, by, 1, bh);
    ctx.fillStyle = locked ? "#b9b3c4" : b.c; ctx.fillRect(bx + 7, by + bh / 2 - 3, 6, 6);
    ctx.fillStyle = locked ? "#8f879c" : "#2b2340"; ctx.fillText(txt, bx + 18, by + bh / 2 + 1);
    if (busy && busy.k === b.k) {
      ctx.font = `500 12px "Figtree", sans-serif`;
      const t1 = busy.role || b.role, t2 = busy.action || "trabalhando";
      const w2 = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 22, yb = by + bh + 6, xb = Math.round(x - w2 / 2);
      ctx.fillStyle = "rgba(40,30,60,.25)"; ctx.fillRect(xb + 2, yb + 2, Math.round(w2), 36);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(xb, yb, Math.round(w2), 36); ctx.fillStyle = b.c; ctx.fillRect(xb, yb, 3, 36);
      ctx.fillStyle = "#6c5f7b"; ctx.fillText(t1, xb + 10, yb + 11);
      ctx.fillStyle = "#231a2e"; ctx.font = `700 12px "Figtree", sans-serif`; ctx.fillText(t2, xb + 10, yb + 26);
    } else if (ns === b.k && !busy) {
      const bob = Math.round(Math.sin(frame / 6) * 3);
      ctx.fillStyle = "#3a2a10"; ctx.fillRect(Math.round(x) - 6, by - 15 + bob, 13, 2); 
      ctx.fillStyle = "#f2c14e";
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(x) - 6 + i, by - 14 + bob + i, 13 - i * 2, 1);
    }
  });
}
let last = 0;
function loop(t) { if (t - last > 45) { last = t; render(); } requestAnimationFrame(loop); }

/* ============ ENTRADA ============ */
let drag = null;
function worldAt(sx, sy) { return [sx / zoom + camX, sy / zoom + camY]; }
function pointInPoly(x, y, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins; } return ins; }
function hitBuilding(sx, sy) {
  const [wx, wy] = worldAt(sx, sy);
  for (let i = B.length - 1; i >= 0; i--) if (pointInPoly(wx, wy, buildingHull(B[i]))) return B[i];
  for (const b of B) { const [lx, ly] = W(b.gx, b.gy); const [x, y] = toScreen(lx, ly - wallH(b) - SLAB - 10); if (Math.abs(sx - x) < 90 && sy > y - 14 && sy < y + 12) return b; }
  return null;
}
cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, cx: camX, cy: camY, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", e => {
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; cv.classList.add("drag"); } if (drag.moved) { camX = drag.cx - dx / zoom; camY = drag.cy - dy / zoom; clampCam(); } return; }
  const b = hitBuilding(e.clientX, e.clientY); const k = b ? b.k : null;
  if (k !== hoverK) { hoverK = k; cv.classList.toggle("hover", !!b); showInfo(b || BK[nextStage()] || null); }
});
cv.addEventListener("pointerup", e => { cv.classList.remove("drag"); if (drag && !drag.moved) { const b = hitBuilding(e.clientX, e.clientY); if (b) openPanel(b.k); } drag = null; });
cv.addEventListener("wheel", e => { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 1 : -1), e.clientX, e.clientY); }, { passive: false });
function setZoom(z, sx = vw / 2, sy = vh / 2) {
  z = Math.max(1, Math.min(4, z)); if (z === zoom) return;
  const [wx, wy] = worldAt(sx, sy); zoom = z; camX = wx - sx / zoom; camY = wy - sy / zoom;
  low.width = Math.ceil(vw / zoom) + 2; low.height = Math.ceil(vh / zoom) + 2; clampCam();
}
document.getElementById("zoomIn").onclick = () => setZoom(zoom + 1);
document.getElementById("zoomOut").onclick = () => setZoom(zoom - 1);
document.getElementById("libBtn").onclick = () => openPanel("arquivo");
document.getElementById("admBtn").onclick = () => openPanel("admin");
window.addEventListener("resize", resize);
document.addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });

/* ============ INÍCIO ============ */
resize(); center(); showInfo(null); renderProd();
requestAnimationFrame(loop);
