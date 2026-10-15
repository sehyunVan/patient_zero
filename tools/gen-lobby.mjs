// 로비 배경에서 사람을 지운다.
// 로비에는 선택한 캐릭터의 LD 가 반신으로 선다 — 배경에 다른 사람이 서 있으면 두 명이 된다.
// 원본(lobby-rooftop-v2.png)을 레퍼런스로 넣고 "같은 옥상, 사람만 없음"으로 다시 굽는다.
//   node tools/gen-lobby.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const REF = path.join(SRC, 'lobby-rooftop-v2.png');
const OUT = path.join(SRC, 'lobby-rooftop-empty.png');
const PROMPT =
  'Recreate the attached image as an EMPTY location plate: the same ruined-city rooftop at dusk, ' +
  'the same skyline, the same clouds, the same palette, the same painterly anime rendering and the same camera. ' +
  'REMOVE THE PERSON COMPLETELY — no girl, no figure, no silhouette, no back of a head, nobody at all, ' +
  'and fill where she stood with the rooftop and skyline that would be behind her. ' +
  'Keep the left and right thirds dark and quiet so UI panels can sit on them, keep the warm sunset light in the middle. ' +
  'No people, no characters, no text, no letters, no UI, no logos, no watermark, no frame.';

if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('skip (exists)'); process.exit(0); }
for (let t = 1; t <= 3; t++) {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2.5-sunburst');
  fd.append('prompt', PROMPT);
  fd.append('size', '1536x1024'); fd.append('n', '1');
  fd.append('image[]', new Blob([fs.readFileSync(REF)], { type: 'image/png' }), 'lobby-rooftop-v2.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 200)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('OK lobby-rooftop-empty.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB');
  break;
}
