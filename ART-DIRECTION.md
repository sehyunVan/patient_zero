# Generated art

Mode: built-in ImageGen. Reference: user-provided concept board. 게임 이름: PATIENT ZERO(최초 감염자).

Saved assets: `assets/lobby.png`, `assets/plaza.png`, `assets/characters.png`.

## Lobby prompt

Use case: stylized-concept. Asset type: finished wide landscape 1536x1024 key art for a playable anime zombie survival game's lobby background, no UI. Reference image provided is STYLE / MOOD reference only, do not reproduce its collage, labels or panels. Primary request: premium dark cinematic anime illustration of a young adult female zombie protagonist, short messy silver-gray hair, black baseball cap, glowing crimson eyes, mischievous confident smile, oversized black tactical hoodie, reaching toward viewer. Urban apocalypse avenue at dusk, ruined contemporary city, small ominous crowd silhouettes, drifting red embers and deep smoky navy shadows, warm sunset cream light rim-lighting her hair. Composition: character on RIGHT two-thirds, face near upper right third; LEFT third has dark atmospheric ruined city negative space to place a game title and start button with HTML. Close/medium cinematic perspective, exquisite painterly detail, striking brushwork, high-end anime game splash art, muted slate blue black and crimson palette. No gore. No lettering, no text, no interface, no logos, no frames. Generate one illustration, NOT a reference board.

## Arena prompt

Use case: stylized-concept. Asset type: actual game environment background, 1536x1024 landscape. Create an EMPTY isometric anime survival game city plaza seen from elevated three-quarter camera, with detailed small stone square pavement tiles in diagonally receding grid. Dark abandoned contemporary Japanese city at sunset, painterly anime 3D miniature diorama quality. Entire CENTER 80% is flat OPEN walkable pavement, no obstacles in the playable center. Architectural scenery restricted to thin outer border: tall ruined dark buildings in top left and top right, low concrete planters with olive foliage at far outer corners, metal barricade at very far right edge, street lamps at edges, abandoned road along bottom. Ground is dark desaturated gray slate, cracks and subtle debris, long warm dusk shadows from outside frame, cold blue ambient shadows. Beautiful cinematic atmospheric detail, readable planar floor, subtle volumetric light, no heavy blur. No people, characters, monsters, weapons, beams, particles, UI, lettering, HUD, logos or text. All central floor clearly visible. This is a playable background plate, not a screenshot or collage.

## Character atlas prompt

Use case: stylized-concept. Asset type: transparent game character sprite atlas. Create exactly FOUR full-body separate chibi anime game characters in a SINGLE HORIZONTAL ROW, evenly spaced in four equal cells, all same scale and height, feet on same baseline, lots of empty transparent padding between them. Camera elevated three-quarter front view as in isometric tactical RPG. Professional detailed cel-shaded painterly game rendering, 3 heads tall, readable silhouette, miniature 3D anime quality, dark cinematic palette. From LEFT to RIGHT: (1) female young adult zombie hero with short silver gray hair, black baseball cap, black oversized tactical hoodie, crimson glowing eyes, black boots, slight running pose; (2) young adult male civilian, tousled brown hair, navy blue jacket, gray pants, brown sneakers, anxious running pose; (3) young adult female civilian, short dark bob hair, beige hooded jacket, dark pants, sneakers, running pose; (4) vaccine trooper in white helmet with opaque black visor, white and slate armored uniform, carrying futuristic rifle aimed horizontally to the left, subtle cyan gun muzzle. Each whole body visible and separated, NO overlap, NO cast floor shadows, NO terrain or ground, no labels, no text, no borders. Genuinely transparent alpha background. This sheet will be sliced into four equal-width cells.


## Separate lobby artwork — 2026-10-14

Built-in ImageGen; selected asset: `assets/lobby-rooftop-v2.png`. Reference: user's cropped lobby screenshot. First version was rejected for the wrong pose and palette; v2 is the connected asset.

Final prompt: Create only the background illustration of the supplied lobby reference, without UI, text, logos or borders. Wide 16:9. Small-framed adult survivor seen from behind, black cap pointing left, short dark charcoal hair, baggy black hooded jacket and worn tactical backpack. Face almost entirely hidden, body cropped at hips, no exposed thighs. Character occupies center-left; slightly tilted elevated view of dense ruined city rooftops. Dusty mauve, pale peach-pink sky, slate blue-gray buildings, subtle rim light, rough painterly anime brushwork. Dark architectural framing and rightmost 25% shadowed facade for UI. Avoid photorealism, 3D polish, orange blazing sunset, silver hair, front-facing portrait, glamour pose and open river skyline.

## Reference brush logo — 2026-10-14

Built-in ImageGen. Asset: `assets/infection-logo.png`, transparent PNG, used in the start-screen heading. Reference: user's supplied INFECTION logo crop.

Final prompt: Recreate the reference's INFECTION title as a tightly framed transparent 2.3:1 logo. Huge off-white hand-painted dry-brush uppercase lettering leaning forward and rising slightly right; torn bristle edges, distressed scratches and restrained crimson marks. Small crimson crown above the I, thin white crown above middle-right, double tapering crimson underline. Exact handwritten Korean tagline “세상을 감염시켜라.” beneath; “감염” red, remaining text white. No scenery, dark rectangle, mockup, baked checkerboard, smooth italic font or additional text. Preserve the complete lettering, crowns and tagline.

## Rea recruitment — 2026-10-14

Mode: built-in ImageGen. User recruitment screenshot provided as composition and art-style reference. Saved background: `assets/rea-recruit.png`.

Final background prompt: Wide 16:9 production anime game recruitment background without lettering or UI. Adult Rea, short tousled silver hair, crimson eyes, black cap with metal detail, dark earrings, oversized black tactical hooded coat and crimson straps, subtle mischievous smile, tilted three-quarter bust portrait. Head at x64% y30%, shoulders filling center-right. Painterly rough anime brushwork, detailed layered clothing, warm pale rim light. Left third dark ruined city alley with crimson angular streaks and embers for the logo. Dark right shoulder for name. Almost black background, no sunset, river skyline, sexualized pose or interface.

Final logo prompt: Transparent PNG title with exact “PICK UP” above smaller Korean “한정 모집”. Vivid crimson aggressive forward-leaning dry-brush uppercase, irregular bristle ends, rising baseline. White handwritten Korean subheading and double tapered crimson underline. Wide tightly framed composition, genuine alpha, no backdrop, checkerboard pixels, other imagery, glow or bevels. Saved: `assets/pickup-logo.png`.

## 감염자 원화 — 2026-10-14

생성: `tools/gen-infected.mjs` (OpenAI images/edits · `gpt-image-2.5-sunburst` · 키는 `ask-gpt/.env`).
레퍼런스로 `assets/src/characters.png` 를 붙여 같은 결·같은 비율로 뽑았습니다.
결과: `assets/src/infected.png` (1536×1024, 투명) → `assets/infected.webp` (190KB).

**왜 따로 그렸나.** 전에는 주인공 스프라이트(cell 0)에 sepia 필터를 씌워 감염자로 썼습니다 —
화면에 주인공과 똑같이 생긴 것이 수십 개 돌아다녀서, 내가 어디 있는지 알아보기 어려웠습니다.
감염자는 **자기가 입고 있던 시민 옷** 그대로 변합니다(남: 네이비 재킷 = cell 1 / 여: 베이지 후드 = cell 2).
「방금 스친 저 사람이 저렇게 됐다」가 그림만으로 읽히고, 주인공 실루엣과는 절대 겹치지 않습니다.
프롬프트에서 주인공의 표지 셋(검은 모자 · 은발 · 오버사이즈 후드)을 명시적으로 금지했습니다.

자르는 상자(`js/visuals.js` 의 `infectedCrops`)는 알파 경계를 재서 넣은 값입니다.
다시 생성하면 좌표가 달라지므로 같은 방식으로 다시 재서 넣으세요.

## 캐스트 (2026-10-14) — 감염된 아이들 16명

사람은 **넷을 한 장에 그린 뒤 떼어낸다.** 따로 그리면 키·화풍·조명이 어긋나 같은 게임 사람으로 안 보인다.
한 명당 두 판본: **SD**(전투에서 움직이는 치비 3등신)와 **LD**(선택창·로비에 세우는 7.5등신 등신대).

- 시트 정의와 프롬프트 본문: `tools/cast.mjs` (SHEETS · SHEET_PROMPT · LD_PROMPT)
- 굽기: `node tools/gen-cast.mjs` → 떼어내기: `node tools/cut-cast.mjs`
- 결과: `assets/cast/<id>.webp`(SD h512) · `<id>-ld.webp`(LD h1000) · `<id>-face.webp`(320²)

공통으로 거는 규칙 두 문단:

> ALL FOUR are young infected girls: pretty delicate faces, pale skin, and EYES THAT GLOW CRIMSON RED
> with a faint red haze around them. Each one is subtly wrong — a charming girl with something switched
> off behind the eyes, an expression held a beat too long. Cute, not gory: no blood, no wounds, no rot,
> no horror makeup.

> THE BACKGROUND MUST BE FULLY TRANSPARENT EMPTY ALPHA: no backdrop, no gradient, no fog, no glow,
> no vignette, no rim light halo, no floor, no shadow plane, no scenery, not black, not white, not grey.

**배경 투명은 세게 말해야 한다.** 처음엔 API 에 `background:'transparent'` 를 넘기고 프롬프트에는
"Genuinely transparent alpha background" 라고만 썼더니 회색 판이 깔려 나왔다. `cold rim light`,
`cinematic palette` 같은 분위기 말을 빼고 위 문단을 박으니 알파가 제대로 나왔다(네 모서리 알파 0).

## 구역 바닥판 (2026-10-14) — 다섯 장 추가

지하철역 · 공장 지대 · 연구 시설 · 항만 도시 · 폐교 운동장. 프롬프트는 `tools/gen-maps.mjs` 의 MAPS/PROMPT.
핵심은 기존 광장판과 같다 — **가운데 80%는 비어 있는 평평한 바닥**, 구조물은 바깥 테두리에만,
사람·글자·UI 없음. 거기서 전투가 돌기 때문이다.

## 로비 (2026-10-14) — 사람을 지운 판

`assets/lobby-rooftop-empty.webp`. `lobby-rooftop-v2` 를 `images/edits` 에 레퍼런스로 넣고
"같은 옥상, 같은 하늘, 사람만 완전히 제거" 로 다시 구웠다(`tools/gen-lobby.mjs`).
선택한 캐릭터의 LD 가 그 위에 반신으로 서기 때문에, 배경에 사람이 남아 있으면 두 명이 된다.

## 아이콘 (2026-10-14) — 아이템·스킬·재화 아홉

유저가 준 인벤토리 스크린샷이 화풍 레퍼런스다: **광택 있는 모바일 가챠 아이템 아이콘** —
살짝 기울인 3/4 각도, 두꺼운 스페큘러와 위쪽 림라이트, 윤곽선 없는 에어브러시 음영,
재질(금속·플라스틱·유리·종이)이 한눈에 읽히는 채도 높은 물건.

아홉 개를 한 장에 **3×3** 으로 굽고(`tools/gen-icons.mjs`) 칸마다 떼어낸다(`tools/cut-icons.mjs`).
떼어낼 때는 알파가 진한 곳(>140)으로 본체 경계를 잡고 둘레 빛을 10%만 남긴다 —
빛까지 다 잡으면 아이콘마다 크기가 제각각이 된다.

순서: 연막탄 · 가속제 · 회복제 / 감염 지뢰 · 방어막 · 충격파 / 대시 · 모집권 · 조각.
`tools/icons.mjs` 의 ICONS 순서가 곧 칸 순서다.

## 앱 아이콘 (2026-10-14) — 제로의 얼굴

생성: `tools/gen-icon.mjs` (OpenAI images/edits · `gpt-image-2.5-sunburst` · 키는 `ask-gpt/.env`).
「막차 이후」와 같은 방식이다 — **캐릭터 원화 + 장소 원화를 레퍼런스로 붙여, 그 세계 안에서
얼굴이 꽉 찬 1:1 초상**을 다시 굽는다. 레퍼런스는 `assets/cast/zero-ld.webp`(제로 LD)와
`assets/src/lobby.png`(로비 키 아트). 결과 `assets/src/app-icon-zero.png`(1024²).

**글자는 넣지 않는다.** 스토어가 글자 있는 아이콘을 싫어하고, 48px 로 줄이면 제일 먼저 뭉개진다.
작게 읽히게 하려고 머리가 화면의 대부분을 차지하도록 잡았다 — 48·32 에서는 얼굴만 보이면 된다.

크기들은 `tools/bake-icon.mjs` 가 굽는다(→ `icons/`). 함정 둘:
애플은 **알파 채널이 있는 아이콘을 거부**하므로 배경색(#060a10)으로 눌러 평평하게 두고,
안드로이드 적응형(maskable)은 안전 영역이 안쪽 ~80% 라 그림을 72% 로 줄여 가운데 둔다.

## 스토어 홍보 그림 (2026-10-14)

생성: `tools/gen-promo.mjs`. 레퍼런스는 `assets/src/rea-recruit.png`(인물 화풍)과 `lobby.png`(도시).
**한 장으로 다섯 규격을 덮어야 한다**(1024×500 처럼 아주 납작한 것부터 5244×2950 까지).
그래서 프롬프트에서 인물을 오른쪽 1/3 에 두고, 얼굴을 세로 가운데 60% 안에 가두고,
왼쪽 절반은 **비워 두라고** 못 박았다 — 로고 자리이자 납작한 크롭의 여유다.
자르기는 `tools/store-promo.mjs`, 결과는 `site/`. 프롬프트 본문은 그 파일 안에 있다.

## 영어판 그림 (2026-10-14)

화면 글자는 i18n 이 번역하지만 **그림 안에 박힌 글자는 번역되지 않는다.** 그런 그림이 셋이었다.
전부 **원본을 레퍼런스로 붙여 글자만 바꿔** 다시 구웠다 — 새로 그리면 획·왕관·기울기가 달라져
같은 게임 그림으로 안 보인다.

| 그림 | 바꾼 말 | 도구 |
|---|---|---|
| `infection-logo` | 세상을 감염시켜라. → INFECT THE WORLD. | `tools/gen-logo-en.mjs` |
| `pickup-logo` | 한정 모집 → LIMITED RECRUITMENT | `tools/gen-art-en.mjs` |
| `chapter-slogan` | 더 많은 감염을, 더 높은 기록을. → MORE INFECTED. HIGHER RECORDS. | `tools/gen-art-en.mjs` |

뒤 둘은 게임이 언어에 따라 갈아 끼운다(`js/i18n.js` 의 `syncTitleLogo` — 비어 있던 자리에 넣었다).
로고는 티저 합성기(`promo/comp.html`)가 `?lang=en` 일 때 바꿔 쓴다.
