// barra fixa e menu do celular
const nav=document.getElementById("nav"), menu=document.getElementById("menu");
addEventListener("scroll",()=>nav.classList.toggle("scrolled",scrollY>10),{passive:true});
menu.onclick=()=>{ const o=nav.classList.toggle("open"); menu.setAttribute("aria-expanded",o); };
document.querySelectorAll(".nav nav a").forEach(a=>a.addEventListener("click",()=>{ nav.classList.remove("open"); menu.setAttribute("aria-expanded",false); }));
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
// o print do parque começa deitado e endireita com a rolagem
const br=document.getElementById("browser"), stg=document.getElementById("stage");
function tilt(){ if(reduce) return; const r=stg.getBoundingClientRect(), p=Math.min(1,Math.max(0,(innerHeight-r.top)/(innerHeight*.9))); br.style.setProperty("--tilt",(24*(1-p)).toFixed(2)+"deg"); br.style.setProperty("--sc",(.94+.06*p).toFixed(3)); }
addEventListener("scroll",tilt,{passive:true}); addEventListener("resize",tilt); tilt();
// faixa "ao vivo no parque"
const feed=["🧠 <b>Laboratório de Ideias</b> · tema em alta encontrado no Brasil","✍️ <b>Roteirista</b> · escrevendo o bloco 2 de 3","🗞 <b>Redator</b> · descrição com hashtags pronta","🖼 <b>Imagens e Marketing</b> · 7 fotos livres achadas","🎙 <b>Narrador</b> · gravando com a voz Orus","🎬 <b>OnionCut</b> · renderizando 64%","📱 <b>Short derivado</b> · pronto pra postar","★ <b>Gerente</b> · indo pra Torre dos Títulos","🛍 <b>Estúdio de Stories</b> · produto inserido aos 0:04","✓ <b>Biblioteca</b> · +1 vídeo pronto"];
document.getElementById("mq").innerHTML=[...feed,...feed].map(t=>`<span>${t}</span>`).join("");
// antes e depois
const ba=document.getElementById("ba"), rng=ba.querySelector("input"); rng.oninput=()=>ba.style.setProperty("--cut",rng.value+"%");
// como funciona: troca sozinho a cada 6 s (para quando a pessoa escolhe)
const steps=[...document.querySelectorAll(".step")], imgs=[...document.querySelectorAll("#phone img")]; let cur=0, t0=performance.now(), paused=false;
function pick(i){ cur=i; t0=performance.now(); steps.forEach((s,k)=>{ s.setAttribute("aria-selected",k===i); const b=s.querySelector(".bar i"); if(b) b.style.width="0"; }); imgs.forEach((m,k)=>m.classList.toggle("on",k===i)); }
steps.forEach((s,i)=>s.onclick=()=>{ pick(i); paused=true; });
(function loop(now){ if(!paused&&!reduce){ const p=(now-t0)/6000, bar=steps[cur].querySelector(".bar i"); if(bar) bar.style.width=Math.min(100,p*100)+"%"; if(p>=1) pick((cur+1)%steps.length); } requestAnimationFrame(loop); })(performance.now());
// aparecer ao rolar
const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }),{threshold:.12});
document.querySelectorAll(".rv").forEach(el=>io.observe(el));
// estrelas no final
const st=document.getElementById("stars"); for(let i=0;i<60;i++){ const s=document.createElement("i"); s.className="star"; s.style.left=Math.random()*100+"%"; s.style.top=Math.random()*55+"%"; s.style.animationDelay=(-Math.random()*3)+"s"; st.appendChild(s); }

// cadastro: os botões de entrar abrem a janela de cadastro/login (quando o cadastro estiver ligado)
if (window.Auth) Auth.wireEnterButtons();
