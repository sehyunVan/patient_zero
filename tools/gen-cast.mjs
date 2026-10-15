// 캐스트 시트를 굽는다. 넷을 한 장에 — 따로 그리면 같은 게임 사람으로 안 보인다.
// 한 캐릭터에 두 판본: SD(전투에서 움직이는 작은 몸)와 LD(선택창에 세우는 등신대).
//   node tools/gen-cast.mjs            # 없는 것만, SD+LD
//   node tools/gen-cast.mjs --ld       # LD 만
//   node tools/gen-cast.mjs --sd       # SD 만
//   node tools/gen-cast.mjs cast-b --force
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHEETS, SHEET_PROMPT, LD_PROMPT } from './cast.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

const kinds = [];
if (!process.argv.includes('--ld')) kinds.push({ suffix: '', prompt: SHEET_PROMPT });
if (!process.argv.includes('--sd')) kinds.push({ suffix: '-ld', prompt: LD_PROMPT });

for (const sheet of SHEETS) for (const kind of kinds) {
  if (only.length && !only.includes(sheet.file)) continue;
  const name = sheet.file + kind.suffix;
  const out = path.join(SRC, name + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', name); continue; }
  const prompt = kind.prompt(sheet);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2.5-sunburst', prompt, size: '1536x1024', n: 1, background: 'transparent' }),
    });
    if (!r.ok) { console.log(name, 'HTTP', r.status, (await r.text()).slice(0, 180)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(name, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK', name + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB', '—', sheet.cast.map(c => c.name).join(' '));
    break;
  }
}
