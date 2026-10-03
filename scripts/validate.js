// Valida el repertorio: legalidad de todas las jugadas, notas dentro de rango
// y que en cada posición la jugada del usuario sea única (sin contradicciones entre variantes).
// Uso: node scripts/validate.js
const fs = require('fs'), path = require('path');
const { Chess } = require('../vendor/chess.js');
const OPENINGS = new Function(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8') + ';return OPENINGS;')();
const f4 = fen => fen.split(' ').slice(0, 4).join(' ');
let failed = false;
for (const op of OPENINGS) {
  const book = {}; let ok = true;
  const ids = new Set();
  for (const l of op.lines) {
    if (ids.has(l.id)) { console.log('ID DUPLICADO', op.id, l.id); ok = false; } ids.add(l.id);
    if (!op.groups.some(g => g.id === l.group)) { console.log('GRUPO INEXISTENTE', op.id, l.id, l.group); ok = false; }
    const g = new Chess(), ms = l.moves.split(' ');
    ms.forEach((m, i) => {
      const k = f4(g.fen()), turn = g.turn(), r = g.move(m);
      if (!r) { console.log('ILEGAL', op.id, l.id, 'ply', i, m); ok = false; return; }
      if (turn === op.side) {
        if (book[k] && book[k] !== r.san) { console.log('CONTRADICCIÓN', op.id, l.id, 'ply', i, m, 'vs', book[k]); ok = false; }
        book[k] = r.san;
      }
    });
    for (const k of Object.keys(l.notes)) if (+k >= ms.length) { console.log('NOTA FUERA DE RANGO', op.id, l.id, k); ok = false; }
  }
  console.log(op.id.padEnd(12), ok ? 'OK ' : 'ERR', op.lines.length, 'variantes,', Object.keys(book).length, 'posiciones del usuario');
  if (!ok) failed = true;
}

// Escuela: cada paso tiene una posición válida y cada ejercicio, solución.
const SCHOOL = new Function(fs.readFileSync(path.join(__dirname, '../src/school.js'), 'utf8') + ';return SCHOOL;')();
const SQ = /^[a-h][1-8]$/, norm = s => s.replace(/[+#?!]/g, '');
let nEx = 0, schoolOk = true;
const err = (...a) => { console.log('ESCUELA', ...a); schoolOk = false; };
for (const m of SCHOOL) m.steps.forEach((st, i) => {
  const where = m.id + ' paso ' + i;
  const g = new Chess();
  if (st.fen && !g.load(st.fen)) return err(where, 'FEN inválida', st.fen);
  if (st.moves) for (const mv of st.moves.split(' ')) if (!g.move(mv)) return err(where, 'jugada ilegal', mv);
  if (st.fen && (!st.fen.includes('K') || !st.fen.includes('k'))) err(where, 'faltan reyes');
  // El bando que no mueve no puede estar en jaque (posición imposible).
  { const f = g.fen().split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'; const o = new Chess(); if (o.load(f.join(' ')) && o.in_check()) err(where, 'el bando que no mueve está en jaque'); }
  for (const q of Object.keys(st.marks || {})) if (!SQ.test(q)) err(where, 'marca inválida', q);
  for (const a of st.arrows || []) if (!/^[a-h][1-8][a-h][1-8]$/.test(a)) err(where, 'flecha inválida', a);
  if (st.t === 'move') {
    nEx++;
    const legal = g.moves();
    if (st.sol) for (const s of st.sol) if (!legal.some(l => norm(l) === norm(s))) err(where, 'solución ilegal', s);
    const good = legal.filter(l => {
      if (st.goal === 'mate') { const t = new Chess(g.fen()); t.move(l); return t.in_checkmate(); }
      return (st.sol || []).some(s => norm(s) === norm(l));
    });
    if (!good.length) err(where, 'sin solución');
    if (st.goal === 'mate' && st.sol) err(where, 'mate y sol a la vez');
  } else if (st.t === 'tap') {
    nEx++;
    let targets = st.targets;
    if (st.from) {
      const p = g.get(st.from);
      if (!p || p.color !== g.turn()) return err(where, 'pieza inexistente o no le toca', st.from);
      targets = [...new Set(g.moves({ square: st.from, verbose: true }).map(x => x.to))];
    }
    if (!targets || !targets.length || targets.some(q => !SQ.test(q))) err(where, 'casillas objetivo inválidas');
    else if (st.need && st.need > targets.length) err(where, 'need mayor que las casillas', st.need, targets.length);
  } else if (st.t !== 'info') err(where, 'tipo desconocido', st.t);
});
console.log('escuela'.padEnd(12), schoolOk ? 'OK ' : 'ERR', SCHOOL.length, 'módulos,', nEx, 'ejercicios');
if (!schoolOk) failed = true;
process.exit(failed ? 1 : 0);
