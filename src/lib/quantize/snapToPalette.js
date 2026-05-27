// 임의 색 palette + grid 를 활성 wplace 팔레트로 매핑(snap).
//
// 입력 blueprint:
//   { width, height, palette: ['#RRGGBB', ...], grid: number[][] }
// 입력 activeColors:
//   [{ hex: '#RRGGBB', rgb: [r,g,b], name }, ...]   (wplacePalette.getActiveWplaceColors 출력)
//
// 동작:
//   1) 기존 palette 의 각 hex 색을 RGB 로 변환 → activeColors 중 가장 가까운 색 찾음
//   2) 새 palette 는 실제 등장한 wplace 색만 포함 (중복 제거)
//   3) grid 의 각 인덱스를 새 palette 의 인덱스로 재매핑 (-1 은 그대로)

import { findNearestIndex, hexToRgb } from './nearestColor.js';

export function snapBlueprintToPalette(blueprint, activeColors) {
  if (!blueprint || !Array.isArray(blueprint.palette) || !Array.isArray(blueprint.grid)) {
    return blueprint;
  }
  if (!Array.isArray(activeColors) || activeColors.length === 0) {
    return blueprint;
  }

  const activeRgb = activeColors.map((c) => c.rgb);
  const activeHex = activeColors.map((c) => c.hex);

  // 1) 기존 palette 인덱스 → 새 palette 인덱스 매핑
  const oldToNew = new Array(blueprint.palette.length);
  const newPalette = [];

  for (let i = 0; i < blueprint.palette.length; i++) {
    const rgb = hexToRgb(blueprint.palette[i]);
    const nearestActive = findNearestIndex(rgb, activeRgb);
    const wplaceHex = activeHex[nearestActive];

    let newIdx = newPalette.indexOf(wplaceHex);
    if (newIdx === -1) {
      newPalette.push(wplaceHex);
      newIdx = newPalette.length - 1;
    }
    oldToNew[i] = newIdx;
  }

  // 2) grid 재매핑
  const newGrid = blueprint.grid.map((row) =>
    Array.isArray(row)
      ? row.map((idx) => {
          if (idx < 0) return -1;
          if (idx >= oldToNew.length) return -1;
          return oldToNew[idx];
        })
      : row,
  );

  return {
    width: blueprint.width,
    height: blueprint.height,
    palette: newPalette,
    grid: newGrid,
  };
}
