// 2026-10-14 시안 넷: 왼쪽 플레이 칸 · 하단 탭 강조 · PLAY 배너 · 기록 카드 · 생존 가이드.
// 보이는 것만 재는 게 아니라 "눌러서 뭔가 하는지"까지 본다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('path');
const SHOT = n => path.join(__dirname, '../shots', n);
const URL = process.env.TEST_URL || 'http://localhost:4177';

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1404, height: 790 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: 3, progress: { cleared: [1, 2], best: { 1: 34, 2: 55, 3: 120 } } })));
    await p.goto(URL + '/?desktop');
    await p.click('#start'); await p.waitForTimeout(1200);

    // PLAY 배너 — 구운 글씨, 캐릭터, 방사능 표시가 다 붙어 있다
    for (const q of ['#hub-play .play-word', '#hub-play .play-face', '#hub-play .play-mark'])
      assert.ok(await p.locator(q).isVisible(), q);
    const art = await p.evaluate(() => [...document.querySelectorAll('#hub-play img')].map(i => [i.getAttribute('src'), i.complete && i.naturalWidth > 0]));
    for (const [src, ok] of art) assert.ok(ok, '그림이 안 붙었다: ' + src);
    assert.equal(await p.locator('#hub-play span').count(), 0, 'PLAY 배너에 글귀가 남아 있다');

    // 지금 보고 있는 칸은 붉게 — 왼쪽 메뉴와 하단 탭 둘 다
    const red = await p.evaluate(() => {
      const hex = el => getComputedStyle(el).color;
      return { nav: hex(document.querySelector('.hub-nav .active svg')), bottom: hex(document.querySelector('.lobby-bottom .active')) };
    });
    for (const [k, v] of Object.entries(red)) {
      const [r, g, bl] = v.match(/\d+/g).map(Number);
      assert.ok(r > 180 && g < 90 && bl < 110, `${k} 강조색이 붉지 않다: ${v}`);
    }
    // 오른쪽 칸은 제 폭을 다 쓰고 화면 오른쪽에 붙는다 (flex 시절 justify-content 가 남아 2/3 만 쓰던 자리)
    const rightEdge = await p.evaluate(() => {
      const host = document.querySelector('.hub-right').getBoundingClientRect();
      const kids = [...document.querySelectorAll('.lobby-chapter-card,#hub-play')].map(e => e.getBoundingClientRect());
      return { host: Math.round(innerWidth - host.right), kids: kids.map(k => Math.round(host.right - k.right)) };
    });
    assert.ok(rightEdge.host <= 2, `오른쪽 칸이 화면 끝에서 ${rightEdge.host}px 떨어져 있다`);
    for (const gap of rightEdge.kids) assert.ok(gap <= 2, `칸 안쪽 카드가 ${gap}px 덜 찼다`);
    // 대표 캐릭터 칸 — 판때기 없이 이름과 표식만. 고른 캐릭터를 따라간다.
    const mc = await p.evaluate(() => {
      const host = document.querySelector('.main-character'), cs = getComputedStyle(host);
      const id = Progression.snapshot().selected, c = Cast.by[id];
      return {
        name: host.querySelector('.mc-name').textContent, who: c.name,
        stars: host.querySelector('.mc-stars').textContent.length,
        want: { SSR: 5, SR: 4, R: 3 }[c.rarity],
        rarity: host.querySelector('.mc-rarity').textContent, rank: c.rarity,
        bg: cs.backgroundColor, border: cs.borderTopWidth,
        art: host.querySelectorAll('img').length,
        label: host.querySelector('.mc-go').textContent.trim(),
      };
    });
    assert.equal(mc.name, mc.who);
    assert.equal(mc.stars, mc.want, `별이 등급과 안 맞는다: ${mc.stars} vs ${mc.rank}`);
    assert.equal(mc.rarity, mc.rank);
    assert.ok(/rgba\(0, 0, 0, 0\)|transparent/.test(mc.bg), `바탕이 안 비었다: ${mc.bg}`);
    assert.equal(mc.border, '0px', '박스 테두리가 남아 있다');
    assert.equal(mc.art, 0, '바탕 캐릭터 그림이 남아 있다');
    assert.ok(mc.label.startsWith('캐릭터 선택'));
    await p.screenshot({ path: SHOT('lobby-skin.png') });

    // 기록 탭 — 최고 기록 한 장이 먼저, 자세한 기록은 접혀 있다
    await p.click('.hub-nav [data-panel=record]'); await p.waitForTimeout(400);
    assert.ok(await p.locator('.record-hero').isVisible());
    assert.equal(await p.locator('.record-hero b').innerText(), '120');   // 챕터 중 가장 높은 기록
    assert.ok(await p.locator('#record-detail').isHidden(), '자세한 기록이 처음부터 펼쳐져 있다');
    await p.click('#record-open');
    assert.ok(await p.locator('#record-detail').isVisible());
    assert.equal(await p.locator('#record-open').innerText(), '접기');
    await p.screenshot({ path: SHOT('lobby-record.png') });
    await p.click('#close-dialog');

    // 생존 가이드 — 아이템이 하나도 빠지지 않았는지 세고, 넘겨 본다
    await p.click('#hub-play'); await p.waitForTimeout(1100);
    await p.click('.cs-card.focused');await p.waitForTimeout(400); await p.waitForTimeout(500);
    await p.click('#pause'); await p.click('[data-panel=items]'); await p.waitForTimeout(400);
    const items = await p.locator('.guide-card').count();
    const expect = await p.evaluate(() => 4 + Outbreak.skills.length);   // 판에서 쓰는 넷 + 전술 아이템 전부
    assert.equal(items, expect);
    assert.equal(await p.locator('.guide-dots button').count(), expect);
    const names = await p.evaluate(() => [...document.querySelectorAll('.guide-card h3')].map(h => h.textContent));
    for (const skill of await p.evaluate(() => Outbreak.skills.map(s => s.name)))
      assert.ok(names.includes(skill), '가이드에 빠진 아이템: ' + skill);
    const broken = await p.evaluate(() => [...document.querySelectorAll('.guide-card img')].filter(i => i.complete && !i.naturalWidth).length);
    assert.equal(broken, 0);
    assert.equal(await p.locator('.guide-card.on').getAttribute('data-guide'), '0');
    assert.ok(await p.locator('.guide-arrow.prev').isDisabled());
    for (let i = 0; i < 4; i++) await p.click('.guide-arrow.next');
    await p.waitForTimeout(500);
    assert.equal(await p.locator('.guide-card.on').getAttribute('data-guide'), '4');
    assert.equal(await p.locator('.guide-dots button.on').getAttribute('data-dot'), '4');
    await p.click('[data-dot="7"]'); await p.waitForTimeout(400);
    assert.equal(await p.locator('.guide-card.on').getAttribute('data-guide'), '7');
    assert.ok(await p.locator('.guide-arrow.next').isDisabled());
    await p.screenshot({ path: SHOT('lobby-guide.png') });
    await p.click('#close-dialog');

    // 폰 가로에서도 네 가지가 화면 안에 있어야 한다
    await p.click('#return-lobby'); await p.setViewportSize({ width: 750, height: 335 }); await p.waitForTimeout(600);
    for (const q of ['#hub-play', '.hub-nav .active', '.lobby-bottom .active']) {
      const r = await p.locator(q).boundingBox();
      assert.ok(r.x >= -1 && r.y >= -1 && r.x + r.width <= 751 && r.y + r.height <= 336, `${q}: ${JSON.stringify(r)}`);
    }
    await p.screenshot({ path: SHOT('lobby-skin-small.png') });
    assert.deepEqual(errors, []);
    console.log(`PASS: PLAY 배너(글씨·표시), 강조색 2곳, 오른쪽 칸 끝맞춤, 대표 캐릭터 칸(바탕 없음), 기록 카드 접기/펼치기, 생존 가이드 ${items}개·화살표·점, 폰 가로 배치; 오류 없음`);
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
