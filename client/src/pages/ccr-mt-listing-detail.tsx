import { useMemo } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Zap, ArrowLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { NetworkEntry } from "@shared/schema";
import { NV_CODE_TO_CCR_CHAIN } from "@/lib/distribution-data";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  successorCbu?: {
    cbuCode: string; basepack: string; caseConfig: string;
    ean: string; netWeight: number; materialDescription: string;
  };
  predecessorCbu?: {
    cbuCode: string; basepack?: string; caseConfig?: string;
    ean?: string; netWeight?: number; materialDescription?: string;
  };
  rows: MtListingRow[];
  error?: string;
};

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National Non-Listing";

const CHAIN_SCENARIO_MAP: Record<string, ChainScenario> = {
  "Amazon":           "National",
  "Big Bazaar":       "National",
  "BigBasket":        "National",
  "Cloud Tail":       "National",
  "Flipkart":         "National",
  "JioMart":          "National",
  "Metro C&C":        "National",
  "Swiggy Instamart": "National",
  "Blinkit":          "Regional Non-Listing",
  "DMart":            "Regional Non-Listing",
  "Reliance Smart":   "Regional Non-Listing",
  "Lulu Hypermarket": "Regional Listing",
  "Metro Cash & Carry": "Regional Listing",
};

function chainScenarioFromName(chain: string): ChainScenario {
  return CHAIN_SCENARIO_MAP[chain] ?? "Regional Non-Listing";
}

const SCENARIO_META: Record<ChainScenario, { badge: string; pill: string; desc: string }> = {
  "Regional Listing": {
    badge: "bg-violet-50 border-violet-200",
    pill:  "bg-violet-100 text-violet-700 border border-violet-200",
    desc:  "Both Successor and Predecessor are tagged to the same CIC and coexist in the listing",
  },
  "Regional Non-Listing": {
    badge: "bg-amber-50 border-amber-200",
    pill:  "bg-amber-100 text-amber-700 border border-amber-200",
    desc:  "Predecessor is deactivated as Successor activates — may vary by region",
  },
  "National": {
    badge: "bg-blue-50 border-blue-200",
    pill:  "bg-blue-100 text-blue-700 border border-blue-200",
    desc:  "No new CIC required — Successor inherits Predecessor's CIC nationally",
  },
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
  customerCode: string; customerChain: string; depot: string; batch: string;
  productionDate: string; stockAgeDays: number; validDays: number;
  rawAtp: number; pricingValid: boolean; isFresh: boolean; freshAtp: number;
  cbuType: "OLD" | "NEW"; cbuCode: string;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// Synthetic depot codes used when no real MT-listing rows are available (e.g. National chains).
const SYNTHETIC_DEPOTS = ["VABH", "DLGH", "ABDH", "SRDH", "HBDH"];
const SYNTHETIC_CHAIN_CODES: Record<string, string[]> = {
  "BigBasket":        ["BBK-MH-001", "BBK-KA-001", "BBK-DL-001"],
  "Swiggy Instamart": ["SWG-MH-001", "SWG-KA-001"],
  "Blinkit":          ["BLK-MH-001", "BLK-DL-001"],
  "DMart":            ["DMT-MH-001", "DMT-GJ-001"],
  "Reliance Smart":   ["RLS-MH-001"],
};

function makeBatches(
  rows: MtListingRow[],
  cbuType: "OLD" | "NEW",
): AtpBatch[] {
  const today = new Date();
  const batches: AtpBatch[] = [];
  for (const row of rows) {
    const validDays = VALID_DAYS_BY_CHAIN[row.customerChain] ?? 100;
    const baseKey = row.customerCode + (row.depot ?? "") + row.cbuCode + cbuType;
    const pricingValid = (simpleHash(row.customerCode + cbuType + "price") % 8) > 0;
    for (let b = 1; b <= 2; b++) {
      const bk = baseKey + String(b);
      const stockAge = 20 + (simpleHash(bk + "age") % 130);
      const rawAtp = 150 + (simpleHash(bk + "atp") % 750);
      const isFresh = pricingValid && stockAge <= validDays;
      const prodDate = new Date(today);
      prodDate.setDate(prodDate.getDate() - stockAge);
      batches.push({
        customerCode: row.customerCode, customerChain: row.customerChain,
        cbuCode: row.cbuCode, cbuType,
        depot: row.depot ?? "—", batch: `B${String(b).padStart(3, "0")}`,
        productionDate: fmtDate(prodDate), stockAgeDays: stockAge, validDays,
        rawAtp, pricingValid, isFresh, freshAtp: isFresh ? rawAtp : 0,
      });
    }
  }
  return batches;
}

function generateAtpBatches(rows: MtListingRow[], fallbackChain?: string, fallbackCbu?: string): AtpBatch[] {
  let predRows = rows.filter(r => r.rowType === "predecessor");
  let succRows = rows.filter(r => r.rowType === "successor");

  // Synthesise entries when no real MT-listing rows exist (e.g. National chains).
  if (predRows.length === 0 && fallbackChain && fallbackCbu) {
    const codes = SYNTHETIC_CHAIN_CODES[fallbackChain] ?? ["CUST-001"];
    const depot = SYNTHETIC_DEPOTS[simpleHash(fallbackCbu) % SYNTHETIC_DEPOTS.length];
    predRows = codes.map(code => ({
      rowType: "predecessor" as const, customerCode: code, customerChain: fallbackChain,
      cbuCode: fallbackCbu, depot, listingBased: false,
    } as MtListingRow));
  }
  if (succRows.length === 0 && fallbackChain && fallbackCbu) {
    const codes = SYNTHETIC_CHAIN_CODES[fallbackChain] ?? ["CUST-001"];
    const depot = SYNTHETIC_DEPOTS[simpleHash(fallbackCbu + "s") % SYNTHETIC_DEPOTS.length];
    succRows = codes.map(code => ({
      rowType: "successor" as const, customerCode: code, customerChain: fallbackChain,
      cbuCode: fallbackCbu, depot, listingBased: false,
    } as MtListingRow));
  }

  return [...makeBatches(predRows, "OLD"), ...makeBatches(succRows, "NEW")];
}

type AtpGroup = { customerChain: string; old: AtpBatch[]; new: AtpBatch[] };

// Group batches by customerCode, split into OLD vs NEW.
function groupAtpByCode(batches: AtpBatch[]): Record<string, AtpGroup> {
  const map: Record<string, AtpGroup> = {};
  for (const b of batches) {
    if (!map[b.customerCode]) map[b.customerCode] = { customerChain: b.customerChain, old: [], new: [] };
    if (b.cbuType === "OLD") map[b.customerCode].old.push(b);
    else map[b.customerCode].new.push(b);
  }
  return map;
}

// Recommended CBU is whichever side has the higher total fresh ATP; ties go to NEW.
type RecVariant = "old" | "new";
function pickRecommended(oldBatches: AtpBatch[], newBatches: AtpBatch[]): RecVariant {
  const oldFresh = oldBatches.reduce((s, b) => s + b.freshAtp, 0);
  const newFresh = newBatches.reduce((s, b) => s + b.freshAtp, 0);
  return newFresh >= oldFresh ? "new" : "old";
}

const REC_STYLES: Record<RecVariant, string> = {
  old: "bg-slate-100 text-slate-700",
  new: "bg-emerald-100 text-emerald-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingDetailPage() {
  const params = useParams<{ cbuCode: string }>();
  const cbuCode = params.cbuCode ?? "";
  const searchStr = useSearch();
  const chain = new URLSearchParams(searchStr).get("chain") ?? "";
  const [, navigate] = useLocation();

  const scenario = chain ? chainScenarioFromName(chain) : undefined;
  const scenarioMeta = scenario ? SCENARIO_META[scenario] : null;

  const { data: mtData, isLoading } = useQuery<MtListingResponse>({
    queryKey: ["/api/ccr/mt-listing", cbuCode],
    queryFn: () => fetch(`/api/ccr/mt-listing?cbu_code=${encodeURIComponent(cbuCode)}`).then(r => r.json()),
    enabled: !!cbuCode,
  });

  // Filter rows to the chain specified in the URL
  const chainRows = useMemo(
    () => (mtData?.rows ?? []).filter(r => !chain || r.customerChain === chain),
    [mtData?.rows, chain],
  );

  const isListingChain = useMemo(() => chainRows.some(r => r.listingBased), [chainRows]);
  const atpBatches = useMemo(() => generateAtpBatches(chainRows, chain, cbuCode), [chainRows, chain, cbuCode]);
  const atpByCode = useMemo(() => groupAtpByCode(atpBatches), [atpBatches]);

  const predCics = useMemo(() => {
    const cics = [...new Set(chainRows.filter(r => r.rowType === "predecessor" && r.cic).map(r => r.cic!))];
    return cics.length ? cics.join(", ") : "—";
  }, [chainRows]);

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
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* ── Breadcrumb / back ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => navigate("/ccr/mt-listing")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            MT Listing
          </Button>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs text-muted-foreground font-mono">{cbuCode}</span>
          {chain && <span className="text-muted-foreground/40 text-xs">/</span>}
          {chain && <span className="text-xs text-muted-foreground">{chain}</span>}
        </div>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground font-mono">{cbuCode}</h2>
              {chain && scenarioMeta && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${scenarioMeta.pill}`}>
                  {scenario}
                </span>
              )}
            </div>
            {chain && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {chain} · {scenarioMeta?.desc}
              </p>
            )}
            {!chain && (
              <p className="text-sm text-muted-foreground mt-0.5">MT Listing detail for this CBU</p>
            )}
          </div>
          {mtData && !mtData.error && chainRows.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !mtData || mtData.error ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {mtData?.error ?? "No MT listing data available for this CBU."}
            </CardContent>
          </Card>
        ) : chainRows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No MT listing rows found for {chain || "this CBU"} — configure the predecessor CBU first.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Predecessor → Successor summary strip ─────────────────── */}
            <Card>
              <CardContent className="p-0">
                <div className={`flex flex-wrap gap-6 text-xs px-5 py-4 rounded-lg border ${scenarioMeta?.badge ?? "bg-background border-border"}`}>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">Predecessor CBU</span>
                    <p className="font-mono font-semibold mt-1">{mtData.predecessorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5 truncate max-w-[200px]">{mtData.predecessorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">EAN (Predecessor)</span>
                    <p className="font-mono font-semibold mt-1">{mtData.predecessorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">Case Config</span>
                    <p className="font-semibold mt-1">{mtData.predecessorCbu?.caseConfig ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">CIC (Predecessor)</span>
                    <p className="font-mono font-semibold mt-1">{predCics}</p>
                  </div>
                  <div className="border-l pl-6">
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">Successor CBU</span>
                    <p className="font-mono font-semibold mt-1">{mtData.successorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5 truncate max-w-[200px]">{mtData.successorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">EAN (Successor)</span>
                    <p className="font-mono font-semibold mt-1">{mtData.successorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-wide font-medium">Case Config</span>
                    <p className="font-semibold mt-1">{mtData.successorCbu?.caseConfig ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── MT Listing / ATP tabs ──────────────────────────────────── */}
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="listing">
                  <div className="border-b border-border px-4 pt-1">
                    <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 justify-start rounded-none">
                      <TabsTrigger
                        value="listing"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium gap-1.5"
                      >
                        <List className="h-3 w-3" /> MT Listing
                      </TabsTrigger>
                      <TabsTrigger
                        value="atp"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium gap-1.5"
                      >
                        <Zap className="h-3 w-3" /> ATP Criteria
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* MT Listing table */}
                  <TabsContent value="listing" className="mt-0">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableHead className="text-xs font-semibold w-[5%] pl-5">Type</TableHead>
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
                            const meta = isPred ? mtData.predecessorCbu : mtData.successorCbu;
                            return (
                              <TableRow
                                key={`${row.customerCode}-${row.rowType}`}
                                className={isPred ? row.status === "INACTIVE" ? "bg-red-50/60" : "" : "bg-emerald-50/50"}
                              >
                                <TableCell className="py-2 pl-5">
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
                  <TabsContent value="atp" className="mt-0 px-4 pb-4 space-y-2 pt-3">
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
                            {Object.entries(atpByCode).flatMap(([code, grp]) => {
                              const rec = pickRecommended(grp.old, grp.new);
                              const recCbuCode = rec === "new"
                                ? (mtData?.successorCbu?.cbuCode ?? grp.new[0]?.cbuCode ?? "—")
                                : (mtData?.predecessorCbu?.cbuCode ?? grp.old[0]?.cbuCode ?? "—");
                              const oldFresh = grp.old.reduce((s, b) => s + b.freshAtp, 0);
                              const newFresh = grp.new.reduce((s, b) => s + b.freshAtp, 0);

                              const batchRows = (batches: AtpBatch[], label: "OLD" | "NEW") => {
                                if (!batches.length) return [];
                                const totalFresh = batches.reduce((s, b) => s + b.freshAtp, 0);
                                const isRec = (label === "OLD" && rec === "old") || (label === "NEW" && rec === "new");
                                return [
                                  // CBU sub-header
                                  <TableRow key={`${code}-${label}-sub`} className={isRec ? "bg-emerald-50/60" : "bg-slate-50/80"}>
                                    <TableCell colSpan={9} className="py-1.5 px-4 border-t border-dashed border-slate-200">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${label === "OLD" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>{label}</span>
                                        <span className="text-xs font-mono font-semibold">{batches[0]?.cbuCode ?? "—"}</span>
                                        {isRec && (
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-1">
                                            ★ Recommended Mapping
                                          </span>
                                        )}
                                        <div className="ml-auto flex items-center gap-1.5">
                                          <span className="text-[10px] text-muted-foreground">Total Fresh ATP</span>
                                          <span className={`text-xs font-semibold ${totalFresh >= 400 ? "text-emerald-700" : totalFresh > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                            {totalFresh > 0 ? totalFresh.toLocaleString() : "—"}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>,
                                  // Batch data rows
                                  ...batches.map(b => (
                                    <TableRow key={`${code}-${label}-${b.batch}`} className={b.isFresh ? "bg-emerald-50/30" : b.pricingValid ? "bg-orange-50/20" : "bg-red-50/20"}>
                                      <TableCell className="text-xs font-mono py-2 pl-8 text-muted-foreground">{b.depot}</TableCell>
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
                              };

                              return [
                                // Customer code header
                                <TableRow key={`${code}-hdr`} className="bg-slate-100 border-t-2 border-t-slate-300">
                                  <TableCell colSpan={9} className="py-2 px-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-xs font-semibold font-mono">{code}</span>
                                      <span className="text-[10px] text-muted-foreground">{grp.customerChain}</span>
                                      <span className="text-muted-foreground/40">|</span>
                                      <span className="text-[10px] text-muted-foreground">Recommended CBU</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${REC_STYLES[rec]}`}>{rec.toUpperCase()}</span>
                                      <span className="text-xs font-mono font-semibold">{recCbuCode}</span>
                                      <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
                                        <span>OLD Fresh ATP: <span className={`font-semibold ${oldFresh >= 400 ? "text-emerald-700" : oldFresh > 0 ? "text-amber-600" : "text-foreground"}`}>{oldFresh > 0 ? oldFresh.toLocaleString() : "—"}</span></span>
                                        <span>vs</span>
                                        <span>NEW Fresh ATP: <span className={`font-semibold ${newFresh >= 400 ? "text-emerald-700" : newFresh > 0 ? "text-amber-600" : "text-foreground"}`}>{newFresh > 0 ? newFresh.toLocaleString() : "—"}</span></span>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>,
                                ...batchRows(grp.old, "OLD"),
                                ...batchRows(grp.new, "NEW"),
                              ];
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
