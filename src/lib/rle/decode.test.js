import { describe, it, expect } from 'vitest';
import { decodeBlueprint } from './decode.js';

describe('decodeBlueprint', () => {
  it('정상 입력을 2D 그리드로 디코딩한다', () => {
    const raw = {
      width: 4,
      height: 2,
      palette: ['#FF0000', '#00FF00'],
      rows: [
        [[0, 2], [1, 2]],
        [[-1, 4]],
      ],
    };
    const { width, height, palette, grid } = decodeBlueprint(raw);
    expect(width).toBe(4);
    expect(height).toBe(2);
    expect(palette).toEqual(['#FF0000', '#00FF00']);
    expect(grid).toEqual([
      [0, 0, 1, 1],
      [-1, -1, -1, -1],
    ]);
  });

  it('행이 부족하면 누락분을 투명(-1)으로 패딩한다', () => {
    const raw = {
      width: 2,
      height: 3,
      palette: ['#FFFFFF'],
      rows: [[[0, 2]]], // 1행만 있고 3행이어야 함
    };
    const { grid } = decodeBlueprint(raw);
    expect(grid).toEqual([
      [0, 0],
      [-1, -1],
      [-1, -1],
    ]);
  });

  it('행의 run 합이 width 보다 작으면 끝을 투명으로 패딩한다', () => {
    const raw = {
      width: 5,
      height: 1,
      palette: ['#000000'],
      rows: [[[0, 2]]], // run 합 = 2, width = 5
    };
    const { grid } = decodeBlueprint(raw);
    expect(grid[0]).toEqual([0, 0, -1, -1, -1]);
  });

  it('행의 run 합이 width 를 넘으면 width 에서 절단한다', () => {
    const raw = {
      width: 3,
      height: 1,
      palette: ['#000000', '#FFFFFF'],
      rows: [[[0, 2], [1, 5]]], // run 합 = 7, width = 3
    };
    const { grid } = decodeBlueprint(raw);
    expect(grid[0]).toEqual([0, 0, 1]);
  });

  it('잘못된 입력에 대해 throw 한다', () => {
    expect(() => decodeBlueprint(null)).toThrow(TypeError);
    expect(() => decodeBlueprint({ width: 0, height: 1, palette: [], rows: [] })).toThrow(RangeError);
    expect(() => decodeBlueprint({ width: 1, height: -1, palette: [], rows: [] })).toThrow(RangeError);
  });
});
