/* ==========================================================================
   repertoire.js — índice de cada apertura (posiciones del usuario y del rival),
   apertura actual (OP/IDX) y posición de las portadas de mini tablero.
   ========================================================================== */
const f4=fen=>fen.split(' ').slice(0,4).join(' ');

/* ---------- Índice del repertorio ---------- */
// Las posiciones de cada línea vienen precalculadas del build (PRE, ver scripts/precompute.js):
// l.pos[n] = índice de la FEN después de n jugadas y l.mv[i] = origen+destino de la jugada i.
// Así el arranque no reproduce jugadas con chess.js.
const lineFen=(l,n)=>PRE[l.op].f[l.pos[n]];
const lineLast=(l,n)=>{if(!n) return null; const m=l.mv[n-1]; return {from:m.slice(0,2),to:m.slice(2,4)};};
function buildIndex(op){
  const idx={user:{},opp:{},nodes:{},lineNodes:{}};
  op.lines.forEach(l=>{
    const pre=PRE[op.id].l[l.id];
    l.op=op.id; l.arr=l.moves.split(' '); l.pos=pre[0]; l.mv=pre[1].split(' ');
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
const IDXS={}; OPENINGS.forEach(o=>IDXS[o.id]=buildIndex(o));
let OP=OPENINGS[0], IDX=IDXS[OP.id];
Object.keys(prog).forEach(k=>{if(k.indexOf('|')<0){prog['caro-kann|'+k]=prog[k]; delete prog[k];}}); save();
const sideName=s=>s==='w'?'blancas':'negras';
const keyOf=g=>OP.id+'|'+f4(g.fen());
const REPS=OPENINGS.filter(o=>o.level!=='basico'), BASICS=OPENINGS.filter(o=>o.level==='basico');

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
    gr.cov={line:ls[0],n};
  });
  let n=op.lines[0].arr.length; op.lines.forEach(l=>{n=Math.min(n,lcp(op.lines[0].arr,l.arr));});
  op.cov={line:op.lines[0],n:op.cover||Math.max(n,2)};
});
