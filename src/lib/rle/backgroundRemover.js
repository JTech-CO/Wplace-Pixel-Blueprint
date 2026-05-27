// 외곽 flood-fill 기반 자동 누끼 + 고립 노이즈 component 제거.
//
// removeBackground(blueprint, { maxDepth }):
//   외곽에서 출발해 같은 색 인덱스로 연결된 픽셀을 -1 로 마킹하되,
//   외곽으로부터의 거리가 maxDepth 를 넘는 픽셀은 건물 내부로 간주해 보호한다.
//   (양자화 시 건물 외벽 흰색과 외곽 흰색이 같은 인덱스로 묶여 통째로 -1
//    되는 문제를 줄인다.)
//
// removeIsolatedNoise(blueprint, { minSize }):
//   비-투명 같은-색 4-connectivity component 중 픽셀 수가 minSize 미만인 것을
//   -1 로 정리한다. 모델이 그린 스파클·먼지 같은 1~3 픽셀 노이즈 제거용.

export function removeBackground(blueprint, options = {}) {
  if (!blueprint || !Array.isArray(blueprint.grid)) return blueprint;
  const { width, height, palette, grid } = blueprint;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return blueprint;
  }

  // 기본 maxDepth: grid 짧은 변의 ~15%. 적절히 작아야 건물 깊숙한 곳까지 안 흘러감.
  const defaultDepth = Math.max(4, Math.min(20, Math.floor(Math.min(width, height) * 0.15)));
  const maxDepth = options.maxDepth ?? defaultDepth;

  // 1) 외곽 인덱스 수집
  const bg = new Set();
  for (let x = 0; x < width; x++) {
    addIfPositive(bg, grid[0]?.[x]);
    addIfPositive(bg, grid[height - 1]?.[x]);
  }
  for (let y = 0; y < height; y++) {
    addIfPositive(bg, grid[y]?.[0]);
    addIfPositive(bg, grid[y]?.[width - 1]);
  }
  if (bg.size === 0) return blueprint;

  const newGrid = grid.map((row) => row.slice());
  // -1 == 미방문. 0 이상 == 외곽으로부터의 거리.
  const dist = new Int16Array(width * height).fill(-1);

  // 2) 외곽 시드 (bg 후보 인덱스만)
  const queue = [];
  const enqueueSeed = (x, y) => {
    const idx = newGrid[y]?.[x];
    if (idx === undefined || idx < 0 || !bg.has(idx)) return;
    const off = y * width + x;
    if (dist[off] !== -1) return;
    dist[off] = 0;
    queue.push(x, y);
  };
  for (let x = 0; x < width; x++) {
    enqueueSeed(x, 0);
    enqueueSeed(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueSeed(0, y);
    enqueueSeed(width - 1, y);
  }

  // 3) BFS — head index 로 O(1) dequeue
  let head = 0;
  const tryAdvance = (x, y, nextDepth) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const off = y * width + x;
    if (dist[off] !== -1) return;
    const idx = newGrid[y][x];
    if (idx < 0 || !bg.has(idx)) return;
    dist[off] = nextDepth;
    queue.push(x, y);
  };
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const d = dist[y * width + x];
    if (d >= maxDepth) continue; // 깊이 제한 — 건물 안쪽 보호
    tryAdvance(x + 1, y, d + 1);
    tryAdvance(x - 1, y, d + 1);
    tryAdvance(x, y + 1, d + 1);
    tryAdvance(x, y - 1, d + 1);
  }

  // 4) 도달된 모든 픽셀을 -1 로
  for (let y = 0; y < height; y++) {
    const off0 = y * width;
    for (let x = 0; x < width; x++) {
      if (dist[off0 + x] !== -1) newGrid[y][x] = -1;
    }
  }

  return { width, height, palette, grid: newGrid };
}

export function removeIsolatedNoise(blueprint, options = {}) {
  if (!blueprint || !Array.isArray(blueprint.grid)) return blueprint;
  const { width, height, palette, grid } = blueprint;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return blueprint;
  }
  const minSize = options.minSize ?? 4;
  if (minSize <= 1) return blueprint;

  const newGrid = grid.map((row) => row.slice());
  const visited = new Uint8Array(width * height);

  for (let y0 = 0; y0 < height; y0++) {
    for (let x0 = 0; x0 < width; x0++) {
      const start = y0 * width + x0;
      if (visited[start]) continue;
      const targetIdx = newGrid[y0][x0];
      if (targetIdx < 0) { visited[start] = 1; continue; }

      // 같은 인덱스 4-connectivity 로 component 수집
      const component = [];
      const stack = [x0, y0];
      visited[start] = 1;
      while (stack.length) {
        const yy = stack.pop();
        const xx = stack.pop();
        component.push(yy * width + xx);
        // 4 이웃
        const neighbors = [
          [xx + 1, yy],
          [xx - 1, yy],
          [xx, yy + 1],
          [xx, yy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const noff = ny * width + nx;
          if (visited[noff]) continue;
          if (newGrid[ny][nx] !== targetIdx) continue;
          visited[noff] = 1;
          stack.push(nx, ny);
        }
      }

      if (component.length < minSize) {
        for (const off of component) {
          const cy = (off / width) | 0;
          const cx = off - cy * width;
          newGrid[cy][cx] = -1;
        }
      }
    }
  }

  return { width, height, palette, grid: newGrid };
}

function addIfPositive(set, v) {
  if (Number.isInteger(v) && v >= 0) set.add(v);
}
