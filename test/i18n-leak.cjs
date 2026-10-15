/* 번역 누수 — 외국어로 켜 놓고 화면을 돌며 「아직 한국어인 글자」를 전부 잡는다.
   실행: node test/i18n-leak.cjs [en|ja]
   출처: subway-rpg/poc/tests/i18n-leak.cjs — 거기서 배운 두 갈래를 그대로 가른다.
     ① 조립된 문장 — 런타임에 이어 붙여 어떤 카탈로그 키와도 안 맞는다(조각만 번역된다).
        고치는 길은 조각을 합치지 않는 것이다. 카탈로그에 더해도 영영 안 맞는다.
     ② 카탈로그에 그 문장이 **통째로 있는데도** 안 바뀐 것 — 번역기가 거기까지 못 간 것이다(범위·타이밍).
   화면마다 상한(BUDGET)으로 잠근다. 0 이 목표이고, 늘어나면 실패한다 — 내릴 때만 고친다. */
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const LANG = process.argv[2] || 'en';
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';

/* 화면마다 허용 상한 — 올리지 말 것 */
const BUDGET = { title: 0, lobby: 0, chapters: 0, characters: 0, recruit: 0, settings: 0, shop: 0, profile: 0, play: 0 };

const SCAN = `(() => {
  const KO = /[가-힣]/, out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement; if (!el) continue;
    const tag = el.tagName; if (tag === 'SCRIPT' || tag === 'STYLE') continue;
    const t = (n.nodeValue || '').trim(); if (!t || !KO.test(t)) continue;
    if (!el.getClientRects().length) continue;             // 안 보이는 건 세지 않는다
    const whole = typeof Tx === 'function' ? Tx(t) !== t : false;   // 통째로 카탈로그에 있나
    out.push({ t: t.slice(0, 70), host: ((el.closest && el.closest('[id],[class]')) || {}).id || tag, whole });
  }
  return out;
})()`;

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.evaluate(l => setLang(l), LANG);
    await page.waitForTimeout(400);

    const found = {};
    const look = async name => {
      await page.waitForTimeout(320);
      found[name] = await page.evaluate(SCAN);
    };
    const shut = async () => { await page.evaluate(() => document.getElementById('info-dialog')?.close()); await page.waitForTimeout(200); };

    await look('title');
    await page.click('#start'); await page.waitForSelector('#hub-hero');
    await look('lobby');

    await page.click('.lobby-bottom [data-panel=characters]'); await look('characters'); await shut();
    await page.click('.lobby-promos [data-panel=recruit]'); await look('recruit'); await shut();
    await page.click('.hub-nav [data-panel=settings]'); await look('settings'); await shut();
    await page.click('.wallet-plus'); await look('shop'); await shut();
    await page.click('.player-badge'); await look('profile'); await shut();
    await page.click('#hub-play'); await page.waitForTimeout(500); await look('chapters');
    if (await page.locator('#chapter-deploy').count()) await page.click('#chapter-deploy');
    else if (await page.locator('.cs-card.focused').count()) await page.click('.cs-card.focused');
    await page.waitForTimeout(700); await look('play');

    let total = 0, over = [];
    for (const [screen, list] of Object.entries(found)) {
      total += list.length;
      const budget = BUDGET[screen] ?? 0;
      if (list.length > budget) over.push(`${screen}: ${list.length}개 (상한 ${budget})`);
      if (list.length) {
        const assembled = list.filter(x => !x.whole), inCatalog = list.filter(x => x.whole);
        console.log(`\n[${screen}] ${list.length}개 — 조립된 문장 ${assembled.length} · 카탈로그에 있는데 안 바뀜 ${inCatalog.length}`);
        for (const x of list.slice(0, 12)) console.log(`   ${x.whole ? '○' : '×'} ${x.host.padEnd(18)} ${x.t}`);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(over, [], '상한을 넘은 화면');
    console.log(`\nPASS(${LANG}): 화면 ${Object.keys(found).length}곳, 남은 한글 ${total}개 — 전부 상한 안`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
