/* ==========================================================================
   lesson.js — pestaña Aprender de una apertura: lista de variantes y lección
   que recorre una línea jugada por jugada con sus notas y el plan final.
   ========================================================================== */
function leccion(){
  const pane=$('#pane');

  // Lista de variantes
  if(!state.sub){
    pane.innerHTML='<div class="ttl"><button id="toSecs" class="backb" aria-label="Volver a Aperturas">'+ico('back')+'</button><h2>'+esc(OP.name)+'</h2></div>'+
      '<div class="about"><p>'+OP.intro+'</p><button id="more">Leer más</button></div>'+
      choicesHTML(OP)+(OP.choices.length?'<h2 class="sec">Variantes</h2>':'')+
      '<p class="lead">Elegí una variante y recorrela jugada por jugada.</p>'+linesHTML();
    $('#toSecs').onclick=()=>{ if(state.d>1) history.back(); else nav({view:'learn',sec:'aperturas',sub:null}); };
    $('#more').onclick=()=>{
      const a=$('.about');
      a.classList.toggle('open');
      $('#more').textContent=a.classList.contains('open')?'Leer menos':'Leer más';
    };
    bindChoices(OP);
    bindLines(id=>nav({sub:{line:id,ply:0}},true)); return;
  }

  // Lección de una variante
  const l=OP.lines.find(x=>x.id===state.sub.line); if(!l){nav({sub:null}); return;}
  const L=l.arr.length;
  pane.innerHTML=studyLayout(l.name,shortName(OP)+' · '+gShort(OP.groups.find(g=>g.id===l.group)||{name:''}));
  const go=n=>{
    n=Math.max(0,Math.min(L,n));
    if(n===state.sub.ply) return;
    const anim=n===state.sub.ply+1;
    state.sub.ply=n;
    remember();
    draw(anim);
  };
  // Tocar la mitad derecha del tablero avanza; la izquierda vuelve.
  board=new Board($('#board'),{orient:OP.side,onTap:e=>{
    const r=board.el.getBoundingClientRect();
    go(state.sub.ply+(e.clientX-r.left>r.width/2?1:-1));
  }});
  const draw=anim=>{
    const n=state.sub.ply, g=new Chess(lineFen(l,n)), last=lineLast(l,n); board.set(g,{last,anim});
    const note=n>0?(l.notes[n-1]||OP.noteMap[f4(lineFen(l,n-1))+' '+l.arr[n-1]]||''):'';
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
  $('#ctrl').onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b)return;
    const a=b.dataset.a, n=state.sub.ply;
    go(a==='first'?0:a==='last'?L:a==='prev'?n-1:n+1);
  };
  keyHandler=e=>{
    const n=state.sub.ply, k={ArrowRight:n+1,ArrowLeft:n-1,Home:0,End:L}[e.key];
    if(k!==undefined){e.preventDefault(); go(k);}
  };
  $('#listBack').onclick=upOne;
  draw(false);
}
