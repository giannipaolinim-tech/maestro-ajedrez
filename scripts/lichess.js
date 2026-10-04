// Acceso al explorador de aperturas de Lichess, con caché en research/cache/explorer.ndjson.
// Lo usan scripts/explore.js (arma los árboles) y scripts/stats.js (genera src/stats.js para la app).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

// Bases: Masters (partidas de maestros sobre el tablero) y Lichess por rangos de rating
// (partidas blitz, rápidas y clásicas). Los ids y nombres se usan también en la app.
const LEVELS = [
  { id: 'masters', name: 'Maestros' },
  { id: 'r1', name: 'Hasta 1400', ratings: '0,1000,1200' },
  { id: 'r2', name: '1400–1800', ratings: '1400,1600' },
  { id: 'r3', name: '1800–2200', ratings: '1800,2000' },
  { id: 'r4', name: '2200+', ratings: '2200,2500' },
];
const SPEEDS = 'blitz,rapid,classical';
const f4 = fen => fen.split(' ').slice(0, 4).join(' ');

/* ---------- Caché NDJSON: una línea por consulta, se puede cortar y retomar ---------- */
const CACHE_DIR = path.join(root, 'research/cache');
function ndjsonCache(file) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const p = path.join(CACHE_DIR, file), map = new Map();
  if (fs.existsSync(p)) for (const ln of fs.readFileSync(p, 'utf8').split('\n')) if (ln) { const o = JSON.parse(ln); map.set(o.k, o.v); }
  return { get: k => map.get(k), has: k => map.has(k), set(k, v) { map.set(k, v); fs.appendFileSync(p, JSON.stringify({ k, v }) + '\n'); } };
}
let exCache = null;
const cache = () => exCache || (exCache = ndjsonCache('explorer.ndjson'));

function token() {
  if (process.env.LICHESS_TOKEN) return process.env.LICHESS_TOKEN.trim();
  const p = path.join(root, 'credenciales/lichess-token.txt');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : '';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = { requests: 0 };
// Pausa entre consultas: se adapta a los límites de Lichess. Cada 429 la alarga (hasta 6 s) y
// una racha larga sin cortes la acorta de a poco (no baja de 700 ms).
let gap = 1000, okStreak = 0;
// Estadísticas de una posición en una base: {n, w, d, b, moves: {san: [n, w, d, b]}}.
// Con onlyCache (o sin token) devuelve null si no está en la caché.
async function explorer(level, fen, onlyCache) {
  const k = level.id + '|' + f4(fen), c = cache();
  if (c.has(k)) return c.get(k);
  const tk = onlyCache ? '' : token();
  if (!tk) return null;
  const q = new URLSearchParams({ fen, moves: '20', topGames: '0' });
  let url = 'https://explorer.lichess.ovh/masters?';
  if (level.ratings) { url = 'https://explorer.lichess.ovh/lichess?'; q.set('variant', 'standard'); q.set('speeds', SPEEDS); q.set('ratings', level.ratings); q.set('recentGames', '0'); }
  for (let tries = 0; ; tries++) {
    await sleep(gap);
    let res;
    try { res = await fetch(url + q, { headers: { Authorization: 'Bearer ' + tk } }); }
    catch (e) { if (tries > 5) throw e; await sleep(5000); continue; }
    if (res.status === 429) {
      gap = Math.min(6000, Math.round(gap * 1.5)); okStreak = 0;
      console.log('  Lichess pide esperar (429): pausa de 60 s; desde ahora ' + gap + ' ms entre consultas');
      await sleep(60000); continue;
    }
    if (res.status === 401) throw new Error('Lichess rechazó el token (401). Revisá credenciales/lichess-token.txt');
    if (!res.ok) { if (tries > 5) throw new Error('Lichess ' + res.status + ' en ' + url + q); await sleep(5000); continue; }
    const j = await res.json(), moves = {};
    for (const m of j.moves || []) moves[m.san] = [m.white + m.draws + m.black, m.white, m.draws, m.black];
    const v = { n: j.white + j.draws + j.black, w: j.white, d: j.draws, b: j.black, moves };
    c.set(k, v); stats.requests++;
    if (++okStreak >= 300) { gap = Math.max(700, Math.round(gap * 0.9)); okStreak = 0; }
    return v;
  }
}

module.exports = { LEVELS, SPEEDS, f4, explorer, token, ndjsonCache, stats };
