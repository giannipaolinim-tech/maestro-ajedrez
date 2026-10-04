// Ayuda para curar: compara el árbol de research/<id>.json con las líneas actuales de src/data.js.
// Lista cada hoja del árbol (fin de una rama) como: cubierta por una línea existente, extensión de una
// línea existente o rama nueva; y muestra las jugadas a revisar y los posibles puntos de elección.
// Uso: node scripts/tree2lines.js <id> [--json]   (--json escribe research/<id>.lines.json)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const id = process.argv[2];
if (!id) { console.error('Uso: node scripts/tree2lines.js <id>'); process.exit(1); }
const T = JSON.parse(fs.readFileSync(path.join(root, 'research', id + '.json'), 'utf8'));
const OPENINGS = new Function(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';return OPENINGS;')();
const op = OPENINGS.find(o => o.id === id);
const lines = op.lines.map(l => ({ id: l.id, moves: l.moves }));

const isLeaf = n => n.leaf || (n.kids && !n.kids.length) || (n.turn === T.side && !n.move);
const maxReach = n => Math.max(...Object.values(n.reach));
const leaves = T.nodes.filter(isLeaf).filter(n => n.path).sort((a, b) => maxReach(b) - maxReach(a));
const out = [];
for (const n of leaves) {
  const p = n.path;
  const cover = lines.find(l => l.moves === p || l.moves.startsWith(p + ' '));
  const ext = !cover && lines.filter(l => p.startsWith(l.moves + ' ')).sort((a, b) => b.moves.length - a.moves.length)[0];
  // Línea existente con la que comparte más jugadas (para ubicar ramas nuevas).
  let near = null, best = -1;
  if (!cover && !ext) for (const l of lines) { const a = l.moves.split(' '), b = p.split(' '); let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; if (i > best) { best = i; near = l.id; } }
  out.push({ path: p, plies: p.split(' ').length, reach: n.reach, kind: cover ? 'cubierta' : ext ? 'extiende' : 'nueva', line: cover ? cover.id : ext ? ext.id : near, shared: cover || ext ? null : best });
}
const fmt = r => Object.entries(r).map(([k, v]) => k + ' ' + (100 * v).toFixed(1)).join(' · ');
console.log(op.name + ': ' + T.nodes.length + ' posiciones, ' + leaves.length + ' hojas');
for (const k of ['extiende', 'nueva', 'cubierta']) {
  const xs = out.filter(o => o.kind === k);
  console.log('\n## ' + k + ' (' + xs.length + ')');
  for (const o of xs) console.log('- [' + o.line + (o.shared !== null ? ' @' + o.shared : '') + '] ' + o.path + '   (' + fmt(o.reach) + ')');
}
if (T.review.length) { console.log('\n## Para revisar (Stockfish ve una jugada del repertorio peor que la mejor)'); for (const r of T.review) console.log('- ' + r.path + ' → ' + r.move + ' (' + r.cp + ') vs ' + r.best + ' (' + r.bestCp + ')'); }
if (T.choices.length) { console.log('\n## Posibles puntos de elección'); for (const c of T.choices) { const n = T.nodes.find(x => x.path === c.path); console.log('- ' + c.path + ' → ' + c.move + ' | alternativas: ' + c.alts.join(', ') + '   ' + n.cands.map(x => x.san + ' ' + x.cp + 'cp ' + Math.round(100 * x.pop) + '%').join(' · ')); } }
if (process.argv.includes('--json')) fs.writeFileSync(path.join(root, 'research', id + '.lines.json'), JSON.stringify(out, null, 1));
