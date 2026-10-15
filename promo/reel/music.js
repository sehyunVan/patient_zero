/* ============================================================
   music.js — 쇼릴 사운드트랙을 코드로 합성한다 (의존성 없음).

     node promo/reel/music.js [--out <폴더>]   →  <폴더>/music.wav  (48k · 16bit · 스테레오 · 20s)

   comp.html 과 같은 120 BPM(한 박 0.5초 · 한 마디 2초), D 단조.
   장면이 바뀌는 박자에 타격이 걸리고, 심장·전염 틱·휙·사이렌·연속 타격은 화면의 그 순간에 소리가 난다.
   17.5초에서 음악을 통째로 끊었다가 18.0 에 로고와 함께 내리친다 — 예고편의 그 수법.
   ============================================================ */
const fs = require('fs'), path = require('path');
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const OUT = path.resolve(argOf('--out', process.env.REEL_OUT || path.join(process.env.TEMP || '.', 'pz-reel')));
const SR = 48000, DUR = 20, N = SR * DUR;
const BPM = 120, BEAT = 60 / BPM, B = n => n * BEAT;
const TAU = Math.PI * 2;
const L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SR_ = new Float32Array(N);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 1013; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const clamp = (v,a=0,b=1) => v<a?a:v>b?b:v;

/* ---------- 사이드체인 (킥에 눌리는 양) ---------- */
const duck = new Float32Array(N);
function kickDuck(t, s = 1) { const i0 = Math.floor(t * SR);
  for (let i = i0; i < Math.min(N, i0 + SR * .5); i++) { const v = s * Math.exp(-(i - i0) / SR * 10); if (v > duck[i]) duck[i] = v; } }

/* ---------- 재생 ---------- */
function play(t0, dur, { pan = 0, gain = 1, send = 0, ducked = 0 } = {}, fn) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), n = Math.min(N - i0, Math.floor(dur * SR));
  if (n <= 0) return;
  const pl = Math.cos((pan + 1) * Math.PI / 4), pr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const tl = i / SR; let v = fn(tl, i) * gain;
    if (ducked) v *= 1 - ducked * duck[i0 + i];
    L[i0 + i] += v * pl; R[i0 + i] += v * pr;
    if (send) { SL[i0 + i] += v * pl * send; SR_[i0 + i] += v * pr * send; }
  }
}
const lp = () => { let y = 0; return (x, c) => (y += c * (x - y)); };
const hp = () => { const l = lp(); return (x, c) => x - l(x, c); };
const coef = f => 1 - Math.exp(-TAU * Math.min(f, SR * .45) / SR);
const env = (tl, a, d) => tl < a ? tl / a : Math.exp(-(tl - a) * d);
const saw = ph => 2 * (ph / TAU % 1) - 1;

/* ============================================================
   악기 — 어둡고 무거운 쪽. 전염병 영화의 소리.
   ============================================================ */
function sub(t, f0, f1, dur, g = 1, drive = 1.3) {          /* 떨어지는 초저음 */
  let ph = 0;
  play(t, dur, { gain: .85 * g, send: .05 }, tl => {
    const f = f1 + (f0 - f1) * Math.exp(-tl / (dur * .32));
    ph += TAU * f / SR;
    return Math.tanh(Math.sin(ph) * drive) * Math.exp(-tl / (dur * .55));
  });
}
function kick(t, g = 1) {
  kickDuck(t, g * .85);
  let ph = 0;
  play(t, .42, { gain: .72 * g }, tl => {
    const f = 46 + 130 * Math.exp(-tl * 34); ph += TAU * f / SR;
    return Math.tanh(Math.sin(ph) * 1.8) * Math.exp(-tl * 9) + rnd() * Math.exp(-tl * 420) * .35;
  });
}
function snare(t, g = 1) {                                   /* 둔탁한 통 + 쇳소리 */
  const h = hp(), l = lp(); let ph = 0;
  play(t, .30, { gain: .34 * g, send: .5 }, tl => {
    ph += TAU * (185 + 70 * Math.exp(-tl * 50)) / SR;
    const body = Math.sin(ph) * Math.exp(-tl * 26) * .55;
    return body + l(h(rnd(), coef(900)), coef(7200)) * Math.exp(-tl * 17);
  });
}
function hat(t, open = false, g = 1, pan = 0) {
  const h = hp();
  play(t, open ? .26 : .055, { gain: .105 * g, pan }, tl => h(rnd(), coef(8200)) * Math.exp(-tl * (open ? 13 : 115)));
}
function tick(t, g = 1, pan = 0, f = 2600) {
  let ph = 0; const h = hp();
  play(t, .045, { gain: .20 * g, pan, send: .3 }, tl => {
    ph += TAU * f / SR; return (Math.sin(ph) * .6 + h(rnd(), coef(5200)) * .5) * Math.exp(-tl * 150);
  });
}
function bass(t, midi, dur, g = 1) {                         /* 찌그러진 톱니 저음 */
  let p1 = 0, p2 = 0; const f = mtof(midi), l = lp();
  play(t, dur, { gain: .30 * g, ducked: .55 }, tl => {
    p1 += TAU * f / SR; p2 += TAU * f * 1.006 / SR;
    const x = saw(p1) * .6 + saw(p2) * .4;
    const cut = 240 + 900 * Math.exp(-tl * 13);
    return Math.tanh(l(x, coef(cut)) * 3.1) * env(tl, .006, 7);
  });
}
function braam(t, dur, root = 38, g = 1) {                   /* 예고편 뿔나팔 — 어긋난 톱니 더미 */
  const parts = [[0, 1], [0.06, .8], [12, .55], [12.04, .5], [19, .3], [24, .22]];
  for (const [semi, amp] of parts) {
    let ph = 0; const f = mtof(root + semi), l = lp();
    play(t, dur, { gain: .17 * amp * g, send: .4, pan: (semi % 7) / 14 - .25, ducked: .3 }, tl => {
      const vib = 1 + Math.sin(TAU * 5.2 * tl) * .0035 * Math.min(1, tl * 3);
      ph += TAU * f * vib / SR;
      const cut = 300 + 2600 * Math.min(1, tl / .22) * Math.exp(-tl * 1.1);
      return Math.tanh(l(saw(ph), coef(cut)) * 2.4) * env(tl, .055, 1.5);
    });
  }
}
function pad(t, notes, dur, g = 1, attack = 1.0, bright = 1) {
  for (const m of notes) {
    let ph = 0, ph2 = 0; const f = mtof(m), l = lp();
    play(t, dur, { gain: .052 * g, send: .85, pan: (m % 5) / 5 - .4 }, tl => {
      ph += TAU * f / SR; ph2 += TAU * f * 1.004 / SR;
      const a = Math.min(1, tl / attack) * Math.min(1, (dur - tl) / 1.0);
      return l(saw(ph) * .5 + saw(ph2) * .5, coef(420 * bright)) * a;
    });
  }
}
function bell(t, midi, g = 1, pan = 0, dec = 2.2) {          /* 오르골 — 귀엽고 섬뜩한 쪽 */
  const f = mtof(midi);
  for (const [mul, amp, d] of [[1, 1, 1], [2.76, .34, 1.7], [5.4, .13, 2.6]]) {
    let ph = 0;
    play(t, 2.4 / dec, { gain: .13 * amp * g, pan, send: .62 }, tl => {
      ph += TAU * f * mul / SR; return Math.sin(ph) * Math.exp(-tl * dec * d);
    });
  }
}
function riser(t, dur, g = 1, f0 = 180, f1 = 5200, shape = 1.25) {   /* 올라가는 잡음 — 긴장 */
  const h = hp(), l = lp(); let ph = 0;
  play(t, dur, { gain: .17 * g, send: .3 }, tl => {
    const k = tl / dur, f = f0 * Math.pow(f1 / f0, k * k);
    ph += TAU * f * .5 / SR;
    const n = l(h(rnd(), coef(f * .75)), coef(f * 2.2));
    return (n * .8 + Math.sin(ph) * .22) * Math.pow(k, shape) * (1 + Math.sin(TAU * (3 + k * 22) * tl) * .22);
  });
}
function revTail(t, dur, g = 1) {                            /* 거꾸로 감긴 심벌 — 타격 앞에 깐다 */
  const h = hp();
  play(t - dur, dur, { gain: .17 * g, send: .55 }, tl => h(rnd(), coef(5600)) * Math.pow(tl / dur, 3.1));
}
function crash(t, g = 1) {
  const h = hp();
  play(t, 2.0, { gain: .16 * g, send: .7 }, tl => h(rnd(), coef(6400)) * Math.exp(-tl * 2.4));
}
function whoosh(t, dur = .4, g = 1, pan = 0, dir = 1) {
  const l = lp(), h = hp();
  play(t, dur, { gain: .20 * g, pan, send: .35 }, tl => {
    const k = dir > 0 ? tl / dur : 1 - tl / dur;
    const f = 300 + 3600 * k;
    return l(h(rnd(), coef(f * .6)), coef(f * 1.8)) * Math.sin(Math.PI * tl / dur) ** 1.4;
  });
}
function impact(t, g = 1, big = false) {                     /* 내리치는 소리 한 벌 */
  kickDuck(t, g);
  sub(t, big ? 92 : 74, big ? 24 : 32, big ? 2.4 : 1.0, g * (big ? 1.25 : .9), big ? 1.7 : 1.3);
  const h = hp();
  play(t, big ? .9 : .4, { gain: (big ? .34 : .22) * g, send: .5 }, tl =>
    h(rnd(), coef(2600)) * Math.exp(-tl * (big ? 10 : 20)));
  let ph = 0;
  play(t, .22, { gain: .30 * g }, tl => { ph += TAU * (900 - 740 * Math.min(1, tl / .1)) / SR;
    return Math.tanh(Math.sin(ph) * 2) * Math.exp(-tl * 26); });
  if (big) crash(t, g);
}
function siren(t, dur, g = 1) {
  let ph = 0;
  play(t, dur, { gain: .055 * g, send: .5 }, tl => {
    const f = 620 + 230 * Math.sin(TAU * .62 * tl);
    ph += TAU * f / SR;
    const pan = Math.sin(TAU * .62 * tl);
    return (Math.sin(ph) + Math.sin(ph * 2.01) * .3) * (.6 + .4 * pan) * Math.min(1, tl / .3) * Math.min(1, (dur - tl) / .5);
  });
}
function heart(t, g = 1) {                                   /* 쿵-쿵 */
  for (const [dt, a] of [[0, 1], [.17, .72]]) {
    let ph = 0;
    play(t + dt, .42, { gain: .55 * g * a }, tl => {
      const f = 34 + 44 * Math.exp(-tl * 26); ph += TAU * f / SR;
      return Math.tanh(Math.sin(ph) * 1.5) * Math.exp(-tl * 11);
    });
  }
}
function drone(t, dur, midi, g = 1) {
  let ph = 0, ph2 = 0; const f = mtof(midi), l = lp();
  play(t, dur, { gain: .085 * g, send: .3 }, tl => {
    ph += TAU * f / SR; ph2 += TAU * f * 2.003 / SR;
    const a = Math.min(1, tl / 1.2) * Math.min(1, (dur - tl) / .8);
    return l(Math.sin(ph) * .8 + Math.sin(ph2) * .2, coef(260)) * a;
  });
}
/* 방 소리 — 전체에 아주 옅게 깐다 */
(function roomTone() {
  const l = lp(), h = hp();
  play(0, DUR, { gain: .030, send: .25 }, tl =>
    l(h(rnd(), coef(70)), coef(1500)) * (.6 + .4 * Math.sin(TAU * .13 * tl)));
})();

/* ============================================================
   곡 — comp.html 의 장면표와 같은 시각
   ============================================================ */
const Dm = [38, 45, 50, 53, 57];                  /* D2 A2 D3 F3 A3 */
const CURVE = (() => { const K = 8, C = .62, f = x => 1/(1+Math.exp(-K*(x-C)));
  const a = f(0), b = f(1); return u => clamp((f(u)-a)/(b-a)); })();

/* ---- S1 0.0–2.0 · 하나 ---- */
sub(0, 70, 26, 2.6, 1.0);
drone(0, 4.6, 26, .9);
heart(0.00, 1.0); heart(1.00, 1.0);
play(1.72, .5, { gain: .5 }, tl => { return Math.tanh(Math.sin(TAU * (34 + 42*Math.exp(-tl*24)) * tl) * 1.5) * Math.exp(-tl*10); });
bell(0.02, 86, .5, -.3, 2.0);
/* 이명 — 아주 높은 음이 서서히 들어온다 */
(() => { let ph = 0; play(.3, 1.9, { gain: .030 }, tl => { ph += TAU * 3140 / SR;
  return Math.sin(ph) * Math.min(1, tl/1.1) * Math.max(0, 1 - Math.max(0, tl-1.5)/.4); }); })();
tick(0.52, .5, -.4, 3200); tick(1.28, .45, .4, 3200);

/* ---- S2 2.0–4.5 · 퍼짐 ---- */
impact(2.0, .55);
drone(2.0, 2.8, 26, 1.0);
riser(2.0, 2.5, .95, 150, 4200, 1.15);
/* 전염 틱 — 화면의 감염 곡선과 같은 밀도로 */
{
  let acc = 0;
  for (let t = 2.02; t < 4.46; t += 1 / 120) {
    const u = (t - 2.0) / 2.5;
    const rate = Math.max(0, (CURVE(u + .004) - CURVE(u - .004)) / .008);    /* 곡선의 기울기 = 초당 감염 수 */
    acc += rate * (1 / 120) * 42;
    while (acc >= 1) { acc -= 1;
      tick(t + rnd() * .004, .20 + rnd() * .07, rnd() * .9, 2000 + Math.abs(rnd()) * 2600); }
  }
}
/* 빨라지는 맥박 — 유행이 가팔라질수록 간격이 줄어든다. 화면의 곡선을 귀로 듣는 부분. */
{
  let t = 2.5;
  while (t < 4.44) {
    const u = (t - 2.0) / 2.5, k = CURVE(u);
    kick(t, .34 + k * .62);
    bass(t, 38, .18 + (1 - k) * .14, .5 + k * .5);
    if (k > .3) hat(t + .06, false, .3 + k * .35, k > .6 ? .35 : -.35);
    t += 0.5 - 0.375 * k;                                  /* 0.5초 간격에서 0.125초까지 조여든다 */
  }
}
for (let b = 6; b < 9; b += .5) hat(B(b), false, .35, b % 1 ? .3 : -.3);
/* 숫자가 가운데로 올라오는 구간 — 높은 울림이 차오른다 */
riser(3.86, .64, 1.0, 900, 7600);
(() => { let ph = 0; play(3.86, .66, { gain: .09, send: .4 }, tl => { ph += TAU * (520 + 900*tl*tl) / SR;
  return Math.sin(ph) * Math.pow(tl/.66, 1.5); }); })();
revTail(4.5, .55, 1.0);

/* ---- S3 4.5–6.0 · 글자가 된다 ---- */
impact(4.5, 1.0);
braam(4.5, 1.5, 38, .75);
pad(4.5, Dm, 1.6, .8, .25, 1.0);
bell(4.52, 74, .5, .25, 2.4); bell(4.70, 81, .35, -.25, 2.6);
for (let b = 9; b < 12; b++) { kick(B(b), .55); if (b % 2 === 1) snare(B(b), .5); }
riser(5.5, .5, .7, 600, 5200);
revTail(6.0, .5, 1.0);
whoosh(5.78, .26, .9, 0, 1);

/* ---- S4 6.0–8.0 · 영웅 ---- */
impact(6.0, 1.0);
braam(6.0, 2.1, 38, 1.0);
pad(6.0, Dm, 2.2, 1.0, .12, 1.15);
for (let b = 12; b < 16; b += .5) {
  const i = (b - 12) * 2;
  if (i % 4 === 0) kick(B(b), 1.0);
  if (i % 4 === 2) snare(B(b), .85);
  hat(B(b), i % 4 === 3, .7, i % 2 ? .35 : -.35);
  bass(B(b), [38, 38, 41, 38][(i / 1) % 4] || 38, BEAT - .04, 1.0);
}
bell(6.06, 74, .4, -.3, 2.2); bell(6.5, 77, .3, .3, 2.4);
whoosh(7.8, .22, .8, -.3, 1);

/* ---- S5 8.0–10.0 · 얼굴 벽 ---- */
impact(8.0, .7);
pad(8.0, [38, 50, 53, 57, 62], 2.1, .9, .1, 1.3);
/* 카드가 내려앉을 때마다 한 점씩 — 화면의 도착 순서와 같은 간격 */
for (let i = 0; i < 20; i++) {
  const ord = ((i % 5) + ((i / 5) | 0) * 1.25) / (5 + 4 * 1.25);
  const t = 8.02 + ord * .56 + .3;
  tick(t, .55, ((i % 5) - 2) / 2.6, 2400 + (i % 5) * 320);
  if (i % 4 === 0) bell(t, 69 + [0, 3, 5, 7, 10][(i / 4) | 0], .32, ((i % 5) - 2) / 3, 3.0);
}
for (let b = 16; b < 20; b += .5) {
  const i = (b - 16) * 2;
  if (i % 4 === 0) kick(B(b), .9);
  if (i % 4 === 2) snare(B(b), .8);
  hat(B(b), false, .6, i % 2 ? .35 : -.35);
  bass(B(b), [38, 45, 41, 38][i % 4], BEAT - .06, .9);
}
riser(9.1, .5, .75, 500, 4600);                       /* 제로가 앞으로 나올 때 */
braam(9.12, .9, 41, .5);
revTail(10.0, .45, .9);

/* ---- S6 10.0–12.0 · 기기 ---- */
impact(10.0, .7);
pad(10.0, Dm.map(n => n + 12), 2.1, .55, .1, 1.5);
for (let b = 20; b < 24; b += .25) {
  const i = Math.round((b - 20) * 4);
  if (i % 8 === 0) kick(B(b), 1.0);
  if (i % 8 === 4) snare(B(b), .9);
  if (i % 8 === 6) kick(B(b), .5);
  hat(B(b), i % 8 === 7, .5, i % 2 ? .4 : -.4);
  if (i % 2 === 0) bass(B(b), [38, 38, 41, 43, 38, 38, 36, 38][(i / 2) % 8], BEAT / 2 - .03, 1.0);
}
/* 가리키는 선 셋이 뻗을 때 */
[10.60, 10.74, 10.88].forEach((t, i) => { tick(t, .6, i === 2 ? .5 : -.5, 3000 + i * 400);
  bell(t + .04, 81 + i * 3, .22, i === 2 ? .4 : -.4, 3.4); });
whoosh(11.8, .24, .85, .3, 1);

/* ---- S7 12.0–14.0 · 포스터가 지나간다 ---- */
impact(12.0, .75);
whoosh(12.0, .8, 1.1, 0, -1);
/* 포스터 한 장이 지나갈 때마다 — 화면의 감속 곡선과 같게 */
{
  const PSTEP = 438, posAt = tt => (PSTEP * 18.6) * (1 - (1 - Math.pow(1 - clamp((tt - 12.0) / 1.0), 5)));
  let last = Math.floor(posAt(12.0) / PSTEP);
  for (let t = 12.0; t < 13.1; t += 1 / 240) {
    const n = Math.floor(posAt(t) / PSTEP);
    if (n !== last) { last = n; const k = clamp((13.0 - t) / 1.0);
      tick(t, .10 + .22 * (1 - k), (n % 2 ? .5 : -.5), 1700 + k * 2200); }
  }
}
for (let b = 24; b < 28; b += .5) {
  const i = (b - 24) * 2;
  if (i % 4 === 0) kick(B(b), .95);
  if (i % 4 === 2) snare(B(b), .85);
  hat(B(b), false, .55, i % 2 ? .35 : -.35);
  bass(B(b), [38, 38, 36, 41][i % 4], BEAT - .06, .95);
}
impact(13.0, .6); braam(13.0, 1.0, 36, .55);
revTail(14.0, .5, .9);

/* ---- S8 14.0–15.5 · 구역이 물든다 (숨 고르기) ---- */
impact(14.0, .6);
pad(14.0, [38, 50, 53, 56], 1.6, 1.0, .1, .72);      /* 어둡게 — 필터를 닫는다 */
siren(14.05, 1.4, 1.0);
drone(14.0, 1.6, 26, .9);
for (let b = 28; b < 31; b++) { kick(B(b), .7); if (b % 2 === 1) snare(B(b), .4); }
for (let k = 0; k < 26; k++) tick(14.08 + k * .055 * (1 + k * .012), .10, (k % 2 ? .45 : -.45), 2200 + k * 70);
riser(14.6, .9, 1.0, 320, 6400);
revTail(15.5, .5, 1.0);

/* ---- S9 15.5–17.5 · 연속 타격 (8분음표 여덟) ---- */
const CUTS = [15.50, 15.75, 16.00, 16.25, 16.50, 16.75, 17.00, 17.25];
CUTS.forEach((t, i) => {
  impact(t, i % 2 === 0 ? .85 : .6);
  kick(t, 1.0);
  if (i % 2 === 1) snare(t, .9);
  hat(t + .125, false, .6, i % 2 ? .4 : -.4);
  bass(t, [38, 41, 38, 36, 43, 38, 41, 38][i], .24, 1.1);
  tick(t + .005, .5, (i % 3 - 1) * .5, 2600 + i * 180);
});
[15.50, 16.00, 16.50, 17.00].forEach((t, i) => braam(t, .5, [38, 41, 36, 43][i], .72));
pad(15.5, Dm.map(n => n + 12), 2.0, .4, .05, 1.6);
/* 마지막 반 박 — 전부 빨아들이는 숨 */
whoosh(17.30, .20, 1.0, 0, 1);

/* ---- 17.5–18.0 · 침묵. 모여드는 소리만 ---- */
riser(17.50, .50, 1.25, 240, 9000);
(() => { const h = hp(); play(17.50, .5, { gain: .16, send: .4 }, tl =>
  h(rnd(), coef(300 + 5000 * (tl / .5) ** 2)) * Math.pow(tl / .5, 2.4)); })();
revTail(18.0, .62, 1.3);

/* ---- S10 18.0–20.0 · 로고 ---- */
impact(18.0, 1.35, true);
braam(18.0, 2.4, 38, 1.35);
braam(18.03, 2.3, 26, .8);
pad(18.0, [38, 45, 50, 53, 57, 62], 1.9, 1.25, .08, .95);
kick(18.0, 1.1); snare(18.0, .7);
bell(18.04, 74, .55, -.28, 1.5); bell(18.20, 81, .42, .28, 1.7); bell(18.40, 86, .3, -.15, 2.0);
bass(18.0, 38, 1.2, 1.0);
drone(18.0, 2.0, 26, 1.1);
/* 처음의 그 심장이 돌아온다 */
heart(18.95, .75); heart(19.62, .6);
bell(19.10, 69, .26, .3, 2.6); bell(19.30, 72, .2, -.3, 2.8);
tick(19.45, .3, .2, 2400);

/* ============================================================
   리버브 (Schroeder) → 믹스 → 소프트클립 → 노멀라이즈 → WAV
   ============================================================ */
function reverb(inp, out, sizes) {
  const combs = sizes.map(s => ({ buf: new Float32Array(s), i: 0, lpz: 0 }));
  const aps = [225, 556, 341, 441].map(s => ({ buf: new Float32Array(s), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n]; let y = 0;
    for (const c of combs) { const r = c.buf[c.i]; c.lpz += .26 * (r - c.lpz); c.buf[c.i] = x + c.lpz * .86; c.i = (c.i + 1) % c.buf.length; y += r; }
    y /= combs.length;
    for (const a of aps) { const r = a.buf[a.i]; const v = y + r * -.5; a.buf[a.i] = v; a.i = (a.i + 1) % a.buf.length; y = r + v * .5; }
    out[n] = y;
  }
}
const RL = new Float32Array(N), RR = new Float32Array(N);
reverb(SL, RL, [1931, 1811, 2399, 2621, 1657]); reverb(SR_, RR, [1973, 1787, 2437, 2593, 1693]);
let peak = 0; const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = t > DUR - .45 ? Math.max(0, (DUR - t) / .45) ** 1.4 : 1;
  let l = (L[i] + RL[i] * .40) * fade, r = (R[i] + RR[i] * .40) * fade;
  l = Math.tanh(l * 1.25) / Math.tanh(1.25); r = Math.tanh(r * 1.25) / Math.tanh(1.25);
  mixL[i] = l; mixR[i] = r; peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const g = .96 / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round(mixL[i] * g * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(mixR[i] * g * 32767), 46 + i * 4);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'music.wav'), wav);
console.log('→ ' + path.join(OUT, 'music.wav') + '  peak ' + peak.toFixed(2) + '  gain ' + g.toFixed(2));
