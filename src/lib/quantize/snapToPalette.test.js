import { describe, it, expect } from 'vitest';
import { snapBlueprintToPalette } from './snapToPalette.js';
import { getActiveWplaceColors, WPLACE_FREE_COLORS, WPLACE_PAID_COLORS } from '../../config/wplacePalette.js';

const FREE_ONLY = getActiveWplaceColors({ free: true, paid: false });
const PAID_ONLY = getActiveWplaceColors({ free: false, paid: true });
const BOTH     = getActiveWplaceColors({ free: true, paid: true });

describe('snapBlueprintToPalette', () => {
  it('순수 흰색·검정은 wplace 흰색/검정으로 정확히 매핑된다', () => {
    const bp = {
      width: 2, height: 2,
      palette: ['#FFFFFF', '#000000'],
      grid: [[0, 1], [1, 0]],
    };
    const out = snapBlueprintToPalette(bp, FREE_ONLY);
    expect(out.palette).toContain('#FFFFFF');
    expect(out.palette).toContain('#000000');
    // -1 은 보존
    expect(out.grid).toEqual(bp.grid.map((row) => row.map((i) => out.palette.indexOf(bp.palette[i]))));
  });

  it('약간 다른 흰색(#FAFAFA)은 가장 가까운 wplace 색(White)으로 매핑', () => {
    const bp = {
      width: 1, height: 1,
      palette: ['#FAFAFA'],
      grid: [[0]],
    };
    const out = snapBlueprintToPalette(bp, FREE_ONLY);
    expect(out.palette).toEqual(['#FFFFFF']);
    expect(out.grid).toEqual([[0]]);
  });

  it('비활성 토글(빈 activeColors)이면 blueprint 변경 없음', () => {
    const bp = {
      width: 1, height: 1,
      palette: ['#123456'],
      grid: [[0]],
    };
    const out = snapBlueprintToPalette(bp, []);
    expect(out).toBe(bp);
  });

  it('-1 (투명) 셀은 그대로 유지', () => {
    const bp = {
      width: 3, height: 1,
      palette: ['#FF0000'],
      grid: [[-1, 0, -1]],
    };
    const out = snapBlueprintToPalette(bp, FREE_ONLY);
    expect(out.grid[0][0]).toBe(-1);
    expect(out.grid[0][2]).toBe(-1);
    // 빨강은 wplace 의 어떤 빨강으로 매핑됨
    expect(out.grid[0][1]).toBe(0);
    expect(out.palette.length).toBe(1);
  });

  it('여러 입력 색이 같은 wplace 색으로 매핑되면 palette 중복 제거', () => {
    // 두 약간 다른 흰색이 모두 #FFFFFF 로 매핑되어야 함
    const bp = {
      width: 2, height: 1,
      palette: ['#FAFAFA', '#F5F5F5'],
      grid: [[0, 1]],
    };
    const out = snapBlueprintToPalette(bp, FREE_ONLY);
    expect(out.palette).toEqual(['#FFFFFF']);
    expect(out.grid).toEqual([[0, 0]]);
  });

  it('무료만 활성 시 유료 색(예: Light Cyan #BBFAF2 근접)은 무료 후보로 fallback', () => {
    const bp = {
      width: 1, height: 1,
      palette: ['#BBFAF2'],  // 유료 Light Cyan 과 거의 동일
      grid: [[0]],
    };
    const outFree = snapBlueprintToPalette(bp, FREE_ONLY);
    // 무료에는 정확한 Light Cyan 없으므로 가장 가까운 색 (Light Teal #13E1BE 또는 White)
    // 정확한 매칭은 보장 못 하지만, 결과가 wplace 무료 색 중 하나임은 확실
    const freeHexSet = new Set(FREE_ONLY.map((c) => c.hex));
    expect(freeHexSet.has(outFree.palette[0])).toBe(true);

    // 유료 포함 시 정확히 Light Cyan 으로
    const outBoth = snapBlueprintToPalette(bp, BOTH);
    expect(outBoth.palette).toEqual(['#BBFAF2']);
  });

  it('잘못된 입력은 그대로 반환', () => {
    expect(snapBlueprintToPalette(null, FREE_ONLY)).toBeNull();
    const bp = { width: 1, height: 1, palette: ['#000'], grid: 'not array' };
    expect(snapBlueprintToPalette(bp, FREE_ONLY)).toBe(bp);
  });

  it('무료/유료 합치면 총 63색 후보', () => {
    expect(BOTH.length).toBe(WPLACE_FREE_COLORS.length + WPLACE_PAID_COLORS.length);
    expect(FREE_ONLY.length).toBe(WPLACE_FREE_COLORS.length);
    expect(PAID_ONLY.length).toBe(WPLACE_PAID_COLORS.length);
  });
});
