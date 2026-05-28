# Wplace Pixel Blueprint

**라이브: <https://jtech-co.github.io/Wplace-Pixel-Blueprint/>**

사진을 2D 및 2.5D 도안으로 다시 만듭니다.

- **100% 클라이언트 사이드** — 백엔드·DB 없음. Gemini API 는 브라우저 → Google 로 직접.
- **BYO Key** — 본인 Gemini API Key 를 입력해 구동. 키는 브라우저 localStorage 에만 저장.
- **wplace 공식 팔레트 매핑** — 무료 31색 · 유료 32색 토글로 wplace 에 그대로 칠할 수 있는 색만 사용.
- **자동 누끼 + 픽셀/고화질 PNG + JSON 내보내기**.

설계 사양 상세: [wplace_pixel_blueprint_whitepaper.md](./wplace_pixel_blueprint_whitepaper.md)

## 사용 방법

1. [라이브 페이지](https://jtech-co.github.io/Wplace-Pixel-Blueprint/) 접속
2. [Google AI Studio](https://aistudio.google.com/app/apikey) 에서 발급한 Gemini API Key 입력
3. 이미지 업로드 → 변환 방식 · 시점 · 해상도 · 색상 선택 → **도안 생성**
4. 고화질 / 픽셀 / JSON 으로 저장

## 주요 기능

| 영역 | 동작 |
|---|---|
| 변환 방식 | 고속·일반품질 (Flash 텍스트 분석) / 저속·고품질 (Nano Banana 2 이미지 생성 + 양자화) |
| 시점 | 2D · 평면(아이콘 스티커) / 2.5D · 조감도(이소메트릭 쿼터뷰) |
| 해상도 | 8 ~ 256 px, 정방형 잠금 토글 |
| wplace 색상 | 무료 31색 · 유료 32색 토글 (둘 다 OFF 면 자유 색) |
| 표시 옵션 | 격자선 토글, 배경 제거 (자동 누끼 + 알파 PNG) |
| 캔버스 | 마우스 휠 확대, 드래그 panning, 자동 가운데 정렬 |
| 내보내기 | 고화질(cell 적용) / 픽셀(1:1) / JSON |

## 로컬 개발

```powershell
npm install
npm run dev          # http://localhost:5173/
npm run test:run     # vitest (단위 테스트)
npm run build        # dist/
```

## 배포

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 Ubuntu 러너에서
`npm ci` + `npm run build` 후 GitHub Pages 로 자동 배포합니다.

- Pages 설정: **Settings → Pages → Source: `GitHub Actions`** (최초 1회)
- 서브경로 자산을 위해 `vite.config.js` 에 `base: '/Wplace-Pixel-Blueprint/'` 고정.
  fork 시 repo 이름에 맞게 변경.

## 폴더 구조

```
src/
├── config/      models · prompts · schema · wplacePalette
├── lib/
│   ├── gemini/    client · pipelineA · pipelineB
│   ├── rle/       decode · validate · encode · backgroundRemover
│   ├── quantize/  medianCut · nearestColor · backgroundMask · snapToPalette · quantizeImageToGrid
│   ├── canvas/    render · exporters
│   ├── image/     fileToBase64
│   └── storage/   keyStore
├── hooks/       useApiKey · useBlueprint · useCanvasRender
└── components/  KeyInput · SettingsPanel · ImageUploader · BlueprintCanvas · PaletteLegend · ExportButtons
```

## 라이선스

MIT
