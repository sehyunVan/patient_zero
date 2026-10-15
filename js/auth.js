/* 로그인 — 구글 · 애플 · 이메일 코드. 비밀번호는 없다.
   서버(server/account.mjs)가 켜져 있지 않거나 키가 없으면 그 수단은 **꺼진 채로** 보인다.
   로그인 전에도 게임은 그대로 된다 — 저장은 이 브라우저에 남고, 로그인하면 그 저장을 계정에 올린다. */
window.Auth = (() => {
  const KEY = 'patient-zero-session';
  const $ = id => document.getElementById(id);
  const api = () => (window.PZ_API || localStorage.getItem('patient-zero-api') || '').replace(/\/$/, '');
  let session = null, config = null, pending = '';   // pending: 코드를 보낸 이메일

  try { session = JSON.parse(localStorage.getItem(KEY)) || null; } catch {}
  const token = () => session?.token || null;
  const me = () => session?.me || null;
  function remember(next) {
    session = next;
    try { next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY); } catch {}
    document.body.classList.toggle('signed-in', !!next);
  }

  async function call(path, options = {}) {
    const base = api();
    if (!base) throw new Error('no-server');
    const res = await fetch(base + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}), ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.status);
    return data;
  }

  async function load() {
    if (config) return config;
    try { config = await call('/api/config'); }
    catch { config = { google: false, apple: false, mail: false, offline: true }; }
    return config;
  }

  // 저장 — 이 브라우저의 게임 저장을 통째로 올리고 내린다
  const LOCAL_KEYS = ['patient-zero-progression-v1', 'patient-zero-kit', 'patient-zero-profile-v1', 'patient-zero-runs-v2', 'patient-zero-settings-v1'];
  const collect = () => Object.fromEntries(LOCAL_KEYS.map(k => [k, localStorage.getItem(k)]).filter(([, v]) => v != null));
  async function push() { if (!token()) return false; await call('/api/save', { method: 'PUT', body: JSON.stringify({ save: collect() }) }); return true; }
  async function pull() {
    if (!token()) return false;
    const { save } = await call('/api/save');
    if (!save?.blob) return false;
    for (const [k, v] of Object.entries(save.blob)) try { localStorage.setItem(k, v); } catch {}
    return true;
  }

  async function signInWithToken(provider, idToken) {
    const data = await call('/api/auth/token', { method: 'POST', body: JSON.stringify({ provider, token: idToken }) });
    remember(data);
    return data.me;
  }
  async function mailCode(email) { pending = String(email).trim().toLowerCase(); return call('/api/auth/mail', { method: 'POST', body: JSON.stringify({ email: pending }) }); }
  async function mailVerify(code) {
    const data = await call('/api/auth/mail/verify', { method: 'POST', body: JSON.stringify({ email: pending, code }) });
    remember(data);
    return data.me;
  }
  async function signOut() { try { await call('/api/logout', { method: 'POST' }); } catch {} remember(null); }
  // 계정 삭제 — 서버에서 지운 뒤 이 기기의 세션도 버린다. 게임 저장은 남긴다(그 사람의 물건이다).
  async function deleteAccount() { await call('/api/account/delete', { method: 'POST' }); remember(null); return true; }

  /* 어느 판에서 도는가 — Capacitor 가 알려 주고, 없으면 웹이다.
     안드로이드에서는 애플 로그인을 **빼 둔다**(2026-10-15 결정): 안드로이드에는 애플 계정으로 들어올
     이유가 거의 없고, 넣으면 웹 흐름(Services ID·Return URL·6개월 비밀)을 통째로 세워야 한다.
     iOS 에서는 반드시 **넣는다** — 제3자 로그인(구글)이 있으면 애플이 동등한 수단을 요구한다(4.8).
     웹은 iOS 와 같은 묶음으로 둔다(사파리에서 애플 로그인이 제일 자연스럽다). */
  const platform = () => {
    try { if (window.Capacitor?.getPlatform) return window.Capacitor.getPlatform(); } catch {}
    return 'web';
  };
  const showApple = () => platform() !== 'android';
  /* 애플 단추를 **누를 수 있는가**는 판마다 다르다.
     웹: Services ID 가 있어야 한다(서버가 appleWeb 으로 알려 준다). 없으면 눌러도 못 간다.
     iOS 앱: 네이티브 플러그인이 토큰을 준다 — 아직 안 붙였으므로 지금은 꺼 둔다.
     「켜져 있는데 안 되는 단추」보다 꺼진 단추가 낫다(2026-10-15 에 그 단추를 실제로 만들었다). */
  const appleUsable = on => platform() === 'ios' ? !!(native() && on.apple) : !!on.appleWeb;
  /* 구글도 같다. 앱 안(WebView)에서는 구글이 OAuth 를 **막는다**(disallowed_useragent) —
     팝업은 열리지만 「이 브라우저에서는 로그인할 수 없습니다」로 끝난다.
     네이티브 플러그인을 붙이기 전까지 앱에서는 꺼 둔다. 웹에서는 팝업 흐름으로 된다. */
  // 앱에서는 **네이티브 창**으로 연다(구글이 WebView 안의 OAuth 를 막는다 — disallowed_useragent).
  // 플러그인이 없으면 꺼 둔다: 눌리는데 안 되는 단추보다 꺼진 단추가 낫다.
  const native = () => window.Capacitor?.Plugins?.SocialLogin || null;
  const googleUsable = on => platform() === 'web' ? !!on.google : !!(native() && on.google);

  /* ── 화면 ── */
  function view(state, message) {
    const on = config || {};
    const off = what => on.offline ? '서버 없음' : on[what] ? '' : '설정 필요';
    if (state === 'code') return `
      <p class="login-state">${pending} 으로 6자리 코드를 보냈습니다.<br>10분 안에 입력하세요.</p>
      <form class="login-code" id="login-code-form">
        <input id="login-code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="● ● ● ● ● ●" autocomplete="one-time-code" required>
        <button class="red-button" type="submit">확인</button>
      </form>
      <button class="set-button" id="login-back">다른 방법으로</button>
      ${message ? `<p class="login-error">${message}</p>` : ''}`;
    if (state === 'signed') return `
      <p class="login-state">${me()?.email} 으로 로그인했습니다.<br>저장이 이 계정에 보관됩니다.</p>
      <div class="login-methods">
        <button class="login-method" id="login-push"><b>이 기기의 기록 올리기</b><small>캐릭터 · 모집권 · 챕터</small></button>
        <button class="login-method" id="login-pull"><b>계정 기록 내려받기</b><small>이 기기를 덮어씁니다</small></button>
      </div>
      <button class="set-button" id="login-out">로그아웃</button>
      <button class="set-button danger" id="login-delete">계정 삭제</button>
      ${message ? `<p class="login-error">${message}</p>` : ''}`;
    // 계정 삭제 — 두 번 묻는다. 무엇이 사라지는지 먼저 적어 둔다.
    if (state === 'delete') return `
      <p class="login-state">${me()?.email} 계정을 지웁니다.<br>계정 · 계정에 보관된 기록 · 모든 기기의 로그인이 함께 사라집니다.</p>
      <p class="dialog-note">되돌릴 수 없습니다. 이 기기의 저장은 남으므로 로그인 없이 계속 놀 수 있습니다.</p>
      <button class="red-button" id="login-delete-go">계정과 기록을 지웁니다</button>
      <button class="set-button" id="login-back">돌아가기</button>
      ${message ? `<p class="login-error">${message}</p>` : ''}`;
    return `
      <div class="login-methods">
        <button class="login-method" data-login="google" ${googleUsable(on) ? '' : 'disabled'}><svg class="brand-mark"><use href="#i-google"/></svg><b>Google 로 계속하기</b><small>${googleUsable(on) ? '한 번이면 끝' : (on.offline ? '서버 없음' : platform() === 'web' ? '설정 필요' : '앱에서는 준비 중')}</small></button>
        ${showApple() ? `<button class="login-method" data-login="apple" ${appleUsable(on) ? '' : 'disabled'}><svg class="brand-mark apple"><use href="#i-apple"/></svg><b>Apple 로 계속하기</b><small>${appleUsable(on) ? '이메일을 숨길 수 있습니다' : (on.offline ? '서버 없음' : '설정 필요')}</small></button>` : ''}
      </div>
      <form class="login-mail" id="login-mail-form">
        <input id="login-email" type="email" placeholder="메일 주소" autocomplete="email" required ${on.offline ? 'disabled' : ''}>
        <button class="red-button" type="submit" ${on.offline ? 'disabled' : ''}>코드 받기</button>
      </form>
      <p class="dialog-note">비밀번호는 없습니다. 메일로 6자리 코드를 보내 드립니다.<br>
      ${on.offline ? '지금은 계정 서버가 연결되어 있지 않습니다 — 저장은 이 브라우저에만 남습니다.' : on.mail ? '로그인하면 캐릭터·모집권·챕터 기록이 계정에 보관되고, 표시 이름과 대표 캐릭터가 유저 순위에 공개됩니다.' : '메일 발송은 아직 설정 전입니다 — 키를 넣으면 바로 열립니다.'}</p>
      ${message ? `<p class="login-error">${message}</p>` : ''}`;
  }

  async function open(state, message) {
    await load();
    const dialog = $('login-dialog');
    dialog.querySelector('.login-body').innerHTML = view(state || (token() ? 'signed' : 'start'), message);
    wire();
    if (!dialog.open) dialog.showModal();
  }

  function wire() {
    const dialog = $('login-dialog');
    dialog.querySelectorAll('[data-login]').forEach(b => b.onclick = () => start(b.dataset.login));
    const mail = $('login-mail-form');
    if (mail) mail.onsubmit = async e => {
      e.preventDefault();
      try { await mailCode($('login-email').value); open('code'); }
      catch (err) { open('start', '코드를 보내지 못했습니다 — ' + err.message); }
    };
    const code = $('login-code-form');
    if (code) code.onsubmit = async e => {
      e.preventDefault();
      try { await mailVerify($('login-code').value); open('signed'); }
      catch (err) { open('code', err.message === 'bad-code' ? '코드가 맞지 않습니다.' : err.message); }
    };
    if ($('login-back')) $('login-back').onclick = () => open(token() ? 'signed' : 'start');
    if ($('login-delete')) $('login-delete').onclick = () => open('delete');
    if ($('login-delete-go')) $('login-delete-go').onclick = async () => {
      try { await deleteAccount(); open('start', '계정을 지웠습니다.'); }
      catch (e) { open('delete', '지우지 못했습니다 — ' + e.message); }
    };
    if ($('login-out')) $('login-out').onclick = async () => { await signOut(); open('start'); };
    if ($('login-push')) $('login-push').onclick = async () => { try { await push(); open('signed'); } catch (e) { open('signed', e.message); } };
    if ($('login-pull')) $('login-pull').onclick = async () => { try { if (await pull()) location.reload(); } catch (e) { open('signed', e.message); } };
  }

  /* 구글·애플 — 둘 다 **팝업**으로 연다. 돌아오는 모양만 다르다:
       구글은 주소 뒤(fragment)에 id_token 을 주므로 oauth.html 이 받아 넘기고, 여기서 서버에 검증을 맡긴다.
       애플은 **POST(form_post)** 로 주므로 서버가 직접 받아 검증하고 **세션**을 돌려준다. */
  async function start(provider) {
    try {
      if (native()) {
        await signInWithToken(provider, await nativeToken(provider));   // 앱 — 네이티브 창
      } else if (provider === 'google') {
        await signInWithToken('google', await googleToken());        // 웹 — 팝업 + fragment
      } else {
        remember(await appleSession());                              // 웹 — 팝업 + form_post(서버가 받는다)
      }
      open('signed');
    } catch (e) { open('start', e.message === 'cancelled' ? '' : '로그인하지 못했습니다 — ' + e.message); }
  }
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = () => no(new Error('sdk-load-failed')); document.head.appendChild(s); });
  /* 구글 — **계정 고르는 창을 직접 띄운다.**
     원래는 One Tap(google.accounts.id.prompt)이었는데, 브라우저에 구글 세션이 없으면 아무것도 안 뜨고
     조용히 실패한다(FedCM 전환 뒤로는 「Provider's accounts list is empty」·NetworkError 로 끝난다).
     로그인하려고 누른 사람에게 「아무 일도 안 일어남」은 최악이라 팝업 흐름으로 바꿨다(2026-10-15).
     콘솔에 등록돼 있어야 하는 것 둘: 승인된 JavaScript 원본(이 사이트) · 승인된 리디렉션 URI(oauth.html). */
  function googleToken() {
    if (!config.googleClientId) throw new Error('not-configured');
    const redirect = new URL('oauth.html', location.href).href;
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth'
      + '?client_id=' + encodeURIComponent(config.googleClientId)
      + '&redirect_uri=' + encodeURIComponent(redirect)
      + '&response_type=id_token&scope=' + encodeURIComponent('openid email')
      + '&nonce=' + nonce + '&state=' + nonce + '&prompt=select_account';
    return popupFlow(url, 'pz-google', data => data.token || null, nonce);
  }

  /* 팝업 하나를 열고 **결과 한 번**을 기다린다 — 구글과 애플이 같이 쓴다.
     셋 중 하나로 끝난다: 결과가 왔다 · 오류가 왔다 · 사람이 창을 닫았다.
     마지막 경우를 안 보면 영영 기다리는 단추가 된다(실제로 그랬다). */
  function popupFlow(url, name, pick, state) {
    const win = window.open(url, name, 'width=480,height=640,menubar=no,toolbar=no');
    if (!win) throw new Error('popup-blocked');
    return new Promise((resolve, reject) => {
      const done = (fn, v) => { clearInterval(watch); window.removeEventListener('message', onMessage); fn(v); };
      const onMessage = e => {
        if (e.data?.source !== 'patient-zero-oauth') return;
        if (state && e.data.state && e.data.state !== state) return done(reject, new Error('state-mismatch'));
        const value = pick(e.data);
        if (value) done(resolve, value); else done(reject, new Error(e.data.error || 'cancelled'));
      };
      window.addEventListener('message', onMessage);
      const watch = setInterval(() => { if (win.closed) done(reject, new Error('cancelled')); }, 500);
    });
  }
  /* 앱의 로그인 — @capgo/capacitor-social-login 이 **OS 의 창**을 띄운다.
     안드로이드: 구글 Credential Manager. 넘길 것은 **웹 클라이언트 ID**(serverClientId) 다 —
       안드로이드 클라이언트 ID 로는 ID 토큰이 안 나온다. 그 대신 콘솔에 패키지+서명 지문이 등록돼 있어야 한다.
     iOS: 구글은 iOS 클라이언트 ID, 애플은 OS 가 직접 — 이때 토큰의 aud 는 **번들 ID** 다(서버가 둘 다 받는다).
     한 번만 initialize 하고, 그다음부터는 login 만 부른다. */
  let nativeReady = null;
  function nativeInit() {
    if (nativeReady) return nativeReady;
    nativeReady = native().initialize({
      google: { webClientId: config.googleClientId, iOSClientId: config.googleIosClientId || undefined },
      apple: { clientId: config.appleClientId || undefined, redirectUrl: config.appleRedirect || undefined },
    });
    return nativeReady;
  }
  async function nativeToken(provider) {
    await nativeInit();
    let res;
    try { res = await native().login({ provider, options: provider === 'google' ? { scopes: ['email'] } : { scopes: ['email'] } }); }
    catch (e) { throw new Error(/cancel/i.test(String(e?.message || e)) ? 'cancelled' : String(e?.message || e)); }
    const token = res?.result?.idToken;
    if (!token) throw new Error('no-id-token');
    return token;
  }
  /* 애플 — 애플의 JS SDK 를 쓰지 않는다. 그 SDK 는 팝업/리디렉트 처리를 제 방식대로 하는데,
     우리는 **서버가 Return URL 을 받는** 모양이라 둘이 맞지 않는다. 주소를 직접 열고 서버를 기다린다.
     응답은 id_token 이 아니라 **세션**이다(서버가 이미 검증했다). */
  function appleSession() {
    if (!config.appleClientId) throw new Error('not-configured');
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const url = 'https://appleid.apple.com/auth/authorize'
      + '?client_id=' + encodeURIComponent(config.appleClientId)
      + '&redirect_uri=' + encodeURIComponent(config.appleRedirect)
      + '&response_type=code%20id_token&response_mode=form_post&scope=email'
      + '&state=' + nonce + '&nonce=' + nonce;
    return popupFlow(url, 'pz-apple', data => data.session || null);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.toggle('signed-in', !!token());
    if ($('login')) $('login').onclick = () => open();
    if ($('close-login')) $('close-login').onclick = () => $('login-dialog').close();
  });
  return { open, token, me, push, pull, signOut, deleteAccount, config: load, _call: call };
})();
