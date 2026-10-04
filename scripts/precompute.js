// Precalcula lo que la app necesita de cada línea para no reproducir jugadas con chess.js al arrancar.
// Por apertura: f = FEN únicas (sin repetir posiciones compartidas o transpuestas) y, por línea,
// [índices de FEN (L+1: la posición antes de cada jugada y la final), "e2e4 c7c6 …" (origen+destino de cada jugada)];
// c = índice de la FEN de cada punto de elección.
// Lo usa build.js (inyecta const PRE) y lo puede usar cualquier script.
const { Chess } = require('../vendor/chess.js');

function precompute(openings) {
  const PRE = {};
  for (const op of openings) {
    const fens = [], idx = new Map(), lines = {};
    const fi = fen => { if (!idx.has(fen)) { idx.set(fen, fens.length); fens.push(fen); } return idx.get(fen); };
    for (const l of op.lines) {
      const g = new Chess(), pos = [], mv = [];
      for (const m of l.moves.split(' ')) {
        pos.push(fi(g.fen()));
        const r = g.move(m);
        if (!r) throw new Error('Jugada ilegal en ' + op.id + '/' + l.id + ': ' + m);
        mv.push(r.from + r.to);
      }
      pos.push(fi(g.fen()));
      lines[l.id] = [pos, mv.join(' ')];
    }
    // Puntos de elección: índice de la FEN de cada uno.
    const ch = {};
    for (const c of op.choices || []) {
      const g = new Chess();
      for (const m of c.at.split(' ').filter(Boolean)) if (!g.move(m)) throw new Error('Jugada ilegal en la elección ' + op.id + '/' + c.id + ': ' + m);
      ch[c.id] = fi(g.fen());
    }
    PRE[op.id] = { f: fens, l: lines, c: ch };
  }
  return PRE;
}

module.exports = { precompute };
