/* 앱 번들에 넣을 글꼴을 내려받는다 — 실행: node tools/fetch-fonts.mjs  →  fonts/
   왜: 웹판은 글꼴을 Google Fonts 에서 받지만 앱은 그 주소에 못 닿을 수 있다.
   index.html 이 display=block 으로 기다리게 해 두었으므로, CDN 이 막히면 **글자가 안 나온 채로** 시작한다.
   번들에 넣어 그 경우를 없앤다. 담은 뒤에는 tools/pack-mobile.mjs 가 CDN <link> 들을 fonts/fonts.css 한 줄로 바꾼다.

   담는 것: Barlow Condensed(숫자·표제) · Nanum Pen Script(손글씨) · Gothic A1 · Noto Sans KR(본문).
   한글 글꼴은 구글이 **조각(subset)으로 쪼개서** 준다 — 조각마다 unicode-range 가 붙어 있고,
   폰은 그중 필요한 것만 받는다. 전부 담아도 한 조각이 작아서 합계가 크지 않다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'fonts');
// 구글은 UA 를 보고 포맷을 고른다 — 최신 크롬이라고 말해야 woff2 를 준다
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' };

// index.html 의 <link> 와 **같은 주소**를 쓴다. 다르면 앱만 다른 굵기로 뜬다.
const SHEETS = [
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;0,900;1,800;1,900&family=Gothic+A1:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700&display=block',
  'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=block',
];

fs.mkdirSync(OUT, { recursive: true });
let css = '/* tools/fetch-fonts.mjs 가 받아 적은 것 — 손으로 고치지 않는다 */\n';
let files = 0, bytes = 0;

for (const url of SHEETS) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) { console.error('시트 실패', res.status, url); process.exit(1); }
  let sheet = await res.text();
  const urls = [...new Set([...sheet.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m => m[1]))];
  for (const u of urls) {
    const name = u.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '_');
    const file = path.join(OUT, name);
    if (!fs.existsSync(file)) {
      const r = await fetch(u, { headers: UA });
      if (!r.ok) { console.error('글꼴 실패', r.status, u); process.exit(1); }
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    bytes += fs.statSync(file).size; files++;
    sheet = sheet.split(u).join(name);          // 상대 경로로 — fonts.css 옆에 놓인다
  }
  css += sheet + '\n';
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css);
console.log(`글꼴 ${files}조각 · ${(bytes / 1048576).toFixed(2)}MB → fonts/`);
