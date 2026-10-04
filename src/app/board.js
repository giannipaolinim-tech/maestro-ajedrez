/* ==========================================================================
   board.js — tablero interactivo (Board), mini tableros de las portadas y
   marcas/flechas dibujadas sobre el tablero.
   ========================================================================== */
const FILES='abcdefgh';
const REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- Tablero ---------- */
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
  o=o||{};
  this.cancel(true);
  this.g=g; this.last=o.last||null; this.hint=o.hint||null; this.flash=o.flash||null; this.canMove=!!o.canMove; this.sel=null;
  this.draw();
  if(o.anim&&this.last) this.animate(this.last);
};
Board.prototype.sqAt=function(x,y){
  const r=this.el.getBoundingClientRect(), c=Math.floor((x-r.left)/r.width*8), w=Math.floor((y-r.top)/r.height*8);
  if(c<0||c>7||w<0||w>7) return null;
  return this.orient==='w'?FILES[c]+(8-w):FILES[7-c]+(w+1);
};
Board.prototype.xy=function(sq){
  const c=FILES.indexOf(sq[0]), rank=+sq[1];
  return this.orient==='w'?[c,8-rank]:[7-c,rank-1];
};
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
Board.prototype.cancel=function(quiet){
  const d=this.drag; this.drag=null;
  if(d&&d.gh) d.gh.remove();
  if(d&&!quiet) this.draw();
};
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

/* ---------- Mini tableros (portadas de aperturas, familias y variantes) ---------- */
(function(){
  const st=document.createElement('style');
  st.textContent=Object.keys(PIECES).map(k=>'.mini i.'+k+'{background-image:url("'+PIECES[k]+'")}').join('');
  document.head.appendChild(st);
})();
const MINI={};
// Mini tablero de la línea l después de n jugadas. Lee la FEN precalculada, sin chess.js.
function mini(l,n,orient){
  const fen=lineFen(l,n), last=lineLast(l,n), ck=orient+fen+(last?last.from+last.to:'');
  if(MINI[ck]) return MINI[ck];
  const B={};
  fen.split(' ')[0].split('/').forEach((row,ri)=>{
    let f=0;
    for(const ch of row){
      if(ch>='1'&&ch<='8') f+=+ch;
      else { B[FILES[f]+(8-ri)]=(ch===ch.toUpperCase()?'w':'b')+ch.toUpperCase(); f++; }
    }
  });
  let h='<div class="mini" aria-hidden="true">';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const file=orient==='w'?FILES[c]:FILES[7-c], rank=orient==='w'?8-r:r+1, sq=file+rank, p=B[sq];
    let cls=(FILES.indexOf(file)+rank)%2===1?'d':'l';
    if(last&&(last.from===sq||last.to===sq)) cls+=' h';
    if(p) cls+=' '+p;
    h+='<i class="'+cls+'"></i>';
  }
  return MINI[ck]=h+'</div>';
}

/* ---------- Marcas (debajo de las piezas) y flechas (encima) sobre el tablero ---------- */
const MARK={g:'rgba(123,218,74,.6)',r:'rgba(255,92,108,.55)',y:'rgba(255,213,79,.65)',b:'rgba(91,140,255,.55)'};
function overlay(marks,arrows){
  const ov=$('#ov'), ar=$('#ov2'); if(!ov||!ar) return;
  ov.innerHTML=Object.keys(marks||{}).map(q=>{
    const p=board.xy(q);
    return '<rect x="'+p[0]+'" y="'+p[1]+'" width="1" height="1" fill="'+(MARK[marks[q]]||MARK.y)+'"/>';
  }).join('');
  ar.innerHTML='<defs><marker id="ah" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0 0L10 5L0 10z" fill="rgba(255,159,67,.92)"/></marker></defs>'+
    (arrows||[]).map(a=>{
      const p=board.xy(a.slice(0,2)), q=board.xy(a.slice(2,4)), x1=p[0]+.5, y1=p[1]+.5, x2=q[0]+.5, y2=q[1]+.5, d=Math.hypot(x2-x1,y2-y1), k=(d-.42)/d, j=.3/d;
      return '<line x1="'+(x1+(x2-x1)*j).toFixed(3)+'" y1="'+(y1+(y2-y1)*j).toFixed(3)+'" x2="'+(x1+(x2-x1)*k).toFixed(3)+'" y2="'+(y1+(y2-y1)*k).toFixed(3)+'" stroke="rgba(255,159,67,.92)" stroke-width=".16" stroke-linecap="round" marker-end="url(#ah)"/>';
    }).join('');
}
