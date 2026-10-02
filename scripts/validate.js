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
process.exit(failed ? 1 : 0);
