import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Zap, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import type { NetworkEntry } from "@shared/schema";

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

// ─── ATP mock-data helpers ────────────────────────────────────────────────────

/** Deterministic hash so ATP values are stable for a given CBU/customer key. */
function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

const VALID_DAYS_BY_CHAIN: Record<string, number> = {
  "Blinkit":          90,
  "BigBasket":       108,
  "DMart":           120,
  "Reliance Smart":  120,
  "Swiggy Instamart": 90,
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
    const baseKey  = row.customerCode + (row.depot ?? "") + row.cbuCode;
    // ~87.5 % of customer codes have valid pricing
    const pricingValid = (simpleHash(row.customerCode + "price") % 8) > 0;

    for (let b = 1; b <= 2; b++) {
      const bk = baseKey + String(b);
      const stockAge = 20 + (simpleHash(bk + "age") % 130);   // 20–149 days
      const rawAtp   = 150 + (simpleHash(bk + "atp") % 750);  // 150–899 units
      const isFresh  = pricingValid && stockAge <= validDays;

      const prodDate = new Date(today);
      prodDate.setDate(prodDate.getDate() - stockAge);

      batches.push({
        customerCode:  row.customerCode,
        customerChain: row.customerChain,
        depot:         row.depot ?? "—",
        batch:         `B${String(b).padStart(3, "0")}`,
        productionDate: fmtDate(prodDate),
        stockAgeDays:  stockAge,
        validDays,
        rawAtp,
        pricingValid,
        isFresh,
        freshAtp: isFresh ? rawAtp : 0,
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
  if (freshAtp >= 400) return { label: "Retain Mapping",       variant: "retain" };
  if (freshAtp > 0)   return { label: "Monitor",              variant: "monitor" };
  return               { label: "Recommend Successor",  variant: "successor" };
}

const REC_STYLES: Record<Recommendation["variant"], string> = {
  retain:    "bg-emerald-100 text-emerald-700",
  monitor:   "bg-amber-100   text-amber-700",
  successor: "bg-blue-100    text-blue-700",
  inactive:  "bg-red-100     text-red-700",
};

// ─── Status / type helpers ────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2, "Production Started": 3,
  "FTR Approved": 4, "Stock Movement Initiated": 5, "Network transition complete": 6,
};

const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM",
  "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingPage() {
  const [selectedCbu,   setSelectedCbu]   = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [activeTab,     setActiveTab]     = useState<string>("listing");

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const { data: mtListingData, isLoading: mtListingLoading } = useQuery<MtListingResponse>({
    queryKey: ["/api/ccr/mt-listing", selectedCbu],
    queryFn: () =>
      fetch(`/api/ccr/mt-listing?cbu_code=${encodeURIComponent(selectedCbu)}`).then(r => r.json()),
    enabled: !!selectedCbu,
  });

  // Extension / relaunch CBUs that have a predecessor — eligible for MT Listing view
  const eligibleEntries = useMemo(
    () => networkEntries.filter(e =>
      (RELAUNCH_TYPES.has(e.typeOfNetwork ?? "") ||
        e.typeOfNetwork === "EXTENSION" ||
        e.typeOfNetwork === "Extension")
      && !!(e as any).predecessorCode
      && (STATUS_IDX[e.networkStatus ?? ""] ?? 0) >= STATUS_IDX["FTR Approved"]
    ),
    [networkEntries],
  );

  // Distinct customer chains available for the loaded MT listing data
  const availableChains = useMemo(() => {
    if (!mtListingData?.rows?.length) return [];
    const seen = new Set<string>();
    const chains: string[] = [];
    for (const row of mtListingData.rows) {
      if (!seen.has(row.customerChain)) { seen.add(row.customerChain); chains.push(row.customerChain); }
    }
    return chains;
  }, [mtListingData?.rows]);

  // Rows filtered by selected chain
  const filteredRows = useMemo(() => {
    if (!mtListingData?.rows) return [];
    if (selectedChain === "all") return mtListingData.rows;
    return mtListingData.rows.filter(r => r.customerChain === selectedChain);
  }, [mtListingData?.rows, selectedChain]);

  // Which chains in the current data are listing-based (unlock ATP Criteria tab)
  const chainIsListing = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const row of mtListingData?.rows ?? []) {
      if (row.listingBased) map[row.customerChain] = true;
      else if (!(row.customerChain in map)) map[row.customerChain] = false;
    }
    return map;
  }, [mtListingData?.rows]);

  // ATP tab visible only when the selected chain (or any chain if "all") is listing-based
  const isListingChainSelected = useMemo(() => {
    if (selectedChain === "all") return Object.values(chainIsListing).some(Boolean);
    return chainIsListing[selectedChain] ?? false;
  }, [selectedChain, chainIsListing]);

  // ATP mock data (predecessor rows only, filtered by chain)
  const allAtpBatches   = useMemo(() => generateAtpBatches(filteredRows), [filteredRows]);
  const atpByCode       = useMemo(() => {
    const map: Record<string, AtpBatch[]> = {};
    for (const b of allAtpBatches) {
      if (!map[b.customerCode]) map[b.customerCode] = [];
      map[b.customerCode].push(b);
    }
    return map;
  }, [allAtpBatches]);

  const hasData = selectedCbu && !mtListingLoading && mtListingData && !mtListingData.error;

  function handleExport() {
    if (!mtListingData) return;
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: MT Listing ────────────────────────────────────────────────
    const listingRows = filteredRows.map(row => {
      const meta = row.rowType === "predecessor"
        ? mtListingData.predecessorCbu
        : mtListingData.successorCbu;
      return {
        "Type":              row.rowType === "predecessor" ? "OLD" : "NEW",
        "Ship-to Party":     row.customerCode,
        "Customer Chain":    row.customerChain,
        "Material (CBU)":    row.cbuCode,
        "Basepack":          row.basepack ?? "",
        "CIC Code":          row.cic ?? "",
        "Case Config":       meta?.caseConfig ?? "",
        "EAN Code":          meta?.ean ?? "",
        "MRP":               "",
        "Landing Cost":      "",
        "Status":            row.status === "INACTIVE" ? "Non-Geo" : row.status,
        "Plant":             row.depot ?? "",
        "Scenario":          row.scenarioLabel,
        "Listing-Based":     row.listingBased ? "Yes" : "No",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listingRows), "MT Listing");

    // ── Sheet 2: ATP Criteria (only when listing chain selected) ──────────
    if (isListingChainSelected && allAtpBatches.length > 0) {
      const atpRows = allAtpBatches.map(b => {
        const batches = atpByCode[b.customerCode] ?? [];
        const rec     = getRecommendation(batches);
        const recCbu  = rec.variant === "successor"
          ? mtListingData.successorCbu
          : mtListingData.predecessorCbu;
        const totalFreshAtp = batches.reduce((s, x) => s + x.freshAtp, 0);
        return {
          "Ship-to Party":      b.customerCode,
          "Customer Chain":     b.customerChain,
          "Recommendation":     rec.label,
          "Recommended CBU":    recCbu?.cbuCode ?? "",
          "CBU Type":           rec.variant === "successor" ? "NEW (Successor)" : "OLD (Predecessor)",
          "Total Fresh ATP":    totalFreshAtp,
          "Depot":              b.depot,
          "Batch":              b.batch,
          "Production Date":    b.productionDate,
          "Stock Age (d)":      b.stockAgeDays,
          "Valid Days":         b.validDays,
          "Fresh":              b.isFresh ? "Yes" : "No",
          "Raw ATP":            b.rawAtp,
          "Price Check":        b.pricingValid ? "Valid" : "Invalid",
          "Fresh ATP":          b.freshAtp > 0 ? b.freshAtp : 0,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atpRows), "ATP Criteria");
    }

    const chainPart = selectedChain === "all" ? "All-Chains" : selectedChain.replace(/\s+/g, "-");
    XLSX.writeFile(wb, `MT_Listing_${selectedCbu}_${chainPart}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-bold text-foreground">MT Listing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            View how the MT listing is updated for relaunch / extension CBUs when an existing CIC is reused
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <List className="h-4 w-4 text-primary" />
              MT Listing Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">

            {/* ── Shared filters ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Select CBU</label>
              {entriesLoading ? (
                <Skeleton className="h-8 w-72" />
              ) : (
                <Select value={selectedCbu} onValueChange={v => { setSelectedCbu(v); setSelectedChain("all"); }}>
                  <SelectTrigger className="h-8 text-xs w-72" data-testid="select-mt-listing-cbu">
                    <SelectValue placeholder="Choose a relaunch / extension CBU…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEntries.length === 0 && (
                      <SelectItem value="_none" disabled>No eligible CBUs</SelectItem>
                    )}
                    {eligibleEntries.map(e => (
                      <SelectItem key={e.cbuCode ?? ""} value={e.cbuCode ?? ""}>
                        {e.cbuCode} — {e.materialDescription || (e as any).basepackDescription || e.basepack}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {availableChains.length > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">|</span>
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Customer Chain</label>
                  <Select
                    value={selectedChain}
                    onValueChange={v => {
                      setSelectedChain(v);
                      // Drop to MT Listing tab if the newly selected chain has no ATP data
                      const nextIsListing = v === "all"
                        ? Object.values(chainIsListing).some(Boolean)
                        : (chainIsListing[v] ?? false);
                      if (!nextIsListing) setActiveTab("listing");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-52" data-testid="select-mt-listing-chain">
                      <SelectValue placeholder="All chains" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All chains</SelectItem>
                      {availableChains.map(chain => (
                        <SelectItem key={chain} value={chain}>
                          <span className="flex items-center gap-1.5">
                            {chain}
                            {chainIsListing[chain] && (
                              <span className="text-[9px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full leading-none">
                                Listing
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {eligibleEntries.length > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {eligibleEntries.length} CBU{eligibleEntries.length !== 1 ? "s" : ""} eligible
                </span>
              )}
            </div>

            {/* ── Empty / loading / error states (outside tabs) ──────── */}
            {!selectedCbu && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Select a relaunch or extension CBU above to view its MT listing impact.
              </div>
            )}
            {selectedCbu && mtListingLoading && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}
            {selectedCbu && !mtListingLoading && mtListingData?.error && (
              <div className="py-12 text-center text-sm text-muted-foreground">{mtListingData.error}</div>
            )}

            {/* ── Main content — shared summary + tabs ───────────────── */}
            {hasData && (
              <>
                {/* Summary strip */}
                <div className="flex flex-wrap gap-6 text-xs bg-muted/30 rounded-md px-4 py-3 border">
                  <div>
                    <span className="text-muted-foreground">Predecessor CBU</span>
                    <p className="font-mono font-semibold mt-0.5">{mtListingData.predecessorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5">{mtListingData.predecessorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Predecessor EAN</span>
                    <p className="font-mono font-semibold mt-0.5">{mtListingData.predecessorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Predecessor Case Config</span>
                    <p className="font-semibold mt-0.5">{mtListingData.predecessorCbu?.caseConfig ?? "—"}</p>
                  </div>
                  <div className="border-l pl-6">
                    <span className="text-muted-foreground">Successor CBU</span>
                    <p className="font-mono font-semibold mt-0.5">{mtListingData.successorCbu?.cbuCode ?? "—"}</p>
                    <p className="text-muted-foreground mt-0.5">{mtListingData.successorCbu?.materialDescription ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Successor EAN</span>
                    <p className="font-mono font-semibold mt-0.5">{mtListingData.successorCbu?.ean ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Successor Case Config</span>
                    <p className="font-semibold mt-0.5">{mtListingData.successorCbu?.caseConfig ?? "—"}</p>
                  </div>
                </div>

                {mtListingData.rows.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No predecessor CIC mappings found. Configure the predecessor CBU first.
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-8">
                      <TabsTrigger value="listing" className="text-xs h-7 px-3 gap-1.5">
                        <List className="h-3 w-3" /> MT Listing
                      </TabsTrigger>
                      {isListingChainSelected && (
                        <TabsTrigger value="atp" className="text-xs h-7 px-3 gap-1.5">
                          <Zap className="h-3 w-3" /> ATP Criteria
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {/* ── Tab 1: MT Listing ─────────────────────────── */}
                    <TabsContent value="listing" className="mt-3 space-y-3">
                      {/* Legend */}
                      <div className="flex items-center gap-5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500" />
                          Listing-Based (Ecom / Qcom) — predecessor &amp; successor coexist
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                          Non-Listing (MT / MT Retail) — predecessor deactivated, successor takes over
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table data-testid="table-mt-listing" className="w-full">
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="text-xs font-semibold w-[5%]">Type</TableHead>
                              <TableHead className="text-xs font-semibold w-[9%]">Ship-to Party</TableHead>
                              <TableHead className="text-xs font-semibold w-[11%]">Material (CBU)</TableHead>
                              <TableHead className="text-xs font-semibold w-[8%]">Basepack</TableHead>
                              <TableHead className="text-xs font-semibold w-[12%]">CIC Code</TableHead>
                              <TableHead className="text-xs font-semibold w-[8%]">Case Config</TableHead>
                              <TableHead className="text-xs font-semibold w-[11%]">EAN Code</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[6%]">MRP</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[7%]">Landing Cost</TableHead>
                              <TableHead className="text-xs font-semibold text-center w-[9%]">Status</TableHead>
                              <TableHead className="text-xs font-semibold w-[6%]">Plant</TableHead>
                              <TableHead className="text-xs font-semibold w-[8%]">Scenario</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const groups: Record<string, MtListingRow[]> = {};
                              for (const row of filteredRows) {
                                if (!groups[row.customerChain]) groups[row.customerChain] = [];
                                groups[row.customerChain].push(row);
                              }
                              return Object.entries(groups).flatMap(([chain, chainRows]) =>
                                chainRows.map((row, idx) => {
                                  const isPred = row.rowType === "predecessor";
                                  const entryMeta = isPred ? mtListingData!.predecessorCbu : mtListingData!.successorCbu;
                                  const isFirstInGroup = idx === 0;
                                  return (
                                    <TableRow
                                      key={`${row.customerCode}-${row.rowType}`}
                                      className={[
                                        isPred
                                          ? row.status === "INACTIVE" ? "bg-red-50/60" : "bg-white"
                                          : "bg-emerald-50/50",
                                        isFirstInGroup ? "border-t-2 border-t-slate-200" : "",
                                      ].join(" ")}
                                      data-testid={`row-mt-listing-${row.customerCode}-${row.rowType}`}
                                    >
                                      <TableCell className="py-2">
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPred ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                                          {isPred ? "OLD" : "NEW"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-xs font-mono py-2">{row.customerCode}</TableCell>
                                      <TableCell className="text-xs font-mono py-2">
                                        <div className="truncate">{row.cbuCode}</div>
                                        {isFirstInGroup && (
                                          <div className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">{chain}</div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs font-mono py-2">{row.basepack ?? "—"}</TableCell>
                                      <TableCell className="text-xs font-mono py-2">{row.cic ?? "—"}</TableCell>
                                      <TableCell className="text-xs py-2">{entryMeta?.caseConfig ?? "—"}</TableCell>
                                      <TableCell className="text-xs font-mono py-2">{entryMeta?.ean ?? "—"}</TableCell>
                                      <TableCell className="text-xs text-right py-2 text-muted-foreground">—</TableCell>
                                      <TableCell className="text-xs text-right py-2 text-muted-foreground">—</TableCell>
                                      <TableCell className="text-center py-2">
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.status === "MAPPED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                          data-testid={`badge-mt-status-${row.customerCode}-${row.rowType}`}
                                        >
                                          {row.status === "INACTIVE" ? "Non-Geo" : row.status}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-xs font-mono py-2">{row.depot ?? "—"}</TableCell>
                                      {isFirstInGroup ? (
                                        <TableCell className="py-2 align-middle" rowSpan={chainRows.length}>
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${row.listingBased ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                                            {row.scenarioLabel}
                                          </span>
                                        </TableCell>
                                      ) : null}
                                    </TableRow>
                                  );
                                })
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {/* ── Tab 2: ATP Criteria ───────────────────────── */}
                    <TabsContent value="atp" className="mt-3 space-y-3">

                      {/* Info bar */}
                      <div className="flex flex-wrap items-start gap-4 text-xs bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
                        <div className="flex items-start gap-1.5 text-blue-700">
                          <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="font-medium">Auto-CCR ATP Criteria</span>
                        </div>
                        <span className="text-blue-600">
                          Evaluated at <span className="font-mono">Customer Code × CBU × Depot × Batch</span> after the latest ECC allocation cycle.
                          Freshness = <span className="font-mono">Current Date − Production Date ≤ Valid Days (BSS Master)</span>.
                          Only pricing-active, fresh batches contribute to Fresh ATP.
                        </span>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Retain Mapping (Fresh ATP ≥ 400)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Monitor (Fresh ATP &gt; 0)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Recommend Successor (Fresh ATP = 0)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Price Not Active (excluded)
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table data-testid="table-atp-criteria" className="w-full">
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="text-xs font-semibold w-[7%]">Depot</TableHead>
                              <TableHead className="text-xs font-semibold w-[6%]">Batch</TableHead>
                              <TableHead className="text-xs font-semibold w-[9%]">Prod Date</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[8%]">Stock Age</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[8%]">Valid Days</TableHead>
                              <TableHead className="text-xs font-semibold text-center w-[9%]">Freshness</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[8%]">Raw ATP</TableHead>
                              <TableHead className="text-xs font-semibold text-center w-[9%]">Price Check</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[8%]">Fresh ATP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(atpByCode).flatMap(([code, batches]) => {
                              const rec  = getRecommendation(batches);
                              const totalFreshAtp = batches.reduce((s, b) => s + b.freshAtp, 0);
                              // Recommended CBU: retain/monitor → predecessor stays; successor → switch to successor
                              const recCbu = rec.variant === "successor"
                                ? mtListingData!.successorCbu
                                : mtListingData!.predecessorCbu;
                              const chain = batches[0]?.customerChain ?? "";

                              return [
                                // ── Group header row ─────────────────────────────────────
                                <TableRow
                                  key={`${code}-header`}
                                  className="bg-slate-50 border-t-2 border-t-slate-200"
                                  data-testid={`row-atp-header-${code}`}
                                >
                                  <TableCell colSpan={9} className="py-2.5 px-3">
                                    <div className="flex items-center gap-4 flex-wrap">
                                      {/* Customer code + chain */}
                                      <div className="min-w-0">
                                        <span className="text-xs font-semibold font-mono">{code}</span>
                                        <span className="text-[10px] text-muted-foreground ml-2">{chain}</span>
                                      </div>

                                      <span className="text-muted-foreground/40 text-xs">|</span>

                                      {/* Recommendation badge */}
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REC_STYLES[rec.variant]}`}>
                                        {rec.label}
                                      </span>

                                      <span className="text-muted-foreground/40 text-xs">|</span>

                                      {/* Recommended CBU */}
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Recommended CBU</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rec.variant === "successor" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                          {rec.variant === "successor" ? "NEW" : "OLD"}
                                        </span>
                                        <span className="text-xs font-mono font-semibold">{recCbu?.cbuCode ?? "—"}</span>
                                        {recCbu?.materialDescription && (
                                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                            — {recCbu.materialDescription}
                                          </span>
                                        )}
                                      </div>

                                      {/* Total fresh ATP summary */}
                                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] text-muted-foreground">Total Fresh ATP</span>
                                        <span className={`text-xs font-semibold tabular-nums ${totalFreshAtp >= 400 ? "text-emerald-700" : totalFreshAtp > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                                          {totalFreshAtp > 0 ? totalFreshAtp.toLocaleString() : "—"}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>,

                                // ── Batch detail rows ────────────────────────────────────
                                ...batches.map(b => (
                                  <TableRow
                                    key={`${code}-${b.batch}`}
                                    className={b.isFresh ? "bg-emerald-50/40" : b.pricingValid ? "bg-orange-50/30" : "bg-red-50/30"}
                                    data-testid={`row-atp-batch-${code}-${b.batch}`}
                                  >
                                    <TableCell className="text-xs font-mono py-2 pl-6 text-muted-foreground">{b.depot}</TableCell>
                                    <TableCell className="text-xs font-mono py-2">{b.batch}</TableCell>
                                    <TableCell className="text-xs py-2">{b.productionDate}</TableCell>
                                    <TableCell className="text-xs text-right py-2">
                                      <span className={b.stockAgeDays > b.validDays ? "text-red-600 font-medium" : "text-foreground"}>
                                        {b.stockAgeDays}d
                                      </span>
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

                      {/* Per-customer summary footer */}
                      <div className="text-xs text-muted-foreground pt-1 border-t">
                        Showing ATP evaluation for <span className="font-medium text-foreground">{Object.keys(atpByCode).length}</span> ship-to parties
                        ({allAtpBatches.filter(b => b.isFresh).length} fresh batches of {allAtpBatches.length} total).
                        Recommendations update after each ECC allocation cycle.
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )}

            {/* ── Export action ─────────────────────────────────────── */}
            {hasData && filteredRows.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  data-testid="button-generate-mt-listing-excel"
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Generate MT Listing Excel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
