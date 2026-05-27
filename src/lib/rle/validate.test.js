import { describe, it, expect } from 'vitest';
import { validateRle } from './validate.js';

const valid = {
  width: 3,
  height: 2,
  palette: ['#FF0000', '#00FF00'],
  rows: [
    [[0, 3]],
    [[1, 1], [-1, 2]],
  ],
};

describe('validateRle', () => {
  it('정상 입력에 대해 ok=true, warnings=[]', () => {
    const r = validateRle(valid);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.fixed.rows).toEqual(valid.rows);
  });

  it('rows.length < height 면 투명 행을 패딩하고 warning 을 남긴다', () => {
    const r = validateRle({ ...valid, rows: [[[0, 3]]] });
    expect(r.ok).toBe(false);
    expect(r.fixed.rows.length).toBe(2);
    expect(r.warnings.some(w => w.includes('rows padded'))).toBe(true);
  });

  it('rows.length > height 면 절단하고 warning 을 남긴다', () => {
    const r = validateRle({ ...valid, rows: [[[0, 3]], [[1, 3]], [[0, 3]]] });
    expect(r.fixed.rows.length).toBe(2);
    expect(r.warnings.some(w => w.includes('rows truncated'))).toBe(true);
  });

  it('row 의 run 합 < width 면 끝에 투명 run 을 추가한다', () => {
    const r = validateRle({ ...valid, rows: [[[0, 1]], [[1, 3]]] });
    // 첫 행: sum=1, width=3 -> [-1, 2] 추가
    expect(r.fixed.rows[0]).toEqual([[0, 1], [-1, 2]]);
    expect(r.warnings.some(w => w.includes('padded transparent'))).toBe(true);
  });

  it('row 의 run 합 > width 면 width 에서 절단한다', () => {
    const r = validateRle({ ...valid, rows: [[[0, 5]], [[1, 3]]] });
    // 첫 행: run 5 -> 3 으로 절단
    expect(r.fixed.rows[0][0][1]).toBe(3);
    expect(r.warnings.some(w => w.includes('truncated'))).toBe(true);
  });

  it('paletteIndex 가 범위를 벗어나면 -1 로 매핑한다', () => {
    const r = validateRle({ ...valid, rows: [[[99, 3]], [[1, 3]]] });
    expect(r.fixed.rows[0][0][0]).toBe(-1);
    expect(r.warnings.some(w => w.includes('out of range'))).toBe(true);
  });

  it('palette 가 16 색을 넘으면 절단한다', () => {
    const palette = Array.from({ length: 20 }, (_, i) => `#${i.toString(16).padStart(6, '0').toUpperCase()}`);
    const r = validateRle({ ...valid, palette, rows: [[[0, 3]], [[1, 3]]] });
    expect(r.fixed.palette.length).toBe(16);
    expect(r.warnings.some(w => w.includes('palette truncated'))).toBe(true);
  });

  it('타입이 잘못되면 errors 를 채우고 fixed=null', () => {
    expect(validateRle(null).ok).toBe(false);
    expect(validateRle(null).fixed).toBeNull();

    const r1 = validateRle({ width: 'x', height: 1, palette: [], rows: [] });
    expect(r1.ok).toBe(false);
    expect(r1.fixed).toBeNull();
    expect(r1.errors.some(e => e.includes('width'))).toBe(true);

    const r2 = validateRle({ width: 1, height: 1, palette: 'not array', rows: [] });
    expect(r2.ok).toBe(false);
    expect(r2.errors.some(e => e.includes('palette'))).toBe(true);
  });

  it('HEX 누락 # 을 자동 보정하고 비-HEX 는 검정으로 치환한다', () => {
    const r = validateRle({
      ...valid,
      palette: ['FF0000', 'banana'],
      rows: [[[0, 3]], [[1, 3]]],
    });
    expect(r.fixed.palette[0]).toBe('#FF0000');
    expect(r.fixed.palette[1]).toBe('#000000');
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
