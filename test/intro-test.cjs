// 인트로와 첫 전투 튜토리얼 — 처음 켠 사람이 보는 길을 그대로 걷는다.
// 자동화 브라우저는 평소엔 인트로를 건너뛰므로(다른 테스트가 로비부터 봐야 한다) 여기서만 FORCE_INTRO 로 켠다.
const SHOT = n => require('path').join(__dirname, '../shots', n);
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.FORCE_INTRO = true; });   // 인트로를 자동화에서도 켠다(평소엔 건너뛴다)
    await page.goto(URL);
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.evaluate(() => { try { localStorage.removeItem('patient-zero-intro-seen'); } catch {} });   // 처음 켠 사람 상태

    // 1) 처음 시작하면 로비가 아니라 인트로가 먼저다
    await page.click('#start');
    await page.waitForSelector('.intro-cut');
    assert.equal(await page.locator('#lobby').isVisible(), false, '인트로가 로비보다 먼저');

    // 2) 다섯 컷이 순서대로, 그림과 대사가 같이 온다
    const order = await page.evaluate(() => Intro.cuts.map(c => c.art));
    assert.deepEqual(order, ['1-run', '2-caught', '3-turn', '4-smile', '5-hunt'], '쫓김 → 붙잡힘 → 감염 → 뒤집힘 → 사냥');
    const seen = [];
    for (let i = 0; i < order.length; i++) {
      const cut = await page.locator('.intro-cut').getAttribute('data-cut');
      seen.push(cut);
      const art = await page.locator('.intro-art').getAttribute('src');
      assert.ok(art.includes(cut), '컷마다 제 그림: ' + cut);
      assert.ok((await page.locator('.intro-lines').innerText()).trim().length > 0, '대사가 있다: ' + cut);
      if (i === 0) await page.screenshot({ path: SHOT('intro-open.png') });
      if (cut === '4-smile') {
        // 분위기가 여기서 뒤집힌다 — 차가움에서 따뜻함으로
        assert.equal(await page.locator('.intro-cut').evaluate(e => e.className.includes('tone-warm')), true, '4컷에서 톤이 뒤집힌다');
        await page.screenshot({ path: SHOT('intro-flip.png') });
      }
      await page.click('#intro');
      await page.waitForTimeout(320);
    }
    assert.deepEqual(seen, order, '건너뛰지 않으면 다섯 컷을 다 본다');

    // 3) 인트로가 끝나면 바로 첫 전투 + 1단계 안내
    await page.waitForFunction(() => patientZero.snapshot().mode === 'playing');
    assert.equal(await page.locator('#intro').isVisible(), false, '인트로는 걷힌다');
    const first = await page.locator('#tutorial').innerText();
    assert.match(first, /STEP 1 \/ 4/, '첫 안내');
    await page.screenshot({ path: SHOT('intro-tutorial.png') });

    // 4) 실제로 해내야 다음 단계로 간다 — 글만 읽고 넘어가지 않는다
    await page.keyboard.down('KeyD'); await page.waitForTimeout(800); await page.keyboard.up('KeyD');
    await page.waitForFunction(() => document.getElementById('tutorial').innerText.includes('STEP 2'));
    const snap = await page.evaluate(() => patientZero.snapshot());
    assert.equal(snap.score, 0, '아직 감염 전인데도 이동 단계는 통과했다');

    // 감염 한 명 → 3단계
    for (let i = 0; i < 40 && (await page.evaluate(() => patientZero.snapshot().score)) < 1; i++) {
      const s = await page.evaluate(() => patientZero.snapshot());
      const t = s.targets.sort((a, b) => Math.hypot(a.x - s.player.x, a.y - s.player.y) - Math.hypot(b.x - s.player.x, b.y - s.player.y))[0];
      if (!t) break;
      const keys = [Math.abs(t.x - s.player.x) > 6 ? (t.x > s.player.x ? 'KeyD' : 'KeyA') : null,
                    Math.abs(t.y - s.player.y) > 6 ? (t.y > s.player.y ? 'KeyS' : 'KeyW') : null].filter(Boolean);
      for (const k of keys) await page.keyboard.down(k);
      await page.waitForTimeout(120);
      for (const k of keys) await page.keyboard.up(k);
    }
    await page.waitForFunction(() => document.getElementById('tutorial').innerText.includes('STEP 3'));

    // 5) 두 번째로 켜면 인트로는 다시 나오지 않는다
    await page.evaluate(() => { try { localStorage.setItem('patient-zero-intro-seen', 'yes'); } catch {} });
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    await page.waitForSelector('#hub-hero');
    assert.equal(await page.locator('.intro-cut').count(), 0, '본 사람에게는 다시 틀지 않는다');

    assert.deepEqual(errors, []);
    console.log('PASS: 다섯 컷 순서·그림·대사, 4컷 톤 전환, 인트로→첫 전투, 단계는 실제 행동으로만 진행, 두 번째 실행은 건너뜀');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
