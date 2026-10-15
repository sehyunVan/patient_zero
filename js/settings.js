/* 설정 — 왼쪽 탭(게임·그래픽·사운드·언어·계정) + 오른쪽 내용.
   여기 있는 스위치는 전부 실제로 무언가를 바꾼다. 꾸미기용 항목은 두지 않는다.
   값은 이 브라우저에 저장되고, 게임 쪽(js/game.js)은 Settings.* 로 읽어 간다. */
window.Settings = (() => {
  const KEY = 'patient-zero-settings-v1';
  const $ = id => document.getElementById(id);
  const defaults = {
    screen: 'window',      // 전체화면 / 창모드
    quality: 'high',       // 낮음·보통·높음 → 그리는 해상도 배율
    vibrate: true,         // 감염·피격 때 진동(지원하는 기기만)
    notify: true,          // 화면 위 알림 띠
    shake: true,           // 피격·충격파 때 화면 흔들림
    particles: 'normal',   // 파티클 양
    minimap: true,         // 미니맵 표시
    sound: true,           // 효과음
    bgm: true,             // 배경음악(js/bgm.js 가 그 자리에서 합성한다)
    volume: 'normal',      // 음량
    lang: 'ko',
  };
  let data = { ...defaults };
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && typeof saved === 'object') data = { ...data, ...saved }; } catch {}
  // 효과음은 예전 키로도 저장돼 있었다 — 처음 한 번은 그 값을 이어받는다
  try { const legacy = localStorage.getItem('patient-zero-sound'); if (legacy !== null && !localStorage.getItem(KEY)) data.sound = legacy === 'true'; } catch {}

  const DPR = { low: 1, normal: 1.5, high: 2 };
  const VOLUME = { quiet: .5, normal: 1, loud: 1.7 };
  const PARTICLES = { few: .45, normal: 1, many: 1.7 };

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); localStorage.setItem('patient-zero-sound', String(data.sound)); } catch {} apply(); }
  function apply() {
    document.body.classList.toggle('no-minimap', !data.minimap);
    if (window.patientZero?.applySettings) window.patientZero.applySettings();
  }
  const get = key => data[key];
  const dpr = () => Math.min(devicePixelRatio || 1, DPR[data.quality] ?? 2);
  const volume = () => (data.sound ? VOLUME[data.volume] ?? 1 : 0);
  const particles = () => PARTICLES[data.particles] ?? 1;
  const buzz = ms => { if (data.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } };

  // 전체화면은 사용자의 손짓 안에서만 걸린다 — 버튼을 누른 그 자리에서 요청한다
  async function setScreen(mode) {
    data.screen = mode; save();
    try {
      if (mode === 'full' && !document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      if (mode === 'window' && document.fullscreenElement) await document.exitFullscreen?.();
    } catch {}
    render();
  }
  document.addEventListener('fullscreenchange', () => {
    data.screen = document.fullscreenElement ? 'full' : 'window';
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    if ($('settings-screen')) render();
  });

  let tab = 'game';
  const seg = (key, options, current) => `<div class="seg" role="group">${options.map(([value, label]) =>
    `<button data-set="${key}" data-value="${value}" class="${current === value ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  const toggle = (key, label, copy) => `<div class="set-row"><span>${label}<small>${copy}</small></span>
    <button class="switch ${data[key] ? 'on' : ''}" data-toggle="${key}" role="switch" aria-checked="${data[key]}" aria-label="${label}"><i></i></button></div>`;
  const row = (label, copy, control) => `<div class="set-row"><span>${label}<small>${copy}</small></span>${control}</div>`;

  function body() {
    if (tab === 'game') return `
      ${row('화면 모드', '전체화면은 주소창과 하단 바를 감춘다', seg('screen', [['full', '전체화면'], ['window', '창모드']], data.screen))}
      ${row('화질 설정', '그리는 해상도. 낮출수록 가볍다', seg('quality', [['low', '낮음'], ['normal', '보통'], ['high', '높음']], data.quality))}
      ${toggle('vibrate', '진동', '감염과 피격에 짧게 — 지원하는 기기만')}
      ${toggle('notify', '알림', '화면 위에 뜨는 안내 띠')}`;
    if (tab === 'graphic') return `
      ${toggle('shake', '화면 흔들림', '피격·충격파에 화면이 흔들린다')}
      ${row('파티클', '감염·폭발에 튀는 입자의 양', seg('particles', [['few', '적게'], ['normal', '보통'], ['many', '많게']], data.particles))}
      ${toggle('minimap', '미니맵', '오른쪽 위 실시간 지도')}
      <p class="set-note">현재 그리는 배율 ×${dpr().toFixed(1)} · 기기 배율 ×${(devicePixelRatio || 1).toFixed(1)}</p>`;
    if (tab === 'sound') return `
      ${toggle('sound', '효과음', '감염 · 아이템 · 백신 사격')}
      ${toggle('bgm', '배경음악', '로비는 잔잔하게, 전투는 쫓기듯')}
      ${row('음량', '효과음 크기', seg('volume', [['quiet', '작게'], ['normal', '보통'], ['loud', '크게']], data.volume))}
      <button class="set-button" id="settings-test-sound">소리 확인</button>
      <p class="set-note">배경음악은 파일 없이 그 자리에서 합성합니다 — 같은 구간이 두 번 나오지 않습니다.</p>`;
    if (tab === 'lang') {
      // 선택지는 번역기가 들고 있는 목록을 그대로 쓴다 — 언어를 늘려도 여기를 고칠 일이 없다
      const langs = (window.LANGS || [{ id: 'ko', n: '한국어' }]).map(l => [l.id, l.n]);
      const left = (window.I18N && I18N.lang !== 'ko') ? I18N.missing.size : 0;
      return `
      ${row('언어', '화면에 쓰이는 말', seg('lang', langs, (window.I18N || data).lang))}
      <p class="set-note">원문과 음성은 한국어입니다. 번역이 빠진 문장은 한국어로 보입니다${left ? ` (이 화면에 ${left}개)` : ''}.</p>`;
    }
    const state = window.Progression?.snapshot?.() || { owned: [], tickets: 0, fragments: 0 };
    const cleared = window.Outbreak?.progress?.cleared?.length || 0;
    return `
      ${row('저장 위치', '계정 서버에 올리지 않는다', '<b class="set-value">이 브라우저</b>')}
      <p class="set-note">캐릭터 ${state.owned.length}명 · 모집권 ${state.tickets}장 · 조각 ${state.fragments}개 · 통과한 챕터 ${cleared}개</p>
      <button class="set-button" id="settings-login">로그인 하기</button>
      <button class="set-button danger" id="settings-reset">저장 데이터 초기화</button>
      <p class="set-note">초기화하면 캐릭터·기록·재화가 모두 사라집니다. 되돌릴 수 없습니다.</p>`;
  }

  const TABS = [['game', '게임', 'i-home2'], ['graphic', '그래픽', 'i-monitor'], ['sound', '사운드', 'i-sound'], ['lang', '언어', 'i-globe'], ['account', '계정', 'i-person']];

  function render() {
    Panels.reset();
    const host = $('dialog-content'); if (!host) return;
    host.innerHTML = `<div class="settings-screen" id="settings-screen">
      <nav class="settings-tabs" aria-label="설정 분류">${TABS.map(([id, label, icon]) =>
        `<button data-tab="${id}" class="${tab === id ? 'on' : ''}"><svg><use href="#${icon}"/></svg>${label}</button>`).join('')}</nav>
      <div class="settings-body">${body()}</div></div>`;
    Panels.apply('settings');
    host.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
    host.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const k = b.dataset.toggle; data[k] = !data[k]; save(); render(); if (k === 'vibrate' && data[k]) buzz(18); });
    host.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const k = b.dataset.set, v = b.dataset.value;
      if (k === 'screen') return setScreen(v);
      if (k === 'lang') { data.lang = v; save(); if (window.setLang) setLang(v); render(); return; }
      data[k] = v; save(); render();
    });
    if ($('settings-test-sound')) $('settings-test-sound').onclick = () => window.patientZero?.testSound?.();
    if ($('settings-login')) $('settings-login').onclick = () => { $('info-dialog').close(); $('login')?.click(); };
    if ($('settings-reset')) $('settings-reset').onclick = () => {
      if (!confirm('저장된 캐릭터·기록·재화가 모두 사라집니다. 초기화할까요?')) return;
      try { for (const k of Object.keys(localStorage)) if (k.startsWith('patient-zero')) localStorage.removeItem(k); } catch {}
      location.reload();
    };
  }

  function open(which) {
    if (which) tab = which;
    const dialog = $('info-dialog');
    $('dialog-title').textContent = '설정';
    dialog.classList.add('settings-dialog');
    // 머리말은 이 화면 동안만 바꾸고 닫을 때 되돌린다 — 다른 패널이 그대로 쓰는 자리다
    const eyebrow = dialog.querySelector('.eyebrow');
    if (eyebrow && !eyebrow.dataset.keep) { eyebrow.dataset.keep = eyebrow.innerHTML; eyebrow.innerHTML = '<span></span> SETTINGS'; }
    dialog.addEventListener('close', () => {
      dialog.classList.remove('settings-dialog');
      if (eyebrow && eyebrow.dataset.keep) { eyebrow.innerHTML = eyebrow.dataset.keep; delete eyebrow.dataset.keep; }
    }, { once: true });
    render();
    dialog.showModal();
  }
  document.addEventListener('DOMContentLoaded', apply);
  return { open, render, get, dpr, volume, particles, buzz, snapshot: () => ({ ...data }) };
})();
