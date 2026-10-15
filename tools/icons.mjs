// 아이콘 목록과 프롬프트. 굽는 쪽(gen-icons)과 자르는 쪽(cut-icons)이 같이 본다.
// 자르는 쪽(cut-icons.mjs)과 쓰는 쪽(js/*)이 같은 순서를 본다. 왼쪽 위부터 오른쪽 아래로.
export const ICONS = [
  { id: 'smoke',    name: '연막탄',   look: 'a matte dark-grey smoke grenade canister standing upright, crimson band and pull ring, thin pale smoke curling from the top' },
  { id: 'boost',    name: '가속제',   look: 'a cyan stimulant auto-injector pen, glass window showing glowing cyan fluid, dark metal grip, small lightning glyph etched on it' },
  { id: 'heal',     name: '회복제',   look: 'a thick glass vial of glowing crimson serum with a dark metal cap, a red cross glyph etched on the glass' },
  { id: 'mine',     name: '감염 지뢰', look: 'a flat disc-shaped proximity mine, dark steel with amber warning stripes and three glowing crimson sensor lights on top' },
  { id: 'shield',   name: '방어막',   look: 'a translucent pale-blue hexagonal energy barrier emitter: a dark metal puck projecting a glowing blue hex shield plate above it' },
  { id: 'pulse',    name: '충격파',   look: 'a violet shockwave emitter orb: a dark sphere with a violet lightning bolt glyph, concentric violet rings bursting outward' },
  { id: 'dash',     name: '대시',     look: 'a crimson speed glyph: a sharp forward-leaning double chevron with trailing motion streaks, dark metal plate behind it' },
  { id: 'ticket',   name: '모집권',   look: 'a single recruitment ticket: a dark card with a notched edge and a gold border, a small crimson biohazard-like emblem stamped in the middle' },
  { id: 'fragment', name: '조각',     look: 'three glowing crimson crystal shards of different sizes resting together, sharp faceted edges, dark cores with bright red inner light' },
];

export const PROMPT =
  'Use case: stylized-concept. Asset type: transparent game item icon sheet. ' +
  'Create exactly NINE separate game item icons arranged in a clean 3x3 GRID, three rows of three, evenly spaced, ' +
  'each icon centered in its own equal cell with generous empty transparent padding around it, all the same visual size. ' +
  // 유저가 준 인벤토리 스크린샷의 화풍: 광택 있는 모바일 가챠 아이템 아이콘 (2026-10-14)
  'STYLE: glossy painted mobile-game inventory item icons, like a premium gacha RPG inventory grid. ' +
  'Each object is a semi-realistic painted 3D render tilted at a slight three-quarter angle, ' +
  'chunky rounded readable silhouette filling its cell, thick soft specular highlights and a bright rim light along the top edge, ' +
  'rich saturated colors against the transparent background, smooth airbrushed shading with no hard outlines and no cel shading, ' +
  'materials clearly readable — brushed dark metal, scuffed plastic, thick glass, worn paper. ' +
  'Crimson and cyan emissive accents, soft inner glow where something is lit. ' +
  'Row 1 left to right: ' + ICONS.slice(0, 3).map((i, n) => `(${n + 1}) ${i.look}`).join('; ') + '. ' +
  'Row 2 left to right: ' + ICONS.slice(3, 6).map((i, n) => `(${n + 4}) ${i.look}`).join('; ') + '. ' +
  'Row 3 left to right: ' + ICONS.slice(6, 9).map((i, n) => `(${n + 7}) ${i.look}`).join('; ') + '. ' +
  'Each icon fully separated, NO overlap, no cast shadow, no ground, no plinth, no frames, no boxes around them, ' +
  'no labels, no text, no letters, no numbers, no watermark. ' +
  'THE BACKGROUND MUST BE FULLY TRANSPARENT EMPTY ALPHA: no backdrop, no gradient, no fog, no vignette, not black, not white, not grey. ' +
  'This sheet will be sliced into nine equal cells.';

