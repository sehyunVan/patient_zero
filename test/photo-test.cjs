// 사진 모드: 로비에서 UI 가 **하나도 남김없이** 사라져야 한다. 하나라도 남으면 스크린샷에 끼어든다.
// 선택자를 세는 게 아니라 로비의 직계 자식을 전부 훑어 투명한지 본다 — 칸이 늘어나도 이 검사는 그대로 산다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict'), path = require('path');
const SHOT = n => path.join(__dirname, '../shots', n);
const URL = process.env.TEST_URL || 'http://localhost:4177';

const leftovers = page => page.evaluate(() => {
  const lobby = document.getElementById('lobby');
  return [...lobby.children]
    .filter(e => !e.matches('.hub-hero,.hub-vignette,#photo-exit') && !e.hidden)
    .filter(e => { const s = getComputedStyle(e); return s.opacity !== '0' && s.display !== 'none' && s.visibility !== 'hidden'; })
    .map(e => e.id || e.className || e.tagName);
});

(async () => {
  const b = await chromium.launch();
  try {
    for (const [w, h] of [[1404, 790], [844, 390]]) {
      const p = await b.newPage({ viewport: { width: w, height: h } });
      const errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.addInitScript(() => localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: 3, progress: { cleared: [1, 2] } })));
      await p.goto(URL + '/?desktop');
      await p.click('#start'); await p.waitForTimeout(1200);

      assert.ok(await p.locator('#photo-hide').isVisible(), '카메라 단추가 없다');
      assert.deepEqual((await leftovers(p)).length > 0, true, '평소엔 UI 가 보여야 한다');

      // 단추로 숨기기
      await p.click('#photo-hide'); await p.waitForTimeout(500);
      assert.deepEqual(await leftovers(p), [], '사진 모드인데 남아 있는 것이 있다');
      // 힌트는 잠깐 보였다 사라진다 — 바로 찍어도 글씨가 안 남게
      assert.ok(await p.locator('#photo-exit span').isVisible());
      await p.waitForTimeout(2400);
      assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector('#photo-exit span')).opacity), '0');
      if (w === 1404) await p.screenshot({ path: SHOT('lobby-photo.png') });

      // 아무 곳이나 눌러 돌아온다
      await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(400);
      assert.ok((await leftovers(p)).length > 0, '눌러도 UI 가 안 돌아왔다');

      // H 로 끄고 ESC 로 돌아오기
      await p.keyboard.press('KeyH'); await p.waitForTimeout(400);
      assert.deepEqual(await leftovers(p), []);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      assert.ok((await leftovers(p)).length > 0, 'ESC 로 안 돌아왔다');

      // 사진 모드인 채로 출격했다가 돌아와도 UI 가 있어야 한다 — 없으면 갇힌다
      await p.keyboard.press('KeyH'); await p.waitForTimeout(300);
      await p.evaluate(() => document.getElementById('hub-play').click());
      await p.waitForTimeout(1200);
      await p.click('.cs-card.focused'); await p.waitForTimeout(600);
      await p.click('#pause'); await p.click('#return-lobby'); await p.waitForTimeout(600);
      assert.ok((await leftovers(p)).length > 0, '로비로 돌아왔는데 UI 가 없다');
      assert.equal(await p.evaluate(() => document.getElementById('lobby').classList.contains('photo')), false);

      assert.deepEqual(errors, []);
      await p.close();
    }
    console.log('PASS: 카메라 단추, UI 전부 사라짐(두 화면 크기), 힌트 자동 소멸, 탭/H/ESC 복귀, 출격 후 복귀 시 해제; 오류 없음');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
