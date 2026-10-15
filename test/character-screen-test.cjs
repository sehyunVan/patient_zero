// 캐릭터 선택 화면(2026-10-14 시안)과 랭킹 두 탭.
// 얹은 조각(로마자·대사·CV·탭·NEW·화살표)은 progression.js 가 화면을 다시 그릴 때마다
// 사라지기 쉽다 — 다른 캐릭터를 누른 뒤에도 남아 있는지까지 본다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('path');
const SHOT = n => path.join(__dirname, '../shots', n);
const URL = process.env.TEST_URL || 'http://localhost:4177';
const OWNED = ['zero', 'kai', 'sera', 'eve', 'rea', 'iris'];

const seed = () => localStorage.setItem('patient-zero-progression-v1', JSON.stringify({
  owned: ['zero', 'kai', 'sera', 'eve', 'rea', 'iris'], selected: 'zero', tickets: 5, fragments: 0,
  pity: 0, draws: 0, daily: { day: 'x', infections: 0, runs: 0, draws: 0, claimed: [] },
}));

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1404, height: 790 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(seed);
    await p.addInitScript(() => localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: 3, progress: { cleared: [1, 2], best: { 1: 34, 2: 55, 3: 120 } } })));
    await p.goto(URL + '/?desktop');
    await p.click('#start'); await p.waitForTimeout(1000);

    // ── 캐릭터 선택 ──
    await p.click('.main-character'); await p.waitForTimeout(1200);
    const shown = async () => p.evaluate(() => ({
      roman: document.querySelector('.ch-roman')?.textContent,
      name: document.querySelector('.character-keyart-caption h3')?.textContent,
      quote: document.querySelector('.ch-quote')?.textContent.trim(),
      cv: document.querySelector('.ch-cv span')?.textContent,
      tabs: [...document.querySelectorAll('.ch-tabs button')].map(t => t.textContent),
      pick: document.querySelector('[data-select]')?.dataset.select,
    }));
    let s = await shown();
    assert.deepEqual(s.tabs, ['상세 정보', '스킬', '스토리']);
    assert.equal(s.cv, 'CV. 미정');
    assert.equal(s.roman, s.pick.toUpperCase(), '로마자 이름이 id 와 안 맞는다');
    assert.ok(s.quote && s.quote.length > 2, '대사 인용이 비었다');
    assert.ok(await p.locator('.ch-next').isVisible(), '넘김 화살표가 없다');
    await p.screenshot({ path: SHOT('character-detail.png') });

    // 탭 세 개가 저마다 다른 것을 보여 준다
    await p.click('[data-ch=skill]'); await p.waitForTimeout(250);
    assert.ok(await p.locator('[data-pane=skill]').isVisible());
    assert.ok(await p.locator('[data-pane=detail]').isHidden());
    assert.equal(await p.locator('.ch-numbers > div').count(), 4);
    await p.click('[data-ch=story]'); await p.waitForTimeout(250);
    assert.ok(await p.locator('[data-pane=story]').isVisible());
    // 위에 인용한 첫 대사를 스토리에서 또 쓰지 않는다
    const story = await p.evaluate(() => [...document.querySelectorAll('.ch-line')].map(e => e.textContent.trim()));
    assert.ok(!story.includes((await shown()).quote), '스토리가 인용과 같은 줄을 또 보여 준다');

    // 레벨은 적지 않는다 — 이 게임에 캐릭터 레벨이 없다
    const txt = await p.locator('.character-card-grid').innerText();
    assert.ok(!/Lv\./i.test(txt), '없는 레벨을 적고 있다');

    // 한정 모집 캐릭터에는 특별 모집 딱지
    const flags = await p.evaluate(() => [...document.querySelectorAll('.portrait-card[data-agent]')]
      .map(c => [c.dataset.agent, c.querySelector('.ch-flag')?.textContent || null]));
    const rea = flags.find(([id]) => id === 'rea');
    assert.equal(rea && rea[1], '특별 모집');
    // 가진 적 없는 캐릭터에는 NEW 가 붙지 않는다
    for (const [id, flag] of flags) {
      if (flag === 'NEW') assert.ok(OWNED.includes(id), `안 가진 ${id} 에 NEW 가 붙었다`);
    }

    // 다른 캐릭터를 눌러 다시 그려도 얹은 것이 그대로 있어야 한다
    await p.click('[data-agent=eve]'); await p.waitForTimeout(700);
    s = await shown();
    assert.equal(s.name, '이브');
    assert.equal(s.roman, 'EVE');
    assert.deepEqual(s.tabs, ['상세 정보', '스킬', '스토리'], '다시 그린 뒤 탭이 사라졌다');
    assert.ok(await p.locator('.ch-next').isVisible(), '다시 그린 뒤 화살표가 사라졌다');
    await p.click('#close-dialog');

    // ── 랭킹 두 탭 ──
    await p.click('.hub-nav [data-panel=record]'); await p.waitForTimeout(500);
    await p.click('#record-open'); await p.waitForTimeout(300);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.rank-tabs button')].map(t => t.textContent)),
      ['내 최고 기록', '유저 순위']);
    assert.ok(await p.locator('[data-pane=mine]').isVisible());
    await p.click('[data-rank=board]'); await p.waitForTimeout(600);
    assert.ok(await p.locator('[data-pane=board]').isVisible());
    assert.ok(await p.locator('[data-pane=mine]').isHidden());
    // 챕터와 무관하게 가장 높은 기록 하나로 줄을 세운다 (여기선 CH3 의 120)
    const row = await p.locator('.rank-row').first().innerText();
    assert.match(row, /120/);
    assert.match(row, /CH 3/);
    assert.equal(await p.locator('.rank-row').count(), 1, '없는 상대를 지어내 채웠다');
    await p.screenshot({ path: SHOT('ranking-board.png') });

    assert.deepEqual(errors, []);

    // ── 폰 가로에서도 왼쪽 칸이 겹치지 않는다 ──
    await p.click('#close-dialog');
    await p.setViewportSize({ width: 750, height: 335 });
    await p.click('.main-character'); await p.waitForTimeout(1100);
    const overlap = await p.evaluate(() => {
      const cap = document.querySelector('.character-keyart-caption').getBoundingClientRect();
      const first = document.querySelector('.ch-tabs').getBoundingClientRect();
      return cap.bottom - first.top;
    });
    assert.ok(overlap <= 2, `이름표와 탭이 ${Math.round(overlap)}px 겹친다`);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await p.screenshot({ path: SHOT('character-detail-small.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: 로마자·대사·CV·탭 셋, 스킬 수치 4칸, 인용 중복 없음, 레벨 안 씀, 특별 모집/NEW, 다시 그려도 유지, 랭킹 두 탭(최고 기록 하나로), 폰 가로 겹침 없음; 오류 없음');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
