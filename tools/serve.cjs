// 로컬 정적 서버. 프로젝트 폴더 안의 파일만 내준다.
//   node tools/serve.cjs          # http://localhost:4177
//   PORT=4178 node tools/serve.cjs
// 파일 목록을 손으로 적지 않는다 — 새 그림을 넣을 때마다 등록을 잊어 404 가 나던 걸 없앴다.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};
// 올라가지 않는 폴더는 로컬에서도 내주지 않는다 — 배포본과 같은 조건으로 시험하려고
const BLOCKED = ['assets/src', 'shots', 'test', 'tools', 'icons/store'];

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = (url === '/' ? 'index.html' : url.replace(/^\/+/, ''));
  const file = path.join(ROOT, rel);
  const inside = path.relative(ROOT, file).replace(/\\/g, '/');
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || inside.startsWith('..') || path.isAbsolute(inside) || BLOCKED.some(b => inside === b || inside.startsWith(b + '/'))) {
    res.writeHead(404); return res.end('Not found');
  }
  res.setHeader('Content-Type', type + (type.startsWith('text/') ? '; charset=utf-8' : ''));
  res.setHeader('Cache-Control', 'no-cache');
  const stream = fs.createReadStream(file);
  stream.on('error', () => { res.writeHead(404); res.end('Not found'); });
  stream.pipe(res);
}).listen(Number(process.env.PORT) || 4177, '127.0.0.1',
  () => console.log('PATIENT ZERO: http://localhost:' + (process.env.PORT || 4177)));
