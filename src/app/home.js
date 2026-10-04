/* ==========================================================================
   home.js — Inicio: acción del día, racha, tarjeta de Aprender y tarjetas
   de aperturas.
   ========================================================================== */
let VER='';
function homeHTML(){
  const sk=streak();
  let tot=0,best=null,bestDue=0,fresh=0,freshOp=null;
  OPENINGS.forEach(o=>{
    const s=stats(Object.keys(IDXS[o.id].nodes));
    tot+=s.due;
    if(s.due>bestDue){bestDue=s.due; best=o;}
    if(s.fresh&&!freshOp) freshOp=o;
    fresh+=s.fresh;
  });
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
function opCard(o){
  const all=Object.keys(IDXS[o.id].nodes), m=mastery(all), st=stats(all);
  const tag=st.due?'<span class="tag">'+st.due+' para repasar</span>':
    st.fresh===all.length?'<span class="tag new">Nueva</span>':
    st.fresh?'<span class="tag new">'+st.fresh+' por aprender</span>':
    '<span class="tag ok">Al día</span>';
  return '<button class="op" data-op="'+o.id+'">'+mini(o.cov.arr,o.cov.n,o.side)+'<span class="op-b"><span class="op-n">'+esc(o.name)+'</span>'+
    '<span class="side '+o.side+'"><i></i>Con '+sideName(o.side)+' · '+o.lines.length+' variantes</span>'+tag+bar(m)+'</span></button>';
}
function bindOpCards(){
  document.querySelectorAll('.op[data-op]').forEach(b=>b.onclick=()=>{
    setOp(OPENINGS.find(o=>o.id===b.dataset.op));
    nav({view:'op',tab:'leccion',sub:null,grp:null},true);
  });
}
function learnCard(){
  const d=SCHOOL.filter(m=>schoolDone(m.id)).length, nx=nextMod();
  return '<h2 class="sec">Aprender<small>'+d+' de '+SCHOOL.length+' módulos</small></h2><button class="op school" id="toLearn"><span class="sc-ic">'+ico('escuela')+'</span><span class="op-b">'+
    '<span class="op-n">'+(nx?(d?'Seguí con: ':'Empezá por: ')+esc(nx.title):'Todos los módulos completos')+'</span><span class="side">Fundamentos, táctica y finales'+(nx?' · '+esc((SECTIONS.find(x=>x.id===nx.sec)||{}).title||''):'')+'</span>'+bar(Math.round(100*d/SCHOOL.length))+'</span></button>';
}
function bindHome(){
  $('#toLearn').onclick=()=>{
    const nx=nextMod();
    nav(nx?{view:'learn',sec:nx.sec,sub:{mod:nx.id,step:0},grp:null}:{view:'learn',sec:null,sub:null,grp:null},true);
  };
  document.querySelectorAll('.op[data-op]').forEach(b=>b.onclick=()=>{
    setOp(OPENINGS.find(o=>o.id===b.dataset.op));
    nav({view:'op',tab:'leccion',sub:null,grp:null},true);
  });
  $('#theme').onclick=()=>{
    theme=THEMES[(THEMES.indexOf(theme)+1)%THEMES.length];
    lsSet(THEME_KEY,theme);
    applyTheme();
    toast(THEME_LABEL[theme]);
    render();
  };
  $('#heroGo').onclick=()=>{
    const a=$('#heroGo').dataset.a;
    if(a==='rev'){
      let best=OPENINGS[0],bd=-1;
      OPENINGS.forEach(o=>{const d=stats(Object.keys(IDXS[o.id].nodes)).due; if(d>bd){bd=d; best=o;}});
      setOp(best); startExam('all');
    } else if(a==='learn'){
      setOp(OPENINGS.find(o=>stats(Object.keys(IDXS[o.id].nodes)).fresh)||OP);
      nav({view:'op',tab:'leccion',sub:null,grp:null},true);
    } else { P=null; nav({view:'op',tab:'practica',sub:{line:'__all'},grp:null},true); }
  };
}
