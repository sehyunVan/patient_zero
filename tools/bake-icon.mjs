/* 아이콘 원화 한 장 → 쓰이는 모든 크기.  node tools/bake-icon.mjs
   원본: assets/src/app-icon-zero.png (1024², node tools/gen-icon.mjs 로 굽는다)
   나오는 곳: icons/ (웹·런처) · icons/store/ (스토어 원본·적응형 앞뒤면)

   함정 둘 — 「막차 이후」에서 실제로 밟은 것들이다:
   ① 애플은 **알파 채널이 있는 앱 아이콘을 거부한다**. 스토어용 1024 는 배경색으로 눌러 평평하게 둔다.
   ② 안드로이드 적응형(maskable)은 안전 영역이 안쪽 ~80% 라, 그림을 72%로 줄여 가운데 둔다.
      안 줄이면 둥근 마스크가 얼굴을 자른다. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src/app-icon-zero.png');
const OUT = path.join(ROOT, 'icons');
const STORE = path.join(OUT, 'store');
const BG = { r: 6, g: 10, b: 16, alpha: 1 };            // #060a10 — index.html 의 theme-color
fs.mkdirSync(STORE, { recursive: true });

const flat = (size) => sharp(SRC).resize(size, size, { fit: 'cover' }).flatten({ background: BG }).png({ compressionLevel: 9 });

/* ① 스토어·웹 아이콘 — 알파 없음 */
for (const s of [512, 192, 180, 48, 32, 16]) {
  const name = s === 180 ? 'apple-touch-icon.png' : `app-icon-${s}.png`;
  await flat(s).toFile(path.join(OUT, name));
}
await flat(1024).toFile(path.join(STORE, 'app-icon-1024.png'));   // 스토어 제출용 — 배포본에는 안 올라간다

/* ② maskable / 적응형 앞면 — 가운데 72%, 둘레는 배경색 */
const fg = await sharp(SRC).resize(369, 369, { fit: 'cover' }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: fg, gravity: 'center' }]).png().toFile(path.join(OUT, 'app-icon-maskable-512.png'));
const fg1024 = await sharp(SRC).resize(738, 738, { fit: 'cover' }).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg1024, gravity: 'center' }]).png().toFile(path.join(STORE, 'icon-foreground.png'));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toFile(path.join(STORE, 'icon-background.png'));

/* ③ favicon.ico — 16·32·48 PNG 을 담은 ICO 컨테이너를 직접 쓴다(sharp 는 .ico 를 못 쓴다) */
{
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map(s => flat(s).toBuffer()));
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  const dir = Buffer.alloc(16 * sizes.length);
  let off = 6 + dir.length;
  sizes.forEach((s, i) => {
    const e = 16 * i;
    dir[e] = s === 256 ? 0 : s; dir[e + 1] = s === 256 ? 0 : s; dir[e + 2] = 0; dir[e + 3] = 0;
    dir.writeUInt16LE(1, e + 4); dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(pngs[i].length, e + 8); dir.writeUInt32LE(off, e + 12);
    off += pngs[i].length;
  });
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([head, dir, ...pngs]));
}

for (const d of [OUT, STORE]) for (const f of fs.readdirSync(d).filter(f => f !== 'store').sort()) {
  const m = await sharp(path.join(d, f)).metadata().catch(() => null);
  console.log(path.relative(ROOT, path.join(d, f)).split(path.sep).join('/') + (m ? `  ${m.width}×${m.height}  알파 ${m.hasAlpha ? '있음' : '없음'}` : `  ${(fs.statSync(path.join(d, f)).size / 1024).toFixed(1)}KB`));
}
