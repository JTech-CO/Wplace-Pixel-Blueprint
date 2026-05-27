import { downloadPng, downloadPixelPng, downloadJson } from '../lib/canvas/exporters.js';

export default function ExportButtons({ canvasRef, blueprint, fileName, background }) {
  if (!blueprint) return null;
  const base = `${fileName || 'blueprint'}_blueprint`;

  const onHighRes = () => {
    const cv = canvasRef?.current;
    if (!cv) return;
    downloadPng(cv, `${base}_hires.png`);
  };

  const onPixel = () => {
    downloadPixelPng(
      blueprint,
      `${base}_${blueprint.width}x${blueprint.height}.png`,
      background ?? 'transparent',
    );
  };

  const onJson = () => {
    downloadJson(blueprint, `${base}.json`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onHighRes}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
        title="현재 화면 그대로 (cell 확대된 큰 PNG)"
      >
        고화질 저장
      </button>
      <button
        type="button"
        onClick={onPixel}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
        title={`grid 원본 크기 (${blueprint.width}×${blueprint.height} px)`}
      >
        픽셀 저장
      </button>
      <button
        type="button"
        onClick={onJson}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
      >
        JSON 저장
      </button>
    </div>
  );
}
