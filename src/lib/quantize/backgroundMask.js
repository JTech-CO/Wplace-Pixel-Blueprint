// 양자화 단계의 subject/background 분리 알고리즘 — 모폴로지 보강판.
//
// 문제: 모델이 그린 outline 에 작은 틈(1~2 픽셀)이 있으면, 외곽 흰색이 그 좁은
// 통로를 통해 건물 안 흰색까지 4-connectivity 로 이어진다. 단순 flood-fill 은
// 이 통로를 통과해 건물 내부까지 -1 처리해버린다.
//
// 해결:
//   1) bgRef(외곽 median 색) 와 거리가 threshold 미만인 픽셀로 whiteMask 추출.
//   2) erosion 2회 — 4-이웃이 모두 mask 일 때만 살아남음. 좁은 통로(폭 ≤2)는
//      이 단계에서 끊긴다. 외곽 본체는 격자 바깥을 mask 로 가정해 보존.
//   3) 외곽 시드에서 4-conn flood-fill — 외곽 큰 영역만 reachable.
//   4) dilation 2회 — reachable 영역을 whiteMask 안에서만 다시 확장.
//      → 외곽 큰 영역은 원래 모양으로 복원, 좁은 통로로 새어 들어간 안쪽
//        흰색은 외곽과 분리되어 별개 component 라 dilation 이 도달 못 함.

const DEFAULT_COLOR_THRESHOLD = 28;
const DEFAULT_EROSION_PASSES = 2;

export function computeBackgroundMask(cells, W, H, options = {}) {
  const colorThreshold = options.colorThreshold ?? DEFAULT_COLOR_THRESHOLD;
  const passes = Math.max(0, options.erosionPasses ?? DEFAULT_EROSION_PASSES);
  const tSquared = colorThreshold * colorThreshold;
  const size = W * H;

  if (!Array.isArray(cells) || cells.length !== size || W <= 0 || H <= 0) {
    return new Uint8Array(size);
  }

  const bgRef = computeEdgeMedian(cells, W, H);

  // 1) whiteMask — bgRef 와 색이 가까운 픽셀 + transparent
  const whiteMask = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const p = cells[i];
    if (!p) {
      whiteMask[i] = 1;
      continue;
    }
    if (!bgRef) continue;
    const dr = p[0] - bgRef[0];
    const dg = p[1] - bgRef[1];
    const db = p[2] - bgRef[2];
    if (dr * dr + dg * dg + db * db < tSquared) whiteMask[i] = 1;
  }

  // 2) erosion — 좁은 통로 차단 (격자 바깥은 mask 1 로 가정해 외곽 본체 보존)
  let eroded = whiteMask;
  for (let p = 0; p < passes; p++) eroded = erode(eroded, W, H);

  // 3) 외곽 시드 4-conn flood-fill
  let reachable = floodFillFromEdges(eroded, W, H);

  // 4) dilation — whiteMask 안에서 reachable 을 확장
  for (let p = 0; p < passes; p++) reachable = dilateWithin(reachable, whiteMask, W, H);

  return reachable;
}

function erode(mask, W, H) {
  // 외곽 본체(y=0, y=H-1, x=0, x=W-1) 픽셀은 mask=1 이면 무조건 보존.
  // 내부 픽셀만 4-이웃 검사로 erode 한다. 좁은 통로(폭 ≤2 px)는 끊긴다.
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const off = y * W + x;
      if (!mask[off]) continue;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        out[off] = 1;
        continue;
      }
      const up    = mask[off - W];
      const down  = mask[off + W];
      const left  = mask[off - 1];
      const right = mask[off + 1];
      if (up && down && left && right) out[off] = 1;
    }
  }
  return out;
}

function floodFillFromEdges(mask, W, H) {
  const out = new Uint8Array(W * H);
  const queue = [];
  let head = 0;
  const visit = (x, y) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const off = y * W + x;
    if (out[off] || !mask[off]) return;
    out[off] = 1;
    queue.push(x, y);
  };
  for (let x = 0; x < W; x++) {
    visit(x, 0);
    visit(x, H - 1);
  }
  for (let y = 1; y < H - 1; y++) {
    visit(0, y);
    visit(W - 1, y);
  }
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  return out;
}

function dilateWithin(seed, allowed, W, H) {
  // seed 를 allowed 안에서만 1픽셀 확장 (4-이웃 중 seed 인 것이 하나라도 있으면 추가)
  const out = new Uint8Array(W * H);
  // 먼저 seed 자체 복사
  for (let i = 0; i < W * H; i++) if (seed[i]) out[i] = 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const off = y * W + x;
      if (out[off] || !allowed[off]) continue;
      if (
        (y > 0     && seed[off - W]) ||
        (y < H - 1 && seed[off + W]) ||
        (x > 0     && seed[off - 1]) ||
        (x < W - 1 && seed[off + 1])
      ) {
        out[off] = 1;
      }
    }
  }
  return out;
}

function computeEdgeMedian(cells, W, H) {
  const rs = [];
  const gs = [];
  const bs = [];
  const push = (off) => {
    const p = cells[off];
    if (p) { rs.push(p[0]); gs.push(p[1]); bs.push(p[2]); }
  };
  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 1; y < H - 1; y++) {
    push(y * W);
    push(y * W + (W - 1));
  }
  if (rs.length === 0) return null;
  return [pickMedian(rs), pickMedian(gs), pickMedian(bs)];
}

function pickMedian(arr) {
  arr.sort((a, b) => a - b);
  const mid = arr.length >> 1;
  return arr.length % 2 === 0 ? Math.round((arr[mid - 1] + arr[mid]) / 2) : arr[mid];
}
