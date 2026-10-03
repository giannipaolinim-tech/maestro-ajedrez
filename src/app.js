(function(){
const $=s=>document.querySelector(s);
const STORE='maestro-ajedrez-v1', THEME_KEY='maestro-ajedrez-theme', SEEN_KEY='maestro-ajedrez-build';
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
let prog={};
try{prog=JSON.parse(lsGet(STORE)||'{}')||{};}catch(e){prog={};}
function save(){lsSet(STORE,JSON.stringify(prog));}
const f4=fen=>fen.split(' ').slice(0,4).join(' ');
const REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
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

/* ---------- Índice del repertorio ---------- */
function buildIndex(op){
  const idx={user:{},opp:{},nodes:{},lineNodes:{}};
  op.lines.forEach(l=>{
    l.arr=l.moves.split(' '); const g=new Chess(); idx.lineNodes[l.id]=[]; let last=null;
    l.arr.forEach((m,i)=>{
      const fen=g.fen(), k=op.id+'|'+f4(fen);
      if(g.turn()===op.side){
        idx.user[k]=m;
        if(!idx.nodes[k]) idx.nodes[k]={key:k,fen,san:m,last,note:l.notes[i]||'',line:l,ply:i,prefix:l.arr.slice(0,i)};
        else if(!idx.nodes[k].note&&l.notes[i]) idx.nodes[k].note=l.notes[i];
        if(!idx.lineNodes[l.id].includes(k)) idx.lineNodes[l.id].push(k);
      } else { (idx.opp[k]=idx.opp[k]||new Set()).add(m); }
      const r=g.move(m); last={from:r.from,to:r.to};
    });
  });
  return idx;
}
const IDXS={}; OPENINGS.forEach(o=>IDXS[o.id]=buildIndex(o));
let OP=OPENINGS[0], IDX=IDXS[OP.id];
Object.keys(prog).forEach(k=>{if(k.indexOf('|')<0){prog['caro-kann|'+k]=prog[k]; delete prog[k];}}); save();
const sideName=s=>s==='w'?'blancas':'negras';
const keyOf=g=>OP.id+'|'+f4(g.fen());

/* ---------- Progreso (repetición espaciada) ---------- */
const INTERVAL=[0,5*60e3,60*60e3,8*3600e3,24*3600e3,3*86400e3,7*86400e3];
function rec(k){return prog[k]||(prog[k]={box:0,last:0,ok:0,ko:0});}
function grade(k,good){const r=rec(k); r.last=Date.now(); markDay(); if(good){r.box=Math.min(6,r.box+1);r.ok++;} else {r.box=0;r.ko++;} save();}
function mastery(keys){if(!keys.length)return 0; let s=0; keys.forEach(k=>{s+=Math.min(3,(prog[k]||{box:0}).box)/3;}); return Math.round(100*s/keys.length);}
// due = vistas que ya toca repasar; fresh = nunca vistas
function stats(keys){const now=Date.now(); let due=0,fresh=0; keys.forEach(k=>{const r=prog[k]; if(!r) fresh++; else if(now-r.last>=INTERVAL[r.box]) due++;}); return {due,fresh};}

/* ---------- Tablero ---------- */
const FILES='abcdefgh';
function Board(el,opts){
  this.el=el; this.orient=opts.orient||'b'; this.onMove=opts.onMove; this.onTap=opts.onTap;
  this.sel=null; this.g=null; this.canMove=false; this.drag=null;
  el.addEventListener('pointerdown',e=>this.down(e));
  el.addEventListener('pointermove',e=>this.dragMove(e));
  el.addEventListener('pointerup',e=>this.up(e));
  el.addEventListener('pointercancel',()=>this.cancel());
  el.addEventListener('click',e=>{if(!this.canMove&&this.onTap) this.onTap(e);});
}
Board.prototype.set=function(g,o){
  o=o||{}; this.cancel(true); this.g=g; this.last=o.last||null; this.hint=o.hint||null; this.flash=o.flash||null; this.canMove=!!o.canMove; this.sel=null;
  this.draw(); if(o.anim&&this.last) this.animate(this.last);
};
Board.prototype.sqAt=function(x,y){
  const r=this.el.getBoundingClientRect(), c=Math.floor((x-r.left)/r.width*8), w=Math.floor((y-r.top)/r.height*8);
  if(c<0||c>7||w<0||w>7) return null;
  return this.orient==='w'?FILES[c]+(8-w):FILES[7-c]+(w+1);
};
Board.prototype.xy=function(sq){const c=FILES.indexOf(sq[0]), rank=+sq[1]; return this.orient==='w'?[c,8-rank]:[7-c,rank-1];};
Board.prototype.legal=function(from,to){return this.g.moves({square:from,verbose:true}).some(m=>m.to===to);};
// Se mueve tocando pieza y casilla, o arrastrando.
Board.prototype.down=function(e){
  if(e.button>0) return;
  const sq=this.sqAt(e.clientX,e.clientY); if(!sq) return;
  if(!this.canMove||!this.g) return;
  const p=this.g.get(sq), own=!!p&&p.color===this.g.turn();
  if(this.sel&&!own&&this.legal(this.sel,sq)){const from=this.sel; this.sel=null; this.onMove(from,sq,false); return;}
  if(!own){ if(this.sel){this.sel=null; this.draw();} return; }
  e.preventDefault();
  const wasSel=this.sel===sq; this.sel=sq; this.draw();
  this.drag={from:sq,x:e.clientX,y:e.clientY,on:false,wasSel,id:e.pointerId,over:null};
  try{this.el.setPointerCapture(e.pointerId);}catch(_){}
};
Board.prototype.dragMove=function(e){
  const d=this.drag; if(!d||e.pointerId!==d.id) return;
  if(!d.on){
    if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<6) return;
    const src=this.el.querySelector('[data-sq="'+d.from+'"] img'); if(!src) return;
    d.on=true; d.size=this.el.clientWidth/8*1.2;
    const gh=document.createElement('img'); gh.className='ghost'; gh.alt=''; gh.src=src.src; gh.style.width=gh.style.height=d.size+'px';
    document.body.appendChild(gh); d.gh=gh; src.style.opacity='.3';
  }
  d.gh.style.transform='translate('+(e.clientX-d.size/2)+'px,'+(e.clientY-d.size*.65)+'px)';
  const over=this.sqAt(e.clientX,e.clientY);
  if(over!==d.over){
    const prev=this.el.querySelector('.over'); if(prev) prev.classList.remove('over');
    if(over&&over!==d.from){const t=this.el.querySelector('[data-sq="'+over+'"]'); if(t) t.classList.add('over');}
    d.over=over;
  }
};
Board.prototype.up=function(e){
  const d=this.drag; if(!d||e.pointerId!==d.id) return; this.drag=null;
  if(d.on){
    d.gh.remove(); const to=this.sqAt(e.clientX,e.clientY);
    if(to&&to!==d.from&&this.legal(d.from,to)){this.sel=null; this.onMove(d.from,to,true); return;}
    this.draw(); return;
  }
  if(d.wasSel){this.sel=null; this.draw();}
};
Board.prototype.cancel=function(quiet){const d=this.drag; this.drag=null; if(d&&d.gh) d.gh.remove(); if(d&&!quiet) this.draw();};
Board.prototype.animate=function(m){
  if(REDUCED) return;
  const img=this.el.querySelector('[data-sq="'+m.to+'"] img'); if(!img) return;
  const a=this.xy(m.from), b=this.xy(m.to), s=this.el.clientWidth/8;
  img.style.transition='none'; img.style.zIndex='2';
  img.style.transform='translate('+(a[0]-b[0])*s+'px,'+(a[1]-b[1])*s+'px)';
  img.getBoundingClientRect();
  img.style.transition='transform .2s ease-out'; img.style.transform='';
};
Board.prototype.draw=function(){
  const g=this.g; let h=''; const targets=this.sel?g.moves({square:this.sel,verbose:true}).map(m=>m.to):[];
  this.el.classList.toggle('live',this.canMove);
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const file=this.orient==='w'?FILES[c]:FILES[7-c], rank=this.orient==='w'?8-r:r+1, sq=file+rank;
    const dark=(FILES.indexOf(file)+rank)%2===1;
    const p=g?g.get(sq):null; let cls='sq '+(dark?'d':'l');
    if(this.last&&(this.last.from===sq||this.last.to===sq)) cls+=' last';
    if(this.sel===sq) cls+=' sel';
    if(this.hint===sq) cls+=' hint';
    if(this.flash&&this.flash.sq===sq) cls+=' '+this.flash.kind;
    let inner='';
    if(p) inner+='<img alt="" draggable="false" src="'+PIECES[p.color+p.type.toUpperCase()]+'">';
    if(targets.includes(sq)) inner+='<span class="'+(p?'cap':'dot')+'"></span>';
    if(c===0) inner+='<i class="rk">'+rank+'</i>';
    if(r===7) inner+='<i class="fl">'+file+'</i>';
    h+='<div class="'+cls+'" data-sq="'+sq+'">'+inner+'</div>';
  }
  this.el.innerHTML=h;
};


/* ---------- Utilidades ---------- */
function moveList(arr,cur,clickable){
  let h='';
  arr.forEach((m,i)=>{
    if(i%2===0) h+='<span class="num">'+(i/2+1)+'.</span>';
    h+='<button class="mv'+(i===cur?' cur':'')+(i%2===(OP.side==='w'?0:1)?' bm':'')+'" '+(clickable?'data-ply="'+i+'"':'disabled')+'>'+m+'</button>';
  });
  return h;
}
function gameAt(arr,n){const g=new Chess(); let last=null; for(let i=0;i<n;i++){const r=g.move(arr[i]); last={from:r.from,to:r.to};} return {g,last};}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function groupName(id){return (OP.groups.find(g=>g.id===id)||{}).name||'';}
const gShort=g=>g.name.split(' (')[0];
const shortName=o=>o.short||o.name;
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

/* ---------- Mini tableros (portadas de aperturas, familias y variantes) ---------- */
(function(){const st=document.createElement('style'); st.textContent=Object.keys(PIECES).map(k=>'.mini i.'+k+'{background-image:url("'+PIECES[k]+'")}').join(''); document.head.appendChild(st);})();
const MINI={};
function mini(arr,n,orient){
  const ck=orient+n+'|'+arr.slice(0,n).join(' '); if(MINI[ck]) return MINI[ck];
  const {g,last}=gameAt(arr,n); let h='<div class="mini" aria-hidden="true">';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const file=orient==='w'?FILES[c]:FILES[7-c], rank=orient==='w'?8-r:r+1, sq=file+rank, p=g.get(sq);
    let cls=(FILES.indexOf(file)+rank)%2===1?'d':'l';
    if(last&&(last.from===sq||last.to===sq)) cls+=' h';
    if(p) cls+=' '+p.color+p.type.toUpperCase();
    h+='<i class="'+cls+'"></i>';
  }
  return MINI[ck]=h+'</div>';
}
// Qué posición se muestra en cada portada:
// - variante: justo después de la jugada que la separa de las demás;
// - familia: la jugada que la separa de las otras familias, más lo que compartan sus variantes (hasta 3 plies);
// - apertura: op.cover si está definido, si no lo que comparten todas sus líneas.
function lcp(a,b){let i=0; while(i<a.length&&i<b.length&&a[i]===b[i]) i++; return i;}
OPENINGS.forEach(op=>{
  op.lines.forEach(l=>{let d=0; op.lines.forEach(o=>{if(o!==l) d=Math.max(d,lcp(l.arr,o.arr));}); l.key=Math.min(l.arr.length,d+1);});
  op.groups.forEach(gr=>{
    const ls=op.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const others=op.lines.filter(l=>l.group!==gr.id), a=ls[0].arr;
    let d=0; ls.forEach(l=>others.forEach(o=>{d=Math.max(d,lcp(l.arr,o.arr));}));
    let n=Math.min(a.length,d+1);
    while(n<d+4&&n<a.length&&ls.every(l=>l.arr[n]===a[n])) n++;
    gr.cov={arr:a,n};
  });
  let n=op.lines[0].arr.length; op.lines.forEach(l=>{n=Math.min(n,lcp(op.lines[0].arr,l.arr));});
  op.cov={arr:op.lines[0].arr,n:op.cover||Math.max(n,2)};
});

/* ---------- Racha de días ---------- */
const DAYS_KEY='maestro-ajedrez-days', LAST_OP_KEY='maestro-ajedrez-op';
let days=[]; try{days=JSON.parse(lsGet(DAYS_KEY)||'[]')||[];}catch(e){days=[];}
const dayStr=t=>{const d=new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
function markDay(){const t=dayStr(Date.now()); if(days[days.length-1]!==t){days.push(t); days=days.slice(-400); lsSet(DAYS_KEY,JSON.stringify(days));}}
function streak(){
  const set=new Set(days), d=new Date(); d.setHours(12,0,0,0); let t=d.getTime(), n=0;
  const today=set.has(dayStr(t)); if(!today) t-=86400e3;
  while(set.has(dayStr(t))){n++; t-=86400e3;}
  return {n,today};
}

/* ---------- Navegación (con historial: el botón atrás de Android vuelve dentro de la app) ---------- */
// d = profundidad en el historial (inicio = 0), para que Inicio vuelva directo.
// grp = familia elegida en los filtros de variantes.
let state={view:'home',tab:'leccion',sec:null,sub:null,grp:null,d:0};
let board=null, timer=null, keyHandler=null;
function clearTimer(){if(timer){clearTimeout(timer);timer=null;}}
function snap(){return {view:state.view,op:OP.id,tab:state.tab,sec:state.sec,sub:state.sub?JSON.parse(JSON.stringify(state.sub)):null,grp:state.grp,d:state.d};}
function restore(s){
  if(!s||!s.view){state={view:'home',tab:'leccion',sec:null,sub:null,grp:null,d:0}; return;}
  const o=OPENINGS.find(x=>x.id===s.op); if(o){OP=o; IDX=IDXS[o.id];}
  // 'school' es la vista vieja de la Escuela, hoy dentro de Aprender.
  state={view:s.view==='school'?'learn':s.view,tab:s.tab||'leccion',sec:s.sec||null,sub:s.sub||null,grp:s.grp||null,d:s.d||0};
  if(state.view==='learn'&&state.sub&&!state.sec){const m=SCHOOL.find(x=>x.id===state.sub.mod); if(m) state.sec=m.sec;}
}
function remember(){try{history.replaceState(snap(),'');}catch(e){}}
function nav(patch,push){Object.assign(state,patch); if(push) state.d++; try{history[push?'pushState':'replaceState'](snap(),'');}catch(e){} render();}
function setOp(o){if(o!==OP){OP=o; IDX=IDXS[o.id]; P=null; X=null;}}
window.addEventListener('popstate',e=>{restore(e.state); render();});
document.addEventListener('keydown',e=>{if(keyHandler&&!e.altKey&&!e.ctrlKey&&!e.metaKey) keyHandler(e);});

const TABS=[['leccion','Aprender'],['practica','Practicar'],['examen','Examen'],['progreso','Progreso']];
const TAB_NAME={leccion:'Aprender',practica:'Practicar',examen:'Examen',progreso:'Progreso'};
function renderNav(){
  const cur=state.view==='home'?'home':state.view==='learn'?'leccion':state.tab;
  $('#nav').innerHTML=[['home','Inicio']].concat(TABS).map(t=>'<button data-t="'+t[0]+'"'+(cur===t[0]?' class="on" aria-current="page"':'')+'>'+ico(t[0])+'<span>'+t[1]+'</span></button>').join('');
}
$('#nav').onclick=e=>{const b=e.target.closest('[data-t]'); if(b) goTab(b.dataset.t);};
function goTab(t){
  if(t==='home'){ if(state.view==='home') return; if(state.d>0) history.go(-state.d); else nav({view:'home',sub:null}); return; }
  const target=t==='leccion'?{view:'learn',sec:null,sub:null}:{view:'op',tab:t,sub:null};
  if(state.view==='home'){ nav(Object.assign(target,{grp:null}),true); return; }
  if(t==='leccion'&&state.view==='learn'){
    if(state.sub||state.sec){ if(state.d>1) history.go(-(state.d-1)); else nav({sec:null,sub:null}); }
    else window.scrollTo(0,0);
    return;
  }
  if(state.view==='op'&&t===state.tab&&t!=='leccion'){
    if(state.sub){ if(state.view==='op'&&state.tab==='examen') X=null; if(state.d>1) history.go(-(state.d-1)); else nav({sub:null}); }
    else window.scrollTo(0,0);
    return;
  }
  nav(target);
}

function render(){
  clearTimer(); keyHandler=null; if(board) board.cancel(true);
  renderNav(); window.scrollTo(0,0);
  const app=$('#app');
  if(state.view==='home'){ app.innerHTML=homeHTML(); bindHome(); return; }
  if(state.view==='learn'){ app.innerHTML='<main id="pane"></main>'; aprender(); return; }
  lsSet(LAST_OP_KEY,OP.id);
  app.innerHTML=(state.sub?'':opBar())+'<main id="pane"></main>';
  app.querySelectorAll('.opbar [data-op]').forEach(b=>b.onclick=()=>{const o=OPENINGS.find(x=>x.id===b.dataset.op); if(o!==OP){setOp(o); nav({sub:null,grp:null});}});
  ({leccion:leccion,practica:practica,examen:examen,progreso:progreso})[state.tab]();
}

/* ----- Inicio ----- */
let VER='';
function homeHTML(){
  const sk=streak();
  let tot=0,best=null,bestDue=0,fresh=0,freshOp=null;
  OPENINGS.forEach(o=>{const s=stats(Object.keys(IDXS[o.id].nodes)); tot+=s.due; if(s.due>bestDue){bestDue=s.due; best=o;} if(s.fresh&&!freshOp) freshOp=o; fresh+=s.fresh;});
  let hero;
  if(tot) hero={h:'Tenés '+tot+(tot===1?' posición':' posiciones')+' para repasar',p:'Arrancá por '+shortName(best)+' ('+bestDue+'). Un examen corto de diez posiciones y listo.',b:'Repasar ahora',a:'rev'};
  else if(fresh) hero={h:sk.today?'¡Bien ahí! Seguí así':'¿Una lección rápida?',p:'Te quedan '+fresh+' posiciones por aprender. Seguí con '+shortName(freshOp)+'.',b:'Seguir aprendiendo',a:'learn'};
  else hero={h:'Estás al día',p:'No hay repasos pendientes. Una práctica con todo el repertorio para no oxidarte.',b:'Practicar',a:'prac'};
  const thm=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length];
  return '<header class="top"><div class="brand"><span class="logo"><img alt="" src="'+PIECES.wN+'"></span>Maestro</div>'+
    '<div class="top-r"><span class="pill streak'+(sk.n?'':' off')+'" title="Días seguidos estudiando">'+ico('flame')+sk.n+(sk.n===1?' día':' días')+'</span>'+
    '<button id="theme" class="icon-btn" aria-label="'+THEME_LABEL[theme]+'. Cambiar a '+THEME_LABEL[thm].toLowerCase()+'">'+ico(theme)+'</button></div></header>'+
    '<section class="hero"><img class="wm" alt="" src="'+PIECES.wN+'"><h1>'+hero.h+'</h1><p>'+hero.p+'</p><button class="btn wh" id="heroGo" data-a="'+hero.a+'">'+ico('practica')+hero.b+'</button></section>'+
    learnCard()+
    '<h2 class="sec">Tus repertorios<small>'+REPS.length+'</small></h2><section class="ops">'+REPS.map(opCard).join('')+'</section>'+
    '<h2 class="sec">Para empezar<small>'+BASICS.length+'</small></h2><section class="ops">'+BASICS.map(opCard).join('')+'</section>'+
    '<p class="credit">Piezas: cburnett (CC BY-SA 3.0), vía lichess. Motor de reglas: chess.js. '+VER+'</p>';
}
const REPS=OPENINGS.filter(o=>o.level!=='basico'), BASICS=OPENINGS.filter(o=>o.level==='basico');
function opCard(o){
  const all=Object.keys(IDXS[o.id].nodes), m=mastery(all), st=stats(all);
  const tag=st.due?'<span class="tag">'+st.due+' para repasar</span>':st.fresh===all.length?'<span class="tag new">Nueva</span>':st.fresh?'<span class="tag new">'+st.fresh+' por aprender</span>':'<span class="tag ok">Al día</span>';
  return '<button class="op" data-op="'+o.id+'">'+mini(o.cov.arr,o.cov.n,o.side)+'<span class="op-b"><span class="op-n">'+esc(o.name)+'</span>'+
    '<span class="side '+o.side+'"><i></i>Con '+sideName(o.side)+' · '+o.lines.length+' variantes</span>'+tag+bar(m)+'</span></button>';
}
function bindOpCards(){document.querySelectorAll('.op[data-op]').forEach(b=>b.onclick=()=>{setOp(OPENINGS.find(o=>o.id===b.dataset.op)); nav({view:'op',tab:'leccion',sub:null,grp:null},true);});}
function learnCard(){
  const d=SCHOOL.filter(m=>schoolDone(m.id)).length, nx=nextMod();
  return '<h2 class="sec">Aprender<small>'+d+' de '+SCHOOL.length+' módulos</small></h2><button class="op school" id="toLearn"><span class="sc-ic">'+ico('escuela')+'</span><span class="op-b">'+
    '<span class="op-n">'+(nx?(d?'Seguí con: ':'Empezá por: ')+esc(nx.title):'Todos los módulos completos')+'</span><span class="side">Fundamentos, táctica y finales'+(nx?' · '+esc((SECTIONS.find(x=>x.id===nx.sec)||{}).title||''):'')+'</span>'+bar(Math.round(100*d/SCHOOL.length))+'</span></button>';
}
function bindHome(){
  $('#toLearn').onclick=()=>{const nx=nextMod(); nav(nx?{view:'learn',sec:nx.sec,sub:{mod:nx.id,step:0},grp:null}:{view:'learn',sec:null,sub:null,grp:null},true);};
  document.querySelectorAll('.op[data-op]').forEach(b=>b.onclick=()=>{setOp(OPENINGS.find(o=>o.id===b.dataset.op)); nav({view:'op',tab:'leccion',sub:null,grp:null},true);});
  $('#theme').onclick=()=>{theme=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length]; lsSet(THEME_KEY,theme); applyTheme(); toast(THEME_LABEL[theme]); render();};
  $('#heroGo').onclick=()=>{
    const a=$('#heroGo').dataset.a;
    if(a==='rev'){
      let best=OPENINGS[0],bd=-1; OPENINGS.forEach(o=>{const d=stats(Object.keys(IDXS[o.id].nodes)).due; if(d>bd){bd=d; best=o;}});
      setOp(best); startExam('all');
    } else if(a==='learn'){
      setOp(OPENINGS.find(o=>stats(Object.keys(IDXS[o.id].nodes)).fresh)||OP); nav({view:'op',tab:'leccion',sub:null,grp:null},true);
    } else { P=null; nav({view:'op',tab:'practica',sub:{line:'__all'},grp:null},true); }
  };
}

/* ----- Piezas comunes de las pestañas ----- */
function opBar(){
  return '<div class="opbar">'+OPENINGS.map(o=>'<button data-op="'+o.id+'"'+(o===OP?' class="on" aria-current="true"':'')+'><span class="side '+o.side+'"><i></i></span>'+esc(shortName(o))+'</button>').join('')+'</div>';
}
function ttl(t){return '<div class="ttl"><span class="ic '+t+'">'+ico(t)+'</span><h2>'+TAB_NAME[t]+'</h2></div>';}
function bar(m){return '<span class="meter"><span class="bar"><span style="width:'+m+'%"></span></span>'+m+'%</span>';}
function lineCard(l){
  const m=mastery(IDX.lineNodes[l.id]);
  return '<button class="card'+(m===100?' done':'')+'" data-line="'+l.id+'">'+mini(l.arr,l.key,OP.side)+'<span class="kmv">'+plyLabel(l.arr,l.key)+'</span><span class="cn">'+esc(l.name)+'</span>'+bar(m)+'</button>';
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
const upOne=()=>state.d>1?history.back():nav({sub:null});

/* ----- Aprender: secciones y módulos ----- */
const SCHOOL_KEY='maestro-ajedrez-school';
let sch={}; try{sch=JSON.parse(lsGet(SCHOOL_KEY)||'{}')||{};}catch(e){sch={};}
const schRec=id=>sch[id]||(sch[id]={done:false,ex:{}});
const saveSch=()=>lsSet(SCHOOL_KEY,JSON.stringify(sch));
function schoolDone(id){return !!(sch[id]&&sch[id].done);}
const exCount=m=>m.steps.filter(s=>s.t!=='info').length;
const exSolved=m=>Object.keys((sch[m.id]||{}).ex||{}).length;
const normSan=s=>s.replace(/[+#?!]/g,'');
// Si el texto del acierto ya arranca con una exclamación, no le sumamos otra.
const praise=(ok,pre)=>ok&&ok[0]==='¡'?ok:'<b>'+pre+'</b> '+(ok||'');
const secMods=id=>SCHOOL.filter(m=>m.sec===id);
const nextMod=()=>SCHOOL.find(m=>!schoolDone(m.id));
// Marcas (debajo de las piezas) y flechas (encima) sobre el tablero.
const MARK={g:'rgba(123,218,74,.6)',r:'rgba(255,92,108,.55)',y:'rgba(255,213,79,.65)',b:'rgba(91,140,255,.55)'};
function overlay(marks,arrows){
  const ov=$('#ov'), ar=$('#ov2'); if(!ov||!ar) return;
  ov.innerHTML=Object.keys(marks||{}).map(q=>{const p=board.xy(q); return '<rect x="'+p[0]+'" y="'+p[1]+'" width="1" height="1" fill="'+(MARK[marks[q]]||MARK.y)+'"/>';}).join('');
  ar.innerHTML='<defs><marker id="ah" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0 0L10 5L0 10z" fill="rgba(255,159,67,.92)"/></marker></defs>'+
    (arrows||[]).map(a=>{const p=board.xy(a.slice(0,2)), q=board.xy(a.slice(2,4)), x1=p[0]+.5, y1=p[1]+.5, x2=q[0]+.5, y2=q[1]+.5, d=Math.hypot(x2-x1,y2-y1), k=(d-.42)/d, j=.3/d;
      return '<line x1="'+(x1+(x2-x1)*j).toFixed(3)+'" y1="'+(y1+(y2-y1)*j).toFixed(3)+'" x2="'+(x1+(x2-x1)*k).toFixed(3)+'" y2="'+(y1+(y2-y1)*k).toFixed(3)+'" stroke="rgba(255,159,67,.92)" stroke-width=".16" stroke-linecap="round" marker-end="url(#ah)"/>';}).join('');
}
function modRow(m,k,nx){
  const dn=schoolDone(m.id), ec=exCount(m);
  return '<button class="mod'+(dn?' done':'')+(m===nx?' next':'')+'" data-mod="'+m.id+'"><span class="mnum">'+(dn?ico('check'):k+1)+'</span><img alt="" src="'+PIECES[m.icon]+'">'+
    '<span class="mb"><b>'+esc(m.title)+'</b><span>'+esc(m.desc)+'</span><span class="who">'+m.steps.length+' pasos · '+Math.min(exSolved(m),ec)+' de '+ec+' ejercicios</span></span></button>';
}
function secHead(title,sub){return '<div class="shead"><button id="secBack" class="backb" aria-label="Volver">'+ico('back')+'</button><div><h3 class="lt">'+esc(title)+'</h3><span class="lsub">'+esc(sub||'')+'</span></div></div>';}
function aprender(){
  const pane=$('#pane');
  if(state.sub){ modulePlayer(); return; }
  const back=()=>{ if(state.d>1) history.back(); else nav({sec:null}); };
  const S=SECTIONS.find(x=>x.id===state.sec);
  if(!S){
    const nx=nextMod();
    pane.innerHTML=ttl('leccion')+'<p class="lead">Elegí qué estudiar. Cada módulo combina explicación y ejercicios en el tablero.</p>'+
      (nx?'<h2 class="sec">Seguí por acá</h2><div class="path">'+modRow(nx,SCHOOL.indexOf(nx),nx)+'</div>':'')+
      '<h2 class="sec">Secciones</h2><div class="secs">'+SECTIONS.map(s=>{
        let meta, pct;
        if(s.id==='aperturas'){ const keys=OPENINGS.flatMap(o=>Object.keys(IDXS[o.id].nodes)); pct=mastery(keys); meta=OPENINGS.length+' aperturas'; }
        else { const ms=secMods(s.id), d=ms.filter(m=>schoolDone(m.id)).length; pct=Math.round(100*d/ms.length); meta=d+' de '+ms.length+' módulos'; }
        return '<button class="secc sec-'+s.id+'" data-sec="'+s.id+'"><img alt="" src="'+PIECES[s.icon]+'"><b>'+esc(s.title)+'</b><span>'+esc(s.desc)+'</span><span class="who">'+meta+'</span>'+bar(pct)+'</button>';
      }).join('')+'</div>';
    pane.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>nav({sec:b.dataset.sec},true));
    pane.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>{const m=SCHOOL.find(x=>x.id===b.dataset.mod); nav({sec:m.sec,sub:{mod:m.id,step:0}},true);});
    return;
  }
  if(S.id==='aperturas'){
    pane.innerHTML=secHead('Aperturas',OPENINGS.length+' aperturas')+'<p class="lead">'+S.desc+' Cada una tiene lección, práctica y examen.</p>'+
      '<h2 class="sec">Tus repertorios<small>'+REPS.length+'</small></h2><section class="ops">'+REPS.map(opCard).join('')+'</section>'+
      '<h2 class="sec">Para empezar<small>'+BASICS.length+'</small></h2><section class="ops">'+BASICS.map(opCard).join('')+'</section>';
    $('#secBack').onclick=back; bindOpCards(); return;
  }
  const ms=secMods(S.id), nx=ms.find(m=>!schoolDone(m.id));
  let h=secHead(S.title,ms.filter(m=>schoolDone(m.id)).length+' de '+ms.length+' módulos completados')+'<p class="lead">'+S.desc+'</p><div class="path">'+ms.map((m,k)=>modRow(m,k,nx)).join('')+'</div>';
  const plays=[]; ms.forEach(m=>m.steps.forEach((st,i)=>{if(st.t==='play') plays.push([m,i]);}));
  if(plays.length) h+='<h2 class="sec">Práctica libre</h2>'+plays.map(([m,i])=>'<button class="allcard" data-play="'+m.id+'|'+i+'">'+ico('practica')+'<span><b>'+esc(m.title)+'</b><span>Contra la máquina, desde una posición al azar</span></span></button>').join('');
  pane.innerHTML=h;
  $('#secBack').onclick=back;
  pane.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>nav({sub:{mod:b.dataset.mod,step:0}},true));
  pane.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{const p=b.dataset.play.split('|'); nav({sub:{mod:p[0],step:+p[1]}},true);});
}

/* ----- Práctica libre: mate con alfil y caballo contra la máquina ----- */
const isLight=sq=>(FILES.indexOf(sq[0])+(+sq[1]))%2===0;
function findPiece(g,color,type){for(let r=0;r<8;r++)for(let c=0;c<8;c++){const sq=FILES[c]+(r+1), p=g.get(sq); if(p&&p.color===color&&p.type===type) return sq;} return null;}
function kbnStart(){
  const rnd=n=>Math.floor(Math.random()*n), f=s=>s&7, r=s=>s>>3, dist=(a,b)=>Math.max(Math.abs(f(a)-f(b)),Math.abs(r(a)-r(b))), edge=s=>Math.min(f(s),7-f(s),r(s),7-r(s));
  for(let k=0;k<2000;k++){
    const wk=rnd(64), wb=rnd(64), wn=rnd(64), bk=rnd(64);
    if(new Set([wk,wb,wn,bk]).size<4||dist(wk,bk)<2||dist(wb,bk)<2||dist(wn,bk)<2||edge(bk)<2) continue;
    const b=Array(64).fill(''); b[wk]='K'; b[wb]='B'; b[wn]='N'; b[bk]='k';
    const rows=[]; for(let rr=7;rr>=0;rr--){let s='',e=0; for(let ff=0;ff<8;ff++){const c=b[rr*8+ff]; if(!c) e++; else {if(e) s+=e; e=0; s+=c;}} if(e) s+=e; rows.push(s);}
    const pl=rows.join('/'), t=new Chess();
    if(!t.load(pl+' b - - 0 1')||t.in_check()) continue; // con blancas por mover, el negro no puede estar en jaque
    return pl+' w - - 0 1';
  }
  return '8/8/8/3k4/8/3BK3/2N5/8 w - - 0 1';
}
// Defensa heurística: come si puede (tablas), y si no busca espacio, el centro y alejarse de las esquinas buenas.
function kbnDefense(g){
  const ms=g.moves({verbose:true}); if(!ms.length) return null;
  const cap=ms.find(m=>m.captured); if(cap) return cap;
  const bsq=findPiece(g,'w','b'), corners=bsq&&isLight(bsq)?['a8','h1']:['a1','h8'];
  let best=null, bs=-1e9;
  for(const m of ms){
    const fi=FILES.indexOf(m.to[0]), ri=+m.to[1]-1, t=new Chess(g.fen()); t.move(m.san);
    const f=t.fen().split(' '); f[1]='b'; f[3]='-'; const u=new Chess(); u.load(f.join(' '));
    const mob=u.moves().length, edge=Math.min(fi,7-fi,ri,7-ri);
    const cd=Math.min(...corners.map(c=>Math.max(Math.abs(FILES.indexOf(c[0])-fi),Math.abs(+c[1]-1-ri))));
    const sc=mob*1.2+edge*2.5+cd*1.5+Math.random()*.6;
    if(sc>bs){bs=sc; best=m;}
  }
  return best;
}

/* ----- Reproductor de módulos ----- */
function modulePlayer(){
  const pane=$('#pane');
  const m=SCHOOL.find(x=>x.id===state.sub.mod); if(!m){nav({sub:null}); return;}
  const N=m.steps.length; let i=Math.max(0,Math.min(N-1,state.sub.step||0)), cur=null;
  pane.innerHTML=studyLayout(m.title,'','Volver');
  $('#listBack').onclick=upOne;
  $('#ctrl').innerHTML='<button data-a="prev" class="btn soft" aria-label="Paso anterior">'+ico('prev')+'</button><button data-a="next" class="btn bl x2" id="nextB"></button>';
  $('#ctrl').onclick=e=>{const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; if(b.dataset.a==='prev') go(i-1); else if(i<N-1) go(i+1); else finishMod();};
  keyHandler=e=>{if(e.key==='ArrowRight'&&i<N-1){e.preventDefault(); go(i+1);} else if(e.key==='ArrowLeft'){e.preventDefault(); go(i-1);}};
  const rec=schRec(m.id);
  const solvedEx=()=>{rec.ex[i]=1; saveSch(); markDay();};
  const okMove=(st,san,t)=>st.goal==='mate'?t.in_checkmate():st.sol.some(x=>normSan(x)===normSan(san));
  function solution(){return cur.g.moves({verbose:true}).find(mv=>{const t=new Chess(cur.g.fen()); t.move(mv.san); return okMove(cur.st,mv.san,t);});}
  function go(n){if(n<0||n>=N) return; clearTimer(); i=n; state.sub.step=n; remember(); show();}
  function finishMod(){rec.done=true; saveSch(); markDay(); toast('¡Módulo completado: '+m.title+'!'); upOne();}
  function setNext(){
    const b=$('#nextB'), open=cur.st.t!=='info'&&!cur.done&&!rec.ex[i];
    b.className='btn x2 '+(open?'soft':'bl'); b.innerHTML=(i<N-1?(open?'Saltar':'Seguir'):'Terminar')+ico('next');
    $('#ctrl [data-a="prev"]').disabled=i===0;
    $('.lsub').textContent='Paso '+(i+1)+' de '+N;
  }
  function fb(cls,html){$('#fb').className='fb '+cls; $('#fb').innerHTML=html;}
  const sideOf=c=>c==='w'?'blancas':'negras';
  // Línea guiada: el usuario juega su bando y el rival responde solo.
  function lineMove(r,dragged){
    const st=cur.st, exp=cur.line[cur.p];
    if(normSan(r.san)===normSan(exp)){
      cur.g.move(r.san); cur.played.push(r.san); cur.p++; cur.tries=0;
      board.set(cur.g,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged});
      let msg=(st.notes||{})[cur.p-1]||'Bien.';
      $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
      if(cur.p>=cur.line.length){ cur.done=true; solvedEx(); fb('good',praise(st.ok,'¡Bien!')); setNext(); return; }
      fb('good',msg); cur.busy=true;
      timer=setTimeout(()=>{
        const rr=cur.g.move(cur.line[cur.p]); cur.played.push(rr.san); cur.p++; cur.busy=false;
        board.set(cur.g,{last:{from:rr.from,to:rr.to},anim:true,canMove:true});
        $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
        const n2=(st.notes||{})[cur.p-1];
        fb('',msg+'<br><span class="who">Las '+sideOf(rr.color)+' jugaron '+rr.san+'.</span>'+(n2?' '+n2:'')+' Te toca.');
      },520);
      return;
    }
    const alts=(st.alts||[])[cur.p/2]||[];
    const t=new Chess(cur.g.fen()); t.move(r.san);
    if(alts.some(a=>normSan(a)===normSan(r.san))&&t.in_checkmate()){
      cur.g.move(r.san); cur.played.push(r.san); cur.done=true; solvedEx();
      board.set(cur.g,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged}); $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
      fb('good','<b>¡Mate!</b> Por otro camino, pero igual de rápido.'); setNext(); return;
    }
    if(alts.some(a=>normSan(a)===normSan(r.san))){ board.set(cur.g,{last:cur.last,canMove:true}); fb('','<b>'+r.san+'</b> también gana igual de rápido, pero acá seguimos el método. Buscá otra.'); return; }
    cur.tries++; buzz(70);
    const ev=new Chess(cur.g.fen()).move(exp);
    board.set(cur.g,{last:cur.last,flash:{sq:r.to,kind:'bad'},hint:cur.tries>=2?ev.from:null,canMove:true});
    let msg='<b>'+r.san+'</b> no es la jugada del método.'+(t.in_stalemate()?' ¡Y encima ahoga!':'')+(cur.tries>=2?' Mirá la pieza marcada.':' Probá de nuevo.');
    if(cur.tries>=3) msg+='<br><button class="link-b" id="showSol">Ver la jugada</button>';
    fb('bad',msg);
    const ss=$('#showSol'); if(ss) ss.onclick=()=>lineMove(new Chess(cur.g.fen()).move(exp),false);
  }
  // Práctica libre de alfil y caballo contra la máquina.
  function playMove(r,dragged){
    cur.g.move(r.san); cur.n++; board.set(cur.g,{last:{from:r.from,to:r.to},anim:!dragged});
    if(cur.g.in_checkmate()){ cur.done=true; solvedEx(); fb('good','<b>¡Mate en '+cur.n+' jugadas!</b> '+(cur.n<=33?'Excelente técnica.':'Lo lograste: con práctica sale más rápido.')); setNext(); return; }
    if(cur.g.in_stalemate()){ cur.done=true; fb('bad','<b>Ahogado:</b> el rey negro no tiene jugadas y no está en jaque. Tablas. Probá con otra posición.'); return; }
    if(cur.n>=50){ cur.done=true; fb('bad','<b>50 jugadas sin mate:</b> tablas. Probá con otra posición.'); return; }
    cur.busy=true;
    timer=setTimeout(()=>{
      const bm=kbnDefense(cur.g), rr=cur.g.move(bm.san); cur.busy=false; cur.last={from:rr.from,to:rr.to};
      if(rr.captured){ cur.done=true; board.set(cur.g,{last:cur.last,anim:true,flash:{sq:rr.to,kind:'bad'}}); fb('bad','<b>El rey negro se comió tu '+(rr.captured==='b'?'alfil':'caballo')+'.</b> Sin esa pieza no hay mate: tablas. Cuidá que tus piezas estén defendidas.'); return; }
      board.set(cur.g,{last:cur.last,anim:true,canMove:true});
      fb('','Jugada '+(cur.n+1)+' de 50.');
    },420);
  }
  board=new Board($('#board'),{orient:'w',
    onMove:(from,to,dragged)=>{
      if(!cur||cur.done||cur.busy) return;
      const t=new Chess(cur.g.fen()), r=t.move({from,to,promotion:'q'}); if(!r) return;
      if(cur.st.t==='line') return lineMove(r,dragged);
      if(cur.st.t==='play') return playMove(r,dragged);
      if(cur.st.t!=='move') return;
      if(okMove(cur.st,r.san,t)){
        cur.done=true; solvedEx();
        board.set(t,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged});
        fb('good',praise(cur.st.ok,cur.st.goal==='mate'?'¡Jaque mate!':'¡Correcto!')); setNext(); return;
      }
      cur.tries++; buzz(70);
      const sol=solution();
      board.set(cur.g,{last:cur.last,flash:{sq:to,kind:'bad'},hint:cur.tries>=2&&sol?sol.from:null,canMove:true});
      let msg=t.in_stalemate()?'<b>¡Ahogado!</b> El rival no está en jaque y no tiene jugadas: eso es tablas. Probá otra.':
        cur.st.goal==='mate'?'<b>'+r.san+'</b> no da mate. Probá de nuevo.':'<b>'+r.san+'</b> no es la mejor. Probá de nuevo.';
      if(cur.tries>=2&&cur.st.hint) msg+='<br>Pista: '+cur.st.hint;
      if(cur.tries>=3) msg+='<br><button class="link-b" id="showSol">Ver la solución</button>';
      fb('bad',msg);
      const ss=$('#showSol'); if(ss) ss.onclick=()=>{const s2=solution(); if(!s2) return; const t2=new Chess(cur.g.fen()); t2.move(s2.san); cur.done=true;
        board.set(t2,{last:{from:s2.from,to:s2.to},anim:true}); fb('','La solución era <b>'+s2.san+'</b>. '+(cur.st.ok||'')); setNext();};
    },
    onTap:e=>{
      if(!cur||cur.st.t!=='tap'||cur.done) return;
      const sq=board.sqAt(e.clientX,e.clientY); if(!sq) return;
      if(cur.targets.includes(sq)){ cur.found.add(sq); board.set(cur.g,{last:cur.last}); }
      else { buzz(50); board.set(cur.g,{last:cur.last,flash:{sq,kind:'bad'}}); }
      const marks=Object.assign({},cur.st.marks); if(cur.st.from) marks[cur.st.from]='y'; cur.found.forEach(q=>{marks[q]='g';}); overlay(marks,null);
      if(cur.found.size>=cur.need){ cur.done=true; solvedEx(); fb('good',praise(cur.st.ok,'¡Bien!')); setNext(); }
      else fb('',cur.targets.includes(sq)?'Van '+cur.found.size+' de '+cur.need+'.':'<b>'+sq+'</b> no. Van '+cur.found.size+' de '+cur.need+'.');
    }});
  function show(){
    const st=m.steps[i], g=new Chess();
    if(st.t==='play') g.load(kbnStart()); else { if(st.fen) g.load(st.fen); if(st.moves) st.moves.split(' ').forEach(x=>g.move(x)); }
    const h=g.history({verbose:true}), lm=h.length?h[h.length-1]:null;
    cur={st,g,last:lm?{from:lm.from,to:lm.to}:null,tries:0,done:st.t==='info',found:new Set(),targets:[],need:0,line:[],p:0,played:[],n:0,busy:false};
    board.orient=st.orient||(st.t==='info'?'w':g.turn());
    $('#moves').innerHTML='';
    let html='<h3 class="sh">'+esc(st.h)+'</h3><p class="note">'+st.text+'</p>';
    if(st.t==='move'||st.t==='line'){
      board.set(g,{last:cur.last,canMove:true}); overlay(st.marks,null);
      if(st.t==='line') cur.line=st.line.split(' ');
      html+='<p class="turn">Juegan '+sideOf(g.turn())+'</p><div id="fb" class="fb'+(rec.ex[i]?' good':'')+'">'+(rec.ex[i]?'Ya lo resolviste antes. ¿Te sale de nuevo?':st.t==='line'?'Jugá las '+sideOf(g.turn())+': el rival responde solo.':'Mové una pieza en el tablero.')+'</div>';
    } else if(st.t==='tap'){
      cur.targets=st.targets||[...new Set(g.moves({square:st.from,verbose:true}).map(x=>x.to))];
      cur.need=st.need||cur.targets.length;
      board.set(g,{last:cur.last}); const mk=Object.assign({},st.marks); if(st.from) mk[st.from]='y'; overlay(mk,null);
      html+='<div id="fb" class="fb">Tocá las casillas en el tablero. Van 0 de '+cur.need+'.</div>';
    } else if(st.t==='play'){
      const light=isLight(findPiece(g,'w','b')), corners=light?['a8','h1']:['a1','h8'];
      board.set(g,{canMove:true}); overlay({[corners[0]]:'g',[corners[1]]:'g'},null);
      html+='<p class="turn">Juegan blancas</p><div id="fb" class="fb">Tu alfil es de casillas '+(light?'claras':'oscuras')+': las esquinas buenas son '+corners.join(' y ')+' (marcadas en verde). Jugada 1 de 50.</div><button class="btn soft wide" id="newPos">'+ico('restart')+'Otra posición</button>';
    } else { board.set(g,{last:cur.last}); overlay(st.marks,st.arrows); }
    $('#info').innerHTML=html; setNext();
    const np=$('#newPos'); if(np) np.onclick=()=>{clearTimer(); show();};
  }
  show();
}

/* ----- Lección ----- */
function leccion(){
  const pane=$('#pane');
  if(!state.sub){
    pane.innerHTML='<div class="ttl"><button id="toSecs" class="backb" aria-label="Volver a Aperturas">'+ico('back')+'</button><h2>'+esc(OP.name)+'</h2></div><div class="about"><p>'+OP.intro+'</p><button id="more">Leer más</button></div><p class="lead">Elegí una variante y recorrela jugada por jugada.</p>'+linesHTML();
    $('#toSecs').onclick=()=>{ if(state.d>1) history.back(); else nav({view:'learn',sec:'aperturas',sub:null}); };
    $('#more').onclick=()=>{const a=$('.about'); a.classList.toggle('open'); $('#more').textContent=a.classList.contains('open')?'Leer menos':'Leer más';};
    bindLines(id=>nav({sub:{line:id,ply:0}},true)); return;
  }
  const l=OP.lines.find(x=>x.id===state.sub.line); if(!l){nav({sub:null}); return;}
  const L=l.arr.length;
  pane.innerHTML=studyLayout(l.name,shortName(OP)+' · '+gShort(OP.groups.find(g=>g.id===l.group)||{name:''}));
  const go=n=>{n=Math.max(0,Math.min(L,n)); if(n===state.sub.ply) return; const anim=n===state.sub.ply+1; state.sub.ply=n; remember(); draw(anim);};
  board=new Board($('#board'),{orient:OP.side,onTap:e=>{const r=board.el.getBoundingClientRect(); go(state.sub.ply+(e.clientX-r.left>r.width/2?1:-1));}});
  const draw=anim=>{
    const n=state.sub.ply, {g,last}=gameAt(l.arr,n); board.set(g,{last,anim});
    const note=n>0?(l.notes[n-1]||''):'';
    const who=n===0?'':((n-1)%2===1?'Negras':'Blancas');
    let txt=n===0?'<p class="turn">¡Arrancamos!</p><p class="note">Avanzá con la flecha azul o tocando la mitad derecha del tablero. La izquierda vuelve atrás.</p>':
      '<p class="said"><b>'+plyLabel(l.arr,n)+'</b><span class="who">'+who+' · jugada '+n+' de '+L+'</span></p>'+(note?'<p class="note">'+note+'</p>':'<p class="note quiet">Jugada natural de la variante.</p>');
    if(n===L) txt+='<div class="plan"><h4>Plan del medio juego</h4><p>'+l.plan+'</p></div><button class="btn or wide" id="toPrac">'+ico('practica')+'Practicar esta variante</button>';
    $('#info').innerHTML=txt;
    $('#moves').innerHTML=moveList(l.arr,n-1,true);
    $('#moves').querySelectorAll('[data-ply]').forEach(b=>b.onclick=()=>go(+b.dataset.ply+1));
    const cur=$('#moves .cur'); if(cur) cur.scrollIntoView({block:'nearest',inline:'nearest'});
    const tp=$('#toPrac'); if(tp) tp.onclick=()=>{P=null; nav({tab:'practica',sub:{line:l.id}},true);};
    $('#ctrl').querySelectorAll('button').forEach(b=>{const a=b.dataset.a; b.disabled=(a==='first'||a==='prev')?n===0:n===L;});
  };
  $('#ctrl').innerHTML='<button data-a="first" class="btn soft" aria-label="Inicio">'+ico('first')+'</button><button data-a="prev" class="btn soft" aria-label="Anterior">'+ico('prev')+'</button>'+
    '<button data-a="next" class="btn bl x2" aria-label="Siguiente">'+ico('next')+'</button><button data-a="last" class="btn soft" aria-label="Final">'+ico('last')+'</button>';
  $('#ctrl').onclick=e=>{const b=e.target.closest('[data-a]'); if(!b)return; const a=b.dataset.a, n=state.sub.ply; go(a==='first'?0:a==='last'?L:a==='prev'?n-1:n+1);};
  keyHandler=e=>{const n=state.sub.ply, k={ArrowRight:n+1,ArrowLeft:n-1,Home:0,End:L}[e.key]; if(k!==undefined){e.preventDefault(); go(k);}};
  $('#listBack').onclick=upOne;
  draw(false);
}

/* ----- Práctica ----- */
let P=null;
function practica(){
  if(!state.sub){
    $('#pane').innerHTML=ttl('practica')+'<p class="lead">Jugás con '+sideName(OP.side)+'. La app mueve las '+sideName(OP.side==='w'?'b':'w')+' y te corrige si salís del repertorio.</p>'+
      '<button class="allcard" data-line="__all">'+ico('shuffle')+'<span><b>Todo el repertorio</b><span>El rival elige al azar entre todas sus opciones</span></span></button>'+linesHTML();
    bindLines(id=>{P=null; nav({sub:{line:id}},true);}); return;
  }
  if(!P||P.lineId!==state.sub.line||P.op!==OP.id) startPractice(); else mountPractice();
}
function startPractice(){
  clearTimer();
  P={op:OP.id,lineId:state.sub.line,g:new Chess(),hist:[],last:null,errors:0,tries:0,done:false,msg:'',hint:null,flash:null,anim:false};
  mountPractice();
}
function mountPractice(){
  const all=P.lineId==='__all', l=all?null:OP.lines.find(x=>x.id===P.lineId);
  if(!all&&!l){P=null; nav({sub:null}); return;}
  $('#pane').innerHTML=studyLayout(all?'Todo el repertorio':l.name,shortName(OP)+' · '+(all?'el rival elige al azar':gShort(OP.groups.find(g=>g.id===l.group)||{name:''})));
  $('#listBack').onclick=upOne;
  $('#ctrl').innerHTML='<button data-a="hint" class="btn or">'+ico('hint')+'Pista</button><button data-a="restart" class="btn soft">'+ico('restart')+'Reiniciar</button>';
  $('#ctrl').onclick=e=>{const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='hint'&&!P.done&&P.g.turn()===OP.side){const exp=expected(); if(exp){const t=new Chess(P.g.fen()); const r=t.move(exp); P.hint=r.from; P.tries++; P.msg='Mové la pieza marcada.'; drawP(true);}}
    if(a==='restart') startPractice();};
  board=new Board($('#board'),{orient:OP.side,onMove:userMove});
  drawP(); step();
}
function expected(){
  if(P.lineId==='__all') return IDX.user[keyOf(P.g)]||null;
  const l=OP.lines.find(x=>x.id===P.lineId); return l.arr[P.hist.length]||null;
}
function oppNext(){
  if(P.lineId==='__all'){const s=IDX.opp[keyOf(P.g)]; if(!s) return null; const a=[...s]; return a[Math.floor(Math.random()*a.length)];}
  const l=OP.lines.find(x=>x.id===P.lineId); return l.arr[P.hist.length]||null;
}
function step(){
  if(P.done) return;
  if(P.g.turn()!==OP.side){
    const m=oppNext(); if(!m){finish(); return;}
    board.canMove=false;
    timer=setTimeout(()=>{const r=P.g.move(m); P.hist.push(r.san); P.last={from:r.from,to:r.to}; P.flash=null; P.anim=true; drawP(); step();},480);
  } else { if(!expected()){finish(); return;} drawP(true); }
}
function userMove(from,to,dragged){
  const exp=expected(); if(!exp) return;
  const t=new Chess(P.g.fen()); const r=t.move({from,to,promotion:'q'}); if(!r) return;
  const k=keyOf(P.g);
  if(r.san===exp){
    grade(k,P.tries===0);
    P.g.move(r.san); P.hist.push(r.san); P.last={from:r.from,to:r.to}; P.flash={sq:r.to,kind:'good'}; P.hint=null; P.anim=!dragged;
    const node=IDX.nodes[k]; P.msg=(P.tries?'<b>Bien, ahora sí.</b> ':'<b>¡Correcto!</b> ')+(node&&node.note?node.note:'');
    P.tries=0; drawP(); step();
  } else {
    P.tries++; P.errors++; buzz(70);
    if(P.tries>=2){ const c=new Chess(P.g.fen()); const cr=c.move(exp); P.hint=cr.from; P.msg='En el repertorio se juega <b>'+exp+'</b>. Movela vos para seguir.'; }
    else P.msg='<b>'+r.san+'</b> no es la jugada del repertorio. Probá de nuevo.';
    P.flash={sq:to,kind:'bad'}; drawP(true);
  }
}
function finish(){
  P.done=true; const all=P.lineId==='__all', h=P.hist.join(' ');
  const l=all?(OP.lines.find(x=>x.arr.join(' ')===h)||OP.lines.find(x=>x.arr.join(' ').startsWith(h)||h.startsWith(x.arr.join(' ')))):OP.lines.find(x=>x.id===P.lineId);
  P.msg='<b>'+(P.errors?'Variante completa con '+P.errors+(P.errors===1?' error':' errores'):'¡Variante completa sin errores!')+'</b>'+(l?'<div class="plan"><h4>Plan: '+esc(l.name)+'</h4><p>'+l.plan+'</p></div>':'')+'<button class="btn wide" id="again">'+ico('restart')+'Otra vez</button>';
  drawP();
}
function drawP(can){
  board.set(P.g,{last:P.last,hint:P.hint,flash:P.flash,anim:P.anim,canMove:!!can&&!P.done&&P.g.turn()===OP.side}); P.anim=false;
  const turnTxt=P.done?'':(P.g.turn()===OP.side?'<p class="turn">Te toca con '+sideName(OP.side)+'</p>':'<p class="turn quiet">Juega el rival…</p>');
  $('#info').innerHTML=turnTxt+(P.msg?'<div class="fb'+(P.done&&!P.errors?' good':'')+'">'+P.msg+'</div>':'');
  $('#moves').innerHTML=moveList(P.hist,P.hist.length-1,false);
  const a=$('#again'); if(a) a.onclick=()=>startPractice();
}

/* ----- Examen ----- */
let X=null;
function mastered(keys){return keys.filter(k=>(prog[k]||{box:0}).box>=3).length;}
function examen(){
  const pane=$('#pane');
  if(!state.sub||!X||X.op!==OP.id){
    if(state.sub){X=null; nav({sub:null}); return;}
    X=null;
    const all=Object.keys(IDX.nodes), st=stats(all);
    const today=st.due?(st.due===1?'Primero sale la posición que toca repasar.':'Primero salen las '+st.due+' que toca repasar y las que fallaste.'):st.fresh?'No tenés repasos pendientes. Van a salir posiciones que todavía no viste.':'Estás al día: el examen elige las que hace más tiempo no ves.';
    let h=ttl('examen')+'<div class="tiles"><div class="tile due"><b>'+st.due+'</b><span>para repasar</span></div><div class="tile"><b>'+st.fresh+'</b><span>sin ver</span></div><div class="tile ok"><b>'+mastered(all)+'</b><span>dominadas</span></div></div>'+
      '<div class="panel"><div class="big"><div><h3>Diez posiciones, un intento cada una</h3><p>'+today+'</p></div></div><button class="btn wide" data-g="all">'+ico('examen')+'Empezar examen</button></div>'+
      '<h2 class="sec">Examen por familia</h2><div class="cards">'+OP.groups.map(gr=>{
        if(!gr.cov) return '';
        const ks=[...new Set(OP.lines.filter(l=>l.group===gr.id).flatMap(l=>IDX.lineNodes[l.id]))], s=stats(ks);
        return '<button class="card" data-g="'+gr.id+'">'+mini(gr.cov.arr,gr.cov.n,OP.side)+'<span class="cn">'+esc(gShort(gr))+'</span><span class="who">'+ks.length+' posiciones'+(s.due?' · <span style="color:var(--orange)">'+s.due+(s.due===1?' pendiente':' pendientes')+'</span>':'')+'</span></button>';
      }).join('')+'</div>';
    pane.innerHTML=h;
    pane.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>startExam(b.dataset.g));
    return;
  }
  mountExam();
}
function startExam(gid){
  const now=Date.now();
  let keys=Object.keys(IDX.nodes).filter(k=>{if(gid==='all')return true; return OP.lines.some(l=>l.group===gid&&IDX.lineNodes[l.id].includes(k));});
  keys=keys.map(k=>{const r=prog[k]||{box:0,last:0}; const overdue=(now-r.last)/(INTERVAL[r.box]||1); return {k,s:r.box*2-Math.min(overdue,3)+Math.random()*1.5};}).sort((a,b)=>a.s-b.s).slice(0,10).map(o=>o.k);
  keys.sort(()=>Math.random()-.5);
  X={op:OP.id,keys,i:0,score:0,answered:false,res:[]}; nav({view:'op',tab:'examen',sub:{exam:gid}},true);
}
function examDots(){return '<div class="dots" aria-hidden="true">'+X.keys.map((k,i)=>'<i class="'+(i<X.res.length?(X.res[i].ok?'ok':'ko'):i===X.i?'now':'')+'"></i>').join('')+'</div><span class="score-pill">'+X.score+' / '+X.keys.length+'</span>';}
function mountExam(){
  if(X.i>=X.keys.length){
    const perfect=X.score===X.keys.length;
    $('#pane').innerHTML='<div class="shead"><button id="listBack" class="backb" aria-label="Volver">'+ico('back')+'</button><div><h3 class="lt">Resultado</h3><span class="lsub">'+shortName(OP)+'</span></div></div>'+
      '<div class="panel"><div class="big">'+ring(Math.round(100*X.score/X.keys.length))+'<div><h3>'+(perfect?'¡Examen perfecto!':X.score+' de '+X.keys.length+' bien')+'</h3><p>'+(perfect?'Todas las posiciones suben de caja.':'Las que fallaste vuelven a aparecer antes en el próximo examen.')+'</p></div></div></div>'+
      '<div class="panel">'+X.res.map(r=>'<div class="rv '+(r.ok?'ok':'ko')+'"><span>'+esc(r.line)+'</span><b>'+r.san+'</b></div>').join('')+'</div>'+
      '<button class="btn wide" id="newEx">'+ico('restart')+'Nuevo examen</button>';
    $('#newEx').onclick=$('#listBack').onclick=()=>{X=null; upOne();}; return;
  }
  const node=IDX.nodes[X.keys[X.i]];
  $('#pane').innerHTML=studyLayout('Posición '+(X.i+1)+' de '+X.keys.length,shortName(OP)+' · '+node.line.name,'Salir del examen');
  $('#listBack').onclick=()=>{X=null; upOne();};
  $('#ctrl').innerHTML=examDots();
  const g=new Chess(node.fen);
  board=new Board($('#board'),{orient:OP.side,onMove:(from,to,dragged)=>{
    if(X.answered) return; const t=new Chess(node.fen); const r=t.move({from,to,promotion:'q'}); if(!r) return;
    X.answered=true; const ok=r.san===node.san; grade(node.key,ok); if(ok) X.score++; else buzz(70);
    X.res.push({ok,san:node.san,line:node.line.name});
    const c=new Chess(node.fen); const cr=c.move(node.san);
    board.set(c,{last:{from:cr.from,to:cr.to},flash:{sq:cr.to,kind:ok?'good':'bad'},anim:!ok||!dragged});
    $('#ctrl').innerHTML=examDots();
    $('#info').innerHTML='<div class="fb '+(ok?'good':'bad')+'"><b>'+(ok?'¡Correcto! ':'La jugada era ')+node.san+'.</b> '+(ok?'':'Jugaste '+r.san+'. ')+(node.note||'')+'</div><button class="btn wide" id="nx">'+(X.i+1<X.keys.length?'Siguiente':'Ver resultado')+ico('next')+'</button>';
    $('#nx').onclick=()=>{X.i++; X.answered=false; render();};
  }});
  X.answered=false;
  board.set(g,{last:node.last,canMove:true});
  $('#info').innerHTML='<p class="turn">Juegan '+sideName(OP.side)+'</p><p class="note quiet">¿Qué dice el repertorio? Tenés un solo intento.</p>';
  $('#moves').innerHTML=moveList(node.prefix,node.prefix.length-1,false);
}

/* ----- Progreso ----- */
function ring(p){
  const c=2*Math.PI*42;
  return '<div class="ring"><svg viewBox="0 0 104 104" aria-hidden="true"><circle cx="52" cy="52" r="42" fill="none" stroke="var(--surface2)" stroke-width="12"/>'+
    (p>0?'<circle cx="52" cy="52" r="42" fill="none" stroke="var(--lime)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(c*p/100).toFixed(1)+' '+c.toFixed(1)+'"/>':'')+'</svg><b>'+p+'%</b></div>';
}
function progreso(){
  const all=Object.keys(IDX.nodes), st=stats(all), m=mastery(all);
  let h=ttl('progreso')+'<div class="panel"><div class="big">'+ring(m)+'<div><h3>'+(m===100?'¡Repertorio dominado!':m?'Vas bien':'Todavía sin empezar')+'</h3><p>'+(all.length-st.fresh)+' de '+all.length+' posiciones vistas en '+esc(shortName(OP))+'.</p></div></div></div>'+
    '<div class="tiles"><div class="tile"><b>'+(all.length-st.fresh)+'</b><span>vistas</span></div><div class="tile due"><b>'+st.due+'</b><span>para repasar</span></div><div class="tile ok"><b>'+mastered(all)+'</b><span>dominadas</span></div></div>';
  OP.groups.forEach(gr=>{
    const ls=OP.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const keys=[...new Set(ls.flatMap(l=>IDX.lineNodes[l.id]))];
    h+='<div class="gh"><span>'+esc(gShort(gr))+'</span><small>'+mastery(keys)+'%</small></div><div class="panel">';
    ls.forEach(l=>{const ks=IDX.lineNodes[l.id], lm=mastery(ks), errs=ks.reduce((a,k)=>a+((prog[k]||{}).ko||0),0);
      h+='<div class="prow">'+mini(l.arr,l.key,OP.side)+'<div class="pb"><span class="pn">'+esc(l.name)+'</span>'+bar(lm)+'</div>'+(errs?'<span class="pe">'+errs+' err.</span>':'')+'</div>';});
    h+='</div>';
  });
  h+='<p class="lead">Una posición cuenta como dominada cuando la acertaste tres veces seguidas. Un error la vuelve a cero.</p><button class="danger" id="reset">Borrar progreso</button>';
  $('#pane').innerHTML=h;
  $('#reset').onclick=()=>{if(confirm('¿Borrar todo el progreso guardado en este dispositivo?')){prog={}; save(); render();}};
}

/* ---------- Arranque ---------- */
if(typeof BUILD!=='undefined'){
  let day=BUILD.date; try{day=new Date(BUILD.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
  VER='Versión del '+day+'.';
  const seen=lsGet(SEEN_KEY); if(seen&&seen!==BUILD.v) setTimeout(()=>toast('App actualizada · versión del '+day),400); lsSet(SEEN_KEY,BUILD.v);
}
{const o=OPENINGS.find(x=>x.id===lsGet(LAST_OP_KEY)); if(o){OP=o; IDX=IDXS[o.id];}}
try{restore(history.state);}catch(e){}
remember();
render();

// PWA: solo cuando se sirve por http(s) fuera de claude.ai (GitHub Pages o localhost).
if(/^https?:$/.test(location.protocol)&&!/claude\.ai$|claudeusercontent/.test(location.hostname)&&'serviceWorker' in navigator){
  [['manifest','manifest.webmanifest'],['icon','icons/icon-192.png']].forEach(a=>{const l=document.createElement('link'); l.rel=a[0]; l.href=a[1]; document.head.appendChild(l);});
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
