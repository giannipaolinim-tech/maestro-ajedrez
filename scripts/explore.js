// Explorador de aperturas: arma, para cada apertura, el árbol de lo que realmente se juega,
// con datos del explorador de Lichess (base Masters y base Lichess por rating) y Stockfish.
//
// Uso:  node scripts/explore.js [aperturas...] [--plies 20] [--min 1.2] [--sf 20] [--solo-cache]
//   aperturas    ids de src/data.js (por defecto, todas)
//   --plies N    profundidad máxima en medias jugadas desde el inicio (20 = 10 jugadas)
//   --min P      una jugada del rival entra si la posición a la que lleva se alcanza en al menos P %
//                de las partidas de la apertura, en alguna de las bases (Masters o algún rango de rating)
//   --sf D       profundidad de Stockfish
//   --solo-cache no consulta Lichess; usa solo lo que ya está en research/cache
//
// Requiere el token de Lichess en credenciales/lichess-token.txt o en LICHESS_TOKEN (ver credenciales/README.md).
// Salida: research/<apertura>.json con el árbol (alcance y estadísticas por base, jugada elegida para el
// usuario y candidatas con su evaluación). No toca src/data.js: el árbol es materia prima para curar.
//
// Cómo se elige la jugada del usuario en cada posición:
//   1. Si el repertorio actual ya tiene jugada ahí, se respeta (decisiones confirmadas). Si Stockfish la ve
//      más de REVIEW_CP centipeones peor que la mejor, se marca para revisar.
//   2. Si no, entre las jugadas a menos de NEAR_CP de la mejor según Stockfish, la más jugada por los
//      maestros (o en 2200+ si hay pocas partidas de maestros). Las otras candidatas cercanas y
//      populares quedan anotadas como posibles puntos de elección.
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { Chess } = require('../vendor/chess.js');
const root = path.join(__dirname, '..');

/* ---------- Configuración ---------- */
const { LEVELS, f4, explorer, token, ndjsonCache, stats: lxStats } = require('./lichess.js');
// Punto de partida de cada apertura: desde dónde se cuenta el alcance (100 %).
// first = jugadas del rival que se consideran en esa posición (el resto queda fuera de la apertura).
const ROOTS = {
  'caro-kann': { root: 'e4' },
  viena: { root: 'e4 e5' },
  holandesa: { root: '', first: ['d4', 'c4', 'Nf3', 'g3'] },
  italiana: { root: 'e4 e5' },
  abierto: { root: 'e4' },
  gdd: { root: 'd4' },
};
const MIN_GAMES = 30;   // menos partidas que esto en una base: esa base no opina en la posición
const NEAR_CP = 35;     // candidatas "igual de buenas" para el usuario
const REVIEW_CP = 60;   // jugada del repertorio a revisar
const CHOICE_SHARE = 0.15; // una alternativa cercana jugada al menos este % se anota como posible elección

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const PLIES = +opt('--plies', 20), MIN = +opt('--min', 1.5) / 100, SF_DEPTH = +opt('--sf', 20);
const ONLY_CACHE = args.includes('--solo-cache');
const WITH_VALUE = ['--plies', '--min', '--sf'];
const ids = args.filter((a, i) => !a.startsWith('--') && !WITH_VALUE.includes(args[i - 1]));

const OPENINGS = new Function(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';return OPENINGS;')();

/* ---------- Caché de Stockfish y token ---------- */
const sfCache = ndjsonCache('stockfish.ndjson');
if (!ONLY_CACHE && !token()) { console.error('Falta el token de Lichess: ver credenciales/README.md'); process.exit(1); }
const ex = (lv, fen) => explorer(lv, fen, ONLY_CACHE);

/* ---------- Stockfish (proceso aparte que habla UCI) ---------- */
let sf = null;
function startSf() {
  const p = spawn(process.execPath, [path.join(root, 'node_modules/stockfish/bin/stockfish-19.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buf = '', waiters = [];
  p.stdout.on('data', d => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) { const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiters.forEach(w => w(ln)); }
  });
  const send = s => p.stdin.write(s + '\n');
  const until = (test, onLine) => new Promise(res => { const w = ln => { if (onLine) onLine(ln); if (test(ln)) { waiters = waiters.filter(x => x !== w); res(ln); } }; waiters.push(w); });
  return { p, send, until };
}
// Devuelve [{san, cp}] de las mejores jugadas, cp desde el punto de vista del que mueve.
async function analyse(fen, multipv = 4) {
  const k = f4(fen) + '|' + SF_DEPTH + '|' + multipv;
  if (sfCache.has(k)) return sfCache.get(k);
  if (!sf) {
    sf = startSf();
    sf.send('uci'); await sf.until(l => l === 'uciok');
    sf.send('setoption name Threads value 4'); sf.send('setoption name Hash value 256');
  }
  sf.send('setoption name MultiPV value ' + multipv); sf.send('isready'); await sf.until(l => l === 'readyok');
  const best = {};
  sf.send('position fen ' + fen); sf.send('go depth ' + SF_DEPTH);
  await sf.until(l => l.startsWith('bestmove'), ln => {
    const m = ln.match(/ depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)/);
    if (m && +m[1] === SF_DEPTH) best[m[2]] = { uci: m[5], cp: m[3] === 'cp' ? +m[4] : (+m[4] > 0 ? 100000 - +m[4] : -100000 - +m[4]) };
  });
  const g = new Chess(fen);
  const v = Object.keys(best).sort((a, b) => a - b).map(i => {
    const u = best[i].uci, r = new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' });
    return { san: r ? r.san : u, cp: best[i].cp };
  });
  sfCache.set(k, v);
  return v;
}

/* ---------- Árbol ---------- */
async function explore(op) {
  const cfg = ROOTS[op.id];
  if (!cfg) { console.log(op.id, ': sin configuración en ROOTS, la salteo'); return; }
  // Jugadas del usuario que ya están en el repertorio (decisiones confirmadas).
  const book = {};
  for (const l of op.lines) { const g = new Chess(); for (const m of l.moves.split(' ')) { const k = f4(g.fen()); if (g.turn() === op.side) book[k] = m; g.move(m); } }

  const g0 = new Chess(); for (const m of cfg.root.split(' ').filter(Boolean)) g0.move(m);
  const one = Object.fromEntries(LEVELS.map(l => [l.id, 1]));
  let layer = new Map([[f4(g0.fen()), { fen: g0.fen(), path: cfg.root.split(' ').filter(Boolean), reach: one }]]);
  const nodes = [], review = [], choices = [];
  console.log('\n== ' + op.name + ' (' + op.id + ')');
  for (let ply = layer.values().next().value.path.length; ply < PLIES && layer.size; ply++) {
    const next = new Map();
    const add = (fen, pth, reach) => {
      const k = f4(fen), n = next.get(k);
      if (n) { for (const l in reach) n.reach[l] += reach[l]; } // transposición: se suman los alcances
      else next.set(k, { fen, path: pth, reach: { ...reach } });
    };
    for (const node of layer.values()) {
      const g = new Chess(node.fen), turn = g.turn();
      const stats = {};
      // Donde juega el usuario alcanza con Maestros y 2200+ (lo que usa la elección); el resto de los
      // niveles para los puntos de elección lo completa scripts/stats.js. Ahorra consultas a Lichess.
      const lvs = turn === op.side ? LEVELS.filter(l => l.id === 'masters' || l.id === 'r4') : LEVELS;
      for (const lv of lvs) { const s = await ex(lv, node.fen); if (s) stats[lv.id] = s; }
      const out = { path: node.path.join(' '), fen: node.fen, turn, reach: round(node.reach), stats: compact(stats) };
      nodes.push(out);
      if (turn === op.side) {
        // Jugada del usuario
        const cands = await analyse(node.fen);
        const bestCp = cands.length ? cands[0].cp : 0;
        let move = book[f4(node.fen)], src = 'repertorio';
        const pop = san => { const m = stats.masters; if (m && m.n >= MIN_GAMES * 3) return (m.moves[san] || [0])[0] / m.n; const r = stats.r4; return r && r.n ? (r.moves[san] || [0])[0] / r.n : 0; };
        const near = cands.filter(c => c.cp >= bestCp - NEAR_CP);
        if (!move) {
          if (!near.length) continue;
          move = near.slice().sort((a, b) => pop(b.san) - pop(a.san) || b.cp - a.cp)[0].san; src = 'motor';
        } else {
          const ev = cands.find(c => c.san === move);
          if (!ev || ev.cp < bestCp - REVIEW_CP) review.push({ path: out.path, move, best: cands[0] && cands[0].san, cp: ev ? ev.cp : null, bestCp });
        }
        out.move = move; out.src = src; out.cands = cands.map(c => ({ ...c, pop: +pop(c.san).toFixed(3) }));
        const alts = near.filter(c => c.san !== move && pop(c.san) >= CHOICE_SHARE);
        if (alts.length) choices.push({ path: out.path, move, alts: alts.map(a => a.san) });
        const g2 = new Chess(node.fen); g2.move(move);
        add(g2.fen(), node.path.concat(move), node.reach);
      } else {
        // Jugadas del rival: entran las que llevan a una posición alcanzada en al menos MIN en alguna base
        const sans = new Set();
        for (const lv of LEVELS) { const s = stats[lv.id]; if (s && s.n >= MIN_GAMES) Object.keys(s.moves).forEach(x => sans.add(x)); }
        if (ply === 0 && cfg.first) for (const x of [...sans]) if (!cfg.first.includes(x)) sans.delete(x);
        // En la primera jugada con lista blanca se renormaliza sobre las jugadas permitidas.
        const tot = {};
        for (const lv of LEVELS) { const s = stats[lv.id]; if (!s) continue; tot[lv.id] = ply === 0 && cfg.first ? cfg.first.reduce((a, x) => a + ((s.moves[x] || [0])[0]), 0) : s.n; }
        const kids = [];
        for (const san of sans) {
          const reach = {}; let best = 0;
          for (const lv of LEVELS) {
            const s = stats[lv.id];
            reach[lv.id] = s && s.n >= MIN_GAMES && tot[lv.id] ? node.reach[lv.id] * (s.moves[san] || [0])[0] / tot[lv.id] : 0;
            best = Math.max(best, reach[lv.id]);
          }
          if (best >= MIN) { const g2 = new Chess(node.fen); if (g2.move(san)) { add(g2.fen(), node.path.concat(san), reach); kids.push(san); } }
        }
        out.kids = kids;
      }
    }
    process.stdout.write('  ply ' + (ply + 1) + ': ' + next.size + ' posiciones · consultas a Lichess ' + lxStats.requests + '\n');
    layer = next;
  }
  // Las posiciones que quedan en la última capa son hojas (llegaron al límite de profundidad).
  for (const node of layer.values()) nodes.push({ path: node.path.join(' '), fen: node.fen, turn: new Chess(node.fen).turn(), reach: round(node.reach), leaf: true });
  const res = { op: op.id, side: op.side, generated: new Date().toISOString().slice(0, 10), params: { plies: PLIES, min: MIN, sfDepth: SF_DEPTH, minGames: MIN_GAMES, nearCp: NEAR_CP }, levels: LEVELS, nodes, review, choices };
  fs.mkdirSync(path.join(root, 'research'), { recursive: true });
  fs.writeFileSync(path.join(root, 'research', op.id + '.json'), JSON.stringify(res, null, 1));
  const user = nodes.filter(n => n.move), nuevas = user.filter(n => n.src === 'motor').length;
  console.log('  ' + nodes.length + ' posiciones · ' + user.length + ' del usuario (' + nuevas + ' nuevas) · ' + review.length + ' para revisar · ' + choices.length + ' posibles elecciones → research/' + op.id + '.json');
}
const round = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(4)]));
// Estadísticas compactas para guardar: solo las jugadas con al menos 1 % de las partidas.
const compact = st => Object.fromEntries(Object.entries(st).map(([k, s]) => [k, { n: s.n, w: s.w, d: s.d, b: s.b, moves: Object.fromEntries(Object.entries(s.moves).filter(([, m]) => m[0] >= s.n * 0.01)) }]));

(async () => {
  const todo = ids.length ? OPENINGS.filter(o => ids.includes(o.id)) : OPENINGS;
  if (ids.length && todo.length !== ids.length) { console.error('Apertura desconocida. Ids:', OPENINGS.map(o => o.id).join(', ')); process.exit(1); }
  for (const op of todo) await explore(op);
  if (sf) sf.p.kill();
})().catch(e => { console.error(e); if (sf) sf.p.kill(); process.exit(1); });
