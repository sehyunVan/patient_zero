(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const config = window.Outbreak;
  let chapter = config.chapter(), district = config.mapOf(chapter), mines = [];
  // 판에는 가림막이 없다 — 막히는 데 없이 그대로 간다
  function moveActor(p, x, y) { p.x = x; p.y = y; }
  const TAU = Math.PI * 2;
  const keys = new Set(), stick = { x: 0, y: 0 };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // 폰 가로 화면이 기준이다. 세계 비율을 화면 비율에 맞춰 잡아 두면 캔버스에 레터박스가 생기지 않는다.
  const box = canvas.getBoundingClientRect();
  const W = 1280, H = Math.round(W / clamp((box.width || 844) / (box.height || 390), 1.5, 2.45));
  let mode = 'intro', player, humans = [], medics = [], bullets = [], items = [], particles = [], infected = [], rings = [], floats = [];
  let elapsed = 0, score = 0, level = 1, combo = 0, comboTime = 0, spawnTime = 0, supplyTime = 0, noticeTime = 0, shake = 0, countdown = 99, cleared = false;
  const ROUND = config.round;
  /* 감염이 닿는 거리 — 몸통(14) + 상대(10) + 이 값. 2026-10-15 에 3 → 18 로 넓혔다.
     그림은 키 84px 로 그려지는데 닿는 판정은 27px 뿐이라, 눈으로는 분명히 스쳤는데
     감염이 안 되는 일이 잦았다(사람이 1.5배로 도망치므로 그 차이가 그대로 놓침이 된다).
     이 값만 고치면 난이도가 통째로 움직인다 — 챕터 통과선은 그대로 두고 여기서 조절한다. */
  const REACH = 18;
  let last = 0, sound = false, audio, view = { scale: 1, x: 0, y: 0, width: 1200, height: 650 };
  // 기록은 챕터마다 따로 센다 — 뒤 챕터는 인파가 더 많아 숫자가 커지므로 한 통에 담으면 비교가 안 된다.
  const best = () => config.bestOf(chapter.n);
  function showBest() { for (const id of ['best', 'hub-best']) if ($(id)) $(id).textContent = String(best()).padStart(3, '0'); }
  showBest();
  function reset() {
    chapter = config.chapter(); district = config.mapOf(chapter); mines = [];
    player = { character: {...Progression.current()}, smoke:0, boost:0, stock:Object.fromEntries(config.loadout.map(id => [id, Progression.supply(id)])), x: W / 2, y: H / 2, hp: 100, r: 14, dx: 1, dy: 0, dash: 0, cooldown: 0, shield: 0, shields: 2, pulses: 1, invincible: 0 };
    humans = []; medics = []; bullets = []; items = []; particles = []; infected = []; rings = []; floats = [];
    elapsed = score = combo = comboTime = spawnTime = supplyTime = shake = 0; level = 1 + chapter.heat; countdown = 99; cleared = false;
    for (let i = 0; i < Math.round(chapter.crowd * .72); i++) spawnHuman(false, true);
    items.push({ x: W * .64, y: H * .49, type: 'shield', life: 30 }, { x: W * .35, y: H * .65, type: 'pulse', life: 30 });
    notice(`CHAPTER ${chapter.n} · ${chapter.name} — ${ROUND}초 안에 ${chapter.quota}명을 감염시키세요`); buildTactical();
    updateHud();
  }
  function setMode(next) { mode = next; document.body.dataset.mode = next; $('lobby').hidden = next !== 'lobby'; if (next !== 'lobby') $('chapters').hidden = true; }
  function start() { reset(); setMode('playing'); keys.clear(); $('overlay').classList.add('hidden'); $('pause').textContent = 'Ⅱ'; $('start').blur(); beep(130, .15); }
  function notice(message) { if (!Settings.get('notify')) return; $('notice').textContent = message; noticeTime = 3.3; }
  function edgePoint() {
    const side = Math.floor(rand(0, 4));
    return side === 0 ? { x: 32, y: rand(90, H - 35) } : side === 1 ? { x: W - 32, y: rand(90, H - 35) } : side === 2 ? { x: rand(35, W - 35), y: 90 } : { x: rand(35, W - 35), y: H - 28 };
  }
  function spawnHuman(edge = true, instant = false) {
    let p = edge ? edgePoint() : { x: rand(50, W - 50), y: rand(100, H - 55) };
    if (!edge && distance(p, player) < 250) p = edgePoint();
    humans.push({ ...p, r: 10, angle: rand(0, TAU), turn: rand(.5, 3), speed: rand(47, 70), variant: Math.random() < .5 ? 1 : 2, fade: instant ? 1 : 0 });
  }
  function spawnMedic() { medics.push({ ...edgePoint(), r: 13, cooldown: 1.8, aim: 0, dx: 1, dy: 0 }); notice('백신 발사자 출현 — 푸른 조준선을 피하세요'); }
  function beep(frequency, duration = .06, type = 'sine') {
    if (!sound || !Settings.volume()) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.setValueAtTime(frequency, audio.currentTime); o.frequency.exponentialRampToValueAtTime(frequency / 2, audio.currentTime + duration); g.gain.setValueAtTime(.045 * Settings.volume(), audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + duration); } catch {}
  }
  function burst(x, y, color, n = 14) { n = Math.round(n * Settings.particles()); for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(35, 170); particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.25, .65), color }); } }
  function action(type) {
    if (mode !== 'playing') return;
    if (config.loadout.includes(type) && player.stock[type] > 0) {
      if ((type === 'heal' && player.hp >= 100) || (type === 'smoke' && player.smoke > 0) || (type === 'boost' && player.boost > 0)) return;
      player.stock[type]--;
      if(type === 'smoke') player.smoke = 4;
      if(type === 'boost') player.boost = 5;
      if(type === 'heal') player.hp = Math.min(100,player.hp+35);
      if(type === 'mine') mines.push({x:player.x,y:player.y,life:12});
      notice(config.skills.find(s=>s.id===type).name+' 사용'); beep(420,.15);
    }
    if (type === 'dash' && player.cooldown <= 0) { player.dash = .2; player.cooldown = 2.3; beep(250, .12, 'sawtooth'); }
    if (type === 'shield' && player.shields > 0 && player.shield <= 0) { player.shields--; player.shield = player.character.shield; notice(`방어막 활성화 · ${player.character.shield}초간 백신 차단`); beep(560, .15); }
    if (type === 'pulse' && player.pulses > 0) {
      player.pulses--; rings.push({ x: player.x, y: player.y, r: 0, life: .55, color: '#baadff' });
      bullets = bullets.filter(b => { if (distance(b, player) < 300) { burst(b.x, b.y, '#baadff', 5); return false; } return true; });
      for (const m of medics) if (distance(m, player) < 300) { m.cooldown = 2.5; m.aim = 0; }
      notice('충격파 · 주변 백신 제거 / 발사자 일시 무력화'); beep(90, .3, 'triangle'); shake = Settings.get('shake') ? 5 : 0;
    }
    updateHud();
  }
  function togglePause() {
    if (mode === 'playing') {
      setMode('paused'); keys.clear(); stick.x = stick.y = 0;
      showOverlay('TAKE A BREATH', '잠시, 숨 고르기.', '도시는 당신을 기다립니다.<br>준비되면 감염을 이어가세요.', '계속하기 ↗', '오른쪽 위 ▶ 버튼으로도 이어서 할 수 있습니다.'); $('pause').textContent = '▶';
    } else if (mode === 'paused') { setMode('playing'); $('overlay').classList.add('hidden'); $('pause').textContent = 'Ⅱ'; $('start').blur(); }
  }
  function showOverlay(kicker, title, copy, button, note) {
    $('overlay-kicker').textContent = kicker; $('overlay-title').innerHTML = title; $('overlay-copy').innerHTML = copy; $('start').textContent = button; $('overlay-note').textContent = note; $('overlay').classList.remove('hidden');
  }
  // 끝나는 길은 둘뿐이다 — 시간을 다 버텼거나(완주), 체력이 먼저 바닥났거나(중도 종료).
  // 챕터 통과는 할당량을 채운 그 순간에 이미 결정되고, 여기서는 기록과 해금만 적는다.
  function end(reason) {
    const survived = reason === 'time', record = score > best(), stars = config.stars(chapter, score);
    setMode('over');
    if (record) config.progress.best[chapter.n] = score;
    const unlocked = cleared && !config.progress.cleared.includes(chapter.n);
    if (cleared && !config.progress.cleared.includes(chapter.n)) config.progress.cleared.push(chapter.n);
    config.save();
    const earned = Progression.complete(score, elapsed, cleared, chapter.n, survived);
    config.history.unshift({ score, seconds: Math.floor(elapsed), map: `CH${chapter.n} ${chapter.name}`, chapter: chapter.n, cleared, survived });
    config.history = config.history.slice(0, 8);
    try { localStorage.setItem('patient-zero-runs-v2', JSON.stringify(config.history)); } catch {}
    showBest();
    // 한 판이 끝나면 기록을 올린다 — 로그인하지 않았으면 Ranking.submit 이 스스로 아무것도 하지 않는다
    window.Ranking?.submit?.();
    const next = config.chapters.find(c => c.n === chapter.n + 1);
    const starRow = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const goals = config.starGoals(chapter);
    showOverlay(
      cleared ? (unlocked ? 'CHAPTER CLEARED' : record ? 'NEW CHAPTER RECORD' : 'CHAPTER CLEARED') : 'CHAPTER FAILED',
      `감염 기록 <em>${score}명</em>`,
      `CHAPTER ${chapter.n} · ${chapter.name} <b>${starRow}</b><br>` +
      (cleared
        ? `통과선 ${chapter.quota}명 달성 · ${survived ? `${ROUND}초 완주` : `${Math.floor(elapsed)}초에 체력 소진`}<br>` +
          (stars < 3 ? `★${stars + 1} 까지 ${goals[stars] - score}명` : '별 셋 — 이 챕터의 최고 성적입니다.') +
          (unlocked && next ? `<br>CHAPTER ${next.n} · ${next.name} 해금` : '')
        : `통과선 ${chapter.quota}명 중 ${score}명 · ${Math.floor(elapsed)}초에 체력 소진<br>${chapter.quota - score}명이 모자랍니다.`),
      cleared && next && unlocked ? `CHAPTER ${next.n} 로 ↗` : '다시 도전하기 ↗',
      `작전 보상 · 검체 +${earned.cash}${earned.tickets ? ` · 첫 통과 모집권 +${earned.tickets}` : ''} / 로비에서 챕터를 고를 수 있습니다.`);
    if (unlocked && next) { config.selected = next.n; config.save(); }
    beep(cleared ? 520 : 65, .4, cleared ? 'triangle' : 'sawtooth');
  }
  // 가장 가까운 바깥 테두리 쪽 — 감염된 사람은 이쪽으로 비틀대며 걸어 나간다.
  function exitAngle(p) {
    const d = [p.x, W - p.x, p.y, H - p.y], near = Math.min(...d);
    return d[0] === near ? Math.PI : d[1] === near ? 0 : d[2] === near ? -Math.PI / 2 : Math.PI / 2;
  }
  function infect(index, chained = false) {
    const h = humans[index]; score++;
    if (!chained) { combo++; comboTime = 2.8; if (combo >= 3) player.hp = Math.min(100, player.hp + player.character.heal); }
    // 감염자는 더는 남을 감염시키지 않는다. 자기 옷을 입은 채 변해서 맵 밖으로 걸어 나가는, 내가 한 일의 흔적이다.
    infected.push({ x: h.x, y: h.y, variant: h.variant, life: 26, angle: h.angle, exit: exitAngle(h), wobble: 0, speed: rand(42, 66), warmup: .7 });
    if (infected.length > 55) infected.shift();
    burst(h.x, h.y, '#ff344d'); rings.push({ x: h.x, y: h.y, r: 5, life: .28, color: '#ff4058' });
    floats.push({ x: h.x, y: h.y - 18, life: .9, text: chained ? '+1' : combo >= 2 ? `${combo} CHAIN` : '+1' }); humans.splice(index, 1);
    Sfx.infect(combo); if (!chained) Settings.buzz(10);
    if (!cleared && score >= chapter.quota) {
      cleared = true; rings.push({ x: player.x, y: player.y, r: 0, life: .8, color: '#ffd46b' });
      floats.push({ x: player.x, y: player.y - 40, life: 1.6, text: 'CHAPTER CLEAR' });
      notice(`챕터 ${chapter.n} 통과 — 남은 시간은 전부 기록입니다`); beep(760, .3, 'triangle');
    }
    if (score % 12 === 0) items.push({ ...h, type: Math.random() < .6 ? 'shield' : 'pulse', life: 20 });
  }
  function update(dt) {
    elapsed += dt; player.smoke=Math.max(0,player.smoke-dt); player.boost=Math.max(0,player.boost-dt);
    // 한 판은 ROUND 초. 남은 시간이 10초를 끊을 때마다 초읽기를 울린다.
    const left = Math.ceil(ROUND - elapsed);
    if (left <= 10 && left !== countdown) { countdown = left; if (left > 0) { beep(880 - (10 - left) * 25, .09, 'square'); if (left === 10) notice('남은 시간 10초 — 마지막 감염을 밀어붙이세요'); } }
    if (elapsed >= ROUND) { elapsed = ROUND; updateHud(); return end('time'); }
    const nextLevel = 1 + chapter.heat + Math.floor(elapsed / 22);
    if (nextLevel !== level) { level = nextLevel; notice(`위협 단계 ${String(level).padStart(2, '0')} · 인파와 백신 사격 증가`); beep(330, .2); }
    noticeTime -= dt; if (noticeTime <= 0) $('notice').textContent = '';
    comboTime -= dt; if (comboTime <= 0) combo = 0;
    player.cooldown = Math.max(0, player.cooldown - dt); player.shield = Math.max(0, player.shield - dt); player.invincible = Math.max(0, player.invincible - dt);
    let mx = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + stick.x;
    let my = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + stick.y;
    const length = Math.hypot(mx, my); if (length > 1) { mx /= length; my /= length; }
    if (length > .1 && player.dash <= 0) { player.dx = mx / Math.hypot(mx, my); player.dy = my / Math.hypot(mx, my); }
    player.moving = length > .1;
    if (player.dash > 0) { mx = player.dx; my = player.dy; player.dash -= dt; burst(player.x, player.y, '#ff3c59', 2); }
    const speed = player.dash > 0 ? 720 : player.character.speed * (player.boost > 0 ? 1.55 : 1);
    moveActor(player,clamp(player.x + mx * speed * dt,28,W-28),clamp(player.y + my * speed * dt,85,H-22));
    // 인파는 모자란 만큼 바로 채운다 — 빈 광장에서 끝나는 판이 없도록. 크게 비면 안쪽에도 내려 보내 중앙이 죽지 않게 한다.
    spawnTime -= dt;
    if (spawnTime <= 0) {
      const crowd = chapter.crowd, deficit = crowd - humans.length;
      for (let i = 0; i < Math.min(7, deficit); i++) spawnHuman(!(deficit > 12 && i % 2));
      spawnTime = deficit > crowd * .4 ? .2 : .55;
    }
    const targetMedics = elapsed < chapter.delay ? 0 : Math.min(chapter.cap, 1 + Math.floor((elapsed - chapter.delay) / chapter.every));
    if (medics.length < targetMedics) spawnMedic();
    for (let i = humans.length - 1; i >= 0; i--) {
      const h = humans[i], d = distance(h, player); h.turn -= dt; h.fade = Math.min(1, h.fade + dt * 3.4);
      if (d < 145) h.angle = Math.atan2(h.y - player.y, h.x - player.x);
      else if (h.turn <= 0) { h.turn = rand(1, 3); h.angle += rand(-1.5, 1.5); }
      const speed = h.speed * (d < 145 ? 1.5 : .6);
      moveActor(h,h.x + Math.cos(h.angle) * speed * dt,h.y + Math.sin(h.angle) * speed * dt);
      if (h.x < 20 || h.x > W - 20) h.angle = Math.PI - h.angle;
      if (h.y < 80 || h.y > H - 20) h.angle = -h.angle;
      h.x = clamp(h.x, 28, W - 28); h.y = clamp(h.y, 80, H - 20);
      if (h.fade >= 1 && distance(h, player) < player.r + h.r + REACH) infect(i);
    }
    for (const m of medics) {
      if(player.smoke > 0) { m.aim=0; m.cooldown=Math.max(m.cooldown,.5); continue; }
      const d = distance(m, player), a = Math.atan2(player.y - m.y, player.x - m.x);
      if (m.aim > 0) {
        m.aim -= dt;
        if (m.aim <= 0) {
          const angle = Math.atan2(m.dy, m.dx), shots = level >= 4 ? 3 : 1;
          for (let s = 0; s < shots; s++) { const aa = angle + (s - (shots - 1) / 2) * .16, speed = Math.min(400, 205 + level * 14); bullets.push({ x: m.x + m.dx * 22, y: m.y + m.dy * 22, vx: Math.cos(aa) * speed, vy: Math.sin(aa) * speed, life: 5 }); }
          m.cooldown = Math.max(.8, 2.3 - level * .11); beep(160, .04, 'triangle');
        }
      } else {
        const step = d > 320 ? 34 : d < 180 ? -45 : 0; moveActor(m,clamp(m.x + Math.cos(a) * step * dt,30,W-30),clamp(m.y + Math.sin(a) * step * dt,85,H-25));
        m.cooldown -= dt; if (m.cooldown <= 0) { m.aim = .7; m.dx = Math.cos(a); m.dy = Math.sin(a); }
      }
    }
    for (const b of bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (distance(b, player) < player.r + (player.shield > 0 ? 19 : 5)) {
        b.life = 0;
        if (player.shield > 0 || player.dash > 0 || player.invincible > 0) burst(b.x, b.y, '#8ce2ff', 6);
        else { player.hp = Math.max(0, player.hp - player.character.damage); player.invincible = .7; combo = 0; shake = Settings.get('shake') ? 9 : 0; Settings.buzz(30); burst(player.x, player.y, '#fa8e78', 20); notice(`백신 피격 −${player.character.damage} · 대시와 방어막을 활용하세요`); Sfx.hit(); }
      }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
    supplyTime += dt; if (supplyTime > 10) { supplyTime = 0; items.push({ x: rand(90, W - 90), y: rand(90, H - 90), type: ['shield', 'pulse', 'heal'][Math.floor(rand(0, 3))], life: 22 }); }
    for (const item of items) {
      item.life -= dt;
      if (distance(item, player) < 32) {
        item.life = 0;
        if (item.type === 'shield') { player.shields++; notice('방어막 획득 · 오른쪽 방패 버튼'); }
        else if (item.type === 'pulse') { player.pulses++; notice('충격파 획득 · 오른쪽 번개 버튼'); }
        else { player.hp = Math.min(100, player.hp + 25); notice('바이러스 회복 +25'); }
        burst(item.x, item.y, '#bba6ff', 18); beep(680, .12);
      }
    }
    items = items.filter(i => i.life > 0);
    for(const mine of mines) { mine.life-=dt; if(humans.some(h=>h.fade>=1&&distance(h,mine)<65)) { for(let i=humans.length-1;i>=0;i--) if(humans[i].fade>=1&&distance(humans[i],mine)<120) infect(i,true); rings.push({x:mine.x,y:mine.y,r:0,life:.55,color:"#ff485b"});mine.life=0;} } mines=mines.filter(m=>m.life>0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    // 감염자는 전염원이 아니다 — 비틀대며 가장 가까운 테두리로 걸어 나가고, 나가면 사라진다.
    for (const z of infected) {
      z.life -= dt; z.warmup -= dt;
      if (z.warmup > 0) continue;
      z.wobble -= dt;
      if (z.wobble <= 0) { z.wobble = rand(.5, 1.5); z.angle = z.exit + rand(-.8, .8); }
      moveActor(z, z.x + Math.cos(z.angle) * z.speed * dt, z.y + Math.sin(z.angle) * z.speed * dt);
      if (z.x < -45 || z.x > W + 45 || z.y < -45 || z.y > H + 45) z.life = 0;
    }
    infected = infected.filter(z => z.life > 0);
    for (const r of rings) { r.life -= dt; r.r += 560 * dt; } rings = rings.filter(r => r.life > 0);
    for (const f of floats) { f.life -= dt; f.y -= 27 * dt; } floats = floats.filter(f => f.life > 0);
    shake = Math.max(0, shake - dt * 30); updateHud(); if (player.hp <= 0) end('down');
  }
  function updateHud() {
    document.querySelectorAll('[data-stock]').forEach(el=>el.textContent=player.stock[el.dataset.stock]||0);
    $('effect-status').textContent = [player.smoke>0 ? `은폐 ${player.smoke.toFixed(1)}s` : '',player.boost>0 ? `가속 ${player.boost.toFixed(1)}s` : ''].filter(Boolean).join(' / ');
    $('score').textContent = String(score).padStart(3, '0'); $('combo').textContent = combo >= 2 ? `${combo} CHAIN${combo >= 3 ? ' · 체력 회복 +'+player.character.heal : ''}` : cleared ? '통과 — 남은 시간은 전부 기록' : `통과까지 ${chapter.quota - score}명`;
    $('health').style.width = player.hp + '%'; $('health').style.background = player.hp <= 40 ? '#ff875c' : '#ed3446'; $('hp-text').textContent = player.hp + '%';
    // 시간은 흐르는 게 아니라 줄어든다 — 남은 시간이 곧 남은 기회다.
    const left = Math.max(0, Math.ceil(ROUND - elapsed));
    $('time').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    $('time').classList.toggle('urgent', left <= 10 && mode === 'playing');
    // 챕터와 통과선은 늘 보여야 한다 — 지금 뭘 깨는 중인지, 얼마나 남았는지.
    const stars = config.stars(chapter, score);
    $('wave').textContent = `CH ${chapter.n} · THREAT ${String(level).padStart(2, '0')}`;
    $('quota').textContent = cleared ? `/ 통과 · 기록 경신 중` : `/ ${chapter.quota}명 통과`;
    $('quota-bar').style.width = Math.min(100, score / chapter.quota * 100) + '%';
    $('quota-bar').style.background = cleared ? '#ffd46b' : '#8d7bff';
    $('quota-text').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); $('shield-count').textContent = player.shields; $('pulse-count').textContent = player.pulses;
    // 버튼 자체가 상태판이다 — 대시는 차오르는 덮개로, 방어막은 켜진 테두리로 알린다.
    $('dash').style.setProperty('--cd', (player.cooldown / 2.3).toFixed(3));
    $('shield').classList.toggle('on', player.shield > 0);
    $('shield').toggleAttribute('data-empty', player.shields <= 0); $('pulse').toggleAttribute('data-empty', player.pulses <= 0);
  }
  function render() {
    PatientZeroVisuals.render(ctx, view, { district, mines, W, H, elapsed, player, humans, medics, infected, bullets, items, rings, particles, floats, shake });
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Settings.dpr();
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    // 화면 전체가 경기장이다. 비율이 어긋나도 세계 전체가 들어오도록 맞춰 넣는다.
    const scale = Math.min(rect.width / W, rect.height / H);
    view = { scale, x: (rect.width - W * scale) / 2, y: (rect.height - H * scale) / 2, width: rect.width, height: rect.height };
  }
  const introMarkup={title:$('overlay-title').innerHTML,kicker:$('overlay-kicker').innerHTML,copy:$('overlay-copy').innerHTML,start:$('start').innerHTML,note:$('overlay-note').innerHTML};
  // 처음이면 인트로 → 첫 전투(튜토리얼) → 그 뒤로는 바로 로비
  function firstRun() {
    const automated = navigator.webdriver && !window.FORCE_INTRO;   // 테스트는 로비부터 본다
    if (!window.Intro || Intro.seen() || automated) return enterLobby();
    Intro.play(() => { config.selected = 1; config.save(); showBest(); start(); Intro.tutorial(); });
  }
  function enterLobby() {window.Intro?.stop();Progression.sync();setMode('lobby'); keys.clear();stick.x=stick.y=0;$('overlay').classList.add('hidden');buildTactical();showBest();const ch=config.chapter(),st=config.stars(ch,best()),goals=config.starGoals(ch);const goal=goals[Math.min(2,st)];$('hub-goal').textContent=goal;$('hub-progress').style.width=Math.min(100,best()/goal*100)+'%';$('hub-play').focus();}

  // ───── 챕터 선택 (목업 1:1) ─────
  // 카드는 한 번만 그리고, 가운데로 온 카드에 .focused 를 붙여 모양을 바꾼다.
  // 출격 버튼은 따로 없다 — 가운데 카드가 곧 출격 버튼이다(목업에 버튼이 없다).
  let railFocus = config.selected;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // 통과했을 때 실제로 들어오는 모집권 수 — 화면에 없는 숫자를 지어내지 않는다.
  // 통과했을 때 들어오는 검체 — Progression 의 ECONOMY 표와 같은 식을 쓴다(통과선만큼 감염했다고 보고 센다)
  const cashFor = ch => Progression.economy.run(ch.quota, true, true);
  // 카드 설명은 두 줄로 나눈다 — 목업의 두 줄짜리 자리를 그대로 쓴다
  const twoLines = s => {
    const w = String(s).split(' '), half = Math.ceil(w.length / 2);
    return esc(w.slice(0, half).join(' ')) + '<br>' + esc(w.slice(half).join(' '));
  };
  // 꺾인 선 하나 — 왼쪽 끝에 마름모, 오른쪽으로 가다 한 번 올라선다
  const barSvg = pct => '<svg viewBox="0 0 343 18" aria-hidden="true">' +
    '<path d="M2 14h11" stroke="#c6d0dc" stroke-width="1.4" fill="none"/>' +
    '<path d="M25 3.4 31.6 9 25 14.6 18.4 9z" stroke="#dde4ec" stroke-width="1.2" fill="none"/>' +
    '<path d="M25 6.6 27.9 9 25 11.4 22.1 9z" fill="#e8eef5" stroke="none"/>' +
    '<path d="M33 14h124l13-11h171" stroke="#9eaab8" stroke-width="1.2" fill="none"/>' +
    '<path d="M33 14h124l13-11h171" pathLength="100" stroke-dasharray="' + pct + ' 100" stroke="#ec3a52" stroke-width="2.4" fill="none"/></svg>';
  const LOCK_PATH = '<path d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5m0 2.6A2.4 2.4 0 0 0 9.6 7v2h4.8V7A2.4 2.4 0 0 0 12 4.6"/>';

  function chapterCard(ch) {
    const open = config.unlocked(ch.n), done = config.progress.cleared.includes(ch.n);
    const best = config.bestOf(ch.n), pct = Math.min(100, Math.round(best / ch.quota * 100));
    const stars = config.stars(ch, best);
    const foot = open
      ? `<div class="cs-foot"><svg class="cs-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m7 12 3.5 3.5L18 8"/></svg>
           <div><small>${done ? 'COMPLETE' : 'IN PROGRESS'}</small><b>${pct}%</b></div>
           <img src="${config.posterOf(ch)}" alt="" loading="lazy">
           <i class="cs-track"><i style="width:${pct}%"></i></i></div>`
      : `<div class="cs-lock"><svg viewBox="0 0 24 24">${LOCK_PATH}</svg>
           <div><small>잠금 해제 조건</small><b>${ch.n - 1}장 클리어</b></div></div>`;
    return `<article class="cs-card${open ? '' : ' locked'}${done ? ' done' : ''}" data-district="${ch.n}" tabindex="0" role="button" aria-label="챕터 ${ch.n} ${esc(ch.name)}${open ? '' : ' 잠김'}">
      <div class="cs-plate"><img class="cs-art" data-art="${config.posterOf(ch)}" alt="" decoding="async"><div class="cs-shade"></div></div>
      <div class="cs-head-no"><b class="cs-no">${String(ch.n).padStart(2, '0')}</b><span class="cs-ch">CHAPTER</span></div>
      <h3>${esc(ch.name)}</h3>${open && !done ? '<em class="cs-new">NEW</em>' : ''}
      <img class="cs-slash" src="assets/title-slash.webp" alt="" loading="lazy">
      <p>${twoLines(window.Tx ? Tx(ch.copy) : ch.copy)}</p>${open ? `<div class="cs-stars">${'<b>★</b>'.repeat(stars)}${'★'.repeat(3 - stars)}</div>` : ''}
      ${foot}
      <div class="cs-bar">${barSvg(pct)}</div><div class="cs-pct">${pct}%</div>
      <div class="cs-reward"><em>REWARD</em>
        <span><img src="assets/icons/sample.webp" alt="검체"><i>×${cashFor(ch)}</i></span></div>
      <img class="cs-scratch" src="assets/card-scratch.webp" alt=""><img class="cs-frame" src="assets/card-frame.webp" alt="">
    </article>`;
  }

  function railCards() { return [...$('chapter-rail').children]; }
  // 가운데에서 ±4 칸 안쪽 카드만 그림을 받아 온다. 넘기면 그때 마저 받는다.
  function loadNearbyArt(n) {
    for (const card of railCards()) {
      if (Math.abs(Number(card.dataset.district) - n) > 4) continue;
      const img = card.querySelector('.cs-art[data-art]');
      if (img) { img.src = img.dataset.art; delete img.dataset.art; }
    }
  }
  let railLock = 0;
  // 카드열을 가운데 카드에 맞춘다. scrollIntoView 로는 안 된다 —
  // 가운데 카드가 268→356 으로 **자라는 동안** 재면 다 자란 뒤 폭의 절반(44px)만큼 어긋난다.
  // 그래서 다 자란 뒤의 자를 써서 직접 센다: 슬롯 간격은 268+16, 가운데 카드는 356.
  function railCenter(n, smooth) {
    const rail = $('chapter-rail');
    const u = parseFloat(getComputedStyle($('chapters')).getPropertyValue('--u')) || 1;
    const left = Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, (n - 1) * 284 * u));
    railLock = Date.now() + (smooth ? 460 : 120);   // 우리가 옮기는 동안 settle 이 되돌리지 못하게
    if (smooth) rail.scrollTo({ left, behavior: 'smooth' }); else rail.scrollLeft = left;
  }
  function focusChapter(n, scroll = true) {
    if (!config.chapters.some(ch => ch.n === n)) return;
    railFocus = n;
    const card = railCards().find(c => Number(c.dataset.district) === n);
    railCards().forEach(c => c.classList.toggle('focused', c === card));
    // 단계 표시는 가운데 것을 포함해 다섯 개만 — 목업과 같은 창
    const stepStart = Math.max(1, Math.min(n - 2, config.chapters.length - 4));
    $('chapter-steps').querySelectorAll('[data-step]').forEach(s => {
      const num = Number(s.dataset.step);
      s.classList.toggle('on', num === n);
      s.hidden = num < stepStart || num >= stepStart + 5;
      s.setAttribute('aria-current', num === n ? 'step' : 'false');
      const art = s.hidden ? null : s.querySelector('i[data-art]');
      if (art) { art.style.backgroundImage = `url('${art.dataset.art}')`; delete art.dataset.art; }
    });
    const here = config.chapters.find(ch => ch.n === n), next = config.chapters.find(ch => ch.n === n + 1);
    $('chapter-preview').disabled = !next;
    $('chapter-preview-art').src = config.posterOf(next || here);
    $('chapter-preview-copy').innerHTML = next
      ? `${esc(next.name)}의 새로운 맵과<br>특별한 이벤트를 확인하세요.`
      : '마지막 챕터입니다.<br>최고 기록에 도전하세요.';
    $('rail-prev').disabled = n === 1;
    $('rail-next').disabled = n === config.chapters.length;
    loadNearbyArt(n);
    if (scroll) railCenter(n, true);
    const best = config.bestOf(n), goal = config.starGoals(here)[Math.min(2, config.stars(here, best))];
    $('chapter-best').textContent = best;
    $('chapter-goal').textContent = '/ ' + goal;
  }
  function openChapters() {
    $('chapter-rail').innerHTML = config.chapters.map(chapterCard).join('');
    $('chapter-steps').innerHTML = config.chapters.map(ch => {
      const open = config.unlocked(ch.n), done = config.progress.cleared.includes(ch.n);
      const badge = done ? '<svg viewBox="0 0 24 24"><path d="m5 12 5 5L19 7"/></svg>'
        : open ? '' : `<svg viewBox="0 0 24 24">${LOCK_PATH}</svg>`;
      return `<button data-step="${ch.n}" class="${done ? 'done' : ''}${open ? '' : ' locked'}" aria-label="챕터 ${ch.n} ${esc(ch.name)}">
        <i data-art="${config.posterOf(ch)}"></i><em>${badge}</em>
        <img class="claw" src="assets/claw-mark.webp" alt="" loading="lazy">
        <span>${String(ch.n).padStart(2, '0')}</span><small>${esc(ch.name)}</small></button>`;
    }).join('');
    $('chapters').hidden = false;
    sizeChapters();
    focusChapter(config.selected, false);
    railCenter(config.selected, false);
    const step = $('chapter-steps').querySelector('.on');
    if (step) step.scrollIntoView({ inline: 'center', block: 'nearest' });
    (railCards().find(c => Number(c.dataset.district) === config.selected) || $('chapter-back')).focus({ preventScroll: true });
  }
  // 나갈 때 보고 있던 챕터를 그대로 들고 나간다 — 로비 카드와 기록이 방금 본 챕터를 가리키게.
  // 잠긴 챕터는 고르지 않는다.
  function closeChapters() {
    clearTimeout(railSettle);
    if (config.unlocked(railFocus) && config.selected !== railFocus) { config.selected = railFocus; config.save(); buildTactical(); }
    $('chapters').hidden = true; $('hub-play').focus();
  }
  // 목업은 1404×790 자다. 화면 높이로 그 자를 늘린 값이 --u — 가로는 귀퉁이에 붙인다.
  function sizeChapters() {
    const h = $('chapters').clientHeight;
    if (h) $('chapters').style.setProperty('--u', (h / 790) + 'px');
    if (!$('chapters').hidden) railCenter(railFocus, false);
  }
  addEventListener('resize', sizeChapters);
  addEventListener('orientationchange', sizeChapters);
  // 가운데 카드를 한 번 더 누르면 출격한다. 옆 카드를 누르면 가운데로 끌어온다.
  const launchChapter = n => {
    if (!config.unlocked(n)) return;
    config.selected = n; config.save();
    closeChapters(); showBest(); start();
  };
  const pickCard = card => {
    const n = Number(card.dataset.district);
    if (card.classList.contains('focused')) launchChapter(n); else focusChapter(n);
  };
  $('chapter-rail').addEventListener('click', e => { const card = e.target.closest('[data-district]'); if (card) pickCard(card); });
  $('chapter-rail').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const card = e.target.closest('[data-district]'); if (card) { e.preventDefault(); pickCard(card); } } });
  $('chapter-steps').addEventListener('click', e => { const step = e.target.closest('[data-step]'); if (step) focusChapter(Number(step.dataset.step)); });
  // 손가락으로 넘긴 뒤에는 가운데 온 카드가 곧 고른 카드다.
  // 카드 폭을 재서 고르면 안 된다 — 가운데 카드가 자라는 중에 재면 옆 카드가 더 가까워 보인다.
  // railCenter 와 같은 자(슬롯 간격 284)로 스크롤 값만 보고 센다.
  let railSettle = 0;
  $('chapter-rail').addEventListener('scroll', () => {
    clearTimeout(railSettle);
    railSettle = setTimeout(() => {
      const rail = $('chapter-rail');
      const u = parseFloat(getComputedStyle($('chapters')).getPropertyValue('--u')) || 1;
      const slot = 284 * u;
      const n = Math.max(1, Math.min(config.chapters.length, Math.round(rail.scrollLeft / slot) + 1));
      // 아직 미끄러지는 중이면 슬롯에서 벗어나 있다 — 그때 고쳐 잡으면 방향키 입력이 되돌아간다
      if (Math.abs(rail.scrollLeft - (n - 1) * slot) > 6) return;
      if (n !== railFocus) focusChapter(n, false);
    }, 110);
  });
  const railStep = dir => focusChapter(Math.max(1, Math.min(config.chapters.length, railFocus + dir)));
  $('rail-prev').onclick = () => railStep(-1);
  $('rail-next').onclick = () => railStep(1);
  $('chapter-back').onclick = closeChapters; $('chapter-home').onclick = closeChapters;
  $('chapter-home-bottom').onclick = closeChapters; $('chapter-close').onclick = closeChapters;
  $('chapter-preview').onclick = () => railStep(1);
  document.querySelectorAll('[data-chpanel]').forEach(b => b.onclick = () => openPanel(b.dataset.chpanel));
  window.addEventListener('keydown', e => {
    if ($('chapters').hidden || $('info-dialog').open) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeChapters(); }
    else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); railStep(e.code === 'ArrowRight' ? 1 : -1); }
    else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); launchChapter(railFocus); }
  }, true);
  $('return-lobby').onclick=enterLobby;
  $('hub-home').onclick=()=>{};
  $('hub-play').onclick=openChapters; $('lobby-chapter-card').onclick=openChapters;
  $('hub-map').onclick = e => { e.preventDefault(); e.stopPropagation(); openChapters(); };
  // 로그인 창은 js/auth.js 가 통째로 맡는다(#login 의 onclick 도 거기서 건다).
  // 여기 있던 「아직 계정 서버가 없다」 판은 auth.js 가 덮어쓰고 있어 **한 번도 안 돌았다** — 지웠다(2026-10-15).
  $('close-login').onclick = () => $('login-dialog').close();
  $('back-title').onclick=()=>{setMode('intro');$('overlay-title').innerHTML=introMarkup.title;$('overlay-kicker').innerHTML=introMarkup.kicker;$('overlay-copy').innerHTML=introMarkup.copy;$('start').innerHTML=introMarkup.start;$('overlay-note').innerHTML=introMarkup.note;$('overlay').classList.remove('hidden');};
  $('start').onclick = () => mode === 'intro' ? firstRun() : mode === 'paused' ? togglePause() : start(); $('pause').onclick = togglePause;
  // 액션 버튼은 손가락이 닿는 즉시 — 누르고 떼는 사이의 지연은 회피 게임에서 치명적이다.
  document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); action(b.dataset.action); b.blur(); }));
  $('sound').onclick = () => { sound = !sound; $('sound').querySelector('em').textContent = sound ? 'ON' : 'OFF'; $('sound').setAttribute('aria-label', sound ? '효과음 끄기' : '효과음 켜기'); beep(500); };
  // 효과음은 설정을 따른다(기본 켬). 옛 키만 보던 탓에 처음 켠 사람에게는 소리가 아예 없었다.
  if (Settings.get('sound') !== false) $('sound').click();
  const guide = (icon, title, copy) => `<div class="guide-item"><svg><use href="#i-${icon}"/></svg><div><h3>${title}</h3><p>${copy}</p></div></div>`;
  // 생존 가이드에 서는 아이템. 하나도 빠뜨리지 않는다 —
  // 판에서 바로 쓰는 셋 + 바닥에 떨어지는 회복 보급품 + 편성하는 전술 아이템 넷.
  const GUIDE_ITEMS = [
    { art: 'assets/icons/dash.webp', name: '대시', copy: '2.3초마다 충전됩니다. 이동 방향으로 돌진하는 동안 백신에 맞지 않습니다.' },
    { art: 'assets/icons/shield.webp', name: '방어막', copy: '3초 동안 백신을 막습니다. 노아는 4.5초. 시작할 때 2개를 들고 있습니다.' },
    { art: 'assets/icons/pulse.webp', name: '충격파', copy: '주변 백신 탄환을 지우고 발사자를 2.5초 멈춥니다. 시작할 때 1개.' },
    { art: 'assets/icons/heal.webp', name: '회복 보급품', copy: '바닥에 떨어진 보급품에 닿으면 체력을 25 회복합니다.' },
    ...config.skills.map(s => ({ art: s.art, name: s.name, copy: s.copy, duration: s.duration })),
  ];
  function guideScreen() {
    return `<div class="guide-screen">
      <button class="guide-arrow prev" aria-label="이전 아이템">‹</button>
      <div class="guide-rail" id="guide-rail">${GUIDE_ITEMS.map((it, i) => `
        <button class="guide-card${i ? '' : ' on'}" data-guide="${i}" aria-label="${esc(it.name)}">
          <i><img src="${it.art}" alt=""></i>
          <h3>${esc(it.name)}</h3><p>${esc(it.duration ? it.duration + ' · ' + it.copy : it.copy)}</p>
        </button>`).join('')}</div>
      <button class="guide-arrow next" aria-label="다음 아이템">›</button>
      <div class="guide-dots" id="guide-dots">${GUIDE_ITEMS.map((it, i) =>
        `<button class="${i ? '' : 'on'}" data-dot="${i}" aria-label="${esc(it.name)}"></button>`).join('')}</div>
    </div>`;
  }
  // 넘겨 보기. 고른 칸에 붉은 테가 켜지고 아래 점이 따라온다.
  function wireGuide() {
    const rail = $('guide-rail'); if (!rail) return;
    const cards = [...rail.querySelectorAll('[data-guide]')];
    const dots = [...$('guide-dots').querySelectorAll('[data-dot]')];
    const prev = document.querySelector('.guide-arrow.prev'), next = document.querySelector('.guide-arrow.next');
    let at = 0;
    const show = i => {
      at = Math.max(0, Math.min(cards.length - 1, i));
      cards.forEach((c, n) => c.classList.toggle('on', n === at));
      dots.forEach((d, n) => d.classList.toggle('on', n === at));
      prev.disabled = at === 0; next.disabled = at === cards.length - 1;
      // 고른 칸이 보이는 네 칸 밖이면 그만큼만 민다
      const card = cards[at], left = card.offsetLeft - rail.offsetLeft;
      if (left < rail.scrollLeft) rail.scrollTo({ left, behavior: 'smooth' });
      else if (left + card.offsetWidth > rail.scrollLeft + rail.clientWidth)
        rail.scrollTo({ left: left + card.offsetWidth - rail.clientWidth, behavior: 'smooth' });
    };
    cards.forEach((c, n) => c.onclick = () => show(n));
    dots.forEach((d, n) => d.onclick = () => show(n));
    prev.onclick = () => show(at - 1); next.onclick = () => show(at + 1);
    show(0);
  }
  // 기록 탭의 머리 — 최고 기록 한 장. 누르면 챕터별 기록이 아래로 열린다.
  function recordHero() {
    const ch = config.chapter(), top = Math.max(...config.chapters.map(c => config.bestOf(c.n)), 0);
    return `<div class="record-hero">
      <img src="${config.posterOf(ch)}" alt="">
      <svg class="rec-crown" viewBox="0 0 24 24"><use href="#i-crown-solid"/></svg>
      <small>최고 기록</small><b>${top}</b><span>감염시킨 인원</span>
      <div class="rec-row"><button class="rec-go" id="record-open">기록 확인</button><span class="rec-next">›</span></div>
    </div>`;
  }
  const dialog = $('info-dialog'); let resumeAfterDialog = false;
  function openPanel(panel) {
    Panels.reset();
    resumeAfterDialog = mode === 'playing'; if (resumeAfterDialog) togglePause();
    if (['characters','recruit','inventory','missions'].includes(panel) || (panel==='maps' && mode==='lobby')) { Progression.open(panel==='maps'?'districts':panel,buildTactical); return; }
    if(panel === 'settings') { Settings.open(); return; }
    if(panel === 'maps' || panel === 'loadout') { openEquipment(panel); dialog.showModal(); return; }
    const panels = {
      items: ['생존 가이드', guideScreen()],
      record: ['랭킹', recordHero() + `<div id="record-detail">${Ranking.panel()}</div>`],
      help: ['도시를 감염시키는 방법', guide('crown', `챕터 · ${ROUND}초 한 판`, '한 판은 ' + ROUND + '초로 고정입니다. 제한 시간 안에 챕터의 통과선을 넘기면 통과하고 다음 챕터가 열립니다. 통과한 뒤 남은 시간은 전부 기록 경신에 쓰세요 — 뒤 챕터일수록 백신은 거세지지만 인파가 더 몰려 기록은 더 크게 나옵니다.') + guide('run', '왼쪽 스틱 · 이동', '왼쪽 아래 스틱을 끌어 움직이고, 오른쪽 아래 버튼으로 대시·방어막·충격파를 씁니다. 키보드는 WASD / 방향키로도 됩니다.') + guide('skull', '접촉 감염 · 연쇄', '사람과 닿으면 감염됩니다. 감염된 사람은 더 퍼뜨리지 않고 비틀대며 도시 밖으로 걸어 나갑니다 — 퍼뜨리는 건 오직 당신입니다. 2.8초 안에 이어 감염하면 연쇄가 쌓이고, 3연쇄부터 체력이 2씩(제로는 4씩) 회복됩니다.') + guide('target', '백신 사격을 피하세요', '푸른 조준선은 발사 방향을 예고합니다. 백신에 맞으면 체력이 20, 애쉬는 15 감소합니다. 판이 진행될수록 사격이 거세집니다.') + guide('help', '일시정지 · 가로 화면', '오른쪽 위 Ⅱ 버튼, 키보드는 ESC / P. 폰을 세로로 돌리거나 다른 창으로 이동하면 자동으로 멈춥니다.')]
    };
    $('dialog-eyebrow').textContent = { items: 'SURVIVAL GUIDE', record: 'INFECTION RECORD', help: 'HOW TO PLAY' }[panel] || 'SURVIVAL GUIDE';
    $('dialog-title').textContent = panels[panel][0]; $('dialog-content').innerHTML = panels[panel][1]; dialog.showModal();
    if (panel === 'items') wireGuide();
    if (panel === 'record') {
      // 자세한 기록은 접어 둔다 — 시안의 「기록 확인」이 그걸 연다
      const rest = [...$('dialog-content').children].filter(el => !el.classList.contains('record-hero'));
      const toggle = on => rest.forEach(el => { el.hidden = !on; });
      toggle(false);
      $('record-open').onclick = e => { const on = $('record-detail').hidden; toggle(on); e.currentTarget.textContent = on ? '접기' : '기록 확인'; };
      Ranking.wire($('record-detail'));toggle(true);$('record-open').hidden=true;Panels.apply('record');
    }
  }
  document.querySelectorAll('[data-panel]').forEach(button => button.onclick = () => openPanel(button.dataset.panel));
  $('close-dialog').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { if (resumeAfterDialog && mode === 'paused' && document.hasFocus()) togglePause(); resumeAfterDialog = false; });
  window.addEventListener('keydown', e => {
    if (dialog.open) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && (mode === 'playing' || e.target.tagName !== 'BUTTON')) e.preventDefault();
    keys.add(e.code); if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    if(/^Digit[1-4]$/.test(e.code)) action(config.skills[Number(e.code.slice(-1))-1].id);
    if (e.code === 'Space' && mode === 'playing') action('dash'); if (e.code === 'KeyQ') action('shield'); if (e.code === 'KeyE') action('pulse');
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  function loseFocus() { keys.clear(); stick.x = stick.y = 0; if (mode === 'playing') togglePause(); }
  window.addEventListener('blur', loseFocus); document.addEventListener('visibilitychange', () => { if (document.hidden) loseFocus(); });
  // 폰을 세로로 들면 화면이 가려지므로 판도 같이 멈춘다.
  const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  portrait.addEventListener?.('change', event => { if (event.matches) loseFocus(); });
  const joystick = $('joystick'); let pointerId = null;
  function moveStick(e) { const r = joystick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / 32, y = (e.clientY - r.top - r.height / 2) / 32; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.x = x; stick.y = y; joystick.firstElementChild.style.transform = `translate(${x * 26}px,${y * 26}px)`; }
  joystick.addEventListener('pointerdown', e => { pointerId = e.pointerId; joystick.setPointerCapture(e.pointerId); moveStick(e); });
  joystick.addEventListener('pointermove', e => { if (e.pointerId === pointerId) moveStick(e); });
  function releaseStick() { pointerId = null; stick.x = stick.y = 0; joystick.firstElementChild.style.transform = ''; }
  joystick.addEventListener('pointerup', releaseStick); joystick.addEventListener('pointercancel', releaseStick); joystick.addEventListener('lostpointercapture', releaseStick);
  window.addEventListener('resize', resize); resize(); reset(); $('notice').textContent = '';
  function frame(now) { const dt = Math.min((now - last) / 1000 || 0, .035); last = now; if (mode === 'playing') update(dt); render(); requestAnimationFrame(frame); } requestAnimationFrame(frame);
  function buildTactical() {
    $('tactical-actions').innerHTML=config.loadout.map(id=>{const s=config.skills.find(s=>s.id===id);return '<button class="act" data-tactical="'+id+'" aria-label="'+s.name+'"><img class="icon-art" src="'+s.art+'" alt=""><b data-stock="'+id+'">2</b><kbd>'+s.key+'</kbd></button>';}).join('');
    document.querySelectorAll('[data-tactical]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.tactical);}));
    const ch=config.chapter(), map=config.mapOf(ch), stars=config.stars(ch,config.bestOf(ch.n));
    $('map-name').textContent='CH '+ch.n+' · '+ch.name;$('map-sector').textContent=map.name+' / 통과선 '+ch.quota+'명';
    window.LobbyUI?.sync();$('hub-map-name').textContent='CHAPTER '+ch.n+' · '+ch.name;
    document.querySelector('.minimap-frame>span').textContent='SECTOR '+map.sector;
    document.querySelector('.lobby-location').innerHTML='<span class=live-dot></span> '+map.name+' <i>/</i> CHAPTER '+ch.n+' '+('★'.repeat(stars)+'☆'.repeat(3-stars));
    $('loadout-preview').innerHTML=config.loadout.map(id=>{const s=config.skills.find(s=>s.id===id);return '<span><svg><use href="#i-'+s.icon+'"/></svg>'+s.name+' <b>×2</b></span>';}).join('');
  }
  function openEquipment(panel) {
    Panels.reset();
    const locked=mode==='paused'; $('dialog-title').textContent=panel==='maps'?'챕터 선택':'전술 장비 편성';
    $('dialog-content').innerHTML='<p class="dialog-note">'+(locked?'진행 중인 작전에서는 편성을 변경할 수 없습니다.':panel==='maps'?'챕터를 하나씩 통과하면 다음이 열립니다. 뒤 챕터일수록 백신은 거세지지만 인파가 더 몰립니다.':'장비 2종을 선택하세요. 출격 보급량은 인벤토리에서 확인할 수 있습니다.')+'</p><div class="selection-grid">'+(panel==='maps'?config.chapters.map(c=>{const open=config.unlocked(c.n),done=config.progress.cleared.includes(c.n),b=config.bestOf(c.n),st=config.stars(c,b);return '<button class="district-card chapter-card '+(c.n===config.selected?'selected':'')+(open?'':' locked')+'" data-map="'+c.n+'" '+(locked||!open?'disabled':'')+'><div class="district-art art-'+config.maps.findIndex(m=>m.id===c.map)+'"><span>CH '+c.n+'</span>'+(open?'':'<b class="lock">🔒</b>')+'</div><small>'+(done?'통과 · '+'★'.repeat(st)+'☆'.repeat(3-st):open?'미통과':'잠김')+'</small><h3>'+(open?c.name:'???')+'</h3><p>'+(open?'통과선 '+c.quota+'명 · 인파 '+c.crowd+'명':'앞 챕터를 통과하세요.')+'</p><b>'+(c.n===config.selected?'✓ 선택됨':done?'기록 '+b+'명':open?'도전 →':'')+'</b></button>';}).join(''):config.skills.map(s=>'<button class="skill-card '+(config.loadout.includes(s.id)?'selected':'')+'" data-kit="'+s.id+'" '+(locked?'disabled':'')+'><svg style="color:'+s.color+'"><use href="#i-'+s.icon+'"/></svg><h3>'+s.name+'</h3><small>'+s.duration+'</small><p>'+s.copy+'</p><b>'+(config.loadout.includes(s.id)?'✓ 장착됨':'장착하기 ＋')+'</b></button>').join(''))+'</div>';
    if(panel==='loadout'){document.querySelectorAll('.skill-card').forEach(b=>{const s=config.skills.find(x=>x.id===b.dataset.kit);b.querySelector('svg').outerHTML='<img class="equipment-art" src="'+s.art+'" alt="">';b.setAttribute('aria-pressed',String(config.loadout.includes(s.id)));});Panels.apply('loadout');}
    document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{config.selected=Number(b.dataset.map);config.save();showBest();buildTactical();openEquipment(panel);});
    document.querySelectorAll('[data-kit]').forEach(b=>b.onclick=()=>{const id=b.dataset.kit;if(config.loadout.includes(id))return;config.loadout=[config.loadout[1],id];config.save();buildTactical();openEquipment(panel);});
  }
  buildTactical();
  // Read-only snapshot used for repeatable browser smoke checks.
  window.patientZero = { applySettings: () => { resize(); if (typeof sound === 'boolean') sound = Settings.get('sound'); }, testSound: () => { sound = Settings.get('sound'); beep(520, .12); },
    // 테스트 전용 손잡이. 사람을 쫓아다니는 것만으로는 통과선·시간 종료 같은 흐름을 재현할 수 없다.
    debugInvincible: () => { player.hp = 100; player.invincible = 1e6; },
    debugInfect: n => { for (let i = 0; i < n && humans.length; i++) { humans[0].fade = 1; infect(0); } },
    debugScore: () => { while (score < chapter.quota) { if (!humans.length) spawnHuman(true, true); humans[0].fade = 1; infect(0); } },
    snapshot: () => ({ mode, score, level, elapsed, best: best(), chapter: chapter.n, quota: chapter.quota, crowd: chapter.crowd, cleared, map:district.id, mines:mines.length, loadout:[...config.loadout], humans: humans.length, infected: infected.length, medics: medics.length, bullets: bullets.length, assetsReady: PatientZeroVisuals.assetsReady(), player: { ...player }, targets: humans.map(({ x, y }) => ({ x, y })) }) };
})();
