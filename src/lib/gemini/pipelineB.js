// 백서 §3 Pipeline B — 이미지 생성 → 클라이언트 양자화.
//
// 모델이 픽셀아트 PNG 를 만들고, 우리가 결정론적으로 다운스케일·색 양자화하여
// Pipeline A 와 동일 구조의 grid blueprint 를 반환한다.

import { createClient } from './client.js';
import { PERSPECTIVES, buildImageGenPromptB } from '../../config/prompts.js';
import { quantizeImageToGrid } from '../quantize/quantizeImageToGrid.js';
import { MAX_PALETTE_SIZE } from '../../config/schema.js';

export async function runImageGenBlueprint({
  apiKey,
  model,
  base64Image,
  mimeType,
  width,
  height,
  perspective = PERSPECTIVES.ISO,
  maxColors = MAX_PALETTE_SIZE,
}) {
  if (!apiKey) throw new Error('runImageGenBlueprint: apiKey required');
  if (!model) throw new Error('runImageGenBlueprint: model required');
  if (!base64Image || !mimeType) throw new Error('runImageGenBlueprint: image required');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`runImageGenBlueprint: invalid size ${width}x${height}`);
  }

  const ai = createClient(apiKey);
  const userText = buildImageGenPromptB(perspective);

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: userText },
      { inlineData: { data: base64Image, mimeType } },
    ],
    // 백서 §4.0 — 이미지 생성 모델은 responseModalities 로 'Image' 를 요청
    config: {
      responseModalities: ['Image'],
    },
  });

  const pngBase64 = extractInlineImageBase64(response);
  if (!pngBase64) {
    throw new Error('정밀 모드: 모델이 이미지를 반환하지 않았습니다. 잠시 후 다시 시도하세요.');
  }

  return quantizeImageToGrid(pngBase64, width, height, maxColors);
}

function extractInlineImageBase64(response) {
  const candidates = response?.candidates || [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts || [];
    for (const part of parts) {
      const inline = part?.inlineData;
      if (inline?.mimeType?.startsWith('image/') && inline?.data) {
        return inline.data;
      }
    }
  }
  return null;
}
