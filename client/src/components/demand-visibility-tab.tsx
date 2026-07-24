import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Lock, Package, Layers3, Boxes, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type DemandForecastEntry = {
  id: string;
  basepack: string;
  depot: string;
  mocMonth: string;
  channelType: "MT" | "Non-MT";
  forecastChannel: string | null;
  subChannel: string | null;
  qtyCases: number;
  qtyRpm: number;
  qtyUnits: number;
};

type Uom = "qtyCases" | "qtyRpm" | "qtyUnits";

const UOM_OPTIONS: { value: Uom; label: string; icon: typeof Package; activeClass: string }[] = [
  { value: "qtyCases", label: "Cases", icon: Package, activeClass: "bg-[#0d8ecf] text-white border-[#0d8ecf] hover:bg-[#0d8ecf] hover:text-white" },
  { value: "qtyRpm",   label: "RPM",   icon: Layers3, activeClass: "bg-violet-600 text-white border-violet-600 hover:bg-violet-600 hover:text-white" },
  { value: "qtyUnits", label: "Units", icon: Boxes,   activeClass: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600 hover:text-white" },
];

const CHANNEL_FILTERS = ["All", "MT", "Non-MT"] as const;

function formatQty(n: number): string {
  return n === 0 ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatQtyNum(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ── CBU-level total strip ─────────────────────────────────────────────────────

function CbuSummaryStrip({
  entries, mocMonths, uom,
}: { entries: DemandForecastEntry[]; mocMonths: string[]; uom: Uom }) {
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.mocMonth, (map.get(e.mocMonth) ?? 0) + (e[uom] ?? 0));
    }
    return map;
  }, [entries, uom]);

  const grandTotal = useMemo(() => Array.from(totals.values()).reduce((s, v) => s + v, 0), [totals]);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-4 shadow-sm"
      data-testid="cbu-summary-strip"
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1f36c7]/5 border-b border-[#1f36c7]/10">
        <TrendingUp className="h-3.5 w-3.5 text-[#1f36c7]" />
        <span className="text-[11px] font-bold text-[#1f36c7] uppercase tracking-widest">
          CBU Total — All Depots &amp; Channels
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Grand Total</span>
          <span className="text-sm font-black text-slate-800 tabular-nums">{formatQtyNum(grandTotal)}</span>
        </div>
      </div>

      {/* Month tiles */}
      <div className="flex flex-wrap gap-0 divide-x divide-slate-100">
        {mocMonths.map((m, idx) => {
          const val = totals.get(m) ?? 0;
          return (
            <div
              key={m}
              className={cn(
                "flex flex-col items-center justify-center px-5 py-3 min-w-[90px] flex-1",
                idx === mocMonths.length - 1 && "border-r-0"
              )}
              data-testid={`cbu-total-${m}`}
            >
              <span className="text-[10px] font-semibold text-slate-400 tracking-wide whitespace-nowrap">{m}</span>
              <span className="text-base font-black tabular-nums text-slate-800 mt-0.5 leading-tight">
                {formatQtyNum(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Depot-level summary table ─────────────────────────────────────────────────

function DepotSummaryTable({
  entries, mocMonths, uom,
}: { entries: DemandForecastEntry[]; mocMonths: string[]; uom: Uom }) {
  const [expanded, setExpanded] = useState(true);

  const { depotRows, depotTotals } = useMemo(() => {
    const depotMap = new Map<string, Map<string, number>>();
    for (const e of entries) {
      if (!depotMap.has(e.depot)) depotMap.set(e.depot, new Map());
      const byMoc = depotMap.get(e.depot)!;
      byMoc.set(e.mocMonth, (byMoc.get(e.mocMonth) ?? 0) + (e[uom] ?? 0));
    }
    const depotRows = Array.from(depotMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([depot, byMoc]) => ({ depot, byMoc }));

    const totals = new Map<string, number>();
    for (const { byMoc } of depotRows) {
      byMoc.forEach((v, m) => totals.set(m, (totals.get(m) ?? 0) + v));
    }
    return { depotRows, depotTotals: totals };
  }, [entries, uom]);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white mb-4 overflow-hidden shadow-sm"
      data-testid="depot-summary-table"
    >
      {/* Collapsible header */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 hover:bg-slate-100/80 transition-colors"
        onClick={() => setExpanded(v => !v)}
        data-testid="btn-depot-summary-toggle"
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
          Depot Summary — Channels Aggregated
        </span>
        <span className="ml-1 text-[10px] text-slate-400 font-normal">({depotRows.length} depots)</span>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="table-depot-summary">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 min-w-[80px]">
                  Depot
                </th>
                {mocMonths.map(m => (
                  <th key={m} className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                    {m}
                  </th>
                ))}
                <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1f36c7]">
                  Depot Total
                </th>
              </tr>
            </thead>
            <tbody>
              {depotRows.map(({ depot, byMoc }, i) => {
                const rowTotal = Array.from(byMoc.values()).reduce((s, v) => s + v, 0);
                return (
                  <tr
                    key={depot}
                    className={cn(
                      "border-b border-slate-50 hover:bg-blue-50/30 transition-colors",
                      i % 2 === 1 && "bg-slate-50/40"
                    )}
                    data-testid={`depot-row-${depot}`}
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 sticky left-0 bg-inherit text-xs">
                      {depot}
                    </td>
                    {mocMonths.map(m => {
                      const val = byMoc.get(m) ?? 0;
                      return (
                        <td key={m} className="px-4 py-2.5 text-right tabular-nums text-xs" data-testid={`depot-cell-${depot}-${m}`}>
                          {val > 0
                            ? <span className="text-slate-700">{formatQty(val)}</span>
                            : <span className="text-slate-200 select-none">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-[#1f36c7] text-xs">
                      {rowTotal > 0 ? formatQtyNum(rowTotal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky left-0 bg-slate-50">
                  All Depots
                </td>
                {mocMonths.map(m => {
                  const val = depotTotals.get(m) ?? 0;
                  return (
                    <td key={m} className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-700 text-xs">
                      {val > 0 ? formatQtyNum(val) : "—"}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5 text-right tabular-nums font-black text-[#1f36c7] text-xs">
                  {formatQtyNum(Array.from(depotTotals.values()).reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DemandVisibilityTab({ basepack, cbuCode, isDraft }: { basepack: string; cbuCode: string; isDraft: boolean }) {
  const [uom, setUom] = useState<Uom>("qtyCases");
  const [channelFilter, setChannelFilter] = useState<(typeof CHANNEL_FILTERS)[number]>("All");

  const { data: entries = [], isLoading } = useQuery<DemandForecastEntry[]>({
    queryKey: ["/api/demand-forecast", basepack],
    queryFn: () => basepack ? fetch(`/api/demand-forecast/${encodeURIComponent(basepack)}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!basepack && !isDraft,
  });

  const filtered = useMemo(
    () => channelFilter === "All" ? entries : entries.filter(e => e.channelType === channelFilter),
    [entries, channelFilter]
  );

  const { rows, mocMonths } = useMemo(() => {
    const mocSet = new Set<string>();
    const grouped = new Map<string, { depot: string; channelType: string; forecastChannel: string | null; subChannel: string | null; byMoc: Map<string, number> }>();

    for (const e of filtered) {
      mocSet.add(e.mocMonth);
      const key = `${e.depot}__${e.channelType}__${e.forecastChannel ?? ""}__${e.subChannel ?? ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, { depot: e.depot, channelType: e.channelType, forecastChannel: e.forecastChannel, subChannel: e.subChannel, byMoc: new Map() });
      }
      grouped.get(key)!.byMoc.set(e.mocMonth, e[uom] ?? 0);
    }

    const months = Array.from(mocSet).sort();
    const rows = Array.from(grouped.values()).sort((a, b) =>
      a.depot === b.depot ? a.channelType.localeCompare(b.channelType) : a.depot.localeCompare(b.depot)
    );
    return { rows, mocMonths: months };
  }, [filtered, uom]);

  if (isDraft) {
    return (
      <Card>
        <CardContent className="px-6 py-12 flex flex-col items-center gap-2 text-muted-foreground">
          <Lock className="h-6 w-6 opacity-30" />
          <p className="text-sm font-medium">Demand Visibility unlocks after activation</p>
          <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
            Dynamic forecast data (CBU × Depot × MOC) becomes available once this CBU moves out of Draft status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-6 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <LineChart className="h-4 w-4 text-[#0d8ecf]" />
            Demand Visibility · Dynamic Forecast
            <span className="text-xs font-normal text-muted-foreground ml-1">· {cbuCode}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forecast at CBU × Depot × MOC (Month of Consumption) granularity, across MT and Non-MT channels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            value={channelFilter}
            onValueChange={(v) => v && setChannelFilter(v as (typeof CHANNEL_FILTERS)[number])}
            data-testid="toggle-demand-channel-filter"
          >
            {CHANNEL_FILTERS.map(c => (
              <ToggleGroupItem key={c} value={c} size="sm" className="text-xs px-3" data-testid={`toggle-channel-${c}`}>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg p-1" data-testid="toggle-demand-uom">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground pl-1.5 pr-0.5">UoM</span>
            {UOM_OPTIONS.map(o => {
              const Icon = o.icon;
              const active = uom === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setUom(o.value)}
                  data-testid={`toggle-uom-${o.value}`}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors",
                    active ? o.activeClass : "bg-background text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full rounded" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground border rounded-lg">
            <LineChart className="h-6 w-6 opacity-20" />
            <p className="text-sm">No demand forecast data available for this CBU yet</p>
          </div>
        ) : (
          <>
            {/* ── CBU Total Summary ── */}
            <CbuSummaryStrip entries={filtered} mocMonths={mocMonths} uom={uom} />

            {/* ── Depot-level Summary (channels aggregated) ── */}
            <DepotSummaryTable entries={filtered} mocMonths={mocMonths} uom={uom} />

            {/* ── Detail: Depot × Channel × Sub-channel × MOC ── */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {/* Section header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <LineChart className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Detail — By Depot, Channel &amp; Sub-Channel
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="table-demand-visibility">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 min-w-[72px]">Depot</th>
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 min-w-[60px]">Channel</th>
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 min-w-[100px]">Sub Channel (MT)</th>
                      {mocMonths.map(m => (
                        <th key={m} className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-slate-50 hover:bg-blue-50/30 transition-colors",
                          i % 2 === 1 && "bg-slate-50/40"
                        )}
                        data-testid={`row-demand-${r.depot}-${r.channelType}-${i}`}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">{r.depot}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn(
                            "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded",
                            r.channelType === "MT"
                              ? "bg-[#0d8ecf]/10 text-[#0d8ecf]"
                              : "bg-emerald-50 text-emerald-700"
                          )}>
                            {r.channelType === "MT" ? "MT" : (r.forecastChannel ?? r.channelType)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {r.channelType === "MT" ? (r.subChannel ?? "—") : "—"}
                        </td>
                        {mocMonths.map(m => (
                          <td key={m} className="px-4 py-2.5 text-right tabular-nums" data-testid={`cell-demand-${r.depot}-${m}`}>
                            {(() => {
                              const val = r.byMoc.get(m) ?? 0;
                              return val > 0
                                ? <span className="text-slate-700">{formatQty(val)}</span>
                                : <span className="text-slate-200 select-none">—</span>;
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
