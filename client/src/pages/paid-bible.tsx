import { useState, Fragment, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PortalUser } from "@/lib/users-data";
import { useSrStore, addRequest, setBpStatusOverride, formatNow, SR_TYPE_META, CBU_SR_TYPES } from "@/lib/sr-store";
import { getNetworkChangeTypeName } from "@/lib/constants";
import type { ServiceRequest, MaterialCriteria, ApproverStep, SrType } from "@/lib/sr-store";
import { SrStatusBadge } from "@/components/sr-detail-components";
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
  ShieldCheck, ShieldAlert, Send, ListChecks,
  TrendingUp, Activity, AlertCircle, RotateCcw,
} from "lucide-react";
import type { NetworkEntry } from "@shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

const BP_STATUS_OPTIONS = [
  "Draft",
  "Active Pack",
  "Active Pack (Channel)",
  "Active Pack (Customer)",
  "Seasonal Pack",
  "Stock Base Delisting",
  "Inactive/Delisted",
];

const MSTN_ACTIVE_STATUSES = new Set([
  "Active", "FTR Approved", "Stock Movement Initiated", "Network transition complete",
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
  matStatus: "OK" | "Issue" | "CP Pack";
  priceActive: boolean;
  mrp: string;
  ean: string;
  grammage: string;
  priceStart: string;
  priceEnd: string;
  copyCbu: string;
  predecessorDoh: number | null;
  slobRisk: boolean;
  typeOfNetwork: string;
  mstnPct: number;
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

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function deriveBpStatus(statuses: (string | null)[]): string {
  const ss = statuses.map(s => s ?? "Draft");
  if (ss.every(s => s === "Draft"))                          return "Draft";
  if (ss.some(s => s === "Network transition complete"))     return "Active Pack";
  if (ss.some(s => s === "Stock Movement Initiated"))        return "Active Pack";
  if (ss.some(s => s === "FTR Approved"))                   return "Active Pack (Channel)";
  if (ss.some(s => s === "Active"))                          return "Active Pack";
  if (ss.some(s => s === "Production Started"))              return "Active Pack (Channel)";
  if (ss.some(s => s === "Pricing Updated"))                 return "Stock Base Delisting";
  return "Draft";
}

function deriveMatStatus(ns: string | null | undefined): "OK" | "Issue" | "CP Pack" {
  switch (ns) {
    case "Active":
    case "FTR Approved":
    case "Production Started":
    case "Stock Movement Initiated":
    case "Network transition complete": return "OK";
    default:                            return "Issue";
  }
}

function simulateTdpCoverage(bpCode: string): number {
  let hash = 0;
  for (const c of bpCode) hash = (hash * 31 + c.charCodeAt(0)) % 100;
  return 50 + (hash % 40);
}

function checkCriteria(bp: PbBasepack): {
  mstnCoverage: number;
  tdpCoverage: number;
  criteriaMet: boolean;
  materials: MaterialCriteria[];
} {
  const total   = bp.materials.length || 1;
  const isMstnCleared = (m: PbMaterial) => m.mstnPct >= 80;
  const cleared = bp.materials.filter(isMstnCleared).length;
  const mstnCoverage = Math.round((cleared / total) * 100);
  const tdpCoverage  = simulateTdpCoverage(bp.basepackCode);
  const criteriaMet  = mstnCoverage >= 100 && tdpCoverage >= 75;
  const materials: MaterialCriteria[] = bp.materials.map(m => ({
    code:        m.code,
    description: m.description,
    mstnCleared: isMstnCleared(m),
    lastUpdated: m.priceStart && m.priceStart !== "-" ? m.priceStart : "—",
  }));
  return { mstnCoverage, tdpCoverage, criteriaMet, materials };
}

function makeTicketId(): string {
  return `SR-${Date.now().toString().slice(-6)}`;
}

// ─── Static Data (Network Updates / Bible Matrix / Amendments) ────────────────

const RELAUNCH_NETWORKS = [
  {
    lastUpdate: "14-Oct", bg: "HC / HHC", brand: "Wheel Bar", basepack: "14151",
    oldCbu: "WHGI15B", newCbu: "WHGI15C", description: "WHEEL GREEN BAR FW 180g+50g",
    grammage: "Yes", mrp: "No", caseConfig: "No", ean: "No", artwork: "No", promo: "No",
    geography: "All India minus MPCG", channels: "All channels",
    production: "05-Oct", invoicing: "15-Oct", remarks: "Dhule 30 Sep / Remaining sites from 12 Oct",
  },
  {
    lastUpdate: "10-Oct", bg: "BPC / PC", brand: "Dove", basepack: "18920",
    oldCbu: "DVCS100A", newCbu: "DVCS100B", description: "DOVE CREAM BAR 100g",
    grammage: "No", mrp: "Yes", caseConfig: "No", ean: "Yes", artwork: "Yes", promo: "No",
    geography: "South + West", channels: "MT, GT",
    production: "01-Oct", invoicing: "11-Oct", remarks: "Price change > 10%, new PL raised",
  },
  {
    lastUpdate: "08-Oct", bg: "F&R / Foods", brand: "Kissan", basepack: "22041",
    oldCbu: "KSMX5A", newCbu: "KSMX5B", description: "KISSAN MIXED FRUIT JAM 500g",
    grammage: "No", mrp: "No", caseConfig: "Yes", ean: "Yes", artwork: "No", promo: "No",
    geography: "All India", channels: "GT, KA",
    production: "28-Sep", invoicing: "10-Oct", remarks: "Case config from 12s to 8s",
  },
];

const NEW_LAUNCH_NETWORKS = [
  {
    lastUpdate: "14-Oct", bg: "HC / HHC", brand: "Wheel Bar", basepack: "14151",
    material: "WHGI15C", description: "WHEEL GREEN BAR FW 180g+50g",
    grammage: "230g", mrp: "₹35", caseConfig: "24", ean: "8901491210421",
    artwork: true, promo: "No", geography: "All India minus MPCG", channels: "All channels",
    production: "05-Oct", landingDate: "15-Oct", remarks: "Dhule 30 Sep / Remaining sites from 12 Oct",
  },
  {
    lastUpdate: "12-Oct", bg: "BPC / PC", brand: "TRESemmé", basepack: "30115",
    material: "TRSH400A", description: "TRESEMME SHAMPOO SMOOTH & SHINE 400ml",
    grammage: "400ml", mrp: "₹275", caseConfig: "12", ean: "8901491350082",
    artwork: true, promo: "No", geography: "MT All India", channels: "MT, MT-ECOM",
    production: "30-Sep", landingDate: "12-Oct", remarks: "N-45 listing with MT SPOC initiated",
  },
];

const BIBLE_MATRIX = [
  {
    salesCategory: "HC", basepack: "14151", bpStatus: "Active Pack", material: "WHGI15C",
    matStatus: "OK", region: "North", cluster: "Delhi NCR", state: "Delhi", regionCode: "N01",
    depot: "DEL-01", mrp: "35", netWt: "180", cc: "24", ean: "8901491210421",
    csd: "Y", gt: "Y", ka: "Y", oh: "N", mt: "Y", retail: "Y", ecom: "Y", qcom: "Y",
    priceStart: "01-Apr-24", priceEnd: "9999", createdOn: "28-Mar-24",
  },
  {
    salesCategory: "HC", basepack: "14151", bpStatus: "Active Pack", material: "WHGI15C",
    matStatus: "OK", region: "North", cluster: "Punjab-Hills-Haryana", state: "Punjab", regionCode: "N02",
    depot: "AMR-01", mrp: "35", netWt: "180", cc: "24", ean: "8901491210421",
    csd: "Y", gt: "Y", ka: "N", oh: "N", mt: "Y", retail: "Y", ecom: "N", qcom: "N",
    priceStart: "01-Apr-24", priceEnd: "9999", createdOn: "28-Mar-24",
  },
  {
    salesCategory: "PC", basepack: "18920", bpStatus: "Active Pack (Channel)", material: "DVCS100B",
    matStatus: "OK", region: "West", cluster: "Mumbai Metro", state: "Maharashtra", regionCode: "W01",
    depot: "MUM-01", mrp: "99", netWt: "100", cc: "48", ean: "8901491198001",
    csd: "N", gt: "Y", ka: "Y", oh: "N", mt: "Y", retail: "Y", ecom: "Y", qcom: "Y",
    priceStart: "01-Oct-24", priceEnd: "9999", createdOn: "28-Sep-24",
  },
  {
    salesCategory: "PC", basepack: "18920", bpStatus: "Active Pack (Channel)", material: "DVCS100B",
    matStatus: "Issue", region: "South", cluster: "Tamil Nadu", state: "Tamil Nadu", regionCode: "S01",
    depot: "CHN-01", mrp: "99", netWt: "100", cc: "48", ean: "8901491198001",
    csd: "N", gt: "Y", ka: "N", oh: "N", mt: "N", retail: "Y", ecom: "N", qcom: "N",
    priceStart: "01-Oct-24", priceEnd: "31-Dec-24", createdOn: "28-Sep-24",
  },
  {
    salesCategory: "Foods", basepack: "22041", bpStatus: "Seasonal Pack", material: "KSMX5B",
    matStatus: "Issue", region: "East", cluster: "West Bengal", state: "W Bengal", regionCode: "E01",
    depot: "KOL-01", mrp: "175", netWt: "500", cc: "8", ean: "8901058018021",
    csd: "N", gt: "Y", ka: "Y", oh: "N", mt: "Y", retail: "Y", ecom: "N", qcom: "N",
    priceStart: "-", priceEnd: "-", createdOn: "-",
  },
];

const TRIGGER_DEFS = [
  { id: "price-inactive", name: "Price Inactive", rule: "MSTN coverage > 80% but price inactive for respective channel", stakeholder: "Network Planner",       severity: "high"   },
  { id: "slob-risk",      name: "SLOB Risk",      rule: "DOH in Copy CBU > 5 days compared to DOH of new CBU",          stakeholder: "Availability Planner", severity: "medium" },
] as const;


// ─── Badge Components ─────────────────────────────────────────────────────────

function MatStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: JSX.Element }> = {
    "OK":      { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
    "Issue":   { cls: "bg-red-50 text-red-700 border-red-200",              icon: <XCircle className="h-3 w-3" /> },
    "CP Pack": { cls: "bg-blue-50 text-blue-700 border-blue-200",           icon: <Package className="h-3 w-3" /> },
  };
  const s = map[status] ?? map["Issue"];
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
    "Draft":                 "bg-slate-50 text-slate-600 border-slate-300",
    "Active Pack":           "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Inactive/Delisted":     "bg-red-50 text-red-700 border-red-200",
    "Stock Base Delisting":  "bg-orange-50 text-orange-700 border-orange-200",
    "Seasonal Pack":         "bg-violet-50 text-violet-700 border-violet-200",
    "Active Pack (Channel)": "bg-blue-50 text-blue-700 border-blue-200",
    "Active Pack (Customer)":"bg-cyan-50 text-cyan-700 border-cyan-200",
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
  if (!bp) return null;

  const { mstnCoverage, tdpCoverage, criteriaMet, materials } = checkCriteria(bp);
  const mstnPassed = mstnCoverage >= 100;
  const tdpPassed  = tdpCoverage  >= 75;

  const handleCreateRequest = () => {
    const userByRole = (role: string): string | undefined =>
      users.find(u => u.role === role && u.isActive)?.name;
    const approvers: ApproverStep[] = APPROVER_CHAIN.map((a, i) => ({
      ...a,
      assignedTo: userByRole(a.role),
      status: i === 0 ? "pending" : "waiting",
    }));
    const sr: ServiceRequest = {
      id:                makeTicketId(),
      srType:            "basepack-status-change",
      targetStatus:      "Active Pack",
      basepackId:        bp.id,
      basepackCode:      bp.basepackCode,
      basepackName:      bp.basepakName,
      brand:             bp.brand,
      bg:                bp.bg,
      raisedBy:          bp.paidBibleOwner || "Brand Planner",
      raisedAt:          formatNow(),
      mstnCoverage,
      tdpCoverage,
      criteriaMetAtRaise: criteriaMet,
      materials,
      approvers,
      overallStatus:     "pending",
    };
    onCreateRequest(sr);
    onClose();
  };

  return (
    <Dialog open={!!bp} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {criteriaMet
              ? <ShieldCheck className="h-5 w-5 text-emerald-600" />
              : <ShieldAlert className="h-5 w-5 text-amber-500" />
            }
            Activation Criteria Check
          </DialogTitle>
          <DialogDescription className="text-xs">
            Basepack Status Change · {bp.basepakName} · {bp.basepackCode}
          </DialogDescription>
        </DialogHeader>

        {/* Criteria Summary Card */}
        <div className="mt-2">
          <div className={`rounded-lg border p-4 ${mstnPassed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">MSTN Coverage</p>
              {mstnPassed
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <XCircle className="h-4 w-4 text-red-500" />
              }
            </div>
            <p className={`text-2xl font-bold ${mstnPassed ? "text-emerald-700" : "text-red-600"}`}>
              {mstnCoverage}%
            </p>
            <p className="text-xs mt-0.5 text-muted-foreground">CBU level MSTN should ≥80%</p>
          </div>
        </div>

        {/* Verdict Banner */}
        <div className={`rounded-lg p-3 flex items-center gap-2.5 ${criteriaMet ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
          {criteriaMet
            ? <><ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" /><p className="text-sm font-medium text-emerald-800">All criteria met — a service request will be raised for stakeholder approval before activation.</p></>
            : <><AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" /><p className="text-sm font-medium text-amber-800">Criteria not fully met</p></>
          }
        </div>

        {/* Per-Material Breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Material-level Criteria</p>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs py-2">CBU Code</TableHead>
                  <TableHead className="text-xs py-2">Description</TableHead>
                  <TableHead className="text-xs py-2 text-center">MSTN Cleared</TableHead>
                  <TableHead className="text-xs py-2 text-center">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map(m => (
                  <TableRow key={m.code} className="text-xs">
                    <TableCell className="font-mono font-medium text-blue-600 py-2">{m.code}</TableCell>
                    <TableCell className="py-2 max-w-40 truncate text-muted-foreground" title={m.description}>{m.description}</TableCell>
                    <TableCell className="py-2 text-center">
                      {m.mstnCleared
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 className="h-3 w-3" />Yes</span>
                        : <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><XCircle className="h-3 w-3" />No</span>
                      }
                    </TableCell>
                    <TableCell className="py-2 text-center text-muted-foreground">{m.lastUpdated}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

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

// ─── Part 1: Overview ────────────────────────────────────────────────────────

interface OverviewTabProps {
  localBpStatus: Record<string, string>;
  onRequestActivation: (bp: PbBasepack) => void;
  serviceRequests: ServiceRequest[];
}

function OverviewTab({ localBpStatus, onRequestActivation, serviceRequests }: OverviewTabProps) {
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
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [pendingStatus, setPendingStatus]   = useState<string>("");

  const pendingActivationBpIds = useMemo(
    () => new Set(serviceRequests.filter(r => r.overallStatus === "pending").map(r => r.basepackId)),
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
      const mstnYes  = statuses.some(s => MSTN_ACTIVE_STATUSES.has(s ?? ""));
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
        materials: entries.map(e => ({
          id:            e.id,
          code:          e.cbuCode          || "-",
          description:   e.materialDescription || e.basepackDescription || "-",
          networkStatus: e.networkStatus    || "Draft",
          matStatus:     deriveMatStatus(e.networkStatus),
          priceActive:   MSTN_ACTIVE_STATUSES.has(e.networkStatus ?? ""),
          mrp:           "-",
          ean:           e.ean              || "-",
          grammage:      e.netWeight        ? `${e.netWeight}g` : "-",
          copyCbu:       e.copyCbu          || "-",
          predecessorDoh: e.predecessorDoh ?? null,
          slobRisk:      e.slobRisk         ?? false,
          typeOfNetwork: getNetworkChangeTypeName(e.typeOfNetwork),
          priceStart:    MSTN_ACTIVE_STATUSES.has(e.networkStatus ?? "") ? "01-Apr-24" : "-",
          priceEnd:      MSTN_ACTIVE_STATUSES.has(e.networkStatus ?? "") ? "9999" : "-",
          mstnPct:       e.mstnPercentage != null
            ? e.mstnPercentage
            : MSTN_ACTIVE_STATUSES.has(e.networkStatus ?? "")
            ? 100
            : ((e.cbuCode || "X").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 60) + 10,
        })),
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
    const effStatus = localBpStatus[b.id] ?? b.bpStatus;
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

  const ACTIVE_BP_STATUSES = new Set(["Active Pack", "Active Pack (Channel)", "Active Pack (Customer)", "Seasonal Pack"]);
  const total       = allBasepacks.length;
  const mstnYes     = allBasepacks.filter(b => b.mstnStatus === "Yes").length;
  const drafts      = allBasepacks.filter(b => (localBpStatus[b.id] ?? b.bpStatus) === "Draft").length;
  const activeCount = allBasepacks.filter(b => ACTIVE_BP_STATUSES.has(localBpStatus[b.id] ?? b.bpStatus)).length;

  const activeFilterCount = [
    bpStatusFilter !== "all", channelFilter !== "all",
    locationFilter !== "all", mstnFilter !== "all", bgFilter !== "all", materialSearch !== "",
  ].filter(Boolean).length;

  const triggerCbus = useMemo(() => {
    const flat = allBasepacks.flatMap(bp =>
      bp.materials.map(m => ({ ...m, basepakName: bp.basepakName }))
    );
    return {
      "price-inactive": flat.filter(m => m.mstnPct >= 80 && !m.priceActive),
      "slob-risk":      flat.filter(m => m.slobRisk),
    };
  }, [allBasepacks]);

  const [triggerDialog, setTriggerDialog] = useState<string | null>(null);

  const toggleExpand = (id: string) => setExpandedId(p => p === id ? null : id);

  const startEdit = (bp: PbBasepack, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingStatus(localBpStatus[bp.id] ?? bp.bpStatus);
    setEditingId(bp.id);
  };

  const saveEdit = (bp: PbBasepack, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = localBpStatus[bp.id] ?? bp.bpStatus;
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
        <div className="grid grid-cols-2 gap-3">
          {TRIGGER_DEFS.map(t => {
            const cbus = triggerCbus[t.id];
            const count = cbus.length;
            return (
              <Card key={t.id} data-testid={`trigger-card-${t.id}`} onClick={() => count > 0 && setTriggerDialog(t.id)} className={`border-l-4 transition-colors ${t.severity === "high" ? "border-l-red-400" : "border-l-amber-400"} ${count > 0 ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{count} {count === 1 ? "item" : "items"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{t.rule}</p>
                  <p className="text-xs text-muted-foreground">Action: <span className="font-medium text-foreground">{t.stakeholder}</span></p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trigger detail dialog */}
      {TRIGGER_DEFS.map(t => {
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
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]">Network Planner</TableHead>
                  <TableHead className="text-xs font-semibold sticky top-0 z-20 bg-muted/60 w-20 shadow-[0_1px_0_0_hsl(var(--border))]">CBUs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-16">No basepacks found — try adjusting your filters</TableCell>
                  </TableRow>
                ) : filtered.map(bp => {
                  const effStatus = localBpStatus[bp.id] ?? bp.bpStatus;
                  const isExpanded = expandedId === bp.id;
                  const isEditing  = editingId  === bp.id;

                  return (
                    <Fragment key={bp.id}>
                      <TableRow
                        data-testid={`bp-row-${bp.id}`}
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-[#1f36c7]/5 border-l-2 border-l-[#1f36c7]" : "hover:bg-muted/40"}`}
                        onClick={() => !isEditing && toggleExpand(bp.id)}
                      >
                        <TableCell className="py-3 pl-4">
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
                          <div className="flex flex-wrap gap-1">
                            {bp.channels.length > 0
                              ? bp.channels.slice(0, 3).map(ch => <Badge key={ch} variant="outline" className="text-xs px-1.5 py-0">{ch}</Badge>)
                              : <span className="text-xs text-muted-foreground">-</span>
                            }
                            {bp.channels.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0">+{bp.channels.length - 3}</Badge>}
                          </div>
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
                                <span title="Activation request in progress" data-testid={`badge-activation-in-progress-${bp.id}`}>
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#1f36c7]/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-3 w-3 text-[#1f36c7]" />
                            </div>
                            <span className="text-xs">{bp.networkPlanner}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <span className="text-xs text-muted-foreground">{bp.materials.length} CBU{bp.materials.length !== 1 ? "s" : ""}</span>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${bp.id}-exp`} data-testid={`bp-expanded-${bp.id}`}>
                          <TableCell colSpan={10} className="p-0 bg-muted/20">
                            <div className="px-10 py-6 border-l-4 border-l-[#1f36c7]/40">
                              <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-[#1f36c7]" />
                                CBU / Material Details
                                <span className="font-normal text-muted-foreground text-xs">— {bp.basepakName} · {bp.basepackCode}</span>
                              </p>
                              <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="text-xs font-semibold py-3 px-4">CBU Code</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4">Description</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 min-w-[160px]">NW Status</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 min-w-[100px]">Mat. Status</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4">Type of Network</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 min-w-[90px]">MSTN %</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 whitespace-nowrap">Predecessor CBU DOH</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 min-w-[90px]">Price Active</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4">Price End</TableHead>
                                      <TableHead className="text-xs font-semibold py-3 px-4 w-16"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bp.materials.map((m, idx) => (
                                      <TableRow key={m.id} data-testid={`mat-row-${bp.id}-${idx}`} className="hover:bg-muted/30">
                                        <TableCell className="text-sm font-mono font-semibold text-blue-600 py-3 px-4 whitespace-nowrap">{m.code}</TableCell>
                                        <TableCell className="text-sm py-3 px-4 max-w-56 truncate" title={m.description}>{m.description}</TableCell>
                                        <TableCell className="py-3 px-4"><NwStatusBadge status={m.networkStatus} /></TableCell>
                                        <TableCell className="py-3 px-4"><MatStatusBadge status={m.matStatus} /></TableCell>
                                        <TableCell className="text-sm py-3 px-4 text-muted-foreground whitespace-nowrap">{m.typeOfNetwork}</TableCell>
                                        <TableCell className="py-3 px-4 whitespace-nowrap">
                                          <span className={`text-sm font-semibold ${m.mstnPct >= 80 ? "text-emerald-600" : "text-red-500"}`}>
                                            {m.mstnPct}%
                                          </span>
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
                                          <span className={`text-sm font-semibold ${m.priceActive ? "text-emerald-600" : "text-red-500"}`}>{m.priceActive ? "Yes" : "No"}</span>
                                        </TableCell>
                                        <TableCell className={`text-sm font-medium py-3 px-4 whitespace-nowrap ${m.priceEnd === "9999" ? "text-emerald-600" : "text-muted-foreground"}`}>
                                          {m.priceEnd}
                                        </TableCell>
                                        <TableCell className="py-3 px-4">
                                          <Button size="sm" variant="ghost" className="h-7 text-xs text-[#1f36c7] hover:text-[#1f36c7] hover:bg-[#1f36c7]/10 px-2" onClick={() => navigate(`/edit/${m.id}?source=paid-bible&cbuStatus=${encodeURIComponent(m.matStatus || "")}`)} data-testid={`btn-view-cbu-${m.id}`}>
                                            <Eye className="h-3.5 w-3.5" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
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

function NetworkUpdatesTab() {
  const [subTab, setSubTab] = useState<"relaunch" | "new-launch">("relaunch");

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
                  {["Last Update","BG / Category","Brand","Basepack","Old CBU","New CBU","Grammage","MRP","Case Cfg","EAN","Artwork","Geography","Channels","Production","Invoicing","Remarks"].map(h => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {RELAUNCH_NETWORKS.map((r, i) => (
                  <TableRow key={i} data-testid={`relaunch-row-${i}`}>
                    <TableCell className="text-xs font-medium">{r.lastUpdate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.bg}</TableCell>
                    <TableCell className="text-xs font-medium">{r.brand}</TableCell>
                    <TableCell className="text-xs font-mono">{r.basepack}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.oldCbu}</TableCell>
                    <TableCell className="text-xs font-mono text-blue-600 font-medium">{r.newCbu}</TableCell>
                    <TableCell><YesNoBadge val={r.grammage} /></TableCell>
                    <TableCell><YesNoBadge val={r.mrp} /></TableCell>
                    <TableCell><YesNoBadge val={r.caseConfig} /></TableCell>
                    <TableCell><YesNoBadge val={r.ean} /></TableCell>
                    <TableCell><YesNoBadge val={r.artwork} /></TableCell>
                    <TableCell className="text-xs max-w-32 truncate" title={r.geography}>{r.geography}</TableCell>
                    <TableCell className="text-xs">{r.channels}</TableCell>
                    <TableCell className="text-xs">{r.production}</TableCell>
                    <TableCell className="text-xs font-medium text-blue-600">{r.invoicing}</TableCell>
                    <TableCell className="text-xs max-w-36 truncate text-muted-foreground" title={r.remarks}>{r.remarks}</TableCell>
                  </TableRow>
                ))}
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
                  {["Last Update","BG / Category","Brand","Basepack","Material Code","Description","Grammage","MRP","Case Config","EAN","Artwork / FTR","Geography","Channels","Production","Landing Date","Remarks"].map(h => (
                    <TableHead key={h} className="text-xs">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {NEW_LAUNCH_NETWORKS.map((r, i) => (
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
                    <TableCell className="text-xs max-w-32 truncate" title={r.geography}>{r.geography}</TableCell>
                    <TableCell className="text-xs">{r.channels}</TableCell>
                    <TableCell className="text-xs">{r.production}</TableCell>
                    <TableCell className="text-xs font-medium text-emerald-600">{r.landingDate}</TableCell>
                    <TableCell className="text-xs max-w-36 truncate text-muted-foreground" title={r.remarks}>{r.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Part 3: Bible Matrix ────────────────────────────────────────────────────

function BibleMatrixTab() {
  const [search, setSearch] = useState("");
  const rows = BIBLE_MATRIX.filter(r =>
    !search || r.basepack.includes(search) || r.material.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Paid Bible Matrix</h2>
          <p className="text-xs text-muted-foreground">Complete assortment matrix · Pack Details · Geo Master · Attributes · Distribution · Pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search basepack / material…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-7 text-xs w-52" data-testid="search-bible-matrix" />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-download-matrix"><Download className="h-3.5 w-3.5" /> Export Matrix</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1f36c7]/5 border-b-0">
                  <TableHead colSpan={5} className="text-xs font-bold text-[#1f36c7] text-center border-r py-2">Pack Details</TableHead>
                  <TableHead colSpan={5} className="text-xs font-bold text-[#0d8ecf] text-center border-r py-2">Geo Master</TableHead>
                  <TableHead colSpan={4} className="text-xs font-bold text-violet-700 text-center border-r py-2">Attributes</TableHead>
                  <TableHead colSpan={8} className="text-xs font-bold text-amber-700 text-center border-r py-2">Distribution Channels</TableHead>
                  <TableHead colSpan={3} className="text-xs font-bold text-emerald-700 text-center py-2">Price Activation</TableHead>
                </TableRow>
                <TableRow className="bg-muted/60">
                  {["Sales Cat.","Basepack","BP Status","Material","Mat. Status","Region","Cluster","State","Reg. Code","Depot","MRP","Net Wt","CC","EAN","CSD","GT","KA","OH","MT","Retail","MT-ECOM","MT-QCOM","Start Date","End Date","Created On"].map((h, i) => (
                    <TableHead key={i} className={`text-xs py-2 ${[4,9,13,21].includes(i) ? "border-r" : ""}`}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} data-testid={`bible-matrix-row-${i}`} className="hover:bg-muted/30">
                    <TableCell className="text-xs">{r.salesCategory}</TableCell>
                    <TableCell className="text-xs font-mono">{r.basepack}</TableCell>
                    <TableCell><BpStatusBadge status={r.bpStatus} /></TableCell>
                    <TableCell className="text-xs font-mono text-blue-600">{r.material}</TableCell>
                    <TableCell className="border-r"><MatStatusBadge status={r.matStatus} /></TableCell>
                    <TableCell className="text-xs">{r.region}</TableCell>
                    <TableCell className="text-xs">{r.cluster}</TableCell>
                    <TableCell className="text-xs">{r.state}</TableCell>
                    <TableCell className="text-xs font-mono">{r.regionCode}</TableCell>
                    <TableCell className="text-xs border-r font-mono">{r.depot}</TableCell>
                    <TableCell className="text-xs font-medium">₹{r.mrp}</TableCell>
                    <TableCell className="text-xs">{r.netWt}g</TableCell>
                    <TableCell className="text-xs">{r.cc}</TableCell>
                    <TableCell className="text-xs font-mono border-r text-muted-foreground">{r.ean}</TableCell>
                    {[r.csd,r.gt,r.ka,r.oh,r.mt,r.retail,r.ecom,r.qcom].map((v, j) => (
                      <TableCell key={j} className={j === 7 ? "border-r" : ""}><YNBadge val={v} /></TableCell>
                    ))}
                    <TableCell className="text-xs">{r.priceStart}</TableCell>
                    <TableCell className={`text-xs font-medium ${r.priceEnd === "9999" ? "text-emerald-600" : r.priceEnd === "-" ? "text-muted-foreground" : "text-red-500"}`}>
                      {r.priceEnd === "9999" ? "9999 ∞" : r.priceEnd}
                    </TableCell>
                    <TableCell className="text-xs">{r.createdOn}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={25} className="text-center text-muted-foreground text-sm py-10">No records match your search</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Part 4: Service Requests ─────────────────────────────────────────────────

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
  const [, navigate] = useLocation();

  const pending  = requests.filter(r => r.overallStatus === "pending").length;
  const approved = requests.filter(r => r.overallStatus === "approved").length;
  const rejected = requests.filter(r => r.overallStatus === "rejected").length;

  const filtered = requests.filter(r =>
    (statusFilter === "all" || r.overallStatus === statusFilter) &&
    (typeFilter   === "all" || r.srType       === typeFilter)
  );

  const hasFilters = statusFilter !== "all" || typeFilter !== "all";

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
              onClick={() => { setStatusFilter("all"); setTypeFilter("all"); }}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
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
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <ListChecks className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {requests.length === 0 ? "No service requests yet" : `No ${statusFilter} requests`}
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

  const { requests: serviceRequests, bpStatusOverrides } = useSrStore();
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
            />
          )}
          {activeTab === "network-updates"  && <NetworkUpdatesTab />}
          {activeTab === "bible-matrix"     && <BibleMatrixTab />}
          {activeTab === "service-requests" && (
            <ServiceRequestsTab requests={serviceRequests} />
          )}
        </div>
      </main>
    </div>
  );
}
