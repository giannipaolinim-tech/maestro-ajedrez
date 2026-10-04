// Arma dist/ a partir de src/, vendor/ y assets/:
//   dist/index.html            la app completa en un único archivo autocontenido (sirve sola, p. ej. como artifact)
//   dist/sw.js, manifest, icons/  lo que necesita la PWA publicada en GitHub Pages
// Uso: node scripts/build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const dist = path.join(root, 'dist');

const pieces = {};
for (const f of fs.readdirSync(path.join(root, 'assets/pieces')).filter(f => f.endsWith('.svg'))) {
  const b64 = fs.readFileSync(path.join(root, 'assets/pieces', f)).toString('base64');
  pieces[f.slice(0, 2)] = 'data:image/svg+xml;base64,' + b64;
}

// Lógica de la app: se concatena en este orden dentro de una sola función, así todos los
// archivos comparten ámbito. El orden importa para lo que se ejecuta al cargar (un const
// tiene que estar definido antes de usarse); main.js arranca la app y va último.
const APP = ['store', 'repertoire', 'board', 'ui', 'nav', 'home', 'learn', 'kbn', 'module', 'lesson', 'practice', 'exam', 'progress', 'main'];
const app = ['(function(){', ...APP.map(f => rd('src/app/' + f + '.js')), '})();'].join('\n');

const head = rd('src/head.html'), sw = rd('src/sw.js');
const body = [rd('vendor/chess.js'), 'const PIECES=' + JSON.stringify(pieces) + ';', rd('src/data.js'), rd('src/school.js'), app].join('\n');

// La versión depende del contenido: si nada cambió, el service worker no se reinstala.
const v = crypto.createHash('sha256').update(head + body + sw).digest('hex').slice(0, 10);
const d = new Date(), pad = n => String(n).padStart(2, '0');
const date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const BUILD = { v, date };

const html = [head, '<script>', 'const BUILD=' + JSON.stringify(BUILD) + ';', body, '</script></body></html>'].join('\n');

const fontCss = (head.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/) || [])[1];
if (!fontCss) throw new Error('No encontré el link de Google Fonts en src/head.html');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'icons'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(dist, 'sw.js'), sw.replace("'__VERSION__'", JSON.stringify(v)).replace("'__FONT_CSS__'", JSON.stringify(fontCss.replace(/&amp;/g, '&'))));
fs.copyFileSync(path.join(root, 'src/manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
for (const f of fs.readdirSync(path.join(root, 'assets/icons'))) fs.copyFileSync(path.join(root, 'assets/icons', f), path.join(dist, 'icons', f));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log('dist/index.html', (html.length / 1024).toFixed(1) + ' KB · versión', v, date);
