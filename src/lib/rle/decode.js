// 백서 §4.2 / §5.1 — 팔레트+RLE 응답을 2D 인덱스 그리드로 디코딩.
//
// 입력 raw: { width, height, palette: string[], rows: number[][][] }
// 출력:     { width, height, palette, grid: number[][] }
//
// 방어적 동작 (validate 를 거치지 않은 raw 도 받을 수 있게):
//   - rows 가 부족하면 누락 행을 투명(-1) 으로 패딩
//   - 행의 run 합이 width 보다 작으면 끝을 투명으로 패딩
//   - 행의 run 합이 width 를 넘으면 width 에서 절단

export function decodeBlueprint(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('decodeBlueprint: raw must be an object');
  }
  const width  = raw.width  | 0;
  const height = raw.height | 0;
  if (width <= 0 || height <= 0) {
    throw new RangeError(`decodeBlueprint: invalid size ${width}x${height}`);
  }
  const palette = Array.isArray(raw.palette) ? raw.palette.slice() : [];
  const rows = Array.isArray(raw.rows) ? raw.rows : [];

  const grid = Array.from({ length: height }, () => new Array(width).fill(-1));

  const rowCount = Math.min(height, rows.length);
  for (let y = 0; y < rowCount; y++) {
    const row = Array.isArray(rows[y]) ? rows[y] : [];
    let x = 0;
    for (const pair of row) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const idx = Number.isInteger(pair[0]) ? pair[0] : -1;
      const run = Math.max(0, pair[1] | 0);
      for (let k = 0; k < run && x < width; k++, x++) {
        grid[y][x] = idx;
      }
      if (x >= width) break; // 초과분 절단
    }
    // x < width 인 경우 grid 가 이미 -1 로 초기화되어 있어 투명 패딩 효과
  }

  return { width, height, palette, grid };
}
