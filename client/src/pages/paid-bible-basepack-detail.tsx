import { useState, Fragment } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Package, User, Globe,
  Waypoints, Shuffle, ArrowRightLeft, GitCommit, CalendarCheck,
  CalendarX, Archive, Activity, AlertTriangle, ExternalLink,
  History, ChevronRight, ChevronDown, AlertCircle, BarChart2,
  TrendingUp, ShieldCheck, Zap, Tag,
} from "lucide-react";
import { CbuMstnSection, CbuPricingSection } from "@/components/basepack-cbu-sections";
import { SrStatusBadge } from "@/components/sr-detail-components";

// ─── Domain Interfaces ────────────────────────────────────────────────────────

interface CbuRecord {
  id: string;
  cbuCode?: string;
  materialDescription?: string;
  networkStatus?: string;
  geography?: string[];
  depots?: string[] | string;
  depot?: string[] | string;
  channel?: string[];
  mstnPercentage?: number;
  mstnByDepot?: Record<string, number>;
  slobRisk?: boolean;
  priceActive?: boolean;
  startDate?: string;
  endDate?: string;
  priceUpdatedAt?: string;
}

interface ApproverRecord {
  status: "waiting" | "pending" | "approved" | "rejected";
}

interface LinkedSr {
  id: string;
  srType: string;
  status: "pending" | "approved" | "rejected";
  targetStatus?: string;
  requestedValue?: string;
  cbuCode?: string;
  cbuId?: string;
  raisedBy: string;
  approvers?: ApproverRecord[];
}

interface BasepakProfile {
  basepackCode: string;
  basepackName: string;
  brand?: string;
  bg?: string;
  salesCategory?: string;
  format?: string;
  networkPlanner?: string;
  derivedStatus: string;
  effectiveStatus: string;
  hasOverride: boolean;
  mstnCoverage?: number;
  slobRisk: boolean;
  priceInactiveTrigger: boolean;
  activationDate?: string;
  inactiveDate?: string;
  delistDate?: string;
  cbuCount: number;
  cbus: CbuRecord[];
  linkedSrs: LinkedSr[];
}

interface StatusHistoryEntry {
  id: string;
  bpCode: string;
  fromStatus: string;
  toStatus: string;
  effectiveDate?: string;
  srId?: string;
  actionedBy?: string;
  notes?: string;
  createdAt?: string;
}

// ─── Status Badges ────────────────────────────────────────────────────────────

function BpStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Draft":               "bg-slate-100 text-slate-600 border-slate-200",
    "Active Pack":         "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Delisted Packs":      "bg-red-50 text-red-700 border-red-200",
    "Stock Base Delisted": "bg-orange-50 text-orange-700 border-orange-200",
    "Seasonal Pack":       "bg-violet-50 text-violet-700 border-violet-200",
    "Inactive Pack":       "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

function NwStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Draft":                       "bg-slate-100 text-slate-600",
    "Active":                      "bg-emerald-100 text-emerald-700",
    "Pricing Updated":             "bg-blue-100 text-blue-700",
    "Production Started":          "bg-amber-100 text-amber-700",
    "FTR Approved":                "bg-cyan-100 text-cyan-700",
    "Stock Movement Initiated":    "bg-violet-100 text-violet-700",
    "Network transition complete": "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function SrTypeBadge({ srType }: { srType: string }) {
  const map: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
    "basepack-status-change": { label: "Status Change",     cls: "bg-blue-50 text-blue-700 border-blue-200",       icon: <ArrowRightLeft className="h-3 w-3" /> },
    "geo-extension":          { label: "Geo Extension",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Globe className="h-3 w-3" /> },
    "channel-extension":      { label: "Channel Extension", cls: "bg-violet-50 text-violet-700 border-violet-200",  icon: <Waypoints className="h-3 w-3" /> },
    "sourcing-amendment":     { label: "Sourcing Amend.",   cls: "bg-amber-50 text-amber-700 border-amber-200",     icon: <Shuffle className="h-3 w-3" /> },
  };
  const s = map[srType] ?? { label: srType, cls: "bg-slate-50 text-slate-600 border-slate-200", icon: <GitCommit className="h-3 w-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Tab Nav ──────────────────────────────────────────────────────────────────

type TabId = "overview" | "cbus" | "service-requests" | "history";

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: "overview",          label: "Overview",         icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "cbus",              label: "CBUs",             icon: <Package className="h-3.5 w-3.5" /> },
  { id: "service-requests",  label: "Service Requests", icon: <GitCommit className="h-3.5 w-3.5" /> },
  { id: "history",           label: "Status History",   icon: <History className="h-3.5 w-3.5" /> },
];

// ─── KPI Strip ────────────────────────────────────────────────────────────────

interface KpiItem {
  icon: JSX.Element;
  label: string;
  value: string;
  sub: string;
  accent: string;    // border-left color class
  valueColor: string;
}

function KpiCard({ item }: { item: KpiItem }) {
  return (
    <div className={`flex items-center gap-3.5 bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm border-l-4 ${item.accent}`}>
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
        {item.icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-1">{item.label}</p>
        <p className={`text-xl font-bold leading-none ${item.valueColor}`}>{item.value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-none">{item.sub}</p>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile }: { profile: BasepakProfile }) {
  const mstnPct = profile.mstnCoverage ?? 0;

  const kpis: KpiItem[] = [
    {
      icon: <Package className="h-4 w-4" />,
      label: "CBU Count",
      value: String(profile.cbuCount),
      sub: "consumer units",
      accent: "border-l-[#1f36c7]",
      valueColor: "text-[#1f36c7]",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "MSTN Coverage",
      value: `${mstnPct}%`,
      sub: mstnPct >= 80 ? "Cleared" : "Not Cleared",
      accent: mstnPct >= 80 ? "border-l-emerald-500" : "border-l-amber-400",
      valueColor: mstnPct >= 80 ? "text-emerald-600" : "text-amber-600",
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "SLOB Risk",
      value: profile.slobRisk ? "Detected" : "None",
      sub: profile.slobRisk ? "requires action" : "no risk detected",
      accent: profile.slobRisk ? "border-l-red-500" : "border-l-emerald-500",
      valueColor: profile.slobRisk ? "text-red-600" : "text-emerald-600",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      label: "Price Trigger",
      value: profile.priceInactiveTrigger ? "Active" : "Clear",
      sub: profile.priceInactiveTrigger ? "price inactive" : "no trigger",
      accent: profile.priceInactiveTrigger ? "border-l-amber-400" : "border-l-emerald-500",
      valueColor: profile.priceInactiveTrigger ? "text-amber-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => <KpiCard key={k.label} item={k} />)}
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-slate-700">Basepack Metadata</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3">
          {[
            { label: "Brand",           value: profile.brand },
            { label: "Business Group",  value: profile.bg },
            { label: "Sales Category",  value: profile.salesCategory },
            { label: "Format",          value: profile.format },
            { label: "Network Planner", value: profile.networkPlanner },
            { label: "Derived Status",  value: profile.derivedStatus },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${i % 3 !== 2 ? "border-r border-slate-100" : ""} ${i < 3 ? "border-b border-slate-100" : ""}`}
            >
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800">{item.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Alerts */}
      {(profile.slobRisk || profile.priceInactiveTrigger) && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Triggers</p>
          {profile.priceInactiveTrigger && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Price Inactive Trigger</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  MSTN coverage ≥ 80% but price not activated for one or more CBUs. Action: <span className="font-semibold">Network Planner</span>.
                </p>
              </div>
            </div>
          )}
          {profile.slobRisk && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">SLOB Risk Detected</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Network Transition Complete with predecessor DOH exceeding successor DOH by more than 5 days. Action: <span className="font-semibold">Availability Planner</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CBU + MSTN by Depot */}
      <CbuMstnSection cbus={profile.cbus ?? []} />

      {/* Pricing Information */}
      <CbuPricingSection cbus={profile.cbus ?? []} />
    </div>
  );
}

// ─── CBUs Tab ─────────────────────────────────────────────────────────────────

function DepotMstnBreakdown({ mstnByDepot, depots }: { mstnByDepot: Record<string, number>; depots: string[] }) {
  const entries = depots
    .filter(d => mstnByDepot[d] != null)
    .map(d => ({ depot: d, pct: mstnByDepot[d] }));
  if (!entries.length) return null;
  return (
    <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Depot-Level MSTN %</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {entries.map(({ depot, pct }) => (
          <div key={depot} className="flex flex-col gap-1" data-testid={`depot-mstn-${depot}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-medium text-slate-700">{depot}</span>
              <span className={`text-xs font-bold ${pct >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : "bg-amber-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CBUs Tab ─────────────────────────────────────────────────────────────────

function CbusTab({ cbus }: { cbus: CbuRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!cbus.length) {
    return (
      <div className="py-16 text-center">
        <Package className="h-9 w-9 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No CBU records found for this basepack.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="text-xs py-3 w-8" />
            <TableHead className="text-xs py-3 font-semibold text-slate-600">CBU Code</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Description</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Network Status</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Clusters</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Depots</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600">Channels</TableHead>
            <TableHead className="text-xs py-3 font-semibold text-slate-600 text-right">MSTN %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cbus.map((cbu) => {
            const geos = cbu.geography ?? [];
            const depots: string[] = Array.isArray(cbu.depots ?? cbu.depot)
              ? (cbu.depots ?? cbu.depot) as string[]
              : [];
            const channels = cbu.channel ?? [];
            const mstnByDepot = cbu.mstnByDepot ?? {};
            const hasDepotBreakdown = Object.keys(mstnByDepot).length > 0;
            const isExpanded = expandedId === cbu.id;
            return (
              <Fragment key={cbu.id}>
                <TableRow
                  data-testid={`cbu-row-${cbu.id}`}
                  className={`text-xs border-b border-slate-100 ${hasDepotBreakdown ? "cursor-pointer hover:bg-slate-50/50" : "hover:bg-slate-50/30"} ${isExpanded ? "bg-slate-50/50" : ""}`}
                  onClick={() => hasDepotBreakdown && setExpandedId(isExpanded ? null : cbu.id)}
                >
                  <TableCell className="py-3 pl-4 pr-0 w-8">
                    {hasDepotBreakdown && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-[#1f36c7] py-3">{cbu.cbuCode || cbu.id?.slice(0, 8)}</TableCell>
                  <TableCell className="py-3 max-w-48 truncate text-slate-600" title={cbu.materialDescription}>
                    {cbu.materialDescription || "—"}
                  </TableCell>
                  <TableCell className="py-3"><NwStatusBadge status={cbu.networkStatus ?? "Draft"} /></TableCell>
                  <TableCell className="py-3 max-w-32 truncate text-muted-foreground" title={geos.join(", ")}>
                    {geos.length > 0 ? geos.slice(0, 2).join(", ") + (geos.length > 2 ? ` +${geos.length - 2}` : "") : "—"}
                  </TableCell>
                  <TableCell className="py-3 max-w-32 truncate text-muted-foreground" title={depots.join(", ")}>
                    {depots.length > 0 ? depots.slice(0, 2).join(", ") + (depots.length > 2 ? ` +${depots.length - 2}` : "") : "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {channels.length > 0
                        ? channels.slice(0, 3).map((ch: string) => (
                            <Badge key={ch} variant="outline" className="text-xs px-1.5 py-0 border-slate-200 text-slate-600">{ch}</Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>
                      }
                      {channels.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">+{channels.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right font-semibold">
                    {cbu.mstnPercentage != null ? (
                      <span className={cbu.mstnPercentage >= 80 ? "text-emerald-600" : "text-amber-600"}>
                        {cbu.mstnPercentage}%
                      </span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
                {isExpanded && hasDepotBreakdown && (
                  <TableRow data-testid={`cbu-depot-breakdown-${cbu.id}`}>
                    <TableCell colSpan={8} className="p-0">
                      <DepotMstnBreakdown mstnByDepot={mstnByDepot} depots={depots} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Service Requests Tab ─────────────────────────────────────────────────────

const SR_TYPE_ORDER = ["basepack-status-change", "geo-extension", "channel-extension", "sourcing-amendment"] as const;
const SR_TYPE_LABELS: Record<string, string> = {
  "basepack-status-change": "Status Changes",
  "geo-extension":          "Geo Extensions",
  "channel-extension":      "Channel Extensions",
  "sourcing-amendment":     "Sourcing Amendments",
};

function SrRows({ srs, navigate }: { srs: LinkedSr[]; navigate: (p: string) => void }) {
  return (
    <>
      {srs.map((sr) => {
        const approvers = sr.approvers ?? [];
        const doneCount = approvers.filter(a => a.status === "approved").length;
        const total = approvers.length;
        const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        return (
          <TableRow
            key={sr.id}
            data-testid={`sr-row-${sr.id}`}
            className="text-xs cursor-pointer hover:bg-slate-50/50 border-b border-slate-100"
            onClick={() => navigate(`/paid-bible/requests/${sr.id}`)}
          >
            <TableCell className="py-3 max-w-48">
              {sr.srType === "basepack-status-change" ? (
                <span className="text-slate-600">{sr.targetStatus ?? sr.requestedValue ?? "Status change"}</span>
              ) : (
                <span className="font-mono text-[#1f36c7] font-medium">{sr.cbuCode ?? sr.cbuId ?? "—"}</span>
              )}
            </TableCell>
            <TableCell className="py-3"><SrStatusBadge status={sr.status} /></TableCell>
            <TableCell className="py-3 text-muted-foreground">{sr.raisedBy}</TableCell>
            <TableCell className="py-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sr.status === "approved" ? "bg-emerald-500" : sr.status === "rejected" ? "bg-red-400" : "bg-[#1f36c7]"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">{doneCount}/{total}</span>
              </div>
            </TableCell>
            <TableCell className="py-3">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

function ServiceRequestsTab({ srs }: { srs: LinkedSr[] }) {
  const [, navigate] = useLocation();
  if (!srs.length) {
    return (
      <div className="py-16 text-center">
        <GitCommit className="h-9 w-9 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No service requests raised for this basepack yet.</p>
      </div>
    );
  }
  const grouped: Record<string, LinkedSr[]> = {};
  for (const sr of srs) {
    const t = sr.srType ?? "other";
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(sr);
  }
  const srTypeOrderSet: ReadonlySet<string> = new Set(SR_TYPE_ORDER);
  const groupOrder = [...SR_TYPE_ORDER.filter(t => grouped[t]), ...Object.keys(grouped).filter(t => !srTypeOrderSet.has(t))];

  return (
    <div className="space-y-6">
      {groupOrder.map(type => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-3">
            <SrTypeBadge srType={type} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{SR_TYPE_LABELS[type] ?? type}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{grouped[type].length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs py-3 font-semibold text-slate-600">Details</TableHead>
                  <TableHead className="text-xs py-3 font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs py-3 font-semibold text-slate-600">Raised By</TableHead>
                  <TableHead className="text-xs py-3 font-semibold text-slate-600">Progress</TableHead>
                  <TableHead className="text-xs py-3 w-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <SrRows srs={grouped[type]} navigate={navigate} />
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status History Tab ───────────────────────────────────────────────────────

function StatusHistoryTab({ history }: { history: StatusHistoryEntry[] }) {
  const [, navigate] = useLocation();
  if (!history.length) {
    return (
      <div className="py-16 text-center">
        <History className="h-9 w-9 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No status changes recorded yet</p>
        <p className="text-xs text-muted-foreground mt-1">Status history is written when a status-change service request is fully approved.</p>
      </div>
    );
  }
  return (
    <div className="relative pl-10">
      <div className="absolute left-[18px] top-5 bottom-0 w-px bg-slate-200" />
      {history.map((entry, idx) => (
        <div key={entry.id} className={`relative flex gap-4 ${idx < history.length - 1 ? "pb-6" : ""}`} data-testid={`history-entry-${entry.id}`}>
          <div className="absolute -left-10 flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-[#1f36c7]/30 flex items-center justify-center z-10 shadow-sm">
            <ArrowRightLeft className="h-3.5 w-3.5 text-[#1f36c7]" />
          </div>
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700">{entry.fromStatus}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">{entry.toStatus}</span>
              {entry.srId && (
                <button
                  className="text-xs text-[#1f36c7] hover:underline font-mono flex items-center gap-0.5 ml-1"
                  onClick={() => navigate(`/paid-bible/requests/${entry.srId}`)}
                  data-testid={`history-sr-link-${entry.id}`}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {entry.srId.slice(0, 8)}…
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              {entry.effectiveDate && (
                <span className="flex items-center gap-1">
                  <CalendarCheck className="h-3 w-3" />
                  {entry.effectiveDate.slice(0, 10)}
                </span>
              )}
              {entry.actionedBy && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.actionedBy}
                </span>
              )}
            </div>
            {entry.notes && <p className="mt-1.5 text-xs text-muted-foreground">{entry.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BasepakDetailPage() {
  const { bpCode } = useParams<{ bpCode: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { data: profile, isLoading: profileLoading } = useQuery<BasepakProfile>({
    queryKey: ["/api/paid-bible/basepacks", bpCode],
    queryFn: async () => {
      const r = await fetch(`/api/paid-bible/basepacks/${bpCode}`);
      if (!r.ok) throw new Error(`Profile fetch failed: ${r.status}`);
      return r.json() as Promise<BasepakProfile>;
    },
    enabled: !!bpCode,
    retry: false,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<StatusHistoryEntry[]>({
    queryKey: ["/api/paid-bible/basepacks", bpCode, "history"],
    queryFn: async () => {
      const r = await fetch(`/api/paid-bible/basepacks/${bpCode}/history`);
      if (!r.ok) return [] as StatusHistoryEntry[];
      return r.json() as Promise<StatusHistoryEntry[]>;
    },
    enabled: !!bpCode,
  });

  const fmtDate = (val?: string) => val ? val.split(",")[0] : "—";

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <UnileverHeader module="paid-bible" activeTab="overview" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
          <button onClick={() => navigate("/paid-bible")} className="hover:text-foreground transition-colors">
            Paid Bible
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-500 font-mono">{bpCode}</span>
        </div>

        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        ) : !profile ? (
          <div className="py-20 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Basepack not found</p>
            <p className="text-sm text-muted-foreground mt-1">No data found for code {bpCode}</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => navigate("/paid-bible")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Paid Bible
            </Button>
          </div>
        ) : (
          <>
            {/* ── Profile Hero Card ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 mb-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500"
                    onClick={() => navigate("/paid-bible")}
                    data-testid="button-back-to-paid-bible"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <h1 className="text-xl font-bold text-slate-900 leading-tight" data-testid="bp-detail-name">
                        {profile.basepackName}
                      </h1>
                      <BpStatusBadge status={profile.effectiveStatus} />
                      {profile.hasOverride && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                          Override Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono font-bold text-slate-600 text-xs" data-testid="bp-detail-code">{profile.basepackCode}</span>
                      {profile.brand && <><span className="text-slate-300">·</span><span>{profile.brand}</span></>}
                      {profile.bg && <><span className="text-slate-300">·</span><span>{profile.bg}</span></>}
                      {profile.networkPlanner && (
                        <><span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />{profile.networkPlanner}
                        </span></>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lifecycle dates — right side */}
                <div className="flex items-center gap-5 flex-shrink-0 text-xs">
                  <div className="flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">Activation</span>
                    <span className={`font-semibold ${profile.activationDate ? "text-emerald-700" : "text-muted-foreground"}`}>
                      {fmtDate(profile.activationDate)}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <CalendarX className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-muted-foreground">Inactive</span>
                    <span className={`font-semibold ${profile.inactiveDate ? "text-amber-700" : "text-muted-foreground"}`}>
                      {fmtDate(profile.inactiveDate)}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <Archive className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="text-muted-foreground">Delist</span>
                    <span className={`font-semibold ${profile.delistDate ? "text-red-700" : "text-muted-foreground"}`}>
                      {fmtDate(profile.delistDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tab Nav ── */}
            <div className="flex gap-0.5 border-b border-slate-200 mb-5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                    activeTab === tab.id
                      ? "border-[#1f36c7] text-[#1f36c7]"
                      : "border-transparent text-muted-foreground hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === "cbus" && profile.cbuCount > 0 && (
                    <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${activeTab === tab.id ? "bg-blue-100 text-[#1f36c7]" : "bg-slate-100 text-slate-500"}`}>
                      {profile.cbuCount}
                    </span>
                  )}
                  {tab.id === "service-requests" && (profile.linkedSrs?.length ?? 0) > 0 && (
                    <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${activeTab === tab.id ? "bg-blue-100 text-[#1f36c7]" : "bg-slate-100 text-slate-500"}`}>
                      {profile.linkedSrs.length}
                    </span>
                  )}
                  {tab.id === "history" && history.length > 0 && (
                    <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${activeTab === tab.id ? "bg-blue-100 text-[#1f36c7]" : "bg-slate-100 text-slate-500"}`}>
                      {history.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            {activeTab === "overview"         && <OverviewTab profile={profile} />}
            {activeTab === "cbus"             && <CbusTab cbus={profile.cbus ?? []} />}
            {activeTab === "service-requests" && <ServiceRequestsTab srs={profile.linkedSrs ?? []} />}
            {activeTab === "history"          && (
              historyLoading
                ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                : <StatusHistoryTab history={history} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
