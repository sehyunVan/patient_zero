// 처음 하는 사람의 길 — 인트로 → 첫 전투 → **로비** → 화면 한 바퀴.
// 전에는 결과 화면의 단추가 그대로 2라운드를 시작해서 온보딩이 통째로 건너뛰어졌다(2026-10-23).
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [how, act] of [['단추를 누른다', 'click'], ['가만히 둔다', 'wait']]) {
      const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { window.FORCE_INTRO = true; });
      await page.goto(URL + '/?desktop');
      await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady, { timeout: 60000 });
      await page.evaluate(() => { try { localStorage.removeItem('patient-zero-intro-seen'); localStorage.removeItem('patient-zero-tour-seen'); } catch {} });

      await page.click('#start');
      await page.waitForSelector('.intro-cut', { timeout: 15000 });
      await page.click('#intro-skip');
      await page.waitForFunction(() => patientZero.snapshot().mode === 'playing', { timeout: 15000 });
      await page.waitForFunction(() => patientZero.snapshot().mode === 'over', { timeout: 150000 });

      // 결과 화면의 단추는 **로비로** 가야 한다 — 다음 챕터가 아니라
      assert.match(await page.locator('#start').innerText(), /로비/, how + ': 단추가 로비로 간다');
      if (act === 'click') { await page.click('#start'); await page.waitForTimeout(700); }
      else await page.waitForTimeout(3200);          // 가만히 둬도 스스로 돌아온다

      const after = await page.evaluate(() => ({ mode: patientZero.snapshot().mode, tour: document.querySelectorAll('.tour-caption').length }));
      assert.equal(after.mode, 'lobby', how + ': 로비로 간다(2라운드가 아니라)');
      assert.ok(after.tour > 0, how + ': 로비 한 바퀴가 시작된다');
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: 인트로 → 첫 전투 → 로비 → 온보딩 (단추를 눌러도, 가만히 둬도)');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
