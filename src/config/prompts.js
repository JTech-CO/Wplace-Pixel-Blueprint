// 백서 §4.1 — Pipeline A 시스템 인스트럭션 / Pipeline B 이미지 생성 프롬프트.
// 시점(2D 평면 vs 2.5D 조감도)을 인자로 분기한다.
//
// 2026-05 업데이트 — 클라이언트 양자화 단계가 "흰색 배경 + 어두운 outline" 패턴을
// 가정해 subject mask 를 추출하기 때문에, 모델 출력 자체가 이 패턴을 따르도록
// 프롬프트에서 강하게 요구한다.

export const PERSPECTIVES = {
  TWO_D: '2D',
  ISO: '2.5D',
};

export const PERSPECTIVE_OPTIONS = [
  {
    value: PERSPECTIVES.ISO,
    label: '2.5D · 조감도',
    sub: '이소메트릭 쿼터뷰',
  },
  {
    value: PERSPECTIVES.TWO_D,
    label: '2D · 평면',
    sub: '정면 아이콘 / 스티커',
  },
];

const SYSTEM_INSTRUCTION_A_ISO = `You are a master of isometric 2.5D pixel art design for sandbox tycoon games.
Analyze the uploaded building/structure image and reinterpret it as a cute,
miniature-style pixel art blueprint sized exactly WIDTH x HEIGHT cells.

[Rules]
1. Reinterpretation, not filtering: do NOT just downscale/blur. Redraw the
   iconic features (roof style, windows, primary colors); ignore messy background.
2. Perspective: 2.5D isometric (quarter-view, ~30° axes). Reads as a miniature
   toy-city object. Show two visible side faces and the top where applicable.
   Do NOT render as a flat front-only icon.
3. Outline (CRITICAL): draw a clear DARK outline (black or near-black) around
   the entire subject silhouette. The outline must be continuous — no gaps.
4. Palette: use a small, vibrant palette (<= 16 hex colors). Merge similar
   colors so a human can count and hand-place them on a grid. No gradients.
5. Background & isolation (CRITICAL):
   - ALL cells outside the subject silhouette MUST use index -1 (transparent).
   - Treat the area outside the subject as completely empty.
   - Do NOT scatter decorative pixels, sparkles, noise dots, or stray
     colored squares anywhere outside the subject.
   - The subject must be ONE connected silhouette with no detached fragments.
6. Output: fill cells row by row (y from 0..HEIGHT-1, x from 0..WIDTH-1).
   Use palette indices. For fully transparent cells use index -1.
   Encode each row as run-length pairs [paletteIndex, runLength].`;

const SYSTEM_INSTRUCTION_A_2D = `You are a master of flat 2D pixel art design for sandbox tycoon games.
Analyze the uploaded building/structure image and reinterpret it as a cute,
icon/sticker-style pixel art blueprint sized exactly WIDTH x HEIGHT cells.

[Rules]
1. Reinterpretation, not filtering: do NOT just downscale/blur. Redraw the
   iconic features (roof style, windows, primary colors); ignore messy background.
2. Perspective: clean orthographic FRONT view, reads as a flat icon/sticker.
   Symmetric silhouette preferred. Single front-facing plane only.
3. Outline (CRITICAL): draw a clear DARK outline (black or near-black) around
   the entire subject silhouette. The outline must be continuous — no gaps.
4. Palette: use a small, vibrant palette (<= 16 hex colors). Merge similar
   colors so a human can count and hand-place them on a grid. No gradients.
5. Background & isolation (CRITICAL):
   - ALL cells outside the subject silhouette MUST use index -1 (transparent).
   - Treat the area outside the subject as completely empty.
   - Do NOT scatter decorative pixels, sparkles, noise dots, or stray
     colored squares anywhere outside the subject.
   - The subject must be ONE connected silhouette with no detached fragments.
6. Output: fill cells row by row (y from 0..HEIGHT-1, x from 0..WIDTH-1).
   Use palette indices. For fully transparent cells use index -1.
   Encode each row as run-length pairs [paletteIndex, runLength].`;

export function buildSystemInstructionA(width, height, perspective = PERSPECTIVES.ISO) {
  const tpl = perspective === PERSPECTIVES.TWO_D
    ? SYSTEM_INSTRUCTION_A_2D
    : SYSTEM_INSTRUCTION_A_ISO;
  return tpl.replaceAll('WIDTH', String(width)).replaceAll('HEIGHT', String(height));
}

export function buildUserPromptA(width, height, perspective = PERSPECTIVES.ISO) {
  const common =
    'Use a clear dark outline around the subject and leave the entire surrounding area empty (index -1). No scattered pixels, no noise dots anywhere outside the silhouette.';
  if (perspective === PERSPECTIVES.TWO_D) {
    return `Reinterpret this building as a ${width}x${height} flat 2D miniature pixel-art blueprint for Wplace. Clean front view, icon/sticker style. ${common}`;
  }
  return `Reinterpret this building as a ${width}x${height} miniature 2.5D isometric pixel-art blueprint for Wplace. Quarter-view, cute toy-city look. ${common}`;
}

export function buildImageGenPromptB(perspective = PERSPECTIVES.ISO) {
  const view = perspective === PERSPECTIVES.TWO_D
    ? 'clean orthographic FRONT view (flat icon/sticker style, NO isometric or 2.5D angles)'
    : '2.5D isometric quarter-view (cute miniature toy-city look, ~30° axes)';
  return `Generate a PNG illustration in clean miniature pixel-art style.

[Subject]
The building/structure shown in the reference image, rendered as ${view}.

[Style]
- Small vibrant palette (<= 16 colors)
- No gradients, no photo realism, no fake lighting noise
- Crisp, contiguous shapes

[Outline — CRITICAL]
- Draw a clear DARK outline (black or near-black, #000000 to #222222) around
  the entire subject silhouette.
- The outline must be CONTINUOUS — no gaps, no broken segments. This dark
  border is what separates the subject from the white background.

[Background — CRITICAL]
- The ENTIRE background MUST be SOLID PURE WHITE (#FFFFFF). One flat color
  filling EVERYTHING around the subject.
- Think of it as a sticker on a clean sheet of white paper.
- ABSOLUTELY NO: checker patterns, noise dots, sparkles, stars, scattered
  pixels, debris, dust, gradient fades, color shifts, transparent regions.
- Do NOT use transparency or alpha — use solid #FFFFFF white.
- Do NOT draw any checker pattern (those are normally used to indicate
  transparency, but here we want REAL solid white).
- Every visible non-white pixel MUST belong to the subject's silhouette
  inside the dark outline.

[Composition]
- Subject centered with generous SOLID WHITE padding on all sides.
- Subject is ONE connected shape with a clear dark outline.`;
}
