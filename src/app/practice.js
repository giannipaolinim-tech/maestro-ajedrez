/* ==========================================================================
   practice.js — Práctica: el usuario juega su bando contra el repertorio.
   El rival responde solo; con dos errores se marca la jugada correcta.
   P = estado de la práctica en curso (sobrevive a cambios de pestaña).
   ========================================================================== */
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
  $('#ctrl').onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b) return;
    const a=b.dataset.a;
    if(a==='hint'&&!P.done&&P.g.turn()===OP.side){
      const exp=expected();
      if(exp){
        const t=new Chess(P.g.fen()); const r=t.move(exp);
        P.hint=r.from; P.tries++; P.msg='Mové la pieza marcada.';
        drawP(true);
      }
    }
    if(a==='restart') startPractice();};
  board=new Board($('#board'),{orient:OP.side,onMove:userMove});
  drawP(); step();
}
// Jugada del repertorio en la posición actual (o null si se terminó la línea).
function expected(){
  if(P.lineId==='__all') return IDX.user[keyOf(P.g)]||null;
  const l=OP.lines.find(x=>x.id===P.lineId); return l.arr[P.hist.length]||null;
}
// Próxima jugada del rival: en «todo el repertorio», una al azar entre sus opciones.
function oppNext(){
  if(P.lineId==='__all'){
    const s=IDX.opp[keyOf(P.g)]; if(!s) return null;
    const a=[...s];
    return a[Math.floor(Math.random()*a.length)];
  }
  const l=OP.lines.find(x=>x.id===P.lineId); return l.arr[P.hist.length]||null;
}
function step(){
  if(P.done) return;
  if(P.g.turn()!==OP.side){
    const m=oppNext(); if(!m){finish(); return;}
    board.canMove=false;
    timer=setTimeout(()=>{
      const r=P.g.move(m);
      P.hist.push(r.san); P.last={from:r.from,to:r.to}; P.flash=null; P.anim=true;
      drawP(); step();
    },480);
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
    if(P.tries>=2){
      const c=new Chess(P.g.fen()); const cr=c.move(exp);
      P.hint=cr.from; P.msg='En el repertorio se juega <b>'+exp+'</b>. Movela vos para seguir.';
    }
    else P.msg='<b>'+r.san+'</b> no es la jugada del repertorio. Probá de nuevo.';
    P.flash={sq:to,kind:'bad'}; drawP(true);
  }
}
function finish(){
  P.done=true; const all=P.lineId==='__all', h=P.hist.join(' ');
  // En «todo el repertorio» se busca qué variante se jugó para mostrar su plan.
  const l=all?(OP.lines.find(x=>x.arr.join(' ')===h)||OP.lines.find(x=>x.arr.join(' ').startsWith(h)||h.startsWith(x.arr.join(' ')))):OP.lines.find(x=>x.id===P.lineId);
  P.msg='<b>'+(P.errors?'Variante completa con '+P.errors+(P.errors===1?' error':' errores'):'¡Variante completa sin errores!')+'</b>'+
    (l?'<div class="plan"><h4>Plan: '+esc(l.name)+'</h4><p>'+l.plan+'</p></div>':'')+'<button class="btn wide" id="again">'+ico('restart')+'Otra vez</button>';
  drawP();
}
function drawP(can){
  board.set(P.g,{last:P.last,hint:P.hint,flash:P.flash,anim:P.anim,canMove:!!can&&!P.done&&P.g.turn()===OP.side}); P.anim=false;
  const turnTxt=P.done?'':(P.g.turn()===OP.side?'<p class="turn">Te toca con '+sideName(OP.side)+'</p>':'<p class="turn quiet">Juega el rival…</p>');
  $('#info').innerHTML=turnTxt+(P.msg?'<div class="fb'+(P.done&&!P.errors?' good':'')+'">'+P.msg+'</div>':'');
  $('#moves').innerHTML=moveList(P.hist,P.hist.length-1,false);
  const a=$('#again'); if(a) a.onclick=()=>startPractice();
}
