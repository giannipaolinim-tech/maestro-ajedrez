// Valida el repertorio: legalidad de todas las jugadas, notas dentro de rango
// y que en cada posición la jugada del usuario sea única (sin contradicciones entre variantes), salvo
// en los puntos de elección, donde cada opción arma su propio repertorio.
// Uso: node scripts/validate.js
const fs = require('fs'), path = require('path');
const { Chess } = require('../vendor/chess.js');
const OPENINGS = new Function(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8') + ';return OPENINGS;')();
const f4 = fen => fen.split(' ').slice(0, 4).join(' ');
let failed = false;
for (const op of OPENINGS) {
  const book = {}; let ok = true;
  const bad = (...a) => { console.log(...a); ok = false; };
  const ids = new Set();
  // Puntos de elección: posición válida, le toca al usuario, opciones legales y una sola recomendada.
  const choices = op.choices || [], chKey = {};
  for (const c of choices) {
    const g = new Chess();
    if (!c.at.split(' ').filter(Boolean).every(m => g.move(m))) { bad('ELECCIÓN CON JUGADA ILEGAL', op.id, c.id); continue; }
    if (g.turn() !== op.side) bad('ELECCIÓN DONDE NO JUEGA EL USUARIO', op.id, c.id);
    if (!c.title) bad('ELECCIÓN SIN TÍTULO', op.id, c.id);
    if (!c.options || c.options.length < 2) bad('ELECCIÓN CON MENOS DE DOS OPCIONES', op.id, c.id);
    else {
      if (c.options.filter(o => o.def).length !== 1) bad('ELECCIÓN SIN UNA (Y SOLO UNA) RECOMENDADA', op.id, c.id);
      for (const o of c.options) { const r = new Chess(g.fen()).move(o.move); if (!r || r.san !== o.move) bad('OPCIÓN ILEGAL O MAL ESCRITA (SAN)', op.id, c.id, o.move); }
      if (new Set(c.options.map(o => o.move)).size !== c.options.length) bad('OPCIONES REPETIDAS', op.id, c.id);
    }
    chKey[c.id] = f4(g.fen());
  }
  // Jugada de cada línea en cada punto de elección por el que pasa.
  const picks = {};
  for (const l of op.lines) {
    if (ids.has(l.id)) bad('ID DUPLICADO', op.id, l.id); ids.add(l.id);
    if (!op.groups.some(g => g.id === l.group)) bad('GRUPO INEXISTENTE', op.id, l.id, l.group);
    const g = new Chess(), ms = l.moves.split(' ');
    picks[l.id] = {};
    ms.forEach((m, i) => {
      const k = f4(g.fen()), turn = g.turn(), r = g.move(m);
      if (!r) { bad('ILEGAL', op.id, l.id, 'ply', i, m); return; }
      if (turn === op.side) {
        (book[k] = book[k] || []).push({ san: r.san, line: l.id, ply: i });
        for (const c of choices) if (chKey[c.id] === k) {
          picks[l.id][c.id] = r.san;
          if (!c.options.some(o => o.move === r.san)) bad('LÍNEA QUE NO TOMA NINGUNA OPCIÓN', op.id, l.id, c.id, r.san);
        }
      }
    });
    for (const k of Object.keys(l.notes)) if (+k >= ms.length) bad('NOTA FUERA DE RANGO', op.id, l.id, k);
  }
  for (const c of choices) for (const o of c.options || []) if (!op.lines.some(l => picks[l.id][c.id] === o.move)) bad('OPCIÓN SIN VARIANTES', op.id, c.id, o.move);
  // Unicidad: dos líneas pueden jugar distinto en la misma posición solo si nunca están activas a la vez,
  // es decir, si en algún punto de elección toman opciones distintas.
  const exclusive = (a, b) => choices.some(c => c.id in picks[a] && c.id in picks[b] && picks[a][c.id] !== picks[b][c.id]);
  for (const k of Object.keys(book)) {
    const es = book[k];
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++)
      if (es[i].san !== es[j].san && !exclusive(es[i].line, es[j].line)) bad('CONTRADICCIÓN', op.id, es[j].line, 'ply', es[j].ply, es[j].san, 'vs', es[i].san, '(' + es[i].line + ')');
  }
  console.log(op.id.padEnd(12), ok ? 'OK ' : 'ERR', op.lines.length, 'variantes,', Object.keys(book).length, 'posiciones del usuario' + (choices.length ? ', ' + choices.length + ' elecciones' : ''));
  if (!ok) failed = true;
}

// Escuela: cada paso tiene una posición válida y cada ejercicio, solución.
const { SCHOOL, SECTIONS } = new Function(fs.readFileSync(path.join(__dirname, '../src/school.js'), 'utf8') + ';return {SCHOOL, SECTIONS};')();
const SQ = /^[a-h][1-8]$/, norm = s => s.replace(/[+#?!]/g, '');
let nEx = 0, schoolOk = true;
const err = (...a) => { console.log('ESCUELA', ...a); schoolOk = false; };
for (const m of SCHOOL) if (!SECTIONS.some(x => x.id === m.sec) || m.sec === 'aperturas') err(m.id, 'sección inválida', m.sec);
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
  } else if (st.t === 'line') {
    nEx++;
    const me = g.turn(), ms = st.line.split(' '), mine = ms.filter((_, k) => k % 2 === 0);
    if (!st.alts || st.alts.length !== mine.length) err(where, 'alts tiene que tener una lista por jugada del usuario', mine.length);
    ms.forEach((mv, k) => {
      if (k % 2 === 0 && st.alts) for (const a of st.alts[k / 2] || []) { if (!g.moves().some(l => norm(l) === norm(a))) err(where, 'alternativa ilegal', a); }
      if (!g.move(mv)) err(where, 'jugada ilegal en la línea', mv);
    });
    if (g.turn() === me && !g.in_checkmate()) err(where, 'la línea tiene que terminar con una jugada del usuario');
    for (const k of Object.keys(st.notes || {})) if (+k >= ms.length) err(where, 'nota fuera de rango', k);
  } else if (st.t === 'play') {
    if (st.mode !== 'kbn') err(where, 'modo de práctica desconocido', st.mode);
  } else if (st.t !== 'info') err(where, 'tipo desconocido', st.t);
});
console.log('escuela'.padEnd(12), schoolOk ? 'OK ' : 'ERR', SCHOOL.length, 'módulos,', nEx, 'ejercicios');
if (!schoolOk) failed = true;
process.exit(failed ? 1 : 0);
