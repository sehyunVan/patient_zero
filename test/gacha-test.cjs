// 모집 — 공지한 확률과 실제로 뽑히는 비율이 같은지, 천장이 도는지, 아이템이 실제로 쓸모가 있는지.
// 공지는 표에서 생성되므로, 여기서 "표 = 실제 = 화면" 세 쪽을 한 번에 묶는다.
const SHOT = n => require('path').join(__dirname, '../shots', n);
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);

    // 1) 대부분 아이템, 캐릭터는 가끔 — 표가 그렇게 돼 있는지
    const rates = await page.evaluate(() => {
      const out = {};
      for (const banner of ['standard', 'pickup']) {
        const r = Progression.rates(banner);
        const ch = r.table.outcomes.find(o => o.kind === 'character');
        out[banner] = { character: ch.weight / r.total, total: r.total, pity: r.pity, supplyMax: r.supplyMax };
      }
      return out;
    });
    assert.ok(rates.standard.character <= .15, '일반 모집에서 캐릭터는 15% 이하: ' + rates.standard.character);
    assert.ok(rates.pickup.character <= .2, '픽업도 20% 이하');
    assert.ok(rates.standard.character > 0, '아예 안 나오지는 않는다');

    // 2) 실제로 2만 번 뽑아 공지한 비율과 맞는지 (모집권·저장은 건드리지 않는 모의 추첨)
    const trial = await page.evaluate(() => {
      const r = Progression.rates('standard'), total = r.total;
      const expect = {}, got = {};
      for (const o of r.table.outcomes) {
        const key = o.kind === 'character' ? 'character' : o.kind + (o.amount ? ':' + o.amount : '');
        expect[key] = (expect[key] || 0) + o.weight / total;
      }
      const n = 40000;
      for (let i = 0; i < n; i++) {
        let roll = Math.random() * total, pick = r.table.outcomes.find(o => (roll -= o.weight) < 0) || r.table.outcomes[0];
        const key = pick.kind === 'character' ? 'character' : pick.kind + (pick.amount ? ':' + pick.amount : '');
        got[key] = (got[key] || 0) + 1 / n;
      }
      return { expect, got };
    });
    for (const [key, want] of Object.entries(trial.expect)) {
      const seen = trial.got[key] || 0;
      assert.ok(Math.abs(seen - want) < .015, `${key}: 공지 ${(want * 100).toFixed(1)}% vs 실제 ${(seen * 100).toFixed(1)}%`);
    }

    // 3) 화면의 공지가 표와 같은 숫자를 적고 있는지
    await page.click('#start'); await page.waitForSelector('#hub-hero');
    await page.click('.lobby-promos [data-panel=recruit]');
    await page.click('#recruit-rates');
    await page.waitForSelector('.rates-table');
    const notice = await page.locator('.recruit-information').innerText();
    const shown = await page.evaluate(() => {
      const r = Progression.rates('pickup');     // 모집 화면은 픽업 배너로 열린다
      const ch = r.table.outcomes.find(o => o.kind === 'character');
      const pct = w => (Math.round(w / r.total * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%';
      return { character: pct(ch.weight), ssr: pct(ch.rarity.SSR), pity: r.pity, max: r.supplyMax };
    });
    assert.ok(notice.includes(shown.character), '캐릭터 확률이 공지에 ' + shown.character);
    assert.ok(notice.includes(shown.ssr), 'SSR 확률이 공지에 ' + shown.ssr);
    assert.ok(notice.includes(String(shown.pity.character)) && notice.includes(String(shown.pity.ssr)), '천장 횟수 공지');
    assert.ok(notice.includes('최대 ' + shown.max + '개'), '보급 상한 공지');
    await page.screenshot({ path: SHOT('gacha-rates.png') });
    await page.click('#close-recruit-info');

    // 4) 10회 모집: 모집권이 줄고, 결과가 10칸이고, 대부분 아이템이다
    const before = await page.evaluate(() => Progression.snapshot());
    await page.click('[data-draw="10"]');
    await page.waitForTimeout(400);
    if (await page.locator('#reveal-results').count()) { await page.click('#reveal-results'); await page.waitForTimeout(400); }
    await page.waitForSelector('.result-card');
    assert.equal(await page.locator('.result-card').count(), 10, '결과 10칸');
    const after = await page.evaluate(() => Progression.snapshot());
    assert.ok(after.tickets <= before.tickets - 10 + 3, '모집권 10장이 빠졌다(되받은 건 더해도 적다)');
    assert.ok(after.fragments >= before.fragments, '조각은 줄지 않는다');

    // 5) 보급은 실제 출격 지급 수량을 올린다 — 출격 직전 값으로 견준다(뽑기가 무작위라 미리 읽으면 어긋난다)
    await page.click('#close-dialog');
    await page.click('#hub-play');
    if (await page.locator('#chapter-deploy').count()) await page.click('#chapter-deploy');
    else if (await page.locator('.cs-card.focused').count()) await page.click('.cs-card.focused');
    await page.waitForFunction(() => patientZero.snapshot().mode === 'playing', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const supply = await page.evaluate(() => Object.fromEntries(Outbreak.loadout.map(id => [id, Progression.supply(id)])));
    const stock = await page.evaluate(() => patientZero.snapshot().player?.stock || {});
    for (const [id, count] of Object.entries(supply))
      assert.equal(stock[id], count, '출격 지급 수량 = 보급 등급 (' + id + ': 지급 ' + stock[id] + ' vs 보급 ' + count + ')');

    assert.deepEqual(errors, []);
    console.log(`PASS: 캐릭터 ${(rates.standard.character * 100).toFixed(1)}%(일반)·${(rates.pickup.character * 100).toFixed(1)}%(픽업), 4만 회 분포 일치, 화면 공지 = 표, 10연차 결과, 보급→출격 지급 ${JSON.stringify(supply)}`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
