/* 앱 번들을 굽는다 — Capacitor 가 담을 dist/mobile/ 을 만든다.
   실행:  node tools/pack-mobile.mjs [--api https://…/patient-zero] [--check]

   웹 배포본과 앱이 **같은 파일**이어야 한다. 그래서 복사가 기본이고, 고치는 곳은 index.html 두 군데뿐이다:

     ① 글꼴 — 웹은 Google Fonts 에서 받지만 앱은 그 주소에 못 닿을 수 있다.
        CDN 링크를 fonts/fonts.css 한 줄로 바꾼다(tools/fetch-fonts.mjs 가 미리 받아 둔다).
        안 바꾸면 비행기 모드에서 **글자가 안 나온 채로** 시작한다(index.html 이 display=block 로 기다린다).
     ② 서버 주소 — 앱의 출처는 https://localhost 라 같은 출처에 /api 가 없다.
        window.PZ_API 를 절대 주소로 박는다. 안 박으면 로그인·클라우드 저장·순위가 통째로 꺼진다.

   담지 않는 것: tools · test · site(스토어 그림) · promo(영상) · server · shots · assets/src(원본 PNG) ·
                icons/store(제출용 원본) · phone.html(PC 에서 폰을 흉내 내는 미리보기) · *.md

   굽고 나서 반드시: node tools/pack-mobile.mjs --check */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'mobile');
const arg = k => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const API = arg('--api') || 'https://home.165-227-196-68.sslip.io/patient-zero';
const CHECK = process.argv.includes('--check');

const mb = n => (n / 1048576).toFixed(2) + 'MB';
let files = 0, bytes = 0;

function copy(src, dst, keep = () => true) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, e.name), to = path.join(dst, e.name);
    if (e.isDirectory()) { if (keep(e.name, true)) copy(from, to, keep); continue; }
    if (!keep(e.name, false)) continue;
    fs.copyFileSync(from, to);
    files++; bytes += fs.statSync(to).size;
  }
}

if (!CHECK) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 코드와 옷
  for (const f of fs.readdirSync(ROOT)) {
    if (/\.css$/.test(f) || f === 'manifest.webmanifest' || f === 'oauth.html') { fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f)); files++; bytes += fs.statSync(path.join(OUT, f)).size; }
  }
  copy(path.join(ROOT, 'js'), path.join(OUT, 'js'));
  copy(path.join(ROOT, 'i18n'), path.join(OUT, 'i18n'), n => n === 'bundle.js');
  copy(path.join(ROOT, 'fonts'), path.join(OUT, 'fonts'));
  copy(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), (n, dir) => dir ? n !== 'src' : /\.(webp|png|jpg)$/i.test(n));
  copy(path.join(ROOT, 'icons'), path.join(OUT, 'icons'), (n, dir) => dir ? n !== 'store' : /\.(png|ico)$/i.test(n));

  // index.html — 글꼴과 서버 주소만 갈아 끼운다
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const before = html;
  html = html.replace(/[ \t]*<link rel="preconnect"[^>]*>\r?\n/g, '')
             .replace(/[ \t]*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\r?\n/g, '');
  html = html.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="fonts/fonts.css">\n  <link rel="stylesheet" href="style.css">');
  if (html === before) { console.error('index.html 의 글꼴 링크를 못 찾았다 — 모양이 바뀌었다'); process.exit(1); }
  const api = html.replace(/<script>window\.PZ_API[^<]*<\/script>/,
    `<script>window.PZ_API = ${JSON.stringify(API)};   /* tools/pack-mobile.mjs 가 박아 넣는다 */</script>`);
  if (api === html) { console.error('window.PZ_API 줄을 못 찾았다'); process.exit(1); }
  fs.writeFileSync(path.join(OUT, 'index.html'), api);
  files++; bytes += fs.statSync(path.join(OUT, 'index.html')).size;
  console.log(`담았다: ${files}개 · ${mb(bytes)} → dist/mobile`);
  console.log(`서버 주소: ${API}`);
}

/* ── 점검 — 번들 안에서 길이 하나라도 끊기면 폰에서 빈 화면이 된다 ── */
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const problems = [];
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html)) problems.push('아직 Google Fonts 를 부른다 — 비행기 모드에서 글자가 안 나온다');
if (!/window\.PZ_API = "https?:/.test(html)) problems.push('서버 주소가 안 박혔다 — 로그인·순위가 꺼진 채로 뜬다');
for (const m of html.matchAll(/(?:src|href)="([A-Za-z0-9_./-]+\.(?:js|css|webp|png|ico))"/g)) {
  if (!fs.existsSync(path.join(OUT, m[1]))) problems.push('빠짐: ' + m[1]);
}
// 코드가 부르는 그림까지 — 캐릭터·아이콘은 js 안에서 조립된다
for (const f of fs.readdirSync(path.join(OUT, 'js'))) {
  const src = fs.readFileSync(path.join(OUT, 'js', f), 'utf8');
  for (const m of src.matchAll(/'(assets\/[A-Za-z0-9_./-]+\.(?:webp|png))'/g))
    if (!fs.existsSync(path.join(OUT, m[1]))) problems.push(`빠짐(js/${f}): ${m[1]}`);
}
const total = (function size(dir) { let s = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) s += e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size; return s; })(OUT);
console.log(`번들 ${mb(total)}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('점검 통과 — 끊긴 길 없음');
