# Wplace 픽셀아트 빌딩 가이드 생성기 — 기술 백서 & 시스템 아키텍처 가이드 (v2, 2026-05 최신화)

> **대상**: Google Antigravity 등 AI IDE가 본 문서를 파싱하여 별도 질의 없이 바로 코드로 빌드할 수 있도록 작성된 구현 사양서.
> **스택**: Vite + React + Tailwind, `@google/genai`(통합 Gen AI SDK), HTML5 Canvas, 100% 클라이언트 사이드(서버리스).

---

## 0. 최신화 요약 (v1 → v2 변경 이력)

AI IDE는 빌드 전에 이 섹션을 먼저 반영할 것.

| # | 항목 | v1 (구버전) | v2 (수정) | 사유 |
|---|------|------------|-----------|------|
| 1 | 모델명 불일치 | 아키텍처 `gemini-2.5-*`, 코드 `gemini-1.5-flash` | `gemini-flash-latest` 기본 + 핀 옵션 표(§4.0) | 1.5는 종료(404), 2.0은 2026-06-01 종료 예정. 현재는 3/3.1/3.5 계열. |
| 2 | 응답 스키마 | 픽셀당 `{x,y,color}` 객체 배열 | **팔레트 + 행 단위 RLE**(§4.2) | 64×64=최대 4096객체 → 토큰 초과/좌표 누락/환각. RLE로 토큰 10~30배 절감. |
| 3 | 파이프라인 | 비전 해석 → 좌표 JSON 단일 경로 | **A: 구조화 출력 / B: 이미지생성+클라 양자화** 이원화(§3) | "이미지 생성 기반" 요구 충족 + 고해상도 안정성 확보. |
| 4 | 응답 파싱 | `JSON.parse(response.text)` | `response.parsed` 우선, 실패 시 `response.text` 폴백(§5.1) | 신 SDK는 스키마 성공 시 파싱된 객체를 직접 제공. |
| 5 | 비정방형 | 흐름엔 언급, 코드는 `${n}x${n}` 강제 | `width`/`height` 분리 입력 | 명세-구현 불일치 해소. |
| 6 | 보안 문구 | "해킹 위협에서 완벽히 자유" | 정확한 위협 모델 + 키 제한 권고(§6) | 클라 키는 브라우저에 노출됨. 과장 표현 교정. |
| 7 | 다운로드 파일명 | 하드코딩 `ieodo_blueprint` | 업로드 파일명 기반 동적 생성 | 재사용성. |

---

## 1. 개요

### 문제 정의
기존 대규모 변환 툴(예: 블루마블류)은 이미지를 1:1로 단순 다운스케일 투사하므로, 픽셀아티스트 특유의 '아기자기한 미니어처 시티 감성'과 '정돈된 도트 라인'을 살리기 어렵다. 복잡한 현실 건축물/조형물 사진을 손도트로 찍기 좋은 커스텀 스케일의 2.5D 이소메트릭(쿼터뷰) 도안으로 **재해석**하는 지능형 툴이 필요하다.

### 핵심 솔루션
- **서버리스 정적 웹앱**: 백엔드·DB 없음. 유지비 0원, GitHub Pages/Vercel에서 무료 호스팅.
- **BYO Key(Bring Your Own Key)**: 사용자가 본인 Gemini API Key를 입력해 직접 구동. 오픈소스 공유에 적합.
- **구조화 출력 + Canvas 렌더**: Gemini의 구조화 JSON 출력으로 도안 데이터를 받아 HTML5 Canvas로 프리뷰/내보내기(PNG·JSON).

---

## 2. 시스템 아키텍처

```
+------------------------------------------------------------------------------------+
|                                   USER BROWSER                                     |
|                                                                                    |
|  +--------------------+      +-----------------------+     +-------------------+   |
|  |   User Interface   | ---> | Image File / Settings | --->|  HTML5 Canvas     |   |
|  | (React & Tailwind) |      | (Upload & WxH / Preset)|     |  (Pixel Preview)  |   |
|  +---------+----------+      +-----------+-----------+     +---------+---------+   |
|            |                             |                           ^             |
|            | API Key                     | Base64 Image              | Render grid |
|            v                             v                           |             |
|  +--------------------+    +-------------------------------+         |             |
|  |    LocalStorage    |    |        @google/genai          |         |             |
|  |  (API Key 저장)     |    |  (Client SDK / fetch 호출)     |         |             |
|  +--------------------+    +---------------+---------------+         |             |
|                                            |                         |             |
+--------------------------------------------|-------------------------|-------------+
                                             |                         |
            Pipeline A: text+image -> JSON   |   Pipeline B: text -> image bytes
                  (Structured Output)        |        (Native image gen)
                                             v                         |
+--------------------------------------------|-------------------------|-------------+
|                              GOOGLE GEMINI API ENDPOINT              |             |
|                                                                     |             |
|  A) 분석/구조화: gemini-flash-latest (또는 3.x 핀)                     |             |
|     - 출력 제약: responseSchema (palette + RLE rows)                  |             |
|  B) 이미지 생성: gemini-3.1-flash-image (Nano Banana 2)              |             |
|     - 출력: PNG bytes -> 브라우저에서 결정론적 양자화 -> grid           |             |
+---------------------------------------------------------------------+-------------+
```

본 백서는 **Pipeline A를 기본 구현**으로 하고, **Pipeline B를 고해상도/고품질 대안**으로 제공한다. UI에서 토글로 선택 가능하게 설계한다.

---

## 3. 데이터 흐름 및 파이프라인

### 공통 준비 단계
1. 사용자가 설정창에 Gemini API Key 입력 → 즉시 `localStorage`에 저장.
2. 건물/조형물 사진 업로드.
3. 정밀도(권장 32×32 ~ 64×64, 비정방형 허용)와 스타일 프리셋(2.5D 이소메트릭 / 미니어처 토이 등) 선택.
4. 이미지는 Base64로 인코딩되어 SDK로 전달.

### Pipeline A — 구조화 출력 (기본, ≤ 64×64 권장)
- Gemini가 이미지를 **해석**하여 단순 축소가 아닌 도트 가이드를 생성.
- 출력은 **팔레트 + 행 단위 RLE JSON**(§4.2)으로 강제 → 토큰 절감·파싱 안정.
- 렌더러가 RLE를 디코딩해 Canvas에 그린다.
- 장점: 빠르고 저렴, "정돈된 도트" 감성에 강함.
- 한계: 그리드가 커질수록(>64) 출력이 불안정. 이 경우 Pipeline B 권장.

### Pipeline B — 이미지 생성 + 클라이언트 양자화 (고품질/고해상도)
- Gemini 이미지 모델(Nano Banana 2 등)에 "픽셀아트 스타일 PNG 생성"을 요청.
- 반환된 PNG를 오프스크린 Canvas에 그린 뒤, 브라우저에서 **결정론적**으로 처리:
  1. `WxH` 그리드로 nearest-neighbor 다운스케일(`imageSmoothingEnabled=false`).
  2. 색상 양자화(중앙값 분할/median-cut 또는 고정 팔레트 매핑)로 색 수 제한.
  3. 셀별 대표색 추출 → 동일 grid 데이터 구조 생성.
- 장점: 토큰 한계와 무관, 해상도 자유, 시각 품질 우수, 좌표 환각 없음(양자화는 결정론적).
- 한계: 이미지 생성 비용·지연이 구조화 호출보다 큼.

### 공통 출력 (Export)
- **PNG**: 고해상도 손도트 도안(투명 배경 지원).
- **JSON**: 팔레트+RLE 도안 데이터. 자동화 스크립트나 타 툴 연동용.

---

## 4. Gemini 사양: 모델·프롬프트·스키마

### 4.0 모델 선택 (2026-05 기준) — **빌드 시 반드시 확인**

> Gemini 1.x/2.x는 종료되었거나 임박 종료. 아래 표 외 모델명을 하드코딩하지 말 것.

| 용도 | 권장 모델 문자열 | 비고 |
|------|----------------|------|
| **기본(속도/비용)** | `gemini-flash-latest` | 항상 최신 안정 Flash로 자동 연결되는 alias. 본 앱 기본값. |
| 최신 Flash 핀 고정 | `gemini-3.5-flash` | 2026-05-20 출시, Antigravity 지원. 정확한 핀 문자열은 AI Studio에서 확인 후 사용. |
| 검증된 Flash 핀 | `gemini-3-flash-preview` | 안정적인 멀티모달 구조화 출력. |
| 저비용/대량 | `gemini-3.1-flash-lite` | 워크로드 비용 최적화. |
| **고품질(Pro)** | `gemini-3.1-pro-preview` | 복잡한 해석/추론. (구 `gemini-3-pro-preview`는 종료) |
| **이미지 생성(B)** | `gemini-3.1-flash-image` | Nano Banana 2. 고효율 이미지 생성. |
| 최고 품질 이미지(B) | Gemini 3 Pro Image (Nano Banana Pro) | 최상위 품질, 비용 높음. |

구현 권장: 모델명을 상수/환경값으로 분리하고 UI 드롭다운으로 노출(`gemini-flash-latest` 기본 선택).

```js
// src/config/models.js
export const TEXT_MODELS = {
  default: 'gemini-flash-latest',     // 최신 Flash 자동
  fast:    'gemini-3-flash-preview',
  cheap:   'gemini-3.1-flash-lite',
  quality: 'gemini-3.1-pro-preview',
};
export const IMAGE_MODELS = {
  default: 'gemini-3.1-flash-image',  // Nano Banana 2
};
```

### 4.1 시스템 인스트럭션 (Pipeline A)

`config.systemInstruction`으로 전달한다. 스키마와 별개로 출력 JSON 예시를 프롬프트에 중복 기재하지 말 것(품질 저하 유발).

```
You are a master of isometric 2.5D pixel art design for sandbox tycoon games.
Analyze the uploaded building/structure image and reinterpret it as a cute,
miniature-style pixel art blueprint sized exactly WIDTH x HEIGHT cells.

[Rules]
1. Reinterpretation, not filtering: do NOT just downscale/blur. Redraw the
   iconic features (roof style, windows, primary colors); ignore messy background.
2. Perspective: prefer a 2.5D isometric (quarter-view) look, or a clean
   front/side view that reads as a miniature city object.
3. Outline: define clean outlines so the structure stands out from the canvas.
4. Palette: use a small, vibrant palette (<= 16 hex colors). Merge similar
   colors so a human can count and hand-place them on a grid. No gradients.
5. Output: fill cells row by row (y from 0..HEIGHT-1, x from 0..WIDTH-1).
   Use palette indices. For fully transparent cells use index -1.
   Encode each row as run-length pairs [paletteIndex, runLength].
```

> WIDTH/HEIGHT는 런타임에 실제 값으로 치환하여 user content에 함께 전달.

### 4.2 구조화 출력 스키마 (팔레트 + RLE)

픽셀당 객체 대신 **팔레트 배열 + 행별 RLE**를 강제한다. 각 행은 `[paletteIndex, runLength]` 쌍의 시퀀스이며, 행 내 run 길이 합 = `width`. `paletteIndex = -1`은 투명.

```jsonc
{
  "type": "OBJECT",
  "properties": {
    "width":  { "type": "INTEGER", "description": "Grid width in cells (e.g. 48)" },
    "height": { "type": "INTEGER", "description": "Grid height in cells (e.g. 48)" },
    "palette": {
      "type": "ARRAY",
      "description": "Distinct HEX colors, e.g. #FF5733. Index 0..N-1. Max 16.",
      "items": { "type": "STRING" }
    },
    "rows": {
      "type": "ARRAY",
      "description": "Length must equal height. Each row is RLE pairs.",
      "items": {
        "type": "ARRAY",
        "description": "Sequence of [paletteIndex, runLength]. Sum(runLength)=width. -1 = transparent.",
        "items": {
          "type": "ARRAY",
          "items": { "type": "INTEGER" }
        }
      }
    }
  },
  "required": ["width", "height", "palette", "rows"]
}
```

**검증 규칙(렌더 전 필수)**: `rows.length === height` AND 각 행의 run 길이 합 `=== width`. 위반 시 자동 보정(부족분 투명 패딩 / 초과분 절단) 후 경고 표시.

---

## 5. 구현 컴포넌트 설계

### 5.1 핵심 React 스켈레톤 (Pipeline A)

```jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { TEXT_MODELS } from './config/models';

const STORAGE_KEY = 'WPLACE_GEMINI_KEY';

// RLE -> 2D 인덱스 그리드 디코더 (검증 포함)
function decodeBlueprint(data) {
  const { width, height, palette, rows } = data;
  const grid = Array.from({ length: height }, () => new Array(width).fill(-1));
  for (let y = 0; y < Math.min(height, rows.length); y++) {
    let x = 0;
    for (const pair of rows[y]) {
      const [idx, runRaw] = pair;
      const run = Math.max(0, runRaw | 0);
      for (let k = 0; k < run && x < width; k++, x++) grid[y][x] = idx;
    }
    // 부족분은 투명(-1)으로 자동 패딩됨
  }
  return { width, height, palette, grid };
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [model, setModel] = useState(TEXT_MODELS.default);
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState(null); // decode 결과
  const [size, setSize] = useState({ w: 48, h: 48 }); // 비정방형 허용
  const [fileName, setFileName] = useState('blueprint');
  const canvasRef = useRef(null);

  const handleKeyChange = (e) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem(STORAGE_KEY, key);
  };

  // 메인 핸들러: 업로드 이미지 -> 구조화 도안
  const processImageToPixel = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) { alert('Gemini API Key를 먼저 설정해주세요.'); return; }
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'blueprint');
    setLoading(true);

    const ai = new GoogleGenAI({ apiKey });
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = String(reader.result).split(',')[1];
      const { w, h } = size;
      const sys = SYSTEM_INSTRUCTION.replaceAll('WIDTH', String(w)).replaceAll('HEIGHT', String(h));

      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { text: `Reinterpret this building as a ${w}x${h} miniature 2.5D isometric pixel-art blueprint for Wplace. Clean, cute, hand-buildable. Transparent background.` },
            { inlineData: { data: base64Data, mimeType: file.type } },
          ],
          config: {
            systemInstruction: sys,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA, // §4.2 (Type.* 또는 plain string types)
            // Gemini 3 계열: 속도/비용 위해 얕은 추론 사용 가능
            // thinkingConfig: { thinkingLevel: 'low' },
          },
        });

        // 신 SDK: 스키마 파싱 성공 시 response.parsed 제공, 실패 시 text 폴백
        const raw = response.parsed ?? JSON.parse(response.text);
        setBlueprint(decodeBlueprint(raw));
      } catch (err) {
        console.error('API Call Error:', err);
        alert('변환 실패. API 키/이미지 규격/모델명을 확인하세요.');
      } finally {
        setLoading(false);
      }
    };
  }, [apiKey, model, size]);

  // Canvas 렌더 (선명 도트 + 옵션 격자)
  useEffect(() => {
    if (!blueprint || !canvasRef.current) return;
    const { width, height, palette, grid } = blueprint;
    const cv = canvasRef.current;
    const ctx = cv.getContext('2d');
    const cell = 12; // 1도트 = 12px (확대 가이드)
    cv.width = width * cell;
    cv.height = height * cell;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = grid[y][x];
        if (idx < 0 || idx >= palette.length) continue; // 투명
        ctx.fillStyle = palette[idx];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    // 격자선
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) { ctx.beginPath(); ctx.moveTo(x*cell,0); ctx.lineTo(x*cell,cv.height); ctx.stroke(); }
    for (let y = 0; y <= height; y++) { ctx.beginPath(); ctx.moveTo(0,y*cell); ctx.lineTo(cv.width,y*cell); ctx.stroke(); }
  }, [blueprint]);

  const downloadJSON = () => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}_blueprint.json`;
    a.click();
  };

  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `${fileName}_blueprint.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-8">
      {/* UI: 키 입력 / 모델·해상도 선택 / 업로드 / 캔버스 / 다운로드 버튼 */}
    </div>
  );
}
```

> `SYSTEM_INSTRUCTION`, `RESPONSE_SCHEMA`는 §4.1·§4.2를 상수 모듈로 분리하여 import. `Type` enum과 plain string 타입(`"object"`, `"array"`, `"integer"`, `"string"`) 모두 신 SDK에서 유효하다.

### 5.2 Pipeline B 핵심 — 클라이언트 양자화 헬퍼

이미지 생성 모델이 반환한 PNG(Base64)를 받아 결정론적으로 grid 데이터로 변환한다. 같은 `{width,height,palette,grid}` 구조를 산출하므로 5.1의 렌더러를 그대로 재사용한다.

```js
// 이미지 -> WxH grid (nearest-neighbor 다운스케일 + 색상 양자화)
export async function quantizeImageToGrid(base64Png, W, H, maxColors = 16) {
  const img = await loadImage(`data:image/png;base64,${base64Png}`);
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const ctx = off.getContext('2d');
  ctx.imageSmoothingEnabled = false;      // 선명 다운스케일
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  // 1) 셀 색상 수집(투명 처리: alpha < 128 -> -1)
  const cells = [];
  for (let i = 0; i < W * H; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
    cells.push(a < 128 ? null : [r, g, b]);
  }
  // 2) median-cut 등으로 maxColors 팔레트 생성 후 인덱스 매핑
  const { palette, indexOf } = buildPalette(cells.filter(Boolean), maxColors); // 구현체 주입
  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const c = cells[y*W + x];
      row.push(c ? indexOf(c) : -1);
    }
    grid.push(row);
  }
  return { width: W, height: H, palette, grid };
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}
```

> `buildPalette`는 median-cut/k-means 중 택1로 구현. `quant`, `image-q`, `rgbquant` 같은 경량 npm 패키지로 대체 가능.

### 5.3 Canvas 렌더링 최적화 (CSS)

CSS로 캔버스를 키울 때 도트가 흐려지지 않도록 전역 스타일을 부여:

```css
canvas {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-crisp-edges;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

---

## 6. 보안 모델 (정확한 위협 분석)

> v1의 "배포 후 해킹 위협에서 완벽히 자유" 표현은 부정확하므로 교정한다.

- **서버 공격면 없음**: 백엔드/DB가 없으므로 서버 침해·데이터 유출 경로 자체가 존재하지 않는다. (이 점은 사실)
- **그러나 API Key는 사용자 브라우저에 노출된다**: `localStorage`의 키는 같은 출처에서 실행되는 모든 스크립트가 읽을 수 있고, 네트워크 트래픽에도 키가 실린다. 따라서:
  - 서드파티 스크립트/광고/분석 SDK를 페이지에 함부로 넣지 말 것(XSS·키 탈취 위험).
  - 키는 절대 저장소(Git)에 커밋하지 말 것. `.env`도 클라 빌드에 포함되면 노출됨 — **키는 런타임 사용자 입력으로만 받는다**.
  - 사용자에게 **Google Cloud에서 HTTP 리퍼러 제한**(앱 배포 도메인만 허용)을 설정하도록 안내. 키 유출 시 피해 최소화.
- **데이터 흐름**: 이미지·키는 사용자의 브라우저에서 Google API로 직접 전송된다(중간 서버 경유 없음). 제3자에게 전달되지 않는다.
- **클라이언트 직접 호출 주의**: 브라우저에서 직접 호출은 동작하지만 키 노출이 불가피하므로, 위 리퍼러 제한이 사실상의 방어선이다. 공개 대량 배포가 목적이라면 경량 프록시(서버리스 함수)에 키를 두는 구조도 옵션으로 검토.

---

## 7. 개발 및 배포 (GitHub Pages / Vercel)

- **정적 빌드**: Vite `npm run build` → `dist/` 산출.
- **GitHub Actions 자동 배포**: 저장소 루트에 `.github/workflows/deploy.yml` 구성, push 시 `actions/upload-pages-artifact` + `actions/deploy-pages`로 `dist/`를 무료 호스팅.
- **Vercel**: 프레임워크 자동 감지(Vite), 환경변수 불필요(키는 런타임 입력).
- **base 경로**: GitHub Pages 서브경로 배포 시 `vite.config.js`의 `base: '/<repo>/'` 설정 필수.

---

## 8. 구현 체크리스트 (AI IDE 빌드용)

1. [ ] `models.js` 상수 분리, 기본 `gemini-flash-latest`, UI 드롭다운 노출.
2. [ ] 키 입력 → `localStorage` 저장, 미입력 시 가드.
3. [ ] 해상도 입력 `width`/`height` 분리(비정방형 허용), 기본 48×48, 상한 가이드(A 경로는 ≤64 권장).
4. [ ] Pipeline A: 구조화 출력 + §4.2 스키마 + `response.parsed` 폴백.
5. [ ] RLE 디코더 + 검증/자동보정(행 수·런 합).
6. [ ] Pipeline B 토글: 이미지 생성 → `quantizeImageToGrid` → 동일 grid 구조.
7. [ ] Canvas 렌더(선명 도트 + 격자 토글) + `image-rendering` CSS.
8. [ ] PNG/JSON 내보내기(파일명 = 업로드명 기반).
9. [ ] 에러·로딩 상태 UI, 키 리퍼러 제한 안내 문구.
10. [ ] 배포 설정(`base`, Actions/Vercel).
