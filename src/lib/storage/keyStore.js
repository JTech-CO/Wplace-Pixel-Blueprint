// Phase 1 — localStorage 기반 Gemini API Key 저장 래퍼.
//
// getKey() -> string
// setKey(k: string) -> void
// clearKey() -> void

const STORAGE_KEY = 'WPLACE_GEMINI_KEY';

export function getKey() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function setKey(k) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, k ?? '');
}

export function clearKey() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
