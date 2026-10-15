// 화면 장식용 그림 — 프로필 배경판과 붉은 그런지 테두리.
// 글자는 넣지 않는다. 한글은 생성 그림에서 깨지므로 화면에서 웹폰트로 얹는다.
//   node tools/gen-ui-art.mjs [profile-backdrop|grunge-frame] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src/ui');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const JOBS = {
  'profile-backdrop': {
    size: '1536x1024', transparent: false,
    prompt: 'Dark anime game UI backdrop illustration, wide landscape. A ruined night city skyline of broken skyscrapers and construction cranes, ' +
      'a huge blood-red moon low in the sky, thin red clouds, two distant helicopters as small silhouettes. ' +
      'On the RIGHT third, on a rooftop in the foreground, the small full-body silhouette of a lone figure in a long tattered coat seen from behind, ' +
      'standing at a railing and looking out over the city. Deep blacks, crimson rim light, heavy atmospheric haze, drifting embers. ' +
      'The LEFT TWO THIRDS must stay dark, quiet and almost empty so interface panels can sit on top. ' +
      'Painterly anime concept art, cinematic, no text, no letters, no logos, no watermark, no UI, no frame, no people in the foreground.'
  },
  'grunge-frame': {
    size: '1024x1024', transparent: true,
    prompt: 'A rough CRIMSON RED paint grunge border frame for a game UI card: thick torn brush strokes and spatter running along the four edges ' +
      'of a tall rectangle, with the CENTER COMPLETELY EMPTY and transparent. Dry-brush texture, flecks and drips, slightly asymmetric, hand-painted feel. ' +
      'Only red paint on transparent alpha — no background, no gradient, no box, no card, no text, no letters, no image inside the frame.'
  },
};

const args = process.argv.slice(2), force = args.includes('--force');
const only = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

for (const [id, job] of Object.entries(JOBS)) {
  if (only.length && !only.includes(id)) continue;
  const out = path.join(SRC, id + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', id); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: job.prompt, size: job.size, n: 1, background: job.transparent ? 'transparent' : undefined }),
    });
    if (!r.ok) { console.log(id, 'HTTP', r.status, (await r.text()).slice(0, 160)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(id, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK', id + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB');
    break;
  }
}
