import { useEffect, useRef, useState } from 'react';

export default function ImageUploader({ file, onFile, onSubmit, disabled, busy }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  };

  return (
    <section className="space-y-3">
      <span className="text-xs font-medium text-slate-300">소스 이미지</span>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={[
          'flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-4 text-center text-xs transition-colors',
          dragOver
            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300'
            : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600',
        ].join(' ')}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file?.name || 'preview'}
            className="max-h-40 max-w-full rounded-sm"
          />
        ) : (
          <>
            <span>클릭 또는 드래그로 이미지 업로드</span>
            <span className="text-[11px] text-slate-500">PNG · JPG · WebP</span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handlePick}
        className="hidden"
      />

      {file && (
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate" title={file.name}>
            {file.name}
          </span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            제거
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || busy}
        className="w-full rounded-md border border-emerald-500 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
      >
        {busy ? '변환 중…' : '도안 생성'}
      </button>
    </section>
  );
}
