/* Local collection and single-character progression. No payments or remote account. */
window.Progression = (() => {
  // 캐스트는 js/cast.js 한 곳에서 온다 — 그림·수치·대사가 같은 줄에 있어야 어긋나지 않는다.
  const roster = Cast.roster;
  // 모집 확률표 — 뽑는 쪽과 공지하는 쪽이 **같은 표**를 본다.
  // 숫자를 안내문에 손으로 적어 두면 언젠가 어긋나고, 어긋난 순간 그건 거짓말이 된다.
  // 대부분은 아이템이 나오고 캐릭터는 가끔 나온다(2026-10-14 개편).
  const SUPPLY_MAX=5, SUPPLY_BASE=2, FRAGMENTS={SSR:30,SR:10,R:5};
  const PITY={character:30,ssr:80};   // 캐릭터 미출현 30회 → 다음은 캐릭터 확정 / SSR 미출현 80회 → 다음 캐릭터는 SSR
  /* 돈이 도는 길 — 주는 쪽·쓰는 쪽·공지가 **같은 표**를 본다 (2026-10-15 개편, 설계는 ECONOMY.md).
     규칙 셋. 깨지면 개편 전으로 돌아간 것이다:
       ① 모집권은 **결제로만** 들어온다. 예외는 1회성 해금 둘뿐(starter · firstClear) — 반복 수급은 0.
       ② 검체는 플레이로만 들어오고, **모집권으로 바뀌지 않는다.** 교환은 무료↔무료(조각→검체)만.
       ③ 모집권으로는 아이템을 못 산다. 모집권의 뜻은 「캐릭터」 하나다.
     test/economy-test.cjs 가 이 셋을 코드에서 직접 확인한다. */
  const ECONOMY={
    run:(score,cleared,survived)=>Math.floor(score/2)+(cleared?20:0)+(survived?10:0),
    daily:{infections:100,runs:60,clears:40},
    firstClear:{cash:150,tickets:2},   // 챕터마다 한 번. 19챕터 전부 = 모집권 38장
    starter:10,                        // 처음 켠 사람에게 쥐어 주는 모집권 — 한 번 돌려는 봐야 살 이유가 생긴다
    collection:{5:300,10:600,20:1500},
    trade:{fragments:30,cash:90},      // 조각 30 → 검체 90
    upgrade:[400,900,1800],            // 보급 Lv2→3 · 3→4 · 4→5 (영구)
  };
  const DRAW={
    standard:{label:'일반 모집',outcomes:[
      {kind:'character',weight:100,rarity:{SSR:8,SR:27,R:65}},
      {kind:'supply',weight:180},
      {kind:'fragment',weight:330,amount:8},
      {kind:'fragment',weight:150,amount:20},
      {kind:'fragment',weight:40,amount:50},
      {kind:'cash',weight:200,amount:120}]},
    pickup:{label:'픽업 모집',featured:'rea',outcomes:[
      {kind:'character',weight:150,rarity:{SSR:20,SR:40,R:90}},
      {kind:'supply',weight:170},
      {kind:'fragment',weight:310,amount:8},
      {kind:'fragment',weight:140,amount:20},
      {kind:'fragment',weight:40,amount:50},
      {kind:'cash',weight:190,amount:120}]},
  };
  const drawTable=b=>DRAW[b]||DRAW.standard;
  const drawTotal=b=>drawTable(b).outcomes.reduce((s,o)=>s+o.weight,0);
  const supplyOf=id=>Math.max(SUPPLY_BASE,Math.min(SUPPLY_MAX,Number(data.supply?.[id])||SUPPLY_BASE));
  const KEY='patient-zero-progression-v1';
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fresh=()=>({v:2,tickets:ECONOMY.starter,cash:0,fragments:0,owned:['zero','kai'],selected:'zero',draws:0,pity:0,dry:0,supply:{},firstClear:[],daily:{day:day(),infections:0,runs:0,clears:0,claimed:[]}});
  let data=fresh();
  try { const s=JSON.parse(localStorage.getItem(KEY)); if(s&&Array.isArray(s.owned)) {data={...data,...s};data.owned=[...new Set(['zero','kai',...s.owned.filter(id=>roster.some(c=>c.id===id))])];if(!data.owned.includes(data.selected))data.selected='zero';if(!data.supply||typeof data.supply!=='object')data.supply={};for(const k of ['tickets','cash','fragments','draws','pity','dry'])data[k]=Math.max(0,Math.floor(Number(data[k])||0));if(!Array.isArray(data.firstClear))data.firstClear=[];if(!(data.v>=2)){data.v=2;data.cash+=data.fragments*3;}   /* 조각→모집권 교환로가 사라졌다. 조각 1 = 검체 3 으로 한 번만 보정한다(두 번 돌지 않게 v 로 잠근다) */if(!data.daily||!Array.isArray(data.daily.claimed))data.daily=fresh().daily;} } catch {}
  function today(){if(data.daily.day!==day())data.daily=fresh().daily;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{} sync();}
  const current=()=>roster.find(c=>c.id===data.selected);
  // 로비 캐릭터 — 고른 아이가 서 있고, 누르면 한마디 한다. 대사는 js/cast.js 가 들고 있다.
  let said=0, bubbleTimer=0;
  // 대사 칸은 왼쪽 메뉴 바로 오른쪽에 붙인다 — 메뉴 폭이 화면마다 달라서
  // CSS 퍼센트로 박아 두면 좁은 화면에서 메뉴 위로 올라탄다(2026-10-14 실제로 겹쳤다).
  function placeBubble(){
    const bubble=document.getElementById('hub-bubble'); if(!bubble||bubble.hidden) return;
    const nav=document.querySelector('.hub-nav'), hero=document.querySelector('.hub-hero'), stage=document.getElementById('lobby');
    if(!nav||!stage) return;
    const base=stage.getBoundingClientRect(), menu=nav.getBoundingClientRect();
    const left=menu.right-base.left+16;
    const heroBox=hero&&hero.getBoundingClientRect();
    const until=heroBox?heroBox.left-base.left+heroBox.width*.22:base.width*.5;
    bubble.style.left=left+'px';
    bubble.style.width=Math.max(150,Math.min(330,until-left))+'px';
  }
  if (typeof addEventListener === 'function') addEventListener('resize', placeBubble);
  function speak(){
    const c=current(), bubble=document.getElementById('hub-bubble'); if(!bubble||!c) return;
    const line=document.getElementById('hub-bubble-line'),who=document.getElementById('hub-bubble-name');if(who)who.textContent=c.name;if(line)line.textContent=Cast.line(c.id,said++);else bubble.textContent=Cast.line(c.id,said++); bubble.hidden=false;placeBubble();
    clearTimeout(bubbleTimer); bubbleTimer=setTimeout(()=>{bubble.hidden=true;},3600);
  }
  function sync(){window.LobbyUI?.sync();const c=current();
    const art=document.getElementById('hub-hero-art');
    const face=document.getElementById('hub-play-face');if(face&&c&&!face.src.endsWith(Cast.ld(c.id)))face.src=Cast.ld(c.id);
    if(art&&c){const src=Cast.scene(c.id);if(!art.src.endsWith(src)){art.onerror=()=>{if(!art.src.includes('-ld')){art.src=Cast.ld(c.id);art.closest('.hub-hero')?.classList.remove('scene');}};art.closest('.hub-hero')?.classList.add('scene');art.src=src;art.alt=c.name;said=0;const b=document.getElementById('hub-bubble');if(b)b.hidden=true;}}const label=document.getElementById('hub-character-name');if(label)label.textContent=c.name+' · '+c.role;const wallet=document.getElementById('hub-wallet');if(wallet)wallet.innerHTML='<span><img class="icon-art sm" src="assets/icons/ticket.webp" alt="모집권">'+data.tickets+'<button class="wallet-plus" data-shop="ticket" aria-label="모집권 더 얻기">＋</button></span><span><img class="icon-art sm" src="assets/icons/sample.webp" alt="검체">'+data.cash+'<button class="wallet-plus" data-shop="cash" aria-label="아이템 상점 열기">＋</button></span><span><img class="icon-art sm" src="assets/icons/fragment.webp" alt="조각">'+data.fragments+'</span>';if(wallet)wallet.querySelectorAll('[data-shop]').forEach(b=>b.onclick=e=>{e.stopPropagation();Shop.open();});}
  function select(id){if(!data.owned.includes(id))return false;data.selected=id;save();return true;}
  // 모집 결과 한 칸 — 캐릭터면 초상, 아이템이면 그 아이콘
  function resultCard(r){
    if(r.kind==='character')return '<div class="result-card '+r.rarity.toLowerCase()+'">'+portrait(r)+'<b>'+r.name+'</b><small>'+(r.duplicate?'중복 · 조각 +'+(FRAGMENTS[r.rarity]||5):'NEW · 신규 획득')+'</small></div>';
    if(r.kind==='supply')return '<div class="result-card supply"><div class="result-item"><img src="'+r.art+'" alt=""></div><b>'+r.name+'</b><small>출격 지급 '+r.level+'개로</small></div>';
    if(r.kind==='cash')return '<div class="result-card item"><div class="result-item"><img src="assets/icons/sample.webp" alt=""></div><b>검체 +'+r.amount+'</b><small>아이템 상점에서 쓴다</small></div>';
    return '<div class="result-card item"><div class="result-item"><img src="assets/icons/fragment.webp" alt=""></div><b>조각 +'+r.amount+'</b><small>'+(r.instead==='supply'?'보급이 가득 차 조각으로':'미보유 캐릭터 영입에')+'</small></div>';
  }
  function rollRarity(weights){let roll=Math.random()*Object.values(weights).reduce((a,b)=>a+b,0);for(const [rarity,w] of Object.entries(weights))if((roll-=w)<0)return rarity;return 'R';}
  function grantCharacter(table,forced){
    data.dry=0;
    const rarity=forced||rollRarity(table.outcomes.find(o=>o.kind==='character').rarity);
    if(rarity==='SSR')data.pity=0;
    const featuredId=table.featured;
    const pool=roster.filter(c=>c.rarity===rarity&&(featuredId||!c.limited));
    const featured=featuredId&&rarity==='SSR'?roster.find(c=>c.id===featuredId):null;
    const others=featured?pool.filter(c=>!c.limited):pool;
    const c=featured&&Math.random()<.5?featured:(others.length?others[Math.floor(Math.random()*others.length)]:featured||roster[0]);
    const duplicate=data.owned.includes(c.id);
    if(duplicate)data.fragments+=FRAGMENTS[rarity]||5;else {data.owned.push(c.id);lastGained=c.id;}
    return {kind:'character',...c,duplicate};
  }
  function grant(pick,table){
    if(pick.kind==='character')return grantCharacter(table,pick.forced);
    if(pick.kind==='fragment'){data.fragments+=pick.amount;return {kind:'fragment',amount:pick.amount};}
    if(pick.kind==='cash'){data.cash+=pick.amount;return {kind:'cash',amount:pick.amount};}
    // 전술 보급 — 그 아이템의 출격 지급 수량이 1 늘어난다(최대 ${SUPPLY_MAX}). 다 찬 아이템뿐이면 조각으로 바뀐다.
    const open=Outbreak.skills.filter(s=>supplyOf(s.id)<SUPPLY_MAX);
    if(!open.length){data.fragments+=15;return {kind:'fragment',amount:15,instead:'supply'};}
    const s=open[Math.floor(Math.random()*open.length)];
    data.supply[s.id]=supplyOf(s.id)+1;
    return {kind:'supply',id:s.id,name:s.name,art:s.art,level:data.supply[s.id]};
  }
  function recruit(n){
    today();if(![1,10].includes(n)||data.tickets<n)return [];
    data.tickets-=n;
    const table=drawTable(banner),total=drawTotal(banner),result=[];
    for(let i=0;i<n;i++){
      data.pity++;data.dry++;
      let pick;
      if(data.pity>=PITY.ssr)pick={kind:'character',forced:'SSR'};
      else if(data.dry>=PITY.character)pick={kind:'character'};
      else {let roll=Math.random()*total;pick=table.outcomes.find(o=>(roll-=o.weight)<0)||table.outcomes[table.outcomes.length-1];}
      result.push(grant(pick,table));
    }
    data.draws+=n;data.daily.draws+=n;save();return result;
  }
  const missions=[{id:'infections',name:'감염 확산',copy:'감염 인원 100명 달성',target:100,reward:ECONOMY.daily.infections},{id:'runs',name:'격리 구역 탐사',copy:'15초 이상 생존 후 작전 2회 완료',target:2,reward:ECONOMY.daily.runs},{id:'clears',name:'통제선 돌파',copy:'챕터 통과 1회',target:1,reward:ECONOMY.daily.clears}];
  function claim(id){today();const m=missions.find(m=>m.id===id);if(!m||data.daily.claimed.includes(id)||data.daily[id]<m.target)return false;data.daily.claimed.push(id);data.cash+=m.reward;save();return true;}
  // survived: 제한 시간을 끝까지 버틴 판. 완주에 보너스 1장 — 기록 경쟁 전에 「끝까지 버티기」가 먼저다.
  function complete(score,seconds,cleared,chapter,survived){
    window.LobbyUI?.recordRun(score,seconds,cleared);today();
    data.daily.infections+=score;if(seconds>=15)data.daily.runs++;if(cleared)data.daily.clears++;
    const cash=ECONOMY.run(score,cleared,survived);data.cash+=cash;
    // 챕터 첫 통과 — 모집권이 플레이로 들어오는 **유일한** 자리이고, 챕터마다 한 번뿐이다
    let tickets=0;
    if(cleared&&chapter&&!data.firstClear.includes(chapter)){data.firstClear.push(chapter);data.cash+=ECONOMY.firstClear.cash;tickets=ECONOMY.firstClear.tickets;data.tickets+=tickets;}
    save();return {cash:cash+(tickets?ECONOMY.firstClear.cash:0),tickets};}
  // 초상은 사람마다 제 얼굴 그림(assets/cast/<id>-face.webp). 옛 아틀라스 칸 번호는 더 안 쓴다.
  // 상세 칸은 등신대를 세운다. 카드 격자는 얼굴만 — 스무 명을 전신으로 받으면 폰에서 무겁다.
  const standee=c=>`<div class="agent-standee"><img src="${Cast.ld(c.id)}" alt="" loading="lazy"><span>${c.rarity}</span></div>`;
  const portrait=c=>`<div class="agent-portrait"><img src="${Cast.face(c.id)}" alt="" loading="lazy"><span>${c.rarity}</span></div>`;
  let lastGained=null;
  let tab='characters',filter='전체',focus='zero',mapFocus=Outbreak.selected,callback=()=>{},results=[],revealed=false;
  let banner='pickup',recruitInfo=null,characterSort='rarity',ownership='all';
  const $=id=>document.getElementById(id);
  function open(which,onChange){tab=which;callback=onChange||(()=>{});focus=data.selected;mapFocus=Outbreak.selected;results=[];revealed=false;recruitInfo=null;render();$('info-dialog').showModal();}
  function render(){Panels.reset();RecruitReveal.stop();today();const title={characters:'캐릭터 선택',recruit:'캐릭터 모집',inventory:'인벤토리',exchange:'교환소',missions:'일일 임무',districts:'챕터 선택'};
    $('dialog-title').textContent=title[tab];$('info-dialog').classList.remove('personal-dialog','profile-dialog');$('info-dialog').classList.add('progression-dialog');$('info-dialog').classList.toggle('recruit-screen',tab==='recruit');$('info-dialog').classList.toggle('character-screen',tab==='characters');
    let html='';
    if(tab==='characters') html=characterScreen();
    if(tab==='recruit')html=results.length?((revealed||!results.some(r=>r.kind==='character'))?`<div class="recruit-result revealed"><div class="results-grid">${results.map(resultCard).join('')}</div></div><button id="recruit-again" class="secondary-button">모집 화면으로</button>`:'<div id="recruit-cinematic"></div>'):recruitScreen();
    if(tab==='inventory')html='<div class="supply-summary"><span>자원 종류<b>02</b></span><span>전술 장비<b>'+Outbreak.skills.length+'</b></span><span>장착 슬롯<b>'+Outbreak.loadout.length+' / 2</b></span></div><h3 class="section-label">보유 자원</h3><div class="inventory-grid"><article><small>RECRUITMENT</small><img class="icon-art lg" src="assets/icons/ticket.webp" alt=""><h3>모집권</h3><b>'+data.tickets+'</b><p>캐릭터 모집에 사용</p></article><article><small>FRAGMENTS</small><img class="icon-art lg" src="assets/icons/fragment.webp" alt=""><h3>캐릭터 조각</h3><b>'+data.fragments+'</b><p>교환소에서 모집권 또는 캐릭터 영입</p></article>'+Outbreak.skills.map(s=>'<article class="'+(Outbreak.loadout.includes(s.id)?'equipped':'')+'"><small>'+ (Outbreak.loadout.includes(s.id)?'EQUIPPED':'TACTICAL')+'</small><img class="icon-art lg" src="'+s.art+'" alt=""><h3>'+s.name+'</h3><b>×'+supplyOf(s.id)+'</b><p>출격 보급 · '+(Outbreak.loadout.includes(s.id)?'장착 중':'미장착')+'</p></article>').join('')+'</div>';
    if(tab==='exchange')html='<div class="exchange-feature"><img src="assets/icons/sample.webp" alt="검체"><div><small>SUPPLY CONVERSION</small><h3>남은 조각을 검체로</h3><p>조각 '+ECONOMY.trade.fragments+'개 → 검체 '+ECONOMY.trade.cash+'</p></div><button id="fragment-trade" '+(data.fragments<ECONOMY.trade.fragments?'disabled':'')+'>'+(data.fragments<ECONOMY.trade.fragments?'조각 부족':'교환하기')+'<p class="progress-note">검체는 아이템 상점에서 씁니다. 모집권으로는 바꿀 수 없습니다.</p>';
    if(tab==='missions')html=`<p class="progress-note">매일 한국 시간 00:00 갱신 · ${data.daily.day}</p><div class="mission-list">${missions.map(m=>{const value=Math.min(m.target,data.daily[m.id]);const claimed=data.daily.claimed.includes(m.id);return `<article><div><small>DAILY / ${m.name}</small><h3>${m.copy}</h3><progress value="${value}" max="${m.target}"></progress><span>${value} / ${m.target}</span></div><button data-claim="${m.id}" ${claimed||value<m.target?'disabled':''}>${claimed?'수령 완료':'검체 +'+m.reward+' 받기'}</button></article>`;}).join('')}</div><p class="progress-note">작전 완료: 체력 소진으로 종료된 플레이. 로비로 중도 복귀한 작전은 포함되지 않습니다.</p>`;
    if(tab==='districts'){
      // 챕터 목록 — 하나씩 깨 나가고, 깬 챕터는 기록을 밀러 다시 들어간다.
      const c=Outbreak.chapters.find(c=>c.n===mapFocus)||Outbreak.chapters[0], m=Outbreak.mapOf(c), i=Outbreak.maps.indexOf(m);
      const open=Outbreak.unlocked(c.n), done=Outbreak.progress.cleared.includes(c.n), best=Outbreak.bestOf(c.n), goals=Outbreak.starGoals(c);
      const starRow=(n,score)=>{const s=Outbreak.stars(n,score);return '★'.repeat(s)+'☆'.repeat(3-s);};
      html=`<div class="district-layout"><div class="district-browser">${Outbreak.chapters.map(ch=>{
        const o=Outbreak.unlocked(ch.n), d=Outbreak.progress.cleared.includes(ch.n), b=Outbreak.bestOf(ch.n);
        return `<button class="district-card chapter-card ${mapFocus===ch.n?'selected':''} ${o?'':'locked'}" data-district="${ch.n}" ${o?'':'disabled'}><div class="district-art" style="background-image:linear-gradient(0deg,#050912,transparent),url('${(Outbreak.maps.find(x=>x.id===ch.map)||{}).art}')"><span>CH ${ch.n}</span>${o?'':'<b class="lock">🔒</b>'}</div><small>${d?'통과 · '+starRow(ch,b):o?'미통과':'앞 챕터를 통과하세요'}</small><h3>${o?ch.name:'???'}</h3><p>${o?'통과선 '+ch.quota+'명 · 인파 '+ch.crowd+'명':'잠김'}</p><b>${d?'기록 '+b+'명':o?'도전 →':''}</b></button>`;}).join('')}</div>
        <aside class="district-detail"><div class="district-art" style="background-image:linear-gradient(0deg,#050912,transparent),url('${m.art}')"></div><small>CHAPTER ${c.n} / ${m.name} · SECTOR ${m.sector}</small><h3>${open?c.name:'잠긴 챕터'}</h3><p>${open?c.copy:'앞 챕터를 통과하면 열립니다.'}</p>
        <dl><dt>제한 시간</dt><dd>${Outbreak.round}초</dd><dt>통과선</dt><dd>${c.quota}명</dd><dt>동시 인파</dt><dd>${c.crowd}명</dd><dt>첫 백신</dt><dd>${c.delay}초</dd><dt>백신 최대</dt><dd>${c.cap}명</dd><dt>내 기록</dt><dd>${best?best+'명':'—'}</dd></dl>
        <p class="progress-note">★ ${goals[0]} / ★★ ${goals[1]} / ★★★ ${goals[2]}명 — 현재 ${starRow(c,best)}<br>뒤 챕터일수록 백신은 거세지지만 인파가 더 몰려 기록은 더 크게 나옵니다.</p>
        <button class="red-button" data-deploy="${c.n}" ${open?'':'disabled'}>${!open?'잠김':Outbreak.selected===c.n?'✓ 선택된 챕터':'이 챕터로 출격'}</button></aside></div>`;}
    $('dialog-content').innerHTML=html;if(['inventory','missions','exchange'].includes(tab))Panels.apply(tab);bind();const cinematic=results.filter(r=>r.kind==='character');if(tab==='recruit'&&cinematic.length&&!revealed)RecruitReveal.start($('recruit-cinematic'),cinematic,()=>{revealed=true;render();$('recruit-again').focus();});
  }
  function recruitScreen(){
    const pickup=banner==='pickup';const name=pickup?'레아':'제로';
    return '<div class="recruit-scene '+(pickup?'is-pickup':'is-standard')+'"><header class="recruit-top"><span>RECRUITMENT <b>캐릭터 모집</b></span><div class="recruit-wallet"><button data-recruit-wallet="missions" aria-label="모집권 획득 임무"><img class="icon-art sm" src="assets/icons/ticket.webp" alt=""><small>모집권</small><b>'+data.tickets+'</b><em>＋</em></button><button data-recruit-wallet="inventory" aria-label="조각 인벤토리"><img class="icon-art sm" src="assets/icons/fragment.webp" alt=""><small>조각</small><b>'+data.fragments+'</b></button></div></header><nav class="recruit-tabs" aria-label="모집 배너"><button data-banner="pickup" class="'+(pickup?'selected':'')+'"><div class="banner-thumb rea-thumb"></div><b>픽업 모집</b><small>SSR 레아 확률 UP</small></button><button data-banner="standard" class="'+(!pickup?'selected':'')+'"><div class="banner-thumb standard-thumb"></div><b>일반 모집</b><small>상시 모집</small></button><div class="recruit-tab-note">INFECTION<br>RECRUIT ARCHIVE<br><span>01 / 02</span></div></nav><div class="recruit-copy">'+(pickup?'<img src="assets/pickup-logo.webp" alt="PICK UP 한정 모집" class="pickup-logo">':'<h3 class="standard-logo">STANDARD<br><span>일반 모집</span></h3>')+'<p>'+(pickup?'붉은 눈빛, 멈추지 않는 감염.':'새로운 감염자와 함께 도시로.')+'</p><small>'+(pickup?'레아 배너 전용 · SSR 10% / 레아 5%':'상시 모집 · SSR 5% / SR 40% / R 55%')+'</small><button class="probability-link" id="recruit-rates">모집 확률 · 보장 안내 ↗</button></div><aside class="featured-agent"><em>SSR</em><h3>'+name+'</h3><div class="agent-stars" aria-label="SSR 등급">★★★★★</div><button id="recruit-detail"><svg><use href="#i-help"/></svg>상세 정보</button></aside><div class="recruit-thumbnails"><button data-banner="pickup" aria-label="레아 픽업 배너" class="rea-thumb '+(pickup?'selected':'')+'"></button><button data-banner="standard" aria-label="일반 모집 배너" class="standard-thumb '+(!pickup?'selected':'')+'"></button><span>‹ &nbsp; '+(pickup?'01':'02')+' / 02 &nbsp; ›</span></div><div class="recruit-bottom"><div class="draw-pity">SSR 보장까지 <b>'+Math.max(1,20-data.pity)+'회</b><span>두 배너 공통 누적</span></div><div class="reference-draw-buttons"><button data-draw="1" '+(data.tickets<1?'disabled':'')+'><strong>1회 모집</strong><span><img class="icon-art sm" src="assets/icons/ticket.webp" alt=""> ×1</span></button><button data-draw="10" '+(data.tickets<10?'disabled':'')+'><strong>10회 모집</strong><span><img class="icon-art sm" src="assets/icons/ticket.webp" alt=""> ×10</span></button></div>'+(data.tickets<1?'<small class="ticket-shortage">모집권이 부족합니다 · 상단 ＋에서 획득 임무 확인</small>':'')+'</div>'+recruitInfoPanel()+'</div>';
  }
  // 확률 공지 — 위 DRAW 표를 그대로 읽어 그린다. 표를 고치면 공지도 같이 바뀐다.
  function ratesMarkup(b){
    const t=drawTable(b),total=drawTotal(b);
    const pct=w=>(Math.round(w/total*1000)/10).toFixed(1).replace(/.0$/,'')+'%';
    const ch=t.outcomes.find(o=>o.kind==='character');
    const names=rarity=>roster.filter(c=>c.rarity===rarity&&(t.featured||!c.limited)).map(c=>c.name).join(' · ');
    const rows=[];
    rows.push(['캐릭터',pct(ch.weight),'']);
    for(const [rarity,w] of Object.entries(ch.rarity))
      rows.push(['└ '+rarity,pct(w),names(rarity)+(t.featured&&rarity==='SSR'?' (픽업 '+(Cast.by[t.featured]?.name||'')+' 50%)':'')]);
    for(const o of t.outcomes.filter(o=>o.kind!=='character')){
      if(o.kind==='supply')rows.push(['전술 보급',pct(o.weight),'전술 아이템 하나의 출격 지급 수량 +1 (최대 '+SUPPLY_MAX+'개)']);
      if(o.kind==='fragment')rows.push(['캐릭터 조각 +'+o.amount,pct(o.weight),'조각 50개로 미보유 캐릭터 영입']);
      if(o.kind==='cash')rows.push(['검체 +'+o.amount,pct(o.weight),'아이템 상점에서 쓴다']);
    }
    return '<table class="rates-table"><thead><tr><th>결과</th><th>확률</th><th>내용</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+r[0]+'</td><td class="rate">'+r[1]+'</td><td>'+r[2]+'</td></tr>').join('')+'</tbody></table>'+
      '<p class="rates-note">모집 1회 = 모집권 1장. 위 확률은 매 회 독립입니다.<br>'+
      '캐릭터가 '+PITY.character+'회 연속 나오지 않으면 다음 1회는 캐릭터가 확정으로 나옵니다 (현재 '+data.dry+'회).<br>'+
      'SSR 없이 '+PITY.ssr+'회 모집하면 다음에 나오는 캐릭터는 SSR 확정입니다 (현재 '+data.pity+'회). 두 배너가 보장 횟수를 함께 셉니다.<br>'+
      '중복 캐릭터는 조각으로 바뀝니다 — SSR '+FRAGMENTS.SSR+' · SR '+FRAGMENTS.SR+' · R '+FRAGMENTS.R+'개.</p>';
  }
  function recruitInfoPanel(){if(!recruitInfo)return '';const c=roster.find(c=>c.id===(banner==='pickup'?'rea':'zero'));return '<section class="recruit-information" aria-label="모집 상세 정보"><button id="close-recruit-info" aria-label="상세 정보 닫기">×</button><small>RECRUITMENT / INTELLIGENCE</small><h3>'+(recruitInfo==='character'?'SSR '+c.name:'모집 확률 공지')+'</h3>'+(recruitInfo==='character'?'<h4>'+c.passive+'</h4><p>'+c.copy+'</p><dl><dt>체력</dt><dd>100</dd><dt>이동 속도</dt><dd>'+c.speed+'</dd><dt>백신 피해</dt><dd>'+c.damage+'</dd></dl><p>'+(data.owned.includes(c.id)?'보유 중 · 캐릭터 화면에서 선택할 수 있습니다.':'모집으로 획득하면 캐릭터 화면에서 선택할 수 있습니다.')+'</p>':ratesMarkup(banner))+'</section>';}
  function characterScreen(){
    const c=roster.find(c=>c.id===focus),rank={SSR:0,SR:1,R:2};
    const list=roster.filter(c=>(filter==='전체'||c.role===filter)&&(ownership==='all'||data.owned.includes(c.id)))
      .sort((a,b)=>characterSort==='name'?a.name.localeCompare(b.name,'ko'):characterSort==='owned'?(Number(data.owned.includes(b.id))-Number(data.owned.includes(a.id))||rank[a.rarity]-rank[b.rarity]):rank[a.rarity]-rank[b.rarity]);
    const icon=role=>({감염:'skull',기동:'run',지원:'cross',방어:'shield'}[role]||'skull');
    const stars=r=>r==='SSR'?3:r==='SR'?2:1;   // 레퍼런스는 별 셋 칸에 등급만큼 채운다
    const starRow=r=>'<span class="rs-stars">'+'★'.repeat(stars(r))+'<i>'+'★'.repeat(3-stars(r))+'</i></span>';
    const owned=id=>data.owned.includes(id);
    // ── 왼쪽: 고른 캐릭터 쇼케이스 ──
    const show='<aside class="rs-show" style="--rare:'+Cast.rarities[c.rarity]+'">'+
      '<div class="rs-art" style="background-image:url(&quot;'+Cast.scene(c.id)+'&quot;)"></div>'+
      '<div class="rs-info">'+
        '<span class="rs-rare">'+c.rarity+'</span>'+
        '<h3>'+c.name+'</h3><small class="rs-roman">'+(c.roman||c.id.toUpperCase())+'</small>'+
        starRow(c.rarity)+
        '<p class="rs-quote">"'+(c.lines&&c.lines[0]||'')+'"</p>'+
        '<span class="rs-cv"><svg><use href="#i-sound"/></svg>CV. 미정</span>'+
      '</div>'+
      '<div class="rs-detail">'+
        '<nav class="rs-tabs"><button class="on" data-cs-tab="detail">상세 정보</button><button data-cs-tab="skill">스킬</button><button data-cs-tab="story">스토리</button></nav>'+
        '<div class="rs-stats">'+
          '<span><svg><use href="#i-cross"/></svg>체력<b>100</b></span>'+
          '<span><svg><use href="#i-run"/></svg>이동 속도<b>'+c.speed+'</b></span>'+
          '<span><svg><use href="#i-shield"/></svg>백신 피해<b>'+c.damage+'</b></span>'+
          '<span><svg><use href="#i-shield"/></svg>방어막<b>'+c.shield+'초</b></span>'+
        '</div>'+
        '<div class="rs-passive"><i><svg><use href="#i-'+icon(c.role)+'"/></svg></i><div><strong>'+c.passive+'</strong><p>'+c.copy+'</p></div></div>'+
        '<button class="rs-pick" data-select="'+c.id+'" '+(!owned(c.id)?'disabled':'')+'><svg><use href="#i-pulse"/></svg>'+(data.selected===c.id?'출격 캐릭터':owned(c.id)?'선택하기':'모집으로 획득')+'</button>'+
      '</div></aside>';
    // ── 오른쪽: 필터 + 카드 레일 ──
    const filters=['전체','감염','기동','지원','방어'].map(f=>'<button data-filter="'+f+'" aria-pressed="'+(filter===f)+'" class="'+(filter===f?'on':'')+'">'+(f==='전체'?'<svg><use href="#i-person"/></svg>':'')+f+'</button>').join('');
    const cards=list.map(x=>{
      const badge=x.limited?'<em class="rs-badge pick">특별 모집</em>':(owned(x.id)&&data.selected!==x.id&&x.id===lastGained?'<em class="rs-badge new">NEW</em>':'');
      return '<button class="rs-card'+(focus===x.id?' on':'')+(owned(x.id)?'':' locked')+'" data-agent="'+x.id+'" style="--rare:'+Cast.rarities[x.rarity]+'" aria-pressed="'+(focus===x.id)+'">'+
        '<img src="'+Cast.ld(x.id)+'" alt="" loading="lazy">'+
        '<span class="rs-grade">'+x.rarity+'</span>'+badge+
        '<span class="rs-mark"><svg><use href="#i-'+icon(x.role)+'"/></svg></span>'+
        '<div class="rs-foot"><strong>'+x.name+'</strong><small>Lv.1</small>'+starRow(x.rarity)+
          '<span class="rs-role"><svg><use href="#i-'+icon(x.role)+'"/></svg>'+x.role+'</span></div>'+
        (focus===x.id?'<i class="rs-corner tl"></i><i class="rs-corner tr"></i><i class="rs-corner bl"></i><i class="rs-corner br"></i>':'')+
      '</button>';}).join('');
    return '<div class="rs-screen">'+show+'<section class="rs-roster">'+
      '<div class="rs-top"><div class="rs-filters">'+filters+'</div>'+
      '<label class="rs-sort"><select id="character-sort">'+
        '<option value="rarity" '+(characterSort==='rarity'?'selected':'')+'>등급순</option>'+
        '<option value="owned" '+(characterSort==='owned'?'selected':'')+'>보유 우선</option>'+
        '<option value="name" '+(characterSort==='name'?'selected':'')+'>이름순</option></select></label></div>'+
      '<div class="rs-rail">'+cards+'</div>'+
      '<button class="rs-next" aria-label="다음 캐릭터 보기">›</button><span class="rs-count">보유 '+data.owned.length+' / '+roster.length+'</span></section></div>';
  }
  function bind(){if($('fragment-trade'))$('fragment-trade').onclick=()=>{if(trade())render();};
    const rail=document.querySelector('.rs-rail');
    const next=document.querySelector('.rs-next');if(next)next.onclick=()=>rail.scrollBy({left:rail.clientWidth*.65,behavior:'smooth'});
    const detail=document.querySelector('.rs-detail');if(detail){const stats=detail.querySelector('.rs-stats'),passive=detail.querySelector('.rs-passive'),c=Cast.by[focus];const extra=document.createElement('div');extra.className='rs-tab-copy';extra.hidden=true;detail.insertBefore(extra,detail.querySelector('.rs-pick'));detail.querySelectorAll('[data-cs-tab]').forEach(b=>b.onclick=()=>{detail.querySelectorAll('[data-cs-tab]').forEach(t=>{t.classList.toggle('on',t===b);t.setAttribute('aria-selected',String(t===b));});const type=b.dataset.csTab;stats.hidden=type!=='detail';passive.hidden=type!=='detail';extra.hidden=type==='detail';extra.textContent=type==='skill'?c.passive+' · '+c.copy:(c.lines||[]).join(' / ');});}
if($('character-sort'))$('character-sort').onchange=e=>{characterSort=e.target.value;render();$('character-sort').focus();};if($('character-owned'))$('character-owned').onchange=e=>{ownership=e.target.value;render();$('character-owned').focus();};document.querySelectorAll('[data-banner]').forEach(b=>b.onclick=()=>{banner=b.dataset.banner;recruitInfo=null;render();});document.querySelectorAll('[data-recruit-wallet]').forEach(b=>b.onclick=()=>{tab=b.dataset.recruitWallet;render();});if($('recruit-detail'))$('recruit-detail').onclick=()=>{recruitInfo='character';render();};if($('recruit-rates'))$('recruit-rates').onclick=()=>{recruitInfo='rates';render();};if($('close-recruit-info'))$('close-recruit-info').onclick=()=>{recruitInfo=null;render();};document.querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>{const scroll=document.querySelector('.rs-rail')?.scrollLeft||0;focus=b.dataset.agent;render();const area=document.querySelector('.rs-rail');if(area)area.scrollLeft=scroll;document.querySelector('[data-agent="'+focus+'"]')?.focus({preventScroll:true});});document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{select(b.dataset.select);render();});document.querySelectorAll('[data-draw]').forEach(b=>b.onclick=()=>{results=recruit(Number(b.dataset.draw));revealed=false;render();});if($('reveal-results'))$('reveal-results').onclick=()=>{revealed=true;render();};if($('recruit-again'))$('recruit-again').onclick=()=>{results=[];render();};document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{claim(b.dataset.claim);render();});document.querySelectorAll('[data-district]').forEach(b=>b.onclick=()=>{mapFocus=Number(b.dataset.district);render();});document.querySelectorAll('[data-deploy]').forEach(b=>b.onclick=()=>{Outbreak.selected=Number(b.dataset.deploy);Outbreak.save();callback();render();});}
  document.addEventListener('DOMContentLoaded',()=>{sync();$('info-dialog').addEventListener('close',()=>{RecruitReveal.stop();$('info-dialog').classList.remove('progression-dialog','recruit-screen','character-screen');});});
  document.addEventListener('click',e=>{if(e.target.closest('#hub-hero'))speak();});
  /* 보급 영구 강화 — 검체로 산다. Lv2(기본)에서 Lv5 까지, 값은 ECONOMY.upgrade.
     모집권으로는 살 수 없다(살 수 있으면 모집권이 아이템 통화가 된다). */
  const upgradeCost=id=>{const lv=supplyOf(id);return lv>=SUPPLY_MAX?null:ECONOMY.upgrade[lv-SUPPLY_BASE];};
  function upgrade(id){const cost=upgradeCost(id);if(cost==null||data.cash<cost)return false;data.cash-=cost;data.supply[id]=supplyOf(id)+1;save();return true;}
  function collectionReward(target){const rewards=ECONOMY.collection;data.collectionClaims ||= [];if(!rewards[target]||data.owned.length<target||data.collectionClaims.includes(target))return false;data.collectionClaims.push(target);data.cash+=rewards[target];save();return true;}
  // 조각을 모집권으로 — 상점의 유일한 '진짜로 되는' 거래다
  function trade(){const {fragments:cost,cash:gain}=ECONOMY.trade;if(data.fragments<cost)return false;data.fragments-=cost;data.cash+=gain;save();return true;}
  return {open,current,complete,sync,speak,supply:supplyOf,trade,economy:ECONOMY,upgrade,upgradeCost,claim,recruit,rates:b=>({table:drawTable(b),total:drawTotal(b),pity:PITY,supplyMax:SUPPLY_MAX,fragments:FRAGMENTS}),collectionReward, daily:()=>{today();return {completed:missions.filter(m=>data.daily[m.id]>=m.target).length,total:missions.length,claimable:missions.filter(m=>data.daily[m.id]>=m.target&&!data.daily.claimed.includes(m.id)).length};}, snapshot:()=>JSON.parse(JSON.stringify(data))};
})();

