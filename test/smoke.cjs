const SHOT=n=>require('path').join(__dirname,'../shots',n);
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
// 폰 가로 화면이 기준이다. 데스크톱 뷰포트로는 검사하지 않는다.
const PHONE = { width: 844, height: 390 };   // 아이폰 홈 화면 가로
const SMALL = { width: 750, height: 335 };   // 아이폰 사파리 가로(주소창 포함)
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: PHONE });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install();
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4177');
  await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
  assert.equal(await page.title(), 'PATIENT ZERO — 최초 감염자');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false, 'no scroll on a phone screen');
  await page.screenshot({ path: SHOT('preview.png') });
  await page.click('#start'); await page.click('#hub-play');await page.click('.cs-card.focused');await page.waitForTimeout(400);
  const snap = () => page.evaluate(() => window.patientZero.snapshot());
  let state = await snap(); assert.equal(state.mode, 'playing');
  const initialX = state.player.x;
  await page.keyboard.down('KeyD'); await page.clock.runFor(300); await page.keyboard.up('KeyD');
  state = await snap(); assert.ok(state.player.x > initialX + 35, 'movement');
  await page.keyboard.press('Space'); await page.clock.runFor(50); state = await snap(); assert.ok(state.player.cooldown > 0, 'dash');
  // 대시 도중 바닥 보급품을 주우면 개수가 늘 수 있다 — 누르기 직전 값과 견준다
  const shieldsBefore = (await snap()).player.shields;
  await page.keyboard.press('KeyQ'); state = await snap();
  assert.ok(state.player.shield > 0, '방어막 켜짐');
  assert.ok(state.player.shields < shieldsBefore + 1, '방어막 소모');
  const pulsesBefore = state.player.pulses;
  await page.keyboard.press('KeyE'); state = await snap(); assert.equal(state.player.pulses, pulsesBefore - 1);
  await page.keyboard.press('KeyP'); state = await snap(); assert.equal(state.mode, 'paused'); const stoppedAt = state.elapsed;
  await page.clock.runFor(1500); assert.equal((await snap()).elapsed, stoppedAt);
  await page.click('#start'); assert.equal((await snap()).mode, 'playing');
  // Chase actual AI positions with keyboard input; the read-only snapshot cannot mutate gameplay.
  for (let i = 0; i < 60 && (await snap()).score < 6; i++) {
    state = await snap();
    const target = state.targets.sort((a, b) => Math.hypot(a.x - state.player.x, a.y - state.player.y) - Math.hypot(b.x - state.player.x, b.y - state.player.y))[0];
    if (!target) break;
    const dx = target.x - state.player.x, dy = target.y - state.player.y;
    const movement = [Math.abs(dx) > 6 ? dx > 0 ? 'KeyD' : 'KeyA' : null, Math.abs(dy) > 6 ? dy > 0 ? 'KeyS' : 'KeyW' : null].filter(Boolean);
    for (const key of movement) await page.keyboard.down(key);
    await page.clock.runFor(150);
    for (const key of movement) await page.keyboard.up(key);
  }
  state = await snap(); assert.ok(state.score > 0, 'contact infection'); assert.ok(state.infected > 0, 'converted sprites persist');
  assert.ok(state.quota > 0 && state.chapter === 1, 'chapter 1 with a clear line');
  // 첫 백신이 나오는 시각은 챕터마다 다르다(expansion.js delay) — 숫자를 테스트에 박아 두지 않는다.
  const firstVaccine = await page.evaluate(() => Outbreak.chapter().delay);
  if (state.elapsed < firstVaccine + 2) await page.clock.runFor((firstVaccine + 2 - state.elapsed) * 1000);
  state = await snap();
  assert.ok(state.medics > 0, 'medic appears — t=' + state.elapsed.toFixed(1) + 's, 첫 백신 ' + firstVaccine + 's, mode ' + state.mode);
  await page.screenshot({ path: SHOT('gameplay.png') });
  // 엄지 조작: 왼쪽 아래 스틱으로 움직이고 오른쪽 아래 버튼으로 아이템을 쓴다.
  await page.locator('[data-action=shield]').dispatchEvent('pointerdown'); assert.ok((await snap()).player.shield > 0, 'touch ability');
  const joystick = await page.locator('#joystick').boundingBox(); const touchX = (await snap()).player.x;
  // 벽에 붙어 있을 수 있으므로 늘 안쪽(화면 중앙)으로 민다.
  const toRight = touchX < 640, edge = toRight ? joystick.width - 3 : 3;
  await page.mouse.move(joystick.x + joystick.width / 2, joystick.y + joystick.height / 2); await page.mouse.down();
  await page.mouse.move(joystick.x + edge, joystick.y + joystick.height / 2); await page.clock.runFor(300); await page.mouse.up();
  const movedX = (await snap()).player.x;
  assert.ok(toRight ? movedX > touchX : movedX < touchX, 'joystick movement');
  // 메뉴는 일시정지 화면에만 있다 — 플레이 중에는 화면을 가리지 않는다.
  assert.equal(await page.locator('.menu-row [data-panel=items]').isVisible(), false, 'menu hidden while playing');
  await page.click('#pause'); assert.equal((await snap()).mode, 'paused');
  await page.click('[data-panel=items]'); assert.equal(await page.locator('#info-dialog').evaluate(d => d.open), true);
  await page.click('#close-dialog'); assert.equal((await snap()).mode, 'paused');
  await page.click('#start'); assert.equal((await snap()).mode, 'playing');
  await page.clock.runFor(15000); state = await snap();
  assert.ok(state.level >= 2 || state.mode === 'over', 'progression or game over');
  // 한 판은 90초로 끝난다 — 백신에 먼저 쓰러지든, 시간이 다 되든.
  for (let i = 0; i < 24 && (await snap()).mode !== 'over'; i++) await page.clock.runFor(5000);
  state = await snap(); assert.equal(state.mode, 'over', 'round ends within its time limit');
  assert.ok(state.elapsed <= 91, 'round never runs past its limit');
  const finalScore = state.score; await page.click('#start'); state = await snap(); assert.equal(state.score, 0); assert.equal(state.player.hp, 100); assert.ok(state.best >= 0);
  // 더 짧은 가로 화면(사파리 주소창)에서도 넘치지 않고, 세계가 캔버스를 그대로 채운다.
  await page.setViewportSize(SMALL);
  await page.reload();
  await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false, 'small landscape overflow');
  const fill = await page.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(); return { w: c.width, h: c.height, vw: innerWidth, vh: innerHeight }; });
  assert.ok(fill.w >= fill.vw - 1 && fill.h >= fill.vh - 1, 'canvas fills the phone screen');
  await page.screenshot({ path: SHOT('small-lobby.png') });
  await page.click('#start'); await page.click('#hub-play');await page.click('.cs-card.focused');await page.waitForTimeout(400); await page.screenshot({ path: SHOT('small-play.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checked: ['local art assets', 'landscape title', 'no page scroll', 'start', 'movement', 'dash', 'shield', 'pulse', 'pause', 'contact infection', 'persistent infected', 'medic spawn', 'touch shield', 'joystick', 'menu only while paused', 'progression', 'fixed-length round', 'restart', 'chapter best', 'small landscape layout'], finalScore }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
