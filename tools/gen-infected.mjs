// 감염자 원화 — 감염된 시민 2종. 주인공(제로)과 절대 겹치지 않는 실루엣이 목적이다.
// 주인공은 검은 모자 + 은발 + 오버사이즈 후드. 감염자는 그 셋을 전부 금지하고,
// 자기가 입고 있던 시민 옷(남: 네이비 재킷 / 여: 베이지 후드)을 그대로 입은 채 변한다.
// 사용: node tools/gen-infected.mjs [--force]
// 키: ask-gpt/.env 의 OPENAI_API_KEY. 모델·방식은 이 저장소의 다른 원화와 같다(images/edits + 원본 아틀라스를 레퍼런스로).
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const REF = ROOT + '/assets/src/characters.png';
const OUT = ROOT + '/assets/src/infected.png';

const PROMPT =
  'Create a transparent game character sprite atlas in exactly the same cel-shaded painterly style, scale, camera and rendering as the attached reference atlas. ' +
  'Exactly TWO full-body chibi anime characters in a SINGLE HORIZONTAL ROW, two equal cells, same scale and height as the reference figures, 3 heads tall, ' +
  'feet on the same baseline, generous empty transparent padding between and around them, camera elevated three-quarter front view. ' +
  'Both are INFECTED civilians: ashen desaturated grey-green skin, sunken shadowed faces, dim crimson glowing eyes, slack hanging arms, hunched shambling walk pose, ' +
  'clothes dirtied and torn at the hems, thin crimson veins creeping up the neck. Dark cinematic palette, crimson rim light. ' +
  'From LEFT to RIGHT: (1) infected young adult male, tousled brown hair, the SAME navy blue jacket and grey pants and brown sneakers as the second reference figure, jacket torn and smeared; ' +
  '(2) infected young adult female, short dark bob hair, the SAME beige hooded jacket and dark pants and sneakers as the third reference figure, hood hanging loose off the shoulder. ' +
  'Each whole body visible and clearly separated, NO overlap. ' +
  'Absolutely NOT the first reference figure: no black baseball cap, no silver or grey hair, no oversized black tactical hoodie, no confident upright heroic pose, no weapons. ' +
  'No gore, no blood pools, no exposed wounds, no cast floor shadows, no terrain, no ground, no labels, no text, no borders, no frame. ' +
  'Genuinely transparent alpha background. This sheet will be sliced into two equal-width cells.';

const force = process.argv.includes('--force');
if (fs.existsSync(OUT) && !force) { console.log('skip (exists) — --force 로 덮어쓰기'); process.exit(0); }
for (let t = 1; t <= 3; t++) {
  const fd = new FormData();
  fd.append('model', 'gpt-image-2.5-sunburst'); fd.append('prompt', PROMPT);
  fd.append('size', '1536x1024'); fd.append('n', '1'); fd.append('background', 'transparent');
  fd.append('image[]', new Blob([fs.readFileSync(REF)], { type: 'image/png' }), 'characters.png');
  const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 300)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json; if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('OK assets/src/infected.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB');
  process.exit(0);
}
console.log('FAILED'); process.exit(1);
