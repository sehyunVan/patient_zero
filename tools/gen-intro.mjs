// 인트로 컷 — 제로가 쫓기다 붙잡혀 감염되고, 그 절망이 한 컷 만에 뒤집힌다.
// 다섯 장은 한 사람의 이야기라 같은 아이로 보여야 한다 — 생김새는 tools/cast.mjs 의 제로를 그대로 쓴다.
//   node tools/gen-intro.mjs [1..5] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHEETS } from './cast.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src/intro');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;
const ZERO = SHEETS.flatMap(s => s.cast).find(c => c.id === 'zero').look;

// 1~3 은 어둡고 차갑게, 4~5 에서 조명과 표정이 뒤집힌다 — 그 낙차가 이 인트로의 전부다.
export const CUTS = [
  { id: '1-run', mood: 'terror',
    scene: 'She is SPRINTING toward the camera down a ruined night street, looking back over her shoulder in panic, mouth open, tears in her wide eyes (still human: her eyes are ORDINARY BROWN, no glow). ' +
      'Behind her, a crowd of dark infected silhouettes with faint red eyes pours after her between burning cars. Cold blue moonlight, long shadows, drifting ash.' },
  { id: '2-caught', mood: 'terror',
    scene: 'She has fallen onto wet asphalt, propped on one arm, screaming, as a dozen pale hands reach in from every edge of the frame and grab her coat, her wrist, her ankle. ' +
      'Low camera close to the ground, harsh cold light from one broken streetlamp, her ordinary brown eyes huge with fear. No blood, no wounds — only hands and shadow.' },
  { id: '3-turn', mood: 'cold',
    scene: 'Extreme close-up of her face lying on her side on the asphalt, hair across her cheek, eyes half closed and empty — and in this instant the irises are igniting from brown to GLOWING CRIMSON RED, ' +
      'a thin red light spilling across her skin. Everything else is desaturated near-black. Silent, still, the moment of becoming.' },
  { id: '4-smile', mood: 'flip',
    scene: 'She is sitting up on the empty street, alone now, head tilted, and she is SMILING — a wide delighted grin with one fang, GLOWING CRIMSON RED EYES, as if she just understood a very funny joke. ' +
      'The palette flips here: warm sunrise light pours in from the left, the night draining away, dust motes glowing gold. Hopeful, bright, and completely wrong.' },
  { id: '5-hunt', mood: 'flip',
    scene: 'Seen from behind and above her shoulder, she stands at the top of a staircase in bright morning light, hands in her hoodie pocket, looking down at an ordinary crowd of commuters walking far below, unaware. ' +
      'Her head is turned just enough to show one glowing crimson eye and the corner of her grin. Warm gold light, long soft shadows, the city alive and ordinary beneath her.' },
];

const PROMPT = c =>
  'Cinematic anime cutscene still, wide landscape, no text. ' +
  `The character (the same girl in every panel): ${ZERO}. ` +
  `SCENE: ${c.scene} ` +
  (c.mood === 'terror' ? 'Mood: cold terror, desaturated blues and blacks, heavy grain, handheld dutch angle. '
   : c.mood === 'cold' ? 'Mood: silent dread, almost monochrome with one crimson accent. '
   : 'Mood: bright and buoyant — the horror turned into delight. Warm golden light, clean air. ') +
  'Painterly anime film still, dramatic composition, detailed background, no gore, no blood, no wounds. ' +
  'No text, no letters, no subtitles, no logos, no watermark, no frame, no UI.';

const args = process.argv.slice(2), force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

for (const cut of CUTS) {
  if (only.length && !only.some(o => cut.id.startsWith(o))) continue;
  const out = path.join(SRC, cut.id + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', cut.id); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: PROMPT(cut), size: '1536x1024', n: 1 }),
    });
    if (!r.ok) { console.log(cut.id, 'HTTP', r.status, (await r.text()).slice(0, 160)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(cut.id, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK', cut.id + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB');
    break;
  }
}
