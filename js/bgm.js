/* 브금 둘 — 「항시」와 「전투」. 오디오 파일은 없다. 전부 Web Audio 로 그 자리에서 합성한다.
   (playground/music/ 시리즈와 같은 방식 — 폰이 받는 양이 0바이트고 똑같이 반복되는 구간이 없다.)

   이 시리즈에서 처음 하는 것: **게임 상태를 듣는 음악.** 두 벌이 화면 모드를 따라 교차하고,
   전투 벌의 세기(0~1)는 남은 시간·통과선까지의 거리·챕터 난이도에서 실시간으로 나온다.
   쫓기면 필터가 열리고 하이햇과 아르페지오가 올라붙는다.

   음악 바탕: A 단조. 항시 벌은 A C D E G(펜타토닉)만 써서 어떤 두 음이 겹쳐도 부딪히지 않고,
   전투 벌은 Am–F–Dm–E 네 마디를 돈다(마지막 E 에 G# 을 올려 긴장을 만든다).

   music/ 시리즈에서 얻은 교훈을 그대로 지킨다:
   - 첫 소리는 즉시 — 느린 어택만 깔면 「재생 안 됨」으로 느껴진다
   - 재생 의도마다 `ctx.resume()` 을 명시 호출
   - 220Hz 위 레이어를 반드시 포함 — 저역 사인파만 쓰면 폰 스피커에서 안 들린다
   - 리미터(DynamicsCompressor)를 달고 믹스를 크게
   - `exponentialRampToValueAtTime(0, …)` 금지 — 0 으로는 지수 감쇠를 못 한다 */
window.BGM = (() => {
  const BPM = 124;
  const STEP = 60 / BPM / 4;            // 16분음표
  const BAR = STEP * 16;
  const CYCLE = BAR * 4;                // Am – F – Dm – E
  // A 단조. 숫자는 A1(55Hz) 에서 반음 몇 개 위인지.
  const hz = n => 55 * Math.pow(2, n / 12);
  const PENTA = [0, 3, 5, 7, 10];        // A C D E G
  const CHORDS = [                       // [근음, 코드톤…] 반음 단위
    { root: 12, tones: [12, 15, 19] },   // Am
    { root: 8, tones: [8, 12, 15] },     // F
    { root: 5, tones: [5, 8, 12] },      // Dm
    { root: 7, tones: [7, 11, 14] },     // E (G# 으로 긴장)
  ];
  const KICK = [0, 3, 6, 8, 11, 14];     // 16스텝 중 킥이 떨어지는 자리
  const rand = (a, b) => a + Math.random() * (b - a);

  // 리버브용 임펄스 — 지수로 잦아드는 잡음을 직접 굽는다
  function impulse(ctx, seconds, decay) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  /* 한 벌 짓기. 실연주와 오프라인 렌더가 **같은 코드**를 쓴다 —
     그래야 시험에서 들은 것이 실제로 나는 소리다. */
  function build(ctx, destination) {
    const out = ctx.createGain();
    out.gain.value = 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9; limiter.knee.value = 6; limiter.ratio.value = 10;
    limiter.attack.value = .004; limiter.release.value = .22;
    out.connect(limiter).connect(destination || ctx.destination);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 3.4, 2.6);
    const verbGain = ctx.createGain(); verbGain.gain.value = .5;
    verb.connect(verbGain).connect(out);

    const ambient = ctx.createGain(); ambient.gain.value = 0; ambient.connect(out);
    const battle = ctx.createGain(); battle.gain.value = 0; battle.connect(out);
    const ambientVerb = ctx.createGain(); ambientVerb.gain.value = .9; ambient.connect(ambientVerb).connect(verb);

    // ── 항시: 숨 쉬는 드론 ──
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 700; droneFilter.Q.value = .7;
    droneFilter.connect(ambient);
    const drones = [];
    // A1·A2·E3 을 ±1.5센트 어긋난 쌍으로 겹치고, A3(220Hz) 위로 한 겹 더 —
    // 저역만 쌓으면 폰 스피커에서 통째로 사라진다.
    for (const [semi, level, type] of [[0, .30, 'sine'], [12, .22, 'sine'], [19, .13, 'sine'], [24, .085, 'triangle']]) {
      for (const cents of [-1.5, 1.5]) {
        const o = ctx.createOscillator(); o.type = type;
        o.frequency.value = hz(semi); o.detune.value = cents;
        const g = ctx.createGain(); g.gain.value = level / 2;
        o.connect(g).connect(droneFilter);
        drones.push(o);
      }
    }
    // 28초 주기로 음량이 숨을 쉰다
    const breath = ctx.createOscillator(); breath.type = 'sine'; breath.frequency.value = 1 / 28;
    const breathAmt = ctx.createGain(); breathAmt.gain.value = 260;
    breath.connect(breathAmt).connect(droneFilter.frequency);

    // ── 전투: 바닥을 끄는 베이스 드론(항시와 같은 음이라 넘어갈 때 이음새가 없다) ──
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass'; bassFilter.frequency.value = 900; bassFilter.Q.value = 2.2;
    bassFilter.connect(battle);

    function startAll(t) {
      for (const o of drones) o.start(t);
      breath.start(t);
    }

    // ── 소리 한 점씩 ──
    function bell(t, semi, level) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(semi);
      const h = ctx.createOscillator(), hg = ctx.createGain();
      h.type = 'sine'; h.frequency.value = hz(semi) * 2; hg.gain.value = level * .22;
      const atk = rand(1.1, 2.2), rel = rand(4.5, 7.5);
      g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(level, t + atk);
      g.gain.linearRampToValueAtTime(0, t + atk + rel);      // 0 으로는 지수 금지
      o.connect(g).connect(ambient); o.connect(g).connect(verb);
      h.connect(hg).connect(g);
      o.start(t); h.start(t); o.stop(t + atk + rel + .1); h.stop(t + atk + rel + .1);
    }

    function kick(t, level) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(132, t);
      o.frequency.exponentialRampToValueAtTime(42, t + .09);
      g.gain.setValueAtTime(level, t);
      g.gain.linearRampToValueAtTime(0, t + .24);
      o.connect(g).connect(battle);
      o.start(t); o.stop(t + .26);
    }

    let hatBuf = null;
    function hat(t, level) {
      if (!hatBuf) {   // 한 번만 굽는다 — 16분음표마다 새로 만들면 폰에서 쓰레기가 쌓인다
        const len = Math.max(1, Math.floor(ctx.sampleRate * .05));
        hatBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = hatBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const n = ctx.createBufferSource();
      n.buffer = hatBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.linearRampToValueAtTime(0, t + .05);
      n.connect(f).connect(g).connect(battle);
      n.start(t); n.stop(t + .06);
    }

    function bass(t, semi, dur, level) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz(semi);
      g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(level, t + .012);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g).connect(bassFilter);
      o.start(t); o.stop(t + dur + .02);
    }

    // 아르페지오 — 세기가 올라야 들어온다. 440Hz 언저리라 폰에서도 또렷하다.
    function arp(t, semi, level) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = hz(semi);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(1500 + level * 5200, t); f.Q.value = 6;
      g.gain.setValueAtTime(.0001, t);
      g.gain.linearRampToValueAtTime(level, t + .008);
      g.gain.linearRampToValueAtTime(0, t + STEP * 1.7);
      o.connect(f).connect(g).connect(battle);
      o.start(t); o.stop(t + STEP * 1.8);
    }

    /* 한 토막을 미리 적어 둔다. [from, to) 안에 떨어지는 음만 넣는다.
       실연주는 0.1초마다 조금씩, 오프라인 렌더는 한 번에 통째로 부른다. */
    let nextBell = 0, lastStep = -1;
    function schedule(from, to, intensity) {
      const hot = Math.max(0, Math.min(1, intensity));
      // 항시 — 드문드문 울리는 종
      if (nextBell < from) nextBell = from + rand(1, 3);
      while (nextBell < to) {
        const oct = Math.random() < .35 ? 36 : 48;
        bell(nextBell, oct + PENTA[Math.floor(Math.random() * PENTA.length)], rand(.05, .11));
        nextBell += rand(4.2, 9.5);
      }
      // 전투 — 16스텝 격자
      const first = Math.max(lastStep + 1, Math.floor(from / STEP));
      const last = Math.floor(to / STEP);
      for (let i = first; i <= last; i++) {
        const t = i * STEP;
        if (t < from) continue;
        const step = ((i % 16) + 16) % 16;
        const bar = Math.floor((t % CYCLE) / BAR);
        const chord = CHORDS[bar];
        if (KICK.includes(step)) kick(t, .62);
        if (step % 2 === 1) hat(t, .07 + hot * .1);
        if (step % 4 === 0) bass(t, chord.root, STEP * 3.4, .17 + hot * .07);
        else if (step === 6 || step === 14) bass(t, chord.root, STEP * 1.4, .12 + hot * .05);
        // 아르페지오는 세기가 붙어야 올라온다 — 쫓길수록 촘촘해진다
        if (hot > .22 && step % 2 === 0) {
          const tone = chord.tones[(step / 2) % chord.tones.length] + 24;
          arp(t, tone, .035 + hot * .055);
        }
        lastStep = i;
      }
    }

    function setIntensity(hot, t) {
      const h = Math.max(0, Math.min(1, hot));
      bassFilter.frequency.setTargetAtTime(620 + h * 2600, t, .25);
    }

    function crossfade(toBattle, t, seconds) {
      const a = toBattle ? 0 : .50, b = toBattle ? .74 : 0;
      ambient.gain.setTargetAtTime(a, t, seconds / 3);
      battle.gain.setTargetAtTime(b, t, seconds / 3);
    }

    // 켜자마자 들리는 한 음 — 드론만으로는 「켜졌나?」 싶다
    const firstBell = t => bell(t, 48 + PENTA[0], .13);

    return { out, ambient, battle, startAll, schedule, setIntensity, crossfade, firstBell, limiter };
  }

  // ───────── 실연주 ─────────
  let ctx = null, band = null, timer = 0, armed = false, duck = 1, want = 'ambient';
  const enabled = () => {
    const s = window.Settings;
    if (!s) return true;
    const v = s.get ? s.get('bgm') : undefined;
    return v === undefined ? true : !!v;     // 설정에 칸이 없으면 켠 것으로
  };
  const level = () => {
    const s = window.Settings;
    const v = s && s.snapshot ? ({ quiet: .5, normal: 1, loud: 1.5 }[s.snapshot().volume] ?? 1) : 1;
    return v * .9;
  };

  // 지금 얼마나 쫓기는가 — 남은 시간과 통과선까지의 거리, 챕터 난이도에서 뽑는다
  function intensity() {
    const g = window.patientZero?.snapshot?.();
    if (!g || g.mode !== 'playing') return 0;
    const round = window.Outbreak?.round || 90;
    const left = Math.max(0, round - (g.elapsed || 0));
    const rush = 1 - Math.min(1, left / round);                       // 끝으로 갈수록
    const near = Math.min(1, (g.score || 0) / Math.max(1, g.quota));   // 통과선에 붙을수록
    const heat = Math.min(1, (g.chapter || 1) / 19);
    return Math.max(0, Math.min(1, .18 + rush * .42 + near * .26 + heat * .18));
  }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch { return false; }
    band = build(ctx, ctx.destination);
    band.out.gain.value = 0;
    const t0 = ctx.currentTime;
    band.startAll(t0);
    // 첫 소리는 즉시 — 느린 어택만 깔면 「안 켜졌다」로 느껴진다.
    // 지난 시각부터 적지 않는다: 과거의 16분음표가 한꺼번에 터진다.
    band.schedule(t0, t0 + .7, 0);
    band.firstBell(t0 + .05);
    band.crossfade(false, t0, .4);
    let last = t0 + .7;
    timer = setInterval(() => {
      if (!ctx || ctx.state !== 'running') return;
      const to = ctx.currentTime + .7;
      if (to > last) { band.schedule(last, to, intensity()); last = to; }
      band.setIntensity(intensity(), ctx.currentTime);
    }, 120);
    return true;
  }

  function apply() {
    if (!ctx || !band) return;
    const on = enabled();
    band.out.gain.setTargetAtTime(on ? level() * duck : 0, ctx.currentTime, .25);
    band.crossfade(want === 'battle', ctx.currentTime, .9);
  }

  function to(mode) {
    want = mode === 'playing' ? 'battle' : 'ambient';
    duck = (mode === 'paused' || mode === 'over') ? .45 : 1;
    if (!ensure()) return;
    // 재생 의도마다 명시적으로 — 자동재생 정책에 한 번 막히면 스스로 안 풀린다
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    apply();
  }

  function arm() {
    if (armed) return;
    armed = true;
    to(document.body.dataset.mode || 'intro');
  }

  function init() {
    // 손짓이 있어야 소리를 낼 수 있다. 아무 데나 한 번 누르면 깨운다.
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
      addEventListener(ev, arm, { once: false, passive: true });
    }
    new MutationObserver(() => { if (armed) to(document.body.dataset.mode); })
      .observe(document.body, { attributes: true, attributeFilter: ['data-mode'] });
    // 설정 창을 닫으면 켜짐·음량이 바뀌었을 수 있다
    document.getElementById('info-dialog')?.addEventListener('close', apply);
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (enabled()) ctx.resume().catch(() => {});
    });
    window.addEventListener('pagehide', () => { if (ctx) ctx.suspend().catch(() => {}); });
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();

  // 효과음(js/sfx.js)이 같은 장치를 빌려 쓴다 — 모바일 사파리는 AudioContext 수가 제한된다
  return { build, to, apply, intensity, context: () => ctx, state: () => ({ on: enabled(), want, running: !!ctx && ctx.state === 'running' }) };
})();
