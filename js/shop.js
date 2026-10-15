/* 상점 — 로비 지갑의 ＋ 로 들어온다.
   결제는 아직 **연결되어 있지 않다.** 그래서 상품은 값만 적어 두고 누를 수 없게 두고,
   그 사실을 화면에 그대로 적는다. 카드 번호 같은 건 받지 않는다.
   지금 실제로 되는 것: 조각 → 모집권 교환, 무료로 모집권 얻는 길 안내. */
window.Shop = (() => {
  const $ = id => document.getElementById(id);
  // 값은 Progression 의 ECONOMY 표 하나에서 온다 — 여기서 숫자를 다시 적으면 언젠가 어긋난다
  const E = () => Progression.economy;
  /* 값은 적되 팔지는 않는다. 스토어 심사 전까지 이 칸은 잠겨 있다.
     sku = 두 스토어와 서버가 **같은 문자열**을 써야 하는 인앱 상품 ID.
     한 글자만 달라도 결제는 되고 물건은 안 들어간다. 지운 ID 는 재사용도 안 된다 — SHIPPING.md §5.
     장수를 ID 에 박아 둔 이유: 스토어 상품 설명과 게임 화면이 어긋나지 않는다(copycat 이 거기서 걸렸다).
     바꿀 때는 STORE.md 의 표도 같이 고친다 — test/store-pay-test.cjs 가 둘을 맞춰 본다. */
  const PACKS = [
    { id: 'small',  sku: 'ticket_10',  name: '모집권 10장',  price: '₩1,100',  bonus: '' },
    { id: 'medium', sku: 'ticket_60',  name: '모집권 60장',  price: '₩5,500',  bonus: '+5장' },
    { id: 'large',  sku: 'ticket_130', name: '모집권 130장', price: '₩11,000', bonus: '+15장' },
    { id: 'huge',   sku: 'ticket_400', name: '모집권 400장', price: '₩33,000', bonus: '+60장' },
  ];

  function markup() {
    const state = Progression.snapshot();
    const eco = E(), canTrade = state.fragments >= eco.trade.fragments;
    const skills = Outbreak.skills.map(s => ({ ...s, level: Progression.supply(s.id), cost: Progression.upgradeCost(s.id) }));
    return `<div class="shop-screen">
      <div class="shop-wallet">
        <span><img class="icon-art sm" src="assets/icons/ticket.webp" alt="">모집권 <b>${state.tickets}</b></span>
        <span><img class="icon-art sm" src="assets/icons/sample.webp" alt="">검체 <b>${state.cash}</b></span>
        <span><img class="icon-art sm" src="assets/icons/fragment.webp" alt="">조각 <b>${state.fragments}</b></span>
      </div>
      <h3 class="shop-head">모집권 꾸러미</h3>
      <div class="shop-packs">${PACKS.map(p => `<article class="shop-pack">
        <img class="icon-art lg" src="assets/icons/ticket.webp" alt="">
        <strong>${p.name}</strong>${p.bonus ? `<em>${p.bonus}</em>` : ''}
        <button disabled>${p.price}</button><small>준비 중</small>
      </article>`).join('')}</div>
      <p class="shop-note">결제는 아직 연결하지 않았습니다. 스토어에 올린 뒤에 열립니다. 모집권은 캐릭터 모집에만 쓰고, 플레이로는 챕터 첫 통과 때만 들어옵니다.</p>
      <h3 class="shop-head">아이템 상점 · 검체</h3>
      <div class="shop-items">${skills.map(k => `<article class="shop-item">
        <img class="icon-art lg" src="${k.art}" alt="">
        <strong>${k.name}</strong><em>출격 지급 ${k.level}개</em>
        <button data-upgrade="${k.id}" ${k.cost == null || state.cash < k.cost ? 'disabled' : ''}>${k.cost == null ? '최대' : '검체 ' + k.cost}</button>
        <small>${k.cost == null ? '더 올릴 수 없습니다' : '지급 +1 (영구)'}</small>
      </article>`).join('')}</div>
      <p class="shop-note">검체는 출격·일일 임무·챕터 첫 통과로 모읍니다. 모집권으로는 아이템을 살 수 없고, 검체로는 모집권을 살 수 없습니다.</p>
      <h3 class="shop-head">조각으로 바꾸기</h3>
      <div class="shop-trade">
        <span><img class="icon-art sm" src="assets/icons/fragment.webp" alt="">조각 ${eco.trade.fragments}개</span>
        <i>→</i>
        <span><img class="icon-art sm" src="assets/icons/sample.webp" alt="">검체 ${eco.trade.cash}</span>
        <button class="red-button" id="shop-trade" ${canTrade ? '' : 'disabled'}>${canTrade ? '바꾸기' : '조각이 부족합니다'}</button>
      </div>
      <h3 class="shop-head">검체 모으기</h3>
      <div class="shop-free">
        <button data-shop-go="missions"><strong>일일 임무</strong><small>감염 ${eco.daily.infections} · 작전 ${eco.daily.runs} · 챕터 통과 ${eco.daily.clears} — 하루에 ${eco.daily.infections + eco.daily.runs + eco.daily.clears}</small></button>
        <button data-shop-go="play"><strong>챕터 출격</strong><small>감염 2명당 1 · 통과 +20 · 완주 +10 · 챕터 첫 통과는 검체 ${eco.firstClear.cash}와 모집권 ${eco.firstClear.tickets}장</small></button>
      </div>
    </div>`;
  }

  function open() {
    Panels.reset();
    const dialog = $('info-dialog');
    $('dialog-title').textContent = '상점';
    dialog.classList.add('shop-dialog');
    dialog.addEventListener('close', () => dialog.classList.remove('shop-dialog'), { once: true });
    $('dialog-content').innerHTML = markup();
    bind();
    dialog.showModal();
  }
  function bind() {
    Panels.apply('shop');
    document.querySelectorAll('[data-shop-go]').forEach(b => b.onclick = () => {
      const where = b.dataset.shopGo;
      $('info-dialog').addEventListener('close',()=>{if(where==='missions')Progression.open('missions');else $('hub-play')?.click();},{once:true});
      $('info-dialog').close();
    });
    const again = () => { $('dialog-content').innerHTML = markup(); bind(); };
    if ($('shop-trade')) $('shop-trade').onclick = () => { if (Progression.trade()) again(); };
    document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => { if (Progression.upgrade(b.dataset.upgrade)) again(); });
  }
  return { open, packs: PACKS };
})();
