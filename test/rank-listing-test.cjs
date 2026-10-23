/* 순위 등재 — 로그인하지 않은 사람의 기록이 실제로 올라가고, 「내 기록 내리기」로 내려가는지.
   서버는 이 테스트가 직접 띄운다(server/account.mjs, 임시 데이터 파일). 게임은 tools/serve.cjs 가 뜬
   http://127.0.0.1:4177 을 쓴다 — 다른 테스트와 같다.

   주소를 주는 법: 게임은 window.PZ_API 또는 localStorage 의 patient-zero-api 를 본다(js/ranking.js).
   addInitScript 는 reload 마다 다시 돌아 localStorage 를 덮으므로 씨앗은 없을 때만 심는다. */
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-listing-'));
const DATA = path.join(tmp, 'accounts.json');
fs.writeFileSync(DATA, JSON.stringify({ v: 1, accounts: {}, sessions: {}, saves: {}, ranks: {} }));

const ranks = () => JSON.parse(fs.readFileSync(DATA, 'utf8')).ranks;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const PORT = 4291;
  const api = spawn(process.execPath, [path.join(__dirname, '../server/account.mjs')],
    { env: { ...process.env, DATA, PORT: String(PORT) }, stdio: 'ignore' });
  await wait(700);

  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 844, height: 390 } });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(([url]) => {
      try {
        if (!localStorage.getItem('patient-zero-api')) localStorage.setItem('patient-zero-api', url);
        if (!localStorage.getItem('patient-zero-kit')) localStorage.setItem('patient-zero-kit', JSON.stringify({
          chapter: 1, loadout: ['smoke', 'boost'],
          progress: { cleared: [1, 2, 3], best: { 1: 112, 2: 240, 3: 95 } },
        }));
        if (!localStorage.getItem('patient-zero-profile-v1')) localStorage.setItem('patient-zero-profile-v1', JSON.stringify({ name: '야간보행', avatar: 'zero' }));
      } catch (e) {}
    }, ['http://127.0.0.1:' + PORT]);
    await p.goto(process.env.TEST_URL || 'http://127.0.0.1:4177');
    await p.waitForFunction(() => patientZero.snapshot().assetsReady);

    // 1. 로그인하지 않은 상태라는 것부터 확인한다 — 이 테스트의 전제다
    assert.equal(await p.evaluate(() => !!(window.Auth && Auth.token && Auth.token())), false, '로그인 없이 시작해야 한다');
    assert.equal(await p.evaluate(() => Ranking.listed()), true, '기본은 올리는 쪽이다');
    assert.deepEqual(ranks(), {}, '서버는 비어 있어야 한다');

    // 2. 한 판이 끝날 때 올라간다 (game.js 가 부르는 그 함수를 그대로 부른다)
    assert.equal(await p.evaluate(() => Ranking.myBest().score), 240, '최고 기록은 챕터 2의 240');
    assert.equal(await p.evaluate(() => Ranking.submit()), true, '로그인 없이도 제출이 성공해야 한다');
    await wait(400);
    let rows = Object.values(ranks());
    assert.equal(rows.length, 1, '서버에 줄이 하나 생긴다');
    assert.equal(rows[0].score, 240);
    assert.equal(rows[0].name, '야간보행');
    assert.equal(rows[0].guest, true, '손님 줄로 적힌다');

    // 3. 순위 탭을 실제로 열어 본다 — 로비 → 기록 → 유저 순위
    //    (기록 칸은 열릴 때 상세를 이미 펴 두고 #record-open 을 숨긴다 — game.js 602)
    await p.click('#start');
    await p.click('.hub-nav [data-panel=record]');
    await p.click('[data-rank=board]');
    await p.waitForSelector('[data-pane=board] .rank-row', { timeout: 4000 });
    const text = await p.locator('[data-pane=board]').innerText();
    assert.match(text, /야간보행/, '내 줄이 순위에 보인다');
    assert.match(text, /기록도 이 줄에 들어갑니다/, '올라가는 중이라고 적혀 있다');
    assert.equal(await p.locator('[data-listing=off]').count(), 1, '「내 기록 내리기」 단추가 있다');

    // 4. 내리면 서버에서 지워지고, 다음 판부터 올라가지 않는다
    await p.click('[data-listing=off]');
    await p.waitForSelector('[data-listing=on]', { timeout: 4000 });
    await wait(400);
    assert.deepEqual(ranks(), {}, '서버의 내 줄이 지워진다');
    assert.equal(await p.evaluate(() => Ranking.listed()), false);
    assert.match(await p.locator('[data-pane=board]').innerText(), /올라가지 않습니다/);
    assert.equal(await p.evaluate(() => Ranking.submit()), false, '내린 뒤에는 제출하지 않는다');
    await wait(300);
    assert.deepEqual(ranks(), {}, '내린 뒤 한 판 더 끝내도 올라가지 않는다');

    // 5. 다시 올리기 — 그 자리에서 되돌릴 수 있다
    await p.click('[data-listing=on]');
    await p.waitForSelector('[data-listing=off]', { timeout: 4000 });
    await wait(400);
    assert.equal(Object.values(ranks()).length, 1, '다시 줄에 선다');
    assert.equal(await p.evaluate(() => Ranking.listed()), true);

    // 6. 기기 표시는 서버로 날것이 나가지 않는다
    const gid = await p.evaluate(() => JSON.parse(localStorage.getItem('patient-zero-guest-v1')).id);
    assert.ok(gid && gid.length >= 8, '기기 표시가 만들어졌다');
    assert.ok(!fs.readFileSync(DATA, 'utf8').includes(gid), '서버 파일에 기기 표시가 날것으로 없다');

    assert.deepEqual(errors, []);
    console.log('PASS: 비로그인 제출 · 순위 탭의 안내와 단추 · 내리기(서버 삭제 + 이후 제출 중단) · 다시 올리기 · 기기 표시는 해시로만');
  } finally {
    await b.close();
    api.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
