// 유클리드 RGB 거리 기반 nearest 인덱스 + HEX <-> RGB 변환.

export function findNearestIndex(rgb, paletteRgb) {
  if (!Array.isArray(paletteRgb) || paletteRgb.length === 0) return -1;
  let best = 0;
  let bestDist = Infinity;
  const r = rgb[0], g = rgb[1], b = rgb[2];
  for (let i = 0; i < paletteRgb.length; i++) {
    const p = paletteRgb[i];
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return [0, 0, 0];
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rgbToHex(rgb) {
  const c = (v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}
