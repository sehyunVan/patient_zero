// 검체(새 재화) 아이콘 한 장.  node tools/gen-sample-icon.mjs [--force]
//
// 9칸 시트(tools/gen-icons.mjs)에 열 번째를 끼워 넣지 않는 이유: 시트를 다시 구우면
// 멀쩡한 아홉 개의 두께·광택·각도가 같이 바뀐다. 그래서 **문체(STYLE 문단)만 그대로 빌려** 한 장만 굽는다.
// 자르기는 cut-icons 와 같은 규칙 — 물건 본체(알파가 진한 곳)로 경계를 잡고 둘레 빛을 조금 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PROMPT } from './icons.mjs';
const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src/sample-icon.png');
const OUT = path.join(ROOT, 'assets/icons/sample.webp');
const SIZE = 256, SOLID = 140, HALO = 0.1;
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const LOOK = 'a squat sealed steel specimen canister lying at a slight three-quarter angle: '
  + 'a short wide cylinder of scuffed gunmetal with a ribbed screw lid and two clamp latches, '
  + 'a round viewing window on its side glowing toxic acid-green from the culture inside, '
  + 'a small green biohazard trefoil stamped beside the window';
const STYLE = PROMPT.slice(PROMPT.indexOf('STYLE:'), PROMPT.indexOf('Row 1 left to right'));

const prompt = 'Use case: stylized-concept. Asset type: transparent game item icon. '
  + 'Create exactly ONE game item icon, centered, with generous empty transparent padding around it. '
  + STYLE
  + 'The object: ' + LOOK + '. '
  + 'No second object, no cast shadow, no ground, no plinth, no frame, no box, '
  + 'no labels, no text, no letters, no numbers, no watermark. '
  + 'THE BACKGROUND MUST BE FULLY TRANSPARENT EMPTY ALPHA: no backdrop, no gradient, no fog, no vignette, not black, not white, not grey.';

if (!fs.existsSync(SRC) || process.argv.includes('--force')) {
  fs.mkdirSync(path.dirname(SRC), { recursive: true });
  let ok = false;
  for (let t = 1; t <= 3 && !ok; t++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt, size: '1024x1024', n: 1, background: 'transparent' }),
    });
    if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 180)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log('t' + t, 'no image'); continue; }
    fs.writeFileSync(SRC, Buffer.from(b64, 'base64'));
    ok = true;
  }
  if (!ok) { console.error('생성 실패'); process.exit(1); }
  console.log('원본', (fs.statSync(SRC).size / 1024 | 0) + 'KB');
} else console.log('원본 있음 — 다시 그리려면 --force');

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > SOLID) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
if (x1 < 0) { console.error('물건을 못 찾았다 — 배경이 안 비었을 수 있다'); process.exit(1); }
const side = Math.max(x1 - x0, y1 - y0) * (1 + HALO * 2);
const left = Math.round(Math.max(0, Math.min(info.width - side, (x0 + x1) / 2 - side / 2)));
const top = Math.round(Math.max(0, Math.min(info.height - side, (y0 + y1) / 2 - side / 2)));
const box = Math.round(Math.min(side, info.width - left, info.height - top));
await sharp(SRC).extract({ left, top, width: box, height: box }).resize(SIZE, SIZE)
  .webp({ quality: 90, alphaQuality: 95, effort: 6 }).toFile(OUT);
console.log('sample.webp', `${x1 - x0}x${y1 - y0} → ${SIZE}²`, (fs.statSync(OUT).size / 1024 | 0) + 'KB');
