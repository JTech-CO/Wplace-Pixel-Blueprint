import { describe, it, expect } from 'vitest';
import { buildPalette } from './medianCut.js';

describe('buildPalette', () => {
  it('빈 입력은 빈 팔레트 + indexOf 가 -1', () => {
    const { palette, indexOf } = buildPalette([], 16);
    expect(palette).toEqual([]);
    expect(indexOf([0, 0, 0])).toBe(-1);
  });

  it('단색만 있으면 1색 팔레트', () => {
    const px = Array.from({ length: 100 }, () => [128, 64, 32]);
    const { palette } = buildPalette(px, 16);
    expect(palette.length).toBe(1);
    expect(palette[0]).toBe('#804020');
  });

  it('명확히 두 클러스터는 2색으로 분할된다', () => {
    const black = Array.from({ length: 50 }, () => [0, 0, 0]);
    const white = Array.from({ length: 50 }, () => [255, 255, 255]);
    const { palette, indexOf } = buildPalette([...black, ...white], 16);
    expect(palette.length).toBe(2);
    // 양 끝 색이 각자 다른 인덱스로 매핑
    expect(indexOf([0, 0, 0])).not.toBe(indexOf([255, 255, 255]));
  });

  it('maxColors=2 면 색이 많아도 2색으로 제한', () => {
    const px = [];
    for (let r = 0; r <= 255; r += 32) {
      for (let g = 0; g <= 255; g += 32) {
        px.push([r, g, 0]);
      }
    }
    const { palette } = buildPalette(px, 2);
    expect(palette.length).toBeLessThanOrEqual(2);
    expect(palette.length).toBeGreaterThanOrEqual(1);
  });

  it('maxColors 가 큰 경우 입력 다양성을 반영', () => {
    const px = [];
    const targets = [
      [10, 10, 10], [240, 10, 10], [10, 240, 10], [10, 10, 240],
      [240, 240, 10], [240, 10, 240], [10, 240, 240], [240, 240, 240],
    ];
    for (const t of targets) {
      for (let i = 0; i < 30; i++) px.push(t);
    }
    const { palette } = buildPalette(px, 16);
    // 8 클러스터가 있으니 최소 8 색은 나와야 한다
    expect(palette.length).toBeGreaterThanOrEqual(8);
    expect(palette.length).toBeLessThanOrEqual(16);
  });

  it('잘못된 픽셀(짧은 배열) 은 필터링된다', () => {
    const { palette } = buildPalette([[1, 2], 'nope', [10, 20, 30]], 16);
    expect(palette.length).toBe(1);
    expect(palette[0]).toBe('#0A141E');
  });

  it('indexOf 가 가장 가까운 인덱스를 반환', () => {
    const black = Array.from({ length: 30 }, () => [10, 10, 10]);
    const white = Array.from({ length: 30 }, () => [245, 245, 245]);
    const { indexOf, paletteRgb } = buildPalette([...black, ...white], 2);
    // 어두운 회색 → black 클러스터
    const i1 = indexOf([20, 20, 20]);
    const i2 = indexOf([230, 230, 230]);
    expect(paletteRgb[i1][0]).toBeLessThan(128);
    expect(paletteRgb[i2][0]).toBeGreaterThan(128);
  });
});
