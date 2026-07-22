import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle, Banknote,
  Package, BarChart3, Clock, CheckCircle2,
  ChevronDown, ChevronRight, Truck, Rocket, TrendingUp, Search,
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

type SrFilterDef = { label: string; srType: string; targetStatus?: string };

const BP_SR_DEFS: SrFilterDef[] = [
  { label: "Basepack Activation",          srType: "basepack-status-change", targetStatus: "Active Pack"         },
  { label: "Basepack Delisting",           srType: "basepack-status-change", targetStatus: "Delisted Packs"      },
  { label: "Stock Based Delisting",        srType: "basepack-status-change", targetStatus: "Stock Base Delisted" },
  { label: "Basepack Inactivation",        srType: "basepack-status-change", targetStatus: "Inactive Pack"       },
  { label: "Seasonal Pack Activation",     srType: "basepack-status-change", targetStatus: "Seasonal Pack"       },
];

const AMEND_SR_DEFS: SrFilterDef[] = [
  { label: "Geo Extension",                srType: "geo-extension"                  },
  { label: "Channel Extension",            srType: "channel-extension"              },
  { label: "Customer Chain Amendment",     srType: "customer-chain-amendment"       },
  { label: "Sourcing Amendment",           srType: "sourcing-amendment"             },
  { label: "Network Change Date Amendment",srType: "network-change-date-amendment"  },
  { label: "Price Change Request",         srType: "price-lot-change"               },
];

const RELAUNCH_CODES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE", "NEW_LAUNCH",
]);

const TIMELINE_BUCKETS = [
  { key: "t15",  label: "0 – 15 days",  min: 0,  max: 15,       accent: "text-red-700",     ring: "ring-1 ring-red-200",     bg: "bg-red-50"     },
  { key: "t30",  label: "16 – 30 days", min: 16, max: 30,       accent: "text-amber-700",   ring: "ring-1 ring-amber-200",   bg: "bg-amber-50"   },
  { key: "t60",  label: "31 – 60 days", min: 31, max: 60,       accent: "text-yellow-700",  ring: "ring-1 ring-yellow-200",  bg: "bg-yellow-50"  },
  { key: "t60p", label: "> 60 days",    min: 61, max: Infinity, accent: "text-emerald-700", ring: "ring-1 ring-emerald-200", bg: "bg-emerald-50" },
];

const MODAL_THRESHOLD = 10;

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

  const [expandedPriceIssue, setExpandedPriceIssue] = useState<string | null>(null);
  const [expandedSlob, setExpandedSlob] = useState<string | null>(null);
  const [expandedRelaunch, setExpandedRelaunch] = useState<number | null>(0);
  const [expandedDispatch, setExpandedDispatch] = useState<number | null>(0);
  const [expandedRelaunchScat, setExpandedRelaunchScat] = useState<string | null>(null);
  const [expandedDispatchScat, setExpandedDispatchScat] = useState<string | null>(null);
  const [bucketModal, setBucketModal] = useState<{ panel: 'relaunch' | 'dispatch'; bucketIdx: number } | null>(null);
  const [bucketSearch, setBucketSearch] = useState('');
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
      depots: (e.depot as string[] | null) ?? [],
      depotCount: (e as any).depotCount ?? null,
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

  function srCountFiltered(def: SrFilterDef, status: string): number {
    return serviceRequests.filter(r => {
      if (r.srType !== def.srType) return false;
      if (def.targetStatus && r.targetStatus !== def.targetStatus) return false;
      return r.overallStatus === status;
    }).length;
  }

  function openAgingDialog(srType: string, label: string) {
    const pending = serviceRequests.filter(r => r.srType === srType && r.overallStatus === "pending");
    const items = pending.map(r => {
      const created = (r as any).createdAt ? new Date((r as any).createdAt).getTime() : Date.now() - 86400000 * 3;
      return { id: r.id, age: Math.ceil((Date.now() - created) / 86400000), basepackId: r.basepackId };
    });
    setAgingDialog({ srType, label, items });
  }

  // ── Pricing Issues by Small C ─────────────────────────────────────────────

  const priceIssueByScat = useMemo(() => {
    const groups = new Map<string, typeof allMaterials>();
    allMaterials.filter(m => !m.priceActive).forEach(m => {
      if (!groups.has(m.salesCategory)) groups.set(m.salesCategory, []);
      groups.get(m.salesCategory)!.push(m);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allMaterials]);

  const totalPriceIssueCbus = priceIssueByScat.reduce((s, [, mats]) => s + mats.length, 0);
  const totalPriceIssueDcCombos = priceIssueByScat.reduce(
    (s, [, mats]) => s + mats.reduce((ms, m) => ms + (m.depotCount ?? m.depots.length), 0), 0
  );

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="sr-tracker">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-[#1f36c7]/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-[#1f36c7]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Service Request &amp; Amendment Tracker</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider w-[55%]">SR Type</th>
              <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-amber-600">Pending</th>
              <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-emerald-600">Approved</th>
              <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-red-500">Rejected</th>
              <th className="text-center px-5 py-2 font-semibold text-[10px] uppercase tracking-wider text-[#1f36c7]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {/* ── Basepack section ── */}
            <tr className="bg-[#1f36c7]/[0.04] border-y border-[#1f36c7]/10">
              <td colSpan={5} className="px-5 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1f36c7]">Basepack Requests</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1f36c7]/10 text-[9px] font-bold text-[#1f36c7] tabular-nums">5 types</span>
                </div>
              </td>
            </tr>
            {BP_SR_DEFS.map(def => {
              const p = srCountFiltered(def, "pending");
              const a = srCountFiltered(def, "approved");
              const r = srCountFiltered(def, "rejected");
              return (
                <tr key={def.label} className="hover:bg-slate-50/80">
                  <td className="px-5 py-2.5 text-slate-700 font-medium">{def.label}</td>
                  <td className="px-4 py-2.5 text-center">
                    {p > 0 ? (
                      <button
                        onClick={() => navigate("/paid-bible?tab=service-requests")}
                        className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                        data-testid={`sr-pending-bp-${def.targetStatus?.replace(/\s/g, "-").toLowerCase()}`}
                      >{p}</button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {a > 0 ? <span className="font-black text-emerald-600 tabular-nums">{a}</span> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r > 0 ? <span className="font-black text-red-500 tabular-nums">{r}</span> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span className="font-black text-[#1f36c7] tabular-nums">{p + a + r}</span>
                  </td>
                </tr>
              );
            })}
            {(() => {
              const p = BP_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "pending"), 0);
              const a = BP_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "approved"), 0);
              const r = BP_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "rejected"), 0);
              return (
                <tr className="bg-slate-50 border-y border-slate-200">
                  <td className="px-5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Basepack Subtotal</td>
                  <td className="px-4 py-2 text-center"><span className={`text-xs font-black tabular-nums ${p > 0 ? "text-amber-700" : "text-slate-300"}`}>{p > 0 ? p : "—"}</span></td>
                  <td className="px-4 py-2 text-center"><span className="text-xs font-black text-emerald-600 tabular-nums">{a}</span></td>
                  <td className="px-4 py-2 text-center"><span className={`text-xs font-black tabular-nums ${r > 0 ? "text-red-500" : "text-slate-300"}`}>{r > 0 ? r : "—"}</span></td>
                  <td className="px-5 py-2 text-center"><span className="text-xs font-black text-[#1f36c7] tabular-nums">{p + a + r}</span></td>
                </tr>
              );
            })()}

            {/* ── Amendment section ── */}
            <tr className="bg-[#1f36c7]/[0.04] border-y border-[#1f36c7]/10">
              <td colSpan={5} className="px-5 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1f36c7]">Amendment Requests</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1f36c7]/10 text-[9px] font-bold text-[#1f36c7] tabular-nums">6 types</span>
                </div>
              </td>
            </tr>
            {AMEND_SR_DEFS.map(def => {
              const p = srCountFiltered(def, "pending");
              const a = srCountFiltered(def, "approved");
              const r = srCountFiltered(def, "rejected");
              return (
                <tr key={def.label} className="hover:bg-slate-50/80">
                  <td className="px-5 py-2.5 text-slate-700 font-medium">{def.label}</td>
                  <td className="px-4 py-2.5 text-center">
                    {p > 0 ? (
                      <button
                        onClick={() => navigate("/paid-bible?tab=service-requests")}
                        className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                        data-testid={`sr-pending-${def.srType}`}
                      >{p}</button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {a > 0 ? <span className="font-black text-emerald-600 tabular-nums">{a}</span> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r > 0 ? <span className="font-black text-red-500 tabular-nums">{r}</span> : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span className="font-black text-[#1f36c7] tabular-nums">{p + a + r}</span>
                  </td>
                </tr>
              );
            })}
            {(() => {
              const p = AMEND_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "pending"), 0);
              const a = AMEND_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "approved"), 0);
              const r = AMEND_SR_DEFS.reduce((s, d) => s + srCountFiltered(d, "rejected"), 0);
              return (
                <tr className="bg-slate-50 border-y border-slate-200">
                  <td className="px-5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Amendment Subtotal</td>
                  <td className="px-4 py-2 text-center"><span className={`text-xs font-black tabular-nums ${p > 0 ? "text-amber-700" : "text-slate-300"}`}>{p > 0 ? p : "—"}</span></td>
                  <td className="px-4 py-2 text-center"><span className="text-xs font-black text-emerald-600 tabular-nums">{a}</span></td>
                  <td className="px-4 py-2 text-center"><span className={`text-xs font-black tabular-nums ${r > 0 ? "text-red-500" : "text-slate-300"}`}>{r > 0 ? r : "—"}</span></td>
                  <td className="px-5 py-2 text-center"><span className="text-xs font-black text-[#1f36c7] tabular-nums">{p + a + r}</span></td>
                </tr>
              );
            })()}
          </tbody>
          <tfoot>
            {(() => {
              const allDefs = [...BP_SR_DEFS, ...AMEND_SR_DEFS];
              const totP = allDefs.reduce((s, d) => s + srCountFiltered(d, "pending"), 0);
              const totA = allDefs.reduce((s, d) => s + srCountFiltered(d, "approved"), 0);
              const totR = allDefs.reduce((s, d) => s + srCountFiltered(d, "rejected"), 0);
              return (
                <tr className="border-t-2 border-[#1f36c7]/20 bg-[#1f36c7]/[0.03]">
                  <td className="px-5 py-2.5 text-[10px] font-black text-slate-600 uppercase tracking-wide">Grand Total</td>
                  <td className="px-4 py-2.5 text-center"><span className={`text-sm font-black tabular-nums ${totP > 0 ? "text-amber-700" : "text-slate-300"}`}>{totP > 0 ? totP : "—"}</span></td>
                  <td className="px-4 py-2.5 text-center"><span className="text-sm font-black text-emerald-600 tabular-nums">{totA}</span></td>
                  <td className="px-4 py-2.5 text-center"><span className={`text-sm font-black tabular-nums ${totR > 0 ? "text-red-500" : "text-slate-300"}`}>{totR > 0 ? totR : "—"}</span></td>
                  <td className="px-5 py-2.5 text-center"><span className="text-sm font-black text-[#1f36c7] tabular-nums">{totP + totA + totR}</span></td>
                </tr>
              );
            })()}
          </tfoot>
        </table>
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400">
            <span className="font-semibold text-amber-600">Pending</span> counts are clickable — navigates to Service Requests page filtered by type.
          </p>
        </div>
      </div>

      {/* ── Section 3: Pricing Issues ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="pricing-issues">
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <Banknote className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Pricing Issue CBUs</h2>
          {totalPriceIssueCbus > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 ml-1">
              {totalPriceIssueCbus} CBU{totalPriceIssueCbus !== 1 ? "s" : ""} at risk
            </span>
          )}
        </div>
        {priceIssueByScat.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-xs italic">No pricing issues detected.</div>
        ) : (
          <table className="w-full text-xs" data-testid="pricing-issue-table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-2 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Small C</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-orange-600">CBUs at Risk</th>
                <th className="text-center px-4 py-2 font-semibold text-[10px] uppercase tracking-wider text-rose-600">CBU × DC Combos</th>
                <th className="text-right px-5 py-2 font-semibold text-[10px] uppercase tracking-wider text-slate-300">MRP Exposure</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {priceIssueByScat.map(([cat, mats]) => {
                const dcCombos = mats.reduce((s, m) => s + (m.depotCount ?? m.depots.length), 0);
                return (
                  <React.Fragment key={cat}>
                    <tr
                      className="hover:bg-orange-50/30 cursor-pointer"
                      onClick={() => setExpandedPriceIssue(expandedPriceIssue === cat ? null : cat)}
                      data-testid={`pricing-issue-row-${cat}`}
                    >
                      <td className="px-5 py-2.5 font-medium text-slate-700">{cat}</td>
                      <td className="text-center px-4 py-2.5">
                        <span className="font-black text-orange-600 tabular-nums">{mats.length}</span>
                      </td>
                      <td className="text-center px-4 py-2.5">
                        {dcCombos > 0
                          ? <span className="font-black text-rose-600 tabular-nums">{dcCombos}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-right px-5 py-2.5 text-slate-300 text-xs">—</td>
                      <td className="pr-4 text-slate-400">
                        {expandedPriceIssue === cat ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                    </tr>
                    {expandedPriceIssue === cat && (
                      <tr>
                        <td colSpan={5} className="px-5 pb-3 pt-1 bg-orange-50/15">
                          <table className="w-full text-[11px] border border-slate-100 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                {["CBU Code", "Description", "Network Status", "DC Count"].map(h => (
                                  <th key={h} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {mats.map(m => {
                                const dcs = m.depotCount ?? m.depots.length;
                                return (
                                  <tr key={m.id} className="hover:bg-orange-50/30">
                                    <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{m.code}</td>
                                    <td className="px-3 py-1.5 text-slate-600 max-w-[12rem] truncate" title={m.description}>{m.description}</td>
                                    <td className="px-3 py-1.5">
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border bg-orange-50 text-orange-700 border-orange-200">{m.networkStatus}</span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center tabular-nums font-semibold text-rose-600">{dcs > 0 ? dcs : "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total</td>
                <td className="text-center px-4 py-2.5 font-black text-orange-600 tabular-nums">{totalPriceIssueCbus}</td>
                <td className="text-center px-4 py-2.5">
                  {totalPriceIssueDcCombos > 0
                    ? <span className="font-black text-rose-600 tabular-nums">{totalPriceIssueDcCombos}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="text-right px-5 py-2.5 text-slate-300 text-xs">—</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Section 4: SLOB Risk ── */}
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
                    onClick={() => {
                      if (items.length > MODAL_THRESHOLD) {
                        setBucketSearch('');
                        setBucketModal({ panel: 'relaunch', bucketIdx: i });
                      } else {
                        setExpandedRelaunch(expandedRelaunch === i ? null : i);
                        setExpandedRelaunchScat(null);
                      }
                    }}
                    data-testid={`relaunch-bucket-${bucket.key}`}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{items.length}</span>
                    <span className="text-[10px] text-slate-400">CBUs · {byScat.length} Small C</span>
                    {items.length > MODAL_THRESHOLD
                      ? <Search className="h-3.5 w-3.5 text-slate-400" />
                      : expandedRelaunch === i
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
                    onClick={() => {
                      if (items.length > MODAL_THRESHOLD) {
                        setBucketSearch('');
                        setBucketModal({ panel: 'dispatch', bucketIdx: i });
                      } else {
                        setExpandedDispatch(expandedDispatch === i ? null : i);
                        setExpandedDispatchScat(null);
                      }
                    }}
                    data-testid={`dispatch-bucket-${bucket.key}`}
                  >
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                      {bucket.label}
                    </div>
                    <span className="text-sm font-black text-slate-700 tabular-nums ml-auto">{items.length}</span>
                    <span className="text-[10px] text-slate-400">CBUs · {byScat.length} Small C</span>
                    {items.length > MODAL_THRESHOLD
                      ? <Search className="h-3.5 w-3.5 text-slate-400" />
                      : expandedDispatch === i
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

      {/* ── Bucket detail modal (triggered when > MODAL_THRESHOLD CBUs) ── */}
      {(() => {
        if (!bucketModal) return null;
        const bucket = TIMELINE_BUCKETS[bucketModal.bucketIdx];
        const pool = bucketModal.panel === 'relaunch' ? relaunchMats : dispatchMats;
        const allItems = bucketItems(pool, bucket.min, bucket.max);
        const q = bucketSearch.trim().toLowerCase();
        const filtered = q
          ? allItems.filter(m =>
              m.code.toLowerCase().includes(q) ||
              m.description.toLowerCase().includes(q) ||
              (m.salesCategory ?? '').toLowerCase().includes(q)
            )
          : allItems;
        const byScat = Array.from(
          filtered.reduce((map, m) => {
            const k = m.salesCategory || 'Other';
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(m);
            return map;
          }, new Map<string, typeof filtered>())
        ).sort(([a], [b]) => a.localeCompare(b));
        const panelLabel = bucketModal.panel === 'relaunch'
          ? 'Relaunch & Network Buckets'
          : 'Dispatch Start Tracking';
        const accentColor = bucketModal.panel === 'relaunch' ? 'text-violet-700' : 'text-blue-700';
        const rowHover = bucketModal.panel === 'relaunch' ? 'hover:bg-violet-50/30' : 'hover:bg-blue-50/30';
        return (
          <Dialog open onOpenChange={() => setBucketModal(null)}>
            <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bucket.bg} ${bucket.accent} ${bucket.ring}`}>
                    {bucket.label}
                  </div>
                  <DialogTitle className="text-sm font-bold text-slate-800 leading-none">
                    {panelLabel}
                  </DialogTitle>
                  <span className={`ml-auto text-sm font-black tabular-nums ${accentColor}`}>
                    {allItems.length} CBUs
                  </span>
                </div>
                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    autoFocus
                    placeholder="Search by CBU code, description or Small C…"
                    value={bucketSearch}
                    onChange={e => setBucketSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                    data-testid="bucket-modal-search"
                  />
                </div>
              </DialogHeader>

              <div className="overflow-y-auto max-h-[60vh]">
                {byScat.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-slate-400 text-center italic">No results match your search.</p>
                ) : (
                  byScat.map(([cat, mats]) => (
                    <div key={cat}>
                      {/* Small C group header */}
                      <div className="sticky top-0 px-6 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 z-10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{cat}</span>
                        <span className={`ml-auto text-[10px] font-black tabular-nums ${accentColor}`}>{mats.length}</span>
                        <span className="text-[10px] text-slate-400">CBUs</span>
                      </div>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                          {mats.map(m => (
                            <tr key={m.id} className={`${rowHover}`}>
                              <td className="px-6 py-2 font-mono font-semibold text-[#1f36c7] w-28 shrink-0">{m.code}</td>
                              <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={m.description}>{m.description}</td>
                              <td className="px-3 py-2 text-slate-500 font-semibold">{m.mrp ? `₹${m.mrp}` : '—'}</td>
                              <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">{m.networkChangeDate ?? '—'}</td>
                              <td className="px-6 py-2 text-right">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${bucketModal.panel === 'relaunch' ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                  {m.networkStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {filtered.length} of {allItems.length} CBUs shown
                </span>
                <button
                  onClick={() => { setBucketModal(null); navigate('/paid-bible?tab=overview'); }}
                  className="text-[11px] font-semibold text-[#1f36c7] hover:underline"
                  data-testid="bucket-modal-view-all"
                >
                  View in Paid Bible →
                </button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

    </div>
  );
}
