/* 출격 구역. 각 구역은 자기 바닥판(assets/map-*.webp)과 난이도·인파·장애물을 가진다.
   바닥판은 tools/gen-maps.mjs 로 굽는다. 그림은 고를 때 받아 온다 — 여덟 장을 미리 받으면 폰에서 1.4MB 다.
   판에 가림막(장애물)은 두지 않는다 — 바닥은 끝까지 트여 있다. */
window.Districts = (() => {
  const list = [
    { id:'plaza',      name:'황혼의 광장', sector:'07', art:'assets/plaza.webp',        tier:'NORMAL',  stars:1,
      tag:'도심 / 기본', tint:'#ad63300c', density:26, delay:7,
      copy:'무너진 도시의 마지막 교차로. 인파 사이로 첫 감염을 퍼뜨리세요.' },
    { id:'subway',     name:'지하철역',   sector:'03', art:'assets/map-subway.webp',   tier:'NORMAL',  stars:2,
      tag:'지하 / 협로', tint:'#1a4a5c33', density:30, delay:6,
      copy:'좁은 승강장과 기둥. 피할 곳이 적은 만큼 감염도 빠르게 번집니다.' },
    { id:'quarantine', name:'푸른 격리선', sector:'12', art:'assets/plaza.webp',        tier:'HARD',    stars:2,
      tag:'검문 구역 / 봉쇄', tint:'#124e9360', density:32, delay:4,
      copy:'좁은 검문 통로와 빠른 백신 대응. 연막탄과 대시가 생존의 열쇠입니다.' },
    { id:'factory',    name:'공장 지대',   sector:'21', art:'assets/map-factory.webp',  tier:'HARD',    stars:3,
      tag:'산업 / 중장비', tint:'#5a2e0e40', density:34, delay:4,
      copy:'멈춘 컨베이어 사이. 인간 세력이 가장 단단하게 방어하고 있는 구역입니다.' },
    { id:'lab',        name:'연구 시설',   sector:'09', art:'assets/map-lab.webp',      tier:'HARD',    stars:3,
      tag:'시설 / 백신 본부', tint:'#0e6b7a3d', density:30, delay:3,
      copy:'백신 발사자의 출현 빈도가 가장 높습니다. 조준선을 읽는 눈이 필요합니다.' },
    { id:'harbor',     name:'항만 도시',   sector:'15', art:'assets/map-harbor.webp',   tier:'EXTREME', stars:3,
      tag:'항만 / 광역', tint:'#7a4a1030', density:38, delay:3,
      copy:'넓은 지형과 다수의 생존자. 한 번 몰리면 빠져나오기 어렵습니다.' },
    { id:'school',     name:'폐교 운동장', sector:'26', art:'assets/map-school.webp',   tier:'EXTREME', stars:4,
      tag:'야간 / 시야 제한', tint:'#1b2a5c4d', density:40, delay:2,
      copy:'조명 하나만 살아 있는 밤의 운동장. 보이지 않는 곳에서 조준선이 날아옵니다.' },
    { id:'blackout',   name:'붉은 정전',   sector:'19', art:'assets/plaza.webp',        tier:'EXTREME', stars:4,
      tag:'봉쇄 구역 / 최종', tint:'#27091888', density:42, delay:2,
      copy:'비상등만 남은 밤. 밀집된 인파와 거센 백신 사격 속에서 살아남으세요.' },
  ];
  const by = Object.fromEntries(list.map(d => [d.id, d]));
  // 고른 구역의 그림만 받아 온다. 이미 받은 것은 다시 받지 않는다.
  const cache = {};
  const preload = id => {
    const d = by[id]; if (!d) return null;
    if (!cache[d.art]) { const img = new Image(); img.src = d.art; cache[d.art] = img; }
    return cache[d.art];
  };
  return { list, by, preload, art: id => (by[id] || list[0]).art };
})();
