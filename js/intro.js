/* 인트로와 첫 전투 튜토리얼.
   제로가 쫓기다 붙잡혀 감염되고, 그 절망이 한 컷 만에 뒤집힌다 — 그리고 바로 첫 사냥을 가르친다.
   처음 켠 사람에게만 자동으로 돈다(설정에서 다시 볼 수 있다). 어디서든 건너뛸 수 있다. */
window.Intro = (() => {
  const KEY = 'patient-zero-intro-seen';
  const $ = id => document.getElementById(id);
  const seen = () => { try { return localStorage.getItem(KEY) === 'yes'; } catch { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, 'yes'); } catch {} };

  // 다섯 컷 — ①~③ 은 차갑고, ④ 에서 뒤집힌다. 그 낙차가 이 인트로의 전부다.
  const CUTS = [
    { art: '1-run',    tone: 'cold', lines: ['처음엔 나도 도망쳤어.', '다들 그랬듯이.'] },
    { art: '2-caught', tone: 'cold', lines: ['생각보다, 손이 많았다.'] },
    { art: '3-turn',   tone: 'dark', lines: ['그리고 끝났다.'] },
    { art: '4-smile',  tone: 'warm', lines: ['…아.', '그럼 이제 뭘 해야 할지 알겠지?'] },
    { art: '5-hunt',   tone: 'warm', lines: ['저 아래, 아직 안 걸린 사람들.', '시작하자.'] },
  ];
  // 튜토리얼 — 화면의 조건을 실제로 만족해야 다음으로 간다. 글만 읽히고 넘기지 않는다.
  const STEPS = [
    { id: 'move',   copy: '왼쪽 스틱을 끌어 움직이세요.', done: s => s.moved },
    { id: 'infect', copy: '사람에게 닿으면 감염됩니다. 한 명만 잡아 보세요.', done: s => s.score >= 1 },
    { id: 'chain',  copy: '감염자는 알아서 번집니다. 세 명까지 가 보세요.', done: s => s.score >= 3 },
    { id: 'dash',   copy: '오른쪽 큰 버튼은 대시 — 백신을 피할 때 씁니다.', done: s => s.dashed },
  ];

  let index = 0, onDone = null, watching = 0, origin = null, step = 0;

  /* 컷을 바꿀 때 **판을 다시 만들지 않는다.** 처음 한 번만 짓고, 그다음부터는 그림 주소와 글만 갈아 끼운다.
     왜: 탭마다 innerHTML 을 통째로 갈면 1280px WebP 를 매번 새로 디코딩한다.
     갤럭시 A12 같은 기기에서 건너뛰기를 연타하면 그 일이 쌓여 **3초씩 멈췄다**(2026-10-18 재현).
     같은 이유로 ① 연타는 묶어서 한 번만 받고 ② 다음 그림을 미리 받아 둔다. */
  const GAP = 260;            // 이 간격 안의 연타는 한 번으로 본다
  let last = 0, closing = false;

  function build() {
    const host = $('intro');
    host.innerHTML = `<div class="intro-cut" data-cut="">
      <img class="intro-art" alt="">
      <div class="intro-lines"></div>
      <div class="intro-foot"><span class="intro-dots">${CUTS.map(() => '<i></i>').join('')}</span>
        <button class="intro-skip" id="intro-skip">건너뛰기</button></div>
      <span class="intro-tap">화면을 누르면 다음</span>
    </div>`;
    $('intro-skip').onclick = e => { e.stopPropagation(); finish(); };
    host.hidden = false;
  }
  function preload(n) {           // 다음 컷을 미리 받아 둔다 — 넘길 때 디코딩이 거기서 시작되지 않게
    const cut = CUTS[n];
    if (!cut) return;
    const img = new Image();
    img.src = 'assets/intro/' + cut.art + '.webp';
  }
  function draw() {
    const host = $('intro');
    const cut = CUTS[index];
    if (!cut) return;
    if (!host.querySelector('.intro-cut')) build();
    const box = host.querySelector('.intro-cut');
    box.className = 'intro-cut tone-' + cut.tone;
    box.dataset.cut = cut.art;
    const art = box.querySelector('.intro-art');
    const src = 'assets/intro/' + cut.art + '.webp';
    if (!art.getAttribute('src') || !art.getAttribute('src').endsWith(src)) art.setAttribute('src', src);
    box.querySelector('.intro-lines').innerHTML = cut.lines.map(l => `<p>${l}</p>`).join('');
    box.querySelectorAll('.intro-dots i').forEach((dot, i) => dot.className = i === index ? 'on' : '');
    host.hidden = false;
    preload(index + 1);
  }
  function next() {
    const now = Date.now();
    if (closing || now - last < GAP) return;    // 연타를 묶는다
    last = now;
    if (++index >= CUTS.length) finish(); else draw();
  }
  function finish() {
    if (closing) return;                        // 두 번 끝내지 않는다
    closing = true;
    const host = $('intro');
    host.hidden = true;
    host.innerHTML = '';
    markSeen();
    const done = onDone; onDone = null;
    if (done) done();
  }
  function play(after) {
    index = 0; onDone = after; closing = false; last = 0;
    build(); draw();
  }

  /* ── 튜토리얼 ── */
  function tutorial() {
    step = 0; origin = null;
    const box = $('tutorial');
    box.hidden = false;
    show();
    cancelAnimationFrame(watching);
    const tick = () => {
      watching = requestAnimationFrame(tick);
      const snap = window.patientZero?.snapshot?.();
      if (!snap || snap.mode !== 'playing') return;
      if (!origin) origin = { x: snap.player.x, y: snap.player.y };
      const state = {
        score: snap.score,
        moved: Math.hypot(snap.player.x - origin.x, snap.player.y - origin.y) > 60,
        dashed: snap.player.cooldown > 0,
      };
      if (STEPS[step] && STEPS[step].done(state)) {
        if (++step >= STEPS.length) return done();
        show();
      }
    };
    tick();
  }
  function show() {
    const box = $('tutorial');
    if (!STEPS[step]) return;
    box.innerHTML = `<b>STEP ${step + 1} / ${STEPS.length}</b><p>${STEPS[step].copy}</p>`;
  }
  function done() {
    cancelAnimationFrame(watching); watching = 0;
    const box = $('tutorial');
    box.innerHTML = `<b>준비 끝</b><p>남은 시간 동안 최대한 많이 감염시키세요.</p>`;
    setTimeout(() => { box.hidden = true; box.innerHTML = ''; }, 2600);
  }
  function stop() { cancelAnimationFrame(watching); watching = 0; const box = $('tutorial'); if (box) { box.hidden = true; box.innerHTML = ''; } }

  document.addEventListener('DOMContentLoaded', () => {
    const host = $('intro');
    if (host) host.addEventListener('click', e => { if (!e.target.closest('#intro-skip')) next(); });
  });
  return { play, tutorial, stop, seen, cuts: CUTS, steps: STEPS };
})();
