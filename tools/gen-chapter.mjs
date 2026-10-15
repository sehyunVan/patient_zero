// 챕터 선택 화면의 그림 네 장. 레퍼런스 목업을 그대로 재현하려면 손으로 그릴 수 없는 것들이다.
//   node tools/gen-chapter.mjs            # 없는 것만
//   node tools/gen-chapter.mjs frame      # 한 장만
//   node tools/gen-chapter.mjs --force
// 결과는 assets/src/*.png → tools/bake.mjs 가 assets/*.webp 로 굽는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets/src');
const env = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env('C:/Users/sehyu/playground/ask-gpt/.env').OPENAI_API_KEY;

export const PIECES = [
  {
    id: 'chapter-bg', size: '1536x1024',
    name: '챕터 선택 배경',
    prompt:
      'Use case: stylized-concept. Asset type: game menu background plate, 1536x1024 landscape. ' +
      'A ruined post-outbreak city at dusk, seen from under a collapsed overpass. ' +
      'TOP THIRD: a bruised violet-and-slate dusk sky over a far skyline of gutted towers and dead cranes, still faintly readable, the lightest part of the picture. ' +
      'MIDDLE BAND: falls away into deep charcoal haze, almost empty, nothing to catch the eye. ' +
      'BOTTOM THIRD: broken concrete slabs, twisted rebar and a toppled girder sweeping diagonally from the lower left up to the middle right, with one dull red emergency glow low on the left and another bleeding in from the right edge. ' +
      'Desaturated steel-blue and charcoal throughout with only those two muted red glows; painterly anime concept art, soft focus, dust in the air, heavy vignette on all four edges. ' +
      'No people, no characters, no vehicles in focus, no UI, no lettering, no logos, no watermark, no frame, no border.',
  },
  {
    id: 'card-frame', size: '1024x1536', transparent: true,
    name: '찢긴 종이 액자',
    prompt:
      'Use case: game-ui. Asset type: single transparent PNG overlay frame, 1024x1536 portrait. ' +
      'A rectangular border made of TORN WHITE PAPER: the ragged deckled edge of a photograph ripped out of a page, running all the way around a large empty rectangle. ' +
      'The paper band is NARROW — its width is about one fiftieth of the image width, a hairline deckled edge, uneven and wandering in and out; only at the four corners does it widen into a small triangular shred that peels outward. The empty transparent middle must stay huge: the band takes up almost none of the picture. ' +
      'Plain warm white paper with a faint grey fibre edge and a soft inner shadow where it lifts; the tear reads clearly against a dark background. ' +
      'The entire INSIDE of the rectangle is fully transparent and empty — no picture, no fill, no shading, no texture, no paper inside. Outside the frame is fully transparent too. ' +
      'Flat straight-on view, no perspective, no drop shadow, no glow, no colour other than white and grey. ' +
      'No red, no ink, no marker, no lettering, no text, no logo, no characters, no objects.',
  },
  {
    id: 'card-scratch', size: '1024x1536', transparent: true,
    name: '붉은 깁자 틀',
    prompt:
      'Use case: game-ui. Asset type: single transparent PNG overlay, 1024x1536 portrait. ' +
      'A rough rectangle drawn in one go with a dry CRIMSON RED marker: four thin slightly crooked lines, each a little off parallel, overshooting past every corner by a visible tail so the corners cross like a hand-drawn box. ' +
      'The stroke is thin and nervous with dry breaks where the ink skipped, thickening a touch at the two right-hand corners. ' +
      'A couple of loose red flecks and one short slash sit just outside the upper right and lower right corners. ' +
      'Nothing at all inside the rectangle and nothing elsewhere — the rest of the image is fully transparent. ' +
      'Only red ink, no white, no paper, no fill, no glow, no shadow, no lettering, no text, no logo.',
  },
  {
    id: 'chapter-slogan', size: '1536x1024', transparent: true,
    name: '손글씨 표어',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG hand-lettering, 1536x1024 landscape, filling the full width. ' +
      'Two lines of Korean handwriting in a THIN, quick white brush-pen script — light strokes, not a fat marker — written on a slight upward tilt across a fully transparent background. ' +
      'Line one sits at the upper LEFT and ends about two thirds across; line two starts under the MIDDLE of line one and runs to the far right, so the two lines stagger diagonally down to the right and the whole lockup is about two and a half times wider than it is tall. ' +
      'Line one: 더 많은 감염을, — line two: 더 높은 기록을. ' +
      'Spell every Korean syllable exactly as given, nothing added, nothing dropped, no other words. ' +
      'A small hand-drawn white crown doodle sits just above the first syllable of line one. ' +
      'Two fast thin CRIMSON RED brush underlines slash upward beneath the lines, overshooting past the last letters with frayed dry-brush tails. ' +
      'Only the white lettering, the white crown and the red strokes are opaque; everything else is transparent. ' +
      'No box, no panel, no background wash, no shadow, no Latin letters, no numbers.',
  },
  {
    id: 'chapter-logo', size: '1024x1024', transparent: true,
    name: '모서리 로고',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG logo lockup, 1024x1024, centered. ' +
      'The single English word INFECTION in a bold condensed italic display face, painted in CRIMSON RED with a dry eroded edge as if stencil-sprayed, letters leaning right. ' +
      'Directly beneath it, much smaller and wider-tracked, the line THE WORLD IS YOURS. in the same red. ' +
      'To the right of the word, a red biohazard trefoil crossed out by a rough red X stroke. ' +
      'Spell both lines exactly: INFECTION / THE WORLD IS YOURS. ' +
      'Fully transparent background, no panel, no box, no glow, no drop shadow, no Korean text, no extra words.',
  },
  {
    id: 'play-word', size: '1536x1024', transparent: true,
    name: 'PLAY 글씨',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG wordmark, 1536x1024, one word centred and nothing else. ' +
      'The single English word PLAY in a fast slanted brush script, painted in chalky off-white with a faint pink bloom along the strokes and a dry eroded edge, leaning hard to the right as if written in one sweep. ' +
      'A thin crimson red slash cuts diagonally through the final letter and tails off past it. ' +
      'Spell it exactly: PLAY. Nothing else in the image. ' +
      'Fully transparent background, no panel, no box, no frame, no glow plate, no drop shadow, no Korean text, no other words, no numbers.',
  },
  {
    id: 'brush-marks', size: '1024x1024', transparent: true,
    name: '붓 자국 두 개',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG, 1024x1024, exactly two separate brush marks and nothing else. ' +
      'LEFT HALF: one single horizontal CRIMSON RED dry-brush stroke, thick at the left end and tapering to a frayed point at the right, tilted so the right end rides a little higher; painted in one confident sweep with dry gaps in the ink. ' +
      'RIGHT HALF: one small WHITE scratch mark made of two short crossing claw strokes forming a loose X, like a knife slash, thin and tapered at every tip. ' +
      'The two marks do not touch and sit well apart with wide empty margins. ' +
      'Everything else is fully transparent — no background, no panel, no box, no glow, no shadow, no lettering, no text, no logo, no other shapes.',
  },
  {
    id: 'title-slash-src', size: '1536x1024', transparent: true,
    name: '제목 밑줄',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG, 1536x1024, one single brush stroke and nothing else. ' +
      'A LONG, VERY THIN horizontal crimson red dry-brush stroke lying across the middle of the frame: it starts blunt at the left, stays a hairline through the middle and tapers to a frayed point at the right, and the right end rides slightly higher than the left. ' +
      'At its blunt left end the stroke is about one twelfth of the image height thick, and from there it narrows steadily to nothing at the right tip — one clean tapered slash, not a bar, not a smear, not a bundle of parallel strands, with a couple of dry gaps where the ink skipped. ' +
      'Everything else is fully transparent — no second stroke, no background, no panel, no glow, no shadow, no lettering, no text.',
  },
  {
    id: 'chapter-rewards', size: '1024x1024', transparent: true,
    name: '보상 아이콘 두 개',
    prompt:
      'Use case: game-ui. Asset type: transparent PNG icon sheet, 1024x1024, exactly two icons side by side on one row, each centred in its own half, nothing else in the image. ' +
      'LEFT half: a faceted crystal shard shaped like a rounded shield, glowing ice-blue and violet, with a bright specular edge and a thin dark outline. ' +
      'RIGHT half: a closed wooden-and-steel supply crate seen three-quarters from above, scuffed olive planks, riveted metal corner bands, a stencilled red cross faded on the lid. ' +
      'Both icons painted in the same glossy semi-realistic mobile-game style, matched scale, matched lighting from the upper left, same thin dark outline. ' +
      'Fully transparent background, generous empty margin around each icon, no plate, no circle, no frame, no shadow on the ground, no lettering, no numbers, no text.',
  },
];

const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
fs.mkdirSync(SRC, { recursive: true });

for (const p of PIECES) {
  if (only.length && !only.includes(p.id)) continue;
  const out = path.join(SRC, p.id + '.png');
  if (fs.existsSync(out) && !force) { console.log('skip', p.id); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const body = { model: 'gpt-image-2.5-sunburst', prompt: p.prompt, size: p.size, n: 1 };
    if (p.transparent) body.background = 'transparent';
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) { console.log(p.id, 'HTTP', r.status, (await r.text()).slice(0, 200)); continue; }
    const b64 = (await r.json()).data?.[0]?.b64_json;
    if (!b64) { console.log(p.id, 'no image'); continue; }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log('OK ' + p.id + '.png', (fs.statSync(out).size / 1024 | 0) + 'KB —', p.name);
    break;
  }
}
