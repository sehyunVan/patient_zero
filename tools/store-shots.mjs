/* 스토어 스크린샷 — 실제 게임을 켜서 찍는다.  node tools/store-shots.mjs [--only <tag>]
   나오는 곳: site/appstore/<크기>/ · site/play/<크기>/

   **핵심은 화소 크기다.** 한 장이라도 어긋나면 업로더가 묶음을 통째로 거부한다.
   그래서 뷰포트를 나눠 잡고 deviceScaleFactor 로 곱해 정확히 맞춘 뒤, 마지막에 전부 다시 잰다.

       2796×1290   6.9" 아이폰 (가로)   ← Play 휴대폰도 이 크기를 그대로 받는다
       2778×1284   6.5" 아이폰 (가로)   ← ASC 가 아직 요구할 때가 있다
       2752×2064   13" 아이패드 (가로)  ← 아이패드를 지원하는 빌드면 필수
       1920×1080   Play 휴대폰 16:9
       2560×1440   Play 태블릿 16:9

   **실제 플레이 화면을 담는다.** 타이틀·로그인 화면만 올리면 2.3.3 으로 잡힌다(SHIPPING.md §2).
   이 게임은 폰 가로 전용이라 터치 기기로 열어야 한다 — 데스크톱으로 열면 폰 미리보기로 넘어간다.
   챕터 5 까지 깬 저장을 심고 찍는다. 처음 켠 화면은 칸이 비어 보인다. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const { chromium } = require('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/playwright');
const sharp = require('C:/Users/sehyu/playground/subway-rpg/poc/node_modules/sharp');

/* 스토어 목록은 언어별로 스크린샷이 따로다 — --lang en 이면 게임을 영어로 띄우고 <폴더>-en 에 넣는다 */
const LANG = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'ko';
const SUF = LANG === 'en' ? '-en' : '';
const PORT = 4188;
const URL = `http://127.0.0.1:${PORT}`;

/* [가로, 세로, 뷰포트 배율, 나오는 곳] — 뷰포트 = 크기/배율 이라 화소가 딱 맞는다

   **ASC 의 업로드 칸은 기기 묶음마다 받는 크기가 정해져 있다.** 「Dynamic Island 지원 iPhone(중형
   디스플레이)」 칸은 2796×1290 을 **안 받는다** — 그건 대형(6.9") 칸의 크기다. 중형 칸이 받는 가로는
   2556×1179(15.5cm)와 2622×1206(15.9cm) 둘이라, 그 둘을 따로 굽는다(2026-10-15 업로드 화면에서 확인). */
const SIZES = [
  [2556, 1179, 3, 'site/appstore/iphone-6.1' + SUF],   // 중형 디스플레이 · 15.5cm
  [2622, 1206, 3, 'site/appstore/iphone-6.3' + SUF],   // 중형 디스플레이 · 15.9cm
  [2796, 1290, 3, 'site/appstore/iphone-6.9' + SUF],   // 대형 디스플레이
  [2778, 1284, 3, 'site/appstore/iphone-6.5' + SUF],   // 구형(ASC 가 아직 요구할 때가 있다)
  [2752, 2064, 2, 'site/appstore/ipad-13' + SUF],
  [1920, 1080, 2, 'site/play/phone' + SUF],
  [2560, 1440, 2, 'site/play/tablet' + SUF],
];

/* 한참 해 본 사람의 저장 — 빈 칸 없는 화면을 찍으려고 */
const SEED = {
  'patient-zero-kit': { chapter: 5, loadout: ['boost', 'mine'], progress: { chapter: 5, cleared: [1, 2, 3, 4], best: { 1: 61, 2: 84, 3: 102, 4: 128, 5: 96 } } },
  'patient-zero-progression-v1': {
    tickets: 14, fragments: 320, draws: 37, pity: 11, dry: 3, selected: 'zero',
    owned: ['zero', 'kai', 'rea', 'mio', 'iris', 'eve', 'hoshi', 'aya', 'ash', 'mina'],
    supply: { zero: 3, kai: 2, rea: 2 },
  },
  'patient-zero-runs-v2': [
    { score: 128, seconds: 90, map: 'CH4 봉쇄선 돌파', chapter: 4, cleared: true, survived: true },
    { score: 102, seconds: 90, map: 'CH3 통제 불능', chapter: 3, cleared: true, survived: true },
    { score: 96, seconds: 74, map: 'CH5 봉쇄선', chapter: 5, cleared: false, survived: false },
  ],
  'patient-zero-profile-v1': { name: 'PATIENT_ZERO', level: 23, xp: 64 },
};

/* 플레이 화면 — 스냅샷으로 가장 가까운 사람을 보고 키보드로 쫓아간다(검사 smoke.cjs 와 같은 방식).
   사람을 스치면 감염되므로, 몇 초만 돌아도 화면이 감염자와 연쇄로 찬다. */
async function play(page, steps) {
  await page.click('#start'); await page.waitForTimeout(700);
  await page.click('#hub-play'); await page.waitForTimeout(700);
  await page.click('.cs-card.focused'); await page.waitForTimeout(900);
  for (let i = 0; i < steps; i++) {
    const s = await page.evaluate(() => window.patientZero.snapshot()).catch(() => null);
    if (!s || s.mode !== 'playing') break;
    const t = (s.targets || []).slice().sort((a, b) =>
      Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
    if (!t) { await page.waitForTimeout(120); continue; }
    const keys = [];
    if (t.x > s.player.x + 6) keys.push('KeyD'); else if (t.x < s.player.x - 6) keys.push('KeyA');
    if (t.y > s.player.y + 6) keys.push('KeyS'); else if (t.y < s.player.y - 6) keys.push('KeyW');
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(90);
    for (const k of keys) await page.keyboard.up(k);
  }
}

/* 로비의 같은 data-panel 단추가 여러 개다(접힌 메뉴 + 보이는 카드). 보이는 것만 누른다 —
   첫 번째를 누르면 「element is not visible」로 30초를 기다리다 로비가 찍힌다. */
const openPanel = name => async page => {
  await page.click('#start'); await page.waitForTimeout(900);
  await page.locator(`[data-panel="${name}"]:visible`).first().click();
  await page.waitForTimeout(1300);
};

const SHOTS = [
  ['01-outbreak', async page => { await play(page, 260); await page.waitForTimeout(250); }],
  ['02-dash', async page => { await play(page, 150); await page.keyboard.press('Space'); await page.waitForTimeout(160); }],
  ['03-lobby', async page => { await page.click('#start'); await page.waitForTimeout(1400); }],
  ['04-chapters', async page => { await page.click('#start'); await page.waitForTimeout(900); await page.click('#lobby-chapter-card'); await page.waitForTimeout(1300); }],
  ['05-characters', openPanel('characters')],
  ['06-recruit', openPanel('recruit')],
];

/* 로컬 서버를 직접 띄운다 — 띄워 두는 걸 잊고 돌리면 전부 빈 화면으로 찍힌다 */
const server = spawn(process.execPath, [path.join(HERE, 'serve.cjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);
await new Promise(r => setTimeout(r, 1200));

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const onlyShot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1].split(',') : null;
const browser = await chromium.launch({ headless: true });
try {
  for (const [W, H, scale, dir] of SIZES) {
    if (only && !dir.endsWith(only)) continue;
    const out = path.join(ROOT, dir);
    fs.mkdirSync(out, { recursive: true });
    for (const [name, setup] of SHOTS) {
      if (onlyShot && !onlyShot.some(x => name.startsWith(x))) continue;   // --shot 01,04 로 몇 장만 다시 찍는다
      const page = await browser.newPage({
        viewport: { width: Math.round(W / scale), height: Math.round(H / scale) },
        deviceScaleFactor: scale, isMobile: true, hasTouch: true,
      });
      page.setDefaultTimeout(60000);    // 큰 묶음(아이패드·태블릿)은 한 장 찍는 데 30초를 넘길 때가 있다
      page.on('pageerror', e => console.log(`  ${name}: 페이지 오류 ${String(e).split('\n')[0]}`));
      await page.addInitScript(([seed, lang]) => {
        for (const [k, v] of Object.entries(seed)) try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
        try { localStorage.setItem('subway-rpg.lang', lang); } catch {}   // 평문으로 저장된다
      }, [SEED, LANG]);
      await page.goto(URL + '/', { timeout: 30000 });
      await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady, { timeout: 30000 });
      await setup(page).catch(e => console.log(`  ${name}: ${String(e).split('\n')[0]}`));
      /* 한 장이 시간을 넘겨도 묶음 전체를 버리지 않는다 — 전에 태블릿 묶음이 3장에서 끊겼다 */
      await page.screenshot({ path: path.join(out, name + '.png') })
        .catch(() => page.screenshot({ path: path.join(out, name + '.png'), timeout: 120000 }));
      await page.close();
    }
    console.log(`${dir}  ${W}×${H}  ${onlyShot ? onlyShot.join('·') + ' 다시' : SHOTS.length + '장'}`);
  }
} finally { await browser.close(); stop(); }

/* 다시 재 본다 — 요구 화소와 1px 이라도 다르면 올릴 수 없다 */
let bad = 0;
for (const [W, H, , dir] of SIZES) {
  if (only && !dir.endsWith(only)) continue;
  for (const [name] of SHOTS) {
    if (onlyShot && !onlyShot.some(x => name.startsWith(x))) continue;
    const f = path.join(ROOT, dir, name + '.png');
    const m = await sharp(f).metadata();
    if (m.width !== W || m.height !== H) { console.error(`크기가 다르다 ${dir}/${name}: ${m.width}×${m.height}`); bad++; }
  }
}
console.log(bad ? `어긋난 것 ${bad}장` : '모든 묶음의 화소가 요구 크기와 같다');
process.exit(bad ? 1 : 0);
