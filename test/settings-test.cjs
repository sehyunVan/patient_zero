// 설정 — 다섯 탭이 다 뜨고, 스위치 하나하나가 실제로 무언가를 바꾸고, 새로고침해도 남는지.
// 꾸미기용 항목이 끼어들면 여기서 걸린다(모든 항목에 검사가 있다).
const SHOT = n => require('path').join(__dirname, '../shots', n);
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const open = async tab => { await page.click('.hub-nav [data-panel=settings]'); if (tab) await page.click(`[data-tab=${tab}]`); };
    const settings = () => page.evaluate(() => Settings.snapshot());

    await page.goto(URL);
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start'); await page.waitForSelector('#hub-hero');

    // 1) 다섯 탭이 전부 있고 내용이 바뀐다
    await open();
    assert.equal(await page.locator('.settings-tabs button').count(), 5, '탭 다섯');
    const seen = [];
    for (const [tab, must] of [['game', '화면 모드'], ['graphic', '화면 흔들림'], ['sound', '효과음'], ['lang', '언어'], ['account', '저장 위치']]) {
      await page.click(`[data-tab=${tab}]`);
      const text = await page.locator('.settings-body').innerText();
      assert.ok(text.includes(must), tab + ' 탭에 ' + must);
      seen.push(tab);
    }
    await page.click('[data-tab=game]');
    await page.screenshot({ path: SHOT('settings-game.png') });

    // 2) 게임 탭 — 화질은 그리는 배율을, 진동·알림은 저장값을 바꾼다
    const dprOf = () => page.evaluate(() => Settings.dpr());
    await page.click('[data-set=quality][data-value=low]');
    assert.equal(await dprOf(), 1, '낮음 = ×1');
    await page.click('[data-set=quality][data-value=high]');
    // 기기 배율이 1인 환경(헤드리스)도 있으므로 단계 사이의 관계로 본다
    const high = await dprOf();
    assert.equal(high, await page.evaluate(() => Math.min(devicePixelRatio || 1, 2)), '높음 = 기기 배율까지');
    await page.click('[data-set=quality][data-value=normal]');
    assert.ok(await dprOf() <= high, '보통 ≤ 높음');
    await page.click('[data-set=quality][data-value=high]');
    const canvasDpr = await page.evaluate(() => {
      const c = document.getElementById('game');
      return Math.round(c.width / c.getBoundingClientRect().width * 10) / 10;
    });
    assert.equal(canvasDpr, await dprOf(), '캔버스가 실제로 그 배율로 그려진다');

    for (const key of ['vibrate', 'notify']) {
      const was = (await settings())[key];
      await page.click(`[data-toggle=${key}]`);
      assert.equal((await settings())[key], !was, key + ' 꺼짐/켜짐');
    }

    // 3) 그래픽 탭 — 미니맵은 화면에서 사라지고, 파티클·흔들림은 값이 바뀐다
    await page.click('[data-tab=graphic]');
    await page.click('[data-toggle=minimap]');
    assert.equal((await settings()).minimap, false, '미니맵 끔');
    assert.equal(await page.locator('.minimap-frame').isVisible(), false, '미니맵이 실제로 숨는다');
    await page.click('[data-set=particles][data-value=few]');
    assert.ok(await page.evaluate(() => Settings.particles()) < 1, '파티클 적게');
    await page.click('[data-toggle=shake]');
    assert.equal((await settings()).shake, false, '흔들림 끔');

    // 4) 사운드 탭 — 효과음을 끄면 음량이 0, 켜면 단계별로 달라진다
    await page.click('[data-tab=sound]');
    const volume = () => page.evaluate(() => Settings.volume());
    await page.click('[data-set=volume][data-value=loud]');
    const loud = await volume();
    await page.click('[data-set=volume][data-value=quiet]');
    assert.ok(await volume() < loud, '작게 < 크게');
    await page.click('[data-toggle=sound]');
    assert.equal(await volume(), 0, '효과음 끄면 0');
    await page.click('[data-toggle=sound]');
    await page.click('#settings-test-sound');   // 소리 확인이 터지지 않는다

    // 5) 계정 탭 — 지금 저장 상태를 실제 값으로 보여 준다
    await page.click('[data-tab=account]');
    const account = await page.locator('.settings-body').innerText();
    const state = await page.evaluate(() => Progression.snapshot());
    assert.ok(account.includes('캐릭터 ' + state.owned.length + '명'), '보유 캐릭터 수가 실제 값');
    assert.ok(account.includes('모집권 ' + state.tickets + '장'), '모집권이 실제 값');
    assert.ok(await page.locator('#settings-reset').count() === 1, '초기화 버튼');
    await page.screenshot({ path: SHOT('settings-account.png') });
    await page.click('#close-dialog');

    // 6) 새로고침해도 남는다
    const before = await settings();
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    const after = await settings();
    for (const key of ['quality', 'vibrate', 'notify', 'minimap', 'particles', 'shake', 'volume', 'sound'])
      assert.equal(after[key], before[key], key + ' 유지');
    await page.click('#start'); await page.waitForSelector('#hub-hero');
    assert.equal(await page.locator('.minimap-frame').isVisible(), false, '미니맵 끔이 새로고침 뒤에도');

    assert.deepEqual(errors, []);
    console.log('PASS: 탭 ' + seen.join('·') + ', 화질→캔버스 배율, 진동·알림·흔들림·미니맵·파티클·효과음·음량 반영, 계정 실제 값, 새로고침 유지');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
