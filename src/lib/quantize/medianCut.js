// Median-cut 팔레트 추출.
//
// buildPalette(pixels, maxColors=16)
//   pixels:  [r,g,b][] 형태의 불투명 픽셀들 (alpha < 128 은 호출측에서 사전 제외)
//   maxColors: 결과 팔레트 크기 상한
//
// 결과: { palette: string[]("#RRGGBB"), paletteRgb: [r,g,b][], indexOf([r,g,b])->number }

import { findNearestIndex, rgbToHex } from './nearestColor.js';

export function buildPalette(pixels, maxColors = 16) {
  const safePixels = (Array.isArray(pixels) ? pixels : []).filter(
    (p) => Array.isArray(p) && p.length >= 3,
  );
  if (safePixels.length === 0) {
    return { palette: [], paletteRgb: [], indexOf: () => -1 };
  }

  let boxes = [createBox(safePixels)];

  while (boxes.length < maxColors) {
    const target = pickLargest(boxes);
    if (!target || target.pixels.length < 2) break;
    const split = splitBox(target);
    if (!split) break;
    const [a, b] = split;
    boxes = boxes.filter((x) => x !== target).concat([a, b]);
  }

  const paletteRgb = boxes.map((b) => b.avg);
  const palette = paletteRgb.map(rgbToHex);

  const indexOf = (rgb) => findNearestIndex(rgb, paletteRgb);

  return { palette, paletteRgb, indexOf };
}

function createBox(pixels) {
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of pixels) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
    sumR += r; sumG += g; sumB += b;
  }
  const n = pixels.length;
  return {
    pixels,
    range: [maxR - minR, maxG - minG, maxB - minB],
    avg: [Math.round(sumR / n), Math.round(sumG / n), Math.round(sumB / n)],
  };
}

function pickLargest(boxes) {
  // 분할 여지가 가장 큰 박스 (가장 긴 축의 길이 × sqrt(pixels)) 선택.
  // 모든 픽셀이 같은 색인 박스(range max=0) 는 분할 의미가 없으므로 후보 제외.
  let best = null;
  let bestScore = -1;
  for (const b of boxes) {
    if (b.pixels.length < 2) continue;
    const longest = Math.max(b.range[0], b.range[1], b.range[2]);
    if (longest === 0) continue;
    const score = longest * Math.sqrt(b.pixels.length);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best;
}

function splitBox(box) {
  const axis =
    box.range[0] >= box.range[1] && box.range[0] >= box.range[2] ? 0
    : box.range[1] >= box.range[2] ? 1
    : 2;
  const sorted = box.pixels.slice().sort((p, q) => p[axis] - q[axis]);
  const mid = sorted.length >> 1;
  if (mid <= 0 || mid >= sorted.length) return null;
  return [createBox(sorted.slice(0, mid)), createBox(sorted.slice(mid))];
}
