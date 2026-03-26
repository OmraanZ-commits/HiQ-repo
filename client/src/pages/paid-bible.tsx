import { useState, Fragment } from "react";
import { useLocation } from "wouter";
import { UnileverHeader } from "@/components/unilever-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Ticket, AlertTriangle, CheckCircle2, XCircle, Clock,
  Search, Filter, ChevronRight, ChevronDown, FileText, ArrowUpRight,
  Zap, MapPin, Package, User, X, BookOpen, RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Material {
  code: string;
  description: string;
  status: "OK" | "Issue" | "In Progress" | "CP Pack";
  priceActive: boolean;
  mrp: string;
  ean: string;
  grammage: string;
  caseConfig: string;
  priceStart: string;
  priceEnd: string;
}

interface Basepack {
  id: string;
  basepakName: string;
  basepackCode: string;
  salesCategory: string;
  brand: string;
  cluster: string;
  channel: string;
  mstnStatus: "Cleared" | "Pending" | "Not Cleared" | "Partial";
  mstnCoverage: number;
  bpStatus: "Active Pack" | "Inactive/Delisted" | "Stock Base Delisting" | "Seasonal Pack" | "Active Pack (Channel)" | "Active Pack (Customer)";
  networkPlanner: string;
  paidBibleOwner: string;
  materials: Material[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const BASEPACK_LIST: Basepack[] = [
  {
    id: "bp1", basepakName: "WHEEL GREEN BAR FW", basepackCode: "14151",
    salesCategory: "HC", brand: "Wheel Bar", cluster: "Delhi NCR", channel: "MT",
    mstnStatus: "Cleared", mstnCoverage: 88, bpStatus: "Active Pack",
    networkPlanner: "Ravi Kumar", paidBibleOwner: "Priya Sharma",
    materials: [
      { code: "WHGI15C", description: "WHEEL GREEN BAR FW 180g+50g", status: "OK",          priceActive: true,  mrp: "35", ean: "8901491210421", grammage: "230g", caseConfig: "24", priceStart: "01-Apr-24", priceEnd: "9999" },
      { code: "WHGI15D", description: "WHEEL GREEN BAR FW 90g",       status: "OK",          priceActive: true,  mrp: "20", ean: "8901491210438", grammage: "90g",  caseConfig: "48", priceStart: "01-Apr-24", priceEnd: "9999" },
      { code: "WHGI15B", description: "WHEEL GREEN BAR OLD 180g",     status: "Issue",       priceActive: false, mrp: "32", ean: "8901491210414", grammage: "180g", caseConfig: "24", priceStart: "01-Jan-24", priceEnd: "31-Mar-24" },
    ],
  },
  {
    id: "bp2", basepakName: "WHEEL GREEN BAR FW", basepackCode: "14151",
    salesCategory: "HC", brand: "Wheel Bar", cluster: "Punjab-Hills-Haryana", channel: "GT",
    mstnStatus: "Partial", mstnCoverage: 72, bpStatus: "Active Pack",
    networkPlanner: "Ravi Kumar", paidBibleOwner: "Priya Sharma",
    materials: [
      { code: "WHGI15C", description: "WHEEL GREEN BAR FW 180g+50g", status: "OK",      priceActive: true,  mrp: "35", ean: "8901491210421", grammage: "230g", caseConfig: "24", priceStart: "01-Apr-24", priceEnd: "9999" },
      { code: "WHGI15B", description: "WHEEL GREEN BAR OLD 180g",    status: "Issue",   priceActive: false, mrp: "32", ean: "8901491210414", grammage: "180g", caseConfig: "24", priceStart: "01-Jan-24", priceEnd: "31-Mar-24" },
    ],
  },
  {
    id: "bp3", basepakName: "DOVE CREAM BAR", basepackCode: "18920",
    salesCategory: "PC", brand: "Dove", cluster: "Mumbai Metro", channel: "MT",
    mstnStatus: "Cleared", mstnCoverage: 92, bpStatus: "Active Pack (Channel)",
    networkPlanner: "Sneha Patel", paidBibleOwner: "Ananya Singh",
    materials: [
      { code: "DVCS100B", description: "DOVE CREAM BAR 100g",   status: "OK",    priceActive: true,  mrp: "99",  ean: "8901491198001", grammage: "100g", caseConfig: "48", priceStart: "01-Oct-24", priceEnd: "9999" },
      { code: "DVCS100A", description: "DOVE CREAM BAR 100g OLD", status: "Issue",priceActive: false, mrp: "95",  ean: "8901491197997", grammage: "100g", caseConfig: "48", priceStart: "01-Jul-24", priceEnd: "30-Sep-24" },
      { code: "DVCS75B",  description: "DOVE CREAM BAR 75g",    status: "OK",    priceActive: true,  mrp: "75",  ean: "8901491197980", grammage: "75g",  caseConfig: "72", priceStart: "01-Oct-24", priceEnd: "9999" },
    ],
  },
  {
    id: "bp4", basepakName: "DOVE CREAM BAR", basepackCode: "18920",
    salesCategory: "PC", brand: "Dove", cluster: "Tamil Nadu", channel: "GT",
    mstnStatus: "Not Cleared", mstnCoverage: 48, bpStatus: "Active Pack (Channel)",
    networkPlanner: "Sneha Patel", paidBibleOwner: "Ananya Singh",
    materials: [
      { code: "DVCS100B", description: "DOVE CREAM BAR 100g",   status: "Issue",       priceActive: false, mrp: "99", ean: "8901491198001", grammage: "100g", caseConfig: "48", priceStart: "01-Oct-24", priceEnd: "31-Dec-24" },
      { code: "DVCS75B",  description: "DOVE CREAM BAR 75g",    status: "In Progress", priceActive: false, mrp: "75", ean: "8901491197980", grammage: "75g",  caseConfig: "72", priceStart: "-",         priceEnd: "-" },
    ],
  },
  {
    id: "bp5", basepakName: "KISSAN MIXED FRUIT JAM", basepackCode: "22041",
    salesCategory: "Foods", brand: "Kissan", cluster: "West Bengal", channel: "KA",
    mstnStatus: "Pending", mstnCoverage: 0, bpStatus: "Seasonal Pack",
    networkPlanner: "Arun Mehta", paidBibleOwner: "Deepak Verma",
    materials: [
      { code: "KSMX5B", description: "KISSAN MIXED FRUIT JAM 500g", status: "In Progress", priceActive: false, mrp: "175", ean: "8901058018021", grammage: "500g", caseConfig: "8", priceStart: "-", priceEnd: "-" },
    ],
  },
  {
    id: "bp6", basepakName: "TRESEMME SHAMPOO", basepackCode: "30115",
    salesCategory: "BPC", brand: "TRESemmé", cluster: "All India", channel: "MT",
    mstnStatus: "Cleared", mstnCoverage: 95, bpStatus: "Active Pack",
    networkPlanner: "Sneha Patel", paidBibleOwner: "Ananya Singh",
    materials: [
      { code: "TRSH400A", description: "TRESEMME SHAMPOO SMOOTH & SHINE 400ml", status: "OK",     priceActive: true,  mrp: "275", ean: "8901491350082", grammage: "400ml", caseConfig: "12", priceStart: "01-Oct-24", priceEnd: "9999" },
      { code: "TRSH200A", description: "TRESEMME SHAMPOO SMOOTH & SHINE 200ml", status: "OK",     priceActive: true,  mrp: "155", ean: "8901491350075", grammage: "200ml", caseConfig: "24", priceStart: "01-Oct-24", priceEnd: "9999" },
      { code: "TRSH400B", description: "TRESEMME SHAMPOO S&S 400ml CP",         status: "CP Pack", priceActive: true,  mrp: "249", ean: "8901491350099", grammage: "400ml", caseConfig: "12", priceStart: "01-Nov-24", priceEnd: "31-Dec-24" },
    ],
  },
  {
    id: "bp7", basepakName: "SURF EXCEL EASY WASH", basepackCode: "13337",
    salesCategory: "HC", brand: "Surf Excel", cluster: "Rajasthan Cluster", channel: "MT",
    mstnStatus: "Partial", mstnCoverage: 65, bpStatus: "Active Pack",
    networkPlanner: "Ravi Kumar", paidBibleOwner: "Priya Sharma",
    materials: [
      { code: "SUHD1R4", description: "SURF EXCEL EW 1KG", status: "OK",    priceActive: true,  mrp: "120", ean: "8901491210001", grammage: "1kg",  caseConfig: "12", priceStart: "01-Apr-24", priceEnd: "9999" },
      { code: "SUHD1R5", description: "SURF EXCEL EW 2KG", status: "OK",    priceActive: true,  mrp: "230", ean: "8901491210018", grammage: "2kg",  caseConfig: "6",  priceStart: "01-Apr-24", priceEnd: "9999" },
      { code: "SUHD1R2", description: "SURF EXCEL EW 500G", status: "Issue",priceActive: false, mrp: "65",  ean: "8901491209994", grammage: "500g", caseConfig: "24", priceStart: "01-Apr-24", priceEnd: "31-Mar-24" },
      { code: "SUHD1R3", description: "SURF EXCEL EW 250G", status: "Issue",priceActive: false, mrp: "35",  ean: "8901491209987", grammage: "250g", caseConfig: "48", priceStart: "01-Apr-24", priceEnd: "31-Mar-24" },
    ],
  },
];

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
    matStatus: "In Progress", region: "East", cluster: "West Bengal", state: "W Bengal", regionCode: "E01",
    depot: "KOL-01", mrp: "175", netWt: "500", cc: "8", ean: "8901058018021",
    csd: "N", gt: "Y", ka: "Y", oh: "N", mt: "Y", retail: "Y", ecom: "N", qcom: "N",
    priceStart: "-", priceEnd: "-", createdOn: "-",
  },
];

const TRIGGERS = [
  { id: 1, name: "Price Inactive", count: 4, rule: "MSTN coverage > 80% but price inactive for respective channel", stakeholder: "Network Planner", severity: "high" },
  { id: 2, name: "SLOB Risk",      count: 2, rule: "DOH in Copy CBU > 5 days compared to DOH of new CBU",           stakeholder: "Availability Planner", severity: "medium" },
];

const AMENDMENTS = [
  {
    id: 1, name: "GEO Extension Applicability",
    rule: "Year (YYYY) from end date of region ≠ 9999 + 80% cover from NSA at CBU depot level",
    amendedBy: "Brand / CSP Team", approvedBy: "NCSM",
    actions: ["Network Planner", "Supply Planner", "Distribution Planner"],
    count: 3, color: "blue",
  },
  {
    id: 2, name: "Channel Extension",
    rule: "Distribution channel = 'N' + Estimates built in DP tool for the channel",
    amendedBy: "Brand / CSP Team", approvedBy: "NCSM",
    actions: ["Network Planner", "Supply Planner", "Distribution Planner"],
    count: 1, color: "violet",
  },
  {
    id: 3, name: "Centralized / Decentralized Mapping",
    rule: "Data from Listing Master — service capability at cluster–state–depot level",
    amendedBy: "Brand / CSP Team", approvedBy: "NCSM",
    actions: ["Network Planner", "Supply Planner", "Distribution Planner"],
    count: 2, color: "amber",
  },
  {
    id: 4, name: "Basepack Status",
    rule: "Based on logic defined in Basepack Status table (Active/Inactive/Seasonal/Stock Base Delisting)",
    amendedBy: "Brand / CSP Team", approvedBy: "NCSM",
    actions: ["Network Planner", "Supply Planner", "Distribution Planner"],
    count: 5, color: "red",
  },
];

// ─── Status Helpers ──────────────────────────────────────────────────────────

function MatStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: JSX.Element }> = {
    "OK":          { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",  icon: <CheckCircle2 className="h-3 w-3" /> },
    "Issue":       { cls: "bg-red-50 text-red-700 border-red-200",              icon: <XCircle className="h-3 w-3" /> },
    "In Progress": { cls: "bg-amber-50 text-amber-700 border-amber-200",        icon: <Clock className="h-3 w-3" /> },
    "CP Pack":     { cls: "bg-blue-50 text-blue-700 border-blue-200",           icon: <Package className="h-3 w-3" /> },
  };
  const s = map[status] ?? map["OK"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
}

function MstnBadge({ status, coverage }: { status: string; coverage: number }) {
  const map: Record<string, string> = {
    "Cleared":     "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Partial":     "bg-amber-50 text-amber-700 border-amber-200",
    "Pending":     "bg-slate-50 text-slate-600 border-slate-200",
    "Not Cleared": "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? map["Pending"]}`}>
        {status}
      </span>
      {coverage > 0 && (
        <span className="text-xs text-muted-foreground">{coverage}%</span>
      )}
    </div>
  );
}

function BpStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
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

function YNBadge({ val }: { val: string }) {
  return (
    <span className={`inline-block w-7 text-center text-xs font-semibold rounded px-1 py-0.5 ${val === "Y" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
      {val}
    </span>
  );
}

// ─── Part 1: Overview ────────────────────────────────────────────────────────

function OverviewTab() {
  const [search, setSearch]           = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [mstnFilter, setMstnFilter]   = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const allChannels = Array.from(new Set(BASEPACK_LIST.map(b => b.channel)));

  const filtered = BASEPACK_LIST.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.basepakName.toLowerCase().includes(q) ||
      b.basepackCode.includes(q) ||
      b.brand.toLowerCase().includes(q) ||
      b.networkPlanner.toLowerCase().includes(q) ||
      b.paidBibleOwner.toLowerCase().includes(q);
    const matchChannel = channelFilter === "all" || b.channel === channelFilter;
    const matchMstn    = mstnFilter === "all"    || b.mstnStatus === mstnFilter;
    return matchSearch && matchChannel && matchMstn;
  });

  // Stats
  const total      = BASEPACK_LIST.length;
  const cleared    = BASEPACK_LIST.filter(b => b.mstnStatus === "Cleared").length;
  const partial    = BASEPACK_LIST.filter(b => b.mstnStatus === "Partial").length;
  const issues     = BASEPACK_LIST.filter(b => b.mstnStatus === "Not Cleared" || b.mstnStatus === "Pending").length;
  const totalMats  = BASEPACK_LIST.reduce((acc, b) => acc + b.materials.length, 0);

  const statsCards = [
    { label: "Total Basepacks",  value: total,     color: "border-l-[#1f36c7] bg-[#1f36c7]/5" },
    { label: "MSTN Cleared",     value: cleared,   color: "border-l-emerald-500 bg-emerald-50/60" },
    { label: "Partial / WIP",    value: partial,   color: "border-l-amber-500 bg-amber-50/60" },
    { label: "Issues / Pending", value: issues,    color: "border-l-red-500 bg-red-50/60" },
    { label: "Total Materials",  value: totalMats, color: "border-l-[#0d8ecf] bg-[#0d8ecf]/5" },
  ];

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        {statsCards.map(c => (
          <Card key={c.label} className={`border-l-4 ${c.color}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by basepack, brand, planner…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-pb-search"
              />
              {search && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(v => !v)}
              data-testid="button-toggle-filters"
              className="gap-1.5"
            >
              <Filter className="h-4 w-4" /> Filters
              {(channelFilter !== "all" || mstnFilter !== "all") && (
                <span className="ml-1 bg-[#1f36c7] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {[channelFilter !== "all", mstnFilter !== "all"].filter(Boolean).length}
                </span>
              )}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-download-annexure">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-raise-ticket">
                <Ticket className="h-3.5 w-3.5" /> Raise Ticket
              </Button>
            </div>
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="flex items-end gap-4 mt-4 pt-4 border-t flex-wrap" data-testid="filters-panel">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Channel</label>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-36" data-testid="select-channel-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {allChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">MSTN Status</label>
                <Select value={mstnFilter} onValueChange={setMstnFilter}>
                  <SelectTrigger className="w-40" data-testid="select-mstn-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MSTN Status</SelectItem>
                    <SelectItem value="Cleared">Cleared</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Not Cleared">Not Cleared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(channelFilter !== "all" || mstnFilter !== "all") && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setChannelFilter("all"); setMstnFilter("all"); }}
                  data-testid="button-clear-filters"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basepack Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs font-semibold">Basepack Name</TableHead>
                  <TableHead className="text-xs font-semibold">Basepack Code</TableHead>
                  <TableHead className="text-xs font-semibold">Cluster</TableHead>
                  <TableHead className="text-xs font-semibold">Channel</TableHead>
                  <TableHead className="text-xs font-semibold">MSTN Status</TableHead>
                  <TableHead className="text-xs font-semibold">BP Status</TableHead>
                  <TableHead className="text-xs font-semibold">Network Planner</TableHead>
                  <TableHead className="text-xs font-semibold">PB Owner</TableHead>
                  <TableHead className="text-xs font-semibold w-20">Materials</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No basepacks found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : filtered.map(bp => (
                  <Fragment key={bp.id}>
                    {/* Basepack row */}
                    <TableRow
                      key={bp.id}
                      data-testid={`bp-row-${bp.id}`}
                      className={`cursor-pointer transition-colors ${expandedId === bp.id ? "bg-[#1f36c7]/5 border-l-2 border-l-[#1f36c7]" : "hover:bg-muted/40"}`}
                      onClick={() => toggleExpand(bp.id)}
                    >
                      <TableCell className="py-3 pl-4">
                        {expandedId === bp.id
                          ? <ChevronDown className="h-4 w-4 text-[#1f36c7]" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="py-3">
                        <div>
                          <p className="text-sm font-medium">{bp.basepakName}</p>
                          <p className="text-xs text-muted-foreground">{bp.salesCategory} · {bp.brand}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono font-medium py-3">{bp.basepackCode}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3">{bp.cluster}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="text-xs">{bp.channel}</Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <MstnBadge status={bp.mstnStatus} coverage={bp.mstnCoverage} />
                      </TableCell>
                      <TableCell className="py-3">
                        <BpStatusBadge status={bp.bpStatus} />
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#1f36c7]/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-[#1f36c7]" />
                          </div>
                          <span className="text-xs">{bp.networkPlanner}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#0d8ecf]/10 flex items-center justify-center">
                            <BookOpen className="h-3 w-3 text-[#0d8ecf]" />
                          </div>
                          <span className="text-xs">{bp.paidBibleOwner}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs text-muted-foreground">{bp.materials.length} CBU{bp.materials.length !== 1 ? "s" : ""}</span>
                      </TableCell>
                    </TableRow>

                    {/* Expanded materials sub-table */}
                    {expandedId === bp.id && (
                      <TableRow key={`${bp.id}-expanded`} data-testid={`bp-expanded-${bp.id}`}>
                        <TableCell colSpan={10} className="p-0 bg-muted/20">
                          <div className="px-8 py-4 border-l-2 border-l-[#1f36c7]/30">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                              Material Details — {bp.basepakName} ({bp.basepackCode}) · {bp.cluster} · {bp.channel}
                            </p>
                            <div className="rounded-md border overflow-hidden bg-white">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/40">
                                    <TableHead className="text-xs py-2">Material Code</TableHead>
                                    <TableHead className="text-xs py-2">Description</TableHead>
                                    <TableHead className="text-xs py-2">Status</TableHead>
                                    <TableHead className="text-xs py-2">Grammage</TableHead>
                                    <TableHead className="text-xs py-2">Case Config</TableHead>
                                    <TableHead className="text-xs py-2">MRP</TableHead>
                                    <TableHead className="text-xs py-2">EAN</TableHead>
                                    <TableHead className="text-xs py-2">Price Active</TableHead>
                                    <TableHead className="text-xs py-2">Price Start</TableHead>
                                    <TableHead className="text-xs py-2">Price End</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bp.materials.map((m, idx) => (
                                    <TableRow key={idx} data-testid={`material-row-${bp.id}-${idx}`}>
                                      <TableCell className="text-xs font-mono font-medium text-blue-600 py-2">{m.code}</TableCell>
                                      <TableCell className="text-xs py-2 max-w-52 truncate" title={m.description}>{m.description}</TableCell>
                                      <TableCell className="py-2"><MatStatusBadge status={m.status} /></TableCell>
                                      <TableCell className="text-xs py-2">{m.grammage}</TableCell>
                                      <TableCell className="text-xs py-2">{m.caseConfig}</TableCell>
                                      <TableCell className="text-xs font-medium py-2">₹{m.mrp}</TableCell>
                                      <TableCell className="text-xs font-mono text-muted-foreground py-2">{m.ean}</TableCell>
                                      <TableCell className="py-2">
                                        <span className={`text-xs font-semibold ${m.priceActive ? "text-emerald-600" : "text-red-500"}`}>
                                          {m.priceActive ? "Yes" : "No"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-xs py-2">{m.priceStart}</TableCell>
                                      <TableCell className={`text-xs font-medium py-2 ${m.priceEnd === "9999" ? "text-emerald-600" : m.priceEnd === "-" ? "text-muted-foreground" : "text-red-500"}`}>
                                        {m.priceEnd === "9999" ? "9999 (Perpetual)" : m.priceEnd}
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-amber-500" /> Triggers for Improvement
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {TRIGGERS.map(t => (
            <Card key={t.id} data-testid={`trigger-card-${t.id}`}
              className={`border-l-4 ${t.severity === "high" ? "border-l-red-400" : "border-l-amber-400"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {t.count} items
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{t.rule}</p>
                <p className="text-xs text-muted-foreground">Action: <span className="font-medium text-foreground">{t.stakeholder}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Network Updates</h2>
          <p className="text-xs text-muted-foreground">Auto-fetched from Listing Master · Restricted post 11th of every month</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> Last sync: 14-Oct, 09:30 AM
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-download-network">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            Relaunch Network
            <Badge className="ml-1 text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
              {RELAUNCH_NETWORKS.length} packs
            </Badge>
            <span className="ml-auto text-xs font-normal text-muted-foreground">Updated in last 2 weeks · Descending order</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Last Update</TableHead>
                  <TableHead className="text-xs">BG / Category</TableHead>
                  <TableHead className="text-xs">Brand</TableHead>
                  <TableHead className="text-xs">Basepack</TableHead>
                  <TableHead className="text-xs">Old CBU</TableHead>
                  <TableHead className="text-xs">New CBU</TableHead>
                  <TableHead className="text-xs">Grammage</TableHead>
                  <TableHead className="text-xs">MRP</TableHead>
                  <TableHead className="text-xs">Case Cfg</TableHead>
                  <TableHead className="text-xs">EAN</TableHead>
                  <TableHead className="text-xs">Artwork</TableHead>
                  <TableHead className="text-xs">Geography</TableHead>
                  <TableHead className="text-xs">Channels</TableHead>
                  <TableHead className="text-xs">Production</TableHead>
                  <TableHead className="text-xs">Invoicing</TableHead>
                  <TableHead className="text-xs">Remarks</TableHead>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            New Launch Network
            <Badge className="ml-1 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
              {NEW_LAUNCH_NETWORKS.length} packs
            </Badge>
            <span className="ml-auto text-xs font-normal text-muted-foreground">Innovation pipeline · Listing N-45 days · Descending by launch date</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Last Update</TableHead>
                  <TableHead className="text-xs">BG / Category</TableHead>
                  <TableHead className="text-xs">Brand</TableHead>
                  <TableHead className="text-xs">Basepack</TableHead>
                  <TableHead className="text-xs">Material Code</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Grammage</TableHead>
                  <TableHead className="text-xs">MRP</TableHead>
                  <TableHead className="text-xs">Case Config</TableHead>
                  <TableHead className="text-xs">EAN</TableHead>
                  <TableHead className="text-xs">Artwork / FTR</TableHead>
                  <TableHead className="text-xs">Geography</TableHead>
                  <TableHead className="text-xs">Channels</TableHead>
                  <TableHead className="text-xs">Production</TableHead>
                  <TableHead className="text-xs">Landing Date</TableHead>
                  <TableHead className="text-xs">Remarks</TableHead>
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
                      {r.artwork ? (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1 text-blue-600">
                          <FileText className="h-3 w-3" /> View FTR
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
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
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Part 3: Bible Matrix ────────────────────────────────────────────────────

function BibleMatrixTab() {
  const [search, setSearch] = useState("");

  const rows = BIBLE_MATRIX.filter(r =>
    !search ||
    r.basepack.includes(search) ||
    r.material.toLowerCase().includes(search.toLowerCase())
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
            <Input
              placeholder="Search basepack / material…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs w-52"
              data-testid="search-bible-matrix"
            />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-download-matrix">
            <Download className="h-3.5 w-3.5" /> Export Matrix
          </Button>
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
                  <TableHead className="text-xs py-2">Sales Cat.</TableHead>
                  <TableHead className="text-xs py-2">Basepack</TableHead>
                  <TableHead className="text-xs py-2">BP Status</TableHead>
                  <TableHead className="text-xs py-2">Material</TableHead>
                  <TableHead className="text-xs py-2 border-r">Mat. Status</TableHead>
                  <TableHead className="text-xs py-2">Region</TableHead>
                  <TableHead className="text-xs py-2">Cluster</TableHead>
                  <TableHead className="text-xs py-2">State</TableHead>
                  <TableHead className="text-xs py-2">Reg. Code</TableHead>
                  <TableHead className="text-xs py-2 border-r">Depot</TableHead>
                  <TableHead className="text-xs py-2">MRP</TableHead>
                  <TableHead className="text-xs py-2">Net Wt</TableHead>
                  <TableHead className="text-xs py-2">CC</TableHead>
                  <TableHead className="text-xs py-2 border-r">EAN</TableHead>
                  <TableHead className="text-xs py-2">CSD</TableHead>
                  <TableHead className="text-xs py-2">GT</TableHead>
                  <TableHead className="text-xs py-2">KA</TableHead>
                  <TableHead className="text-xs py-2">OH</TableHead>
                  <TableHead className="text-xs py-2">MT</TableHead>
                  <TableHead className="text-xs py-2">Retail</TableHead>
                  <TableHead className="text-xs py-2">MT-ECOM</TableHead>
                  <TableHead className="text-xs py-2 border-r">MT-QCOM</TableHead>
                  <TableHead className="text-xs py-2">Start Date</TableHead>
                  <TableHead className="text-xs py-2">End Date</TableHead>
                  <TableHead className="text-xs py-2">Created On</TableHead>
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
                    <TableCell><YNBadge val={r.csd} /></TableCell>
                    <TableCell><YNBadge val={r.gt} /></TableCell>
                    <TableCell><YNBadge val={r.ka} /></TableCell>
                    <TableCell><YNBadge val={r.oh} /></TableCell>
                    <TableCell><YNBadge val={r.mt} /></TableCell>
                    <TableCell><YNBadge val={r.retail} /></TableCell>
                    <TableCell><YNBadge val={r.ecom} /></TableCell>
                    <TableCell className="border-r"><YNBadge val={r.qcom} /></TableCell>
                    <TableCell className="text-xs">{r.priceStart}</TableCell>
                    <TableCell className={`text-xs font-medium ${r.priceEnd === "9999" ? "text-emerald-600" : r.priceEnd === "-" ? "text-muted-foreground" : "text-red-500"}`}>
                      {r.priceEnd === "9999" ? "9999 ∞" : r.priceEnd}
                    </TableCell>
                    <TableCell className="text-xs">{r.createdOn}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={25} className="text-center text-muted-foreground text-sm py-10">
                      No records match your search
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Part 4: Amendments ──────────────────────────────────────────────────────

const AMENDMENT_COLOR: Record<string, { bg: string; border: string; icon: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-600" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-600" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    icon: "text-red-600" },
};

function AmendmentsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Amendment Requests</h2>
          <p className="text-xs text-muted-foreground">
            All changes to existing packs require NCSM approval before reflecting in the Paid Bible Matrix
          </p>
        </div>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf]" data-testid="button-new-amendment">
          <ArrowUpRight className="h-3.5 w-3.5" /> Raise New Amendment
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {AMENDMENTS.map(a => {
          const colors = AMENDMENT_COLOR[a.color];
          return (
            <Card key={a.id} data-testid={`amendment-card-${a.id}`}
              className={`border ${colors.border} ${colors.bg}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Amendment {a.id}</p>
                    <h3 className="text-base font-bold">{a.name}</h3>
                  </div>
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full bg-white border ${colors.border} ${colors.icon}`}>
                    {a.count} pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  <span className="font-medium text-foreground">Rule: </span>{a.rule}
                </p>
                <div className="space-y-1.5 mb-4">
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Raised by: </span>{a.amendedBy}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Actions from: </span>{a.actions.join(", ")}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Approved by: </span>{a.approvedBy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white" data-testid={`button-view-amendment-${a.id}`}>
                    View Requests <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-white text-foreground hover:bg-muted" data-testid={`button-raise-amendment-${a.id}`}>
                    <Ticket className="h-3 w-3" /> Raise
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-0.5">Amendment Workflow</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Any changes / additions to existing packs raised through amendments require NCSM approval before they are reflected in the Paid Bible Matrix. Post-approval, the system automatically updates the Geo Applicability, Channel mapping, and Price status for the affected materials across all applicable depot combinations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PaidBiblePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnileverHeader module="paid-bible" />

      <main className="flex-1 px-6 py-6 max-w-[1600px] mx-auto w-full">
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
            data-testid="button-back-home"
          >
            ← All Modules
          </button>
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
                <Clock className="h-3 w-3" /> MOC: Oct 2024
              </Badge>
              <Button size="sm" variant="outline" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Sync Listing Master
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start mb-6 bg-muted/50 p-1" data-testid="tabs-paid-bible">
            <TabsTrigger value="overview" className="gap-2 text-sm" data-testid="tab-overview">
              Overview
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">Part 1</span>
            </TabsTrigger>
            <TabsTrigger value="network-updates" className="gap-2 text-sm" data-testid="tab-network-updates">
              Network Updates
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">Part 2</span>
            </TabsTrigger>
            <TabsTrigger value="bible-matrix" className="gap-2 text-sm" data-testid="tab-bible-matrix">
              Bible Matrix
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5">Part 3</span>
            </TabsTrigger>
            <TabsTrigger value="amendments" className="gap-2 text-sm" data-testid="tab-amendments">
              Amendments
              <Badge className="ml-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">11</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="network-updates"><NetworkUpdatesTab /></TabsContent>
          <TabsContent value="bible-matrix"><BibleMatrixTab /></TabsContent>
          <TabsContent value="amendments"><AmendmentsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
