import { describe, it, expect } from 'vitest';
import { removeBackground, removeIsolatedNoise } from './backgroundRemover.js';

describe('removeBackground', () => {
  it('외곽 단색 배경(0)을 -1 로 마킹한다', () => {
    const bp = {
      width: 4,
      height: 4,
      palette: ['#FFFFFF', '#FF0000'],
      grid: [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
      ],
    };
    const out = removeBackground(bp);
    expect(out.grid).toEqual([
      [-1, -1, -1, -1],
      [-1, 1, 1, -1],
      [-1, 1, 1, -1],
      [-1, -1, -1, -1],
    ]);
  });

  it('체크무늬(외곽 두 색 교차)도 둘 다 -1 로 마킹한다', () => {
    // 0=흰, 1=회색 체크무늬. 2=건물.
    const bp = {
      width: 5,
      height: 5,
      palette: ['#FFFFFF', '#CCCCCC', '#FF0000'],
      grid: [
        [0, 1, 0, 1, 0],
        [1, 2, 2, 2, 1],
        [0, 2, 2, 2, 0],
        [1, 2, 2, 2, 1],
        [0, 1, 0, 1, 0],
      ],
    };
    const out = removeBackground(bp);
    expect(out.grid).toEqual([
      [-1, -1, -1, -1, -1],
      [-1, 2, 2, 2, -1],
      [-1, 2, 2, 2, -1],
      [-1, 2, 2, 2, -1],
      [-1, -1, -1, -1, -1],
    ]);
  });

  it('건물 내부의 배경과 같은 색은 보존된다 (외곽과 분리)', () => {
    // 0=배경, 2=벽, 0(내부)=창문
    const bp = {
      width: 5,
      height: 5,
      palette: ['#FFFFFF', '#000000', '#FF0000'],
      grid: [
        [0, 0, 0, 0, 0],
        [0, 2, 2, 2, 0],
        [0, 2, 0, 2, 0], // 내부 0 = 창문, 외곽 0 과 분리
        [0, 2, 2, 2, 0],
        [0, 0, 0, 0, 0],
      ],
    };
    const out = removeBackground(bp);
    expect(out.grid[2][2]).toBe(0); // 내부 창문 보존
    expect(out.grid[0][0]).toBe(-1); // 외곽 배경 제거
  });

  it('이미 -1 인 외곽 픽셀은 무시하고 진행한다', () => {
    const bp = {
      width: 4,
      height: 4,
      palette: ['#FF0000'],
      grid: [
        [-1, -1, -1, -1],
        [-1,  0,  0, -1],
        [-1,  0,  0, -1],
        [-1, -1, -1, -1],
      ],
    };
    const out = removeBackground(bp);
    // 외곽이 모두 -1 이라 bg 후보 인덱스가 없음 → 그대로 반환
    expect(out.grid).toEqual(bp.grid);
  });

  it('전부 외곽 색일 때 전체가 -1 이 된다', () => {
    const bp = {
      width: 3,
      height: 3,
      palette: ['#FFFFFF'],
      grid: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    };
    const out = removeBackground(bp);
    expect(out.grid).toEqual([
      [-1, -1, -1],
      [-1, -1, -1],
      [-1, -1, -1],
    ]);
  });

  it('잘못된 입력은 그대로 반환', () => {
    expect(removeBackground(null)).toBeNull();
    expect(removeBackground({ width: 0, height: 0, palette: [], grid: [] }))
      .toEqual({ width: 0, height: 0, palette: [], grid: [] });
  });

  it('원본 blueprint 를 변형하지 않는다 (불변)', () => {
    const bp = {
      width: 3,
      height: 3,
      palette: ['#FFF', '#000'],
      grid: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    };
    const snapshot = JSON.parse(JSON.stringify(bp));
    removeBackground(bp);
    expect(bp).toEqual(snapshot);
  });

  it('maxDepth 옵션으로 처리 깊이를 제한해 건물 안쪽 같은 색을 보호한다', () => {
    // 외곽이 전부 0, 내부에도 0(외곽과 연결됨). maxDepth=1 이면 외곽에서 1픽셀
    // 거리까지만 -1 → 그 이상 깊이의 0 은 보호된다.
    const bp = {
      width: 6,
      height: 6,
      palette: ['#FFFFFF', '#FF0000'],
      grid: [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ],
    };
    const out = removeBackground(bp, { maxDepth: 1 });
    // depth 0 (외곽 모서리): (0,*), (5,*), (*,0), (*,5) → 마킹
    // depth 1 (한 칸 안): (1,1)~(1,4), (4,1)~(4,4), (2,1), (3,1), (2,4), (3,4) → 마킹
    // depth 2 (두 칸 안)인 (2,1)→(2,2)... 등 maxDepth=1 이라 미진행
    // 즉 외곽 두 줄의 0 은 -1, 안쪽 1 은 그대로
    expect(out.grid[0][0]).toBe(-1);
    expect(out.grid[1][1]).toBe(-1);
    // 1 영역은 보존
    expect(out.grid[2][2]).toBe(1);
    expect(out.grid[3][3]).toBe(1);
  });
});

describe('removeIsolatedNoise', () => {
  it('minSize 미만의 작은 component 를 -1 로 정리한다', () => {
    const bp = {
      width: 6,
      height: 6,
      palette: ['#FF0000', '#00FF00'],
      grid: [
        [-1, -1, -1, -1,  0, -1], // 단일 0 노이즈
        [-1, -1, -1, -1, -1, -1],
        [-1,  1,  1, -1, -1, -1],
        [-1,  1,  1,  1, -1, -1],
        [-1,  1,  1, -1, -1, -1],
        [-1, -1, -1, -1, -1,  0], // 단일 0 노이즈
      ],
    };
    const out = removeIsolatedNoise(bp, { minSize: 3 });
    expect(out.grid[0][4]).toBe(-1);
    expect(out.grid[5][5]).toBe(-1);
    // 큰 1 component (7 픽셀) 은 보존
    expect(out.grid[2][1]).toBe(1);
    expect(out.grid[3][3]).toBe(1);
  });

  it('minSize 이상 component 는 보존한다', () => {
    const bp = {
      width: 4,
      height: 4,
      palette: ['#FFFFFF'],
      grid: [
        [-1, -1, -1, -1],
        [-1,  0,  0, -1],
        [-1,  0,  0, -1],
        [-1, -1, -1, -1],
      ],
    };
    const out = removeIsolatedNoise(bp, { minSize: 3 });
    // 4 픽셀 component 는 minSize=3 이상이므로 보존
    expect(out.grid[1][1]).toBe(0);
    expect(out.grid[2][2]).toBe(0);
  });

  it('잘못된 입력은 그대로 반환', () => {
    expect(removeIsolatedNoise(null)).toBeNull();
    const empty = { width: 0, height: 0, palette: [], grid: [] };
    expect(removeIsolatedNoise(empty)).toEqual(empty);
  });

  it('원본 blueprint 를 변형하지 않는다 (불변)', () => {
    const bp = {
      width: 3,
      height: 3,
      palette: ['#FFF'],
      grid: [
        [ 0, -1, -1],
        [-1, -1, -1],
        [-1, -1,  0],
      ],
    };
    const snapshot = JSON.parse(JSON.stringify(bp));
    removeIsolatedNoise(bp, { minSize: 3 });
    expect(bp).toEqual(snapshot);
  });
});
