// @google/genai 인스턴스 생성 래퍼.

import { GoogleGenAI } from '@google/genai';

export function createClient(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('createClient: apiKey is required');
  }
  return new GoogleGenAI({ apiKey });
}
