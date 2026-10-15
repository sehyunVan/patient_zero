/* 영어판 로고 — 같은 붓, 같은 기울기, 밑줄만 영어 문장.  node tools/gen-logo-en.mjs [--force]
   원본 로고(assets/src/infection-logo.png)를 레퍼런스로 붙여 **글자만 바꿔** 다시 굽는다.
   따로 그리면 획과 왕관 모양이 달라져 같은 게임 로고로 안 보인다.
   결과: assets/src/infection-logo-en.png (투명) → tools/bake.mjs 가 webp 로 굽는다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const REF = path.join(SRC, 'infection-logo.png');
const OUT = path.join(SRC, 'infection-logo-en.png');
const PROMPT =
  'Recreate the attached logo exactly — same hand-painted dry-brush uppercase INFECTION lettering, same forward lean, ' +
  'same torn bristle edges and distressed scratches, same small crimson crown above the I, same thin white crown, ' +
  'same double tapering crimson underline, same off-white and crimson palette, same tight 2.3:1 framing. ' +
  'ONLY change the small line beneath the lettering: replace the Korean tagline with the English words ' +
  '"INFECT THE WORLD." in the same handwritten brush style, with "INFECT" in crimson and the rest off-white. ' +
  'Genuinely transparent alpha background: no backdrop, no dark rectangle, no checkerboard, no mockup, no frame, ' +
  'no extra words, no Korean characters anywhere.';

if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('skip (exists) — 다시 구우려면 --force'); process.exit(0); }

for (let t = 1; t <= 3; t++) {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2.5-sunburst');
  fd.append('prompt', PROMPT);
  fd.append('size', '1536x1024'); fd.append('n', '1');
  fd.append('background', 'transparent');
  fd.append('image[]', new Blob([fs.readFileSync(REF)], { type: 'image/png' }), 'infection-logo.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 300)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('OK assets/src/infection-logo-en.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB');
  process.exit(0);
}
console.log('FAILED'); process.exit(1);
