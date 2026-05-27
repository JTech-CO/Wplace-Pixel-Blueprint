import { describe, it, expect } from 'vitest';
import { encodeBlueprint } from './encode.js';
import { decodeBlueprint } from './decode.js';

describe('encodeBlueprint', () => {
  it('연속 인덱스를 run-length 로 압축한다', () => {
    const blueprint = {
      width: 5,
      height: 2,
      palette: ['#FF0000', '#00FF00'],
      grid: [
        [0, 0, 1, 1, 1],
        [-1, -1, 0, 0, -1],
      ],
    };
    const raw = encodeBlueprint(blueprint);
    expect(raw.width).toBe(5);
    expect(raw.height).toBe(2);
    expect(raw.rows).toEqual([
      [[0, 2], [1, 3]],
      [[-1, 2], [0, 2], [-1, 1]],
    ]);
  });

  it('encode -> decode 라운드트립이 원본 그리드와 같다', () => {
    const blueprint = {
      width: 6,
      height: 3,
      palette: ['#000000', '#FFFFFF'],
      grid: [
        [0, 1, 0, 1, 0, 1],
        [-1, -1, -1, -1, -1, -1],
        [0, 0, 0, 1, 1, 1],
      ],
    };
    const raw = encodeBlueprint(blueprint);
    const decoded = decodeBlueprint(raw);
    expect(decoded.grid).toEqual(blueprint.grid);
    expect(decoded.palette).toEqual(blueprint.palette);
  });

  it('잘못된 입력에 대해 throw 한다', () => {
    expect(() => encodeBlueprint(null)).toThrow(TypeError);
    expect(() => encodeBlueprint({ width: 0, height: 1, palette: [], grid: [[]] })).toThrow(RangeError);
    expect(() =>
      encodeBlueprint({ width: 2, height: 2, palette: [], grid: [[0, 0]] }),
    ).toThrow(TypeError); // grid.length mismatch
    expect(() =>
      encodeBlueprint({ width: 3, height: 1, palette: [], grid: [[0, 0]] }),
    ).toThrow(TypeError); // row length mismatch
  });
});
