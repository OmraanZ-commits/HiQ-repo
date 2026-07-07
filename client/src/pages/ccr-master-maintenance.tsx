import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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

// ─── New Launch filter ────────────────────────────────────────────────────────
// Per BRD §8: Master Maintenance is applicable only for new launch CBUs.
// CCR (relaunch / predecessor-successor transitions) is handled separately.

const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM",
  "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

function isEligibleCbu(entry: NetworkEntry): boolean {
  // New launches only: no predecessor CBU and not a relaunch change type
  return !entry.predecessorCode && !RELAUNCH_TYPES.has(entry.typeOfNetwork ?? "");
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

// ─── CCR Dashboard cell helpers ───────────────────────────────────────────────

function formatCbuDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr ?? "—";
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-emerald-600",
  "bg-amber-600", "bg-rose-600", "bg-cyan-600", "bg-indigo-600",
];

function avatarColor(name: string | null | undefined): string {
  if (!name) return "bg-slate-400";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function AssignedPersonCell({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white text-[10px] font-semibold flex-shrink-0 ${avatarColor(name)}`}>
        {getInitials(name)}
      </span>
      <span className="text-sm">{name}</span>
    </div>
  );
}

function LifecycleStatusCell({ status }: { status: string | null | undefined }) {
  const idx = STATUS_IDX[status ?? ""] ?? -1;
  if (idx >= 4) {
    return (
      <Badge className="bg-primary text-primary-foreground hover:bg-primary text-xs whitespace-nowrap" data-testid="badge-lifecycle-active">
        {status}
      </Badge>
    );
  }
  return (
    <span className={`text-sm font-semibold ${idx >= 0 ? "text-foreground" : "text-muted-foreground"}`}>
      {status || "—"}
    </span>
  );
}

function TriggerDot({ status }: { status: string | null | undefined }) {
  const idx = STATUS_IDX[status ?? ""] ?? -1;
  if (idx < 3) return <span className="text-xs text-muted-foreground">—</span>;
  if (idx >= 5) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Red" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" title="Amber" />;
}

function PostingStatusBadge({ status }: { status: string }) {
  if (status === "Posted") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs" data-testid="badge-posting-posted">
      Posted
    </Badge>
  );
  if (status === "Saved") return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs" data-testid="badge-posting-saved">
      Saved
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs" data-testid="badge-posting-pending">
      Pending
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CcrMasterMaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

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

  const { data: postingStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ccr/cic-mappings/summary"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/summary"] });
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
            Configure Customer Code-to-CIC depot mappings for new launch CBUs
          </p>
        </div>

        {/* Scope banner */}
        <Alert className="border-sky-200 bg-sky-50 text-sky-800">
          <Info className="h-4 w-4 text-sky-600" />
          <AlertDescription className="text-sm">
            <span className="font-semibold">New Launch CBUs only.</span>{" "}
            Master Maintenance covers initial CIC creation and depot-level mapping activation for new launches.
            Relaunch / predecessor–successor transitions are handled through the{" "}
            <a href="/ccr" className="underline font-medium">CCR Workspace</a>.
          </AlertDescription>
        </Alert>

        {/* ── CBU Overview Table ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              CBU Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : eligibleEntries.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No eligible new launch CBUs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-cbu-overview">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold whitespace-nowrap pl-4">CBU Code</TableHead>
                      <TableHead className="text-xs font-semibold">Material Description</TableHead>
                      <TableHead className="text-xs font-semibold">Brand</TableHead>
                      <TableHead className="text-xs font-semibold">BG</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Type of Network</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Assigned Person</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">CBU Created Date</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Network Status</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Trigger</TableHead>
                      <TableHead className="text-xs font-semibold whitespace-nowrap">Posting Status</TableHead>
                      <TableHead className="text-xs font-semibold pr-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleEntries.map(entry => (
                      <TableRow
                        key={entry.id}
                        onClick={() => handleCbuChange(entry.cbuCode ?? "")}
                        className={
                          selectedCbu === entry.cbuCode
                            ? "bg-primary/5 border-l-2 border-l-primary cursor-pointer"
                            : "cursor-pointer hover:bg-muted/40"
                        }
                        data-testid={`row-cbu-${entry.cbuCode}`}
                      >
                        <TableCell className="font-mono text-xs font-medium pl-4 whitespace-nowrap">
                          {entry.cbuCode}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px]">
                          <span className="line-clamp-1">{entry.materialDescription || entry.basepackDescription || "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm font-semibold whitespace-nowrap">
                          {entry.brand || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {entry.bg || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {getNetworkChangeTypeName(entry.typeOfNetwork)}
                        </TableCell>
                        <TableCell>
                          <AssignedPersonCell name={(entry as any).assignedPerson} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatCbuDate(entry.cbuCreatedDate)}
                        </TableCell>
                        <TableCell>
                          <LifecycleStatusCell status={entry.networkStatus} />
                        </TableCell>
                        <TableCell className="text-center">
                          <TriggerDot status={entry.networkStatus} />
                        </TableCell>
                        <TableCell>
                          <PostingStatusBadge status={postingStatusMap[entry.cbuCode ?? ""] ?? "Pending"} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            data-testid={`btn-configure-${entry.cbuCode}`}
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}`);
                            }}
                          >
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
