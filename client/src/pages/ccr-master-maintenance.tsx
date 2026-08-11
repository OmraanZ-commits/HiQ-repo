import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2, Send, ChevronRight, ChevronDown, Tag, Building2,
  AlertCircle, RotateCcw, Upload, Download,
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

type MappingInitiatedItem = {
  id: string;
  predecessorCbuCode: string | null;
  successorCbuCode: string | null;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  newCicRequired: boolean;
  completedAt: string | null;
  basepack: string | null;
  typeOfNetwork: string | null;
  materialDescription: string | null;
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

function SapStatusBadge({ status }: { status: string }) {
  if (status === "Validated") return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
      <CheckCircle2 className="h-3 w-3" /> Validated
    </Badge>
  );
  if (status === "Requested") return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs gap-1">
      <Upload className="h-3 w-3" /> Requested
    </Badge>
  );
  if (status === "Error") return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs gap-1">
      <AlertCircle className="h-3 w-3" /> Error
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs">Pending</Badge>
  );
}

// ─── Chain scenario metadata (National/Regional × Listing/Non-Listing) ────────

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National Non-Listing";

const CHAIN_SCENARIO_MAP: Record<string, ChainScenario> = {
  "BigBasket":        "National Non-Listing",
  "Blinkit":          "Regional Non-Listing",
  "DMart":            "Regional Non-Listing",
  "Reliance Smart":   "National Non-Listing",
  "Swiggy Instamart": "National Non-Listing",
  "Metro Cash & Carry": "Regional Listing",
  "Amazon":           "National Non-Listing",
  "Flipkart":         "National Non-Listing",
  "JioMart":          "National Non-Listing",
};

const SCENARIO_META: Record<ChainScenario, { pill: string }> = {
  "Regional Listing":     { pill: "bg-violet-100 text-violet-700 border border-violet-200" },
  "Regional Non-Listing": { pill: "bg-amber-100 text-amber-700 border border-amber-200" },
  "National Non-Listing": { pill: "bg-blue-100 text-blue-700 border border-blue-200" },
};

function ChainScenarioPill({ chain, className }: { chain: string; className?: string }) {
  const scenario = CHAIN_SCENARIO_MAP[chain];
  if (!scenario) return null;
  const { pill } = SCENARIO_META[scenario];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${pill} ${className ?? ""}`}>
      {scenario}
    </span>
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
  mappedCount: number;
  totalCount: number;
  sapRequestedCount: number;
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
  filterChain: string;
  filterBasepack: string;
  filterCbu: string;
  filterNetworkType: string;
  expandedChains: Set<string>;
  onToggleChain: (chain: string) => void;
  // Selection
  selectable?: boolean;
  selectableFilter?: (entry: NetworkEntry, chainName: string) => boolean;
  selectedCbus?: Set<string>;
  onToggleCbu?: (cbuCode: string) => void;
  onToggleAll?: (cbuCodes: string[], checked: boolean) => void;
  // Row actions
  actionColumn?: (entry: NetworkEntry, chainName: string) => React.ReactNode;
  // Navigation
  onNavigate: (path: string) => void;
  // Whether to show the Mapped X/Y progress bar + status tag on chain rows
  showProgress?: boolean;
};

function ChainGroupedView({
  entries, customers, depotChangeSummary, postingStatusMap, bpStatusMap,
  isLoading, emptyMessage,
  filterChain, filterBasepack, filterCbu, filterNetworkType,
  expandedChains, onToggleChain,
  selectable, selectableFilter, selectedCbus, onToggleCbu, onToggleAll,
  actionColumn,
  onNavigate,
  showProgress = true,
}: ChainGroupedViewProps) {

  const chainGroups: ChainGroup[] = useMemo(() => {
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

        if (filterBasepack) cbus = cbus.filter(e => (e.basepack ?? "").toLowerCase().includes(filterBasepack.toLowerCase()));
        if (filterCbu) cbus = cbus.filter(e => (e.cbuCode ?? "").toLowerCase().includes(filterCbu.toLowerCase()));
        if (filterNetworkType !== "all") cbus = cbus.filter(e => e.typeOfNetwork === filterNetworkType);
        if (filterChain !== "all" && chain !== filterChain) return null;

        if (cbus.length === 0) return null;

        const mappedCount = cbus.filter(e =>
          depotChangeSummary[e.cbuCode ?? ""]?.saved?.includes(chain)
        ).length;
        const sapRequestedCount = cbus.filter(e =>
          ["Requested", "Validated", "Error"].includes(postingStatusMap[e.cbuCode ?? ""] ?? "")
        ).length;

        return { customer, chainName: chain, cbus, mappedCount, totalCount: cbus.length, sapRequestedCount };
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

        // Keys are namespaced as "cbuCode||chainName" so the same CBU in
        // different chains gets an independent selection state.
        const selKey = (cbuCode: string) => `${cbuCode}||${group.chainName}`;
        const selectableCbusInGroup = selectable
          ? group.cbus.filter(e => selectableFilter ? selectableFilter(e, group.chainName) : true).map(e => selKey(e.cbuCode ?? ""))
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
              <span className="text-muted-foreground flex-shrink-0">
                {isExpanded
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </span>

              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm text-foreground truncate">{group.chainName}</span>
                <ChainScenarioPill chain={group.chainName} />
              </div>

              <div className="flex items-center gap-5 flex-shrink-0">
                <div className="text-center hidden sm:block">
                  <div className="text-xs font-semibold text-foreground">{group.totalCount}</div>
                  <div className="text-[10px] text-muted-foreground">CBUs</div>
                </div>

                {showProgress && (
                  <>
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

                    <div className="w-24 text-right">
                      {allMapped ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Complete</span>
                      ) : noneMapped ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not Started</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Expanded: CBU sub-table ───────────────────────────────── */}
            {isExpanded && (
              <div className="border-t bg-muted/5">
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
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
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[10%]">Network Status</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[8%]">Chain Status</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap pr-4 text-right w-[9%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.cbus.filter(entry => {
                        const bpStatus = entry.basepack ? (bpStatusMap[entry.basepack] ?? null) : null;
                        return bpStatus !== "Draft";
                      }).map((entry, rowIdx) => {
                        const bpStatus = entry.basepack ? (bpStatusMap[entry.basepack] ?? null) : null;
                        const isActiveBp = bpStatus === "Active";
                        const networkOk = (STATUS_IDX[entry.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"];
                        const canConfigure = isActiveBp && networkOk;
                        const disabledTitle = !isActiveBp
                          ? "Configure is only available for Active basepacks"
                          : "CCR mapping is only available from Stock Movement Initiated onwards";
                        const sapStatus = postingStatusMap[entry.cbuCode ?? ""];
                        const isInSapFlow = ["Requested", "Validated", "Error"].includes(sapStatus);
                        const mappedForChain = isInSapFlow || (depotChangeSummary[entry.cbuCode ?? ""]?.saved?.includes(group.chainName) ?? false);
                        const isSelectable = selectable && (selectableFilter ? selectableFilter(entry, group.chainName) : true);
                        const entryKey = `${entry.cbuCode ?? ""}||${group.chainName}`;
                        const isSelected = isSelectable && selectedCbus?.has(entryKey);

                        return (
                          <TableRow
                            key={`${group.chainName}-${entry.id}`}
                            className={`${isSelected ? "bg-blue-50" : rowIdx % 2 === 1 ? "bg-muted/10" : ""} hover:bg-muted/20`}
                          >
                            <TableCell className="pl-8" />
                            {selectable && (
                              <TableCell onClick={e => e.stopPropagation()}>
                                {isSelectable ? (
                                  <Checkbox
                                    checked={isSelected ?? false}
                                    onCheckedChange={() => onToggleCbu?.(entryKey)}
                                    aria-label={`Select ${entry.cbuCode}`}
                                  />
                                ) : (
                                  <div className="w-4 h-4" />
                                )}
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
                            <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {formatCbuDate((entry as any).startDate)}
                            </TableCell>
                            <TableCell className="py-2">
                              <NetworkStatusBadge status={entry.networkStatus} />
                            </TableCell>
                            <TableCell className="py-2">
                              <ChainMappingBadge mapped={mappedForChain} />
                            </TableCell>
                            <TableCell className="pr-4 py-2 text-right">
                              {actionColumn ? (
                                actionColumn(entry, group.chainName)
                              ) : mappedForChain ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2.5"
                                  onClick={() => onNavigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}?chain=${encodeURIComponent(group.chainName)}&readonly=true`)}
                                >
                                  View
                                </Button>
                              ) : (
                                <div title={canConfigure ? undefined : disabledTitle} className="inline-block">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2.5"
                                    disabled={!canConfigure}
                                    onClick={() => onNavigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}?chain=${encodeURIComponent(group.chainName)}`)}
                                  >
                                    Configure
                                  </Button>
                                </div>
                              )}
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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: React.ReactNode;
  confirmClass?: string;
  isPending: boolean;
  onConfirm: () => void;
  items: { cbu: string; label: string }[];
  extra?: React.ReactNode;
  confirmDisabled?: boolean;
};

function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, confirmClass,
  isPending, onConfirm, items, extra, confirmDisabled,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {items.map(({ cbu, label }) => (
            <div key={cbu} className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-mono text-xs text-muted-foreground">{cbu}</span>
                {label && <p className="text-xs text-foreground leading-tight mt-0.5">{label}</p>}
              </div>
            </div>
          ))}
        </div>
        {extra && <div className="pt-1">{extra}</div>}
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={confirmClass ?? "bg-[#1f36c7] hover:bg-[#1730b0]"}
            disabled={isPending || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab trigger helper ───────────────────────────────────────────────────────

function TabTrigger({
  value, label, count, countClass,
}: { value: string; label: string; count?: number; countClass?: string }) {
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
  const [activeTab, setActiveTab] = useState<string>("overview");

  // ── Selection state ────────────────────────────────────────────────────────
  // Overview tab: select complete CBUs → "Request SAP Update"
  const [overviewSelected, setOverviewSelected] = useState<Set<string>>(new Set());
  const [requestSapDialog, setRequestSapDialog] = useState(false);

  // CCR Mapping Initiated tab: select items → "Request SAP Update"
  const [initiatedSelected, setInitiatedSelected] = useState<Set<string>>(new Set());
  const [initiatedSapDialog, setInitiatedSapDialog] = useState(false);

  // Requested tab: select CBUs → "Mark Validated" or "Mark Error"
  const [requestedSelected, setRequestedSelected] = useState<Set<string>>(new Set());
  const [validateDialog, setValidateDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorComment, setErrorComment] = useState("");

  // Selection keys are "cbuCode||chainName" — extract just the CBU code for API calls.
  const cbuFromKey = (key: string) => key.split("||")[0];

  function makeToggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (key: string) => setter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function makeToggleAll(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (keys: string[], checked: boolean) => setter(prev => {
      const next = new Set(prev);
      if (checked) keys.forEach(k => next.add(k));
      else keys.forEach(k => next.delete(k));
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
    queryFn: () => fetch("/api/ccr/cic-mappings/summary").then(r => r.ok ? r.json() : {}),
  });

  const { data: depotChangeSummary = {} } = useQuery<Record<string, ChainCompletionEntry>>({
    queryKey: ["/api/ccr/cic-mappings/depot-change-summary"],
  });

  const { data: mappingInitiatedItems = [] } = useQuery<MappingInitiatedItem[]>({
    queryKey: ["/api/ccr/mapping-initiated"],
    queryFn: () => fetch("/api/ccr/mapping-initiated").then(r => r.json()),
  });

  // ── Derived: eligible entries ──────────────────────────────────────────────

  const eligibleEntries = useMemo(
    () => networkEntries.filter(isEligibleCbu),
    [networkEntries],
  );

  // Not yet in SAP flow
  const overviewEntries = useMemo(
    () => eligibleEntries.filter(e => {
      const sap = postingStatusMap[e.cbuCode ?? ""];
      return !sap || sap === "Saved";
    }),
    [eligibleEntries, postingStatusMap],
  );

  // Requested for SAP Update
  const requestedEntries = useMemo(
    () => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Requested"),
    [eligibleEntries, postingStatusMap],
  );

  // Validated/Posted in SAP
  const validatedEntries = useMemo(
    () => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Validated"),
    [eligibleEntries, postingStatusMap],
  );

  // Error Returned by SAP
  const errorEntries = useMemo(
    () => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Error"),
    [eligibleEntries, postingStatusMap],
  );

  // Mapping Initiated items that have been posted (relaunch CBUs are not in eligibleEntries,
  // so they need a separate slice to appear in the Requested tab).
  const requestedInitiatedItems = useMemo(
    () => mappingInitiatedItems.filter(i => postingStatusMap[i.successorCbuCode ?? ""] === "Requested"),
    [mappingInitiatedItems, postingStatusMap],
  );

  // All mapping initiated items remain visible in the CCR Mapping Initiated tab
  // regardless of SAP posting status — they also appear in the Requested tab when posted.
  const pendingInitiatedItems = mappingInitiatedItems;

  // ── Derived: unique network types for filter dropdown ──────────────────────

  const networkTypes = useMemo(() => {
    const s = new Set<string>();
    eligibleEntries.forEach(e => { if (e.typeOfNetwork) s.add(e.typeOfNetwork); });
    return Array.from(s).sort();
  }, [eligibleEntries]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateSummaries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/depot-change-summary"] });
  };

  // Request SAP Update (from Overview)
  // selectedKeys are "cbuCode||chainName" pairs — carries both CBU and chain for export
  const requestSapMutation = useMutation({
    mutationFn: async (selectedKeys: string[]) => {
      const cbuCodes = selectedKeys.map(cbuFromKey);
      return apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: cbuCodes, posted_by: "demo-user" });
    },
    onSuccess: (_data, selectedKeys) => {
      invalidateSummaries();
      setOverviewSelected(new Set());
      setRequestSapDialog(false);
      toast({
        title: "SAP update requested",
        description: `${selectedKeys.length} CBU${selectedKeys.length > 1 ? "s" : ""} submitted for SAP update.`,
      });
      setActiveTab("requested");
    },
    onError: (err: Error) => {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    },
  });

  // Request SAP Update (from CCR Mapping Initiated tab)
  // Keys are "successorCbuCode||customerChain" — same shape as overview keys.
  const requestInitiatedSapMutation = useMutation({
    mutationFn: async (selectedKeys: string[]) => {
      const cbuCodes = selectedKeys.map(cbuFromKey);
      return apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: cbuCodes, posted_by: "demo-user" });
    },
    onSuccess: async (_data, selectedKeys) => {
      invalidateSummaries();
      queryClient.invalidateQueries({ queryKey: ["/api/ccr/mapping-initiated"] });
      setInitiatedSelected(new Set());
      setInitiatedSapDialog(false);
      toast({
        title: "SAP update requested",
        description: `${selectedKeys.length} CBU${selectedKeys.length > 1 ? "s" : ""} submitted for SAP update.`,
      });
      setActiveTab("requested");
      // Auto-download consolidated export for all selected CBU+chain pairs
      const pairs = selectedKeys.map(key => {
        const [cbu_code, customer_chain] = key.split("||");
        return { cbu_code, customer_chain };
      });
      await handleExportPairs(pairs);
    },
    onError: (err: Error) => {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    },
  });

  // Update SAP status (Validated or Error)
  const updateSapStatusMutation = useMutation({
    mutationFn: async ({ cbuCodes, status }: { cbuCodes: string[]; status: string }) =>
      apiRequest("POST", "/api/ccr/update-sap-status", {
        cbu_codes: cbuCodes, status, updated_by: "demo-user",
      }),
    onSuccess: (_data, { cbuCodes, status }) => {
      invalidateSummaries();
      setRequestedSelected(new Set());
      setValidateDialog(false);
      setErrorDialog(false);
      const label = status === "Validated" ? "validated in SAP" : "marked as error";
      toast({
        title: status === "Validated" ? "Validated in SAP" : "Error recorded",
        description: `${cbuCodes.length} CBU${cbuCodes.length > 1 ? "s" : ""} ${label}.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Re-request (from Error tab)
  const reRequestMutation = useMutation({
    mutationFn: async (cbuCodes: string[]) =>
      apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: cbuCodes, posted_by: "demo-user" }),
    onSuccess: (_data, cbuCodes) => {
      invalidateSummaries();
      toast({
        title: "Re-requested",
        description: `${cbuCodes.length} CBU${cbuCodes.length > 1 ? "s" : ""} re-submitted for SAP update.`,
      });
      setActiveTab("requested");
    },
    onError: (err: Error) => {
      toast({ title: "Re-request failed", description: err.message, variant: "destructive" });
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

  // Overview: selectable if this CBU is mapped for the specific chain being shown
  // Draft basepacks can never be selected — they cannot be submitted to SAP
  const overviewSelectableFilter = (e: NetworkEntry, chainName: string) => {
    const bpStatus = e.basepack ? (bpStatusMap[e.basepack] ?? null) : null;
    if (bpStatus === "Draft") return false;
    return depotChangeSummary[e.cbuCode ?? ""]?.saved?.includes(chainName) ?? false;
  };

  // Helper: build item list for confirm dialogs
  function dialogItems(selected: Set<string>, pool: NetworkEntry[]) {
    return [...selected].map(key => {
      const cbu = cbuFromKey(key);
      const entry = pool.find(e => e.cbuCode === cbu);
      return {
        cbu,
        label: entry
          ? `${entry.materialDescription || entry.basepackDescription || "—"}${entry.brand ? ` · ${entry.brand}` : ""}`
          : "",
      };
    });
  }

  // ── Shared export helper ────────────────────────────────────────────────────
  // Builds cbu+chain pairs from entries' saved depot-change chains, fetches
  // /api/ccr/bulk-export, and downloads a two-sheet XLSX (Numeric / Alphanumeric CIC).

  // Core export: fetch bulk-export for given pairs, split by CIC type, download XLSX.
  async function handleExportPairs(pairs: { cbu_code: string; customer_chain: string }[]) {
    if (pairs.length === 0) {
      toast({ title: "No mapped depots to export", variant: "destructive" });
      return;
    }
    try {
      const rows: object[] = await fetch("/api/ccr/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cbu_chain_pairs: pairs }),
      }).then(r => r.json());

      if (rows.length === 0) {
        toast({ title: "No mapping rows found to export", variant: "destructive" });
        return;
      }

      const isNumericCic = (r: object) => {
        const cic = (r as Record<string, unknown>)["CIC"];
        return cic != null && /^\d+$/.test(String(cic));
      };
      const numericRows = rows.filter(r => isNumericCic(r));
      const alphaRows   = rows.filter(r => !isNumericCic(r));

      const wb = XLSX.utils.book_new();
      if (numericRows.length > 0)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(numericRows), "Numeric CIC");
      if (alphaRows.length > 0)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alphaRows), "Alphanumeric CIC");

      XLSX.writeFile(wb, `CCR_Mapping_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Export downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  // Per-row export: single CBU + chain.
  async function handleExportRow(cbuCode: string, chain: string) {
    await handleExportPairs([{ cbu_code: cbuCode, customer_chain: chain }]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-bold text-foreground">CCR Master Maintenance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customer chain–level view of CCR mappings and SAP update workflow
          </p>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <Card className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-shrink-0">
              <Tag className="h-3.5 w-3.5" />
              Filters
            </div>

            <div className="flex-1 min-w-[160px] max-w-[200px]">
              <Select value={filterChain} onValueChange={setFilterChain}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Chains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Chains</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.customerChain} className="text-xs">
                      <span className="flex items-center gap-2">
                        {c.customerChain}
                        <ChainScenarioPill chain={c.customerChain} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[130px] max-w-[160px]">
              <Input
                placeholder="Base Pack…"
                value={filterBasepack}
                onChange={e => setFilterBasepack(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex-1 min-w-[130px] max-w-[160px]">
              <Input
                placeholder="CBU code…"
                value={filterCbu}
                onChange={e => setFilterCbu(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

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
        <Card className="overflow-clip">
          <Tabs value={activeTab} onValueChange={setActiveTab}>

            {/* Tab header */}
            <div className="border-b px-4 pt-3 flex items-center justify-between gap-2">
              <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 justify-start rounded-none overflow-x-auto flex-shrink-0">
                <TabTrigger
                  value="overview"
                  label="Network Mapping Pending"
                  count={overviewEntries.length}
                />
                <TabTrigger
                  value="ccr-initiated"
                  label="CCR Mapping Initiated"
                  count={mappingInitiatedItems.length}
                  countClass="bg-emerald-100 text-emerald-700"
                />
                <TabTrigger
                  value="requested"
                  label="Requested for SAP Update"
                  count={requestedEntries.length + requestedInitiatedItems.length}
                  countClass="bg-blue-100 text-blue-700"
                />
                <TabTrigger
                  value="validated"
                  label="Validated / Posted in SAP"
                  count={validatedEntries.length}
                  countClass="bg-emerald-100 text-emerald-700"
                />
                <TabTrigger
                  value="error"
                  label="Error Returned by SAP"
                  count={errorEntries.length}
                  countClass="bg-red-100 text-red-700"
                />
              </TabsList>
            </div>

            {/* ── CBU Overview tab ──────────────────────────────────────────── */}
            <TabsContent value="overview" className="mt-0">
              {/* Toolbar: shown when fully-mapped CBUs are selected */}
              {overviewSelected.size > 0 && (
                <div className="sticky top-14 z-40 flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {overviewSelected.size} CBU{overviewSelected.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-blue-700"
                      onClick={() => setOverviewSelected(new Set())}
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-[#1f36c7] hover:bg-[#1730b0]"
                      onClick={() => setRequestSapDialog(true)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Request SAP Update
                    </Button>
                  </div>
                </div>
              )}
              {overviewSelected.size === 0 && (
                <div className="sticky top-14 z-40 px-4 py-2 bg-muted/20 border-b text-xs text-muted-foreground">
                  Select fully-mapped CBUs (marked <span className="font-semibold text-emerald-600">Complete</span>) to request a SAP update
                </div>
              )}
              <ChainGroupedView
                {...sharedViewProps}
                entries={overviewEntries}
                emptyMessage="No CBUs awaiting mapping — all are in the SAP workflow."
                selectable
                selectableFilter={overviewSelectableFilter}
                selectedCbus={overviewSelected}
                onToggleCbu={makeToggle(setOverviewSelected)}
                onToggleAll={makeToggleAll(setOverviewSelected)}
                actionColumn={(entry, chain) => {
                  const bpStatus = entry.basepack ? (bpStatusMap[entry.basepack] ?? null) : null;
                  const isActiveBp = bpStatus === "Active";
                  const networkOk = (STATUS_IDX[entry.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"];
                  const canConfigure = isActiveBp && networkOk;
                  const disabledTitle = !isActiveBp
                    ? "Configure is only available for Active basepacks"
                    : "CCR mapping is only available from Stock Movement Initiated onwards";
                  const isComplete = depotChangeSummary[entry.cbuCode ?? ""]?.status === "complete";
                  const mappedForThisChain = depotChangeSummary[entry.cbuCode ?? ""]?.saved?.includes(chain) ?? false;
                  if (isComplete) {
                    return (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">
                        Ready
                      </span>
                    );
                  }
                  if (mappedForThisChain) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5"
                        onClick={() => navigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}?chain=${encodeURIComponent(chain)}&readonly=true`)}
                      >
                        View
                      </Button>
                    );
                  }
                  return (
                    <div title={canConfigure ? undefined : disabledTitle} className="inline-block">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5"
                        disabled={!canConfigure}
                        onClick={() => navigate(`/ccr/configure/${encodeURIComponent(entry.cbuCode ?? "")}?chain=${encodeURIComponent(chain)}`)}
                      >
                        Configure
                      </Button>
                    </div>
                  );
                }}
              />
            </TabsContent>

            {/* ── CCR Mapping Initiated tab ─────────────────────────────────── */}
            <TabsContent value="ccr-initiated" className="mt-0">
              {initiatedSelected.size > 0 ? (
                <div className="sticky top-14 z-40 flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {initiatedSelected.size} CBU{initiatedSelected.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-blue-700"
                      onClick={() => setInitiatedSelected(new Set())}
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-[#1f36c7] hover:bg-[#1730b0]"
                      onClick={() => setInitiatedSapDialog(true)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Request SAP Update
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="sticky top-14 z-40 px-4 py-2 bg-muted/20 border-b text-xs text-muted-foreground">
                  Select CCR-mapped CBUs to request a SAP update. Export will be generated automatically on confirmation.
                </div>
              )}
              <CcrInitiatedChainView
                items={pendingInitiatedItems}
                expandedChains={expandedChains}
                onToggleChain={toggleChain}
                onNavigate={navigate}
                selectable
                selectedItems={initiatedSelected}
                onToggleItem={makeToggle(setInitiatedSelected)}
                onToggleAll={makeToggleAll(setInitiatedSelected)}
              />
            </TabsContent>

            {/* ── Requested for SAP Update tab ──────────────────────────────── */}
            <TabsContent value="requested" className="mt-0">
              {requestedSelected.size > 0 ? (
                <div className="sticky top-14 z-40 flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-800 font-medium">
                      {requestedSelected.size} CBU{requestedSelected.size > 1 ? "s" : ""} selected
                    </span>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-blue-700"
                      onClick={() => setRequestedSelected(new Set())}
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setErrorDialog(true)}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Mark as Error
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setValidateDialog(true)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark as Validated
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="sticky top-14 z-40 px-4 py-2 bg-muted/20 border-b text-xs text-muted-foreground">
                  Select CBUs to mark as <span className="font-semibold text-emerald-600">Validated in SAP</span> or <span className="font-semibold text-red-600">Error Returned by SAP</span>
                </div>
              )}
              <ChainGroupedView
                {...sharedViewProps}
                entries={requestedEntries}
                emptyMessage={requestedInitiatedItems.length > 0 ? "" : "No CBUs are currently awaiting SAP update."}
                showProgress={false}
                selectable
                selectedCbus={requestedSelected}
                onToggleCbu={makeToggle(setRequestedSelected)}
                onToggleAll={makeToggleAll(setRequestedSelected)}
                actionColumn={(_entry, chain) => (
                  <div className="flex items-center gap-2">
                    <SapStatusBadge status="Requested" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 px-2"
                      onClick={() => handleExportRow(_entry.cbuCode ?? "", chain)}
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

            {/* ── Validated / Posted in SAP tab ─────────────────────────────── */}
            <TabsContent value="validated" className="mt-0">
              <div className="sticky top-14 z-40 px-4 py-2 bg-emerald-50 border-b text-xs text-emerald-700 font-medium">
                These CBUs have been validated and posted in SAP
              </div>
              <ChainGroupedView
                {...sharedViewProps}
                entries={validatedEntries}
                emptyMessage="No CBUs have been validated in SAP yet."
                showProgress={false}
                actionColumn={(_entry, chain) => (
                  <div className="flex items-center gap-2">
                    <SapStatusBadge status="Validated" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 px-2"
                      onClick={() => handleExportRow(_entry.cbuCode ?? "", chain)}
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

            {/* ── Error Returned by SAP tab ──────────────────────────────────── */}
            <TabsContent value="error" className="mt-0">
              <div className="sticky top-14 z-40 px-4 py-2 bg-red-50 border-b text-xs text-red-700 font-medium">
                SAP returned errors for these CBUs — review and re-request as needed
              </div>
              <ChainGroupedView
                {...sharedViewProps}
                entries={errorEntries}
                emptyMessage="No CBUs have SAP errors."
                showProgress={false}
                actionColumn={(entry, chain) => (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 px-2"
                      disabled={reRequestMutation.isPending}
                      onClick={() => reRequestMutation.mutate([entry.cbuCode ?? ""])}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Re-request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 px-2"
                      onClick={() => handleExportRow(entry.cbuCode ?? "", chain)}
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                )}
              />
            </TabsContent>

          </Tabs>
        </Card>

      </div>

      {/* ── Request SAP Update dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={requestSapDialog}
        onOpenChange={setRequestSapDialog}
        title={
          <span className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#1f36c7]" />
            Request SAP Update
          </span>
        }
        description={
          <>
            The mapping export for the following CBU{overviewSelected.size > 1 ? "s" : ""} will be submitted
            to SAP. Once requested, {overviewSelected.size > 1 ? "they" : "it"} will move to the{" "}
            <strong>Requested for SAP Update</strong> tab.
          </>
        }
        confirmLabel={
          <>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {requestSapMutation.isPending ? "Submitting…" : "Confirm & Request"}
          </>
        }
        isPending={requestSapMutation.isPending}
        onConfirm={() => requestSapMutation.mutate([...overviewSelected])}
        items={dialogItems(overviewSelected, overviewEntries)}
      />

      {/* ── Request SAP Update dialog (CCR Mapping Initiated tab) ────────────── */}
      <ConfirmDialog
        open={initiatedSapDialog}
        onOpenChange={setInitiatedSapDialog}
        title={
          <span className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#1f36c7]" />
            Request SAP Update
          </span>
        }
        description={
          <>
            The mapping export for the following CBU{initiatedSelected.size > 1 ? "s" : ""} will be submitted
            to SAP and a consolidated Excel file will download automatically. Once requested,{" "}
            {initiatedSelected.size > 1 ? "they" : "it"} will move to the{" "}
            <strong>Requested for SAP Update</strong> tab.
          </>
        }
        confirmLabel={
          <>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {requestInitiatedSapMutation.isPending ? "Submitting…" : "Confirm & Request"}
          </>
        }
        isPending={requestInitiatedSapMutation.isPending}
        onConfirm={() => requestInitiatedSapMutation.mutate([...initiatedSelected])}
        items={[...initiatedSelected].map(key => {
          const [cbu] = key.split("||");
          const item = mappingInitiatedItems.find(i => i.successorCbuCode === cbu);
          return { cbu, label: item?.materialDescription ?? "" };
        })}
      />

      {/* ── Mark Validated dialog ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={validateDialog}
        onOpenChange={setValidateDialog}
        title={
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Mark as Validated in SAP
          </span>
        }
        description={
          <>
            Confirm that the following CBU{requestedSelected.size > 1 ? "s have" : " has"} been
            successfully validated and posted in SAP.
          </>
        }
        confirmLabel={
          <>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {updateSapStatusMutation.isPending ? "Updating…" : "Confirm Validated"}
          </>
        }
        confirmClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        isPending={updateSapStatusMutation.isPending}
        onConfirm={() => updateSapStatusMutation.mutate({ cbuCodes: [...requestedSelected].map(cbuFromKey), status: "Validated" })}
        items={dialogItems(requestedSelected, requestedEntries)}
      />

      {/* ── Mark Error dialog ─────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={errorDialog}
        title={
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Mark as Error Returned by SAP
          </span>
        }
        description={
          <>
            Confirm that SAP returned an error for the following CBU{requestedSelected.size > 1 ? "s" : ""}.
            {" "}You can re-request them from the <strong>Error Returned by SAP</strong> tab after investigation.
          </>
        }
        confirmLabel={
          <>
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            {updateSapStatusMutation.isPending ? "Updating…" : "Confirm Error"}
          </>
        }
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        isPending={updateSapStatusMutation.isPending}
        onConfirm={() => { updateSapStatusMutation.mutate({ cbuCodes: [...requestedSelected].map(cbuFromKey), status: "Error" }); setErrorComment(""); }}
        onOpenChange={v => { setErrorDialog(v); if (!v) setErrorComment(""); }}
        items={dialogItems(requestedSelected, requestedEntries)}
        confirmDisabled={!errorComment.trim()}
        extra={
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Justification <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="Describe the SAP error and steps taken for investigation…"
              value={errorComment}
              onChange={e => setErrorComment(e.target.value)}
              className="text-sm resize-none"
            />
          </div>
        }
      />

    </div>
  );
}

// ─── CCR Mapping Initiated – chain-grouped view ───────────────────────────────

function CcrInitiatedChainView({
  items, expandedChains, onToggleChain, onNavigate,
  selectable, selectedItems, onToggleItem, onToggleAll,
}: {
  items: MappingInitiatedItem[];
  expandedChains: Set<string>;
  onToggleChain: (chain: string) => void;
  onNavigate: (path: string) => void;
  selectable?: boolean;
  selectedItems?: Set<string>;
  onToggleItem?: (key: string) => void;
  onToggleAll?: (keys: string[], checked: boolean) => void;
}) {
  const grouped = useMemo(() => {
    const m: Record<string, MappingInitiatedItem[]> = {};
    for (const item of items) {
      const chain = item.customerChain || "Unknown";
      if (!m[chain]) m[chain] = [];
      m[chain].push(item);
    }
    return Object.entries(m);
  }, [items]);

  if (grouped.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No CCR mappings initiated yet. Completed CCR line items with a CIC assigned or reused will appear here.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {grouped.map(([chain, chainItems]) => {
        const isExpanded = expandedChains.has(chain);
        const newCicCount   = chainItems.filter(i => i.newCicRequired).length;
        const reuseCicCount = chainItems.filter(i => !i.newCicRequired).length;
        return (
          <div key={chain} className="bg-background">
            {/* Chain header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
              onClick={() => onToggleChain(chain)}
            >
              <span className="text-muted-foreground flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-sm text-foreground truncate">{chain}</span>
                <ChainScenarioPill chain={chain} />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-center hidden sm:block">
                  <div className="text-xs font-semibold text-foreground">{chainItems.length}</div>
                  <div className="text-[10px] text-muted-foreground">CBU{chainItems.length !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {newCicCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {newCicCount} New CIC
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded CBU table */}
            {isExpanded && (
              <div className="border-t bg-muted/5">
                <div className="overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="w-[3%]" />
                        {selectable && (() => {
                          const allKeys = chainItems
                            .filter(i => i.successorCbuCode)
                            .map(i => `${i.successorCbuCode}||${chain}`);
                          const allSel = allKeys.length > 0 && allKeys.every(k => selectedItems?.has(k));
                          const someSel = allKeys.some(k => selectedItems?.has(k)) && !allSel;
                          return (
                            <TableHead className="w-[3%]">
                              <Checkbox
                                checked={allSel ? true : someSel ? "indeterminate" : false}
                                onCheckedChange={v => onToggleAll?.(allKeys, !!v)}
                                aria-label={`Select all in ${chain}`}
                              />
                            </TableHead>
                          );
                        })()}
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[8%]">Basepack</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[11%]">Successor CBU</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[11%]">Predecessor CBU</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[17%]">Description</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[10%]">Network Type</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[10%]">Scenario</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[13%]">CIC</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap w-[10%]">Completed At</TableHead>
                        <TableHead className="text-xs font-semibold whitespace-nowrap pr-4 text-right w-[7%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chainItems.map((item, rowIdx) => {
                        const itemKey = `${item.successorCbuCode}||${chain}`;
                        const isSelected = selectable && !!item.successorCbuCode && !!selectedItems?.has(itemKey);
                        return (
                        <TableRow
                          key={item.id}
                          className={`${isSelected ? "bg-blue-50" : rowIdx % 2 === 1 ? "bg-muted/10" : ""} hover:bg-muted/20`}
                        >
                          <TableCell className="pl-8" />
                          {selectable && (
                            <TableCell onClick={e => e.stopPropagation()}>
                              {item.successorCbuCode ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleItem?.(itemKey)}
                                  aria-label={`Select ${item.successorCbuCode}`}
                                />
                              ) : <div className="w-4 h-4" />}
                            </TableCell>
                          )}
                          <TableCell className="py-2 text-xs font-mono">{item.basepack ?? "—"}</TableCell>
                          <TableCell className="py-2 font-mono text-xs font-medium">{item.successorCbuCode ?? "—"}</TableCell>
                          <TableCell className="py-2 font-mono text-xs text-muted-foreground">{item.predecessorCbuCode ?? "—"}</TableCell>
                          <TableCell className="py-2 max-w-0 overflow-hidden">
                            <span className="block truncate text-xs text-muted-foreground" title={item.materialDescription ?? undefined}>
                              {item.materialDescription ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 max-w-0 overflow-hidden">
                            <span className="block truncate text-xs" title={getNetworkChangeTypeName(item.typeOfNetwork) ?? undefined}>
                              {getNetworkChangeTypeName(item.typeOfNetwork)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 whitespace-nowrap">
                            {item.newCicRequired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />New CIC
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                <RotateCcw className="h-3 w-3 shrink-0" />CIC Reused
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 whitespace-nowrap">
                            {item.cic ? (
                              <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${item.newCicRequired ? "text-emerald-700" : "text-blue-700"}`}>
                                <CheckCircle2 className="h-3 w-3 shrink-0" />{item.cic}
                              </span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {item.completedAt
                              ? new Date(item.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"}
                          </TableCell>
                          <TableCell className="pr-4 py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5"
                              disabled={!item.successorCbuCode}
                              onClick={() => onNavigate(
                                `/ccr/configure/${encodeURIComponent(item.successorCbuCode ?? "")}?chain=${encodeURIComponent(chain)}&readonly=true`
                              )}
                            >
                              View
                            </Button>
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
