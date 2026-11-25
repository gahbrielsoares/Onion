/* Onion · "Ver como funciona": demonstração guiada.
 * A mesma ferramenta, com tudo simulado: nenhuma chave de verdade, nenhuma chamada paga, nada sai do navegador.
 * Só roda com ?demo=1 no endereço (o index.html do app separa o armazenamento da demonstração). */
(() => {
  if (!window.ONION_DEMO) return;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = q => document.querySelector(q);

  /* ================== conteúdo fictício ================== */
  const KEY = "AQ.Ab8RN6demonstracaoOnionPark_chaveFicticia_9x2";
  const CANAL = { nicho: "Mistérios e Casos Não Resolvidos", publico: "Brasileiros adultos" };
  const TEMA = "O mistério do Triângulo das Bermudas";
  const IDEIA = "Criar um vídeo de curiosidade sobre os aviões misteriosos que sumiram no Triângulo das Bermudas";
  const ROTEIRO = "Cinco de dezembro de 1945. Cinco aviões da Marinha americana decolam da Flórida para um treino de rotina. Duas horas depois, o líder do voo manda uma mensagem estranha: as bússolas enlouqueceram e o oceano não parece normal. Depois disso, silêncio. Nenhum avião voltou. Nenhum destroço foi encontrado. O hidroavião enviado para o resgate também sumiu, com treze homens a bordo. Nascia ali a lenda do Triângulo das Bermudas, um pedaço do Atlântico entre Miami, Porto Rico e as Bermudas. Desde então, mais de cinquenta navios e vinte aviões teriam desaparecido na região. Mas aqui vem a virada: as seguradoras não cobram mais caro para atravessar o triângulo. Tempestades súbitas, correntes fortíssimas e muito tráfego explicam quase tudo. Quase. E é esse quase que ninguém consegue apagar. Você atravessaria o triângulo?";
  const TITULOS = [
    ["Cinco aviões sumiram aqui e ninguém achou nada", "o caso real do Voo 19", "curiosidade"],
    ["O Triângulo das Bermudas explicado em 1 minuto", "explicação rápida", "alívio"],
    ["A última mensagem antes do silêncio", "mensagem final do piloto", "suspense"],
    ["Por que as seguradoras não temem o Triângulo?", "contraste lenda x dados", "contraste"],
    ["13 homens foram resgatar e também sumiram", "resgate que desapareceu", "medo"],
    ["O que a ciência diz sobre o Triângulo", "visão científica", "prova"],
    ["50 navios desaparecidos: lenda ou exagero?", "números em dúvida", "dúvida"],
    ["As bússolas enlouqueceram em 1945", "detalhe técnico", "curiosidade"],
    ["Você atravessaria o Triângulo das Bermudas?", "pergunta ao público", "desafio"],
    ["O mistério que nem a Marinha explicou", "autoridade sem resposta", "mistério"]
  ].map(([titulo, angulo, gatilho]) => ({ titulo, angulo, gatilho }));
  const DESCRICAO = { descricao: "O mistério do Triângulo das Bermudas começa com o Voo 19, em 1945.\nCinco aviões sumiram sem deixar rastro e o resgate também desapareceu.\nSe você curte casos assim, se inscreva no canal.\nVocê atravessaria o triângulo? Conta nos comentários!", hashtags: ["#TriânguloDasBermudas", "#Mistério", "#Shorts", "#Curiosidades"] };
  const IMAGENS = [
    ["i1", "Esquadrilha de aviões em 1945", "planes"], ["i2", "Céu sobre o Atlântico", "sunset"], ["i3", "Bússola antiga", "compass"],
    ["i4", "Oceano em tempestade", "storm"], ["i5", "Hidroavião de resgate", "seaplane"], ["i6", "Mapa do Triângulo das Bermudas", "map"],
    ["i7", "Navio no Atlântico", "ship"], ["i8", "Farol à noite", "lighthouse"]
  ];
  const BATIDAS = [
    ["Cinco de dezembro de 1945.", "data", "i2", "5 de dezembro de 1945", "Flórida, *EUA*"],
    ["Cinco aviões da Marinha americana decolam da Flórida", "filme", "i1", "", ""],
    ["Duas horas depois, o líder do voo manda", "citacao", "i3", "As bússolas enlouqueceram", "o líder do voo"],
    ["as bússolas enlouqueceram e o oceano não parece normal.", "foto", "i3", "", ""],
    ["Depois disso, silêncio.", "titulo", "i4", "SILÊNCIO", ""],
    ["Nenhum avião voltou. Nenhum destroço foi encontrado.", "foto", "i4", "", ""],
    ["O hidroavião enviado para o resgate também sumiu,", "filme", "i5", "", ""],
    ["Nascia ali a lenda do Triângulo das Bermudas,", "capitulo", "i6", "O Triângulo das Bermudas", "Capítulo *1*"],
    ["um pedaço do Atlântico entre Miami, Porto Rico", "diagrama", "i6", "Miami · Porto Rico · Bermudas", ""],
    ["Desde então, mais de cinquenta navios e vinte aviões", "foto", "i7", "", ""],
    ["Mas aqui vem a virada:", "titulo", "i8", "A VIRADA", ""],
    ["as seguradoras não cobram mais caro para atravessar", "foto", "i7", "", ""],
    ["Tempestades súbitas, correntes fortíssimas e muito tráfego", "foto", "i4", "", ""],
    ["Quase. E é esse quase que ninguém", "titulo", "i8", "QUASE.", ""],
    ["Você atravessaria o triângulo?", "foto", "i6", "", ""]
  ];

  /* ================== imagens desenhadas aqui mesmo ================== */
  function paint(kind, W = 1920, H = 1080) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const night = kind === "lighthouse" || kind === "storm", sky = g.createLinearGradient(0, 0, 0, H * .62);
    if (night) { sky.addColorStop(0, "#0b1424"); sky.addColorStop(1, kind === "storm" ? "#3a4656" : "#1d2c45"); }
    else { sky.addColorStop(0, "#27466e"); sky.addColorStop(.6, "#e39a5b"); sky.addColorStop(1, "#f6d28a"); }
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (kind === "map") {
      g.fillStyle = "#d9c79f"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(90,70,40,.25)"; g.lineWidth = 2;
      for (let x = 0; x < W; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = "#8fb3a8"; g.beginPath(); g.ellipse(W * .2, H * .3, 260, 160, .4, 0, 7); g.fill(); g.beginPath(); g.ellipse(W * .55, H * .85, 300, 90, 0, 0, 7); g.fill();
      const P = [[W * .3, H * .32], [W * .74, H * .26], [W * .56, H * .78]];
      g.fillStyle = "rgba(190,40,40,.18)"; g.strokeStyle = "#b3261e"; g.lineWidth = 8; g.setLineDash([26, 16]);
      g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#3a2a18"; P.forEach(p => { g.beginPath(); g.arc(p[0], p[1], 14, 0, 7); g.fill(); });
      return c;
    }
    if (kind === "compass") {
      g.fillStyle = "#2a2018"; g.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = H * .36, rg = g.createRadialGradient(cx, cy, 10, cx, cy, R);
      rg.addColorStop(0, "#f4ead2"); rg.addColorStop(1, "#c9b48a"); g.fillStyle = "#8a6a3a"; g.beginPath(); g.arc(cx, cy, R + 34, 0, 7); g.fill();
      g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.strokeStyle = "#5a4630"; g.lineWidth = 4;
      for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, l = i % 8 ? 20 : 46; g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); g.stroke(); }
      g.save(); g.translate(cx, cy); g.rotate(.7); g.fillStyle = "#b3261e"; g.beginPath(); g.moveTo(0, -R * .8); g.lineTo(24, 0); g.lineTo(-24, 0); g.fill(); g.fillStyle = "#33302c"; g.beginPath(); g.moveTo(0, R * .8); g.lineTo(24, 0); g.lineTo(-24, 0); g.fill(); g.restore();
      g.fillStyle = "#5a4630"; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill();
      return c;
    }
    // sol ou lua
    if (!night) { const sg = g.createRadialGradient(W * .7, H * .5, 10, W * .7, H * .5, 240); sg.addColorStop(0, "#fff4cf"); sg.addColorStop(1, "rgba(255,230,160,0)"); g.fillStyle = sg; g.fillRect(0, 0, W, H); }
    else if (kind === "lighthouse") { g.fillStyle = "#e9e4cf"; g.beginPath(); g.arc(W * .78, H * .18, 46, 0, 7); g.fill(); for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect((i * 211) % W, (i * 97) % (H * .5), 2, 2); } }
    // mar
    const sea = g.createLinearGradient(0, H * .62, 0, H); sea.addColorStop(0, night ? "#16263a" : "#2d5878"); sea.addColorStop(1, night ? "#08111c" : "#12304a");
    g.fillStyle = sea; g.fillRect(0, H * .62, W, H * .38);
    g.strokeStyle = night ? "rgba(160,190,220,.18)" : "rgba(255,225,170,.28)"; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) { const y = H * .64 + i * 15 + (i * i) % 9; g.beginPath(); for (let x = -20; x < W + 20; x += 40) g.lineTo(x, y + Math.sin(x / 70 + i) * (kind === "storm" ? 9 : 3)); g.stroke(); }
    if (kind === "storm") { g.fillStyle = "rgba(30,36,46,.75)"; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(W * (.1 + i * .14), H * .16 + (i % 2) * 40, 260, 90, 0, 0, 7); g.fill(); }
      g.strokeStyle = "#f8f2c8"; g.lineWidth = 6; g.beginPath(); g.moveTo(W * .58, H * .2); g.lineTo(W * .54, H * .36); g.lineTo(W * .6, H * .38); g.lineTo(W * .55, H * .58); g.stroke();
      g.strokeStyle = "rgba(200,210,230,.25)"; g.lineWidth = 2; for (let i = 0; i < 160; i++) { const x = (i * 137) % W, y = (i * 71) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 12, y + 34); g.stroke(); } }
    const ink = night ? "#05080d" : "#1b1626"; g.fillStyle = ink;
    const plane = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.ellipse(0, 0, 90, 13, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-40, -70); g.lineTo(-12, -70); g.lineTo(22, 0); g.lineTo(-12, 70); g.lineTo(-40, 70); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-78, 0); g.lineTo(-96, -30); g.lineTo(-84, -30); g.lineTo(-66, 0); g.closePath(); g.fill(); g.restore(); };
    if (kind === "planes") [[.3, .3, 1.1], [.48, .22, .9], [.62, .36, 1], [.42, .44, .8], [.74, .26, .7]].forEach(([x, y, s]) => plane(W * x, H * y, s));
    if (kind === "sunset") plane(W * .38, H * .3, .7);
    if (kind === "seaplane") { plane(W * .45, H * .4, 1.6); g.fillRect(W * .45 - 70, H * .4 + 40, 140, 12); }
    if (kind === "ship") { const x = W * .42, y = H * .64; g.beginPath(); g.moveTo(x - 320, y - 60); g.lineTo(x + 320, y - 60); g.lineTo(x + 250, y + 30); g.lineTo(x - 260, y + 30); g.closePath(); g.fill(); g.fillRect(x - 160, y - 140, 260, 80); g.fillRect(x - 40, y - 230, 40, 90); g.fillRect(x + 60, y - 210, 34, 70); }
    if (kind === "lighthouse") { const x = W * .3, y = H * .64; g.beginPath(); g.moveTo(x - 60, y); g.lineTo(x - 36, y - 420); g.lineTo(x + 36, y - 420); g.lineTo(x + 60, y); g.fill(); g.fillStyle = "#f6dc7a"; g.fillRect(x - 30, y - 470, 60, 50);
      const lg = g.createLinearGradient(x, 0, W, 0); lg.addColorStop(0, "rgba(255,230,140,.55)"); lg.addColorStop(1, "rgba(255,230,140,0)"); g.fillStyle = lg; g.beginPath(); g.moveTo(x, y - 445); g.lineTo(W, y - 620); g.lineTo(W, y - 300); g.closePath(); g.fill();
      g.fillStyle = ink; g.beginPath(); g.ellipse(x, y + 6, 260, 40, 0, 0, 7); g.fill(); }
    return c;
  }
  const blobOf = c => new Promise(r => c.toBlob(r, "image/jpeg", .86));

  /* ================== voz simulada (o tom some atrás da trilha; a prévia fala de verdade pelo navegador) ================== */
  function fakeVoice(text, speed = 1) {
    const SR = 24000, words = (text.match(/\S+/g) || []);
    const out = []; let t = 0;
    const push = (dur, on) => { const n = Math.round(dur * SR); for (let i = 0; i < n; i++, t++) {
      if (!on) { out.push((Math.random() - .5) * .002); continue; }
      const s = t / SR, syl = Math.pow(Math.sin(Math.PI * ((i / SR) * 4.6 % 1)), 2), f0 = 118 + 14 * Math.sin(s * 3.1);
      out.push(.09 * syl * (Math.sin(2 * Math.PI * f0 * s) * .6 + Math.sin(4 * Math.PI * f0 * s) * .3 + Math.sin(6 * Math.PI * f0 * s) * .1)); } };
    push(.25, false);
    words.forEach(w => { push(.36 / speed, true); if (/[.!?]$/.test(w)) push(.42, false); else if (/[,;:]$/.test(w)) push(.2, false); });
    push(.3, false);
    const b = new ArrayBuffer(44 + out.length * 2), v = new DataView(b), str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + out.length * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, out.length * 2, true);
    out.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 32767, true));
    return new Blob([b], { type: "audio/wav" });
  }
  function speak(text, rate = 1.05) {
    try { const ss = window.speechSynthesis; if (!ss) return; ss.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "pt-BR"; u.rate = rate;
      const v = ss.getVoices().find(x => /pt[-_]BR/i.test(x.lang)); if (v) u.voice = v; ss.speak(u); } catch (e) {}
  }
  const hush = () => { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} };

  /* ================== a IA de mentira ================== */
  async function stream(text, onText, ms = 2600) {
    const w = text.split(" "); let acc = "";
    for (let i = 0; i < w.length; i++) { acc += (i ? " " : "") + w[i]; if (onText && i % 3 === 0) onText({ text: acc }); await wait(ms / w.length); }
    onText && onText({ text: acc }); return acc;
  }
  function answer(prompt) {
    if (/"batidas"/.test(prompt) && /"imagens"/.test(prompt)) return {
      imagens: IMAGENS.map(([id, nome, k]) => ({ id, nome, tipo: "real", busca: nome, busca_ampla: nome, estilo: "reconstrucao", descricao: "", _k: k })),
      batidas: BATIDAS.map(([trecho, tipo, img, texto, subtexto]) => ({ trecho, tipo, img, imgs: [], texto, subtexto })) };
    if (/\{"titulos"/.test(prompt)) return { titulos: TITULOS };
    if (/\{"descricao"/.test(prompt)) return DESCRICAO;
    if (/"ideias"/.test(prompt)) return { ideias: [{ tema: TEMA, angulo: "o caso do Voo 19 contado como suspense", sinal: "", urgencia: "perene", nicho: "mistério" }] };
    if (/"cenas"/.test(prompt)) return { cenas: BATIDAS.map(b => ({ trecho: b[0], prompt: "ocean mystery scene" })) };
    return {};
  }
  AI.listModels = async (p, st) => {
    await wait(500);
    const ids = { text: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"], image: ["gemini-2.5-flash-image"], voice: ["gemini-2.5-flash-preview-tts"] }[st] || ["gemini-2.5-flash"];
    AI.setStage("models", { [p + ":" + st]: ids }); return ids;
  };
  AI.call = async (prompt, { onText } = {}) => {
    await wait(700);
    if (/roteiro|narrador vai ler/i.test(prompt)) return { text: await stream(ROTEIRO, onText), truncated: false };
    return { text: JSON.stringify(answer(prompt)), truncated: false };
  };
  AI.json = async prompt => { await wait(1400); return answer(prompt); };
  AI.image = async () => { await wait(600); return blobOf(paint(["sunset", "storm", "ship", "lighthouse"][Math.floor(Math.random() * 4)])); };
  if (typeof Collage !== "undefined") Collage.findReal = async (busca) => {
    await wait(350 + Math.random() * 400);
    const it = IMAGENS.find(x => x[1] === busca) || IMAGENS[0];
    return { blob: await blobOf(paint(it[2])), credit: "Imagem ilustrativa da demonstração" };
  };
  if (typeof Trends !== "undefined") Trends.collect = async () => { await wait(900); return { avisos: [] }; };
  Voice.synth = async (text, { speed = 1 } = {}) => { await wait(1200); return { blob: fakeVoice(text, speed) }; };
  Voice.findLeak = async () => ({ has: false });
  // amostra de voz: fala de verdade pelo navegador
  document.addEventListener("click", e => {
    const smp = e.target.closest && e.target.closest("[data-sample]");
    if (smp) { e.stopPropagation(); e.preventDefault(); speak("Olá! Esta é a minha voz, e é assim que vou narrar o seu vídeo."); return; }
    const full = e.target.closest && e.target.closest("#nplay");
    if (full) { e.stopPropagation(); e.preventDefault(); speak(ROTEIRO); toast("Na demonstração, a voz é a do seu navegador"); }
  }, true);
  // prévia do OnionCut: o navegador lê o roteiro junto com as imagens
  Cut.supported = () => true;
  const prev0 = Cut.preview;
  Cut.preview = (R, canvas, o, opts = {}) => {
    window.__demoPlayed = true;
    const w = ROTEIRO.split(" "), from = Math.floor((opts.from || 0) / (R.dur || 1) * w.length);
    speak(w.slice(from).join(" "), Math.max(.8, Math.min(1.6, (w.length / (R.dur || 60)) / 2.5)));
    const end = opts.onEnd; const h = prev0(R, canvas, o, { ...opts, onEnd: () => { hush(); end && end(); } });
    return { ...h, stop() { hush(); h.stop(); } };
  };
  // render simulado: no plano de verdade, aqui sai o MP4 pronto pra baixar
  window.runRender = async () => {
    const P = S.project, R = Cut._R; ui.cutErr = null; stopPreview();
    setBusy("montagem", "renderizando 0%"); P.renderProg = 0; renderPanel();
    for (let i = 1; i <= 20; i++) { await wait(160); P.renderProg = i / 20; setAction(`renderizando ${i * 5}%`); renderPanel(); }
    P.render = { name: "triangulo-das-bermudas.mp4", res: "vertical 1080×1920", mb: null, secs: R ? R.dur : 60, at: Date.now(), stored: false };
    P.renderProg = null; save(); clearBusy(); renderPanel(); window.parkJingle && parkJingle(); toast("Vídeo pronto!");
  };

  /* ================== o roteiro do passeio ================== */
  const P = () => S.project;
  const M = (titulo, texto, extra) => ({ modal: { titulo, texto, ...extra } });
  const STEPS = [
    M("Seja bem-vindo à Onion", "Aqui, criar conteúdo pra internet é fácil e leva menos de 2 minutos.", { hero: true, btn: "Começar" }),
    // o mapa, setor por setor
    { spot: "ideias", text: "Este é o <b>MAPA</b> da sua empresa. Cada prédio é um setor.<br><br><b>Aqui nascem as ideias:</b> você diz o tema do vídeo e pra quem ele é." },
    { spot: "titulos", text: "<b>Aqui a IA cria os títulos</b> que fazem as pessoas clicarem." },
    { spot: "roteiro", text: "<b>Aqui são escritos os roteiros</b>, o texto que o narrador vai falar." },
    { spot: "descricao", text: "<b>Aqui sai a descrição</b> do vídeo, com as hashtags." },
    { spot: "imagens", text: "<b>Aqui são escolhidas as imagens</b> de cada cena do vídeo." },
    { spot: "narracao", text: "<b>Aqui o roteiro vira voz</b>, com o narrador que você escolher." },
    { spot: "montagem", text: "<b>Aqui junta tudo pra editar o seu vídeo</b> e finalizar: imagens, voz, legendas e trilha." },
    { spot: "arquivo", text: "<b>Aqui ficam guardados</b> todos os vídeos prontos." },
    { spot: "admin", text: "E esta é a <b>ADMINISTRAÇÃO</b>. Pra criar um vídeo, primeiro escolhemos uma IA, grátis ou paga. É por aqui que começamos!", btn: "Vamos lá" },
    { map: "admin", tip: "Toque em <b>ADMINISTRAÇÃO</b>, onde a seta indica." },
    // a IA
    M("Vamos escolher a IA", "Pra começar, vamos usar uma versão <b>gratuita</b>. Ela tem créditos limitados, mas já é o suficiente pra criarmos o nosso <b>PRIMEIRO VÍDEO</b>."),
    { el: '#pbody button[onclick="freeKeyModal()"]', panel: "admin", tip: "Toque aqui pra pegar a chave grátis do Google.", until: () => !!$(".modal #fkKey") },
    { field: "#fkKey", text: "No uso real, você copia a sua chave no site do Google e cola <b>neste campo</b>. Na demonstração, vamos colar uma de exemplo.", fill: KEY, done: "Chave colada! Agora é só salvar." },
    { el: "#fkSave", tip: "Toque em <b>Salvar e usar</b>.", until: () => AI.ready() && !$(".modal #fkKey") },
    // ideias
    { map: "ideias", tip: "IA ligada! ✓ Agora toque no <b>LABORATÓRIO DE IDEIAS</b>, onde o vídeo nasce." },
    { field: "#cn", panel: "ideias", text: "Primeiro, o seu canal ou a sua marca (isso é feito <b>uma vez só</b>).<br><br>Aqui vai o <b>assunto</b>. No exemplo, um canal de mistérios.", fill: CANAL.nicho, done: "Pronto! Vamos pro próximo campo." },
    { field: "#cp", panel: "ideias", text: "Aqui vai o <b>seu público</b>: quem você quer que assista.", fill: CANAL.publico, done: "Anotado. A IA vai escrever do jeito que esse público gosta." },
    { info: "#pbody .stylecards", panel: "ideias", text: "Aqui você escolhe o <b>estilo visual</b> do vídeo. Vamos de <b>Documentário</b>, que já está marcado." },
    { el: "#csave", panel: "ideias", tip: "O resto pode ficar como está. Toque em <b>Salvar canal</b>.", until: () => !!S.config },
    { field: "#dtema", panel: "ideias", text: "Agora o vídeo. Aqui vai o <b>tema</b>: do que o vídeo fala.", fill: TEMA, done: "Tema escrito! Vamos pro próximo campo." },
    { field: "#dideia", panel: "ideias", text: "Aqui você escreve, com as suas palavras, <b>a ideia que quer transmitir</b>: qual o objetivo do vídeo.<br><br>No nosso exemplo, o objetivo é criar um vídeo de curiosidade sobre aviões misteriosos.", fill: IDEIA, done: "Pronto, escrevemos o que queremos transmitir. Vamos pro próximo campo." },
    { field: "#dkind", panel: "ideias", text: "Aqui você escolhe o <b>tipo</b>: vídeo longo, Short ou os dois juntos. Vamos fazer um <b>Short</b> (vertical, 1 minuto).", fill: "short", done: "Short escolhido!" },
    { el: "#start", panel: "ideias", tip: "Tudo pronto. Toque em <b>Começar produção</b>.", until: () => !!P() },
    // títulos
    { map: "titulos", tip: "A ideia foi pra <b>TORRE DOS TÍTULOS</b>. Toque nela." },
    { el: "#tgo", panel: "titulos", tip: "A IA cria <b>10 títulos</b>, cada um com um gatilho diferente. Toque em <b>Gerar 10 títulos</b>.", until: () => P() && P().titles.length && !busy },
    { el: '[data-t="0"]', panel: "titulos", tip: "Escolha o título que mais chama atenção. Vamos com este.", until: () => P() && !!P().title },
    { info: "#own", panel: "titulos", text: "Se você já tiver um título pronto, é só colar <b>neste campo</b>." },
    { el: "#tok", panel: "titulos", tip: "Confirme o título.", until: () => P() && P().done.titulos },
    // roteiro
    { map: "roteiro", tip: "Título escolhido! Agora toque no <b>ESCRITÓRIO DE ROTEIROS</b>." },
    { el: "#rgo", panel: "roteiro", tip: "A IA escreve o roteiro inteiro pra você. Toque em <b>Escrever roteiro</b>.", until: () => P() && P().script.length && !busy },
    { info: "#pbody .rblk", panel: "roteiro", text: "Este é o roteiro. Você pode <b>editar o texto</b> à vontade, como num bloco de notas." },
    { info: "#pbody .rinstr", panel: "roteiro", text: "Ou peça uma mudança pra IA neste campo. Por exemplo: <i>deixa o começo mais forte</i>." },
    { el: "#rok", panel: "roteiro", tip: "Ficou bom! Toque pra aprovar o roteiro.", until: () => P() && P().done.roteiro },
    // descrição
    { map: "descricao", tip: "Roteiro aprovado! Agora toque na <b>REDAÇÃO</b>." },
    { el: "#dgo", panel: "descricao", tip: "Toque em <b>Gerar descrição</b>.", until: () => P() && P().description && !busy },
    { info: "#dt", panel: "descricao", text: "A <b>descrição</b> pronta pra colar no YouTube. Dá pra mudar o que quiser." },
    { info: "#dh", panel: "descricao", text: "E as <b>hashtags</b>, que ajudam o vídeo a ser encontrado." },
    { el: "#dok", panel: "descricao", tip: "Toque pra aprovar.", until: () => P() && P().done.descricao },
    // imagens
    { map: "imagens", tip: "Agora toque em <b>IMAGENS E MARKETING</b>." },
    { el: "#cgo2", panel: "imagens", tip: "Primeiro a equipe lê o roteiro e lista as imagens que o vídeo precisa. Toque aqui.", until: () => P() && P().board && !busy },
    { el: "#bsearch", panel: "imagens", tip: "Agora toque em <b>Buscar grátis</b>: cada imagem é buscada de graça na internet.", until: () => P() && P().board && P().board.assets.every(a => a.img === "ok") && !busy },
    { info: "#pbody .scenes", panel: "imagens", text: "Prontas! Se não gostar de alguma, é só tocar nela e trocar." },
    { el: "#iok", panel: "imagens", tip: "Toque pra aprovar as imagens.", until: () => P() && P().done.imagens },
    // narração
    { map: "narracao", tip: "Imagens aprovadas! Toque no <b>ESTÚDIO DE NARRAÇÃO</b>." },
    { el: "#vlist [data-voice]", panel: "narracao", tip: "Escolha a voz do narrador. O ▶ toca uma amostra.", until: () => P() && !!P().voice },
    { field: "#vsty", panel: "narracao", text: "Aqui você diz o <b>jeito de falar</b> do narrador. É opcional.", fill: "calmo e misterioso", done: "Pronto! O narrador vai falar assim." },
    { el: "#ngo", panel: "narracao", tip: "Toque pra gravar a narração. <small>(Na demonstração, a voz é simulada pelo seu navegador.)</small>", until: () => P() && P().narration && !busy },
    { el: "#nok", panel: "narracao", tip: "Narração pronta! Toque pra aprovar.", until: () => P() && P().done.narracao },
    // OnionCut
    { map: "montagem", tip: "Agora toque no <b>ONIONCUT</b>, onde tudo vira vídeo." },
    { info: "#mtpl", panel: "montagem", text: "Aqui você escolhe o <b>visual</b> do vídeo: cores e acabamento." },
    { info: "#mcap", panel: "montagem", text: "Aqui, o estilo das <b>legendas</b>." },
    { info: "#mmood", panel: "montagem", text: "E aqui a <b>trilha sonora</b>. Dá pra usar uma música sua também." },
    { el: "#mprep", panel: "montagem", tip: "Toque em <b>Montar no OnionCut</b>. A edição é toda automática.", until: () => !!Cut._R && !busy },
    { el: "#pplay", panel: "montagem", tip: "Seu vídeo está montado! Toque pra <b>assistir à prévia</b>.", until: () => window.__demoPlayed },
    { el: "#mrender", panel: "montagem", tip: "Gostou? Toque em <b>Renderizar</b>. No seu acesso, aqui sai o arquivo MP4 pronto pra postar.", delay: 6000, until: () => P() && P().render && !busy },
    { el: "#mok", panel: "montagem", tip: "Toque em <b>Salvar na Biblioteca</b>.", until: () => !P() },
    { map: "arquivo", tip: "Vídeo salvo! Toque em <b>ARQUIVO E DATACENTER</b> pra ver." },
    M("Você criou um vídeo! 🎉", "Foi assim: ideia, título, roteiro, imagens, narração e edição, tudo feito pela equipe da Onion. Agora é a sua vez, com o seu tema e a sua marca.", { end: true })
  ];

  /* ================== motor do passeio ================== */
  let i = -1, started = 0, beforeDone = -1, stepAt = 0, phase = 0, mapTapAt = 0;
  const ZOOM = 1;
  async function typeInto(sel, text) {
    const el = $(sel); if (!el) return; el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (el.tagName === "SELECT") { await wait(400); el.value = text; el.dispatchEvent(new Event("change", { bubbles: true })); return; }
    for (let k = 1; k <= text.length; k++) { el.value = text.slice(0, k); el.dispatchEvent(new Event("input", { bubbles: true })); await wait(text.length > 60 ? 22 : 38); }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const ui0 = document.createElement("div"); ui0.id = "tour"; document.body.appendChild(ui0);
  ui0.innerHTML = `<div class="tb" data-b="t"></div><div class="tb" data-b="b"></div><div class="tb" data-b="l"></div><div class="tb" data-b="r"></div>
    <div class="tring"></div><div class="tballoon">CLIQUE AQUI</div><div class="ttip"></div><div class="tmodal"></div>
    <div class="tbar"><span>👀 Demonstração · tudo aqui é de mentirinha</span><a href="../">Sair</a></div>`;
  const B = k => ui0.querySelector(`[data-b="${k}"]`), ring = ui0.querySelector(".tring"), bal = ui0.querySelector(".tballoon"), tip = ui0.querySelector(".ttip"), mod = ui0.querySelector(".tmodal");
  ui0.querySelectorAll(".tb").forEach(b => b.onclick = () => { const t = bal.style.display !== "none" ? bal : tip; t.classList.remove("nudge"); void t.offsetWidth; t.classList.add("nudge"); });
  const hide = (...els) => els.forEach(e => e.style.display = "none");
  const hideAll = () => hide(ring, bal, tip, B("t"), B("b"), B("l"), B("r"));
  window.addEventListener("pointerup", e => { if (e.target && e.target.id === "park") mapTapAt = Date.now(); }, true);

  function go(n) {
    i = n; beforeDone = -1; stepAt = Date.now(); phase = 0; const s = STEPS[i]; if (!s) return;
    window.TOUR_MAP = s.map || s.spot || null;
    if (s.map || s.spot) { closePanel(); window.parkFocus && parkFocus(s.map || s.spot, ZOOM); }
    if (s.modal) showModal(s.modal); else mod.style.display = "none";
  }
  // botão "Continuar" dos balões de explicação
  function next() {
    const s = STEPS[i]; if (!s) return;
    if (s.field && s.fill && phase === 0) { phase = 1; const k = i; typeInto(s.field, s.fill).then(() => { if (i === k) phase = 2; }); return; }
    if (phase === 1) return;
    go(i + 1);
  }
  tip.addEventListener("click", e => { if (e.target.closest("[data-tnext]")) next(); });
  function showModal(m) {
    mod.innerHTML = `<div class="tcard${m.hero ? " hero" : ""}">
      ${m.hero ? `<div class="tlogo"><svg width="46" height="46" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3c1 3 1 4 0 6" stroke="#7cc95a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M17 9c-7 3-12 8-12 14 0 5 5 8 12 8s12-3 12-8c0-6-5-11-12-14z" fill="#8a2f7c"/><path d="M17 10v21" stroke="#e3a8d8" stroke-width="1.4"/></svg><span>Onion <i>Park</i></span></div>` : ""}
      <h2>${m.titulo}</h2><p>${m.texto}</p>
      ${m.end ? `<div class="tbtns col"><a class="tbtn gold" href="../#preco">Assinar por R$ ${(window.ONION_CFG && ONION_CFG.price) || "29,90"}/mês →</a><a class="tbtn" href="./">Entrar e criar o meu</a></div><p class="tsmall">Levou ${Math.max(1, Math.round((Date.now() - started) / 60000))} min, com você só tocando nos botões.</p>`
        : `<div class="tbtns"><button class="tbtn gold" id="tnext">${m.btn || "Continuar"} →</button></div><div class="tfoot"><a href="../">Sair da demonstração</a></div>`}
    </div>`;
    mod.style.display = "grid";
    const nx = mod.querySelector("#tnext"); if (nx) { nx.onclick = () => { if (!started) started = Date.now(); mod.style.display = "none"; m.after && m.after(); go(i + 1); }; setTimeout(() => nx.focus(), 50); }
  }
  function place(r) {
    const pad = 6, x0 = Math.max(0, r.left - pad), y0 = Math.max(0, r.top - pad), x1 = Math.min(innerWidth, r.right + pad), y1 = Math.min(innerHeight, r.bottom + pad);
    Object.assign(B("t").style, { display: "block", left: 0, top: 0, width: "100%", height: y0 + "px" });
    Object.assign(B("b").style, { display: "block", left: 0, top: y1 + "px", width: "100%", height: Math.max(0, innerHeight - y1) + "px" });
    Object.assign(B("l").style, { display: "block", left: 0, top: y0 + "px", width: x0 + "px", height: (y1 - y0) + "px" });
    Object.assign(B("r").style, { display: "block", left: x1 + "px", top: y0 + "px", width: Math.max(0, innerWidth - x1) + "px", height: (y1 - y0) + "px" });
    Object.assign(ring.style, { display: "block", left: x0 + "px", top: y0 + "px", width: (x1 - x0) + "px", height: (y1 - y0) + "px" });
    return { x0, y0, x1, y1 };
  }
  function placeTips(box, cx, html, withBalloon = true) {
    let bh = 0, above = true;
    if (withBalloon) { bal.style.display = "block"; const bw = bal.offsetWidth; bh = bal.offsetHeight; above = box.y0 - bh - 14 > 8; bal.classList.toggle("down", !above);
      bal.style.left = Math.max(8, Math.min(innerWidth - bw - 8, cx - bw / 2)) + "px"; bal.style.top = (above ? box.y0 - bh - 12 : box.y1 + 12) + "px"; }
    else bal.style.display = "none";
    if (!html) { tip.style.display = "none"; return; }
    if (tip.dataset.h !== html) { tip.innerHTML = html; tip.dataset.h = html; }
    tip.style.display = "block"; const tw = Math.min(340, innerWidth - 24); tip.style.width = tw + "px"; const th = tip.offsetHeight;
    const gapB = withBalloon && !above ? bh + 24 : 14, gapA = withBalloon && above ? bh + 24 : 14;
    const spaceBelow = innerHeight - box.y1 - gapB, spaceAbove = box.y0 - gapA;
    let ty = spaceBelow > th + 16 ? box.y1 + gapB : spaceAbove > th + 16 ? box.y0 - gapA - th : innerHeight - th - 16;
    tip.style.left = Math.max(12, Math.min(innerWidth - tw - 12, cx - tw / 2)) + "px"; tip.style.top = Math.max(8, ty) + "px";
  }
  const btn = t => `<button class="tbtn gold" data-tnext>${t} →</button>`;
  function tick() {
    requestAnimationFrame(tick);
    ui0.classList.remove("focus");
    const s = STEPS[i]; if (!s || s.modal) { hideAll(); return; }
    // apresentação do mapa: um setor aceso de cada vez
    if (s.spot) {
      const r = window.parkBuildingRect && parkBuildingRect(s.spot); if (!r) return hideAll();
      ui0.classList.add("focus"); const box = place(r);
      placeTips(box, (box.x0 + box.x1) / 2, `<p>${s.text}</p>${btn(s.btn || "Continuar")}`, false); return;
    }
    if (s.map && panelKey === s.map) { window.TOUR_MAP = null; hideAll(); go(i + 1); return; }
    if (s.until && s.until() && Date.now() - stepAt > 400) { hideAll(); go(i + 1); return; }
    if (s.delay && Date.now() - stepAt < s.delay && cutPrev) { hideAll(); return; }
    // tocar no setor do mapa (ou o painel certo foi fechado sem querer: guia de volta pelo mapa)
    const mapK = s.map || (s.panel && panelKey !== s.panel && !$(".modal") ? s.panel : null);
    if (mapK) {
      hide(ring, B("t"), B("b"), B("l"), B("r"));
      if (window.TOUR_MAP !== mapK) { window.TOUR_MAP = mapK; window.parkFocus && parkFocus(mapK, ZOOM); }
      const xy = window.parkLabelXY && parkLabelXY(mapK); if (!xy) return hide(bal, tip);
      const box = { x0: xy[0] - 60, x1: xy[0] + 60, y0: xy[1] - 34, y1: xy[1] + 26 };
      placeTips(box, xy[0], s.map ? (s.tip || `Toque em <b>${BK[mapK].n.toUpperCase()}</b>.`) : `Você fechou a janela. Toque em <b>${BK[mapK].n.toUpperCase()}</b> pra continuar.`);
      return;
    }
    window.TOUR_MAP = null;
    if (busy) { hideAll(); return; }
    const sel = s.el || s.field || s.info, el = $(sel);
    if (!el || !el.offsetParent) { hideAll(); return; }
    if (beforeDone !== i) { beforeDone = i; el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    const r = el.getBoundingClientRect(); if (r.width === 0) return;
    ui0.classList.add("focus");
    const box = place(r), cx = (box.x0 + box.x1) / 2;
    if (s.el) return placeTips(box, cx, s.tip);
    // campo a campo: explica, escreve sozinho e confirma
    const html = s.info ? `<p>${s.text}</p>${btn("Continuar")}`
      : phase === 0 ? `<p>${s.text}</p>${btn("Continuar")}`
      : phase === 1 ? `<p>${s.text}</p><div class="ttyping">✍️ escrevendo…</div>`
      : `<p>${s.done}</p>${btn("Próximo")}`;
    placeTips(box, cx, html, false);
  }
  // no passeio, a pessoa vai de setor em setor pelo mapa: os painéis só abrem tocando no prédio
  const open0 = window.openPanel;
  window.openPanel = k => {
    const s = STEPS[i];
    if (s && s.map && k !== s.map) { toast(`Na demonstração, toque em ${BK[s.map].n} (onde está a seta)`); return; }
    if (Date.now() - mapTapAt > 700) { closePanel(); return; }
    open0(k);
  };
  window.addEventListener("beforeunload", hush);
  window.__tour = { go: n => go(n), steps: STEPS, at: () => i, next };

  /* ================== visual ================== */
  const css = document.createElement("style"); css.textContent = `
  #info{display:none!important}
  #prod.mobile{display:none!important}
  #pbody::after{content:"";display:block;height:40vh}
  #tour.focus .tbar{display:none}
  #tour .tb{position:fixed;z-index:9990;background:rgba(18,12,28,.55);display:none}
  #tour .tring{position:fixed;z-index:9991;display:none;pointer-events:none;border:3px solid #f2c14e;border-radius:14px;box-shadow:0 0 0 4px rgba(242,193,78,.35);animation:tpulse 1.2s ease-in-out infinite}
  @keyframes tpulse{50%{box-shadow:0 0 0 10px rgba(242,193,78,0)}}
  #tour .tballoon{position:fixed;z-index:9993;display:none;pointer-events:none;background:#f2c14e;color:#1b1424;border:2px solid #1b1424;box-shadow:3px 3px 0 #1b1424;border-radius:12px;padding:7px 12px;font:700 15px "Pixelify Sans",Figtree,monospace;letter-spacing:.03em;white-space:nowrap;animation:tbob 1s ease-in-out infinite}
  #tour .tballoon::after{content:"";position:absolute;left:50%;bottom:-9px;margin-left:-8px;border:8px solid transparent;border-bottom:0;border-top-color:#1b1424}
  #tour .tballoon.down::after{bottom:auto;top:-9px;border:8px solid transparent;border-top:0;border-bottom-color:#1b1424}
  @keyframes tbob{50%{transform:translateY(-5px)}}
  #tour .tballoon.nudge{animation:tshake .4s}
  @keyframes tshake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  #tour .ttip{position:fixed;z-index:9992;display:none;background:#fffaf2;color:#1b1424;border:2px solid #1b1424;box-shadow:4px 4px 0 #1b1424;border-radius:14px;padding:12px 14px;font:500 15px/1.45 Figtree,system-ui,sans-serif}
  #tour .ttip small{display:block;color:#6a5f74;font-size:12.5px;margin-top:4px}
  #tour .ttip p{margin:0}
  #tour .ttip .tbtn{width:100%;margin-top:12px;min-height:44px;font-size:15px}
  #tour .ttyping{margin-top:10px;color:#7A2E8E;font-weight:700}
  #tour .ttip.nudge{animation:tshake .4s}
  #tour .tmodal{position:fixed;inset:0;z-index:9995;display:none;place-items:center;padding:16px;background:rgba(18,12,28,.62);backdrop-filter:blur(2px)}
  #tour .tcard{width:min(400px,100%);background:#fffaf2;color:#1b1424;border:2px solid #1b1424;box-shadow:6px 6px 0 #1b1424;border-radius:20px;padding:22px 22px 16px;font:15px/1.5 Figtree,system-ui,sans-serif;animation:tin .25s ease-out}
  @keyframes tin{from{transform:translateY(12px) scale(.98);opacity:0}}
  #tour .tcard h2{font:800 23px/1.15 Figtree,system-ui,sans-serif;margin:0 0 8px;letter-spacing:-.01em}
  #tour .tcard.hero h2{font-size:27px}
  #tour .tcard p{margin:0 0 16px;color:#3c3346;font-size:16px}
  #tour .tlogo{display:flex;align-items:center;gap:8px;margin-bottom:12px;font:700 22px "Pixelify Sans",monospace}
  #tour .tlogo i{font-style:normal;color:#7A2E8E}
  #tour .tbtns{display:flex;flex-wrap:wrap;gap:10px}
  #tour .tbtns.col{flex-direction:column}
  #tour .tbtn{flex:1;display:inline-flex;justify-content:center;align-items:center;min-height:48px;padding:10px 16px;border-radius:13px;border:2px solid #1b1424;box-shadow:3px 3px 0 #1b1424;background:#fff;color:#1b1424;font:800 16px Figtree,sans-serif;text-decoration:none;cursor:pointer}
  #tour .tbtn.gold{background:#f2c14e}
  #tour .tbtn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1b1424}
  #tour .tfoot{display:flex;justify-content:space-between;margin-top:12px;font-size:13px;color:#6a5f74}
  #tour .tfoot a,#tour .tbar a{color:#7A2E8E;font-weight:700}
  #tour .tsmall{font-size:13px;color:#6a5f74;margin:12px 0 0!important;text-align:center}
  #tour .tbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9989;display:flex;gap:12px;align-items:center;background:#1a1424f2;color:#f3eefa;border:1px solid #3a2f4a;border-radius:999px;padding:8px 8px 8px 14px;font:600 13px Figtree,sans-serif;white-space:nowrap}
  #tour .tbar a{background:#f3eefa;color:#1a1424;border-radius:999px;padding:4px 12px;text-decoration:none}
  `;
  document.head.appendChild(css);

  window.addEventListener("load", () => setTimeout(() => { go(0); tick(); }, 300));
})();
