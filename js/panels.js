window.Panels=(()=>{
 const meta={inbox:['FIELD DISPATCH','우편함','도착한 공지와 감염자 소식을 확인하세요.','mail'],notifications:['SIGNAL CENTER','알림','받을 수 있는 보상과 진행 상황을 확인하세요.','bell'],loadout:['TACTICAL EQUIPMENT','전술 아이템','출격에 사용할 두 가지 장비를 선택하세요.','case'],record:['INFECTION ARCHIVE','랭킹 & 기록','도시에 남긴 당신의 기록을 확인하세요.','crown'],events:['COLLECTION EVENT','감염자 수집 이벤트','새로운 동료를 모으고 수집 보상을 획득하세요.','target'],settings:['SYSTEM CONFIGURATION','설정','당신에게 맞는 플레이 환경을 설정하세요.','settings'],inventory:['SUPPLY STORAGE','인벤토리','보유 자원과 출격 보급 현황을 한눈에.','case'],missions:['DAILY OPERATIONS','일일 임무','작은 목표를 완수하고 다음 모집을 준비하세요.','target'],exchange:['FRAGMENT EXCHANGE','교환소','모아 둔 조각으로 새로운 가능성을 여세요.','crown'],shop:['SUPPLY EXCHANGE','보급 상점','모집권 교환과 획득 경로를 확인하세요.','case']};
 let equipmentFilter='all';
 const icon=n=>'<svg><use href="#i-'+n+'"/></svg>';
 // 패널 사이 이동 — 닫지 않는다. 여는 쪽들이 showModal() 을 부르므로, 이미 열려 있으면 그냥 넘긴다
 // (열린 dialog 에 showModal() 을 다시 부르면 예외가 난다. 그래서 전에는 닫았다 열었고, 그때 로비가 비쳤다.)
 function goTo(target){
  const d=document.getElementById('info-dialog'),original=d.showModal.bind(d);
  d.showModal=()=>{ if(!d.open) original(); };
  try{
   if(['inventory','missions','exchange'].includes(target))Progression.open(target);
   else if(['events','inbox','notifications'].includes(target))LobbyUI.open(target);
   else document.querySelector('[data-panel="'+target+'"]')?.click();
  } finally { setTimeout(()=>{ d.showModal=original; },0); }
 }
 function reset(){const d=document.getElementById('info-dialog');d.classList.remove('utility-panel');delete d.dataset.utility;}
 function apply(kind){if(!meta[kind])return;const d=document.getElementById('info-dialog'),host=document.getElementById('dialog-content'),m=meta[kind],state=Progression.snapshot();d.classList.add('utility-panel');d.dataset.utility=kind;const body=document.createElement('section');body.className='utility-body';while(host.firstChild)body.appendChild(host.firstChild);host.appendChild(body);
 const head=document.createElement('header');head.className='utility-header';head.innerHTML='<div class="utility-symbol">'+icon(m[3])+'</div><div><small>'+m[0]+'</small><h2>'+m[1]+'</h2><p>'+m[2]+'</p></div><div class="utility-wallet"><span><img src="assets/icons/ticket.webp" alt="모집권">'+state.tickets.toLocaleString()+'</span><span><img src="assets/icons/sample.webp" alt="검체">'+(state.cash||0).toLocaleString()+'</span><span><img src="assets/icons/fragment.webp" alt="조각">'+state.fragments.toLocaleString()+'</span></div>';host.prepend(head);
 if(kind==='loadout'){
 const count=document.createElement('span');count.className='equipment-count';count.innerHTML='<b>'+Outbreak.loadout.length+'</b> / 2 장착';head.querySelector('.utility-wallet').appendChild(count);
 const categories={smoke:'support',boost:'special',heal:'heal',mine:'attack'};
 body.querySelectorAll('.skill-card').forEach(card=>{const selected=card.classList.contains('selected');card.dataset.category=categories[card.dataset.kit];const badge=document.createElement('span');badge.className='equipment-state';badge.textContent=selected?'☑ 장착 중':'TACTICAL ITEM';card.prepend(badge);const mark=document.createElement('span');mark.className='equipment-check';mark.textContent=selected?'✓':'';card.appendChild(mark);});
 const filters=document.createElement('nav');filters.className='equipment-filters';filters.setAttribute('aria-label','아이템 분류');filters.innerHTML=[['all','전체'],['support','지원'],['attack','공격'],['heal','회복'],['special','특수']].map(([id,name])=>'<button data-equipment-filter="'+id+'">'+name+'</button>').join('');body.prepend(filters);
 const filter=()=>{filters.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.equipmentFilter===equipmentFilter);b.setAttribute('aria-pressed',String(b.dataset.equipmentFilter===equipmentFilter));});body.querySelectorAll('.skill-card').forEach(c=>c.hidden=equipmentFilter!=='all'&&c.dataset.category!==equipmentFilter);};filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{equipmentFilter=b.dataset.equipmentFilter;filter();});filter();
 }

 const nav=document.createElement('nav');nav.className='utility-nav';nav.setAttribute('aria-label','게임 메뉴');nav.innerHTML=Object.entries(meta).filter(([key])=>!['shop','inbox','notifications'].includes(key)).map(([key,v],i)=>'<button data-utility-go="'+key+'" class="'+(key===kind?'on':'')+'" aria-current="'+(key===kind?'page':'false')+'"><small>0'+(i+1)+'</small>'+icon(v[3])+'<span>'+(key==='events'?'이벤트':v[1])+'</span><b>›</b></button>').join('')+'<div class="utility-signature">INFECTION<span>TAKE OVER THE WORLD</span></div>';host.appendChild(nav);
 nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{const target=b.dataset.utilityGo;if(target===kind)return;goTo(target);});
 }
 document.addEventListener('DOMContentLoaded',()=>document.getElementById('info-dialog').addEventListener('close',reset));return{apply,reset,goTo};
})();
