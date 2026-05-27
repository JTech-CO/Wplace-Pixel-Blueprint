import { describe, it, expect } from 'vitest';
import { computeBackgroundMask } from './backgroundMask.js';

function cellGrid(rows) {
  const map = {
    W: [255, 255, 255], // 흰색
    K: [0, 0, 0],       // 검정 outline
    G: [220, 220, 220], // 연회색
    g: [170, 170, 170], // 진회색
    B: [225, 200, 160], // 베이지
    R: [200, 60, 60],   // 빨강
    _: null,            // 투명
  };
  const cells = [];
  for (const r of rows) {
    for (const ch of r) cells.push(map[ch] ?? null);
  }
  return { cells, W: rows[0].length, H: rows.length };
}

describe('computeBackgroundMask', () => {
  it('외곽 흰색을 배경으로 마킹하고 어두운 outline 안쪽은 보호한다', () => {
    const { cells, W, H } = cellGrid([
      'WWWWW',
      'WKKKW',
      'WKWKW',
      'WKKKW',
      'WWWWW',
    ]);
    const mask = computeBackgroundMask(cells, W, H);
    expect(mask[0 * W + 0]).toBe(1);              // 외곽 흰색 → 배경
    expect(mask[0 * W + (W - 1)]).toBe(1);
    expect(mask[(H - 1) * W + 0]).toBe(1);
    expect(mask[1 * W + 1]).toBe(0);              // 검정 outline 보호
    expect(mask[2 * W + 2]).toBe(0);              // 내부 흰색 보존
  });

  it('투명 외곽은 모든 transparent 픽셀을 배경으로', () => {
    const { cells, W, H } = cellGrid([
      '_____',
      '_RRR_',
      '_RRR_',
      '_____',
    ]);
    const mask = computeBackgroundMask(cells, W, H);
    expect(mask[0]).toBe(1);
    expect(mask[1 * W + 1]).toBe(0);              // 빨강 보호
    expect(mask[2 * W + 2]).toBe(0);
  });

  it('베이지·진회색·검정처럼 외곽 색에서 먼 색은 outline 없이도 보호된다', () => {
    // 외곽 흰색, 내부에 베이지·진회색·검정 점들. outline 없음.
    const { cells, W, H } = cellGrid([
      'WWWWWWWWW',
      'WWBgKgBWW',
      'WBKgKgKBW',
      'WgKWWWKgW',
      'WBKgKgKBW',
      'WWBgKgBWW',
      'WWWWWWWWW',
    ]);
    const mask = computeBackgroundMask(cells, W, H);
    expect(mask[0]).toBe(1);                       // 외곽 흰색
    expect(mask[3 * W + 1]).toBe(0);               // 베이지 보호
    expect(mask[2 * W + 2]).toBe(0);               // 검정 보호
    expect(mask[1 * W + 3]).toBe(0);               // 진회색 보호
    expect(mask[3 * W + 3]).toBe(0);               // 안쪽 흰색 — outline 끊김 여부 무관, 외곽과 connected 끊겨 보호
  });

  it('외곽에 노이즈가 섞여도 median bgRef 가 안정적이라 큰 영향을 안 받는다', () => {
    // 외곽이 거의 흰색이고 모서리에 회색·검정 점 몇 개. median 은 흰색.
    const { cells, W, H } = cellGrid([
      'KWWWWWWWg',
      'W       W',  // 단순화 - 빈 줄로 가운데 채움
      'W       W',
      'W   R   W',  // 내부 빨강
      'W       W',
      'W       W',
      'gWWWWWWWK',
    ]);
    // 위 cellGrid 는 ' '(space) 를 null 로 매핑 → 안쪽이 transparent 가 됨.
    // 빨강은 보존, 외곽 흰색 + 일부 노이즈 흑/회 픽셀은 bgRef(흰색) 와 멀어서 보존되는 자체 시드,
    // 단 그 픽셀들 자체는 외곽 시드라 transparent 또는 직접 매칭됨.
    const mask = computeBackgroundMask(cells, W, H);
    expect(mask[3 * W + 4]).toBe(0);               // 빨강 보호
    expect(mask[1 * W + 4]).toBe(1);               // transparent → 배경
    // 외곽 흰색은 모두 배경
    expect(mask[0 * W + 1]).toBe(1);
  });

  it('점진적 색 변화를 따라가지 않는다 (그라데이션 추적 X)', () => {
    // 외곽 흰색 → 인접 연회색 → 진회색 → 빨강. 점진적이지만 외곽 기준
    // 거리만 검사하므로 G(220) 부터 임계값 28 밖이라 보호되어야 함.
    const { cells, W, H } = cellGrid([
      'WWWWWWWWW',
      'WGGGGGGGW',
      'WGgggggGW',
      'WGgRRRgGW',
      'WGgggggGW',
      'WGGGGGGGW',
      'WWWWWWWWW',
    ]);
    const mask = computeBackgroundMask(cells, W, H);
    expect(mask[0]).toBe(1);                       // 외곽 흰색
    // G(220) ↔ 흰색(255) 거리 = sqrt(35²×3) ≈ 60.6, 임계값 28 밖 → 보호
    expect(mask[1 * W + 1]).toBe(0);
    expect(mask[3 * W + 3]).toBe(0);               // R 보호
  });

  it('잘못된 입력은 빈 mask 반환', () => {
    expect(computeBackgroundMask(null, 4, 4)).toEqual(new Uint8Array(16));
    expect(computeBackgroundMask([1, 2], 4, 4)).toEqual(new Uint8Array(16));
  });

  it('1픽셀 폭 통로로 새어 들어가도 안쪽 큰 흰색 영역은 erosion-dilation 으로 보호된다', () => {
    // 외곽 W, K outline 에 1픽셀 틈 (1,3), 안쪽 큰 W 영역
    //     0 1 2 3 4 5 6 7 8
    //  0: W W W W W W W W W   ← 외곽
    //  1: W K K W K K K K W   ← outline + 틈 (1,3)
    //  2: W K W W W W W K W   ← 안쪽 큰 흰색 영역
    //  3: W K K K K K K K W   ← outline
    //  4: W W W W W W W W W   ← 외곽
    const { cells, W, H } = cellGrid([
      'WWWWWWWWW',
      'WKKWKKKKW',
      'WKWWWWWKW',
      'WKKKKKKKW',
      'WWWWWWWWW',
    ]);
    const mask = computeBackgroundMask(cells, W, H);
    // 외곽 본체 모두 -1
    expect(mask[0 * W + 0]).toBe(1);
    expect(mask[0 * W + 8]).toBe(1);
    expect(mask[4 * W + 4]).toBe(1);
    // 안쪽 큰 흰색 영역 — 좁은 통로 너머는 보호
    expect(mask[2 * W + 4]).toBe(0); // 정중앙
    expect(mask[2 * W + 5]).toBe(0);
    expect(mask[2 * W + 6]).toBe(0);
  });

  it('erosionPasses=0 옵션이면 모폴로지 없이 단순 flood-fill', () => {
    // 1픽셀 통로로 안쪽까지 새어 들어가도록 허용
    const { cells, W, H } = cellGrid([
      'WWWWWWWWW',
      'WKKWKKKKW',
      'WKWWWWWKW',
      'WKKKKKKKW',
      'WWWWWWWWW',
    ]);
    const mask = computeBackgroundMask(cells, W, H, { erosionPasses: 0 });
    // 통로 (1,3) 을 통해 안쪽 영역도 모두 잡힘
    expect(mask[2 * W + 4]).toBe(1);
  });
});
