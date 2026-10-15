/* 글자가 박힌 그림의 영어판.  node tools/gen-art-en.mjs [이름 ...] [--force]
   원본을 레퍼런스로 붙여 **글자만 바꿔** 다시 굽는다 — 따로 그리면 획과 색이 달라져 같은 게임 그림으로 안 보인다.

   화면 글자는 i18n 이 번역하지만, **그림 안에 박힌 글자는 번역되지 않는다.**
   영어 스토어 스크린샷에 한국어가 남는 자리가 둘이라 그 둘만 다시 굽는다.
     pickup-logo    모집 화면의 「PICK UP · 한정 모집」
     chapter-slogan 챕터 선택의 「더 많은 감염을, 더 높은 기록을.」
   로고(infection-logo)는 tools/gen-logo-en.mjs 가 따로 굽는다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const KEEP = 'Keep every other thing identical to the attached image: same brush strokes, same lean, same torn bristle edges, ' +
  'same crimson and off-white palette, same underline, same framing, same size and placement of the main word. ' +
  'Genuinely transparent alpha background: no backdrop, no dark rectangle, no checkerboard, no frame. ' +
  'No Korean characters anywhere, no extra words.';

const ART = {
  'pickup-logo': 'Recreate the attached recruitment title. The large crimson dry-brush word "PICK UP" stays exactly as it is. ' +
    'Replace ONLY the Korean line under it with the English words "LIMITED RECRUITMENT" in the same white handwritten brush style, ' +
    'slightly smaller so it fits on one line. ' + KEEP,
  'chapter-slogan': 'Recreate the attached slogan artwork. Replace the Korean sentence with the English line ' +
    '"MORE INFECTED. HIGHER RECORDS." set in the same two-line hand-painted brush lettering, the first line white and ' +
    'the second line ending in crimson, same rising baseline. ' + KEEP,
};

const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
for (const [name, prompt] of Object.entries(ART)) {
  if (only.length && !only.includes(name)) continue;
  const ref = path.join(SRC, name + '.png'), out = path.join(SRC, name + '-en.png');
  if (!fs.existsSync(ref)) { console.log(name, '원본이 없다'); continue; }
  if (fs.existsSync(out) && !force) { console.log(name, 'skip (exists)'); continue; }
  let done = false;
  for (let t = 1; t <= 3 && !done; t++) {
    const fd = new FormData();
    fd.append('model', 'gpt-image-2.5-sunburst');
    fd.append('prompt', prompt);
    fd.append('size', '1536x1024'); fd.append('n', '1');
    fd.append('background', 'transparent');
    fd.append('image[]', new Blob([fs.readFileSync(ref)], { type: 'image/png' }), name + '.png');
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY }, body: fd });
    if (!r.ok) { console.log(name, 't' + t, 'HTTP', r.status, (await r.text()).slice(0, 200)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(name, 't' + t, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK', path.relative(ROOT, out), (fs.statSync(out).size / 1024 | 0) + 'KB');
    done = true;
  }
  if (!done) console.log(name, 'FAILED');
}
