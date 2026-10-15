/* 사진 모드 — 로비에서 UI 를 전부 걷어내고 그림만 남긴다. 스크린샷 찍으라고 있는 것.
   제 단추와 덮개를 스스로 만들어 붙인다. 로비 markup 과 game.js 는 건드리지 않는다.

   들어가기: 오른쪽 위 카메라 단추 · H 키
   나오기:  화면 아무 곳이나 누르기 · H 키 · ESC

   숨기는 법은 `#lobby.photo > *` 에 거는 한 줄이다(style.css). 선택자로 하나하나 세지 않으므로
   로비에 칸이 늘어나도 같이 숨는다 — 사진에 남는 건 캐릭터와 배경뿐. */
(() => {
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.2l1.6-2.4h6.4L16.8 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1"/><circle cx="12" cy="13" r="3.6"/></svg>';

  function init() {
    const lobby = document.getElementById('lobby');
    const utilities = document.querySelector('.lobby-utilities');
    if (!lobby || !utilities || document.getElementById('photo-hide')) return;

    const hide = document.createElement('button');
    hide.id = 'photo-hide';
    hide.type = 'button';
    hide.innerHTML = ICON;
    hide.setAttribute('aria-label', 'UI 숨기기');
    hide.title = 'UI 숨기기 (H)';
    utilities.appendChild(hide);

    // 사진 모드일 때 화면을 덮는다 — 어디를 눌러도 돌아온다
    const sheet = document.createElement('button');
    sheet.id = 'photo-exit';
    sheet.type = 'button';
    sheet.hidden = true;
    sheet.setAttribute('aria-label', 'UI 다시 보기');
    sheet.innerHTML = '<span>눌러서 돌아오기</span>';
    lobby.appendChild(sheet);

    let on = false, fade = 0;
    function set(next) {
      if (next === on) return;
      on = next;
      lobby.classList.toggle('photo', on);
      sheet.hidden = !on;
      clearTimeout(fade);
      if (on) {
        // 힌트는 잠깐만 — 바로 찍어도 사진에 글씨가 남지 않게
        sheet.classList.remove('faded');
        fade = setTimeout(() => sheet.classList.add('faded'), 1600);
      } else {
        hide.focus({ preventScroll: true });
      }
    }

    hide.onclick = e => { e.stopPropagation(); set(true); };
    sheet.onclick = () => set(false);
    addEventListener('keydown', e => {
      if (lobby.hidden || document.querySelector('dialog[open]')) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if (typing) return;
      if (e.code === 'KeyH') { e.preventDefault(); set(!on); }
      else if (on && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); set(false); }
    }, true);

    // 로비를 벗어나면(출격·화면 전환) 사진 모드는 풀어 둔다 — 돌아왔을 때 UI 가 없으면 갇힌다
    new MutationObserver(() => { if (lobby.hidden) set(false); })
      .observe(lobby, { attributes: true, attributeFilter: ['hidden'] });

    window.PhotoMode = { on: () => on, set };
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
