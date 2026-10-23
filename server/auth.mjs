/* ============ 로그인 — 애플 · 구글 · 이메일 코드 ============
   출처: subway-rpg/server/auth.mjs (2026-10-12). PATIENT ZERO 로 그대로 가져왔다 —
   의존성 0이고, 거기서 이미 스토어 심사를 통과한 조합이다. 고칠 일이 생기면 양쪽을 같이 고친다.


   비밀번호를 없앴다. 그래서 「비밀번호 찾기」가 필요 없다 — 잊을 것이 없다.

   세 수단
     apple   iOS 네이티브 Sign in with Apple 이 준 identityToken 을 검증한다
     google  구글이 준 ID 토큰을 검증한다
     mail    6자리 코드를 메일로 보내고, 그 코드로 들어온다

   **애플은 iOS 에서만** 붙인다(유저 결정 2026-10-12, 안 A).
   그래서 웹 OAuth 흐름이 필요 없고 → 클라이언트 시크릿(.p8 로 서명한 JWT)이 필요 없고
   → **6개월마다 다시 구워야 하는 숙제가 없다**(SHIPPING.md §3 의 그 시한폭탄).
   네이티브 흐름은 앱이 토큰을 직접 받아 오고, 서버는 애플의 공개키로 서명만 확인하면 된다.
   대가: 애플로 가입한 사람은 안드로이드에서 그 계정으로 못 들어온다 — 이메일로도 이어 두면 덮인다.

   왜 제3자 인증 서비스를 안 쓰나 — ID 토큰 검증은 공개키로 서명을 보는 일이고 `node:crypto` 로 된다.
   game.mjs 가 의존성 0인 단일 프로세스라는 성질을 지킨다.

   **4.8 은 이 조합으로 통과한다.** 구글만 있으면 반려지만, Sign in with Apple 이 바로 그
   「이메일을 모든 당사자로부터 숨길 수 있는 동등한 수단」이다(SHIPPING.md §1). 이메일 코드는 그 위에 얹는 셋째 길이다.

   메일은 **Resend 의 HTTP API** 로 보낸다. SMTP 가 아니다 —
   copycat 이 Supabase→Resend SMTP 로 한참 헤맸고(500 이 나는데 Resend 쪽엔 시도 기록조차 안 남았다)
   HTTP API 로 갈아타고서야 풀렸다(copycat/supabase/functions/auth-email/README.md).
   `copycat.sarl` 은 그때 이미 verified 라 DNS 는 손댈 것이 없다.
*/
import crypto from 'node:crypto';

const now=()=>Date.now();
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');

/* ── 제공자 ──────────────────────────────────────────────
   aud(이 토큰이 우리에게 발급된 것인가)는 환경변수로 받는다. 비어 있으면 그 수단은 꺼진 것으로 본다 —
   아무 aud 나 받아 주면 **남의 앱 토큰으로 우리 계정에 들어올 수 있다**. 조용히 열려 있는 것보다 꺼진 편이 낫다. */
const list=v=>String(v||'').split(',').map(s=>s.trim()).filter(Boolean);
export const PROVIDERS={
  apple:{
    iss:['https://appleid.apple.com'],
    jwks:'https://appleid.apple.com/auth/keys',
    aud:()=>list(process.env.APPLE_AUD||process.env.APPLE_BUNDLE_ID),
  },
  google:{
    iss:['https://accounts.google.com','accounts.google.com'],
    jwks:'https://www.googleapis.com/oauth2/v3/certs',
    /* 토큰의 aud 로 올 수 있는 것 둘 — iOS 토큰은 iOS id, **안드로이드 토큰은 Web id** 가 된다
       (안드로이드는 serverClientId 로 웹 id 를 넘겨야 ID 토큰이 나온다. Android 클라이언트 id 로는 오지 않는다).
       GOOGLE_AUD 를 따로 적어도 되지만, 보통은 아래 둘만 채우면 여기서 만든다 — 같은 값을 두 번 적지 않게. */
    aud:()=>list(process.env.GOOGLE_AUD)
      .concat([process.env.GOOGLE_IOS_CLIENT_ID,process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean))
      .filter((v,i,a)=>a.indexOf(v)===i),
  },
};

/* ── JWKS 받아 두기 — 키는 자주 안 바뀌지만 **돌기는 한다**.
   모르는 kid 가 오면 한 번 다시 받는다(최소 1분 간격). 그게 키 교체 날 조용히 죽지 않는 길이다. */
const jwksCache=new Map();                             // url → {at, keys:Map(kid→KeyObject)}
const JWKS_TTL=6*3600e3, JWKS_MIN=60e3;
async function jwks(url,{force=false}={}){
  const c=jwksCache.get(url);
  if(c&&!force&&now()-c.at<JWKS_TTL) return c.keys;
  if(c&&force&&now()-c.at<JWKS_MIN) return c.keys;     // 모르는 kid 로 두드려 대는 것을 막는다
  const r=await fetch(url,{signal:AbortSignal.timeout(8000)});
  if(!r.ok) { if(c) return c.keys; throw new Error('jwks-'+r.status); }
  const j=await r.json();
  const keys=new Map();
  for(const k of (j.keys||[])){
    if(k.kty!=='RSA'||!k.n||!k.e) continue;
    try{ keys.set(k.kid,crypto.createPublicKey({key:k,format:'jwk'})); }catch(e){}
  }
  jwksCache.set(url,{at:now(),keys});
  return keys;
}
export const _jwksReset=()=>jwksCache.clear();

const b64u=s=>Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64');

/* ID 토큰 하나를 끝까지 본다 — 서명 · 발급자 · 수신자 · 만료.
   넷 중 하나라도 빠뜨리면 「검증했다」가 거짓말이 된다.
   특히 aud 를 안 보면 아무 앱의 구글 토큰으로나 들어올 수 있다. */
export async function verifyIdToken(provider,token){
  const P=PROVIDERS[provider]; if(!P) throw new Error('bad-provider');
  const aud=P.aud(); if(!aud.length) throw new Error('provider-off');
  const parts=String(token||'').split('.');
  if(parts.length!==3) throw new Error('bad-token');
  let head,claims;
  try{ head=JSON.parse(b64u(parts[0]).toString('utf8')); claims=JSON.parse(b64u(parts[1]).toString('utf8')); }
  catch(e){ throw new Error('bad-token'); }
  if(head.alg!=='RS256') throw new Error('bad-alg');          // alg:none · HS256 혼동 공격을 막는다

  const data=Buffer.from(parts[0]+'.'+parts[1]);
  const sig=b64u(parts[2]);
  let keys=await jwks(P.jwks);
  let key=keys.get(head.kid);
  if(!key){ keys=await jwks(P.jwks,{force:true}); key=keys.get(head.kid); }   // 키가 돌았나 한 번 더
  if(!key) throw new Error('unknown-kid');
  if(!crypto.verify('RSA-SHA256',data,key,sig)) throw new Error('bad-signature');

  if(!P.iss.includes(String(claims.iss))) throw new Error('bad-iss');
  const auds=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(!auds.some(a=>aud.includes(String(a)))) throw new Error('bad-aud');
  const t=Math.floor(now()/1000);
  if(!(claims.exp>t-60)) throw new Error('expired');          // 60초 시계 여유
  if(claims.iat&&claims.iat>t+300) throw new Error('bad-iat');
  if(!claims.sub) throw new Error('no-sub');

  return { sub:String(claims.sub),
           email:claims.email?String(claims.email).trim().toLowerCase():null,
           /* 애플은 가림 주소(privaterelay)를 줄 수 있다 — 그게 정상이고, 우리는 sub 로 사람을 짚는다 */
           emailVerified: claims.email_verified===true||claims.email_verified==='true' };
}

/* ── 이메일 코드 ──────────────────────────────────────────
   코드는 **해시로만** 들고 있는다. 저장 파일이 새도 그 자체로는 로그인 수단이 되지 않게.
   시도 횟수를 세고, 다 쓰면 버린다 — 6자리는 백만 분의 일이라 무한히 두드리면 뚫린다. */
export const CODE_TTL=10*60e3, CODE_TRIES=5, CODE_RESEND_MS=60e3;
const codes=new Map();                                  // email → {hash, exp, tries, sentAt}
export const _codes=codes;

/* ── 심사용 데모 계정 ──────────────────────────────────────
   로그인을 강제하면 **심사자가 들어올 길이 있어야 한다.** 그런데 코드는 메일로 가고
   심사자는 그 메일함을 못 연다 — 「데모 계정을 드립니다」가 성립하지 않는다.
   그래서 주소 하나에 한해 **고정 코드**를 둔다. App Review Notes 에 그 주소와 코드를 적는다.
   DEMO_EMAIL·DEMO_CODE 가 둘 다 있을 때만 열린다(기본은 닫힘). 메일도 보내지 않는다. */
export function demoPair(){
  const e=String(process.env.DEMO_EMAIL||'').trim().toLowerCase();
  const c=String(process.env.DEMO_CODE||'').trim();
  return (e&&/^\d{6}$/.test(c))?{email:e,code:c}:null;
}
export const isDemo=email=>{ const d=demoPair(); return !!d&&d.email===String(email||'').trim().toLowerCase(); };

export function issueCode(email){
  const e=String(email||'').trim().toLowerCase();
  if(isDemo(e)) return {demo:true};                      // 보내지 않는다 — 코드는 이미 정해져 있다
  const prev=codes.get(e);
  if(prev&&now()-prev.sentAt<CODE_RESEND_MS) return {wait:Math.ceil((CODE_RESEND_MS-(now()-prev.sentAt))/1000)};
  const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
  codes.set(e,{hash:sha(e+':'+code),exp:now()+CODE_TTL,tries:0,sentAt:now()});
  return {code};
}
export function checkCode(email,code){
  const e=String(email||'').trim().toLowerCase();
  { const d=demoPair(); if(d&&d.email===e) return String(code||'').trim()===d.code?null:'bad-code'; }
  const c=codes.get(e);
  if(!c) return 'no-code';
  if(now()>c.exp){ codes.delete(e); return 'expired'; }
  if(c.tries>=CODE_TRIES){ codes.delete(e); return 'too-many'; }
  c.tries++;
  if(sha(e+':'+String(code||'').trim())!==c.hash) return 'bad-code';
  codes.delete(e);                                      // 한 번 쓰면 끝
  return null;
}
/* 오래된 것은 흘려보낸다 — 지우지 않으면 Map 이 계속 자란다 */
export function sweepCodes(){ const t=now(); for(const [e,c] of codes) if(t>c.exp+CODE_TTL) codes.delete(e); }

/* ── 메일 보내기 ──────────────────────────────────────────
   키가 없으면 **보내지 않고 그렇다고 말한다**. 조용히 성공한 척하면
   「메일이 안 와요」가 영영 안 풀린다(copycat 이 그 구간에서 하루를 썼다). */
/* 메일에 적히는 앱 이름. **이 파일은 막차 이후에서 가져온 것**이라 그 이름이 박혀 있었고,
   최초 감염자 이용자에게 「막차 이후 — 확인 코드」가 날아갔다(2026-10-23). 환경에서 받는다. */
export const APP_NAME = process.env.MAIL_APP_NAME || '막차 이후';
export async function sendCode(email,code,{fetchImpl=fetch}={}){
  const key=process.env.RESEND_API_KEY||'';
  const from=process.env.MAIL_FROM||(APP_NAME+' <noreply@copycat.sarl>');
  if(!key) return {sent:false,why:'no-key'};
  const r=await fetchImpl('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[email],subject:`${APP_NAME} — 확인 코드 ${code}`,text:codeText(code),html:codeHtml(code)}),
    signal:AbortSignal.timeout(10000),
  });
  if(!r.ok){ let d=''; try{ d=(await r.text()).slice(0,200); }catch(e){}
    return {sent:false,why:'resend-'+r.status,detail:d}; }
  return {sent:true};
}
const codeText=c=>`확인 코드 ${c}

${APP_NAME}에 들어오려면 이 여섯 자리를 적으십시오.
${Math.round(CODE_TTL/60e3)}분 뒤에는 쓸 수 없습니다.

이 메일을 요청한 적이 없다면 그냥 버리십시오 — 아무 일도 일어나지 않습니다.`;
const codeHtml=c=>`<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#070a11;color:#eaf4ff;padding:32px">
<div style="max-width:420px;margin:0 auto;border:1px solid #1b2a40;border-radius:4px;padding:28px 26px;background:#0a1220">
<div style="letter-spacing:.22em;font-size:11px;color:#5c6b80">${APP_NAME}</div>
<div style="font-size:19px;margin:14px 0 20px">확인 코드</div>
<div style="font-size:34px;letter-spacing:.3em;font-weight:600;color:#ffd43b">${c}</div>
<p style="color:#9bb0c6;font-size:13px;line-height:1.7;margin:22px 0 0">
이 여섯 자리를 게임 화면에 적으십시오. ${Math.round(CODE_TTL/60e3)}분 뒤에는 쓸 수 없습니다.<br>
요청한 적이 없다면 그냥 버리십시오 — 아무 일도 일어나지 않습니다.</p>
</div></div>`;
export const _mailBody={codeText,codeHtml};
