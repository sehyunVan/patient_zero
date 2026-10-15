// 아이콘 시트(3×3)를 하나씩 떼어낸다.  node tools/cut-icons.mjs
// 물건 본체(알파가 진한 곳)로 경계를 잡고 둘레 빛은 조금만 남긴다 — 빛까지 다 잡으면 크기가 제각각이 된다.
// 결과: assets/icons/<id>.webp (256² 정사각, 투명)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { ICONS } from './icons.mjs';
const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = path.join(ROOT, 'assets/src/icons.png');
const OUT = path.join(ROOT, 'assets/icons');
const SIZE = 256, SOLID = 140, HALO = 0.1;
fs.mkdirSync(OUT, { recursive: true });

const meta = await sharp(SHEET).metadata();
const cw = Math.floor(meta.width / 3), ch = Math.floor(meta.height / 3);
const lines = [];
for (let i = 0; i < ICONS.length; i++) {
  const col = i % 3, row = Math.floor(i / 3);
  const region = { left: col * cw, top: row * ch, width: cw, height: ch };
  const { data, info } = await sharp(SHEET).extract(region).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > SOLID) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { console.log('빈 칸:', ICONS[i].id); continue; }
  // 정사각으로 맞추고 둘레 빛만큼 넓힌다
  const side = Math.max(x1 - x0, y1 - y0) * (1 + HALO * 2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const left = Math.round(Math.max(0, Math.min(info.width - side, cx - side / 2)));
  const top = Math.round(Math.max(0, Math.min(info.height - side, cy - side / 2)));
  const box = Math.round(Math.min(side, info.width - left, info.height - top));
  await sharp(SHEET).extract({ left: region.left + left, top: region.top + top, width: box, height: box })
    .resize(SIZE, SIZE).webp({ quality: 90, alphaQuality: 95, effort: 6 })
    .toFile(path.join(OUT, ICONS[i].id + '.webp'));
  lines.push(`${ICONS[i].id.padEnd(9)} ${ICONS[i].name.padEnd(6)} ${x1 - x0}x${y1 - y0} → ${SIZE}²`);
}
console.log(lines.join('\n'));
console.log('아이콘', fs.readdirSync(OUT).length + '개,', (fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024 | 0) + 'KB');
