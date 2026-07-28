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
import { List } from "lucide-react";
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

// ─── Status index for filtering ───────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0,
  "Active": 1,
  "Pricing Updated": 2,
  "Production Started": 3,
  "FTR Approved": 4,
  "Stock Movement Initiated": 5,
  "Network transition complete": 6,
};

const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM",
  "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingPage() {
  const [selectedCbu, setSelectedCbu] = useState<string>("");

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
      && (STATUS_IDX[e.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"]
    ),
    [networkEntries],
  );

  const isLoading = entriesLoading;

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

            {/* CBU selector */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Select CBU
              </label>
              {isLoading ? (
                <Skeleton className="h-8 w-72" />
              ) : (
                <Select value={selectedCbu} onValueChange={setSelectedCbu}>
                  <SelectTrigger className="h-8 text-xs w-72" data-testid="select-mt-listing-cbu">
                    <SelectValue placeholder="Choose a relaunch / extension CBU…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEntries.length === 0 && (
                      <SelectItem value="_none" disabled>No eligible CBUs</SelectItem>
                    )}
                    {eligibleEntries.map(e => (
                      <SelectItem key={e.cbuCode ?? ""} value={e.cbuCode ?? ""}>
                        {e.cbuCode} — {e.materialDescription || e.basepackDescription || e.basepack}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {eligibleEntries.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {eligibleEntries.length} CBU{eligibleEntries.length !== 1 ? "s" : ""} eligible
                </span>
              )}
            </div>

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

            {/* No CBU selected */}
            {!selectedCbu && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Select a relaunch or extension CBU above to view its MT listing impact.
              </div>
            )}

            {/* Loading */}
            {selectedCbu && mtListingLoading && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {/* Error / no predecessor */}
            {selectedCbu && !mtListingLoading && mtListingData?.error && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {mtListingData.error}
              </div>
            )}

            {/* CBU details header + table */}
            {selectedCbu && !mtListingLoading && mtListingData && !mtListingData.error && (
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
                          for (const row of mtListingData.rows) {
                            if (!groups[row.customerChain]) groups[row.customerChain] = [];
                            groups[row.customerChain].push(row);
                          }
                          return Object.entries(groups).flatMap(([chain, chainRows]) =>
                            chainRows.map((row, idx) => {
                              const isPred = row.rowType === "predecessor";
                              const entryMeta = isPred
                                ? mtListingData.predecessorCbu
                                : mtListingData.successorCbu;
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
                                      {row.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs font-mono py-2">{row.depot ?? "—"}</TableCell>
                                  <TableCell className="py-2">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${row.listingBased ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                                      {row.scenarioLabel}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
