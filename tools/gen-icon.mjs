/* 앱 아이콘 원화 — 제로의 얼굴 한 장(1024², 정사각, 배경 있음).
   「막차 이후」와 같은 방식이다: 캐릭터 원화 + 장소 원화를 edits 에 붙여, 그 세계 안에서
   얼굴이 꽉 찬 1:1 초상을 다시 굽는다. 글자·로고는 넣지 않는다 — 스토어가 거부하고, 작아지면 안 읽힌다.
     node tools/gen-icon.mjs [--force]
   키: ask-gpt/.env 의 OPENAI_API_KEY · 모델: gpt-image-2.5-sunburst (이 프로젝트 원화 전부와 같은 모델)
   다음: node tools/bake-icon.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const OUT = path.join(SRC, 'app-icon-zero.png');
const PROMPT =
  'Square 1:1 app icon key art, 1024x1024. One single character bust portrait: the girl from the attached ' +
  'character sheet — short messy silver-grey hair under a black baseball cap worn slightly crooked, ' +
  'glowing crimson eyes, black studded choker, oversized black tactical hoodie with crimson lining, ' +
  'a mischievous confident smirk with one fang showing. Keep her face, hair, cap and outfit exactly as in the sheet. ' +
  'Tight close-up: head and shoulders only, the head filling most of the frame, face centred slightly above the middle, ' +
  'chin and collar at the bottom edge, three-quarter angle, looking straight at the viewer. ' +
  'Behind her, softly out of focus, the ruined dusk city from the attached location plate — dark slate buildings, ' +
  'drifting red embers, deep smoky navy shadows. Cinematic anime key art, painterly brushwork, high contrast, ' +
  'crimson rim light on her hair and cap, dark background so the silhouette reads at small sizes. ' +
  'Fill the entire square with the illustration: no transparency, no empty corners, no border, no frame, no rounded corners. ' +
  'No text, no lettering, no logo, no watermark, no UI, no other people, no gore, no blood.';

if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('skip (exists) — 다시 구우려면 --force'); process.exit(0); }

/* 레퍼런스: 제로 LD(webp → png) + 로비 키 아트 */
const refZero = path.join(SRC, 'app-icon-ref-zero.png');
await sharp(path.join(ROOT, 'assets/cast/zero-ld.webp')).flatten({ background: '#ffffff' }).png().toFile(refZero);
const REFS = [refZero, path.join(SRC, 'lobby.png')];

for (let t = 1; t <= 3; t++) {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2.5-sunburst');
  fd.append('prompt', PROMPT);
  fd.append('size', '1024x1024'); fd.append('n', '1');
  for (const f of REFS) fd.append('image[]', new Blob([fs.readFileSync(f)], { type: 'image/png' }), path.basename(f));
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 300)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  fs.rmSync(refZero, { force: true });
  console.log('OK assets/src/app-icon-zero.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB');
  process.exit(0);
}
fs.rmSync(refZero, { force: true });
console.log('FAILED');
process.exit(1);
