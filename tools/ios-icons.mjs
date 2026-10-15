/* iOS 앱 아이콘과 스플래시를 굽는다 — 맥에서, `npx cap add ios` 뒤에 실행한다.
     node tools/ios-icons.mjs

   안드로이드는 tools/bake-icon.mjs 가 미리 구워 둔 PNG 들을 쓰지만, iOS 는 자리가 달라서 따로 넣는다.

   애플이 거부하는 두 가지만 지키면 된다:
     ① **알파 채널이 있는 아이콘은 받지 않는다.** 투명을 배경색으로 눌러서 넣는다.
     ② 1024×1024 한 장이면 된다(Xcode 14+ 의 단일 크기 앱 아이콘). 옛 안내문의 20여 장은 이제 필요 없다.

   스플래시는 Capacitor 가 Splash.imageset 을 본다. 한 장(2732²)을 1x·2x·3x 에 같이 걸어 둔다 —
   배경색 위에 아이콘을 얹은 그림이라 어느 비율에서 잘려도 가운데가 남는다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
/* sharp 는 맥·윈도 바이너리가 다르다. mobile/node_modules 를 먼저 보고,
   없으면 이 윈도 상자의 이웃 저장소를 본다(둘 다 없으면 mobile 에서 npm i 하라고 말한다). */
let sharp;
for (const where of [path.join(ROOT, 'mobile/node_modules/sharp'), 'sharp', 'C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp']) {
  try { sharp = require_(where); break; } catch {}
}
if (!sharp) { console.error('sharp 가 없다 — `cd mobile && npm i -D sharp` 한 뒤 다시 돌린다.'); process.exit(1); }

const SRC = path.join(ROOT, 'icons/store/app-icon-1024.png');   // 생성 파이프라인의 원화(tools/gen-icon.mjs)
const XC = path.join(ROOT, 'mobile/ios/App/App/Assets.xcassets');
const BG = { r: 6, g: 10, b: 16, alpha: 1 };                     // 로비 바탕색 #060a10

if (!fs.existsSync(XC)) { console.error('iOS 프로젝트가 없다 — 먼저 `cd mobile && npx cap add ios`.\n찾은 자리: ' + XC); process.exit(1); }
if (!fs.existsSync(SRC)) { console.error('아이콘 원화가 없다: ' + SRC); process.exit(1); }

/* ── 앱 아이콘 — 알파를 눌러 없앤다 ── */
const iconDir = path.join(XC, 'AppIcon.appiconset');
fs.mkdirSync(iconDir, { recursive: true });
for (const f of fs.readdirSync(iconDir)) if (/\.png$/i.test(f)) fs.unlinkSync(path.join(iconDir, f));   // 캡 기본 아이콘을 치운다
await sharp(SRC).resize(1024, 1024).flatten({ background: BG }).png().toFile(path.join(iconDir, 'AppIcon-512@2x.png'));
fs.writeFileSync(path.join(iconDir, 'Contents.json'), JSON.stringify({
  images: [{ filename: 'AppIcon-512@2x.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n');

/* ── 스플래시 — 배경색 위에 아이콘 ── */
const splashDir = path.join(XC, 'Splash.imageset');
fs.mkdirSync(splashDir, { recursive: true });
const S = 2732, inner = Math.round(S * 0.22);
const mark = await sharp(SRC).resize(inner, inner).png().toBuffer();
const splash = await sharp({ create: { width: S, height: S, channels: 3, background: BG } })
  .composite([{ input: mark, gravity: 'center' }]).flatten({ background: BG }).png().toBuffer();
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  fs.writeFileSync(path.join(splashDir, name), splash);
fs.writeFileSync(path.join(splashDir, 'Contents.json'), JSON.stringify({
  images: [
    { idiom: 'universal', filename: 'splash-2732x2732-2.png', scale: '1x' },
    { idiom: 'universal', filename: 'splash-2732x2732-1.png', scale: '2x' },
    { idiom: 'universal', filename: 'splash-2732x2732.png', scale: '3x' },
  ],
  info: { author: 'xcode', version: 1 },
}, null, 2) + '\n');

const size = f => (fs.statSync(f).size / 1024 | 0) + 'KB';
console.log('앱 아이콘  1024² 알파 없음 ·', size(path.join(iconDir, 'AppIcon-512@2x.png')));
console.log('스플래시   2732² ×3 ·', size(path.join(splashDir, 'splash-2732x2732.png')));
console.log('\nXcode 를 열어 두었다면 한 번 닫았다 열어야 보인다(Assets.xcassets 는 캐시된다).');
