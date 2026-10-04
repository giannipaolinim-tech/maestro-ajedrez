/* ==========================================================================
   ui.js — utilidades de interfaz: tema, íconos, avisos y las piezas de HTML
   que comparten las pestañas (barra de aperturas, tarjetas de variantes,
   barras de progreso, disposición de estudio con tablero).
   ========================================================================== */
const $=s=>document.querySelector(s);
const buzz=ms=>{try{if(navigator.vibrate) navigator.vibrate(ms);}catch(e){}};

/* ---------- Tema (auto / claro / oscuro) ---------- */
const THEMES=['auto','light','dark'], THEME_LABEL={auto:'Tema automático',light:'Tema claro',dark:'Tema oscuro'};
let theme=lsGet(THEME_KEY); if(THEMES.indexOf(theme)<0) theme='auto';
function applyTheme(){
  const r=document.documentElement; if(theme==='auto') delete r.dataset.theme; else r.dataset.theme=theme;
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=getComputedStyle(r).getPropertyValue('--bg').trim()||m.content;
}
applyTheme();
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: dark)'); if(mq.addEventListener) mq.addEventListener('change',applyTheme);}

/* ---------- Utilidades ---------- */
function moveList(arr,cur,clickable){
  let h='';
  arr.forEach((m,i)=>{
    if(i%2===0) h+='<span class="num">'+(i/2+1)+'.</span>';
    h+='<button class="mv'+(i===cur?' cur':'')+(i%2===(OP.side==='w'?0:1)?' bm':'')+'" '+(clickable?'data-ply="'+i+'"':'disabled')+'>'+m+'</button>';
  });
  return h;
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// Etiqueta de la jugada número n (1-based) de una línea: "6.h4" o "3...Bf5".
function plyLabel(arr,n){const i=n-1; return (Math.floor(i/2)+1)+(i%2===0?'.':'...')+arr[i];}
function toast(msg){
  const old=$('.toast'); if(old) old.remove();
  const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

/* ---------- Íconos ---------- */
const IC={
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  escuela:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  leccion:'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  practica:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  examen:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  progreso:'<path d="M6 20v-5M12 20V10M18 20V4"/>',
  flame:'<path d="M12 2c.6 3.6 5.5 5.6 5.5 11.2A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.8c0-2.6 1.6-4 2.3-6.4 1.6 1.2 2.4 2.8 2.4 4.6 1.4-1.4 1.6-4.6.8-9.4z"/>',
  light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  dark:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  auto:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  first:'<path d="M6 5v14"/><path d="M18 6l-8 6 8 6z"/>',
  prev:'<path d="M15 5l-7 7 7 7"/>',
  next:'<path d="M9 5l7 7-7 7"/>',
  last:'<path d="M18 5v14"/><path d="M6 6l8 6-8 6z"/>',
  hint:'<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  restart:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  shuffle:'<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'
};
const ico=n=>'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>';

/* ---------- Piezas comunes de las pestañas ---------- */
function opBar(){
  return '<div class="opbar">'+OPENINGS.map(o=>'<button data-op="'+o.id+'"'+(o===OP?' class="on" aria-current="true"':'')+'><span class="side '+o.side+'"><i></i></span>'+esc(shortName(o))+'</button>').join('')+'</div>';
}
const TAB_NAME={leccion:'Aprender',practica:'Practicar',examen:'Examen',progreso:'Progreso'};
function ttl(t){return '<div class="ttl"><span class="ic '+t+'">'+ico(t)+'</span><h2>'+TAB_NAME[t]+'</h2></div>';}
function bar(m){return '<span class="meter"><span class="bar"><span style="width:'+m+'%"></span></span>'+m+'%</span>';}
function ring(p){
  const c=2*Math.PI*42;
  return '<div class="ring"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="42" fill="none" stroke="var(--surface2)" stroke-width="12"/>'+
    (p>0?'<circle cx="52" cy="52" r="42" fill="none" stroke="var(--lime)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(c*p/100).toFixed(1)+' '+c.toFixed(1)+'"/>':'')+'</svg><b>'+p+'%</b></div>';
}
function lineCard(l){
  const m=mastery(IDX.lineNodes[l.id]);
  return '<button class="card'+(m===100?' done':'')+'" data-line="'+l.id+'">'+mini(l,l.key,OP.side)+'<span class="kmv">'+plyLabel(l.arr,l.key)+'</span><span class="cn">'+esc(l.name)+'</span>'+bar(m)+'</button>';
}
// Filtro por familia + tarjetas de variantes con mini tablero.
function linesHTML(){
  const grp=OP.groups.some(g=>g.id===state.grp)?state.grp:null;
  let h='<div class="chips">'+[['','Todas']].concat(OP.groups.map(g=>[g.id,gShort(g)])).map(c=>'<button data-grp="'+c[0]+'"'+((grp||'')===c[0]?' class="on"':'')+'>'+esc(c[1])+'</button>').join('')+'</div>';
  OP.groups.filter(g=>!grp||g.id===grp).forEach(gr=>{
    const ls=OP.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const keys=[...new Set(ls.flatMap(l=>IDX.lineNodes[l.id]))];
    h+=grp?'<p class="gdesc">'+gr.desc+'</p>':'<div class="gh"><span>'+esc(gShort(gr))+'</span><small>'+ls.length+(ls.length===1?' variante':' variantes')+' · '+mastery(keys)+'%</small></div>';
    h+='<div class="cards">'+ls.map(lineCard).join('')+'</div>';
  });
  return h;
}
function bindLines(fn){
  const pane=$('#pane');
  pane.querySelectorAll('[data-grp]').forEach(b=>b.onclick=()=>nav({grp:b.dataset.grp||null}));
  pane.querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>fn(b.dataset.line));
}
function studyLayout(title,sub,backLabel){
  return '<div class="study"><div class="bwrap"><div class="shead"><button id="listBack" class="backb" aria-label="'+(backLabel||'Volver a las variantes')+'">'+ico('back')+'</button>'+
    '<div><h3 class="lt">'+esc(title)+'</h3><span class="lsub">'+esc(sub)+'</span></div></div>'+
    '<div class="bstack"><div id="board" class="board"></div><svg id="ov" class="ov" viewBox="0 0 8 8" aria-hidden="true"></svg><svg id="ov2" class="ov top" viewBox="0 0 8 8" aria-hidden="true"></svg></div><div id="ctrl" class="ctrl"></div></div>'+
    '<aside class="sidep"><div id="info" class="info"></div><div id="moves" class="moves"></div></aside></div>';
}
