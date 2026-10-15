/* 로비의 대표 캐릭터 칸 — MAIN CHARACTER · 이름 · 별 · 등급 · 「캐릭터 선택」.
   판때기는 없다 — 배경을 비워 이름과 표식만 로비 그림 위에 떠 있게 한다.
   칸 전체가 곧 단추다(이미 있던 [data-panel=characters] 버튼의 속만 갈아 끼운다).
   그래야 game.js 가 로드할 때 걸어 둔 클릭이 그대로 살아 있다 — 나중에 만든 단추는 안 걸린다.

   progression.js 는 손대지 않는다. 그쪽이 `#hub-character-name` 을 고쳐 쓰는 걸 지켜보다가
   그때 다시 그린다 — 같은 파일을 둘이 고치지 않으려고. */
(() => {
  const STARS = { SSR: 5, SR: 4, R: 3 };

  function init() {
    const host = document.querySelector('.hub-services > button[data-panel="characters"]');
    if (!host || host.querySelector('.mc-name')) return;

    host.classList.add('main-character');
    host.innerHTML =
      '<svg class="mc-mark" viewBox="0 0 100 100" aria-hidden="true"><use href="#i-biohazard"/></svg>' +
      '<small>MAIN CHARACTER</small>' +
      '<strong class="mc-name"></strong>' +
      '<span class="mc-row"><i class="mc-stars"></i><em class="mc-rarity"></em></span>' +
      '<span class="mc-go">캐릭터 선택 <b>›</b></span>' +
      '<span id="hub-character-name" hidden></span>';

    const name = host.querySelector('.mc-name');
    const stars = host.querySelector('.mc-stars');
    const rarity = host.querySelector('.mc-rarity');

    function render() {
      const id = window.Progression?.snapshot?.().selected;
      const c = id && window.Cast?.by?.[id];
      if (!c) return;
      name.textContent = c.name;
      stars.textContent = '★'.repeat(STARS[c.rarity] || 3);
      rarity.textContent = c.rarity;
      host.setAttribute('aria-label', `대표 캐릭터 ${c.name} ${c.rarity} · 캐릭터 선택`);
    }

    render();
    // 다른 캐릭터를 고르면 progression.js 가 이 칸을 고쳐 쓴다. 그걸 신호로 삼는다.
    const watch = document.getElementById('hub-character-name');
    new MutationObserver(render).observe(watch, { childList: true, characterData: true, subtree: true });
    // 로비로 돌아올 때도 한 번 — 첫 로드에 Progression 이 아직 안 깨어 있을 수 있다
    const lobby = document.getElementById('lobby');
    if (lobby) new MutationObserver(() => { if (!lobby.hidden) render(); })
      .observe(lobby, { attributes: true, attributeFilter: ['hidden'] });
    window.MainCharacter = { render };
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
