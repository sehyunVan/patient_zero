/* 스토어 홍보 그림의 원본 한 장(1536×1024)을 굽는다.  node tools/gen-promo.mjs [--force]
   여기서 나온 한 장을 tools/store-promo.mjs 가 요구 화소로 잘라 낸다 —
   Play 그래픽 이미지(1024×500) · App Store 헤더(3840×1646 · 5244×2950) · 검색 결과(1920×1280 · 3840×2560).

   한 장으로 다 덮으려면 **가운데를 비워 두고 양옆에 여유**가 있어야 한다. 1024×500 은 아주 납작하고
   5244×2950 은 16:9 에 가까워서, 인물을 구석에 두면 어느 한쪽에서 잘린다.
   글자는 넣지 않는다 — 스토어마다 로고 자리가 다르고, 크기를 줄이면 제일 먼저 뭉개진다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const OUT = path.join(SRC, 'store-promo.png');
const REFS = [path.join(SRC, 'rea-recruit.png'), path.join(SRC, 'lobby.png')];
const PROMPT =
  'Wide 3:2 store key art for an anime zombie survival game, no lettering. ' +
  'The silver-haired girl in the black baseball cap from the attached art — crimson glowing eyes, ' +
  'oversized black tactical coat with crimson straps, a fanged confident smirk — stands at the RIGHT THIRD, ' +
  'turned toward the viewer, half-body, rim-lit in crimson. Keep her face, hair, cap and outfit exactly as attached. ' +
  'Behind and to her left, a ruined dusk city avenue filled with a dark crowd of silhouetted infected walking outward, ' +
  'red embers drifting, smoky navy shadows, pale peach sky going out. ' +
  'The LEFT HALF stays dark, open and quiet — a place for a logo — with nothing important in it. ' +
  'Keep her head and shoulders inside the middle 60% of the height so flat crops do not cut her face. ' +
  'Cinematic painterly anime key art, high contrast, muted slate-blue and crimson palette. ' +
  'No text, no lettering, no logo, no watermark, no UI, no frame, no border, no gore, no blood.';

if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('skip (exists) — 다시 구우려면 --force'); process.exit(0); }

for (let t = 1; t <= 3; t++) {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2.5-sunburst');
  fd.append('prompt', PROMPT);
  fd.append('size', '1536x1024'); fd.append('n', '1');
  for (const f of REFS) fd.append('image[]', new Blob([fs.readFileSync(f)], { type: 'image/png' }), path.basename(f));
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 300)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('OK assets/src/store-promo.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB');
  process.exit(0);
}
console.log('FAILED'); process.exit(1);
