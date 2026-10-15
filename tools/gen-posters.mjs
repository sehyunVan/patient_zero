// 챕터 카드 한 장마다 제 그림. 전투 바닥판(map-*)은 위에서 내려다본 판이라
// 세로 포스터로 세우면 바닥만 보인다 — 카드에는 눈높이에서 본 장면을 따로 굽는다.
//   node tools/gen-posters.mjs           # 없는 것만
//   node tools/gen-posters.mjs 3 7       # 챕터 몇 개만
//   node tools/gen-posters.mjs --force
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

// js/expansion.js 의 챕터 번호와 1:1. 장면은 그 챕터의 설명에서 나온다.
export const POSTERS = [
  { n: 1,  scene: 'a quiet evening plaza in a city that does not know yet: warm shop signs still lit, commuters crossing in the middle distance, one figure standing still among them, first thin wisp of red haze at the kerb', key: 'dusk amber' },
  { n: 2,  scene: 'the same plaza an hour later, the crowd turning away: people backing off in a widening ring, dropped shopping bags, a news screen glowing on a tower, red light seeping between the buildings', key: 'sodium orange' },
  { n: 3,  scene: 'a plaza losing control: the first quarantine truck pushing through, rotating amber beacons, people running in two directions at once, smoke drifting low over wet stone', key: 'amber and smoke' },
  { n: 4,  scene: 'a military checkpoint choking a narrow street: concrete barriers and chain fence, floodlights aimed down the lane, a queue of silhouettes funnelled between them, cold blue searchlight', key: 'cold blue' },
  { n: 5,  scene: 'a containment line breaking: a crowd surging past toppled barricades, dropped riot shields on the asphalt, blue strobes stuttering through tear-gas haze', key: 'blue strobe' },
  { n: 6,  scene: 'a vaccine firing line holding a boulevard: a rank of masked troopers behind clear shields, a fan of pale blue muzzle flares, a lone figure facing them down the empty centre of the road', key: 'ice blue' },
  { n: 7,  scene: 'a city the moment the power dies: every window black, one overturned car headlight raking the street, a dense crowd of silhouettes filling a junction under a starless sky', key: 'near black' },
  { n: 8,  scene: 'emergency generators coming back: a single hard white floodlight on a tower sweeping an alley, long knife-edge shadows, red standby lamps stuttering along a wall', key: 'white floodlight' },
  { n: 9,  scene: 'a whole city hunting one person: searchlights crossing above a canyon of gutted towers, helicopters circling, a single small figure standing alone on an empty bridge below', key: 'deep crimson' },
  { n: 10, scene: 'a descent into an underground station: a long escalator into green-white light, tiled walls, scattered commuters on the platform far below, a stopped train in the dark', key: 'green-white' },
  { n: 11, scene: 'the last train pulling into a packed platform: doors opening on a wall of people, yellow platform line, destination board glowing, steam off the rails', key: 'yellow underground' },
  { n: 12, scene: 'a night shift change in a factory: workers streaming out of a gantry doorway in hard hats, sodium floodlights on wet concrete, chimneys venting into a brown sky', key: 'industrial sodium' },
  { n: 13, scene: 'a factory floor of stopped conveyors: marksmen crouched behind press machines, a thin laser sightline crossing the hall, sparks falling from a severed cable', key: 'orange sparks' },
  { n: 14, scene: 'the lobby of a vaccine headquarters: sterile cyan walls, a seal of quarantine on glass doors, armed staff in hazmat suits forming up under hard ceiling light', key: 'sterile cyan' },
  { n: 15, scene: 'a specimen corridor deep inside a lab: numbered containment doors receding, one door ajar spilling bright white light, frost on the glass', key: 'clinical white' },
  { n: 16, scene: 'a container terminal at night: canyons of stacked shipping containers, a queue of refugees winding between them toward a gantry crane, harbour lamps in the fog', key: 'harbour amber' },
  { n: 17, scene: 'the last ship leaving a pier: a hull pulling away from a crowded quay, people left standing at the edge, searchlight on black water, rain', key: 'sea grey' },
  { n: 18, scene: 'a closed school at night: dark classroom windows with one lit, figures pouring out of a stairwell door onto a dirt yard, a single floodlight on a pole', key: 'moon blue' },
  { n: 19, scene: 'a school running track holding an entire city: a vast crowd filling the yard under one failing floodlight, bent soccer goals, dust in the beam, a small figure at the centre', key: 'final red' },
];

const PROMPT = p =>
  'Use case: stylized-concept. Asset type: vertical game chapter poster key art, 1024x1536 portrait. ' +
  `Painterly dark anime post-outbreak concept art: ${p.scene}. ` +
  `Overall colour key: ${p.key}, desaturated, heavy atmosphere, volumetric light, fine airborne dust. ` +
  'Cinematic eye-level camera, deep perspective, the UPPER TWO THIRDS carry the scene and the LOWER THIRD falls away into near-black so a caption can sit over it. ' +
  'Figures are distant silhouettes seen from behind or in profile — no close-up face, no portrait, no hero pose in front. ' +
  'No UI, no lettering, no numbers, no logos, no watermark, no frame, no border, no collage, no panels.';

const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter(a => !a.startsWith('--')).map(Number);
fs.mkdirSync(SRC, { recursive: true });

for (const p of POSTERS) {
  if (only.length && !only.includes(p.n)) continue;
  const out = path.join(SRC, 'poster-' + p.n + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', p.n); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: PROMPT(p), size: '1024x1536', n: 1 }),
    });
    if (!r.ok) { console.log(p.n, 'HTTP', r.status, (await r.text()).slice(0, 160)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(p.n, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK poster-' + p.n + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB');
    break;
  }
}
