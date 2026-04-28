import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Package, User, Globe,
  Waypoints, Shuffle, ArrowRightLeft, GitCommit, CalendarCheck,
  CalendarX, Archive, Activity, AlertTriangle, TrendingUp, ExternalLink,
  History, ChevronRight, AlertCircle,
} from "lucide-react";
import { SrStatusBadge } from "@/components/sr-detail-components";

// ─── Shared Badge Components ──────────────────────────────────────────────────

function BpStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Draft":               "bg-slate-50 text-slate-600 border-slate-300",
    "Active Pack":         "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Delisted Packs":      "bg-red-50 text-red-700 border-red-200",
    "Stock Base Delisted": "bg-orange-50 text-orange-700 border-orange-200",
    "Seasonal Pack":       "bg-violet-50 text-violet-700 border-violet-200",
    "Inactive Pack":       "bg-slate-100 text-slate-600 border-slate-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold border ${map[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
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
    "basepack-status-change": { label: "Status Change",     cls: "bg-blue-100 text-blue-700 border-blue-200",     icon: <ArrowRightLeft className="h-3 w-3" /> },
    "geo-extension":          { label: "Geo Extension",     cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Globe className="h-3 w-3" /> },
    "channel-extension":      { label: "Channel Extension", cls: "bg-violet-100 text-violet-700 border-violet-200", icon: <Waypoints className="h-3 w-3" /> },
    "sourcing-amendment":     { label: "Sourcing Amend.",   cls: "bg-amber-100 text-amber-700 border-amber-200",   icon: <Shuffle className="h-3 w-3" /> },
  };
  const s = map[srType] ?? { label: srType, cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <GitCommit className="h-3 w-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Tab Nav ─────────────────────────────────────────────────────────────────

type TabId = "overview" | "cbus" | "service-requests" | "history";

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: "overview",          label: "Overview",         icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "cbus",              label: "CBUs",             icon: <Package className="h-3.5 w-3.5" /> },
  { id: "service-requests",  label: "Service Requests", icon: <GitCommit className="h-3.5 w-3.5" /> },
  { id: "history",           label: "Status History",   icon: <History className="h-3.5 w-3.5" /> },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "blue" }: { label: string; value: string | number; sub?: string; color?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const colors = {
    blue:  "from-[#1f36c7] to-[#0d8ecf]",
    green: "from-[#059669] to-[#10b981]",
    amber: "from-[#f59e0b] to-[#f97316]",
    red:   "from-[#dc2626] to-[#ef4444]",
    slate: "from-slate-500 to-slate-400",
  };
  return (
    <div className={`relative rounded-xl p-4 overflow-hidden text-white bg-gradient-to-br ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Lifecycle Dates Strip ────────────────────────────────────────────────────

function LifecycleDatesStrip({ activationDate, inactiveDate, delistDate }: { activationDate?: string; inactiveDate?: string; delistDate?: string }) {
  const fmtDate = (val?: string) => val ? val.split(",")[0] : "—";
  return (
    <div className="flex items-center gap-5 px-3 py-2.5 rounded-md bg-muted/50 border border-border/60 w-fit text-xs">
      <div className="flex items-center gap-1.5">
        <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span className="text-muted-foreground">Activation:</span>
        <span className={activationDate ? "font-semibold text-emerald-700" : "text-muted-foreground"}>
          {fmtDate(activationDate)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <CalendarX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-muted-foreground">Inactive:</span>
        <span className={inactiveDate ? "font-semibold text-amber-700" : "text-muted-foreground"}>
          {fmtDate(inactiveDate)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Archive className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-muted-foreground">Delist:</span>
        <span className={delistDate ? "font-semibold text-red-700" : "text-muted-foreground"}>
          {fmtDate(delistDate)}
        </span>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ profile }: { profile: any }) {
  const mstnPct = profile.mstnCoverage ?? 0;
  const mstnStatus = mstnPct >= 80 ? "Cleared" : "Not Cleared";
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="CBU Count"     value={profile.cbuCount}    sub="consumer units" color="blue" />
        <StatCard label="MSTN Coverage" value={`${mstnPct}%`}       sub={mstnStatus}     color={mstnPct >= 80 ? "green" : "amber"} />
        {profile.slobRisk
          ? <StatCard label="SLOB Risk"   value="Yes" sub="requires action" color="red" />
          : <StatCard label="SLOB Risk"   value="None" sub="no risk detected" color="green" />
        }
        {profile.priceInactiveTrigger
          ? <StatCard label="Price Trigger" value="Active" sub="price inactive" color="amber" />
          : <StatCard label="Price Trigger" value="Clear"  sub="no trigger"     color="green" />
        }
      </div>

      {/* Metadata */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Basepack Metadata</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y">
          {[
            { label: "Brand",          value: profile.brand      },
            { label: "Business Group", value: profile.bg         },
            { label: "Sales Category", value: profile.salesCategory },
            { label: "Format",         value: profile.format     },
            { label: "Network Planner",value: profile.networkPlanner },
            { label: "Derived Status", value: profile.derivedStatus },
          ].map(item => (
            <div key={item.label} className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
              <p className="text-sm font-medium">{item.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Alerts */}
      {(profile.slobRisk || profile.priceInactiveTrigger) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Active Triggers</h3>
          {profile.priceInactiveTrigger && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Price Inactive Trigger</p>
                <p className="text-xs text-amber-700 mt-0.5">MSTN coverage ≥ 80% but price not activated for one or more CBUs. Action: Network Planner.</p>
              </div>
            </div>
          )}
          {profile.slobRisk && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">SLOB Risk</p>
                <p className="text-xs text-red-700 mt-0.5">Network Transition Complete with predecessor DOH exceeding successor DOH by more than 5 days. Action: Availability Planner.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CBUs Tab ─────────────────────────────────────────────────────────────────

function CbusTab({ cbus }: { cbus: any[] }) {
  if (!cbus.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No CBU records found for this basepack.</p>;
  }
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs py-2.5">CBU Code</TableHead>
            <TableHead className="text-xs py-2.5">Description</TableHead>
            <TableHead className="text-xs py-2.5">Network Status</TableHead>
            <TableHead className="text-xs py-2.5">Clusters</TableHead>
            <TableHead className="text-xs py-2.5">Channels</TableHead>
            <TableHead className="text-xs py-2.5 text-right">MSTN %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cbus.map((cbu: any) => {
            const geos = cbu.geography ?? [];
            const channels = cbu.channel ?? [];
            return (
              <TableRow key={cbu.id} data-testid={`cbu-row-${cbu.id}`} className="text-xs">
                <TableCell className="font-mono font-medium text-blue-600 py-2.5">
                  {cbu.cbuCode || cbu.id?.slice(0, 8)}
                </TableCell>
                <TableCell className="py-2.5 max-w-48 truncate text-muted-foreground" title={cbu.materialDescription}>
                  {cbu.materialDescription || "—"}
                </TableCell>
                <TableCell className="py-2.5">
                  <NwStatusBadge status={cbu.networkStatus ?? "Draft"} />
                </TableCell>
                <TableCell className="py-2.5 max-w-32 truncate text-muted-foreground" title={geos.join(", ")}>
                  {geos.length > 0 ? geos.slice(0, 2).join(", ") + (geos.length > 2 ? ` +${geos.length - 2}` : "") : "—"}
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {channels.length > 0
                      ? channels.slice(0, 3).map((ch: string) => (
                          <Badge key={ch} variant="outline" className="text-xs px-1.5 py-0">{ch}</Badge>
                        ))
                      : <span className="text-muted-foreground">—</span>
                    }
                    {channels.length > 3 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">+{channels.length - 3}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right font-medium">
                  {cbu.mstnPercentage != null ? (
                    <span className={cbu.mstnPercentage >= 80 ? "text-emerald-600" : "text-amber-600"}>
                      {cbu.mstnPercentage}%
                    </span>
                  ) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Service Requests Tab ─────────────────────────────────────────────────────

function ServiceRequestsTab({ srs }: { srs: any[] }) {
  const [, navigate] = useLocation();
  if (!srs.length) {
    return (
      <div className="py-12 text-center">
        <GitCommit className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No service requests raised for this basepack yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs py-2.5">SR Type</TableHead>
            <TableHead className="text-xs py-2.5">CBU / Details</TableHead>
            <TableHead className="text-xs py-2.5">Status</TableHead>
            <TableHead className="text-xs py-2.5">Raised By</TableHead>
            <TableHead className="text-xs py-2.5">Progress</TableHead>
            <TableHead className="text-xs py-2.5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {srs.map((sr: any) => {
            const approvers = sr.approvers ?? [];
            const doneCount = approvers.filter((a: any) => a.status === "approved").length;
            const total = approvers.length;
            const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            return (
              <TableRow
                key={sr.id}
                data-testid={`sr-row-${sr.id}`}
                className="text-xs cursor-pointer hover:bg-muted/30"
                onClick={() => navigate(`/paid-bible/requests/${sr.id}`)}
              >
                <TableCell className="py-2.5">
                  <SrTypeBadge srType={sr.srType} />
                </TableCell>
                <TableCell className="py-2.5 max-w-48">
                  {sr.srType === "basepack-status-change" ? (
                    <span className="text-muted-foreground">{sr.targetStatus ?? sr.requestedValue ?? "Status change"}</span>
                  ) : (
                    <span className="font-mono text-blue-600">{sr.cbuCode ?? sr.cbuId ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5">
                  <SrStatusBadge status={sr.status} />
                </TableCell>
                <TableCell className="py-2.5 text-muted-foreground">
                  {sr.raisedBy}
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sr.status === "approved" ? "bg-emerald-500" : sr.status === "rejected" ? "bg-red-400" : "bg-blue-500"}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground">{doneCount}/{total}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Status History Tab ───────────────────────────────────────────────────────

function StatusHistoryTab({ history }: { history: any[] }) {
  const [, navigate] = useLocation();
  if (!history.length) {
    return (
      <div className="py-12 text-center">
        <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No status changes recorded yet</p>
        <p className="text-xs text-muted-foreground mt-1">Status history is written when a status-change service request is fully approved.</p>
      </div>
    );
  }
  return (
    <div className="space-y-0 relative">
      <div className="absolute left-[22px] top-6 bottom-6 w-px bg-border" />
      {history.map((entry: any, i: number) => (
        <div key={entry.id} className="flex gap-4 pb-6" data-testid={`history-entry-${entry.id}`}>
          <div className="relative z-10 flex-shrink-0 w-11 h-11 rounded-full bg-[#1f36c7]/10 border-2 border-[#1f36c7]/30 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-[#1f36c7]" />
          </div>
          <div className="flex-1 min-w-0 pt-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{entry.fromStatus}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">{entry.toStatus}</span>
              {entry.srId && (
                <button
                  className="text-xs text-blue-600 hover:underline font-mono flex items-center gap-0.5"
                  onClick={() => navigate(`/paid-bible/requests/${entry.srId}`)}
                  data-testid={`history-sr-link-${entry.id}`}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {entry.srId.slice(0, 8)}…
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
            {entry.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
            )}
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

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/paid-bible/basepacks", bpCode, "profile"],
    queryFn: () => fetch(`/api/paid-bible/basepacks/${bpCode}/profile`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!bpCode,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/paid-bible/basepacks", bpCode, "history"],
    queryFn: () => fetch(`/api/paid-bible/basepacks/${bpCode}/history`).then(r => r.json()),
    enabled: !!bpCode,
  });

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="paid-bible" activeTab="overview" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={() => navigate("/paid-bible")} className="hover:text-foreground transition-colors">
            Paid Bible
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{bpCode}</span>
        </div>

        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !profile ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-medium">Basepack not found</p>
            <p className="text-sm text-muted-foreground mt-1">No data found for code {bpCode}</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => navigate("/paid-bible")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Paid Bible
            </Button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate("/paid-bible")}
                      data-testid="button-back-to-paid-bible"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <h1 className="text-xl font-bold text-foreground" data-testid="bp-detail-name">
                      {profile.basepackName}
                    </h1>
                    <BpStatusBadge status={profile.effectiveStatus} />
                    {profile.hasOverride && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                        Override
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground pl-8">
                    <span className="font-mono font-semibold text-slate-700" data-testid="bp-detail-code">{profile.basepackCode}</span>
                    {profile.brand && <span>{profile.brand}</span>}
                    {profile.bg && (
                      <>
                        <span className="text-border">·</span>
                        <span>{profile.bg}</span>
                      </>
                    )}
                    {profile.networkPlanner && (
                      <>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {profile.networkPlanner}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Lifecycle Dates */}
              <div className="mt-3 pl-8">
                <LifecycleDatesStrip
                  activationDate={profile.activationDate}
                  inactiveDate={profile.inactiveDate}
                  delistDate={profile.delistDate}
                />
              </div>
            </div>

            {/* ── Tab Nav ── */}
            <div className="flex gap-1 border-b mb-6">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.id
                      ? "border-[#1f36c7] text-[#1f36c7]"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === "cbus" && profile.cbuCount > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{profile.cbuCount}</span>
                  )}
                  {tab.id === "service-requests" && profile.linkedSrs?.length > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{profile.linkedSrs.length}</span>
                  )}
                  {tab.id === "history" && history.length > 0 && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{history.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            {activeTab === "overview" && <OverviewTab profile={profile} />}
            {activeTab === "cbus" && <CbusTab cbus={profile.cbus ?? []} />}
            {activeTab === "service-requests" && <ServiceRequestsTab srs={profile.linkedSrs ?? []} />}
            {activeTab === "history" && (
              historyLoading
                ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                : <StatusHistoryTab history={history} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
