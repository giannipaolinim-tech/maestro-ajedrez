// Genera src/stats.js: estadísticas del explorador de Lichess que usa la app, por base (Maestros y rangos de rating).
// Incluye solo las posiciones que hacen falta: las del rival en el repertorio (para que en la práctica el rival
// elija como se juega en cada nivel) y los puntos de elección (frecuencia y resultado de cada opción).
// Uso: node scripts/stats.js            (lo que falte en research/cache lo consulta a Lichess si hay token)
//      node scripts/stats.js --solo-cache
const fs = require('fs'), path = require('path');
const { Chess } = require('../vendor/chess.js');
const { LEVELS, f4, explorer, token } = require('./lichess.js');
const root = path.join(__dirname, '..');
const ONLY_CACHE = process.argv.includes('--solo-cache') || !token();
const OPENINGS = new Function(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';return OPENINGS;')();

(async () => {
  const ops = {}; let total = 0, missing = 0;
  for (const op of OPENINGS) {
    const fens = new Map();
    for (const l of op.lines) {
      const g = new Chess();
      for (const m of l.moves.split(' ')) { if (g.turn() !== op.side) fens.set(f4(g.fen()), g.fen()); g.move(m); }
    }
    for (const c of op.choices || []) { const g = new Chess(); c.at.split(' ').filter(Boolean).forEach(m => g.move(m)); fens.set(f4(g.fen()), g.fen()); }
    const out = {};
    for (const [k, fen] of fens) {
      const p = {};
      for (const lv of LEVELS) {
        const s = await explorer(lv, fen, ONLY_CACHE);
        if (!s) { missing++; continue; }
        if (!s.n) continue;
        // Solo jugadas con al menos 1 % de las partidas: alcanza para elegir y achica el archivo.
        const mv = {};
        for (const [san, v] of Object.entries(s.moves)) if (v[0] >= s.n * 0.01) mv[san] = v;
        p[lv.id] = [s.n, mv];
      }
      if (Object.keys(p).length) { out[k] = p; total++; }
    }
    ops[op.id] = out;
  }
  if (!total) { console.log('Sin datos del explorador: no genero src/stats.js (la app anda sin estadísticas).'); return; }
  const STATS = { levels: LEVELS.map(l => ({ id: l.id, name: l.name })), date: new Date().toISOString().slice(0, 10), ops };
  const js = '// Generado por scripts/stats.js con datos del explorador de Lichess (base Masters y base Lichess por rating). No editar a mano.\nconst STATS=' + JSON.stringify(STATS) + ';\n';
  fs.writeFileSync(path.join(root, 'src/stats.js'), js);
  console.log('src/stats.js: ' + total + ' posiciones, ' + (js.length / 1024).toFixed(1) + ' KB' + (missing ? ' · ' + missing + ' consultas sin datos en caché' + (ONLY_CACHE ? ' (sin token o --solo-cache)' : '') : ''));
})().catch(e => { console.error(e.message || e); process.exit(1); });
