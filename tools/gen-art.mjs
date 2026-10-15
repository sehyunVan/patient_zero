// 로비 일러스트 — 고른 캐릭터가 화면 밖의 당신에게 달려들어 손을 뻗는 한 장.
// 전신 LD 를 세워 두는 대신 이걸 깐다. 한 명에 한 장이라 시트가 아니라 개별 생성이다
// (여럿을 한 장에 그리면 각자 화면을 꽉 채울 수 없다 — 캐스트 시트와는 목적이 다르다).
//   node tools/gen-art.mjs            # 없는 것만
//   node tools/gen-art.mjs rea nova   # 몇 명만
//   node tools/gen-art.mjs --force
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHEETS } from './cast.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src/art');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const CAST = SHEETS.flatMap(s => s.cast);

// 생김새(tools/cast.mjs 의 look)는 그대로 쓰고 상황만 바꾼다 — 같은 아이로 보여야 한다.
const PROMPT = c =>
  'Premium anime mobile-game character key art, dramatic close-up, landscape composition. ' +
  `The subject: ${c.look}. ` +
  'She is an infected girl with EYES THAT GLOW CRIMSON RED and a wild delighted grin, pale skin, cute not gory — ' +
  'no blood, no wounds, no rot. ' +
  'ACTION: she is lunging at the viewer and reaching ONE HAND straight toward the camera, fingers spread wide, ' +
  'the hand close to the lens in strong foreshortening and slightly blurred, her face and shoulders sharp behind it, ' +
  'hair and coat swept by the motion, body turned as if she just broke into a run. ' +
  'She fills the CENTER-RIGHT of the frame from the chest up; the LEFT THIRD is open sky and distant ruins ' +
  'so UI panels can sit there. ' +
  'Background: a ruined city at dusk far below, burning orange sunset into deep blue shadow, cranes and broken towers, ' +
  'drifting red embers and dust, shallow depth of field. ' +
  'Rich painterly anime rendering, crisp lineart on the face, cinematic rim light, dark palette of slate blue, black and crimson. ' +
  'No text, no letters, no logos, no watermark, no UI, no frame, no border.';

const args = process.argv.slice(2), force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

let made = 0;
for (const c of CAST) {
  if (only.length && !only.includes(c.id)) continue;
  const out = path.join(SRC, c.id + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', c.id); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: PROMPT(c), size: '1536x1024', n: 1 }),
    });
    if (!r.ok) { console.log(c.id, 'HTTP', r.status, (await r.text()).slice(0, 160)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(c.id, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK', c.id + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB —', c.name);
    made++;
    break;
  }
}
console.log('새로 구운 일러스트', made + '장');
