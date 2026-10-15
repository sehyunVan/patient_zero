/* 로비 한 바퀴 — 첫 전투가 끝나면 로비로 데려와서 **어디에 무엇이 있는지만** 짚어 준다.
   설명서가 아니다: 한 칸에 한 줄, 누르면 다음, 한 번 보면 다시 안 뜬다.

   구멍은 네 장의 판(위·아래·왼·오)으로 둘러싸서 만든다. clip-path 보다 싸고,
   가운데가 **진짜로 비어 있어서** 그 아래 화면이 가려지지 않는다.
   창 크기가 바뀌면 자리가 틀어지므로 다시 그린다. */
window.Tour = (() => {
  const KEY = 'patient-zero-tour-seen';
  const $ = id => document.getElementById(id);
  const seen = () => { try { return localStorage.getItem(KEY) === 'yes'; } catch { return true; } };
  const mark = () => { try { localStorage.setItem(KEY, 'yes'); } catch {} };

  // 로비에 실제로 있는 것만. 못 찾은 칸은 조용히 건너뛴다(화면이 바뀌어도 투어가 멈추지 않게).
  const SPOTS = [
    // #hub-hero 는 배경 전체를 덮는다 — 구멍이 화면만 해져서 가리는 뜻이 사라진다. 대표 칸을 짚는다.
    { at: '.hub-services',       line: '대표 감염자입니다. 화면의 캐릭터를 누르면 말을 겁니다.' },
    { at: '.hub-nav',            line: '아이템 · 랭킹 · 이벤트 · 설정은 왼쪽에 있습니다.' },
    { at: '#lobby-chapter-card', line: '지금 챕터입니다. 눌러서 다른 챕터를 고릅니다.' },
    { at: '#hub-wallet',         line: '모집권은 캐릭터 모집에만, 검체는 아이템 상점에서 씁니다.' },
    { at: '.lobby-bottom',       line: '캐릭터 · 인벤토리 · 임무 · 교환소는 아래쪽입니다.' },
    { at: '#hub-play',           line: '준비됐으면 출격. 한 판은 90초입니다.' },
  ];

  let step = 0, running = false, pending = false;

  function panel(x, y, w, h) {
    return '<i style="left:' + x + 'px;top:' + y + 'px;width:' + Math.max(0, w) + 'px;height:' + Math.max(0, h) + 'px"></i>';
  }
  function draw() {
    const host = $('tour');
    if (!host) return finish();
    const spot = SPOTS[step];
    const target = spot && document.querySelector(spot.at);
    if (!target) { step++; return step < SPOTS.length ? draw() : finish(); }
    const r = target.getBoundingClientRect();
    if (!r.width || !r.height) { step++; return step < SPOTS.length ? draw() : finish(); }
    const pad = 6;
    const box = {
      left: Math.max(0, r.left - pad), top: Math.max(0, r.top - pad),
      right: Math.min(innerWidth, r.right + pad), bottom: Math.min(innerHeight, r.bottom + pad),
    };
    // 말풍선은 구멍을 가리지 않는 쪽에 — 위쪽 자리가 좁으면 아래로 내린다
    const below = box.top < innerHeight * .45;
    const capStyle = below ? 'top:' + Math.min(innerHeight - 84, box.bottom + 10) + 'px'
                           : 'bottom:' + Math.min(innerHeight - 84, innerHeight - box.top + 10) + 'px';
    host.innerHTML =
      '<div class="tour-mask">' +
        panel(0, 0, innerWidth, box.top) +
        panel(0, box.bottom, innerWidth, innerHeight - box.bottom) +
        panel(0, box.top, box.left, box.bottom - box.top) +
        panel(box.right, box.top, innerWidth - box.right, box.bottom - box.top) +
        '<b class="tour-ring" style="left:' + box.left + 'px;top:' + box.top + 'px;width:' + (box.right - box.left) + 'px;height:' + (box.bottom - box.top) + 'px"></b>' +
        '<div class="tour-caption" style="' + capStyle + '">' +
          '<p>' + spot.line + '</p>' +
          '<span>' + (step + 1) + ' / ' + SPOTS.length + '</span>' +
          '<button id="tour-skip">건너뛰기</button>' +
        '</div>' +
      '</div>';
    host.hidden = false;
    $('tour-skip').onclick = e => { e.stopPropagation(); finish(); };
  }
  function next() { if (!running) return; if (++step >= SPOTS.length) finish(); else draw(); }
  function finish() {
    running = false; pending = false; mark();
    const host = $('tour');
    if (host) { host.hidden = true; host.innerHTML = ''; }
  }
  function start() {
    if (seen() || running) return false;
    step = 0; running = true;
    requestAnimationFrame(draw);          // 로비가 한 번 그려진 뒤에 자리를 잰다
    return true;
  }
  // 첫 전투가 시작되면 game.js 가 켜 둔다 — 그 판이 끝날 때 로비로 데려가는 표시다
  function arm() { if (!seen()) pending = true; }
  const armed = () => pending && !seen();

  document.addEventListener('DOMContentLoaded', () => {
    const host = $('tour');
    if (host) host.addEventListener('click', e => { if (!e.target.closest('#tour-skip')) next(); });
  });
  addEventListener('resize', () => { if (running) draw(); });
  return { start, arm, armed, seen, finish, spots: SPOTS };
})();
