// 백서 §4.0 — 모델 식별자.
// 사용자에게는 "변환 방식" 한 가지 드롭다운만 노출하고, 내부적으로 pipeline 까지
// 자동으로 결정된다. (텍스트/이미지 모델 + Pipeline A/B 분리를 UI 에서 추상화)

// 내부 참조용 (코드/주석)
export const TEXT_MODELS = {
  default: 'gemini-3-flash-preview',   // Flash 3
};
export const IMAGE_MODELS = {
  default: 'gemini-3.1-flash-image-preview',             // Nano Banana 2 (사용자 확인)
  legacy:  'gemini-2.0-flash-preview-image-generation',  // 보조 fallback
  imagen:  'imagen-3.0-generate-002',                    // Imagen 3 보조 fallback
};

// 사용자 노출 단일 선택지. 각 항목이 자기 pipeline 을 알고 있다.
export const MODEL_OPTIONS = [
  {
    value: TEXT_MODELS.default,
    label: '고속 · 일반품질',
    sub: '작고 가벼운 도안 · Flash 텍스트 분석',
    pipeline: 'A',
  },
  {
    value: IMAGE_MODELS.default,
    label: '저속 · 고품질',
    sub: '크고 정밀한 도안 · Nano Banana 2 이미지 생성',
    pipeline: 'B',
  },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;

// model value -> { pipeline } 조회 헬퍼
export function getModelOption(value) {
  return MODEL_OPTIONS.find((o) => o.value === value) || MODEL_OPTIONS[0];
}
