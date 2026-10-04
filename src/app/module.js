/* ==========================================================================
   module.js — reproductor de módulos de Aprender. Cada paso es uno de:
   info (teoría), move (encontrar la jugada), line (línea guiada contra la
   máquina), tap (tocar casillas) o play (práctica libre de alfil y caballo).
   ========================================================================== */
const normSan=s=>s.replace(/[+#?!]/g,'');
// Si el texto del acierto ya arranca con una exclamación, no le sumamos otra.
const praise=(ok,pre)=>ok&&ok[0]==='¡'?ok:'<b>'+pre+'</b> '+(ok||'');

function modulePlayer(){
  const pane=$('#pane');
  const m=SCHOOL.find(x=>x.id===state.sub.mod); if(!m){nav({sub:null}); return;}
  const N=m.steps.length;
  let i=Math.max(0,Math.min(N-1,state.sub.step||0)), cur=null;

  pane.innerHTML=studyLayout(m.title,'','Volver');
  $('#listBack').onclick=upOne;
  $('#ctrl').innerHTML='<button data-a="prev" class="btn soft" aria-label="Paso anterior">'+ico('prev')+'</button><button data-a="next" class="btn bl x2" id="nextB"></button>';
  $('#ctrl').onclick=e=>{
    const b=e.target.closest('[data-a]'); if(!b||b.disabled) return;
    if(b.dataset.a==='prev') go(i-1);
    else if(i<N-1) go(i+1);
    else finishMod();
  };
  keyHandler=e=>{
    if(e.key==='ArrowRight'&&i<N-1){e.preventDefault(); go(i+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault(); go(i-1);}
  };

  const rec=schRec(m.id);
  const solvedEx=()=>{rec.ex[i]=1; saveSch(); markDay();};
  const okMove=(st,san,t)=>st.goal==='mate'?t.in_checkmate():st.sol.some(x=>normSan(x)===normSan(san));
  // Primera jugada legal que cumple el objetivo del paso.
  function solution(){
    return cur.g.moves({verbose:true}).find(mv=>{
      const t=new Chess(cur.g.fen());
      t.move(mv.san);
      return okMove(cur.st,mv.san,t);
    });
  }
  function go(n){
    if(n<0||n>=N) return;
    clearTimer();
    i=n; state.sub.step=n;
    remember();
    show();
  }
  function finishMod(){
    rec.done=true; saveSch(); markDay();
    toast('¡Módulo completado: '+m.title+'!');
    upOne();
  }
  // Botón de avance: «Saltar» si el ejercicio sigue abierto, «Seguir» o «Terminar» si no.
  function setNext(){
    const b=$('#nextB'), open=cur.st.t!=='info'&&!cur.done&&!rec.ex[i];
    b.className='btn x2 '+(open?'soft':'bl');
    b.innerHTML=(i<N-1?(open?'Saltar':'Seguir'):'Terminar')+ico('next');
    $('#ctrl [data-a="prev"]').disabled=i===0;
    $('.lsub').textContent='Paso '+(i+1)+' de '+N;
  }
  function fb(cls,html){$('#fb').className='fb '+cls; $('#fb').innerHTML=html;}
  const sideOf=c=>c==='w'?'blancas':'negras';

  // Línea guiada: el usuario juega su bando y el rival responde solo.
  function lineMove(r,dragged){
    const st=cur.st, exp=cur.line[cur.p];

    // Jugada esperada: se juega, y si quedan jugadas responde el rival.
    if(normSan(r.san)===normSan(exp)){
      cur.g.move(r.san); cur.played.push(r.san); cur.p++; cur.tries=0;
      board.set(cur.g,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged});
      let msg=(st.notes||{})[cur.p-1]||'Bien.';
      $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
      if(cur.p>=cur.line.length){
        cur.done=true; solvedEx();
        fb('good',praise(st.ok,'¡Bien!'));
        setNext();
        return;
      }
      fb('good',msg);
      cur.busy=true;
      timer=setTimeout(()=>{
        const rr=cur.g.move(cur.line[cur.p]); cur.played.push(rr.san); cur.p++; cur.busy=false;
        board.set(cur.g,{last:{from:rr.from,to:rr.to},anim:true,canMove:true});
        $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
        const n2=(st.notes||{})[cur.p-1];
        fb('',msg+'<br><span class="who">Las '+sideOf(rr.color)+' jugaron '+rr.san+'.</span>'+(n2?' '+n2:'')+' Te toca.');
      },520);
      return;
    }

    // Alternativa igual de buena: si da mate se acepta; si no, se avisa y se pide otra.
    const alts=(st.alts||[])[cur.p/2]||[];
    const t=new Chess(cur.g.fen()); t.move(r.san);
    if(alts.some(a=>normSan(a)===normSan(r.san))&&t.in_checkmate()){
      cur.g.move(r.san); cur.played.push(r.san); cur.done=true; solvedEx();
      board.set(cur.g,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged});
      $('#moves').innerHTML=moveList(cur.played,cur.played.length-1,false);
      fb('good','<b>¡Mate!</b> Por otro camino, pero igual de rápido.');
      setNext();
      return;
    }
    if(alts.some(a=>normSan(a)===normSan(r.san))){
      board.set(cur.g,{last:cur.last,canMove:true});
      fb('','<b>'+r.san+'</b> también gana igual de rápido, pero acá seguimos el método. Buscá otra.');
      return;
    }

    // Error: al segundo intento se marca la pieza, al tercero se ofrece la jugada.
    cur.tries++; buzz(70);
    const ev=new Chess(cur.g.fen()).move(exp);
    board.set(cur.g,{last:cur.last,flash:{sq:r.to,kind:'bad'},hint:cur.tries>=2?ev.from:null,canMove:true});
    let msg='<b>'+r.san+'</b> no es la jugada del método.'+(t.in_stalemate()?' ¡Y encima ahoga!':'')+(cur.tries>=2?' Mirá la pieza marcada.':' Probá de nuevo.');
    if(cur.tries>=3) msg+='<br><button class="link-b" id="showSol">Ver la jugada</button>';
    fb('bad',msg);
    const ss=$('#showSol');
    if(ss) ss.onclick=()=>lineMove(new Chess(cur.g.fen()).move(exp),false);
  }

  // Práctica libre de alfil y caballo contra la máquina.
  function playMove(r,dragged){
    cur.g.move(r.san); cur.n++;
    board.set(cur.g,{last:{from:r.from,to:r.to},anim:!dragged});
    if(cur.g.in_checkmate()){
      cur.done=true; solvedEx();
      fb('good','<b>¡Mate en '+cur.n+' jugadas!</b> '+(cur.n<=33?'Excelente técnica.':'Lo lograste: con práctica sale más rápido.'));
      setNext();
      return;
    }
    if(cur.g.in_stalemate()){
      cur.done=true;
      fb('bad','<b>Ahogado:</b> el rey negro no tiene jugadas y no está en jaque. Tablas. Probá con otra posición.');
      return;
    }
    if(cur.n>=50){
      cur.done=true;
      fb('bad','<b>50 jugadas sin mate:</b> tablas. Probá con otra posición.');
      return;
    }
    cur.busy=true;
    timer=setTimeout(()=>{
      const bm=kbnDefense(cur.g), rr=cur.g.move(bm.san); cur.busy=false; cur.last={from:rr.from,to:rr.to};
      if(rr.captured){
        cur.done=true;
        board.set(cur.g,{last:cur.last,anim:true,flash:{sq:rr.to,kind:'bad'}});
        fb('bad','<b>El rey negro se comió tu '+(rr.captured==='b'?'alfil':'caballo')+'.</b> Sin esa pieza no hay mate: tablas. Cuidá que tus piezas estén defendidas.');
        return;
      }
      board.set(cur.g,{last:cur.last,anim:true,canMove:true});
      fb('','Jugada '+(cur.n+1)+' de 50.');
    },420);
  }

  board=new Board($('#board'),{orient:'w',
    // Jugadas en el tablero: según el tipo de paso.
    onMove:(from,to,dragged)=>{
      if(!cur||cur.done||cur.busy) return;
      const t=new Chess(cur.g.fen()), r=t.move({from,to,promotion:'q'}); if(!r) return;
      if(cur.st.t==='line') return lineMove(r,dragged);
      if(cur.st.t==='play') return playMove(r,dragged);
      if(cur.st.t!=='move') return;
      if(okMove(cur.st,r.san,t)){
        cur.done=true; solvedEx();
        board.set(t,{last:{from:r.from,to:r.to},flash:{sq:r.to,kind:'good'},anim:!dragged});
        fb('good',praise(cur.st.ok,cur.st.goal==='mate'?'¡Jaque mate!':'¡Correcto!'));
        setNext();
        return;
      }
      cur.tries++; buzz(70);
      const sol=solution();
      board.set(cur.g,{last:cur.last,flash:{sq:to,kind:'bad'},hint:cur.tries>=2&&sol?sol.from:null,canMove:true});
      let msg=t.in_stalemate()?'<b>¡Ahogado!</b> El rival no está en jaque y no tiene jugadas: eso es tablas. Probá otra.':
        cur.st.goal==='mate'?'<b>'+r.san+'</b> no da mate. Probá de nuevo.':'<b>'+r.san+'</b> no es la mejor. Probá de nuevo.';
      if(cur.tries>=2&&cur.st.hint) msg+='<br>Pista: '+cur.st.hint;
      if(cur.tries>=3) msg+='<br><button class="link-b" id="showSol">Ver la solución</button>';
      fb('bad',msg);
      const ss=$('#showSol');
      if(ss) ss.onclick=()=>{
        const s2=solution(); if(!s2) return;
        const t2=new Chess(cur.g.fen()); t2.move(s2.san); cur.done=true;
        board.set(t2,{last:{from:s2.from,to:s2.to},anim:true});
        fb('','La solución era <b>'+s2.san+'</b>. '+(cur.st.ok||''));
        setNext();
      };
    },
    // Toques en el tablero: pasos «tap» (encontrar casillas).
    onTap:e=>{
      if(!cur||cur.st.t!=='tap'||cur.done) return;
      const sq=board.sqAt(e.clientX,e.clientY); if(!sq) return;
      if(cur.targets.includes(sq)){ cur.found.add(sq); board.set(cur.g,{last:cur.last}); }
      else { buzz(50); board.set(cur.g,{last:cur.last,flash:{sq,kind:'bad'}}); }
      const marks=Object.assign({},cur.st.marks);
      if(cur.st.from) marks[cur.st.from]='y';
      cur.found.forEach(q=>{marks[q]='g';});
      overlay(marks,null);
      if(cur.found.size>=cur.need){ cur.done=true; solvedEx(); fb('good',praise(cur.st.ok,'¡Bien!')); setNext(); }
      else fb('',cur.targets.includes(sq)?'Van '+cur.found.size+' de '+cur.need+'.':'<b>'+sq+'</b> no. Van '+cur.found.size+' de '+cur.need+'.');
    }});

  // Arma el paso i: posición, tablero, marcas y texto.
  function show(){
    const st=m.steps[i], g=new Chess();
    if(st.t==='play') g.load(kbnStart());
    else {
      if(st.fen) g.load(st.fen);
      if(st.moves) st.moves.split(' ').forEach(x=>g.move(x));
    }
    const h=g.history({verbose:true}), lm=h.length?h[h.length-1]:null;
    cur={st,g,last:lm?{from:lm.from,to:lm.to}:null,tries:0,done:st.t==='info',found:new Set(),targets:[],need:0,line:[],p:0,played:[],n:0,busy:false};
    board.orient=st.orient||(st.t==='info'?'w':g.turn());
    $('#moves').innerHTML='';
    let html='<h3 class="sh">'+esc(st.h)+'</h3><p class="note">'+st.text+'</p>';
    if(st.t==='move'||st.t==='line'){
      board.set(g,{last:cur.last,canMove:true}); overlay(st.marks,null);
      if(st.t==='line') cur.line=st.line.split(' ');
      html+='<p class="turn">Juegan '+sideOf(g.turn())+'</p><div id="fb" class="fb'+(rec.ex[i]?' good':'')+'">'+
        (rec.ex[i]?'Ya lo resolviste antes. ¿Te sale de nuevo?':st.t==='line'?'Jugá las '+sideOf(g.turn())+': el rival responde solo.':'Mové una pieza en el tablero.')+'</div>';
    } else if(st.t==='tap'){
      cur.targets=st.targets||[...new Set(g.moves({square:st.from,verbose:true}).map(x=>x.to))];
      cur.need=st.need||cur.targets.length;
      board.set(g,{last:cur.last});
      const mk=Object.assign({},st.marks); if(st.from) mk[st.from]='y'; overlay(mk,null);
      html+='<div id="fb" class="fb">Tocá las casillas en el tablero. Van 0 de '+cur.need+'.</div>';
    } else if(st.t==='play'){
      const light=isLight(findPiece(g,'w','b')), corners=light?['a8','h1']:['a1','h8'];
      board.set(g,{canMove:true}); overlay({[corners[0]]:'g',[corners[1]]:'g'},null);
      html+='<p class="turn">Juegan blancas</p><div id="fb" class="fb">Tu alfil es de casillas '+(light?'claras':'oscuras')+': las esquinas buenas son '+corners.join(' y ')+' (marcadas en verde). Jugada 1 de 50.</div>'+
        '<button class="btn soft wide" id="newPos">'+ico('restart')+'Otra posición</button>';
    } else { board.set(g,{last:cur.last}); overlay(st.marks,st.arrows); }
    $('#info').innerHTML=html;
    setNext();
    const np=$('#newPos'); if(np) np.onclick=()=>{clearTimer(); show();};
  }
  show();
}
