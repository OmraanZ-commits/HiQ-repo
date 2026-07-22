// Design B — Funnel / Waterfall: cumulative view as a tapering pipeline with ageing heatmap

const STATUS_DATA = [
  { label: "Draft",           dot: "#94a3b8", barColor: "from-slate-400 to-slate-500",     cumul: 28, atStage: 9, avgAge: 153, gt7: 0, gt30: 0, gt90: 9  },
  { label: "Active",          dot: "#10b981", barColor: "from-emerald-400 to-emerald-500", cumul: 19, atStage: 2, avgAge: 175, gt7: 0, gt30: 0, gt90: 2  },
  { label: "Pricing Updated", dot: "#3b82f6", barColor: "from-blue-400 to-blue-500",       cumul: 17, atStage: 1, avgAge: 280, gt7: 0, gt30: 0, gt90: 1  },
  { label: "Prod. Started",   dot: "#f59e0b", barColor: "from-amber-400 to-amber-500",     cumul: 16, atStage: 2, avgAge: 187, gt7: 0, gt30: 0, gt90: 2  },
  { label: "FTR Approved",    dot: "#06b6d4", barColor: "from-cyan-400 to-cyan-500",       cumul: 14, atStage: 8, avgAge: 147, gt7: 0, gt30: 0, gt90: 8  },
  { label: "Stock Mvmt.",     dot: "#8b5cf6", barColor: "from-violet-400 to-violet-500",   cumul: 6,  atStage: 6, avgAge: 277, gt7: 0, gt30: 0, gt90: 6  },
];

const MAX_CUMUL = Math.max(...STATUS_DATA.map(r => r.cumul));
const TOTAL_PENDING = STATUS_DATA.reduce((s, r) => s + r.atStage, 0);

function AgeCell({ n, bg, text, label }: { n: number; bg: string; text: string; label: string }) {
  if (n === 0) return null;
  return (
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg ${bg}`}>
      <span className={`text-sm font-black tabular-nums ${text}`}>{n}</span>
      <span className={`text-[9px] font-semibold uppercase tracking-wide ${text} opacity-70`}>{label}</span>
    </div>
  );
}

export function DesignB() {
  return (
    <div className="min-h-screen bg-slate-50 p-5 space-y-4 font-sans text-sm">

      {/* ── Label ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Design B</span>
        <span className="text-xs text-slate-400">— Funnel / Waterfall: dedicated Cumulative view</span>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* Cumulative Pipeline — funnel view               */}
      {/* ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Cumulative Pipeline</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Each row = entries yet to complete that stage onward — the funnel narrows as stages are cleared
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                {TOTAL_PENDING} at stage
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#1f36c7]/10 text-[#1f36c7] text-xs font-bold">
                {MAX_CUMUL} cumul.
              </span>
            </div>
          </div>

          {/* Column legend */}
          <div className="flex items-center gap-5 mt-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-10 rounded bg-slate-200" /> total still in pipeline (cumul)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded bg-[#1f36c7]/50" /> waiting at this stage</span>
          </div>
        </div>

        {/* Funnel rows */}
        <div className="px-5 py-4 space-y-2.5">
          {STATUS_DATA.map((r, i) => {
            const cumulPct = (r.cumul / MAX_CUMUL) * 100;
            const atPct    = (r.atStage / MAX_CUMUL) * 100;
            const isLast   = i === STATUS_DATA.length - 1;
            return (
              <div key={r.label}>
                <div className="flex items-center gap-3">
                  {/* Stage label */}
                  <div className="flex items-center gap-2 w-[130px] shrink-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 border-2 border-white shadow-sm" style={{ backgroundColor: r.dot }} />
                    <span className="text-xs font-semibold text-slate-700 truncate">{r.label}</span>
                  </div>

                  {/* Funnel bar */}
                  <div className="flex-1 relative">
                    {/* Background track */}
                    <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                      {/* Cumulative portion (light) */}
                      <div
                        className="absolute top-0 left-0 h-full rounded-lg bg-slate-200/80 transition-all"
                        style={{ width: `${cumulPct}%` }}
                      />
                      {/* At-stage portion (branded color) */}
                      <div
                        className={`absolute top-0 left-0 h-full rounded-lg bg-gradient-to-r ${r.barColor} opacity-80 transition-all`}
                        style={{ width: `${atPct}%` }}
                      />
                    </div>

                    {/* Numbers overlaid on bar */}
                    <div className="absolute inset-0 flex items-center px-3 gap-2.5">
                      <span className="text-sm font-black tabular-nums text-[#1f36c7]">{r.cumul}</span>
                      <span className="text-[10px] text-slate-500">
                        cumul · <span className="font-bold text-slate-700">{r.atStage}</span> at stage
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto pr-1">avg {r.avgAge}d</span>
                    </div>
                  </div>

                  {/* Ageing breakdown */}
                  <div className="flex items-center gap-1.5 shrink-0 w-[110px] justify-end">
                    <AgeCell n={r.gt7}  bg="bg-amber-50  border border-amber-100"  text="text-amber-600"  label="7–30d" />
                    <AgeCell n={r.gt30} bg="bg-orange-50 border border-orange-100" text="text-orange-600" label="1–3mo" />
                    <AgeCell n={r.gt90} bg="bg-red-50    border border-red-100"    text="text-red-600"    label=">3mo"  />
                    {r.gt7 === 0 && r.gt30 === 0 && r.gt90 === 0 && (
                      <span className="text-xs text-slate-200">—</span>
                    )}
                  </div>
                </div>

                {/* Flow arrow (not for last row) */}
                {!isLast && (
                  <div className="flex items-center ml-[143px] mt-0.5 mb-0">
                    <div className="w-px h-2.5 bg-slate-200 ml-0.5" />
                    <span className="text-[8px] text-slate-300 ml-1 font-medium uppercase tracking-wide">
                      {r.atStage} cleared → {r.cumul - r.atStage} move to next
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              Funnel shows entries still in-flight at each gate. Narrows as items complete stages.
            </p>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="h-2 w-2 rounded bg-amber-400" />
                {STATUS_DATA.reduce((s,r) => s+r.gt7, 0)} aged 7–30d
              </span>
              <span className="flex items-center gap-1 text-orange-600 font-semibold">
                <span className="h-2 w-2 rounded bg-orange-400" />
                {STATUS_DATA.reduce((s,r) => s+r.gt30, 0)} aged 1–3mo
              </span>
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <span className="h-2 w-2 rounded bg-red-400" />
                {STATUS_DATA.reduce((s,r) => s+r.gt90, 0)} aged &gt;3mo
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
