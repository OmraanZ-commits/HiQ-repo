// Design A — Two separate panels: "At Stage" table + dedicated Cumulative Pipeline card below

const STATUS_DATA = [
  { label: "Draft",           dot: "bg-slate-400",   textCol: "text-slate-600",  cumul: 28, atStage: 9, avgAge: 153, gt7: 0, gt30: 0, gt90: 9  },
  { label: "Active",          dot: "bg-emerald-500", textCol: "text-emerald-700",cumul: 19, atStage: 2, avgAge: 175, gt7: 0, gt30: 0, gt90: 2  },
  { label: "Pricing Updated", dot: "bg-blue-500",    textCol: "text-blue-700",   cumul: 17, atStage: 1, avgAge: 280, gt7: 0, gt30: 0, gt90: 1  },
  { label: "Prod. Started",   dot: "bg-amber-500",   textCol: "text-amber-700",  cumul: 16, atStage: 2, avgAge: 187, gt7: 0, gt30: 0, gt90: 2  },
  { label: "FTR Approved",    dot: "bg-cyan-500",    textCol: "text-cyan-700",   cumul: 14, atStage: 8, avgAge: 147, gt7: 0, gt30: 0, gt90: 8  },
  { label: "Stock Mvmt.",     dot: "bg-violet-500",  textCol: "text-violet-700", cumul: 6,  atStage: 6, avgAge: 277, gt7: 0, gt30: 0, gt90: 6  },
];

const MAX_CUMUL = Math.max(...STATUS_DATA.map(r => r.cumul));
const TOTAL_PENDING = STATUS_DATA.reduce((s, r) => s + r.atStage, 0);

function AgeBadge({ n, color }: { n: number; color: string }) {
  if (n === 0) return <span className="text-slate-200 tabular-nums">—</span>;
  return <span className={`font-semibold tabular-nums ${color}`}>{n}</span>;
}

export function DesignA() {
  return (
    <div className="min-h-screen bg-slate-50 p-5 space-y-4 font-sans text-sm">

      {/* ── Label ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Design A</span>
        <span className="text-xs text-slate-400">— Separate "At Stage" &amp; "Cumulative Pipeline" cards</span>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* Card 1: At Stage (Rolling)                       */}
      {/* ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">At Stage</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Items currently waiting at each step</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {TOTAL_PENDING} pending
          </span>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-2 font-semibold text-[10px] text-[#1f36c7] uppercase tracking-wide">Items</th>
              <th className="text-right px-4 py-2 font-semibold text-[10px] text-slate-400 uppercase tracking-wide">Avg Age</th>
              <th className="text-right px-4 py-2 font-semibold text-[10px] text-amber-600 uppercase tracking-wide">7–30d</th>
              <th className="text-right px-4 py-2 font-semibold text-[10px] text-orange-600 uppercase tracking-wide">1–3 mo</th>
              <th className="text-right px-5 py-2 font-semibold text-[10px] text-red-600 uppercase tracking-wide">&gt;3 mo</th>
            </tr>
          </thead>
          <tbody>
            {STATUS_DATA.map((r, i) => (
              <tr key={r.label} className={`border-b border-slate-50 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${r.dot}`} />
                    <span className={`font-medium ${r.textCol}`}>{r.label}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[#1f36c7]">{r.atStage}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{r.avgAge}d</td>
                <td className="px-4 py-2.5 text-right"><AgeBadge n={r.gt7}  color="text-amber-600" /></td>
                <td className="px-4 py-2.5 text-right"><AgeBadge n={r.gt30} color="text-orange-600" /></td>
                <td className="px-5 py-2.5 text-right"><AgeBadge n={r.gt90} color="text-red-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* Card 2: Cumulative Pipeline (dedicated new view) */}
      {/* ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#1f36c7]/20 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#1f36c7]/10 bg-[#1f36c7]/[0.025]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1f36c7]">Cumulative Pipeline</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total items that haven't cleared each gate yet</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#1f36c7]/10 text-[#1f36c7] text-xs font-bold">
            {MAX_CUMUL} total pending
          </span>
        </div>

        <div className="px-5 py-4 space-y-3">
          {STATUS_DATA.map(r => {
            const barPct = Math.round((r.cumul / MAX_CUMUL) * 100);
            const atPct  = Math.round((r.atStage / r.cumul) * barPct);
            return (
              <div key={r.label} className="flex items-center gap-3">
                {/* Status label */}
                <div className="flex items-center gap-2 w-[120px] shrink-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${r.dot}`} />
                  <span className={`text-xs font-medium truncate ${r.textCol}`}>{r.label}</span>
                </div>

                {/* Proportional bar */}
                <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                  {/* Cumulative bar (light blue) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#1f36c7]/15 rounded-md"
                    style={{ width: `${barPct}%` }}
                  />
                  {/* At-stage segment (darker) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{
                      width: `${atPct}%`,
                      background: `linear-gradient(90deg, #1f36c7 0%, #0d8ecf 100%)`,
                      opacity: 0.7,
                    }}
                  />
                  {/* Cumul count label */}
                  <div className="absolute inset-0 flex items-center px-3 gap-2">
                    <span className="text-[11px] font-black text-[#1f36c7] tabular-nums">{r.cumul}</span>
                    <span className="text-[10px] text-slate-400">cumulative</span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      · <span className="font-semibold text-slate-700">{r.atStage}</span> at stage
                    </span>
                  </div>
                </div>

                {/* Ageing indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {r.gt90 > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-[10px] font-bold text-red-600">
                      {r.gt90} <span className="font-normal opacity-70">&gt;3mo</span>
                    </span>
                  )}
                  {r.gt30 > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-100 text-[10px] font-bold text-orange-600">
                      {r.gt30} <span className="font-normal opacity-70">1–3mo</span>
                    </span>
                  )}
                  {r.gt7 > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-600">
                      {r.gt7} <span className="font-normal opacity-70">7–30d</span>
                    </span>
                  )}
                  {r.gt7 === 0 && r.gt30 === 0 && r.gt90 === 0 && (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-[#1f36c7]/15 mr-1 align-middle" /> total in pipeline ·{" "}
            <span className="inline-block h-2.5 w-4 rounded-sm bg-[#1f36c7]/70 mr-1 align-middle" /> at this stage specifically
          </p>
        </div>
      </div>
    </div>
  );
}
