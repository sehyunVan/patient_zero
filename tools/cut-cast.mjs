// 시트를 한 명씩 떼어낸다.  node tools/cut-cast.mjs
//
// 칸을 폭/4 로 뚝 자르면 옆 사람의 머리카락·팔이 같이 끌려온다(2026-10-14 에 실제로 그랬다).
// 그래서 두 단계로 자른다:
//   1) 세로줄마다 알파 무게를 재서, 칸 경계 근처에서 **가장 비어 있는 줄**을 찾아 거기서 가른다.
//   2) 그래도 붙어 온 조각은 연결 요소를 세어 **제일 큰 덩어리만** 남기고 지운다(dest-in).
// 결과: 키를 맞춘 전신 SD/LD 와 얼굴 네모.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { SHEETS } from './cast.mjs';
const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const OUT = path.join(ROOT, 'assets/cast');
const SPRITE_H = 512;   // SD. 전투에서는 더 작게 그리지만 고해상도 폰에서 번지지 않을 만큼은 남긴다
const LD_H = 1000;      // LD. 로비 반신·선택창 전신을 이 한 장으로 쓴다
const FACE = 320;
const ALPHA = 24;       // 이보다 옅으면 테두리 빛으로 본다
fs.mkdirSync(OUT, { recursive: true });

// 칸 경계: 1/4 자리 ±18% 안에서 세로 알파 무게가 가장 작은 줄
function cuts(data, w, h, n) {
  const col = new Float64Array(w);
  for (let x = 0; x < w; x++) { let s = 0; for (let y = 0; y < h; y++) s += data[(y * w + x) * 4 + 3]; col[x] = s; }
  const cell = w / n, slack = Math.round(cell * .18), edges = [0];
  for (let i = 1; i < n; i++) {
    const nominal = Math.round(i * cell);
    let best = nominal, bestVal = Infinity;
    for (let x = Math.max(1, nominal - slack); x < Math.min(w - 1, nominal + slack); x++) {
      const v = col[x] + Math.abs(x - nominal) * .001;   // 무게가 같으면 1/4 자리에 가까운 쪽
      if (v < bestVal) { bestVal = v; best = x; }
    }
    edges.push(best);
  }
  edges.push(w);
  return edges;
}

// 제일 큰 덩어리만 남긴다 — 나머지는 옆 사람 조각이다
function isolate(data, w, h, left, right) {
  const cw = right - left;
  const label = new Int32Array(cw * h).fill(-1);
  const stack = new Int32Array(cw * h);
  const sizes = [];
  for (let start = 0; start < cw * h; start++) {
    if (label[start] !== -1) continue;
    const sx = start % cw, sy = (start / cw) | 0;
    if (data[(sy * w + left + sx) * 4 + 3] <= ALPHA) { label[start] = -2; continue; }
    const id = sizes.length; let size = 0, top = 0;
    stack[top++] = start; label[start] = id;
    while (top) {
      const p = stack[--top], x = p % cw, y = (p / cw) | 0; size++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= h) continue;
        const q = ny * cw + nx;
        if (label[q] !== -1) continue;
        if (data[(ny * w + left + nx) * 4 + 3] <= ALPHA) { label[q] = -2; continue; }
        label[q] = id; stack[top++] = q;
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return null;
  const main = sizes.indexOf(Math.max(...sizes));
  const mask = Buffer.alloc(cw * h);
  let x0 = cw, y0 = h, x1 = -1, y1 = -1, dropped = 0;
  for (let i = 0; i < cw * h; i++) {
    if (label[i] === main) {
      mask[i] = 255;
      const x = i % cw, y = (i / cw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else if (label[i] >= 0) dropped++;
  }
  return { mask, width: cw, height: h, box: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, dropped, blobs: sizes.length };
}

async function sliceSheet(file, cast) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const edges = cuts(data, info.width, info.height, cast.length);
  const out = [];
  for (let i = 0; i < cast.length; i++) {
    const piece = isolate(data, info.width, info.height, edges[i], edges[i + 1]);
    if (!piece) { out.push(null); continue; }
    const cell = await sharp(file).extract({ left: edges[i], top: 0, width: piece.width, height: info.height })
      .composite([{ input: piece.mask, raw: { width: piece.width, height: piece.height, channels: 1 }, blend: 'dest-in' }])
      .png().toBuffer();
    out.push({ cell, ...piece });
  }
  return out;
}

// 얼굴 네모: 위에서부터 키의 ratio 만큼, 가로 중심은 그 띠 안 알파의 무게중심
function faceBox({ mask, width, box }, ratio) {
  const band = Math.round(box.height * ratio);
  let sum = 0, count = 0;
  for (let y = box.top; y < box.top + band; y++) for (let x = box.left; x < box.left + box.width; x++) {
    const a = mask[y * width + x]; if (a) { sum += x * a; count += a; }
  }
  const cx = count ? sum / count : box.left + box.width / 2;
  const side = Math.min(box.width, band);
  return { left: Math.round(Math.max(0, Math.min(width - side, cx - side / 2))), top: box.top, width: side, height: side };
}

const report = [];
for (const sheet of SHEETS) {
  const files = { sd: path.join(SRC, sheet.file + '.png'), ld: path.join(SRC, sheet.file + '-ld.png') };
  const sliced = {};
  for (const [kind, file] of Object.entries(files)) if (fs.existsSync(file)) sliced[kind] = await sliceSheet(file, sheet.cast);
  if (!sliced.sd && !sliced.ld) { console.log('없음, 건너뜀:', sheet.file); continue; }
  for (let i = 0; i < sheet.cast.length; i++) {
    const c = sheet.cast[i], line = [c.id.padEnd(6), c.name.padEnd(4)];
    for (const [kind, height, suffix] of [['sd', SPRITE_H, ''], ['ld', LD_H, '-ld']]) {
      const piece = sliced[kind]?.[i]; if (!piece) continue;
      await sharp(piece.cell).extract(piece.box).resize({ height })
        .webp({ quality: kind === 'ld' ? 86 : 88, alphaQuality: 95, effort: 6 })
        .toFile(path.join(OUT, c.id + suffix + '.webp'));
      line.push(`${kind.toUpperCase()} ${piece.box.width}x${piece.box.height}${piece.blobs > 1 ? ` (조각 ${piece.blobs - 1}개 지움 ${piece.dropped}px)` : ''}`);
    }
    const source = sliced.ld?.[i] ? { piece: sliced.ld[i], ratio: .22 } : sliced.sd?.[i] ? { piece: sliced.sd[i], ratio: .38 } : null;
    if (source) {
      await sharp(source.piece.cell).extract(faceBox(source.piece, source.ratio))
        .resize(FACE, FACE).webp({ quality: 90, alphaQuality: 95, effort: 6 }).toFile(path.join(OUT, c.id + '-face.webp'));
    }
    report.push(line.join('  '));
  }
}
console.log(report.join('\n'));
const out = fs.readdirSync(OUT);
console.log('캐스트', out.filter(f => f.endsWith('-ld.webp')).length + '명,',
  (out.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1024 | 0) + 'KB');
