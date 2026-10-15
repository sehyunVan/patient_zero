/* 감염(공격)과 피격 효과음. game.js 의 beep() 은 사인파 한 겹이라
   **폰 스피커에서 통째로 사라지는** 소리가 있었다 — 피격음이 70Hz 였다.
   music/ 시리즈에서 얻은 교훈 그대로: 220Hz 위 레이어를 반드시 섞는다.

   한 소리를 세 겹으로 쌓는다. 저역은 몸통(노트북·이어폰에서 느껴지는 무게),
   중역은 **폰에서 실제로 들리는 부분**, 짧은 잡음은 때리는 순간의 날이다.

   오디오 장치는 BGM 것을 빌려 쓴다 — 모바일 사파리는 AudioContext 수가 제한된다. */
window.Sfx = (() => {
  let own = null;

  function ctx() {
    const shared = window.BGM?.context?.();
    if (shared) return shared;
    if (own) return own;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { own = new AC(); } catch { return null; }
    return own;
  }

  const on = () => {
    const s = window.Settings;
    if (!s) return true;
    return s.get ? s.get('sound') !== false : true;
  };
  const vol = () => (window.Settings?.volume?.() ?? 1);

  // 잡음 한 조각 — 때리는 순간의 날
  function noise(c, t, level, hz, q, dur) {
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hz; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.linearRampToValueAtTime(0, t + dur);     // 0 으로는 지수 감쇠 금지
    src.connect(f).connect(g).connect(c.destination);
    src.start(t); src.stop(t + dur + .01);
  }

  // 음 한 겹
  function tone(c, t, type, from, to, level, dur) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to && to !== from) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(level, t + .006);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + .02);
  }

  function wake(c) { if (c.state === 'suspended') c.resume().catch(() => {}); }

  /* 한 소리의 내용. 실연주와 시험 렌더가 **같은 코드**를 쓴다 —
     그래야 시험에서 잰 것이 실제로 나는 소리다(브금과 같은 방식). */
  function voiceInfect(c, t, combo, v) {
    const step = Math.min(combo, 12);
    const base = 523.25 * Math.pow(2, step / 24);     // C5 에서 반음씩
    tone(c, t, 'triangle', base, base * 1.5, .085 * v, .09);       // 폰에서 들리는 중역
    tone(c, t, 'sine', base * 2, base * 2.4, .035 * v, .07);       // 반짝임
    noise(c, t, .03 * v, 2600, 1.1, .035);                          // 닿는 순간
  }
  function voiceHit(c, t, v) {
    tone(c, t, 'sine', 150, 48, .12 * v, .26);        // 몸통
    tone(c, t, 'sawtooth', 320, 150, .07 * v, .16);   // 폰 스피커가 실제로 내주는 대역
    noise(c, t, .09 * v, 1200, .8, .13);              // 맞는 소리
  }

  /* 감염 — 연쇄가 쌓일수록 한 음씩 올라간다.
     예전에는 연쇄 중에 **소리가 아예 없었다**(`if(!chained)` 로 막혀 있었다). */
  function infect(combo = 0) {
    if (!on()) return;
    const c = ctx(); if (!c) return;
    wake(c); voiceInfect(c, c.currentTime, combo, vol());
  }

  /* 피격 — 묵직하게, 그러나 폰에서도 들리게 */
  function hit() {
    if (!on()) return;
    const c = ctx(); if (!c) return;
    wake(c); voiceHit(c, c.currentTime, vol());
  }

  // 시험용: 주어진 장치(보통 OfflineAudioContext)에 그대로 찍는다
  function render(c, which, combo = 0) {
    if (which === 'hit') voiceHit(c, 0, 1); else voiceInfect(c, 0, combo, 1);
  }

  return { infect, hit, render, audible: on };
})();
