// 변환 흐름 오케스트레이션 — Pipeline A / B 분기.
//
//   file → base64 → (A) pipelineA + validate + decode
//                  or
//                  (B) pipelineB (이미지 생성 + 양자화)
//   → 동일한 { width, height, palette, grid } 구조로 상태 반영

import { useCallback, useState } from 'react';
import { runStructuredBlueprint } from '../lib/gemini/pipelineA.js';
import { runImageGenBlueprint } from '../lib/gemini/pipelineB.js';
import { fileToBase64 } from '../lib/image/fileToBase64.js';
import { validateRle } from '../lib/rle/validate.js';
import { decodeBlueprint } from '../lib/rle/decode.js';

const STATUS = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
};

export function useBlueprint() {
  const [blueprint, setBlueprint] = useState(null);
  const [status, setStatus] = useState(STATUS.idle);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [fileName, setFileName] = useState('blueprint');
  const [activePipeline, setActivePipeline] = useState('A');

  const reset = useCallback(() => {
    setBlueprint(null);
    setStatus(STATUS.idle);
    setError(null);
    setWarnings([]);
  }, []);

  const run = useCallback(async ({ file, apiKey, model, width, height, pipeline = 'A', perspective }) => {
    if (!file) {
      setError(new Error('파일이 선택되지 않았습니다.'));
      setStatus(STATUS.error);
      return;
    }
    if (!apiKey) {
      setError(new Error('Gemini API Key 를 먼저 입력하세요.'));
      setStatus(STATUS.error);
      return;
    }

    setStatus(STATUS.loading);
    setError(null);
    setWarnings([]);
    setBlueprint(null);
    setActivePipeline(pipeline);
    const stem = (file.name || 'blueprint').replace(/\.[^.]+$/, '') || 'blueprint';
    setFileName(stem);

    try {
      const { base64, mimeType } = await fileToBase64(file);

      let decoded;
      let ws = [];

      if (pipeline === 'A') {
        const raw = await runStructuredBlueprint({
          apiKey,
          model,
          base64Image: base64,
          mimeType,
          width,
          height,
          perspective,
        });
        const v = validateRle(raw);
        if (!v.fixed) {
          throw new Error(`응답 검증 실패: ${v.errors.join('; ')}`);
        }
        ws = v.warnings;
        decoded = decodeBlueprint(v.fixed);
      } else if (pipeline === 'B') {
        // B 는 호출측에서 이미지 모델을 선택해 model 로 전달한다 (App.jsx)
        decoded = await runImageGenBlueprint({
          apiKey,
          model,
          base64Image: base64,
          mimeType,
          width,
          height,
          perspective,
        });
      } else {
        throw new Error(`unknown pipeline: ${pipeline}`);
      }

      setBlueprint(decoded);
      setWarnings(ws);
      setStatus(STATUS.success);
      // eslint-disable-next-line no-console
      console.log('[Blueprint]', decoded, ws.length ? { warnings: ws } : '');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useBlueprint]', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus(STATUS.error);
    }
  }, []);

  return { blueprint, status, error, warnings, fileName, activePipeline, run, reset };
}

useBlueprint.STATUS = STATUS;
