// 출격 구역 바닥판을 굽는다. 가운데는 반드시 비어 있어야 한다 — 거기서 전투가 돈다.
//   node tools/gen-maps.mjs            # 없는 것만
//   node tools/gen-maps.mjs subway     # 한 장만
//   node tools/gen-maps.mjs --force
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

// plaza(황혼의 광장)는 2026-10-13 에 구운 것을 그대로 쓴다. 여기 있는 건 추가 구역.
export const MAPS = [
  { id: 'subway', name: '지하철역',
    scene: 'an abandoned underground subway station concourse: wide tiled platform floor in a receding grid, ticket gates and a dead information board pushed to the far edges, two stopped train cars at the very top edge, fallen posters, scattered luggage at the outer corners, emergency lighting in cold green-white with deep blue shadows' },
  { id: 'factory', name: '공장 지대',
    scene: 'a derelict heavy factory floor: oil-stained concrete slab in a receding grid, dormant conveyor lines and press machines pushed to the outer border, stacked steel drums and pallets at the far corners, a gantry crane overhead at the top edge, dusty orange work lamps and cold blue shadow' },
  { id: 'lab', name: '연구 시설',
    scene: 'an evacuated research facility hall: white epoxy floor with painted safety lines in a receding grid, glass containment booths and server racks along the outer walls only, overturned lab carts at the far corners, broken ceiling panels, sterile cyan light with hard dark shadows' },
  { id: 'harbor', name: '항만 도시',
    scene: 'a deserted container port apron at dusk: wet asphalt with faded lane markings in a receding grid, stacked shipping containers forming the outer border, mooring bollards and a gantry crane at the far edges, a dark sea horizon at the very top, amber sodium lamps reflecting in puddles' },
  { id: 'school', name: '폐교 운동장',
    scene: 'a closed school yard at night: packed dirt ground with faded white running-track lines in a receding grid, a dark school building along the top edge, bent soccer goals and a jungle gym at the outer corners, overgrown weeds at the border, one working floodlight, cold moonlight and long shadows' },
];

const PROMPT = m =>
  'Use case: stylized-concept. Asset type: actual game environment background, 1536x1024 landscape. ' +
  `Create an EMPTY isometric anime survival game arena seen from an elevated three-quarter camera: ${m.scene}. ` +
  'Painterly anime 3D miniature diorama quality, dark abandoned post-outbreak mood. ' +
  'The entire CENTER 80% is flat OPEN walkable ground with NO obstacles — props and architecture are restricted to the thin outer border only. ' +
  'Readable planar floor, subtle volumetric light, long shadows cast from outside the frame, no heavy blur. ' +
  'No people, no characters, no monsters, no weapons, no beams, no particles, no UI, no lettering, no HUD, no logos, no text. ' +
  'All central floor clearly visible. This is a playable background plate, not a screenshot, not a collage.';

const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

for (const m of MAPS) {
  if (only.length && !only.includes(m.id)) continue;
  const out = path.join(SRC, 'map-' + m.id + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', m.id); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: PROMPT(m), size: '1536x1024', n: 1 }),
    });
    if (!r.ok) { console.log(m.id, 'HTTP', r.status, (await r.text()).slice(0, 180)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(m.id, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK map-' + m.id + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB —', m.name);
    break;
  }
}
