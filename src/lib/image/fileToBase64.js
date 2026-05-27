// 업로드 File -> base64 문자열 (data URL prefix 제외) + mimeType.
//
// 결과 형태: { base64, mimeType }

export function fileToBase64(file) {
  if (!(file instanceof Blob)) {
    return Promise.reject(new TypeError('fileToBase64: input must be a File/Blob'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const m = /^data:([^;,]+)[;,]/.exec(dataUrl);
      const mimeType = (m && m[1]) || file.type || 'application/octet-stream';
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
