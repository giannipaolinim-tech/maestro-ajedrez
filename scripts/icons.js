// Genera assets/icons/icon-192.png e icon-512.png a partir de assets/icon.svg usando Edge/Chrome headless.
// Solo hace falta correrlo si cambia el ícono (los PNG se versionan). Uso: node scripts/icons.js
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium'
].filter(p => fs.existsSync(p));
if (!browsers.length) { console.error('No encontré Edge ni Chrome.'); process.exit(1); }
const svg = fs.readFileSync(path.join(root, 'assets/icon.svg'), 'utf8');
fs.mkdirSync(path.join(root, 'assets/icons'), { recursive: true });
for (const size of [192, 512]) {
  const tmp = path.join(os.tmpdir(), 'maestro-icon-' + size + '.html');
  fs.writeFileSync(tmp, '<!doctype html><style>html,body{margin:0;overflow:hidden;background:#1B2A22}svg{display:block;width:' + size + 'px;height:' + size + 'px}</style>' + svg);
  const out = path.join(root, 'assets/icons', 'icon-' + size + '.png');
  execFileSync(browsers[0], ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=' + size + ',' + size, '--screenshot=' + out, 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log(out, fs.statSync(out).size, 'bytes');
}
