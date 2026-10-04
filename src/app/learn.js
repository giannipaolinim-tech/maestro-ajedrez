/* ==========================================================================
   learn.js — Aprender: menú de secciones y lista de módulos (o de aperturas).
   El módulo en sí lo muestra modulePlayer() (module.js).
   ========================================================================== */
const secMods=id=>SCHOOL.filter(m=>m.sec===id);
const nextMod=()=>SCHOOL.find(m=>!schoolDone(m.id));
function modRow(m,k,nx){
  const dn=schoolDone(m.id), ec=exCount(m);
  return '<button class="mod'+(dn?' done':'')+(m===nx?' next':'')+'" data-mod="'+m.id+'"><span class="mnum">'+(dn?ico('check'):k+1)+'</span><img alt="" src="'+PIECES[m.icon]+'">'+
    '<span class="mb"><b>'+esc(m.title)+'</b><span>'+esc(m.desc)+'</span><span class="who">'+m.steps.length+' pasos · '+Math.min(exSolved(m),ec)+' de '+ec+' ejercicios</span></span></button>';
}
function secHead(title,sub){
  return '<div class="shead"><button id="secBack" class="backb" aria-label="Volver">'+ico('back')+'</button><div><h3 class="lt">'+esc(title)+'</h3><span class="lsub">'+esc(sub||'')+'</span></div></div>';
}
function aprender(){
  const pane=$('#pane');
  if(state.sub){ modulePlayer(); return; }
  const back=()=>{ if(state.d>1) history.back(); else nav({sec:null}); };
  const S=SECTIONS.find(x=>x.id===state.sec);

  // Menú de secciones
  if(!S){
    const nx=nextMod();
    pane.innerHTML=ttl('leccion')+'<p class="lead">Elegí qué estudiar. Cada módulo combina explicación y ejercicios en el tablero.</p>'+
      (nx?'<h2 class="sec">Seguí por acá</h2><div class="path">'+modRow(nx,SCHOOL.indexOf(nx),nx)+'</div>':'')+
      '<h2 class="sec">Secciones</h2><div class="secs">'+SECTIONS.map(s=>{
        let meta, pct;
        if(s.id==='aperturas'){
          const keys=OPENINGS.flatMap(o=>Object.keys(IDXS[o.id].nodes));
          pct=mastery(keys);
          meta=OPENINGS.length+' aperturas';
        }
        else {
          const ms=secMods(s.id), d=ms.filter(m=>schoolDone(m.id)).length;
          pct=Math.round(100*d/ms.length);
          meta=d+' de '+ms.length+' módulos';
        }
        return '<button class="secc sec-'+s.id+'" data-sec="'+s.id+'"><img alt="" src="'+PIECES[s.icon]+'"><b>'+esc(s.title)+'</b><span>'+esc(s.desc)+'</span><span class="who">'+meta+'</span>'+bar(pct)+'</button>';
      }).join('')+'</div>';
    pane.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>nav({sec:b.dataset.sec},true));
    pane.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>{
      const m=SCHOOL.find(x=>x.id===b.dataset.mod);
      nav({sec:m.sec,sub:{mod:m.id,step:0}},true);
    });
    return;
  }

  // Sección Aperturas: lista los repertorios
  if(S.id==='aperturas'){
    pane.innerHTML=secHead('Aperturas',OPENINGS.length+' aperturas')+'<p class="lead">'+S.desc+' Cada una tiene lección, práctica y examen.</p>'+
      '<h2 class="sec">Tus repertorios<small>'+REPS.length+'</small></h2><section class="ops">'+REPS.map(opCard).join('')+'</section>'+
      '<h2 class="sec">Para empezar<small>'+BASICS.length+'</small></h2><section class="ops">'+BASICS.map(opCard).join('')+'</section>';
    $('#secBack').onclick=back; bindOpCards(); return;
  }

  // Otras secciones: módulos en orden + práctica libre
  const ms=secMods(S.id), nx=ms.find(m=>!schoolDone(m.id));
  let h=secHead(S.title,ms.filter(m=>schoolDone(m.id)).length+' de '+ms.length+' módulos completados')+'<p class="lead">'+S.desc+'</p><div class="path">'+ms.map((m,k)=>modRow(m,k,nx)).join('')+'</div>';
  const plays=[]; ms.forEach(m=>m.steps.forEach((st,i)=>{if(st.t==='play') plays.push([m,i]);}));
  if(plays.length) h+='<h2 class="sec">Práctica libre</h2>'+plays.map(([m,i])=>'<button class="allcard" data-play="'+m.id+'|'+i+'">'+ico('practica')+'<span><b>'+esc(m.title)+'</b><span>Contra la máquina, desde una posición al azar</span></span></button>').join('');
  pane.innerHTML=h;
  $('#secBack').onclick=back;
  pane.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>nav({sub:{mod:b.dataset.mod,step:0}},true));
  pane.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{const p=b.dataset.play.split('|'); nav({sub:{mod:p[0],step:+p[1]}},true);});
}
