/* ==========================================================================
   nav.js — estado de la vista, historial (el botón atrás de Android vuelve
   dentro de la app), barra inferior y render() de la vista actual.
   ========================================================================== */
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
function nav(patch,push){
  Object.assign(state,patch);
  if(push) state.d++;
  try{history[push?'pushState':'replaceState'](snap(),'');}catch(e){}
  render();
}
function setOp(o){if(o!==OP){OP=o; IDX=IDXS[o.id]; P=null; X=null;}}
window.addEventListener('popstate',e=>{restore(e.state); render();});
document.addEventListener('keydown',e=>{if(keyHandler&&!e.altKey&&!e.ctrlKey&&!e.metaKey) keyHandler(e);});

/* ---------- Barra inferior ---------- */
const TABS=[['leccion','Aprender'],['practica','Practicar'],['examen','Examen'],['progreso','Progreso']];
function renderNav(){
  const cur=state.view==='home'?'home':state.view==='learn'?'leccion':state.tab;
  $('#nav').innerHTML=[['home','Inicio']].concat(TABS).map(t=>'<button data-t="'+t[0]+'"'+(cur===t[0]?' class="on" aria-current="page"':'')+'>'+ico(t[0])+'<span>'+t[1]+'</span></button>').join('');
}
$('#nav').onclick=e=>{const b=e.target.closest('[data-t]'); if(b) goTab(b.dataset.t);};
function goTab(t){
  if(t==='home'){
    if(state.view==='home') return;
    if(state.d>0) history.go(-state.d); else nav({view:'home',sub:null});
    return;
  }
  const target=t==='leccion'?{view:'learn',sec:null,sub:null}:{view:'op',tab:t,sub:null};
  if(state.view==='home'){ nav(Object.assign(target,{grp:null}),true); return; }
  if(t==='leccion'&&state.view==='learn'){
    if(state.sub||state.sec){ if(state.d>1) history.go(-(state.d-1)); else nav({sec:null,sub:null}); }
    else window.scrollTo(0,0);
    return;
  }
  if(state.view==='op'&&t===state.tab&&t!=='leccion'){
    if(state.sub){
      if(state.view==='op'&&state.tab==='examen') X=null;
      if(state.d>1) history.go(-(state.d-1)); else nav({sub:null});
    }
    else window.scrollTo(0,0);
    return;
  }
  nav(target);
}

/* ---------- Render de la vista actual ---------- */
function render(){
  clearTimer(); keyHandler=null; if(board) board.cancel(true);
  renderNav(); window.scrollTo(0,0);
  const app=$('#app');
  if(state.view==='home'){ app.innerHTML=homeHTML(); bindHome(); return; }
  if(state.view==='learn'){ app.innerHTML='<main id="pane"></main>'; aprender(); return; }
  lsSet(LAST_OP_KEY,OP.id);
  app.innerHTML=(state.sub?'':opBar())+'<main id="pane"></main>';
  app.querySelectorAll('.opbar [data-op]').forEach(b=>b.onclick=()=>{
    const o=OPENINGS.find(x=>x.id===b.dataset.op);
    if(o!==OP){setOp(o); nav({sub:null,grp:null});}
  });
  ({leccion:leccion,practica:practica,examen:examen,progreso:progreso})[state.tab]();
}
// Sube un nivel: vuelve en el historial si se puede, si no cierra la subvista.
const upOne=()=>state.d>1?history.back():nav({sub:null});
