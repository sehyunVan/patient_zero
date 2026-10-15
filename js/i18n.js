/* ============ 다국어 ============
   출처: subway-rpg/poc/i18n.js (막차 이후). 같은 방식 그대로 — 한국어 원문이 곧 키다.
   여기 게임에 맞춰 고친 곳: 역명표 없음, 번역 범위(#app 전체), 언어 셋(ko·en·ja), 로고 교체 없음.

   설계: 한국어 원문이 곧 키다. 그래서 한국어판은 카탈로그가 비어 있어도 그대로 돌아가고,
   번역이 빠진 항목은 조용히 한국어로 떨어진다(빈 화면 대신).

   두 가지 호출 형태를 같은 이름으로 받는다:
     T('정지하세요.')                    → 평문
     T`${name} 대원이 접속했습니다.`      → 태그드 템플릿. 보간값은 그대로 두고 고정부만 번역한다.

   주의: 이 게임은 한글 문자열을 값 비교에 쓴다(예: stationState(i)==='safe' 는 안전하지만
   gimmick(f)==='흉내' 같은 비교가 있다). 표시용 문자열만 T 로 감싼다 — 비교·키로 쓰이는 값은 건드리지 않는다.
   그런 값은 원문 그대로 두고, 화면에 낼 때만 T 를 통과시킨다. */

const I18N = {
  lang: 'ko',
  cat: {},          // { "한국어 원문": "translation" }
  stations: {},     // 이 게임에는 역명표가 없다 — 자리는 남겨 둔다(번역기 코드를 같이 쓰므로)
  missing: new Set(),
};

const LANGS = [
  { id: 'ko', n: '한국어',  html: 'ko' },
  { id: 'en', n: 'English', html: 'en' },
  { id: 'ja', n: '日本語',  html: 'ja' },
];

/* 태그드 템플릿의 카탈로그 키 — 고정부를 ${} 로 이어 붙인다.
   T`남은 ${n}역` → 키 "남은 ${}역" */
const tplKey = (strings) => strings.raw.join('${}');

const normalizeKey = s => String(s).replace(/s+/g, ' ').trim();
function lookup(key) {
  if (I18N.lang !== 'ko') {
    const flat = normalizeKey(key);
    if (flat !== key && I18N.cat[flat]) return I18N.cat[flat];
  }
  if (I18N.lang === 'ko') return key;
  const hit = I18N.cat[key];
  if (hit == null || hit === '') { I18N.missing.add(key); return key; }
  return hit;
}

/* 번역문의 ${} 자리에 값을 순서대로 끼운다. 번역가가 순서를 바꿔야 하면 ${1} ${0} 으로 쓴다. */
function fill(pattern, values) {
  let auto = 0;
  return pattern.replace(/\$\{(\d*)\}/g, (_, idx) => {
    const v = idx === '' ? values[auto++] : values[+idx];
    return v == null ? '' : String(v);
  });
}

function T(a, ...vals) {
  if (a && a.raw) return fill(lookup(tplKey(a)), vals);   // 태그드 템플릿
  if (a == null) return a;
  return vals.length ? fill(lookup(String(a)), vals) : lookup(String(a));
}

/* 역명은 따로 — 공식 표기를 쓰고, 없으면 한글 그대로 */
const TS = (ko) => (I18N.lang === 'ko' ? ko : (I18N.stations[ko] || ko));

const LANG_KEY = 'subway-rpg.lang';

/* 기본은 한국어 — 원어이고, 음성·방송도 한국어다. 브라우저 언어로 자동 전환하지 않는다:
   한 번 고르면 끝인 선택은 설정에 두고, 헤드리스 브라우저(en-US)가 테스트를 영어로 돌려 버리는 일도 막는다. */
function pickInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGS.some(l => l.id === saved)) return saved;
  } catch (e) { /* 프라이빗 창 등 — 저장소 없이도 돌아간다 */ }
  return 'ko';
}

/* 카탈로그는 i18n/bundle.js 가 window.I18N_BUNDLED 로 미리 깔아 둔다.
   fetch 를 쓰지 않는 이유: file:// 로 그냥 열면 CORS 에 막혀 화면이 통째로 빈다(voice.html 에서 겪었다). */
function loadLang(id) {
  I18N.lang = id;
  I18N.missing.clear();
  document.documentElement.lang = (LANGS.find(l => l.id === id) || LANGS[0]).html;
  document.documentElement.dataset.lang = id;
  const inline = id === 'ko' ? null : (window.I18N_BUNDLED || {})[id];
  I18N.cat = (inline && inline.ui) || {};
  I18N.stations = (inline && inline.stations) || {};
  if (id !== 'ko' && !inline) console.warn('[i18n] 카탈로그 없음 — 한국어로 표시한다:', id);
}

/* 이름을 setLang 으로 두면 일반 스크립트에선 window.setLang 과 같은 바인딩이라, 아래 래퍼가 자기 자신을 부른다 */
function applyLang(id) {
  if (!LANGS.some(l => l.id === id)) return;
  loadLang(id);
  try { localStorage.setItem(LANG_KEY, id); } catch (e) { /* 저장 못 해도 이번 세션은 유지된다 */ }
  syncTitleLogo();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: id } }));
}

/* ── 타이틀 로고 ──
   입장 화면의 로고는 글자를 그려 넣은 그림이라 번역기가 손댈 수 없다. 언어마다 따로 구운 그림으로 갈아 끼운다
   (tools/gen-title-logo.mjs). 넷 다 2048×768 로 비율이 같다 — 아니면 언어마다 로고 묶음 크기가 달라진다. */
/* 타이틀 로고는 언어마다 따로 굽지 않는다 — INFECTION 한 장으로 간다(글자가 영문이라 그대로 읽힌다). */
const titleLogoSrc = () => (document.querySelector('.infection-logo') || {}).src || '';

/* 그림 안에 박힌 글자는 번역기가 못 건드린다. 한국어가 그려진 그림은 둘뿐이라 언어판으로 갈아 끼운다
   (원본을 레퍼런스로 글자만 바꿔 구운 것 — tools/gen-art-en.mjs).
   한국어가 아니면 영어판을 쓴다(일본어판 그림은 아직 없다 — 한국어가 남는 것보다 영어가 낫다). */
const BAKED_TEXT_ART = ['pickup-logo', 'chapter-slogan'];
function syncTitleLogo() {
  const ko = I18N.lang === 'ko';
  for (const name of BAKED_TEXT_ART) {
    const want = `assets/${name}${ko ? '' : '-en'}.webp`;
    for (const img of document.querySelectorAll(`img[src*="${name}"]`))
      if (!(img.getAttribute('src') || '').endsWith(want)) img.setAttribute('src', want);
  }
}


/* ── 화면 단 번역 ──
   이 게임은 문자열 1,200개가 데이터 표와 템플릿 여기저기에 박혀 있다. 전부 T() 로 감싸는 대신
   화면에 나온 텍스트 노드를 카탈로그로 되짚는다. 키가 한국어 원문이라 영어 노드는 다시 안 건드린다.
   1) 정확히 같은 문장  →  카탈로그 직행
   2) 보간이 있는 문장 "남은 ${}역 · 첫차까지 ${}분" → 정규식으로 잡아 값을 옮겨 심는다
   T()/T`` 로 이미 번역된 곳은 한국어가 남지 않으므로 자연히 건너뛴다. */
let PATTERNS = null;
function buildPatterns() {
  PATTERNS = [];
  for (const key of Object.keys(I18N.cat)) {
    if (!key.includes('${')) continue;
    const parts = key.split(/\$\{\d*\}/);
    /* 빈칸이 받는 값 — 단위 낱말 하나뿐인 틀("${}역", "${}명")은 숫자만(아니면 "서울역"·"구역" 같은 낱말을 잘못 잡는다).
       어느 틀이든 값에 구분자( · , — )는 넣지 않는다 — 문장 전체를 한 값으로 삼키지 않고 조각 번역(아래 3)으로 넘긴다 */
    const lit = parts.join('').replace(/\s/g, '');
    const cap = COUNTER.test(lit) ? '([0-9][0-9.,]*)' : '((?:(?! · | — )[\\s\\S])+?)';
    const re = new RegExp('^' + parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(cap) + '$');
    PATTERNS.push({ re, key, n: parts.length - 1 });
  }
  PATTERNS.sort((a, b) => b.key.length - a.key.length);      // 긴 문장이 먼저 — 부분 일치 오탐을 줄인다
}
const HAS_KO = /[가-힣]/;
const SEP = / · | — | → | \/ /, SEP_SPLIT = /( · | — | → | \/ )/, SEP_ONLY = /^( · | — | → | \/ )$/; let segDepth = 0;
/* 단위 낱말 하나뿐인 틀("${}역", "${}명")은 숫자만 받는다 — 아니면 "서울역"·"구역" 같은 낱말을 잘못 잡는다. "${} 도착" 같은 건 역명도 받는다 */
const COUNTER = /^(역|명|분|초|개|회|번|칸|장|급|체|층|줄|쌍|턴|밤|일|주|시|정거장|구간|건|마리|점|배|겹|차례)$/;
/* 따옴표 대사 “…”, 앞에 붙은 구분자 "· 회수" — 껍질을 벗겨 알맹이를 번역하고 다시 씌운다 */
const WRAP = /^([“"「『‘'(（]+)([\s\S]*?)([”"」』’')）]+)$/, LEAD = /^([·—→/]\s+)([\s\S]+)$/;
/* 역방향 색인 — 다른 언어의 번역문/역명에서 한국어 원문으로. 영어 상태에서 그려진 노드(SN·T 로 이미 영어가 박힌)를
   일본어로 넘길 때 한국어 키를 되찾는 데 쓴다. 언어별로 한 번만 만든다. */
let REV = null;
function buildReverse() {
  REV = { ui: new Map(), st: new Map() };
  for (const [lang, b] of Object.entries(window.I18N_BUNDLED || {})) {
    for (const [ko, v] of Object.entries(b.ui || {})) if (v && !REV.ui.has(v)) REV.ui.set(v, ko);
    for (const [ko, v] of Object.entries(b.stations || {})) if (v && !REV.st.has(v)) REV.st.set(v, ko);
  }
}
function toKorean(t) {
  if (HAS_KO.test(t)) return t;
  if (!REV) buildReverse();
  if (REV.ui.has(t)) return REV.ui.get(t);
  if (REV.st.has(t)) return REV.st.get(t);
  // 보간 문장: 다른 언어 패턴에 맞춰 보고, 잡힌 값(역명 등)도 되돌린다
  if (!PATTERNS_ALL) buildPatternsAll();
  for (const p of PATTERNS_ALL) { const m = t.match(p.re); if (m) return fill(p.ko, m.slice(1).map(v => { const k = toKorean(v.trim()); return k == null ? v : k; })); }   // 숫자·시각처럼 한국어가 없는 값은 그대로(예전엔 비어서 "도착 시각()" 이 됐다)
  return null;
}
let PATTERNS_ALL = null;
function buildPatternsAll() {
  PATTERNS_ALL = [];
  for (const b of Object.values(window.I18N_BUNDLED || {})) {
    for (const [ko, v] of Object.entries(b.ui || {})) {
      if (!v || !v.includes('${')) continue;
      const parts = v.split(/\$\{\d*\}/);
      /* 되짚기도 같은 규칙 — 고정부가 단위 낱말뿐인 번역("${}駅", "${} Stops")은 숫자만 받는다.
         아니면 "— ソウル駅" 가 "${}駅"(= "${}정거장") 에 걸려 "— 서울정거장" 이라는 없는 원문이 된다(2026-10-07) */
      const lit = parts.join('').replace(/\s/g, '');
      const cap = lit.length <= 3 && !/[가-힣]/.test(lit) ? '([0-9][0-9.,]*)' : '((?:(?! · | — )[\\s\\S])+?)';
      PATTERNS_ALL.push({ re: new RegExp('^' + parts.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(cap) + '$'), ko });
    }
  }
  PATTERNS_ALL.sort((a, b) => b.re.source.length - a.re.source.length);
}
function translateText(raw) {
  let t = raw.trim();
  if (!t) return null;
  if (!HAS_KO.test(t)) { const ko = toKorean(t); if (ko == null) return null; if (I18N.lang === 'ko') return raw.replace(t, ko); t = ko; }
  // 역명 단독 노드 — 카탈로그가 아니라 역명 표에서
  if (I18N.stations[t]) return raw.replace(raw.trim(), I18N.stations[t]);
  const hit = I18N.cat[t];
  if (hit) return raw.replace(raw.trim(), hit);
  if (!PATTERNS) buildPatterns();
  for (const p of PATTERNS) {
    const m = t.match(p.re);
    // 잡힌 값(예: "심야", "왕십리")도 그 자체가 카탈로그 키일 수 있다 — 한 겹 더 번역한다
    if (m) return raw.replace(raw.trim(), fill(I18N.cat[p.key], m.slice(1).map(v => I18N.cat[v.trim()] ? v.replace(v.trim(), I18N.cat[v.trim()]) : (I18N.stations[v.trim()] ? v.replace(v.trim(), I18N.stations[v.trim()]) : v))));
  }
  { const w = t.match(WRAP); if (w && HAS_KO.test(w[2])) { const tr = translateText(w[2]); if (tr != null) return raw.replace(t, w[1] + tr + w[3]); } }
  { const l = t.match(LEAD); if (l) { const tr = translateText(l[2]); if (tr != null) return raw.replace(t, l[1] + tr); } }
  /* 3) 조각 — 문장 전체가 없으면 구분자( · , — , → , / )로 나눠 조각마다 번역해 다시 잇는다(2026-10-07).
        이 게임은 "Lv. 1 · 공격 · 원거리 · 忠正" 처럼 조각을 이어 붙인 줄이 많다 — 조각이 카탈로그에 있으면 줄 전체가 번역된다 */
  if (!segDepth && SEP.test(t)) {
    segDepth++;
    try {
      const parts = t.split(SEP_SPLIT); let changed = false;
      const out = parts.map(pc => { if (SEP_ONLY.test(pc) || !HAS_KO.test(pc)) return pc; const tr = translateText(pc); if (tr != null && tr !== pc) { changed = true; return tr; } return pc; });
      if (changed) return raw.replace(t, out.join(''));
    } finally { segDepth--; }
  }
  return null;
}
const ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
/* 노드별 한국어 원문. 번역은 늘 이 원문에서 다시 한다 — 영어로 바뀐 노드를 일본어로 넘길 때
   한국어 키가 안 잡혀 영어가 남던 버그(en→ja 전환 잔류)의 원인이 여기다. */
const ORIG_TEXT = new WeakMap();          // Text → 원문
const ORIG_ATTR = new WeakMap();          // Element → { attr: 원문 }
/* 원문 우선순위: WeakMap 에 든 한국어 → 현재 노드값(다른 언어면 역색인으로 한국어를 되찾는다) */
/* 역색인 — **정확 일치만**. 노드의 「원문」을 정할 때 보간 패턴(PATTERNS_ALL)까지 쓰면,
   모듈이 미리 번역해 넣은 조립 문장(「缩短运行 · 3号线 · 01:20起末端2站关闭 · 下班 开花石 +1」)에
   엉뚱한 ${} 패턴이 걸려 **가짜 한국어 원문**을 만들어 냈다. 그 가짜 원문을 다시 번역하면서
   되돌릴 수 있는 조각만 한국어로 돌아가 반만 번역된 줄이 됐다
   (2026-10-07 유저 지적: 운행표 선택지 · 「다이스 성공/실패」 등). 번역 자체(translateText)는 그대로 느슨하게 둔다. */
const FOREIGN = /[A-Za-z぀-ヿ㐀-鿿]/;      // 라틴 · 가나 · 한자 — 되돌려야 할 글자
function toKoreanExact(t) {
  if (HAS_KO.test(t)) return t;
  if (!REV) buildReverse();
  if (REV.ui.has(t)) return REV.ui.get(t);
  if (REV.st.has(t)) return REV.st.get(t);
  /* 보간 문장도 되돌린다 — 「Bound for Jonggak」 → 「종각 방면」. 단 **빈칸이 전부 풀릴 때만** 믿는다.
     하나라도 못 풀면 반쯤 한국어인 가짜 원문이 되고, 그걸 다시 번역하면서 멀쩡히 번역돼 있던 줄이 한국어로 돌아간다. */
  if (!PATTERNS_ALL) buildPatternsAll();
  for (const p of PATTERNS_ALL) {
    const m = t.match(p.re); if (!m) continue;
    let ok = true;
    const vals = m.slice(1).map(v => {
      const x = (v || '').trim();
      if (!x || !FOREIGN.test(x)) return v;                  // 숫자 · 시각 · 기호는 그대로 둔다
      const k = toKoreanExact(x); if (k == null) { ok = false; return v; }
      return v.replace(x, k);
    });
    if (ok) return fill(p.ko, vals);
  }
  return null;
}
function koOf(cur, saved) {
  if (saved != null) return saved;
  const t = (cur || '').trim(); if (!t) return null;
  if (HAS_KO.test(t)) return cur;
  const ko = toKoreanExact(t);
  return ko != null ? cur.replace(t, ko) : null;
}
function retranslateText(tn) {
  const orig = koOf(tn.nodeValue, ORIG_TEXT.has(tn) ? ORIG_TEXT.get(tn) : null);
  if (orig == null) return;                                   // 번역 대상이 아니다
  if (!ORIG_TEXT.has(tn) && HAS_KO.test(orig)) ORIG_TEXT.set(tn, orig);
  if (I18N.lang === 'ko') { if (tn.nodeValue !== orig) tn.nodeValue = orig; return; }
  /* data-i18n="ui" 안은 UI 낱말이 먼저 — 「개화」 같은 말이 역명(Gaehwa)과 겹칠 때 탭·메뉴는 UI 번역(Awakened)으로 */
  const uiFirst = tn.parentElement && tn.parentElement.closest && tn.parentElement.closest('[data-i18n="ui"], .tabs, .crow > .k, .settings-tab');   // 탭·항목 이름표는 UI 낱말
  const tr = uiFirst && I18N.cat[orig.trim()] ? orig.replace(orig.trim(), I18N.cat[orig.trim()]) : translateText(orig);
  const next = tr != null ? tr : orig;                        // 이 언어에 번역이 없으면 원문으로
  if (tn.nodeValue !== next) tn.nodeValue = next;
}
function retranslateAttrs(el) {
  const bag = ORIG_ATTR.get(el);
  for (const a of ATTRS) {
    const cur = el.getAttribute(a); if (cur == null && !(bag && a in bag)) continue;
    const orig = koOf(cur, bag && a in bag ? bag[a] : null); if (orig == null) continue;
    if (!(bag && a in bag) && HAS_KO.test(orig)) ORIG_ATTR.set(el, Object.assign(bag || {}, { [a]: orig }));
    if (I18N.lang === 'ko') { if (cur !== orig) el.setAttribute(a, orig); continue; }
    const tr = translateText(orig); const next = tr != null ? tr : orig;
    if (cur !== next) el.setAttribute(a, next);
  }
}
function translateDOM(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        const tag = n.tagName;
        /* SVG 를 통째로 거부하면 안 된다 — 열차·허브 HUD 의 글자가 전부 <text> 라 그 판만 늘 한국어였다
           (2026-10-07 유저 지적). 글자(<text>/<tspan>)는 들여보내고, 그림(<path> 등)만 건너뛴다 */
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        retranslateAttrs(n);
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
  for (const tn of nodes) retranslateText(tn);
}
/* 번역이 닿는 범위 — #stage 와, 그 **밖**에 있는 판들.
   문 전환(#door-transition)은 stage 의 형제라 예전엔 영영 번역되지 않았다 — 카탈로그에 있어도 한국어로 남았다
   (2026-10-07 유저 지적: 「다음 구역으로 이동 중…」). 여기에 더하면 그 판들도 같이 따라온다. */
const ROOT_IDS = [];   // 화면이 하나라 body 하나로 충분하다
function roots() {
  const rs = ROOT_IDS.map(id => document.getElementById(id)).filter(Boolean);
  return rs.length ? rs : [document.body];
}
function translateAll() { attach(); for (const r of roots()) translateDOM(r); }
let observing = false, pending = false, mo = null;
const attached = new WeakSet();
/* 판은 스크립트 순서에 따라 뒤늦게 생긴다(#door-transition 은 i18n.js 보다 한참 뒤) — 그때그때 붙인다 */
function attach() {
  if (!mo) return;
  for (const r of roots()) if (!attached.has(r)) { attached.add(r); mo.observe(r, { childList: true, subtree: true, characterData: true }); }
}
function observe() {
  if (observing) return; observing = true;
  /* rAF 하나에만 기대면 프레임이 멈춘 순간(백그라운드 탭 · 헤드리스 · 마지막 렌더 뒤 정지) 예약된 번역이
     영영 안 돈다 — 그 화면만 한국어로 남는다. rAF 와 타이머 중 **먼저 오는 쪽**이 돌린다 (2026-10-07) */
  /* 모집·챕터 화면은 열 때마다 새로 그려진다 — 그림 교체도 번역과 같이 다시 돈다 */
  const flush = () => { if (!pending) return; pending = false; translateAll(); syncTitleLogo(); };
  mo = new MutationObserver(() => {
    if (pending || I18N.lang === 'ko') return;
    pending = true;
    requestAnimationFrame(flush);
    setTimeout(flush, 120);
  });
  if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach);
}

window.I18N = I18N;
window.LANGS = LANGS;
window.T = T;
window.TS = TS;
window.translateDOM = translateDOM;
/* Tx — 화면 번역과 같은 규칙(정확히 · 틀 · 조각 · 역명)으로 문자열 하나를 번역. 속성·조합 문장처럼 T 의 정확 일치로 안 잡히는 곳에 */
window.Tx = (s) => { if (s == null || I18N.lang === 'ko') return s; const r = translateText(String(s)); return r == null ? String(s) : r; };
window.setLang = (id) => { applyLang(id); PATTERNS = null; translateAll(); };
window.titleLogoSrc = titleLogoSrc;
loadLang(pickInitialLang());   // 첫 렌더 전에 동기로 끝난다
/* 로고는 <img> 가 이미 파싱된 뒤라 지금 바로 갈아 끼운다. 혹시 더 늦게 오는 화면(종료·클리어)을 위해 DOM 준비 때 한 번 더 */
syncTitleLogo();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncTitleLogo);
observe();
