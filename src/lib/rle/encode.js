// 2D 인덱스 그리드 -> 행 단위 RLE 응답 형태.
// JSON 내보내기 시 모델 응답과 동일한 정규화된 모양을 만들고 싶을 때 사용.
//
// 입력: { width, height, palette, grid: number[][] }
// 출력: { width, height, palette, rows: number[][][] }

export function encodeBlueprint(blueprint) {
  if (!blueprint || typeof blueprint !== 'object') {
    throw new TypeError('encodeBlueprint: blueprint must be an object');
  }
  const { width, height, palette, grid } = blueprint;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`encodeBlueprint: invalid size ${width}x${height}`);
  }
  if (!Array.isArray(grid) || grid.length !== height) {
    throw new TypeError('encodeBlueprint: grid rows mismatch');
  }

  const rows = [];
  for (let y = 0; y < height; y++) {
    const line = grid[y];
    if (!Array.isArray(line) || line.length !== width) {
      throw new TypeError(`encodeBlueprint: row ${y} length mismatch`);
    }
    const row = [];
    let prev = line[0] ?? -1;
    let run = 1;
    for (let x = 1; x < width; x++) {
      const idx = line[x] ?? -1;
      if (idx === prev) {
        run++;
      } else {
        row.push([prev, run]);
        prev = idx;
        run = 1;
      }
    }
    row.push([prev, run]);
    rows.push(row);
  }

  return { width, height, palette: Array.isArray(palette) ? palette.slice() : [], rows };
}
