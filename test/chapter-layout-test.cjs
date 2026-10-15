// 챕터 선택 화면. 목업(1404×790)의 자리를 그대로 지키는지까지 잰다 —
// 눈으로만 맞추면 다음에 누가 한 줄 고치고 조용히 어긋난다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('path');
const SHOT = n => path.join(__dirname, '../shots', n);
const URL = process.env.TEST_URL || 'http://localhost:4177';

// 목업에서 잰 자리(±6px). 세로 790 짜리 화면에서 --u 가 1px 일 때의 값이다.
const PLACES = [
  ['.cs-card.focused', 524, 95, 356, 480],
  ['[data-district="2"]', 240, 133, 268, 414],
  ['[data-district="4"]', 896, 133, 268, 414],
  ['.cs-head', 10, 18, 340, 52],
  ['.cs-record', 1145, 28, 242, 55],
  ['#chapter-preview', 1076, 606, 292, 84],
  ['.cs-nav', 20, 714, 262, 62],
];

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1404, height: 790 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: 3, progress: { cleared: [1, 2], best: { 1: 25, 2: 40 } } })));
    await p.goto(URL + '/?desktop');
    await p.click('#start'); await p.click('#hub-play'); await p.waitForTimeout(1100);

    const selected = () => p.locator('.cs-card.focused').getAttribute('data-district');
    assert.equal(await selected(), '3');
    assert.equal(await p.locator('.cs-card').count(), 19);
    assert.equal(await p.locator('#chapter-steps button:visible').count(), 5);
    // 목업 자리 맞추기
    for (const [q, x, y, w, h] of PLACES) {
      const r = await p.locator(q).first().boundingBox();
      for (const [name, got, want] of [['x', r.x, x], ['y', r.y, y], ['w', r.width, w], ['h', r.height, h]])
        assert.ok(Math.abs(got - want) <= 6, `${q} ${name}: ${Math.round(got)} ≠ ${want}`);
    }
    // 그림이 전부 붙었는지 — 하나라도 404 면 카드가 검게 뜬다
    // 멀리 있는 카드는 아직 그림을 안 받았다(data-art). 받기 시작한 것만 본다.
    const broken = await p.evaluate(() => [...document.querySelectorAll('#chapters img')].filter(i => i.getAttribute('src') && i.complete && !i.naturalWidth).map(i => i.getAttribute('src')));
    assert.deepEqual(broken, []);
    const loaded = await p.evaluate(() => document.querySelectorAll('.cs-art[src]').length);
    assert.ok(loaded >= 5 && loaded < 19, `가까운 카드만 받아야 한다: ${loaded}장`);
    await p.screenshot({ path: SHOT('chapter-posters.png') });

    // 잠긴 챕터는 가운데로 와도 출격하지 않는다
    await p.click('#chapter-preview'); await p.waitForTimeout(800);
    assert.equal(await selected(), '4');
    await p.click('.cs-card.focused');await p.waitForTimeout(400); await p.waitForTimeout(200);
    assert.ok(await p.locator('#chapters').isVisible(), '잠긴 챕터로 출격했다');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(800);
    assert.equal(await selected(), '3');
    await p.click('[data-step="2"]'); await p.waitForTimeout(800);
    assert.equal(await selected(), '2');
    await p.click('[data-chpanel=settings]');
    assert.ok(await p.locator('#info-dialog').isVisible());
    await p.click('#close-dialog');
    await p.keyboard.press('Escape');
    assert.ok(await p.locator('#chapters').isHidden());

    // 다시 열면 아까 보던 챕터를 기억하고 있다 (나갈 때 들고 나간다)
    await p.click('#hub-play'); await p.waitForTimeout(900);
    assert.equal(await selected(), '2');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
    assert.equal(await selected(), '3');
    // 폰 가로에서도 네 귀퉁이가 화면 안에 있어야 한다
    await p.setViewportSize({ width: 750, height: 335 }); await p.waitForTimeout(900);
    await p.screenshot({ path: SHOT('chapter-posters-small.png') });
    for (const q of ['#chapter-preview', '.cs-card.focused', '#chapter-home', '.cs-nav', '.cs-record', '#chapter-steps']) {
      const r = await p.locator(q).boundingBox();
      assert.ok(r.x >= -1 && r.y >= -1 && r.x + r.width <= 751 && r.y + r.height <= 336, `${q}: ${JSON.stringify(r)}`);
    }
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false);

    // 가운데 카드를 누르면 그 챕터로 출격한다 (옛 출격 버튼은 목업에 없어서 뺐다)
    await p.click('.cs-card.focused');await p.waitForTimeout(400);
    assert.ok(await p.locator('#chapters').isHidden());
    assert.equal(await p.evaluate(() => patientZero.snapshot().mode), 'playing');
    assert.equal(await p.evaluate(() => patientZero.snapshot().chapter), 3);
    assert.deepEqual(errors, []);
    console.log('PASS: 목업 자리 7곳, 19챕터, 5단계 창, 그림 전부 로드, 잠금 출격 차단, 키보드, 설정, 닫고 다시 열면 보던 챕터 기억, 폰 가로, 챕터 3 출격; 오류 없음');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
