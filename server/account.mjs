/* ============ PATIENT ZERO 계정 서버 — 구글 · 애플 · 이메일 코드 ============

   비밀번호가 없다. 그래서 「비밀번호 찾기」도 없다.
   토큰 검증과 코드 발송은 subway-rpg 에서 가져온 server/auth.mjs 가 한다(의존성 0).

   이 파일이 하는 일은 셋뿐이다:
     1) 세 가지 방법으로 들어온 사람을 같은 계정에 붙인다 (이메일이 같으면 같은 사람)
     2) 세션 토큰을 준다
     3) 저장 데이터(캐릭터·모집권·기록)를 그 계정에 보관한다

   켜는 법:  node server/account.mjs        (PORT, DATA 환경변수)
   키가 없으면 그 수단은 **꺼진 채로** 뜬다 — /api/config 가 뭐가 켜졌는지 알려 주고,
   화면은 꺼진 버튼을 비활성으로 그린다. 조용히 열려 있는 것보다 꺼진 편이 낫다.
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { verifyIdToken, PROVIDERS, issueCode, checkCode, sendCode, sweepCodes, CODE_RESEND_MS, isDemo } from './auth.mjs';

const PORT = Number(process.env.PORT) || 4190;
const DATA = process.env.DATA || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'data/accounts.json');
const SESSION_DAYS = 180;
const RANK_TOP = 50;        // 그 아래는 줄만 길어지고 아무도 안 본다 — 화면(js/ranking.js)과 같은 수
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

/* ── 저장 — 작은 JSON 한 장. 쓸 때는 임시 파일에 쓰고 바꿔치기한다(쓰다 만 파일이 남지 않게) ── */
const fresh = () => ({ v: 1, accounts: {}, sessions: {}, saves: {}, ranks: {} });
let db = fresh();
try { db = { ...fresh(), ...JSON.parse(fs.readFileSync(DATA, 'utf8')) }; } catch {}
let writing = null;
function save() {
  if (writing) return;
  writing = setTimeout(() => {
    writing = null;
    try {
      fs.mkdirSync(path.dirname(DATA), { recursive: true });
      const tmp = DATA + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DATA);
    } catch (e) { console.error('저장 실패', e.message); }
  }, 120);
}

/* ── 계정 ── */
function accountFor(email, how) {
  const id = sha(String(email).trim().toLowerCase()).slice(0, 24);
  const account = db.accounts[id] || (db.accounts[id] = { id, email: String(email).trim().toLowerCase(), created: Date.now(), ways: [] });
  if (!account.ways.includes(how)) account.ways.push(how);
  account.seen = Date.now();
  save();
  return account;
}
function newSession(id) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.sessions[sha(token)] = { id, exp: Date.now() + SESSION_DAYS * 864e5 };
  save();
  return token;
}
function bearer(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const s = db.sessions[sha(m[1])];
  if (!s || s.exp < Date.now()) return null;
  return db.accounts[s.id] || null;
}
const profile = a => ({ id: a.id, email: a.email, ways: a.ways, created: a.created });

/* ── HTTP ── */
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }); res.end(JSON.stringify(body)); };
const bad = (res, message, code = 400) => json(res, code, { error: message });
const body = req => new Promise(resolve => { let s = ''; req.on('data', c => { s += c; if (s.length > 2e6) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } }); });

/* 애플은 form_post 로 돌려준다 — JSON 이 아니라 application/x-www-form-urlencoded 다 */
const formBody = req => new Promise(resolve => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 2e6) req.destroy(); });
  req.on('end', () => { const out = {}; for (const [k, v] of new URLSearchParams(s)) out[k] = v; resolve(out); });
});
/* 팝업이 제 할 일을 마치고 원래 창에 결과를 넘긴 뒤 스스로 닫는 한 장.
   토큰이 아니라 **세션**을 넘긴다 — 애플 토큰은 이 서버가 이미 검증했으니 다시 보낼 이유가 없다. */
const popupHtml = payload => `<!DOCTYPE html><html lang="ko"><meta charset="utf-8">
<title>로그인 처리 중…</title>
<body style="margin:0;background:#060a10;color:#8aa2b4;font:13px -apple-system,sans-serif;display:grid;place-items:center;height:100vh">
<p>로그인 확인 중…</p>
<script>
(function(){
  var data = ${JSON.stringify({ source: 'patient-zero-oauth', ...payload })};
  try { if (window.opener) { window.opener.postMessage(data, '*'); window.close(); return; } } catch (e) {}
  try { sessionStorage.setItem('patient-zero-oauth', JSON.stringify(data)); } catch (e) {}
  location.replace('../../');
})();
</script></body></html>`;

const enabled = () => ({
  google: PROVIDERS.google.aud().length > 0,
  apple: PROVIDERS.apple.aud().length > 0,
  // 웹에서 애플로 들어오려면 **Services ID** 가 있어야 한다. 번들 ID 만 있으면 네이티브 iOS 만 된다.
  // 이걸 따로 알려 주지 않으면 화면이 「눌리는데 안 되는 단추」를 그린다(2026-10-15 에 그랬다).
  appleWeb: !!process.env.APPLE_SERVICES_ID,
  mail: !!process.env.RESEND_API_KEY,
  googleClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
  appleClientId: process.env.APPLE_SERVICES_ID || '',
  appleRedirect: process.env.APPLE_REDIRECT || '',
});

export const handlers = {
  'GET /api/config': async (req, res) => json(res, 200, enabled()),

  // 구글·애플: 클라이언트가 받아 온 ID 토큰을 검증만 한다
  /* 애플 웹 로그인이 **돌아오는 자리**. 애플 콘솔의 Return URL 에 이 주소를 적는다.
     애플은 토큰을 주소 뒤가 아니라 **POST 본문(form_post)** 으로 보낸다 — 정적 파일로는 못 받는다.
     그래서 여기서 받아 검증하고, 세션을 만들어 **팝업을 연 창으로 넘긴 뒤 창을 닫는다.**
     (구글은 fragment 로 주므로 정적 oauth.html 이 받는다 — 둘의 모양이 다른 게 맞다.) */
  'POST /api/auth/apple': async (req, res) => {
    const form = await formBody(req);
    const token = form.id_token;
    const fail = why => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(popupHtml({ error: why }));
    };
    if (!token) return fail(form.error || 'no-token');
    let claims;
    try { claims = await verifyIdToken('apple', token); }
    catch (e) { return fail(String(e.message || 'bad-token')); }
    if (!claims.email) return fail('no-email');
    const account = accountFor(claims.email, 'apple');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(popupHtml({ session: { token: newSession(account.id), me: profile(account) }, state: form.state || '' }));
  },

  'POST /api/auth/token': async (req, res) => {
    const { provider, token } = await body(req);
    if (!PROVIDERS[provider]) return bad(res, 'unknown-provider');
    if (!PROVIDERS[provider].aud().length) return bad(res, provider + '-not-configured', 503);
    let claims;
    try { claims = await verifyIdToken(provider, token); }
    catch (e) { return bad(res, String(e.message || 'bad-token'), 401); }
    if (!claims.email) return bad(res, 'no-email', 401);
    const account = accountFor(claims.email, provider);
    return json(res, 200, { token: newSession(account.id), me: profile(account) });
  },

  // 이메일: 코드를 보내고, 그 코드로 들어온다
  'POST /api/auth/mail': async (req, res) => {
    const { email } = await body(req);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) return bad(res, 'bad-email');
    if (!process.env.RESEND_API_KEY && !isDemo(email)) return bad(res, 'mail-not-configured', 503);
    const issued = issueCode(email);
    if (issued.wait) return bad(res, 'too-soon:' + issued.wait, 429);
    if (issued.code) {
      try { await sendCode(email, issued.code); }
      catch (e) { return bad(res, 'send-failed:' + e.message, 502); }
    }
    return json(res, 200, { sent: true, resendIn: CODE_RESEND_MS });
  },
  'POST /api/auth/mail/verify': async (req, res) => {
    const { email, code } = await body(req);
    const why = checkCode(email, code);      // null 이면 통과, 아니면 이유
    if (why) return bad(res, why, 401);
    const account = accountFor(email, 'mail');
    return json(res, 200, { token: newSession(account.id), me: profile(account) });
  },

  'GET /api/me': async (req, res) => {
    const account = bearer(req);
    return account ? json(res, 200, { me: profile(account) }) : bad(res, 'unauthorized', 401);
  },
  'POST /api/logout': async (req, res) => {
    const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    if (m) { delete db.sessions[sha(m[1])]; save(); }
    return json(res, 200, { ok: true });
  },
  /* ── 순위 ──────────────────────────────────────────────────────
     로그인한 사람만 올린다. 계정당 **최고 기록 한 줄**만 남긴다(기록 목록이 아니다).
     점수는 브라우저가 보내는 숫자라 그대로 믿는다 — 상한을 두지 않기로 했다(2026-10-15 결정).
     그래서 여기서 하는 일은 「숫자인가」까지다. 나중에 이상한 줄이 보이면 그때 자르면 된다.
     이름과 아이콘은 **공개된다.** 끄는 스위치는 없다 — 개인정보처리방침에 그대로 적혀 있어야 한다. */
  'POST /api/rank': async (req, res) => {
    const account = bearer(req);
    if (!account) return bad(res, 'unauthorized', 401);
    const { score, chapter, name, avatar } = await body(req);
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0) return bad(res, 'bad-score');
    const row = {
      id: account.id,
      name: String(name || '').trim().slice(0, 16) || 'INFECTED',
      avatar: String(avatar || 'zero').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'zero',
      score: Math.floor(n),
      chapter: Math.max(1, Math.floor(Number(chapter) || 1)),
      at: Date.now(),
    };
    const prev = db.ranks[account.id];
    // 최고 기록만 남긴다. 낮은 기록이 와도 이름·아이콘은 최신으로 바꿔 준다(프로필을 고쳤을 수 있다)
    db.ranks[account.id] = (prev && prev.score > row.score) ? { ...prev, name: row.name, avatar: row.avatar } : row;
    save();
    return json(res, 200, { best: db.ranks[account.id].score });
  },
  // 공개 — 로그인하지 않아도 볼 수 있다. 토큰을 주면 제 줄에 표시가 붙는다.
  'GET /api/rank': async (req, res) => {
    const account = bearer(req);
    const rows = Object.values(db.ranks)
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, RANK_TOP)
      .map(r => ({ name: r.name, avatar: r.avatar, score: r.score, chapter: r.chapter, mine: !!account && r.id === account.id }));
    return json(res, 200, rows);
  },

  /* 계정 삭제 — 계정을 만들 수 있으면 **앱 안에서 지울 수 있어야 한다**
     (Apple 5.1.1(v) · Play 데이터 삭제 정책). 없으면 그 자리에서 반려다 — SHIPPING.md 참고.
     지우는 것은 셋 다: 계정 · 그 계정의 모든 세션(다른 기기 포함) · 맡아 둔 저장. */
  'POST /api/account/delete': async (req, res) => {
    const account = bearer(req);
    if (!account) return bad(res, 'unauthorized', 401);
    delete db.accounts[account.id];
    delete db.saves[account.id];
    delete db.ranks[account.id];
    for (const [key, s] of Object.entries(db.sessions)) if (s.id === account.id) delete db.sessions[key];
    save();
    return json(res, 200, { deleted: true });
  },
  // 저장 — 게임이 들고 있는 localStorage 덩어리를 그대로 맡아 둔다
  'GET /api/save': async (req, res) => {
    const account = bearer(req);
    if (!account) return bad(res, 'unauthorized', 401);
    return json(res, 200, { save: db.saves[account.id] || null });
  },
  'PUT /api/save': async (req, res) => {
    const account = bearer(req);
    if (!account) return bad(res, 'unauthorized', 401);
    const { save: blob } = await body(req);
    if (!blob || typeof blob !== 'object') return bad(res, 'bad-save');
    db.saves[account.id] = { at: Date.now(), blob };
    save();
    return json(res, 200, { ok: true, at: db.saves[account.id].at });
  },
};

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const url = req.url.split('?')[0];
    const handler = handlers[req.method + ' ' + url];
    if (!handler) return bad(res, 'not-found', 404);
    try { await handler(req, res); }
    catch (e) { console.error(e); if (!res.headersSent) bad(res, 'server-error', 500); }
  });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  setInterval(sweepCodes, 60e3).unref?.();
  createServer().listen(PORT, '127.0.0.1', () => {
    const on = enabled();
    console.log(`PATIENT ZERO 계정 서버 :${PORT} — 구글 ${on.google ? '켬' : '끔'} · 애플 ${on.apple ? '켬' : '끔'} · 메일 ${on.mail ? '켬' : '끔'}`);
  });
}
