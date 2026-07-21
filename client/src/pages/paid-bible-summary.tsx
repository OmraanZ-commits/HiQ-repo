import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, Globe, Waypoints, Users, Banknote,
  Package, BarChart3, Clock, CheckCircle2,
  ChevronDown, ChevronRight, Truck, Rocket, TrendingUp,
} from "lucide-react";
import { type NetworkEntry } from "@shared/schema";
import { useSrStore } from "@/lib/sr-store";
import { getNetworkChangeTypeName } from "@/lib/constants";

// ── Constants ─────────────────────────────────────────────────────────────────

const BP_STATUS_DEFS = [
  { key: "Active Pack",         label: "Active",   color: "#10b981", bg: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700"  },
  { key: "Draft",               label: "Draft",    color: "#94a3b8", bg: "bg-slate-400",   light: "bg-slate-50 text-slate-500"     },
  { key: "Inactive Pack",       label: "Inactive", color: "#64748b", bg: "bg-slate-500",   light: "bg-slate-100 text-slate-600"    },
  { key: "Seasonal Pack",       label: "Seasonal", color: "#8b5cf6", bg: "bg-violet-500",  light: "bg-violet-50 text-violet-700"   },
  { key: "Stock Base Delisted", label: "SBD",      color: "#f97316", bg: "bg-orange-500",  light: "bg-orange-50 text-orange-700"   },
  { key: "Delisted Packs",      label: "Delisted", color: "#ef4444", bg: "bg-red-500",     light: "bg-red-50 text-red-700"         },
] as const;

const SR_TYPE_DEFS = [
  { code: "geo-extension",             label: "Geo Extension",      icon: Globe,     accent: "#10b981", border: "border-emerald-200", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  { code: "channel-extension",         label: "Channel Extension",  icon: Waypoints, accent: "#8b5cf6", border: "border-violet-200",  bg: "bg-violet-50",  dot: "bg-violet-500"  },
  { code: "customer-chain-amendment",  label: "Customer Extension", icon: Users,     accent: "#3b82f6", border: "border-blue-200",    bg: "bg-blue-50",    dot: "bg-blue-500"    },
  { code: "price-lot-change",          label: "Pricing Issues",     icon: Banknote,  accent: "#f59e0b", border: "border-amber-200",   bg: "bg-amber-50",   dot: "bg-amber-500"   },
] as const;

const RELAUNCH_CODES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE", "NEW_LAUNCH",
]);

const TIMELINE_BUCKETS = [
  { key: "t15",  label: "0 – 15 days",  min: 0,  max: 15,       accent: "text-emerald-700", ring: "ring-1 ring-emerald-200", bg: "bg-emerald-50" },
  { key: "t30",  label: "16 – 30 days", min: 16, max: 30,       accent: "text-amber-700",   ring: "ring-1 ring-amber-200",   bg: "bg-amber-50"   },
  { key: "t60",  label: "31 – 60 days", min: 31, max: 60,       accent: "text-orange-700",  ring: "ring-1 ring-orange-200",  bg: "bg-orange-50"  },
  { key: "t60p", label: "> 60 days",    min: 61, max: Infinity, accent: "text-slate-600",   ring: "ring-1 ring-slate-200",   bg: "bg-slate-50"   },
];

const MOC_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ num: i + 1, label: `MOC ${i + 1}` }));
const CURRENT_MONTH = new Date().getMonth() + 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const now = new Date(); now.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function inBucket(days: number | null, min: number, max: number): boolean {
  return days !== null && days >= min && days <= max;
}

type NewLaunchRow = {
  bpCode: string; code: string; description: string; salesCategory: string;
  networkChangeDate: string | null; mstnPercentage: number | null;
  networkStatus: string; activationMonth: number | null;
};

function getMocStatus(row: NewLaunchRow, moc: number): "active" | "yes" | "no" | "future" | "unknown" {
  if (row.activationMonth !== null && moc >= row.activationMonth) return "active";
  if (moc > CURRENT_MONTH) return "future";
  if (row.mstnPercentage === null) return "unknown";
  return row.mstnPercentage >= 80 ? "yes" : "no";
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, badge, color = "#1f36c7" }: {
  icon: React.ElementType; title: string; badge?: string | number; color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {badge !== undefined && (
        <span className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">{badge}</span>
      )}
    </div>
  );
}

// ── SrCard ───────────────────────────────────────────────────────────────────

function SrCard({ def, pending, approved, rejected, total, onDoubleClickPending, onClickTotal }: {
  def: typeof SR_TYPE_DEFS[number];
  pending: number; approved: number; rejected: number; total: number;
  onDoubleClickPending: () => void; onClickTotal: () => void;
}) {
  const Icon = def.icon;
  return (
    <div className={`rounded-xl border ${def.border} ${def.bg} overflow-hidden flex flex-col`}>
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-white/70">
        <div className={`h-6 w-6 rounded-full ${def.dot} flex items-center justify-center shrink-0`}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-bold text-slate-800 flex-1">{def.label}</span>
        {total > 0 && (
          <button
            className="text-[10px] text-slate-400 hover:text-slate-700 underline underline-offset-2"
            onClick={onClickTotal}
            data-testid={`sr-total-link-${def.code}`}
          >
            {total} →
          </button>
        )}
      </div>
      <div className="flex divide-x divide-white/60">
        {[
          { label: "Pending",  val: pending,  color: pending > 0  ? "text-amber-600"   : "text-slate-300", dbl: true },
          { label: "Approved", val: approved, color: approved > 0 ? "text-emerald-600" : "text-slate-300", dbl: false },
          { label: "Rejected", val: rejected, color: rejected > 0 ? "text-red-600"     : "text-slate-300", dbl: false },
        ].map(col => (
          <div
            key={col.label}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 cursor-pointer select-none"
            onDoubleClick={col.dbl ? onDoubleClickPending : undefined}
            title={col.dbl ? "Double-click for aging" : undefined}
            data-testid={`sr-${col.label.toLowerCase()}-${def.code}`}
          >
            <span className={`text-xl font-black tabular-nums leading-none ${col.color}`}>{col.val}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{col.label}</span>
          </div>
        ))}
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

  const { data: bpDatesRaw = [] } = useQuery<Array<{ bpCode: string; activationDate: string | null }>>({
    queryKey: ["/api/paid-bible/basepack-dates"],
    staleTime: 30_000,
  });

  // ── UI state ──────────────────────────────────────────────────────────────

  const [agingDialog, setAgingDialog] = useState<{
    srType: string; label: string;
    items: { id: string; age: number; basepackId: string }[];
  } | null>(null);

  const [expandedSlob, setExpandedSlob] = useState<string | null>(null);
  const [expandedRelaunch, setExpandedRelaunch] = useState<number | null>(0);
  const [expandedDispatch, setExpandedDispatch] = useState<number | null>(0);
  const [expandedRelaunchScat, setExpandedRelaunchScat] = useState<string | null>(null);
  const [expandedDispatchScat, setExpandedDispatchScat] = useState<string | null>(null);
  const [selMoc, setSelMoc] = useState(CURRENT_MONTH);

  // ── Derived data ──────────────────────────────────────────────────────────

  const { basepacks, allMaterials } = useMemo(() => {
    const grouped = new Map<string, NetworkEntry[]>();
    networkEntries.forEach(e => {
      const key = e.basepack || e.cbuCode || e.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    });

    const bps = Array.from(grouped.entries()).map(([bpCode, entries]) => {
      const first = entries[0];
      const rawStatus = deriveBpStatus(entries.map(e => e.networkStatus));
      return {
        id: bpCode,
        salesCategory: first.salesCategory || "Other",
        effectiveStatus: bpStatusOverrides[bpCode] ?? rawStatus,
      };
    });

    const mats = networkEntries.map(e => ({
      id: e.id,
      code: e.cbuCode || e.id,
      description: e.materialDescription || e.basepackDescription || "—",
      networkStatus: e.networkStatus ?? "Draft",
      salesCategory: e.salesCategory || "Other",
      typeOfNetworkCode: e.typeOfNetwork || "",
      networkChangeDate: e.networkChangeDate ?? null,
      slobRisk: e.slobRisk ?? false,
      mrp: (e as any).mrp ?? null,
      mstnPercentage: e.mstnPercentage ?? null,
      priceActive: (e as any).priceActive ?? true,
      predecessorCode: (e as any).predecessorCode ?? null,
      basepack: e.basepack ?? null,
    }));

    return { basepacks: bps, allMaterials: mats };
  }, [networkEntries, bpStatusOverrides]);

  const salesCategories = useMemo(() =>
    [...new Set(basepacks.map(b => b.salesCategory))].filter(Boolean).sort(),
  [basepacks]);

  const bpDateMap = useMemo(() => {
    const m = new Map<string, number | null>();
    bpDatesRaw.forEach(bp => {
      const month = bp.activationDate ? new Date(bp.activationDate).getMonth() + 1 : null;
      m.set(bp.bpCode, month);
    });
    return m;
  }, [bpDatesRaw]);

  // ── KPI counts ────────────────────────────────────────────────────────────

  const totalBps   = basepacks.length;
  const activeBps  = basepacks.filter(b => b.effectiveStatus === "Active Pack").length;
  const pendingSrs = serviceRequests.filter(r => r.overallStatus === "pending").length;
  const slobCount  = allMaterials.filter(m => m.slobRisk).length;
  const priceInactiveCount = allMaterials.filter(m => !m.priceActive).length;

  // ── BP status by Small C ──────────────────────────────────────────────────

  function bpStatusData(cat: string) {
    const catBps = basepacks.filter(b => b.salesCategory === cat);
    return BP_STATUS_DEFS.map(d => ({ ...d, count: catBps.filter(b => b.effectiveStatus === d.key).length }));
  }

  // ── SR helpers ────────────────────────────────────────────────────────────

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

  // ── SLOB by Small C ───────────────────────────────────────────────────────

  const slobByScat = useMemo(() => {
    const groups = new Map<string, typeof allMaterials>();
    allMaterials.filter(m => m.slobRisk).forEach(m => {
      if (!groups.has(m.salesCategory)) groups.set(m.salesCategory, []);
      groups.get(m.salesCategory)!.push(m);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allMaterials]);

  // ── Relaunch & Dispatch buckets ───────────────────────────────────────────

  const relaunchMats = useMemo(() =>
    allMaterials.filter(m => RELAUNCH_CODES.has(m.typeOfNetworkCode)),
  [allMaterials]);

  const dispatchMats = useMemo(() =>
    allMaterials.filter(m => m.networkStatus === "Stock Movement Initiated" && m.networkChangeDate),
  [allMaterials]);

  function bucketItems<T extends { networkChangeDate: string | null }>(items: T[], min: number, max: number) {
    return items.filter(m => inBucket(daysFromNow(m.networkChangeDate), min, max));
  }

  // ── MSTN Readiness by Small C for selected MOC ────────────────────────────

  const rawDateMap = useMemo(() => new Map(bpDatesRaw.map(bp => [bp.bpCode, bp.activationDate])), [bpDatesRaw]);

  const newLaunchRows = useMemo((): NewLaunchRow[] => {
    return allMaterials
      .filter(m => m.typeOfNetworkCode === "NEW_LAUNCH")
      .map(m => {
        const bpCode = m.basepack || m.code;
        const activationDateRaw = rawDateMap.get(bpCode) ?? null;
        const activationMonth = activationDateRaw ? new Date(activationDateRaw).getMonth() + 1 : null;
        return {
          bpCode, code: m.code, description: m.description,
          salesCategory: m.salesCategory || "—", networkChangeDate: m.networkChangeDate,
          mstnPercentage: m.mstnPercentage, networkStatus: m.networkStatus, activationMonth,
        };
      });
  }, [allMaterials, rawDateMap]);

  const mstnByBp = useMemo(() => {
    const groups = new Map<string, { name: string; smallC: string; cleared: number; notCleared: number; exception: number }>();
    newLaunchRows.forEach(row => {
      const s = getMocStatus(row, selMoc);
      if (s === "future" || s === "active") return;
      const key = row.bpCode;
      if (!groups.has(key)) groups.set(key, { name: row.description, smallC: row.salesCategory, cleared: 0, notCleared: 0, exception: 0 });
      const g = groups.get(key)!;
      if (s === "yes") g.cleared++;
      else if (s === "no") g.notCleared++;
      else g.exception++;
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [newLaunchRows, selMoc]);

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
    <div className="space-y-7" data-testid="paid-bible-summary">

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Basepacks", value: totalBps,          sub: `${activeBps} active · ${totalBps - activeBps} other`, icon: Package,       gFrom: "from-[#1f36c7]", gTo: "to-[#0d8ecf]" },
          { label: "Active",          value: activeBps,         sub: totalBps > 0 ? `${Math.round(activeBps / totalBps * 100)}% of portfolio` : "—", icon: CheckCircle2, gFrom: "from-emerald-500", gTo: "to-emerald-600" },
          { label: "Pending SRs",     value: pendingSrs,        sub: `of ${serviceRequests.length} total requests`,          icon: Clock,         gFrom: "from-amber-400",   gTo: "to-amber-600"   },
          { label: "SLOB CBUs",       value: slobCount,         sub: "CBUs with SLOB flag",                                   icon: AlertTriangle, gFrom: "from-red-400",     gTo: "to-rose-600"    },
          { label: "Price Inactive",  value: priceInactiveCount,sub: "MSTN ≥ 80%, price not live",                            icon: Banknote,      gFrom: "from-orange-400",  gTo: "to-orange-600"  },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-3.5 text-white bg-gradient-to-br ${kpi.gFrom} ${kpi.gTo} shadow-sm`} data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-75">{kpi.label}</p>
                <p className="text-2xl font-black tabular-nums leading-tight mt-1">{kpi.value}</p>
                <p className="text-[10px] opacity-65 font-medium mt-0.5">{kpi.sub}</p>
              </div>
              <kpi.icon className="h-5 w-5 opacity-40 mt-0.5 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 1: Pack Summary ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100">
          <SectionHeader icon={BarChart3} title="Pack Summary & Status" badge={`${totalBps} basepacks`} />
          <div className="flex items-center gap-4 flex-wrap">
            {BP_STATUS_DEFS.map(d => (
              <span key={d.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className={`inline-block h-2 w-2 rounded-sm ${d.bg}`} />{d.label}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                {BP_STATUS_DEFS.map(d => (
                  <th key={d.key} className="text-center px-3 py-2 font-semibold text-[10px] uppercase tracking-wider" style={{ color: d.color }}>{d.label}</th>
                ))}
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-[#1f36c7]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {salesCategories.map(cat => {
                const data = bpStatusData(cat);
                const total = data.reduce((s, d) => s + d.count, 0);
                return (
                  <tr key={cat} className="hover:bg-slate-50/50 transition-colors" data-testid={`pack-summary-row-${cat}`}>
                    <td className="px-5 py-2.5 font-medium text-slate-700">{cat}</td>
                    {data.map(d => (
                      <td key={d.key} className="text-center px-3 py-2.5 tabular-nums">
                        {d.count > 0
                          ? <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${d.light}`}>{d.count}</span>
                          : <span className="text-slate-200 text-sm">—</span>}
                      </td>
                    ))}
                    <td className="text-center px-4 py-2.5 font-bold text-slate-700 tabular-nums">{total}</td>
                  </tr>
                );
              })}
              {salesCategories.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 text-xs italic">No basepack data available.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total</td>
                {BP_STATUS_DEFS.map(d => {
                  const n = basepacks.filter(b => b.effectiveStatus === d.key).length;
                  return (
                    <td key={d.key} className="text-center px-3 py-2.5 tabular-nums font-bold" style={{ color: n > 0 ? d.color : "#e2e8f0" }}>
                      {n > 0 ? n : "—"}
                    </td>
                  );
                })}
                <td className="text-center px-4 py-2.5 font-black text-[#1f36c7] tabular-nums">{totalBps}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Section 2: SR Tracker ── */}
      <div>
        <SectionHeader icon={TrendingUp} title="Service Request & Amendment Tracker" />
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
        <p className="text-[10px] text-slate-400 mt-1.5 ml-0.5">Double-click Pending count to view aging report</p>
      </div>

      {/* ── Section 3: SLOB Risk ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="h-7 w-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">SLOB Risk & Network Exposure</h2>
          {slobCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 ml-1">
              {slobCount} CBUs at risk
            </span>
          )}
        </div>
        {slobByScat.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-xs italic">No SLOB-flagged CBUs.</div>
        ) : (
          <table className="w-full text-xs" data-testid="slob-table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-red-600">CBUs at Risk</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-orange-600">CBU × DC Combos</th>
                <th className="text-right px-5 py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-500">MRP Exposure</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {slobByScat.map(([cat, mats]) => (
                <React.Fragment key={cat}>
                  <tr
                    className="hover:bg-red-50/30 cursor-pointer"
                    onClick={() => setExpandedSlob(expandedSlob === cat ? null : cat)}
                    data-testid={`slob-row-${cat}`}
                  >
                    <td className="px-5 py-2.5 font-medium text-slate-700">{cat}</td>
                    <td className="text-center px-4 py-2.5">
                      <span className="font-black text-red-600 tabular-nums">{mats.length}</span>
                    </td>
                    <td className="text-center px-4 py-2.5 text-slate-300 text-xs">—</td>
                    <td className="text-right px-5 py-2.5 text-slate-300 text-xs">—</td>
                    <td className="pr-4 text-slate-400">
                      {expandedSlob === cat ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                  </tr>
                  {expandedSlob === cat && (
                    <tr>
                      <td colSpan={5} className="px-5 pb-3 pt-1 bg-red-50/15">
                        <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              {["CBU Code", "Description", "Predecessor CBU", "Status"].map(h => (
                                <th key={h} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {mats.map(m => (
                              <tr key={m.id} className="hover:bg-red-50/30">
                                <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{m.code}</td>
                                <td className="px-3 py-1.5 text-slate-600 max-w-[10rem] truncate" title={m.description}>{m.description}</td>
                                <td className="px-3 py-1.5 font-mono text-slate-500">{m.predecessorCode ?? "—"}</td>
                                <td className="px-3 py-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border bg-orange-50 text-orange-700 border-orange-200">{m.networkStatus}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total</td>
                <td className="text-center px-4 py-2.5 font-black text-red-600 tabular-nums">{slobCount}</td>
                <td className="text-center px-4 py-2.5 text-slate-300 text-xs">—</td>
                <td className="text-right px-5 py-2.5 text-slate-300 text-xs">—</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Sections 4 + 5: Relaunch + Dispatch side-by-side ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Relaunch Buckets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Rocket className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">Relaunch & Network Buckets</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {TIMELINE_BUCKETS.map((bucket, i) => {
              const items = bucketItems(relaunchMats, bucket.min, bucket.max);
              const byScat = Array.from(
                items.reduce((m, r) => {
                  const k = r.salesCategory || "Other";
                  if (!m.has(k)) m.set(k, []);
                  m.get(k)!.push(r);
                  return m;
                }, new Map<string, typeof items>())
              ).sort(([a], [b]) => a.localeCompare(b));
              return (
                <div key={bucket.key}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/60 select-none"
                    onClick={() => { setExpandedRelaunch(expandedRelaunch === i ? null : i); setExpandedRelaunchScat(null); }}
                    data-testid={`relaunch-bucket-${bucket.key}`}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{items.length}</span>
                    <span className="text-[10px] text-slate-400">CBUs · {byScat.length} Small C</span>
                    {expandedRelaunch === i
                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  {expandedRelaunch === i && items.length === 0 && (
                    <p className="px-5 pb-3 text-xs text-slate-400 italic">No CBUs in this window</p>
                  )}
                  {expandedRelaunch === i && byScat.map(([cat, mats]) => (
                    <React.Fragment key={cat}>
                      <div
                        className="flex items-center gap-2 px-7 py-2 cursor-pointer hover:bg-violet-50/40 select-none border-t border-slate-50"
                        onClick={() => setExpandedRelaunchScat(expandedRelaunchScat === `${i}:${cat}` ? null : `${i}:${cat}`)}
                        data-testid={`relaunch-scat-${bucket.key}-${cat}`}
                      >
                        <span className="text-xs font-semibold text-slate-600">{cat}</span>
                        <span className="ml-auto text-xs font-black text-violet-600 tabular-nums">{mats.length}</span>
                        <span className="text-[10px] text-slate-400">CBUs</span>
                        {expandedRelaunchScat === `${i}:${cat}`
                          ? <ChevronDown className="h-3 w-3 text-slate-400" />
                          : <ChevronRight className="h-3 w-3 text-slate-400" />}
                      </div>
                      {expandedRelaunchScat === `${i}:${cat}` && (
                        <div className="px-7 pb-3 bg-violet-50/10">
                          <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                {["CBU Code", "Description", "MRP", "Network Date", "Status"].map(h => (
                                  <th key={h} className="text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {mats.map(m => (
                                <tr key={m.id} className="hover:bg-violet-50/30">
                                  <td className="px-2.5 py-1.5 font-mono font-semibold text-[#1f36c7]">{m.code}</td>
                                  <td className="px-2.5 py-1.5 text-slate-600 max-w-[8rem] truncate" title={m.description}>{m.description}</td>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-700">{m.mrp ? `₹${m.mrp}` : "—"}</td>
                                  <td className="px-2.5 py-1.5 font-mono text-slate-500">{m.networkChangeDate ?? "—"}</td>
                                  <td className="px-2.5 py-1.5">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200">{m.networkStatus}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch Start Tracking */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Truck className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Dispatch Start Tracking</h2>
                <p className="text-[10px] text-slate-400">Stock Movement Initiated — entering pipeline</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {TIMELINE_BUCKETS.map((bucket, i) => {
              const items = bucketItems(dispatchMats, bucket.min, bucket.max);
              const byScat = Array.from(
                items.reduce((m, r) => {
                  const k = r.salesCategory || "Other";
                  if (!m.has(k)) m.set(k, []);
                  m.get(k)!.push(r);
                  return m;
                }, new Map<string, typeof items>())
              ).sort(([a], [b]) => a.localeCompare(b));
              return (
                <div key={bucket.key}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50/60 select-none"
                    onClick={() => { setExpandedDispatch(expandedDispatch === i ? null : i); setExpandedDispatchScat(null); }}
                    data-testid={`dispatch-bucket-${bucket.key}`}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{items.length}</span>
                    <span className="text-[10px] text-slate-400">CBUs · {byScat.length} Small C</span>
                    {expandedDispatch === i
                      ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                  {expandedDispatch === i && items.length === 0 && (
                    <p className="px-5 pb-3 text-xs text-slate-400 italic">No CBUs in this window</p>
                  )}
                  {expandedDispatch === i && byScat.map(([cat, mats]) => (
                    <React.Fragment key={cat}>
                      <div
                        className="flex items-center gap-2 px-7 py-2 cursor-pointer hover:bg-blue-50/40 select-none border-t border-slate-50"
                        onClick={() => setExpandedDispatchScat(expandedDispatchScat === `${i}:${cat}` ? null : `${i}:${cat}`)}
                        data-testid={`dispatch-scat-${bucket.key}-${cat}`}
                      >
                        <span className="text-xs font-semibold text-slate-600">{cat}</span>
                        <span className="ml-auto text-xs font-black text-blue-600 tabular-nums">{mats.length}</span>
                        <span className="text-[10px] text-slate-400">CBUs</span>
                        {expandedDispatchScat === `${i}:${cat}`
                          ? <ChevronDown className="h-3 w-3 text-slate-400" />
                          : <ChevronRight className="h-3 w-3 text-slate-400" />}
                      </div>
                      {expandedDispatchScat === `${i}:${cat}` && (
                        <div className="px-7 pb-3 bg-blue-50/10">
                          <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                {["CBU Code", "Description", "MRP", "Network Date", "Status"].map(h => (
                                  <th key={h} className="text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {mats.map(m => (
                                <tr key={m.id} className="hover:bg-blue-50/30">
                                  <td className="px-2.5 py-1.5 font-mono font-semibold text-[#1f36c7]">{m.code}</td>
                                  <td className="px-2.5 py-1.5 text-slate-600 max-w-[8rem] truncate" title={m.description}>{m.description}</td>
                                  <td className="px-2.5 py-1.5 font-semibold text-slate-700">{m.mrp ? `₹${m.mrp}` : "—"}</td>
                                  <td className="px-2.5 py-1.5 font-mono text-slate-500">{m.networkChangeDate ?? "—"}</td>
                                  <td className="px-2.5 py-1.5">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{m.networkStatus}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 6: MSTN Readiness ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">MSTN & Launch Readiness</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-slate-400">MOC</span>
            <select
              value={selMoc}
              onChange={e => setSelMoc(Number(e.target.value))}
              className="h-7 text-xs px-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#1f36c7]"
              data-testid="mstn-moc-selector"
            >
              {MOC_OPTIONS.map(m => <option key={m.num} value={m.num}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-5 px-5 py-2.5 border-b border-slate-50 bg-slate-50/40 text-[10px]">
          {[
            { label: "MSTN Cleared",        color: "bg-emerald-500" },
            { label: "MSTN Not Cleared",    color: "bg-red-500"     },
            { label: "Exception / Unknown", color: "bg-amber-500"   },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-slate-500">
              <span className={`inline-block h-2 w-2 rounded-full ${l.color}`} />{l.label}
            </span>
          ))}
        </div>
        {mstnByBp.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-xs italic">
            No new launch CBUs requiring MSTN check for MOC {selMoc}.
          </div>
        ) : (
          <table className="w-full text-xs" data-testid="mstn-table">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Basepack</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-emerald-600">MSTN Cleared</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-red-600">Not Cleared</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-amber-600">Exception</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-400">Total CBUs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mstnByBp.map(([bpCode, counts]) => {
                const total = counts.cleared + counts.notCleared + counts.exception;
                const pct = total > 0 ? Math.round(counts.cleared / total * 100) : 0;
                return (
                  <tr key={bpCode} className="hover:bg-slate-50/50" data-testid={`mstn-row-${bpCode}`}>
                    <td className="px-5 py-2.5">
                      <span className="font-mono font-semibold text-[#1f36c7] text-[10px]">{bpCode}</span>
                      {counts.name && (
                        <p className="font-medium text-slate-700 mt-0.5 leading-tight">{counts.name}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-0.5">{counts.smallC}</p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs">{counts.cleared}</span>
                    </td>
                    <td className="text-center px-4 py-2.5">
                      {counts.notCleared > 0
                        ? <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-black text-xs">{counts.notCleared}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="text-center px-4 py-2.5">
                      {counts.exception > 0
                        ? <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-xs">{counts.exception}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>
                    <td className="text-center px-4 py-2.5 font-bold text-slate-600 tabular-nums">{total}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">All Basepacks</td>
                <td className="text-center px-4 py-2.5 font-black text-emerald-600 tabular-nums">
                  {mstnByBp.reduce((s, [, c]) => s + c.cleared, 0)}
                </td>
                <td className="text-center px-4 py-2.5 font-black text-red-600 tabular-nums">
                  {mstnByBp.reduce((s, [, c]) => s + c.notCleared, 0)}
                </td>
                <td className="text-center px-4 py-2.5 font-black text-amber-600 tabular-nums">
                  {mstnByBp.reduce((s, [, c]) => s + c.exception, 0)}
                </td>
                <td className="text-center px-4 py-2.5 font-black text-[#1f36c7] tabular-nums">
                  {mstnByBp.reduce((s, [, c]) => s + c.cleared + c.notCleared + c.exception, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
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
