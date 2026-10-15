// 로그인 — 계정 서버와 화면을 한 번에 본다.
// 메일 발송 키 없이 돌리려고 심사용 데모 계정(DEMO_EMAIL/DEMO_CODE)으로 검사한다 — 실제 메일은 나가지 않는다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const PORT = 4191;
const DEMO = { email: 'review@patient-zero.test', code: '424242' };
const DATA = path.join(require('node:os').tmpdir(), 'pz-auth-test-' + Date.now() + '.json');

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // 1) 계정 서버를 띄운다
  const server = spawn(process.execPath, [path.join(__dirname, '../server/account.mjs')], {
    env: { ...process.env, PORT: String(PORT), DATA, DEMO_EMAIL: DEMO.email, DEMO_CODE: DEMO.code },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', d => { log += d; });
  server.stderr.on('data', d => { log += d; });
  const base = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 50 && !log.includes('계정 서버'); i++) await wait(100);
  assert.ok(log.includes('계정 서버'), '서버가 떴다: ' + log);

  const browser = await chromium.launch();
  try {
    // 2) 서버 API: 코드 발급 → 검증 → 세션 → 저장 왕복
    const api = async (p, options) => { const r = await fetch(base + p, options); return { status: r.status, body: await r.json().catch(() => ({})) }; };
    const config = await api('/api/config');
    assert.equal(config.status, 200);
    assert.equal(typeof config.body.mail, 'boolean', '어떤 수단이 켜졌는지 알려 준다');

    const sent = await api('/api/auth/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email }) });
    assert.equal(sent.status, 200, '데모 계정은 키 없이도 코드가 난다: ' + JSON.stringify(sent.body));

    const wrong = await api('/api/auth/mail/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email, code: '000000' }) });
    assert.equal(wrong.status, 401, '틀린 코드는 거절');

    const ok = await api('/api/auth/mail/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email, code: DEMO.code }) });
    assert.equal(ok.status, 200, '맞는 코드로 들어간다');
    const token = ok.body.token;
    assert.ok(token && ok.body.me.email === DEMO.email);

    const auth = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    assert.equal((await api('/api/me', { headers: auth })).status, 200, '세션이 산다');
    assert.equal((await api('/api/me', { headers: { Authorization: 'Bearer nope' } })).status, 401, '아무 토큰이나 받지 않는다');

    const blob = { 'patient-zero-progression-v1': JSON.stringify({ tickets: 7 }) };
    assert.equal((await api('/api/save', { method: 'PUT', headers: auth, body: JSON.stringify({ save: blob }) })).status, 200, '저장을 맡는다');
    const back = await api('/api/save', { headers: auth });
    assert.deepEqual(back.body.save.blob, blob, '맡긴 저장이 그대로 돌아온다');
    assert.equal((await api('/api/save')).status, 401, '남의 저장은 못 본다');

    // 3) 화면: 로그인 창이 서버 상태를 그대로 보여 주고, 메일 코드로 끝까지 간다
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(api => { window.PZ_API = api; }, base);
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4177');
    await page.waitForFunction(() => window.patientZero?.snapshot().assetsReady);

    await page.click('#login');
    await page.waitForSelector('#login-dialog[open]');
    assert.equal(await page.locator('[data-login=google]').count(), 1, '구글 버튼');
    assert.equal(await page.locator('[data-login=apple]').count(), 1, '애플 버튼');
    // 키가 없으면 꺼진 채로 — 조용히 열려 있지 않다
    assert.equal(await page.locator('[data-login=google]').isDisabled(), !config.body.google, '설정 안 된 수단은 비활성');

    // 4.8 「equivalent option」은 눈에도 같아야 한다 — 세로로 쌓아 폭을 맞춘다(SHIPPING.md §1)
    const g = await page.locator('[data-login=google]').boundingBox();
    const a = await page.locator('[data-login=apple]').boundingBox();
    assert.ok(Math.abs(g.width - a.width) < 1, `구글·애플 단추 폭이 같다 (${g.width} vs ${a.width})`);
    assert.ok(Math.abs(g.height - a.height) < 1, `높이도 같다 (${g.height} vs ${a.height})`);
    assert.ok(a.y > g.y + g.height - 1, '가로로 나란히 두지 않고 세로로 쌓는다');

    // 판마다 보이는 수단이 다르다 — 안드로이드는 애플을 빼고, iOS 는 반드시 넣는다(4.8)
    for (const [platform, apple] of [['android', 0], ['ios', 1]]) {
      const tab = await browser.newPage({ viewport: { width: 844, height: 390 } });
      await tab.addInitScript(a => { window.PZ_API = a; }, base);
      await tab.addInitScript(p => { window.Capacitor = { getPlatform: () => p }; }, platform);
      await tab.goto(process.env.TEST_URL || 'http://127.0.0.1:4177');
      await tab.waitForFunction(() => window.patientZero?.snapshot().assetsReady);
      await tab.click('#login');
      await tab.waitForSelector('#login-dialog[open]');
      assert.equal(await tab.locator('[data-login=google]').count(), 1, platform + ': 구글은 항상 있다');
      assert.equal(await tab.locator('[data-login=apple]').count(), apple, platform + ': 애플 단추');
      if (apple) {   // 있으면 구글과 **같은 크기**여야 한다
        const g = await tab.locator('[data-login=google]').boundingBox();
        const a = await tab.locator('[data-login=apple]').boundingBox();
        assert.ok(Math.abs(g.width - a.width) < 1 && Math.abs(g.height - a.height) < 1, 'iOS: 두 단추가 같은 크기');
      }
      // 로고가 글자 옆에 실제로 그려진다 — 구글은 제 색(4색), 애플은 글자색
      assert.equal(await tab.locator('[data-login=google] .brand-mark').count(), 1, platform + ': 구글 로고');
      await tab.close();
    }

    await page.fill('#login-email', DEMO.email);
    await page.click('#login-mail-form button');
    await page.waitForSelector('#login-code');
    await page.fill('#login-code', '111111');
    await page.click('#login-code-form button');
    await page.waitForSelector('.login-error');
    assert.match(await page.locator('.login-error').innerText(), /코드가 맞지 않습니다|bad-code/, '틀린 코드는 화면에서도 막힌다');

    await page.fill('#login-code', DEMO.code);
    await page.click('#login-code-form button');
    await page.waitForSelector('#login-out');
    assert.match(await page.locator('.login-state').innerText(), new RegExp(DEMO.email), '로그인된 메일을 보여 준다');

    // 4) 이 기기 기록을 계정에 올리고, 다시 내려받는다
    await page.evaluate(() => localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: 3 })));
    await page.click('#login-push');
    await page.waitForTimeout(400);
    const stored = await api('/api/save', { headers: auth });
    assert.ok(JSON.parse(stored.body.save.blob['patient-zero-kit']).chapter === 3, '올린 기록이 서버에 남는다');

    // 5) 계정 삭제 — 앱 안에서 지울 수 있어야 한다(Apple 5.1.1(v) · Play 데이터 삭제)
    await page.click('#login-delete');
    await page.waitForSelector('#login-delete-go');
    assert.match(await page.locator('.login-state').innerText(), /모든 기기/, '무엇이 사라지는지 먼저 적는다');
    await page.click('#login-delete-go');
    await page.waitForSelector('#login-mail-form');                    // 로그인 전 화면으로 돌아온다
    assert.equal((await api('/api/me', { headers: auth })).status, 401, '세션이 전부 끊긴다');
    assert.equal((await api('/api/save', { headers: auth })).status, 401, '맡긴 저장도 사라진다');
    assert.ok(await page.evaluate(() => !!localStorage.getItem('patient-zero-kit')), '이 기기 저장은 남는다 — 로그인 없이 계속 놀 수 있다');

    assert.deepEqual(errors, []);
    console.log('PASS: 서버(설정 공개·코드 발급·오답 거절·세션·저장 왕복·권한·계정 삭제), 화면(세 수단 노출·꺼진 수단 비활성·4.8 단추 크기·코드 오답 안내·로그인·기록 올리기·앱 안 계정 삭제)');
  } finally {
    await browser.close();
    server.kill();
    try { fs.unlinkSync(DATA); } catch {}
  }
})().catch(e => { console.error(e); process.exit(1); });
