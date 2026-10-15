// 감염자 캐스트 — 한 장에 넷씩 같이 그린 뒤 한 명씩 떼어낸다.
// 따로 그리면 키·화풍·조명이 어긋나서 같은 게임 캐릭터로 안 보인다.
// 여기 적힌 look 이 그림(gen-cast.mjs)과 도감 설명(js/progression.js)의 같은 출처다.
export const SHEETS = [
  {
    file: 'cast-a',
    cast: [
      { id: 'kai',  name: '카이',
        look: 'short messy platinum-silver undercut with one red streak, black tactical bomber jacket with crimson straps, bike shorts, goggles pushed up on her forehead, lopsided confident grin, one hand in her pocket, leaning forward as if about to bolt' },
      { id: 'noa',  name: '노아',
        look: 'long lavender hair in a low side braid, oversized pale lab coat worn open over a black turtleneck dress, thin glasses slipping down her nose, a cracked clipboard hugged to her chest, gentle vacant smile, head tilted too far to one side' },
      { id: 'ash',  name: '애쉬',
        look: 'ash-blonde hair in a blunt bob with a red hairpin, heavy quilted dark-olive coat two sizes too big, thick scarf, bandages wrapped around both forearms, hands balled into fists, stubborn flat stare' },
      { id: 'yuki', name: '유키',
        look: 'very long white-silver twin braids, dark grey hooded duffel coat with the hood up, oversized mittens, small backpack, soft shy smile that does not reach her eyes, standing very still with her toes turned inward' },
    ],
  },
  {
    file: 'cast-b',
    cast: [
      { id: 'rin',  name: '린',
        look: 'high dark-navy ponytail, bright red cropped track jacket over a black sports top, running shorts, big headphones around her neck, mid-stride sprint pose, mouth open in a silent laugh' },
      { id: 'sera', name: '세라',
        look: 'lavender-pink twin side-tails tied with ribbons, oversized cream knit sweater over a pleated skirt, one sock slipping down, hugging a torn teddy bear, tears on her cheeks while smiling brightly' },
      { id: 'nova', name: '노바',
        look: 'wavy crimson-black hair past her waist, long black tailored coat with a high collar, red gloves, a single earring, elegant composed posture, slow unsettling smile with one eyebrow raised' },
      { id: 'aya',  name: '아야',
        look: 'messy short brown hair with a cowlick, grey hoodie with a surgical mask pulled under her chin, baggy cargo pants, bandage on one cheek, doubled over giggling with both hands over her mouth' },
    ],
  },
  {
    file: 'cast-c',
    cast: [
      { id: 'hoshi', name: '호시',
        look: 'pale mint-green short hair with a star-shaped clip, dark sailor uniform with a red neckerchief, knee socks, holding a dead flashlight, looking up and away at nothing with her mouth slightly open' },
      { id: 'eve',   name: '이브',
        look: 'waist-length jet-black straight hair with blunt bangs, white hospital gown layered over black leggings, an IV line still taped to one hand, barefoot, arms hanging loose, serene empty expression' },
      { id: 'neri',  name: '네리',
        look: 'short choppy teal hair, sleeveless dark utility vest over a mesh top, fingerless gloves, a toolbelt of spray cans, crouched low on the balls of her feet, sharp teeth bared in a playful snarl' },
      { id: 'mina',  name: '미나',
        look: 'long ash-pink wavy hair, torn white nurse coat over a black dress, a large empty syringe held like a pen, half-lidded dreamy eyes, blowing a small bubble of gum' },
    ],
  },
  {
    file: 'cast-d',
    cast: [
      // 제로는 로비 키 아트의 그 아이다 — 생김새를 바꾸면 표지와 따로 논다.
      { id: 'zero', name: '제로',
        look: 'short messy silver-grey hair under a black baseball cap worn slightly crooked, oversized black tactical hoodie with crimson lining, shorts and heavy boots, hands in her hoodie pocket, mischievous confident grin with one fang showing' },
      { id: 'yuna', name: '유나',
        look: 'long straight black hair with one bleached white streak, deep red duffel coat over a school uniform, knee socks, holding a cracked phone up in both hands and smiling down at its dead screen' },
      { id: 'rune', name: '루네',
        look: 'short curly ash-purple hair, oversized varsity jacket with the sleeves swallowing her hands, roller skates, arms stretched out wide to keep her balance, delighted open-mouthed laugh' },
      { id: 'sana', name: '사나',
        look: 'honey-blonde hair in a messy bun with loose strands, a stained apron over a long black dress, holding an empty serving tray flat on one palm, polite hostess smile stretched a little too wide' },
    ],
  },
  {
    file: 'cast-e',
    cast: [
      // 레아는 픽업 배너의 그 아이다 — assets/rea-recruit.png 의 생김새를 그대로 따른다.
      { id: 'rea',  name: '레아',
        look: 'long messy silver-white hair falling past her shoulders, a black baseball cap with a small red emblem worn low, black military coat with crimson harness straps and buckles over a dark top, long black earrings, sharp fanged smirk with her chin tilted down' },
      { id: 'mio',  name: '미오',
        look: 'long straight jet-black hime-cut hair with a wide red ribbon, dark crimson high-collar school coat over a pleated skirt, white knee socks, holding a paper lantern that has gone out, perfectly straight posture and a thin closed-mouth smile' },
      { id: 'tama', name: '타마',
        look: 'very small and round, short tangerine hair under an oversized grey hood with cat ears, baggy patched overalls, holding a broken toy radio to one ear, eyes squeezed into happy crescents with her mouth wide open' },
      { id: 'iris', name: '이리스',
        look: 'tall and willowy, long wavy ash-white hair, a heavy military greatcoat draped over a black dress, leather gloves, a black eyepatch over her left eye while the right glows crimson, chin raised and looking down at the viewer' },
    ],
  },
];

// 감염된 눈·미소녀·어딘가 어긋난 분위기는 두 판본에 공통이다. 한 문단으로 묶어 둔다.
const INFECTED =
  'ALL FOUR are young infected girls: pretty delicate faces, pale skin, and EYES THAT GLOW CRIMSON RED with a faint red haze around them. ' +
  'Each one is subtly wrong — a charming girl with something switched off behind the eyes, an expression held a beat too long. ' +
  'Cute, not gory: no blood, no wounds, no rot, no horror makeup. ';
const NO_BACKDROP =
  // 배경을 한 번 더 못 박는다 — 대기·림라이트를 말하면 모델이 뒤에 판을 깔아 버린다(2026-10-14).
  'THE BACKGROUND MUST BE FULLY TRANSPARENT EMPTY ALPHA: no backdrop, no gradient, no fog, no glow, no vignette, ' +
  'no rim light halo, no floor, no shadow plane, no scenery, not black, not white, not grey. ';

// LD — 캐릭터 선택창에 세우는 등신대 일러스트. SD 와 같은 설명을 쓰되 비율과 화풍만 올린다.
export const LD_PROMPT = sheet =>
  'Use case: stylized-concept. Asset type: transparent character standee sheet for a mobile game roster screen. ' +
  'Create exactly FOUR full-body anime characters in a SINGLE HORIZONTAL ROW, evenly spaced in four equal cells, ' +
  'all the same scale and height, feet on the same baseline, lots of empty transparent padding between them. ' +
  'Realistic slender anime proportions, about 7.5 heads tall — NOT chibi, NOT deformed. ' +
  'Standing straight and facing the viewer in a confident idle pose, full body visible from head to boots, front view at eye level. ' +
  'Premium gacha-game character illustration: crisp lineart, rich cel shading with soft gradients, detailed fabric and metal, ' +
  'costumes in slate blue, black and crimson, flat even character lighting. ' +
  INFECTED +
  'From LEFT to RIGHT: ' + sheet.cast.map((c, i) => `(${i + 1}) ${c.look}`).join('; ') + '. ' +
  'Each whole body visible and clearly separated, NO overlap, no cast shadow, no ground, no labels, no text, no borders, no frames. ' +
  NO_BACKDROP +
  'This sheet will be sliced into four equal-width cells.';

// SD — 전투 화면에서 움직이는 작은 몸.
export const SHEET_PROMPT = sheet =>
  'Use case: stylized-concept. Asset type: transparent game character sprite atlas. ' +
  'Create exactly FOUR full-body separate chibi anime game characters in a SINGLE HORIZONTAL ROW, ' +
  'evenly spaced in four equal cells, all the same scale and height, feet on the same baseline, ' +
  'with lots of empty transparent padding between them. Camera elevated three-quarter front view as in an isometric tactical RPG. ' +
  'Professional detailed cel-shaded painterly game rendering, 3 heads tall, readable silhouette, miniature 3D anime quality, ' +
  'costumes in slate blue, black and crimson. Flat even character lighting only. ' +
  // 배경을 한 번 더 못 박는다 — 대기·림라이트를 말하면 모델이 뒤에 판을 깔아 버린다(2026-10-14).
  'THE BACKGROUND MUST BE FULLY TRANSPARENT EMPTY ALPHA: no backdrop, no gradient, no fog, no glow, no vignette, ' +
  'no rim light halo, no floor, no shadow plane, no scenery, not black, not white, not grey. ' +
  INFECTED +
  'From LEFT to RIGHT: ' +
  sheet.cast.map((c, i) => `(${i + 1}) ${c.look}`).join('; ') + '. ' +
  'Each whole body visible and clearly separated, NO overlap, NO cast floor shadows, NO terrain or ground, ' +
  'no labels, no text, no borders, no frames. ' + NO_BACKDROP +
  'This sheet will be sliced into four equal-width cells.';
