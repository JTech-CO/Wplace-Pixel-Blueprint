import { useEffect, useState } from 'react';
import { PERSPECTIVE_OPTIONS } from '../config/prompts.js';

const SIZE_MIN = 8;
const SIZE_MAX = 256;
const FAST_MODE_SAFE_LIMIT = 64; // 백서 §3 — 그 이상에서는 토큰 한계로 응답이 불안정

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export default function SettingsPanel({
  model,
  modelOptions,
  onModelChange,
  pipeline,
  width,
  height,
  onSizeChange,
  squareLock,
  onSquareLockChange,
  perspective,
  onPerspectiveChange,
  gridLines,
  onGridLinesChange,
  removeBg,
  onRemoveBgChange,
  useFreePalette,
  onUseFreePaletteChange,
  usePaidPalette,
  onUsePaidPaletteChange,
}) {
  // input 자유 입력을 위한 local string state.
  // 타이핑 중에는 clamp 하지 않고, blur / Enter 시점에만 부모로 commit 한다.
  const [localWidth, setLocalWidth] = useState(String(width));
  const [localHeight, setLocalHeight] = useState(String(height));

  // 외부에서 width / height 가 바뀌면 local 동기화 (정방형 잠금에 의한 변경 등)
  useEffect(() => { setLocalWidth(String(width)); }, [width]);
  useEffect(() => { setLocalHeight(String(height)); }, [height]);

  const commit = (key, raw) => {
    const n = parseInt(raw, 10);
    const safe = Number.isFinite(n) ? clamp(n, SIZE_MIN, SIZE_MAX) : SIZE_MIN;
    onSizeChange({ width, height, [key]: safe });
  };

  const exceedsFastLimit =
    pipeline === 'A' && (width > FAST_MODE_SAFE_LIMIT || height > FAST_MODE_SAFE_LIMIT);

  const selectedOption = modelOptions.find((o) => o.value === model);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="model" className="text-xs font-medium text-slate-300">
          변환 방식
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          {modelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {selectedOption?.sub && (
          <p className="text-[11px] text-slate-500">{selectedOption.sub}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-300">해상도 (cells)</span>
          <SquareLockToggle locked={!!squareLock} onToggle={onSquareLockChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] text-slate-500">Width</span>
            <input
              type="number"
              inputMode="numeric"
              min={SIZE_MIN}
              max={SIZE_MAX}
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onBlur={(e) => commit('width', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-slate-500">Height</span>
            <input
              type="number"
              inputMode="numeric"
              min={SIZE_MIN}
              max={SIZE_MAX}
              value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)}
              onBlur={(e) => commit('height', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              disabled={!!squareLock}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          최대 {SIZE_MAX}. 고속 모드는 {FAST_MODE_SAFE_LIMIT} 이하 권장,
          그 이상은 고품질 모드가 안정적입니다.
        </p>
        {exceedsFastLimit && (
          <p className="rounded border border-amber-900/40 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-200">
            {width}×{height} 는 고속 모드의 토큰 한계에서 실패할 수 있습니다.
            변환 방식을 “저속 · 고품질” 로 바꾸거나 해상도를 {FAST_MODE_SAFE_LIMIT} 이하로 줄이세요.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-300">시점</span>
        <div className="grid grid-cols-2 gap-2">
          {PERSPECTIVE_OPTIONS.map((opt) => (
            <PresetButton
              key={opt.value}
              active={perspective === opt.value}
              onClick={() => onPerspectiveChange(opt.value)}
              label={opt.label}
              sub={opt.sub}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-300">wplace 색상</span>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            active={!!useFreePalette}
            onClick={() => onUseFreePaletteChange(!useFreePalette)}
            label="무료 색상"
          />
          <ToggleButton
            active={!!usePaidPalette}
            onClick={() => onUsePaidPaletteChange(!usePaidPalette)}
            label="유료 색상"
          />
        </div>
        {!useFreePalette && !usePaidPalette && (
          <p className="text-[11px] text-slate-500">
            둘 다 비활성이면 wplace 매핑 없이 자유 색상으로 출력됩니다.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-300">표시 옵션</span>
        <div className="grid grid-cols-2 gap-2">
          <ToggleButton
            active={!!gridLines}
            onClick={() => onGridLinesChange(!gridLines)}
            label="격자선 표시"
          />
          <ToggleButton
            active={!!removeBg}
            onClick={() => onRemoveBgChange(!removeBg)}
            label="배경 제거"
          />
        </div>
      </div>
    </section>
  );
}

function ToggleButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors',
        active
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function PresetButton({ active, onClick, disabled, label, sub }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-md border px-3 py-2 text-left transition-colors',
        active
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700',
        disabled ? 'cursor-not-allowed opacity-50 hover:border-slate-800' : '',
      ].join(' ')}
    >
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>
    </button>
  );
}

function SquareLockToggle({ locked, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!locked)}
      aria-pressed={locked}
      title={locked ? '정방형 잠금 해제' : '가로·세로를 정방형으로 잠금'}
      className={[
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors',
        locked
          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200',
      ].join(' ')}
    >
      {locked ? <LockClosedIcon /> : <LockOpenIcon />}
      <span>정방형</span>
    </button>
  );
}

function LockClosedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function LockOpenIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 5.5-1.5" />
    </svg>
  );
}
