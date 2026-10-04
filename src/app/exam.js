/* ==========================================================================
   exam.js — Examen: 10 posiciones elegidas por caja baja y atraso (con algo
   de azar), un intento cada una. X = estado del examen en curso.
   ========================================================================== */
let X=null;
function examen(){
  const pane=$('#pane');
  if(!state.sub||!X||X.op!==OP.id){
    if(state.sub){X=null; nav({sub:null}); return;}
    X=null;
    const all=Object.keys(IDX.nodes), st=stats(all);
    const today=st.due?(st.due===1?'Primero sale la posición que toca repasar.':'Primero salen las '+st.due+' que toca repasar y las que fallaste.'):
      st.fresh?'No tenés repasos pendientes. Van a salir posiciones que todavía no viste.':
      'Estás al día: el examen elige las que hace más tiempo no ves.';
    let h=ttl('examen')+'<div class="tiles"><div class="tile due"><b>'+st.due+'</b><span>para repasar</span></div><div class="tile"><b>'+st.fresh+'</b><span>sin ver</span></div><div class="tile ok"><b>'+mastered(all)+'</b><span>dominadas</span></div></div>'+
      '<div class="panel"><div class="big"><div><h3>Diez posiciones, un intento cada una</h3><p>'+today+'</p></div></div><button class="btn wide" data-g="all">'+ico('examen')+'Empezar examen</button></div>'+
      '<h2 class="sec">Examen por familia</h2><div class="cards">'+OP.groups.map(gr=>{
        if(!gr.cov) return '';
        const ks=[...new Set(OP.lines.filter(l=>l.group===gr.id).flatMap(l=>IDX.lineNodes[l.id]))], s=stats(ks);
        return '<button class="card" data-g="'+gr.id+'">'+mini(gr.cov.line,gr.cov.n,OP.side)+'<span class="cn">'+esc(gShort(gr))+'</span><span class="who">'+ks.length+' posiciones'+(s.due?' · <span style="color:var(--orange)">'+s.due+(s.due===1?' pendiente':' pendientes')+'</span>':'')+'</span></button>';
      }).join('')+'</div>';
    pane.innerHTML=h;
    pane.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>startExam(b.dataset.g));
    return;
  }
  mountExam();
}
function startExam(gid){
  const now=Date.now();
  let keys=Object.keys(IDX.nodes).filter(k=>{
    if(gid==='all')return true;
    return OP.lines.some(l=>l.group===gid&&IDX.lineNodes[l.id].includes(k));
  });
  // Prioridad: caja baja y atraso respecto de su intervalo, con algo de azar.
  keys=keys.map(k=>{
    const r=prog[k]||{box:0,last:0};
    const overdue=(now-r.last)/(INTERVAL[r.box]||1);
    return {k,s:r.box*2-Math.min(overdue,3)+Math.random()*1.5};
  }).sort((a,b)=>a.s-b.s).slice(0,10).map(o=>o.k);
  keys.sort(()=>Math.random()-.5);
  X={op:OP.id,keys,i:0,score:0,answered:false,res:[]}; nav({view:'op',tab:'examen',sub:{exam:gid}},true);
}
function examDots(){
  return '<div class="dots" aria-hidden="true">'+X.keys.map((k,i)=>'<i class="'+(i<X.res.length?(X.res[i].ok?'ok':'ko'):i===X.i?'now':'')+'"></i>').join('')+'</div><span class="score-pill">'+X.score+' / '+X.keys.length+'</span>';
}
function mountExam(){
  // Resultado final
  if(X.i>=X.keys.length){
    const perfect=X.score===X.keys.length;
    $('#pane').innerHTML='<div class="shead"><button id="listBack" class="backb" aria-label="Volver">'+ico('back')+'</button><div><h3 class="lt">Resultado</h3><span class="lsub">'+shortName(OP)+'</span></div></div>'+
      '<div class="panel"><div class="big">'+ring(Math.round(100*X.score/X.keys.length))+'<div><h3>'+(perfect?'¡Examen perfecto!':X.score+' de '+X.keys.length+' bien')+'</h3><p>'+(perfect?'Todas las posiciones suben de caja.':'Las que fallaste vuelven a aparecer antes en el próximo examen.')+'</p></div></div></div>'+
      '<div class="panel">'+X.res.map(r=>'<div class="rv '+(r.ok?'ok':'ko')+'"><span>'+esc(r.line)+'</span><b>'+r.san+'</b></div>').join('')+'</div>'+
      '<button class="btn wide" id="newEx">'+ico('restart')+'Nuevo examen</button>';
    $('#newEx').onclick=$('#listBack').onclick=()=>{X=null; upOne();}; return;
  }

  // Posición X.i
  const node=IDX.nodes[X.keys[X.i]];
  $('#pane').innerHTML=studyLayout('Posición '+(X.i+1)+' de '+X.keys.length,shortName(OP)+' · '+node.line.name,'Salir del examen');
  $('#listBack').onclick=()=>{X=null; upOne();};
  $('#ctrl').innerHTML=examDots();
  const g=new Chess(node.fen);
  board=new Board($('#board'),{orient:OP.side,onMove:(from,to,dragged)=>{
    if(X.answered) return;
    const t=new Chess(node.fen); const r=t.move({from,to,promotion:'q'}); if(!r) return;
    X.answered=true;
    const ok=r.san===node.san;
    grade(node.key,ok);
    if(ok) X.score++; else buzz(70);
    X.res.push({ok,san:node.san,line:node.line.name});
    const c=new Chess(node.fen); const cr=c.move(node.san);
    board.set(c,{last:{from:cr.from,to:cr.to},flash:{sq:cr.to,kind:ok?'good':'bad'},anim:!ok||!dragged});
    $('#ctrl').innerHTML=examDots();
    $('#info').innerHTML='<div class="fb '+(ok?'good':'bad')+'"><b>'+(ok?'¡Correcto! ':'La jugada era ')+node.san+'.</b> '+(ok?'':'Jugaste '+r.san+'. ')+(node.note||'')+'</div>'+
      '<button class="btn wide" id="nx">'+(X.i+1<X.keys.length?'Siguiente':'Ver resultado')+ico('next')+'</button>';
    $('#nx').onclick=()=>{X.i++; X.answered=false; render();};
  }});
  X.answered=false;
  board.set(g,{last:node.last,canMove:true});
  $('#info').innerHTML='<p class="turn">Juegan '+sideName(OP.side)+'</p><p class="note quiet">¿Qué dice el repertorio? Tenés un solo intento.</p>';
  $('#moves').innerHTML=moveList(node.prefix,node.prefix.length-1,false);
}
