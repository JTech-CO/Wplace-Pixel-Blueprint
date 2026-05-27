export default function PaletteLegend({ palette }) {
  if (!palette || palette.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] text-slate-400">팔레트</p>
        <span className="font-mono text-[10px] text-slate-600">
          {palette.length} colors
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {palette.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
            title={`index ${i}`}
          >
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm border border-slate-700"
              style={{ background: c }}
            />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
