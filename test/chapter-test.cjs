// 챕터 흐름 검증: 통과선·해금·기록·감염자 행동·인파 공급·제한 시간.
// 90초 한 판을 실제로 돌리므로 다른 시험보다 느리다(3분 안팎). 순차로 돌릴 것.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const SHOT = n => require('path').join(__dirname, '../shots', n);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4177');
  await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
  const snap = () => page.evaluate(() => window.patientZero.snapshot());
  await page.click('#start'); await page.click('#hub-play');await page.click('.cs-card.focused');await page.waitForTimeout(400);
  // 흐름을 보는 시험이라 백신 피해는 꺼 둔다 — 가만히 서 있으면 25초쯤에 죽는다.
  await page.evaluate(() => window.patientZero.debugInvincible());
  let s = await snap();
  assert.equal(s.mode, 'playing');
  assert.equal(s.chapter, 1, '1 챕터로 시작');
  assert.ok(s.quota > 0, '통과선이 있다');

  // 1) 감염자는 남을 감염시키지 않는다 — 가만히 두면 인파 한가운데 있어도 점수가 늘지 않는다.
  await page.evaluate(() => window.patientZero.debugInfect(12));
  s = await snap();
  assert.equal(s.infected, 12, '12명이 감염자가 된다');
  const before = s.score;
  let coexisted = 0;
  for (let i = 1; i <= 8; i++) {
    await page.clock.runFor(1000);
    const t = await snap();
    assert.equal(t.score, before, `감염자 연쇄 없음 (${i}초째, 사람 ${t.humans}명 / 감염자 ${t.infected}명)`);
    if (t.infected > 0 && t.humans > 0) coexisted++;
  }
  assert.ok(coexisted >= 3, `감염자가 사람들 사이에 실제로 머물렀다 (${coexisted}초)`);

  // 2) 감염자는 결국 맵 밖으로 걸어 나가 사라진다.
  await page.clock.runFor(20000);
  assert.equal((await snap()).infected, 0, '감염자는 맵 밖으로 나간다');

  // 3) 인파는 계속 채워진다 — 전부 지워도 목표치로 되돌아온다.
  await page.evaluate(() => window.patientZero.debugInfect(999));
  assert.ok((await snap()).humans < 6, '일단 비웠다');
  await page.clock.runFor(6000);
  s = await snap();
  assert.ok(s.humans >= s.crowd * .7, `인파 재공급 ${s.humans}/${s.crowd}`);

  // 4) 통과선을 넘으면 그 자리에서 통과하고, 판은 계속된다(남은 시간은 기록용).
  await page.evaluate(() => window.patientZero.debugScore());
  s = await snap();
  assert.equal(s.cleared, true, '통과선 돌파 = 챕터 통과');
  assert.equal(s.mode, 'playing', '통과해도 남은 시간은 계속 흐른다');

  // 5) 제한 시간이 끝나면 판이 끝나고 다음 챕터가 열린다.
  for (let i = 0; i < 24 && (await snap()).mode !== 'over'; i++) await page.clock.runFor(5000);
  s = await snap();
  assert.equal(s.mode, 'over', '제한 시간 종료');
  assert.ok(s.elapsed <= 91, '판은 제한 시간을 넘기지 않는다');
  const progress = await page.evaluate(() => ({ cleared: [...Outbreak.progress.cleared], best: { ...Outbreak.progress.best }, selected: Outbreak.selected }));
  assert.ok(progress.cleared.includes(1), '1 챕터 통과 기록');
  assert.ok(progress.best[1] >= s.quota, '챕터 기록 저장');
  assert.equal(progress.selected, 2, '다음 챕터로 자동 이동');
  assert.equal(await page.evaluate(() => Outbreak.unlocked(2)), true, '2 챕터 해금');
  assert.equal(await page.evaluate(() => Outbreak.unlocked(3)), false, '3 챕터는 아직 잠김');
  await page.screenshot({ path: SHOT('chapter-clear.png') });

  // 6) 다음 챕터는 더 어렵고(백신) 동시에 더 풍족하다(인파).
  await page.click('#start');
  s = await snap();
  assert.equal(s.chapter, 2, '2 챕터로 출격');
  assert.ok(s.crowd > 34, `뒤 챕터일수록 인파가 많다 (${s.crowd})`);
  assert.ok(s.quota > 25, `뒤 챕터일수록 통과선이 높다 (${s.quota})`);

  // 7) 챕터 선택판: 잠긴 챕터는 누를 수 없다.
  await page.click('#pause'); await page.click('.menu-row [data-panel=maps]');
  assert.equal(await page.locator('.chapter-card[data-map="3"]').isDisabled(), true, '잠긴 챕터는 비활성');
  await page.screenshot({ path: SHOT('chapter-select.png') });
  await page.click('#close-dialog');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checked: ['챕터 1 시작', '감염자 비전염', '감염자 퇴장', '인파 재공급', '통과선 돌파', '제한 시간 종료', '기록 저장', '다음 챕터 해금', '난이도·공급 동반 상승', '잠긴 챕터 비활성'] }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
