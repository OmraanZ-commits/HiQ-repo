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

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National";

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
  const atpBatches = useMemo(() => generateAtpBatches(chainRows), [chainRows]);
  const atpByCode = useMemo(() => {
    const map: Record<string, AtpBatch[]> = {};
    for (const b of atpBatches) {
      if (!map[b.customerCode]) map[b.customerCode] = [];
      map[b.customerCode].push(b);
    }
    return map;
  }, [atpBatches]);

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
                      {isListingChain && (
                        <TabsTrigger
                          value="atp"
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium gap-1.5"
                        >
                          <Zap className="h-3 w-3" /> ATP Criteria
                        </TabsTrigger>
                      )}
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
                  {isListingChain && (
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
                            {Object.entries(atpByCode).flatMap(([code, batches]) => {
                              const rec = getRecommendation(batches);
                              const totalFreshAtp = batches.reduce((s, b) => s + b.freshAtp, 0);
                              const recCbu = rec.variant === "successor" ? mtData.successorCbu : mtData.predecessorCbu;
                              const bChain = batches[0]?.customerChain ?? "";
                              return [
                                <TableRow key={`${code}-hdr`} className="bg-slate-50 border-t-2 border-t-slate-200">
                                  <TableCell colSpan={9} className="py-2 px-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="text-xs font-semibold font-mono">{code}</span>
                                      <span className="text-[10px] text-muted-foreground">{bChain}</span>
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
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
