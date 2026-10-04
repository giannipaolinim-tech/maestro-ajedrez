/* ==========================================================================
   store.js — lo que se guarda en localStorage: progreso de las aperturas
   (repetición espaciada), racha de días y progreso de Aprender.
   ========================================================================== */
const STORE='maestro-ajedrez-v1', THEME_KEY='maestro-ajedrez-theme', SEEN_KEY='maestro-ajedrez-build';
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
let prog={};
try{prog=JSON.parse(lsGet(STORE)||'{}')||{};}catch(e){prog={};}
function save(){lsSet(STORE,JSON.stringify(prog));}

/* ---------- Progreso (repetición espaciada) ---------- */
const INTERVAL=[0,5*60e3,60*60e3,8*3600e3,24*3600e3,3*86400e3,7*86400e3];
function rec(k){return prog[k]||(prog[k]={box:0,last:0,ok:0,ko:0});}
function grade(k,good){
  const r=rec(k);
  r.last=Date.now();
  markDay();
  if(good){r.box=Math.min(6,r.box+1);r.ok++;}
  else {r.box=0;r.ko++;}
  save();
}
function mastery(keys){
  if(!keys.length)return 0;
  let s=0;
  keys.forEach(k=>{s+=Math.min(3,(prog[k]||{box:0}).box)/3;});
  return Math.round(100*s/keys.length);
}
// due = vistas que ya toca repasar; fresh = nunca vistas
function stats(keys){
  const now=Date.now();
  let due=0,fresh=0;
  keys.forEach(k=>{
    const r=prog[k];
    if(!r) fresh++;
    else if(now-r.last>=INTERVAL[r.box]) due++;
  });
  return {due,fresh};
}
function mastered(keys){return keys.filter(k=>(prog[k]||{box:0}).box>=3).length;}

/* ---------- Racha de días ---------- */
const DAYS_KEY='maestro-ajedrez-days', LAST_OP_KEY='maestro-ajedrez-op';
let days=[]; try{days=JSON.parse(lsGet(DAYS_KEY)||'[]')||[];}catch(e){days=[];}
const dayStr=t=>{const d=new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
function markDay(){
  const t=dayStr(Date.now());
  if(days[days.length-1]!==t){
    days.push(t);
    days=days.slice(-400);
    lsSet(DAYS_KEY,JSON.stringify(days));
  }
}
function streak(){
  const set=new Set(days), d=new Date(); d.setHours(12,0,0,0); let t=d.getTime(), n=0;
  const today=set.has(dayStr(t)); if(!today) t-=86400e3;
  while(set.has(dayStr(t))){n++; t-=86400e3;}
  return {n,today};
}

/* ---------- Elecciones de repertorio y nivel ---------- */
// choicesSel = {opId: {choiceId: jugada}}; level = base de datos para las estadísticas (masters, r1…r4).
const CHOICES_KEY='maestro-ajedrez-choices', LEVEL_KEY='maestro-ajedrez-level';
let choicesSel={}; try{choicesSel=JSON.parse(lsGet(CHOICES_KEY)||'{}')||{};}catch(e){choicesSel={};}
const saveChoices=()=>lsSet(CHOICES_KEY,JSON.stringify(choicesSel));
let level=lsGet(LEVEL_KEY)||'masters';

/* ---------- Progreso de Aprender (módulos y ejercicios resueltos) ---------- */
const SCHOOL_KEY='maestro-ajedrez-school';
let sch={}; try{sch=JSON.parse(lsGet(SCHOOL_KEY)||'{}')||{};}catch(e){sch={};}
const schRec=id=>sch[id]||(sch[id]={done:false,ex:{}});
const saveSch=()=>lsSet(SCHOOL_KEY,JSON.stringify(sch));
function schoolDone(id){return !!(sch[id]&&sch[id].done);}
const exCount=m=>m.steps.filter(s=>s.t!=='info').length;
const exSolved=m=>Object.keys((sch[m.id]||{}).ex||{}).length;
