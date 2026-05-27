// 백서 §3 Pipeline B — 결정론적 양자화 + 건물/배경 분리.
//
// 흐름:
//   1) base64 / dataURL 이미지를 로드
//   2) offscreen canvas 에 W×H 로 nearest-neighbor 다운스케일
//   3) cells: [r,g,b]|null (null = alpha < 128) 배열로 정리
//   4) computeBackgroundMask 로 subject/background 분리 마스크 계산
//   5) **마스크 안쪽 픽셀만** 모아서 median-cut 으로 ≤maxColors 팔레트 추출
//      → 배경 색은 palette 에 포함되지 않음
//   6) grid: 마스크 안쪽 → 가장 가까운 palette index, 그 외 → -1
//   7) Pipeline A 와 동일한 { width, height, palette, grid } 구조 반환

import { buildPalette } from './medianCut.js';
import { computeBackgroundMask } from './backgroundMask.js';

const ALPHA_THRESHOLD = 128;

export async function quantizeImageToGrid(input, W, H, maxColors = 16) {
  if (!Number.isInteger(W) || !Number.isInteger(H) || W <= 0 || H <= 0) {
    throw new RangeError(`quantizeImageToGrid: invalid size ${W}x${H}`);
  }
  if (typeof input !== 'string' || !input) {
    throw new TypeError('quantizeImageToGrid: input must be a non-empty string');
  }

  const src = input.startsWith('data:') ? input : `data:image/png;base64,${input}`;
  const img = await loadImage(src);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  // 1) 셀 배열 — alpha 검사
  const cells = new Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const off = i * 4;
    const a = data[off + 3];
    cells[i] = a < ALPHA_THRESHOLD ? null : [data[off], data[off + 1], data[off + 2]];
  }

  // 2) Subject/background 분리 마스크
  const isBg = computeBackgroundMask(cells, W, H);

  // 3) 마스크 안쪽 (subject) 픽셀만 모아서 palette 추출
  const subjectPixels = [];
  for (let i = 0; i < W * H; i++) {
    if (isBg[i]) continue;
    const p = cells[i];
    if (!p) continue;
    subjectPixels.push(p);
  }
  const { palette, indexOf } = buildPalette(subjectPixels, maxColors);

  // 4) grid 생성 — 배경/투명 → -1, 건물 → palette index
  const grid = new Array(H);
  for (let y = 0; y < H; y++) {
    const row = new Array(W);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const p = cells[i];
      if (isBg[i] || !p) {
        row[x] = -1;
      } else {
        row[x] = indexOf(p);
      }
    }
    grid[y] = row;
  }

  return { width: W, height: H, palette, grid };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}
