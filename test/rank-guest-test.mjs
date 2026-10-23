/* PATIENT ZERO — 비로그인 순위 제출 검사. 서버를 띄우지 않고 createServer() 를 직접 쓴다. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-rank-'));
const DATA = path.join(tmp, 'accounts.json');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

const TOKEN = 'ACCT-TOKEN-xyz';
const ACC = sha('me@test.local').slice(0, 24);
fs.writeFileSync(DATA, JSON.stringify({
  v: 1,
  accounts: { [ACC]: { id: ACC, email: 'me@test.local', created: Date.now(), ways: ['google'] } },
  sessions: { [sha(TOKEN)]: { id: ACC, exp: Date.now() + 864e5 } },
  saves: {}, ranks: {},
}));
process.env.DATA = DATA;

const { createServer } = await import(new URL('../server/account.mjs', import.meta.url).href);
const srv = createServer();
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port;

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? (pass++, console.log('  ok   ' + name)) : (fail++, console.log('  FAIL ' + name + (extra ? ' — ' + extra : ''))); };

const post = (p, body, token) => fetch(base + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: JSON.stringify(body),
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const getRank = token => fetch(base + '/api/rank', { headers: token ? { Authorization: 'Bearer ' + token } : {} }).then(r => r.json());
const db = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const settle = () => new Promise(r => setTimeout(r, 200));   // save() 가 120ms 뒤에 쓴다

console.log('\n1. 로그인 없이 올린다');
{
  const r = await post('/api/rank', { score: 310, chapter: 4, name: '야간보행', avatar: 'sera', guest: 'dev-aaaaaaaa-1111' });
  ok('200 으로 받는다', r.status === 200, JSON.stringify(r));
  ok('최고 기록을 돌려준다', r.body.best === 310, JSON.stringify(r.body));
  await settle();
  const rows = Object.values(db().ranks);
  ok('줄이 하나 생겼다', rows.length === 1, JSON.stringify(rows));
  ok('손님 줄로 표시된다', rows[0].guest === true);
  ok('기기 id 를 날것으로 두지 않는다', !JSON.stringify(db()).includes('dev-aaaaaaaa-1111'));
  ok("키에 'g:' 가 붙는다", Object.keys(db().ranks)[0].startsWith('g:'));
}

console.log('\n2. 같은 기기는 한 줄 — 최고 기록만 남는다');
{
  await post('/api/rank', { score: 120, chapter: 2, name: '야간보행', avatar: 'sera', guest: 'dev-aaaaaaaa-1111' });
  await settle();
  const rows = Object.values(db().ranks);
  ok('여전히 한 줄', rows.length === 1, JSON.stringify(rows));
  ok('낮은 기록으로 덮이지 않는다', rows[0].score === 310);
  const r = await post('/api/rank', { score: 480, chapter: 6, name: '야간보행2', avatar: 'sera', guest: 'dev-aaaaaaaa-1111' });
  ok('높은 기록으로는 갱신된다', r.body.best === 480);
}

console.log('\n3. 다른 기기는 다른 줄');
{
  await post('/api/rank', { score: 200, chapter: 3, name: 'SPREADER', avatar: 'zero', guest: 'dev-bbbbbbbb-2222' });
  await settle();
  ok('줄이 둘', Object.keys(db().ranks).length === 2);
  const rows = await getRank();
  ok('공개 순위에 둘 다 보인다', rows.length === 2, JSON.stringify(rows));
  ok('점수 내림차순', rows[0].score === 480 && rows[1].score === 200);
  ok('이름이 나간다', rows[0].name === '야간보행2');
  ok('기기 id 는 안 나간다', !JSON.stringify(rows).includes('dev-'));
}

console.log('\n4. 울타리');
{
  const r1 = await post('/api/rank', { score: 10, guest: 'short' });
  ok('짧은 기기 id 는 거절', r1.status === 401, JSON.stringify(r1));
  const r2 = await post('/api/rank', { score: 10 });
  ok('기기 id 가 없으면 거절', r2.status === 401);
  const r3 = await post('/api/rank', { score: 999999999, guest: 'dev-cccccccc-3333' });
  ok('터무니없는 점수는 거절', r3.status === 400 && r3.body.error === 'bad-score', JSON.stringify(r3));
  const r4 = await post('/api/rank', { score: -5, guest: 'dev-cccccccc-3333' });
  ok('음수는 거절', r4.status === 400);
  const r5 = await post('/api/rank', { score: 100001, guest: 'dev-cccccccc-3333' });
  ok('상한 바로 위는 거절', r5.status === 400, JSON.stringify(r5));
  const r6 = await post('/api/rank', { score: 100000, guest: 'dev-cccccccc-3333' });
  ok('상한 자체는 받는다', r6.status === 200, JSON.stringify(r6));
  await post('/api/rank/forget', { guest: 'dev-cccccccc-3333' });   // 다음 검사를 위해 치운다
  await settle();
}

console.log('\n5. 내리기');
{
  const r = await post('/api/rank/forget', { guest: 'dev-bbbbbbbb-2222' });
  ok('내려갔다고 답한다', r.status === 200 && r.body.removed === true, JSON.stringify(r));
  await settle();
  ok('줄이 지워졌다', Object.keys(db().ranks).length === 1);
  const again = await post('/api/rank/forget', { guest: 'dev-bbbbbbbb-2222' });
  ok('두 번 내려도 조용하다', again.status === 200 && again.body.removed === false);
  const nobody = await post('/api/rank/forget', { guest: 'dev-zzzzzzzz-9999' });
  ok('남의 줄을 지우지 못한다(모르는 id)', nobody.body.removed === false);
}

console.log('\n6. 손님으로 올려 두고 로그인하면 한 줄로 합쳐진다');
{
  await post('/api/rank', { score: 455, chapter: 5, name: '손님', avatar: 'zero', guest: 'dev-dddddddd-4444' });
  await settle();
  const before = Object.keys(db().ranks).length;
  const r = await post('/api/rank', { score: 100, chapter: 1, name: '계정', avatar: 'sera', guest: 'dev-dddddddd-4444' }, TOKEN);
  ok('200', r.status === 200, JSON.stringify(r));
  ok('손님 쪽 높은 기록을 들고 간다', r.body.best === 455, JSON.stringify(r.body));
  await settle();
  const keys = Object.keys(db().ranks);
  ok('줄 수가 늘지 않는다(합쳐졌다)', keys.length === before, before + ' → ' + keys.length);
  ok('손님 줄은 사라졌다', !keys.includes('g:' + sha('dev-dddddddd-4444').slice(0, 24)));
  ok('계정 줄로 남았다', keys.includes(ACC));
  const rows = await getRank(TOKEN);
  ok('내 줄에 표시가 붙는다', rows.some(x => x.mine === true));
}

console.log('\n7. 한 주소에서 너무 자주 올리면 막는다');
{
  let blocked = 0, sent = 0;
  for (let i = 0; i < 40; i++) {
    const r = await post('/api/rank', { score: 50 + i, guest: 'dev-flood-' + i + '-xxxx' });
    if (r.status === 429) blocked++; else sent++;
  }
  ok('어느 지점부터 429', blocked > 0, 'sent=' + sent + ' blocked=' + blocked);
  const acct = await post('/api/rank', { score: 70, chapter: 1, name: '계정', avatar: 'zero' }, TOKEN);
  ok('계정은 그 울타리에 안 걸린다', acct.status === 200, JSON.stringify(acct));
}

srv.close();
console.log('\n' + (fail ? 'FAIL ' + fail + ' / ' : '') + 'pass ' + pass);
process.exit(fail ? 1 : 0);
