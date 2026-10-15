// 브금 두 벌을 WAV 로 구워 둔다 — 게임을 켜지 않고 들어 보려고.
//   node tools/render-bgm.mjs            # 두 벌 60초씩
//   node tools/render-bgm.mjs 120        # 길이를 바꿔서
// 결과: bgm-ambient.wav · bgm-battle.wav (저장소에만 둔다. deploy.sh 는 html/css/js 와
// assets/*.webp 만 올리므로 폰이 받는 양은 그대로 0 이다.)
//
// music/ 시리즈의 numpy 쌍둥이와 같은 자리지만, 합성기를 두 번 쓰지 않는다 —
// 브라우저의 OfflineAudioContext 로 **js/bgm.js 그 코드를 그대로** 돌려 받아 적는다.
// 그래야 구운 소리가 실제로 게임에서 나는 소리다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/playwright');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.TEST_URL || 'http://localhost:4177';
const SECONDS = Number(process.argv[2]) || 60;
const RATE = 44100;

// 16비트 스테레오 WAV 로 적는다
function wav(left, right, rate) {
  const n = left.length, bytes = n * 4;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, left[i])), r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE((l * 32767) | 0, 44 + i * 4);
    buf.writeInt16LE((r * 32767) | 0, 46 + i * 4);
  }
  return buf;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(URL + '/?desktop');
  await page.waitForFunction(() => !!window.BGM);
  for (const which of ['ambient', 'battle']) {
    const { left, right, peak } = await page.evaluate(async ({ which, SECONDS, RATE }) => {
      const ctx = new OfflineAudioContext(2, RATE * SECONDS, RATE);
      const band = window.BGM.build(ctx, ctx.destination);
      band.startAll(0);
      band.crossfade(which === 'battle', 0, .01);
      band.firstBell(.05);
      // 전투는 세기를 천천히 올려 가며 — 실제 한 판이 그렇게 흘러간다
      const span = 4;
      for (let t = 0; t < SECONDS; t += span) {
        const hot = which === 'battle' ? Math.min(1, .2 + t / SECONDS) : 0;
        band.setIntensity(hot, t);
        band.schedule(t, Math.min(SECONDS, t + span), hot);
      }
      const buf = await ctx.startRendering();
      const l = buf.getChannelData(0), r = buf.getChannelData(1);
      let peak = 0; for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]));
      return { left: Array.from(l), right: Array.from(r), peak };
    }, { which, SECONDS, RATE });
    const out = path.join(ROOT, `bgm-${which}.wav`);
    fs.writeFileSync(out, wav(left, right, RATE));
    console.log(`OK bgm-${which}.wav  ${SECONDS}초 · ${(fs.statSync(out).size / 1048576).toFixed(1)}MB · peak ${peak.toFixed(2)}`);
  }
} finally { await browser.close(); }
