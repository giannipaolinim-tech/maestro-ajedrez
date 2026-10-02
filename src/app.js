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
function grade(k,good){const r=rec(k); r.last=Date.now(); if(good){r.box=Math.min(6,r.box+1);r.ok++;} else {r.box=0;r.ko++;} save();}
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
function toast(msg){
  const old=$('.toast'); if(old) old.remove();
  const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

/* ---------- Navegación (con historial: el botón atrás de Android vuelve dentro de la app) ---------- */
// d = profundidad en el historial (inicio = 0), para que ‹ vuelva directo al inicio.
let state={view:'home',tab:'leccion',sub:null,d:0};
let board=null, timer=null, keyHandler=null;
function clearTimer(){if(timer){clearTimeout(timer);timer=null;}}
function snap(){return {view:state.view,op:OP.id,tab:state.tab,sub:state.sub?JSON.parse(JSON.stringify(state.sub)):null,d:state.d};}
function restore(s){
  if(!s||!s.view){state={view:'home',tab:'leccion',sub:null,d:0}; return;}
  const o=OPENINGS.find(x=>x.id===s.op); if(o){OP=o; IDX=IDXS[o.id];}
  state={view:s.view,tab:s.tab||'leccion',sub:s.sub||null,d:s.d||0};
}
function remember(){try{history.replaceState(snap(),'');}catch(e){}}
function nav(patch,push){Object.assign(state,patch); if(push) state.d++; try{history[push?'pushState':'replaceState'](snap(),'');}catch(e){} render();}
window.addEventListener('popstate',e=>{restore(e.state); render();});
document.addEventListener('keydown',e=>{if(keyHandler&&!e.altKey&&!e.ctrlKey&&!e.metaKey) keyHandler(e);});

function render(){
  clearTimer(); keyHandler=null; if(board) board.cancel(true);
  const app=$('#app');
  if(state.view==='home'){ app.innerHTML=homeHTML(); bindHome(); window.scrollTo(0,0); return; }
  app.innerHTML=openingShell();
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{ if(b.dataset.tab!==state.tab) nav({tab:b.dataset.tab,sub:null}); });
  $('#back').onclick=()=>state.d>0?history.go(-state.d):nav({view:'home',sub:null});
  ({leccion:leccion,practica:practica,examen:examen,progreso:progreso})[state.tab]();
}

function homeHTML(){
  return '<header class="home-h"><div class="home-top"><h1>Maestro</h1><button id="theme" class="chip">'+THEME_LABEL[theme]+'</button></div>'+
  '<p class="lede">Elegí qué querés estudiar. Cada apertura tiene lecciones, práctica guiada y exámenes que repiten lo que fallás.</p></header>'+
  '<section class="catalog">'+OPENINGS.map(o=>{
    const all=Object.keys(IDXS[o.id].nodes), m=mastery(all), st=stats(all);
    const status=st.due?'<b class="due">'+st.due+' para repasar</b>':(st.fresh===all.length?'Sin empezar':st.fresh?st.fresh+' posiciones nuevas':'Todo al día');
    return '<button class="op-card '+o.side+'" data-op="'+o.id+'"><div class="op-top"><span class="op-name">'+o.name+'</span><span class="op-side">Con '+sideName(o.side)+'</span></div>'+
    '<span class="op-moves">'+o.first+'</span><span class="op-meta">'+o.lines.length+' variantes · '+all.length+' posiciones</span>'+
    '<span class="bar"><span style="width:'+m+'%"></span></span><span class="op-pct"><span>'+m+'% dominado</span><span>'+status+'</span></span></button>';
  }).join('')+'</section>';
}
function bindHome(){
  document.querySelectorAll('.op-card').forEach(b=>b.onclick=()=>{OP=OPENINGS.find(o=>o.id===b.dataset.op); IDX=IDXS[OP.id]; P=null; X=null; nav({view:'op',tab:'leccion',sub:null},true);});
  $('#theme').onclick=()=>{theme=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length]; lsSet(THEME_KEY,theme); applyTheme(); $('#theme').textContent=THEME_LABEL[theme];};
}

function openingShell(){
  const tabs=[['leccion','Lección'],['practica','Práctica'],['examen','Examen'],['progreso','Progreso']];
  return '<header class="op-h"><button id="back" class="back" aria-label="Volver">‹</button><div><h2>'+OP.name+'</h2><span class="sub">'+OP.sub+'</span></div></header>'+
  '<nav class="tabs">'+tabs.map(t=>'<button data-tab="'+t[0]+'" class="'+(state.tab===t[0]?'on':'')+'">'+t[1]+'</button>').join('')+'</nav><main id="pane"></main>';
}

function linePicker(title,withAll){
  let h='<div class="picker"><p class="intro">'+title+'</p>';
  if(withAll) h+='<button class="line all" data-line="__all"><span class="ln">Todo el repertorio</span><span class="ld">El rival elige al azar entre todas sus opciones</span></button>';
  OP.groups.forEach(gr=>{
    const ls=OP.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    h+='<h3>'+gr.name+'</h3><p class="gd">'+gr.desc+'</p>';
    ls.forEach(l=>{const m=mastery(IDX.lineNodes[l.id]); h+='<button class="line" data-line="'+l.id+'"><span class="ln">'+l.name+'</span><span class="lp"><span class="bar sm"><span style="width:'+m+'%"></span></span>'+m+'%</span></button>';});
  });
  return h+'</div>';
}
function bindPicker(fn){$('#pane').querySelectorAll('.line').forEach(b=>b.onclick=()=>fn(b.dataset.line));}
function studyLayout(title,sub,backTxt){
  return '<div class="study"><div class="bwrap"><div id="board" class="board"></div><div id="ctrl" class="ctrl"></div></div>'+
  '<aside class="side"><button id="listBack" class="link">‹ '+(backTxt||'Variantes')+'</button><h3 class="lt">'+title+'</h3><span class="lsub">'+sub+'</span><div id="info" class="info"></div><div id="moves" class="moves"></div></aside></div>';
}
const upOne=()=>state.d>1?history.back():nav({sub:null});

/* ----- Lección ----- */
function leccion(){
  const pane=$('#pane');
  if(!state.sub){ pane.innerHTML='<p class="intro strong">'+OP.intro+'</p>'+linePicker('Elegí una variante para recorrerla jugada por jugada.',false); bindPicker(id=>nav({sub:{line:id,ply:0}},true)); return; }
  const l=OP.lines.find(x=>x.id===state.sub.line); if(!l){nav({sub:null}); return;}
  const L=l.arr.length;
  pane.innerHTML=studyLayout(l.name,groupName(l.group));
  const go=n=>{n=Math.max(0,Math.min(L,n)); if(n===state.sub.ply) return; const anim=n===state.sub.ply+1; state.sub.ply=n; remember(); draw(anim);};
  board=new Board($('#board'),{orient:OP.side,onTap:e=>{const r=board.el.getBoundingClientRect(); go(state.sub.ply+(e.clientX-r.left>r.width/2?1:-1));}});
  const draw=anim=>{
    const n=state.sub.ply, {g,last}=gameAt(l.arr,n); board.set(g,{last,anim});
    const note=n>0?(l.notes[n-1]||''):'';
    const who=n===0?'':((n-1)%2===1?'Negras':'Blancas');
    let txt=n===0?'<p class="note">Posición inicial. Avanzá con ▶ o tocando la mitad derecha del tablero; la izquierda vuelve atrás.</p>':
      '<p class="said"><span class="who">'+who+'</span> <b>'+(Math.floor((n-1)/2)+1)+(n%2===0?'...':'. ')+l.arr[n-1]+'</b> <span class="who">· '+n+' de '+L+'</span></p>'+(note?'<p class="note">'+note+'</p>':'<p class="note quiet">Jugada natural de la variante.</p>');
    if(n===L) txt+='<div class="plan"><h4>Plan del medio juego</h4><p>'+l.plan+'</p><button class="primary" id="toPrac">Practicar esta variante</button></div>';
    $('#info').innerHTML=txt;
    $('#moves').innerHTML=moveList(l.arr,n-1,true);
    $('#moves').querySelectorAll('[data-ply]').forEach(b=>b.onclick=()=>go(+b.dataset.ply+1));
    const cur=$('#moves .cur'); if(cur) cur.scrollIntoView({block:'nearest',inline:'nearest'});
    const tp=$('#toPrac'); if(tp) tp.onclick=()=>{P=null; nav({tab:'practica',sub:{line:l.id}},true);};
    $('#ctrl').querySelectorAll('button').forEach(b=>{const a=b.dataset.a; b.disabled=(a==='first'||a==='prev')?n===0:n===L;});
  };
  $('#ctrl').innerHTML='<button data-a="first" aria-label="Inicio">⏮</button><button data-a="prev" aria-label="Anterior">◀</button><button data-a="next" class="big" aria-label="Siguiente">▶</button><button data-a="last" aria-label="Final">⏭</button>';
  $('#ctrl').onclick=e=>{const b=e.target.closest('[data-a]'); if(!b)return; const a=b.dataset.a, n=state.sub.ply; go(a==='first'?0:a==='last'?L:a==='prev'?n-1:n+1);};
  keyHandler=e=>{const n=state.sub.ply, k={ArrowRight:n+1,ArrowLeft:n-1,Home:0,End:L}[e.key]; if(k!==undefined){e.preventDefault(); go(k);}};
  $('#listBack').onclick=upOne;
  draw(false);
}

/* ----- Práctica ----- */
let P=null;
function practica(){
  if(!state.sub){ $('#pane').innerHTML=linePicker('Jugás con '+sideName(OP.side)+'. La app mueve las '+sideName(OP.side==='w'?'b':'w')+' y te corrige si salís del repertorio.',true); bindPicker(id=>{P=null; nav({sub:{line:id}},true);}); return; }
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
  $('#pane').innerHTML=studyLayout(all?'Todo el repertorio':l.name,all?'El rival elige al azar':groupName(l.group));
  $('#listBack').onclick=upOne;
  $('#ctrl').innerHTML='<button data-a="hint">Pista</button><button data-a="restart">Reiniciar</button>';
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
    const node=IDX.nodes[k]; P.msg=(P.tries?'Bien, ahora sí. ':'Correcto. ')+(node&&node.note?node.note:'');
    P.tries=0; drawP(); step();
  } else {
    P.tries++; P.errors++; buzz(70);
    if(P.tries>=2){ const c=new Chess(P.g.fen()); const cr=c.move(exp); P.hint=cr.from; P.msg='En el repertorio se juega <b>'+exp+'</b>. Movela vos para seguir.'; }
    else P.msg=r.san+' no es la jugada del repertorio. Probá de nuevo.';
    P.flash={sq:to,kind:'bad'}; drawP(true);
  }
}
function finish(){
  P.done=true; const all=P.lineId==='__all', h=P.hist.join(' ');
  const l=all?(OP.lines.find(x=>x.arr.join(' ')===h)||OP.lines.find(x=>x.arr.join(' ').startsWith(h)||h.startsWith(x.arr.join(' ')))):OP.lines.find(x=>x.id===P.lineId);
  P.msg='<b>Variante completa'+(P.errors?' con '+P.errors+(P.errors===1?' error':' errores'):' sin errores')+'.</b>'+(l?'<div class="plan"><h4>Plan: '+l.name+'</h4><p>'+l.plan+'</p></div>':'')+'<button class="primary" id="again">Otra vez</button>';
  drawP();
}
function drawP(can){
  board.set(P.g,{last:P.last,hint:P.hint,flash:P.flash,anim:P.anim,canMove:!!can&&!P.done&&P.g.turn()===OP.side}); P.anim=false;
  const turnTxt=P.done?'':(P.g.turn()===OP.side?'<p class="turn">Te toca con '+sideName(OP.side)+'.</p>':'<p class="turn quiet">Juega el rival…</p>');
  $('#info').innerHTML=turnTxt+(P.msg?'<div class="fb'+(P.done&&!P.errors?' good':'')+'">'+P.msg+'</div>':'');
  $('#moves').innerHTML=moveList(P.hist,P.hist.length-1,false);
  const a=$('#again'); if(a) a.onclick=()=>startPractice();
}

/* ----- Examen ----- */
let X=null;
function examen(){
  const pane=$('#pane');
  if(!state.sub||!X||X.op!==OP.id){
    if(state.sub){X=null; nav({sub:null}); return;}
    X=null;
    const st=stats(Object.keys(IDX.nodes));
    const today=st.due?'Hoy tenés <b>'+st.due+'</b> '+(st.due===1?'posición':'posiciones')+' para repasar'+(st.fresh?' y '+st.fresh+' sin ver':'')+'.':st.fresh?'No tenés repasos pendientes. Quedan '+st.fresh+' posiciones sin ver.':'Estás al día con todo el repertorio.';
    pane.innerHTML='<div class="picker"><p class="intro strong">Diez posiciones de todo el repertorio. Tenés un intento por posición.</p><p class="intro">Primero aparecen las que fallaste y las que hace más tiempo no ves. '+today+'</p><div class="exopts"><button class="primary" data-g="all">Empezar examen</button>'+OP.groups.map(g=>'<button class="ghost" data-g="'+g.id+'">Solo '+g.name.split(' (')[0]+'</button>').join('')+'</div></div>';
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
  X={op:OP.id,keys,i:0,score:0,answered:false,res:[]}; nav({sub:{exam:gid}},true);
}
function examDots(){return '<div class="dots" aria-hidden="true">'+X.keys.map((k,i)=>'<i class="'+(i<X.res.length?(X.res[i].ok?'ok':'ko'):i===X.i?'now':'')+'"></i>').join('')+'</div>';}
function mountExam(){
  if(X.i>=X.keys.length){
    $('#pane').innerHTML='<div class="picker"><h3 class="score">'+X.score+' de '+X.keys.length+'</h3><p class="intro">'+(X.score===X.keys.length?'Examen perfecto.':'Las que fallaste vuelven a aparecer antes en el próximo examen.')+'</p><div class="review">'+X.res.map(r=>'<div class="rv '+(r.ok?'ok':'ko')+'"><span>'+esc(r.line)+'</span><b>'+r.san+'</b></div>').join('')+'</div><div class="exopts"><button class="primary" id="newEx">Nuevo examen</button></div></div>';
    $('#newEx').onclick=()=>{X=null; upOne();}; return;
  }
  const node=IDX.nodes[X.keys[X.i]];
  $('#pane').innerHTML=studyLayout('Posición '+(X.i+1)+' de '+X.keys.length,node.line.name,'Salir');
  $('#listBack').onclick=()=>{X=null; upOne();};
  $('#ctrl').innerHTML=examDots()+'<span class="prog">Aciertos: '+X.score+'</span>';
  const g=new Chess(node.fen);
  board=new Board($('#board'),{orient:OP.side,onMove:(from,to,dragged)=>{
    if(X.answered) return; const t=new Chess(node.fen); const r=t.move({from,to,promotion:'q'}); if(!r) return;
    X.answered=true; const ok=r.san===node.san; grade(node.key,ok); if(ok) X.score++; else buzz(70);
    X.res.push({ok,san:node.san,line:node.line.name});
    const c=new Chess(node.fen); const cr=c.move(node.san);
    board.set(c,{last:{from:cr.from,to:cr.to},flash:{sq:cr.to,kind:ok?'good':'bad'},anim:!ok||!dragged});
    $('#ctrl').innerHTML=examDots()+'<span class="prog">Aciertos: '+X.score+'</span>';
    $('#info').innerHTML='<div class="fb '+(ok?'good':'bad')+'"><b>'+(ok?'Correcto: ':'La jugada era ')+node.san+'.</b> '+(ok?'':'Jugaste '+r.san+'. ')+(node.note||'')+'</div><button class="primary" id="nx">'+(X.i+1<X.keys.length?'Siguiente':'Ver resultado')+'</button>';
    $('#nx').onclick=()=>{X.i++; X.answered=false; render();};
  }});
  X.answered=false;
  board.set(g,{last:node.last,canMove:true});
  $('#info').innerHTML='<p class="turn">Juegan '+sideName(OP.side)+'. ¿Qué dice el repertorio?</p>';
  $('#moves').innerHTML=moveList(node.prefix,node.prefix.length-1,false);
}

/* ----- Progreso ----- */
function progreso(){
  const all=Object.keys(IDX.nodes), st=stats(all);
  let h='<div class="picker"><div class="big-m"><span class="bm-n">'+mastery(all)+'%</span><span class="bm-l">del repertorio dominado</span></div>'+
    '<p class="gd">'+(all.length-st.fresh)+' de '+all.length+' posiciones vistas'+(st.due?' · <b class="due">'+st.due+' para repasar</b>':'')+'</p>';
  OP.groups.forEach(gr=>{
    const ls=OP.lines.filter(l=>l.group===gr.id); const keys=[...new Set(ls.flatMap(l=>IDX.lineNodes[l.id]))];
    h+='<h3>'+gr.name+'<span class="gpct">'+mastery(keys)+'%</span></h3>';
    ls.forEach(l=>{const ks=IDX.lineNodes[l.id]; const m=mastery(ks); const errs=ks.reduce((a,k)=>a+((prog[k]||{}).ko||0),0);
      h+='<div class="prow"><span class="ln">'+l.name+'</span><span class="bar sm"><span style="width:'+m+'%"></span></span><span class="pn">'+m+'%</span>'+(errs?'<span class="pe">'+errs+' err.</span>':'<span class="pe"></span>')+'</div>';});
  });
  h+='<p class="gd">Una posición cuenta como dominada cuando la acertaste tres veces seguidas. Un error la vuelve a cero.</p><button class="ghost danger" id="reset">Borrar progreso</button></div>';
  $('#pane').innerHTML=h;
  $('#reset').onclick=()=>{if(confirm('¿Borrar todo el progreso guardado en este dispositivo?')){prog={}; save(); render();}};
}

/* ---------- Arranque ---------- */
if(typeof BUILD!=='undefined'){
  let day=BUILD.date; try{day=new Date(BUILD.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
  const ver=$('#ver'); if(ver) ver.textContent='Versión del '+day+'.';
  const seen=lsGet(SEEN_KEY); if(seen&&seen!==BUILD.v) setTimeout(()=>toast('App actualizada · versión del '+day),400); lsSet(SEEN_KEY,BUILD.v);
}
try{restore(history.state);}catch(e){}
remember();
render();

// PWA: solo cuando se sirve por http(s) fuera de claude.ai (GitHub Pages o localhost).
if(/^https?:$/.test(location.protocol)&&!/claude\.ai$|claudeusercontent/.test(location.hostname)&&'serviceWorker' in navigator){
  [['manifest','manifest.webmanifest'],['icon','icons/icon-192.png']].forEach(a=>{const l=document.createElement('link'); l.rel=a[0]; l.href=a[1]; document.head.appendChild(l);});
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
