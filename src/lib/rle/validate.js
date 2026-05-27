// 백서 §4.2 — 응답 검증 + 자동 보정.
//
// 입력 raw: 모델 응답 (모양 보장 안 됨)
// 출력: { ok, errors, warnings, fixed }
//   ok       : 보정이 일절 필요 없었는가
//   errors   : 복구 불가 — fixed 는 null
//   warnings : 사람이 알아야 할 자동 보정 내역
//   fixed    : 항상 안전한 raw 형태 ({ width, height, palette, rows })

import { MAX_PALETTE_SIZE } from '../../config/schema.js';

export function validateRle(raw) {
  const errors = [];
  const warnings = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Response is not an object'], warnings, fixed: null };
  }
  const width = Number.isInteger(raw.width) ? raw.width : NaN;
  const height = Number.isInteger(raw.height) ? raw.height : NaN;
  if (!Number.isFinite(width) || width <= 0) errors.push(`Invalid width: ${raw.width}`);
  if (!Number.isFinite(height) || height <= 0) errors.push(`Invalid height: ${raw.height}`);
  if (!Array.isArray(raw.palette)) errors.push('palette is not an array');
  if (!Array.isArray(raw.rows)) errors.push('rows is not an array');
  if (errors.length > 0) return { ok: false, errors, warnings, fixed: null };

  // palette 보정 (최대 16색)
  let palette = raw.palette.slice();
  if (palette.length > MAX_PALETTE_SIZE) {
    warnings.push(`palette truncated: ${palette.length} -> ${MAX_PALETTE_SIZE}`);
    palette = palette.slice(0, MAX_PALETTE_SIZE);
  }
  // HEX 형태 보정 (대문자/누락 # 정도만 살짝)
  palette = palette.map((c, i) => {
    if (typeof c !== 'string') {
      warnings.push(`palette[${i}] not a string, replaced with #000000`);
      return '#000000';
    }
    const v = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(v)) {
      warnings.push(`palette[${i}] missing '#', auto-prefixed`);
      return `#${v.toUpperCase()}`;
    }
    warnings.push(`palette[${i}] invalid hex "${c}", replaced with #000000`);
    return '#000000';
  });

  // rows 행 수 보정
  let rows = raw.rows.slice();
  if (rows.length < height) {
    warnings.push(`rows padded: ${rows.length} -> ${height}`);
    while (rows.length < height) rows.push([[-1, width]]);
  } else if (rows.length > height) {
    warnings.push(`rows truncated: ${rows.length} -> ${height}`);
    rows = rows.slice(0, height);
  }

  // 각 행 검증 + 보정
  const fixedRows = rows.map((row, y) => {
    if (!Array.isArray(row)) {
      warnings.push(`row ${y} is not an array, replaced with transparent`);
      return [[-1, width]];
    }
    const fixed = [];
    let sum = 0;
    for (const pair of row) {
      if (!Array.isArray(pair) || pair.length < 2) {
        warnings.push(`row ${y}: malformed pair skipped`);
        continue;
      }
      const idxRaw = pair[0];
      const runRaw = pair[1];
      const idx = Number.isInteger(idxRaw) ? idxRaw : -1;
      const run = Math.max(0, Number.isInteger(runRaw) ? runRaw : 0);
      if (run === 0) continue;
      // palette index 범위 보정
      let safeIdx = idx;
      if (!(idx === -1 || (idx >= 0 && idx < palette.length))) {
        warnings.push(`row ${y}: paletteIndex ${idx} out of range, mapped to -1`);
        safeIdx = -1;
      }
      const remaining = width - sum;
      if (remaining <= 0) {
        warnings.push(`row ${y}: extra run after width=${width} truncated`);
        break;
      }
      const safeRun = Math.min(run, remaining);
      if (safeRun !== run) {
        warnings.push(`row ${y}: run ${run} truncated to ${safeRun}`);
      }
      fixed.push([safeIdx, safeRun]);
      sum += safeRun;
    }
    if (sum < width) {
      warnings.push(`row ${y}: padded transparent ${sum} -> ${width}`);
      fixed.push([-1, width - sum]);
    }
    return fixed;
  });

  return {
    ok: warnings.length === 0,
    errors,
    warnings,
    fixed: { width, height, palette, rows: fixedRows },
  };
}
