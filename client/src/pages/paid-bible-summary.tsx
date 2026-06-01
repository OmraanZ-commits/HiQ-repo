import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Globe, Waypoints, ArrowRightLeft, Shuffle,
  Package, BarChart3, Clock, Truck, TrendingUp, CheckCircle2, XCircle,
} from "lucide-react";
import { type NetworkEntry } from "@shared/schema";
import { useSrStore } from "@/lib/sr-store";
import { getNetworkChangeTypeName } from "@/lib/constants";
import { formatDateDisplay } from "@/lib/date-utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveBpStatus(statuses: (string | null)[]): string {
  const ss = statuses.map(s => s ?? "Draft");
  if (ss.every(s => s === "Draft"))                       return "Draft";
  if (ss.some(s => s === "Network transition complete"))  return "Active Pack";
  if (ss.some(s => s === "Stock Movement Initiated"))     return "Active Pack";
  if (ss.some(s => s === "FTR Approved"))                 return "Active Pack";
  if (ss.some(s => s === "Active"))                       return "Active Pack";
  if (ss.some(s => s === "Production Started"))           return "Active Pack";
  if (ss.some(s => s === "Pricing Updated"))              return "Stock Base Delisted";
  return "Draft";
}

function daysFromNow(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function inBucket(days: number | null, max: number): boolean {
  return days !== null && days >= 0 && days <= max;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BP_STATUS_DEFS = [
  { key: "Active Pack",         label: "Active",   color: "#10b981", bg: "bg-emerald-500" },
  { key: "Draft",               label: "Draft",    color: "#94a3b8", bg: "bg-slate-400"   },
  { key: "Stock Base Delisted", label: "SBD",      color: "#f97316", bg: "bg-orange-500"  },
  { key: "Delisted Packs",      label: "Delisted", color: "#ef4444", bg: "bg-red-500"     },
  { key: "Inactive Pack",       label: "Inactive", color: "#64748b", bg: "bg-slate-500"   },
  { key: "Seasonal Pack",       label: "Seasonal", color: "#8b5cf6", bg: "bg-violet-500"  },
] as const;

const SR_TYPE_DEFS = [
  { code: "geo-extension",          label: "Geo Extension",     icon: Globe,          accent: "#10b981", border: "border-emerald-200", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  { code: "channel-extension",      label: "Channel Extension", icon: Waypoints,      accent: "#8b5cf6", border: "border-violet-200",  bg: "bg-violet-50",  dot: "bg-violet-500"  },
  { code: "basepack-status-change", label: "Basepack Status",   icon: ArrowRightLeft, accent: "#3b82f6", border: "border-blue-200",    bg: "bg-blue-50",    dot: "bg-blue-500"    },
  { code: "sourcing-amendment",     label: "Sourcing Matrix",   icon: Shuffle,        accent: "#f59e0b", border: "border-amber-200",   bg: "bg-amber-50",   dot: "bg-amber-500"   },
] as const;

const RELAUNCH_CODES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG",
]);

const TIMELINE_BUCKETS = [
  { key: "t15", label: "Today + 15 days", max: 15, accent: "text-emerald-700", ring: "ring-emerald-200", bg: "bg-emerald-50" },
  { key: "t30", label: "Today + 30 days", max: 30, accent: "text-amber-700",   ring: "ring-amber-200",   bg: "bg-amber-50"   },
  { key: "t60", label: "Today + 60 days", max: 60, accent: "text-orange-700",  ring: "ring-orange-200",  bg: "bg-orange-50"  },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, gradient, icon: Icon,
}: {
  label: string; value: number | string; sub?: string;
  gradient: string; icon: React.ElementType;
}) {
  return (
    <div className={`rounded-lg p-3.5 text-white shadow-sm ${gradient} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</span>
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </div>
      <div className="text-2xl font-black tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] opacity-70 font-medium">{sub}</div>}
    </div>
  );
}

function StackedBar({ data, total }: {
  data: { key: string; label: string; color: string; bg: string; count: number }[];
  total: number;
}) {
  if (total === 0) return <div className="h-2.5 rounded-full bg-slate-100" />;
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden gap-px w-full">
      {data.filter(d => d.count > 0).map(d => (
        <div
          key={d.key}
          className={`${d.bg} flex items-center justify-center`}
          style={{ width: `${(d.count / total) * 100}%` }}
          title={`${d.label}: ${d.count}`}
        >
          {d.count / total > 0.12 && (
            <span className="text-[9px] font-bold text-white">{d.count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SrCard({
  def, pending, approved, rejected, total, onDoubleClickPending, onClickTotal,
}: {
  def: typeof SR_TYPE_DEFS[number];
  pending: number; approved: number; rejected: number; total: number;
  onDoubleClickPending: () => void;
  onClickTotal: () => void;
}) {
  const Icon = def.icon;
  return (
    <div className={`rounded-lg border ${def.border} ${def.bg} overflow-hidden flex flex-col`}>
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/60">
        <div className={`h-5 w-5 rounded-full ${def.dot} flex items-center justify-center shrink-0`}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-bold text-slate-800">{def.label}</span>
        {total > 0 && (
          <span
            className="ml-auto text-[10px] font-bold underline underline-offset-2 text-slate-400 cursor-pointer hover:text-slate-700"
            onClick={onClickTotal}
            data-testid={`sr-total-link-${def.code}`}
          >
            {total} →
          </span>
        )}
      </div>
      <div className="flex flex-1 divide-x divide-white/60">
        <div
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0 cursor-pointer"
          onDoubleClick={onDoubleClickPending}
          title="Double-click to see aging"
          data-testid={`sr-pending-${def.code}`}
        >
          <span className={`text-xl font-black tabular-nums leading-none ${pending > 0 ? "text-amber-600" : "text-slate-300"}`}>{pending}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Pending</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0" data-testid={`sr-approved-${def.code}`}>
          <span className={`text-xl font-black tabular-nums leading-none ${approved > 0 ? "text-emerald-600" : "text-slate-300"}`}>{approved}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Approved</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0" data-testid={`sr-rejected-${def.code}`}>
          <span className={`text-xl font-black tabular-nums leading-none ${rejected > 0 ? "text-red-600" : "text-slate-300"}`}>{rejected}</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">Rejected</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PaidBibleSummaryTab() {
  const [, navigate] = useLocation();
  const { requests: serviceRequests, bpStatusOverrides } = useSrStore();

  const { data: networkEntries = [], isLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
    staleTime: 0,
  });

  const [agingDialog, setAgingDialog] = useState<{
    srType: string; label: string;
    items: { id: string; age: number; basepackId: string }[];
  } | null>(null);

  const [selectedCat, setSelectedCat] = useState<string>("ALL");

  // ── Derived data ──────────────────────────────────────────────────────────

  const { basepacks, allMaterials } = useMemo(() => {
    const grouped = new Map<string, NetworkEntry[]>();
    networkEntries.forEach(entry => {
      const key = entry.basepack || entry.cbuCode || entry.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(entry);
    });

    const bps = Array.from(grouped.entries()).map(([bpCode, entries]) => {
      const first = entries[0];
      const rawStatus = deriveBpStatus(entries.map(e => e.networkStatus));
      const effStatus = bpStatusOverrides[bpCode] ?? rawStatus;
      return {
        id: bpCode,
        salesCategory: first.salesCategory || "Other",
        effectiveStatus: effStatus,
      };
    });

    const mats = networkEntries.map(e => ({
      id: e.id,
      code: e.cbuCode || e.id,
      description: e.materialDescription || e.basepackDescription || "-",
      networkStatus: e.networkStatus ?? "Draft",
      salesCategory: e.salesCategory || "Other",
      typeOfNetworkCode: e.typeOfNetwork || "",
      typeOfNetworkLabel: getNetworkChangeTypeName(e.typeOfNetwork),
      networkChangeDate: e.networkChangeDate ?? null,
      slobRisk: e.slobRisk ?? false,
      mrp: (e as any).mrp ?? null,
      bg: e.bg || "-",
    }));

    return { basepacks: bps, allMaterials: mats };
  }, [networkEntries, bpStatusOverrides]);

  // ── Section 1: KPI top-line ───────────────────────────────────────────────

  const totalBps     = basepacks.length;
  const activeBps    = basepacks.filter(b => b.effectiveStatus === "Active Pack").length;
  const sbdBps       = basepacks.filter(b => b.effectiveStatus === "Stock Base Delisted").length;
  const pendingSrs   = serviceRequests.filter(r => r.overallStatus === "pending").length;
  const slobCount    = allMaterials.filter(m => m.slobRisk).length;

  // ── Section 2: Basepack status by salesCategory ───────────────────────────

  const salesCategories = useMemo(() =>
    [...new Set(basepacks.map(b => b.salesCategory))].filter(Boolean).sort(),
  [basepacks]);

  function bpStatusData(cat: string) {
    const catBps = basepacks.filter(b => b.salesCategory === cat);
    return BP_STATUS_DEFS.map(d => ({ ...d, count: catBps.filter(b => b.effectiveStatus === d.key).length }));
  }

  // ── Section 3: SR summary ─────────────────────────────────────────────────

  function srCount(code: string, status: string) {
    return serviceRequests.filter(r => r.srType === code && r.overallStatus === status).length;
  }

  function openAgingDialog(srType: string, label: string) {
    const pending = serviceRequests.filter(r => r.srType === srType && r.overallStatus === "pending");
    const items = pending.map(r => {
      const created = (r as any).createdAt ? new Date((r as any).createdAt).getTime() : Date.now() - 86400000 * 3;
      return { id: r.id, age: Math.ceil((Date.now() - created) / 86400000), basepackId: r.basepackId };
    });
    setAgingDialog({ srType, label, items });
  }

  // ── Section 4 & 5: Relaunch by category / type × timeline ────────────────

  const relaunchMats = allMaterials.filter(m => RELAUNCH_CODES.has(m.typeOfNetworkCode));

  const relaunchCats = useMemo(() =>
    [...new Set(relaunchMats.map(m => m.salesCategory))].sort(),
  [relaunchMats]);

  const relaunchTypes = useMemo(() =>
    [...new Set(relaunchMats.map(m => m.typeOfNetworkCode))].sort(),
  [relaunchMats]);

  function bucketCount(items: typeof relaunchMats, max: number) {
    return items.filter(m => inBucket(daysFromNow(m.networkChangeDate), max)).length;
  }
  function smiCount(items: typeof relaunchMats, max: number) {
    return items.filter(m => inBucket(daysFromNow(m.networkChangeDate), max) && m.networkStatus === "Stock Movement Initiated").length;
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading summary…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5" data-testid="paid-bible-summary">

      {/* ── Top KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Total Basepacks"
          value={totalBps}
          sub="across all categories"
          gradient="bg-gradient-to-br from-[#1f36c7] to-[#0d8ecf]"
          icon={Package}
        />
        <KpiCard
          label="Active Packs"
          value={activeBps}
          sub={totalBps > 0 ? `${Math.round(activeBps / totalBps * 100)}% of portfolio` : "—"}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          icon={CheckCircle2}
        />
        <KpiCard
          label="SBD / At-Risk"
          value={sbdBps}
          sub="Stock Base Delisted"
          gradient="bg-gradient-to-br from-orange-400 to-orange-600"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Pending SRs"
          value={pendingSrs}
          sub={`of ${serviceRequests.length} total requests`}
          gradient="bg-gradient-to-br from-amber-400 to-amber-600"
          icon={Clock}
        />
        <KpiCard
          label="SLOB At-Risk"
          value={slobCount}
          sub="CBUs with SLOB flag"
          gradient="bg-gradient-to-br from-red-400 to-rose-600"
          icon={AlertTriangle}
        />
      </div>

      {/* ── Section 1: Basepack Status by Small C ── */}
      <div>
        {/* Header: title + legend + filter */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <BarChart3 className="h-4 w-4 text-[#1f36c7] shrink-0" />
          <h2 className="text-sm font-bold tracking-tight shrink-0">Basepack Status by Small C</h2>
          <div className="flex items-center gap-3 ml-2 flex-wrap flex-1">
            {BP_STATUS_DEFS.map(d => (
              <span key={d.key} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className={`inline-block h-2 w-2 rounded-sm ${d.bg}`} />{d.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-500 font-medium">Small C:</span>
            <Select value={selectedCat} onValueChange={setSelectedCat} data-testid="filter-small-c">
              <SelectTrigger className="h-6 text-[11px] px-2 py-0 w-44 border-slate-200 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
                {salesCategories.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCat !== "ALL" && (
              <button
                className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                onClick={() => setSelectedCat("ALL")}
                data-testid="filter-clear"
              >clear</button>
            )}
          </div>
        </div>

        {/* Two-panel split */}
        {(() => {
          const visibleCats = selectedCat === "ALL" ? salesCategories : salesCategories.filter(c => c === selectedCat);
          const poolBps = selectedCat === "ALL" ? basepacks : basepacks.filter(b => b.salesCategory === selectedCat);
          const poolTotal = poolBps.length;

          return (
            <div className="grid grid-cols-2 gap-3">

              {/* ── Left: Bar chart panel ── */}
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bar View
                </div>
                <div className="divide-y">
                  {visibleCats.map(cat => {
                    const data = bpStatusData(cat);
                    const total = data.reduce((s, d) => s + d.count, 0);
                    return (
                      <div key={cat} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50/60" data-testid={`bp-cat-row-${cat}`}>
                        <span className="text-xs font-semibold text-slate-700 w-32 shrink-0 truncate" title={cat}>{cat}</span>
                        <div className="flex-1 min-w-0">
                          <StackedBar data={data} total={total} />
                        </div>
                        <span className="text-xs font-black text-slate-600 tabular-nums w-5 text-right shrink-0">{total}</span>
                      </div>
                    );
                  })}
                  {/* Totals bar */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide w-32 shrink-0">
                      {selectedCat === "ALL" ? "All" : "Total"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <StackedBar
                        data={BP_STATUS_DEFS.map(d => ({ ...d, count: poolBps.filter(b => b.effectiveStatus === d.key).length }))}
                        total={poolTotal}
                      />
                    </div>
                    <span className="text-xs font-black text-[#1f36c7] tabular-nums w-5 text-right shrink-0">{poolTotal}</span>
                  </div>
                </div>
              </div>

              {/* ── Right: Tabular matrix panel ── */}
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Table View
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-3 py-1.5 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-32">Small C</th>
                        {BP_STATUS_DEFS.map(d => (
                          <th key={d.key} className="text-center px-2 py-1.5 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: d.color }}>
                            {d.label}
                          </th>
                        ))}
                        <th className="text-center px-2 py-1.5 font-bold text-[10px] uppercase tracking-wider text-[#1f36c7]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {visibleCats.map(cat => {
                        const data = bpStatusData(cat);
                        const total = data.reduce((s, d) => s + d.count, 0);
                        return (
                          <tr key={cat} className="hover:bg-slate-50/60" data-testid={`bp-cat-table-${cat}`}>
                            <td className="px-3 py-1.5 font-semibold text-slate-700 truncate max-w-[8rem]" title={cat}>{cat}</td>
                            {data.map(d => (
                              <td key={d.key} className="text-center px-2 py-1.5 tabular-nums font-semibold">
                                {d.count > 0
                                  ? <span className="font-black" style={{ color: d.color }}>{d.count}</span>
                                  : <span className="text-slate-200">—</span>
                                }
                              </td>
                            ))}
                            <td className="text-center px-2 py-1.5 font-black text-slate-600 tabular-nums">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t">
                        <td className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          {selectedCat === "ALL" ? "All" : "Total"}
                        </td>
                        {BP_STATUS_DEFS.map(d => {
                          const n = poolBps.filter(b => b.effectiveStatus === d.key).length;
                          return (
                            <td key={d.key} className="text-center px-2 py-1.5 tabular-nums font-black" style={{ color: n > 0 ? d.color : undefined }}>
                              {n > 0 ? n : <span className="text-slate-200 font-normal">—</span>}
                            </td>
                          );
                        })}
                        <td className="text-center px-2 py-1.5 font-black text-[#1f36c7] tabular-nums">{poolTotal}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* ── Section 2: Service Request Status Summary ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <ArrowRightLeft className="h-4 w-4 text-[#1f36c7]" />
          <h2 className="text-sm font-bold tracking-tight">Service Request Status</h2>
          <span className="text-xs text-muted-foreground ml-1">· Double-click Pending to see aging</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SR_TYPE_DEFS.map(def => (
            <SrCard
              key={def.code}
              def={def}
              pending={srCount(def.code, "pending")}
              approved={srCount(def.code, "approved")}
              rejected={srCount(def.code, "rejected")}
              total={serviceRequests.filter(r => r.srType === def.code).length}
              onDoubleClickPending={() => openAgingDialog(def.code, def.label)}
              onClickTotal={() => navigate("/paid-bible?tab=service-requests")}
            />
          ))}
        </div>
      </div>

      {/* ── Section 3: SLOB Risk ── */}
      {slobCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold tracking-tight">SLOB Risk by Small C</h2>
            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] ml-1">{slobCount} CBUs flagged</Badge>
          </div>
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center px-5 py-2.5 bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider gap-4">
              <span className="w-40 shrink-0">Small C</span>
              <span className="flex-1">Proportion of flagged CBUs</span>
              <span className="w-20 text-right">CBU × DC</span>
              <span className="w-28 text-right">Val. (per unit MRP)</span>
            </div>
            <div className="divide-y">
              {[...new Set(allMaterials.filter(m => m.slobRisk).map(m => m.salesCategory))].sort().map(cat => {
                const mats  = allMaterials.filter(m => m.slobRisk && m.salesCategory === cat);
                const pct   = slobCount > 0 ? mats.length / slobCount : 0;
                const totalVal = mats.reduce((s, m) => s + (typeof m.mrp === "number" ? m.mrp : 0), 0);
                return (
                  <div key={cat} className="flex items-center gap-3 px-4 py-2 hover:bg-red-50/30" data-testid={`slob-row-${cat}`}>
                    <span className="text-xs font-semibold text-slate-700 w-36 shrink-0">{cat}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full bg-red-100 overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-red-600 w-8">{Math.round(pct * 100)}%</span>
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums w-20 text-right">{mats.length}</span>
                    <span className="text-sm text-right w-28">
                      {totalVal > 0
                        ? <span className="font-semibold text-red-600">₹{totalVal.toLocaleString("en-IN")}</span>
                        : <span className="text-[11px] text-muted-foreground italic">Pending MRP</span>
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: Relaunch by Small C × Timeline ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="h-4 w-4 text-[#1f36c7]" />
          <h2 className="text-sm font-bold tracking-tight">Relaunch Packs — by Small C &amp; Timeline</h2>
          <span className="text-xs text-muted-foreground ml-1">· Based on network change date &nbsp;·&nbsp; <span className="inline-flex items-center gap-0.5 text-violet-600"><Truck className="h-3 w-3" /> = Stock Movement Initiated</span></span>
        </div>
        {relaunchMats.length === 0 ? (
          <div className="rounded-xl border bg-white shadow-sm flex items-center justify-center py-10 text-muted-foreground text-sm">No relaunch packs found.</div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-2 px-4 w-40">Small C</th>
                  {TIMELINE_BUCKETS.map(b => (
                    <th key={b.key} className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-3 ${b.accent}`}>
                      {b.label}
                    </th>
                  ))}
                  <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {relaunchCats.map(cat => {
                  const mats = relaunchMats.filter(m => m.salesCategory === cat);
                  return (
                    <tr key={cat} className="hover:bg-slate-50/60" data-testid={`relaunch-cat-${cat}`}>
                      <td className="py-2 px-4 text-xs font-semibold text-slate-700">{cat}</td>
                      {TIMELINE_BUCKETS.map(b => {
                        const n   = bucketCount(mats, b.max);
                        const smi = smiCount(mats, b.max);
                        return (
                          <td key={b.key} className="text-center py-2 px-3">
                            {n > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`text-base font-black tabular-nums ${b.accent}`}>{n}</span>
                                {smi > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-600 bg-violet-50 px-1 py-px rounded-full border border-violet-200">
                                    <Truck className="h-2 w-2" />{smi} SMI
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-slate-200 text-sm font-black">—</span>}
                          </td>
                        );
                      })}
                      <td className="text-center py-2 px-4">
                        <span className="text-xs font-black text-slate-600 tabular-nums">{mats.length}</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-slate-50 border-t">
                  <td className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">All</td>
                  {TIMELINE_BUCKETS.map(b => {
                    const n   = bucketCount(relaunchMats, b.max);
                    const smi = smiCount(relaunchMats, b.max);
                    return (
                      <td key={b.key} className="text-center py-2 px-3">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-base font-black tabular-nums ${b.accent}`}>{n > 0 ? n : "—"}</span>
                          {smi > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-600 bg-violet-50 px-1 py-px rounded-full border border-violet-200">
                              <Truck className="h-2 w-2" />{smi} SMI
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-4">
                    <span className="text-xs font-black text-[#1f36c7] tabular-nums">{relaunchMats.length}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 5: Relaunch by Type of Network Change × Timeline ── */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Package className="h-4 w-4 text-[#0d8ecf]" />
          <h2 className="text-sm font-bold tracking-tight">Relaunch Packs — by Type of Network Change &amp; Timeline</h2>
        </div>
        {relaunchMats.length === 0 ? (
          <div className="rounded-xl border bg-white shadow-sm flex items-center justify-center py-10 text-muted-foreground text-sm">No relaunch packs found.</div>
        ) : (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-2 px-4 w-56">Type of Network Change</th>
                  {TIMELINE_BUCKETS.map(b => (
                    <th key={b.key} className={`text-center text-xs font-bold uppercase tracking-wider py-2 px-3 ${b.accent}`}>
                      {b.label}
                    </th>
                  ))}
                  <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {relaunchTypes.map(code => {
                  const mats  = relaunchMats.filter(m => m.typeOfNetworkCode === code);
                  const label = getNetworkChangeTypeName(code);
                  return (
                    <tr key={code} className="hover:bg-slate-50/60" data-testid={`relaunch-type-${code}`}>
                      <td className="py-2 px-4">
                        <div className="text-xs font-semibold text-slate-700 leading-tight">{label}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{code}</div>
                      </td>
                      {TIMELINE_BUCKETS.map(b => {
                        const n   = bucketCount(mats, b.max);
                        const smi = smiCount(mats, b.max);
                        return (
                          <td key={b.key} className="text-center py-2 px-3">
                            {n > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`text-base font-black tabular-nums ${b.accent}`}>{n}</span>
                                {smi > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-600 bg-violet-50 px-1 py-px rounded-full border border-violet-200">
                                    <Truck className="h-2 w-2" />{smi} SMI
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-slate-200 text-sm font-black">—</span>}
                          </td>
                        );
                      })}
                      <td className="text-center py-2 px-4">
                        <span className="text-xs font-black text-slate-600 tabular-nums">{mats.length}</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="bg-slate-50 border-t">
                  <td className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">All Types</td>
                  {TIMELINE_BUCKETS.map(b => {
                    const n   = bucketCount(relaunchMats, b.max);
                    const smi = smiCount(relaunchMats, b.max);
                    return (
                      <td key={b.key} className="text-center py-2 px-3">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-base font-black tabular-nums ${b.accent}`}>{n > 0 ? n : "—"}</span>
                          {smi > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-600 bg-violet-50 px-1 py-px rounded-full border border-violet-200">
                              <Truck className="h-2 w-2" />{smi} SMI
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-4">
                    <span className="text-xs font-black text-[#1f36c7] tabular-nums">{relaunchMats.length}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SR Aging Dialog ── */}
      <Dialog open={agingDialog !== null} onOpenChange={() => setAgingDialog(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-sr-aging">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Aging — {agingDialog?.label}
            </DialogTitle>
          </DialogHeader>
          {agingDialog && (
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              {agingDialog.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No pending items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs py-2">SR ID</TableHead>
                      <TableHead className="text-xs py-2">Basepack</TableHead>
                      <TableHead className="text-xs py-2 text-center">Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingDialog.items.map(item => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => { setAgingDialog(null); navigate(`/paid-bible/requests/${item.id}`); }}
                      >
                        <TableCell className="text-xs font-mono py-2.5">{item.id}</TableCell>
                        <TableCell className="text-xs py-2.5 max-w-36 truncate">{item.basepackId}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.age > 7 ? "bg-red-100 text-red-700" : item.age > 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                            {item.age}d
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
