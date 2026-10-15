/* 캐릭터 선택 화면 — 시안에 있는데 기존 markup 에 없던 것들을 **얹는다**.
   로마자 이름 · 대사 인용 · CV 칸 · 상세/스킬/스토리 탭 · 카드 NEW 딱지 · 오른쪽 넘김 화살표.

   progression.js 는 손대지 않는다 — 그쪽이 `#dialog-content` 를 통째로 다시 쓰는 걸 지켜보다
   그때마다 다시 얹는다(필터·정렬·카드 선택 때마다 새로 그린다).
   나머지 모양새(크기·배치·박스)는 전부 style.css 에서 잡는다.

   로마자는 id 가 곧 로마자라 따로 표를 두지 않는다 — sera → SERA.
   첫 대사는 위에 인용으로 걸리니 스토리 탭은 **그다음 줄부터** 보여 준다(같은 말을 두 번 쓰지 않게).
   NEW 는 **진짜 새것**일 때만 붙는다: 가지고 있는데 이 화면에서 아직 못 본 캐릭터.
   레벨은 적지 않는다 — 이 게임에 캐릭터 레벨이 없다(없는 숫자는 안 쓴다). */
(() => {
  const SEEN = 'patient-zero-seen-v1';
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const ROLE_ICON = { 감염: 'skull', 기동: 'run', 지원: 'cross', 방어: 'shield' };

  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };
  const markSeen = ids => { try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen(), ...ids])])); } catch {} };

  function decorate(root) {
    const browser = root.querySelector('.character-browser');
    if (!browser || browser.dataset.dressed) return;
    browser.dataset.dressed = '1';

    const id = browser.querySelector('[data-select]')?.dataset.select;
    const c = id && window.Cast?.by?.[id];
    if (!c) return;

    // ── 왼쪽: 로마자 이름 · 대사 · CV ──
    const caption = browser.querySelector('.character-keyart-caption');
    const h3 = caption?.querySelector('h3');
    if (h3 && !caption.querySelector('.ch-roman')) {
      h3.insertAdjacentHTML('afterend', `<span class="ch-roman">${esc(c.id.toUpperCase())}</span>`);
    }
    const profile = browser.querySelector('.character-profile');
    const keyart = browser.querySelector('.character-keyart');
    if (keyart && !profile.querySelector('.ch-quote')) {
      const line = (c.lines && c.lines[0]) || '';
      keyart.insertAdjacentHTML('afterend',
        `<p class="ch-quote">“${esc(line)}”</p>
         <div class="ch-cv"><span>CV. 미정</span><svg viewBox="0 0 24 24"><use href="#i-sound"/></svg></div>`);
    }

    // ── 왼쪽 아래: 상세 정보 / 스킬 / 스토리 ──
    const specs = browser.querySelector('.character-specs');
    const passive = browser.querySelector('.character-passive');
    if (specs && !profile.querySelector('.ch-tabs')) {
      specs.insertAdjacentHTML('beforebegin',
        `<div class="ch-tabs" role="tablist">
           <button data-ch="detail" class="on" role="tab" aria-selected="true">상세 정보</button>
           <button data-ch="skill" role="tab" aria-selected="false">스킬</button>
           <button data-ch="story" role="tab" aria-selected="false">스토리</button>
         </div>`);
      // 상세 = 능력치 + 고유 스킬 한 줄 (시안과 같은 기본 탭)
      const detail = document.createElement('div');
      detail.className = 'ch-pane'; detail.dataset.pane = 'detail';
      specs.parentNode.insertBefore(detail, specs);
      detail.appendChild(specs);
      if (passive) detail.appendChild(passive);

      detail.insertAdjacentHTML('afterend',
        `<div class="ch-pane" data-pane="skill" hidden>
           <div class="ch-skill"><h4>${esc(c.passive)}</h4><p>${esc(c.copy)}</p></div>
           <dl class="ch-numbers">
             <div><dt>이동 속도</dt><dd>${c.speed}</dd></div>
             <div><dt>백신 피해</dt><dd>${c.damage}</dd></div>
             <div><dt>방어막</dt><dd>${c.shield}초</dd></div>
             <div><dt>연쇄 회복</dt><dd>+${c.heal}</dd></div>
           </dl>
         </div>
         <div class="ch-pane" data-pane="story" hidden>
           ${(c.lines || []).slice(1).map(l => `<p class="ch-line">“${esc(l)}”</p>`).join('')
             || '<p class="ch-line">아직 더 들려줄 말이 없습니다.</p>'}
         </div>`);

      const tabs = [...profile.querySelectorAll('[data-ch]')];
      const panes = [...profile.querySelectorAll('[data-pane]')];
      tabs.forEach(t => t.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        tabs.forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', String(x === t)); });
        panes.forEach(p => { p.hidden = p.dataset.pane !== t.dataset.ch; });
      });
    }

    // ── 오른쪽: 새로 얻은 캐릭터에 NEW, 한정 모집에 특별 모집 ──
    const owned = window.Progression?.snapshot?.().owned || [];
    const already = seen();
    for (const card of browser.querySelectorAll('.portrait-card[data-agent]')) {
      const who = window.Cast.by[card.dataset.agent];
      if (!who || card.querySelector('.ch-flag')) continue;
      const flag = who.limited ? ['특별 모집', 'pick']
        : (owned.includes(who.id) && !already.includes(who.id)) ? ['NEW', 'new'] : null;
      if (flag) card.insertAdjacentHTML('afterbegin', `<i class="ch-flag ${flag[1]}">${flag[0]}</i>`);
      const role = card.querySelector('.portrait-card-copy small');
      if (role) role.classList.add('ch-role');
    }

    // ── 카드 줄 오른쪽 끝의 넘김 화살표 ──
    const scroll = browser.querySelector('.character-scroll');
    if (scroll && !browser.querySelector('.ch-next')) {
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'ch-next'; next.setAttribute('aria-label', '다음 캐릭터');
      next.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8"/></svg>';
      next.onclick = e => { e.preventDefault(); scroll.scrollBy({ left: scroll.clientWidth * .7, behavior: 'smooth' }); };
      scroll.parentNode.appendChild(next);
    }
  }

  function init() {
    const host = document.getElementById('dialog-content');
    if (!host) return;
    new MutationObserver(() => decorate(host)).observe(host, { childList: true });
    decorate(host);
    // 화면을 닫을 때 본 것으로 친다 — 다음에 열면 NEW 가 빠진다
    document.getElementById('info-dialog')?.addEventListener('close', () => {
      markSeen(window.Progression?.snapshot?.().owned || []);
    });
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
