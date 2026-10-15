// assets/src/*.png(원본) → assets/*.webp(배포본). 폰이 받는 양을 10배 줄인다.
//   node tools/bake.mjs           # 새 것·바뀐 것만
//   node tools/bake.mjs --force
// 캐스트 시트(cast-*.png)는 tools/cut-cast.mjs 가 사람별로 잘라 굽는다 — 여기서는 건너뛴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const OUT = path.join(ROOT, 'assets');
const force = process.argv.includes('--force');
const SKIP = /^(cast-|icons$|app-icon-)/;   // 캐스트·아이콘 시트는 잘라서 쓰고, 앱 아이콘은 tools/bake-icon.mjs 가 굽는다
const QUALITY = { 'infection-logo': 88 };   // 로고는 글자가 뭉개지면 안 된다

let total = 0;
// 하위 폴더(art=로비 일러스트, ui=화면 장식)도 같은 규칙으로 굽는다
for (const dir of ['art','ui','intro']) {
for (const file of (fs.existsSync(path.join(SRC,dir)) ? fs.readdirSync(path.join(SRC,dir)) : []).filter(f => f.endsWith('.png'))) {
  const name = file.replace(/.png$/, '');
  const src = path.join(SRC, dir, file), out = path.join(OUT, dir, name + '.webp');
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
  await sharp(src).resize({ width: 1280 }).webp({ quality: 80, alphaQuality: 92, effort: 6 }).toFile(out);
  total += fs.statSync(out).size;
  console.log((dir + '/' + name).padEnd(22), (fs.statSync(src).size / 1048576).toFixed(2) + 'MB → ' + (fs.statSync(out).size / 1024 | 0) + 'KB');
}
}
for (const file of fs.readdirSync(SRC).filter(f => f.endsWith('.png') && !SKIP.test(f))) {
  const name = file.replace(/\.png$/, '');
  const src = path.join(SRC, file), out = path.join(OUT, name + '.webp');
  if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
  const meta = await sharp(src).metadata();
  await sharp(src).webp({ quality: QUALITY[name] ?? 82, alphaQuality: 95, effort: 6 }).toFile(out);
  const before = fs.statSync(src).size, after = fs.statSync(out).size;
  total += after;
  console.log(`${name.padEnd(22)} ${meta.width}x${meta.height}  ${(before / 1048576).toFixed(2)}MB → ${(after / 1024 | 0)}KB`);
}
const shipped = fs.readdirSync(OUT).filter(f => f.endsWith('.webp')).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
const cast = fs.existsSync(path.join(OUT, 'cast')) ? fs.readdirSync(path.join(OUT, 'cast')).reduce((s, f) => s + fs.statSync(path.join(OUT, 'cast', f)).size, 0) : 0;
console.log(`구운 것 ${(total / 1024 | 0)}KB · 배포 그림 전체 ${((shipped + cast) / 1048576).toFixed(2)}MB`);
