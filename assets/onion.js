/* ============ STATE ============ */
const KEY = "onion-park-v1";
const S = load() || {
  config:null, viraisRegion:"Estados Unidos", viraisNicho:"", viraisResults:[], ideias:[], selIdea:null,
  project:null, library:[]
};
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null }catch(e){ return null } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)) }catch(e){} }
let busy = null; // {k, role, action, ctl, cancel}

const STAGES = ["titulos","roteiro","descricao","capa","imagens","narracao","montagem"];
const STAGE_LABEL = {titulos:"Título",roteiro:"Roteiro",descricao:"Descrição",capa:"Capa",imagens:"Imagens",narracao:"Voz",montagem:"Edição"};
function isUnlocked(k){
  if (k==="virais"||k==="ideias"||k==="arquivo"||k==="admin") return true;
  const P=S.project; if(!P) return false;
  const i=STAGES.indexOf(k); for(let j=0;j<i;j++) if(!P.done[STAGES[j]]) return false;
  return true;
}
function nextStage(){
  if(!AI.ready()) return "admin";
  const P=S.project; if(!P) return S.ideias.length?"ideias":"virais";
  for(const s of STAGES) if(!P.done[s]) return s;
  return null;
}

/* ============ OPTIONS ============ */
const NICHOS=["Orações","Histórias Bíblicas","Mistérios e Casos Não Resolvidos","História Antiga","Curiosidades Científicas","Espaço e Astronomia","Psicologia e Comportamento","Finanças Pessoais","Milionários e Histórias de Sucesso","Motivação e Disciplina","Meditação e Mindfulness","Realeza e Dinastias","True Crime","Saúde 60+","Receitas e Culinária","Outro"];
const PUBLICOS=["Americanos 50+","Americanos 25–45","Britânicos 40+","Global em inglês","Hispânicos nos EUA","Brasileiros adultos"];
const FORMATOS=["Motivacional / Discurso","Documentário","Narrativa / História","Lista (Top 10)","Explicativo","Oração guiada"];
const GANCHOS=["História pessoal","Pergunta intrigante","Fato chocante","Promessa direta","Mistério em aberto"];
const IDIOMAS=[["Português","🇧🇷","pt-BR"],["Inglês","🇺🇸","en-US"],["Espanhol","🇪🇸","es-ES"],["Francês","🇫🇷","fr-FR"],["Alemão","🇩🇪","de-DE"],["Japonês","🇯🇵","ja-JP"],["Hindi","🇮🇳","hi-IN"],["Árabe","🇸🇦","ar-SA"]];
const REGIOES=["Mundo todo","Estados Unidos","Reino Unido","Canadá","Austrália","Brasil","Índia","Alemanha"];
const STYLES=[["Cinemático realista","#2b3a4a","#c9a26b"],["Pintura a óleo","#5a3a1e","#d8a35a"],["Aquarela suave","#9ec5d8","#f2d6e3"],["Natureza sagrada","#24452c","#e8d27a"],["Documentário sci-fi","#0f2a3d","#4fd1e8"],["Gravura medieval","#3a3226","#cbbd9a"],["Polaroid vintage","#a88f6a","#efe1c2"],["Massinha (claymation)","#d86a4a","#f6c35a"],["Livro infantil","#f0b46a","#9ad0e8"],["Anime cinematográfico","#3a2a6a","#ff9ac8"],["Pixel art","#2a2a4a","#7cff9a"],["Noir em P&B","#111111","#9a9a9a"],["Isométrico 3D","#4a6aff","#ffd36a"],["Quadro de true crime","#2a1a14","#d84a3a"],["Ilustração médica","#e8eef2","#d85a6a"],["Low poly 3D","#3a7a9a","#f2a65a"],["Zen minimalista","#e8e4dc","#9aa88a"],["Surreal conceitual","#3a1a4a","#ff8a3a"],["Whiteboard animado","#f4f4f4","#3a3a3a"],["Stop motion","#7a4a2a","#e8c08a"],["Jornal antigo","#d8d0bc","#4a4436"],["Luz divina","#f2e2b0","#ffffff"],["Editorial de luxo","#1a1a1a","#d4af37"],["Origami","#f2efe6","#e86a5a"]];
const VOICES={
  "ElevenLabs":[["Roger","masculina, calma, ressonante","#5b6ee1"],["George","masculina, contador de histórias","#7a5be1"],["Brian","masculina, grave, madura","#3a7ae1"],["Sarah","feminina, madura, confiante","#e15b9a"],["Lily","feminina, suave, britânica","#c75be1"],["Bella","feminina, calorosa","#e17a5b"]],
  "Minimax":[["Mature Partner","masculina, madura","#2e8b57"],["Wise Woman","feminina, sábia","#8b2e6b"],["Deep Narrator","masculina, documentário","#2e5e8b"]],
  "Fish Audio":[["Storyteller","masculina, expressiva","#b07a2e"],["Gentle Voice","feminina, gentil","#2e9bb0"]],
  "Edge (econômica)":[["Guy","masculina, neutra","#6a6a7a"],["Jenny","feminina, neutra","#7a6a6a"]]
};
const TEMPLATES=["Oração serena","Noite de fé","Luz divina","Salmo","Documentário escuro","Mistério","Clean"];
const CAPTIONS=["Palavra por palavra","Frase curta","Karaokê"];

/* ============ BUILDINGS ============ */
const B=[
 {k:"virais",n:"Laboratório de Virais",gx:3,gy:3,w:9,d:7,c:"#ff7a59",role:"Analista",idle:"de olho nas tendências",desc:"Escolha uma região e a equipe levanta temas com potencial de viralizar. Mande os melhores pro Laboratório de Ideias."},
 {k:"ideias",n:"Laboratório de Ideias",gx:16,gy:2,w:9,d:8,c:"#f2c14e",role:"Produtor",idle:"organizando a fila",desc:"Guarda as configurações do canal e a fila de ideias. Escolha uma e comece a produção."},
 {k:"titulos",n:"Torre dos Títulos",gx:29,gy:3,w:7,d:7,c:"#6fd3a6",role:"Copywriter",step:1,h:24,desc:"Cria 10 títulos com ângulos e gatilhos diferentes. O roteiro inteiro é escrito pro título que você escolher."},
 {k:"arquivo",n:"Arquivo e Datacenter",gx:39,gy:2,w:6,d:9,c:"#7aa7ff",desc:"Onde ficam guardados os vídeos prontos. Abra pra ver e baixar tudo o que já foi produzido."},
 {k:"roteiro",n:"Prédio dos Roteiros",gx:3,gy:15,w:10,d:7,c:"#a98bff",role:"Roteirista",step:2,desc:"Escreve o roteiro em blocos, com gancho, contexto e desenvolvimento, conectando as partes pra segurar a atenção."},
 {k:"descricao",n:"Redação",gx:17,gy:16,w:7,d:5,c:"#5fd0e0",role:"Redator",step:3,desc:"Lê o roteiro inteiro e escreve a descrição, com convite pra se inscrever, uma pergunta e hashtags."},
 {k:"capa",n:"Ateliê de Capas",gx:28,gy:15,w:8,d:6,c:"#ff6fae",role:"Diretor de arte",step:4,desc:"Cria 4 versões de capa com frase de impacto. A marcada é a que vai pro vídeo."},
 {k:"imagens",n:"Prédio das Imagens",gx:3,gy:27,w:10,d:7,c:"#e05be0",role:"Ilustrador",step:5,desc:"Divide o roteiro em cenas, escreve um prompt pra cada uma e gera as imagens no estilo escolhido."},
 {k:"narracao",n:"Estúdio de Narração",gx:17,gy:27,w:7,d:6,c:"#ffa94d",role:"Narrador",step:6,dark:true,desc:"Grava o roteiro com a voz escolhida, no ritmo certo pro seu público."},
 {k:"admin",n:"Administração",gx:41,gy:28,w:4,d:5,c:"#9aa3b5",role:"Gestor",desc:"Onde ficam as chaves das APIs e as preferências do Onion. Comece por aqui."},
 {k:"montagem",n:"OnionCut",gx:30,gy:27,w:10,d:8,c:"#c86bff",role:"Editor",step:7,desc:"O montador automático: junta cenas, voz e legendas, corta nas pausas da narração e entrega o vídeo."},
];
const BK=Object.fromEntries(B.map(b=>[b.k,b]));

/* ============ WORLD / ISO ============ */
const TW=16, TH=8, GW=46, GH=37;
const OX=GH*TW/2+40, OY=90;
const WORLD_W=(GW+GH)*TW/2+80, WORLD_H=(GW+GH)*TH/2+150;
function W(gx,gy){ return [(gx-gy)*TW/2+OX, (gx+gy)*TH/2+OY]; }
function rng(seed){ return ()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; } }
const R=rng(7);

function isPath(x,y){ return (y===12||y===13||y===24||y===25||x===14||x===15||x===26||x===27); }
function inPlaza(x,y){ return x>=24&&x<=29&&y>=22&&y<=26; }
function inPond(x,y){ const dx=(x-41.5)/3.6, dy=(y-17.5)/3.1; return dx*dx+dy*dy<1; }
function inBuilding(x,y,m=0){ return B.some(b=>x>=b.gx-m&&x<b.gx+b.w+m&&y>=b.gy-m&&y<b.gy+b.d+m); }
function tileType(x,y){
  if(inPond(x,y)) return "water";
  if(inPlaza(x,y)) return "plaza";
  if(inBuilding(x,y)) return "lot";
  if(isPath(x,y)&&x>0&&y>0&&x<GW-1&&y<GH-1) return "path";
  return "grass";
}

// static ground
const ground=document.createElement("canvas"); ground.width=WORLD_W; ground.height=WORLD_H;
(function paintGround(){
  const g=ground.getContext("2d");
  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
    const t=tileType(x,y); const n=R();
    let col;
    if(t==="grass") col=((x+y)%2? "#2d4f34":"#2a4a31"); 
    if(t==="grass"&&n<.12) col="#33583a";
    if(t==="path") col=n<.5?"#7d6a4f":"#786449";
    if(t==="plaza") col=((x+y)%2?"#5e566c":"#585066");
    if(t==="water") col=n<.5?"#24476e":"#21426a";
    if(t==="lot") col="#2a3a30";
    const [a,b]=W(x,y),[c,d]=W(x+1,y),[e,f]=W(x+1,y+1),[h,i]=W(x,y+1);
    g.fillStyle=col; g.beginPath(); g.moveTo(a,b); g.lineTo(c,d); g.lineTo(e,f); g.lineTo(h,i); g.closePath(); g.fill();
    if(t==="water"&&n<.15){ g.fillStyle="#4a77a8"; g.fillRect(Math.round((a+e)/2)-2,Math.round((b+f)/2),4,1); }
    if(t==="grass"&&n>.93){ g.fillStyle="#d9c46a"; g.fillRect(Math.round((a+e)/2),Math.round((b+f)/2),1,1); }
  }
  // map edge
  const [ax,ay]=W(0,GH),[bx,by]=W(GW,GH),[cx,cy]=W(GW,0);
  g.fillStyle="#1d3324";
  g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.lineTo(bx,by+10); g.lineTo(ax,ay+10); g.fill();
  g.fillStyle="#18291e";
  g.beginPath(); g.moveTo(bx,by); g.lineTo(cx,cy); g.lineTo(cx,cy+10); g.lineTo(bx,by+10); g.fill();
})();

// trees & lamps
const trees=[], lamps=[];
for(let i=0;i<900;i++){
  const x=R()*GW, y=R()*GH; const tx=Math.floor(x), ty=Math.floor(y);
  const edge = tx<3||ty<2||tx>GW-4||ty>GH-3;
  if(!edge && R()<.72) continue;
  if(tileType(tx,ty)!=="grass") continue;
  if(inBuilding(tx,ty,1)||inPlaza(tx,ty)) continue;
  let near=false; for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++) if(isPath(tx+dx,ty+dy)&&!edge) near=true;
  if(near && R()<.8) continue;
  trees.push({x,y,pine:R()<.35,s:R()<.3?1:0,k:R()});
}
for(let x=2;x<GW-1;x+=6){ lamps.push({x:x+.5,y:11.6}); lamps.push({x:x+.5,y:26.4}); }
for(let y=4;y<GH-1;y+=7){ lamps.push({x:13.6,y:y+.5}); lamps.push({x:28.4,y:y+.5}); }

// walkers on path tiles
const pathTiles=[]; for(let y=0;y<GH;y++)for(let x=0;x<GW;x++) if(tileType(x,y)==="path"||tileType(x,y)==="plaza") pathTiles.push([x,y]);
const SKIN=["#f1c7a5","#d9a37c","#a8714a","#7a4b2e","#e8b48f"], HAIR=["#2b1d14","#5a3a1e","#c99a4a","#1a1a1a","#8a8a8a","#a33a2a"], SHIRT=["#6a4bd1","#3a7ae1","#d14b8f","#2e8b57","#e1a13a","#555b70"];
function person(){ return {skin:SKIN[R()*SKIN.length|0],hair:HAIR[R()*HAIR.length|0],shirt:SHIRT[R()*SHIRT.length|0]}; }
const walkers=[];
for(let i=0;i<34;i++){ const p=pathTiles[R()*pathTiles.length|0]; walkers.push({x:p[0]+.5,y:p[1]+.5,tx:p[0]+.5,ty:p[1]+.5,...person(),sp:.025+R()*.02}); }
// seated agents per building
B.forEach(b=>{
  b.desks=[];
  if(b.k==="arquivo") return;
  for(let i=1.4;i<b.w-.8;i+=1.7) for(let j=1.6;j<b.d-.6;j+=1.9) b.desks.push({x:b.gx+i,y:b.gy+j,...person(),ph:R()*8|0});
});
document.getElementById("agents").textContent = B.reduce((a,b)=>a+b.desks.length,0)+walkers.length;

/* ============ RENDER ============ */
const cv=document.getElementById("park"), ctx=cv.getContext("2d");
const low=document.createElement("canvas"), lc=low.getContext("2d");
let zoom=2, camX=0, camY=0, vw=0, vh=0, dpr=1, frame=0, hoverK=null;

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  vw=window.innerWidth; vh=window.innerHeight;
  cv.width=vw*dpr; cv.height=vh*dpr;
  low.width=Math.ceil(vw/zoom)+2; low.height=Math.ceil(vh/zoom)+2;
  clampCam();
}
function center(){
  zoom = vw<720?2:(vw>1500?3:2);
  low.width=Math.ceil(vw/zoom)+2; low.height=Math.ceil(vh/zoom)+2;
  camX=WORLD_W/2-vw/zoom/2; camY=WORLD_H/2-vh/zoom/2+10; clampCam();
}
function clampCam(){
  const mw=vw/zoom, mh=vh/zoom;
  camX=Math.max(-mw*.4,Math.min(WORLD_W-mw*.6,camX));
  camY=Math.max(-mh*.4,Math.min(WORLD_H-mh*.6,camY));
}
function hexA(c,a){ const n=parseInt(c.slice(1),16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; }
function poly(g,pts,fill,stroke){ g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) g.lineTo(pts[i][0],pts[i][1]); g.closePath(); if(fill){g.fillStyle=fill; g.fill();} if(stroke){g.strokeStyle=stroke; g.lineWidth=1; g.stroke();} }
function up(p,h){ return [p[0],p[1]-h]; }

function drawPerson(g,x,y,p,bob,walkPhase){
  x=Math.round(x); y=Math.round(y)-(bob?1:0);
  g.fillStyle="rgba(0,0,0,.25)"; g.fillRect(x-2,y,4,1);
  g.fillStyle="#2a2433";
  if(walkPhase!==undefined){ g.fillRect(x-1+(walkPhase?0:1)-1,y-2,1,2); g.fillRect(x+(walkPhase?1:0),y-2,1,2); }
  g.fillStyle=p.shirt; g.fillRect(x-2,y-5,4,3);
  g.fillStyle=p.skin; g.fillRect(x-1,y-8,3,3);
  g.fillStyle=p.hair; g.fillRect(x-1,y-9,3,1);
}
function drawTree(g,t){
  const [x0,y0]=W(t.x,t.y); const x=Math.round(x0), y=Math.round(y0);
  g.fillStyle="rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x,y,5,2,0,0,7); g.fill();
  g.fillStyle="#4a3424"; g.fillRect(x-1,y-4,2,4);
  if(t.pine){
    const c=t.k<.5?"#1f4a2e":"#245535";
    for(let i=0;i<3;i++){ g.fillStyle=i===0?c:(i===1?"#2a5f3b":"#2f6b42"); g.beginPath(); g.moveTo(x,y-18+i*4); g.lineTo(x-6+i,y-6-i*2+i*4); g.lineTo(x+6-i,y-6-i*2+i*4); g.fill(); }
  } else {
    const r=t.s?6:5;
    g.fillStyle="#1f4a2c"; g.beginPath(); g.arc(x,y-8,r,0,7); g.fill();
    g.fillStyle="#2c6a3c"; g.beginPath(); g.arc(x-1,y-9,r-1.5,0,7); g.fill();
    g.fillStyle="#3c8048"; g.fillRect(x-3,y-12,2,2);
  }
}
function drawLamp(g,l){
  const [x0,y0]=W(l.x,l.y); const x=Math.round(x0), y=Math.round(y0);
  const gr=g.createRadialGradient(x,y-11,0,x,y-11,18); gr.addColorStop(0,"rgba(255,201,110,.35)"); gr.addColorStop(1,"rgba(255,201,110,0)");
  g.fillStyle=gr; g.fillRect(x-18,y-29,36,36);
  g.fillStyle="#2a2433"; g.fillRect(x,y-11,1,11);
  g.fillStyle="#ffd58a"; g.fillRect(x-1,y-13,3,2);
}
function drawOnion(g,cx,cy,r){
  cx=Math.round(cx); cy=Math.round(cy);
  g.fillStyle="#7cc95a"; g.fillRect(cx,cy-r*1.6,1,r*.7); g.fillRect(cx-2,cy-r*1.45,1,r*.5); g.fillRect(cx+2,cy-r*1.5,1,r*.55);
  g.fillStyle="#8a2f7c"; g.beginPath(); g.moveTo(cx,cy-r*1.05); g.quadraticCurveTo(cx+r*1.25,cy-r*.3,cx+r*.9,cy+r*.55); g.quadraticCurveTo(cx,cy+r*1.1,cx-r*.9,cy+r*.55); g.quadraticCurveTo(cx-r*1.25,cy-r*.3,cx,cy-r*1.05); g.fill();
  g.strokeStyle="#c66bb5"; g.lineWidth=1;
  g.beginPath(); g.moveTo(cx,cy-r); g.quadraticCurveTo(cx-r*.55,cy,cx-r*.3,cy+r*.8); g.stroke();
  g.beginPath(); g.moveTo(cx,cy-r); g.quadraticCurveTo(cx+r*.55,cy,cx+r*.3,cy+r*.8); g.stroke();
  g.fillStyle="#e3a8d8"; g.fillRect(cx-r*.5,cy-r*.3,2,3);
  g.fillStyle="#e8d6b0"; g.fillRect(cx-2,cy+r*.85,1,2); g.fillRect(cx,cy+r*.9,1,3); g.fillRect(cx+2,cy+r*.85,1,2);
}
function drawBox(g,gx,gy,w,d,h,top,lf,rt){
  const p00=W(gx,gy),p10=W(gx+w,gy),p11=W(gx+w,gy+d),p01=W(gx,gy+d);
  poly(g,[p01,p11,up(p11,h),up(p01,h)],lf);
  poly(g,[p10,p11,up(p11,h),up(p10,h)],rt);
  poly(g,[up(p00,h),up(p10,h),up(p11,h),up(p01,h)],top);
}
function buildingHull(b){
  const H=b.h||14;
  const p00=W(b.gx,b.gy),p10=W(b.gx+b.w,b.gy),p11=W(b.gx+b.w,b.gy+b.d),p01=W(b.gx,b.gy+b.d);
  return [p01,p11,p10,up(p10,H),up(p00,H),up(p01,H)];
}
function drawBuilding(g,b){
  const locked=!isUnlocked(b.k), isBusy=busy&&busy.k===b.k, hot=hoverK===b.k;
  const H=b.h||14, c=b.c;
  const p00=W(b.gx,b.gy),p10=W(b.gx+b.w,b.gy),p11=W(b.gx+b.w,b.gy+b.d),p01=W(b.gx,b.gy+b.d);
  if(b.k==="arquivo"){
    poly(g,[p00,p10,p11,p01],"#2d3446");
    for(let i=0;i<b.w-1;i+=1.5) drawBox(g,b.gx+.6+i,b.gy+.8,.9,b.d-1.6,13,"#3d4560","#262c3e","#1d2232");
    for(let i=0;i<b.w-1;i+=1.5) for(let j=0;j<b.d-2;j+=.8){
      const [x,y]=W(b.gx+.6+i+.9,b.gy+1+j); if(((frame>>2)+i*7+j*13|0)%5===0) continue;
      g.fillStyle=((i*3+j*5)|0)%3?"#5fe08a":"#7aa7ff"; g.fillRect(Math.round(x)+1,Math.round(y)-9,1,1);
    }
    // roof units
    for(let i=0;i<3;i++) drawBox(g,b.gx+b.w-1.4,b.gy+1+i*2.6,1.1,1.6,6,"#8a93a8","#5d657a","#4a5166");
    if(hot) poly(g,buildingHull(b),null,"#ffffff");
    return;
  }
  const floor = locked ? "#3a3546" : (b.dark?"#2c2540":"#d7d0e0");
  poly(g,[p00,p10,p11,p01],floor);
  // floor glow
  if(!locked){ g.globalAlpha=.10; poly(g,[p00,p10,p11,p01],c); g.globalAlpha=1; }
  // back walls
  const wa=locked?.10:.22;
  poly(g,[p01,p00,up(p00,H),up(p01,H)],hexA(c,wa));
  poly(g,[p00,p10,up(p10,H),up(p00,H)],hexA(c,wa));
  g.strokeStyle=hexA(c,locked?.35:.9); g.lineWidth=1;
  g.beginPath(); g.moveTo(...up(p01,H)); g.lineTo(...up(p00,H)); g.lineTo(...up(p10,H)); g.stroke();
  // tall tower mid floor
  if(H>16){ g.strokeStyle=hexA(c,.5); g.beginPath(); g.moveTo(...up(p01,H/2)); g.lineTo(...up(p00,H/2)); g.lineTo(...up(p10,H/2)); g.stroke(); }
  // desks
  b.desks.forEach((dk,i)=>{
    const [x0,y0]=W(dk.x,dk.y); const x=Math.round(x0), y=Math.round(y0);
    const working=isBusy && ((frame+dk.ph)>>3)%3!==0;
    g.fillStyle=locked?"#2a2533":"#4a3f5c"; g.fillRect(x-4,y-3,8,2);
    g.fillStyle="#1a1622"; g.fillRect(x-2,y-7,5,4);
    g.fillStyle= locked?"#2a2533" : (working ? (((frame+i)>>1)%4?c:"#ffffff") : hexA(c,.55));
    g.fillRect(x-1,y-6,3,2);
    if(!locked||i%3===0) drawPerson(g,x+1,y+3,dk,working&&((frame+dk.ph)>>2)%2);
  });
  if(b.k==="montagem" && !locked){
    const [cx,cy]=W(b.gx+b.w/2,b.gy+b.d/2);
    const bob=Math.sin(frame/12)*1.5;
    const gr=g.createRadialGradient(cx,cy-30,0,cx,cy-30,28); gr.addColorStop(0,"rgba(200,107,255,.35)"); gr.addColorStop(1,"rgba(200,107,255,0)");
    g.fillStyle=gr; g.fillRect(cx-30,cy-60,60,60);
    drawOnion(g,cx,cy-30+bob,9);
  }
  // front walls
  poly(g,[p01,p11,up(p11,H),up(p01,H)],hexA(c,locked?.06:.12));
  poly(g,[p10,p11,up(p11,H),up(p10,H)],hexA(c,locked?.05:.10));
  g.strokeStyle=hexA(c,locked?.4:1);
  g.beginPath(); g.moveTo(...up(p01,H)); g.lineTo(...up(p11,H)); g.lineTo(...up(p10,H)); g.stroke();
  g.beginPath(); g.moveTo(...p01); g.lineTo(...p11); g.lineTo(...p10); g.stroke();
  for(let i=0;i<=b.w;i+=2){ const p=W(b.gx+i,b.gy+b.d); g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(p[0],p[1]-H); g.stroke(); }
  for(let j=0;j<=b.d;j+=2){ const p=W(b.gx+b.w,b.gy+j); g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(p[0],p[1]-H); g.stroke(); }
  if(hot){ g.lineWidth=1; poly(g,buildingHull(b),null,"#ffffff"); }
}

function drawStatue(g){
  drawBox(g,26.2,23.2,1.6,1.6,5,"#8a8396","#6a6378","#57506a");
  const [x,y]=W(27,24); drawOnion(g,x,y-14,6);
}

function render(){
  frame++;
  // update walkers
  walkers.forEach(w=>{
    if(w.courier){
      w.t+=1/90; const e=Math.min(1,w.t);
      w.x=w.fx+(w.tox-w.fx)*e; w.y=w.fy+(w.toy-w.fy)*e;
      if(w.t>=1.15) w.dead=true; return;
    }
    const dx=w.tx-w.x, dy=w.ty-w.y, dist=Math.hypot(dx,dy);
    if(dist<.05){
      const cx=Math.floor(w.x), cy=Math.floor(w.y);
      const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[cx+a,cy+b]).filter(([a,b])=>{const t=tileType(a,b); return t==="path"||t==="plaza";});
      if(opts.length){ const o=opts[R()*opts.length|0]; w.tx=o[0]+.5; w.ty=o[1]+.5; }
    } else { w.x+=dx/dist*w.sp; w.y+=dy/dist*w.sp; }
  });
  for(let i=walkers.length-1;i>=0;i--) if(walkers[i].dead) walkers.splice(i,1);

  const g=lc;
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle="#141a16"; g.fillRect(0,0,low.width,low.height);
  const cx=Math.round(camX), cy=Math.round(camY);
  g.translate(-cx,-cy);
  g.drawImage(ground,0,0);
  // objects sorted by depth
  const objs=[];
  trees.forEach(t=>objs.push({d:t.x+t.y,f:()=>drawTree(g,t)}));
  lamps.forEach(l=>objs.push({d:l.x+l.y,f:()=>drawLamp(g,l)}));
  walkers.forEach(w=>objs.push({d:w.x+w.y,f:()=>{ const [x,y]=W(w.x,w.y); drawPerson(g,x,y,w,false,(frame>>3)%2);
    if(w.courier){ g.fillStyle="#f2c14e"; g.fillRect(Math.round(x)-2,Math.round(y)-14,5,4); g.fillStyle="#b8862a"; g.fillRect(Math.round(x)-2,Math.round(y)-14,5,1);} }}));
  B.forEach(b=>objs.push({d:b.gx+b.gy+(b.w+b.d)/2,f:()=>drawBuilding(g,b)}));
  objs.push({d:27+24,f:()=>drawStatue(g)});
  objs.sort((a,b)=>a.d-b.d).forEach(o=>o.f());
  // night tint
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle="rgba(20,16,50,.12)"; g.fillRect(0,0,low.width,low.height);

  ctx.setTransform(1,0,0,1,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(low,0,0,low.width,low.height,-(camX-cx)*zoom*dpr,-(camY-cy)*zoom*dpr,low.width*zoom*dpr,low.height*zoom*dpr);
  drawLabels();
}
function toScreen(wx,wy){ return [(wx-camX)*zoom, (wy-camY)*zoom]; }
function drawLabels(){
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const ns=nextStage();
  B.forEach(b=>{
    const H=b.h||14;
    const [wx,wy]=W(b.gx+b.w/2,b.gy); const [x,y]=toScreen(wx,wy-H-6);
    if(x<-200||x>vw+200||y<-60||y>vh+60) return;
    const locked=!isUnlocked(b.k);
    ctx.font=`600 ${zoom>=3?15:13}px "Pixelify Sans", monospace`;
    const txt=(locked?"🔒 ":"")+b.n;
    const tw=ctx.measureText(txt).width;
    const bx=Math.round(x-tw/2-14), by=Math.round(y-12), bw=Math.round(tw+24), bh=zoom>=3?24:21;
    ctx.fillStyle=locked?"rgba(26,20,36,.75)":"rgba(26,20,36,.92)";
    ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle=locked?"rgba(255,255,255,.15)":b.c; ctx.lineWidth=1; ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
    ctx.fillStyle=b.c; ctx.fillRect(bx+6,by+bh/2-3,6,6);
    ctx.fillStyle=locked?"#9a90a8":"#f3eefa"; ctx.textBaseline="middle"; ctx.fillText(txt,bx+16,by+bh/2+1);
    if(busy&&busy.k===b.k){
      ctx.font=`500 12px "Figtree", sans-serif`;
      const t1=busy.role||b.role, t2=busy.action||"trabalhando";
      const w2=Math.max(ctx.measureText(t1).width,ctx.measureText(t2).width)+20;
      const yb=by+bh+6;
      ctx.fillStyle="#fbf9fd"; ctx.fillRect(Math.round(x-w2/2),yb,Math.round(w2),36);
      ctx.fillStyle=b.c; ctx.fillRect(Math.round(x-w2/2),yb,3,36);
      ctx.fillStyle="#6c5f7b"; ctx.fillText(t1,Math.round(x-w2/2)+10,yb+11);
      ctx.fillStyle="#231a2e"; ctx.font=`700 12px "Figtree", sans-serif`; ctx.fillText(t2,Math.round(x-w2/2)+10,yb+26);
    } else if(ns===b.k && !busy){
      const bob=Math.round(Math.sin(frame/6)*3);
      ctx.fillStyle="#f2c14e";
      ctx.beginPath(); ctx.moveTo(x-7,by-14+bob); ctx.lineTo(x+7,by-14+bob); ctx.lineTo(x,by-5+bob); ctx.fill();
    }
  });
}

let last=0;
function loop(t){ if(t-last>48){ last=t; render(); } requestAnimationFrame(loop); }

/* ============ INPUT ============ */
let drag=null;
function worldAt(sx,sy){ return [sx/zoom+camX, sy/zoom+camY]; }
function hitBuilding(sx,sy){
  const [wx,wy]=worldAt(sx,sy);
  for(let i=B.length-1;i>=0;i--){
    const b=B[i]; const h=buildingHull(b);
    if(pointInPoly(wx,wy,h)) return b;
  }
  // label hit
  for(const b of B){ const H=b.h||14; const [lx,ly]=W(b.gx+b.w/2,b.gy); const [x,y]=toScreen(lx,ly-H-6); if(Math.abs(sx-x)<90&&sy>y-14&&sy<y+12) return b; }
  return null;
}
function pointInPoly(x,y,pts){ let ins=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const [xi,yi]=pts[i],[xj,yj]=pts[j]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) ins=!ins; } return ins; }
cv.addEventListener("pointerdown",e=>{ drag={x:e.clientX,y:e.clientY,cx:camX,cy:camY,moved:false}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove",e=>{
  if(drag){ const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(Math.abs(dx)+Math.abs(dy)>5){ drag.moved=true; cv.classList.add("drag"); } if(drag.moved){ camX=drag.cx-dx/zoom; camY=drag.cy-dy/zoom; clampCam(); } return; }
  const b=hitBuilding(e.clientX,e.clientY); const k=b?b.k:null;
  if(k!==hoverK){ hoverK=k; cv.classList.toggle("hover",!!b); showInfo(b||BK[nextStage()]||null); }
});
cv.addEventListener("pointerup",e=>{
  cv.classList.remove("drag");
  if(drag&&!drag.moved){ const b=hitBuilding(e.clientX,e.clientY); if(b) openPanel(b.k); }
  drag=null;
});
cv.addEventListener("wheel",e=>{ e.preventDefault(); setZoom(zoom+(e.deltaY<0?1:-1),e.clientX,e.clientY); },{passive:false});
function setZoom(z,sx=vw/2,sy=vh/2){
  z=Math.max(1,Math.min(5,z)); if(z===zoom) return;
  const [wx,wy]=worldAt(sx,sy); zoom=z; camX=wx-sx/zoom; camY=wy-sy/zoom;
  low.width=Math.ceil(vw/zoom)+2; low.height=Math.ceil(vh/zoom)+2; clampCam();
}
document.getElementById("zoomIn").onclick=()=>setZoom(zoom+1);
document.getElementById("zoomOut").onclick=()=>setZoom(zoom-1);
document.getElementById("libBtn").onclick=()=>openPanel("arquivo");
document.getElementById("admBtn").onclick=()=>openPanel("admin");
window.addEventListener("resize",resize);
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closePanel(); });

/* ============ HUD ============ */
const t0=Date.now();
setInterval(()=>{ const s=(Date.now()-t0)/1000|0; document.getElementById("clock").textContent=[s/3600|0,(s/60|0)%60,s%60].map(n=>String(n).padStart(2,"0")).join(":"); },1000);
function showInfo(b){
  const el=document.getElementById("info");
  if(!b){ el.innerHTML=`<h2>Você no comando</h2><p>Cada prédio é uma etapa. Clique num prédio pra abrir as opções e mande o trabalho pro próximo.</p>`; return; }
  const locked=!isUnlocked(b.k);
  el.innerHTML=`<h2><span class="sq" style="background:${b.c}"></span>${esc(b.n)}</h2><p>${esc(b.desc)}</p><div class="hint">${b.step?`Etapa ${b.step} de 7 · `:""}${locked?"Bloqueado até a etapa anterior terminar":"Clique no prédio pra abrir"}</div>`;
}
function renderProd(){
  const el=document.getElementById("prod"); const P=S.project;
  el.classList.toggle("mobile", !!(busy||P) && vw<720 && !panelKey);
  if(!P){ el.innerHTML=`<div class="st">Nada em produção</div><div class="tt">Comece no Laboratório de Virais ou de Ideias</div><div class="bar"><i style="width:0"></i></div>`; return; }
  const done=STAGES.filter(s=>P.done[s]).length;
  const all=done===STAGES.length;
  el.innerHTML=`<div class="st">${busy?`<span class="spin"></span> ${esc(BK[busy.k].n)}: ${esc(busy.action||"trabalhando")}`:(all?"✓ Vídeo concluído":"Em produção")}</div>
  <div class="tt" title="${esc(P.title||P.idea.tema)}">${esc(P.title||P.idea.tema)}</div>
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
async function ask(prompt,{json=false,tier="default",onText}={}){
  const opts={tier,signal:busy&&busy.ctl.signal}; if(onText) opts.onText=onText;
  return json ? AI.json(prompt,opts) : AI.call(prompt,opts);
}
function aiNote(){
  if(!AI.ready()) return `<div class="note">A equipe de textos ainda não tem chave e modelo configurados. <button class="btn small" style="margin-top:6px" onclick="openPanel('admin')">Abrir Administração</button></div>`;
  return "";
}

/* ============ PANEL ============ */
let panelKey=null;
function openPanel(k){
  panelKey=k; const b=BK[k];
  document.getElementById("ptitle").innerHTML=esc(b.n)+(b.step?`<span class="step">Etapa ${b.step} de 7 · ${esc(b.role)}</span>`:`<span class="step">${k==="arquivo"?"Biblioteca":(k==="admin"?"Configurações":"Sempre aberto")}</span>`);
  document.getElementById("psq").style.background=b.c;
  document.getElementById("panel").classList.add("open"); document.getElementById("panel").setAttribute("aria-hidden","false");
  document.getElementById("scrim").classList.add("open");
  renderPanel(); renderProd();
  setTimeout(()=>document.getElementById("pclose").focus(),50);
}
function closePanel(){
  panelKey=null; document.getElementById("panel").classList.remove("open"); document.getElementById("panel").setAttribute("aria-hidden","true");
  document.getElementById("scrim").classList.remove("open"); renderProd();
}
document.getElementById("pclose").onclick=closePanel;
document.getElementById("scrim").onclick=closePanel;
function renderPanel(){
  if(!panelKey) return;
  const el=document.getElementById("pbody");
  const sc=el.scrollTop;
  if(!isUnlocked(panelKey)){ el.innerHTML=lockedView(panelKey); return; }
  el.innerHTML=(VIEWS[panelKey]||(()=>""))();
  el.scrollTop=sc;
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

/* ---- Virais ---- */
VIEWS.virais=()=>`
  <p class="lead">Escolha onde procurar. A equipe devolve temas com potencial de viralizar e você manda os que gostar pro Laboratório de Ideias.</p>
  <h3>Região</h3>${pills("reg",REGIOES,S.viraisRegion)}
  <div class="field" style="margin-top:12px"><label for="vn">Nicho (opcional)</label><input id="vn" value="${esc(S.viraisNicho)}" placeholder="Ex.: orações, mistérios históricos, finanças pra aposentados"></div>
  ${aiNote()}
  <div class="btns"><button class="btn" id="vgo" ${busy||!AI.ready()?"disabled":""}>✦ ${S.viraisResults.length?"Buscar outros temas":"Buscar temas"}</button>${busy&&busy.k==="virais"?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${busy&&busy.k==="virais"?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.virErr?`<div class="err">${esc(ui.virErr)}</div>`:""}
  <div class="note">Os temas vêm do que a equipe sabe sobre assuntos recorrentes e sazonais da região. Não é um painel de tendências em tempo real; a leitura ao vivo do YouTube entra numa próxima etapa.</div>
  ${S.viraisResults.map((v,i)=>`<div class="card"><div class="t">${esc(v.tema)}</div><div class="m">${esc(v.angulo)}</div><div class="m">${esc(v.porque)}</div>
    <div class="tags"><span class="tag ${v.potencial==="alto"?"hot":""}">potencial ${esc(v.potencial)}</span><span class="tag">${esc(v.nicho)}</span></div>
    <div class="btns" style="margin-top:8px">${v.enviado?`<span class="tag gold">✓ Enviado pro Laboratório de Ideias</span>`:`<button class="btn small" data-send="${i}">Enviar pro Laboratório de Ideias</button>`}</div></div>`).join("")}
`;
BIND.virais=el=>{
  bindPills(el,"reg",v=>{S.viraisRegion=v; save();});
  const vn=el.querySelector("#vn"); vn.oninput=()=>{S.viraisNicho=vn.value; save();};
  const go=el.querySelector("#vgo"); if(go) go.onclick=runVirais;
  el.querySelectorAll("[data-send]").forEach(b=>b.onclick=()=>{
    const v=S.viraisResults[+b.dataset.send]; v.enviado=true;
    S.ideias.push({id:Date.now()+Math.random(),tema:v.tema,angulo:v.angulo,origem:"Virais · "+S.viraisRegion}); save();
    courier("virais","ideias"); toast("Ideia enviada pro Laboratório de Ideias"); renderPanel();
  });
};
async function runVirais(){
  ui.virErr=null; setBusy("virais","varrendo "+S.viraisRegion); renderPanel();
  const mes=new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  const prompt=`Você é o analista de tendências de uma produtora de canais faceless ("dark") no YouTube.
Região do público: ${S.viraisRegion}. Nicho de interesse: ${S.viraisNicho||"qualquer nicho com bom RPM (anunciantes fortes)"}. Mês atual: ${mes}.
Liste 8 temas de vídeo longo (10+ min) com alto potencial de visualização para esse público agora: considere datas e estações do período, assuntos que sempre voltam a performar e curiosidades com gancho forte. Evite temas genéricos; cada tema deve ser específico o bastante pra virar um título.
Para cada item: "tema" (em português, 1 frase curta), "angulo" (como abordar pra ser diferente do que já existe, 1 frase), "porque" (por que tende a performar com esse público, 1 frase), "nicho" (1-3 palavras), "potencial" ("alto" ou "médio").
Responda só com JSON: {"ideias":[...]}`;
  try{ const r=await ask(prompt,{json:true}); S.viraisResults=(r.ideias||[]).slice(0,10); save(); }
  catch(e){ ui.virErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Ideias ---- */
VIEWS.ideias=()=>{
  const c=S.config||{nicho:"Orações",publico:"Americanos 50+",formato:"Motivacional / Discurso",gancho:"História pessoal",voz:"Masculina",duracao:15,idioma:"Inglês"};
  const blocks=Math.max(2,Math.round(c.duracao/5));
  return `
  <details ${S.config?"":"open"} class="card" style="padding:0"><summary style="padding:12px;cursor:pointer;font-weight:700">Seu canal ${S.config?`<span class="tag gold">${esc(c.nicho)} · ${esc(c.idioma)}</span>`:`<span class="tag hot">configure primeiro</span>`}</summary>
  <div style="padding:0 12px 12px">
  <p class="lead" style="margin-top:0">Você escolhe uma vez e vale pro canal inteiro.</p>
  <div class="field"><label for="cn">Nicho do canal</label><select id="cn">${NICHOS.map(n=>`<option ${n===c.nicho||(!NICHOS.includes(c.nicho)&&n==="Outro")?"selected":""}>${n}</option>`).join("")}</select></div>
  <div class="field" id="cno" style="${NICHOS.includes(c.nicho)&&c.nicho!=="Outro"?"display:none":""}"><label for="cnx">Qual é o seu nicho?</label><input id="cnx" value="${NICHOS.includes(c.nicho)?"":esc(c.nicho)}" placeholder="Digite o seu nicho"></div>
  <div class="row"><div class="field"><label for="cp">Público-alvo</label><select id="cp">${PUBLICOS.map(n=>`<option ${n===c.publico?"selected":""}>${n}</option>`).join("")}</select></div>
  <div class="field"><label for="cf">Formato</label><select id="cf">${FORMATOS.map(n=>`<option ${n===c.formato?"selected":""}>${n}</option>`).join("")}</select></div></div>
  <div class="row"><div class="field"><label for="cg">Estilo do gancho</label><select id="cg">${GANCHOS.map(n=>`<option ${n===c.gancho?"selected":""}>${n}</option>`).join("")}</select></div>
  <div class="field"><label for="cv">Voz</label><select id="cv">${["Masculina","Feminina"].map(n=>`<option ${n===c.voz?"selected":""}>${n}</option>`).join("")}</select></div></div>
  <div class="field"><label for="cd">Duração, de 10 a 60 min</label><input id="cd" type="number" min="10" max="60" value="${c.duracao}"><div class="m" style="font-size:12px;color:var(--muted);margin-top:4px" id="cdb">${blocks} blocos de roteiro</div></div>
  <div class="field"><label>Idioma dos vídeos</label>${pills("lang",IDIOMAS.map(i=>i[0]),c.idioma).replace(/data-v="([^"]+)">([^<]+)</g,(m,v,t)=>`data-v="${v}">${(IDIOMAS.find(i=>i[0]===v)||["","" ])[1]} ${t}<`)}</div>
  <div class="btns"><button class="btn" id="csave">${S.config?"Salvar alterações":"Salvar canal"}</button></div>
  </div></details>

  <h3>Fila de ideias</h3>
  <div class="field"><label for="ni">Adicionar uma ideia ou título de referência</label><input id="ni" placeholder="Ex.: oração da manhã pra ter um dia abençoado"></div>
  <div class="btns" style="margin-top:-4px"><button class="btn ghost small" id="nadd">+ Adicionar à fila</button></div>
  <div style="margin-top:12px">
  ${S.ideias.length?S.ideias.map(i=>`<div class="card click ${S.selIdea===i.id?"sel":""}" data-pick="${i.id}"><div class="t">${esc(i.tema)}</div>${i.angulo?`<div class="m">${esc(i.angulo)}</div>`:""}<div class="tags"><span class="tag">${esc(i.origem)}</span><button class="tag" style="border:0;cursor:pointer" data-del="${i.id}" aria-label="Remover ideia">remover</button></div></div>`).join(""):`<div class="empty">A fila está vazia. Adicione uma ideia acima ou mande temas do Laboratório de Virais.</div>`}
  </div>
  ${S.project?`<div class="note">Já tem um vídeo em produção: “${esc(S.project.title||S.project.idea.tema)}”. Termine ou descarte antes de começar outro. <button class="btn ghost small" id="discard" style="margin-top:6px">Descartar produção atual</button></div>`:""}
  <div class="btns"><button class="btn" id="start" ${!S.config||!S.selIdea||S.project?"disabled":""}>Começar produção</button>${!S.config?`<span class="m" style="font-size:12.5px;color:var(--muted)">Salve o canal primeiro</span>`:(!S.selIdea?`<span style="font-size:12.5px;color:var(--muted)">Toque numa ideia pra escolher</span>`:"")}</div>`;
};
BIND.ideias=el=>{
  let lang=(S.config&&S.config.idioma)||"Inglês";
  bindPills(el,"lang",v=>lang=v);
  const cn=el.querySelector("#cn"); cn.onchange=()=>el.querySelector("#cno").style.display=cn.value==="Outro"?"":"none";
  const cd=el.querySelector("#cd"); cd.oninput=()=>{ const v=Math.max(10,Math.min(60,+cd.value||15)); el.querySelector("#cdb").textContent=Math.max(2,Math.round(v/5))+" blocos de roteiro"; };
  el.querySelector("#csave").onclick=()=>{
    const nicho=cn.value==="Outro"?(el.querySelector("#cnx").value.trim()||"Outro"):cn.value;
    S.config={nicho,publico:el.querySelector("#cp").value,formato:el.querySelector("#cf").value,gancho:el.querySelector("#cg").value,voz:el.querySelector("#cv").value,duracao:Math.max(10,Math.min(60,+cd.value||15)),idioma:lang};
    save(); toast("Canal salvo"); renderPanel();
  };
  const ni=el.querySelector("#ni");
  const add=()=>{ const v=ni.value.trim(); if(!v) return; const id=Date.now()+Math.random(); S.ideias.unshift({id,tema:v,origem:"Sua ideia"}); S.selIdea=id; save(); renderPanel(); };
  el.querySelector("#nadd").onclick=add; ni.onkeydown=e=>{ if(e.key==="Enter") add(); };
  el.querySelectorAll("[data-pick]").forEach(c=>c.onclick=e=>{ if(e.target.dataset.del) return; S.selIdea=+c.dataset.pick; save(); renderPanel(); });
  el.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{ S.ideias=S.ideias.filter(i=>i.id!==+b.dataset.del); if(S.selIdea===+b.dataset.del) S.selIdea=null; save(); renderPanel(); });
  const d=el.querySelector("#discard"); if(d) d.onclick=()=>{ if(busy) interrupt(); Store.delPrefix(`p${S.project.id}:`); S.project=null; save(); toast("Produção descartada"); renderPanel(); renderProd(); };
  el.querySelector("#start").onclick=()=>{
    const idea=S.ideias.find(i=>i.id===S.selIdea); if(!idea) return;
    S.project={id:Date.now(),idea,config:{...S.config},done:{},titles:[],script:[],scenes:[],style:STYLES[0][0],provider:"ElevenLabs",voice:null,speed:1,template:TEMPLATES[0],captions:CAPTIONS[0]};
    S.ideias=S.ideias.filter(i=>i.id!==idea.id); S.selIdea=null; save();
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
  el.querySelector("#tok").onclick=()=>{ if(!P.title) return; if(!P.done.titulos){ P.done.titulos=true; save(); courier("titulos","roteiro"); toast("Título enviado pro Prédio dos Roteiros"); renderProd(); openPanel("roteiro"); } };
};
async function runTitulos(){
  const P=S.project; ui.titErr=null; setBusy("titulos","testando ângulos"); renderPanel();
  const prompt=`Você é copywriter sênior de YouTube especializado em canais faceless de alto CTR.
Canal: ${cfgText()}
Ideia do vídeo: "${P.idea.tema}"${P.idea.angulo?` (ângulo sugerido: ${P.idea.angulo})`:""}.
Crie 10 títulos no idioma ${P.config.idioma}, cada um com ângulo e gatilho emocional diferentes (curiosidade, medo de perder, esperança, alívio, urgência, prova, contraste…). Máximo 80 caracteres. Sem clickbait mentiroso, sem CAPS exagerado, sem emojis. Pense no que faria esse público específico clicar.
Para cada: "titulo", "angulo" (em português, até 6 palavras), "gatilho" (em português, 1-2 palavras).
Responda só com JSON: {"titulos":[...]}`;
  try{ const r=await ask(prompt,{json:true}); P.titles=(r.titulos||[]).filter(t=>t&&t.titulo).slice(0,10); save(); }
  catch(e){ ui.titErr=errMsg(e); }
  clearBusy(); renderPanel();
}

/* ---- Roteiro ---- */
function nBlocks(){ return Math.max(2,Math.round(S.project.config.duracao/5)); }
function scriptText(){ return S.project.script.join("\n\n"); }
function wc(s){ return (s.match(/\S+/g)||[]).length; }
VIEWS.roteiro=()=>{ const P=S.project, n=nBlocks(), have=P.script.length; const working=busy&&busy.k==="roteiro"; return `
  <p class="lead">Título: <b>${esc(P.title)}</b><br>${n} blocos · cerca de ${P.config.duracao} min em ${esc(P.config.idioma)}</p>
  ${aiNote()}
  <div class="btns">
    ${have<n?`<button class="btn" id="rgo" ${busy||!AI.ready()?"disabled":""}>✦ ${have?`Continuar do bloco ${have+1}`:"Escrever roteiro"}</button>`:""}
    ${have&&!working?`<button class="btn ghost small" id="rre">Reescrever do zero</button>`:""}
    ${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}
    ${have?`<button class="btn ghost small" id="rcopy">Copiar roteiro</button>`:""}
  </div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div>`:""}
  ${ui.rotErr?`<div class="err">${esc(ui.rotErr)}</div>`:""}
  ${(have||working)?`<div class="script" id="scr">${P.script.map((t,i)=>`<div class="blk">Bloco ${i+1}</div>${esc(t)}`).join("\n")}${working?`<div class="blk">Bloco ${have+1}</div><span id="live"></span>`:""}</div>
  <p class="m" style="font-size:12.5px;color:var(--muted)">${wc(scriptText())} palavras · ~${Math.round(wc(scriptText())/140)} min de narração</p>`:""}
  ${!have&&!working?`<details class="card" style="margin-top:14px"><summary style="cursor:pointer;font-weight:600">Já tenho o roteiro</summary><div class="field" style="margin-top:10px"><textarea id="rown" rows="6" placeholder="Cole o roteiro aqui. Separe os blocos com uma linha em branco dupla."></textarea></div><button class="btn small" id="ruse">Usar este roteiro</button></details>`:""}
  ${have>=n?`<div class="btns"><button class="btn" id="rok" ${P.done.roteiro?"disabled":""}>${P.done.roteiro?"Roteiro aprovado ✓":"Aprovar roteiro e mandar pra Redação"}</button></div>`:""}`; };
BIND.roteiro=el=>{
  const P=S.project;
  const go=el.querySelector("#rgo"); if(go) go.onclick=runRoteiro;
  const re=el.querySelector("#rre"); if(re) re.onclick=()=>{ P.script=[]; STAGES.slice(1).forEach(s=>P.done[s]=false); save(); renderProd(); runRoteiro(); };
  const cp=el.querySelector("#rcopy"); if(cp) cp.onclick=()=>{ navigator.clipboard?.writeText(scriptText()).then(()=>toast("Roteiro copiado"),()=>toast("Não deu pra copiar neste navegador")); };
  const ru=el.querySelector("#ruse"); if(ru) ru.onclick=()=>{ const t=el.querySelector("#rown").value.trim(); if(!t) return toast("Cole o roteiro primeiro"); let parts=t.split(/\n\s*\n\s*\n/).map(x=>x.trim()).filter(Boolean); const n=nBlocks(); while(parts.length<n) parts.push(""); if(parts.length>n){ parts=[...parts.slice(0,n-1),parts.slice(n-1).join("\n\n")]; } P.script=parts; save(); renderPanel(); };
  const ok=el.querySelector("#rok"); if(ok) ok.onclick=()=>{ P.done.roteiro=true; save(); courier("roteiro","descricao"); toast("Roteiro enviado pra Redação"); renderProd(); openPanel("descricao"); };
};
async function runRoteiro(){
  const P=S.project, n=nBlocks(); ui.rotErr=null;
  const words=Math.round(P.config.duracao*140/n);
  setBusy("roteiro",`escrevendo o bloco ${P.script.length+1}`); renderPanel();
  try{
    while(P.script.length<n){
      const i=P.script.length; setAction(`escrevendo o bloco ${i+1} de ${n}`); renderPanel();
      const prev=P.script.join("\n\n");
      const role = i===0 ? `Este é o PRIMEIRO bloco. Abra com um gancho no estilo "${P.config.gancho}" nas 2-3 primeiras frases, que prenda nos primeiros 15 segundos. Prometa o que o espectador vai ganhar ficando até o fim e abra um "loop" (uma pergunta ou história) que só será resolvido no último bloco. Termine o bloco com uma virada que puxe pro próximo.`
        : i===n-1 ? `Este é o ÚLTIMO bloco. Feche o loop aberto no início, entregue o clímax e a lição. Inclua de forma natural um convite pra se inscrever e uma pergunta específica pra responder nos comentários. Termine com uma frase memorável.`
        : `Este é um bloco do MEIO (${i+1} de ${n}). Aprofunde com detalhes concretos, uma mini-história ou exemplo, mude o ritmo pra evitar monotonia e termine com um mini-suspense que puxe pro próximo bloco.`;
      const prompt=`Você é roteirista de um canal faceless de YouTube com engenharia de retenção.
Canal: ${cfgText()}
Título do vídeo: "${P.title}".
Escreva o bloco ${i+1} de ${n} do roteiro, com cerca de ${words} palavras, no idioma ${P.config.idioma}.
${role}
Regras: escreva SÓ o texto que o narrador vai ler, em parágrafos, sem títulos, marcações, colchetes, emojis ou indicações de cena. Tom humano e específico ao público (${P.config.publico}). Proibido abertura genérica tipo "Olá pessoal" ou "neste vídeo vamos". Frases de tamanhos variados, boas pra ouvir em voz alta.
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
VIEWS.descricao=()=>{ const P=S.project; const working=busy&&busy.k==="descricao"; return `
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
  el.querySelector("#dok").onclick=()=>{ if(!(P.description||"").trim()) return toast("Escreva ou gere a descrição primeiro"); P.done.descricao=true; save(); courier("descricao","capa"); toast("Descrição aprovada"); renderProd(); openPanel("capa"); };
};
async function runDescricao(){
  const P=S.project; ui.desErr=null; setBusy("descricao","lendo o roteiro"); renderPanel();
  const s=scriptText();
  const prompt=`Escreva a descrição de YouTube deste vídeo, no idioma ${P.config.idioma}.
Título: "${P.title}". Público: ${P.config.publico}.
Roteiro (início e fim):
"""${s.slice(0,4000)}\n…\n${s.slice(-1500)}"""
Regras: no máximo 5 linhas; primeira linha forte com a palavra-chave principal; um convite natural pra se inscrever; termine com uma pergunta pros comentários. Depois, 3 a 5 hashtags relevantes.
Responda só com JSON: {"descricao":"...","hashtags":["#...", "..."]}`;
  try{ const r=await ask(prompt,{json:true,tier:"quick"}); P.description=r.descricao||""; P.hashtags=r.hashtags||[]; save(); }
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
          if(e&&(e.code==="rate_limited"||e.code==="overloaded")&&tent<2){ setAction("esperando o limite da API liberar"); await sleep(15000*(tent+1)); continue; }
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
VIEWS.capa=()=>{ const P=S.project; const working=busy&&busy.k==="capa"; const th=P.thumbs||[]; const st=P.thumbImg||[]; return `
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
BIND.capa=el=>{
  const P=S.project;
  el.querySelector("#cvis").oninput=e=>{P.thumbVisual=e.target.value; save();};
  el.querySelector("#ctxt").oninput=e=>{P.thumbOwn=e.target.value; save();};
  el.querySelector("#cgo").onclick=runCapa;
  const rt=el.querySelector("#cretry"); if(rt) rt.onclick=()=>drawThumbs(true);
  el.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{ if(P.done.capa) return; P.thumbSel=+b.dataset.th; save(); renderPanel(); });
  const dl=el.querySelector("#cdl"); if(dl) dl.onclick=async()=>{ const b=await Store.get(mkey(P.id,"thumb",P.thumbSel)); if(b) saveBlob(b,slug(P.title)+"-capa.jpg"); };
  el.querySelector("#cok").onclick=()=>{ P.done.capa=true; save(); courier("capa","imagens"); toast("Capa aprovada"); renderProd(); openPanel("imagens"); };
  paintImgs(el);
};
async function runCapa(){
  const P=S.project; ui.capErr=null;
  setBusy("capa","escrevendo as frases"); renderPanel();
  const prompt=`Você é diretor de arte de thumbnails de YouTube com alto CTR.
Título: "${P.title}". Público: ${P.config.publico}. Nicho: ${P.config.nicho}.
${P.thumbOwn?`O texto da capa já foi definido: "${P.thumbOwn}". Crie 4 variações bem próximas dele.`:`Crie 4 textos de capa diferentes, de 3 a 6 palavras, no idioma ${P.config.idioma}. Eles devem complementar o título, não repetir.`}
${P.thumbVisual?`Ideia visual do criador: ${P.thumbVisual}.`:""}
Descreva a composição da imagem em português (1-2 frases) e também escreva um prompt de imagem em inglês para ela ("prompt_en"): personagem, expressão, luz, cores, fundo, deixando o terço direito livre para o texto. Não inclua o texto da capa no prompt_en.
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
  setBusy("capa","desenhando as capas"); 
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
function sceneCount(){ return Math.min(40,Math.round(S.project.config.duracao*1.7)); }
VIEWS.imagens=()=>{ const P=S.project; const working=busy&&busy.k==="imagens"; const n=sceneCount(); const ph=P.imgPhase||0;
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
BIND.imagens=el=>{
  const P=S.project;
  el.querySelectorAll("[data-sty]").forEach(b=>b.onclick=()=>{ P.style=b.dataset.sty; save(); renderPanel(); });
  el.querySelector("#igo").onclick=()=>{ if(P.scenes.some(s=>s.img==="ok")&&!confirm("Refazer tudo apaga as imagens atuais. Continuar?")) return; runImagens(); };
  const mi=el.querySelector("#imiss"); if(mi) mi.onclick=()=>drawScenes(P.scenes.map((s,i)=>i).filter(i=>P.scenes[i].img!=="ok"));
  el.querySelectorAll("[data-sc]").forEach(b=>b.onclick=()=>{ P.selScene=P.selScene===+b.dataset.sc?null:+b.dataset.sc; save(); renderPanel(); });
  const sp=el.querySelector("#sprompt"); if(sp) sp.oninput=()=>{ P.scenes[P.selScene].prompt=sp.value; save(); };
  const rd=el.querySelector("#sredo"); if(rd) rd.onclick=()=>{ P.done.imagens=false; drawScenes([P.selScene]); };
  const sd=el.querySelector("#sdl"); if(sd) sd.onclick=async()=>{ const b=await Store.get(mkey(P.id,"scene",P.selScene)); if(b) saveBlob(b,`cena-${String(P.selScene+1).padStart(2,"0")}.jpg`); };
  const cp=el.querySelector("#icp"); if(cp) cp.onclick=()=>navigator.clipboard?.writeText(P.scenes.map((s,i)=>`${i+1}. ${s.prompt}`).join("\n")).then(()=>toast("Prompts copiados"),()=>toast("Não deu pra copiar"));
  el.querySelector("#iok").onclick=()=>{ P.done.imagens=true; save(); courier("imagens","narracao"); toast("Cenas aprovadas"); renderProd(); openPanel("narracao"); };
  paintImgs(el);
};
async function runImagens(){
  const P=S.project; ui.imgErr=null; const n=sceneCount();
  setBusy("imagens","lendo o roteiro"); P.imgPhase=1; P.selScene=null; P.done.imagens=false; renderPanel();
  await Store.delPrefix(`p${P.id}:scene:`); P.scenes=[];
  P.imgPhase=2; setAction("escrevendo os prompts"); renderPanel();
  const prompt=`Divida este roteiro em exatamente ${n} cenas consecutivas, na ordem, cobrindo o texto inteiro.
Para cada cena: "trecho" (as primeiras 8 a 12 palavras daquele trecho, no idioma do roteiro) e "prompt" (prompt de imagem em inglês, 1-2 frases, descrevendo uma imagem única e específica daquele momento).
Antes, defina mentalmente os personagens principais (idade, aparência, roupa) e descreva-os do mesmo jeito em todas as cenas em que aparecem, pra manter consistência. Varie enquadramento e cenário pra não ficar repetitivo. Nada de texto escrito dentro das imagens.
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

/* ---- Narração ---- */
VIEWS.narracao=()=>{ const P=S.project; const working=busy&&busy.k==="narracao"; const list=VOICES[P.provider]; const words=wc(scriptText()); const mins=(words/(140*P.speed)).toFixed(1); return `
  <p class="lead">O roteiro narrado na sua conta de voz. Escolha o provedor e a voz.</p>
  ${pills("prov",Object.keys(VOICES),P.provider)}
  <div class="voices" style="margin-top:12px">${list.map(v=>`<button type="button" class="voice" aria-pressed="${P.voice===v[0]}" data-voice="${esc(v[0])}"><span class="av" style="background:${v[2]}">${v[0][0]}</span><span><b>${esc(v[0])}</b><small>${esc(v[1])}</small></span></button>`).join("")}</div>
  <div class="field" style="margin-top:14px"><label for="spd">Velocidade: <b id="spv">${P.speed.toFixed(2)}×</b></label><input id="spd" type="range" min="0.8" max="1.2" step="0.05" value="${P.speed}"></div>
  <div class="btns"><button class="btn ghost small" id="prev" ${"speechSynthesis" in window?"":"disabled"}>▶ Ouvir um trecho (voz do navegador)</button></div>
  <div class="btns"><button class="btn" id="ngo" ${busy||!P.voice?"disabled":""}>🎙 ${P.voice?`Gerar narração com ${esc(P.voice)}`:"Escolha uma voz"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  <p class="m" style="font-size:12.5px;color:var(--muted)">~${mins} min de áudio · ${words} palavras</p>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div><div class="bar"><i style="width:${(P.narrProg||0)*100}%"></i></div>`:""}
  ${P.narration?`<div class="card"><div class="t">✓ Narração pronta</div><div class="m">${esc(P.narration.voice)} · ${esc(P.narration.provider)} · ${P.narration.mins} min</div></div>`:""}
  <div class="note">A prévia usa a voz do seu navegador só pra ouvir o ritmo. A narração final vai sair pela API do provedor escolhido na próxima etapa.</div>
  <div class="btns"><button class="btn" id="nok" ${!P.narration||P.done.narracao?"disabled":""}>${P.done.narracao?"Narração aprovada ✓":"Aprovar e mandar pro OnionCut"}</button></div>`; };
BIND.narracao=el=>{
  const P=S.project;
  bindPills(el,"prov",v=>{ P.provider=v; P.voice=null; save(); renderPanel(); });
  el.querySelectorAll("[data-voice]").forEach(b=>b.onclick=()=>{ P.voice=b.dataset.voice; save(); renderPanel(); });
  const sp=el.querySelector("#spd"); sp.oninput=()=>{ P.speed=+sp.value; el.querySelector("#spv").textContent=P.speed.toFixed(2)+"×"; save(); };
  el.querySelector("#prev").onclick=()=>{ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(scriptText().slice(0,280)); const lang=(IDIOMAS.find(i=>i[0]===P.config.idioma)||[])[2]; if(lang) u.lang=lang; u.rate=P.speed; speechSynthesis.speak(u); }catch(e){ toast("O navegador não tem voz disponível"); } };
  el.querySelector("#ngo").onclick=runNarracao;
  el.querySelector("#nok").onclick=()=>{ P.done.narracao=true; save(); courier("narracao","montagem"); toast("Narração aprovada"); renderProd(); openPanel("montagem"); };
};
async function runNarracao(){
  const P=S.project, n=nBlocks(); setBusy("narracao","gravando o bloco 1"); P.narrProg=0; renderPanel();
  const steps=40;
  for(let i=1;i<=steps;i++){ if(busy.cancel){ clearBusy(); return renderPanel(); } await sleep(110); P.narrProg=i/steps; const blk=Math.min(n,Math.ceil(i/steps*n)); if(busy.action!==`gravando o bloco ${blk}`){ setAction(`gravando o bloco ${blk}`); } if(i%4===0) renderPanel(); }
  P.narration={voice:P.voice,provider:P.provider,mins:(wc(scriptText())/(140*P.speed)).toFixed(1)}; save();
  clearBusy(); renderPanel();
}

/* ---- Montagem ---- */
VIEWS.montagem=()=>{ const P=S.project; const working=busy&&busy.k==="montagem"; const st=styleOf(P.style); const words=(P.script[0]||"").split(/\s+/).slice(0,14); return `
  <p class="lead">O OnionCut junta cenas, voz e legendas e corta nas pausas da narração.</p>
  <h3>Template</h3>${pills("tpl",TEMPLATES,P.template)}
  <h3>Legendas</h3>${pills("cap",CAPTIONS,P.captions)}
  <div class="btns"><button class="btn" id="mgo" ${busy?"disabled":""}>🎬 ${P.cut?"Montar de novo":"Montar no OnionCut"}</button>${working?`<button class="btn ghost small" onclick="interrupt()">⏹ Interromper</button>`:""}</div>
  ${working?`<div class="status"><span class="spin"></span>${esc(busy.action)}…</div><div class="bar"><i style="width:${(P.cutProg||0)*100}%"></i></div>`:""}
  ${P.cut?`<h3>Linha do tempo</h3><div class="tl">
    <div class="lane"><b>Vídeo</b><div class="track">${P.scenes.map((s,i)=>`<i ${s.img==="ok"?`data-img="${mkey(P.id,"scene",i)}"`:""} style="background:linear-gradient(${(i*47)%360}deg,${st[1]},${st[2]})"></i>`).join("")}</div></div>
    <div class="lane"><b>Legendas</b><div class="track" style="gap:4px">${words.map(w=>`<span class="cap">${esc(w.replace(/[^\p{L}\p{N}'’-]/gu,"").toUpperCase())}</span>`).join("")}</div></div>
    <div class="lane"><b>Áudio</b><div class="track wave">${Array.from({length:80},(_,i)=>`<i style="height:${20+Math.abs(Math.sin(i*1.7)*Math.cos(i*.37))*80}%"></i>`).join("")}</div></div>
  </div>
  <p class="m" style="font-size:12.5px;color:var(--muted)">${P.scenes.length} cenas · ${P.narration?P.narration.mins:"?"} min · template ${esc(P.template)}</p>`:""}
  <div class="note">Nesta versão a montagem ainda é uma prévia. O render do vídeo no navegador, com legendas palavra por palavra e cortes nas pausas reais da voz, é a próxima etapa. O pacote .zip já leva capa, imagens, roteiro e descrição.</div>
  <div class="btns">
    <button class="btn" id="mok" ${!P.cut?"disabled":""}>Salvar na Biblioteca</button>
    <button class="btn ghost small" id="mdl">⬇ Baixar pacote (.zip)</button>
  </div>`; };
BIND.montagem=el=>{
  const P=S.project;
  bindPills(el,"tpl",v=>{P.template=v; save();}); bindPills(el,"cap",v=>{P.captions=v; save();});
  el.querySelector("#mgo").onclick=runMontagem;
  el.querySelector("#mdl").onclick=e=>downloadPack(P,e.currentTarget);
  el.querySelector("#mok").onclick=()=>{
    P.done.montagem=true; const item={...P,savedAt:Date.now()}; S.library.unshift(item); S.project=null; save();
    courier("montagem","arquivo"); toast("+1 vídeo pronto na Biblioteca"); renderProd(); openPanel("arquivo");
  };
  paintImgs(el);
};
async function runMontagem(){
  const P=S.project; const steps=["trazendo os arquivos","sincronizando a voz","cortando nas pausas","aplicando as legendas","aplicando transições e filtro","renderizando"];
  setBusy("montagem",steps[0]); P.cutProg=0; renderPanel();
  for(let i=0;i<steps.length*8;i++){ if(busy.cancel){ clearBusy(); return renderPanel(); } await sleep(120); P.cutProg=(i+1)/(steps.length*8); const s=steps[Math.floor(i/8)]; if(busy.action!==s){ setAction(s); renderPanel(); } }
  P.cut=true; save(); clearBusy(); renderPanel();
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
async function downloadPack(P,btn){
  const name=slug(P.title);
  if(!window.JSZip){ return saveBlob(new Blob([packText(P)],{type:"text/plain;charset=utf-8"}),`onion-${name}.txt`); }
  const old=btn&&btn.innerHTML; if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Empacotando…`; }
  try{
    const z=new JSZip();
    z.file("roteiro.txt",P.script.join("\n\n"));
    z.file("descricao.txt",(P.description||"")+"\n\n"+(P.hashtags||[]).join(" "));
    z.file("titulo.txt",P.title||"");
    z.file("onion-tudo.txt",packText(P));
    if(P.thumbSel!=null){ const b=await Store.get(mkey(P.id,"thumb",P.thumbSel)); if(b) z.file("capa.jpg",b); }
    const f=z.folder("cenas");
    for(let i=0;i<P.scenes.length;i++){ const b=await Store.get(mkey(P.id,"scene",i)); if(b) f.file(`${String(i+1).padStart(2,"0")}.jpg`,b); }
    f.file("prompts.txt",P.scenes.map((s,i)=>`${String(i+1).padStart(2,"0")}. ${s.trecho}\n    ${s.prompt}`).join("\n\n"));
    saveBlob(await z.generateAsync({type:"blob"}),`onion-${name}.zip`);
  }catch(e){ toast("Não deu pra montar o .zip neste navegador"); }
  if(btn){ btn.disabled=false; btn.innerHTML=old; }
}

/* ---- Arquivo / Biblioteca ---- */
VIEWS.arquivo=()=>`<div class="lib">
  <p class="lead">Vídeos que já passaram por todo o campus. ${S.library.length?`${S.library.length} no total.`:""}</p>
  ${S.library.length?S.library.map((P,i)=>`<details><summary>${esc(P.title)}</summary>
    ${P.thumbSel!=null&&(P.thumbImg||[])[P.thumbSel]==="ok"?`<div class="big" data-img="${mkey(P.id,"thumb",P.thumbSel)}" style="margin-top:8px"></div>`:""}
    <p class="m" style="font-size:12.5px;color:var(--muted)">${new Date(P.savedAt).toLocaleDateString("pt-BR")} · ${esc(P.config.nicho)} · ${esc(P.config.idioma)} · ${P.narration?P.narration.mins+" min":""} · ${P.scenes.filter(s=>s.img==="ok").length} imagens</p>
    <p style="white-space:pre-wrap;font-size:13.5px">${esc(P.description||"")}</p>
    <div class="btns"><button class="btn small" data-dl="${i}">⬇ Baixar pacote (.zip)</button><button class="btn ghost small" data-rm="${i}">Remover</button></div></details>`).join(""):`<div class="empty">Ainda não tem vídeo pronto. Quando o OnionCut terminar um, ele aparece aqui.</div>`}
  <p class="m" id="usage" style="font-size:12px;color:var(--muted)"></p>
</div>`;
BIND.arquivo=el=>{
  el.querySelectorAll("[data-dl]").forEach(b=>b.onclick=()=>downloadPack(S.library[+b.dataset.dl],b));
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=async()=>{ const P=S.library[+b.dataset.rm]; if(!confirm(`Remover “${P.title}” e as imagens dele deste navegador?`)) return; S.library.splice(+b.dataset.rm,1); save(); await Store.delPrefix(`p${P.id}:`); renderPanel(); });
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
      <div class="btns" style="margin-top:4px"><button class="btn small" data-test="${st}">Salvar e testar</button></div>
      ${msg?`<div class="${msg.ok?"status":"err"}" style="${msg.ok?"color:var(--ok)":""}">${esc(msg.text)}</div>`:""}`}
    </section>`;}).join("")}
  <div class="note">Defina um limite mensal de gasto no painel de cada provedor. Nunca cole chaves no código nem no repositório: o site é público, as chaves não.</div>
  <div class="btns"><button class="btn ghost small" id="aclear">Apagar todas as chaves deste navegador</button></div>`; };
BIND.admin=el=>{
  Object.keys(AI.STAGES).forEach(st=>{
    bindPills(el,"prov-"+st,v=>{ AI.setStage(st,{provider:v,model:"",...(st==="text"?{quick:""}:{})}); const ids=AI.cachedModels(v,st); if(ids.length) AI.setStage(st,{model:AI.pickDefault(st,ids),...(st==="text"?{quick:AI.pickQuick(ids)}:{})}); admMsg[st]=null; renderPanel();
      if(!ids.length && !AI.PROVIDERS[v].noKey && AI.get().keys[v]){ const b=document.querySelector(`[data-test="${st}"]`); if(b) b.click(); } });
  });
  el.querySelectorAll("[data-key]").forEach(i=>i.onchange=()=>{ AI.setKey(i.dataset.key,i.value); });
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
  el.querySelector("#aclear").onclick=()=>{ AI.clearAll(); admMsg={}; toast("Chaves apagadas deste navegador"); renderPanel(); };
};

/* ============ BOOT ============ */
resize(); center(); showInfo(null); renderProd();
requestAnimationFrame(loop);
