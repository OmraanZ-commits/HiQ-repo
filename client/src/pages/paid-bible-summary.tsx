import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle, Globe, Waypoints, ArrowRightLeft, Shuffle,
  Package, BarChart3, Truck, ChevronRight, TrendingUp,
} from "lucide-react";
import { type NetworkEntry } from "@shared/schema";
import { useSrStore } from "@/lib/sr-store";
import { getNetworkChangeTypeName } from "@/lib/constants";
import { formatDateDisplay } from "@/lib/date-utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveBpStatus(statuses: (string | null)[]): string {
  const ss = statuses.map(s => s ?? "Draft");
  if (ss.every(s => s === "Draft"))                        return "Draft";
  if (ss.some(s => s === "Network transition complete"))   return "Active Pack";
  if (ss.some(s => s === "Stock Movement Initiated"))      return "Active Pack";
  if (ss.some(s => s === "FTR Approved"))                  return "Active Pack";
  if (ss.some(s => s === "Active"))                        return "Active Pack";
  if (ss.some(s => s === "Production Started"))            return "Active Pack";
  if (ss.some(s => s === "Pricing Updated"))               return "Stock Base Delisted";
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

const BP_STATUS_COLS = [
  { key: "Active Pack",         label: "Active" },
  { key: "Draft",               label: "Draft" },
  { key: "Stock Base Delisted", label: "SBD" },
  { key: "Delisted Packs",      label: "Delisted" },
  { key: "Inactive Pack",       label: "Inactive" },
  { key: "Seasonal Pack",       label: "Seasonal" },
] as const;

const SR_TYPE_DEFS = [
  { code: "geo-extension",          label: "Geo Extension" },
  { code: "channel-extension",      label: "Channel Extension" },
  { code: "basepack-status-change", label: "Basepack Status" },
  { code: "sourcing-amendment",     label: "Sourcing Matrix" },
] as const;

const RELAUNCH_CODES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG",
]);

const TIMELINE_BUCKETS = [
  { key: "t15", label: "Today +15 days", max: 15 },
  { key: "t30", label: "Today +30 days", max: 30 },
  { key: "t60", label: "Today +60 days", max: 60 },
] as const;

type TimelineKey = "t15" | "t30" | "t60";

// ── Shared cell renderers ────────────────────────────────────────────────────

function NumCell({ n, accent }: { n: number; accent?: boolean }) {
  if (n === 0) return <span className="text-muted-foreground/30 text-sm select-none">—</span>;
  return (
    <span className={`text-sm font-semibold tabular-nums ${accent ? "text-[#1f36c7]" : ""}`}>
      {n.toLocaleString()}
    </span>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="bg-gradient-to-br from-[#1f36c7]/10 to-[#0d8ecf]/10 rounded-md p-1.5">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PaidBibleSummaryTab() {
  const [, navigate]  = useLocation();
  const { requests: serviceRequests, bpStatusOverrides } = useSrStore();

  const { data: networkEntries = [], isLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
    staleTime: 0,
  });

  // SR aging dialog state
  const [agingDialog, setAgingDialog] = useState<{
    srType: string; label: string;
    items: { id: string; age: number; basepackId: string }[];
  } | null>(null);

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
        bg: entries.find(e => e.bg)?.bg || "-",
        effectiveStatus: effStatus,
        materials: entries,
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
      slobRiskValue: (e as any).slobRiskValue ?? null,
      mrp: (e as any).mrp ?? null,
      basepack: e.basepack || e.cbuCode || e.id,
      bg: e.bg || "-",
    }));

    return { basepacks: bps, allMaterials: mats };
  }, [networkEntries, bpStatusOverrides]);

  // ── Section 1: Basepack status by salesCategory ───────────────────────────

  const salesCategories = useMemo(() =>
    [...new Set(basepacks.map(b => b.salesCategory))].filter(Boolean).sort(),
  [basepacks]);

  function bpCountBySalesCategory(cat: string, status: string): number {
    return basepacks.filter(b => b.salesCategory === cat && b.effectiveStatus === status).length;
  }
  function bpTotalBySalesCategory(cat: string): number {
    return basepacks.filter(b => b.salesCategory === cat).length;
  }

  const bpTotals: Record<string, number> = {};
  BP_STATUS_COLS.forEach(col => {
    bpTotals[col.key] = basepacks.filter(b => b.effectiveStatus === col.key).length;
  });
  const bpGrandTotal = basepacks.length;

  // ── Section 2: Service Request Status Summary ─────────────────────────────

  function srCount(srType: string, status: "pending" | "approved" | "rejected"): number {
    return serviceRequests.filter(r => r.srType === srType && r.overallStatus === status).length;
  }
  function srTotal(srType: string): number {
    return serviceRequests.filter(r => r.srType === srType).length;
  }

  const srGrandTotals = {
    pending:  serviceRequests.filter(r => r.overallStatus === "pending").length,
    approved: serviceRequests.filter(r => r.overallStatus === "approved").length,
    rejected: serviceRequests.filter(r => r.overallStatus === "rejected").length,
    total:    serviceRequests.length,
  };

  function openAgingDialog(srType: string, label: string) {
    const pending = serviceRequests.filter(r => r.srType === srType && r.overallStatus === "pending");
    const items = pending.map(r => {
      const created = (r as any).createdAt ? new Date((r as any).createdAt).getTime() : Date.now() - 86400000 * 3;
      const age = Math.ceil((Date.now() - created) / (1000 * 60 * 60 * 24));
      return { id: r.id, age, basepackId: r.basepackId };
    });
    setAgingDialog({ srType, label, items });
  }

  // ── Section 3: SLOB Risk ──────────────────────────────────────────────────

  const slobMaterials = allMaterials.filter(m => m.slobRisk);

  const slobByCategory = useMemo(() => {
    const map = new Map<string, typeof slobMaterials>();
    slobMaterials.forEach(m => {
      if (!map.has(m.salesCategory)) map.set(m.salesCategory, []);
      map.get(m.salesCategory)!.push(m);
    });
    return map;
  }, [slobMaterials]);

  // ── Section 4: Relaunch by salesCategory × timeline ──────────────────────

  const relaunchMaterials = allMaterials.filter(m => RELAUNCH_CODES.has(m.typeOfNetworkCode));

  const relaunchByCategory = useMemo(() => {
    const map = new Map<string, typeof relaunchMaterials>();
    relaunchMaterials.forEach(m => {
      if (!map.has(m.salesCategory)) map.set(m.salesCategory, []);
      map.get(m.salesCategory)!.push(m);
    });
    return map;
  }, [relaunchMaterials]);

  function relaunchCount(items: typeof relaunchMaterials, max: number): number {
    return items.filter(m => inBucket(daysFromNow(m.networkChangeDate), max)).length;
  }
  function stockMovCount(items: typeof relaunchMaterials, max: number): number {
    return items.filter(m =>
      inBucket(daysFromNow(m.networkChangeDate), max) &&
      m.networkStatus === "Stock Movement Initiated"
    ).length;
  }

  const relaunchCategories = useMemo(() =>
    [...new Set(relaunchMaterials.map(m => m.salesCategory))].sort(),
  [relaunchMaterials]);

  // ── Section 5: Relaunch by type of network change × timeline ─────────────

  const relaunchByType = useMemo(() => {
    const map = new Map<string, typeof relaunchMaterials>();
    relaunchMaterials.forEach(m => {
      const key = m.typeOfNetworkCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [relaunchMaterials]);

  const relaunchTypes = useMemo(() =>
    [...new Set(relaunchMaterials.map(m => m.typeOfNetworkCode))].sort(),
  [relaunchMaterials]);

  // ── Section 6: Stock Movement Initiated CBUs ──────────────────────────────

  const stockMovCbus = allMaterials.filter(
    m => m.networkStatus === "Stock Movement Initiated" &&
         (RELAUNCH_CODES.has(m.typeOfNetworkCode) || m.typeOfNetworkCode === "NEW_LAUNCH"),
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading summary data…
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-testid="paid-bible-summary">

      {/* ── Section 1: Basepack Status by Small C ── */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={<BarChart3 className="h-4 w-4 text-[#1f36c7]" />}
            title="Basepack Status by Small C"
            sub="Count of basepacks grouped by sales category and status"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 min-w-[160px]">
                    Total Packs
                  </TableHead>
                  {BP_STATUS_COLS.map(col => (
                    <TableHead key={col.key} className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center whitespace-nowrap">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">
                    Total Pack
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesCategories.map(cat => (
                  <TableRow key={cat} className="hover:bg-muted/30" data-testid={`summary-row-cat-${cat}`}>
                    <TableCell className="py-2.5 px-4 text-sm font-medium text-slate-700">{cat}</TableCell>
                    {BP_STATUS_COLS.map(col => (
                      <TableCell key={col.key} className="text-center py-2.5 px-4">
                        <NumCell n={bpCountBySalesCategory(cat, col.key)} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={bpTotalBySalesCategory(cat)} accent />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-slate-50 border-t font-semibold" data-testid="summary-totals-row">
                  <TableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</TableCell>
                  {BP_STATUS_COLS.map(col => (
                    <TableCell key={col.key} className="text-center py-2.5 px-4">
                      <NumCell n={bpTotals[col.key] ?? 0} />
                    </TableCell>
                  ))}
                  <TableCell className="text-center py-2.5 px-4">
                    <NumCell n={bpGrandTotal} accent />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Service Request Status Summary ── */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={<ArrowRightLeft className="h-4 w-4 text-[#1f36c7]" />}
            title="Service Request Status Summary"
            sub="Double-click Pending to see aging. Click Total to open SR tab."
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b">
                  <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 min-w-[180px]">
                    Type of Request
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-amber-700 bg-amber-50/60 py-2.5 px-4 text-center">
                    Pending
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-emerald-700 bg-emerald-50/60 py-2.5 px-4 text-center">
                    Approved
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-red-700 bg-red-50/60 py-2.5 px-4 text-center">
                    Rejected
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SR_TYPE_DEFS.map(def => {
                  const pending  = srCount(def.code, "pending");
                  const approved = srCount(def.code, "approved");
                  const rejected = srCount(def.code, "rejected");
                  const total    = srTotal(def.code);
                  return (
                    <TableRow key={def.code} className="hover:bg-muted/30" data-testid={`sr-row-${def.code}`}>
                      <TableCell className="py-2.5 px-4 text-sm font-medium text-slate-700">
                        {def.label}
                      </TableCell>
                      <TableCell
                        className="text-center py-2.5 px-4 cursor-pointer select-none"
                        onDoubleClick={() => pending > 0 && openAgingDialog(def.code, def.label)}
                        title="Double-click to see aging"
                        data-testid={`sr-pending-${def.code}`}
                      >
                        {pending > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            {pending}
                          </span>
                        ) : <NumCell n={0} />}
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-4" data-testid={`sr-approved-${def.code}`}>
                        {approved > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {approved}
                          </span>
                        ) : <NumCell n={0} />}
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-4" data-testid={`sr-rejected-${def.code}`}>
                        {rejected > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                            {rejected}
                          </span>
                        ) : <NumCell n={0} />}
                      </TableCell>
                      <TableCell
                        className="text-center py-2.5 px-4 cursor-pointer hover:text-[#1f36c7] group"
                        onClick={() => navigate("/paid-bible?tab=service-requests")}
                        data-testid={`sr-total-${def.code}`}
                      >
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-[#1f36c7] inline-flex items-center gap-0.5">
                          {total > 0 ? total : "—"}
                          {total > 0 && <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Grand total row */}
                <TableRow className="bg-slate-50 border-t font-semibold" data-testid="sr-totals-row">
                  <TableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</TableCell>
                  <TableCell className="text-center py-2.5 px-4">
                    {srGrandTotals.pending > 0 ? (
                      <span className="text-sm font-bold text-amber-700">{srGrandTotals.pending}</span>
                    ) : <NumCell n={0} />}
                  </TableCell>
                  <TableCell className="text-center py-2.5 px-4">
                    {srGrandTotals.approved > 0 ? (
                      <span className="text-sm font-bold text-emerald-700">{srGrandTotals.approved}</span>
                    ) : <NumCell n={0} />}
                  </TableCell>
                  <TableCell className="text-center py-2.5 px-4">
                    {srGrandTotals.rejected > 0 ? (
                      <span className="text-sm font-bold text-red-700">{srGrandTotals.rejected}</span>
                    ) : <NumCell n={0} />}
                  </TableCell>
                  <TableCell className="text-center py-2.5 px-4">
                    <NumCell n={srGrandTotals.total} accent />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: SLOB Risk ── */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            title="SLOB Risk"
            sub="CBUs at risk of slow-moving or obsolete stock, by sales category"
          />
        </CardHeader>
        <CardContent className="p-0">
          {slobMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No SLOB risk items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b">
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 min-w-[160px]">Small C</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">Count of CBU × DC</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">
                      Quantum in Vol
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">
                      Quantum in Val
                      <span className="block text-[10px] text-red-500 font-normal">Value based on per unit MRP</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...slobByCategory.entries()].map(([cat, mats]) => {
                    const totalVal = mats.reduce((sum, m) => {
                      const mrp = typeof m.mrp === "number" ? m.mrp : 0;
                      return sum + mrp;
                    }, 0);
                    return (
                      <TableRow key={cat} className="hover:bg-muted/30" data-testid={`slob-row-${cat}`}>
                        <TableCell className="py-2.5 px-4 text-sm font-medium text-slate-700">{cat}</TableCell>
                        <TableCell className="text-center py-2.5 px-4">
                          <NumCell n={mats.length} />
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-4 text-muted-foreground text-sm">
                          —
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-4">
                          {totalVal > 0
                            ? <span className="text-sm font-semibold text-red-600">₹{totalVal.toLocaleString("en-IN")}</span>
                            : <span className="text-xs text-muted-foreground italic">Pending MRP data</span>
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-50 border-t">
                    <TableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</TableCell>
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={slobMaterials.length} accent />
                    </TableCell>
                    <TableCell className="text-center py-2.5 px-4 text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-center py-2.5 px-4 text-muted-foreground text-sm">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 4: Relaunch by Small C × Timeline ── */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={<TrendingUp className="h-4 w-4 text-[#1f36c7]" />}
            title="Relaunch Pack Summary — by Small C & Timeline"
            sub="Count of relaunch CBUs with network change date within each window"
          />
        </CardHeader>
        <CardContent className="p-0">
          {relaunchMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No relaunch packs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b">
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 min-w-[160px]">Small C</TableHead>
                    {TIMELINE_BUCKETS.map(b => (
                      <TableHead key={b.key} className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center whitespace-nowrap">
                        {b.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs font-semibold text-violet-700 bg-violet-50/60 py-2.5 px-4 text-center whitespace-nowrap">
                      Stock Mov. Initiated
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relaunchCategories.map(cat => {
                    const mats = relaunchByCategory.get(cat) ?? [];
                    const smiCount = mats.filter(m => m.networkStatus === "Stock Movement Initiated").length;
                    return (
                      <TableRow key={cat} className="hover:bg-muted/30" data-testid={`relaunch-cat-row-${cat}`}>
                        <TableCell className="py-2.5 px-4 text-sm font-medium text-slate-700">{cat}</TableCell>
                        {TIMELINE_BUCKETS.map(b => (
                          <TableCell key={b.key} className="text-center py-2.5 px-4">
                            <NumCell n={relaunchCount(mats, b.max)} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center py-2.5 px-4">
                          {smiCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                              <Truck className="h-3 w-3" />{smiCount}
                            </span>
                          ) : <NumCell n={0} />}
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-4">
                          <NumCell n={mats.length} accent />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-50 border-t">
                    <TableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</TableCell>
                    {TIMELINE_BUCKETS.map(b => (
                      <TableCell key={b.key} className="text-center py-2.5 px-4">
                        <NumCell n={relaunchCount(relaunchMaterials, b.max)} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={relaunchMaterials.filter(m => m.networkStatus === "Stock Movement Initiated").length} />
                    </TableCell>
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={relaunchMaterials.length} accent />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Relaunch by Type of Network Change × Timeline ── */}
      <Card>
        <CardHeader className="pb-3">
          <SectionTitle
            icon={<Package className="h-4 w-4 text-[#0d8ecf]" />}
            title="Relaunch Pack Summary — by Type of Network Change & Timeline"
            sub="Count of relaunch CBUs grouped by network change type and window"
          />
        </CardHeader>
        <CardContent className="p-0">
          {relaunchMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No relaunch packs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b">
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 min-w-[240px]">Type of Network Change</TableHead>
                    {TIMELINE_BUCKETS.map(b => (
                      <TableHead key={b.key} className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center whitespace-nowrap">
                        {b.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs font-semibold text-violet-700 bg-violet-50/60 py-2.5 px-4 text-center whitespace-nowrap">
                      Stock Mov. Initiated
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relaunchTypes.map(code => {
                    const mats  = relaunchByType.get(code) ?? [];
                    const label = getNetworkChangeTypeName(code);
                    const smiCount = mats.filter(m => m.networkStatus === "Stock Movement Initiated").length;
                    return (
                      <TableRow key={code} className="hover:bg-muted/30" data-testid={`relaunch-type-row-${code}`}>
                        <TableCell className="py-2.5 px-4">
                          <div>
                            <span className="text-sm font-medium text-slate-700">{label}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">{code}</span>
                          </div>
                        </TableCell>
                        {TIMELINE_BUCKETS.map(b => (
                          <TableCell key={b.key} className="text-center py-2.5 px-4">
                            <NumCell n={relaunchCount(mats, b.max)} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center py-2.5 px-4">
                          {smiCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                              <Truck className="h-3 w-3" />{smiCount}
                            </span>
                          ) : <NumCell n={0} />}
                        </TableCell>
                        <TableCell className="text-center py-2.5 px-4">
                          <NumCell n={mats.length} accent />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-50 border-t">
                    <TableCell className="py-2.5 px-4 text-xs font-bold text-slate-700 uppercase tracking-wide">Total</TableCell>
                    {TIMELINE_BUCKETS.map(b => (
                      <TableCell key={b.key} className="text-center py-2.5 px-4">
                        <NumCell n={relaunchCount(relaunchMaterials, b.max)} />
                      </TableCell>
                    ))}
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={relaunchMaterials.filter(m => m.networkStatus === "Stock Movement Initiated").length} />
                    </TableCell>
                    <TableCell className="text-center py-2.5 px-4">
                      <NumCell n={relaunchMaterials.length} accent />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 6: CBUs with Stock Movement Initiated ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SectionTitle
              icon={<Truck className="h-4 w-4 text-violet-600" />}
              title="CBUs with Stock Movement Initiated"
              sub="Relaunch and new-launch CBUs that have reached Stock Movement Initiated status"
            />
            <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">
              {stockMovCbus.length} CBUs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {stockMovCbus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No CBUs with Stock Movement Initiated status found in relaunch / new-launch packs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b">
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4">CBU Code</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4">Description</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4">Small C</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4">BG</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4">Type of Network</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">NW Change Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 py-2.5 px-4 text-center">NW Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovCbus.map(m => (
                    <TableRow
                      key={m.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/edit/${m.id}?source=paid-bible`)}
                      data-testid={`smi-cbu-row-${m.id}`}
                    >
                      <TableCell className="py-2.5 px-4">
                        <span className="text-sm font-mono font-semibold text-[#1f36c7]">{m.code}</span>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 max-w-64 truncate text-sm text-slate-700" title={m.description}>
                        {m.description}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-slate-600">{m.salesCategory}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-slate-600">{m.bg}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-slate-600">{m.typeOfNetworkLabel}</TableCell>
                      <TableCell className="text-center py-2.5 px-4 text-sm">
                        {m.networkChangeDate ? formatDateDisplay(m.networkChangeDate) : "—"}
                      </TableCell>
                      <TableCell className="text-center py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">
                          <Truck className="h-3 w-3" /> Stock Mov. Initiated
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Aging Dialog ── */}
      <Dialog open={agingDialog !== null} onOpenChange={() => setAgingDialog(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-sr-aging">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Pending Aging — {agingDialog?.label}
            </DialogTitle>
          </DialogHeader>
          {agingDialog && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {agingDialog.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No pending items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs py-2">SR ID</TableHead>
                      <TableHead className="text-xs py-2">Basepack</TableHead>
                      <TableHead className="text-xs py-2 text-center">Age (days)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingDialog.items.map(item => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          setAgingDialog(null);
                          navigate(`/paid-bible/requests/${item.id}`);
                        }}
                      >
                        <TableCell className="text-xs font-mono py-2">{item.id}</TableCell>
                        <TableCell className="text-xs py-2">{item.basepackId}</TableCell>
                        <TableCell className="text-xs text-center py-2">
                          <span className={`font-semibold ${item.age > 7 ? "text-red-600" : item.age > 3 ? "text-amber-600" : "text-slate-600"}`}>
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
