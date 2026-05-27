import { describe, it, expect } from 'vitest';
import { fileToBase64 } from './fileToBase64.js';

describe('fileToBase64', () => {
  it('Blob 의 base64 와 mimeType 을 반환한다', async () => {
    const text = 'hello';
    const blob = new Blob([text], { type: 'text/plain' });
    const { base64, mimeType } = await fileToBase64(blob);
    expect(mimeType).toBe('text/plain');
    // 'hello' base64 = aGVsbG8=
    expect(base64).toBe('aGVsbG8=');
  });

  it('File 객체에서도 동일하게 동작한다', async () => {
    const file = new File(['abc'], 'test.txt', { type: 'text/plain' });
    const { base64, mimeType } = await fileToBase64(file);
    expect(mimeType).toBe('text/plain');
    expect(base64).toBe('YWJj'); // 'abc'
  });

  it('Blob 이 아닌 입력은 reject 한다', async () => {
    await expect(fileToBase64('not a blob')).rejects.toThrow(TypeError);
    await expect(fileToBase64(null)).rejects.toThrow(TypeError);
  });
});
