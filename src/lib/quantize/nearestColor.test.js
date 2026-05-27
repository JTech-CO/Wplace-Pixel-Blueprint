import { describe, it, expect } from 'vitest';
import { findNearestIndex, hexToRgb, rgbToHex } from './nearestColor.js';

describe('findNearestIndex', () => {
  const palette = [
    [0, 0, 0],       // 0: black
    [255, 255, 255], // 1: white
    [255, 0, 0],     // 2: red
    [0, 255, 0],     // 3: green
  ];

  it('정확히 같은 색은 그 인덱스를 반환', () => {
    expect(findNearestIndex([0, 0, 0], palette)).toBe(0);
    expect(findNearestIndex([255, 255, 255], palette)).toBe(1);
    expect(findNearestIndex([255, 0, 0], palette)).toBe(2);
    expect(findNearestIndex([0, 255, 0], palette)).toBe(3);
  });

  it('가장 가까운 색의 인덱스를 반환', () => {
    // 어두운 빨강 -> red 보다 black 에 가깝다고 가정 X: red 와 비교
    // dr=200, dg=0, db=0 vs black: dr=50, dg=0, db=0 → black 이 가까움
    expect(findNearestIndex([50, 0, 0], palette)).toBe(0);
    // 밝은 빨강 → red
    expect(findNearestIndex([200, 30, 30], palette)).toBe(2);
  });

  it('빈 팔레트는 -1', () => {
    expect(findNearestIndex([100, 100, 100], [])).toBe(-1);
    expect(findNearestIndex([100, 100, 100], null)).toBe(-1);
  });
});

describe('hex <-> rgb', () => {
  it('hexToRgb 기본', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]);
    expect(hexToRgb('#123456')).toEqual([0x12, 0x34, 0x56]);
  });

  it('hexToRgb # 없어도 동작', () => {
    expect(hexToRgb('FF0000')).toEqual([255, 0, 0]);
  });

  it('hexToRgb 잘못된 입력은 [0,0,0]', () => {
    expect(hexToRgb('not hex')).toEqual([0, 0, 0]);
    expect(hexToRgb(null)).toEqual([0, 0, 0]);
    expect(hexToRgb('#FFF')).toEqual([0, 0, 0]); // 3자리 미지원
  });

  it('rgbToHex 기본 + 대문자 + 클램프', () => {
    expect(rgbToHex([255, 0, 0])).toBe('#FF0000');
    expect(rgbToHex([0, 255, 0])).toBe('#00FF00');
    expect(rgbToHex([300, -10, 128])).toBe('#FF0080'); // clamp
  });
});
