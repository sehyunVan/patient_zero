// 아이템·스킬·재화 아이콘. 아홉 개를 한 장에 3×3 으로 그린 뒤 잘라 쓴다.
// 따로 그리면 두께·광택·각도가 제각각이라 한 벌로 안 보인다.
//   node tools/gen-icons.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

import { ICONS, PROMPT } from './icons.mjs';

const OUT = path.join(SRC, 'icons.png');
if (fs.existsSync(OUT) && !process.argv.includes('--force')) { console.log('skip (exists)'); process.exit(0); }
fs.mkdirSync(SRC, { recursive: true });
for (let t = 1; t <= 3; t++) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt: PROMPT, size: '1024x1024', n: 1, background: 'transparent' }),
  });
  if (!r.ok) { console.log('t' + t, 'HTTP', r.status, (await r.text()).slice(0, 180)); continue; }
  const b64 = (await r.json()).data?.[0]?.b64_json;
  if (!b64) { console.log('t' + t, 'no image'); continue; }
  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('OK icons.png', (fs.statSync(OUT).size / 1024 | 0) + 'KB —', ICONS.map(i => i.name).join(' '));
  break;
}
