// 구운 챕터 화면 그림을 쓸 수 있는 모양으로 자른다.  node tools/cut-chapter.mjs
// 투명 여백을 그대로 두면 화면에 놓을 때 좌표가 그림마다 어긋난다 — 알파 경계로 바싹 자른다.
// 결과는 assets/src/ 에 다시 쓰고, tools/bake.mjs 가 webp 로 굽는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const RAW = path.join(SRC, 'raw');
fs.mkdirSync(RAW, { recursive: true });

// 원본은 raw/ 로 한 번만 치워 둔다 — 자른 것을 또 자르면 점점 깎인다
const keep = id => {
  const live = path.join(SRC, id + '.png'), raw = path.join(RAW, id + '.png');
  // 다시 구운 그림이 있으면 raw 도 새것으로 — 안 그러면 예전 원본을 계속 자른다
  if (fs.existsSync(live) && (!fs.existsSync(raw) || fs.statSync(live).mtimeMs > fs.statSync(raw).mtimeMs)) fs.copyFileSync(live, raw);
  return raw;
};

// 알파가 있는 가장 바깥 테두리
async function alphaBox(file, region, cut = 12) {
  let img = sharp(file).ensureAlpha();
  if (region) img = img.extract(region);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > cut) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// 1) 투명 그림은 알파 경계로 바싹 자른다
for (const id of ['card-frame', 'card-scratch', 'chapter-slogan', 'chapter-logo', 'play-word']) {
  const raw = keep(id);
  const box = await alphaBox(raw);
  await sharp(raw).extract(box).png().toFile(path.join(SRC, id + '.png'));
  console.log(id.padEnd(16), box.width + 'x' + box.height);
}

// 2) 보상 아이콘 시트는 반으로 갈라 하나씩
{
  const raw = keep('chapter-rewards');
  const { width, height } = await sharp(raw).metadata();
  // 왼쪽 절반(조각)은 쓰지 않는다 — 챕터를 깨도 조각은 안 나온다. 보상은 모집권뿐.
  const halves = [['reward-crate', Math.floor(width / 2)]];
  for (const [id, left] of halves) {
    const region = { left, top: 0, width: Math.floor(width / 2), height };
    const box = await alphaBox(raw, region);
    await sharp(raw).extract({ left: left + box.left, top: box.top, width: box.width, height: box.height })
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(path.join(SRC, id + '.png'));
    console.log(id.padEnd(16), box.width + 'x' + box.height + ' → 256x256');
  }
  fs.rmSync(path.join(SRC, 'chapter-rewards.png'), { force: true });
  fs.rmSync(path.join(ROOT, 'assets/chapter-rewards.webp'), { force: true });
}

// 2b) 흰 자국은 붓 시트 오른쪽 반에서, 붉은 제목 밑줄은 제 그림에서
{
  const raw = keep('brush-marks');
  const { width, height } = await sharp(raw).metadata();
  const region = { left: Math.floor(width / 2), top: 0, width: Math.floor(width / 2), height };
  const box = await alphaBox(raw, region);
  await sharp(raw).extract({ left: region.left + box.left, top: box.top, width: box.width, height: box.height })
    .png().toFile(path.join(SRC, 'claw-mark.png'));
  console.log('claw-mark'.padEnd(16), box.width + 'x' + box.height);
  fs.rmSync(path.join(SRC, 'brush-marks.png'), { force: true });
  fs.rmSync(path.join(ROOT, 'assets/brush-marks.webp'), { force: true });
}
{
  const raw = keep('title-slash-src');
  const box = await alphaBox(raw, null, 24);
  await sharp(raw).extract(box).png().toFile(path.join(SRC, 'title-slash.png'));
  console.log('title-slash'.padEnd(16), box.width + 'x' + box.height);
  fs.rmSync(path.join(SRC, 'title-slash-src.png'), { force: true });
  fs.rmSync(path.join(ROOT, 'assets/title-slash-src.webp'), { force: true });
}

// 3) 배경은 화면 비율(16:9)로 잘라 둔다 — 늘어나거나 잘리는 자리를 미리 정해 놓으려고
{
  const raw = keep('chapter-bg');
  const { width, height } = await sharp(raw).metadata();
  const h = Math.round(width * 790 / 1404);
  await sharp(raw).extract({ left: 0, top: Math.max(0, Math.round((height - h) / 2)), width, height: Math.min(h, height) })
    .png().toFile(path.join(SRC, 'chapter-bg.png'));
  console.log('chapter-bg'.padEnd(16), width + 'x' + Math.min(h, height));
}

// 4) 챕터 포스터는 카드 크기(356pt)의 두 배면 충분하다 — 원본 그대로면 폰이 19장에 30MB 를 받는다
for (const f of fs.readdirSync(RAW).concat(fs.readdirSync(SRC)).filter(f => /^poster-\d+\.png$/.test(f))) {
  if (fs.existsSync(path.join(SRC, f + '.done'))) continue;
  const raw = keep(f.replace(/\.png$/, ''));
  const m = await sharp(raw).metadata();
  if (m.width <= 720) continue;
  await sharp(raw).resize({ width: 720 }).png().toFile(path.join(SRC, f));
  console.log(f.padEnd(16), m.width + ' → 720');
}
