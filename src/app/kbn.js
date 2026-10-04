/* ==========================================================================
   kbn.js — práctica libre del mate con alfil y caballo: posición inicial al
   azar y defensa heurística del rey negro.
   ========================================================================== */
const isLight=sq=>(FILES.indexOf(sq[0])+(+sq[1]))%2===0;
function findPiece(g,color,type){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const sq=FILES[c]+(r+1), p=g.get(sq);
    if(p&&p.color===color&&p.type===type) return sq;
  }
  return null;
}
function kbnStart(){
  const rnd=n=>Math.floor(Math.random()*n), f=s=>s&7, r=s=>s>>3, dist=(a,b)=>Math.max(Math.abs(f(a)-f(b)),Math.abs(r(a)-r(b))), edge=s=>Math.min(f(s),7-f(s),r(s),7-r(s));
  for(let k=0;k<2000;k++){
    const wk=rnd(64), wb=rnd(64), wn=rnd(64), bk=rnd(64);
    if(new Set([wk,wb,wn,bk]).size<4||dist(wk,bk)<2||dist(wb,bk)<2||dist(wn,bk)<2||edge(bk)<2) continue;
    const b=Array(64).fill(''); b[wk]='K'; b[wb]='B'; b[wn]='N'; b[bk]='k';
    const rows=[];
    for(let rr=7;rr>=0;rr--){
      let s='',e=0;
      for(let ff=0;ff<8;ff++){
        const c=b[rr*8+ff];
        if(!c) e++;
        else {if(e) s+=e; e=0; s+=c;}
      }
      if(e) s+=e;
      rows.push(s);
    }
    const pl=rows.join('/'), t=new Chess();
    if(!t.load(pl+' b - - 0 1')||t.in_check()) continue; // con blancas por mover, el negro no puede estar en jaque
    return pl+' w - - 0 1';
  }
  return '8/8/8/3k4/8/3BK3/2N5/8 w - - 0 1';
}
// Defensa heurística: come si puede (tablas), y si no busca espacio, el centro y alejarse de las esquinas buenas.
function kbnDefense(g){
  const ms=g.moves({verbose:true}); if(!ms.length) return null;
  const cap=ms.find(m=>m.captured); if(cap) return cap;
  const bsq=findPiece(g,'w','b'), corners=bsq&&isLight(bsq)?['a8','h1']:['a1','h8'];
  let best=null, bs=-1e9;
  for(const m of ms){
    const fi=FILES.indexOf(m.to[0]), ri=+m.to[1]-1, t=new Chess(g.fen()); t.move(m.san);
    const f=t.fen().split(' '); f[1]='b'; f[3]='-'; const u=new Chess(); u.load(f.join(' '));
    const mob=u.moves().length, edge=Math.min(fi,7-fi,ri,7-ri);
    const cd=Math.min(...corners.map(c=>Math.max(Math.abs(FILES.indexOf(c[0])-fi),Math.abs(+c[1]-1-ri))));
    const sc=mob*1.2+edge*2.5+cd*1.5+Math.random()*.6;
    if(sc>bs){bs=sc; best=m;}
  }
  return best;
}
