// Solucionador exacto de rey, alfil y caballo contra rey (KBNK), por análisis retrógrado.
// Calcula la distancia al mate (en plies) de todas las posiciones. Se usa para verificar los
// ejercicios del tutorial de mate con alfil y caballo (validate.js) y para armar líneas.
// Uso como módulo: const T = require('./kbnk.js'); T.dtm(fen) → plies hasta el mate (null = tablas/ilegal).
// Uso por consola: node scripts/kbnk.js "<fen>"  → muestra el valor y una línea óptima.
const N = 64, SIZE = N * N * N * N;
const file = s => s & 7, rank = s => s >> 3;
const KING = [], KNIGHT = [];
for (let s = 0; s < N; s++) {
  KING[s] = []; KNIGHT[s] = [];
  for (let df = -2; df <= 2; df++) for (let dr = -2; dr <= 2; dr++) {
    const f = file(s) + df, r = rank(s) + dr; if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const t = r * 8 + f, a = Math.abs(df), b = Math.abs(dr);
    if (a <= 1 && b <= 1 && (a || b)) KING[s].push(t);
    if (a * b === 2) KNIGHT[s].push(t);
  }
}
const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const adj = (a, b) => Math.max(Math.abs(file(a) - file(b)), Math.abs(rank(a) - rank(b))) <= 1;
// ¿El alfil en b ataca t? Bloquean las piezas en occ (array de casillas).
function bAtt(b, t, occ) {
  const df = file(t) - file(b), dr = rank(t) - rank(b);
  if (!df || Math.abs(df) !== Math.abs(dr)) return false;
  const sf = Math.sign(df), sr = Math.sign(dr);
  for (let f = file(b) + sf, r = rank(b) + sr; f !== file(t); f += sf, r += sr) if (occ.includes(r * 8 + f)) return false;
  return true;
}
const nAtt = (n, t) => KNIGHT[n].includes(t);
const idx = (wk, wb, wn, bk) => ((wk * N + wb) * N + wn) * N + bk;
// Casilla t atacada por blancas (el rey negro se mueve, así que su casilla vieja no bloquea).
function wAttacks(wk, wb, wn, t) { return adj(wk, t) || (wb !== t && bAtt(wb, t, [wk, wn])) || (wn !== t && nAtt(wn, t)); }
function legalBase(wk, wb, wn, bk) { return wk !== wb && wk !== wn && wk !== bk && wb !== wn && wb !== bk && wn !== bk && !adj(wk, bk); }
const inCheck = (wk, wb, wn, bk) => bAtt(wb, bk, [wk, wn]) || nAtt(wn, bk);
// Jugadas del rey negro: {to, cap} (cap = captura una pieza: lleva a tablas).
function blackMoves(wk, wb, wn, bk) {
  const out = [];
  for (const t of KING[bk]) {
    if (t === wk || adj(t, wk)) continue;
    if (t === wb) { if (!nAtt(wn, t)) out.push({ to: t, cap: 1 }); continue; }
    if (t === wn) { if (!bAtt(wb, t, [wk])) out.push({ to: t, cap: 1 }); continue; }
    if (bAtt(wb, t, [wk, wn]) || nAtt(wn, t)) continue;
    out.push({ to: t, cap: 0 });
  }
  return out;
}
// Jugadas blancas: [pieza, desde, hasta] con pieza 0=rey 1=alfil 2=caballo.
function whiteMoves(wk, wb, wn, bk) {
  const out = [], occ = [wk, wb, wn, bk];
  for (const t of KING[wk]) if (!occ.includes(t) && !adj(t, bk)) out.push([0, wk, t]);
  for (const [sf, sr] of DIRS) for (let f = file(wb) + sf, r = rank(wb) + sr; f >= 0 && f < 8 && r >= 0 && r < 8; f += sf, r += sr) { const t = r * 8 + f; if (occ.includes(t)) break; out.push([1, wb, t]); }
  for (const t of KNIGHT[wn]) if (!occ.includes(t)) out.push([2, wn, t]);
  return out;
}
const apply = (p, m) => { const q = p.slice(); q[m[0]] = m[2]; return q; };

let B = null, W = null; // dtm en plies + 1 (0 = desconocido/tablas)
function solve() {
  if (B) return;
  B = new Uint8Array(SIZE); W = new Uint8Array(SIZE);
  const cnt = new Uint8Array(SIZE);
  let frontier = [];
  for (let wk = 0; wk < N; wk++) for (let wb = 0; wb < N; wb++) for (let wn = 0; wn < N; wn++) for (let bk = 0; bk < N; bk++) {
    if (!legalBase(wk, wb, wn, bk)) continue;
    const i = idx(wk, wb, wn, bk), ms = blackMoves(wk, wb, wn, bk);
    cnt[i] = ms.some(m => m.cap) ? 255 : ms.length; // con una captura posible nunca está perdida
    if (!ms.length && inCheck(wk, wb, wn, bk)) { B[i] = 1; frontier.push(i); }
  }
  for (let d = 1; frontier.length; d++) {
    const next = [];
    if (d % 2 === 1) { // de negras perdidas (d-1 plies) a blancas que ganan en d
      for (const i of frontier) {
        const bk = i % N, wn = (i / N | 0) % N, wb = (i / N / N | 0) % N, wk = i / N / N / N | 0, occ = [wk, wb, wn, bk];
        const pre = [];
        for (const t of KING[wk]) if (!occ.includes(t) && !adj(t, bk)) pre.push([t, wb, wn]);
        for (const [sf, sr] of DIRS) for (let f = file(wb) + sf, r = rank(wb) + sr; f >= 0 && f < 8 && r >= 0 && r < 8; f += sf, r += sr) { const t = r * 8 + f; if (occ.includes(t)) break; pre.push([wk, t, wn]); }
        for (const t of KNIGHT[wn]) if (!occ.includes(t)) pre.push([wk, wb, t]);
        for (const [a, b, c] of pre) {
          if (inCheck(a, b, c, bk)) continue; // con blancas por mover, el rey negro no puede estar en jaque
          const j = idx(a, b, c, bk); if (!W[j]) { W[j] = d + 1; next.push(j); }
        }
      }
    } else { // de blancas que ganan a negras perdidas
      for (const i of frontier) {
        const bk = i % N, wn = (i / N | 0) % N, wb = (i / N / N | 0) % N, wk = i / N / N / N | 0;
        for (const t of KING[bk]) {
          if (t === wk || t === wb || t === wn || adj(t, wk)) continue;
          const j = idx(wk, wb, wn, t);
          if (B[j] || cnt[j] === 255 || cnt[j] === 0) continue;
          if (--cnt[j] === 0) { B[j] = d + 1; next.push(j); }
        }
      }
    }
    frontier = next;
  }
}
const SQ = s => 'abcdefgh'[file(s)] + (rank(s) + 1);
const sq = n => (n.charCodeAt(1) - 49) * 8 + n.charCodeAt(0) - 97;
// Lee una FEN de KBNK (blancas: K, B, N; negras: k).
function parse(fen) {
  const [board, turn] = fen.split(' '); const p = {};
  board.split('/').forEach((row, ri) => { let f = 0; for (const c of row) { if (/\d/.test(c)) f += +c; else { p[c] = (7 - ri) * 8 + f; f++; } } });
  if (!('K' in p && 'B' in p && 'N' in p && 'k' in p) || Object.keys(p).length !== 4) throw new Error('No es KBNK: ' + fen);
  return { pos: [p.K, p.B, p.N, p.k], turn };
}
// dtm en plies hasta el mate desde la posición (null si es tablas).
function dtm(fen) { solve(); const { pos, turn } = parse(fen); const v = (turn === 'w' ? W : B)[idx(...pos)]; return v ? v - 1 : null; }
function value(pos, turn) { const v = (turn === 'w' ? W : B)[idx(...pos)]; return v ? v - 1 : null; }
// Jugadas blancas óptimas (SAN simplificada: pieza + destino, sin capturas posibles en KBNK salvo ninguna).
function bestWhite(pos) {
  const d = value(pos, 'w'); if (d === null) return [];
  return whiteMoves(...pos).filter(m => value(apply(pos, m), 'b') === d - 1);
}
function bestBlack(pos) {
  let best = -1, out = [];
  for (const m of blackMoves(...pos)) { if (m.cap) return [m]; const q = pos.slice(); q[3] = m.to; const v = value(q, 'w'); if (v > best) { best = v; out = []; } if (v === best) out.push(m); }
  return out;
}
module.exports = { solve, dtm, value, bestWhite, bestBlack, whiteMoves, blackMoves, apply, SQ, sq, parse, idx };

// --check: verifica los pasos de los módulos de la Escuela con kbn:true.
function check() {
  const fs = require('fs'), path = require('path'), { Chess } = require('../vendor/chess.js');
  const { SCHOOL } = new Function(fs.readFileSync(path.join(__dirname, '../src/school.js'), 'utf8') + ';return {SCHOOL};')();
  const norm = s => s.replace(/[+#]/g, ''), set = a => [...a].map(norm).sort().join(',');
  const sanOf = (g, m) => g.moves({ verbose: true }).find(x => x.from === SQ(m[1]) && x.to === SQ(m[2])).san;
  let ok = true; const bad = (...a) => { console.log('KBN', ...a); ok = false; };
  solve();
  for (const mod of SCHOOL.filter(m => m.kbn)) mod.steps.forEach((st, i) => {
    if (!st.fen || (st.t !== 'move' && st.t !== 'line')) return;
    const where = mod.id + ' paso ' + i, g = new Chess(); g.load(st.fen);
    if (st.t === 'move') {
      const best = bestWhite(parse(g.fen()).pos).map(m => sanOf(g, m));
      const acc = g.moves().filter(l => { const t = new Chess(g.fen()); t.move(l); return st.goal === 'mate' ? t.in_checkmate() : st.sol.some(x => norm(x) === norm(l)); });
      if (set(acc) !== set(best)) bad(where, 'acepta', set(acc), 'pero las óptimas son', set(best));
      return;
    }
    st.line.split(' ').forEach((mv, k) => {
      const { pos, turn } = parse(g.fen());
      if (turn === 'w') {
        const best = bestWhite(pos).map(m => sanOf(g, m));
        if (!best.some(b => norm(b) === norm(mv))) bad(where, 'jugada', k, mv, 'no es óptima; óptimas:', best.join(','));
        const alts = best.filter(b => norm(b) !== norm(mv));
        if (set(alts) !== set(st.alts[k / 2] || [])) bad(where, 'alts de', mv, 'deberían ser', JSON.stringify(alts));
      } else {
        const opts = bestBlack(pos).map(m => SQ(m.to)), to = g.moves({ verbose: true }).find(x => x.san === mv);
        if (!to || !opts.includes(to.to)) bad(where, 'respuesta', k, mv, 'no es la mejor defensa; mejores:', opts.join(','));
      }
      g.move(mv);
    });
    if (!g.in_checkmate() && value(parse(g.fen()).pos, 'b') === null) bad(where, 'la línea termina en una posición que no gana');
  });
  console.log('kbn'.padEnd(12), ok ? 'OK' : 'ERR', 'tutorial de alfil y caballo verificado con el solucionador exacto');
  return ok;
}
module.exports.check = check;

if (require.main === module && process.argv[2] === '--check') process.exit(check() ? 0 : 1);
else if (require.main === module) {
  const t0 = Date.now(); solve(); console.log('tabla lista en', ((Date.now() - t0) / 1000).toFixed(1), 's');
  const fen = process.argv[2]; if (!fen) process.exit(0);
  let { pos, turn } = parse(fen); console.log('dtm', value(pos, turn), 'plies');
  const P = ['K', 'B', 'N'], line = [];
  for (let k = 0; k < 80; k++) {
    if (turn === 'w') { const ms = bestWhite(pos); if (!ms.length) break; line.push(ms.map(m => P[m[0]] + SQ(m[2])).join('/')); pos = apply(pos, ms[0]); turn = 'b'; }
    else { const ms = bestBlack(pos); if (!ms.length) { line.push('#'); break; } pos = pos.slice(); pos[3] = ms[0].to; line.push('K' + SQ(ms[0].to)); turn = 'w'; }
  }
  console.log(line.join(' '));
}
