// 2D 인덱스 그리드를 Canvas 에 도트 + 옵션 격자선으로 렌더.
//
// 사이드 이펙트: canvas.width / canvas.height 를 grid 크기 × cell 로 강제 설정.
//   - 컨테이너 CSS 폭에 의존하지 않도록 픽셀 정확성 보장 (image-rendering: pixelated 와 짝).

export function renderBlueprint(canvas, blueprint, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new TypeError('renderBlueprint: invalid canvas');
  }
  if (!blueprint || !Array.isArray(blueprint.grid)) {
    throw new TypeError('renderBlueprint: invalid blueprint');
  }

  const cell = Math.max(1, (options.cell | 0) || 12);
  const gridLines = options.gridLines !== false;
  const background = options.background ?? 'transparent';

  const { width, height, palette, grid } = blueprint;
  const ctx = canvas.getContext('2d');

  canvas.width = width * cell;
  canvas.height = height * cell;
  ctx.imageSmoothingEnabled = false;

  // 배경
  if (background === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 도트
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < width; x++) {
      const idx = row[x];
      if (idx < 0 || idx >= palette.length) continue; // 투명
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // 격자선 — 도트 위에 옅게 (slate-400/35%)
  if (gridLines) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      const xp = x * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(xp, 0);
      ctx.lineTo(xp, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      const yp = y * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, yp);
      ctx.lineTo(canvas.width, yp);
      ctx.stroke();
    }
  }
}
