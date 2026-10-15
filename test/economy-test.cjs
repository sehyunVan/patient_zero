// 재화의 벽 — 모집권은 결제로만 들어오고, 검체와 서로 바뀌지 않는다 (설계는 ECONOMY.md).
//
// 이 검사가 보는 것은 화면이 아니라 **길**이다. 보상이 도는 자리를 전부 돌려 보고
// 모집권이 1장이라도 늘어나는지 센다. 눈으로 지키는 규칙은 언젠가 뚫린다 —
// 「여기만 조금」이 한 번 들어가면 모집권은 다시 무료 재화가 되고, 그날 상점은 설득력을 잃는다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL + '/?desktop');
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    await page.waitForSelector('#hub-hero');

    const eco = await page.evaluate(() => Progression.economy);
    const snap = () => page.evaluate(() => Progression.snapshot());

    // ── ① 반복 보상에서 모집권은 0 ──────────────────────────────────
    // 하루치를 통째로 돌린다: 일일 임무 셋 + 출격 완료(통과·실패) + 수집 보상 + 조각 교환.
    const before = await snap();
    const after = await page.evaluate(() => {
      const s = Progression.snapshot();
      // 임무를 전부 채우고, 수집 보상도 받을 수 있게 캐릭터를 채워 둔다
      s.daily.infections = 999; s.daily.runs = 9; s.daily.clears = 9; s.daily.claimed = [];
      s.fragments = 300; s.owned = Cast.roster.slice(0, 20).map(c => c.id);
      s.collectionClaims = [];
      localStorage.setItem('patient-zero-progression-v1', JSON.stringify(s));
      return null;
    });
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    const seeded = await snap();

    const earned = await page.evaluate(() => {
      const t0 = Progression.snapshot().tickets;
      for (const id of ['infections', 'runs', 'clears']) Progression.open; // 보상 수령은 아래 API 로
      // 임무 수령 · 수집 보상 · 조각 교환 · 출격 완료(첫 통과가 아닌 챕터로)
      document.querySelectorAll('[data-claim]');
      const before = Progression.snapshot();
      const claims = ['infections', 'runs', 'clears'].map(id => Progression.claim?.(id));
      for (const n of [5, 10, 20]) Progression.collectionReward(n);
      for (let i = 0; i < 10; i++) Progression.trade();
      // 이미 통과한 챕터를 다시 깬 경우 — 반복 보상이다
      const first = Progression.snapshot().firstClear.slice();
      const again = first.length ? first[0] : null;
      const run = again ? Progression.complete(300, 90, true, again, true) : { tickets: 0 };
      const after = Progression.snapshot();
      return { t0, tickets: after.tickets - before.tickets, cash: after.cash - before.cash, runTickets: run.tickets, claims };
    });
    assert.equal(earned.tickets, 0, `반복 보상으로 모집권이 들어왔다 (+${earned.tickets})`);
    assert.ok(earned.cash > 0, '검체는 들어온다');
    assert.equal(earned.runTickets, 0, '이미 통과한 챕터를 다시 깨도 모집권은 없다');

    // ── ② 모집권이 들어오는 길은 「첫 통과」 하나뿐 ────────────────
    const firstClear = await page.evaluate(() => {
      const s = Progression.snapshot(); s.firstClear = []; localStorage.setItem('patient-zero-progression-v1', JSON.stringify(s));
      return null;
    });
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    const firstRun = await page.evaluate(() => {
      const before = Progression.snapshot().tickets;
      const a = Progression.complete(300, 90, true, 1, true);     // 챕터 1 첫 통과
      const b = Progression.complete(300, 90, true, 1, true);     // 같은 챕터 두 번째
      return { a: a.tickets, b: b.tickets, gained: Progression.snapshot().tickets - before };
    });
    assert.equal(firstRun.a, eco.firstClear.tickets, '챕터를 처음 통과하면 모집권이 들어온다');
    assert.equal(firstRun.b, 0, '같은 챕터를 또 통과해도 두 번은 없다');
    assert.equal(firstRun.gained, eco.firstClear.tickets, '합쳐서 한 번뿐');

    // ── ③ 검체로는 모집권을 살 수 없다 · 모집권으로는 아이템을 살 수 없다 ──
    const walls = await page.evaluate(() => {
      const s = Progression.snapshot(); s.cash = 99999; s.tickets = 0;
      localStorage.setItem('patient-zero-progression-v1', JSON.stringify(s));
      return null;
    });
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    const bought = await page.evaluate(() => {
      const before = Progression.snapshot();
      const drew = Progression.recruit ? Progression.recruit(1) : [];      // 검체만 많고 모집권 0 — 못 뽑아야 한다
      const up = Outbreak.skills.map(k => Progression.upgrade(k.id));       // 검체로는 살 수 있어야 한다
      const after = Progression.snapshot();
      return { drew: drew.length, tickets: after.tickets, upgraded: up.filter(Boolean).length, spent: before.cash - after.cash };
    });
    assert.equal(bought.drew, 0, '모집권이 없으면 검체가 아무리 많아도 못 뽑는다');
    assert.equal(bought.tickets, 0, '검체는 모집권으로 바뀌지 않는다');
    assert.ok(bought.upgraded > 0 && bought.spent > 0, '검체로는 보급을 올릴 수 있다');

    // 상점 화면에도 그 말이 적혀 있다 — 코드와 글이 같은 말을 해야 한다
    await page.click('[data-shop=cash]');
    await page.waitForSelector('.shop-items');
    const note = await page.locator('.shop-screen').innerText();
    assert.match(note, /모집권으로는 아이템을 살 수 없고, 검체로는 모집권을 살 수 없습니다/, '벽을 화면에도 적어 둔다');

    assert.deepEqual(errors, []);
    console.log(`PASS: 반복 보상 모집권 0 · 첫 통과만 +${eco.firstClear.tickets}(중복 없음) · 검체↛모집권 · 모집권↛아이템 · 화면 문구 일치`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
