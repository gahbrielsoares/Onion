/* Onion · Piloto automático
 * Produz N vídeos do começo ao fim. Em cada etapa a IA (o gerente) toma a decisão,
 * registra o motivo e caminha até o próximo prédio.
 */
const AP = { on: false, stop: false, total: 3, cur: 0, follow: true, region: null, dir: null, dirName: "", log: [], done: 0, err: null, startedAt: 0 };

function apLog(stage, text, kind) {
  AP.log.unshift({ t: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), stage, text, kind: kind || "" });
  if (AP.log.length > 200) AP.log.pop();
  if (panelKey === "auto") renderAutoLog();
}
function apCheck() { if (AP.stop) throw { code: "stopped", message: "Piloto automático parado por você." }; }

// pergunta à IA qual opção escolher; devolve {i, motivo}
async function decide(question, options, ctx) {
  mgrSay("decidindo…");
  const prompt = `Você é o gerente de produção de um canal faceless de YouTube e precisa decidir sozinho.
Canal: ${cfgText()}
${ctx ? ctx + "\n" : ""}Pergunta: ${question}
Opções:
${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Escolha a opção que mais aumenta visualizações, retenção e RPM para esse público. Responda só com JSON: {"escolha": número da opção, "motivo": "uma frase curta em português"}`;
  try {
    const r = await AI.json(prompt, { tier: "quick" });
    const i = Math.max(0, Math.min(options.length - 1, (parseInt(r.escolha, 10) || 1) - 1));
    return { i, motivo: r.motivo || "" };
  } catch (e) {
    if (e && e.code === "cancelled") throw e;
    return { i: 0, motivo: "não consegui decidir pela IA, fiquei com a primeira opção" };
  }
}
async function walk(k, say) { apCheck(); await mgrGo(k, say); apCheck(); mgrSay(say ? say.replace(/^indo pra /, "") : "trabalhando"); }
async function attempt(label, fn, ok, tries = 2) {
  for (let t = 1; t <= tries; t++) {
    apCheck(); await fn(); apCheck();
    if (ok()) return;
    if (t < tries) apLog(label, "deu erro, tentando de novo", "warn");
  }
  throw { code: "stage", message: `${label}: não deu certo depois de ${tries} tentativas.` };
}
const firstErr = () => ui.virErr || ui.titErr || ui.rotErr || ui.desErr || ui.capErr || ui.imgErr || ui.narErr || ui.cutErr;

/* ---------- etapas ---------- */
async function apIdea() {
  if (S.project) { apLog("Ideias", `continuando o vídeo em produção: “${S.project.title || S.project.idea.tema}” (${S.project.config.idioma})`); return; }
  const used = S.library.map(p => p.idea?.tema).concat(AP.usedTopics || []).filter(Boolean);
  let idea = null;
  if (S.ideias.length) {
    await walk("ideias", "indo pra fila de ideias");
    const opts = S.ideias.slice(0, 12);
    const d = opts.length > 1 ? await decide("Qual ideia da fila produzir agora?", opts.map(i => i.tema + (i.angulo ? ` (${i.angulo})` : ""))) : { i: 0, motivo: "era a única da fila" };
    idea = opts[d.i]; S.ideias = S.ideias.filter(i => i.id !== idea.id);
    apLog("Ideias", `escolhi “${idea.tema}”. ${d.motivo}`, "decision");
  } else {
    await walk("virais", "indo buscar temas virais");
    if (AP.region) S.viraisRegion = AP.region;
    await attempt("Virais", () => runVirais(), () => S.viraisResults.length > 0 && !ui.virErr);
    const cands = S.viraisResults.filter(v => !v.enviado && !used.includes(v.tema));
    const pool = cands.length ? cands : S.viraisResults;
    const d = await decide(`Qual destes temas virais (${S.viraisRegion}) vira o próximo vídeo? Evite repetir: ${used.slice(-10).join("; ") || "nenhum"}.`,
      pool.map(v => `${v.tema} — ${v.angulo} (potencial ${v.potencial}; ${v.porque})`));
    const v = pool[d.i]; v.enviado = true;
    idea = { id: Date.now() + Math.random(), tema: v.tema, angulo: v.angulo, origem: "Piloto · " + S.viraisRegion };
    apLog("Virais", `escolhi “${v.tema}”. ${d.motivo}`, "decision");
    courier("virais", "ideias");
    await walk("ideias", "levando a ideia pro Laboratório");
  }
  (AP.usedTopics = AP.usedTopics || []).push(idea.tema);
  S.project = newProject(idea); save(); renderProd();
  apLog("Ideias", `produção começou · vídeo em ${S.project.config.idioma}`, "ok");
  courier("ideias", "titulos");
}
async function apTitulos() {
  const P = S.project; if (P.done.titulos) return;
  await walk("titulos", "indo pra Torre dos Títulos");
  await attempt("Títulos", () => runTitulos(), () => P.titles.length > 0 && !ui.titErr);
  const d = await decide(`Qual título usar para o vídeo sobre “${P.idea.tema}”? O roteiro inteiro será escrito para ele.`, P.titles.map(t => `${t.titulo} [ângulo: ${t.angulo}; gatilho: ${t.gatilho}]`));
  P.title = P.titles[d.i].titulo; P.done.titulos = true; save(); renderProd();
  apLog("Títulos", `“${P.title}”. ${d.motivo}`, "decision"); courier("titulos", "roteiro");
}
async function apRoteiro() {
  const P = S.project; if (P.done.roteiro) return;
  await walk("roteiro", "indo pro Prédio dos Roteiros");
  await attempt("Roteiro", () => runRoteiro(), () => P.script.length >= nBlocks() && !ui.rotErr, 3);
  P.done.roteiro = true; save(); renderProd();
  apLog("Roteiro", `${P.script.length} blocos, ${wc(scriptText())} palavras`, "ok"); courier("roteiro", "descricao");
}
async function apDescricao() {
  const P = S.project; if (P.done.descricao) return;
  await walk("descricao", "indo pra Redação");
  await attempt("Descrição", () => runDescricao(), () => !!(P.description || "").trim() && !ui.desErr);
  P.done.descricao = true; save(); renderProd();
  apLog("Descrição", "descrição e hashtags prontas", "ok"); courier("descricao", "capa");
}
async function apCapa() {
  const P = S.project; if (P.done.capa) return;
  await walk("capa", "indo pro Ateliê de Capas");
  await attempt("Capa", () => runCapa(), () => (P.thumbs || []).length > 0 && (!AI.stageReady("image") || (P.thumbImg || []).some(x => x === "ok")));
  const okIdx = P.thumbs.map((_, i) => i).filter(i => !AI.stageReady("image") || P.thumbImg[i] === "ok");
  const d = await decide(`Qual texto de capa (thumbnail) usar para o título “${P.title}”?`, okIdx.map(i => P.thumbs[i]), P.thumbScene ? "Composição: " + P.thumbScene : "");
  P.thumbSel = okIdx[d.i]; P.done.capa = true; save(); renderProd();
  apLog("Capa", `versão ${P.thumbSel + 1}: “${P.thumbs[P.thumbSel]}”. ${d.motivo}`, "decision"); courier("capa", "imagens");
}
async function apImagens() {
  const P = S.project; if (P.done.imagens) return;
  await walk("imagens", "indo pro Prédio das Imagens");
  if (!P.scenes.length) {
    const d = await decide(`Qual estilo visual usar nas imagens do vídeo “${P.title}”?`, STYLES.map(s => s[0]), "Começo do roteiro: " + scriptText().slice(0, 600));
    P.style = STYLES[d.i][0]; save(); apLog("Imagens", `estilo “${P.style}”. ${d.motivo}`, "decision");
    await attempt("Cenas", () => runImagens(), () => P.scenes.length > 0);
  }
  if (AI.stageReady("image")) {
    for (let t = 0; t < 2 && P.scenes.some(s => s.img !== "ok"); t++) { apCheck(); apLog("Imagens", `refazendo ${P.scenes.filter(s => s.img !== "ok").length} imagens que falharam`, "warn"); await drawScenes(P.scenes.map((s, i) => i).filter(i => P.scenes[i].img !== "ok")); }
    const miss = P.scenes.filter(s => s.img !== "ok").length;
    if (miss === P.scenes.length) throw { code: "stage", message: "Imagens: nenhuma imagem foi gerada. " + (ui.imgErr || "") };
    if (miss) apLog("Imagens", `${miss} cenas sem imagem; o OnionCut usa a imagem vizinha nelas`, "warn");
  }
  P.done.imagens = true; save(); renderProd();
  apLog("Imagens", `${P.scenes.filter(s => s.img === "ok").length} imagens prontas`, "ok"); courier("imagens", "narracao");
}
async function apNarracao() {
  const P = S.project; if (P.done.narracao) return;
  await walk("narracao", "indo pro Estúdio de Narração");
  if (!P.voice) {
    const prov = AI.get().voice.provider;
    let list = voiceCache[prov]; if (!list) { list = await Voice.list(); voiceCache[prov] = list; }
    const want = (P.config.voz || "").toLowerCase();
    const pool = (list.filter(v => v.gender === want).length ? list.filter(v => v.gender === want) : list).slice(0, 40);
    const d = await decide(`Qual voz narra melhor o vídeo “${P.title}” (formato ${P.config.formato})?`, pool.map(v => `${v.name} (${v.gender}; ${v.desc})`));
    P.voice = pool[d.i].id; P.voiceName = pool[d.i].name; save();
    apLog("Narração", `voz ${P.voiceName}. ${d.motivo}`, "decision");
  }
  await attempt("Narração", () => (P.narr && P.narr.voiceId === P.voice && P.narr.chunks.some(c => c.st === "ok")) ? runNarracao(true) : runNarracao(false), () => !!P.narration, 3);
  P.done.narracao = true; save(); renderProd();
  apLog("Narração", `${P.narration.mins} min de áudio`, "ok"); courier("narracao", "montagem");
}
async function apMontagem() {
  const P = S.project;
  await walk("montagem", "indo pro OnionCut");
  const d = await decide(`Qual template de edição combina com o vídeo “${P.title}”?`, TEMPLATES);
  P.template = TEMPLATES[d.i]; P.captions = "Palavra por palavra"; P.res = AP.res || "1080p"; save();
  apLog("OnionCut", `template “${P.template}”, legenda palavra por palavra. ${d.motivo}`, "decision");
  await attempt("Montagem", () => runPrepare(), () => !!(Cut._R && Cut._R.pid === P.id));
  apLog("OnionCut", `${Cut._R.hits} de ${Math.max(0, Cut._R.scenes.length - 1)} trocas nas pausas da voz`, "ok");
  mgrSay("renderizando o vídeo");
  await apRender(P);
  apLog("OnionCut", `vídeo salvo: ${P.render.name}`, "ok");
  // biblioteca
  P.done.montagem = true; S.library.unshift(slimForLibrary(P)); S.project = null; Cut._R = null; save(); renderProd();
  courier("montagem", "arquivo");
  await walk("arquivo", "guardando no Arquivo");
}
async function apRender(P) {
  const R = Cut._R, name = `${slug(P.title)}.mp4`;
  let fh = null;
  if (AP.dir) { try { fh = await AP.dir.getFileHandle(name, { create: true }); } catch (e) { fh = null; apLog("OnionCut", "não consegui gravar na pasta escolhida; vou baixar o arquivo", "warn"); } }
  setBusy("montagem", "renderizando"); P.renderProg = 0; renderPanel();
  try {
    const out = await Cut.render(R, cutOpts(P), { fileHandle: fh, signal: busy.ctl.signal, onProgress: ({ f, total, fps, eta }) => {
      P.renderProg = f / total; setAction(`renderizando ${Math.round(f / total * 100)}% · falta ${fmtT(eta)}`); mgrSay(`renderizando ${Math.round(f / total * 100)}%`);
      if (panelKey === "auto") renderAutoHead();
    } });
    const vb = await keepVideo(P, out, fh);
    if (out.blob) saveBlob(out.blob, name);
    P.render = { name, res: P.res, mb: vb ? (vb.size / 1048576).toFixed(0) : null, secs: R.dur, at: Date.now(), stored: !!vb };
    // capa e descrição junto do vídeo
    const thumb = await Store.get(mkey(P.id, "thumb", P.thumbSel));
    const desc = new Blob([`${P.title}\n\n${P.description || ""}\n\n${(P.hashtags || []).join(" ")}\n`], { type: "text/plain;charset=utf-8" });
    if (AP.dir) {
      const put = async (n, b) => { try { const h = await AP.dir.getFileHandle(n, { create: true }); const w = await h.createWritable(); await w.write(b); await w.close(); } catch (e) {} };
      if (thumb) await put(`${slug(P.title)}-capa.jpg`, thumb); await put(`${slug(P.title)}-descricao.txt`, desc);
    } else { if (thumb) saveBlob(thumb, `${slug(P.title)}-capa.jpg`); saveBlob(desc, `${slug(P.title)}-descricao.txt`); }
  } catch (e) {
    P.renderProg = null; clearBusy();
    if (e.code === "cancelled") throw { code: "stopped", message: "Piloto automático parado por você." };
    throw { code: "stage", message: "Render: " + (e.message || "falhou") };
  }
  P.renderProg = null; save(); clearBusy();
}

/* ---------- laço principal ---------- */
async function runAuto() {
  if (AP.on) return;
  Object.assign(AP, { on: true, stop: false, cur: 0, done: 0, err: null, startedAt: Date.now(), usedTopics: [] });
  apLog("Gerente", `começando: ${AP.total} vídeo${AP.total > 1 ? "s" : ""}`, "ok");
  renderProd(); renderPanel();
  try {
    for (AP.cur = 1; AP.cur <= AP.total; AP.cur++) {
      renderProd(); apLog("Gerente", `vídeo ${AP.cur} de ${AP.total}`, "head");
      for (const step of [apIdea, apTitulos, apRoteiro, apDescricao, apCapa, apImagens, apNarracao, apMontagem]) { apCheck(); await step(); if (panelKey === "auto") renderAutoHead(); }
      AP.done++; apLog("Gerente", `✓ vídeo ${AP.cur} pronto`, "ok");
    }
    apLog("Gerente", `terminei: ${AP.done} vídeo${AP.done > 1 ? "s" : ""} pronto${AP.done > 1 ? "s" : ""}`, "ok"); toast(`Piloto automático: ${AP.done} vídeo(s) prontos`);
  } catch (e) {
    AP.err = e.message || "Algo deu errado."; apLog("Gerente", AP.err, e.code === "stopped" ? "warn" : "err");
    if (e.code !== "stopped") toast("Piloto automático parou: " + AP.err);
  }
  AP.on = false; mgrSay(AP.err ? "parado" : "tudo pronto!"); setTimeout(() => { if (!AP.on) mgrLeave(); }, 6000);
  renderProd(); renderPanel();
}
function stopAuto() { AP.stop = true; if (busy) interrupt(); apLog("Gerente", "parando…", "warn"); }
window.stopAuto = stopAuto;

/* ---------- painel ---------- */
function apReady() {
  const miss = [];
  if (!S.config) miss.push(["Configure o canal no Laboratório de Ideias", "ideias"]);
  if (!AI.ready()) miss.push(["Configure Textos na Administração", "admin"]);
  if (!AI.stageReady("image")) miss.push(["Configure Imagens e capas na Administração", "admin"]);
  if (!AI.stageReady("voice")) miss.push(["Configure Narração na Administração", "admin"]);
  if (!Cut.supported()) miss.push(["Use o Chrome ou o Edge no computador pra renderizar o vídeo", null]);
  return miss;
}
VIEWS.auto = () => {
  const miss = apReady();
  return `
  <p class="lead">O gerente cuida de tudo: escolhe o tema, o título, a capa, o estilo das imagens, a voz e o template, e caminha de prédio em prédio até o vídeo sair renderizado.</p>
  <div id="aphead"></div>
  ${AP.on ? "" : `
  ${S.config ? `<div class="card"><div class="t">Canal: ${esc(S.config.nicho)} · vídeos em <span style="color:var(--accent)">${esc(S.config.idioma)}</span></div><div class="m">${esc(S.config.publico)} · ${esc(S.config.formato)} · ${S.config.duracao} min · voz ${esc((S.config.voz || "").toLowerCase())} <a href="#" onclick="openPanel('ideias');return false" style="color:var(--accent)">alterar</a></div></div>` : ""}
  ${S.project ? `<div class="note" style="${S.config && S.project.config.idioma !== S.config.idioma ? "border:1px solid var(--danger)" : ""}"><b>Tem um vídeo pela metade:</b> “${esc(S.project.title || S.project.idea.tema)}” em ${esc(S.project.config.idioma)}. O piloto continua ele primeiro.${S.config && S.project.config.idioma !== S.config.idioma ? ` <b style="color:var(--danger)">Atenção: ele está em ${esc(S.project.config.idioma)}, mas o canal agora está em ${esc(S.config.idioma)}.</b>` : ""}<div class="btns" style="margin-top:6px"><button class="btn ghost small" id="apdisc">Descartar esse vídeo</button></div></div>` : ""}
  ${miss.length ? `<div class="note"><b>Antes de começar:</b>${miss.map(([t, k]) => `<div style="margin-top:6px">• ${esc(t)} ${k ? `<button class="btn ghost small" style="padding:3px 8px" onclick="openPanel('${k}')">abrir</button>` : ""}</div>`).join("")}</div>` : ""}
  <div class="row"><div class="field"><label for="apn">Quantos vídeos</label><input id="apn" type="number" min="1" max="20" value="${AP.total}"></div>
  <div class="field"><label for="apr">Região dos temas virais</label><select id="apr">${REGIOES.map(r => `<option ${r === (AP.region || S.viraisRegion) ? "selected" : ""}>${r}</option>`).join("")}</select></div></div>
  <div class="field"><label>Resolução</label>${pills("apres", RES, AP.res || "1080p")}</div>
  <div class="field"><label>Onde salvar os vídeos</label>
    <div class="btns" style="margin-top:0"><button class="btn ghost small" id="apdir" ${window.showDirectoryPicker ? "" : "disabled"}>📁 ${AP.dirName ? "Pasta: " + esc(AP.dirName) : "Escolher uma pasta"}</button>${AP.dirName ? `<button class="btn ghost small" id="apdirx">usar downloads</button>` : ""}</div>
    <p class="m" style="font-size:12px;margin:5px 0 0">${AP.dirName ? "Cada vídeo vai pra essa pasta com a capa e a descrição." : "Sem pasta, cada vídeo, capa e descrição são baixados. Escolher uma pasta evita vários avisos de download."}</p></div>
  <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:6px 0"><input type="checkbox" id="apfol" ${AP.follow ? "checked" : ""}> Câmera acompanha o gerente</label>
  <div class="note">Fila do Laboratório de Ideias é usada primeiro; sem ideias na fila, o gerente busca temas virais. Deixe esta aba aberta e visível: com ela em segundo plano o navegador desacelera o render.</div>
  <div class="btns"><button class="btn" id="apgo" ${miss.length || busy ? "disabled" : ""}>🤖 Gerar ${AP.total} vídeo${AP.total > 1 ? "s" : ""} no automático</button></div>`}
  <h3>Diário do gerente</h3><div id="aplog"></div>`;
};
function renderAutoHead() {
  const el = document.getElementById("aphead"); if (!el) return;
  if (!AP.on) { el.innerHTML = AP.log.length && !AP.on && (AP.done || AP.err) ? `<div class="card"><div class="t">${AP.err ? "Parado" : "✓ Concluído"}</div><div class="m">${AP.done} de ${AP.total} vídeos prontos${AP.err ? " · " + esc(AP.err) : ""}</div></div>` : ""; return; }
  const P = S.project, st = P ? STAGES.filter(s => P.done[s]).length : 0;
  const el2 = Math.round((Date.now() - AP.startedAt) / 1000);
  el.innerHTML = `<div class="card" style="border-color:var(--gold)">
    <div class="t">🤖 Vídeo ${AP.cur} de ${AP.total}${P && P.title ? ` · ${esc(P.title)}` : ""}</div>
    <div class="m">${busy ? `<span class="spin" style="vertical-align:-2px"></span> ${esc(BK[busy.k].n)}: ${esc(busy.action || "")}` : "gerente a caminho"} · ${fmtT(el2)} rodando</div>
    <div class="bar" style="margin-top:8px"><i style="width:${((AP.cur - 1) + st / STAGES.length) / AP.total * 100}%"></i></div>
    <div class="btns"><button class="btn ghost small" onclick="stopAuto()">⏹ Parar o piloto automático</button></div></div>`;
}
function renderAutoLog() {
  const el = document.getElementById("aplog"); if (!el) return;
  if (!AP.log.length) { el.innerHTML = `<div class="empty">As decisões do gerente aparecem aqui, com o motivo de cada escolha.</div>`; return; }
  const col = { decision: "var(--accent)", ok: "var(--ok)", warn: "var(--gold)", err: "var(--danger)", head: "var(--text)" };
  el.innerHTML = AP.log.slice(0, 80).map(l => `<div style="display:flex;gap:8px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)${l.kind === "head" ? ";font-weight:700" : ""}">
    <span style="color:var(--muted);flex:none;font-variant-numeric:tabular-nums">${l.t}</span><span style="flex:none;color:${col[l.kind] || "var(--muted)"};font-weight:600">${esc(l.stage)}</span><span>${l.kind === "decision" ? "🤔 " : ""}${esc(l.text)}</span></div>`).join("");
}
BIND.auto = el => {
  renderAutoHead(); renderAutoLog();
  if (AP.on) return;
  const dc = el.querySelector("#apdisc"); if (dc) dc.onclick = () => { if (!confirm("Descartar o vídeo pela metade?")) return; Store.delPrefix(`p${S.project.id}:`); S.project = null; Cut._R = null; save(); renderProd(); renderPanel(); };
  const n = el.querySelector("#apn"); n.oninput = () => { AP.total = Math.max(1, Math.min(20, +n.value || 1)); const b = el.querySelector("#apgo"); if (b) b.textContent = `🤖 Gerar ${AP.total} vídeo${AP.total > 1 ? "s" : ""} no automático`; };
  el.querySelector("#apr").onchange = e => { AP.region = e.target.value; };
  bindPills(el, "apres", v => { AP.res = v; });
  el.querySelector("#apfol").onchange = e => { AP.follow = e.target.checked; };
  const dir = el.querySelector("#apdir"); if (dir) dir.onclick = async () => { try { AP.dir = await showDirectoryPicker({ mode: "readwrite" }); AP.dirName = AP.dir.name; renderPanel(); } catch (e) {} };
  const dx = el.querySelector("#apdirx"); if (dx) dx.onclick = () => { AP.dir = null; AP.dirName = ""; renderPanel(); };
  el.querySelector("#apgo").onclick = () => { AP.region = el.querySelector("#apr").value; AP.log = []; closePanelSoft(); runAuto(); };
};
// fecha o painel pra deixar a animação à vista (o diário continua no botão 🤖)
function closePanelSoft() { if (window.innerWidth < 900) closePanel(); }
setInterval(() => { if (AP.on && panelKey === "auto") renderAutoHead(); }, 1000);
