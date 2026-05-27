# Wplace Pixel Blueprint

사진을 2D 및 2.5D 도안으로 다시 만듭니다.

- **100% 클라이언트 사이드** — 백엔드·DB 없음. Gemini API 는 브라우저 → Google 로 직접.
- **BYO Key** — 사용자가 본인 Gemini API Key 를 입력해 구동.
- **wplace 공식 팔레트 매핑** — 무료 31색 · 유료 32색 토글로 결과 색이 wplace 에 그대로 칠할 수 있는 색만 사용되도록 강제.
- **자동 누끼 + 픽셀/고화질 PNG + JSON 내보내기**.

자세한 설계 사양은 [wplace_pixel_blueprint_whitepaper.md](./wplace_pixel_blueprint_whitepaper.md) 참고.

## 로컬 개발

```powershell
npm install
npm run dev          # → http://localhost:5173/
npm run test:run     # vitest 77 cases
npm run build        # dist/ 생성 (한글 경로 주의 — 아래 "알려진 이슈" 참고)
npm run preview
```

## GitHub Pages 배포

이 저장소는 **`https://jtech-co.github.io/Wplace-Pixel-Blueprint/`** 로 자동 배포되도록
이미 설정되어 있습니다.

### 1) 저장소에 푸시

```powershell
git init
git remote add origin https://github.com/JTech-CO/Wplace-Pixel-Blueprint.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2) GitHub 측 설정 (1회만)

저장소 **Settings → Pages → Source: `GitHub Actions`** 로 지정.

### 3) 자동 빌드 & 배포

`main` 에 push 될 때마다 `.github/workflows/deploy.yml` 이:
1. Ubuntu 러너에서 `npm ci` + `npm run build`
2. `dist/` 를 Pages 아티팩트로 업로드
3. `actions/deploy-pages` 로 배포

빌드는 Ubuntu 에서 도므로 **로컬의 한글 경로 native 바인딩 충돌은 영향 없음**.

### 4) base 경로 설정

`vite.config.js` 에 다음이 활성화되어 있어야 정적 자산이 정확히 로드됩니다:

```js
base: '/Wplace-Pixel-Blueprint/',
```

(이미 적용됨. fork 후 다른 repo 이름이면 그 이름으로 바꾸세요.)

### 5) API 키 보안 안내

배포 후 사용자가 KeyInput 에 직접 키를 입력합니다. 키 소유자는 **Google Cloud Console
→ API Key → HTTP referrer 제한** 에 본인의 Pages 도메인(예:
`https://jtech-co.github.io/Wplace-Pixel-Blueprint/*`)만 허용하는 것을 권장합니다.
앱은 키를 브라우저 localStorage 에만 저장하며 서버를 거치지 않습니다.

## 주요 기능 정리

| 영역 | 동작 |
|---|---|
| 변환 방식 | 고속·일반품질 (Flash 텍스트 분석, Pipeline A) / 저속·고품질 (Nano Banana 2 이미지 생성, Pipeline B) |
| 시점 | 2D · 평면(아이콘 스티커) / 2.5D · 조감도(이소메트릭 쿼터뷰) |
| 해상도 | 8 ~ 256 px, 정방형 잠금 토글 |
| wplace 색상 | 무료 31색 · 유료 32색 토글 (둘 다 OFF 면 자유 색) |
| 표시 옵션 | 격자선 토글, 배경 제거 (자동 누끼 + 알파 PNG) |
| 캔버스 | 마우스 휠 확대, 드래그 panning, 자동 가운데 정렬 |
| 내보내기 | 고화질 저장 (cell 적용) / 픽셀 저장 (1:1) / JSON 저장 |

## 폴더 구조

```
src/
├── config/
│   ├── models.js           # 모델 식별자 (Flash / Pro)
│   ├── prompts.js          # Pipeline A/B 프롬프트 (시점별 분기)
│   ├── schema.js           # 구조화 응답 스키마 (RLE)
│   └── wplacePalette.js    # 무료 31 + 유료 32 공식 팔레트
├── lib/
│   ├── gemini/             # client, pipelineA, pipelineB
│   ├── rle/                # decode / validate / encode / backgroundRemover
│   ├── quantize/           # medianCut / nearestColor / backgroundMask / snapToPalette / quantizeImageToGrid
│   ├── canvas/             # render / exporters
│   ├── image/              # fileToBase64
│   └── storage/            # keyStore
├── hooks/                  # useApiKey / useBlueprint / useCanvasRender
└── components/             # KeyInput / SettingsPanel / ImageUploader / BlueprintCanvas / PaletteLegend / ExportButtons
```

## 알려진 이슈

- **한글 경로에서 `npm run build` 크래시 (로컬 한정)**
  현재 경로(`...\내 폴더\코딩\기획\Wplace Pixel Blueprint`)의 비-ASCII 문자가 일정
  module 수(약 50+) 이상부터 Vite/Rollup native 바인딩의 버퍼 오버런(`0xC0000409
  STATUS_STACK_BUFFER_OVERRUN`)을 유발합니다. `npm run dev` 와 `npm run test:run`
  은 정상 동작합니다. **배포는 GitHub Actions(Ubuntu) 에서 빌드되므로 영향 없음**.
  로컬에서도 빌드를 돌리려면 프로젝트를 ASCII 경로(예: `C:\code\Wplace-Pixel-Blueprint`)
  로 이동하세요.

## 라이선스

(작성 예정)
