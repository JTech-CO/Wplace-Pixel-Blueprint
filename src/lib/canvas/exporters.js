// PNG / JSON 내보내기. 파일명은 호출측에서 fileName_blueprint.ext 형태로 만들어 전달.

export function toPngDataUrl(canvas) {
  if (!canvas || typeof canvas.toDataURL !== 'function') {
    throw new TypeError('toPngDataUrl: invalid canvas');
  }
  return canvas.toDataURL('image/png');
}

// 현재 화면에 그려진 캔버스를 그대로 저장 — cell 이 적용된 고해상도 PNG.
export function downloadPng(canvas, filename) {
  const dataUrl = toPngDataUrl(canvas);
  triggerDownload(dataUrl, ensureExt(filename, '.png'));
}

// blueprint 의 grid 원본 크기(cell=1)로 새 offscreen 캔버스를 그려 저장.
// 격자선은 의미가 없으므로 그리지 않는다. background 는 'transparent' 또는 hex 색.
export function downloadPixelPng(blueprint, filename, background = 'transparent') {
  if (!blueprint || !Array.isArray(blueprint.grid)) {
    throw new TypeError('downloadPixelPng: invalid blueprint');
  }
  const { width, height, palette, grid } = blueprint;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`downloadPixelPng: invalid size ${width}x${height}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (background === 'transparent') {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < width; x++) {
      const idx = row[x];
      if (idx < 0 || idx >= palette.length) continue;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  downloadPng(canvas, filename);
}

export function downloadJson(blueprint, filename) {
  if (!blueprint || typeof blueprint !== 'object') {
    throw new TypeError('downloadJson: invalid blueprint');
  }
  const blob = new Blob([JSON.stringify(blueprint, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, ensureExt(filename, '.json'));
  } finally {
    // 다운로드 트리거가 비동기로 잡힐 수 있으므로 잠시 후 회수
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function triggerDownload(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name || 'blueprint';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function ensureExt(name, ext) {
  if (!name) return `blueprint${ext}`;
  return name.toLowerCase().endsWith(ext) ? name : `${name}${ext}`;
}
