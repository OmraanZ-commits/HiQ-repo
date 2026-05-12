import { useState, Fragment, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PortalUser } from "@/lib/users-data";
import { useSrStore, addRequest, setBpStatusOverride, formatNow, SR_TYPE_META, CBU_SR_TYPES } from "@/lib/sr-store";
import { getNetworkChangeTypeName } from "@/lib/constants";
import { formatDateDisplay } from "@/lib/date-utils";
import type { ServiceRequest, MaterialCriteria, ApproverStep, SrType, BpDates } from "@/lib/sr-store";
import { SrStatusBadge } from "@/components/sr-detail-components";
import { type PendingSrRef } from "@/components/basepack-cbu-sections";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Ticket, AlertTriangle, CheckCircle2, XCircle, Clock,
  Search, Filter, ChevronRight, ChevronDown, FileText,
  Zap, MapPin, Package, User, X, BookOpen, RefreshCw, Pencil, Check, Eye,
  ShieldCheck, ShieldAlert, Send, ListChecks, BadgeCheck, BadgeX,
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity, AlertCircle, RotateCcw,
  History, GitCommit, ArrowRightLeft, Globe, Waypoints, Shuffle,
  CalendarCheck, CalendarX, Archive,
} from "lucide-react";
import { STATUS_FLOW, type NetworkEntry } from "@shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const BP_STATUS_OPTIONS = [
  "Draft",
  "Active Pack",
  "Delisted Packs",
  "Stock Base Delisted",
  "Seasonal Pack",
  "Inactive Pack",
];

const BP_STATUS_ALIASES: Record<string, string> = {
  "Stock Base Delisting":  "Stock Base Delisted",
  "Inactive/Delisted":     "Inactive Pack",
  "Active Pack (Channel)": "Active Pack",
  "Active Pack (Customer)":"Active Pack",
};

function normalizeBpStatus(s: string): string {
  return BP_STATUS_ALIASES[s] ?? s;
}

const MSTN_ACTIVE_STATUSES = new Set([
  "Active", "FTR Approved", "Stock Movement Initiated", "Network transition complete",
]);

const MSTN_THRESHOLD_STATUSES = new Set([
  "Stock Movement Initiated",
  "Network transition complete",
]);

const PB_OWNER_MAP: Record<string, string> = {
  "Ravi Kumar":    "Priya Sharma",
  "Sneha Patel":   "Ananya Singh",
  "Arun Mehta":    "Deepak Verma",
  "Ankit Sharma":  "Priya Sharma",
  "Priya Menon":   "Ananya Singh",
  "Vikram Singh":  "Deepak Verma",
};

const APPROVER_CHAIN = [
  { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review" },
  { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities" },
  { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities" },
  { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface PbMaterial {
  id: string;
  code: string;
  description: string;
  networkStatus: string;
  matStatus: "OK" | "Issue" | "In Progress";
  priceActive: boolean;
  mrp: string;
  ean: string;
  grammage: string;
  priceStart: string;
  priceEnd: string;
  copyCbu: string;
  predecessorDoh: number | null;
  successorDoh: number | null;
  dohSnapshotDate: string | null;
  slobRisk: boolean;
  typeOfNetwork: string;
  typeOfNetworkCode: string;
  mstnPct: number | null;
  networkChangeDate: string | null;
  mstnByDepot: Record<string, number>;
  mstnClear: "Yes" | "No" | null;
}

interface PbBasepack {
  id: string;
  basepakName: string;
  basepackCode: string;
  salesCategory: string;
  brand: string;
  bg: string;
  clusters: string;
  channels: string[];
  mstnStatus: "Yes" | "No";
  bpStatus: string;
  networkPlanner: string;
  paidBibleOwner: string;
  materials: PbMaterial[];
}

// ─── MOC Calculator ──────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getCurrentMoc(): { number: number; label: string } {
  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth() + 1;
  const year  = today.getFullYear();
  let endMonth: number;
  let endYear: number;
  if (day >= 21) {
    endMonth = (month % 12) + 1;
    endYear  = month === 12 ? year + 1 : year;
  } else {
    endMonth = month;
    endYear  = year;
  }
  const mocNumber = endMonth;
  const label     = `${MONTH_NAMES[endMonth - 1]} ${endYear}`;
  return { number: mocNumber, label };
}

// Compute MSTN Clear for a set of new-launch CBU entries.
// Rule: 70% of distinct DCs must have ≥ 80% MSTN.
// Uses the current mstnByDepot snapshot (best available value per depot across all CBUs).
function computeMstnClear(entries: Array<{ mstnByDepot?: Record<string, number> }>): "Yes" | "No" {
  const depotBest: Record<string, number> = {};
  for (const e of entries) {
    for (const [depot, pct] of Object.entries(e.mstnByDepot ?? {})) {
      if (depotBest[depot] == null || pct > depotBest[depot]) depotBest[depot] = pct;
    }
  }
  const total = Object.keys(depotBest).length;
  if (total === 0) return "No";
  const cleared = Object.values(depotBest).filter(p => p >= 80).length;
  return cleared / total >= 0.7 ? "Yes" : "No";
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function deriveBpStatus(statuses: (string | null)[]): string {
  const ss = statuses.map(s => s ?? "Draft");
  if (ss.every(s => s === "Draft"))                          return "Draft";
  if (ss.some(s => s === "Network transition complete"))     return "Active Pack";
  if (ss.some(s => s === "Stock Movement Initiated"))        return "Active Pack";
  if (ss.some(s => s === "FTR Approved"))                   return "Active Pack";
  if (ss.some(s => s === "Active"))                          return "Active Pack";
  if (ss.some(s => s === "Production Started"))              return "Active Pack";
  if (ss.some(s => s === "Pricing Updated"))                 return "Stock Base Delisted";
  return "Draft";
}

function deriveMatStatus(ns: string | null | undefined, endDate: string | null | undefined): "OK" | "In Progress" | "Issue" {
  if (!ns || !MSTN_THRESHOLD_STATUSES.has(ns)) return "In Progress";
  if (endDate && new Date(endDate) < new Date()) return "Issue";
  return "OK";
}


function makeTicketId(): string {
  return `SR-${Date.now().toString().slice(-6)}`;
}

// ─── Static Data (Network Updates) ──────────────────────────────────────────

const RELAUNCH_NETWORKS: Array<{
  lastUpdate: string; bg: string; brand: string; basepack: string;
  oldCbu: string; newCbu: string; description: string;
  grammage: { changed: boolean; from?: string; to?: string };
  mrp:      { changed: boolean; from?: string; to?: string };
  caseConfig: { changed: boolean; from?: string; to?: string };
  ean:      { changed: boolean; from?: string; to?: string };
  artwork:  { changed: boolean };
  networkStatus: string; priceValidTill: string;
}> = [
  {
    lastUpdate: "14-Oct", bg: "HC / HHC", brand: "Wheel Bar", basepack: "14151",
    oldCbu: "WHGI15B", newCbu: "CBU-50008902", description: "WHEEL GREEN BAR FW 180g+50g",
    grammage:   { changed: true,  from: "130g",   to: "180g" },
    mrp:        { changed: false },
    caseConfig: { changed: false },
    ean:        { changed: true,  from: "8901491100012", to: "8901491210421" },
    artwork:    { changed: false },
    networkStatus: "Stock Movement Initiated", priceValidTill: "9999 ∞",
  },
  {
    lastUpdate: "10-Oct", bg: "BPC / PC", brand: "Dove", basepack: "18920",
    oldCbu: "DVCS100A", newCbu: "CBU-50017002", description: "DOVE CREAM BAR 100g",
    grammage:   { changed: false },
    mrp:        { changed: true,  from: "₹35",  to: "₹39"  },
    caseConfig: { changed: false },
    ean:        { changed: true,  from: "8901491197001", to: "8901491198001" },
    artwork:    { changed: true },
    networkStatus: "FTR Approved", priceValidTill: "31-Dec-24",
  },
  {
    lastUpdate: "08-Oct", bg: "F&R / Foods", brand: "Kissan", basepack: "22041",
    oldCbu: "KSMX5A", newCbu: "CBU-50017001", description: "KISSAN MIXED FRUIT JAM 500g",
    grammage:   { changed: false },
    mrp:        { changed: false },
    caseConfig: { changed: true,  from: "12s",   to: "8s"   },
    ean:        { changed: true,  from: "8901058018001", to: "8901058018021" },
    artwork:    { changed: false },
    networkStatus: "Production Started", priceValidTill: "-",
  },
];

const NEW_LAUNCH_NETWORKS = [
  {
    lastUpdate: "14-Oct", bg: "HC / HHC", brand: "Wheel Bar", basepack: "14151",
    material: "CBU-50018001", description: "WHEEL GREEN BAR FW 180g+50g",
    grammage: "230g", mrp: "₹35", caseConfig: "24", ean: "8901491210421",
    artwork: true, promo: "No",
    networkStatus: "Stock Movement Initiated", priceValidTill: "9999 ∞",
  },
  {
    lastUpdate: "12-Oct", bg: "BPC / PC", brand: "TRESemmé", basepack: "30115",
    material: "CBU-50017003", description: "TRESEMME SHAMPOO SMOOTH & SHINE 400ml",
    grammage: "400ml", mrp: "₹275", caseConfig: "12", ean: "8901491350082",
    artwork: true, promo: "No",
    networkStatus: "FTR Approved", priceValidTill: "-",
  },
];


const TRIGGER_DEFS = [
  { id: "price-inactive", name: "Price Inactive",           rule: "MSTN coverage > 80% but price inactive for respective channel",                                   stakeholder: "Network Planner",       severity: "high"   },
  { id: "slob-risk",      name: "SLOB Risk",                rule: "CBU status is Network Transition Complete AND Predecessor DOH exceeds Successor DOH by more than 5 days", stakeholder: "Availability Planner", severity: "medium" },
  { id: "mstn-check",     name: "MSTN Clearance Pending — MOC", rule: "New launch packs due for MSTN clearance check (Days 8–11 of current MOC) where clearance is not yet achieved",              stakeholder: "Paid Bible Owner",      severity: "info"   },
] as const;


// ─── Materials Sub-Table ──────────────────────────────────────────────────────

function MaterialsSubTable({
  bpId,
  materials,
  navigate,
  pendingSrs = [],
}: {
  bpId: string;
  materials: PbMaterial[];
  navigate: (path: string) => void;
  pendingSrs?: PendingSrRef[];
}) {
  const [expandedMat, setExpandedMat] = useState<string | null>(null);

  return (
    <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold py-3 px-2 w-7" />
            <TableHead className="text-xs font-semibold py-3 px-4">CBU Code</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4">Description</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 min-w-[160px]">NW Status</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 min-w-[100px]">Mat. Status</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4">Type of Network</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 min-w-[90px]">MSTN %</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 whitespace-nowrap">NW Change Date</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 whitespace-nowrap">MSTN Clear</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 whitespace-nowrap">Predecessor CBU DOH</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 min-w-[90px]">Price Active</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4">Price End</TableHead>
            <TableHead className="text-xs font-semibold py-3 px-4 w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((m, idx) => {
            const depotEntries = Object.entries(m.mstnByDepot ?? {});
            const hasDepots = depotEntries.length > 0;
            const isExpanded = expandedMat === m.id;
            return (
              <Fragment key={m.id}>
                <TableRow
                  data-testid={`mat-row-${bpId}-${idx}`}
                  className={`hover:bg-muted/30 ${hasDepots ? "cursor-pointer" : ""} ${isExpanded ? "bg-muted/20" : ""}`}
                  onClick={() => hasDepots && setExpandedMat(isExpanded ? null : m.id)}
                >
                  <TableCell className="py-3 px-2 w-7">
                    {hasDepots
                      ? isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-[#1f36c7]" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      : null}
                  </TableCell>
                  <TableCell className="text-sm font-mono font-semibold text-blue-600 py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {m.code}
                      {pendingSrs.some(sr => sr.cbuCode === m.code && sr.overallStatus === "pending") && (
                        <span
                          title="Pending amendment(s)"
                          data-testid={`icon-pending-amendment-${m.id}`}
                          className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-100 border border-amber-300 shrink-0"
                        >
                          <Clock className="h-2.5 w-2.5 text-amber-600" />
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm py-3 px-4 max-w-56 truncate" title={m.description}>{m.description}</TableCell>
                  <TableCell className="py-3 px-4"><NwStatusBadge status={m.networkStatus} /></TableCell>
                  <TableCell className="py-3 px-4"><MatStatusBadge status={m.matStatus} /></TableCell>
                  <TableCell className="text-sm py-3 px-4 text-muted-foreground whitespace-nowrap">{m.typeOfNetwork}</TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap">
                    {m.mstnPct != null ? (
                      <span className={`text-sm font-semibold ${m.mstnPct >= 80 ? "text-emerald-600" : "text-red-500"}`}>
                        {m.mstnPct}%
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap" data-testid={`nw-change-date-${m.id}`}>
                    {m.networkChangeDate
                      ? <span className="text-sm font-medium">{formatDateDisplay(m.networkChangeDate)}</span>
                      : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4" data-testid={`mstn-clear-${m.id}`}>
                    {m.mstnClear != null
                      ? <MstnBadge status={m.mstnClear} />
                      : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 whitespace-nowrap text-center">
                    {m.predecessorDoh != null ? (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{m.predecessorDoh}</span>
                        {m.slobRisk && (
                          <span title="SLOB Risk" aria-label="SLOB Risk" data-testid={`icon-slob-risk-${m.id}`}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                          </span>
                        )}
                      </span>
                    ) : <span className="text-sm text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className={`text-sm font-semibold ${m.priceActive ? "text-emerald-600" : "text-red-500"}`}>
                      {m.priceActive ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell className={`text-sm font-medium py-3 px-4 whitespace-nowrap ${m.priceEnd === "-" ? "text-muted-foreground" : "text-slate-700"}`}>
                    {m.priceEnd}
                  </TableCell>
                  <TableCell className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-[#1f36c7] hover:text-[#1f36c7] hover:bg-[#1f36c7]/10 px-2"
                      onClick={() => navigate(`/edit/${m.id}?source=paid-bible&cbuStatus=${encodeURIComponent(m.matStatus || "")}`)}
                      data-testid={`btn-view-cbu-${m.id}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>

                {isExpanded && hasDepots && (
                  <TableRow data-testid={`mat-depot-breakdown-${m.id}`}>
                    <TableCell colSpan={13} className="p-0 bg-slate-50/80 border-t border-dashed">
                      <div className="px-6 py-3.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                          DC-wise MSTN levels
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {depotEntries
                              .sort((a, b) => b[1] - a[1])
                              .map(([depot, pct]) => (
                                <div
                                  key={depot}
                                  className={`flex flex-col gap-1 rounded-md px-2.5 py-2 border ${pct >= 80 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                                  data-testid={`mat-depot-${m.id}-${depot}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-xs font-medium text-slate-700 truncate">{depot}</span>
                                    <span className={`text-xs font-bold flex-shrink-0 ${pct >= 80 ? "text-emerald-700" : "text-red-600"}`}>{pct}%</span>
                                  </div>
                                  <div className="h-1 rounded-full bg-white/60 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : "bg-red-400"}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                        </div>
                      </div>
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

// ─── Badge Components ─────────────────────────────────────────────────────────

function MatStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: JSX.Element }> = {
    "OK":          { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    "Issue":       { cls: "bg-red-50 text-red-700 border-red-200",             icon: <XCircle className="h-3 w-3" /> },
    "In Progress": { cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="h-3 w-3" /> },
  };
  const s = map[status] ?? map["In Progress"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
}

function MstnBadge({ status }: { status: "Yes" | "No" }) {
  return status === "Yes" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-600 border-red-200">
      <XCircle className="h-3 w-3" /> No
    </span>
  );
}

function BpStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Draft":                "bg-slate-50 text-slate-600 border-slate-300",
    "Active Pack":          "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Delisted Packs":       "bg-red-50 text-red-700 border-red-200",
    "Stock Base Delisted":  "bg-orange-50 text-orange-700 border-orange-200",
    "Seasonal Pack":        "bg-violet-50 text-violet-700 border-violet-200",
    "Inactive Pack":        "bg-slate-100 text-slate-600 border-slate-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
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

function YNBadge({ val }: { val: string }) {
  return (
    <span className={`inline-block w-7 text-center text-xs font-semibold rounded px-1 py-0.5 ${val === "Y" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
      {val}
    </span>
  );
}

// ─── Activation Criteria Check Dialog ────────────────────────────────────────

interface ActivationCheckDialogProps {
  bp: PbBasepack | null;
  onClose: () => void;
  onCreateRequest: (request: ServiceRequest) => void;
  users: PortalUser[];
}

function ActivationCheckDialog({ bp, onClose, onCreateRequest, users }: ActivationCheckDialogProps) {
  const [expandedCbu, setExpandedCbu] = useState<string | null>(null);

  const { data: clearance, isLoading: clearanceLoading } = useQuery({
    queryKey: ["/api/mstn-doh/clearance-check", bp?.id],
    queryFn: async () => {
      if (!bp) return null;
      const res = await fetch("/api/mstn-doh/clearance-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materials: bp.materials.map(m => ({
            code: m.code,
            description: m.description,
            mstnPct: m.mstnPct,
            mstnByDepot: m.mstnByDepot,
            networkChangeDate: m.networkChangeDate,
            typeOfNetworkCode: m.typeOfNetworkCode,
            priceStart: m.priceStart,
          })),
        }),
      });
      return res.json();
    },
    enabled: !!bp,
  });

  if (!bp) return null;

  const mstnCoverage: number     = clearance?.mstnCoverage ?? 0;
  const criteriaMet: boolean     = clearance?.criteriaMet ?? false;
  const materials: MaterialCriteria[] = clearance?.materials ?? [];
  const checkMocLabel: string | null  = clearance?.checkMocLabel ?? null;
  const mstnPassed = mstnCoverage >= 100;

  const handleCreateRequest = () => {
    const userByRole = (role: string): string | undefined =>
      users.find(u => u.role === role && u.isActive)?.name;
    const chain = criteriaMet
      ? APPROVER_CHAIN.filter(a => a.role === "NCSM")
      : APPROVER_CHAIN;
    const approvers: ApproverStep[] = chain.map((a, i) => ({
      ...a,
      assignedTo: userByRole(a.role),
      status: i === 0 ? "pending" : "waiting",
    }));
    const sr: ServiceRequest = {
      id:                 makeTicketId(),
      srType:             "basepack-status-change",
      targetStatus:       "Active Pack",
      basepackId:         bp.id,
      basepackCode:       bp.basepackCode,
      basepackName:       bp.basepakName,
      brand:              bp.brand,
      bg:                 bp.bg,
      raisedBy:           bp.paidBibleOwner || "Brand Planner",
      raisedAt:           formatNow(),
      mstnCoverage,
      criteriaMetAtRaise: criteriaMet,
      materials,
      approvers,
      overallStatus:      "pending",
    };
    onCreateRequest(sr);
    onClose();
  };

  return (
    <Dialog open={!!bp} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {clearanceLoading
              ? <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
              : criteriaMet
                ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
                : <ShieldAlert className="h-5 w-5 text-amber-500" />
            }
            Activation Criteria Check
          </DialogTitle>
          <DialogDescription className="text-xs">
            Basepack Status Change · {bp.basepakName} · {bp.basepackCode}
          </DialogDescription>
        </DialogHeader>

        {/* Loading skeleton */}
        {clearanceLoading && (
          <div className="mt-2 space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        )}

        {/* Criteria Summary Card */}
        {!clearanceLoading && <>
        <div className="mt-2">
          <div className={`rounded-lg border-l-4 bg-slate-50 border border-slate-200 px-4 py-3.5 flex items-center gap-3.5 ${mstnPassed ? "border-l-emerald-500" : "border-l-red-500"}`}>
            {mstnPassed
              ? <BadgeCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              : <BadgeX className="h-6 w-6 text-red-500 flex-shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-snug">
                {mstnPassed ? "MSTN Check cleared for all CBUs" : "MSTN clearance criteria not met for all CBUs"}
              </p>
              {checkMocLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Initiated in <span className="font-medium text-slate-700">{checkMocLabel}</span>
                </p>
              )}
            </div>
            {checkMocLabel && (
              <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-600">
                {checkMocLabel}
              </span>
            )}
          </div>
        </div>

        {/* Verdict Banner */}
        <div className="rounded-lg p-3 flex items-center gap-2.5 bg-slate-50 border border-slate-200">
          {criteriaMet
            ? <><CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /><p className="text-sm font-medium text-slate-700">All criteria met — NCSM approval only required.</p></>
            : <><AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" /><p className="text-sm font-medium text-slate-700">Criteria not fully met — all 4 approvals required (Network Planner → Supply Planner → Distribution Planner → NCSM).</p></>
          }
        </div>

        {/* Per-Material Breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Material-level Criteria</p>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs py-2 w-6" />
                  <TableHead className="text-xs py-2">CBU Code</TableHead>
                  <TableHead className="text-xs py-2">Description</TableHead>
                  <TableHead className="text-xs py-2 text-center">NW Change Date</TableHead>
                  <TableHead className="text-xs py-2 text-center">MSTN Cleared</TableHead>
                  <TableHead className="text-xs py-2 text-center">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map(m => {
                  const depotEntries = Object.entries(m.mstnByDepot ?? {});
                  const hasDepots = depotEntries.length > 0;
                  const isExpanded = expandedCbu === m.code;
                  return (
                    <Fragment key={m.code}>
                      <TableRow
                        className={`text-xs cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => hasDepots && setExpandedCbu(isExpanded ? null : m.code)}
                        data-testid={`criteria-row-${m.code}`}
                      >
                        <TableCell className="py-2 pl-3">
                          {hasDepots
                            ? (isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-[#1f36c7]" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)
                            : <span className="inline-block w-3.5" />
                          }
                        </TableCell>
                        <TableCell className="font-mono font-medium text-blue-600 py-2">{m.code}</TableCell>
                        <TableCell className="py-2 max-w-40 truncate text-muted-foreground" title={m.description}>{m.description}</TableCell>
                        <TableCell className="py-2 text-center text-muted-foreground">
                          {m.networkChangeDate ? formatDateDisplay(m.networkChangeDate) : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          {m.mstnCleared
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="h-3 w-3" />Yes</span>
                            : <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><XCircle className="h-3 w-3" />No</span>
                          }
                        </TableCell>
                        <TableCell className="py-2 text-center text-muted-foreground">{m.lastUpdated}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow data-testid={`criteria-depot-${m.code}`}>
                          <TableCell colSpan={6} className="p-0 bg-slate-50/80 border-t border-dashed">
                            <div className="px-5 py-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                DC-wise MSTN levels
                              </p>
                              <div className="max-h-[180px] overflow-y-auto pr-1">
                                <div className="grid grid-cols-4 gap-1.5">
                                  {depotEntries
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([depot, pct]) => (
                                      <div
                                        key={depot}
                                        className={`flex items-center justify-between rounded px-2.5 py-1.5 text-xs border ${pct >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}
                                      >
                                        <span className="font-mono font-medium">{depot}</span>
                                        <span className="font-bold">{pct}%</span>
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        </>}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-activation">
            Cancel
          </Button>
          <Button
            className={`${criteriaMet ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"} text-white gap-1.5`}
            onClick={handleCreateRequest}
            data-testid="button-raise-service-request"
          >
            <Send className="h-4 w-4" /> Raise Service Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Basepack History Panel ───────────────────────────────────────────────────

function srTypeIcon(srType: string) {
  if (srType === "basepack-status-change") return <ArrowRightLeft className="h-3.5 w-3.5" />;
  if (srType === "geo-extension")          return <Globe className="h-3.5 w-3.5" />;
  if (srType === "channel-extension")      return <Waypoints className="h-3.5 w-3.5" />;
  if (srType === "sourcing-amendment")     return <Shuffle className="h-3.5 w-3.5" />;
  return <GitCommit className="h-3.5 w-3.5" />;
}

function srTypeColor(srType: string): string {
  if (srType === "basepack-status-change") return "bg-blue-100 text-blue-700 border-blue-200";
  if (srType === "geo-extension")          return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (srType === "channel-extension")      return "bg-violet-100 text-violet-700 border-violet-200";
  if (srType === "sourcing-amendment")     return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function srTypeDotColor(srType: string): string {
  if (srType === "basepack-status-change") return "bg-blue-500 border-blue-200";
  if (srType === "geo-extension")          return "bg-emerald-500 border-emerald-200";
  if (srType === "channel-extension")      return "bg-violet-500 border-violet-200";
  if (srType === "sourcing-amendment")     return "bg-amber-500 border-amber-200";
  return "bg-slate-400 border-slate-200";
}

function srSummary(sr: ServiceRequest): string {
  if (sr.srType === "basepack-status-change") {
    return sr.targetStatus ? `Status change requested → ${sr.targetStatus}` : "Basepack activation requested";
  }
  if (sr.srType === "geo-extension") {
    const geos  = sr.addedGeos?.length ?? 0;
    const depot = sr.addedDepots?.length ?? 0;
    const cbu   = sr.cbuCode ?? sr.cbuId ?? "CBU";
    return `${cbu} — ${geos > 0 ? `${geos} geograph${geos === 1 ? "y" : "ies"}` : ""}${geos > 0 && depot > 0 ? " + " : ""}${depot > 0 ? `${depot} depot${depot === 1 ? "" : "s"}` : ""} added`;
  }
  if (sr.srType === "channel-extension") {
    const n   = sr.addedChannels?.length ?? 0;
    const cbu = sr.cbuCode ?? sr.cbuId ?? "CBU";
    return `${cbu} — ${n} channel${n === 1 ? "" : "s"} added`;
  }
  if (sr.srType === "sourcing-amendment") {
    const cbu = sr.cbuCode ?? sr.cbuId ?? "CBU";
    return `${cbu} — sourcing mode changed to ${sr.sourcingMode ?? "updated"}`;
  }
  return "Change recorded";
}

function BasepackHistoryPanel({ bp, allRequests, navigate }: {
  bp: PbBasepack;
  allRequests: ServiceRequest[];
  navigate: (path: string) => void;
}) {
  const cbuIds   = new Set(bp.materials.map(m => m.id));
  const cbuCodes = new Set(bp.materials.map(m => m.code));

  const relatedSrs = allRequests.filter(r => {
    if (r.srType === "basepack-status-change" && r.basepackId === bp.id) return true;
    if (CBU_SR_TYPES.includes(r.srType) && (cbuIds.has(r.cbuId ?? "") || cbuCodes.has(r.cbuCode ?? ""))) return true;
    return false;
  });

  if (relatedSrs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <History className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground font-medium">No history yet</p>
        <p className="text-xs text-muted-foreground/70">Service requests raised for this basepack will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0" data-testid={`history-panel-${bp.id}`}>
      {relatedSrs.map((sr, idx) => {
        const isLast     = idx === relatedSrs.length - 1;
        const dotCls     = srTypeDotColor(sr.srType);
        const badgeCls   = srTypeColor(sr.srType);
        const statusCls  = sr.overallStatus === "approved"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : sr.overallStatus === "rejected"
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-amber-50 text-amber-700 border-amber-200";
        const statusIcon = sr.overallStatus === "approved"
          ? <CheckCircle2 className="h-3 w-3" />
          : sr.overallStatus === "rejected"
            ? <XCircle className="h-3 w-3" />
            : <Clock className="h-3 w-3" />;
        const doneSteps  = sr.approvers.filter(a => a.status === "approved").length;
        const totalSteps = sr.approvers.length;

        return (
          <div key={sr.id} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 mt-0.5 ${dotCls}`} />
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[20px]" />}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 pb-5 ${isLast ? "pb-2" : "pb-5"}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  {/* Type badge + summary */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeCls}`}>
                      {srTypeIcon(sr.srType)}
                      {SR_TYPE_META[sr.srType as keyof typeof SR_TYPE_META]?.label ?? sr.srType}
                    </span>
                    <span className="text-sm font-medium text-foreground">{srSummary(sr)}</span>
                  </div>
                  {/* Meta line */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>{sr.raisedAt}</span>
                    <span>·</span>
                    <span>By {sr.raisedBy}</span>
                    {sr.srType !== "basepack-status-change" && sr.cbuCode && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-blue-600">{sr.cbuCode}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{doneSteps}/{totalSteps} steps approved</span>
                  </div>
                </div>
                {/* Status + link */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${statusCls}`}>
                    {statusIcon} {sr.overallStatus}
                  </span>
                  <button
                    onClick={() => navigate(`/paid-bible/requests/${sr.id}`)}
                    className="text-[11px] text-[#1f36c7] hover:underline font-medium"
                    data-testid={`link-history-sr-${sr.id}`}
                  >
                    View SR →
                  </button>
                </div>
              </div>

              {/* Approval progress bar */}
              {totalSteps > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    {sr.approvers.map((a, i) => (
                      <div
                        key={i}
                        className={`h-1 w-8 rounded-full ${a.status === "approved" ? "bg-emerald-500" : a.status === "rejected" ? "bg-red-400" : a.status === "pending" ? "bg-amber-400" : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{doneSteps}/{totalSteps}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Part 1: Overview ────────────────────────────────────────────────────────

interface OverviewTabProps {
  localBpStatus: Record<string, string>;
  onRequestActivation: (bp: PbBasepack) => void;
  serviceRequests: ServiceRequest[];
  bpDates: Record<string, BpDates>;
}

function OverviewTab({ localBpStatus, onRequestActivation, serviceRequests, bpDates }: OverviewTabProps) {
  const [, navigate] = useLocation();

  const { data: networkEntries = [], isLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
    staleTime: 0,
  });

  const [searchBp, setSearchBp]             = useState("");
  const [bpStatusFilter, setBpStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter]   = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [materialSearch, setMaterialSearch] = useState("");
  const [mstnFilter, setMstnFilter]         = useState("all");
  const [bgFilter, setBgFilter]             = useState("all");
  const [showFilters, setShowFilters]       = useState(false);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [expandedTab, setExpandedTab]       = useState<"materials" | "history">("materials");
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [pendingStatus, setPendingStatus]   = useState<string>("");

  const pendingActivationBpIds = useMemo(
    () => new Set(
      serviceRequests
        .filter(r => r.overallStatus === "pending" && r.srType === "basepack-status-change")
        .map(r => r.basepackId)
    ),
    [serviceRequests],
  );

  const allBasepacks = useMemo<PbBasepack[]>(() => {
    const grouped = new Map<string, NetworkEntry[]>();
    networkEntries
      .filter(entry => entry.networkStatus && entry.networkStatus !== "Draft")
      .forEach(entry => {
        const key = entry.basepack || entry.cbuCode || entry.id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(entry);
      });

    return Array.from(grouped.entries()).map(([bpCode, entries]) => {
      const first    = entries[0];
      const statuses = entries.map(e => e.networkStatus);
      const eligibleEntries = entries.filter(e => MSTN_THRESHOLD_STATUSES.has(e.networkStatus ?? ""));
      const mstnYes  = eligibleEntries.length > 0 && eligibleEntries.every(e => {
        const pct = e.mstnPercentage != null
          ? e.mstnPercentage
          : ((e.cbuCode || "X").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 60) + 10;
        return pct >= 80;
      });
      const clusters = [...new Set(entries.flatMap(e => e.geography ?? []))];
      const channels = [...new Set(entries.flatMap(e => e.channel  ?? []))];
      const planner  = first.assignedPerson || "Unassigned";

      return {
        id:             bpCode,
        basepakName:    first.basepackDescription || first.materialDescription || bpCode,
        basepackCode:   bpCode,
        salesCategory:  first.salesCategory  || "-",
        brand:          first.brand          || "-",
        bg:             entries.find(e => e.bg)?.bg || "-",
        clusters:       clusters.length ? clusters.join(", ") : "All India",
        channels,
        mstnStatus:     mstnYes ? "Yes" : "No",
        bpStatus:       deriveBpStatus(statuses),
        networkPlanner: planner,
        paidBibleOwner: PB_OWNER_MAP[planner] || "PB SPOC",
        materials: entries.map(e => {
          const ns = e.networkStatus ?? "Draft";
          const atThreshold = MSTN_THRESHOLD_STATUSES.has(ns);

          const mstnPct: number | null = atThreshold
            ? (e.mstnPercentage != null
                ? e.mstnPercentage
                : ((e.cbuCode || "X").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 60) + 10)
            : null;

          const priceExpired = e.endDate ? new Date(e.endDate) < new Date() : false;
          const matStatus = deriveMatStatus(ns, e.endDate);

          return {
            id:            e.id,
            code:          e.cbuCode          || "-",
            description:   e.materialDescription || e.basepackDescription || "-",
            networkStatus: ns,
            matStatus,
            priceActive:   priceExpired ? false : MSTN_ACTIVE_STATUSES.has(ns),
            mrp:           "-",
            ean:           e.ean              || "-",
            grammage:      e.netWeight        ? `${e.netWeight}g` : "-",
            copyCbu:       e.copyCbu          || "-",
            predecessorDoh:   e.predecessorDoh   ?? null,
            successorDoh:     e.successorDoh     ?? null,
            dohSnapshotDate:  e.dohSnapshotDate  ?? null,
            slobRisk:         e.slobRisk         ?? false,
            typeOfNetwork:     getNetworkChangeTypeName(e.typeOfNetwork),
            typeOfNetworkCode: e.typeOfNetwork || "",
            priceStart:        MSTN_ACTIVE_STATUSES.has(ns) ? "01-Apr-24" : "-",
            priceEnd:          e.endDate ? formatDateDisplay(e.endDate) : "-",
            mstnPct,
            networkChangeDate: e.networkChangeDate ?? null,
            mstnByDepot:       (e as any).mstnByDepot ?? {},
            mstnClear: e.typeOfNetwork === "NEW_LAUNCH"
              ? computeMstnClear([{ mstnByDepot: (e as any).mstnByDepot ?? {} }])
              : null,
          };
        }),
      } as PbBasepack;
    });
  }, [networkEntries]);

  const locationOptions = useMemo(
    () => [...new Set(allBasepacks.flatMap(b => b.clusters.split(", ")))].filter(Boolean).sort(),
    [allBasepacks],
  );
  const channelOptions = useMemo(
    () => [...new Set(allBasepacks.flatMap(b => b.channels))].filter(Boolean).sort(),
    [allBasepacks],
  );
  const bgOptions = useMemo(
    () => [...new Set(allBasepacks.map(b => b.bg))].filter(s => s && s !== "-").sort(),
    [allBasepacks],
  );

  const filtered = useMemo(() => allBasepacks.filter(b => {
    const effStatus = normalizeBpStatus(localBpStatus[b.id] ?? b.bpStatus);
    const q  = searchBp.toLowerCase();
    return (
      (!q || b.basepakName.toLowerCase().includes(q) || b.basepackCode.includes(q) || b.brand.toLowerCase().includes(q)) &&
      (bpStatusFilter === "all" || effStatus === bpStatusFilter) &&
      (channelFilter  === "all" || b.channels.includes(channelFilter)) &&
      (locationFilter === "all" || b.clusters.includes(locationFilter)) &&
      (mstnFilter     === "all" || b.mstnStatus === mstnFilter) &&
      (bgFilter       === "all" || b.bg === bgFilter) &&
      (!materialSearch || b.materials.some(m =>
        m.code.toLowerCase().includes(materialSearch.toLowerCase()) ||
        m.description.toLowerCase().includes(materialSearch.toLowerCase())
      ))
    );
  }), [allBasepacks, localBpStatus, searchBp, bpStatusFilter, channelFilter, locationFilter, mstnFilter, bgFilter, materialSearch]);

  const ACTIVE_BP_STATUSES = new Set(["Active Pack", "Seasonal Pack"]);
  const total       = allBasepacks.length;
  const mstnYes     = allBasepacks.filter(b => b.mstnStatus === "Yes").length;
  const drafts      = allBasepacks.filter(b => (localBpStatus[b.id] ?? b.bpStatus) === "Draft").length;
  const activeCount = allBasepacks.filter(b => ACTIVE_BP_STATUSES.has(normalizeBpStatus(localBpStatus[b.id] ?? b.bpStatus))).length;

  const activeFilterCount = [
    bpStatusFilter !== "all", channelFilter !== "all",
    locationFilter !== "all", mstnFilter !== "all", bgFilter !== "all", materialSearch !== "",
  ].filter(Boolean).length;

  const triggerCbus = useMemo(() => {
    const flat = allBasepacks.flatMap(bp =>
      bp.materials.map(m => ({ ...m, basepakName: bp.basepakName }))
    );
    return {
      "price-inactive": flat.filter(m => m.mstnPct != null && m.mstnPct >= 80 && !m.priceActive),
      "slob-risk":      flat.filter(m => m.slobRisk),
      "mstn-check":     flat.filter(m => m.typeOfNetworkCode === "NEW_LAUNCH" && MSTN_ACTIVE_STATUSES.has(m.networkStatus) && m.mstnClear !== "Yes"),
    };
  }, [allBasepacks]);

  const [triggerDialog, setTriggerDialog] = useState<string | null>(null);
  const [expandedMstnCbu, setExpandedMstnCbu] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedId !== id) setExpandedTab("materials");
    setExpandedId(p => p === id ? null : id);
  };

  const startEdit = (bp: PbBasepack, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingStatus(normalizeBpStatus(localBpStatus[bp.id] ?? bp.bpStatus));
    setEditingId(bp.id);
  };

  const saveEdit = (bp: PbBasepack, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = normalizeBpStatus(localBpStatus[bp.id] ?? bp.bpStatus);
    if (pendingStatus === "Active Pack" && currentStatus !== "Active Pack") {
      setEditingId(null);
      onRequestActivation(bp);
    } else {
      setBpStatusOverride(bp.id, pendingStatus);
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-16" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-5 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div data-testid="stat-total-active" className="relative rounded-xl p-5 overflow-hidden text-white flex flex-col justify-between min-h-[100px]" style={{ background: "linear-gradient(135deg, #1f36c7 0%, #0d8ecf 100%)" }}>
          <p className="text-xs font-medium text-white/80">Total Active Basepacks</p>
          <p className="text-3xl font-bold mt-1">{activeCount}</p>
          <FileText className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 text-white/20" />
        </div>
        <div data-testid="stat-mstn-cleared" className="relative rounded-xl p-5 overflow-hidden text-white flex flex-col justify-between min-h-[100px]" style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)" }}>
          <p className="text-xs font-medium text-white/80">MSTN Cleared</p>
          <p className="text-3xl font-bold mt-1">{mstnYes}</p>
          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 text-white/20" />
        </div>
        <div data-testid="stat-draft" className="relative rounded-xl p-5 overflow-hidden text-white flex flex-col justify-between min-h-[100px]" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}>
          <p className="text-xs font-medium text-white/80">Draft</p>
          <p className="text-3xl font-bold mt-1">{drafts}</p>
          <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 text-white/20" />
        </div>
      </div>

      {/* Triggers */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-amber-500" /> Triggers for Improvement
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {TRIGGER_DEFS.map(t => {
            const cbus = triggerCbus[t.id];
            const count = cbus.length;
            return (
              <Card key={t.id} data-testid={`trigger-card-${t.id}`} onClick={() => count > 0 && setTriggerDialog(t.id)} className={`border-l-4 transition-colors ${t.severity === "high" ? "border-l-red-400" : t.severity === "info" ? "border-l-blue-400" : "border-l-amber-400"} ${count > 0 ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.severity === "high" ? "bg-red-100 text-red-700" : t.severity === "info" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{count} {count === 1 ? "item" : "items"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.rule}</p>
                  <p className="text-xs text-muted-foreground">Action: <span className="font-medium text-foreground">{t.stakeholder}</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trigger detail dialog — price-inactive & slob-risk */}
      {TRIGGER_DEFS.filter(t => t.id !== "mstn-check").map(t => {
        const cbus = triggerCbus[t.id];
        return (
          <Dialog key={t.id} open={triggerDialog === t.id} onOpenChange={o => !o && setTriggerDialog(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{t.name}</DialogTitle>
                <DialogDescription>{t.rule}</DialogDescription>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">CBU Code</TableHead>
                      <TableHead className="text-xs font-semibold">Description</TableHead>
                      <TableHead className="text-xs font-semibold">Mat. Status</TableHead>
                      {t.id === "price-inactive" && <>
                        <TableHead className="text-xs font-semibold">Price Active</TableHead>
                        <TableHead className="text-xs font-semibold">Price End</TableHead>
                      </>}
                      {t.id === "slob-risk" && <>
                        <TableHead className="text-xs font-semibold">Predecessor Code</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Predecessor DOH</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Successor DOH</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Last Updated</TableHead>
                      </>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cbus.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs font-mono font-semibold text-blue-600">{m.code}</TableCell>
                        <TableCell className="text-xs max-w-48 truncate" title={m.description}>{m.description}</TableCell>
                        <TableCell className="text-xs"><MatStatusBadge status={m.matStatus} /></TableCell>
                        {t.id === "price-inactive" && <>
                          <TableCell className="text-xs font-semibold text-red-500">No</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.priceEnd}</TableCell>
                        </>}
                        {t.id === "slob-risk" && <>
                          <TableCell className="text-xs font-mono text-muted-foreground">{m.copyCbu || "—"}</TableCell>
                          <TableCell className="text-xs text-center text-muted-foreground">{m.predecessorDoh ?? "—"}</TableCell>
                          <TableCell className="text-xs text-center text-muted-foreground">{m.successorDoh ?? "—"}</TableCell>
                          <TableCell className="text-xs text-center text-muted-foreground">
                            {new Date(m.dohSnapshotDate ?? Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                        </>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        );
      })}

      {/* MSTN Clearance Pending dialog — with per-CBU DC-level bar chart expand */}
      {(() => {
        const mstnDef = TRIGGER_DEFS.find(t => t.id === "mstn-check")!;
        const cbus = triggerCbus["mstn-check"];
        return (
          <Dialog open={triggerDialog === "mstn-check"} onOpenChange={o => { if (!o) { setTriggerDialog(null); setExpandedMstnCbu(null); } }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{mstnDef.name}</DialogTitle>
                <DialogDescription>{mstnDef.rule}</DialogDescription>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-7" />
                      <TableHead className="text-xs font-semibold">CBU Code</TableHead>
                      <TableHead className="text-xs font-semibold">Description</TableHead>
                      <TableHead className="text-xs font-semibold">Mat. Status</TableHead>
                      <TableHead className="text-xs font-semibold">NW Status</TableHead>
                      <TableHead className="text-xs font-semibold text-center">MSTN %</TableHead>
                      <TableHead className="text-xs font-semibold">NW Change Date</TableHead>
                      <TableHead className="text-xs font-semibold text-center">MSTN Clear</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cbus.map(m => {
                      const depotEntries = Object.entries(m.mstnByDepot ?? {})
                        .sort(([, a], [, b]) => a - b);
                      const hasDepots = depotEntries.length > 0;
                      const isExpanded = expandedMstnCbu === m.id;
                      return (
                        <Fragment key={m.id}>
                          <TableRow
                            className={`${hasDepots ? "cursor-pointer hover:bg-muted/30" : ""} ${isExpanded ? "bg-muted/20" : ""}`}
                            onClick={() => hasDepots && setExpandedMstnCbu(isExpanded ? null : m.id)}
                          >
                            <TableCell className="w-7 py-3 px-2">
                              {hasDepots
                                ? isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                : null}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-semibold text-blue-600">{m.code}</TableCell>
                            <TableCell className="text-xs max-w-48 truncate" title={m.description}>{m.description}</TableCell>
                            <TableCell className="text-xs"><MatStatusBadge status={m.matStatus} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.networkStatus}</TableCell>
                            <TableCell className="text-xs text-center">
                              {m.mstnPct != null
                                ? <span className={`font-semibold ${m.mstnPct >= 80 ? "text-emerald-600" : "text-red-500"}`}>{m.mstnPct}%</span>
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.networkChangeDate ? formatDateDisplay(m.networkChangeDate) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              {m.mstnClear ? <MstnBadge status={m.mstnClear} /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                          {isExpanded && hasDepots && (
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                              <TableCell colSpan={8} className="px-6 py-4">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                  DC-wise MSTN — {m.code}
                                </p>
                                <div className="space-y-2">
                                  {depotEntries.map(([depot, pct]) => (
                                    <div key={depot} className="flex items-center gap-3">
                                      <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0 text-right">{depot}</span>
                                      <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500"}`}
                                          style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                      </div>
                                      <span className={`text-[11px] font-semibold w-10 shrink-0 ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                        {pct}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-4 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />≥ 80% cleared</span>
                                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />50–79% partial</span>
                                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />{"< 50% critical"}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Search + Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search basepack, brand, planner…" value={searchBp} onChange={e => setSearchBp(e.target.value)} className="pl-9" data-testid="input-bp-search" />
              {searchBp && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchBp("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>

            <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(v => !v)} className="gap-1.5" data-testid="button-toggle-filters">
              <Filter className="h-4 w-4" /> Filters
              {activeFilterCount > 0 && <span className="ml-1 bg-[#1f36c7] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-export"><Download className="h-3.5 w-3.5" /> Export</Button>
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-raise-ticket"><Ticket className="h-3.5 w-3.5" /> Raise Ticket</Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-end gap-3 mt-4 pt-4 border-t flex-wrap" data-testid="filters-panel">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Basepack Status</label>
                <Select value={bpStatusFilter} onValueChange={setBpStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-bp-status"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {BP_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Channel</label>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-36" data-testid="select-channel"><SelectValue placeholder="All Channels" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {channelOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Material</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search material…" value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} className="pl-8 w-40 h-9" data-testid="input-material-search" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Location (Cluster)</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-48" data-testid="select-location"><SelectValue placeholder="All Locations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locationOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">MSTN Status</label>
                <Select value={mstnFilter} onValueChange={setMstnFilter}>
                  <SelectTrigger className="w-32" data-testid="select-mstn"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Business Group</label>
                <Select value={bgFilter} onValueChange={setBgFilter}>
                  <SelectTrigger className="w-40" data-testid="select-bg"><SelectValue placeholder="All BGs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All BGs</SelectItem>
                    {bgOptions.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setBpStatusFilter("all"); setChannelFilter("all"); setLocationFilter("all"); setMstnFilter("all"); setBgFilter("all"); setMaterialSearch(""); }} data-testid="button-clear-filters">
                  Clear all
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft → Active Pack hint */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
        <Activity className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
        To change a basepack from <span className="font-semibold text-slate-600 mx-1">Draft → Active Pack</span>, click the pencil icon next to the status. A criteria check will run automatically.
      </div>

      {/* Basepack table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-8 sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]" />
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Basepack</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Code</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Location / Cluster</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Channels</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">MSTN</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Basepack Status</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">BG</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 w-20 shadow-[0_1px_0_0_hsl(var(--border))]">CBUs</TableHead>
                  <TableHead className="w-10 sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-16">No basepacks found — try adjusting your filters</TableCell>
                  </TableRow>
                ) : filtered.map(bp => {
                  const effStatus = normalizeBpStatus(localBpStatus[bp.id] ?? bp.bpStatus);
                  const isExpanded = expandedId === bp.id;
                  const isEditing  = editingId  === bp.id;

                  return (
                    <Fragment key={bp.id}>
                      <TableRow
                        data-testid={`bp-row-${bp.id}`}
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-[#1f36c7]/5 border-l-2 border-l-[#1f36c7]" : "hover:bg-muted/40"}`}
                        onClick={() => !isEditing && toggleExpand(bp.id)}
                      >
                        <TableCell className="py-3 pl-4" onClick={e => { e.stopPropagation(); !isEditing && toggleExpand(bp.id); }}>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-[#1f36c7]" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>

                        <TableCell className="py-3">
                          <div>
                            <p className="text-sm font-medium">{bp.basepakName}</p>
                            <p className="text-xs text-muted-foreground">{bp.salesCategory} · {bp.brand}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm font-mono font-medium py-3">{bp.basepackCode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3 max-w-40 truncate" title={bp.clusters}>{bp.clusters}</TableCell>

                        <TableCell className="py-3">
                          <ChannelsCell channels={bp.channels} />
                        </TableCell>

                        <TableCell className="py-3"><MstnBadge status={bp.mstnStatus} /></TableCell>

                        <TableCell className="py-3" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Select value={pendingStatus} onValueChange={setPendingStatus}>
                                <SelectTrigger className="h-7 text-xs w-44" data-testid={`select-bp-status-${bp.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BP_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={e => saveEdit(bp, e)} data-testid={`button-save-status-${bp.id}`}>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit} data-testid={`button-cancel-status-${bp.id}`}>
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <BpStatusBadge status={effStatus} />
                              {pendingActivationBpIds.has(bp.id) && (
                                <span title="Status change request pending approval" data-testid={`badge-activation-in-progress-${bp.id}`}>
                                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              )}
                              <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => startEdit(bp, e)} data-testid={`button-edit-status-${bp.id}`} title="Edit basepack status">
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          <span className="text-xs font-medium text-muted-foreground">{bp.bg}</span>
                        </TableCell>

                        <TableCell className="py-3">
                          <span className="text-xs text-muted-foreground">{bp.materials.length} CBU{bp.materials.length !== 1 ? "s" : ""}</span>
                        </TableCell>

                        <TableCell className="py-3 pr-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-[#1f36c7] hover:bg-[#1f36c7]/10"
                            onClick={e => { e.stopPropagation(); navigate(`/paid-bible/basepacks/${bp.id}`); }}
                            data-testid={`button-view-bp-${bp.id}`}
                            title="View basepack detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${bp.id}-exp`} data-testid={`bp-expanded-${bp.id}`}>
                          <TableCell colSpan={10} className="p-0 bg-muted/20">
                            <div className="px-10 py-5 border-l-4 border-l-[#1f36c7]/40 overflow-x-auto">
                              {/* Key Dates strip */}
                              {(() => {
                                const dates = bpDates[bp.id];
                                const fmtDate = (val?: string) => val ? val.split(",")[0] : "—";
                                const effStatus = normalizeBpStatus(localBpStatus[bp.id] ?? bp.bpStatus);
                                const isInactive = effStatus === "Inactive Pack";
                                const isDelisted = effStatus === "Delisted Packs" || effStatus === "Stock Base Delisted";
                                return (
                                  <div className="flex items-center gap-5 mb-4 px-3 py-2 rounded-md bg-muted/40 border border-border/50 w-fit text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span className="text-muted-foreground">Activation Date:</span>
                                      <span data-testid={`dates-activation-${bp.id}`} className={dates?.activationDate ? "font-semibold text-emerald-700" : "text-muted-foreground"}>
                                        {fmtDate(dates?.activationDate)}
                                      </span>
                                    </div>
                                    {isInactive && (
                                      <>
                                        <div className="w-px h-3.5 bg-border" />
                                        <div className="flex items-center gap-1.5">
                                          <CalendarX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                          <span className="text-muted-foreground">Inactive Date:</span>
                                          <span data-testid={`dates-inactive-${bp.id}`} className={dates?.inactiveDate ? "font-semibold text-amber-700" : "text-muted-foreground"}>
                                            {fmtDate(dates?.inactiveDate)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    {isDelisted && (
                                      <>
                                        <div className="w-px h-3.5 bg-border" />
                                        <div className="flex items-center gap-1.5">
                                          <Archive className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                          <span className="text-muted-foreground">Delist Date:</span>
                                          <span data-testid={`dates-delist-${bp.id}`} className={dates?.delistDate ? "font-semibold text-rose-700" : "text-muted-foreground"}>
                                            {fmtDate(dates?.delistDate)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Tab bar */}
                              <div className="flex items-center gap-1 mb-4" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setExpandedTab("materials")}
                                  data-testid={`tab-materials-${bp.id}`}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${expandedTab === "materials" ? "bg-[#1f36c7]/10 text-[#1f36c7]" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                                >
                                  <BookOpen className="h-3.5 w-3.5" /> Materials
                                </button>
                                <button
                                  onClick={() => setExpandedTab("history")}
                                  data-testid={`tab-history-${bp.id}`}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${expandedTab === "history" ? "bg-[#1f36c7]/10 text-[#1f36c7]" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                                >
                                  <History className="h-3.5 w-3.5" /> History
                                </button>
                                <span className="ml-2 text-xs text-muted-foreground">— {bp.basepakName} · {bp.basepackCode}</span>
                              </div>

                              {expandedTab === "history" && (
                                <BasepackHistoryPanel bp={bp} allRequests={serviceRequests} navigate={navigate} />
                              )}

                              {expandedTab === "materials" && (
                                <MaterialsSubTable
                                  bpId={bp.id}
                                  materials={bp.materials}
                                  navigate={navigate}
                                  pendingSrs={serviceRequests.filter(r =>
                                    (CBU_SR_TYPES as readonly string[]).includes(r.srType) &&
                                    r.overallStatus === "pending" &&
                                    r.basepackCode === bp.basepackCode
                                  )}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
              Showing {filtered.length} of {total} basepacks
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Part 2: Network Updates ─────────────────────────────────────────────────

function YesNoBadge({ val }: { val: string }) {
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${val === "Yes" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
      {val}
    </span>
  );
}

const SMI_INDEX = STATUS_FLOW.indexOf("Stock Movement Initiated");

function NetworkStatusBadge({ status }: { status: string }) {
  const idx = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number]);
  const cls = idx < 0
    ? "bg-slate-100 text-slate-500 border-slate-200"
    : idx >= SMI_INDEX
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

interface TooltipCoords { x: number; y: number }

function ClusterBadges({ clusters }: { clusters: string[] }) {
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const first = clusters[0];
  const rest  = clusters.length - 1;

  return (
    <>
      <div
        className="inline-flex items-center gap-1 cursor-default select-none"
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setCoords({ x: r.left, y: r.bottom + 6 });
        }}
        onMouseLeave={() => setCoords(null)}
        data-testid="clusters-trigger"
      >
        <span className="inline-flex items-center gap-0.5 text-xs text-slate-700">
          <MapPin className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
          <span>{first}</span>
        </span>
        {rest > 0 && (
          <span className="text-[10px] font-medium bg-slate-100 text-slate-500 rounded px-1 py-0 leading-4 border border-slate-200">
            +{rest}
          </span>
        )}
      </div>

      {coords && (
        <div
          style={{ position: "fixed", top: coords.y, left: coords.x, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 min-w-40 pointer-events-none"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Clusters</p>
          {clusters.map(c => (
            <div key={c} className="flex items-center gap-1.5 py-0.5">
              <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
              <span className="text-xs text-slate-700">{c}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ChannelsCell({ channels }: { channels: string[] }) {
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const items = channels;
  const preview = items.length === 0 ? "—" : items.length > 1 ? `${items[0]} +${items.length - 1}` : items[0];

  return (
    <>
      <div
        className="inline-flex items-center gap-1 cursor-default select-none"
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setCoords({ x: r.left, y: r.bottom + 6 });
        }}
        onMouseLeave={() => setCoords(null)}
        data-testid="channels-trigger"
      >
        <span className="text-xs text-slate-700 whitespace-nowrap">{preview}</span>
        {items.length > 1 && (
          <span className="text-[10px] font-medium bg-slate-100 text-slate-500 rounded px-1 py-0 leading-4 border border-slate-200">
            {items.length}
          </span>
        )}
      </div>

      {coords && (
        <div
          style={{ position: "fixed", top: coords.y, left: coords.x, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 min-w-36 pointer-events-none"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Channels</p>
          {items.map(ch => (
            <div key={ch} className="flex items-center gap-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-xs text-slate-700">{ch}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function parseNumericVal(s: string): number | null {
  const m = s.replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function RelaunchChangeCell({ field, mono, delta }: {
  field: { changed: boolean; from?: string; to?: string };
  mono?: boolean;
  delta?: boolean;
}) {
  if (!field.changed) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }
  if (field.from && field.to) {
    if (delta) {
      const fromNum = parseNumericVal(field.from);
      const toNum   = parseNumericVal(field.to);
      const hasDelta = fromNum !== null && toNum !== null && fromNum !== 0;
      const pct = hasDelta ? ((toNum! - fromNum!) / fromNum!) * 100 : 0;
      const up  = pct >= 0;
      return (
        <div className={`flex flex-col gap-0.5 ${mono ? "font-mono" : ""}`}>
          <span className="text-xs font-semibold text-emerald-600">{field.to}</span>
          {hasDelta && (
            <span
              title={`Was: ${field.from}`}
              className={`inline-flex items-center gap-0.5 text-xs font-medium cursor-help ${up ? "text-emerald-600" : "text-red-500"}`}
            >
              {up ? <ArrowUp className="h-3 w-3 flex-shrink-0" /> : <ArrowDown className="h-3 w-3 flex-shrink-0" />}
              {up ? "+" : ""}{pct.toFixed(1)}%
            </span>
          )}
        </div>
      );
    }
    return (
      <div className={`flex flex-col gap-0.5 ${mono ? "font-mono" : ""}`}>
        <span className="text-xs text-muted-foreground line-through">{field.from}</span>
        <span className="text-xs font-semibold text-emerald-600">{field.to}</span>
      </div>
    );
  }
  return <span className="text-xs font-medium text-amber-600">Changed</span>;
}

function NetworkUpdatesTab() {
  const [subTab, setSubTab] = useState<"relaunch" | "new-launch">("relaunch");

  const { data: allEntries } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
    staleTime: 0,
  });

  const entryGeoMap = useMemo(() => {
    const map = new Map<string, { geography: string[]; channel: string[] }>();
    if (allEntries) {
      for (const e of allEntries) {
        map.set(e.cbuCode ?? "", {
          geography: (e.geography as string[] | null) ?? [],
          channel:   (e.channel   as string[] | null) ?? [],
        });
      }
    }
    return map;
  }, [allEntries]);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Network Updates</h2>
          <p className="text-xs text-muted-foreground">Auto-fetched from Listing Master · Restricted post 11th of every month</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> Last sync: 14-Oct, 09:30 AM</Badge>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-download-network"><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        <button
          data-testid="tab-relaunch"
          onClick={() => setSubTab("relaunch")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            subTab === "relaunch"
              ? "border-[#1f36c7] text-[#1f36c7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Relaunch
          <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{RELAUNCH_NETWORKS.length}</Badge>
        </button>
        <button
          data-testid="tab-new-launch"
          onClick={() => setSubTab("new-launch")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            subTab === "new-launch"
              ? "border-[#1f36c7] text-[#1f36c7]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          New Launch
          <Badge className="ml-2 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">{NEW_LAUNCH_NETWORKS.length}</Badge>
        </button>
      </div>

      {/* Relaunch table */}
      {subTab === "relaunch" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Updated in last 2 weeks · Descending order</p>
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {["Last Update","BG / Category","Brand","Basepack","Old CBU","New CBU","Grammage","MRP","Case Cfg","EAN","Artwork","Geography (Clusters)","Channels","Network Status","Price Valid Till"].map(h => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {RELAUNCH_NETWORKS.map((r, i) => {
                  const geo = entryGeoMap.get(r.newCbu);
                  return (
                  <TableRow key={i} data-testid={`relaunch-row-${i}`}>
                    <TableCell className="text-xs font-medium">{r.lastUpdate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.bg}</TableCell>
                    <TableCell className="text-xs font-medium">{r.brand}</TableCell>
                    <TableCell className="text-xs font-mono">{r.basepack}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.oldCbu}</TableCell>
                    <TableCell className="text-xs font-mono text-blue-600 font-medium">{r.newCbu}</TableCell>
                    <TableCell><RelaunchChangeCell field={r.grammage} delta /></TableCell>
                    <TableCell><RelaunchChangeCell field={r.mrp} delta /></TableCell>
                    <TableCell><RelaunchChangeCell field={r.caseConfig} /></TableCell>
                    <TableCell><RelaunchChangeCell field={r.ean} mono /></TableCell>
                    <TableCell><RelaunchChangeCell field={r.artwork} /></TableCell>
                    <TableCell className="max-w-40"><ClusterBadges clusters={geo?.geography ?? []} /></TableCell>
                    <TableCell><ChannelsCell channels={geo?.channel ?? []} /></TableCell>
                    <TableCell><NetworkStatusBadge status={r.networkStatus} /></TableCell>
                    <TableCell className={`text-xs font-medium ${r.priceValidTill === "-" ? "text-muted-foreground" : r.priceValidTill.includes("9999") ? "text-emerald-600" : "text-slate-700"}`}>{r.priceValidTill}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* New Launch table */}
      {subTab === "new-launch" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Innovation pipeline · Listing N-45 days</p>
          <div className="rounded-md border overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {["Last Update","BG / Category","Brand","Basepack","Material Code","Description","Grammage","MRP","Case Config","EAN","Artwork / FTR","Geography (Clusters)","Channels","Network Status","Price Valid Till"].map(h => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {NEW_LAUNCH_NETWORKS.map((r, i) => {
                  const geo = entryGeoMap.get(r.material);
                  return (
                  <TableRow key={i} data-testid={`newlaunch-row-${i}`}>
                    <TableCell className="text-xs font-medium">{r.lastUpdate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.bg}</TableCell>
                    <TableCell className="text-xs font-medium">{r.brand}</TableCell>
                    <TableCell className="text-xs font-mono">{r.basepack}</TableCell>
                    <TableCell className="text-xs font-mono text-blue-600 font-medium">{r.material}</TableCell>
                    <TableCell className="text-xs max-w-40 truncate" title={r.description}>{r.description}</TableCell>
                    <TableCell className="text-xs">{r.grammage}</TableCell>
                    <TableCell className="text-xs font-medium">{r.mrp}</TableCell>
                    <TableCell className="text-xs">{r.caseConfig}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.ean}</TableCell>
                    <TableCell>
                      {r.artwork
                        ? <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-blue-600"><FileText className="h-3 w-3" /> View FTR</Button>
                        : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-40"><ClusterBadges clusters={geo?.geography ?? []} /></TableCell>
                    <TableCell><ChannelsCell channels={geo?.channel ?? []} /></TableCell>
                    <TableCell><NetworkStatusBadge status={r.networkStatus} /></TableCell>
                    <TableCell className={`text-xs font-medium ${r.priceValidTill === "-" ? "text-muted-foreground" : r.priceValidTill.includes("9999") ? "text-emerald-600" : "text-slate-700"}`}>{r.priceValidTill}</TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Part 3: Service Requests ─────────────────────────────────────────────────

interface ServiceRequestsTabProps {
  requests: ServiceRequest[];
}

function ServiceRequestRow({ request, onView }: {
  request: ServiceRequest;
  onView: (r: ServiceRequest) => void;
}) {
  const isCbu     = CBU_SR_TYPES.includes(request.srType);
  const meta      = SR_TYPE_META[request.srType];
  const doneSteps = request.approvers.filter(a => a.status === "approved").length;
  const total     = request.approvers.length;
  const pct       = total > 0 ? (doneSteps / total) * 100 : 0;

  const subject = isCbu ? (request.cbuDescription || request.cbuCode || "—") : request.basepackName;

  return (
    <div
      data-testid={`sr-row-${request.id}`}
      className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors group"
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-md bg-[#1f36c7]/10 flex items-center justify-center flex-shrink-0">
        <ListChecks className="h-3.5 w-3.5 text-[#1f36c7]" />
      </div>

      {/* SR ID + type badge */}
      <div className="w-36 flex-shrink-0">
        <p className="text-xs font-mono font-semibold text-slate-500 leading-tight">{request.id}</p>
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border leading-tight mt-0.5 ${meta.colorClass}`}>
          {meta.label}
        </span>
      </div>

      {/* Status badge */}
      <div className="w-24 flex-shrink-0">
        <SrStatusBadge status={request.overallStatus} />
      </div>

      {/* Subject (basepack or CBU) */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">{subject}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isCbu
            ? <><span className="font-mono">{request.cbuCode}</span> · {request.brand} · {request.bg}</>
            : <>{request.brand} · {request.bg} · <span className="font-mono">{request.basepackCode}</span></>}
        </p>
      </div>

      {/* Raised by + date */}
      <div className="w-40 flex-shrink-0 hidden xl:block">
        <p className="text-xs text-foreground truncate">{request.raisedBy}</p>
        <p className="text-[10px] text-muted-foreground">{request.raisedAt}</p>
      </div>

      {/* MSTN pill — only for basepack-status-change */}
      <div className="flex-shrink-0 hidden lg:flex w-20">
        {!isCbu && request.mstnCoverage !== undefined && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
            request.mstnCoverage >= 100
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}>
            {request.mstnCoverage >= 100
              ? <CheckCircle2 className="h-2.5 w-2.5" />
              : <XCircle className="h-2.5 w-2.5" />}
            MSTN {request.mstnCoverage}%
          </span>
        )}
      </div>

      {/* Approval progress bar */}
      <div className="w-32 flex-shrink-0 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{doneSteps}/{total}</span>
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onView(request)}
          data-testid={`button-view-sr-${request.id}`}
        >
          <Eye className="h-3 w-3" /> View
        </Button>
      </div>
    </div>
  );
}

function ServiceRequestsTab({ requests }: ServiceRequestsTabProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [typeFilter,   setTypeFilter]   = useState<"all" | SrType>("all");
  const [cbuIdSearch,  setCbuIdSearch]  = useState("");
  const [, navigate] = useLocation();

  const pending  = requests.filter(r => r.overallStatus === "pending").length;
  const approved = requests.filter(r => r.overallStatus === "approved").length;
  const rejected = requests.filter(r => r.overallStatus === "rejected").length;

  const filtered = requests.filter(r =>
    (statusFilter === "all" || r.overallStatus === statusFilter) &&
    (typeFilter   === "all" || r.srType       === typeFilter) &&
    (cbuIdSearch.trim() === "" || (r.cbuCode ?? "").toLowerCase().includes(cbuIdSearch.trim().toLowerCase()))
  );

  const hasFilters = statusFilter !== "all" || typeFilter !== "all" || cbuIdSearch.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Header + stat pills */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Service Requests</h2>
          <p className="text-xs text-muted-foreground">All request types — status changes, geo/channel extensions, sourcing amendments</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: "pending",  label: "Pending",  count: pending,  ring: "ring-amber-400",   color: "bg-amber-50 border-amber-200 text-amber-700" },
            { key: "approved", label: "Approved", count: approved, ring: "ring-emerald-400", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { key: "rejected", label: "Rejected", count: rejected, ring: "ring-red-400",     color: "bg-red-50 border-red-200 text-red-700" },
          ].map(({ key, label, count, ring, color }) => (
            <button
              key={key}
              data-testid={`stat-${key}-requests`}
              onClick={() => setStatusFilter(f => (f === key ? "all" : key) as typeof f)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${color} ${statusFilter === key ? `ring-2 ${ring}` : ""}`}
            >
              <span className="font-bold text-sm">{count}</span> {label}
            </button>
          ))}
          {hasFilters && (
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1"
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setCbuIdSearch(""); }}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Type filter chips + CBU ID search */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: "all" as const, label: "All Types" },
          ...Object.entries(SR_TYPE_META).map(([value, m]) => ({ value: value as SrType, label: m.label })),
        ].map(({ value, label }) => (
          <button
            key={value}
            data-testid={`type-filter-${value}`}
            onClick={() => setTypeFilter(value)}
            className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
              typeFilter === value
                ? "bg-[#1f36c7] text-white border-[#1f36c7]"
                : "bg-white text-muted-foreground border-border hover:border-[#1f36c7]/50"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-cbu-id-search"
            value={cbuIdSearch}
            onChange={e => setCbuIdSearch(e.target.value)}
            placeholder="Search CBU ID…"
            className="h-7 pl-7 pr-7 text-xs w-44"
          />
          {cbuIdSearch && (
            <button
              data-testid="button-clear-cbu-search"
              onClick={() => setCbuIdSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <ListChecks className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {requests.length === 0
                ? "No service requests yet"
                : cbuIdSearch.trim()
                  ? `No requests matching "${cbuIdSearch.trim()}"`
                  : statusFilter !== "all"
                    ? `No ${statusFilter} requests`
                    : "No requests match the selected filters"
              }
            </p>
            {requests.length === 0 && (
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                When a basepack status is changed from Draft to Active in the Overview tab, a service request will be created here for approval.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border overflow-hidden p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/40 border-b text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="w-7 flex-shrink-0" />
            <div className="w-28 flex-shrink-0">Request ID</div>
            <div className="w-24 flex-shrink-0">Status</div>
            <div className="flex-1">Basepack</div>
            <div className="w-40 flex-shrink-0 hidden xl:block">Raised by</div>
            <div className="flex-shrink-0 hidden lg:block w-28">MSTN</div>
            <div className="w-32 flex-shrink-0 hidden md:block">Progress</div>
            <div className="w-16 flex-shrink-0" />
          </div>
          {filtered.map(request => (
            <ServiceRequestRow
              key={request.id}
              request={request}
              onView={r => navigate(`/paid-bible/requests/${r.id}`)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PaidBiblePage() {
  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const moc = getCurrentMoc();

  const { requests: serviceRequests, bpStatusOverrides, bpDates } = useSrStore();
  const [activationTarget, setActivationTarget] = useState<PbBasepack | null>(null);

  const { data: users = [] } = useQuery<PortalUser[]>({ queryKey: ["/api/users"] });

  const handleRequestActivation = (bp: PbBasepack) => setActivationTarget(bp);

  const handleCreateRequest = (request: ServiceRequest) => {
    addRequest(request);
    setActivationTarget(null);
    setActiveTab("service-requests");
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <UnileverHeader module="paid-bible" activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Criteria Check Dialog */}
      <ActivationCheckDialog
        bp={activationTarget}
        onClose={() => setActivationTarget(null)}
        onCreateRequest={handleCreateRequest}
        users={users}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-[1600px] mx-auto w-full">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-[#0d8ecf] to-[#00b0d7] p-2.5 rounded-md">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Paid Bible</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Assortment &amp; Listing Automation · What to sell · Where · To Whom · How · When
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <MapPin className="h-3 w-3" /> All India
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Clock className="h-3 w-3" /> MOC {moc.number} · {moc.label}
                </Badge>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Sync Listing Master
                </Button>
              </div>
            </div>
          </div>

          {activeTab === "overview" && (
            <OverviewTab
              localBpStatus={bpStatusOverrides}
              onRequestActivation={handleRequestActivation}
              serviceRequests={serviceRequests}
              bpDates={bpDates}
            />
          )}
          {activeTab === "network-updates"  && <NetworkUpdatesTab />}
          {activeTab === "service-requests" && (
            <ServiceRequestsTab requests={serviceRequests} />
          )}
        </div>
      </main>
    </div>
  );
}
