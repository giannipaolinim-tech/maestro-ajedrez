/* ==========================================================================
   repertoire.js — índice de cada apertura (posiciones del usuario y del rival),
   apertura actual (OP/IDX), puntos de elección y portadas de mini tablero.
   ========================================================================== */
const f4=fen=>fen.split(' ').slice(0,4).join(' ');

/* ---------- Posiciones precalculadas ---------- */
// Las posiciones de cada línea vienen precalculadas del build (PRE, ver scripts/precompute.js):
// l.pos[n] = índice de la FEN después de n jugadas y l.mv[i] = origen+destino de la jugada i.
// Así el arranque no reproduce jugadas con chess.js.
const lineFen=(l,n)=>PRE[l.op].f[l.pos[n]];
const lineLast=(l,n)=>{if(!n) return null; const m=l.mv[n-1]; return {from:m.slice(0,2),to:m.slice(2,4)};};
OPENINGS.forEach(op=>{
  op.allLines=op.lines;
  op.choices=op.choices||[];
  op.allLines.forEach(l=>{
    const pre=PRE[op.id].l[l.id];
    l.op=op.id; l.arr=l.moves.split(' '); l.pos=pre[0]; l.mv=pre[1].split(' ');
  });
  // Notas por posición y jugada (clave "fen4 SAN"): si una línea no comenta una jugada que otra sí,
  // la lección muestra esa nota (por ejemplo, las primeras jugadas de las variantes nuevas).
  op.noteMap={};
  op.allLines.forEach(l=>Object.keys(l.notes).forEach(i=>{const k=f4(lineFen(l,+i))+' '+l.arr[i]; if(!(k in op.noteMap)) op.noteMap[k]=l.notes[i];}));
  // Puntos de elección: posición (clave fen4) y, por línea, qué opción toma en cada uno.
  op.choices.forEach(c=>{c.fen=PRE[op.id].f[PRE[op.id].c[c.id]]; c.key=f4(c.fen);});
  op.allLines.forEach(l=>{
    l.picks={};
    l.arr.forEach((m,i)=>{
      const k=f4(lineFen(l,i));
      op.choices.forEach(c=>{if(c.key===k){ l.picks[c.id]=m; if(!c.line){c.line=l; c.ply=i;} }});
    });
  });
});

/* ---------- Elecciones del usuario ---------- */
// Opción elegida en cada punto de elección (o la recomendada por defecto).
function picked(op,c){
  const v=(choicesSel[op.id]||{})[c.id];
  return c.options.some(o=>o.move===v)?v:(c.options.find(o=>o.def)||c.options[0]).move;
}
// Una línea está activa si en cada punto de elección por el que pasa juega la opción elegida.
const isActive=(op,l)=>op.choices.every(c=>!(c.id in l.picks)||l.picks[c.id]===picked(op,c));

/* ---------- Índice del repertorio ---------- */
function buildIndex(op){
  const idx={user:{},opp:{},nodes:{},lineNodes:{}};
  op.lines.forEach(l=>{
    idx.lineNodes[l.id]=[];
    l.arr.forEach((m,i)=>{
      const fen=lineFen(l,i), k=op.id+'|'+f4(fen), last=lineLast(l,i);
      if(fen.split(' ')[1]===op.side){
        idx.user[k]=m;
        if(!idx.nodes[k]) idx.nodes[k]={key:k,fen,san:m,last,note:l.notes[i]||'',line:l,ply:i,prefix:l.arr.slice(0,i)};
        else if(!idx.nodes[k].note&&l.notes[i]) idx.nodes[k].note=l.notes[i];
        if(!idx.lineNodes[l.id].includes(k)) idx.lineNodes[l.id].push(k);
      } else { (idx.opp[k]=idx.opp[k]||new Set()).add(m); }
    });
  });
  return idx;
}
const IDXS={};
// Arma el repertorio activo de una apertura (op.lines) según las elecciones, su índice y sus portadas.
function rebuild(op){
  op.lines=op.allLines.filter(l=>isActive(op,l));
  IDXS[op.id]=buildIndex(op);
  covers(op);
}

/* ---------- Portadas ---------- */
// Qué posición se muestra en cada portada:
// - variante: justo después de la jugada que la separa de las demás;
// - familia: la jugada que la separa de las otras familias, más lo que compartan sus variantes (hasta 3 plies);
// - apertura: op.cover si está definido, si no lo que comparten todas sus líneas.
function lcp(a,b){let i=0; while(i<a.length&&i<b.length&&a[i]===b[i]) i++; return i;}
function covers(op){
  op.lines.forEach(l=>{
    let d=0;
    op.lines.forEach(o=>{if(o!==l) d=Math.max(d,lcp(l.arr,o.arr));});
    l.key=Math.min(l.arr.length,d+1);
  });
  op.groups.forEach(gr=>{
    gr.cov=null;
    const ls=op.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const others=op.lines.filter(l=>l.group!==gr.id), a=ls[0].arr;
    let d=0; ls.forEach(l=>others.forEach(o=>{d=Math.max(d,lcp(l.arr,o.arr));}));
    let n=Math.min(a.length,d+1);
    while(n<d+4&&n<a.length&&ls.every(l=>l.arr[n]===a[n])) n++;
    gr.cov={line:ls[0],n};
  });
  let n=op.lines[0].arr.length; op.lines.forEach(l=>{n=Math.min(n,lcp(op.lines[0].arr,l.arr));});
  op.cov={line:op.lines[0],n:op.cover||Math.max(n,2)};
}

OPENINGS.forEach(rebuild);
let OP=OPENINGS[0], IDX=IDXS[OP.id];
Object.keys(prog).forEach(k=>{if(k.indexOf('|')<0){prog['caro-kann|'+k]=prog[k]; delete prog[k];}}); save();
const sideName=s=>s==='w'?'blancas':'negras';
const keyOf=g=>OP.id+'|'+f4(g.fen());
const REPS=OPENINGS.filter(o=>o.level!=='basico'), BASICS=OPENINGS.filter(o=>o.level==='basico');

const gShort=g=>g.name.split(' (')[0];
const shortName=o=>o.short||o.name;
