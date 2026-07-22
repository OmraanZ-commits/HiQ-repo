// Design A (v3) — With NTC row in both sections; "Total CBUs" label on first cumulative row

const STATUS_DATA = [
  { label: "Draft",                    cumulLabel: "Total CBUs",            dot: "#94a3b8", barFill: "bg-slate-400",   cumul: 31, atStage: 9, avgAge: 153, gt90: 9  },
  { label: "Active",                   dot: "#10b981", barFill: "bg-emerald-500", cumul: 22, atStage: 2, avgAge: 175, gt90: 2  },
  { label: "Pricing Updated",          dot: "#3b82f6", barFill: "bg-blue-500",    cumul: 20, atStage: 1, avgAge: 280, gt90: 1  },
  { label: "Prod. Started",            dot: "#f59e0b", barFill: "bg-amber-500",   cumul: 19, atStage: 2, avgAge: 187, gt90: 2  },
  { label: "FTR Approved",             dot: "#06b6d4", barFill: "bg-cyan-500",    cumul: 17, atStage: 8, avgAge: 147, gt90: 8  },
  { label: "Stock Mvmt.",              dot: "#8b5cf6", barFill: "bg-violet-500",  cumul: 9,  atStage: 6, avgAge: 277, gt90: 6  },
  { label: "NW Transition Complete",   dot: "#059669", barFill: "bg-emerald-600", cumul: 3,  atStage: 3, avgAge: 120, gt90: 0  },
];

const MAX_CUMUL = Math.max(...STATUS_DATA.map(r => r.cumul));
const TOTAL_PENDING = STATUS_DATA.reduce((s, r) => s + r.atStage, 0);

export function DesignA() {
  return (
    <div className="min-h-screen bg-slate-50 p-5 space-y-4 font-sans text-sm">

      {/* ─── Card 1: At Stage ─── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">Pending by Status</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Items currently waiting at each step</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {TOTAL_PENDING} pending
          </span>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-5 py-2.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wide w-1/2">Status</th>
              <th className="text-right px-5 py-2.5 font-semibold text-[10px] text-[#1f36c7] uppercase tracking-wide">Items</th>
              <th className="text-right px-5 py-2.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wide">Avg Age</th>
              <th className="text-right px-5 py-2.5 font-semibold text-[10px] text-red-500 uppercase tracking-wide">&gt; 3 months</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {STATUS_DATA.map(r => (
              <tr key={r.label} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 border-2 border-white shadow-sm"
                      style={{ backgroundColor: r.dot }} />
                    <span className="font-medium text-slate-700">{r.label}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-base font-black tabular-nums text-[#1f36c7]">{r.atStage}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-400 font-medium">
                  {r.avgAge}d
                </td>
                <td className="px-5 py-3 text-right">
                  {r.gt90 > 0
                    ? <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-red-600 tabular-nums">{r.gt90}</span>
                    : <span className="text-slate-200">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Card 2: Cumulative Pipeline ─── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-800">Cumulative Pipeline</p>
          <span className="px-3 py-1 rounded-full bg-[#1f36c7]/10 text-[#1f36c7] text-xs font-bold">
            {MAX_CUMUL} total CBUs
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {STATUS_DATA.map(r => {
            const cumulPct = (r.cumul / MAX_CUMUL) * 100;
            const displayLabel = "cumulLabel" in r ? (r as any).cumulLabel : r.label;

            return (
              <div key={r.label} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-[160px] shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0 border-2 border-white shadow-sm"
                    style={{ backgroundColor: r.dot }} />
                  <span className="text-xs font-semibold text-slate-700 truncate">{displayLabel}</span>
                </div>

                <div className="flex-1 relative h-7 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`absolute top-1 bottom-1 left-1 rounded-md ${r.barFill} opacity-60 transition-all`}
                    style={{ width: `calc(${cumulPct}% - 8px)` }}
                  />
                </div>

                <span className="text-xl font-black tabular-nums text-[#1f36c7] leading-none w-8 text-right shrink-0">
                  {r.cumul}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
