/* ==========================================================================
   choices.js — «Tu repertorio»: puntos de elección de cada apertura y nivel
   (Maestros o un rango de rating de Lichess) para las estadísticas.
   STATS lo genera scripts/stats.js desde los datos del explorador de Lichess;
   si no hay datos, las tarjetas se muestran sin números.
   ========================================================================== */
const LEVELS=STATS.levels||[];
const levelName=id=>(LEVELS.find(l=>l.id===id)||{name:''}).name;
// Estadísticas de una posición (clave fen4) en el nivel elegido: {san: frecuencia‰} o, en los puntos de
// elección, {san: [frecuencia‰, puntos‰ para el usuario (-1 si hay pocas partidas)]}. Ver scripts/stats.js.
function posStats(opId,key,lv){const o=(STATS.ops||{})[opId], p=o&&o[key]; return p&&p[lv]||null;}
// Etiqueta de una jugada por su índice de ply: "4...Bf5".
const moveLabel=(i,san)=>(Math.floor(i/2)+1)+(i%2===0?'.':'...')+san;
// Datos de una opción en el nivel elegido: frecuencia y puntos para el usuario.
function optStats(op,c,move){
  const st=posStats(op.id,c.key,level); if(!st) return null;
  const m=st[move]; if(!m||!m[0]) return {share:0,score:null};
  return {share:m[0]/1000,score:m[1]>=0?m[1]/1000:null};
}
const pct=x=>Math.round(100*x)+'%';
// La opción con mejor resultado, solo si le saca al menos 2 puntos a todas las demás con datos
// (diferencias menores son ruido estadístico).
function bestOpt(op,c){
  const ds=c.options.map(o=>({o,s:optStats(op,c,o.move)})).filter(d=>d.s&&d.s.score!==null).sort((a,b)=>b.s.score-a.s.score);
  return ds.length>1&&ds[0].s.score-ds[1].s.score>=0.02?ds[0].o:null;
}

function levelChips(){
  if(!LEVELS.length) return '';
  return '<div class="chips lvl">'+LEVELS.map(l=>'<button data-lvl="'+l.id+'"'+(l.id===level?' class="on"':'')+'>'+esc(l.name)+'</button>').join('')+'</div>';
}
function choicesHTML(op){
  if(!op.choices.length) return '';
  let h='<h2 class="sec">Tu repertorio<small>'+op.choices.length+(op.choices.length===1?' elección':' elecciones')+'</small></h2>'+
    '<p class="lead">En estas posiciones hay más de una buena jugada. Elegí la que te guste: las variantes, la práctica y el examen siguen tu elección.</p>';
  if(LEVELS.length){
    h+=levelChips()+'<p class="lvl-note">Estadísticas de '+(level==='masters'?'partidas de maestros':'Lichess, '+esc(levelName(level)))+'. El nivel también decide qué tan seguido el rival elige cada jugada en la práctica.</p>'+
      '<div class="link-row"><button id="byLevel">Elegir según mi nivel</button></div>';
  }
  op.choices.forEach(c=>{
    const cur=picked(op,c), data=c.options.map(o=>({o,s:optStats(op,c,o.move)}));
    const most=data.filter(d=>d.s&&d.s.share).sort((a,b)=>b.s.share-a.s.share)[0];
    const best=bestOpt(op,c);
    h+='<div class="choice"><div class="ch-h">'+mini(c.line,c.ply,op.side)+'<div><b>'+esc(c.title)+'</b>'+(c.desc?'<p>'+c.desc+'</p>':'')+'</div></div><div class="ch-opts">'+
      data.map(({o,s})=>{
        const bd=[];
        if(o.def) bd.push('<span class="bdg rec">Recomendada</span>');
        if(most&&most.o===o) bd.push('<span class="bdg">La más jugada</span>');
        if(best===o) bd.push('<span class="bdg">Mejor resultado</span>');
        return '<button class="ch-o'+(o.move===cur?' on':'')+'" data-ch="'+c.id+'" data-mv="'+esc(o.move)+'" aria-pressed="'+(o.move===cur)+'">'+
          '<span class="mvl">'+moveLabel(c.ply,o.move)+'</span><span class="nm">'+esc(o.name)+'</span>'+(o.desc?'<span class="ds">'+o.desc+'</span>':'')+
          (s?'<span class="st">'+(s.share?pct(s.share)+' de las partidas'+(s.score!==null?' · '+pct(s.score)+' de puntos':''):'Casi no se juega en este nivel')+'</span>':'')+
          (bd.length?'<span class="bdgs">'+bd.join('')+'</span>':'')+(o.move===cur?'<span class="sel">✓ Tu elección</span>':'')+'</button>';
      }).join('')+'</div></div>';
  });
  return h;
}
// Aplica un cambio de elecciones: rearma el repertorio y vuelve a dibujar sin perder el scroll.
function applyChoices(op){
  saveChoices(); rebuild(op);
  if(op===OP){IDX=IDXS[op.id]; P=null; X=null;}
  const y=window.scrollY; render(); window.scrollTo(0,y);
}
function setLevel(id){level=id; lsSet(LEVEL_KEY,id); const y=window.scrollY; render(); window.scrollTo(0,y);}
function bindLevels(){document.querySelectorAll('[data-lvl]').forEach(b=>b.onclick=()=>setLevel(b.dataset.lvl));}
function bindChoices(op){
  bindLevels();
  document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{
    (choicesSel[op.id]=choicesSel[op.id]||{})[b.dataset.ch]=b.dataset.mv;
    applyChoices(op);
  });
  const bl=$('#byLevel');
  if(bl) bl.onclick=()=>{
    // En cada punto, la opción con mejor resultado en el nivel elegido; si ninguna se destaca, la recomendada.
    const sel=choicesSel[op.id]=choicesSel[op.id]||{};
    let n=0;
    op.choices.forEach(c=>{
      const best=bestOpt(op,c), def=(c.options.find(o=>o.def)||c.options[0]);
      sel[c.id]=(best||def).move; if(best&&best!==def) n++;
    });
    toast(n?'Elegido según '+levelName(level)+': '+n+(n===1?' cambio':' cambios'):'En '+levelName(level)+' ninguna opción se destaca: quedan las recomendadas');
    applyChoices(op);
  };
}
