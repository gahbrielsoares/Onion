/* ============ STATE ============ */
const KEY = "onion-park-v1";
const S = load() || {
  config:null, viraisRegion:"Estados Unidos", viraisNicho:"", viraisResults:[], ideias:[], selIdea:null,
  project:null, library:[]
};
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null }catch(e){ return null } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)) }catch(e){} }
let busy = null; // {k, role, action, ctl, cancel}
// produção casada: S.project devolve o segmento ativo (vídeo longo ou o Short dele)
var SEG = "long";
(function(){
  let main = S.project || null; delete S.project;
  Object.defineProperty(S, "project", { configurable: true, enumerable: false,
    get(){ return (SEG === "short" && main && main.sub) ? main.sub : main; },
    set(v){ if (SEG === "short" && main && main.sub && v && v !== main && v.kind === "short" && main.combo) { main.sub = v; return; } main = v; SEG = "long"; } });
  Object.defineProperty(S, "toJSON", { enumerable: false, value(){ const o = {}; Object.keys(this).forEach(k => o[k] = this[k]); o.project = main; return o; } });
  Object.defineProperty(S, "main", { enumerable: false, value(){ return main; } });
})();
async function withSeg(seg, fn){ const prev = SEG; SEG = seg; renderProd(); try { return await fn(); } finally { SEG = prev; save(); renderProd(); if (typeof panelKey !== "undefined" && panelKey) renderPanel(); } }

const STAGES = ["titulos","roteiro","descricao","imagens","narracao","montagem"];
const STAGE_LABEL = {titulos:"Título",roteiro:"Roteiro",descricao:"Descrição",capa:"Capa",imagens:"Imagens",narracao:"Voz",montagem:"Edição"};
function isUnlocked(k){
  if (k==="stories"||k==="ideias"||k==="arquivo"||k==="admin"||k==="auto") return true;
  const P=S.project; if(!P) return false;
  const i=STAGES.indexOf(k); let ok=true; for(let j=0;j<i;j++) if(!P.done[STAGES[j]]) ok=false;
  P.reached=P.reached||{};
  if(ok){ P.reached[k]=true; return true; }
  if(P.reached[k]) return true;
  // projetos antigos: se a etapa já tem trabalho feito, ela continua aberta
  const has={titulos:!!P.title,roteiro:P.script.length>0,descricao:!!P.description,capa:(P.thumbs||[]).length>0||P.kind==="short",imagens:!!P.board||P.scenes.length>0,narracao:!!P.narr,montagem:!!(P.cut||P.render)}[k];
  if(has){ P.reached[k]=true; return true; }
  return false;
}
function nextStage(){
  if(!AI.ready()) return "admin";
  const P=S.project; if(!P) return "ideias";
  for(const s of STAGES) if(!P.done[s]) return s;
  return null;
}

/* ============ OPTIONS ============ */
const NICHOS=["Mistérios e Casos Não Resolvidos","História","Curiosidades","Crimes Reais","Ciência e Espaço","Psicologia e Comportamento","Finanças e Dinheiro","Milionários e Sucesso","Motivação","Fé e Orações","Saúde e Bem-estar","Tecnologia","Games","Esportes","Animais e Natureza","Viagem","Culinária","Moda e Beleza","Loja / Produto","Serviços / Empresa local","Educação / Curso","Imobiliária","Restaurante / Delivery"];
const PUBLICOS=["Brasileiros adultos","Jovens 18–30","Público 50+","Mulheres 25–45","Homens 25–45","Pais e mães","Empreendedores","Estudantes","Americanos 50+","Americanos 25–45","Público global em inglês","Clientes da minha loja","Seguidores do Instagram","Moradores da minha cidade"];
const FORMATOS=["Documentário contado (estilo história/tour)","Narrativa / História","Lista (Top 10, Como morreram…)","Explicativo / Curiosidade","Batalha (X vs Y)","Motivacional / Discurso","Oração guiada","Promocional: venda de produto","Lançamento / oferta relâmpago","Stories do dia a dia da empresa","Depoimento / prova social","Tutorial do produto","Bastidores da marca"];
const VISUAIS=[["documentario","Documentário"],["moderno","Moderno"],["promocional","Promocional"],["cinetico","Texto em destaque"],["colagem","Colagem animada"],["cinema","Cenas por IA"]];
const visOf=P=>(((P&&P.config)||S.config||{}).visual)||"documentario";
const isColagem=P=>visOf(P)!=="cinema";
const isDoc=P=>["documentario","moderno","promocional","cinetico"].includes(visOf(P));
const isBattle=P=>/batalha/i.test((P.config||{}).formato||"");
const isPromo=P=>/promocional|lançamento|stories|depoimento|tutorial do produto|bastidores/i.test(((P&&P.config)||S.config||{}).formato||"");
const GANCHOS=["Fato chocante","Pergunta intrigante","História pessoal","Mistério em aberto","Promessa direta","Problema → solução","Antes e depois","Oferta / benefício direto","Urgência (últimas unidades, só hoje)","Prova social (clientes reais)","Curiosidade (\"você sabia?\")"];
const IDIOMAS=[["Português","🇧🇷","pt-BR"],["Inglês","🇺🇸","en-US"],["Espanhol","🇪🇸","es-ES"],["Francês","🇫🇷","fr-FR"],["Alemão","🇩🇪","de-DE"],["Japonês","🇯🇵","ja-JP"],["Hindi","🇮🇳","hi-IN"],["Árabe","🇸🇦","ar-SA"]];
const REGIOES=()=>Object.keys(Trends.REG);
const STYLES=[["Cinemático realista","#2b3a4a","#c9a26b"],["Pintura a óleo","#5a3a1e","#d8a35a"],["Aquarela suave","#9ec5d8","#f2d6e3"],["Natureza sagrada","#24452c","#e8d27a"],["Documentário sci-fi","#0f2a3d","#4fd1e8"],["Gravura medieval","#3a3226","#cbbd9a"],["Polaroid vintage","#a88f6a","#efe1c2"],["Massinha (claymation)","#d86a4a","#f6c35a"],["Livro infantil","#f0b46a","#9ad0e8"],["Anime cinematográfico","#3a2a6a","#ff9ac8"],["Pixel art","#2a2a4a","#7cff9a"],["Noir em P&B","#111111","#9a9a9a"],["Isométrico 3D","#4a6aff","#ffd36a"],["Quadro de true crime","#2a1a14","#d84a3a"],["Ilustração médica","#e8eef2","#d85a6a"],["Low poly 3D","#3a7a9a","#f2a65a"],["Zen minimalista","#e8e4dc","#9aa88a"],["Surreal conceitual","#3a1a4a","#ff8a3a"],["Whiteboard animado","#f4f4f4","#3a3a3a"],["Stop motion","#7a4a2a","#e8c08a"],["Jornal antigo","#d8d0bc","#4a4436"],["Luz divina","#f2e2b0","#ffffff"],["Editorial de luxo","#1a1a1a","#d4af37"],["Origami","#f2efe6","#e86a5a"]];
const VOICES={
  "ElevenLabs":[["Roger","masculina, calma, ressonante","#5b6ee1"],["George","masculina, contador de histórias","#7a5be1"],["Brian","masculina, grave, madura","#3a7ae1"],["Sarah","feminina, madura, confiante","#e15b9a"],["Lily","feminina, suave, britânica","#c75be1"],["Bella","feminina, calorosa","#e17a5b"]],
  "Minimax":[["Mature Partner","masculina, madura","#2e8b57"],["Wise Woman","feminina, sábia","#8b2e6b"],["Deep Narrator","masculina, documentário","#2e5e8b"]],
  "Fish Audio":[["Storyteller","masculina, expressiva","#b07a2e"],["Gentle Voice","feminina, gentil","#2e9bb0"]],
  "Edge (econômica)":[["Guy","masculina, neutra","#6a6a7a"],["Jenny","feminina, neutra","#7a6a6a"]]
};
const TEMPLATES=["Oração serena","Noite de fé","Luz divina","Salmo","Documentário escuro","Mistério","Clean"];
const CAPTIONS=["Palavra por palavra","Karaokê","Frase curta","Sem legenda"];

/* ============ BUILDINGS ============ */
const B=[
 {k:"stories",n:"Estúdio de Stories",gx:16,gy:2,w:9,d:8,c:"#ef6f9a",role:"Editor de stories",desc:"Envie o seu vídeo e as fotos do produto: a IA estuda e edita com cortes, inserções, textos, legendas e trilha."},
 {k:"ideias",n:"Laboratório de Ideias",gx:3,gy:3,w:12,d:7,c:"#e0b14a",role:"Produtor",idle:"organizando a fila",desc:"Configure o canal ou a marca, busque temas em alta (opcional) e comece um vídeo novo."},
 {k:"titulos",n:"Torre dos Títulos",gx:29,gy:3,w:7,d:7,c:"#5fbf95",role:"Copywriter",step:1,h:24,desc:"Cria 10 títulos com ângulos e gatilhos diferentes. O roteiro inteiro é escrito pro título que você escolher."},
 {k:"arquivo",n:"Arquivo e Datacenter",gx:39,gy:2,w:6,d:9,c:"#6f93d6",desc:"Onde ficam guardados os vídeos prontos. Abra pra ver e baixar tudo o que já foi produzido."},
 {k:"roteiro",n:"Prédio dos Roteiros",gx:3,gy:15,w:10,d:7,c:"#9b84e0",role:"Roteirista",step:2,desc:"Escreve o roteiro em blocos, com gancho, contexto e desenvolvimento, conectando as partes pra segurar a atenção."},
 {k:"descricao",n:"Redação",gx:17,gy:16,w:7,d:5,c:"#56b7c9",role:"Redator",step:3,desc:"Lê o roteiro inteiro e escreve a descrição, com convite pra se inscrever, uma pergunta e hashtags."},
 {k:"imagens",n:"Imagens e Marketing",gx:3,gy:27,w:10,d:7,c:"#c46fc9",role:"Ilustrador",step:4,desc:"Lista as imagens que o vídeo precisa e ajuda a preencher (Google, Gemini, arquivo ou IA). A capa do vídeo também fica aqui."},
 {k:"narracao",n:"Estúdio de Narração",gx:17,gy:27,w:7,d:6,c:"#e09a52",role:"Narrador",step:5,dark:true,desc:"Grava o roteiro com a voz escolhida, no ritmo certo pro seu público."},
 {k:"admin",n:"Administração",gx:41,gy:28,w:4,d:5,c:"#8e98ab",role:"Gestor",desc:"Onde ficam as chaves das APIs e as preferências do Onion. Comece por aqui."},
 {k:"montagem",n:"OnionCut",gx:30,gy:27,w:10,d:8,c:"#a77be0",role:"Editor",step:6,desc:"O montador automático: junta cenas, voz e legendas, corta nas pausas da narração e entrega o vídeo."},
];
const BK=Object.fromEntries(B.map(b=>[b.k,b]));

/* ============ HUD ============ */
const t0=Date.now();
setInterval(()=>{ const s=(Date.now()-t0)/1000|0; document.getElementById("clock").textContent=[s/3600|0,(s/60|0)%60,s%60].map(n=>String(n).padStart(2,"0")).join(":"); },1000);
function showInfo(b){
  const el=document.getElementById("info");
  if(!b){ el.innerHTML=`<h2>Você no comando</h2><p>Cada prédio é uma etapa. Clique num prédio pra abrir as opções e mande o trabalho pro próximo.</p>`; return; }
  const locked=!isUnlocked(b.k);
  el.innerHTML=`<h2><span class="sq" style="background:${b.c}"></span>${esc(b.n)}</h2><p>${esc(b.desc)}</p><div class="hint">${b.step?`Etapa ${b.step} de 6 · `:""}${locked?"Bloqueado até a etapa anterior terminar":"Clique no prédio pra abrir"}</div>`;
}
function renderProd(){
  const el=document.getElementById("prod"); const P=S.project;
  const ap=(typeof AP!=="undefined"&&AP.on)?`<div class="st" style="color:var(--accent);font-weight:700">🤖 Piloto automático · vídeo ${AP.cur} de ${AP.total} <button class="btn ghost small" style="padding:2px 8px;margin-left:auto" onclick="openPanel('auto')">ver</button></div>`:"";
  el.classList.toggle("mobile", !!(busy||P) && vw<720 && !panelKey);
  if(!P){ el.innerHTML=ap+`<div class="st">Nada em produção</div><div class="tt">Comece no Laboratório de Ideias</div><div class="bar"><i style="width:0"></i></div>`; return; }
  const done=STAGES.filter(s=>P.done[s]).length;
  const all=done===STAGES.length;
  el.innerHTML=ap+`<div class="st">${busy?`<span class="spin"></span> ${esc(BK[busy.k].n)}: ${esc(busy.action||"trabalhando")}`:(all?"✓ Vídeo concluído":"Em produção")}</div>
  <div class="tt" title="${esc(P.title||P.idea.tema)}">${esc(P.title||P.idea.tema)} <span class="chip" style="font-weight:600">${esc(P.config.idioma)}</span></div>
  <div class="bar"><i style="width:${done/STAGES.length*100}%"></i></div>
  <div class="chips">${STAGES.map(s=>`<span class="chip ${P.done[s]?"on":""}">${P.done[s]?"✓ ":""}${STAGE_LABEL[s]}</span>`).join("")}</div>
  ${busy?`<div class="btns" style="margin-top:8px"><button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button></div>`:""}`;
}
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.classList.add("show"); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove("show"),2600); }
function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function courier(from,to){
  const a=BK[from], b=BK[to]; if(!a||!b) return;
  walkers.push({courier:true,fx:a.gx+a.w/2,fy:a.gy+a.d+.4,tox:b.gx+b.w/2,toy:b.gy+b.d+.4,x:0,y:0,t:0,...person(),shirt:"#f2c14e"});
}
function setBusy(k,action,role){ busy={k,action,role:role||BK[k].role,ctl:new AbortController(),cancel:false}; renderProd(); return busy; }
function setAction(a){ if(busy){ busy.action=a; renderProd(); } }
function clearBusy(){ busy=null; renderProd(); }
function interrupt(){ if(!busy) return; busy.cancel=true; busy.ctl.abort(); toast("Interrompido"); }
window.interrupt=interrupt;
function errMsg(e){
  const c=e&&e.code;
  if(c==="cancelled"||c==="aborted") return null;
  if(c==="not_granted") return "Você não permitiu o uso do Claude nesta página. Recarregue a página pra permitir.";
  if(c==="rate_limited") return "Muitos pedidos seguidos. Espere um minuto e tente de novo.";
  if(c==="invalid_json") return "A resposta veio fora do formato. Tente gerar de novo.";
  return (e&&e.message)||"A geração falhou. Tente de novo.";
}
function cfgText(){
  const c=S.config;
  return `Nicho: ${c.nicho}. Público-alvo: ${c.publico}. Formato: ${c.formato}. Estilo do gancho: ${c.gancho}. Voz do narrador: ${c.voz}. Duração: ${c.duracao} minutos. Idioma do vídeo: ${c.idioma}.`;
}
async function ask(prompt,{json=false,tier="default",onText,maxTokens}={}){
  const opts={tier,signal:busy&&busy.ctl.signal}; if(onText) opts.onText=onText; if(maxTokens) opts.maxTokens=maxTokens;
  return json ? AI.json(prompt,opts) : AI.call(prompt,opts);
}
function aiNote(){
  if(!AI.ready()) return `<div class="note">A equipe de textos ainda não tem chave e modelo configurados. <button class="btn small" style="margin-top:6px" onclick="openPanel('admin')">Abrir Administração</button></div>`;
  return "";
}

function newProject(idea,kind){
  kind=kind||"long"; const v=visOf(null), col=v!=="cinema", doc=["documentario","moderno","promocional","cinetico"].includes(v);
  const P={id:Date.now(),kind,idea,config:{...S.config,visual:v},done:{},titles:[],script:[],scenes:[],style:STYLES[0][0],voice:null,voiceName:null,speed:1,
    res:kind==="short"?"short":"1080p",template:doc?Doc.DEF[v]||"Azul noturno":col?"Azul explicador":TEMPLATES[0],captions:kind==="short"?"Palavra por palavra":(col?"Sem legenda":CAPTIONS[0]),
    sound:{mood:v==="promocional"?"Promocional (animado)":v==="cinetico"?"Pop animado":v==="moderno"?"Inspirador":doc?"Tensão (documentário)":col?"Leve (curiosidades)":"Inspirador",sfx:true,sfxSet:v==="promocional"||v==="cinetico"?"Promocional (pop e brilho)":"Documentário (whoosh, impacto, clique)",custom:false}};
  if(kind==="short"){ P.config.duracao=1; P.done.capa=true; }
  return P;
}
const PSEUDO={auto:{k:"auto",n:"Piloto automático",c:"#e0b14a",desc:"A equipe produz vídeos do começo ao fim sozinha. O gerente decide cada etapa."}};
/* ---- Produção casada: vídeo longo + Short que leva pra ele ---- */
const SEG_STAGES=["titulos","roteiro","descricao","imagens","narracao","montagem"];
function segTabs(k){
  const M=S.main(); if(!M||!M.combo||!M.sub||!SEG_STAGES.includes(k)) return "";
  const sd=M.sub.done||{};
  return `<div class="pills" style="margin-bottom:12px" role="tablist">
    <button type="button" class="pill" data-seg="long" aria-pressed="${SEG==="long"}" ${busy?"disabled":""}>🎬 Vídeo longo${M.done[k]?" ✓":""}</button>
    <button type="button" class="pill" data-seg="short" aria-pressed="${SEG==="short"}" ${busy?"disabled":""}>📱 Short${sd[k]?" ✓":""}</button></div>`;
}
function bindSegTabs(el){ el.querySelectorAll("[data-seg]").forEach(b=>b.onclick=()=>{ if(busy) return; SEG=b.dataset.seg; Cut._R=null; renderPanel(); renderProd(); }); }
function makeSub(M){
  const P=newProject({...M.idea,id:Date.now()+7},"short");
  Object.assign(P,{parentId:M.id,parentTitle:M.title,linkToLong:true,voice:M.voice,voiceName:M.voiceName,speed:M.speed,voiceStyle:M.voiceStyle});
  P.config={...M.config,duracao:1}; P.reached=Object.fromEntries(STAGES.map(s=>[s,true]));
  return P;
}
// depois que o vídeo longo termina uma etapa, a equipe faz a mesma etapa do Short
async function comboAfter(stage){
  const M=S.main(); if(SEG!=="long"||!M||!M.combo) return;
  if(!M.sub) M.sub=makeSub(M);
  const Sb=M.sub; Sb.parentTitle=M.title;
  toast("Fazendo o Short também…");
  await withSeg("short",async()=>{
    const P=S.project;
    if(stage==="titulos"){
      setBusy("titulos","criando o título do Short"); renderPanel();
      try{ const r=await ask(`Crie 1 título de YouTube Short (até 60 caracteres, no idioma ${M.config.idioma}) que desperte curiosidade e leve o espectador ao vídeo completo “${M.title}”. Sem emojis. Responda só com JSON: {"titulo":"..."}`,{json:true,tier:"quick"}); P.title=r.titulo||M.title; }
      catch(e){ P.title=M.title; }
      P.done.titulos=true; clearBusy();
    }
    if(stage==="roteiro"){ P.parentScript=M.script.join("\n\n"); if(!P.title) P.title=M.title; P.script=[]; await runRoteiro(); if(P.script.filter(Boolean).length) P.done.roteiro=true; }
    if(stage==="descricao"){ await runDescricao(); if(P.description) P.done.descricao=true; }
    if(stage==="imagens"){
      if(M.board){
        const keep=[]; for(const a of M.board.assets){ if(a.img!=="ok") continue; const b=await Store.get(mkey(M.id,"asset",a.id)); if(b){ await Store.put(mkey(P.id,"asset",a.id),b); keep.push({...a}); } }
        P.parentAssets=keep; P.board=null; if(keep.length){ await runColagem(); if(P.board) P.done.imagens=true; }
      } else {
        for(let i=0;i<M.scenes.length;i++){ const b=await Store.get(mkey(M.id,"scene",i)); if(b) await Store.put(mkey(P.id,"scene",i),b); }
        P.scenes=M.scenes.map(s=>({...s})); P.style=M.style; P.done.imagens=true;
      }
    }
    if(stage==="narracao"){ Object.assign(P,{voice:M.voice,voiceName:M.voiceName,speed:M.speed,voiceStyle:M.voiceStyle}); await runNarracao(false); if(P.narration) P.done.narracao=true; }
  });
  toast("Short atualizado. Veja na aba 📱 Short.");
}
/* ============ PANEL ============ */
let panelKey=null;
function openPanel(k){ window._panelAt=Date.now();
  panelKey=k; const b=BK[k]||PSEUDO[k];
  document.getElementById("ptitle").innerHTML=esc(b.n)+(b.step?`<span class="step">Etapa ${b.step} de 6 · ${esc(b.role)}</span>`:`<span class="step">${k==="arquivo"?"Biblioteca":(k==="admin"?"Configurações":(k==="auto"?"O gerente decide tudo":(k==="stories"?"Edite o vídeo que você gravou":"Sempre aberto")))}</span>`);
  document.getElementById("psq").style.background=b.c;
  document.getElementById("panel").classList.add("open"); document.getElementById("panel").setAttribute("aria-hidden","false");
  document.getElementById("scrim").classList.toggle("open", k!=="auto");
  renderPanel(); renderProd();
  setTimeout(()=>document.getElementById("pclose").focus(),50);
}
function closePanel(){
  if(typeof stopPreview==="function") stopPreview(); if(typeof stopAudio==="function") stopAudio();
  panelKey=null; document.getElementById("panel").classList.remove("open"); document.getElementById("panel").setAttribute("aria-hidden","true");
  document.getElementById("scrim").classList.remove("open"); renderProd();
}
document.getElementById("pclose").onclick=closePanel;
// o toque que abre o painel não pode "vazar" e fechar o painel em seguida (clique fantasma do celular)
document.getElementById("scrim").onclick=()=>{ if(Date.now()-(window._panelAt||0)<500) return; closePanel(); };
function renderPanel(){
  if(!panelKey) return;
  const el=document.getElementById("pbody");
  const sc=el.scrollTop;
  if(!isUnlocked(panelKey)){ el.innerHTML=lockedView(panelKey); return; }
  el.innerHTML=segTabs(panelKey)+(VIEWS[panelKey]||(()=>""))();
  el.scrollTop=sc; bindSegTabs(el);
  (BIND[panelKey]||(()=>{}))(el);
}
function lockedView(k){
  if(!S.project) return `<div class="lock"><div class="big">🔒</div><h3>Nenhum vídeo em produção</h3><p class="lead">Escolha uma ideia no Laboratório de Ideias e clique em Começar produção. Aí os prédios vão abrindo um por um.</p><button class="btn" onclick="openPanel('ideias')">Abrir Laboratório de Ideias</button></div>`;
  const i=STAGES.indexOf(k); let prev=STAGES[0]; for(let j=0;j<i;j++) if(!S.project.done[STAGES[j]]){ prev=STAGES[j]; break; }
  return `<div class="lock"><div class="big">🔒</div><h3>Ainda não é a vez deste prédio</h3><p class="lead">Ele abre quando a etapa de ${STAGE_LABEL[prev].toLowerCase()} for concluída em ${esc(BK[prev].n)}.</p><button class="btn" onclick="openPanel('${prev}')">Ir pra ${esc(BK[prev].n)}</button></div>`;
}
function pills(name,list,cur){ return `<div class="pills" data-group="${name}">${list.map(v=>`<button type="button" class="pill" aria-pressed="${v===cur}" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div>`; }
function bindPills(el,name,cb){ el.querySelectorAll(`[data-group="${name}"] .pill`).forEach(p=>p.onclick=()=>{ el.querySelectorAll(`[data-group="${name}"] .pill`).forEach(q=>q.setAttribute("aria-pressed","false")); p.setAttribute("aria-pressed","true"); cb(p.dataset.v); }); }
const VIEWS={}, BIND={};
let ui={}; // transient UI errors etc

/* ---- Prévias dos estilos visuais (desenhadas com o próprio motor do OnionCut) ---- */
const _prev={};
function sampleScene(w,h){
  const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d");
  const sky=g.createLinearGradient(0,0,0,h); sky.addColorStop(0,"#6f93b5"); sky.addColorStop(.7,"#e3c9a0"); g.fillStyle=sky; g.fillRect(0,0,w,h);
  g.fillStyle="#7a8794"; [[.02,.42,.16],[.2,.3,.12],[.34,.48,.1],[.6,.36,.15],[.8,.44,.18]].forEach(([x,y,ww])=>g.fillRect(x*w,y*h,ww*w,(.74-y)*h));
  g.fillStyle="#4d5a63"; for(let i=0;i<40;i++) g.fillRect(((i*37)%100)/100*w,(.45+((i*17)%25)/100)*h,w*.012,h*.02);
  g.fillStyle="#3b4337"; g.fillRect(0,h*.74,w,h*.26);
  g.fillStyle="#241f1c"; g.beginPath(); g.arc(w*.47,h*.5,h*.055,0,7); g.fill(); g.fillRect(w*.435,h*.56,w*.07,h*.22);
  return c;
}
function sampleProduct(w,h){
  const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,w,h); bg.addColorStop(0,"#f6e7dc"); bg.addColorStop(1,"#e4c8b6"); g.fillStyle=bg; g.fillRect(0,0,w,h);
  g.fillStyle="rgba(0,0,0,.15)"; g.beginPath(); g.ellipse(w*.5,h*.86,w*.13,h*.04,0,0,7); g.fill();
  g.fillStyle="#2f6f5e"; g.beginPath(); g.roundRect(w*.42,h*.3,w*.16,h*.56,18); g.fill(); g.fillStyle="#24584a"; g.fillRect(w*.465,h*.18,w*.07,h*.14);
  g.fillStyle="#f3efe6"; g.fillRect(w*.435,h*.5,w*.13,h*.16); g.fillStyle="#2f6f5e"; g.fillRect(w*.45,h*.55,w*.1,h*.02); g.fillRect(w*.46,h*.6,w*.08,h*.015);
  return c;
}
function sampleChar(w,h){
  const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d"); g.lineWidth=6; g.strokeStyle="#2b2b2b";
  g.fillStyle="#b9b9c4"; g.beginPath(); g.moveTo(w*.3,h*.95); g.lineTo(w*.36,h*.4); g.lineTo(w*.64,h*.4); g.lineTo(w*.7,h*.95); g.closePath(); g.fill(); g.stroke();
  g.fillStyle="#e8c6a8"; g.beginPath(); g.arc(w*.5,h*.26,h*.13,0,7); g.fill(); g.stroke();
  g.fillStyle="#5a3b25"; g.beginPath(); g.arc(w*.5,h*.2,h*.11,Math.PI,0); g.fill();
  g.fillStyle="#d8c79c"; g.fillRect(w*.58,h*.5,w*.1,h*.2); g.strokeRect(w*.58,h*.5,w*.1,h*.2);
  return c;
}
async function stylePreview(v){
  if(_prev[v]) return _prev[v];
  try{ await Promise.all(["700 40px Cinzel","40px Anton","800 40px Figtree"].map(f=>document.fonts.load(f))); }catch(e){}
  const W=480,H=270,c=document.createElement("canvas"); c.width=W; c.height=H;
  const scene=sampleScene(960,540), cap=[{ws:[{w:"ESSA",s:0,e:.6},{w:"HISTÓRIA",s:.6,e:1.6},{w:"MUDOU",s:1.6,e:2.4}],s:0,e:4}];
  let R,o,t=2.4;
  if(v==="colagem"){ R={mode:"colagem",dur:9,assets:{a:{bmp:sampleChar(300,400),real:false,nome:""}},scenes:[{s:0,e:9,beat:{elementos:["a"],texto:"filósofa",titulo:"Hipátia",avatar:"a"}}],caps:[]}; o={template:"Azul explicador",captions:"Sem legenda"}; }
  else if(v==="cinema"){ R={mode:"cinema",dur:9,bitmaps:[scene],scenes:[{s:0,e:9,j:0,v:0}],caps:cap}; o={template:TEMPLATES[0],captions:"Palavra por palavra"}; t=1; }
  else {
    const beat={documentario:{tipo:"nome",img:"p",texto:"Winston Churchill",subtexto:"Primeiro-ministro *britânico*"},
      moderno:{tipo:"nome",img:"p",texto:"Como tudo começou",subtexto:"Berlim, *1945*"},
      promocional:{tipo:"titulo",img:"q",texto:"50% OFF",subtexto:"Só *hoje*"},
      cinetico:{tipo:"titulo",img:"",texto:"VOCÊ SABIA?",subtexto:""}}[v];
    R={mode:"doc",dur:9,assets:{p:{bmp:scene,nome:""},q:{bmp:sampleProduct(960,540),nome:""}},scenes:[{s:0,e:9,beat}],caps:[]};
    o={template:Doc.DEF[v],captions:"Sem legenda",theme:v};
  }
  Cut.still(R,c,o,t);
  return _prev[v]=c.toDataURL("image/jpeg",.85);
}

/* ---- Buscar temas (dentro do Laboratório de Ideias) ---- */
function vSources(){ if(!S.viraisSources||S.viraisSources.v!==3) S.viraisSources={v:3,sites:true,ia:true}; return S.viraisSources; }
function viraisSection(){
  const src=vSources(), g=!!AI.get().keys.google, sig=S.viraisSig, open=ui.virOpen||S.viraisResults.length>0;
  return `<details class="card" style="padding:0;margin-top:10px" ${open?"open":""} id="virdet"><summary style="padding:12px;cursor:pointer;font-weight:700">🔥 Buscar temas em alta <span class="m" style="font-weight:400;font-size:12.5px">(opcional)</span></summary><div style="padding:0 12px 12px">
    <div class="field"><label for="vreg">País</label><select id="vreg">${REGIOES().map(r=>`<option ${r===S.viraisRegion?"selected":""}>${r}</option>`).join("")}</select></div>
    <label style="display:flex;gap:10px;align-items:flex-start;padding:4px 0"><input type="checkbox" data-src="sites" ${src.sites?"checked":""} style="margin-top:3px"><span><b>🌐 Sites de tendência</b><br><span class="m" style="font-size:12.5px">Google Trends, X (trends24), Reddit, Google Notícias e Wikipedia${g?"":" (sem a chave do Google, só a Wikipedia)"}</span></span></label>
    <label style="display:flex;gap:10px;align-items:flex-start;padding:4px 0;${g?"":"opacity:.55"}"><input type="checkbox" data-src="ia" ${src.ia&&g?"checked":""} ${g?"":"disabled"} style="margin-top:3px"><span><b>🤖 Sugestão da IA</b><br><span class="m" style="font-size:12.5px">a IA pesquisa no Google os virais do momento${g?"":" · precisa da chave do Google"}</span></span></label>
    <div class="field" style="margin-top:6px"><label for="vn">✍️ Escolha o tema você mesmo (opcional)</label><input id="vn" value="${esc(S.viraisNicho)}" placeholder="Ex.: cangaço, GTA 6, minha loja de tênis…"></div>
    <div class="btns"><button class="btn small" id="vgo" ${busy||!AI.ready()?"disabled":""}>🔎 Buscar temas</button>${busy&&busy.k==="ideias"?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
    ${busy&&busy.k==="ideias"?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
    ${ui.virErr?`<div class="err">${esc(ui.virErr)}</div>`:""}
    ${sig&&sig.avisos&&sig.avisos.length?`<div class="m" style="font-size:12px">${sig.avisos.map(a=>"⚠ "+esc(a)).join("<br>")}</div>`:""}
    ${S.viraisResults.map((v,i)=>`<div class="card" style="margin-top:8px"><div class="t">${esc(v.tema)}</div><div class="m">${esc(v.angulo||"")}</div>
      ${v.sinal?`<div class="m" style="margin-top:3px;color:var(--text)">📈 ${esc(v.sinal)}</div>`:""}
      <div class="tags">${v.urgencia?`<span class="tag ${v.urgencia==="agora"?"hot":"gold"}">${v.urgencia==="agora"?"🔥 surfar agora":v.urgencia==="esta semana"?"esta semana":"perene"}</span>`:""}<span class="tag">${esc(v.nicho||"")}</span></div>
      <div class="btns" style="margin-top:6px"><button class="btn small" data-usev="${i}">Usar este tema</button><button class="btn ghost small" data-fila="${i}" ${v.enviado?"disabled":""}>${v.enviado?"Na fila ✓":"Guardar na fila"}</button></div></div>`).join("")}
  </div></details>`;
}
function bindVirais(el){
  const det=el.querySelector("#virdet"); if(det) det.ontoggle=()=>{ ui.virOpen=det.open; };
  const reg=el.querySelector("#vreg"); if(reg) reg.onchange=()=>{ S.viraisRegion=reg.value; save(); };
  el.querySelectorAll("[data-src]").forEach(c=>c.onchange=()=>{ vSources()[c.dataset.src]=c.checked; save(); });
  const vn=el.querySelector("#vn"); if(vn) vn.oninput=()=>{ S.viraisNicho=vn.value; save(); };
  const go=el.querySelector("#vgo"); if(go) go.onclick=runVirais;
  el.querySelectorAll("[data-usev]").forEach(b=>b.onclick=()=>{ const v=S.viraisResults[+b.dataset.usev]; const D=draft(); D.tema=v.tema; if(!D.ideia) D.ideia=v.angulo||""; D.origem="Em alta · "+S.viraisRegion; save(); renderPanel(); const t=document.getElementById("dtema"); if(t){ t.scrollIntoView({behavior:"smooth",block:"center"}); t.focus(); } toast("Tema colocado no Novo vídeo"); });
  el.querySelectorAll("[data-fila]").forEach(b=>b.onclick=()=>{ const v=S.viraisResults[+b.dataset.fila]; v.enviado=true; S.ideias.push({id:Date.now()+Math.random(),tema:v.tema,angulo:v.angulo,origem:"Em alta · "+S.viraisRegion}); save(); toast("Guardado na fila"); renderPanel(); });
}
async function runVirais(){
  ui.virErr=null; setBusy("ideias","buscando temas em "+S.viraisRegion); renderPanel();
  const src=vSources(), g=!!AI.get().keys.google, kw=(S.viraisNicho||"").trim();
  let sig=null;
  try{
    sig=await Trends.collect({region:S.viraisRegion,niche:kw,sources:{sites:src.sites&&g,wiki:src.sites,google:src.ia&&g},onStatus:a=>{ setAction(a); renderPanel(); },signal:busy.ctl.signal});
    S.viraisSig=sig; save();
  }catch(e){ if(e.code==="cancelled"){ clearBusy(); return renderPanel(); } }
  if(busy&&busy.cancel){ clearBusy(); return renderPanel(); }
  setAction("escolhendo os melhores temas"); renderPanel();
  const dados=sig?Trends.asPrompt(sig):"", hoje=new Date().toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"});
  const prompt=`Você é o analista de tendências de uma produtora de vídeos (YouTube, Shorts, Reels e conteúdo de marca). Hoje é ${hoje}.
País do público: ${S.viraisRegion}. ${S.config?`Canal/marca: ${cfgText()}`:""}
${kw?`O criador escolheu este tema/palavra-chave: "${kw}". Todos os temas devem girar em torno dele, usando o que estiver em alta pra deixá-lo atual.`:"Ligue o que está em alta ao nicho do canal/marca quando fizer sentido."}
${dados?`\nDADOS COLETADOS AGORA (base principal; prefira o que aparece em mais de uma fonte):\n${dados}\n`:"\nSem dados ao vivo: use datas e assuntos recorrentes do período.\n"}
Liste 8 temas de vídeo com alto potencial de clique imediato, específicos o bastante pra virar título. Para cada: "tema" (português, 1 frase curta), "angulo" (como abordar), "sinal" (a evidência dos dados, com números; vazio se não houver), "urgencia" ("agora", "esta semana" ou "perene"), "nicho" (1-3 palavras).
Responda só com JSON: {"ideias":[...]}`;
  try{ const r=await ask(prompt,{json:true}); S.viraisResults=(r.ideias||[]).slice(0,10); save(); }
  catch(e){ ui.virErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Ideias ---- */
function draft(){ if(!S.draft) S.draft={tema:"",ideia:"",comeco:"",meio:"",fim:"",mural:false,nomes:""}; return S.draft; }
VIEWS.ideias=()=>{
  const D=draft();
  const c=S.config||{nicho:"",publico:"",formato:FORMATOS[0],gancho:GANCHOS[0],voz:"Masculina",duracao:10,idioma:"Português",visual:"documentario",ipm:3};
  return `
  <details ${S.config?"":"open"} class="card" style="padding:0"><summary style="padding:12px;cursor:pointer;font-weight:700">Seu canal ou marca ${S.config?`<span class="tag gold">${esc(c.nicho)} · ${esc(c.idioma)}</span>`:`<span class="tag hot">configure primeiro</span>`}</summary>
  <div style="padding:0 12px 12px">
  <datalist id="dl-nicho">${NICHOS.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
  <datalist id="dl-publico">${PUBLICOS.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
  <div class="field"><label for="cn">Nicho ou assunto do canal / marca</label><input id="cn" list="dl-nicho" value="${esc(c.nicho)}" placeholder="Escreva ou escolha: mistérios, minha loja de roupas, imobiliária…"></div>
  <div class="row"><div class="field"><label for="cp">Público-alvo</label><input id="cp" list="dl-publico" value="${esc(c.publico)}" placeholder="Escreva ou escolha"></div>
  <div class="field"><label for="cf">Formato</label><select id="cf">${FORMATOS.map(n=>`<option ${n===c.formato?"selected":""}>${n}</option>`).join("")}</select></div></div>
  <div class="row"><div class="field"><label for="cg">Estilo do gancho</label><select id="cg">${GANCHOS.map(n=>`<option ${n===c.gancho?"selected":""}>${n}</option>`).join("")}</select></div>
  <div class="field"><label for="cv">Voz</label><select id="cv">${["Masculina","Feminina"].map(n=>`<option ${n===c.voz?"selected":""}>${n}</option>`).join("")}</select></div></div>
  <div class="row"><div class="field"><label for="cd">Duração do vídeo longo (min)</label><input id="cd" type="number" min="1" max="60" value="${c.duracao}"></div>
  <div class="field"><label for="clang">Idioma dos vídeos</label><select id="clang">${IDIOMAS.map(i=>`<option value="${i[0]}" ${i[0]===c.idioma?"selected":""}>${i[0]}</option>`).join("")}</select></div></div>
  <div class="field"><label>Estilo visual</label><div class="stylecards">${VISUAIS.map(([v,t])=>`<button type="button" class="stylecard" data-vis="${v}" aria-pressed="${(c.visual||"documentario")===v}"><img alt="" data-prev="${v}"><span>${t}</span></button>`).join("")}</div></div>
  <div class="field" style="max-width:220px"><label for="cipm">Imagens por minuto</label><input id="cipm" type="number" min="1" max="20" step="1" value="${c.ipm||3}"></div>
  <div class="btns"><button class="btn" id="csave">${S.config?"Salvar alterações":"Salvar canal"}</button></div>
  </div></details>

  ${viraisSection()}

  <h3 style="margin-top:18px">Novo vídeo</h3>
  ${S.project?`<div class="note">Já tem um vídeo em produção: “${esc(S.project.title||S.project.idea.tema)}”. Termine ou descarte antes de começar outro. <button class="btn ghost small" id="discard" style="margin-top:6px">Descartar produção atual</button></div>`:""}
  <div class="card" style="padding:12px 14px">
    <div class="field"><label for="dtema">Tema do vídeo</label><input id="dtema" value="${esc(D.tema)}" placeholder="Ex.: como morreram os cangaceiros de Lampião"></div>
    <div class="field"><label for="dideia">O que você quer passar com esse vídeo</label><textarea id="dideia" rows="2" placeholder="Ex.: mostrar que o fim do cangaço foi mais brutal do que se conta, sem romantizar">${esc(D.ideia)}</textarea></div>
    <details ${D.comeco||D.meio||D.fim?"open":""} style="margin-top:4px"><summary style="cursor:pointer;font-weight:600;font-size:13.5px">Começo, meio e fim (opcional, a IA segue à risca)</summary>
      <div class="field" style="margin-top:10px"><label for="dcom">Começo</label><textarea id="dcom" rows="2" placeholder="Ex.: abrir com a cena das cabeças expostas na escadaria, sem explicar ainda">${esc(D.comeco)}</textarea></div>
      <div class="field"><label for="dmeio">Meio</label><textarea id="dmeio" rows="2" placeholder="Ex.: contar quem traiu o bando e como a volante chegou até a grota">${esc(D.meio)}</textarea></div>
      <div class="field"><label for="dfim">Fim</label><textarea id="dfim" rows="2" placeholder="Ex.: pedir pra se inscrever e dizer que o nome dos inscritos aparece no final dos próximos vídeos">${esc(D.fim)}</textarea></div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:4px 0"><input type="checkbox" id="dmural" ${D.mural?"checked":""} style="margin-top:3px"> <span>Mostrar o <b>mural de inscritos</b> nos últimos segundos do vídeo</span></label>
      ${D.mural?`<div class="field"><label for="dnomes">Nomes no mural (um por linha; copie dos inscritos recentes do YouTube Studio)</label><textarea id="dnomes" rows="3" placeholder="Maria S.&#10;João Pedro&#10;Ana Lima">${esc(D.nomes)}</textarea>
      <div class="m" style="font-size:12px;margin-top:4px">Sem nomes, o mural mostra “Seu nome pode aparecer aqui no próximo vídeo”. Use nomes reais: inventar inscritos engana quem assiste e pode virar denúncia.</div></div>`:""}
    </details>
    <div class="field" style="margin-top:10px;max-width:320px"><label for="dkind">Tipo</label><select id="dkind">${[["combo","Casada: longo + Short"],["long","Vídeo longo"],["short","Short / Reels / Stories (vertical)"]].map(([v,t])=>`<option value="${v}" ${(ui.kind||"combo")===v?"selected":""}>${t}</option>`).join("")}</select></div>
    <div class="btns"><button class="btn" id="start" ${!S.config||!D.tema.trim()||S.project?"disabled":""}>🚀 Começar produção</button><button class="btn ghost small" id="dqueue" ${!D.tema.trim()?"disabled":""}>Guardar na fila pra depois</button>${!S.config?`<span class="m" style="font-size:12.5px;color:var(--muted)">Salve o canal primeiro</span>`:""}</div>
  </div>
  ${S.ideias.length?`<details class="card" style="padding:0;margin-top:10px" ${S.ideias.length<6?"open":""}><summary style="padding:12px;cursor:pointer;font-weight:700">Fila de ideias <span class="tag">${S.ideias.length}</span></summary><div style="padding:0 12px 10px">
    <p class="m" style="font-size:12.5px;margin:0 0 8px">Toque numa ideia pra trazer pro formulário acima.</p>
    ${S.ideias.map(i=>`<div class="card click" data-pick="${i.id}" style="margin-bottom:6px"><div class="t">${esc(i.tema)}</div>${i.angulo?`<div class="m">${esc(i.angulo)}</div>`:""}<div class="tags"><span class="tag">${esc(i.origem||"Sua ideia")}</span><button class="tag" style="border:0;cursor:pointer" data-del="${i.id}" aria-label="Remover ideia">remover</button></div></div>`).join("")}
  </div></details>`:""}`;
};
BIND.ideias=el=>{
  bindVirais(el);
  let vis=(S.config&&S.config.visual)||"documentario";
  const cd=el.querySelector("#cd");
  const readCfg=()=>({nicho:el.querySelector("#cn").value.trim()||"Geral",publico:el.querySelector("#cp").value.trim()||"Público geral",formato:el.querySelector("#cf").value,gancho:el.querySelector("#cg").value,voz:el.querySelector("#cv").value,
    duracao:Math.max(1,Math.min(60,+cd.value||10)),idioma:el.querySelector("#clang").value,visual:vis,ipm:Math.max(1,Math.min(20,+el.querySelector("#cipm").value||3))});
  const autosave=()=>{ if(S.config){ S.config=readCfg(); save(); renderProd(); } };
  ["#cn","#cp","#cf","#cg","#cv","#cd","#clang","#cipm"].forEach(q=>{ const i=el.querySelector(q); if(i) i.onchange=autosave; });
  el.querySelectorAll("[data-vis]").forEach(b=>b.onclick=()=>{ vis=b.dataset.vis; el.querySelectorAll("[data-vis]").forEach(x=>x.setAttribute("aria-pressed",x===b)); autosave(); });
  el.querySelectorAll("img[data-prev]").forEach(im=>stylePreview(im.dataset.prev).then(u=>{ if(u) im.src=u; }));
  el.querySelector("#csave").onclick=()=>{ S.config=readCfg(); save(); toast("Canal salvo · vídeos em "+S.config.idioma); renderPanel(); };
  // formulário do novo vídeo (rascunho salvo a cada tecla)
  const D=draft();
  const sync=()=>{ D.tema=el.querySelector("#dtema").value; D.ideia=el.querySelector("#dideia").value; D.comeco=el.querySelector("#dcom").value; D.meio=el.querySelector("#dmeio").value; D.fim=el.querySelector("#dfim").value; const n=el.querySelector("#dnomes"); if(n) D.nomes=n.value; save();
    const st=el.querySelector("#start"), q=el.querySelector("#dqueue"); if(st) st.disabled=!S.config||!D.tema.trim()||!!S.project; if(q) q.disabled=!D.tema.trim(); };
  ["#dtema","#dideia","#dcom","#dmeio","#dfim","#dnomes"].forEach(q=>{ const i=el.querySelector(q); if(i) i.oninput=sync; });
  el.querySelector("#dmural").onchange=e=>{ sync(); D.mural=e.target.checked; save(); renderPanel(); };
  const toIdea=()=>({id:Date.now()+Math.random(),tema:D.tema.trim(),angulo:D.angulo||"",origem:D.origem||"Sua ideia",intencao:D.ideia.trim(),comeco:D.comeco.trim(),meio:D.meio.trim(),fim:D.fim.trim(),mural:D.mural?{on:true,nomes:D.nomes.split("\n").map(x=>x.trim()).filter(Boolean)}:null});
  const clearDraft=()=>{ S.draft=null; };
  el.querySelector("#dqueue").onclick=()=>{ sync(); S.ideias.unshift(toIdea()); clearDraft(); save(); toast("Guardada na fila"); renderPanel(); };
  el.querySelectorAll("[data-pick]").forEach(c=>c.onclick=e=>{ if(e.target.dataset.del) return; const i=S.ideias.find(x=>x.id===+c.dataset.pick); if(!i) return;
    S.draft={tema:i.tema||"",ideia:i.intencao||"",comeco:i.comeco||"",meio:i.meio||"",fim:i.fim||"",mural:!!(i.mural&&i.mural.on),nomes:((i.mural&&i.mural.nomes)||[]).join("\n"),angulo:i.angulo||"",origem:i.origem||"",fromId:i.id}; save(); renderPanel(); el.scrollTop=0; });
  el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ S.ideias=S.ideias.filter(i=>i.id!==+b.dataset.del); save(); renderPanel(); });
  el.querySelector("#dkind").onchange=e=>{ ui.kind=e.target.value; };
  const d=el.querySelector("#discard"); if(d) d.onclick=()=>{ if(busy) interrupt(); Store.delPrefix(`p${S.project.id}:`); S.project=null; save(); toast("Produção descartada"); renderPanel(); renderProd(); };
  el.querySelector("#start").onclick=()=>{
    sync(); if(!D.tema.trim()) return;
    const idea=toIdea(); if(D.fromId) S.ideias=S.ideias.filter(i=>i.id!==D.fromId);
    S.project=newProject(idea,ui.kind==="combo"?"long":ui.kind); if((ui.kind||"combo")==="combo") S.project.combo=true;
    clearDraft(); save();
    courier("ideias","titulos"); toast("Ideia enviada pra Torre dos Títulos"); renderProd(); openPanel("titulos");
  };
};

/* ---- Títulos ---- */
VIEWS.titulos=()=>{ const P=S.project; return `
  <p class="lead">Ideia: <b>${esc(P.idea.tema)}</b></p>
  ${aiNote()}
  <div class="btns"><button class="btn" id="tgo" ${busy||!AI.ready()?"disabled":""}>✦ ${P.titles.length?"Gerar outros 10":"Gerar 10 títulos"}</button>${busy&&busy.k==="titulos"?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${busy&&busy.k==="titulos"?`<div class="status"><span class="spin"></span>testando ângulos e gatilhos…</div>`:""}
  ${ui.titErr?`<div class="err">${esc(ui.titErr)}</div>`:""}
  <div style="margin-top:12px">${P.titles.map((t,i)=>`<div class="card click ${P.title===t.titulo?"sel":""}" data-t="${i}"><div style="display:flex;gap:8px;justify-content:space-between"><div class="t">${esc(t.titulo)}</div><span class="m" style="flex:none">${t.titulo.length}/100</span></div><div class="tags"><span class="tag">ângulo: ${esc(t.angulo)}</span><span class="tag gold">gatilho: ${esc(t.gatilho)}</span></div></div>`).join("")}</div>
  <h3>Já tenho o título</h3>
  <div class="field"><input id="own" placeholder="Cole o título aqui" value="${P.titles.some(t=>t.titulo===P.title)?"":esc(P.title||"")}"></div>
  <div class="btns"><button class="btn" id="tok" ${P.title?"":"disabled"}>${P.done.titulos?"Título confirmado ✓":"Confirmar título e mandar pros Roteiros"}</button></div>`; };
BIND.titulos=el=>{
  const P=S.project; const go=el.querySelector("#tgo"); if(go) go.onclick=runTitulos;
  el.querySelectorAll("[data-t]").forEach(c=>c.onclick=()=>{ if(P.done.roteiro) return toast("O roteiro já foi escrito pra este título"); P.title=P.titles[+c.dataset.t].titulo; P.done.titulos=false; save(); renderPanel(); renderProd(); });
  const own=el.querySelector("#own"); own.oninput=()=>{ if(P.done.roteiro) return; P.title=own.value.trim()||null; P.done.titulos=false; save(); el.querySelector("#tok").disabled=!P.title; el.querySelectorAll(".card.sel").forEach(c=>c.classList.remove("sel")); };
  el.querySelector("#tok").onclick=()=>{ if(!P.title) return; if(!P.done.titulos){ P.done.titulos=true; save(); courier("titulos","roteiro"); toast("Título enviado pro Prédio dos Roteiros"); renderProd(); openPanel("roteiro"); comboAfter("titulos"); } };
};
async function runTitulos(){
  const P=S.project; ui.titErr=null; setBusy("titulos","testando ângulos"); renderPanel();
  const prompt=`Você é copywriter sênior de YouTube especializado em canais faceless de alto CTR.
Canal: ${cfgText()}
Ideia do vídeo: "${P.idea.tema}"${P.idea.angulo?` (ângulo sugerido: ${P.idea.angulo})`:""}.${P.idea.intencao?` O que o criador quer passar com o vídeo: ${P.idea.intencao}.`:""}
Crie 10 títulos no idioma ${P.config.idioma}, cada um com ângulo e gatilho emocional diferentes (curiosidade, medo de perder, esperança, alívio, urgência, prova, contraste…). Máximo 80 caracteres. Sem clickbait mentiroso, sem CAPS exagerado, sem emojis. Pense no que faria esse público específico clicar.
Para cada: "titulo", "angulo" (em português, até 6 palavras), "gatilho" (em português, 1-2 palavras).
Responda só com JSON: {"titulos":[...]}`;
  try{ const r=await ask(prompt,{json:true}); P.titles=(r.titulos||[]).filter(t=>t&&t.titulo).slice(0,10); save(); }
  catch(e){ ui.titErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Roteiro ---- */
function nBlocks(){ const d=S.project.config.duracao; return S.project.kind==="short"||d<=6?1:Math.max(2,Math.round(d/5)); }
function scriptText(){ return S.project.script.join("\n\n"); }
function wc(s){ return (s.match(/\S+/g)||[]).length; }
// mudanças no roteiro não apagam o resto: marcam o que ficou desatualizado
function markStale(P,from){
  P.stale=P.stale||{};
  if(from==="roteiro"){ if(P.description) P.stale.descricao=true; if(P.board||P.scenes.length) P.stale.imagens=true; if(P.narr) P.stale.narracao=true; if(P.cut||P.render) P.stale.montagem=true; }
  if(from==="narracao"||from==="imagens"){ if(P.cut||P.render) P.stale.montagem=true; }
  Cut._R=null;
}
function staleNote(P,k){
  const s=(P.stale||{})[k]; if(!s) return "";
  const msg={descricao:"O roteiro mudou depois da descrição. Ela continua valendo; se quiser, gere de novo pra combinar com o texto novo.",
    imagens:"O roteiro mudou. As imagens continuam valendo; se mudou muito, refaça a lista só das cenas novas ou mantenha as atuais.",
    narracao:"O roteiro mudou depois da narração. Gere a narração de novo (só ela): roteiro, capa e imagens continuam.",
    montagem:"Algo mudou depois da montagem. Clique em Montar de novo e renderize: não gasta nada."}[k];
  return `<div class="note" style="border:1px solid var(--gold)">✎ ${msg} <button class="btn ghost small" style="margin-left:6px;padding:3px 9px" onclick="clearStale('${k}')">ok, manter</button></div>`;
}
function clearStale(k){ const P=S.project; if(P&&P.stale){ delete P.stale[k]; save(); renderPanel(); } }
window.clearStale=clearStale;
VIEWS.roteiro=()=>{ const P=S.project, n=nBlocks(), have=P.script.filter(Boolean).length; const working=busy&&busy.k==="roteiro"; const full=have>=n&&!working; return `
  <p class="lead">Título: <b>${esc(P.title)}</b><br>${n} bloco${n>1?"s":""} · cerca de ${P.kind==="short"?"1":P.config.duracao} min em ${esc(P.config.idioma)}</p>
  ${aiNote()}
  <div class="btns">
    ${have<n?`<button class="btn" id="rgo" ${busy||!AI.ready()?"disabled":""}>✦ ${have?`Continuar do bloco ${have+1}`:"Escrever roteiro"}</button>`:""}
    ${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}
    ${have?`<button class="btn ghost small" id="rcopy">Copiar roteiro</button>`:""}
    ${have&&!working?`<button class="btn ghost small" id="rre">Reescrever tudo do zero</button>`:""}
  </div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.rotErr?`<div class="err">${esc(ui.rotErr)}</div>`:""}
  ${working?`<div class="script" id="scr">${P.script.map((t,i)=>`<div class="blk">Bloco ${i+1}</div>${esc(t)}`).join("\n")}<div class="blk">Bloco ${have+1}</div><span id="live"></span></div>`:""}
  ${have&&!working?`<p class="m" style="font-size:12.5px;margin:4px 0 8px">Edite à vontade: mexer no roteiro não apaga capa nem imagens. Só a narração precisa ser gerada de novo depois.</p>
    ${P.script.map((t,i)=>`<div class="card" style="padding:10px 12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b class="blk" style="margin:0">Bloco ${i+1}</b><span class="m" style="font-size:12px">${wc(t)} palavras</span></div>
      <textarea class="rblk" data-b="${i}" rows="8" style="width:100%;margin-top:6px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:9px 11px;line-height:1.55">${esc(t)}</textarea>
      <div class="btns" style="margin-top:6px"><input class="rinstr" data-b="${i}" placeholder="Pedir mudança à IA (ex.: mais curto, gancho mais forte, tirar a parte X)" style="flex:1;min-width:180px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 10px">
      <button class="btn ghost small" data-rw="${i}" ${busy||!AI.ready()?"disabled":""}>✦ Reescrever este bloco</button></div></div>`).join("")}
    <div class="btns"><button class="btn" id="rsave" style="display:none">💾 Salvar as alterações</button></div>
    <p class="m" style="font-size:12.5px;color:var(--muted)">${wc(scriptText())} palavras · ~${Math.round(wc(scriptText())/140)} min de narração</p>`:""}
  ${!have&&!working?`<details class="card" style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">Já tenho o roteiro</summary><div class="field" style="margin-top:10px"><textarea id="rown" rows="6" placeholder="Cole o roteiro aqui. Separe os blocos com uma linha em branco dupla."></textarea></div><button class="btn small" id="ruse">Usar este roteiro</button></details>`:""}
  ${full?`<div class="btns"><button class="btn" id="rok" ${P.done.roteiro?"disabled":""}>${P.done.roteiro?"Roteiro aprovado ✓":"Aprovar roteiro e mandar pra Redação"}</button></div>`:""}`; };
BIND.roteiro=el=>{
  const P=S.project;
  const go=el.querySelector("#rgo"); if(go) go.onclick=runRoteiro;
  const re=el.querySelector("#rre"); if(re) re.onclick=()=>{ if(!confirm("Reescrever o roteiro inteiro com a IA? Capa e imagens continuam; a narração vai precisar ser refeita.")) return; P.script=[]; markStale(P,"roteiro"); save(); renderProd(); runRoteiro(); };
  const cp=el.querySelector("#rcopy"); if(cp) cp.onclick=()=>{ navigator.clipboard?.writeText(scriptText()).then(()=>toast("Roteiro copiado"),()=>toast("Não deu pra copiar neste navegador")); };
  const ru=el.querySelector("#ruse"); if(ru) ru.onclick=()=>{ const t=el.querySelector("#rown").value.trim(); if(!t) return toast("Cole o roteiro primeiro"); let parts=t.split(/\n\s*\n\s*\n/).map(x=>x.trim()).filter(Boolean); const n=nBlocks(); while(parts.length<n) parts.push(""); if(parts.length>n){ parts=[...parts.slice(0,n-1),parts.slice(n-1).join("\n\n")]; } P.script=parts; markStale(P,"roteiro"); save(); renderPanel(); };
  const sv=el.querySelector("#rsave");
  el.querySelectorAll(".rblk").forEach(ta=>ta.oninput=()=>{ if(sv) sv.style.display=""; });
  if(sv) sv.onclick=()=>{ el.querySelectorAll(".rblk").forEach(ta=>{ P.script[+ta.dataset.b]=ta.value.trim(); }); markStale(P,"roteiro"); save(); toast("Roteiro salvo. Só a narração precisa ser refeita."); renderProd(); renderPanel(); };
  el.querySelectorAll("[data-rw]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.rw; const ins=el.querySelector(`.rinstr[data-b="${i}"]`).value.trim();
    el.querySelectorAll(".rblk").forEach(ta=>{ P.script[+ta.dataset.b]=ta.value.trim(); }); rewriteBlock(i,ins); });
  const ok=el.querySelector("#rok"); if(ok) ok.onclick=()=>{ P.done.roteiro=true; save(); courier("roteiro","descricao"); toast("Roteiro aprovado"); renderProd(); openPanel(P.done.descricao?"narracao":"descricao"); comboAfter("roteiro"); };
};
async function rewriteBlock(i,instr){
  const P=S.project; ui.rotErr=null; setBusy("roteiro",`reescrevendo o bloco ${i+1}`); renderPanel();
  const prompt=`Você é roteirista de um canal faceless de YouTube. Canal: ${cfgText()}
Título: "${P.title}". Abaixo está o roteiro inteiro e o bloco ${i+1} que precisa ser reescrito.
Pedido do criador: ${instr||"melhore o ritmo, a clareza e o gancho, mantendo o conteúdo e o tamanho"}.
Regras: escreva SÓ o novo texto do bloco ${i+1}, no idioma ${P.config.idioma}, pronto pra ser narrado, sem títulos, marcações ou comentários. Mantenha a ligação com o que vem antes e depois.
ROTEIRO INTEIRO:
"""${P.script.map((t,k)=>`[Bloco ${k+1}]\n${t}`).join("\n\n").slice(0,24000)}"""
BLOCO ${i+1} ATUAL:
"""${P.script[i]}"""`;
  try{ const r=await ask(prompt); if(r.text.trim()){ P.script[i]=r.text.trim(); markStale(P,"roteiro"); save(); toast(`Bloco ${i+1} reescrito`); } }
  catch(e){ ui.rotErr=errMsg(e); }
  clearBusy(); renderPanel();
}
async function runRoteiro(){
  const P=S.project, n=nBlocks(); ui.rotErr=null;
  const words=P.kind==="short"?140:Math.round(P.config.duracao*140/n);
  setBusy("roteiro",`escrevendo o bloco ${P.script.length+1}`); renderPanel();
  try{
    while(P.script.length<n){
      const i=P.script.length; setAction(`escrevendo o bloco ${i+1} de ${n}`); renderPanel();
      const prev=P.script.join("\n\n");
      const promoStyle=isPromo(P)?` CONTEÚDO DE MARCA: fale como a própria marca/loja (${P.config.nicho}), de forma próxima e verdadeira. Mostre o benefício principal logo no início, prove com detalhes concretos (como funciona, pra quem é, resultado), crie desejo sem exagero enganoso e termine com uma chamada clara pra ação (comprar, chamar no WhatsApp, visitar a loja ou o link). Se for stories do dia a dia, use tom leve de bastidores.`:"";
      const docStyle=(/documentário contado/i.test(P.config.formato||"")?` ESTILO DE NARRAÇÃO: conte como um contador de histórias carismático e muito bem informado. Abra no meio da ação, com data e lugar (ex.: "16 de julho de 1945. Berlim está em ruínas…"). Apresente cada pessoa com nome e quem ela é. Use números, datas e detalhes concretos e sensoriais, perguntas retóricas, ironia leve na medida certa e frases curtas de impacto. Organize em capítulos anunciados com naturalidade (ex.: "Capítulo 2: o mundo lá de baixo"), cada um terminando com um gancho. Fale com o espectador ("você"), sem parecer aula.`:"")+promoStyle;
      const battle=(isBattle(P)?` FORMATO BATALHA: compare os dois lados rodada por rodada (ex.: força, velocidade, inteligência, resistência, poder especial), diga a vantagem e a desvantagem de cada um em cada rodada, mantenha um placar falado e anuncie o vencedor com um argumento forte no final.`:"")+docStyle;
      const role = P.kind==="short" ? `Isto é um SHORT vertical de cerca de 55 segundos (~140 palavras). A primeira frase É o gancho e prende em 2 segundos, sem introdução. Frases curtas, ritmo rápido, uma informação surpreendente atrás da outra. ${P.linkToLong?" Termine chamando pro vídeo completo, de forma natural (ex.: \"a história inteira tá no vídeo completo do canal\").":" Termine com uma frase que faça a pessoa querer comentar ou assistir de novo."}${battle}${P.parentScript?`\nBaseie-se neste vídeo longo do canal e pegue a parte mais impressionante dele:\n"""${P.parentScript.slice(0,5000)}"""`:""}`
        : (i===0 ? `Este é o PRIMEIRO bloco. Abra com um gancho no estilo "${P.config.gancho}" nas 2-3 primeiras frases, que prenda nos primeiros 15 segundos. Prometa o que o espectador vai ganhar ficando até o fim e abra um "loop" (uma pergunta ou história) que só será resolvido no último bloco. Termine o bloco com uma virada que puxe pro próximo.`
        : i===n-1 ? `Este é o ÚLTIMO bloco. Feche o loop aberto no início, entregue o clímax e a lição. Inclua de forma natural um convite pra se inscrever e uma pergunta específica pra responder nos comentários. Termine com uma frase memorável.`
        : `Este é um bloco do MEIO (${i+1} de ${n}). Aprofunde com detalhes concretos, uma mini-história ou exemplo, mude o ritmo pra evitar monotonia e termine com um mini-suspense que puxe pro próximo bloco.`)+battle;
      const prompt=`Você é roteirista de vídeos (YouTube, Shorts, Reels e conteúdo de marca) com engenharia de retenção.
Canal: ${cfgText()}
Título do vídeo: "${P.title}".
${P.kind==="short"?`Escreva o roteiro do short, com cerca de ${words} palavras`:`Escreva o bloco ${i+1} de ${n} do roteiro, com cerca de ${words} palavras`}, no idioma ${P.config.idioma}.
${role}${planoCriador(P,i,n)}
Regras: escreva SÓ o texto que o narrador vai ler, em parágrafos, sem títulos, marcações, colchetes, emojis ou indicações de cena. Tom humano e específico ao público (${P.config.publico}). Proibido abertura genérica tipo "Olá pessoal" ou "neste vídeo vamos". Frases de tamanhos variados, boas pra ouvir em voz alta.
${P.seedScript&&P.kind!=="short"?`\nEste vídeo longo aprofunda um Short já publicado do canal sobre o mesmo assunto. Mantenha os fatos e o tom dele e vá muito além (contexto, detalhes, personagens, consequências):\n"""${P.seedScript.slice(0,3000)}"""`:""}
${prev?`\nRoteiro até aqui (continue a partir dele sem repetir):\n"""${prev.slice(-6000)}"""`:""}`;
      const live=()=>document.getElementById("live");
      const r=await ask(prompt,{onText:({text})=>{ const l=live(); if(l){ l.textContent=text; const s=document.getElementById("scr"); if(s) s.scrollTop=s.scrollHeight; } }});
      P.script.push(r.text.trim()); save();
      if(busy&&busy.cancel) break;
    }
  }catch(e){ ui.rotErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Descrição ---- */
VIEWS.descricao=()=>{ const P=S.project; const working=busy&&busy.k==="descricao"; return staleNote(P,"descricao")+`
  <p class="lead">Até 5 linhas, com convite pra se inscrever e uma pergunta, lida do roteiro inteiro.</p>
  ${aiNote()}
  <div class="btns"><button class="btn" id="dgo" ${busy||!AI.ready()?"disabled":""}>✦ ${P.description?"Gerar de novo":"Gerar descrição"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${working?`<div class="status"><span class="spin"></span>lendo o roteiro e escrevendo…</div>`:""}
  ${ui.desErr?`<div class="err">${esc(ui.desErr)}</div>`:""}
  <div class="field" style="margin-top:12px"><label for="dt">Descrição</label><textarea id="dt" rows="7">${esc(P.description||"")}</textarea></div>
  <div class="field"><label for="dh">Hashtags</label><input id="dh" value="${esc((P.hashtags||[]).join(" "))}" placeholder="#exemplo #outra"></div>
  <div class="btns"><button class="btn" id="dok" ${P.done.descricao?"disabled":""}>${P.done.descricao?"Descrição aprovada ✓":"Aprovar e mandar pro Ateliê de Capas"}</button></div>`; };
BIND.descricao=el=>{
  const P=S.project; const go=el.querySelector("#dgo"); if(go) go.onclick=runDescricao;
  el.querySelector("#dt").oninput=e=>{P.description=e.target.value; save();};
  el.querySelector("#dh").oninput=e=>{P.hashtags=e.target.value.split(/\s+/).filter(Boolean); save();};
  el.querySelector("#dok").onclick=()=>{ if(!(P.description||"").trim()) return toast("Escreva ou gere a descrição primeiro"); P.done.descricao=true; save(); courier("descricao","imagens"); toast("Descrição aprovada"); renderProd(); openPanel("imagens"); comboAfter("descricao"); };
};
async function runDescricao(){
  const P=S.project; ui.desErr=null; setBusy("descricao","lendo o roteiro"); renderPanel();
  const s=scriptText();
  const prompt=`Escreva a descrição de YouTube deste vídeo, no idioma ${P.config.idioma}.
Título: "${P.title}". Público: ${P.config.publico}.
Roteiro (início e fim):
"""${s.slice(0,4000)}\n…\n${s.slice(-1500)}"""
${P.parentTitle?`Este é um Short: inclua uma linha convidando pro vídeo completo “${P.parentTitle}” no canal. `:""}Regras: no máximo 5 linhas; primeira linha forte com a palavra-chave principal; um convite natural pra se inscrever; termine com uma pergunta pros comentários. Depois, 3 a 5 hashtags relevantes.
Responda só com JSON: {"descricao":"...","hashtags":["#...", "..."]}`;
  try{ const r=await ask(prompt,{json:true,tier:"quick"}); P.description=r.descricao||""; P.hashtags=r.hashtags||[]; if(P.stale) delete P.stale.descricao; save(); }
  catch(e){ ui.desErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Mídia: utilitários ---- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mkey=(pid,kind,i)=>`p${pid}:${kind}:${i}`;
async function toJpeg(blob,w,h,q=.9){
  try{
    const bmp=await createImageBitmap(blob);
    const W2=w||bmp.width, H2=h||bmp.height;
    const c=document.createElement("canvas"); c.width=W2; c.height=H2;
    const g=c.getContext("2d");
    // cobre a área mantendo a proporção (corta as sobras)
    const s=Math.max(W2/bmp.width,H2/bmp.height), dw=bmp.width*s, dh=bmp.height*s;
    g.drawImage(bmp,(W2-dw)/2,(H2-dh)/2,dw,dh);
    return await new Promise(r=>c.toBlob(b=>r(b||blob),"image/jpeg",q));
  }catch(e){ return blob; }
}
function paintImgs(el){
  el.querySelectorAll("[data-img]").forEach(async n=>{
    const u=await Store.url(n.dataset.img);
    if(u){ n.style.backgroundImage=`url("${u}")`; n.style.backgroundSize="cover"; n.style.backgroundPosition="center"; n.classList.add("has-img"); }
  });
}
// gera imagens com no máximo `conc` ao mesmo tempo, tentando de novo quando bate no limite
async function imagePool(jobs,conc,onDone){
  let next=0;
  async function worker(){
    while(next<jobs.length){
      if(busy&&busy.cancel) return;
      const j=jobs[next++];
      for(let tent=0;;tent++){
        try{ await j(); break; }
        catch(e){
          if(e&&e.code==="cancelled") return;
          if(e&&(e.code==="rate_limited"||e.code==="overloaded")&&!e.daily&&tent<3){ const w=Math.min(90,Math.max(5,e.retryAfter||15*(tent+1))); setAction(`limite por minuto: esperando ${Math.round(w)} s`); await sleep(w*1000); continue; }
          onDone&&onDone(e); break;
        }
      }
      onDone&&onDone(null);
    }
  }
  await Promise.all(Array.from({length:conc},worker));
}
function imgNote(){
  if(AI.stageReady("image")) return "";
  return `<div class="note">As imagens de verdade saem quando o cartão Imagens e capas estiver pronto. <button class="btn small" style="margin-top:6px" onclick="openPanel('admin')">Abrir Administração</button></div>`;
}

/* ---- Capa ---- */
const THUMB_BG=["linear-gradient(120deg,#2b1d3a 0%,#8a2f7c 55%,#f2c14e 120%)","linear-gradient(120deg,#0f2a3d 0%,#3a7ae1 60%,#9ec5d8 120%)","linear-gradient(120deg,#3a1a14 0%,#d1502f 60%,#ffd58a 120%)","linear-gradient(120deg,#1a2a1e 0%,#2e8b57 55%,#f2e2b0 120%)"];
VIEWS.capa=()=>{ const P=S.project; if(P.kind==="short") return `<p class="lead">Shorts não usam capa: o YouTube mostra um quadro do próprio vídeo. Pode seguir pro Prédio das Imagens.</p><div class="btns"><button class="btn" onclick="openPanel('imagens')">Ir pro Prédio das Imagens</button></div>`; const working=busy&&busy.k==="imagens"&&/capa/.test(busy.action||""); const th=P.thumbs||[]; const st=P.thumbImg||[]; return `
  <p class="lead">A equipe escreve 4 frases de impacto e desenha uma capa pra cada. Marque a que vai pro vídeo.</p>
  <div class="field"><label for="cvis">Ideia visual (opcional)</label><textarea id="cvis" rows="2" placeholder="Ex.: mulher de cabelo branco orando perto da janela, luz da manhã, tons de azul">${esc(P.thumbVisual||"")}</textarea></div>
  <div class="field"><label for="ctxt">Texto da capa (opcional)</label><input id="ctxt" value="${esc(P.thumbOwn||"")}" placeholder="Deixe vazio e a equipe escreve. 4 a 6 palavras funcionam melhor"></div>
  ${aiNote()}${imgNote()}
  <div class="btns"><button class="btn" id="cgo" ${busy||!AI.ready()?"disabled":""}>✦ ${th.length?"Gerar outras 4":"Gerar 4 capas"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.capErr?`<div class="err">${esc(ui.capErr)}</div>`:""}
  ${th.length?`<div class="thumbs" style="margin-top:12px">${th.map((t,i)=>{ const s=st[i]; const has=s==="ok";
    return `<button type="button" class="thumb ${P.thumbSel===i?"sel":""}" data-th="${i}" ${has?`data-img="${mkey(P.id,"thumb",i)}"`:""} style="background:${THUMB_BG[i%4]}" aria-label="Versão ${i+1}: ${esc(t)}">${has?"":`<span class="fig"></span><b>${esc(t)}</b>`}${s==="wait"?`<span class="tbadge"><span class="spin"></span></span>`:""}${s&&s!=="ok"&&s!=="wait"?`<span class="tbadge err" title="${esc(s)}">!</span>`:""}</button>`; }).join("")}</div>
  <p class="m" style="font-size:12px;color:var(--muted)">${th.map((t,i)=>`V${i+1}: ${esc(t)}`).join(" · ")}</p>
  ${st.some(s=>s&&s!=="ok"&&s!=="wait")&&!working?`<div class="err">${esc(st.find(s=>s&&s!=="ok"&&s!=="wait"))}</div><div class="btns"><button class="btn ghost small" id="cretry">Tentar de novo as que falharam</button></div>`:""}
  ${P.thumbScene?`<div class="note"><b>Composição:</b> ${esc(P.thumbScene)}</div>`:""}
  ${P.thumbSel!=null&&st[P.thumbSel]==="ok"?`<div class="btns"><button class="btn ghost small" id="cdl">⬇ Baixar a capa marcada (1280×720)</button></div>`:""}`:""}
  <div class="btns"><button class="btn" id="cok" ${P.thumbSel==null||P.done.capa||working?"disabled":""}>${P.done.capa?"Capa aprovada ✓":"Usar esta capa e mandar pras Imagens"}</button></div>`; };
BIND.capa=el=>{ if(S.project.kind==="short") return;
  const P=S.project;
  el.querySelector("#cvis").oninput=e=>{P.thumbVisual=e.target.value; save();};
  el.querySelector("#ctxt").oninput=e=>{P.thumbOwn=e.target.value; save();};
  el.querySelector("#cgo").onclick=runCapa;
  const rt=el.querySelector("#cretry"); if(rt) rt.onclick=()=>drawThumbs(true);
  el.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{ if(P.done.capa) return; P.thumbSel=+b.dataset.th; save(); renderPanel(); });
  const dl=el.querySelector("#cdl"); if(dl) dl.onclick=async()=>{ const b=await Store.get(mkey(P.id,"thumb",P.thumbSel)); if(b) saveBlob(b,slug(P.title)+"-capa.jpg"); };
  el.querySelector("#cok").onclick=()=>{ P.done.capa=true; save(); toast("Capa aprovada"); renderPanel(); };
  paintImgs(el);
};
async function runCapa(){
  const P=S.project; ui.capErr=null;
  setBusy("imagens","escrevendo as frases da capa"); renderPanel();
  const prompt=`Você é diretor de arte de thumbnails de YouTube com alto CTR.
Título: "${P.title}". Público: ${P.config.publico}. Nicho: ${P.config.nicho}.
${P.thumbOwn?`O texto da capa já foi definido: "${P.thumbOwn}". Crie 4 variações bem próximas dele.`:`Crie 4 textos de capa diferentes, de 3 a 6 palavras, no idioma ${P.config.idioma}. Eles devem complementar o título, não repetir.`}
${P.thumbVisual?`Ideia visual do criador: ${P.thumbVisual}.`:""}
Descreva a composição da imagem em português (1-2 frases) e também escreva um prompt de imagem em inglês para ela ("prompt_en"): personagem, expressão, luz, cores, fundo, deixando o terço direito livre para o texto. Não inclua o texto da capa no prompt_en. Se o tema envolver uma pessoa viva ou que morreu recentemente, não retrate a aparência dela: use um personagem anônimo, silhueta ou objeto simbólico. Figuras históricas antigas podem aparecer.
Responda só com JSON: {"textos":["...","...","...","..."],"cena":"...","prompt_en":"..."}`;
  try{
    const r=await ask(prompt,{json:true,tier:"quick"});
    await Store.delPrefix(`p${P.id}:thumb:`);
    P.thumbs=(r.textos||[]).slice(0,4); P.thumbScene=r.cena||""; P.thumbPrompt=r.prompt_en||r.cena||""; P.thumbSel=0; P.thumbImg=[]; save();
  }catch(e){ ui.capErr=errMsg(e); clearBusy(); return renderPanel(); }
  clearBusy();
  if(AI.stageReady("image")) await drawThumbs(false); else renderPanel();
}
async function drawThumbs(onlyFailed){
  const P=S.project; ui.capErr=null;
  setBusy("imagens","desenhando as capas"); 
  const idx=P.thumbs.map((_,i)=>i).filter(i=>!onlyFailed||(P.thumbImg[i]&&P.thumbImg[i]!=="ok"));
  idx.forEach(i=>P.thumbImg[i]="wait"); renderPanel();
  let done=0;
  const jobs=idx.map(i=>async()=>{
    const prompt=`YouTube thumbnail, 16:9, eye-catching, professional, high contrast, sharp focus. ${P.thumbPrompt}
On the right third, large bold headline text in thick condensed sans-serif, white with subtle dark outline, uppercase, exactly these words and nothing else: "${P.thumbs[i]}". Spell it exactly. No other text, no logos, no watermark.`;
    try{ const b=await AI.image(prompt,{aspect:"16:9",signal:busy.ctl.signal}); await Store.put(mkey(P.id,"thumb",i),await toJpeg(b,1280,720,.9)); P.thumbImg[i]="ok"; }
    catch(e){ if(e.code==="cancelled"){ P.thumbImg[i]=null; throw e; } P.thumbImg[i]=e.message||"Falhou"; if(e.code==="rate_limited"||e.code==="overloaded") throw e; }
    done++; setAction(`capa ${done} de ${idx.length}`); save(); renderPanel();
  });
  await imagePool(jobs,2);
  P.thumbImg=P.thumbImg.map(s=>s==="wait"?null:s); save();
  clearBusy(); renderPanel();
}

/* ---- Imagens ---- */
function styleOf(name){ return STYLES.find(s=>s[0]===name)||STYLES[0]; }
function sceneCount(){ return Math.min(60,Math.round(S.project.config.duracao*(+S.project.config.ipm||2))); }
function capaSection(){ const P=S.project; if(P.kind==="short") return ""; return `<details class="card" style="margin-top:14px;padding:0" ${ui.capaOpen?"open":""} id="capadet"><summary style="padding:12px;cursor:pointer;font-weight:700">📣 Marketing: capa do vídeo <span class="m" style="font-weight:400;font-size:12.5px">(opcional)</span></summary><div style="padding:0 12px 12px">${VIEWS.capa()}</div></details>`; }
VIEWS.imagens=()=>{ const P=S.project; if(isColagem(P)) return colagemView()+capaSection(); const working=busy&&busy.k==="imagens"; const n=sceneCount(); const ph=P.imgPhase||0;
  const ok=P.scenes.filter(s=>s.img==="ok").length, bad=P.scenes.filter(s=>s.img&&s.img!=="ok"&&s.img!=="wait").length;
  const sel=P.selScene!=null?P.scenes[P.selScene]:null; const st=styleOf(P.style); return `
  <p class="lead">As cenas saem do próprio roteiro, na ordem da edição. Cerca de ${n} cenas pra ${P.config.duracao} min.</p>
  <h3>Estilo das imagens</h3>
  <div class="styles">${STYLES.map(s=>`<button type="button" class="sty" aria-pressed="${P.style===s[0]}" data-sty="${esc(s[0])}"><i style="background:linear-gradient(135deg,${s[1]},${s[2]})"></i>${esc(s[0])}</button>`).join("")}</div>
  ${aiNote()}${imgNote()}
  <div class="btns"><button class="btn" id="igo" ${busy||!AI.ready()?"disabled":""}>✦ ${P.scenes.length?"Refazer tudo do zero":"Gerar as imagens do roteiro"}</button>
    ${P.scenes.length&&ok<P.scenes.length&&!working&&AI.stageReady("image")?`<button class="btn ghost small" id="imiss">Gerar as ${P.scenes.length-ok} que faltam</button>`:""}
    ${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${(working||P.scenes.length)?`<div class="steps"><span class="${ph>1?"ok":ph===1?"on":""}">${ph>1?"✓":"●"} Ler o roteiro</span><span>›</span><span class="${ph>2?"ok":ph===2?"on":""}">${ph>2?"✓":"●"} Escrever os prompts</span><span>›</span><span class="${ph>3?"ok":ph===3?"on":""}">${ph>3?"✓":"●"} Gerar as imagens</span></div>`:""}
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.imgErr?`<div class="err">${esc(ui.imgErr)}</div>`:""}
  ${P.scenes.length?`<p class="m" style="font-size:12.5px;color:var(--muted)">${ok} de ${P.scenes.length} prontas${bad?` · ${bad} com erro`:""} · estilo ${esc(P.style)} · toque numa cena pra ver e refazer</p>
  <div class="scenes">${P.scenes.map((s,i)=>`<button type="button" class="scene ${s.img==="ok"?"":"wait"} ${P.selScene===i?"cur":""}" data-sc="${i}" ${s.img==="ok"?`data-img="${mkey(P.id,"scene",i)}"`:""} style="background:linear-gradient(${(i*47)%360}deg,${st[1]},${st[2]})" aria-label="Cena ${i+1}"><span>${String(i+1).padStart(2,"0")}</span>${s.img==="wait"?`<i class="spin" style="margin:auto"></i>`:(s.img&&s.img!=="ok"?`<b style="margin:auto;color:var(--danger)">!</b>`:"")}</button>`).join("")}</div>
  ${sel?`<div class="card" style="margin-top:10px">
    <div class="t">Cena ${P.selScene+1}</div>
    ${sel.img==="ok"?`<div class="big" data-img="${mkey(P.id,"scene",P.selScene)}"></div>`:""}
    <div class="m" style="margin:6px 0">${esc(sel.trecho||"")}…</div>
    ${sel.img&&sel.img!=="ok"&&sel.img!=="wait"?`<div class="err">${esc(sel.img)}</div>`:""}
    <div class="field"><label for="sprompt">Prompt da imagem</label><textarea id="sprompt" rows="3">${esc(sel.prompt||"")}</textarea></div>
    <div class="btns"><button class="btn small" id="sredo" ${busy||!AI.stageReady("image")?"disabled":""}>↻ Gerar esta de novo</button>${sel.img==="ok"?`<button class="btn ghost small" id="sdl">⬇ Baixar</button>`:""}</div></div>`:""}
  <div class="btns"><button class="btn ghost small" id="icp">Copiar os prompts</button></div>`:""}
  <div class="btns"><button class="btn" id="iok" ${!P.scenes.length||ok<P.scenes.length||P.done.imagens||working?"disabled":""}>${P.done.imagens?"Cenas aprovadas ✓":"Aprovar cenas e mandar pro Estúdio"}</button></div>`; };
{ const _vi=VIEWS.imagens; VIEWS.imagens=()=>{ const P=S.project; return isColagem(P)?colagemView()+capaSection():_vi()+capaSection(); }; }
BIND.imagens=el=>{ const cd=el.querySelector("#capadet"); if(cd){ cd.ontoggle=()=>{ ui.capaOpen=cd.open; }; BIND.capa(el); } if(isColagem(S.project)) return bindColagem(el);
  const P=S.project;
  el.querySelectorAll("[data-sty]").forEach(b=>b.onclick=()=>{ P.style=b.dataset.sty; save(); renderPanel(); });
  el.querySelector("#igo").onclick=()=>{ if(P.scenes.some(s=>s.img==="ok")&&!confirm("Refazer tudo apaga as imagens atuais. Continuar?")) return; runImagens(); };
  const mi=el.querySelector("#imiss"); if(mi) mi.onclick=()=>drawScenes(P.scenes.map((s,i)=>i).filter(i=>P.scenes[i].img!=="ok"));
  el.querySelectorAll("[data-sc]").forEach(b=>b.onclick=()=>{ P.selScene=P.selScene===+b.dataset.sc?null:+b.dataset.sc; save(); renderPanel(); });
  const sp=el.querySelector("#sprompt"); if(sp) sp.oninput=()=>{ P.scenes[P.selScene].prompt=sp.value; save(); };
  const rd=el.querySelector("#sredo"); if(rd) rd.onclick=()=>{ P.done.imagens=false; drawScenes([P.selScene]); };
  const sd=el.querySelector("#sdl"); if(sd) sd.onclick=async()=>{ const b=await Store.get(mkey(P.id,"scene",P.selScene)); if(b) saveBlob(b,`cena-${String(P.selScene+1).padStart(2,"0")}.jpg`); };
  const cp=el.querySelector("#icp"); if(cp) cp.onclick=()=>navigator.clipboard?.writeText(P.scenes.map((s,i)=>`${i+1}. ${s.prompt}`).join("\n")).then(()=>toast("Prompts copiados"),()=>toast("Não deu pra copiar"));
  el.querySelector("#iok").onclick=()=>{ P.done.imagens=true; save(); courier("imagens","narracao"); toast("Cenas aprovadas"); renderProd(); openPanel("narracao"); comboAfter("imagens"); };
  paintImgs(el);
};
async function runImagens(){
  const P=S.project; ui.imgErr=null; const n=sceneCount();
  setBusy("imagens","lendo o roteiro"); P.imgPhase=1; P.selScene=null; P.done.imagens=false; renderPanel();
  await Store.delPrefix(`p${P.id}:scene:`); P.scenes=[];
  P.imgPhase=2; setAction("escrevendo os prompts"); renderPanel();
  const prompt=`Divida este roteiro em exatamente ${n} cenas consecutivas, na ordem, cobrindo o texto inteiro.
Para cada cena: "trecho" (as primeiras 8 a 12 palavras daquele trecho, no idioma do roteiro) e "prompt" (prompt de imagem em inglês, 1-2 frases, descrevendo uma imagem única e específica daquele momento).
Antes, defina mentalmente os personagens principais (idade, aparência, roupa) e descreva-os do mesmo jeito em todas as cenas em que aparecem, pra manter consistência. Varie enquadramento e cenário pra não ficar repetitivo. Nada de texto escrito dentro das imagens. Figuras históricas antigas (mortas há mais de 70 anos) podem aparecer com roupa e aparência de época. Pessoas vivas ou que morreram recentemente NUNCA têm o rosto ou a aparência retratados: use personagens anônimos, silhuetas, mãos, objetos, lugares e reconstituições genéricas.
Roteiro:
"""${scriptText().slice(0,24000)}"""
Responda só com JSON: {"cenas":[{"trecho":"...","prompt":"..."}]}`;
  try{
    const r=await ask(prompt,{json:true});
    P.scenes=(r.cenas||[]).map(c=>({trecho:c.trecho,prompt:c.prompt,img:null})); P.imgPhase=3; save();
  }catch(e){ ui.imgErr=errMsg(e); P.imgPhase=0; clearBusy(); return renderPanel(); }
  clearBusy();
  if(AI.stageReady("image")) await drawScenes(P.scenes.map((_,i)=>i));
  else { ui.imgErr="Os prompts estão prontos. Configure Imagens e capas na Administração pra gerar as imagens."; renderPanel(); }
}
async function drawScenes(idx){
  const P=S.project; ui.imgErr=null; const st=P.style;
  setBusy("imagens",`imagem 0 de ${idx.length}`); P.imgPhase=3;
  idx.forEach(i=>P.scenes[i].img="wait"); renderPanel();
  let done=0, last=0;
  const jobs=idx.map(i=>async()=>{
    const s=P.scenes[i];
    const prompt=`${s.prompt} Visual style: ${st}. Cinematic 16:9 composition, high detail, coherent lighting. No text, no captions, no watermark, no logos.`;
    try{ const b=await AI.image(prompt,{aspect:"16:9",signal:busy.ctl.signal}); await Store.put(mkey(P.id,"scene",i),await toJpeg(b,0,0,.88)); s.img="ok"; }
    catch(e){ if(e.code==="cancelled"){ s.img=null; throw e; } s.img=e.message||"Falhou"; if(e.code==="rate_limited"||e.code==="overloaded") throw e; }
    done++; setAction(`imagem ${done} de ${idx.length}`); save();
    if(Date.now()-last>700||done===idx.length){ last=Date.now(); renderPanel(); }
  });
  await imagePool(jobs,2);
  P.scenes.forEach(s=>{ if(s.img==="wait") s.img=null; });
  if(P.scenes.every(s=>s.img==="ok")) P.imgPhase=4;
  const bad=P.scenes.find(s=>s.img&&s.img!=="ok");
  if(bad) ui.imgErr=bad.img;
  save(); clearBusy(); renderPanel();
}

/* ---- Imagens no estilo colagem ---- */
function boardStats(P){ const a=(P.board&&P.board.assets)||[]; return {n:a.length,ok:a.filter(x=>x.img==="ok").length,real:a.filter(x=>x.img==="ok"&&x.real&&!x.own).length,own:a.filter(x=>x.img==="ok"&&x.own).length,ai:a.filter(x=>x.img==="ok"&&!x.real&&!x.own).length,bad:a.filter(x=>x.img&&!["ok","wait","nofound"].includes(x.img)).length,nofound:a.filter(x=>x.img==="nofound").length,pend:a.filter(x=>x.img!=="ok").length,beats:((P.board&&P.board.beats)||[]).length}; }
const gImg=q=>`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
function colagemView(){ return staleNote(S.project,"imagens")+colagemView0(); }
function colagemView0(){
  const P=S.project, working=busy&&busy.k==="imagens", st=boardStats(P), doc=isDoc(P), tp=doc?{bg:"#15181d",ink:"#eee"}:(Collage.TPL[P.template]||Collage.TPL["Azul explicador"]);
  const sel=P.board&&P.selAsset?P.board.assets.find(a=>a.id===P.selAsset):null;
  return `
  <p class="lead">${doc?"Estilo documentário.":"Estilo colagem."} Em duas etapas pra você gastar o mínimo: <b>1)</b> a equipe lê o roteiro e lista as imagens que o vídeo precisa, ainda sem gerar nada. <b>2)</b> Pra cada uma você escolhe: buscar grátis na internet, enviar a sua ou gerar com IA.</p>
  ${aiNote()}
  <div class="btns"><button class="btn${P.board?" ghost small":""}" id="cgo2" ${busy||!AI.ready()?"disabled":""}>📋 ${P.board?"Refazer a lista do zero":"Criar a lista de imagens (sem gerar nada)"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.imgErr?`<div class="err">${esc(ui.imgErr)}</div>`:""}
  ${P.board?`
  <div class="card" style="padding:10px 12px">
    <div class="t">${st.ok} de ${st.n} imagens prontas <span class="m" style="font-weight:400">· ${st.beats} cenas</span></div>
    <div class="m" style="font-size:12.5px">${[st.real?`📷 ${st.real} grátis da internet`:"",st.own?`📁 ${st.own} suas`:"",st.ai?`🎨 ${st.ai} geradas com IA`:"",st.nofound?`🔎 ${st.nofound} sem foto livre`:""].filter(Boolean).join(" · ")||"nenhuma ainda"}</div>
    ${st.pend?`<div class="btns" style="margin-top:8px">
      <button class="btn small" id="bsearch" ${busy?"disabled":""}>🔎 Buscar ${st.pend} grátis</button>
      <button class="btn ghost small" id="bai" ${busy||!AI.stageReady("image")?"disabled":""} title="${AI.stageReady("image")?"":"Configure Imagens e capas na Administração"}">🎨 Gerar ${st.pend} pela API (pago)</button></div>
      <p class="m" style="font-size:12px;margin:6px 0 0">Pra trocar ou preencher uma imagem: toque no quadrado e use 🌐 Google ou ✨ Gemini, depois Ctrl+V. · <label style="cursor:pointer;color:var(--accent)">enviar várias do computador<input type="file" id="bup" accept="image/*" multiple style="display:none"></label> · <a href="#" id="bcopy" style="color:var(--accent)">copiar a lista</a></p>`:""}
  </div>
  <div class="scenes">${P.board.assets.map(a=>{ const ok=a.img==="ok"; return `<button type="button" class="scene ${P.selAsset===a.id?"cur":""} ${ok?"":"pend"}" data-as="${esc(a.id)}" ${ok?`data-img="${mkey(P.id,"asset",a.id)}"`:""} style="background-color:${ok?tp.bg:"transparent"};background-size:${doc?"cover":"contain"}!important;background-repeat:no-repeat;color:${ok?tp.ink:"var(--text)"}" title="${esc(a.nome)}">
    <span>${a.own?"📁":ok?(a.real?"📷":"🎨"):a.img==="nofound"?"🔎":"·"}</span>${a.img==="wait"?`<i class="spin" style="margin:auto"></i>`:(!ok&&a.img&&a.img!=="nofound"?`<b style="margin:auto;color:var(--danger)">!</b>`:"")}<small style="position:absolute;left:4px;right:4px;bottom:3px;font-size:10.5px;line-height:1.15;${ok?`text-shadow:0 0 3px #000;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`:"white-space:normal"}">${esc(a.nome)}</small></button>`; }).join("")}</div>
  ${sel?`<div class="card" style="margin-top:10px"><div class="t">${esc(sel.nome)} ${sel.img==="ok"?`<span class="tag">${sel.own?"sua":sel.real?"grátis da internet":"IA"}</span>`:`<span class="tag">falta</span>`}</div>
    ${sel.img==="ok"?`<div class="big" data-img="${mkey(P.id,"asset",sel.id)}" style="background-color:${tp.bg};background-size:${doc?"cover":"contain"}!important;background-repeat:no-repeat"></div>`:""}
    ${sel.credit?`<div class="m" style="font-size:12px">${esc(sel.credit)}</div>`:""}
    ${sel.img==="nofound"?`<div class="m" style="font-size:12.5px">Não achei foto livre. Pesquise no Google ou crie no Gemini e cole aqui.</div>`:(sel.img&&!["ok","wait"].includes(sel.img)?`<div class="err">${esc(sel.img)}</div>`:"")}
    <div id="pastezone" tabindex="0" style="margin-top:8px;border:2px dashed var(--line);border-radius:12px;padding:14px;text-align:center;cursor:text"><b>📋 Cole a imagem aqui: Ctrl+V</b><div class="m" style="font-size:12px">ou arraste um arquivo · vale imagem copiada do Google ou do Gemini</div></div>
    <div class="btns" style="margin-top:8px"><a class="btn small" href="${gImg(sel.busca||sel.nome)}" target="_blank" rel="noopener" style="text-decoration:none" id="agoogle">🌐 Pesquisar no Google</a>
      <button class="btn small" id="agemini">✨ Criar no Gemini</button>
      <label class="btn small" style="cursor:pointer">📁 Arquivo<input type="file" id="aup" accept="image/*" style="display:none"></label></div>
    <div class="field" style="margin-top:10px"><label for="aurl">Ou cole o endereço da imagem (no Google: botão direito › Copiar endereço da imagem)</label>
      <div style="display:flex;gap:6px"><input id="aurl" placeholder="https://… ou data:image/…"><button class="btn ghost small" id="aurlgo">Trazer</button></div></div></div>`:""}
  `:""}
  <div class="btns"><button class="btn" id="iok" ${!P.board||!st.ok||P.done.imagens||working?"disabled":""}>${P.done.imagens?"Imagens aprovadas ✓":"Aprovar e mandar pro Estúdio"}</button>${P.board&&st.ok&&st.pend&&!P.done.imagens?`<span class="m" style="font-size:12px">As cenas sem imagem usam a imagem anterior.</span>`:""}</div>`;
}
async function saveOwn(P,a,f){
  let b=await toJpeg(f,0,0,.9); if(!isDoc(P)&&a.tipo!=="real") b=await Collage.cutout(f);
  await Store.put(mkey(P.id,"asset",a.id),b); Object.assign(a,{img:"ok",real:isDoc(P)||a.tipo==="real",own:true,credit:""}); Cut._R=null;
}
// traz uma imagem a partir do endereço: direto, ou por um repassador de imagens quando o site bloqueia
async function fetchImageURL(u){
  if(/^data:image\//.test(u)){ const r=await fetch(u); return await r.blob(); }
  if(!/^https?:\/\//.test(u)) throw {message:"Isso não parece um endereço de imagem. No Google: botão direito na imagem › Copiar endereço da imagem."};
  const tryGet=async url=>{ const r=await fetch(url); if(!r.ok) throw 0; const b=await r.blob(); if(!/^image\//.test(b.type)||b.size<2000) throw 0; return b; };
  try{ return await tryGet(u); }catch(e){}
  try{ return await tryGet("https://wsrv.nl/?url="+encodeURIComponent(u)+"&w=1920&output=jpg&q=90"); }catch(e){}
  throw {message:"Esse site não deixa baixar a imagem. Use botão direito › Copiar imagem e cole aqui com Ctrl+V."};
}
// pedido pronto pra colar no Gemini (app grátis), no estilo do vídeo
function geminiPrompt(P,a){
  const doc=isDoc(P), d=(a.descricao&&a.descricao!==a.nome?a.descricao:"")||a.busca||"";
  const estilo=doc&&a.estilo==="produto"?"fotografia comercial de produto, luz de estúdio suave, cores bonitas e realistas, fundo simples e elegante":doc&&a.estilo==="moderno"?"foto editorial moderna, luz natural, cores realistas, composição limpa":doc?(a.estilo==="diagrama"?"diagrama 3D isométrico em corte, render branco tipo argila sobre fundo cinza claro, estilo ilustração técnica":a.estilo==="objeto"?"foto de estúdio de um único objeto histórico sobre fundo escuro neutro, luz lateral dramática":"reconstrução histórica cinematográfica, luz dramática, cores dessaturadas, aparência fotográfica de documentário")
    :"ilustração editorial 2D plana, contornos escuros, cores suaves com sombreado leve, um único elemento inteiro e centralizado, fundo branco liso, sem sombra";
  return `Crie uma imagem de: ${a.nome}.${d?" Detalhes: "+d+".":""} Estilo: ${estilo}. Formato ${doc?"horizontal 16:9":"vertical 3:4"}. Sem texto, sem legendas e sem marca d'água.${doc?" Se aparecer uma pessoa real, não reproduza o rosto dela.":""}`;
}
// colar (Ctrl+V) uma imagem copiada do Google: entra no quadrado selecionado (ou no primeiro vazio) e já seleciona o próximo
async function pasteToBoard(file){
  const P=S.project; if(!P||!P.board) return;
  let a=P.board.assets.find(x=>x.id===P.selAsset); if(!a||(a.img==="ok"&&!P.selAsset)) a=P.board.assets.find(x=>x.img!=="ok"); if(!a) return toast("Todos os quadrados já têm imagem. Selecione um pra trocar.");
  await saveOwn(P,a,file);
  const next=P.board.assets.find(x=>x.img!=="ok"); P.selAsset=next?next.id:null; save();
  toast(next?`Colada em “${a.nome}”. Próxima: ${next.nome}`:`Colada em “${a.nome}”. Todas as imagens estão prontas!`); renderPanel();
}
document.addEventListener("paste",e=>{
  if(panelKey!=="imagens"||!S.project||!S.project.board||busy) return;
  const t=e.target; if(t&&(t.tagName==="TEXTAREA"||t.tagName==="INPUT")) return;
  const it=[...(e.clipboardData||{}).items||[]].find(i=>i.type.startsWith("image/"));
  if(it){ e.preventDefault(); pasteToBoard(it.getAsFile()); } else toast("Na área de transferência não tem imagem. No Google use botão direito › Copiar imagem.");
});
function bindColagem(el){
  const P=S.project;
  el.querySelectorAll("[data-as]").forEach(b=>{ b.ondragover=e=>{ e.preventDefault(); b.style.outline="2px dashed var(--accent)"; }; b.ondragleave=()=>{ b.style.outline=""; };
    b.ondrop=async e=>{ e.preventDefault(); b.style.outline=""; const f=[...(e.dataTransfer.files||[])].find(x=>x.type.startsWith("image/")); if(!f) return toast("Arraste um arquivo de imagem do computador"); P.selAsset=b.dataset.as; await pasteToBoard(f); }; });
  el.querySelector("#cgo2").onclick=()=>{ if(P.board&&!confirm("Refazer a lista apaga as imagens atuais. Continuar?")) return; runColagem(); };
  const pend=()=>P.board.assets.filter(a=>a.img!=="ok").map(a=>a.id);
  const bs=el.querySelector("#bsearch"); if(bs) bs.onclick=()=>drawAssets(pend(),"search");
  const ba=el.querySelector("#bai"); if(ba) ba.onclick=()=>{ const n=pend().length; if(confirm(`Gerar ${n} imagem${n>1?"ns":""} com IA? Cada uma é uma chamada paga (ou da cota grátis).`)) drawAssets(pend(),"ai"); };
  const bc=el.querySelector("#bcopy"); if(bc) bc.onclick=e=>{ e.preventDefault(); navigator.clipboard?.writeText(P.board.assets.filter(a=>a.img!=="ok").map((a,i)=>`${i+1}. ${a.nome} — busca: ${a.busca||a.nome}`).join("\n")).then(()=>toast("Lista copiada"),()=>toast("Não deu pra copiar")); };
  const bu=el.querySelector("#bup"); if(bu) bu.onchange=async e=>{ const fs=[...e.target.files], ids=pend(); let n=0; for(const f of fs){ const id=ids[n]; if(!id) break; await saveOwn(P,P.board.assets.find(a=>a.id===id),f); n++; } save(); toast(`${n} imagem${n>1?"ns":""} sua${n>1?"s":""} colocada${n>1?"s":""}`); renderPanel(); };
  el.querySelectorAll("[data-as]").forEach(b=>b.onclick=()=>{ P.selAsset=P.selAsset===b.dataset.as?null:b.dataset.as; save(); renderPanel(); });
  const sel=P.board&&P.board.assets.find(a=>a.id===P.selAsset);
  if(sel){
    const ab=el.querySelector("#abusca"); if(ab) ab.oninput=()=>{ sel.busca=ab.value; save(); const g=el.querySelector('a[href*="google.com/search"]'); if(g) g.href=gImg(ab.value); };
    const ad=el.querySelector("#adesc"); if(ad) ad.oninput=()=>{ sel.descricao=ad.value; save(); };
    const asr=el.querySelector("#asearch"); if(asr) asr.onclick=()=>{ P.done.imagens=false; drawAssets([sel.id],"search"); };
    const aai=el.querySelector("#aai"); if(aai) aai.onclick=()=>{ P.done.imagens=false; drawAssets([sel.id],"ai"); };
    el.querySelector("#aup").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; await saveOwn(P,sel,f); save(); toast("Imagem colocada"); renderPanel(); };
    el.querySelector("#agemini").onclick=async()=>{ const txt=geminiPrompt(P,sel); let ok=true; try{ await navigator.clipboard.writeText(txt); }catch(e){ ok=false; }
      window.open("https://gemini.google.com/app","_blank","noopener");
      toast(ok?"Pedido copiado! No Gemini: Ctrl+V e Enter. Depois copie a imagem e cole aqui com Ctrl+V.":"Abri o Gemini. Copie o pedido em Mais opções › Descrição."); };
    const go=async()=>{ const u=el.querySelector("#aurl").value.trim(); if(!u) return; const b=el.querySelector("#aurlgo"); b.disabled=true; b.innerHTML=`<span class="spin"></span>`;
      try{ const f=await fetchImageURL(u); P.selAsset=sel.id; await pasteToBoard(f); }catch(e){ toast(e.message||"Não consegui trazer essa imagem"); b.disabled=false; b.textContent="Trazer"; } };
    el.querySelector("#aurlgo").onclick=go; el.querySelector("#aurl").onkeydown=e=>{ if(e.key==="Enter") go(); };
    el.querySelector("#aurl").onpaste=e=>{ const t=(e.clipboardData||{}).getData&&e.clipboardData.getData("text"); if(t&&/^(https?:|data:image)/.test(t.trim())) setTimeout(go,50); };
    const pz=el.querySelector("#pastezone"); pz.ondragover=e=>{ e.preventDefault(); pz.style.borderColor="var(--accent)"; }; pz.ondragleave=()=>{ pz.style.borderColor=""; };
    pz.ondrop=async e=>{ e.preventDefault(); pz.style.borderColor=""; const f=[...(e.dataTransfer.files||[])].find(x=>x.type.startsWith("image/")); if(f){ P.selAsset=sel.id; await pasteToBoard(f); return; }
      const u=(e.dataTransfer.getData("text/uri-list")||e.dataTransfer.getData("text")||"").trim(); if(u){ try{ const f2=await fetchImageURL(u); P.selAsset=sel.id; await pasteToBoard(f2); }catch(err){ toast(err.message); } } };
  }
  el.querySelector("#iok").onclick=()=>{ P.done.imagens=true; save(); courier("imagens","narracao"); toast("Imagens aprovadas"); renderProd(); openPanel("narracao"); comboAfter("imagens"); };
  paintImgs(el);
}
async function runColagem(){
  const P=S.project; ui.imgErr=null; P.selAsset=null; P.done.imagens=false;
  const isShort=P.kind==="short";
  setBusy("imagens","lendo o roteiro e montando o storyboard"); renderPanel();
  const keep=P.parentAssets||null, base=P.baseAssets||null, baseTxt=base?base.map(a=>`${a.id} = ${a.nome}`).join("; "):"";
  const mergeBase=list=>{ if(!base) return list; const ids=new Set(base.map(a=>a.id)); return [...base.map(a=>({...a})),...list.filter(a=>!ids.has(a.id))]; };
  if(!keep) await Store.delPrefix(`p${P.id}:asset:`);
  const dur=isShort?1:P.config.duracao;
  if(isDoc(P)){
    try{
      const r=await ask(Doc.storyboardPrompt(P,{maxAssets:isShort?14:Math.min(80,Math.round(dur*5.5)),maxAI:isShort?4:Math.max(4,Math.round(dur*1.4)),beats:isShort?20:Math.round(dur*15),isShort,
        reuse:keep?keep.map(a=>`${a.id} = ${a.nome}`).join("; "):"",base:baseTxt}),{json:true,maxTokens:20000});
      let assets=keep?keep.map(a=>({...a})):(r.imagens||[]).map((a,i)=>({id:String(a.id||("i"+(i+1))),nome:String(a.nome||""),tipo:a.tipo==="ia"?"ia":"real",busca:String(a.busca||a.nome||""),ampla:String(a.busca_ampla||""),estilo:["reconstrucao","diagrama","objeto","produto","moderno"].includes(a.estilo)?a.estilo:(visOf(P)==="promocional"?"produto":visOf(P)==="documentario"?"reconstrucao":"moderno"),descricao:String(a.descricao||""),img:null})); assets=mergeBase(assets);
      const has=id=>assets.some(a=>a.id===id);
      const TIPOS=["foto","filme","nome","titulo","data","capitulo","citacao","retrato","diagrama"];
      const beats=(r.batidas||[]).map(b=>({trecho:String(b.trecho||""),tipo:TIPOS.includes(b.tipo)?b.tipo:"foto",img:has(String(b.img||""))?String(b.img):"",imgs:(b.imgs||[]).map(String).filter(has).slice(0,3),texto:String(b.texto||""),subtexto:String(b.subtexto||"")}))
        .filter(b=>b.img||b.imgs.length||b.texto);
      if(!beats.length) throw {message:"O storyboard veio vazio. Tente de novo."};
      const used=new Set(beats.flatMap(b=>[b.img,...b.imgs]).filter(Boolean)); assets=assets.filter(a=>used.has(a.id)||keep);
      P.board={kind:"doc",assets,beats}; P.scenes=beats.map(b=>({trecho:b.trecho,prompt:b.tipo,img:"ok"})); save();
    }catch(e){ ui.imgErr=errMsg(e)||e.message; clearBusy(); return renderPanel(); }
    clearBusy();
    return renderPanel();
  }
  try{
    const r=await ask(Collage.storyboardPrompt(P,{maxAssets:isShort?10:Math.min(45,Math.round(dur*3.2)),beats:isShort?18:Math.round(dur*14),isShort,battle:isBattle(P),
      reuse:keep?keep.map(a=>`${a.id} = ${a.nome}`).join("; "):"",base:baseTxt}),{json:true,maxTokens:16000});
    let assets=keep?keep.map(a=>({...a})):(r.elenco||[]).map((a,i)=>({id:String(a.id||("a"+(i+1))),nome:String(a.nome||""),tipo:a.tipo==="real"?"real":"desenho",busca:String(a.busca||""),ampla:String(a.busca_ampla||""),descricao:String(a.descricao||a.nome||""),img:null})); assets=mergeBase(assets);
    const has=id=>assets.some(a=>a.id===id);
    const beats=(r.batidas||[]).map(b=>({trecho:String(b.trecho||""),elementos:(b.elementos||[]).map(String).filter(has).slice(0,3),texto:String(b.texto||""),titulo:String(b.titulo||""),avatar:has(String(b.avatar||""))?String(b.avatar):""})).filter(b=>b.elementos.length||b.texto);
    if(!beats.length) throw {message:"O storyboard veio vazio. Tente de novo."};
    // só gera o que as batidas usam
    const used=new Set(beats.flatMap(b=>[...b.elementos,b.avatar]).filter(Boolean)); assets=assets.filter(a=>used.has(a.id)||keep);
    P.board={assets,beats}; P.scenes=beats.map(b=>({trecho:b.trecho,prompt:b.elementos.join(","),img:"ok"})); save();
  }catch(e){ ui.imgErr=errMsg(e)||e.message; clearBusy(); return renderPanel(); }
  clearBusy();
  renderPanel();
}
// mode: "search" (só internet, grátis) · "ai" (só IA) · "auto" (internet e, se não achar, IA — usado pelo piloto)
async function drawAssets(ids,mode="auto"){
  const P=S.project; if(!ids.length) return renderPanel(); ui.imgErr=null;
  const doc=P.board.kind==="doc", verb=mode==="search"?"buscando na internet":mode==="ai"?"gerando com IA":"buscando e criando";
  setBusy("imagens",`${verb}: 0 de ${ids.length}`);
  const A=id=>P.board.assets.find(a=>a.id===id);
  ids.forEach(id=>{ A(id).img="wait"; }); renderPanel();
  let done=0;
  const jobs=ids.map(id=>async()=>{
    const a=A(id);
    try{
      let blob=null;
      const canSearch=doc||a.tipo==="real";
      if(mode!=="ai"&&canSearch){
        const r=await Collage.findReal(a.busca||a.nome,a.nome,doc?1920:1280,null,a.ampla);
        if(r){ blob=await toJpeg(r.blob,0,0,.9); a.credit=r.credit; a.real=true; a.own=false; }
      }
      if(!blob&&mode==="search"){ a.img="nofound"; }
      else {
        if(!blob){
          if(!AI.stageReady("image")) throw {code:"no_image",message:"Configure Imagens e capas na Administração pra gerar com IA."};
          if(doc){
            const desc=a.descricao&&a.descricao!==a.nome?a.descricao:`${a.busca||a.nome}. If a person appears, show an anonymous figure (from behind, silhouette or in shadow) with no recognizable face.`;
            const raw=await AI.image(`${Doc.STYLE[a.estilo]||Doc.STYLE.reconstrucao} Scene: ${desc}.`,{aspect:"16:9",signal:busy.ctl.signal});
            blob=await toJpeg(raw,0,0,.9);
          } else {
            const raw=await AI.image(`${Collage.DRAW_STYLE} Subject: ${a.descricao||a.nome}.`,{aspect:"3:4",signal:busy.ctl.signal});
            blob=await Collage.cutout(raw);
          }
          a.real=false; a.own=false; a.credit="";
        }
        await Store.put(mkey(P.id,"asset",a.id),blob); a.img="ok"; Cut._R=null;
      }
    }catch(e){ if(e.code==="cancelled"){ a.img=null; throw e; } a.img=e.message||"Falhou"; if(e.code==="rate_limited"||e.code==="overloaded") throw e; }
    done++; setAction(`${verb}: ${done} de ${ids.length}`); save(); renderPanel();
  });
  await imagePool(jobs,mode==="search"?3:2);
  P.board.assets.forEach(a=>{ if(a.img==="wait") a.img=null; });
  const bad=P.board.assets.find(a=>a.img&&!["ok","nofound"].includes(a.img)); if(bad) ui.imgErr=bad.img;
  if(mode==="search"){ const nf=ids.filter(id=>A(id).img==="nofound").length; toast(nf?`Achei ${ids.length-nf} de ${ids.length}. ${nf} sem foto livre: envie a sua ou gere com IA.`:`Achei as ${ids.length} grátis!`); }
  save(); clearBusy(); renderPanel();
}
function creditsText(P){ const A=(P.board&&P.board.assets)||[], c=A.filter(a=>a.real&&a.credit).map(a=>"• "+a.credit); const ia=P.board&&P.board.kind==="doc"&&A.some(a=>a.img==="ok"&&!a.real);
  return (c.length?"\n\nImagens:\n"+c.join("\n"):"")+(ia?"\n\nAlgumas imagens são reconstruções feitas com IA.":""); }

/* ---- Estúdio de Stories ---- */
const DESTINOS=["Stories / Reels / TikTok (vertical)","YouTube Shorts (vertical)","YouTube (horizontal)","Feed (quadrado)"];
function story(){ if(!S.story) S.story={id:Date.now(),desc:"",dest:DESTINOS[0],media:[],hasSrc:false,srcName:"",study:null,opts:{legendas:"ia",musica:"ia",efeitos:"ia",formato:"ia",cortar:true},result:null}; return S.story; }
function stResolved(T){ const g=(T.study&&T.study.sugestoes)||{}, o=T.opts;
  const fmtDest=/horizontal/.test(T.dest)?"horizontal":/quadrado/.test(T.dest)?"quadrado":"vertical";
  return {legendas:o.legendas==="ia"?(CAPTIONS.includes(g.legendas)?g.legendas:"Palavra por palavra"):o.legendas,
    musica:o.musica==="ia"?((Sound.MOODS[g.trilha]||g.trilha==="Sem trilha")?g.trilha:"Promocional (animado)"):o.musica,
    efeitos:o.efeitos==="ia"?(Sound.SFX_SETS.includes(g.efeitos)?g.efeitos:"Promocional (pop e brilho)"):o.efeitos,
    formato:o.formato==="ia"?(Story.FORMATS[g.formato]&&!/horizontal|quadrado/.test(T.dest)===(g.formato==="vertical")?g.formato:fmtDest):o.formato,cortar:o.cortar}; }
VIEWS.stories=()=>{ const T=story(), working=busy&&busy.k==="stories", st=T.study, R=stResolved(T), g=!!AI.get().keys.google;
  const sel=(id,opts,cur,ia)=>`<select id="${id}">${ia?`<option value="ia" ${cur==="ia"?"selected":""}>✨ IA decide${ia!==true?` (${esc(ia)})`:""}</option>`:""}${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  return `
  <p class="lead">Envie o vídeo que você gravou, diga o que quer transmitir e, se quiser, as fotos e vídeos do produto. A IA estuda e o Onion edita: corta as pausas, mostra o produto na hora certa, coloca textos de destaque, legendas e trilha.</p>
  <div class="card" style="padding:12px 14px">
    <div class="field"><label>1. Seu vídeo</label>
      <label class="btn ${T.hasSrc?"ghost ":""}small" style="cursor:pointer">🎥 ${T.hasSrc?"Trocar o vídeo":"Escolher vídeo (computador ou galeria)"}<input type="file" id="stsrc" accept="video/*" style="display:none"></label>
      ${T.hasSrc?`<div class="m" style="font-size:12.5px;margin-top:6px">✓ ${esc(T.srcName)}</div><video id="stprev" controls playsinline style="width:${/horizontal/.test(T.dest)?"100%":"56%"};margin-top:6px;border-radius:10px;background:#000"></video>`:""}</div>
    <div class="field"><label for="stdesc">2. O que você quer transmitir com esse vídeo</label><textarea id="stdesc" rows="3" placeholder="Ex.: propaganda do nosso sérum facial, que hidrata e tira as manchas em 15 dias. Público: mulheres 25–45. Chamar pro WhatsApp no final.">${esc(T.desc)}</textarea></div>
    <div class="field"><label>3. Mídias do produto (opcional)</label>
      <label class="btn ghost small" style="cursor:pointer">📁 Adicionar fotos e vídeos<input type="file" id="stmedia" accept="image/*,video/*" multiple style="display:none"></label>
      ${T.media.length?`<div class="scenes" style="margin-top:8px">${T.media.map(m=>`<div class="scene" ${m.type.startsWith("image")?`data-img="st${T.id}:${m.id}"`:""} style="background:#222;background-size:cover;background-position:center"><span>${m.type.startsWith("video")?"🎬":"🖼"} ${esc(m.id)}</span><small style="position:absolute;left:4px;right:4px;bottom:3px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.name)}</small><button class="x" data-mdel="${m.id}" style="position:absolute;right:3px;top:3px;width:22px;height:22px;font-size:12px" aria-label="Remover">×</button></div>`).join("")}</div>`:""}</div>
    <div class="field" style="max-width:340px"><label for="stdest">Pra onde vai</label><select id="stdest">${DESTINOS.map(d=>`<option ${d===T.dest?"selected":""}>${d}</option>`).join("")}</select></div>
    <div class="btns"><button class="btn" id="ststudy" ${!T.hasSrc||busy||!g?"disabled":""}>🔍 ${st?"Estudar de novo":"Iniciar estudo"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}${!g?`<span class="m" style="font-size:12px">O estudo usa o Gemini: cole a chave do Google na Administração.</span>`:""}</div>
    ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>${T.prog!=null?`<div class="bar"><i style="width:${T.prog*100}%"></i></div>`:""}`:""}
    ${ui.stErr?`<div class="err">${esc(ui.stErr)}</div>`:""}
  </div>
  ${st?`<div class="card" style="padding:12px 14px;margin-top:10px">
    <div class="t">O que a IA entendeu</div><div class="m">${esc(st.resumo)}</div>
    <div class="m" style="font-size:12.5px;margin-top:6px">${[st.tem_fala?`🗣 ${st.transcricao.length} falas`:"sem fala",st.remover.length?`✂ ${st.remover.length} trechos ruins pra cortar`:"",st.insercoes.length?`🖼 ${st.insercoes.length} inserções do produto`:"",st.textos.length?`✨ ${st.textos.length} textos de destaque`:""].filter(Boolean).join(" · ")}</div>
    <h3>4. Ajustes (o que ficar em "IA decide" ela escolhe)</h3>
    <div class="row"><div class="field"><label for="stcap">Legendas</label>${sel("stcap",CAPTIONS,T.opts.legendas,R.legendas)}</div>
      <div class="field"><label for="stfmt">Formato</label>${sel("stfmt",["vertical","horizontal","quadrado"],T.opts.formato,R.formato)}</div></div>
    <div class="row"><div class="field"><label for="stmus">Música de fundo</label><select id="stmus"><option value="ia" ${T.opts.musica==="ia"?"selected":""}>✨ IA decide (${esc(R.musica)})</option>${[...Object.keys(Sound.MOODS),"Sem trilha"].map(o=>`<option ${o===T.opts.musica?"selected":""}>${esc(o)}</option>`).join("")}<option value="custom" ${T.opts.musica==="custom"?"selected":""}>🎵 Minha música (enviar)</option></select></div>
      <div class="field"><label for="stsfx">Efeitos sonoros</label>${sel("stsfx",Sound.SFX_SETS,T.opts.efeitos,R.efeitos)}</div></div>
    ${T.opts.musica==="custom"?`<label class="btn ghost small" style="cursor:pointer">🎵 ${T.hasMusic?"Trocar a música":"Enviar a música (mp3)"}<input type="file" id="stmusf" accept="audio/*" style="display:none"></label>${T.hasMusic?` <span class="tag gold">música carregada</span>`:""}`:""}
    <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:8px 0"><input type="checkbox" id="stcut" ${T.opts.cortar?"checked":""}> Cortar pausas longas e os trechos ruins</label>
    <div class="btns"><button class="btn" id="stmake" ${busy||!Cut.supported()?"disabled":""}>🎬 Criar vídeo</button></div>
    <p class="m" style="font-size:12px">A montagem toca o seu vídeo em tempo real: um story de 30 s leva uns 30 s. Deixe a aba aberta.</p>
  </div>`:""}
  ${T.result&&T.result.stored?`<div class="card" style="padding:12px 14px;margin-top:10px"><div class="t">✓ Vídeo pronto</div>
    <video id="stout" controls playsinline style="width:${T.result.W>T.result.H?"100%":"56%"};margin:6px 0;border-radius:10px;background:#000"></video>
    ${st&&st.legenda_post?`<div class="field"><label>Legenda do post</label><textarea id="stpost" rows="3">${esc(st.legenda_post)}</textarea></div>`:""}
    <div class="btns"><button class="btn small" id="stdl">⬇ Baixar o vídeo</button>${st&&st.legenda_post?`<button class="btn ghost small" id="stcopy">📋 Copiar a legenda</button>`:""}<button class="btn ghost small" id="stsave">Salvar na Biblioteca</button><button class="btn ghost small" id="stnew">Novo story</button></div></div>`:""}`; };
BIND.stories=el=>{
  const T=story();
  (async()=>{ const pv=el.querySelector("#stprev"); if(pv){ const b=await Store.get(`st${T.id}:src`); if(b) pv.src=URL.createObjectURL(b); } const ov=el.querySelector("#stout"); if(ov){ const b=await Store.get(mkey(T.id,"video",0)); if(b) ov.src=URL.createObjectURL(b); } })();
  paintImgs(el);
  el.querySelector("#stsrc").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; await Store.put(`st${T.id}:src`,f); Object.assign(T,{hasSrc:true,srcName:f.name,study:null,result:null}); save(); renderPanel(); };
  el.querySelector("#stdesc").oninput=e=>{ T.desc=e.target.value; save(); };
  el.querySelector("#stdest").onchange=e=>{ T.dest=e.target.value; save(); renderPanel(); };
  el.querySelector("#stmedia").onchange=async e=>{ for(const f of e.target.files){ const id="m"+((T.media.reduce((a,m)=>Math.max(a,+m.id.slice(1)),0))+1); await Store.put(`st${T.id}:${id}`,f); T.media.push({id,name:f.name,type:f.type||"image/jpeg"}); } save(); renderPanel(); };
  el.querySelectorAll("[data-mdel]").forEach(b=>b.onclick=async ev=>{ ev.stopPropagation(); const id=b.dataset.mdel; T.media=T.media.filter(m=>m.id!==id); await Store.delPrefix(`st${T.id}:${id}`); save(); renderPanel(); });
  el.querySelector("#ststudy").onclick=runStudy;
  const on=(id,k)=>{ const x=el.querySelector(id); if(x) x.onchange=e=>{ T.opts[k]=e.target.value; save(); renderPanel(); }; };
  on("#stcap","legendas"); on("#stfmt","formato"); on("#stmus","musica"); on("#stsfx","efeitos");
  const ct=el.querySelector("#stcut"); if(ct) ct.onchange=e=>{ T.opts.cortar=e.target.checked; save(); };
  const mf=el.querySelector("#stmusf"); if(mf) mf.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; await Store.put(`st${T.id}:music`,f); T.hasMusic=true; save(); renderPanel(); };
  const mk=el.querySelector("#stmake"); if(mk) mk.onclick=runStoryRender;
  const dl=el.querySelector("#stdl"); if(dl) dl.onclick=async()=>{ const b=await Store.get(mkey(T.id,"video",0)); if(b) saveBlob(b,`${slug(T.study&&T.study.titulo||"story")}.mp4`); };
  const cp=el.querySelector("#stcopy"); if(cp) cp.onclick=()=>navigator.clipboard?.writeText(el.querySelector("#stpost").value).then(()=>toast("Legenda copiada"));
  const sv=el.querySelector("#stsave"); if(sv) sv.onclick=()=>{ const st=T.study||{}; S.library.unshift({id:T.id,kind:"story",title:st.titulo||T.desc.slice(0,60)||"Story",description:st.legenda_post||"",hashtags:[],idea:{tema:st.titulo||""},config:{...(S.config||{}),nicho:(S.config||{}).nicho||"Story"},script:[(st.transcricao||[]).map(x=>x.t).join(" ")],scenes:[],done:{},render:{name:"story.mp4",res:T.result.formato,stored:true,secs:T.result.secs},savedAt:Date.now()});
    const keepId=T.id; S.story=null; save(); Store.delPrefix(`st${keepId}:`); toast("Story salvo na Biblioteca"); openPanel("arquivo"); };
  const nw=el.querySelector("#stnew"); if(nw) nw.onclick=()=>{ if(!confirm("Começar um story novo? O atual será descartado (salve antes se quiser).")) return; Store.delPrefix(`st${T.id}:`); Store.delPrefix(`p${T.id}:`); S.story=null; save(); renderPanel(); };
};
async function runStudy(){
  const T=story(); ui.stErr=null; setBusy("stories","assistindo o vídeo"); renderPanel();
  try{
    const file=await Store.get(`st${T.id}:src`); if(!file) throw {message:"Envie o vídeo de novo."};
    const media=[]; for(const m of T.media){ const b=await Store.get(`st${T.id}:${m.id}`); if(b) media.push({...m,blob:b}); }
    T.study=await Story.study({file,desc:T.desc,dest:T.dest,media,signal:busy.ctl.signal,onStatus:a=>{ setAction(a); renderPanel(); }}); T.result=null; save();
    toast("Estudo pronto! Confira os ajustes e clique em Criar vídeo.");
  }catch(e){ if(e.code!=="cancelled") ui.stErr=e.message||"O estudo falhou."; }
  clearBusy(); renderPanel();
}
async function runStoryRender(){
  const T=story(); ui.stErr=null; const R=stResolved(T); setBusy("stories","montando o seu vídeo"); T.prog=0; renderPanel();
  try{
    const file=await Store.get(`st${T.id}:src`); const media=[]; for(const m of T.media){ const b=await Store.get(`st${T.id}:${m.id}`); if(b) media.push({...m,blob:b}); }
    const out=await Story.render({id:T.id,file,media,st:T.study,opts:{...R},signal:busy.ctl.signal,onProgress:p=>{ T.prog=p; setAction(`montando ${Math.round(p*100)}%`); const bar=document.querySelector("#pbody .bar>i"); if(bar) bar.style.width=(p*100)+"%"; }});
    await Store.put(mkey(T.id,"video",0),out.blob); T.result={stored:true,secs:out.secs,W:out.W,H:out.H,formato:R.formato}; save(); window.parkJingle&&parkJingle();
    toast("Vídeo pronto!");
  }catch(e){ if(e.code!=="cancelled") ui.stErr=e.message||"A montagem falhou."; }
  T.prog=null; clearBusy(); renderPanel();
}

/* ---- Narração ---- */
let voiceCache={}, sampleUrls={}, playing=null, fullUrl=null;
function stopAudio(){ if(playing){ try{ playing.pause(); }catch(e){} playing=null; } }
VIEWS.narracao=()=>{ const P=S.project; const working=busy&&busy.k==="narracao"; const c=AI.get(); const prov=c.voice.provider;
  const N=P.narr; const okN=N?N.chunks.filter(x=>x.st==="ok").length:0, badN=N?N.chunks.filter(x=>x.st&&x.st!=="ok"&&x.st!=="wait").length:0;
  const words=wc(scriptText()); const est=(words/(140*P.speed)).toFixed(1);
  if(!AI.stageReady("voice")) return staleNote(P,"narracao")+`<p class="lead">O roteiro narrado com voz realista.</p><div class="note">Configure o cartão Narração na Administração pra escolher as vozes. <button class="btn small" style="margin-top:6px" onclick="openPanel('admin')">Abrir Administração</button></div>`;
  return staleNote(P,"narracao")+`
  <p class="lead">O roteiro narrado com voz realista. Voz por <b>${esc(AI.PROVIDERS[prov].name)}</b> · ${esc(c.voice.model)} <a href="#" onclick="openPanel('admin');return false" style="color:var(--accent)">trocar</a></p>
  <div class="row" style="align-items:end"><div class="field" style="margin:0"><label for="vq">Buscar voz</label><input id="vq" placeholder="nome, estilo, sotaque" value="${esc(ui.vq||"")}"></div>
  <div class="field" style="margin:0"><label for="vg">Voz</label><select id="vg">${[["todas","Todas"],["masculina","Masculina"],["feminina","Feminina"]].map(([v,t])=>`<option value="${v}" ${(ui.vg||(P.config.voz||"").toLowerCase()||"todas")===v?"selected":""}>${t}</option>`).join("")}</select></div></div>
  <div class="voices" id="vlist" style="margin-top:12px;max-height:300px;overflow:auto"><div class="status"><span class="spin"></span>Carregando vozes…</div></div>
  <div class="row" style="margin-top:14px"><div class="field"><label for="spd">Velocidade: <b id="spv">${P.speed.toFixed(2)}×</b></label><input id="spd" type="range" min="0.8" max="1.2" step="0.05" value="${P.speed}"></div>
  <div class="field"><label for="vsty">Jeito de falar (opcional)</label><input id="vsty" value="${esc(P.voiceStyle||"")}" placeholder="Ex.: calmo e acolhedor"></div></div>
  <div class="btns"><button class="btn" id="ngo" ${busy||!P.voice?"disabled":""}>🎙 ${!P.voice?"Escolha uma voz":(N&&okN?`Gerar de novo com ${esc(P.voiceName)}`:`Gerar narração com ${esc(P.voiceName)}`)}</button>
    ${N&&badN&&!working?`<button class="btn ghost small" id="nretry">Refazer os ${badN} trechos com erro</button>`:""}
    ${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  <p class="m" style="font-size:12.5px;color:var(--muted)">~${est} min de áudio · ${words} palavras${N?` · ${N.chunks.length} trechos`:""}</p>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div><div class="bar"><i style="width:${N?okN/N.chunks.length*100:0}%"></i></div>`:""}
  ${N?`<div class="chips" style="margin:8px 0">${N.chunks.map((x,i)=>`<span class="chip ${x.st==="ok"?"on":""}" title="${esc(x.st&&x.st!=="ok"&&x.st!=="wait"?x.st:x.text.slice(0,80))}" style="${x.st&&x.st!=="ok"&&x.st!=="wait"?"color:var(--danger)":""}">${x.st==="ok"?"✓":x.st==="wait"?"…":x.st?"!":"·"} ${i+1}</span>`).join("")}</div>`:""}
  ${ui.narErr?`<div class="err">${esc(ui.narErr)}</div>`:""}
  ${P.narration?`<div class="card"><div class="t">✓ Narração pronta</div><div class="m">${esc(P.narration.voice)} · ${esc(P.narration.provider)} · ${P.narration.mins} min</div>
    <div id="nplayer" class="btns"><button class="btn ghost small" id="nplay">▶ Ouvir a narração completa</button><button class="btn ghost small" id="ndl">⬇ Baixar (.wav)</button></div></div>`:""}
  <div class="btns"><button class="btn" id="nok" ${!P.narration||P.done.narracao||working?"disabled":""}>${P.done.narracao?"Narração aprovada ✓":"Aprovar e mandar pro OnionCut"}</button></div>`; };
function renderVoices(el,list){
  const P=S.project, box=el.querySelector("#vlist"); if(!box) return;
  const q=(ui.vq||"").toLowerCase(), want=(P.config.voz||"").toLowerCase();
  let vs=list.filter(v=>!q||(v.name+" "+v.desc).toLowerCase().includes(q));
  const gsel=ui.vg||want||"todas"; if(gsel!=="todas") vs=vs.filter(v=>v.gender===gsel||v.gender==="neutra");
  if(!vs.length){ box.innerHTML=`<div class="empty">Nenhuma voz com esse filtro.</div>`; return; }
  const cols=["#5b6ee1","#7a5be1","#e15b9a","#2e8b57","#b07a2e","#2e9bb0","#c75be1","#e17a5b"];
  box.innerHTML=vs.map((v,i)=>`<div class="voice" role="button" tabindex="0" aria-pressed="${P.voice===v.id}" data-voice="${esc(v.id)}" data-name="${esc(v.name)}">
    <span class="av" style="background:${cols[i%cols.length]}">${esc(v.name[0])}</span><span style="flex:1;min-width:0"><b>${esc(v.name)}</b><small>${esc([v.gender,v.desc].filter(Boolean).join(" · "))}</small></span>
    <button type="button" class="x" style="width:30px;height:30px;font-size:12px" data-sample="${esc(v.id)}" aria-label="Ouvir amostra de ${esc(v.name)}">▶</button></div>`).join("");
  box.querySelectorAll("[data-voice]").forEach(c=>{ const pick=()=>{ P.voice=c.dataset.voice; P.voiceName=c.dataset.name; save(); renderPanel(); }; c.onclick=e=>{ if(e.target.closest("[data-sample]")) return; pick(); }; c.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pick(); } }; });
  box.querySelectorAll("[data-sample]").forEach(b=>b.onclick=async e=>{
    e.stopPropagation(); stopAudio(); const id=b.dataset.sample; const v=list.find(x=>x.id===id);
    try{
      // amostra: frase curta e fixa, gravada UMA vez por voz e guardada no navegador (as próximas são de graça)
      const c=AI.get(), skey=`sample:${c.voice.provider}:${c.voice.model}:${id}:${P.config.idioma}`;
      let url=v.preview||sampleUrls[skey];
      if(!url){ const cached=await Store.get(skey); if(cached){ url=URL.createObjectURL(cached); sampleUrls[skey]=url; } }
      if(!url){ b.innerHTML=`<span class="spin"></span>`;
        const txt={"Inglês":"Hi! This is my voice, and this is how I'll narrate your video.","Espanhol":"¡Hola! Esta es mi voz, y así voy a narrar tu video.","Francês":"Bonjour ! Voici ma voix, et c'est ainsi que je vais raconter votre vidéo.","Alemão":"Hallo! Das ist meine Stimme, und so erzähle ich dein Video."}[P.config.idioma]||"Olá! Esta é a minha voz, e é assim que eu vou narrar o seu vídeo.";
        const r=await Voice.synth(txt,{voiceId:id,speed:1,lang:LANG_EN[P.config.idioma],idioma:P.config.idioma}); await Store.put(skey,r.blob); url=URL.createObjectURL(r.blob); sampleUrls[skey]=url; }
      b.innerHTML="▶"; playing=new Audio(url); playing.play();
    }catch(err){ b.innerHTML="▶"; toast(err.message||"Não deu pra tocar a amostra"); }
  });
}
BIND.narracao=el=>{
  const P=S.project; if(!AI.stageReady("voice")) return;
  const prov=AI.get().voice.provider;
  const load=async()=>{ try{ if(!voiceCache[prov]) voiceCache[prov]=await Voice.list(); renderVoices(el,voiceCache[prov]); }catch(e){ const b=el.querySelector("#vlist"); if(b) b.innerHTML=`<div class="err">${esc(e.message||"Não deu pra carregar as vozes")}</div>`; } };
  load();
  const vq=el.querySelector("#vq"); vq.oninput=()=>{ ui.vq=vq.value; if(voiceCache[prov]) renderVoices(el,voiceCache[prov]); };
  el.querySelector("#vg").onchange=e=>{ ui.vg=e.target.value; if(voiceCache[prov]) renderVoices(el,voiceCache[prov]); };
  const sp=el.querySelector("#spd"); sp.oninput=()=>{ P.speed=+sp.value; el.querySelector("#spv").textContent=P.speed.toFixed(2)+"×"; save(); };
  el.querySelector("#vsty").oninput=e=>{ P.voiceStyle=e.target.value; save(); };
  el.querySelector("#ngo").onclick=()=>{ if(P.narration&&!confirm("Gerar de novo substitui a narração atual. Continuar?")) return; runNarracao(false); };
  const rt=el.querySelector("#nretry"); if(rt) rt.onclick=()=>runNarracao(true);
  const pl=el.querySelector("#nplay"); if(pl) pl.onclick=async()=>{
    pl.disabled=true; pl.innerHTML=`<span class="spin"></span> Juntando os trechos…`;
    try{ const b=await fullNarration(P); if(fullUrl) URL.revokeObjectURL(fullUrl); fullUrl=URL.createObjectURL(b);
      const a=document.createElement("audio"); a.controls=true; a.src=fullUrl; a.style.width="100%"; pl.replaceWith(a); a.play(); }
    catch(e){ pl.disabled=false; pl.textContent="▶ Ouvir a narração completa"; toast(e.message||"Não deu pra abrir o áudio"); }
  };
  const dl=el.querySelector("#ndl"); if(dl) dl.onclick=async()=>{ dl.disabled=true; try{ saveBlob(await fullNarration(P),slug(P.title)+"-narracao.wav"); }catch(e){ toast(e.message||"Falhou"); } dl.disabled=false; };
  el.querySelector("#nok").onclick=()=>{ stopAudio(); P.done.narracao=true; save(); courier("narracao","montagem"); toast("Narração aprovada"); renderProd(); openPanel("montagem"); comboAfter("narracao"); };
};
async function fullNarration(P){
  const parts=[]; for(let i=0;i<P.narr.chunks.length;i++){ const b=await Store.get(`p${P.id}:audio:${i}`); if(!b) throw {message:`Falta o trecho ${i+1}. Gere a narração de novo.`}; parts.push(await Voice.decode(b)); }
  return Voice.wav(Voice.concat(parts,.35));
}
async function runNarracao(onlyFailed){
  const P=S.project; ui.narErr=null; stopAudio();
  const c=AI.get();
  if(!onlyFailed||!P.narr){
    await Store.delPrefix(`p${P.id}:audio:`);
    P.narr={v:2,provider:AI.PROVIDERS[c.voice.provider].name,voiceId:P.voice,voiceName:P.voiceName,speed:P.speed,style:P.voiceStyle||"",chunks:Voice.chunkScript(scriptText()).map(t=>({text:t,st:null}))};
    P.narration=null; P.done.narracao=false; P.done.montagem=false; P.render=null; Cut._R=null;
  }
  const N=P.narr; const idx=N.chunks.map((_,i)=>i).filter(i=>N.chunks[i].st!=="ok");
  setBusy("narracao",`gravando o trecho 1 de ${N.chunks.length}`); idx.forEach(i=>N.chunks[i].st="wait"); save(); renderPanel();
  let done=0;
  const jobs=idx.map(i=>async()=>{
    const ch=N.chunks[i];
    try{
      // conferência: o áudio tem que ter a duração esperada pro tamanho do texto.
      // Se vier bem mais longo, o modelo falou algo a mais: gera de novo.
      const expected=wc(ch.text)/2.6; let r=null, f=null;
      for(let t=0;t<3;t++){
        r=await Voice.synth(ch.text,{voiceId:N.voiceId,speed:N.speed,style:N.style,lang:LANG_EN[P.config.idioma],idioma:P.config.idioma,prev:N.chunks[i-1]?.text||"",next:N.chunks[i+1]?.text||"",signal:busy.ctl.signal});
        f=await Voice.decode(r.blob);
        const d=f.length/Voice.SR; ch.check=d<=expected*1.45+5;
        if(ch.check) break;
      }
      await Store.put(`p${P.id}:audio:${i}`,r.blob);
      ch.dur=f.length/Voice.SR; ch.words=r.words||null; ch.tw=null; ch.st="ok";
    }catch(e){ if(e.code==="cancelled"){ ch.st=null; throw e; } ch.st=e.message||"Falhou"; if(e.code==="rate_limited"||e.code==="overloaded") throw e; }
    done++; setAction(`gravando o trecho ${Math.min(done+1,idx.length)} de ${idx.length}`); save(); renderPanel();
  });
  await imagePool(jobs,2);
  N.chunks.forEach(x=>{ if(x.st==="wait") x.st=null; });
  if(N.chunks.every(x=>x.st==="ok")){
    const tot=N.chunks.reduce((a,x)=>a+x.dur,0)+.35*(N.chunks.length-1);
    P.narration={voice:N.voiceName,provider:N.provider,mins:(tot/60).toFixed(1),secs:tot}; if(P.stale){ delete P.stale.narracao; } markStale(P,"narracao");
  } else { const b=N.chunks.find(x=>x.st&&x.st!=="ok"); ui.narErr=b?b.st:"A narração foi interrompida. Clique em gerar pra continuar."; }
  save(); clearBusy(); renderPanel();
}

/* ---- Montagem (OnionCut) ---- */
const RES=["1080p","720p"];
let cutPrev=null;
function fmtT(s){ s=Math.max(0,s); return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`; }
function cutOpts(P){ const m=P.idea&&P.idea.mural&&P.idea.mural.on?P.idea.mural:null; return {template:P.template,captions:P.captions,res:P.res||"1080p",mural:m,ink:visOf(P)==="documentario"?"doc":"plain",theme:visOf(P),sfxSet:(P.sound||{}).sfxSet}; }
// o plano do criador (ideia central + começo, meio e fim) entra em cada bloco do roteiro
function planoCriador(P,i,n){
  const I=P.idea||{}, last=i===n-1, first=i===0, mid=!first&&!last;
  const linha=[];
  if(I.intencao) linha.push(`Ideia central que o vídeo inteiro precisa passar: ${I.intencao}`);
  if(!P.linkToLong){
    if(I.comeco&&(first||n===1)) linha.push(`COMEÇO, aplique neste bloco: ${I.comeco}`);
    if(I.meio&&(mid||n<=2)) linha.push(`MEIO, aplique neste bloco: ${I.meio}`);
    if(I.fim&&(last||n===1)) linha.push(`FIM, aplique no final deste bloco: ${I.fim}`);
    if(I.mural&&I.mural.on&&(last||n===1)) linha.push(`Não cite nomes de inscritos no texto: depois do fim do vídeo entra um mural com narração própria que faz isso.`);
  }
  return linha.length?`\nPLANO DO CRIADOR (siga com prioridade, sem perder o estilo):\n- ${linha.join("\n- ")}`:"";
}
VIEWS.montagem=()=>{ const P=S.project; const working=busy&&busy.k==="montagem"; const R=Cut._R&&Cut._R.pid===P.id?Cut._R:null; const sup=Cut.supported(); return staleNote(P,"montagem")+`
  <p class="lead">O OnionCut junta cenas, voz e legendas, troca as imagens nas pausas da narração e exporta o vídeo em MP4.</p>
  ${sup?"":`<div class="err">Este navegador não consegue gerar vídeo. Abra o Onion no Chrome ou no Edge, no computador.</div>`}
  ${(()=>{ const tpls=isDoc(P)?Doc.tplFor(visOf(P)):isColagem(P)?Object.keys(Collage.TPL):TEMPLATES, snd=P.sound||{}, sel=(id,opts,cur)=>`<select id="${id}">${opts.map(o=>`<option ${o===cur?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
    return `<div class="row"><div class="field"><label for="mtpl">Template (cores e acabamento)</label>${sel("mtpl",tpls,P.template)}</div>
    <div class="field"><label for="mcap">Legendas</label>${sel("mcap",CAPTIONS,P.captions)}</div></div>
    <div class="row"><div class="field"><label for="mmood">Trilha</label>${sel("mmood",[...Object.keys(Sound.MOODS),"Sem trilha"],snd.custom?"":(snd.mood||"Sem trilha"))}</div>
    <div class="field"><label for="msfxs">Efeitos sonoros</label>${sel("msfxs",Sound.SFX_SETS,snd.sfx===false?"Sem efeitos":(snd.sfxSet||Sound.SFX_SETS[0]))}</div></div>
    <div class="btns" style="margin-top:0"><label class="btn ghost small" style="cursor:pointer">🎵 ${snd.custom?"Trocar a minha música":"Usar uma música minha (mp3)"}<input type="file" id="mfile" accept="audio/*" style="display:none"></label>${snd.custom?`<span class="tag gold">usando a sua música</span><button class="btn ghost small" id="mfilex">tirar</button>`:""}</div>
    <h3>Mural de inscritos (depois do fim do vídeo)</h3>
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;margin:4px 0"><input type="checkbox" id="mmural" ${P.idea&&P.idea.mural&&P.idea.mural.on?"checked":""} style="margin-top:3px"> Tela preta com os nomes dos inscritos, lidos pelo narrador (dura o tempo da fala)</label>
    ${P.idea&&P.idea.mural&&P.idea.mural.on?`<div class="field"><textarea id="mnomes" rows="3" placeholder="Um nome por linha (sem nomes, o narrador convida a deixar o nome nos comentários)">${esc((P.idea.mural.nomes||[]).join("\n"))}</textarea></div>`:""}`; })()}
  ${P.kind==="short"?`<p class="m" style="font-size:12.5px">Short vertical 1080×1920.</p>`:`<div class="field" style="max-width:220px"><label for="mres">Resolução</label><select id="mres">${RES.map(r=>`<option ${r===(P.res||"1080p")?"selected":""}>${r}</option>`).join("")}</select></div>`}
  <div class="btns"><button class="btn" id="mprep" ${busy?"disabled":""}>🎬 ${R?"Montar de novo":"Montar no OnionCut"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>${P.renderProg!=null?`<div class="bar"><i style="width:${P.renderProg*100}%"></i></div>`:""}`:""}
  ${ui.cutErr?`<div class="err">${esc(ui.cutErr)}</div>`:""}
  ${R?`<div class="note">Montagem automática: ${R.scenes.length} cenas em ${fmtT(R.dur)} de narração. ${R.hits} de ${Math.max(0,R.scenes.length-1)} trocas caíram numa pausa da voz. ${R.pauses.length} pausas detectadas. Legendas ${R.exact===R.chunks?"com tempo exato de cada palavra":(R.exact?`exatas em ${R.exact} de ${R.chunks} trechos`:"sincronizadas pelas pausas da voz")}.</div>
  <canvas id="pv" width="${P.kind==="short"?360:640}" height="${P.kind==="short"?640:360}" style="${P.kind==="short"?"width:56%;margin:0 auto;":"width:100%;"}border-radius:10px;background:#000;display:block"></canvas>
  <div class="btns" style="margin-top:8px"><button class="btn ghost small" id="pplay">▶ Assistir prévia</button><input id="pseek" type="range" min="0" max="${Math.ceil(R.dur)}" step="0.1" value="${ui.pt||0}" style="flex:1"><span class="m" id="ptime" style="font-size:12px;color:var(--muted)">${fmtT(ui.pt||0)} / ${fmtT(R.dur)}</span></div>
  <h3>Linha do tempo</h3><div class="tl">
    <div class="lane"><b>Vídeo</b><div class="track">${R.scenes.map((s,i)=>`<i ${P.scenes[i]&&P.scenes[i].img==="ok"?`data-img="${mkey(P.id,"scene",i)}"`:""} style="flex:${Math.max(.1,s.e-s.s)};background:#333" title="Cena ${i+1}: ${fmtT(s.s)}"></i>`).join("")}</div></div>
    <div class="lane"><b>Legendas</b><div class="track" style="gap:4px">${R.caps.slice(0,6).map(c=>`<span class="cap">${esc(c.ws.map(w=>w.w).join(" ").toUpperCase())}</span>`).join("")}</div></div>
    <div class="lane"><b>Áudio</b><div class="track wave">${R.wave.map(v=>`<i style="height:${Math.max(6,v*100)}%"></i>`).join("")}</div></div>
  </div>
  <div class="btns"><button class="btn" id="mrender" ${busy||!sup?"disabled":""}>🎬 Renderizar o vídeo (MP4 ${esc(P.kind==="short"?"vertical":P.res||"1080p")})</button></div>
  <p class="m" style="font-size:12px;color:var(--muted)">O render roda aqui no seu computador. Deixe esta aba aberta até terminar.</p>`:""}
  ${P.render?`<div class="card"><div class="t">✓ Vídeo renderizado</div><div class="m">${esc(P.render.name)} · ${esc(P.render.res)}${P.render.mb?` · ${P.render.mb} MB`:""} · ${fmtT(P.render.secs||0)}</div>${P.render.stored?`<div class="btns"><button class="btn small" id="mvid">⬇ Baixar o vídeo (.mp4)</button></div>`:""}</div>`:""}
  <div class="btns">
    <button class="btn" id="mok" ${!P.render||working?"disabled":""}>Salvar na Biblioteca</button>
    <button class="btn ghost small" id="mdl">⬇ Baixar pacote (.zip)</button>
  </div>`; };
BIND.montagem=el=>{
  const P=S.project; const R=Cut._R&&Cut._R.pid===P.id?Cut._R:null;
  const redraw=()=>{ const c=el.querySelector("#pv"); if(c&&R&&!cutPrev) Cut.still(R,c,cutOpts(P),Math.max(.6,ui.pt||0)); };
  el.querySelector("#mtpl").onchange=e=>{ P.template=e.target.value; save(); redraw(); };
  el.querySelector("#mcap").onchange=e=>{ P.captions=e.target.value; save(); redraw(); };
  P.sound=P.sound||{mood:"Tensão (documentário)",sfx:true,custom:false};
  const soundChanged=()=>{ if(Cut._R&&Cut._R.pid===P.id){ Cut._R=null; toast("Trilha alterada: clique em Montar de novo"); renderPanel(); } };
  el.querySelector("#mmood").onchange=e=>{ P.sound.mood=e.target.value; P.sound.custom=false; save(); soundChanged(); };
  el.querySelector("#msfxs").onchange=e=>{ P.sound.sfxSet=e.target.value; P.sound.sfx=e.target.value!=="Sem efeitos"; save(); soundChanged(); };
  const mm=el.querySelector("#mmural"); if(mm) mm.onchange=e=>{ P.idea=P.idea||{}; P.idea.mural={on:e.target.checked,nomes:(P.idea.mural&&P.idea.mural.nomes)||[]}; save(); Cut._R=null; toast(e.target.checked?"Mural ligado: clique em Montar de novo":"Mural desligado: clique em Montar de novo"); renderPanel(); };
  const mn=el.querySelector("#mnomes"); if(mn) mn.onchange=()=>{ P.idea.mural.nomes=mn.value.split("\n").map(x=>x.trim()).filter(Boolean); save(); Cut._R=null; toast("Nomes salvos: clique em Montar de novo pra gravar a fala do mural"); renderPanel(); };
  el.querySelector("#mfile").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; await Store.put(mkey(P.id,"music",0),f); P.sound.custom=true; save(); toast("Música carregada"); soundChanged(); renderPanel(); };
  const mx=el.querySelector("#mfilex"); if(mx) mx.onclick=async()=>{ await Store.delPrefix(`p${P.id}:music:`); P.sound.custom=false; save(); soundChanged(); renderPanel(); };
  const mr=el.querySelector("#mres"); if(mr) mr.onchange=e=>{ P.res=e.target.value; save(); const b=el.querySelector("#mrender"); if(b) b.textContent=`🎬 Renderizar o vídeo (MP4 ${P.res})`; };
  el.querySelector("#mprep").onclick=runPrepare;
  el.querySelector("#mdl").onclick=e=>downloadPack(P,e.currentTarget);
  const mv=el.querySelector("#mvid"); if(mv) mv.onclick=async()=>{ const v=await Store.get(mkey(P.id,"video",0)); if(v) saveBlob(v,`${slug(P.title)}.mp4`); };
  el.querySelector("#mok").onclick=()=>{
    if(SEG==="short"){ toast("Salve pela aba 🎬 Vídeo longo: o Short vai junto."); return; }
    stopPreview(); P.done.montagem=true; S.library.unshift(slimForLibrary(P)); S.project=null; Cut._R=null; save();
    courier("montagem","arquivo"); toast("+1 vídeo pronto na Biblioteca"); renderProd(); openPanel("arquivo");
  };
  paintImgs(el);
  if(R){
    redraw();
    const pp=el.querySelector("#pplay"), sk=el.querySelector("#pseek"), tm=el.querySelector("#ptime");
    pp.onclick=()=>{
      if(cutPrev){ stopPreview(); pp.textContent="▶ Assistir prévia"; return; }
      pp.textContent="⏸ Pausar";
      cutPrev=Cut.preview(R,el.querySelector("#pv"),cutOpts(P),{from:ui.pt||0,onTime:t=>{ ui.pt=t; sk.value=t; tm.textContent=`${fmtT(t)} / ${fmtT(R.dur)}`; },onEnd:()=>{ cutPrev=null; ui.pt=0; pp.textContent="▶ Assistir prévia"; }});
    };
    sk.oninput=()=>{ ui.pt=+sk.value; tm.textContent=`${fmtT(ui.pt)} / ${fmtT(R.dur)}`; if(cutPrev){ stopPreview(); pp.textContent="▶ Assistir prévia"; } redraw(); };
    const rb=el.querySelector("#mrender"); if(rb) rb.onclick=runRender;
  }
};
function stopPreview(){ if(cutPrev){ cutPrev.stop(); cutPrev=null; } }
// narração do mural de inscritos: lê os nomes e chama pra se inscrever (duração livre, conforme a fala)
function muralText(P){
  const m=P.idea&&P.idea.mural; if(!m||!m.on) return "";
  const nomes=(m.nomes||[]).slice(0,18), L=(P.config&&P.config.idioma)||"Português";
  const lista=(arr,e)=>{ const x=arr.map(n=>n.replace(/[.,;:!?\s]+$/,"")); return x.length>1?x.slice(0,-1).join(", ")+` ${e} `+x[x.length-1]:x[0]; };
  if(L==="Inglês") return (nomes.length?`A special thanks to ${lista(nomes,"and")}! `:"")+`Subscribe and leave your name, or the name of someone you'd like to see here, in the comments, and you'll get a special thank-you in one of our next videos.`;
  if(L==="Espanhol") return (nomes.length?`¡Un agradecimiento especial a ${lista(nomes,"y")}! `:"")+`Suscríbete y deja tu nombre, o el de alguien que quieras ver aquí, en los comentarios, y recibirás un agradecimiento especial en uno de nuestros próximos videos.`;
  return (nomes.length?`Um agradecimento especial pra ${lista(nomes,"e")}! `:"")+`Se inscreva e deixe o seu nome, ou o de alguém que você gostaria de ver aqui, nos comentários, pra receber um agradecimento especial em um dos nossos próximos vídeos.`;
}
async function ensureMuralAudio(P){
  const txt=muralText(P); if(!txt||!P.narr) return;
  if(P.narr.mural&&P.narr.mural.text===txt&&await Store.get(mkey(P.id,"mural",0))) return;
  if(!AI.stageReady("voice")) return;
  setAction("gravando a narração do mural");
  const r=await Voice.synth(txt,{voiceId:P.narr.voiceId,speed:P.narr.speed||1,style:P.narr.style||"",lang:LANG_EN[P.config.idioma],idioma:P.config.idioma});
  await Store.put(mkey(P.id,"mural",0),r.blob);
  const f=await Voice.decode(r.blob); P.narr.mural={text:txt,dur:f.length/Voice.SR}; save();
}
async function runPrepare(){
  const P=S.project; ui.cutErr=null; stopPreview();
  if(!P.narr||!P.narration){ ui.cutErr="Gere a narração no Estúdio antes de montar."; return renderPanel(); }
  setBusy("montagem","abrindo o áudio"); P.renderProg=null; renderPanel();
  try{ try{ await ensureMuralAudio(P); }catch(e){ if(e.code==="cancelled") throw e; toast("Não deu pra gravar a narração do mural: "+(e.message||"erro")); }
    const R=await Cut.prepare(P,{onStatus:a=>{ setAction(a); renderPanel(); },signal:busy.ctl.signal}); R.pid=P.id; Cut._R=R; ui.pt=0; P.cut=true; if(P.stale) delete P.stale.montagem; save(); }
  catch(e){ if(e.code!=="cancelled") ui.cutErr=e.message||"A montagem falhou."; }
  clearBusy(); renderPanel();
}
async function runRender(){
  const P=S.project, R=Cut._R; ui.cutErr=null; stopPreview();
  const name=`${slug(P.title)}.mp4`;
  setBusy("montagem","preparando o render"); P.renderProg=0; renderPanel();
  try{
    const out=await Cut.render(R,cutOpts(P),{signal:busy.ctl.signal,onProgress:({f,total,fps,eta})=>{
      P.renderProg=f/total; setAction(`renderizando ${Math.round(f/total*100)}% · ${fps.toFixed(0)} quadros/s · falta ${fmtT(eta)}`);
      const el=document.getElementById("pbody"); const bar=el&&el.querySelector(".bar>i"); const st=el&&el.querySelector(".status");
      if(bar&&st){ bar.style.width=(P.renderProg*100)+"%"; st.innerHTML=`<span class="spin"></span>${esc(busy.action)}…`; } else renderPanel();
    }});
    const vb=await keepVideo(P,out,null);
    P.render={name,res:P.res||"1080p",mb:vb?(vb.size/1048576).toFixed(0):null,secs:R.dur,at:Date.now(),stored:!!vb}; save();
    toast(vb?"Vídeo renderizado! Assista ou baixe quando quiser.":"Renderizado, mas não coube no armazenamento do navegador."); window.parkJingle&&parkJingle();
    if(!vb&&out.blob) saveBlob(out.blob,name);
  }catch(e){ if(e.code!=="cancelled") ui.cutErr=e.message||"O render falhou."; }
  P.renderProg=null; clearBusy(); renderPanel();
}
// guarda o MP4 no navegador pra Biblioteca e pro .zip
async function keepVideo(P,out,fh){
  try{ const b=out.blob||(fh?await fh.getFile():null); if(!b) return null; await Store.put(mkey(P.id,"video",0),b); return b; }catch(e){ return null; }
}
// a Biblioteca guarda só o que importa (o localStorage tem limite)
function slimForLibrary(P){
  const L=JSON.parse(JSON.stringify(P));
  delete L.titles; delete L.imgPhase; delete L.renderProg; delete L.selScene;
  if(L.narr) L.narr.chunks=L.narr.chunks.map(c=>({text:c.text,st:c.st,dur:c.dur}));
  if(L.sub){ delete L.sub.titles; if(L.sub.narr) L.sub.narr.chunks=L.sub.narr.chunks.map(c=>({text:c.text,st:c.st,dur:c.dur})); }
  L.savedAt=Date.now(); return L;
}
function slug(t){ return (t||"video").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"video"; }
function saveBlob(blob,name){
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function packText(P){
  return [`ONION · ${P.title}`,"",`Canal: ${P.config.nicho} · ${P.config.publico} · ${P.config.idioma}`,"","== DESCRIÇÃO ==",P.description||"",(P.hashtags||[]).join(" "),"",
    "== TEXTO DA CAPA ==",(P.thumbs||[])[P.thumbSel]||"",P.thumbScene?("Composição: "+P.thumbScene):"","",
    "== ROTEIRO ==",...P.script.map((t,i)=>`[Bloco ${i+1}]\n${t}\n`),"== CENAS (prompts) ==",...P.scenes.map((s,i)=>`${i+1}. ${s.trecho}\n   ${s.prompt}`),"",
    `== NARRAÇÃO ==\n${P.narration?`${P.narration.voice} (${P.narration.provider}), ${P.speed}×`:"—"}`].join("\n");
}
// .zip organizado: uma pasta pro vídeo longo e outra pro Short, cada uma com o que vai pro YouTube na frente
async function packFolder(z,P,label,sameImages){
  const f=z.folder(label), num=n=>String(n).padStart(2,"0");
  const vid=await Store.get(mkey(P.id,"video",0)); if(vid) f.file(`01 - VIDEO.mp4`,vid);
  if(P.kind!=="short"&&P.thumbSel!=null){ const b=await Store.get(mkey(P.id,"thumb",P.thumbSel)); if(b) f.file("02 - CAPA.jpg",b); }
  f.file(`${P.kind==="short"?"02":"03"} - TITULO E DESCRICAO.txt`,`TÍTULO\n${P.title||""}\n\nDESCRIÇÃO\n${P.description||""}\n\n${(P.hashtags||[]).join(" ")}${creditsText(P)}\n`);
  f.file(`${P.kind==="short"?"03":"04"} - ROTEIRO.txt`,P.script.join("\n\n"));
  const x=f.folder("extras");
  if(P.narr&&P.narr.chunks.every(c=>c.st==="ok")){ try{ x.file("narracao (só o áudio).wav",await fullNarration(P)); }catch(e){} }
  x.file("tudo-sobre-o-video.txt",packText(P));
  if(sameImages){ x.file("imagens - LEIA.txt","O Short usa as mesmas imagens do vídeo longo: estão na pasta VIDEO LONGO/extras/imagens."); }
  else if(P.board){
    const im=x.folder("imagens");
    for(const a of P.board.assets){ if(a.img!=="ok") continue; const b=await Store.get(mkey(P.id,"asset",a.id)); if(b) im.file(`${a.id} - ${slug(a.nome)}.${/png/.test(b.type)?"png":"jpg"}`,b); }
    im.file("lista-de-imagens.txt",P.board.assets.map(a=>`${a.id} · ${a.nome} · ${a.own?"sua":a.real?"grátis da internet":a.img==="ok"?"IA":"faltou"}${a.credit?" · "+a.credit:""}`).join("\n"));
  } else if(P.scenes.length){
    const im=x.folder("imagens");
    for(let i=0;i<P.scenes.length;i++){ const b=await Store.get(mkey(P.id,"scene",i)); if(b) im.file(`${num(i+1)}.jpg`,b); }
    im.file("prompts.txt",P.scenes.map((s,i)=>`${num(i+1)}. ${s.trecho}\n    ${s.prompt}`).join("\n\n"));
  }
}
async function downloadPack(P,btn){
  const name=slug(P.title);
  if(!window.JSZip){ return saveBlob(new Blob([packText(P)],{type:"text/plain;charset=utf-8"}),`onion-${name}.txt`); }
  const old=btn&&btn.innerHTML; if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Empacotando…`; }
  try{
    const z=new JSZip(), root=z.folder(name);
    await packFolder(root,P,P.kind==="short"?"SHORT":"VIDEO LONGO");
    if(P.sub) await packFolder(root,P.sub,"SHORT",!!P.sub.parentAssets||!P.sub.board);
    saveBlob(await z.generateAsync({type:"blob"}),`onion-${name}.zip`);
  }catch(e){ toast("Não deu pra montar o .zip neste navegador"); }
  if(btn){ btn.disabled=false; btn.innerHTML=old; }
}

/* ---- Conserto da narração antiga (instrução lida em voz alta) ---- */
async function repairNarration(P,onStatus){
  const N=P.narr; let cut=0;
  for(let i=0;i<N.chunks.length;i++){
    onStatus(`ouvindo o trecho ${i+1} de ${N.chunks.length}`);
    const blob=await Store.get(`p${P.id}:audio:${i}`); if(!blob) throw {message:`O áudio do trecho ${i+1} não está mais neste navegador.`};
    const f=await Voice.decode(blob);
    const first=N.chunks[i].text.split(/\s+/).slice(0,12).join(" ");
    let res; try{ res=await Voice.findLeak(f,first); }catch(e){ if(e.code==="auth"||e.code==="no_key") throw e; res={has:false}; }
    if(!res.has||!(res.t>1)) continue;
    // corta numa pausa perto do ponto que o Gemini indicou
    const ps=Cut.pauses(f.subarray(0,Math.min(f.length,Voice.SR*40)),.15);
    let at=res.t-.15, best=null, bd=1.5;
    ps.forEach(p=>{ const d=Math.abs(p.e-res.t); if(d<bd){ bd=d; best=p; } });
    if(best) at=best.s+(best.e-best.s)*.6;
    const dur=f.length/Voice.SR; if(at<1||at>Math.min(40,dur*.6)) continue;
    const kept=f.slice(Math.floor(at*Voice.SR));
    await Store.put(`p${P.id}:audio:${i}`,Voice.wav(kept));
    N.chunks[i].dur=kept.length/Voice.SR; N.chunks[i].words=null; N.chunks[i].tw=null; cut++;
  }
  N.v=2;
  const tot=N.chunks.reduce((a,x)=>a+(x.dur||0),0)+.35*(N.chunks.length-1);
  P.narration={...(P.narration||{}),mins:(tot/60).toFixed(1),secs:tot};
  return {cut,total:N.chunks.length};
}
/* ---- Assistir na Biblioteca ---- */
let libUrl=null;
async function playLibrary(box,P){
  stopPreview(); if(libUrl){ URL.revokeObjectURL(libUrl); libUrl=null; }
  const vid=P.render&&P.render.stored?await Store.get(mkey(P.id,"video",0)):null;
  if(vid){
    libUrl=URL.createObjectURL(vid);
    box.outerHTML=`<video controls autoplay playsinline src="${libUrl}" style="width:100%;border-radius:10px;background:#000;margin-top:8px;display:block"></video>`;
    return;
  }
  // sem o MP4 guardado: monta a prévia com as imagens e a narração que estão no navegador
  box.onclick=null; box.innerHTML=`<div class="status" style="margin-top:8px"><span class="spin"></span>Montando a prévia…</div>`;
  try{
    const R=await Cut.prepare(P,{}); R.pid=P.id;
    box.outerHTML=`<div class="libprev"><canvas width="${P.kind==="short"?360:640}" height="${P.kind==="short"?640:360}" style="${P.kind==="short"?"width:56%;margin-left:22%;":"width:100%;"}border-radius:10px;background:#000;display:block;margin-top:8px"></canvas>
      <div class="btns" style="margin-top:6px"><button class="btn ghost small" data-lp>⏸ Pausar</button><input type="range" min="0" max="${Math.ceil(R.dur)}" step="0.1" value="0" style="flex:1" data-ls><span class="m" style="font-size:12px;color:var(--muted)" data-lt>0:00 / ${fmtT(R.dur)}</span></div>
      <p class="m" style="font-size:12px;color:var(--muted)">Prévia montada na hora. O MP4 deste vídeo não ficou guardado no navegador.</p></div>`;
    const wrap=[...document.querySelectorAll(".libprev")].pop(), c=wrap.querySelector("canvas"), b=wrap.querySelector("[data-lp]"), sk=wrap.querySelector("[data-ls]"), tm=wrap.querySelector("[data-lt]");
    const o={template:P.template,captions:P.captions,res:P.kind==="short"?"short":"720p"}; let pos=0;
    const start=()=>{ b.textContent="⏸ Pausar"; cutPrev=Cut.preview(R,c,o,{from:pos,onTime:t=>{ pos=t; sk.value=t; tm.textContent=`${fmtT(t)} / ${fmtT(R.dur)}`; },onEnd:()=>{ cutPrev=null; pos=0; b.textContent="▶ Assistir"; }}); };
    b.onclick=()=>{ if(cutPrev){ stopPreview(); b.textContent="▶ Continuar"; } else start(); };
    sk.oninput=()=>{ pos=+sk.value; tm.textContent=`${fmtT(pos)} / ${fmtT(R.dur)}`; if(cutPrev){ stopPreview(); start(); } else Cut.still(R,c,o,Math.max(.6,pos)); };
    start();
  }catch(e){ box.innerHTML=`<div class="err" style="margin-top:8px">${esc(e.message||"Não deu pra montar a prévia deste vídeo.")}</div>`; }
}
/* ---- Arquivo / Biblioteca ---- */
VIEWS.arquivo=()=>`<div class="lib">
  <p class="lead">Vídeos que já passaram por todo o campus. ${S.library.length?`${S.library.length} no total.`:""}</p>
  ${S.library.length?S.library.map((P,i)=>`<details><summary>${esc(P.title)}</summary>
    <div class="player" data-play="${i}" role="button" tabindex="0" aria-label="Assistir ${esc(P.title)}">
      <div class="big" ${P.thumbSel!=null&&(P.thumbImg||[])[P.thumbSel]==="ok"?`data-img="${mkey(P.id,"thumb",P.thumbSel)}"`:""} style="margin:8px 0 0;background-color:#1a1424"></div>
      <span class="playbtn">▶</span><span class="playlbl">${P.render&&P.render.stored?"Assistir o vídeo":"Assistir a prévia"}</span></div>
    <p class="m" style="font-size:12.5px;color:var(--muted)">${new Date(P.savedAt).toLocaleDateString("pt-BR")} · ${esc(P.config.nicho)} · ${esc(P.config.idioma)} · ${P.narration?P.narration.mins+" min":""} · ${P.scenes.filter(s=>s.img==="ok").length} imagens</p>
    <p style="white-space:pre-wrap;font-size:13.5px">${esc(P.description||"")}</p>
    ${P.sub?`<div class="m" style="font-size:12.5px;margin:6px 0">📱 Short junto: <b>${esc(P.sub.title||"")}</b>${P.sub.render&&P.sub.render.stored?` · <a href="#" data-splay="${i}" style="color:var(--accent)">assistir</a> · <a href="#" data-svid="${i}" style="color:var(--accent)">baixar .mp4</a>`:" · ainda sem vídeo renderizado"}</div><div data-sbox="${i}"></div>`:""}
    <div class="btns">${P.render&&P.render.stored?`<button class="btn small" data-vid="${i}">🎬 Baixar vídeo (.mp4)</button>`:""}<button class="btn ${P.render&&P.render.stored?"ghost ":""}small" data-dl="${i}">⬇ Baixar pacote (.zip)</button>${P.narr&&P.narr.v!==2&&/Gemini/.test(P.narr.provider||"")?`<button class="btn small" data-fix="${i}" title="Corta a instrução que a voz leu por engano no começo dos trechos">✂ Tirar a instrução lida (centavos)</button>`:""}${!P.sub&&!AP.on&&P.kind!=="story"?`<button class="btn small" data-pair="${i}">${P.kind==="short"?"🎬 Gerar o vídeo longo deste Short":"📱 Gerar o Short deste vídeo"}</button>`:""}${P.kind==="story"?"":`<button class="btn ghost small" data-recut="${i}" title="Volta pro OnionCut pra mudar template, trilha ou mural e renderizar de novo, sem gastar nada">🎬 Reabrir no OnionCut</button>`}${P.kind==="story"?"":`<button class="btn ghost small" data-reopen="${i}" title="Volta pro campus a partir da narração">🎙 Refazer a narração</button>`}<button class="btn ghost small" data-rm="${i}">Remover</button></div></details>`).join(""):`<div class="empty">Ainda não tem vídeo pronto. Quando o OnionCut terminar um, ele aparece aqui.</div>`}
  <p class="m" id="usage" style="font-size:12px;color:var(--muted)"></p>
</div>`;
BIND.arquivo=el=>{
  el.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>downloadPack(S.library[+b.dataset.dl],b));
  el.querySelectorAll("[data-play]").forEach(box=>{ const go=()=>playLibrary(box,S.library[+box.dataset.play]); box.onclick=go; box.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } }; });
  el.querySelectorAll("[data-fix]").forEach(b=>b.onclick=async()=>{
    if(S.project) return toast("Termine ou descarte o vídeo em produção antes");
    const idx=+b.dataset.fix, P=S.library[idx];
    if(!confirm(`Consertar a narração de “${P.title}”? O Gemini ouve o começo de cada trecho e o Onion corta a instrução lida por engano. Depois o vídeo volta pro OnionCut pra você renderizar de novo. Roteiro, capa e imagens continuam iguais.`)) return;
    b.disabled=true; const all=el.querySelectorAll("button"); all.forEach(x=>x.disabled=true);
    try{
      const out=await repairNarration(P,t=>{ b.innerHTML=`<span class="spin"></span> ${esc(t)}`; });
      S.library.splice(idx,1); await Store.delPrefix(`p${P.id}:video:`);
      Object.assign(P,{render:null,cut:false}); P.done.montagem=false; delete P.savedAt; S.project=P; Cut._R=null; save(); renderProd();
      toast(out.cut?`Instrução removida em ${out.cut} de ${out.total} trechos. Agora é só renderizar.`:"Não achei instrução lida nos trechos. Nada foi cortado.");
      courier("arquivo","montagem"); openPanel("montagem");
    }catch(e){ toast(e.message||"Não deu pra consertar"); renderPanel(); }
  });
  el.querySelectorAll("[data-recut]").forEach(b=>b.onclick=()=>{
    if(S.main()) return toast("Termine ou descarte o vídeo em produção antes");
    const P=S.library[+b.dataset.recut]; if(!P.narr) return toast("Este vídeo não tem a narração guardada neste navegador.");
    S.library.splice(+b.dataset.recut,1); P.done.montagem=false; delete P.savedAt; if(P.sub) P.combo=true;
    S.project=P; Cut._R=null; save(); renderProd(); courier("arquivo","montagem"); toast("De volta ao OnionCut: ajuste e clique em Montar de novo"); openPanel("montagem");
  });
  el.querySelectorAll("[data-reopen]").forEach(b=>b.onclick=async()=>{
    if(S.project) return toast("Termine ou descarte o vídeo em produção antes");
    const P=S.library[+b.dataset.reopen];
    if(!confirm(`Reabrir “${P.title}” no campus? O vídeo volta pro Estúdio de Narração; roteiro, capa e imagens são mantidos.`)) return;
    S.library.splice(+b.dataset.reopen,1);
    await Store.delPrefix(`p${P.id}:audio:`); await Store.delPrefix(`p${P.id}:video:`);
    Object.assign(P,{narr:null,narration:null,render:null,cut:false}); P.done.narracao=false; P.done.montagem=false; delete P.savedAt;
    P.config.idioma=P.config.idioma||(S.config&&S.config.idioma); S.project=P; Cut._R=null; save(); renderProd();
    courier("arquivo","narracao"); toast("Vídeo de volta no Estúdio de Narração"); openPanel("narracao");
  });
  el.querySelectorAll("[data-pair]").forEach(b=>b.onclick=()=>{ const L=S.library[+b.dataset.pair];
    if(!confirm(L.kind==="short"?`Gerar o vídeo longo de “${L.title}”? O gerente passa por todos os departamentos usando o Short como base (ideia, roteiro e imagens).`:`Gerar o Short de “${L.title}”? Ele reaproveita as imagens do vídeo e termina chamando pro vídeo completo.`)) return;
    libGenerate(L.id,L.kind==="short"?"long":"short"); });
  el.querySelectorAll("[data-svid]").forEach(a=>a.onclick=async e=>{ e.preventDefault(); const P=S.library[+a.dataset.svid].sub; const v=await Store.get(mkey(P.id,"video",0)); if(v) saveBlob(v,`${slug(P.title)}-short.mp4`); });
  el.querySelectorAll("[data-splay]").forEach(a=>a.onclick=async e=>{ e.preventDefault(); const i=+a.dataset.splay, P=S.library[i].sub; const v=await Store.get(mkey(P.id,"video",0)); if(!v) return; if(libUrl) URL.revokeObjectURL(libUrl); libUrl=URL.createObjectURL(v);
    el.querySelector(`[data-sbox="${i}"]`).innerHTML=`<video controls autoplay playsinline src="${libUrl}" style="width:56%;margin:6px 22%;border-radius:10px;background:#000;display:block"></video>`; });
  el.querySelectorAll("[data-vid]").forEach(b=>b.onclick=async()=>{ const P=S.library[+b.dataset.vid]; const v=await Store.get(mkey(P.id,"video",0)); if(v) saveBlob(v,`${slug(P.title)}.mp4`); else toast("O vídeo não está mais guardado neste navegador"); });
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{ const P=S.library[+b.dataset.rm]; if(!confirm(`Remover “${P.title}” e as imagens dele deste navegador?`)) return; S.library.splice(+b.dataset.rm,1); save(); await Store.delPrefix(`p${P.id}:`); if(P.sub) await Store.delPrefix(`p${P.sub.id}:`); renderPanel(); });
  paintImgs(el);
  Store.usage().then(u=>{ const n=el.querySelector("#usage"); if(u&&n&&u.usage!=null) n.textContent=`Espaço usado neste navegador: ${(u.usage/1048576).toFixed(0)} MB de ${(u.quota/1048576/1024).toFixed(1)} GB disponíveis.`; });
};

/* ---- Administração ---- */
let admMsg={}; // stage -> {ok,text}
function stageStatus(st){
  const c=AI.get(), p=c[st].provider;
  if(AI.PROVIDERS[p].noKey) return `<span class="tag gold">pronto</span>`;
  if(!c.keys[p]) return `<span class="tag hot">falta a chave</span>`;
  if(!c[st].model) return `<span class="tag hot">falta escolher o modelo</span>`;
  return `<span class="tag gold">pronto</span>`;
}
function modelField(st,field,label){
  const c=AI.get(), p=c[st].provider, ids=AI.cachedModels(p,st), cur=c[st][field]||"";
  const id=`m-${st}-${field}`;
  if(!ids.length) return `<div class="field"><label for="${id}">${label}</label><input id="${id}" data-model="${st}:${field}" value="${esc(cur)}" placeholder="Clique em Testar pra carregar a lista"></div>`;
  const opts=(cur&&!ids.includes(cur)?[cur,...ids]:ids);
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-model="${st}:${field}">${field==="quick"?`<option value="">Mesmo do principal</option>`:""}${opts.map(m=>`<option ${m===cur?"selected":""}>${esc(m)}</option>`).join("")}</select></div>`;
}
VIEWS.admin=()=>{ const c=AI.get(); return `
  <p class="lead">Pra cada etapa, escolha quem faz o trabalho e cole a chave. A mesma chave vale pra todas as etapas do mesmo provedor. Tudo fica guardado só neste navegador.</p>
  ${Object.entries(AI.STAGES).map(([st,S2])=>{
    const p=c[st].provider, P2=AI.PROVIDERS[p];
    const others=Object.keys(AI.STAGES).filter(o=>o!==st&&c[o].provider===p&&!P2.noKey).map(o=>AI.STAGES[o].name);
    const msg=admMsg[st];
    return `<section class="card" style="padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3 style="margin:0">${S2.name}</h3>${stageStatus(st)}</div>
      <p class="m" style="margin:4px 0 10px">${S2.what}</p>
      <div class="pills" data-group="prov-${st}">
        ${S2.providers.map(x=>`<button type="button" class="pill" aria-pressed="${x===p}" data-v="${x}">${esc(AI.PROVIDERS[x].name)}</button>`).join("")}
        ${Object.keys(S2.blocked||{}).map(x=>`<button type="button" class="pill" disabled style="opacity:.45;cursor:not-allowed" title="${esc(S2.blocked[x])}">${esc(AI.PROVIDERS[x].name)}</button>`).join("")}
      </div>
      ${Object.values(S2.blocked||{}).map(t=>`<p class="m" style="font-size:12px;margin:6px 0 0">${esc(t)}</p>`).join("")}
      ${P2.noKey?`<p class="m" style="margin-top:10px">Nada pra configurar: as legendas usam o texto do roteiro e os cortes usam as pausas detectadas no áudio.</p>`:`
      <div class="field" style="margin-top:12px"><label for="k-${st}">Chave de ${esc(P2.name)}</label>
        <div style="display:flex;gap:6px"><input id="k-${st}" data-key="${p}" type="password" autocomplete="off" spellcheck="false" placeholder="${esc(P2.keyHint)}" value="${esc(c.keys[p])}"><button type="button" class="btn ghost small" data-show="k-${st}" aria-label="Mostrar chave">👁</button></div>
        <p class="m" style="font-size:12px;margin:5px 0 0">Crie em ${esc(P2.where)}${others.length?` · esta chave também é usada em ${others.join(" e ")}`:""}</p></div>
      ${st==="text"?`<div class="row">${modelField(st,"model","Modelo principal")}${modelField(st,"quick","Modelo rápido")}</div>`:modelField(st,"model","Modelo")}
      ${st==="image"&&p==="google_free"?`<div class="note" style="margin-top:4px">A cota grátis do Gemini tem limite por minuto e por dia, e o Google pode usar os pedidos pra melhorar os modelos. O Onion gera no máximo uma imagem a cada 5 s pra não estourar o limite. Veja a sua cota em aistudio.google.com/rate-limit.</div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:6px 0"><input type="checkbox" data-fbpaid ${c.image.fallbackPaid!==false?"checked":""} style="margin-top:3px"> <span>Quando a cota grátis acabar, continuar com a chave paga do Google${c.keys.google?"":" (cole a chave paga no cartão Textos ou Narração)"}</span></label>`:""}
      <div class="btns" style="margin-top:4px"><button class="btn small" data-test="${st}">Salvar e testar</button></div>
      ${msg?`<div class="${msg.ok?"status":"err"}" style="${msg.ok?"color:var(--ok)":""}">${esc(msg.text)}</div>`:""}`}
    </section>`;}).join("")}
  <section class="card" style="padding:14px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3 style="margin:0">Tendências ao vivo</h3>${(c.keys.youtube||c.keys.google)?`<span class="tag gold">${c.keys.youtube?"chave própria":"usa a chave do Google"}</span>`:`<span class="tag">opcional</span>`}</div>
    <p class="m" style="margin:4px 0 10px">O Laboratório de Virais lê o YouTube em alta com a YouTube Data API v3 (grátis, 10 mil unidades por dia). Pode ser a mesma chave do Google, desde que a API esteja ativada no projeto dela. A pesquisa no Google usa a chave do Gemini, e a Wikipedia não precisa de chave.</p>
    <div class="field"><label for="k-yt">Chave da YouTube Data API (deixe vazio pra usar a do Google)</label><div style="display:flex;gap:6px"><input id="k-yt" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(c.keys.youtube||"")}"><button type="button" class="btn ghost small" data-show="k-yt" aria-label="Mostrar chave">👁</button></div></div>
    <div class="btns" style="margin-top:4px"><button class="btn small" id="yttest">Salvar e testar o YouTube</button></div>
    ${admMsg.yt?`<div class="${admMsg.yt.ok?"status":"err"}" style="${admMsg.yt.ok?"color:var(--ok)":""}">${esc(admMsg.yt.text)}</div>`:""}
  </section>
  <section class="card" style="padding:14px;margin-bottom:12px">
    <h3 style="margin:0">🌗 Parque</h3>
    <div class="row" style="margin-top:10px"><div class="field"><label for="ptime">Dia e noite</label><select id="ptime">${[["auto","Automático (horário de Brasília)"],["dia","Sempre de dia"],["noite","Sempre de noite"]].map(([v,t])=>`<option value="${v}" ${((S.park||{}).time||"auto")===v?"selected":""}>${t}</option>`).join("")}</select></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:4px 0"><input type="checkbox" id="pamb" ${(S.park||{}).amb!==false?"checked":""}> Sons de natureza bem baixinho (passarinhos de dia, grilos à noite)</label>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:4px 0"><input type="checkbox" id="palert" ${(S.park||{}).alert!==false?"checked":""}> Som 8-bit quando um vídeo fica pronto</label>
    <div class="btns" style="margin-top:6px"><button class="btn ghost small" id="ptest">🔊 Testar o som de pronto</button></div>
  </section>
  <div class="note">Defina um limite mensal de gasto no painel de cada provedor. Nunca cole chaves no código nem no repositório: o site é público, as chaves não.</div>
  <div class="btns"><button class="btn ghost small" id="aclear">Apagar todas as chaves deste navegador</button></div>`; };
BIND.admin=el=>{
  Object.keys(AI.STAGES).forEach(st=>{
    bindPills(el,"prov-"+st,v=>{ AI.setStage(st,{provider:v,model:"",...(st==="text"?{quick:""}:{})}); const ids=AI.cachedModels(v,st); if(ids.length) AI.setStage(st,{model:AI.pickDefault(st,ids),...(st==="text"?{quick:AI.pickQuick(ids)}:{})}); admMsg[st]=null; renderPanel();
      if(!ids.length && !AI.PROVIDERS[v].noKey && AI.get().keys[v]){ const b=document.querySelector(`[data-test="${st}"]`); if(b) b.click(); } });
  });
  el.querySelectorAll("[data-key]").forEach(i=>i.onchange=()=>{ AI.setKey(i.dataset.key,i.value); });
  const fb=el.querySelector("[data-fbpaid]"); if(fb) fb.onchange=()=>AI.setStage("image",{fallbackPaid:fb.checked});
  el.querySelectorAll("[data-show]").forEach(b=>b.onclick=()=>{ const i=el.querySelector("#"+b.dataset.show); i.type=i.type==="password"?"text":"password"; });
  el.querySelectorAll("[data-model]").forEach(i=>i.onchange=()=>{ const [st,f]=i.dataset.model.split(":"); AI.setStage(st,{[f]:i.value.trim()}); renderPanel(); showInfo(null); });
  el.querySelectorAll("[data-test]").forEach(b=>b.onclick=async()=>{
    const st=b.dataset.test, inp=el.querySelector("#k-"+st);
    AI.setKey(inp.dataset.key,inp.value);
    b.disabled=true; b.innerHTML=`<span class="spin"></span> Testando…`;
    try{
      const p=AI.get()[st].provider; const ids=await AI.listModels(p,st); const cur=AI.get()[st];
      const patch={}; if(!cur.model||!ids.includes(cur.model)) patch.model=AI.pickDefault(st,ids);
      if(st==="text"&&!cur.quick) patch.quick=AI.pickQuick(ids);
      AI.setStage(st,patch);
      admMsg[st]= ids.length ? {ok:true,text:`✓ Chave aceita. ${ids.length} modelo${ids.length>1?"s":""} disponíve${ids.length>1?"is":"l"} pra ${AI.STAGES[st].name.toLowerCase()}.`}
                             : {ok:false,text:"A chave funciona, mas esta conta não tem modelos pra esta etapa. Escolha outro provedor."};
      // a mesma chave serve pras outras etapas do mesmo provedor: carrega os modelos delas também
      for(const o of Object.keys(AI.STAGES)){
        if(o===st||AI.get()[o].provider!==p) continue;
        try{ const ids2=await AI.listModels(p,o); const c2=AI.get()[o];
          if(!c2.model||!ids2.includes(c2.model)) AI.setStage(o,{model:AI.pickDefault(o,ids2)});
          admMsg[o]= ids2.length?{ok:true,text:`✓ Configurado junto com ${AI.STAGES[st].name}. ${ids2.length} modelo${ids2.length>1?"s":""} disponíve${ids2.length>1?"is":"l"}.`}:{ok:false,text:"Esta conta não tem modelos pra esta etapa. Escolha outro provedor."};
        }catch(e){}
      }
    }catch(e){ admMsg[st]={ok:false,text:e.message||"Não deu pra testar a chave."}; }
    renderPanel(); showInfo(null); renderProd();
  });
  el.querySelector("#yttest").onclick=async e=>{ const b=e.currentTarget; AI.setKey("youtube",el.querySelector("#k-yt").value); b.disabled=true; b.innerHTML=`<span class="spin"></span> Testando…`;
    try{ await Trends.testYouTube(); admMsg.yt={ok:true,text:"✓ O YouTube respondeu. O Laboratório de Virais já pode ler o que está em alta."}; }
    catch(err){ admMsg.yt={ok:false,text:err.message||"Não deu certo"}; } renderPanel(); };
  const pk=()=>{ if(!S.park) S.park={time:"auto",amb:true,alert:true}; return S.park; };
  el.querySelector("#ptime").onchange=e=>{ pk().time=e.target.value; save(); if(typeof updateDaylight==="function") updateDaylight(); };
  el.querySelector("#pamb").onchange=e=>{ pk().amb=e.target.checked; save(); };
  el.querySelector("#palert").onchange=e=>{ pk().alert=e.target.checked; save(); };
  el.querySelector("#ptest").onclick=()=>{ if(typeof ParkAudio!=="undefined") ParkAudio.jingle(); };
  el.querySelector("#aclear").onclick=()=>{ AI.clearAll(); admMsg={}; toast("Chaves apagadas deste navegador"); renderPanel(); };
};

