// 브금 둘을 **실제로 렌더해서** 듣는 대신 잰다.
// music/ 시리즈에서 세운 검증법을 그대로: ① node --check(별도) ② 스케줄러를 길게 돌려
// 잘못된 automation time 잡기 ③ 렌더된 소리의 초당 RMS·피크·대역 분포 확인.
// 목업이 아니라 브라우저의 OfflineAudioContext 로 돌린다 — 시험에서 들은 것이 실제로 나는 소리여야 한다.
const { chromium } = require('../../subway-rpg/poc/node_modules/playwright');
const assert = require('node:assert/strict');
const URL = process.env.TEST_URL || 'http://localhost:4177';
const SECONDS = 24;   // 전투 벌의 4마디 한 바퀴(7.74초)가 세 번 넘게 돈다

// 한 벌을 오프라인으로 굽고 초당 RMS·피크를 돌려준다. highpass 를 끼우면 220Hz 위만 남는다.
const render = async (page, which, highpass) => page.evaluate(async ({ which, highpass, SECONDS }) => {
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, rate * SECONDS, rate);
  let tail = ctx.destination;
  if (highpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 300; f.Q.value = .7;
    f.connect(ctx.destination); tail = f;
  }
  const band = window.BGM.build(ctx, tail);
  band.startAll(0);
  band.crossfade(which === 'battle', 0, .01);
  band.setIntensity(which === 'battle' ? .6 : 0, 0);
  band.schedule(0, SECONDS, which === 'battle' ? .6 : 0);
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  const perSec = [];
  let peak = 0;
  for (let s = 0; s < SECONDS; s++) {
    let sum = 0;
    for (let i = s * rate; i < (s + 1) * rate; i++) { const v = d[i]; sum += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
    perSec.push(Math.sqrt(sum / rate));
  }
  const rms = Math.sqrt(perSec.reduce((a, v) => a + v * v, 0) / perSec.length);
  // 50ms 창 — 초당 RMS 로는 킥·하이햇이 뭉개져 박자가 안 보인다
  const win = Math.floor(rate * .05), fine = [];
  for (let i = 0; i + win <= d.length; i += win) {
    let s2 = 0; for (let k = i; k < i + win; k++) s2 += d[k] * d[k];
    fine.push(Math.sqrt(s2 / win));
  }
  return { perSec, rms, peak, fine };
}, { which, highpass, SECONDS });

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1404, height: 790 } });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL + '/?desktop');
    await p.waitForFunction(() => !!window.BGM);

    for (const which of ['ambient', 'battle']) {
      const raw = await render(p, which, false);
      // ① 어느 한 순간도 비어 있으면 안 된다 — 「재생 안 됨」으로 느껴진다
      const quiet = raw.perSec.map((v, i) => [i, v]).filter(([, v]) => v < 0.004);
      assert.equal(quiet.length, 0, `${which}: 조용한 구간 ${JSON.stringify(quiet.map(q => q[0]))}초`);
      // ② 첫 1초 안에 소리가 난다
      assert.ok(raw.perSec[0] > 0.01, `${which}: 첫 소리가 늦다 (${raw.perSec[0].toFixed(4)})`);
      // ③ 리미터를 달았으니 깨지면 안 된다
      assert.ok(raw.peak <= 1.0, `${which}: 클리핑 peak ${raw.peak.toFixed(3)}`);
      // ④ 들릴 만큼 크다
      assert.ok(raw.rms > 0.02, `${which}: 너무 작다 RMS ${raw.rms.toFixed(4)}`);

      // ⑤ 폰 스피커 교훈 — 300Hz 위에 실질적인 에너지가 있어야 한다
      const high = await render(p, which, true);
      const ratio = high.rms / raw.rms;
      assert.ok(ratio > 0.06, `${which}: 저역뿐이라 폰에서 안 들린다 (고역 비율 ${(ratio * 100).toFixed(1)}%)`);
      console.log(`  ${which.padEnd(8)} RMS ${raw.rms.toFixed(3)} · peak ${raw.peak.toFixed(2)} · 300Hz↑ ${(ratio * 100).toFixed(0)}%`);
    }

    // ⑥ 둘의 성격이 달라야 한다 — 전투는 박자가 뛰고, 항시는 평평하게 깔린다.
    // 크기로 가르면 안 된다: 항시 벌의 종은 무작위라 어떤 판에서는 더 커진다.
    const amb = await render(p, 'ambient', false);
    const bat = await render(p, 'battle', false);
    const spread = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m; };
    const ambPulse = spread(amb.fine), batPulse = spread(bat.fine);
    assert.ok(batPulse > ambPulse * 1.3, `전투에 박자가 안 선다 (항시 ${ambPulse.toFixed(2)} vs 전투 ${batPulse.toFixed(2)})`);
    assert.ok(spread(amb.perSec) < .6, `항시 벌이 너무 출렁인다 ${spread(amb.perSec).toFixed(2)}`);
    console.log(`  박자 출렁임  항시 ${ambPulse.toFixed(2)} · 전투 ${batPulse.toFixed(2)}`);

    // ⑦ 세기를 올리면 **더 밝고 촘촘해진다**. 크기로 재면 안 된다 —
    // 리미터가 눌러 주는 게 일이라 RMS 는 일부러 거의 그대로다(0.241 → 0.239).
    // 실제로 바뀌는 건 필터가 열리고 아르페지오·하이햇이 붙는 고역 쪽이다.
    const bright = hot => p.evaluate(async (hot) => {
      const rate = 44100, sec = 8;
      const ctx = new OfflineAudioContext(2, rate * sec, rate);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2000; hp.Q.value = .7;
      const tap = ctx.createGain();
      tap.connect(ctx.destination);                 // 원음
      const band = window.BGM.build(ctx, tap);
      band.startAll(0); band.crossfade(true, 0, .01);
      band.setIntensity(hot, 0); band.schedule(0, sec, hot);
      const buf = await ctx.startRendering();
      const d = buf.getChannelData(0);
      // 1차 차분 = 거친 하이패스. 고역이 늘면 이 값이 커진다.
      let hi = 0, all = 0;
      for (let i = 1; i < d.length; i++) { const diff = d[i] - d[i - 1]; hi += diff * diff; all += d[i] * d[i]; }
      return Math.sqrt(hi / d.length) / Math.max(1e-9, Math.sqrt(all / d.length));
    }, hot);
    const soft = await bright(0), loud = await bright(1);
    assert.ok(loud > soft * 1.08, `세기를 올려도 밝아지지 않는다 ${soft.toFixed(3)} → ${loud.toFixed(3)}`);
    console.log(`  세기 0→1 밝기  ${soft.toFixed(3)} → ${loud.toFixed(3)}`);

    // ⑧ 살아 있는 쪽: 손짓 한 번에 깨어나고, 화면을 따라 벌이 바뀐다
    await p.click('#start'); await p.waitForTimeout(900);
    let st = await p.evaluate(() => BGM.state());
    assert.equal(st.want, 'ambient', '로비에서는 항시 벌');
    assert.ok(st.running, '손짓 뒤에도 안 깨어났다');
    await p.click('#hub-play'); await p.waitForTimeout(1100);
    await p.click('.cs-card.focused'); await p.waitForTimeout(700);
    st = await p.evaluate(() => BGM.state());
    assert.equal(st.want, 'battle', '전투인데 항시 벌이 돈다');
    assert.ok(await p.evaluate(() => BGM.intensity()) > 0, '전투 세기가 0 이다');
    await p.click('#pause'); await p.waitForTimeout(400);
    assert.equal((await p.evaluate(() => BGM.state())).want, 'ambient', '일시정지면 항시 벌로');

    // ⑨ 설정에서 끄면 꺼진다
    await p.evaluate(() => { const s = Settings.snapshot(); localStorage.setItem('patient-zero-settings-v1', JSON.stringify({ ...s, bgm: false })); });
    await p.reload(); await p.waitForFunction(() => !!window.BGM);
    await p.click('#start'); await p.waitForTimeout(600);
    assert.equal((await p.evaluate(() => BGM.state())).on, false, '껐는데 켜져 있다');

    // ⑩ 효과음 — 감염·피격이 실제로 소리를 내고, 폰 스피커가 내주는 대역에 에너지가 있어야 한다.
    // 예전 피격음은 70Hz 사인파 한 겹이라 폰에서는 통째로 안 들렸다.
    for (const [which, combo] of [['infect', 0], ['infect', 8], ['hit', 0]]) {
      const m = await p.evaluate(async ({ which, combo }) => {
        const rate = 44100, sec = .5;
        const run = async hp => {
          const ctx = new OfflineAudioContext(1, rate * sec, rate);
          let tail = ctx.destination;
          if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 300; f.connect(ctx.destination); tail = f; }
          const probe = Object.create(ctx, { destination: { value: tail } });
          window.Sfx.render(probe, which, combo);
          const d = (await ctx.startRendering()).getChannelData(0);
          let s2 = 0, peak = 0;
          for (let i = 0; i < d.length; i++) { s2 += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); }
          return { rms: Math.sqrt(s2 / d.length), peak };
        };
        const raw = await run(false), high = await run(true);
        return { rms: raw.rms, peak: raw.peak, ratio: high.rms / Math.max(1e-9, raw.rms) };
      }, { which, combo });
      assert.ok(m.rms > 0.002, `${which}(${combo}): 소리가 안 난다 RMS ${m.rms.toFixed(4)}`);
      assert.ok(m.peak <= 1.0, `${which}(${combo}): 클리핑 ${m.peak.toFixed(2)}`);
      assert.ok(m.ratio > 0.25, `${which}(${combo}): 저역뿐이라 폰에서 안 들린다 (${(m.ratio * 100).toFixed(0)}%)`);
      console.log(`  ${which}(${combo}) RMS ${m.rms.toFixed(4)} · 300Hz↑ ${(m.ratio * 100).toFixed(0)}%`);
    }
    // 연쇄가 쌓이면 음이 올라간다
    const pitch = c => p.evaluate(async (combo) => {
      const rate = 44100, ctx = new OfflineAudioContext(1, rate * .3, rate);
      window.Sfx.render(ctx, 'infect', combo);
      const d = (await ctx.startRendering()).getChannelData(0);
      let z = 0; for (let i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) z++;
      return z;
    }, c);
    assert.ok(await pitch(10) > await pitch(0), '연쇄가 쌓여도 음이 안 올라간다');

    assert.deepEqual(errors, []);
    console.log('PASS: 두 벌 무음 구간 없음, 첫 소리 즉시, 클리핑 없음, 300Hz↑ 에너지, 전투 박자, 세기 올리면 밝아짐, 모드 따라 교차, 설정 끄기, 감염·피격 효과음(폰 대역·연쇄 음정); 오류 없음');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
