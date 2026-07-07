import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download, Save, AlertTriangle, CheckCircle2, XCircle, Info,
  Warehouse, Hash, MapPin, Tag,
} from "lucide-react";
import type { NetworkEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getNetworkChangeTypeName } from "@/lib/constants";

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
  salesOrg: string;
  channel: string;
  depot: string | null;
  status: string;
  sourcingDepot: string | null;
  sourcingType: string;
  pricingStatus: string;
};

type PricingStatus = "Available" | "Not Available" | "Partial";

// Depot status can be Mapped, Non-Mapped, or the actual Paid Bible status string
type DepotStatus = "Mapped" | "Non-Mapped" | string;

type DepotRow = {
  id: string;
  customerCode: string;
  depot: string;
  subChannel: string;
  channel: string;
  status: DepotStatus;       // "Mapped" | "Non-Mapped" | PB status string
  pricingStatus: PricingStatus;
  sourcingDepot: string;
  sourcingType: string;
  cic: string;
  salesOrg: string;
  existingCicId?: string;
  pbOverridden: boolean;     // true when PB status is blocking
  pbStatus?: string;         // exact PB status value if blocking
};

// ─── Relaunch / Successor filter ─────────────────────────────────────────────

const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM",
  "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

function isEligibleCbu(entry: NetworkEntry): boolean {
  return RELAUNCH_TYPES.has(entry.typeOfNetwork ?? "") || !!entry.predecessorCode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0,
  "Active": 1,
  "Pricing Updated": 2,
  "Production Started": 3,
  "FTR Approved": 4,
  "Stock Movement Initiated": 5,
  "Network transition complete": 6,
};

/**
 * Per-row pricing derivation.
 * Uses `price_active` + `pc_at_channel_state` for row-level determination:
 * - priceActive === false → Not Available (explicitly inactive)
 * - priceActive === true, pcAtChannelState set → Partial (channel/state-specific, not all depots guaranteed)
 * - priceActive === true, pcAtChannelState null → Available (all-India pricing)
 * - priceActive null, status >= Pricing Updated, no pcAtChannelState → Available
 * - priceActive null, status >= Pricing Updated, pcAtChannelState set → Partial
 * - priceActive null, status Active → Partial (pricing not yet confirmed)
 * - priceActive null, status Draft → Not Available
 */
function computeRowPricingStatus(entry: NetworkEntry): PricingStatus {
  const idx = STATUS_IDX[entry.networkStatus ?? ""] ?? 0;

  if (entry.priceActive === false) return "Not Available";

  if (entry.priceActive === true) {
    return entry.pcAtChannelState ? "Partial" : "Available";
  }

  // priceActive is null / not set — derive from status + pcAtChannelState
  if (idx >= 2) {
    return entry.pcAtChannelState ? "Partial" : "Available";
  }
  if (idx >= 1) return "Partial";
  return "Not Available";
}

function getSourcingMode(entry: NetworkEntry): "decentralized" | "centralized" {
  try {
    const parsed = JSON.parse(entry.sourcingMatrixSection ?? "");
    return (parsed?.mode as "decentralized" | "centralized") || "decentralized";
  } catch {
    return "decentralized";
  }
}

// Exact PB status strings that block mapping
const BLOCKED_BP_STATUSES = new Set(["Inactive Pack", "Stock Base Delisted", "Delisted Packs"]);

function isBpBlocked(status: string | undefined): boolean {
  return !!status && BLOCKED_BP_STATUSES.has(status);
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status, pbStatus }: { status: DepotStatus; pbStatus?: string }) {
  // Show the exact Paid Bible status string when overriding
  if (pbStatus) {
    return (
      <Badge
        variant="outline"
        className="text-amber-700 border-amber-300 bg-amber-50 text-xs whitespace-nowrap"
        data-testid="badge-status-pb-override"
      >
        {pbStatus}
      </Badge>
    );
  }
  if (status === "Mapped") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs" data-testid="badge-status-mapped">
      <CheckCircle2 className="h-3 w-3 mr-1" />Mapped
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs" data-testid="badge-status-non-mapped">
      <XCircle className="h-3 w-3 mr-1" />Non-Mapped
    </Badge>
  );
}

function PricingBadge({ status }: { status: PricingStatus }) {
  if (status === "Available") return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs" data-testid="badge-pricing-available">
      Available
    </Badge>
  );
  if (status === "Not Available") return (
    <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs" data-testid="badge-pricing-unavailable">
      Not Available
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs" data-testid="badge-pricing-partial">
      Partial
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CcrMasterMaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedChain, setSelectedChain] = useState<string>("");
  const [selectedCbu, setSelectedCbu] = useState<string>("");
  const [cicInput, setCicInput] = useState<string>("");
  const [sourcingDepotMap, setSourcingDepotMap] = useState<Record<string, string>>({});
  const [centralizedMappedSet, setCentralizedMappedSet] = useState<Set<string>>(new Set());

  // ── Data Queries ────────────────────────────────────────────────────────────

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/ccr/customers"],
  });

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const { data: codeMappings = [], isLoading: codeMappingsLoading } = useQuery<CodeMapping[]>({
    queryKey: ["/api/ccr/customers", selectedChain, "code-mapping"],
    queryFn: () =>
      fetch(`/api/ccr/customers/${encodeURIComponent(selectedChain)}/code-mapping`)
        .then(r => r.json()),
    enabled: !!selectedChain,
  });

  const { data: existingCicMappings = [], isLoading: cicLoading } = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings", selectedCbu, selectedChain],
    queryFn: () =>
      fetch(`/api/ccr/cic-mappings?cbu_code=${encodeURIComponent(selectedCbu)}&customer_chain=${encodeURIComponent(selectedChain)}`)
        .then(r => r.json()),
    enabled: !!selectedCbu && !!selectedChain,
  });

  const { data: bpStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/basepack-status"],
    queryFn: () => fetch("/api/basepack-status").then(r => r.ok ? r.json() : {}),
  });

  // ── Derived values ──────────────────────────────────────────────────────────

  const eligibleEntries = useMemo(
    () => networkEntries.filter(isEligibleCbu),
    [networkEntries],
  );

  const networkEntry = useMemo(
    () => networkEntries.find(e => e.cbuCode === selectedCbu) ?? null,
    [networkEntries, selectedCbu],
  );

  // Guard: selected CBU must be in the eligible list
  const cbuIsEligible = useMemo(
    () => !selectedCbu || eligibleEntries.some(e => e.cbuCode === selectedCbu),
    [eligibleEntries, selectedCbu],
  );

  const sourcingMode = useMemo(
    () => (networkEntry ? getSourcingMode(networkEntry) : "decentralized"),
    [networkEntry],
  );

  const basepackStatus: string | undefined = useMemo(() => {
    if (!networkEntry?.basepack) return undefined;
    return (bpStatusMap as Record<string, string>)[networkEntry.basepack];
  }, [networkEntry, bpStatusMap]);

  const pbBlocked = isBpBlocked(basepackStatus);

  // Keyed by `${customerCode}::${depot}` — depot-granular so multiple depots
  // per customer code each have their own entry (no overwrite collision).
  const cicByKey = useMemo(() => {
    const map: Record<string, CicMapping> = {};
    existingCicMappings.forEach(m => {
      const k = `${m.customerCode}::${m.depot ?? ""}`;
      map[k] = m;
    });
    return map;
  }, [existingCicMappings]);

  // ── Hydrate centralized UI state from persisted mappings ────────────────────
  // State keys are cm.id (code-mapping row ID) — depot-granular, never collides.
  const hydratedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!existingCicMappings.length || !codeMappings.length || !networkEntry) return;
    const key = `${selectedCbu}::${selectedChain}`;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;

    if (getSourcingMode(networkEntry) !== "centralized") return;

    // Build composite → cm.id lookup from loaded code mappings
    const depotKeyToCmId: Record<string, string> = {};
    codeMappings.forEach(cm => {
      depotKeyToCmId[`${cm.customerCode}::${cm.depot}`] = cm.id;
    });

    const newMapped = new Set<string>();
    const newSourcingMap: Record<string, string> = {};
    existingCicMappings.forEach(m => {
      if (m.status === "Mapped") {
        const cmId = depotKeyToCmId[`${m.customerCode}::${m.depot ?? ""}`];
        if (cmId) {
          newMapped.add(cmId);
          if (m.sourcingDepot) newSourcingMap[cmId] = m.sourcingDepot;
        }
      }
    });
    if (newMapped.size > 0) {
      setCentralizedMappedSet(newMapped);
      setSourcingDepotMap(newSourcingMap);
    }
  }, [existingCicMappings, codeMappings, networkEntry, selectedCbu, selectedChain]);

  const allDepots = useMemo(
    () => Array.from(new Set(codeMappings.map(m => m.depot))).sort(),
    [codeMappings],
  );

  // ── Row computation ─────────────────────────────────────────────────────────

  const rows: DepotRow[] = useMemo(() => {
    if (!codeMappings.length || !networkEntry) return [];

    // Per-row pricing (same entry, same result for all rows currently — but row-level for future depot-specific pricing)
    const rowPricing = computeRowPricingStatus(networkEntry);
    const srcMode = getSourcingMode(networkEntry);
    const srcType = srcMode === "decentralized" ? "Decentralized" : "Centralized";

    return codeMappings.map(cm => {
      // Depot-granular lookup: one entry per customerCode::depot combo
      const existing = cicByKey[`${cm.customerCode}::${cm.depot}`];
      const effectiveCic = cicInput || existing?.cic || "";

      let status: DepotStatus;
      let sourcingDepot: string;
      let pbStatus: string | undefined;

      if (pbBlocked) {
        status = basepackStatus!;
        sourcingDepot = existing?.sourcingDepot ?? "";
        pbStatus = basepackStatus;
      } else if (srcMode === "decentralized") {
        status = "Mapped";
        sourcingDepot = cm.depot;
      } else {
        // Use cm.id as the row key — depot-granular, no customerCode collision
        const isMapped = centralizedMappedSet.has(cm.id);
        status = isMapped ? "Mapped" : "Non-Mapped";
        sourcingDepot = isMapped ? (sourcingDepotMap[cm.id] || "") : "";
      }

      return {
        id: cm.id,
        customerCode: cm.customerCode,
        depot: cm.depot,
        subChannel: cm.subChannel,
        channel: cm.channel || "MT",
        status,
        pricingStatus: rowPricing,
        sourcingDepot,
        sourcingType: srcType,
        cic: effectiveCic,
        salesOrg: existing?.salesOrg ?? "1000",
        existingCicId: existing?.id,
        pbOverridden: pbBlocked,
        pbStatus,
      };
    });
  }, [
    codeMappings, networkEntry, cicInput, sourcingMode,
    sourcingDepotMap, centralizedMappedSet, cicByKey,
    pbBlocked, basepackStatus,
  ]);

  const mappedCount = rows.filter(r => !r.pbOverridden && r.status === "Mapped").length;
  const nonMappedCount = rows.filter(r => !r.pbOverridden && r.status === "Non-Mapped").length;

  // ── Validation ──────────────────────────────────────────────────────────────

  const validationErrors: string[] = useMemo(() => {
    const errs: string[] = [];
    if (!selectedChain) errs.push("Select a Customer Chain");
    if (!selectedCbu) errs.push("Select a CBU");
    if (selectedCbu && !cbuIsEligible) errs.push("CBU is not a relaunch or successor — only eligible CBUs may be mapped");
    if (selectedCbu && cbuIsEligible && !cicInput && !existingCicMappings.some(m => m.cic)) {
      errs.push("Enter a CIC code");
    }
    if (pbBlocked) errs.push(`Paid Bible status "${basepackStatus}" blocks mapping — resolve in Paid Bible first`);
    // In centralized mode, every Mapped row must have a sourcing depot selected
    if (sourcingMode === "centralized" && rows.length > 0) {
      const missingDepot = rows.filter(r => !r.pbOverridden && r.status === "Mapped" && !r.sourcingDepot);
      if (missingDepot.length > 0) {
        errs.push(`${missingDepot.length} Mapped row(s) are missing a Sourcing Depot selection`);
      }
    }
    return errs;
  }, [selectedChain, selectedCbu, cbuIsEligible, cicInput, existingCicMappings, pbBlocked, basepackStatus, sourcingMode, rows]);

  // ── Save Mutation ───────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Send ALL rows (Mapped + Non-Mapped) so the server has a complete picture
      const payload = rows.map(r => ({
        cbuCode: selectedCbu,
        basepack: networkEntry?.basepack ?? null,
        customerChain: selectedChain,
        customerCode: r.customerCode,
        cic: r.cic || null,
        salesOrg: r.salesOrg,
        channel: r.channel,
        depot: r.depot,
        status: r.pbOverridden ? "Non-Mapped" : r.status,
        sourcingDepot: r.sourcingDepot || null,
        sourcingType: r.sourcingType,
        pricingStatus: r.pricingStatus,
      }));
      return apiRequest("PUT", "/api/ccr/cic-mappings", { mappings: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings", selectedCbu, selectedChain] });
      toast({
        title: "Mapping saved",
        description: `${rows.length} row(s) saved — ${mappedCount} Mapped, ${nonMappedCount} Non-Mapped.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // ── Export ──────────────────────────────────────────────────────────────────

  function handleExport() {
    if (!rows.length) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const data = rows.map(r => ({
      "CBU Code": selectedCbu,
      "Basepack": networkEntry?.basepack ?? "",
      "Customer Chain": selectedChain,
      "Customer Code": r.customerCode,
      "CIC": r.cic,
      "Sales Org": r.salesOrg,
      "Channel": r.channel,
      "Depot": r.depot,
      "Sub Channel": r.subChannel,
      "Status": r.pbOverridden ? r.pbStatus ?? "Non-Mapped" : r.status,
      "Pricing Status": r.pricingStatus,
      "Sourcing Depot": r.sourcingDepot,
      "Sourcing Type": r.sourcingType,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CCR Mapping");
    XLSX.writeFile(wb, `CCR_Mapping_${selectedCbu}_${selectedChain}_${today}.xlsx`);
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChainChange(chain: string) {
    setSelectedChain(chain);
    setSourcingDepotMap({});
    setCentralizedMappedSet(new Set());
  }

  function handleCbuChange(cbuCode: string) {
    setSelectedCbu(cbuCode);
    setCicInput("");
    setSourcingDepotMap({});
    setCentralizedMappedSet(new Set());
  }

  // Handlers use cm.id (depot-granular) — not customerCode — so each depot row
  // is independently toggleable even when multiple share the same customer code.
  function toggleCentralizedMapped(rowId: string) {
    setCentralizedMappedSet(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
        setSourcingDepotMap(sm => {
          const n = { ...sm };
          delete n[rowId];
          return n;
        });
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  function handleSourcingDepotChange(rowId: string, depot: string) {
    setSourcingDepotMap(prev => ({ ...prev, [rowId]: depot }));
  }

  const isLoading = customersLoading || entriesLoading;
  const gridLoading = codeMappingsLoading || cicLoading;
  const canSave = validationErrors.length === 0 && rows.length > 0 && !saveMutation.isPending;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-bold text-foreground">CCR Master Maintenance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure Customer Code-to-CIC depot mappings for relaunch and successor CBUs
          </p>
        </div>

        {/* ── Mapping Configuration panel ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Mapping Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Customer Chain */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Customer Chain
                </Label>
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={selectedChain} onValueChange={handleChainChange}>
                    <SelectTrigger data-testid="select-customer-chain" className="h-9">
                      <SelectValue placeholder="Select chain…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem
                          key={c.id}
                          value={c.customerChain}
                          data-testid={`option-chain-${c.customerChain}`}
                        >
                          {c.customerChain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* CBU selector (relaunch / successor only) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  CBU (Relaunch / Successor)
                </Label>
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={selectedCbu} onValueChange={handleCbuChange}>
                    <SelectTrigger data-testid="select-cbu" className="h-9">
                      <SelectValue placeholder="Select CBU…" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleEntries.length === 0 && (
                        <SelectItem value="__none__" disabled>No eligible CBUs found</SelectItem>
                      )}
                      {eligibleEntries.map(e => (
                        <SelectItem
                          key={e.id}
                          value={e.cbuCode ?? ""}
                          data-testid={`option-cbu-${e.cbuCode}`}
                        >
                          <span className="font-mono text-xs">{e.cbuCode}</span>
                          {(e.basepackDescription || e.materialDescription) && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              {e.basepackDescription || e.materialDescription}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* CIC Code input */}
              <div className="space-y-1.5">
                <Label
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  htmlFor="cic-input"
                >
                  CIC Code
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
                    disabled={!selectedCbu}
                  />
                </div>
                {existingCicMappings.length > 0 && !cicInput && (
                  <p className="text-[10px] text-muted-foreground">Existing CIC values shown per row</p>
                )}
              </div>

              {/* Sourcing Type (read-only, derived from network entry) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sourcing Type
                </Label>
                <div className="h-9 flex items-center">
                  {networkEntry ? (
                    <Badge
                      className={
                        sourcingMode === "decentralized"
                          ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100"
                          : "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100"
                      }
                      data-testid="badge-sourcing-mode"
                    >
                      {sourcingMode === "decentralized" ? "Decentralized" : "Centralized"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* CBU detail strip */}
            {networkEntry && (
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {networkEntry.materialDescription || networkEntry.basepackDescription || networkEntry.cbuCode}
                </span>
                {networkEntry.basepack && (
                  <span>Basepack: <span className="font-mono font-medium text-foreground">{networkEntry.basepack}</span></span>
                )}
                <span className="flex items-center gap-1">
                  <Warehouse className="h-3 w-3" />
                  {getNetworkChangeTypeName(networkEntry.typeOfNetwork)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium text-foreground">{networkEntry.networkStatus}</span>
                </span>
                <span>
                  Pricing: <PricingBadge status={computeRowPricingStatus(networkEntry)} />
                </span>
                {networkEntry.pcAtChannelState && (
                  <span>PC Level: <span className="font-medium text-foreground">{networkEntry.pcAtChannelState}</span></span>
                )}
                {networkEntry.predecessorCode && (
                  <span>
                    Predecessor: <span className="font-mono font-medium text-foreground">{networkEntry.predecessorCode}</span>
                  </span>
                )}
              </div>
            )}

            {/* Paid Bible blocking alert */}
            {pbBlocked && networkEntry && (
              <Alert className="mt-3 border-amber-200 bg-amber-50" data-testid="alert-pb-blocked">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  <strong>Paid Bible override:</strong> Basepack{" "}
                  <span className="font-mono">{networkEntry.basepack}</span> is marked{" "}
                  <strong>"{basepackStatus}"</strong>. All depot rows show this status automatically.
                  Mapping submission is blocked until the Paid Bible status is resolved.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ── Depot Mapping Grid ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                Depot Mapping Grid
                {selectedChain && (
                  <span className="ml-1 text-muted-foreground font-normal">— {selectedChain}</span>
                )}
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
                        {nonMappedCount} Non-Mapped
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
            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="px-4 pb-3">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 text-xs space-y-0.5">
                    {validationErrors.map((e, i) => (
                      <div key={i}>• {e}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Grid loading skeleton */}
            {gridLoading && selectedChain && (
              <div className="px-4 pb-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}

            {/* No chain selected hint */}
            {!selectedChain && (
              <div className="px-4 pb-6 text-center text-sm text-muted-foreground py-10" data-testid="text-select-chain">
                Select a Customer Chain to load the depot mapping grid.
              </div>
            )}

            {/* Empty state for selected chain */}
            {!gridLoading && selectedChain && !codeMappings.length && (
              <div className="px-4 pb-6 text-center text-sm text-muted-foreground py-10" data-testid="text-empty-grid">
                No customer code mappings found for <strong>{selectedChain}</strong>.
              </div>
            )}

            {/* Table — shows once chain + CBU are selected and data loaded */}
            {!gridLoading && rows.length > 0 && (
              <div className="overflow-x-auto">
                <Table data-testid="table-depot-grid">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      {sourcingMode === "centralized" && (
                        <TableHead className="w-10 text-center text-xs font-semibold sticky left-0 bg-muted/30">Map</TableHead>
                      )}
                      <TableHead className="text-xs font-semibold whitespace-nowrap">CBU Code</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Basepack</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Customer Chain</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Customer Code</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">CIC</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sales Org</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Channel</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Depot</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sub Channel</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Pricing</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sourcing Depot</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Sourcing Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow
                        key={row.id}
                        className={
                          row.pbOverridden
                            ? "bg-amber-50/50"
                            : row.status === "Non-Mapped"
                            ? "bg-muted/20"
                            : ""
                        }
                        data-testid={`row-depot-${row.customerCode}`}
                      >
                        {/* Centralized: checkbox to mark row as Mapped */}
                        {sourcingMode === "centralized" && (
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={centralizedMappedSet.has(row.id)}
                              onChange={() => toggleCentralizedMapped(row.id)}
                              disabled={row.pbOverridden || !selectedCbu}
                              className="h-4 w-4 accent-primary"
                              data-testid={`checkbox-mapped-${row.customerCode}`}
                            />
                          </TableCell>
                        )}

                        <TableCell className="font-mono text-xs" data-testid={`text-cbu-${row.customerCode}`}>
                          {selectedCbu}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground" data-testid={`text-basepack-${row.customerCode}`}>
                          {networkEntry?.basepack ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs" data-testid={`text-chain-${row.customerCode}`}>
                          {selectedChain}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium" data-testid={`text-customer-code-${row.customerCode}`}>
                          {row.customerCode}
                        </TableCell>
                        <TableCell className="font-mono text-xs" data-testid={`text-cic-${row.customerCode}`}>
                          {row.cic || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" data-testid={`text-sales-org-${row.customerCode}`}>
                          {row.salesOrg}
                        </TableCell>
                        <TableCell className="text-xs" data-testid={`text-channel-${row.customerCode}`}>
                          {row.channel}
                        </TableCell>
                        <TableCell className="text-sm font-medium" data-testid={`text-depot-${row.customerCode}`}>
                          {row.depot}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" data-testid={`text-sub-channel-${row.customerCode}`}>
                          {row.subChannel}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${row.customerCode}`}>
                          <StatusBadge
                            status={row.status}
                            pbStatus={row.pbStatus}
                          />
                        </TableCell>
                        <TableCell data-testid={`cell-pricing-${row.customerCode}`}>
                          <PricingBadge status={row.pricingStatus} />
                        </TableCell>
                        <TableCell data-testid={`cell-sourcing-depot-${row.customerCode}`}>
                          {sourcingMode === "decentralized" ? (
                            <span className="text-sm font-medium">{row.sourcingDepot || "—"}</span>
                          ) : centralizedMappedSet.has(row.id) && !row.pbOverridden ? (
                            <Select
                              value={sourcingDepotMap[row.id] || ""}
                              onValueChange={v => handleSourcingDepotChange(row.id, v)}
                            >
                              <SelectTrigger
                                className="h-7 text-xs w-36"
                                data-testid={`select-sourcing-depot-${row.customerCode}`}
                              >
                                <SelectValue placeholder="Select depot…" />
                              </SelectTrigger>
                              <SelectContent>
                                {allDepots.map(d => (
                                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground" data-testid={`text-sourcing-type-${row.customerCode}`}>
                          {row.sourcingType}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Show code-mapping rows even before CBU is chosen (still useful for the CSE to see depots) */}
            {!gridLoading && selectedChain && codeMappings.length > 0 && !networkEntry && (
              <div className="overflow-x-auto">
                <Table data-testid="table-depot-grid-preview">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">Customer Code</TableHead>
                      <TableHead className="text-xs font-semibold">Depot</TableHead>
                      <TableHead className="text-xs font-semibold">Sub Channel</TableHead>
                      <TableHead className="text-xs font-semibold">Channel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codeMappings.map(cm => (
                      <TableRow key={cm.id} className="opacity-60" data-testid={`row-preview-${cm.customerCode}`}>
                        <TableCell className="font-mono text-xs font-medium">{cm.customerCode}</TableCell>
                        <TableCell className="text-sm">{cm.depot}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cm.subChannel}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{cm.channel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t">
                  Select a CBU to generate the full mapping grid with status and pricing.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Action bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1">
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
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!rows.length && !codeMappings.length}
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Excel
            </Button>

            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
              data-testid="button-save-mapping"
            >
              {saveMutation.isPending ? (
                <>Saving…</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Mapping
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
