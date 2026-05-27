// blueprint 가 바뀔 때마다 canvasRef.current 에 자동으로 그려 넣는다.

import { useEffect } from 'react';
import { renderBlueprint } from '../lib/canvas/render.js';

export function useCanvasRender(canvasRef, blueprint, options) {
  const cell = options?.cell ?? 12;
  const gridLines = options?.gridLines !== false;
  const background = options?.background ?? 'transparent';

  useEffect(() => {
    const cv = canvasRef?.current;
    if (!cv || !blueprint) return;
    try {
      renderBlueprint(cv, blueprint, { cell, gridLines, background });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useCanvasRender]', err);
    }
  }, [canvasRef, blueprint, cell, gridLines, background]);
}
