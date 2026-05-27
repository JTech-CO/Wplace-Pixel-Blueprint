import { useState } from 'react';

const AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

export default function KeyInput({ value, onChange, onClear }) {
  const [reveal, setReveal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const hasKey = !!value;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="gemini-key" className="text-xs font-medium text-slate-300">
          Gemini API Key
        </label>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {showHelp ? '안내 닫기' : 'API Key 발급 방법'}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          id="gemini-key"
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
          spellCheck={false}
          className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="rounded-md border border-slate-800 bg-slate-900 px-2 text-xs text-slate-400 hover:text-slate-100"
          aria-label={reveal ? '숨기기' : '보기'}
        >
          {reveal ? '숨김' : '표시'}
        </button>
        {hasKey && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-slate-800 bg-slate-900 px-2 text-xs text-slate-400 hover:text-slate-100"
          >
            지우기
          </button>
        )}
      </div>

      {showHelp && (
        <div className="space-y-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-[11px] leading-relaxed text-slate-400">
          <div className="space-y-2">
            <p className="text-slate-200">발급 절차</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>아래 버튼으로 Google AI Studio 의 API Key 페이지로 이동</li>
              <li>Google 계정으로 로그인</li>
              <li>
                <span className="font-mono text-slate-200">Create API key</span> 클릭 후
                새 키 생성
              </li>
              <li>생성된 키를 복사해 위 입력란에 붙여넣기</li>
            </ol>
            <a
              href={AI_STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/15"
            >
              Google AI Studio 열기
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 3h7v7" />
                <path d="M13 3 5 11" />
                <path d="M3 7v6h6" />
              </svg>
            </a>
          </div>

          <div className="space-y-1 border-t border-slate-800 pt-2 text-slate-500">
            <p>
              키는 이 브라우저에만 저장되며, 네트워크 호출은 사용자 브라우저 → Google API
              로 직접 이뤄집니다 (앱 서버 경유 없음).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
