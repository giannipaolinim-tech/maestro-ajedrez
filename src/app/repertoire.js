/* ==========================================================================
   repertoire.js — índice de cada apertura (posiciones del usuario y del rival),
   apertura actual (OP/IDX) y posición de las portadas de mini tablero.
   ========================================================================== */
const f4=fen=>fen.split(' ').slice(0,4).join(' ');

/* ---------- Índice del repertorio ---------- */
function buildIndex(op){
  const idx={user:{},opp:{},nodes:{},lineNodes:{}};
  op.lines.forEach(l=>{
    l.arr=l.moves.split(' '); const g=new Chess(); idx.lineNodes[l.id]=[]; let last=null;
    l.arr.forEach((m,i)=>{
      const fen=g.fen(), k=op.id+'|'+f4(fen);
      if(g.turn()===op.side){
        idx.user[k]=m;
        if(!idx.nodes[k]) idx.nodes[k]={key:k,fen,san:m,last,note:l.notes[i]||'',line:l,ply:i,prefix:l.arr.slice(0,i)};
        else if(!idx.nodes[k].note&&l.notes[i]) idx.nodes[k].note=l.notes[i];
        if(!idx.lineNodes[l.id].includes(k)) idx.lineNodes[l.id].push(k);
      } else { (idx.opp[k]=idx.opp[k]||new Set()).add(m); }
      const r=g.move(m); last={from:r.from,to:r.to};
    });
  });
  return idx;
}
const IDXS={}; OPENINGS.forEach(o=>IDXS[o.id]=buildIndex(o));
let OP=OPENINGS[0], IDX=IDXS[OP.id];
Object.keys(prog).forEach(k=>{if(k.indexOf('|')<0){prog['caro-kann|'+k]=prog[k]; delete prog[k];}}); save();
const sideName=s=>s==='w'?'blancas':'negras';
const keyOf=g=>OP.id+'|'+f4(g.fen());
const REPS=OPENINGS.filter(o=>o.level!=='basico'), BASICS=OPENINGS.filter(o=>o.level==='basico');

function groupName(id){return (OP.groups.find(g=>g.id===id)||{}).name||'';}
const gShort=g=>g.name.split(' (')[0];
const shortName=o=>o.short||o.name;

/* ---------- Portadas ---------- */
// Qué posición se muestra en cada portada:
// - variante: justo después de la jugada que la separa de las demás;
// - familia: la jugada que la separa de las otras familias, más lo que compartan sus variantes (hasta 3 plies);
// - apertura: op.cover si está definido, si no lo que comparten todas sus líneas.
function lcp(a,b){let i=0; while(i<a.length&&i<b.length&&a[i]===b[i]) i++; return i;}
OPENINGS.forEach(op=>{
  op.lines.forEach(l=>{
    let d=0;
    op.lines.forEach(o=>{if(o!==l) d=Math.max(d,lcp(l.arr,o.arr));});
    l.key=Math.min(l.arr.length,d+1);
  });
  op.groups.forEach(gr=>{
    const ls=op.lines.filter(l=>l.group===gr.id); if(!ls.length) return;
    const others=op.lines.filter(l=>l.group!==gr.id), a=ls[0].arr;
    let d=0; ls.forEach(l=>others.forEach(o=>{d=Math.max(d,lcp(l.arr,o.arr));}));
    let n=Math.min(a.length,d+1);
    while(n<d+4&&n<a.length&&ls.every(l=>l.arr[n]===a[n])) n++;
    gr.cov={arr:a,n};
  });
  let n=op.lines[0].arr.length; op.lines.forEach(l=>{n=Math.min(n,lcp(op.lines[0].arr,l.arr));});
  op.cov={arr:op.lines[0].arr,n:op.cover||Math.max(n,2)};
});
