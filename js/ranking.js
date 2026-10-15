/* 랭킹 화면의 두 탭 — 「내 최고 기록」과 「유저 순위」.

   순위는 **챕터를 가리지 않고 최고 기록 하나**로 센다 — 어느 챕터에서 냈든 제일 높은 숫자가 그 사람의 기록이다.

   계정 서버(server/account.mjs)의 순위표를 그대로 보여 준다. 서버가 없거나 못 닿으면
   **지어내지 않는다** — 가짜 상대를 깔면 제 실력을 잘못 읽게 된다. 이 기기의 기록만 보여 주고
   무엇이 없어서 비었는지 그대로 적는다.
     GET  /api/rank   → [{ name, avatar, score, chapter, mine }, …] (점수 내림차순, 상위 50)
     POST /api/rank   → { score, chapter, name, avatar }   **로그인한 사람만**

   비로그인은 **보기만 한다** — 남의 순위는 보이고, 제 기록은 나가지 않는다(2026-10-15 결정).
   올리는 쪽을 끄는 스위치는 없다. 로그인하면 이름과 대표 캐릭터가 공개된다 —
   그 사실이 site/privacy.html 에 적혀 있다. */
window.Ranking = (() => {
  // 주소는 로그인과 같은 서버에서 온다(js/auth.js 의 PZ_API). 따로 적어 두면 언젠가 어긋난다.
  const api = () => (window.PZ_API || localStorage.getItem('patient-zero-api') || '').replace(/\/$/, '');
  const ENDPOINT = () => (api() ? api() + '/api/rank' : '');
  const PROFILE = 'patient-zero-profile-v1';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const myName = () => {
    try { return JSON.parse(localStorage.getItem(PROFILE) || '{}').name || 'INFECTED_01'; }
    catch { return 'INFECTED_01'; }
  };
  // 프로필에서 고른 대표 캐릭터 — 순위표에 그 얼굴이 뜬다
  const myAvatar = () => {
    try { return JSON.parse(localStorage.getItem(PROFILE) || '{}').avatar || 'zero'; }
    catch { return 'zero'; }
  };
  const faceOf = id => (window.Cast ? Cast.face(Cast.by[id] ? id : 'zero') : '');
  const chapters = () => window.Outbreak.chapters.filter(c => window.Outbreak.unlocked(c.n));

  // ── 내 최고 기록: 챕터별 한 줄 ──
  function mine() {
    const O = window.Outbreak;
    const rows = chapters().map(c => {
      const best = O.bestOf(c.n), stars = O.stars(c, best), done = O.progress.cleared.includes(c.n);
      return `<div class="run-row"><span>CH ${c.n} · ${esc(c.name)}</span><b>${best || '—'}${best ? '명' : ''}</b>
        <small>${done ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '미통과 · 통과선 ' + c.quota}</small></div>`;
    }).join('');
    const past = [...(O.history || [])].map(r => {
      const c = O.chapters.find(c => c.n === Number(r.chapter));
      return `<div class="run-row"><span>${c ? 'CH ' + c.n + ' · ' + esc(c.name) : '작전 기록'}</span>
        <b>${Number(r.score) || 0}명</b><small>${r.cleared ? '통과' : '미통과'} · ${Number(r.seconds) || 0}초</small></div>`;
    }).join('');
    return `<p class="dialog-note">모든 판은 ${O.round}초로 같습니다 — 그래서 같은 챕터 안에서는 기록을 그대로 견줄 수 있습니다.
      뒤 챕터일수록 인파가 많아 기록의 천장이 높아집니다.</p>
      <div class="chapter-record">${rows}</div>
      ${past ? `<h3 class="section-label">최근 작전</h3><div class="chapter-record">${past}</div>` : ''}`;
  }


  // ── 시연용 가짜 순위 ──────────────────────────────────────────────
  // 켜는 법: 주소에 ?mockrank=12. 기본은 꺼져 있고, 켜도 화면에 시연용이라고 적는다.
  // 진짜 서버가 붙으면 이 길은 쓸 일이 없다 — 지어낸 숫자를 기록처럼 두지 않는다.
  const MOCK_NAMES = ['야간보행', 'SPREADER', '감염자_07', '첫차탑승', 'NOVA_FAN', '서울_0번',
    'quiet_hands', '밤의산책', 'ZERO_K', '통행금지', 'red_eyes', '마지막_칸', 'PATIENT_X', '불꺼진역'];
  function mockCount() {
    try {
      const n = Number(new URLSearchParams(location.search).get('mockrank'));
      return Number.isFinite(n) && n > 0 ? Math.min(99, Math.round(n)) : 0;
    } catch { return 0; }
  }
  function mockRows(n, me) {
    const O = window.Outbreak, open = O.chapters.filter(c => c.n <= 12);
    const top = Math.max(me.score, 60) * 2.2;
    const names = Array.from({ length: n }, (_, i) => MOCK_NAMES[i % MOCK_NAMES.length] + (i < MOCK_NAMES.length ? '' : '_' + (Math.floor(i / MOCK_NAMES.length) + 1)));
    const rows = names.map((name, i) => ({
      name,
      score: Math.round(top * Math.pow(0.88, i) + (i * 7919 % 23)),   // 위에서부터 완만히 떨어진다
      chapter: open[(i * 5 + 3) % open.length]?.n ?? 1,
      avatar: (window.Cast ? Cast.roster[(i * 7 + 2) % Cast.roster.length].id : 'zero'),
    }));
    if (me.score) rows.push(me);
    return rows.sort((a, b) => b.score - a.score);
  }
  // ── 유저 순위: 챕터와 무관하게 최고 기록 하나로 줄을 세운다 ──
  // 내 최고 기록과 그게 어느 챕터에서 나왔는지
  function myBest() {
    const O = window.Outbreak;
    let score = 0, at = null;
    for (const c of O.chapters) { const b = O.bestOf(c.n); if (b > score) { score = b; at = c; } }
    return { name: myName(), avatar: myAvatar(), score, chapter: at ? at.n : null, at };
  }

  const TOP = 50;   // 그 아래는 줄만 길어지고 아무도 안 본다
  function board(list, trim = true) {
    const O = window.Outbreak, me = myName();
    const rows = trim ? list.slice(0, TOP) : list;
    let tail = '';
    if (trim && list.length > TOP) {
      const at = list.findIndex(r => r.name === me);
      if (at >= TOP) tail = '<p class="rank-cut">… ' + (at - TOP + 1) + '명 생략</p>' +
        board([list[at]], false).replace('<em>1</em>', '<em>' + (at + 1) + '</em>');
    }
    return rows.map((r, i) => {
      const c = O.chapters.find(c => c.n === Number(r.chapter));
      return `<div class="rank-row${r.name === me ? ' me' : ''}"><em>${i + 1}</em>
        <img class="rank-face" src="${faceOf(r.avatar)}" alt="" loading="lazy">
        <span>${esc(r.name)}</span><b>${Number(r.score) || 0}명</b>
        <small>${c ? 'CH ' + c.n + ' · ' + esc(c.name) : '—'}</small></div>`;
    }).join('') + tail;
  }

  async function fetchBoard() {
    const url = ENDPOINT();
    if (!url) return null;
    try {
      const token = window.Auth?.token?.();
      const r = await fetch(url, { headers: { Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
      if (!r.ok) return null;
      const rows = await r.json();
      return Array.isArray(rows) ? rows : null;
    } catch { return null; }
  }

  function renderBoard(host) {
    const me = myBest();
    const mock = mockCount();
    if (mock) {   // 시연용 — 화면이 어떻게 보이는지만 본다
      host.innerHTML = '<p class="rank-mock">시연용 가짜 순위입니다 — 실제 기록이 아닙니다 (?mockrank)</p>' +
        board(mockRows(mock, me)) +
        '<p class="dialog-note">챕터와 상관없이 가장 높은 기록 하나로 줄을 세우고, 상위 ' + TOP + '위까지 보여 줍니다.</p>';
      return;
    }
    host.innerHTML = '<p class="dialog-note">불러오는 중…</p>';
    fetchBoard().then(rows => {
      if (rows) {
        // 로그인하지 않은 사람에게는 제 기록이 올라가지 않는다는 걸 말해 준다 — 모르고 지나가면 안 되는 사실이다
        const signed = !!window.Auth?.token?.();
        host.innerHTML = board(rows) +
          '<p class="dialog-note">챕터와 상관없이 가장 높은 기록 하나로 줄을 세우고, 상위 ' + TOP + '위까지 보여 줍니다.</p>' +
          (signed ? '' : '<p class="dialog-note">로그인하면 당신의 기록도 이 줄에 들어갑니다. 지금은 보기만 합니다 — 이 기기의 기록은 나가지 않습니다.</p>');
        return;
      }
      // 서버가 없다. 있는 것만 보여 주고, 없는 이유를 적는다.
      host.innerHTML = (me.score ? board([me]) : '<p class="dialog-note">아직 기록이 없습니다. 한 판 돌고 오세요.</p>') +
        // 한 문장을 태그로 쪼개면 번역기가 조각을 보게 된다 — 한 덩어리로 둔다
        `<p class="dialog-note">챕터와 상관없이 가장 높은 기록 하나로 줄을 세웁니다. 지금 줄에 선 건 이 기기의 기록뿐입니다 — 기록 서버에 닿지 못했습니다. 없는 상대를 지어내 채우지는 않습니다.</p>`;
    });
  }

  // ── 탭 두 개 ──
  function panel() {
    return `<div class="rank-tabs" role="tablist">
        <button data-rank="mine" class="on" role="tab" aria-selected="true">내 최고 기록</button>
        <button data-rank="board" role="tab" aria-selected="false">유저 순위</button>
      </div>
      <div class="rank-pane" data-pane="mine">${mine()}</div>
      <div class="rank-pane" data-pane="board" hidden><div id="rank-board"></div></div>`;
  }

  function wire(root) {
    const tabs = [...root.querySelectorAll('[data-rank]')];
    const panes = [...root.querySelectorAll('[data-pane]')];
    const host = root.querySelector('#rank-board');
    let loaded = false;
    tabs.forEach(t => t.onclick = () => {
      tabs.forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', String(x === t)); });
      panes.forEach(p => { p.hidden = p.dataset.pane !== t.dataset.rank; });
      if (t.dataset.rank === 'board' && !loaded) { loaded = true; renderBoard(host); }
    });
  }

  // 서버가 생기면 판이 끝날 때마다 이걸 불러 올리면 된다
  // 판이 끝날 때마다 game.js 가 부른다. **로그인하지 않았으면 아무것도 보내지 않는다.**
  function submit() {
    const url = ENDPOINT(), token = window.Auth?.token?.();
    if (!url || !token) return Promise.resolve(false);
    const me = myBest();
    if (!me.score) return Promise.resolve(false);
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ score: me.score, chapter: me.chapter, name: me.name, avatar: me.avatar }),
    }).then(r => r.ok).catch(() => false);
  }

  return { panel, wire, submit, myBest, online: () => !!ENDPOINT() };
})();
