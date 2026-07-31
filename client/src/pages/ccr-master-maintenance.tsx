import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Send, Mail, ChevronRight, ChevronDown, Tag, Building2,
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

// ─── Eligibility ──────────────────────────────────────────────────────────────

const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM",
  "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

const STATUS_IDX: Record<string, number> = {
  "Draft": 0,
  "Active": 1,
  "Pricing Updated": 2,
  "Production Started": 3,
  "FTR Approved": 4,
  "Stock Movement Initiated": 5,
  "Network transition complete": 6,
};

function isEligibleCbu(entry: NetworkEntry): boolean {
  const statusIdx = STATUS_IDX[entry.networkStatus ?? ""] ?? 0;
  if (statusIdx < STATUS_IDX["Production Started"]) return false;
  return !RELAUNCH_TYPES.has(entry.typeOfNetwork ?? "");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCbuDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr ?? "—";
  }
}

const LIFECYCLE_SHORT: Record<string, string> = {
  "FTR Approved": "FTR Approved",
  "Stock Movement Initiated": "Stock Moving",
  "Network transition complete": "NTC ✓",
};

// ─── Small badge/cell components ─────────────────────────────────────────────

function BpStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const styles =
    status === "Active"         ? "bg-emerald-100 text-emerald-700" :
    status === "Draft"          ? "bg-amber-100 text-amber-700" :
    status.includes("Delisted") ? "bg-red-100 text-red-700" :
    status === "Inactive"       ? "bg-slate-100 text-slate-500" :
                                  "bg-slate-100 text-slate-600";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${styles}`}>
      {status}
    </span>
  );
}

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const idx = STATUS_IDX[status ?? ""] ?? -1;
  if (idx >= 4) {
    const short = LIFECYCLE_SHORT[status ?? ""] ?? status;
    const isNtc = status === "Network transition complete";
    return (
      <span
        title={status ?? undefined}
        className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
          isNtc ? "bg-[#1f36c7]/10 text-[#1f36c7]" : "bg-primary text-primary-foreground"
        }`}
      >
        {short}
      </span>
    );
  }
  return (
    <span className={`text-xs font-semibold ${idx >= 0 ? "text-foreground" : "text-muted-foreground"}`}>
      {status || "—"}
    </span>
  );
}

function PostingStatusBadge({ status }: { status: string }) {
  if (status === "Posted") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Posted</Badge>
  );
  if (status === "Saved") return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Saved</Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs">Pending</Badge>
  );
}

function ChainMappingBadge({ mapped }: { mapped: boolean }) {
  if (mapped) return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
      <CheckCircle2 className="h-3 w-3" /> Mapped
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs">Not Mapped</Badge>
  );
}

// ─── Chain summary data type ──────────────────────────────────────────────────

type ChainCompletionEntry = { applicable: string[]; saved: string[]; status: "complete" | "partial" | "none" };

type ChainGroup = {
  customer: Customer;
  chainName: string;
  cbus: NetworkEntry[];
  mappedCount: number;    // CBUs where this chain appears in saved[]
  totalCount: number;
  postedCount: number;
};

// ─── Chain-Grouped View ───────────────────────────────────────────────────────

type ChainGroupedViewProps = {
  entries: NetworkEntry[];
  customers: Customer[];
  depotChangeSummary: Record<string, ChainCompletionEntry>;
  postingStatusMap: Record<string, string>;
  bpStatusMap: Record<string, string>;
  isLoading: boolean;
  emptyMessage: string;
  // Filters (already applied to entries by parent, but chain/text filters applied here)
  filterChain: string;
  filterBasepack: string;
  filterCbu: string;
  filterNetworkType: string;
  // Expand state
  expandedChains: Set<string>;
  onToggleChain: (chain: string) => void;
  // Selection (Completed tab)
  selectable?: boolean;
  selectedCbus?: Set<string>;
  onToggleCbu?: (cbuCode: string) => void;
  onToggleAll?: (cbuCodes: string[], checked: boolean) => void;
  // Navigation
  onNavigate: (path: string) => void;
};

function ChainGroupedView({
  entries, customers, depotChangeSummary, postingStatusMap, bpStatusMap,
  isLoading, emptyMessage,
  filterChain, filterBasepack, filterCbu, filterNetworkType,
  expandedChains, onToggleChain,
  selectable, selectedCbus, onToggleCbu, onToggleAll,
  onNavigate,
}: ChainGroupedViewProps) {

  // Build chain groups from the tab-filtered entries
  const chainGroups: ChainGroup[] = useMemo(() => {
    // Map chain → CBUs (from depotChangeSummary.applicable)
    const chainMap: Record<string, NetworkEntry[]> = {};
    entries.forEach(entry => {
      const summary = depotChangeSummary[entry.cbuCode ?? ""];
      const applicable = summary?.applicable ?? [];
      applicable.forEach(chain => {
        if (!chainMap[chain]) chainMap[chain] = [];
        chainMap[chain].push(entry);
      });
    });

    return customers
      .map(customer => {
        const chain = customer.customerChain;
        let cbus = chainMap[chain] ?? [];

        // Apply text/type filters
        if (filterBasepack) cbus = cbus.filter(e => (e.basepack ?? "").toLowerCase().includes(filterBasepack.toLowerCase()));
        if (filterCbu) cbus = cbus.filter(e => (e.cbuCode ?? "").toLowerCase().includes(filterCbu.toLowerCase()));
        if (filterNetworkType !== "all") cbus = cbus.filter(e => e.typeOfNetwork === filterNetworkType);
        // Apply chain filter
        if (filterChain !== "all" && chain !== filterChain) return null;

        if (cbus.length === 0) return null;

        const mappedCount = cbus.filter(e =>
          depotChangeSummary[e.cbuCode ?? ""]?.saved?.includes(chain)
        ).length;
        const postedCount = cbus.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Posted").length;

        return { customer, chainName: chain, cbus, mappedCount, totalCount: cbus.length, postedCount };
      })
      .filter(Boolean) as ChainGroup[];
  }, [entries, customers, depotChangeSummary, postingStatusMap, filterChain, filterBasepack, filterCbu, filterNetworkType]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (chainGroups.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="divide-y">
      {chainGroups.map(group => {
        const isExpanded = expandedChains.has(group.chainName);
        const pct = group.totalCount > 0 ? Math.round((group.mappedCount / group.totalCount) * 100) : 0;
        const allMapped = group.mappedCount === group.totalCount;
        const noneMapped = group.mappedCount === 0;

        // For selectable tabs: all selectable CBUs in this chain
        const selectableCbusInGroup = selectable
          ? group.cbus.filter(e => postingStatusMap[e.cbuCode ?? ""] !== "Posted").map(e => e.cbuCode ?? "")
          : [];
        const allGroupSelected = selectable && selectableCbusInGroup.length > 0
          && selectableCbusInGroup.every(c => selectedCbus?.has(c));
        const someGroupSelected = selectable
          && selectableCbusInGroup.some(c => selectedCbus?.has(c))
          && !allGroupSelected;

        return (
          <div key={group.chainName} className="bg-background">
            {/* ── Chain header row ─────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
              onClick={() => onToggleChain(group.chainName)}
            >
              {/* Expand toggle */}
              <span className="text-muted-foreground flex-shrink-0">
                {isExpanded
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </span>

              {/* Chain name + tags */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm text-foreground truncate">{group.chainName}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-5 flex-shrink-0">
                {/* CBU count */}
                <div className="text-center hidden sm:block">
                  <div className="text-xs font-semibold text-foreground">{group.totalCount}</div>
                  <div className="text-[10px] text-muted-foreground">CBUs</div>
                </div>

                {/* Mapping progress */}
                <div className="flex flex-col items-end gap-0.5 w-28">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-muted-foreground">Mapped</span>
                    <span className={`text-[10px] font-semibold ${allMapped ? "text-emerald-600" : noneMapped ? "text-slate-400" : "text-amber-600"}`}>
                      {group.mappedCount}/{group.totalCount}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${allMapped ? "bg-emerald-500" : noneMapped ? "bg-slate-200" : "bg-amber-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Posted count */}
                {group.postedCount > 0 && (
                  <div className="text-center hidden md:block">
                    <div className="text-xs font-semibold text-emerald-600">{group.postedCount}</div>
                    <div className="text-[10px] text-muted-foreground">Posted</div>
                  </div>
                )}

                {/* Status chip */}
                <div className="w-24 text-right">
                  {allMapped ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Complete</span>
                  ) : noneMapped ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not Started</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Expanded: CBU sub-table ───────────────────────────────── */}
            {isExpanded && (
              <div className="border-t bg-muted/5">
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        {/* indent spacer */}
                        <TableHead className="w-[2%]" />
                        {selectable && (
                          <TableHead className="w-[3%]">
                            <Checkbox
                              checked={allGroupSelected ? true : someGroupSelected ? "indeterminate" : false}
                              onCheckedChange={v => onToggleAll?.(selectableCbusInGroup, !!v)}
                              aria-label={`Select all in ${group.chainName}`}
                            />
                          </TableHead>
                        )}
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[7%]">Basepack ID</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[8%]">BP Status</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[11%]">CBU Code</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[16%]">Material Description</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[7%]">Brand</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[9%]">Network Type</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[10%]">Network Change Date</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[11%]">Network Status</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[8%]">Chain Status</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[7%]">Posting</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap pr-4 text-right w-[6%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.cbus.map((entry, rowIdx) => {
                        const bpStatus = entry.basepack ? (bpStatusMap[entry.basepack] ?? null) : null;
                        const isActiveBp = bpStatus === "Active";
                        const networkOk = (STATUS_IDX[entry.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"];
                        const canConfigure = isActiveBp && networkOk;
                        const disabledTitle = !isActiveBp
                          ? "Configure is only available for Active basepacks"
                          : "CCR mapping is only available after Stock Movement Initiated";
                        const mappedForChain = depotChangeSummary[entry.cbuCode ?? ""]?.saved?.includes(group.chainName) ?? false;
                        const isSelected = selectable && selectedCbus?.has(entry.cbuCode ?? "");

                        return (
                          <TableRow
                            key={`${group.chainName}-${entry.id}`}
                            className={`${isSelected ? "bg-blue-50" : rowIdx % 2 === 1 ? "bg-muted/10" : ""} hover:bg-muted/20`}
                          >
                            {/* indent spacer */}
                            <TableCell className="pl-8" />
                            {selectable && (
                              <TableCell onClick={e => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected ?? false}
                                  onCheckedChange={() => onToggleCbu?.(entry.cbuCode ?? "")}
                                  aria-label={`Select ${entry.cbuCode}`}
                                />
                              </TableCell>
                            )}
                            <TableCell className="py-2 text-xs font-mono">{entry.basepack ?? "—"}</TableCell>
                            <TableCell className="py-2"><BpStatusBadge status={bpStatus} /></TableCell>
                            <TableCell className="py-2 font-mono text-xs font-medium">{entry.cbuCode}</TableCell>
                            <TableCell className="py-2 text-xs">
                              <span className="truncate block max-w-full">
                                {entry.materialDescription || entry.basepackDescription || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-xs font-semibold truncate">{entry.brand || "—"}</TableCell>
                            <TableCell className="py-2 text-xs whitespace-nowrap">
                              {getNetworkChangeTypeName(entry.typeOfNetwork)}
                            </TableCell>
                            <TableCell className="py-2 text-xs whitespace-nowrap">
                              {(() => {
                                const raw = (entry as any).startDate;
                                const formatted = formatCbuDate(raw);
                                const isPast = raw && new Date(raw + "T00:00:00") < new Date();
                                return (
                                  <span className={isPast ? "text-amber-600 font-medium" : "text-muted-foreground"} title={isPast ? "Date is in the past" : undefined}>
                                    {formatted}{isPast && " ⚠"}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="py-2">
                              <NetworkStatusBadge status={entry.networkStatus} />
                            </TableCell>
                            <TableCell className="py-2">
                              <ChainMappingBadge mapped={mappedForChain} />
                            </TableCell>
                            <TableCell className="py-2">
                              <PostingStatusBadge status={postingStatusMap[entry.cbuCode ?? ""] ?? "Pending"} />
                            </TableCell>
                            <TableCell className="pr-4 py-2 text-right">
                              <div title={canConfigure ? undefined : disabledTitle} className="inline-block">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2.5"
                                  disabled={!canConfigure}
                                  onClick={() => onNavigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}`)}
                                >
                                  Configure
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CcrMasterMaintenancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterChain, setFilterChain] = useState<string>("all");
  const [filterBasepack, setFilterBasepack] = useState<string>("");
  const [filterCbu, setFilterCbu] = useState<string>("");
  const [filterNetworkType, setFilterNetworkType] = useState<string>("all");

  // ── Expand/collapse ────────────────────────────────────────────────────────
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  function toggleChain(chain: string) {
    setExpandedChains(prev => {
      const next = new Set(prev);
      if (next.has(chain)) next.delete(chain); else next.add(chain);
      return next;
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("new-launch");

  // ── Bulk-select (Completed tab) ────────────────────────────────────────────
  const [completedSelected, setCompletedSelected] = useState<Set<string>>(new Set());
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  function handleToggleCbu(cbuCode: string) {
    setCompletedSelected(prev => {
      const next = new Set(prev);
      if (next.has(cbuCode)) next.delete(cbuCode); else next.add(cbuCode);
      return next;
    });
  }

  function handleToggleAll(cbuCodes: string[], checked: boolean) {
    setCompletedSelected(prev => {
      const next = new Set(prev);
      if (checked) cbuCodes.forEach(c => next.add(c));
      else cbuCodes.forEach(c => next.delete(c));
      return next;
    });
  }

  // ── Data queries ───────────────────────────────────────────────────────────

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/ccr/customers"],
  });

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const { data: bpStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/basepack-status"],
    queryFn: () => fetch("/api/basepack-status").then(r => r.ok ? r.json() : {}),
  });

  const { data: postingStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ccr/cic-mappings/summary"],
  });

  const { data: depotChangeSummary = {} } = useQuery<Record<string, ChainCompletionEntry>>({
    queryKey: ["/api/ccr/cic-mappings/depot-change-summary"],
  });

  // ── Derived: eligible entries ──────────────────────────────────────────────

  const eligibleEntries = useMemo(
    () => networkEntries.filter(isEligibleCbu),
    [networkEntries],
  );

  // "CBU Overview" — not fully mapped or not yet saved for all chains
  const newLaunchEntries = useMemo(
    () => eligibleEntries.filter(e => {
      const s = depotChangeSummary[e.cbuCode ?? ""];
      if (postingStatusMap[e.cbuCode ?? ""] === "Posted") return false;
      return !s || s.status === "none" || s.status === "partial";
    }),
    [eligibleEntries, depotChangeSummary, postingStatusMap],
  );

  // "Completed" — all chains mapped, not yet posted
  const completedEntries = useMemo(
    () => eligibleEntries.filter(e => {
      const s = depotChangeSummary[e.cbuCode ?? ""];
      return s?.status === "complete" && postingStatusMap[e.cbuCode ?? ""] !== "Posted";
    }),
    [eligibleEntries, depotChangeSummary, postingStatusMap],
  );

  // "Posted"
  const postedEntries = useMemo(
    () => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Posted"),
    [eligibleEntries, postingStatusMap],
  );

  // ── Derived: unique network types for filter dropdown ──────────────────────

  const networkTypes = useMemo(() => {
    const s = new Set<string>();
    eligibleEntries.forEach(e => { if (e.typeOfNetwork) s.add(e.typeOfNetwork); });
    return Array.from(s).sort();
  }, [eligibleEntries]);

  // ── Post & Notify mutation ─────────────────────────────────────────────────

  const postMutation = useMutation({
    mutationFn: async (cbuCodes: string[]) =>
      apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: cbuCodes, posted_by: "demo-user" }),
    onSuccess: (_data, cbuCodes) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/depot-change-summary"] });
      setCompletedSelected(new Set());
      setPostDialogOpen(false);
      toast({
        title: "Notifications sent",
        description: `${cbuCodes.length} CBU${cbuCodes.length > 1 ? "s" : ""} posted — stakeholder emails queued.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Post failed", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = customersLoading || entriesLoading;

  // ── Shared view props ──────────────────────────────────────────────────────

  const sharedViewProps = {
    customers,
    depotChangeSummary,
    postingStatusMap,
    bpStatusMap,
    isLoading,
    filterChain,
    filterBasepack,
    filterCbu,
    filterNetworkType,
    expandedChains,
    onToggleChain: toggleChain,
    onNavigate: navigate,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-bold text-foreground">CCR Master Maintenance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customer chain–level view of CCR mappings for new launch CBUs
          </p>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-shrink-0">
              <Tag className="h-3.5 w-3.5" />
              Filters
            </div>

            {/* Customer Chain */}
            <div className="flex-1 min-w-[160px] max-w-[200px]">
              <Select value={filterChain} onValueChange={setFilterChain}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Chains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Chains</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.customerChain} className="text-xs">
                      {c.customerChain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base Pack */}
            <div className="flex-1 min-w-[130px] max-w-[160px]">
              <Input
                placeholder="Base Pack…"
                value={filterBasepack}
                onChange={e => setFilterBasepack(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* CBU */}
            <div className="flex-1 min-w-[130px] max-w-[160px]">
              <Input
                placeholder="CBU code…"
                value={filterCbu}
                onChange={e => setFilterCbu(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Network Type */}
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <Select value={filterNetworkType} onValueChange={setFilterNetworkType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Network Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Network Types</SelectItem>
                  {networkTypes.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {getNetworkChangeTypeName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear */}
            {(filterChain !== "all" || filterBasepack || filterCbu || filterNetworkType !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterChain("all");
                  setFilterBasepack("");
                  setFilterCbu("");
                  setFilterNetworkType("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </Card>

        {/* ── Main chain-grouped table ─────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>

            {/* Tab header */}
            <div className="border-b px-4 pt-3 flex items-center justify-between">
              <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 justify-start rounded-none">
                <TabsTrigger
                  value="new-launch"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium"
                >
                  CBU Overview
                  {newLaunchEntries.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                      {newLaunchEntries.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium"
                >
                  Completed
                  {completedEntries.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                      {completedEntries.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="posted"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 h-9 text-xs font-medium"
                >
                  Posted
                  {postedEntries.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                      {postedEntries.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── CBU Overview tab ──────────────────────────────────────── */}
            <TabsContent value="new-launch" className="mt-0">
              <ChainGroupedView
                {...sharedViewProps}
                entries={newLaunchEntries}
                emptyMessage="No unmapped new launch CBUs."
              />
            </TabsContent>

            {/* ── Completed tab ─────────────────────────────────────────── */}
            <TabsContent value="completed" className="mt-0">
              {completedSelected.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {completedSelected.size} CBU{completedSelected.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-blue-700"
                      onClick={() => setCompletedSelected(new Set())}
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-[#1f36c7] hover:bg-[#1730b0]"
                      onClick={() => setPostDialogOpen(true)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Post &amp; Notify
                    </Button>
                  </div>
                </div>
              )}
              <ChainGroupedView
                {...sharedViewProps}
                entries={completedEntries}
                emptyMessage="No CBUs ready to post yet — configure all customer chains first."
                selectable
                selectedCbus={completedSelected}
                onToggleCbu={handleToggleCbu}
                onToggleAll={handleToggleAll}
              />
            </TabsContent>

            {/* ── Posted tab ────────────────────────────────────────────── */}
            <TabsContent value="posted" className="mt-0">
              <ChainGroupedView
                {...sharedViewProps}
                entries={postedEntries}
                emptyMessage="No posted CBUs yet."
              />
            </TabsContent>

          </Tabs>
        </Card>

      </div>

      {/* ── Post & Notify dialog ──────────────────────────────────────────────── */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#1f36c7]" />
              Post &amp; Notify Stakeholders
            </DialogTitle>
            <DialogDescription>
              A DC mapping template will be sent to the relevant stakeholders for the
              {completedSelected.size === 1 ? " following CBU" : ` following ${completedSelected.size} CBUs`}.
              Once posted, the CBUs will move to the <strong>Posted</strong> tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...completedSelected].map(cbu => {
              const entry = completedEntries.find(e => e.cbuCode === cbu);
              return (
                <div key={cbu} className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{cbu}</span>
                    {entry && (
                      <p className="text-xs text-foreground leading-tight mt-0.5">
                        {entry.materialDescription || entry.basepackDescription || "—"}
                        {entry.brand && <span className="text-muted-foreground"> · {entry.brand}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPostDialogOpen(false)}
              disabled={postMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#1f36c7] hover:bg-[#1730b0]"
              disabled={postMutation.isPending}
              onClick={() => postMutation.mutate([...completedSelected])}
            >
              <Send className="h-3.5 w-3.5" />
              {postMutation.isPending ? "Posting…" : "Confirm & Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
