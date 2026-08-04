import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, CheckCircle2, XCircle, Minus,
  Save, Download, AlertTriangle, MapPin, Warehouse,
  Hash, Tag, Link2, Package, TrendingUp,
} from "lucide-react";
import type { NetworkEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { NV_CODE_TO_CCR_CHAIN } from "@/lib/distribution-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string;
  customerChain: string;
  coverageType: string;
  behaviourType: string;
};

type CodeMapping = {
  id: string;
  customerChain: string;
  customerCode: string;
  depot: string;
  subChannel: string;
  channel: string;
};

type CicMapping = {
  id: string;
  cbuCode: string;
  basepack: string | null;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  cicDescription: string | null;
  salesOrg: string;
  channel: string;
  depot: string | null;
  status: string;
  sourcingDepot: string | null;
  sourcingType: string;
  pricingStatus: string;
};

type PricingStatus = "Yes" | "No";
type DepotStatus = "Mapped" | "Non-Mapped" | string;

type DepotRow = {
  id: string;
  customerCode: string;
  depot: string;
  subChannel: string;
  channel: string;
  status: DepotStatus;
  pricingStatus: PricingStatus;
  sourcingDepot: string;
  sourcingType: string;
  cic: string;
  cicDescription: string;
  salesOrg: string;
  existingCicId?: string;
  pbOverridden: boolean;
  pbStatus?: string;
  isStale?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2, "Production Started": 3,
  "FTR Approved": 4, "Stock Movement Initiated": 5, "Network transition complete": 6,
};

const BLOCKED_BP_STATUSES = new Set(["Inactive Pack", "Stock Base Delisted", "Delisted Packs"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBpBlocked(status: string | undefined): boolean {
  return !!status && BLOCKED_BP_STATUSES.has(status);
}

function getSourcingMode(entry: NetworkEntry): "decentralized" | "centralized" {
  try {
    const parsed = JSON.parse(entry.sourcingMatrixSection ?? "");
    return (parsed?.mode as "decentralized" | "centralized") || "decentralized";
  } catch { return "decentralized"; }
}

function computeRowPricingStatus(entry: NetworkEntry): PricingStatus {
  const idx = STATUS_IDX[entry.networkStatus ?? ""] ?? 0;
  if (entry.priceActive === false) return "No";
  if (entry.priceActive === true) return "Yes";
  if (idx >= 2) return "Yes";
  return "No";
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "Draft";
  const high = ["FTR Approved", "Stock Movement Initiated", "Network transition complete"];
  const mid = ["Pricing Updated", "Production Started"];
  if (high.includes(s)) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">{s}</Badge>;
  if (mid.includes(s)) return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">{s}</Badge>;
  if (s === "Active") return <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{s}</Badge>;
  return <Badge variant="outline" className="text-slate-500 text-xs">{s}</Badge>;
}

function StatusBadge({ status, pbStatus }: { status: DepotStatus; pbStatus?: string }) {
  if (pbStatus) return (
    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs whitespace-nowrap" data-testid="badge-status-pb-override">
      {pbStatus}
    </Badge>
  );
  if (status === "Mapped") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs" data-testid="badge-status-mapped">
      <CheckCircle2 className="h-3 w-3 mr-1" />Mapped
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs" data-testid="badge-status-non-mapped">
      <XCircle className="h-3 w-3 mr-1" />Non-Geo
    </Badge>
  );
}

function PricingBadge({ status }: { status: PricingStatus }) {
  if (status === "Yes") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Yes</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">No</Badge>;
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrConfigurePage() {
  const { cbuCode } = useParams<{ cbuCode: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const decodedCbu = decodeURIComponent(cbuCode ?? "");
  const searchString = useSearch();
  const chainFromUrl = useMemo(() => new URLSearchParams(searchString).get("chain") ?? "", [searchString]);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [selectedChain, setSelectedChain] = useState<string>(chainFromUrl);

  // Keep selectedChain in sync if the URL param changes (e.g. browser back/forward)
  useEffect(() => {
    if (chainFromUrl) setSelectedChain(chainFromUrl);
  }, [chainFromUrl]);
  const [cicInput, setCicInput] = useState<string>("");
  const [cicDescriptionInput, setCicDescriptionInput] = useState<string>("");
  const [sourcingDepotMap, setSourcingDepotMap] = useState<Record<string, string>>({});

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/ccr/customers"],
  });

  const { data: codeMappings = [], isLoading: codeMappingsLoading } = useQuery<CodeMapping[]>({
    queryKey: ["/api/ccr/customers", selectedChain, "code-mapping"],
    queryFn: () =>
      fetch(`/api/ccr/customers/${encodeURIComponent(selectedChain)}/code-mapping`).then(r => r.json()),
    enabled: !!selectedChain,
  });

  const { data: existingCicMappings = [], isLoading: cicLoading } = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings", decodedCbu, selectedChain],
    queryFn: () =>
      fetch(`/api/ccr/cic-mappings?cbu_code=${encodeURIComponent(decodedCbu)}&customer_chain=${encodeURIComponent(selectedChain)}`).then(r => r.json()),
    enabled: !!decodedCbu && !!selectedChain,
  });

  // All CIC mappings for this CBU (all chains) — powers the chain completion counter
  const { data: allCicMappings = [] } = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings", decodedCbu],
    queryFn: () =>
      fetch(`/api/ccr/cic-mappings?cbu_code=${encodeURIComponent(decodedCbu)}`).then(r => r.json()),
    enabled: !!decodedCbu,
  });

  const { data: bpStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/basepack-status"],
    queryFn: () => fetch("/api/basepack-status").then(r => r.ok ? r.json() : {}),
  });

  // NCSM depot decisions from Paid Bible activation SRs  { depotCode → "approved"|"rejected"|"pending" }
  const { data: ncsmDecisions = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ccr/ncsm-depot-decisions", decodedCbu],
    queryFn: () => fetch(`/api/ccr/ncsm-depot-decisions/${encodeURIComponent(decodedCbu)}`).then(r => r.ok ? r.json() : {}),
    enabled: !!decodedCbu,
  });

  // ── Derived: entry + MSTN ────────────────────────────────────────────────────
  const entry = useMemo(() => networkEntries.find(e => e.cbuCode === decodedCbu) ?? null, [networkEntries, decodedCbu]);

  const mstnByDepot = useMemo(() => (entry as any)?.mstnByDepot as Record<string, number> | undefined, [entry]);
  const assignedDepots: string[] = entry?.depot ?? [];

  const allDepotCodes = useMemo(
    () => Array.from(new Set([...Object.keys(mstnByDepot ?? {}), ...assignedDepots])).sort(),
    [mstnByDepot, assignedDepots],
  );

  const cicByDepot = useMemo(() => {
    const m = new Map<string, CicMapping>();
    for (const cm of allCicMappings) { if (cm.depot) m.set(cm.depot, cm); }
    return m;
  }, [allCicMappings]);

  const mappedDepotCount = allDepotCodes.filter(d => cicByDepot.has(d)).length;

  // ── Derived: applicable CCR chains from NV customer_mapping ─────────────────
  // Only chains whose NV code appears in the CBU's customer_mapping are shown.
  // An empty / null customer_mapping → no applicable chains → dropdown is empty.
  const applicableChains = useMemo<Set<string>>(() => {
    const cm = entry?.customerMapping;
    if (!cm || typeof cm !== "object") return new Set();
    const result = new Set<string>();
    for (const codes of Object.values(cm)) {
      if (Array.isArray(codes)) {
        for (const code of codes) {
          const chain = NV_CODE_TO_CCR_CHAIN[code];
          if (chain) result.add(chain);
        }
      }
    }
    return result;
  }, [entry]);

  // A chain counts as "configured" once it has ≥1 saved CIC row (matching the
  // depot-change-summary server logic).  We only count chains that are in the
  // applicable set so predecessor/test rows from other CBUs don't inflate it.
  const chainCompletionStats = useMemo(() => {
    const configuredChains = new Set<string>();
    for (const m of allCicMappings) {
      if (applicableChains.has(m.customerChain)) {
        configuredChains.add(m.customerChain);
      }
    }
    return { applicable: applicableChains.size, completed: configuredChains.size };
  }, [allCicMappings, applicableChains]);

  // ── Derived: mapping grid ────────────────────────────────────────────────────
  const sourcingMode = useMemo(() => entry ? getSourcingMode(entry) : "decentralized", [entry]);
  const basepackStatus: string | undefined = useMemo(() => {
    if (!entry?.basepack) return undefined;
    return (bpStatusMap as Record<string, string>)[entry.basepack];
  }, [entry, bpStatusMap]);
  const pbBlocked = isBpBlocked(basepackStatus);

  const cicByKey = useMemo(() => {
    const map: Record<string, CicMapping> = {};
    existingCicMappings.forEach(m => { map[`${m.customerCode}::${m.depot ?? ""}`] = m; });
    return map;
  }, [existingCicMappings]);

  // Sourcing depot options come from the CBU's assigned depots in Network Visibility
  const allDepots = useMemo(() => [...(entry?.depot ?? [])].sort(), [entry]);

  // Hydrate sourcing depot selections from persisted mappings
  const hydratedKeyRef = useRef<string>("");
  useEffect(() => {
    if (!existingCicMappings.length || !codeMappings.length || !entry) return;
    const key = `${decodedCbu}::${selectedChain}`;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    if (getSourcingMode(entry) !== "centralized") return;
    const depotKeyToCmId: Record<string, string> = {};
    codeMappings.forEach(cm => { depotKeyToCmId[`${cm.customerCode}::${cm.depot}`] = cm.id; });
    const newSourcingMap: Record<string, string> = {};
    existingCicMappings.forEach(m => {
      if (m.sourcingDepot) {
        const cmId = depotKeyToCmId[`${m.customerCode}::${m.depot ?? ""}`];
        if (cmId) newSourcingMap[cmId] = m.sourcingDepot;
      }
    });
    if (Object.keys(newSourcingMap).length > 0) setSourcingDepotMap(newSourcingMap);
  }, [existingCicMappings, codeMappings, entry, decodedCbu, selectedChain]);

  const rows: DepotRow[] = useMemo(() => {
    if (!codeMappings.length || !entry) return [];
    const rowPricing = computeRowPricingStatus(entry);
    const srcMode = getSourcingMode(entry);
    const srcType = srcMode === "decentralized" ? "Decentralized" : "Centralized";
    return codeMappings.map(cm => {
      const existing = cicByKey[`${cm.customerCode}::${cm.depot}`];
      const effectiveCic = cicInput || existing?.cic || "";
      const effectiveCicDescription = cicDescriptionInput || existing?.cicDescription || "";
      let status: DepotStatus, sourcingDepot: string, pbStatus: string | undefined;
      if (pbBlocked) {
        status = basepackStatus!; sourcingDepot = existing?.sourcingDepot ?? ""; pbStatus = basepackStatus;
      } else if (srcMode === "decentralized") {
        const isMapped = (entry.depot ?? []).includes(cm.depot);
        status = isMapped ? "Mapped" : "Non-Mapped";
        // Prefer the saved sourcing_depot value (covers NCSM-rejected DCs that still
        // have a sourcing DC recorded); fall back to the depot itself when mapped.
        sourcingDepot = existing?.sourcingDepot ?? (isMapped ? cm.depot : "");
      } else {
        const isMapped = (entry.depot ?? []).includes(cm.depot);
        status = isMapped ? "Mapped" : "Non-Mapped";
        sourcingDepot = isMapped ? (sourcingDepotMap[cm.id] || "") : "";
      }
      return {
        id: cm.id, customerCode: cm.customerCode, depot: cm.depot,
        subChannel: cm.subChannel, channel: cm.channel || "MT",
        status, pricingStatus: rowPricing, sourcingDepot, sourcingType: srcType,
        cic: effectiveCic, cicDescription: effectiveCicDescription,
        salesOrg: existing?.salesOrg ?? "1000",
        existingCicId: existing?.id, pbOverridden: pbBlocked, pbStatus,
      };
    });
  }, [codeMappings, entry, cicInput, cicDescriptionInput, sourcingMode, sourcingDepotMap, cicByKey, pbBlocked, basepackStatus]);

  const mappedCount = rows.filter(r => !r.pbOverridden && r.status === "Mapped").length;
  const nonMappedCount = rows.filter(r => !r.pbOverridden && r.status === "Non-Mapped").length;

  // ── Stale mapping detection ───────────────────────────────────────────────────
  // Applies only in centralized mode: a depot being added/removed from the CBU's
  // NV list changes the auto-derived Mapped/Non-Mapped status.  If the saved
  // status in the DB differs from today's derived status the mapping is stale.
  const staleRowIds = useMemo(() => {
    if (pbBlocked || sourcingMode !== "centralized" || !existingCicMappings.length || !rows.length) {
      return new Set<string>();
    }
    const staleIds = new Set<string>();
    for (const row of rows) {
      if (!row.existingCicId) continue;
      const savedStatus = cicByKey[`${row.customerCode}::${row.depot}`]?.status;
      if (savedStatus && savedStatus !== row.status) {
        staleIds.add(row.id);
      }
    }
    return staleIds;
  }, [rows, cicByKey, pbBlocked, sourcingMode, existingCicMappings.length]);

  const staleGridRef = useRef<HTMLDivElement>(null);

  // ── Validation ───────────────────────────────────────────────────────────────
  const validationErrors: string[] = useMemo(() => {
    const errs: string[] = [];
    if (!selectedChain) errs.push("Select a Customer Chain");
    if (!entry) errs.push("CBU not found");
    if (entry && !cicInput && !existingCicMappings.some(m => m.cic)) errs.push("Enter a CIC code");
    if (pbBlocked) errs.push(`Paid Bible status "${basepackStatus}" blocks mapping — resolve in Paid Bible first`);
    if (sourcingMode === "centralized" && rows.length > 0) {
      const missing = rows.filter(r => !r.pbOverridden && r.status === "Mapped" && !r.sourcingDepot);
      if (missing.length > 0) errs.push(`${missing.length} Mapped row(s) are missing a Sourcing DC`);
    }
    return errs;
  }, [selectedChain, entry, cicInput, existingCicMappings, pbBlocked, basepackStatus, sourcingMode, rows]);

  // ── Save + Enqueue Mutation ───────────────────────────────────────────────────
  // Saving CIC mapping also submits the CBU to the MT Listing in-queue.
  // The queue is idempotent: already-queued or SAP-workflow CBUs are unaffected.
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = rows.map(r => ({
        cbuCode: decodedCbu,
        basepack: entry?.basepack ?? null,
        customerChain: selectedChain,
        customerCode: r.customerCode,
        cic: r.cic || null,
        cicDescription: r.cicDescription || null,
        salesOrg: r.salesOrg,
        channel: r.channel,
        depot: r.depot,
        status: r.pbOverridden ? "Non-Mapped" : r.status,
        sourcingDepot: r.sourcingDepot || null,
        sourcingType: r.sourcingType,
        pricingStatus: r.pricingStatus,
      }));
      await apiRequest("PUT", "/api/ccr/cic-mappings", { mappings: payload });
      // Auto-enqueue: place CBU into MT Listing queue (no-op if already queued or in SAP flow)
      await apiRequest("POST", "/api/ccr/queue-cbus", { cbu_codes: [decodedCbu], queued_by: "demo-user" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings", decodedCbu, selectedChain] });
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings", decodedCbu] });
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/depot-change-summary"] });
      toast({
        title: "Mapping saved & submitted to MT Listing queue",
        description: `${rows.length} row(s) saved. CBU will appear in MT Listing once Stock Movement is initiated.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Export ────────────────────────────────────────────────────────────────────
  function handleExport() {
    if (!rows.length) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const toRow = (r: typeof rows[0]) => ({
      "CBU Code": decodedCbu, "Basepack": entry?.basepack ?? "",
      "Customer Chain": selectedChain, "Customer Code": r.customerCode,
      "CIC": r.cic, "Sales Org": r.salesOrg, "Channel": r.channel,
      "Depot": r.depot, "Sub Channel": r.subChannel,
      "Status": r.pbOverridden ? r.pbStatus ?? "Non-Mapped" : r.status,
      "Pricing Status": r.pricingStatus, "Sourcing Depot": r.sourcingDepot,
      "Sourcing Type": r.sourcingType,
      "Process": /^\d+$/.test((r.cic ?? "").trim()) ? "CRM Upload" : "Customer Governance (CG)",
    });

    // Split rows: numeric CIC (digits only) vs alphanumeric CIC
    const isNumericCic = (cic: string | null | undefined) => /^\d+$/.test((cic ?? "").trim());
    const numericRows    = rows.filter(r => isNumericCic(r.cic)).map(toRow);
    const alphaRows      = rows.filter(r => !isNumericCic(r.cic)).map(toRow);

    const wb = XLSX.utils.book_new();
    // Always add both sheets so recipients know both categories exist
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(numericRows.length ? numericRows : [{ Note: "No numeric-CIC rows for this export" }]),
      "Numeric CIC – CRM Upload",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(alphaRows.length ? alphaRows : [{ Note: "No alphanumeric-CIC rows for this export" }]),
      "Alphanumeric CIC – CG Team",
    );
    XLSX.writeFile(wb, `CCR_Mapping_${decodedCbu}_${selectedChain}_${today}.xlsx`);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleChainChange(chain: string) {
    setSelectedChain(chain);
    setSourcingDepotMap({});
    setCicDescriptionInput("");
  }

  function handleSourcingDepotChange(rowId: string, depot: string) {
    setSourcingDepotMap(prev => ({ ...prev, [rowId]: depot }));
  }

  const isLoading = entriesLoading || customersLoading;
  const gridLoading = codeMappingsLoading || cicLoading;
  const canSave = validationErrors.length === 0 && rows.length > 0 && !saveMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnileverHeader module="ccr" />

      <main className="flex-1 px-6 py-6 max-w-[1400px] mx-auto w-full space-y-5">

        {/* ── Breadcrumb / back ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="sm"
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
              <div className="flex gap-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-36" />)}</div>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">CBU <span className="font-mono">{decodedCbu}</span> not found.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Stats cards ───────────────────────────────────────────────────── */}
        {!isLoading && entry && (
          <div className="grid grid-cols-3 gap-3">

            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">Chain Mapping Completed</p>
                {(() => {
                  // "Yes" when all applicable chains are configured, OR when the
                  // currently selected chain already has at least one saved CIC mapping.
                  const done = (chainCompletionStats.applicable > 0 && chainCompletionStats.completed >= chainCompletionStats.applicable)
                    || allCicMappings.some(m => m.customerChain === selectedChain);
                  return (
                    <span className={`text-xl font-bold ${done ? "text-emerald-600" : "text-red-500"}`}>
                      {done ? "Yes" : "No"}
                    </span>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">Basepack Status</p>
                <span className={`text-sm font-semibold ${pbBlocked ? "text-red-500" : "text-emerald-600"}`}>
                  {basepackStatus ?? "Active"}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5">MSTN Cleared</p>
                {entry.mstnPercentage != null ? (
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${entry.mstnPercentage >= 80 ? "text-emerald-600" : "text-red-500"}`}>
                      {entry.mstnPercentage >= 80 ? "Yes" : "No"}
                    </span>
                    <span className="text-sm text-muted-foreground">{entry.mstnPercentage}%</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>

          </div>
        )}


        {/* ── Mapping Configuration ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Mapping Configuration
              <span className="font-mono text-muted-foreground font-normal ml-1">— {decodedCbu}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Customer Chain — static label (chain is fixed when navigating from Master Maintenance) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Chain</Label>
                {customersLoading || entriesLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <div
                    className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40"
                    data-testid="text-customer-chain"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {selectedChain || <span className="text-muted-foreground italic">—</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* CIC Code */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide" htmlFor="cic-input">
                  CIC Code <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="cic-input"
                    data-testid="input-cic"
                    value={cicInput}
                    onChange={e => setCicInput(e.target.value.toUpperCase())}
                    placeholder={existingCicMappings[0]?.cic ?? "e.g. CIC001…"}
                    className="h-9 pl-7 font-mono text-sm"
                  />
                </div>
                {existingCicMappings.length > 0 && !cicInput && (
                  <p className="text-[10px] text-muted-foreground">Existing CIC values shown per row</p>
                )}
              </div>

              {/* CIC Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide" htmlFor="cic-description-input">
                  CIC Description
                </Label>
                <Input
                  id="cic-description-input"
                  data-testid="input-cic-description"
                  value={cicDescriptionInput}
                  onChange={e => setCicDescriptionInput(e.target.value)}
                  placeholder={existingCicMappings[0]?.cicDescription ?? "e.g. Trade Desc…"}
                  className="h-9 text-sm"
                />
                {existingCicMappings.length > 0 && !cicDescriptionInput && (
                  <p className="text-[10px] text-muted-foreground">Existing description shown per row</p>
                )}
              </div>

              {/* Sourcing Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sourcing Type</Label>
                <div className="h-9 flex items-center">
                  {entry ? (
                    <Badge
                      className={sourcingMode === "decentralized"
                        ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
                        : "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100"}
                      data-testid="badge-sourcing-mode"
                    >
                      {sourcingMode === "decentralized" ? "Decentralized" : "Centralized"}
                    </Badge>
                  ) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
            </div>

            {/* CBU detail strip */}
            {entry && (
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {entry.materialDescription || entry.basepackDescription || entry.cbuCode}
                </span>
                {entry.basepack && (
                  <span>Basepack: <span className="font-mono font-medium text-foreground">{entry.basepack}</span></span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium text-foreground">{entry.networkStatus}</span>
                </span>
              </div>
            )}

            {/* Paid Bible blocking alert */}
            {pbBlocked && entry && (
              <Alert className="mt-3 border-amber-200 bg-amber-50" data-testid="alert-pb-blocked">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  <strong>Paid Bible override:</strong> Basepack{" "}
                  <span className="font-mono">{entry.basepack}</span> is marked{" "}
                  <strong>"{basepackStatus}"</strong>. All DC rows show this status automatically.
                  Mapping submission is blocked until the Paid Bible status is resolved.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ── DC Mapping Grid ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                DC Mapping Grid
                {selectedChain && <span className="ml-1 text-muted-foreground font-normal">— {selectedChain}</span>}
              </CardTitle>
              {rows.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
                  {!pbBlocked && (
                    <>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs" data-testid="badge-mapped-count">
                        {mappedCount} Mapped
                      </Badge>
                      <Badge variant="outline" className="text-slate-500 text-xs" data-testid="badge-non-mapped-count">
                        {nonMappedCount} Non-Geo
                      </Badge>
                    </>
                  )}
                  {pbBlocked && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                      All rows blocked by Paid Bible
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Stale mapping banner */}
            {staleRowIds.size > 0 && (
              <div className="px-4 pt-3 pb-0" data-testid="alert-stale-mappings">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 text-xs flex items-center justify-between gap-2">
                    <span>
                      <strong>{staleRowIds.size} row{staleRowIds.size !== 1 ? "s" : ""}</strong> have changed mapping status since last save — review and save to update.
                    </span>
                    <button
                      type="button"
                      className="underline underline-offset-2 whitespace-nowrap hover:text-amber-900 transition-colors"
                      onClick={() => staleGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      data-testid="link-scroll-to-stale"
                    >
                      View affected rows ↓
                    </button>
                  </AlertDescription>
                </Alert>
              </div>
            )}


            {/* Grid loading */}
            {gridLoading && selectedChain && (
              <div className="px-4 pb-4 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {/* No chain selected */}
            {!selectedChain && (
              <div className="px-4 pb-6 text-center text-sm text-muted-foreground py-10" data-testid="text-select-chain">
                Select a Customer Chain to load the DC mapping grid.
              </div>
            )}

            {/* Empty state */}
            {!gridLoading && selectedChain && !codeMappings.length && (
              <div className="px-4 pb-6 text-center text-sm text-muted-foreground py-10" data-testid="text-empty-grid">
                No customer code mappings found for <strong>{selectedChain}</strong>.
              </div>
            )}

            {/* Mapping grid table */}
            {!gridLoading && rows.length > 0 && (
              <div ref={staleGridRef} className="overflow-x-auto">
                <div className="px-4 pt-3 pb-1 flex items-center gap-3 text-xs text-muted-foreground border-b">
                  <span>DC:</span>
                  <span className="text-emerald-700 font-semibold">Green — in this CBU's NV distribution</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-600">Amber — not in NV distribution</span>
                </div>
                <Table data-testid="table-depot-grid">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold whitespace-nowrap">CBU Code</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Basepack</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Customer Chain</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Customer Code</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">CIC</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sales Org</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">DC</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap text-center">NCSM</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Pricing</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sourcing DC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => {
                      const effectiveStatus: DepotStatus = assignedDepots.includes(row.depot)
                        ? row.status
                        : "Non-Mapped";
                      return (
                      <TableRow
                        key={row.id}
                        className={
                          row.pbOverridden
                            ? "bg-amber-50/50"
                            : staleRowIds.has(row.id)
                            ? "bg-yellow-50 border-l-2 border-l-amber-400"
                            : effectiveStatus === "Non-Mapped"
                            ? "bg-muted/20"
                            : ""
                        }
                        data-testid={`row-grid-${row.customerCode}`}
                        data-stale={staleRowIds.has(row.id) ? "true" : undefined}
                      >
                        <TableCell className="font-mono text-xs" data-testid={`text-cbu-${row.customerCode}`}>{decodedCbu}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground" data-testid={`text-basepack-${row.customerCode}`}>{entry?.basepack ?? "—"}</TableCell>
                        <TableCell className="text-xs" data-testid={`text-chain-${row.customerCode}`}>{selectedChain}</TableCell>
                        <TableCell className="font-mono text-xs font-medium" data-testid={`text-customer-code-${row.customerCode}`}>{row.customerCode}</TableCell>
                        <TableCell className="font-mono text-xs" data-testid={`text-cic-${row.customerCode}`}>
                          {row.cic || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.salesOrg}</TableCell>
                        <TableCell
                          className={`text-sm font-semibold ${assignedDepots.includes(row.depot) ? "text-emerald-700" : "text-amber-600"}`}
                          data-testid={`text-depot-${row.customerCode}`}
                        >
                          {row.depot}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`cell-ncsm-${row.customerCode}`}>
                          {(() => {
                            // Sourcing DC present → DC was selected by NP and reviewed by NCSM
                            // Sourcing DC absent → NP never put this DC in the distribution matrix → always plain dash
                            const hasSourcingDepot = !!(sourcingDepotMap[row.id] || row.sourcingDepot);
                            if (!hasSourcingDepot) {
                              return <span className="text-muted-foreground text-xs">—</span>;
                            }
                            const decision = ncsmDecisions[row.depot];
                            if (decision === "approved") {
                              return <CheckCircle2 className="h-4 w-4 text-emerald-600 inline-block" title="NCSM approved" />;
                            }
                            if (decision === "rejected") {
                              return <XCircle className="h-4 w-4 text-red-500 inline-block" title="NCSM rejected" />;
                            }
                            // pending or no record yet — DC has sourcing DC but NCSM hasn't decided
                            return <Minus className="h-4 w-4 text-amber-400 inline-block" title="Awaiting NCSM decision" />;
                          })()}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${row.customerCode}`}>
                          <StatusBadge status={effectiveStatus} pbStatus={row.pbStatus} />
                        </TableCell>
                        <TableCell data-testid={`cell-pricing-${row.customerCode}`}>
                          <PricingBadge status={row.pricingStatus} />
                        </TableCell>
                        <TableCell data-testid={`cell-sourcing-depot-${row.customerCode}`}>
                          {sourcingMode === "decentralized" ? (
                            <span className="text-sm font-medium">{row.sourcingDepot || "—"}</span>
                          ) : row.pbOverridden || effectiveStatus !== "Mapped" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Select
                              value={sourcingDepotMap[row.id] || ""}
                              onValueChange={v => handleSourcingDepotChange(row.id, v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-36" data-testid={`select-sourcing-depot-${row.customerCode}`}>
                                <SelectValue placeholder="Select DC…" />
                              </SelectTrigger>
                              <SelectContent>
                                {allDepots.map(d => (
                                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Preview before CBU rows are loaded */}
            {!gridLoading && selectedChain && codeMappings.length > 0 && !entry && (
              <div className="overflow-x-auto">
                <Table data-testid="table-depot-grid-preview">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">Customer Code</TableHead>
                      <TableHead className="text-xs font-semibold">DC</TableHead>
                      <TableHead className="text-xs font-semibold">Channel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codeMappings.map(cm => (
                      <TableRow key={cm.id} className="opacity-60" data-testid={`row-preview-${cm.customerCode}`}>
                        <TableCell className="font-mono text-xs font-medium">{cm.customerCode}</TableCell>
                        <TableCell className="text-sm">{cm.depot}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cm.channel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Action bar ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-6">
          <div className="text-xs text-muted-foreground">
            {rows.length > 0 && !pbBlocked && (
              <>{rows.length} total · {mappedCount} Mapped · {nonMappedCount} Non-Mapped (all rows persisted)</>
            )}
            {rows.length > 0 && pbBlocked && (
              <span className="text-amber-600">All rows blocked — save disabled until Paid Bible status is resolved</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline" size="sm"
              onClick={handleExport}
              disabled={!rows.length && !codeMappings.length}
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4 mr-1.5" />Export Excel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
              data-testid="button-save-mapping"
            >
              {saveMutation.isPending ? <>Saving…</> : <><Save className="h-4 w-4 mr-1.5" />Save Mapping</>}
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
