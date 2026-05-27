// 백서 §3 Pipeline A — 이미지 + 텍스트 → 구조화 RLE.
//
// 반환은 "raw" (모델 응답을 신뢰하지 않고 그대로). 검증·보정은 validateRle 가 담당.

import { createClient } from './client.js';
import { RESPONSE_SCHEMA_A } from '../../config/schema.js';
import {
  PERSPECTIVES,
  buildSystemInstructionA,
  buildUserPromptA,
} from '../../config/prompts.js';

export async function runStructuredBlueprint({
  apiKey,
  model,
  base64Image,
  mimeType,
  width,
  height,
  perspective = PERSPECTIVES.ISO,
}) {
  if (!apiKey) throw new Error('runStructuredBlueprint: apiKey required');
  if (!model) throw new Error('runStructuredBlueprint: model required');
  if (!base64Image || !mimeType) throw new Error('runStructuredBlueprint: image required');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`runStructuredBlueprint: invalid size ${width}x${height}`);
  }

  const ai = createClient(apiKey);
  const systemInstruction = buildSystemInstructionA(width, height, perspective);
  const userText = buildUserPromptA(width, height, perspective);

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: userText },
      { inlineData: { data: base64Image, mimeType } },
    ],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA_A,
    },
  });

  // 신 SDK: 스키마 파싱 성공 시 response.parsed, 실패 시 text 폴백
  const raw = response.parsed ?? safeJsonParse(response.text);
  if (!raw) {
    throw new Error('빠른 모드: 응답이 비어있거나 파싱할 수 없습니다. 해상도를 줄이거나 정밀 모드로 시도하세요.');
  }
  return raw;
}

function safeJsonParse(text) {
  if (typeof text !== 'string' || !text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // 모델이 ```json 펜스를 넣은 경우 한 번 더 시도
    const m = /\{[\s\S]*\}/.exec(text);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}
