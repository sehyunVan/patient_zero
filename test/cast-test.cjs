// 캐스트 20명 · 구역 8개 · 그림 아이콘 — 데이터와 그림이 어긋나지 않는지 본다.
// 빠진 그림은 폰에서 빈 칸으로만 보이고 에러를 안 내기 때문에, 404 를 직접 센다.
const SHOT = n => require('path').join(__dirname, '../shots', n);
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
    await page.goto(URL);
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);

    // 1) 데이터: 사람마다 SD·LD·얼굴이 다 있어야 한다
    const art = await page.evaluate(async () => {
      const bad = [];
      for (const c of Cast.roster) for (const url of [Cast.sd(c.id), Cast.ld(c.id), Cast.face(c.id)]) {
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) bad.push(c.id + ' ' + url + ' ' + r.status);
      }
      return { count: Cast.roster.length, lines: Cast.roster.every(c => c.lines.length >= 3), bad };
    });
    assert.deepEqual(art.bad, [], '캐릭터 그림 누락');
    assert.ok(art.count >= 20, '캐스트 ' + art.count + '명');
    assert.ok(art.lines, '모두 대사 3줄 이상');

    // 2) 구역: 챕터마다 바닥판이 있고, 그 그림이 실제로 있어야 한다
    const maps = await page.evaluate(async () => {
      const bad = [];
      for (const m of Outbreak.maps) { const r = await fetch(m.art); if (!r.ok) bad.push(m.id + ' ' + r.status); }
      return { maps: Outbreak.maps.length, chapters: Outbreak.chapters.length,
               orphan: Outbreak.chapters.filter(c => !Outbreak.mapOf(c)).map(c => c.n), bad };
    });
    assert.deepEqual(maps.bad, [], '구역 그림 누락');
    assert.deepEqual(maps.orphan, [], '구역 없는 챕터');
    assert.ok(maps.maps >= 8, '구역 ' + maps.maps + '개');

    // 3) 아이콘: 아이템·스킬·재화가 전부 그림이어야 한다
    const icons = await page.evaluate(async () => {
      const ids = ['smoke', 'boost', 'heal', 'mine', 'shield', 'pulse', 'dash', 'ticket', 'fragment'];
      const bad = [];
      for (const id of ids) { const r = await fetch('assets/icons/' + id + '.webp'); if (!r.ok) bad.push(id + ' ' + r.status); }
      return bad;
    });
    assert.deepEqual(icons, [], '아이콘 누락');
    assert.ok(await page.locator('#dash img.icon-art').count() === 1, '대시 버튼이 그림');

    // 4) 로비: 고른 캐릭터가 서 있고, 누르면 그 아이의 대사가 뜬다
    await page.click('#start');
    await page.waitForSelector('#hub-hero-art');
    const first = await page.getAttribute('#hub-hero-art', 'src');
    assert.ok(first && (first.includes('/art/') || first.includes('-ld.webp')), '로비에 그 캐릭터 그림이 선다: ' + first);
    assert.equal(await page.locator('#hub-bubble').isVisible(), false, '처음엔 말풍선 없음');
    await page.click('#hub-hero');
    await page.waitForSelector('#hub-bubble:not([hidden])');
    const said = (await page.textContent('#hub-bubble-line')).trim();
    const owner = await page.evaluate(() => Progression.current().id);
    const lines = await page.evaluate(id => Cast.by[id].lines, owner);
    assert.ok(lines.includes(said), '대사가 그 캐릭터 것: ' + said);
    await page.screenshot({ path: SHOT('cast-lobby.png') });

    // 5) 캐릭터를 바꾸면 로비 그림도 바뀐다
    await page.click('[data-panel=characters]');
    await page.waitForSelector('[data-agent]');
    const other = await page.evaluate(() => Progression.snapshot().owned.find(id => id !== Progression.current().id));
    await page.click(`[data-agent="${other}"]`);
    await page.click(`[data-select="${other}"]`);
    await page.screenshot({ path: SHOT('cast-select.png') });
    await page.click('#close-dialog');
    await page.waitForFunction(id => { const s = document.getElementById('hub-hero-art').src; return s.includes('/art/' + id + '.') || s.includes(id + '-ld'); }, other);
    await page.click('#hub-hero');
    await page.waitForSelector('#hub-bubble:not([hidden])');
    const second = (await page.textContent('#hub-bubble-line')).trim();
    assert.ok((await page.evaluate(id => Cast.by[id].lines, other)).includes(second), '바뀐 캐릭터의 대사');

    // 6) 전투: 고른 캐릭터로 들어간다
    await page.click('#hub-play');await page.click('.cs-card.focused');await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => patientZero.snapshot().player.character.id), other, '고른 캐릭터로 출격');

    assert.deepEqual(errors, []);
    assert.deepEqual(missing, [], '404');
    console.log('PASS: ' + art.count + '명 캐스트 그림(SD·LD·얼굴), ' + maps.maps + '개 구역 바닥판, ' + maps.chapters + '챕터, 아이콘 9종, 로비 LD·대사, 캐릭터 교체, 출격 반영');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
