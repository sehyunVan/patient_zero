/* Shared chapter, district and equipment definitions. All progress stays on this device. */
window.Outbreak = {
  // 배경판. 챕터가 어느 구역에서 벌어지는지만 고른다. 판에 가림막(장애물)은 두지 않는다 — 바닥은 끝까지 트여 있다.
  maps: [
    { id: 'plaza', name: '황혼의 광장', sector: '07', tag: '도심', art: 'assets/plaza.webp', copy: '무너진 도시의 마지막 교차로.', tint: '#ad63300c' },
    { id: 'quarantine', name: '푸른 격리선', sector: '12', tag: '검문 구역', art: 'assets/plaza.webp', copy: '좁은 검문 통로와 빠른 백신 대응.', tint: '#124e9360' },
    { id: 'blackout', name: '붉은 정전', sector: '19', tag: '봉쇄 구역', art: 'assets/plaza.webp', copy: '비상등만 남은 밤.', tint: '#27091888' },
    // 2026-10-14 추가 — 저마다 제 바닥판을 쓴다(tools/gen-maps.mjs).
    { id: 'subway',  name: '지하철역',   sector: '03', tag: '지하 / 협로',     art: 'assets/map-subway.webp',  copy: '좁은 승강장과 기둥. 피할 곳이 적은 만큼 감염도 빠르게 번진다.', tint: '#1a4a5c33' },
    { id: 'factory', name: '공장 지대',   sector: '21', tag: '산업 / 중장비',   art: 'assets/map-factory.webp', copy: '멈춘 컨베이어 사이. 인간 세력이 가장 단단하게 버티는 구역.',   tint: '#5a2e0e40' },
    { id: 'lab',     name: '연구 시설',   sector: '09', tag: '시설 / 백신 본부', art: 'assets/map-lab.webp',     copy: '백신 발사자가 가장 자주 나온다. 조준선을 읽는 눈이 필요하다.',   tint: '#0e6b7a3d' },
    { id: 'harbor',  name: '항만 도시',   sector: '15', tag: '항만 / 광역',     art: 'assets/map-harbor.webp',  copy: '넓은 지형과 많은 생존자. 한 번 몰리면 빠져나오기 어렵다.',     tint: '#7a4a1030' },
    { id: 'school',  name: '폐교 운동장', sector: '26', tag: '야간 / 시야 제한', art: 'assets/map-school.webp',  copy: '조명 하나만 살아 있는 밤. 보이지 않는 곳에서 조준선이 날아온다.', tint: '#1b2a5c4d' }
  ],
  skills: [
    { id:'smoke', name:'연막탄', icon:'smoke', art:'assets/icons/smoke.webp', key:'1', color:'#c9bfdc', count:2, duration:'4초 은폐', copy:'연막 속에서 백신 발사자가 조준하지 못합니다. 이미 날아오는 탄환은 피하세요.' },
    { id:'boost', name:'가속제', icon:'run', art:'assets/icons/boost.webp', key:'2', color:'#57d9ed', count:2, duration:'5초 · 속도 +55%', copy:'이동 속도를 높여 인파를 추격하거나 포위망에서 탈출합니다.' },
    { id:'heal', name:'회복제', icon:'cross', art:'assets/icons/heal.webp', key:'3', color:'#ff6578', count:2, duration:'체력 +35', copy:'손상된 바이러스를 즉시 복구합니다. 체력이 가득 차면 소모되지 않습니다.' },
    { id:'mine', name:'감염 지뢰', icon:'target', art:'assets/icons/mine.webp', key:'4', color:'#edb779', count:2, duration:'반경 120 · 12초', copy:'발밑에 지뢰를 설치합니다. 사람이 접근하면 주변 인파를 한꺼번에 감염시킵니다.' }
  ],
  // 한 판은 90초로 고정이다 — 챕터 안에서 기록을 견주려면 모두 같은 자로 재야 한다.
  round: 90,
  // 챕터는 하나씩 깨 나간다. 뒤로 갈수록 백신은 빨라지지만(heat·delay·every) 인파가 더 많이 쏟아져(crowd)
  // 점수의 천장은 오히려 높아진다 — 어려워질수록 기록은 쉬워지는 설계.
  chapters: [
    { n: 1, map: 'plaza',      name: '첫 접촉',     copy: '아무도 눈치채지 못한 저녁. 한 사람만 스치면 시작된다.', quota:  25, crowd: 34, delay: 10, every: 15, cap: 4,  heat: 0 },
    { n: 2, map: 'plaza',      name: '번지는 소문', copy: '광장이 술렁인다. 사람들이 당신을 피하기 시작했다.',     quota:  40, crowd: 42, delay:  8, every: 13, cap: 5,  heat: 0 },
    { n: 3, map: 'plaza',      name: '통제 불능',   copy: '첫 방역 차량이 들어왔다. 광장은 아직 당신 편이다.',     quota:  55, crowd: 50, delay:  6, every: 11, cap: 6,  heat: 1 },
    { n: 4, map: 'quarantine', name: '검문소',      copy: '통로가 좁다. 숨을 곳은 없으니 대시로 빠져나가세요.',           quota:  75, crowd: 58, delay:  5, every: 10, cap: 7,  heat: 1 },
    { n: 5, map: 'quarantine', name: '봉쇄선 돌파', copy: '대피 인파가 검문소로 몰린다. 그만큼 먹잇감도 많다.',    quota:  95, crowd: 66, delay:  4, every:  9, cap: 8,  heat: 2 },
    { n: 6, map: 'quarantine', name: '백신 저지선', copy: '부채꼴 사격이 통로를 메운다. 대시 타이밍이 전부.',      quota: 115, crowd: 74, delay:  4, every:  8, cap: 9,  heat: 2 },
    { n: 7, map: 'blackout',   name: '정전',        copy: '불이 꺼졌다. 어둠 속에서 인파가 가장 빽빽하다.',        quota: 140, crowd: 82, delay:  3, every:  7, cap: 10, heat: 3 },
    { n: 8, map: 'blackout',   name: '비상등',      copy: '비상 발전기가 돌았다. 백신은 당신을 정확히 본다.',      quota: 165, crowd: 90, delay:  3, every:  6, cap: 11, heat: 3 },
    { n: 9, map: 'blackout',   name: '최초 감염자', copy: '도시 전체가 당신 하나를 쫓는다. 끝까지 버텨라.',        quota: 195, crowd:100, delay:  2, every:  5, cap: 12, heat: 4 },
    // 2026-10-14 — 도시를 벗어난다. 새 구역마다 숨 돌릴 한 판을 먼저 두고 다음 판에서 조인다.
    { n:10, map: 'subway',     name: '첫 환승',     copy: '지하로 내려간다. 기둥 사이로 사람들이 흩어진다.',       quota: 215, crowd: 96, delay:  4, every:  7, cap: 11, heat: 3 },
    { n:11, map: 'subway',     name: '막차',        copy: '마지막 열차가 들어왔다. 승강장이 가득 찬다.',           quota: 240, crowd:104, delay:  3, every:  6, cap: 12, heat: 4 },
    { n:12, map: 'factory',    name: '야간 교대',   copy: '교대 시간. 공장은 사람으로 꽉 차 있다.',                quota: 265, crowd:110, delay:  3, every:  6, cap: 12, heat: 4 },
    { n:13, map: 'factory',    name: '컨베이어',    copy: '설비 뒤에 숨은 사수들이 번갈아 조준한다.',              quota: 290, crowd:118, delay:  3, every:  5, cap: 13, heat: 5 },
    { n:14, map: 'lab',        name: '백신 본부',   copy: '백신이 만들어지는 곳. 당연히 가장 많이 쏜다.',          quota: 315, crowd:124, delay:  2, every:  5, cap: 14, heat: 5 },
    { n:15, map: 'lab',        name: '0번 표본',    copy: '네 번호가 적힌 문을 지난다. 안쪽이 더 밝다.',           quota: 345, crowd:132, delay:  2, every:  5, cap: 14, heat: 6 },
    { n:16, map: 'harbor',     name: '컨테이너',    copy: '배를 기다리는 줄이 부두를 덮었다.',                     quota: 375, crowd:140, delay:  2, every:  4, cap: 15, heat: 6 },
    { n:17, map: 'harbor',     name: '마지막 배',   copy: '떠나지 못한 사람들. 바다는 더 갈 곳이 없다.',           quota: 405, crowd:148, delay:  2, every:  4, cap: 16, heat: 7 },
    { n:18, map: 'school',     name: '야간 자율',   copy: '불 꺼진 교실에서 사람들이 쏟아져 나온다.',              quota: 435, crowd:156, delay:  2, every:  4, cap: 16, heat: 7 },
    { n:19, map: 'school',     name: '마지막 수업', copy: '운동장 하나에 도시가 다 모였다. 여기서 끝낸다.',        quota: 470, crowd:165, delay:  2, every:  3, cap: 18, heat: 8 }
  ],
  selected: 1, loadout: ['smoke','boost'], history: [],
  // 챕터별 최고 기록과 클리어 여부. 1 챕터는 늘 열려 있고, 앞 챕터를 깨면 다음이 열린다.
  progress: { cleared: [], best: {} }
};
// 챕터 카드에 세우는 세로 포스터. 전투 바닥판(map-*)과 달리 눈높이에서 본 장면이다.
Outbreak.posterOf = c => 'assets/poster-' + c.n + '.webp';
Outbreak.chapter = () => Outbreak.chapters.find(c => c.n === Outbreak.selected) || Outbreak.chapters[0];
Outbreak.mapOf = c => Outbreak.maps.find(m => m.id === c.map);
Outbreak.unlocked = n => n === 1 || Outbreak.progress.cleared.includes(n - 1);
Outbreak.bestOf = n => Number(Outbreak.progress.best[n]) || 0;
// 별 셋: 통과선 / 1.35배 / 1.75배. 기록을 어디까지 밀지가 챕터마다 눈에 보이게.
Outbreak.starGoals = c => [c.quota, Math.round(c.quota * 1.35), Math.round(c.quota * 1.75)];
Outbreak.stars = (c, score) => Outbreak.starGoals(c).filter(g => score >= g).length;
Outbreak.save = () => { try { localStorage.setItem('patient-zero-kit', JSON.stringify({ chapter: Outbreak.selected, loadout: Outbreak.loadout, progress: Outbreak.progress })); } catch {} };
try {
  const saved = JSON.parse(localStorage.getItem('patient-zero-kit') || '{}');
  if (Outbreak.chapters.some(c => c.n === saved.chapter)) Outbreak.selected = saved.chapter;
  if (Array.isArray(saved.loadout) && saved.loadout.length === 2 && new Set(saved.loadout).size === 2 && saved.loadout.every(id => Outbreak.skills?.some(s => s.id === id) ?? true)) Outbreak.loadout = saved.loadout;
  if (saved.progress && Array.isArray(saved.progress.cleared)) {
    Outbreak.progress.cleared = [...new Set(saved.progress.cleared.map(Number).filter(n => Outbreak.chapters.some(c => c.n === n)))];
    for (const [k, v] of Object.entries(saved.progress.best || {})) if (Outbreak.chapters.some(c => String(c.n) === k)) Outbreak.progress.best[k] = Math.max(0, Math.floor(Number(v)) || 0);
  }
  const history = JSON.parse(localStorage.getItem('patient-zero-runs-v2') || '[]');
  if (Array.isArray(history)) Outbreak.history = history.slice(0, 8);
  if (!Outbreak.unlocked(Outbreak.selected)) Outbreak.selected = 1;
} catch {}
