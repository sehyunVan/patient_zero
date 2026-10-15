/* 홍보 그림 한 장 → 스토어가 요구하는 화소들.  node tools/store-promo.mjs
   원본: assets/src/store-promo.png (1536×1024, tools/gen-promo.mjs 가 굽는다)

   **크기가 전부다.** 스토어는 1px 만 달라도 안 받는다. 그래서 자를 때 비율을 먼저 맞추고,
   인물이 있는 쪽(오른쪽 위)을 기준점으로 잡아 얼굴이 잘리지 않게 한다.

       1024×500    Play 그래픽 이미지(피처 그래픽) — 로고를 얹는 유일한 장
       3840×1646   App Store 헤더
       5244×2950   App Store 헤더 대체 규격
       1920×1280   App Store 검색 결과
       3840×2560   App Store 검색 결과 대체 규격
       1024×1024   App Store 앱 아이콘 (icons/store 에서 복사)
        512×512    Play 앱 아이콘 (icons 에서 복사)

   알파는 없앤다 — 애플은 투명이 있는 그림을 거부하고, Play 도 피처 그래픽은 불투명을 요구한다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = path.join(ROOT, 'assets/src/store-promo.png');
const LOGO = path.join(ROOT, 'assets/src/infection-logo.png');
const LOGO_EN = path.join(ROOT, 'assets/src/infection-logo-en.png');
const BG = { r: 6, g: 10, b: 16, alpha: 1 };

/* 비율에 맞게 자른다. 가로로 납작한 규격일수록 위쪽을 더 남긴다 — 얼굴이 위쪽 1/3 에 있다.
   position 은 sharp 의 크롭 기준점이다. */
const cut = (w, h) => sharp(MASTER)
  .resize(w, h, { fit: 'cover', position: w / h > 2 ? 'north' : 'attention' })
  .flatten({ background: BG });

const out = (...p) => path.join(ROOT, 'site', ...p);
fs.mkdirSync(out('play'), { recursive: true });
fs.mkdirSync(out('appstore/promo'), { recursive: true });

/* ① Play 그래픽 이미지 1024×500 — 로고를 왼쪽 어두운 쪽에. 한국어판·영어판 둘.
   Play 는 이 그림을 잘라 쓰는 자리가 있어서(TV·추천 배너) 글자를 테두리에서 떼어 둔다. */
for (const [logoFile, name] of [[LOGO, 'feature-graphic-1024x500.png'], [LOGO_EN, 'feature-graphic-1024x500-en.png']]) {
  if (!fs.existsSync(logoFile)) { console.log('없어서 건너뜀:', path.basename(logoFile)); continue; }
  const base = await cut(1024, 500).png().toBuffer();
  const logo = await sharp(logoFile).resize({ width: 470 }).png().toBuffer();
  const lm = await sharp(logo).metadata();
  await sharp(base)
    .composite([{ input: logo, left: 54, top: Math.round((500 - lm.height) / 2) }])
    .flatten({ background: BG }).removeAlpha().png({ compressionLevel: 9 })
    .toFile(out('play', name));
}

/* ② App Store 홍보 자리 — 글자는 넣지 않는다. 스토어가 그 위에 제 글자를 얹는다 */
const APPSTORE = [[3840, 1646, 'header-3840x1646'], [5244, 2950, 'header-5244x2950'],
                  [1920, 1280, 'search-1920x1280'], [3840, 2560, 'search-3840x2560']];
for (const [w, h, name] of APPSTORE) await cut(w, h).png({ compressionLevel: 9 }).toFile(out('appstore/promo', name + '.png'));

/* ③ 아이콘은 이미 구운 것을 제자리에 복사해 둔다 — 제출할 때 한 폴더에서 다 꺼내게 */
fs.copyFileSync(path.join(ROOT, 'icons/store/app-icon-1024.png'), out('appstore/icon-1024x1024.png'));
fs.copyFileSync(path.join(ROOT, 'icons/app-icon-512.png'), out('play/icon-512x512.png'));

for (const f of [out('play/feature-graphic-1024x500.png'), out('play/feature-graphic-1024x500-en.png'), out('play/icon-512x512.png'), out('appstore/icon-1024x1024.png'),
                 ...APPSTORE.map(([, , n]) => out('appstore/promo', n + '.png'))]) {
  const m = await sharp(f).metadata();
  console.log(path.relative(ROOT, f).split(path.sep).join('/').padEnd(46), `${m.width}×${m.height}  알파 ${m.hasAlpha ? '있음' : '없음'}`);
}
