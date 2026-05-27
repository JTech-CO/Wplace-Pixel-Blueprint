// 백서 §4.2 — 팔레트 + 행 단위 RLE 응답 스키마.
// @google/genai 신 SDK 는 plain string type 표기를 허용한다.

export const RESPONSE_SCHEMA_A = {
  type: 'object',
  properties: {
    width:  { type: 'integer', description: 'Grid width in cells (e.g. 48)' },
    height: { type: 'integer', description: 'Grid height in cells (e.g. 48)' },
    palette: {
      type: 'array',
      description: 'Distinct HEX colors, e.g. #FF5733. Index 0..N-1. Max 16.',
      items: { type: 'string' },
    },
    rows: {
      type: 'array',
      description: 'Length must equal height. Each row is RLE pairs.',
      items: {
        type: 'array',
        description: 'Sequence of [paletteIndex, runLength]. Sum(runLength)=width. -1 = transparent.',
        items: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
  },
  required: ['width', 'height', 'palette', 'rows'],
};

export const MAX_PALETTE_SIZE = 16;
