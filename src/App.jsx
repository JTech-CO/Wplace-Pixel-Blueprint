import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MODEL_OPTIONS, DEFAULT_MODEL, getModelOption } from './config/models.js';
import { PERSPECTIVES } from './config/prompts.js';
import { removeBackground } from './lib/rle/backgroundRemover.js';
import { snapBlueprintToPalette } from './lib/quantize/snapToPalette.js';
import { getActiveWplaceColors } from './config/wplacePalette.js';
import { useApiKey } from './hooks/useApiKey.js';
import { useBlueprint } from './hooks/useBlueprint.js';
import KeyInput from './components/KeyInput.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import ImageUploader from './components/ImageUploader.jsx';
import BlueprintCanvas from './components/BlueprintCanvas.jsx';
import PaletteLegend from './components/PaletteLegend.jsx';
import ExportButtons from './components/ExportButtons.jsx';

export default function App() {
  const { apiKey, setApiKey, clear: clearKey } = useApiKey();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [size, setSize] = useState({ width: 48, height: 48 });
  const [squareLock, setSquareLock] = useState(false);
  const [perspective, setPerspective] = useState(PERSPECTIVES.ISO);
  const [gridLines, setGridLines] = useState(true);
  const [removeBg, setRemoveBg] = useState(false);
  const [useFreePalette, setUseFreePalette] = useState(true);
  const [usePaidPalette, setUsePaidPalette] = useState(false);
  const [file, setFile] = useState(null);
  const [zoom, setZoom] = useState(1); // 1 = 최대 축소 (autoCell), 8 = 최대 확대
  const canvasRef = useRef(null);

  // 모델 선택이 pipeline 까지 결정 — 라벨과 실행 흐름이 자동 일치
  const pipeline = getModelOption(model).pipeline;

  // 정방형 잠금 시 어느 축을 조작하든 양쪽이 같은 값이 되도록 동기화.
  const handleSizeChange = (next) => {
    if (squareLock) {
      const changedKey = next.width !== size.width ? 'width' : 'height';
      const v = next[changedKey];
      setSize({ width: v, height: v });
    } else {
      setSize({ width: next.width, height: next.height });
    }
  };

  // 잠금을 켜는 순간 Height 를 Width 로 맞춰 즉시 정방형이 되게 한다.
  const handleSquareLockChange = (next) => {
    setSquareLock(next);
    if (next) {
      setSize((s) => ({ width: s.width, height: s.width }));
    }
  };

  const { blueprint, status, error, warnings, fileName, run } = useBlueprint();
  const busy = status === 'loading';
  const canSubmit = !!file && !!apiKey && !busy;

  // 활성 wplace 색 목록 — 둘 다 false 면 빈 배열 → snap 미적용 (자유 색)
  const activeWplace = useMemo(
    () => getActiveWplaceColors({ free: useFreePalette, paid: usePaidPalette }),
    [useFreePalette, usePaidPalette],
  );

  // 자동 정리 파이프라인 (PNG/JSON 양쪽에 반영):
  //   1) removeBackground — 외곽 같은 색 그룹 보수적 정리
  //   2) snapBlueprintToPalette — 활성 wplace 색으로 매핑 (둘 다 OFF 면 패스)
  const displayedBlueprint = useMemo(() => {
    if (!blueprint) return null;
    let r = removeBackground(blueprint);
    if (activeWplace.length > 0) {
      r = snapBlueprintToPalette(r, activeWplace);
    }
    return r;
  }, [blueprint, activeWplace]);
  const canvasBackground = removeBg ? 'transparent' : '#FFFFFF';

  // 새 blueprint 마다 zoom 을 1(최대 축소)로 초기화
  useEffect(() => {
    if (displayedBlueprint) setZoom(1);
  }, [displayedBlueprint]);

  const handleWheelZoom = useCallback((dir) => {
    setZoom((z) => clamp(z + dir * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const handleSubmit = () => {
    run({
      file,
      apiKey,
      model,
      width: size.width,
      height: size.height,
      perspective,
      pipeline,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-medium tracking-tight">Wplace Pixel Blueprint</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              사진을 2D 및 2.5D 도안으로 다시 만듭니다.
            </p>
          </div>
          <span className="text-[11px] text-slate-600">v0.1</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6 min-w-0">
          <KeyInput value={apiKey} onChange={setApiKey} onClear={clearKey} />
          <SettingsPanel
            model={model}
            modelOptions={MODEL_OPTIONS}
            onModelChange={setModel}
            pipeline={pipeline}
            width={size.width}
            height={size.height}
            onSizeChange={handleSizeChange}
            squareLock={squareLock}
            onSquareLockChange={handleSquareLockChange}
            perspective={perspective}
            onPerspectiveChange={setPerspective}
            gridLines={gridLines}
            onGridLinesChange={setGridLines}
            removeBg={removeBg}
            onRemoveBgChange={setRemoveBg}
            useFreePalette={useFreePalette}
            onUseFreePaletteChange={setUseFreePalette}
            usePaidPalette={usePaidPalette}
            onUsePaidPaletteChange={setUsePaidPalette}
          />
          <ImageUploader
            file={file}
            onFile={setFile}
            onSubmit={handleSubmit}
            disabled={!canSubmit}
            busy={busy}
          />
        </aside>

        <section className="min-h-[480px] min-w-0 rounded-md border border-slate-800 bg-slate-900/40 p-6">
          <ResultPane
            status={status}
            error={error}
            warnings={warnings}
            blueprint={displayedBlueprint}
            fileName={fileName}
            gridLines={gridLines}
            background={canvasBackground}
            canvasRef={canvasRef}
            zoom={zoom}
            onWheelZoom={handleWheelZoom}
          />
        </section>
      </main>
    </div>
  );
}

function ResultPane({
  status,
  error,
  warnings,
  blueprint,
  fileName,
  gridLines,
  background,
  canvasRef,
  zoom,
  onWheelZoom,
}) {
  if (status === 'idle' && !blueprint) {
    return (
      <EmptyState
        title="아직 도안이 없습니다"
        body="좌측에서 키를 입력하고 이미지를 업로드한 뒤 [도안 생성] 버튼을 누르세요."
      />
    );
  }
  if (status === 'loading') {
    return <EmptyState title="변환 중…" body="Gemini 호출 → 응답 검증 → 디코딩." />;
  }
  if (status === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-rose-300">변환 실패</p>
        <pre className="whitespace-pre-wrap rounded-md border border-rose-900/60 bg-rose-950/30 p-3 text-[11px] text-rose-200">
          {error?.message || String(error)}
        </pre>
        <p className="text-[11px] text-slate-500">
          API Key · 변환 방식 · 이미지 형식을 확인하세요.
        </p>
      </div>
    );
  }
  // success
  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium text-emerald-300">변환 완료</p>
        <span className="font-mono text-[11px] text-slate-500">{fileName}_blueprint</span>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-[11px]">
        <Stat label="Grid" value={`${blueprint.width} × ${blueprint.height}`} />
        <Stat label="Palette" value={`${blueprint.palette.length} colors`} />
        <Stat label="Cells" value={blueprint.width * blueprint.height} />
      </dl>

      <BlueprintCanvas
        ref={canvasRef}
        blueprint={blueprint}
        cell={effectiveCell(blueprint.width, blueprint.height, zoom)}
        baseCell={autoCell(Math.max(blueprint.width, blueprint.height))}
        gridLines={gridLines}
        background={background}
        onWheelZoom={onWheelZoom}
      />

      <PaletteLegend palette={blueprint.palette} />

      <ExportButtons
        canvasRef={canvasRef}
        blueprint={blueprint}
        fileName={fileName}
        background={background}
      />

      {warnings.length > 0 && (
        <details className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-[11px] text-amber-200">
          <summary className="cursor-pointer text-amber-300">
            자동 보정 경고 {warnings.length}건
          </summary>
          <ul className="mt-2 list-disc pl-4 text-amber-200/90">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-1">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="text-xs text-slate-500">{body}</p>
    </div>
  );
}

// 큰 그리드에서 cell 을 자동 축소하여 캔버스가 결과 영역(~768px) 안에 들어가게 한다.
// 작은 그리드는 도트가 너무 크지 않도록 12 로 상한. 이 값이 zoom=1 (최대 축소) 의 기준 cell.
function autoCell(maxDim) {
  const TARGET = 768;
  return Math.max(2, Math.min(12, Math.floor(TARGET / Math.max(1, maxDim))));
}

// 확대/축소 한계 — zoom 1 = 화면에 보이는 최대 축소, 8 = 최대 확대.
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_STEP = 0.25;
const CELL_MAX = 32; // 캔버스가 지나치게 커지는 것을 막는 상한

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// zoom 을 반영한 실효 cell. 항상 [autoCell, CELL_MAX] 안에 들어간다.
function effectiveCell(width, height, zoom) {
  const base = autoCell(Math.max(width, height));
  const scaled = Math.round(base * zoom);
  return clamp(scaled, base, CELL_MAX);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}
