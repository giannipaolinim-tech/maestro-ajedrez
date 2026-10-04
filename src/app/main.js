/* ==========================================================================
   main.js — arranque: aviso de versión nueva, restaurar la vista desde el
   historial, primer render y registro de la PWA. Va último.
   ========================================================================== */
if(typeof BUILD!=='undefined'){
  let day=BUILD.date; try{day=new Date(BUILD.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
  VER='Versión del '+day+'.';
  const seen=lsGet(SEEN_KEY); if(seen&&seen!==BUILD.v) setTimeout(()=>toast('App actualizada · versión del '+day),400); lsSet(SEEN_KEY,BUILD.v);
}
{const o=OPENINGS.find(x=>x.id===lsGet(LAST_OP_KEY)); if(o){OP=o; IDX=IDXS[o.id];}}
try{restore(history.state);}catch(e){}
remember();
render();

// PWA: solo cuando se sirve por http(s) fuera de claude.ai (GitHub Pages o localhost).
if(/^https?:$/.test(location.protocol)&&!/claude\.ai$|claudeusercontent/.test(location.hostname)&&'serviceWorker' in navigator){
  [['manifest','manifest.webmanifest'],['icon','icons/icon-192.png']].forEach(a=>{const l=document.createElement('link'); l.rel=a[0]; l.href=a[1]; document.head.appendChild(l);});
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
