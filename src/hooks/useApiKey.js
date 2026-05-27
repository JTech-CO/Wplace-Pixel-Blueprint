// Phase 2 — API Key 입력값을 localStorage 와 동기화.
//
// const { apiKey, setApiKey, clear } = useApiKey();

import { useEffect, useState } from 'react';
import { getKey, setKey, clearKey } from '../lib/storage/keyStore.js';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    setApiKeyState(getKey());
  }, []);

  const setApiKey = (k) => {
    setApiKeyState(k);
    setKey(k);
  };

  const clear = () => {
    setApiKeyState('');
    clearKey();
  };

  return { apiKey, setApiKey, clear };
}
