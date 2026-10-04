// Genera src/stats.js: estadísticas del explorador de Lichess que usa la app, por base (Maestros y rangos de rating).
// Formato: STATS.ops[opId][fen4][nivel] = {san: frecuencia‰} o, en puntos de elección, {san: [frecuencia‰, puntos‰]}.
// Incluye solo las posiciones que hacen falta: las del rival en el repertorio (para que en la práctica el rival
// elija como se juega en cada nivel) y los puntos de elección (frecuencia y resultado de cada opción).
// Uso: node scripts/stats.js            (lo que falte en research/cache lo consulta a Lichess si hay token)
//      node scripts/stats.js --solo-cache
//      node scripts/stats.js caro-kann     (solo esas aperturas; las demás se conservan del src/stats.js actual)
const fs = require('fs'), path = require('path');
const { Chess } = require('../vendor/chess.js');
const { LEVELS, f4, explorer, token } = require('./lichess.js');
const root = path.join(__dirname, '..');
const ONLY_CACHE = process.argv.includes('--solo-cache') || !token();
const OPENINGS = new Function(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';return OPENINGS;')();

const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const outFile = path.join(root, 'src/stats.js');
const prev = fs.existsSync(outFile) ? new Function(fs.readFileSync(outFile, 'utf8') + ';return STATS;')() : null;

(async () => {
  const ops = {}; let total = 0, missing = 0;
  for (const op of OPENINGS) {
    if (ids.length && !ids.includes(op.id)) { if (prev && prev.ops[op.id]) { ops[op.id] = prev.ops[op.id]; total += Object.keys(ops[op.id]).length; } continue; }
    // Posiciones del rival (con las jugadas que el repertorio le contempla) y puntos de elección (con sus opciones).
    const pos = new Map(); // fen4 -> {fen, moves: Set, choice: bool}
    const at = (fen, choice) => { const k = f4(fen); if (!pos.has(k)) pos.set(k, { fen, moves: new Set(), choice: false }); const p = pos.get(k); if (choice) p.choice = true; return p; };
    for (const l of op.lines) {
      const g = new Chess();
      for (const m of l.moves.split(' ')) { if (g.turn() !== op.side) at(g.fen()).moves.add(g.move(m).san); else g.move(m); }
    }
    for (const c of op.choices || []) { const g = new Chess(); c.at.split(' ').filter(Boolean).forEach(m => g.move(m)); const p = at(g.fen(), true); c.options.forEach(o => p.moves.add(o.move)); }
    const out = {};
    for (const [k, { fen, moves, choice }] of pos) {
      const p = {};
      for (const lv of LEVELS) {
        const s = await explorer(lv, fen, ONLY_CACHE);
        if (!s) { missing++; continue; }
        if (!s.n) continue;
        // Formato compacto: por jugada, frecuencia en milésimas. En los puntos de elección, [frecuencia, puntos
        // para el usuario en milésimas] (-1 si hay menos de 30 partidas). Solo las jugadas del repertorio.
        const mv = {};
        for (const san of moves) {
          const v = s.moves[san]; if (!v) continue;
          const share = Math.round(1000 * v[0] / s.n);
          if (!choice) { if (share) mv[san] = share; continue; }
          const pts = op.side === 'w' ? v[1] + v[2] / 2 : v[3] + v[2] / 2;
          mv[san] = [share, v[0] >= 30 ? Math.round(1000 * pts / v[0]) : -1];
        }
        if (Object.keys(mv).length) p[lv.id] = mv;
      }
      if (Object.keys(p).length) { out[k] = p; total++; }
    }
    ops[op.id] = out;
  }
  if (!total) { console.log('Sin datos del explorador: no genero src/stats.js (la app anda sin estadísticas).'); return; }
  const STATS = { levels: LEVELS.map(l => ({ id: l.id, name: l.name })), date: new Date().toISOString().slice(0, 10), ops };
  const js = '// Generado por scripts/stats.js con datos del explorador de Lichess (base Masters y base Lichess por rating). No editar a mano.\nconst STATS=' + JSON.stringify(STATS) + ';\n';
  fs.writeFileSync(outFile, js);
  console.log('src/stats.js: ' + total + ' posiciones, ' + (js.length / 1024).toFixed(1) + ' KB' + (missing ? ' · ' + missing + ' consultas sin datos en caché' + (ONLY_CACHE ? ' (sin token o --solo-cache)' : '') : ''));
})().catch(e => { console.error(e.message || e); process.exit(1); });
