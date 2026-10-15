// 순위 — 서버에 올라가고, 화면에 뜨고, **로그인하지 않은 사람 것은 안 나간다**.
//
// 이 검사의 핵심은 마지막 줄이다. 비로그인 유저의 기록이 한 번이라도 새 나가면
// 「보기만 한다」는 약속과 개인정보처리방침이 동시에 거짓이 된다 — 눈으로는 절대 못 잡는다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const PORT = 4192;
const DEMO = { email: 'review@patient-zero.test', code: '424242' };
const DATA = path.join(require('node:os').tmpdir(), 'pz-rank-test-' + Date.now() + '.json');
const URL = process.env.TEST_URL || 'http://127.0.0.1:4177';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../server/account.mjs')], {
    env: { ...process.env, PORT: String(PORT), DATA, DEMO_EMAIL: DEMO.email, DEMO_CODE: DEMO.code },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = ''; server.stdout.on('data', d => { log += d; }); server.stderr.on('data', d => { log += d; });
  const base = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 50 && !log.includes('계정 서버'); i++) await wait(100);
  assert.ok(log.includes('계정 서버'), '서버가 떴다: ' + log);

  const api = async (p, options) => { const r = await fetch(base + p, options); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const browser = await chromium.launch();
  try {
    // ── 서버: 로그인 없이 올릴 수 없고, 올리면 최고 기록만 남는다 ──
    assert.equal((await api('/api/rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"score":999}' })).status, 401,
      '토큰 없이 올리면 거절');
    const empty = await api('/api/rank');
    assert.deepEqual(empty.body, [], '처음엔 비어 있다 — 지어내지 않는다');

    await api('/api/auth/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email }) });
    const signed = await api('/api/auth/mail/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email, code: DEMO.code }) });
    const auth = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + signed.body.token };

    await api('/api/rank', { method: 'POST', headers: auth, body: JSON.stringify({ score: 120, chapter: 3, name: '서버시험', avatar: 'rea' }) });
    await api('/api/rank', { method: 'POST', headers: auth, body: JSON.stringify({ score: 40, chapter: 1, name: '서버시험', avatar: 'rea' }) });
    const board = await api('/api/rank');
    assert.equal(board.body.length, 1, '계정 하나에 줄 하나 — 기록 목록이 아니다');
    assert.equal(board.body[0].score, 120, '낮은 기록이 와도 최고 기록이 남는다');
    assert.equal(board.body[0].mine, false, '토큰 없이 보면 제 줄 표시가 없다');
    assert.equal((await api('/api/rank', { headers: auth })).body[0].mine, true, '토큰을 주면 제 줄에 표시가 붙는다');

    // ── 화면: 비로그인은 **보기만** 한다 ──
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const posts = [];
    page.on('request', r => { if (r.url().includes('/api/rank') && r.method() === 'POST') posts.push(r.url()); });
    await page.addInitScript(a => { window.PZ_API = a; }, base);
    await page.goto(URL + '/?desktop');
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    await page.click('.hub-nav [data-panel=record]');
    await page.click('[data-rank=board]');
    await page.waitForFunction(() => document.querySelector('.rank-row'));
    const guest = await page.locator('[data-pane=board]').innerText();
    assert.match(guest, /서버시험/, '남의 순위는 비로그인도 본다');
    assert.match(guest, /로그인하면 당신의 기록도/, '제 기록이 안 올라간다는 걸 알려 준다');
    await page.screenshot({ path: path.join(__dirname, '../shots/rank-board.png') });
    await page.click('#close-dialog');

    // 비로그인으로 한 판 끝내도 아무것도 보내지 않는다
    await page.evaluate(() => { patientZero.snapshot(); });
    await page.click('#hub-play');
    if (await page.locator('.cs-card.focused').count()) await page.click('.cs-card.focused');
    await page.waitForFunction(() => patientZero.snapshot().mode === 'playing');
    await page.evaluate(() => window.Ranking.submit());
    await page.waitForTimeout(300);
    assert.deepEqual(posts, [], '로그인하지 않았으면 기록은 한 번도 나가지 않는다');

    // ── 로그인하면 올라간다 ──
    await page.evaluate(() => { try { localStorage.setItem('patient-zero-runs-v2', '[]'); } catch {} });
    await page.evaluate(([e, c]) => Auth.open ? null : null, [DEMO.email, DEMO.code]);
    await page.evaluate(async ([e, c]) => {
      await Auth._call('/api/auth/mail', { method: 'POST', body: JSON.stringify({ email: e }) });
      const r = await Auth._call('/api/auth/mail/verify', { method: 'POST', body: JSON.stringify({ email: e, code: c }) });
      localStorage.setItem('patient-zero-session', JSON.stringify(r));
    }, [DEMO.email, DEMO.code]);
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    // 이 기기에 기록이 있어야 올라간다 — 챕터 최고 기록을 심는다
    await page.evaluate(() => {
      const kit = JSON.parse(localStorage.getItem('patient-zero-kit') || '{}');
      kit.progress = kit.progress || { cleared: [], best: {} };
      kit.progress.best = { 1: 777 };
      localStorage.setItem('patient-zero-kit', JSON.stringify(kit));
    });
    await page.reload();
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
    await page.click('#start');
    const sent = await page.evaluate(() => window.Ranking.submit());
    assert.equal(sent, true, '로그인하면 올라간다');
    const after = await api('/api/rank');
    assert.ok(after.body.some(r => r.score === 777), '올린 기록이 순위에 들어간다: ' + JSON.stringify(after.body));

    // ── 계정을 지우면 순위에서도 사라진다 ──
    await api('/api/account/delete', { method: 'POST', headers: auth });
    assert.deepEqual((await api('/api/rank')).body, [], '지운 계정의 이름은 순위에 남지 않는다');

    assert.deepEqual(errors, []);
    console.log('PASS: 서버(권한·최고 기록만·내 줄 표시·상위 50), 화면(남의 순위는 보임·비로그인 안내), 비로그인 제출 0건, 로그인 제출, 계정 삭제 시 순위도 삭제');
  } finally {
    await browser.close();
    server.kill();
    try { fs.unlinkSync(DATA); } catch {}
  }
})().catch(e => { console.error(e); process.exit(1); });
