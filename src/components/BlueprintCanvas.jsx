import { forwardRef, useEffect, useRef, useState } from 'react';
import { useCanvasRender } from '../hooks/useCanvasRender.js';

const PAD = 16; // wrapper padding (border + p-2 합산 근사치)

const BlueprintCanvas = forwardRef(function BlueprintCanvas(
  {
    blueprint,
    cell = 12,
    baseCell,
    gridLines = true,
    background = 'transparent',
    onWheelZoom,
  },
  externalRef,
) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);

  const setRef = (node) => {
    canvasRef.current = node;
    if (typeof externalRef === 'function') externalRef(node);
    else if (externalRef && typeof externalRef === 'object') externalRef.current = node;
  };

  useCanvasRender(canvasRef, blueprint, { cell, gridLines, background });

  // 마우스 휠 = 확대/축소 (passive: false 로 직접 등록)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof onWheelZoom !== 'function') return;
    const handler = (e) => {
      e.preventDefault();
      onWheelZoom(e.deltaY > 0 ? -1 : 1);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onWheelZoom]);

  // blueprint / cell 변경 시 wrapper 의 scrollLeft/Top 을 정확히 가운데로
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
      el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
    });
    return () => cancelAnimationFrame(id);
  }, [blueprint, cell]);

  // 마우스 드래그 panning
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    const el = wrapperRef.current;
    if (!el) return;
    e.preventDefault();
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    setIsPanning(true);
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e) => {
      const el = wrapperRef.current;
      const start = panStartRef.current;
      if (!el || !start) return;
      el.scrollLeft = start.scrollLeft - (e.clientX - start.x);
      el.scrollTop = start.scrollTop - (e.clientY - start.y);
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning]);

  if (!blueprint) return null;

  // wrapper 높이는 zoom=1(baseCell) 기준 캔버스 높이에 맞춘다.
  // 확대해도 wrapper 박스 크기는 그대로 — 내부에서 스크롤·드래그.
  const baseHeightPx =
    baseCell && blueprint ? baseCell * blueprint.height + PAD : undefined;

  return (
    <div
      ref={wrapperRef}
      onMouseDown={onMouseDown}
      style={{
        height: baseHeightPx ? `${baseHeightPx}px` : '60vh',
        maxHeight: '70vh',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      className="no-scrollbar block w-full max-w-full select-none overflow-auto rounded-md border border-slate-800 bg-slate-950 p-2"
      title="휠로 확대/축소 · 드래그로 이동"
    >
      <div
        style={{ width: 'max-content', minWidth: '100%', minHeight: '100%' }}
        className="flex items-center justify-center"
      >
        <canvas ref={setRef} className="block" aria-label="pixel blueprint" />
      </div>
    </div>
  );
});

export default BlueprintCanvas;
