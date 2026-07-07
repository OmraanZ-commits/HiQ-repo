import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, Warehouse,
  MapPin, Activity, TrendingUp,
} from "lucide-react";
import type { NetworkEntry, DepotsMaster } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type CicMapping = {
  id: string;
  cbuCode: string;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  depot: string | null;
  status: string;
  sourcingDepot: string | null;
  sourcingType: string;
  pricingStatus: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MSTN_THRESHOLD = 80;

function MstnBar({ pct }: { pct: number }) {
  const cleared = pct >= MSTN_THRESHOLD;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cleared ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-10 text-right ${cleared ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-500"}`}>
        {pct}%
      </span>
    </div>
  );
}

function MstnStatusBadge({ pct }: { pct: number }) {
  if (pct >= MSTN_THRESHOLD) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
        <CheckCircle2 className="h-3 w-3" />Cleared
      </Badge>
    );
  }
  if (pct >= 60) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs gap-1">
        <AlertCircle className="h-3 w-3" />In Progress
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs gap-1">
      <XCircle className="h-3 w-3" />Not Cleared
    </Badge>
  );
}

function MappingStatusBadge({ mapped, cic }: { mapped: boolean; cic?: string | null }) {
  if (mapped && cic) {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />Mapped
        </Badge>
        <span className="text-[10px] font-mono text-muted-foreground">{cic}</span>
      </div>
    );
  }
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs gap-1">
      <XCircle className="h-3 w-3" />Not Mapped
    </Badge>
  );
}

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "Draft";
  const high = ["FTR Approved", "Stock Movement Initiated", "Network transition complete"];
  const mid = ["Pricing Updated", "Production Started"];
  if (high.includes(s)) {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">{s}</Badge>;
  }
  if (mid.includes(s)) {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">{s}</Badge>;
  }
  if (s === "Active") {
    return <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{s}</Badge>;
  }
  return <Badge variant="outline" className="text-slate-500 text-xs">{s}</Badge>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrConfigurePage() {
  const { cbuCode } = useParams<{ cbuCode: string }>();
  const [, navigate] = useLocation();

  const decodedCbu = decodeURIComponent(cbuCode ?? "");

  const entriesQuery = useQuery<NetworkEntry[]>({ queryKey: ["/api/network-entries"], staleTime: 30_000 });
  const depotsQuery = useQuery<DepotsMaster[]>({ queryKey: ["/api/reference-data/depots"], staleTime: Infinity });
  const cicQuery = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings", decodedCbu],
    queryFn: async () => {
      const r = await fetch(`/api/ccr/cic-mappings?cbuCode=${encodeURIComponent(decodedCbu)}`);
      if (!r.ok) throw new Error("Failed to load CIC mappings");
      return r.json();
    },
    staleTime: 30_000,
    enabled: !!decodedCbu,
  });

  const entry = entriesQuery.data?.find(e => e.cbuCode === decodedCbu);
  const depotMap = new Map<string, DepotsMaster>(
    (depotsQuery.data ?? []).map(d => [d.code, d])
  );

  const mstnByDepot = (entry as any)?.mstnByDepot as Record<string, number> | undefined;
  const assignedDepots: string[] = (entry?.depot ?? []);

  // Build depot MSTN rows — use all depots that appear in either the MSTN map or the assigned depot list
  const allDepotCodes = Array.from(
    new Set([...Object.keys(mstnByDepot ?? {}), ...assignedDepots])
  ).sort();

  // Build a lookup from depot code → CIC mapping rows
  const cicByDepot = new Map<string, CicMapping>();
  for (const cm of cicQuery.data ?? []) {
    if (cm.depot) cicByDepot.set(cm.depot, cm);
  }

  const isLoading = entriesQuery.isLoading || depotsQuery.isLoading;

  // Summary stats
  const mstnValues = Object.values(mstnByDepot ?? {});
  const clearedCount = mstnValues.filter(v => v >= MSTN_THRESHOLD).length;
  const totalWithData = mstnValues.length;
  const mappedCount = allDepotCodes.filter(d => cicByDepot.has(d)).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnileverHeader module="ccr" />

      <main className="flex-1 px-6 py-6 max-w-[1400px] mx-auto w-full space-y-5">

        {/* ── Breadcrumb / back ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/ccr/master-maintenance")}
            data-testid="btn-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Master Maintenance
          </Button>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">Configure — <span className="font-mono">{decodedCbu}</span></span>
        </div>

        {/* ── CBU Summary strip ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="py-4">
            {isLoading ? (
              <div className="flex gap-6">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-36" />)}
              </div>
            ) : entry ? (
              <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">CBU Code</p>
                  <p className="font-mono text-sm font-bold">{entry.cbuCode}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Description</p>
                  <p className="text-sm font-medium max-w-[240px] line-clamp-1">{entry.materialDescription || entry.basepackDescription || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Brand</p>
                  <p className="text-sm font-semibold">{entry.brand || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Business Group</p>
                  <p className="text-sm text-muted-foreground">{entry.bg || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Network Status</p>
                  <div className="mt-0.5"><NetworkStatusBadge status={entry.networkStatus} /></div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Overall MSTN</p>
                  <p className={`text-sm font-bold ${(entry.mstnPercentage ?? 0) >= MSTN_THRESHOLD ? "text-emerald-600" : "text-red-500"}`}>
                    {entry.mstnPercentage != null ? `${entry.mstnPercentage}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-0.5">Assigned Depots</p>
                  <p className="text-sm font-medium">{assignedDepots.length || "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">CBU <span className="font-mono">{decodedCbu}</span> not found.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        {!isLoading && entry && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Warehouse className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold tracking-wide">Total Depots</span>
                </div>
                <p className="text-2xl font-bold">{allDepotCodes.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold tracking-wide">MSTN Cleared</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{clearedCount} <span className="text-sm text-muted-foreground font-normal">/ {totalWithData}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold tracking-wide">Not Cleared</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{totalWithData - clearedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase font-semibold tracking-wide">Mapped</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{mappedCount} <span className="text-sm text-muted-foreground font-normal">/ {allDepotCodes.length}</span></p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── MSTN by Depot table ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" />
              MSTN Level by Depot
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="px-6 pb-6 space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : allDepotCodes.length === 0 ? (
              <div className="px-6 pb-6 text-sm text-muted-foreground flex items-center gap-2 py-8 justify-center">
                <AlertCircle className="h-4 w-4" />
                No depot data available for this CBU yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-mstn-depot">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold pl-6 whitespace-nowrap">Depot Code</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Depot Name</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Cluster</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">MSTN Level</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">MSTN Status</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Mapping Status</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Customer Chain</TableHead>
                      <TableHead className="text-xs font-semibold pr-6 whitespace-nowrap">Sourcing Depot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDepotCodes.map(depotCode => {
                      const depotInfo = depotMap.get(depotCode);
                      const mstnPct = mstnByDepot?.[depotCode];
                      const cicMapping = cicByDepot.get(depotCode);
                      return (
                        <TableRow
                          key={depotCode}
                          data-testid={`row-depot-${depotCode}`}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="pl-6 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {depotCode}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {depotInfo?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {depotInfo?.clusterId ?? "—"}
                          </TableCell>
                          <TableCell>
                            {mstnPct != null
                              ? <MstnBar pct={mstnPct} />
                              : <span className="text-sm text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            {mstnPct != null
                              ? <MstnStatusBadge pct={mstnPct} />
                              : <Badge variant="outline" className="text-xs text-slate-400">No data</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            <MappingStatusBadge
                              mapped={!!cicMapping}
                              cic={cicMapping?.cic}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {cicMapping?.customerChain ?? "—"}
                          </TableCell>
                          <TableCell className="pr-6 text-sm font-mono text-muted-foreground whitespace-nowrap">
                            {cicMapping?.sourcingDepot ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
