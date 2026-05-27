// wplace 공식 팔레트 (사용자 제공, 2026-05).
// 무료 31색 + 유료 32색.
// 각 항목: { name, hex } — RGB 는 헬퍼에서 동적 변환.

export const WPLACE_FREE_COLORS = [
  { name: 'Black',         hex: '#000000' },
  { name: 'Dark Gray',     hex: '#3C3C3C' },
  { name: 'Gray',          hex: '#787878' },
  { name: 'Light Gray',    hex: '#D2D2D2' },
  { name: 'White',         hex: '#FFFFFF' },
  { name: 'Deep Red',      hex: '#600018' },
  { name: 'Red',           hex: '#ED1C24' },
  { name: 'Orange',        hex: '#FF7F27' },
  { name: 'Gold',          hex: '#F6AA09' },
  { name: 'Yellow',        hex: '#F9DD3B' },
  { name: 'Light Yellow',  hex: '#FFFABC' },
  { name: 'Dark Green',    hex: '#0EB968' },
  { name: 'Green',         hex: '#13E67B' },
  { name: 'Light Green',   hex: '#87FF5E' },
  { name: 'Dark Teal',     hex: '#0C816E' },
  { name: 'Teal',          hex: '#10AEA6' },
  { name: 'Light Teal',    hex: '#13E1BE' },
  { name: 'Cyan',          hex: '#60F7F2' },
  { name: 'Dark Blue',     hex: '#28509E' },
  { name: 'Blue',          hex: '#4093E4' },
  { name: 'Indigo',        hex: '#6B50F6' },
  { name: 'Light Indigo',  hex: '#99B1FB' },
  { name: 'Dark Purple',   hex: '#780C99' },
  { name: 'Purple',        hex: '#AA38B9' },
  { name: 'Light Purple',  hex: '#E09FF9' },
  { name: 'Dark Pink',     hex: '#CB007A' },
  { name: 'Pink',          hex: '#EC1F80' },
  { name: 'Light Pink',    hex: '#F38DA9' },
  { name: 'Dark Brown',    hex: '#684634' },
  { name: 'Brown',         hex: '#95682A' },
  { name: 'Beige',         hex: '#F8B277' },
];

export const WPLACE_PAID_COLORS = [
  { name: 'Medium Gray',       hex: '#AAAAAA' },
  { name: 'Dark Red',          hex: '#A50E1E' },
  { name: 'Light Red',         hex: '#FA8072' },
  { name: 'Dark Orange',       hex: '#E45C1A' },
  { name: 'Dark Goldenrod',    hex: '#9C8431' },
  { name: 'Goldenrod',         hex: '#C5AD31' },
  { name: 'Light Goldenrod',   hex: '#E8D45F' },
  { name: 'Dark Olive',        hex: '#4A6B3A' },
  { name: 'Olive',             hex: '#5A944A' },
  { name: 'Light Olive',       hex: '#84C573' },
  { name: 'Dark Cyan',         hex: '#0F799F' },
  { name: 'Light Cyan',        hex: '#BBFAF2' },
  { name: 'Light Blue',        hex: '#7DC7FF' },
  { name: 'Dark Indigo',       hex: '#4D31B8' },
  { name: 'Dark Slate Blue',   hex: '#4A4284' },
  { name: 'Slate Blue',        hex: '#7A71C4' },
  { name: 'Light Slate Blue',  hex: '#B5AEF1' },
  { name: 'Dark Peach',        hex: '#9B5249' },
  { name: 'Peach',             hex: '#D18078' },
  { name: 'Light Peach',       hex: '#FAB6A4' },
  { name: 'Light Brown',       hex: '#DBA463' },
  { name: 'Dark Tan',          hex: '#7B6352' },
  { name: 'Tan',               hex: '#9C846B' },
  { name: 'Light Tan',         hex: '#D6B594' },
  { name: 'Dark Beige',        hex: '#D18051' },
  { name: 'Light Beige',       hex: '#FFC5A5' },
  { name: 'Dark Stone',        hex: '#6D643F' },
  { name: 'Stone',             hex: '#948C6B' },
  { name: 'Light Stone',       hex: '#CDC59E' },
  { name: 'Dark Slate',        hex: '#333941' },
  { name: 'Slate',             hex: '#6D758D' },
  { name: 'Light Slate',       hex: '#B3B9D1' },
];

function hexToRgbInternal(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// 활성 토글에 따라 [{ name, hex, rgb }, ...] 반환.
// 둘 다 false 인 경우 빈 배열 → 호출측에서 wplace 매핑을 적용하지 않는다.
export function getActiveWplaceColors({ free = true, paid = false } = {}) {
  const list = [];
  if (free) list.push(...WPLACE_FREE_COLORS);
  if (paid) list.push(...WPLACE_PAID_COLORS);
  return list.map((c) => ({
    name: c.name,
    hex: c.hex.toUpperCase(),
    rgb: hexToRgbInternal(c.hex),
  }));
}

export const WPLACE_TOTAL_FREE = WPLACE_FREE_COLORS.length;
export const WPLACE_TOTAL_PAID = WPLACE_PAID_COLORS.length;
