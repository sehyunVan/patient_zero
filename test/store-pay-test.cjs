// 스토어에 적는 값과 코드가 같은가 — 브라우저를 띄우지 않는다. 파일만 읽어 맞춰 본다.
//
// 왜 이런 검사가 필요한가: 상품 ID 는 **못 바꾸고 지운 ID 는 재사용도 안 된다.**
// 한 글자만 어긋나면 결제는 되고 물건은 안 들어간다(SHIPPING.md §5).
// 확률도 같다 — 공지한 숫자와 뽑는 표가 어긋난 순간 그건 거짓말이 된다.
// 그래서 **서로 다른 두 곳**(코드 / 제출 문서)을 맞춰 본다. 한쪽만 보는 검사는 스스로를 보증한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// 중괄호를 세어 객체 리터럴 하나를 떼어 낸다 (브라우저 전역에 기대는 파일이라 require 할 수 없다)
function literal(src, name) {
  const at = src.indexOf('const ' + name + '=');
  assert.ok(at >= 0, name + ' 표를 찾았다');
  const open = src.indexOf('{', at);
  let depth = 0, end = open;
  for (; end < src.length; end++) {
    if (src[end] === '{') depth++;
    else if (src[end] === '}' && --depth === 0) break;
  }
  return eval('(' + src.slice(open, end + 1) + ')');
}

const shop = read('js/shop.js');
const prog = read('js/progression.js');
const store = read('STORE.md');

/* ── 1) 인앱 상품 ID — 게임과 제출 문서가 같은 문자열을 쓴다 ── */
const skus = [...shop.matchAll(/sku:\s*'([^']+)'/g)].map(m => m[1]);
assert.equal(skus.length, 4, '꾸러미 네 개에 모두 sku 가 있다');
assert.deepEqual([...new Set(skus)], skus, '상품 ID 가 겹치지 않는다');
for (const sku of skus) assert.ok(new RegExp('`' + sku + '`').test(store), `STORE.md 에 ${sku} 가 적혀 있다`);
// 반대 방향도 본다 — 문서에만 있고 코드에 없는 상품은 「등록은 했는데 안 팔리는」 칸이 된다
for (const m of store.matchAll(/`(ticket_\d+)`/g)) assert.ok(skus.includes(m[1]), m[1] + ' 는 코드에도 있다');
// 장수를 ID 에 박아 둔 약속 — 스토어 상품 설명과 게임 화면이 어긋나지 않게
const packs = [...shop.matchAll(/sku:\s*'ticket_(\d+)',\s*name:\s*'모집권 (\d+)장'/g)];
assert.equal(packs.length, 4, '네 칸 모두 ID 와 이름이 같은 줄에 있다');
for (const [, id, shown] of packs) assert.equal(id, shown, `ticket_${id} 의 장수는 화면과 같다`);

/* ── 1-2) 가격과 지급 수량 — 콘솔에 입력할 값이 게임과 같은가 ── */
// 가격이 어긋나면 스토어에는 5,500원으로 올라가고 화면에는 1,100원이 적힌다. 둘 다 사람이 보는 값이다.
for (const m of shop.matchAll(/sku:\s*'(ticket_\d+)',\s*name:\s*'모집권 (\d+)장',\s*price:\s*'₩([\d,]+)',\s*bonus:\s*'(?:\+(\d+)장)?'/g)) {
  const [, sku, base, price, bonus] = m;
  // §1 의 「못 바꾸는 값」 줄이 아니라, 네 상품을 한 줄씩 적은 등록표를 본다
  const row = store.split('\n').find(l => l.startsWith('| `' + sku + '`'));
  assert.ok(row, sku + ' 줄이 STORE.md 표에 있다');
  assert.ok(row.includes('₩' + price), `${sku} 가격 ₩${price} 이 표와 같다 (${row.trim()})`);
  const total = Number(base) + Number(bonus || 0);
  assert.ok(row.includes('**' + total + '장**'), `${sku} 는 보너스를 더한 ${total}장을 지급한다고 적혀 있다`);
}

/* ── 2) 확률 공지 — 뽑는 표에서 계산한 값이 제출 문서에 그대로 적혀 있다 ── */
const DRAW = literal(prog, 'DRAW');
const PITY = literal(prog, 'PITY');
const pct = banner => {
  const outcomes = DRAW[banner].outcomes;
  const total = outcomes.reduce((s, o) => s + o.weight, 0);
  const ch = outcomes.find(o => o.kind === 'character');
  const rare = Object.values(ch.rarity).reduce((s, n) => s + n, 0);
  return { character: ch.weight / total * 100, ssr: ch.weight / total * (ch.rarity.SSR / rare) * 100 };
};
const standard = pct('standard'), pickup = pct('pickup');
const flat = store.replace(/\s+/g, ' ');

const say = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
const claim = new RegExp(`${say(standard.character)}% of standard draws \\(SSR ${standard.ssr.toFixed(1)}%\\)`);
assert.match(flat, claim, `일반 모집 확률 ${say(standard.character)}% / SSR ${standard.ssr.toFixed(1)}% 가 그대로 적혀 있다`);
assert.match(flat, new RegExp(`${say(pickup.character)}% of the pickup banner \\(SSR ${pickup.ssr.toFixed(1)}%\\)`),
  `픽업 확률 ${say(pickup.character)}% / SSR ${pickup.ssr.toFixed(1)}% 가 그대로 적혀 있다`);
assert.match(flat, new RegExp(`within ${PITY.character} draws and an SSR within ${PITY.ssr}`), '보장 횟수도 같다');

/* ── 3) 스토어가 URL 로 요구하는 세 장 ── */
for (const [file, must] of [
  ['site/index.html', /개인정보처리방침[\s\S]*계정 삭제/],
  ['site/privacy.html', /이메일 주소[\s\S]*광고가 없습니다/],
  ['site/delete.html', /앱 안에서 바로 지울 수 있습니다/],
]) {
  const html = read(file);
  assert.match(html, must, file + ' 이 요구되는 내용을 담고 있다');
  assert.match(html, /<title>[^<]*최초 감염자/, file + ' 의 제목이 앱 이름과 같다');
}

/* ── 4) 앱 안에 계정 삭제 경로가 실제로 있다 (문서가 거짓이 되지 않게) ── */
assert.match(read('js/auth.js'), /login-delete-go/, '게임 안에 계정 삭제 단추가 있다');
assert.match(read('server/account.mjs'), /POST \/api\/account\/delete/, '서버가 그 요청을 받는다');

/* ── 5) 고정한 ID 가 한 벌로만 적혀 있다 ── */
const bundle = [...store.matchAll(/`(sarl\.patientzero\.[a-z]+)`/g)].map(m => m[1]);
assert.ok(bundle.includes('sarl.patientzero.app'), '번들 ID 가 적혀 있다');
assert.equal([...new Set(bundle)].length, 2, '번들 ID 와 Services ID 둘뿐 — 오타로 생긴 제3의 ID 가 없다');

console.log(`PASS: 상품 ${skus.join(' · ')} · 확률 공지(일반 ${say(standard.character)}%/SSR ${standard.ssr.toFixed(1)}% · 픽업 ${say(pickup.character)}%/SSR ${pickup.ssr.toFixed(1)}% · 보장 ${PITY.character}/${PITY.ssr}) · 심사 문서 세 장 · 계정 삭제 경로 · 번들 ID`);
