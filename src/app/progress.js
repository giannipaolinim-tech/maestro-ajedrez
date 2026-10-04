/* ==========================================================================
   progress.js — pestaña Progreso de una apertura: dominio general, por
   familia y por variante, y borrado del progreso.
   ========================================================================== */
function progreso(){
  const all=Object.keys(IDX.nodes), st=stats(all), m=mastery(all);
  let h=ttl('progreso')+'<div class="panel"><div class="big">'+ring(m)+'<div><h3>'+(m===100?'¡Repertorio dominado!':m?'Vas bien':'Todavía sin empezar')+'</h3><p>'+(all.length-st.fresh)+' de '+all.length+' posiciones vistas en '+esc(shortName(OP))+'.</p></div></div></div>'+
    '<div class="tiles"><div class="tile"><b>'+(all.length-st.fresh)+'</b><span>vistas</span></div><div class="tile due"><b>'+st.due+'</b><span>para repasar</span></div><div class="tile ok"><b>'+mastered(all)+'</b><span>dominadas</span></div></div>';
  OP.groups.forEach(gr=>{
    const ls=OP.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const keys=[...new Set(ls.flatMap(l=>IDX.lineNodes[l.id]))];
    h+='<div class="gh"><span>'+esc(gShort(gr))+'</span><small>'+mastery(keys)+'%</small></div><div class="panel">';
    ls.forEach(l=>{
      const ks=IDX.lineNodes[l.id], lm=mastery(ks), errs=ks.reduce((a,k)=>a+((prog[k]||{}).ko||0),0);
      h+='<div class="prow">'+mini(l.arr,l.key,OP.side)+'<div class="pb"><span class="pn">'+esc(l.name)+'</span>'+bar(lm)+'</div>'+(errs?'<span class="pe">'+errs+' err.</span>':'')+'</div>';
    });
    h+='</div>';
  });
  h+='<p class="lead">Una posición cuenta como dominada cuando la acertaste tres veces seguidas. Un error la vuelve a cero.</p><button class="danger" id="reset">Borrar progreso</button>';
  $('#pane').innerHTML=h;
  $('#reset').onclick=()=>{if(confirm('¿Borrar todo el progreso guardado en este dispositivo?')){prog={}; save(); render();}};
}
