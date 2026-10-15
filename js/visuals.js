/* Hand-authored Canvas effects layered over generated, local game art. */
window.PatientZeroVisuals = (() => {
  const images = {};
  for (const name of ['plaza', 'characters', 'infected']) { images[name] = new Image(); images[name].src = `assets/${name}.webp`; }
  const TAU = Math.PI * 2;
  // Alpha bounds preserve complete silhouettes, including the trooper's long rifle.
  const crops = [{ x: 17, y: 22, w: 468, h: 675 }, { x: 614, y: 24, w: 381, h: 674 }, { x: 1160, y: 41, w: 319, h: 658 }, { x: 1608, y: 31, w: 520, h: 664 }];
  // 감염자는 제 옷을 입은 채 변한다 — 시민 2종(남·여)에 대응하는 별도 원화다. 주인공 스프라이트는 절대 쓰지 않는다.
  const infectedCrops = [{ x: 163, y: 28, w: 458, h: 951 }, { x: 917, y: 91, w: 448, h: 893 }];
  const sprites = [], infectedSprites = [];
  // 구역 바닥판과 주인공 SD 는 고른 것만 받는다 — 여덟 구역·스무 명을 미리 받으면 폰에서 몇 MB 다.
  const lazy = {};
  function image(src) { if (!lazy[src]) { const img = new Image(); img.src = src; lazy[src] = img; } return lazy[src]; }
  const floor = src => { const img = src ? image(src) : images.plaza; return ready(img) ? img : ready(images.plaza) ? images.plaza : null; };
  function slice(image, crop, height) {
    const buffer = document.createElement('canvas'); buffer.height = height; buffer.width = Math.ceil(height * crop.w / crop.h);
    buffer.getContext('2d').drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, buffer.width, height); return buffer;
  }
  images.characters.addEventListener('load', () => { for (const crop of crops) sprites.push(slice(images.characters, crop, 200)); });
  images.infected.addEventListener('load', () => { for (const crop of infectedCrops) infectedSprites.push(slice(images.infected, crop, 200)); });
  const ready = image => image.complete && image.naturalWidth > 0;
  function ellipse(c, x, y, rx, ry, color, stroke = false) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); if (stroke) { c.strokeStyle = color; c.stroke(); } else { c.fillStyle = color; c.fill(); } }
  function glow(c, x, y, r, color) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  function character(c, p, type, time, H) {
    const hero = type === 'player', zombie = type === 'zombie', medic = type === 'medic';
    const depth = .85 + p.y / H * .23, height = (hero ? 84 : medic ? 76 : 65) * depth;
    const cell = hero ? (p.character?.cell || 0) : medic ? 3 : p.variant || 1;
    // 감염자는 감염자 원화에서, 나머지는 캐릭터 아틀라스에서 — 주인공과 같은 그림을 쓰는 경우는 없다.
    let sprite = zombie ? infectedSprites[cell - 1] : sprites[cell], crop = zombie ? infectedCrops[cell - 1] : crops[cell];
    if (hero && p.character?.id) { const own = image('assets/cast/' + p.character.id + '.webp'); if (ready(own)) { sprite = own; crop = { w: own.naturalWidth, h: own.naturalHeight }; } }
    const width = height * crop.w / crop.h, stride = Math.sin(time * (hero ? 13 : 9) + p.x * .11), moving = hero ? p.moving || p.dash > 0 : !medic;
    // 맵 밖으로 걸어 나가는 감염자와 막 도착한 사람은 깜빡 나타났다 사라지지 않고 흐려진다.
    const alpha = zombie ? Math.min(1, p.life) : p.fade < 1 ? p.fade : 1;
    c.save(); if (alpha < 1) c.globalAlpha = alpha;
    ellipse(c, p.x + 2, p.y + 1, width * .3, 5 * depth, '#05080d85');
    if (hero || zombie) {
      glow(c, p.x, p.y - 9, hero ? 57 : 29, hero ? '#f3203549' : '#e72f3230');
      if (hero) { c.lineWidth = 1.7; ellipse(c, p.x, p.y + 2, 28, 12, '#ff485eb5', true); ellipse(c, p.x, p.y + 2, 35 + Math.sin(time * 4) * 2, 16, '#ff405638', true); }
    }
    c.save(); c.translate(p.x, p.y - (moving ? Math.abs(stride) * 2.5 : 0));
    if (moving) c.rotate(stride * .035);
    const faceLeft = medic ? p.dx > 0 : hero ? p.dx < -.1 : Math.cos(p.angle || 0) < 0;
    if (faceLeft) c.scale(-1, 1);
    if (hero && p.invincible > 0 && Math.floor(time * 18) % 2) c.globalAlpha *= .4;
    if (sprite) c.drawImage(sprite, -width / 2, -height, width, height);
    else { c.fillStyle = medic ? '#e4eaf2' : hero ? '#f34154' : zombie ? '#8f5a66' : '#7690a8'; c.fillRect(-9, -28, 18, 24); ellipse(c, 0, -35, 9, 10, c.fillStyle); }
    c.restore();
    // 감염자 원화는 눈이 이미 빛난다 — 눈점은 주인공에게만 얹는다.
    if (hero) { c.save(); c.shadowColor = '#ff273e'; c.shadowBlur = 9; c.fillStyle = '#ff354a'; c.fillRect(p.x - 5, p.y - height * .72, 3, 2); c.fillRect(p.x + 1, p.y - height * .72, 3, 2); c.restore(); }
    if (hero && p.shield > 0) {
      const g = c.createRadialGradient(p.x - 8, p.y - 42, 6, p.x, p.y - 34, 47); g.addColorStop(0, '#76b9ff08'); g.addColorStop(.8, '#7accff24'); g.addColorStop(1, '#b8e8ff99');
      ellipse(c, p.x, p.y - 33, 40, 49, g); c.lineWidth = 1.5; ellipse(c, p.x, p.y - 33, 40, 49, '#a2e2ffc0', true);
      c.strokeStyle = '#89cfff66'; c.beginPath(); c.moveTo(p.x, p.y - 78); c.lineTo(p.x, p.y + 10); c.stroke();
    }
    if (hero) { c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.fillStyle = '#fff1f3'; c.shadowColor = '#000'; c.shadowBlur = 5; c.fillText(p.character?.name || 'YOU', p.x, p.y - height - 9); c.shadowBlur = 0; }
    if (medic && p.aim > 0) { c.font = '8px monospace'; c.textAlign = 'center'; c.fillStyle = '#9bdbff'; c.fillText('VACCINE', p.x, p.y - height - 6); }
    c.restore();
  }
  function render(c, v, state) {
    const { district, mines = [], W, H, elapsed: t, player, humans, medics, infected, bullets, items, rings, particles, floats, shake } = state;
    const dpr = Math.min(devicePixelRatio || 1, 2); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#101722'; c.fillRect(0, 0, v.width, v.height);
    const plate = floor(district?.art);
    if (plate) { c.globalAlpha = .35; c.drawImage(plate, 0, 0, v.width, v.height); c.globalAlpha = 1; }
    c.save(); c.translate(v.x, v.y); c.scale(v.scale, v.scale);
    c.beginPath(); c.rect(0, 0, W, H); c.clip();
    if (shake > 0) c.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    if (plate) c.drawImage(plate, 0, 0, W, H);
    else { c.fillStyle = '#29313d'; c.fillRect(0, 0, W, H); }
    c.fillStyle = '#08142626'; c.fillRect(0, 0, W, H);
    c.fillStyle=district.tint;c.fillRect(0,0,W,H);
    for(const m of mines) {glow(c,m.x,m.y,28,'#ff344d44');ellipse(c,m.x,m.y,12,6,'#35212a');c.strokeStyle='#ff6575';c.lineWidth=2;ellipse(c,m.x,m.y,18+Math.sin(t*5)*3,9,'#ff6575',true);}
    if(player.smoke>0){for(let i=0;i<9;i++) {const a=i/9*TAU+t*.3;glow(c,player.x+Math.cos(a)*48,player.y-30+Math.sin(a)*25,66,'#b3bed44a');}}
    if(player.boost>0){c.strokeStyle='#62e7ff';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(player.x-player.dx*(25+i*9),player.y-15-i*7);c.lineTo(player.x-player.dx*(55+i*9),player.y-15-i*7);c.stroke();}}
    // Direction locks at the start of a shot: aim lines are honest dodge cues.
    for (const m of medics) if (m.aim > 0) {
      c.save(); c.strokeStyle = `rgba(108,207,255,${.16 + (.7 - m.aim) * .55})`; c.setLineDash([9, 10]); c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(m.x, m.y - 27); c.lineTo(m.x + m.dx * 1400, m.y - 27 + m.dy * 1400); c.stroke(); c.restore();
      glow(c, m.x + m.dx * 18, m.y - 27, 17 + (.7 - m.aim) * 15, '#51baffaa');
    }
    // 바닥 보급품은 UI 와 같은 그림을 쓴다 — 주운 것이 어느 칸으로 들어가는지 눈으로 이어지게.
    for (const item of items) {
      const bob = Math.sin(t * 3 + item.x) * 3;
      glow(c, item.x, item.y, 30, '#689fff3c'); ellipse(c, item.x, item.y + 3, 16, 7, '#0c132aba');
      const art = image('assets/icons/' + (item.type === 'heal' ? 'heal' : item.type) + '.webp');
      if (ready(art)) c.drawImage(art, item.x - 19, item.y - 40 + bob, 38, 38);
      else {
        c.save(); c.translate(item.x, item.y - 12 + bob); c.rotate(Math.PI / 4); c.fillStyle = '#17283ff0'; c.strokeStyle = '#8ccfffaa'; c.lineWidth = 1.5; c.fillRect(-12, -12, 24, 24); c.strokeRect(-12, -12, 24, 24); c.restore();
        c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillStyle = '#c8ebff'; c.fillText(item.type === 'shield' ? 'Q' : item.type === 'pulse' ? 'E' : '+', item.x, item.y - 7 + bob);
      }
    }
    const actors = [...humans.map(p => ({ p, type: 'human' })), ...infected.map(p => ({ p, type: 'zombie' })), ...medics.map(p => ({ p, type: 'medic' })), { p: player, type: 'player' }];
    actors.sort((a, b) => a.p.y - b.p.y);
    for (const a of actors) character(c, a.p, a.type, t, H);
    for (const b of bullets) {
      c.save(); c.translate(b.x, b.y - 27); c.rotate(Math.atan2(b.vy, b.vx));
      c.shadowColor = '#39adff'; c.shadowBlur = 18;
      const gradient = c.createLinearGradient(-34, 0, 8, 0); gradient.addColorStop(0, '#1684ff00'); gradient.addColorStop(.7, '#219fffcc'); gradient.addColorStop(1, '#c3f4ff');
      c.fillStyle = gradient; c.beginPath(); c.moveTo(-38, 0); c.lineTo(6, -4); c.lineTo(12, 0); c.lineTo(6, 4); c.closePath(); c.fill();
      c.fillStyle = '#efffff'; c.fillRect(-5, -1.5, 15, 3); c.restore();
    }
    for (const r of rings) { c.globalAlpha = Math.min(1, r.life / .55); c.lineWidth = 3; ellipse(c, r.x, r.y - 5, r.r, r.r * .6, r.color, true); c.lineWidth = 1; ellipse(c, r.x, r.y - 5, r.r * .87, r.r * .53, r.color, true); } c.globalAlpha = 1;
    for (const p of particles) { c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.color; c.fillRect(p.x, p.y - 18, 3, 3); } c.globalAlpha = 1;
    for (const f of floats) { c.globalAlpha = Math.min(1, f.life); c.fillStyle = '#ff8d99'; c.font = 'bold 18px monospace'; c.textAlign = 'center'; c.fillText(f.text, f.x, f.y - 42); } c.globalAlpha = 1;
    // Deterministic drifting embers; no extra simulation entities are allocated.
    for (let i = 0; i < 23; i++) { const x = (i * 173 + t * (8 + i % 5)) % W, y = (i * 127 - t * 17 % H + H) % H; c.globalAlpha = .15 + Math.sin(i + t) * .12; c.fillStyle = i % 3 ? '#ff6852' : '#b8d9f7'; c.fillRect(x, y, 2, 2); } c.globalAlpha = 1;
    c.restore();
    // 미니맵은 캔버스 크기를 따라간다 — 세계 비율이 화면마다 달라지므로 좌표를 고정값으로 박지 않는다.
    const map = document.getElementById('minimap'), mini = map.getContext('2d'), pad = 7;
    const mw = map.width, mh = map.height, iw = mw - pad * 2, ih = mh - pad * 2;
    mini.clearRect(0, 0, mw, mh); mini.fillStyle = '#0d1724'; mini.fillRect(0, 0, mw, mh); mini.strokeStyle = '#7294ba12';
    for (let x = 10; x < mw; x += 20) { mini.beginPath(); mini.moveTo(x, 0); mini.lineTo(x, mh); mini.stroke(); }
    
    for (const [list, color, size] of [[humans, '#8b9aa9', 1.7], [infected, '#ec344e', 2], [medics, '#77d8ff', 3]]) for (const p of list) { mini.fillStyle = color; mini.fillRect(pad + p.x / W * iw, pad + p.y / H * ih, size, size); }
    mini.fillStyle = '#ff4661'; mini.beginPath(); mini.arc(pad + player.x / W * iw, pad + player.y / H * ih, 3.1, 0, TAU); mini.fill();
  }
  return { render, preload: src => src && image(src), assetsReady: () => Object.values(images).every(ready) };
})();
