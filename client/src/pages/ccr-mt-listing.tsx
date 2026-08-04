import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Zap, Download, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import type { NetworkEntry } from "@shared/schema";
import { NV_CODE_TO_CCR_CHAIN } from "@/lib/distribution-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  customerChain: string;
  coverageType: string;
  behaviourType: string;
};

type MtListingRow = {
  rowType: "predecessor" | "successor";
  customerChain: string;
  customerCode: string;
  cic: string | null;
  channel: string;
  depot: string | null;
  status: "MAPPED" | "INACTIVE";
  listingBased: boolean;
  scenarioLabel: "Listing-Based" | "Non-Listing";
  basepack: string | null;
  cbuCode: string;
};

type MtListingResponse = {
  successorCbu: {
    cbuCode: string;
    basepack: string;
    caseConfig: string;
    ean: string;
    netWeight: number;
    materialDescription: string;
  };
  predecessorCbu: {
    cbuCode: string;
    basepack?: string;
    caseConfig?: string;
    ean?: string;
    netWeight?: number;
    materialDescription?: string;
  };
  rows: MtListingRow[];
  error?: string;
};

type SapWorkflowStage = "requested" | "validated" | "error";

type SapWorkflowItem = {
  cbuCode: string;
  description: string;
  predecessorCode: string;
  customerChain: string;
  stage: SapWorkflowStage;
  actionDate: string;
  sapDoc: string;
  requestedBy: string;
  errorCode?: string;
  errorMessage?: string;
};

// ─── ATP mock-data helpers ────────────────────────────────────────────────────

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

const VALID_DAYS_BY_CHAIN: Record<string, number> = {
  "Blinkit": 90, "BigBasket": 108, "DMart": 120,
  "Reliance Smart": 120, "Swiggy Instamart": 90,
};

type AtpBatch = {
  customerCode: string;
  customerChain: string;
  depot: string;
  batch: string;
  productionDate: string;
  stockAgeDays: number;
  validDays: number;
  rawAtp: number;
  pricingValid: boolean;
  isFresh: boolean;
  freshAtp: number;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function generateAtpBatches(rows: MtListingRow[]): AtpBatch[] {
  const predRows = rows.filter(r => r.rowType === "predecessor");
  const today = new Date();
  const batches: AtpBatch[] = [];
  for (const row of predRows) {
    const validDays = VALID_DAYS_BY_CHAIN[row.customerChain] ?? 100;
    const baseKey = row.customerCode + (row.depot ?? "") + row.cbuCode;
    const pricingValid = (simpleHash(row.customerCode + "price") % 8) > 0;
    for (let b = 1; b <= 2; b++) {
      const bk = baseKey + String(b);
      const stockAge = 20 + (simpleHash(bk + "age") % 130);
      const rawAtp = 150 + (simpleHash(bk + "atp") % 750);
      const isFresh = pricingValid && stockAge <= validDays;
      const prodDate = new Date(today);
      prodDate.setDate(prodDate.getDate() - stockAge);
      batches.push({
        customerCode: row.customerCode, customerChain: row.customerChain,
        depot: row.depot ?? "—", batch: `B${String(b).padStart(3, "0")}`,
        productionDate: fmtDate(prodDate), stockAgeDays: stockAge, validDays,
        rawAtp, pricingValid, isFresh, freshAtp: isFresh ? rawAtp : 0,
      });
    }
  }
  return batches;
}

type Recommendation = { label: string; variant: "retain" | "monitor" | "successor" | "inactive" };
function getRecommendation(batches: AtpBatch[]): Recommendation {
  if (!batches.length) return { label: "No Data", variant: "inactive" };
  if (!batches[0].pricingValid) return { label: "Price Not Active", variant: "inactive" };
  const freshAtp = batches.reduce((s, b) => s + b.freshAtp, 0);
  if (freshAtp >= 400) return { label: "Retain Mapping", variant: "retain" };
  if (freshAtp > 0) return { label: "Monitor", variant: "monitor" };
  return { label: "Recommend Successor", variant: "successor" };
}
const REC_STYLES: Record<Recommendation["variant"], string> = {
  retain: "bg-emerald-100 text-emerald-700",
  monitor: "bg-amber-100 text-amber-700",
  successor: "bg-blue-100 text-blue-700",
  inactive: "bg-red-100 text-red-700",
};

// ─── SAP workflow mock data ───────────────────────────────────────────────────

const MOCK_REQUESTERS = ["omraan.z", "ankit.v", "priya.m", "rajan.k"];
const MOCK_ERRORS = [
  { code: "SAP-401", msg: "Material not found in receiving plant" },
  { code: "SAP-403", msg: "Price condition missing for customer" },
  { code: "SAP-301", msg: "Distribution channel mismatch" },
];

function mockActionDate(seed: string, daysAgo: number): string {
  const offset = (simpleHash(seed) % 7);
  const d = new Date();
  d.setDate(d.getDate() - (daysAgo + offset));
  return fmtDate(d);
}

function buildSapWorkflowItems(eligible: NetworkEntry[], customers: Customer[]): SapWorkflowItem[] {
  const items: SapWorkflowItem[] = [];
  const chainSet = new Set(customers.map(c => c.customerChain));
  for (const entry of eligible) {
    const cm = (entry as any).customerMapping;
    const chains = new Set<string>();
    if (cm && typeof cm === "object") {
      for (const codes of Object.values(cm)) {
        if (Array.isArray(codes)) {
          for (const code of codes) {
            const ch = NV_CODE_TO_CCR_CHAIN[code as string];
            if (ch && chainSet.has(ch)) chains.add(ch);
          }
        }
      }
    }
    if (chains.size === 0) continue;
    const h = simpleHash(entry.cbuCode ?? "");
    const stageIdx = h % 10;
    const stage: SapWorkflowStage = stageIdx <= 4 ? "requested" : stageIdx <= 7 ? "validated" : "error";
    for (const chain of chains) {
      const key = (entry.cbuCode ?? "") + chain;
      const reqIdx = simpleHash(key + "req") % MOCK_REQUESTERS.length;
      const errIdx = simpleHash(key + "err") % MOCK_ERRORS.length;
      items.push({
        cbuCode: entry.cbuCode ?? "",
        description: entry.materialDescription || entry.basepack || "",
        predecessorCode: (entry as any).predecessorCode ?? "—",
        customerChain: chain,
        stage,
        actionDate: stage === "requested" ? mockActionDate(key, 3)
          : stage === "validated" ? mockActionDate(key, 1)
          : mockActionDate(key, 2),
        sapDoc: `MT-${2024000 + (simpleHash(key) % 9999)}`,
        requestedBy: MOCK_REQUESTERS[reqIdx],
        errorCode: stage === "error" ? MOCK_ERRORS[errIdx].code : undefined,
        errorMessage: stage === "error" ? MOCK_ERRORS[errIdx].msg : undefined,
      });
    }
  }
  return items;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2, "Production Started": 3,
  "FTR Approved": 4, "Stock Movement Initiated": 5, "Network transition complete": 6,
};
const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

// ─── Shared sub-components ────────────────────────────────────────────────────

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "Draft";
  const high = ["FTR Approved", "Stock Movement Initiated", "Network transition complete"];
  const mid = ["Pricing Updated", "Production Started"];
  if (high.includes(s)) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">{s}</Badge>;
  if (mid.includes(s)) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">{s}</Badge>;
  if (s === "Active") return <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{s}</Badge>;
  return <Badge variant="outline" className="text-slate-500 text-xs">{s}</Badge>;
}

function TabTrigger({ value, label, count, countClass }: { value: string; label: string; count?: number; countClass?: string }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium whitespace-nowrap"
    >
      {label}
      {count != null && count > 0 && (
        <span className={`ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold ${countClass ?? "bg-muted text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

function ChainAccordion({ chainName, expanded, onToggle, count, children }: {
  chainName: string; expanded: boolean; onToggle: () => void; count: number; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={onToggle}
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="font-semibold text-sm text-foreground">{chainName}</span>
        <span className="ml-auto text-xs text-muted-foreground">{count} CBU{count !== 1 ? "s" : ""}</span>
      </button>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
}

// ─── Chain scenario derivation ────────────────────────────────────────────────

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National Listing";

function deriveChainScenario(chainRows: MtListingRow[]): ChainScenario {
  if (chainRows.length === 0) return "Regional Non-Listing";

  const predCics = new Set(chainRows.filter(r => r.rowType === "predecessor" && r.cic).map(r => r.cic!));
  const succCics = new Set(chainRows.filter(r => r.rowType === "successor" && r.cic).map(r => r.cic!));

  // National Listing: Successor inherits Predecessor's CIC — no new CIC required
  const hasSharedCic = [...predCics].some(c => succCics.has(c));
  if (hasSharedCic) return "National Listing";

  // Regional Listing: pred and succ coexist (listing-based channel)
  if (chainRows.some(r => r.listingBased)) return "Regional Listing";

  // Regional Non-Listing: pred deactivated as succ activates, possibly region by region
  return "Regional Non-Listing";
}

const SCENARIO_META: Record<ChainScenario, { badge: string; desc: string }> = {
  "Regional Listing": {
    badge: "bg-violet-100 text-violet-700 border border-violet-200",
    desc: "Successor and Predecessor are tagged to the same CIC and coexist in the listing",
  },
  "Regional Non-Listing": {
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    desc: "Predecessor is deactivated as Successor activates — may differ by region",
  },
  "National Listing": {
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    desc: "No new CIC required — Successor inherits Predecessor's CIC nationally",
  },
};

// ─── Expandable CBU row for Tab 1 ─────────────────────────────────────────────

function CbuMtRow({ entry, chain }: { entry: NetworkEntry; chain: string }) {
  const [expanded, setExpanded] = useState(false);
  const [innerTab, setInnerTab] = useState("listing");
  const cbuCode = entry.cbuCode ?? "";
  const predecessorCode = (entry as any).predecessorCode ?? "—";

  const { data: mtData, isLoading } = useQuery<MtListingResponse>({
    queryKey: ["/api/ccr/mt-listing", cbuCode],
    queryFn: () => fetch(`/api/ccr/mt-listing?cbu_code=${encodeURIComponent(cbuCode)}`).then(r => r.json()),
    enabled: expanded,
  });

  // Filter all derived data to the specific customer chain this row lives in
  const chainRows = useMemo(
    () => (mtData?.rows ?? []).filter(r => r.customerChain === chain),
    [mtData?.rows, chain],
  );

  const isListingChain = useMemo(() => chainRows.some(r => r.listingBased), [chainRows]);

  const atpBatches = useMemo(() => generateAtpBatches(chainRows), [chainRows]);
  const atpByCode = useMemo(() => {
    const map: Record<string, AtpBatch[]> = {};
    for (const b of atpBatches) {
      if (!map[b.customerCode]) map[b.customerCode] = [];
      map[b.customerCode].push(b);
    }
    return map;
  }, [atpBatches]);

  // Extract unique CICs from predecessor rows for this chain
  const predCics = useMemo(() => {
    const cics = [...new Set(chainRows.filter(r => r.rowType === "predecessor" && r.cic).map(r => r.cic!))];
    return cics.length ? cics.join(", ") : "—";
  }, [chainRows]);

  const chainScenario = useMemo(() => deriveChainScenario(chainRows), [chainRows]);

  function handleExport() {
    if (!mtData) return;
    const wb = XLSX.utils.book_new();
    const rows = chainRows.map(row => {
      const meta = row.rowType === "predecessor" ? mtData.predecessorCbu : mtData.successorCbu;
      return {
        "Type": row.rowType === "predecessor" ? "OLD" : "NEW",
        "Ship-to Party": row.customerCode, "Customer Chain": row.customerChain,
        "Material (CBU)": row.cbuCode, "Basepack": row.basepack ?? "",
        "CIC Code": row.cic ?? "", "Case Config": meta?.caseConfig ?? "",
        "EAN Code": meta?.ean ?? "", "Status": row.status === "INACTIVE" ? "Non-Geo" : row.status,
        "Plant": row.depot ?? "", "Scenario": row.scenarioLabel,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "MT Listing");
    XLSX.writeFile(wb, `MT_Listing_${cbuCode}_${chain.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <>
      {/* Summary row */}
      <TableRow
        onClick={() => setExpanded(v => !v)}
        className="cursor-pointer hover:bg-muted/20"
        data-testid={`row-cbu-${cbuCode}`}
      >
        <TableCell className="w-8 py-3 pl-6">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </TableCell>
        <TableCell className="py-3">
          <span className="font-mono text-xs font-semibold text-foreground">{cbuCode}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">{entry.typeOfNetwork ?? "—"}</div>
        </TableCell>
        <TableCell className="py-3 max-w-[220px]">
          <span className="text-xs truncate block">{entry.materialDescription || (entry as any).basepackDescription || "—"}</span>
        </TableCell>
        <TableCell className="py-3 text-xs">{entry.brand || "—"}</TableCell>
        <TableCell className="py-3">
          <span className="font-mono text-xs text-muted-foreground">{predecessorCode}</span>
        </TableCell>
        <TableCell className="py-3 text-xs font-mono text-muted-foreground">{entry.basepack || "—"}</TableCell>
        <TableCell className="py-3">
          {/* Show CIC once loaded, dash until then */}
          <span className="text-xs font-mono">
            {expanded && mtData ? predCics : "—"}
          </span>
        </TableCell>
        <TableCell className="py-3">
          <NetworkStatusBadge status={entry.networkStatus} />
        </TableCell>
        <TableCell className="py-3">
          {expanded && chainRows.length > 0 ? (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SCENARIO_META[chainScenario].badge}`}>
              {chainScenario}
            </span>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>

      {/* Expanded detail */}
      {expanded && (
        <TableRow className="bg-muted/5 hover:bg-muted/5">
          <TableCell colSpan={9} className="p-0 pb-4 border-b">
            {isLoading ? (
              <div className="px-8 pt-4 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : !mtData || mtData.error ? (
              <div className="px-8 py-6 text-sm text-muted-foreground">{mtData?.error ?? "No MT listing data."}</div>
            ) : chainRows.length === 0 ? (
              <div className="px-8 py-6 text-sm text-muted-foreground">No MT listing rows for {chain} — configure the predecessor CBU first.</div>
            ) : (
              <div className="px-6 pt-3 space-y-3">
                {/* Scenario banner */}
                <div className={`flex items-start gap-3 rounded-md px-4 py-2.5 text-xs ${SCENARIO_META[chainScenario].badge}`}>
                  <span className="font-semibold whitespace-nowrap">{chainScenario}</span>
                  <span className="opacity-80">{SCENARIO_META[chainScenario].desc}</span>
                </div>

                {/* Predecessor → Successor summary strip */}
                <div className="flex flex-wrap gap-6 text-xs bg-background rounded-md px-4 py-3 border">
                  <div>
                    <span className="text-muted-foreground">Predecessor CBU</span>
                    <p className="font-mono font-semibold mt-0.5">{mtData.predecessorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5 truncate max-w-[180px]">{mtData.predecessorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Predecessor EAN</span>
                    <p className="font-mono font-semibold mt-0.5">{mtData.predecessorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Case Config</span>
                    <p className="font-semibold mt-0.5">{mtData.predecessorCbu?.caseConfig ?? "—"}</p>
                  </div>
                  <div className="border-l pl-6">
                    <span className="text-muted-foreground">Successor CBU</span>
                    <p className="font-mono font-semibold mt-0.5">{mtData.successorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5 truncate max-w-[180px]">{mtData.successorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Successor EAN</span>
                    <p className="font-mono font-semibold mt-0.5">{mtData.successorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Case Config</span>
                    <p className="font-semibold mt-0.5">{mtData.successorCbu?.caseConfig ?? "—"}</p>
                  </div>
                </div>

                {/* MT Listing / ATP tabs */}
                <Tabs value={innerTab} onValueChange={setInnerTab}>
                  <div className="flex items-center justify-between">
                    <TabsList className="h-8">
                      <TabsTrigger value="listing" className="text-xs h-7 px-3 gap-1.5">
                        <List className="h-3 w-3" /> MT Listing
                      </TabsTrigger>
                      {isListingChain && (
                        <TabsTrigger value="atp" className="text-xs h-7 px-3 gap-1.5">
                          <Zap className="h-3 w-3" /> ATP Criteria
                        </TabsTrigger>
                      )}
                    </TabsList>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleExport}>
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  </div>

                  {/* MT Listing table — scoped to this chain */}
                  <TabsContent value="listing" className="mt-2">
                    <div className="overflow-x-auto border rounded-md">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold w-[5%]">Type</TableHead>
                            <TableHead className="text-xs font-semibold w-[12%]">Ship-to Party</TableHead>
                            <TableHead className="text-xs font-semibold w-[12%]">CBU</TableHead>
                            <TableHead className="text-xs font-semibold w-[10%]">Basepack</TableHead>
                            <TableHead className="text-xs font-semibold w-[13%]">CIC Code</TableHead>
                            <TableHead className="text-xs font-semibold w-[9%]">Case Config</TableHead>
                            <TableHead className="text-xs font-semibold w-[12%]">EAN</TableHead>
                            <TableHead className="text-xs font-semibold text-center w-[10%]">Status</TableHead>
                            <TableHead className="text-xs font-semibold w-[8%]">Plant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chainRows.map((row) => {
                            const isPred = row.rowType === "predecessor";
                            const meta = isPred ? mtData!.predecessorCbu : mtData!.successorCbu;
                            return (
                              <TableRow
                                key={`${row.customerCode}-${row.rowType}`}
                                className={isPred ? row.status === "INACTIVE" ? "bg-red-50/60" : "" : "bg-emerald-50/50"}
                              >
                                <TableCell className="py-2">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPred ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                                    {isPred ? "OLD" : "NEW"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2">{row.customerCode}</TableCell>
                                <TableCell className="text-xs font-mono py-2 truncate">{row.cbuCode}</TableCell>
                                <TableCell className="text-xs font-mono py-2">{row.basepack ?? "—"}</TableCell>
                                <TableCell className="text-xs font-mono py-2">{row.cic ?? "—"}</TableCell>
                                <TableCell className="text-xs py-2">{meta?.caseConfig ?? "—"}</TableCell>
                                <TableCell className="text-xs font-mono py-2">{meta?.ean ?? "—"}</TableCell>
                                <TableCell className="text-center py-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === "MAPPED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                    {row.status === "INACTIVE" ? "Non-Geo" : row.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-mono py-2">{row.depot ?? "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* ATP Criteria tab */}
                  {isListingChain && (
                    <TabsContent value="atp" className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-start gap-3 text-xs bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
                        <div className="flex items-start gap-1.5 text-blue-700">
                          <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="font-medium">Auto-CCR ATP Criteria</span>
                        </div>
                        <span className="text-blue-600">
                          Evaluated at <span className="font-mono">Customer Code × CBU × Depot × Batch</span>. Freshness = Current Date − Production Date ≤ Valid Days.
                        </span>
                      </div>
                      <div className="overflow-x-auto border rounded-md">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="text-xs font-semibold">Depot</TableHead>
                              <TableHead className="text-xs font-semibold">Batch</TableHead>
                              <TableHead className="text-xs font-semibold">Prod Date</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Stock Age</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Valid Days</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Freshness</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Raw ATP</TableHead>
                              <TableHead className="text-xs font-semibold text-center">Price Check</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Fresh ATP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(atpByCode).flatMap(([code, batches]) => {
                              const rec = getRecommendation(batches);
                              const totalFreshAtp = batches.reduce((s, b) => s + b.freshAtp, 0);
                              const recCbu = rec.variant === "successor" ? mtData.successorCbu : mtData.predecessorCbu;
                              const chain = batches[0]?.customerChain ?? "";
                              return [
                                <TableRow key={`${code}-hdr`} className="bg-slate-50 border-t-2 border-t-slate-200">
                                  <TableCell colSpan={9} className="py-2 px-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-xs font-semibold font-mono">{code}</span>
                                      <span className="text-[10px] text-muted-foreground">{chain}</span>
                                      <span className="text-muted-foreground/40">|</span>
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REC_STYLES[rec.variant]}`}>{rec.label}</span>
                                      <span className="text-muted-foreground/40">|</span>
                                      <span className="text-[10px] text-muted-foreground">Recommended CBU</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rec.variant === "successor" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                        {rec.variant === "successor" ? "NEW" : "OLD"}
                                      </span>
                                      <span className="text-xs font-mono font-semibold">{recCbu?.cbuCode ?? "—"}</span>
                                      <div className="ml-auto flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground">Total Fresh ATP</span>
                                        <span className={`text-xs font-semibold ${totalFreshAtp >= 400 ? "text-emerald-700" : totalFreshAtp > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                          {totalFreshAtp > 0 ? totalFreshAtp.toLocaleString() : "—"}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>,
                                ...batches.map(b => (
                                  <TableRow key={`${code}-${b.batch}`} className={b.isFresh ? "bg-emerald-50/40" : b.pricingValid ? "bg-orange-50/30" : "bg-red-50/30"}>
                                    <TableCell className="text-xs font-mono py-2 pl-6 text-muted-foreground">{b.depot}</TableCell>
                                    <TableCell className="text-xs font-mono py-2">{b.batch}</TableCell>
                                    <TableCell className="text-xs py-2">{b.productionDate}</TableCell>
                                    <TableCell className="text-xs text-right py-2">
                                      <span className={b.stockAgeDays > b.validDays ? "text-red-600 font-medium" : ""}>{b.stockAgeDays}d</span>
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-2 text-muted-foreground">{b.validDays}d</TableCell>
                                    <TableCell className="text-center py-2">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${b.isFresh ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                                        {b.isFresh ? "Fresh" : "Non-Fresh"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-mono py-2">{b.rawAtp.toLocaleString()}</TableCell>
                                    <TableCell className="text-center py-2">
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${b.pricingValid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {b.pricingValid ? "Valid" : "Invalid"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-mono py-2">
                                      <span className={b.freshAtp > 0 ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
                                        {b.freshAtp > 0 ? b.freshAtp.toLocaleString() : "—"}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )),
                              ];
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingPage() {
  const [mainTab, setMainTab] = useState<string>("mt-output");
  const [expandedTab1, setExpandedTab1] = useState<Set<string>>(new Set());
  const [expandedRequested, setExpandedRequested] = useState<Set<string>>(new Set());
  const [expandedValidated, setExpandedValidated] = useState<Set<string>>(new Set());
  const [expandedError, setExpandedError] = useState<Set<string>>(new Set());

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/ccr/customers"],
  });

  // Eligible relaunch CBUs
  const eligibleEntries = useMemo(
    () => networkEntries.filter(e =>
      (RELAUNCH_TYPES.has(e.typeOfNetwork ?? "") || e.typeOfNetwork === "EXTENSION" || e.typeOfNetwork === "Extension")
      && !!(e as any).predecessorCode
      && (STATUS_IDX[e.networkStatus ?? ""] ?? 0) >= STATUS_IDX["FTR Approved"]
    ),
    [networkEntries],
  );

  // Group eligible entries by customer chain
  const eligibleByChain = useMemo(() => {
    const chainSet = new Set(customers.map(c => c.customerChain));
    const map: Record<string, NetworkEntry[]> = {};
    for (const entry of eligibleEntries) {
      const cm = (entry as any).customerMapping;
      const chains = new Set<string>();
      if (cm && typeof cm === "object") {
        for (const codes of Object.values(cm)) {
          if (Array.isArray(codes)) {
            for (const code of codes) {
              const ch = NV_CODE_TO_CCR_CHAIN[code as string];
              if (ch && chainSet.has(ch)) chains.add(ch);
            }
          }
        }
      }
      for (const chain of chains) {
        if (!map[chain]) map[chain] = [];
        map[chain].push(entry);
      }
    }
    return map;
  }, [eligibleEntries, customers]);

  // SAP workflow mock data
  const sapItems = useMemo(() => buildSapWorkflowItems(eligibleEntries, customers), [eligibleEntries, customers]);
  const sapRequested = useMemo(() => sapItems.filter(i => i.stage === "requested"), [sapItems]);
  const sapValidated = useMemo(() => sapItems.filter(i => i.stage === "validated"), [sapItems]);
  const sapError = useMemo(() => sapItems.filter(i => i.stage === "error"), [sapItems]);

  function groupByChain(items: SapWorkflowItem[]) {
    const map: Record<string, SapWorkflowItem[]> = {};
    for (const item of items) {
      if (!map[item.customerChain]) map[item.customerChain] = [];
      map[item.customerChain].push(item);
    }
    return map;
  }
  const requestedByChain = useMemo(() => groupByChain(sapRequested), [sapRequested]);
  const validatedByChain = useMemo(() => groupByChain(sapValidated), [sapValidated]);
  const errorByChain = useMemo(() => groupByChain(sapError), [sapError]);

  function toggleAccordion(set: Set<string>, setFn: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setFn(next);
  }

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">MT Listing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Successor-predecessor CBU updates required as part of the CCR MT listing ruleset
          </p>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <div className="border-b border-border">
            <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 justify-start rounded-none overflow-x-auto flex-shrink-0">
              <TabTrigger value="mt-output" label="MT Listing Output" count={eligibleEntries.length} countClass="bg-blue-100 text-blue-700" />
              <TabTrigger value="sap-requested" label="Requested for SAP Update" count={sapRequested.length} countClass="bg-amber-100 text-amber-700" />
              <TabTrigger value="sap-validated" label="Validated / Posted in SAP" count={sapValidated.length} countClass="bg-emerald-100 text-emerald-700" />
              <TabTrigger value="sap-error" label="Error returned by SAP" count={sapError.length} countClass="bg-red-100 text-red-700" />
            </TabsList>
          </div>

          {/* ══ Tab 1: MT Listing Output ══════════════════════════════════════ */}
          <TabsContent value="mt-output" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {entriesLoading ? (
                  <div className="p-6 space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : Object.keys(eligibleByChain).length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    No eligible relaunch CBUs found (requires FTR Approved or later and a predecessor).
                  </div>
                ) : (
                  Object.entries(eligibleByChain).map(([chain, entries]) => (
                    <ChainAccordion
                      key={chain}
                      chainName={chain}
                      expanded={expandedTab1.has(chain)}
                      onToggle={() => toggleAccordion(expandedTab1, setExpandedTab1, chain)}
                      count={entries.length}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableHead className="w-8 pl-6" />
                            <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Description</TableHead>
                            <TableHead className="text-xs font-semibold">Brand</TableHead>
                            <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Basepack</TableHead>
                            <TableHead className="text-xs font-semibold">CIC (Predecessor)</TableHead>
                            <TableHead className="text-xs font-semibold">Network Status</TableHead>
                            <TableHead className="text-xs font-semibold">Scenario</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map(entry => (
                            <CbuMtRow key={entry.cbuCode} entry={entry} chain={chain} />
                          ))}
                        </TableBody>
                      </Table>
                    </ChainAccordion>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Tab 2: Requested for SAP Update ══════════════════════════════ */}
          <TabsContent value="sap-requested" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {sapRequested.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No MT listing updates requested for SAP yet.</div>
                ) : (
                  Object.entries(requestedByChain).map(([chain, items]) => (
                    <ChainAccordion key={chain} chainName={chain} expanded={expandedRequested.has(chain)}
                      onToggle={() => toggleAccordion(expandedRequested, setExpandedRequested, chain)} count={items.length}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Description</TableHead>
                            <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Requested On</TableHead>
                            <TableHead className="text-xs font-semibold">SAP Document</TableHead>
                            <TableHead className="text-xs font-semibold">Requested By</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={`${item.cbuCode}-${item.customerChain}`}>
                              <TableCell className="text-xs font-mono py-2">{item.cbuCode}</TableCell>
                              <TableCell className="text-xs py-2 max-w-[200px] truncate">{item.description || "—"}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-muted-foreground">{item.predecessorCode}</TableCell>
                              <TableCell className="text-xs py-2">{item.actionDate}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-muted-foreground">{item.sapDoc}</TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">{item.requestedBy}</TableCell>
                              <TableCell className="text-center py-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  <Clock className="h-2.5 w-2.5" /> Pending
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ChainAccordion>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Tab 3: Validated / Posted in SAP ═════════════════════════════ */}
          <TabsContent value="sap-validated" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {sapValidated.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No MT listing updates validated and posted in SAP yet.</div>
                ) : (
                  Object.entries(validatedByChain).map(([chain, items]) => (
                    <ChainAccordion key={chain} chainName={chain} expanded={expandedValidated.has(chain)}
                      onToggle={() => toggleAccordion(expandedValidated, setExpandedValidated, chain)} count={items.length}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Description</TableHead>
                            <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Posted On</TableHead>
                            <TableHead className="text-xs font-semibold">SAP Document</TableHead>
                            <TableHead className="text-xs font-semibold">Posted By</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={`${item.cbuCode}-${item.customerChain}`}>
                              <TableCell className="text-xs font-mono py-2">{item.cbuCode}</TableCell>
                              <TableCell className="text-xs py-2 max-w-[200px] truncate">{item.description || "—"}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-muted-foreground">{item.predecessorCode}</TableCell>
                              <TableCell className="text-xs py-2">{item.actionDate}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-blue-700">{item.sapDoc}</TableCell>
                              <TableCell className="text-xs py-2 text-muted-foreground">{item.requestedBy}</TableCell>
                              <TableCell className="text-center py-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Posted
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ChainAccordion>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Tab 4: Error returned by SAP ════════════════════════════════ */}
          <TabsContent value="sap-error" className="mt-5">
            <Card>
              <CardContent className="p-0">
                {sapError.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No SAP errors recorded.</div>
                ) : (
                  Object.entries(errorByChain).map(([chain, items]) => (
                    <ChainAccordion key={chain} chainName={chain} expanded={expandedError.has(chain)}
                      onToggle={() => toggleAccordion(expandedError, setExpandedError, chain)} count={items.length}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Description</TableHead>
                            <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                            <TableHead className="text-xs font-semibold">Error On</TableHead>
                            <TableHead className="text-xs font-semibold">SAP Document</TableHead>
                            <TableHead className="text-xs font-semibold">Error Code</TableHead>
                            <TableHead className="text-xs font-semibold">Error Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={`${item.cbuCode}-${item.customerChain}`} className="bg-red-50/30">
                              <TableCell className="text-xs font-mono py-2">{item.cbuCode}</TableCell>
                              <TableCell className="text-xs py-2 max-w-[200px] truncate">{item.description || "—"}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-muted-foreground">{item.predecessorCode}</TableCell>
                              <TableCell className="text-xs py-2">{item.actionDate}</TableCell>
                              <TableCell className="text-xs font-mono py-2 text-muted-foreground">{item.sapDoc}</TableCell>
                              <TableCell className="text-xs py-2"><span className="font-mono text-red-700 font-semibold">{item.errorCode}</span></TableCell>
                              <TableCell className="text-xs py-2 text-red-700">
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />{item.errorMessage}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ChainAccordion>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
