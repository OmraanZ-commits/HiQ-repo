import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UnileverHeader } from "@/components/unilever-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Send, CheckCircle2, AlertCircle, RotateCcw, Upload, ChevronRight, Download,
  Clock, Unlock, Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { NetworkEntry } from "@shared/schema";
import { NV_CODE_TO_CCR_CHAIN } from "@/lib/distribution-data";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = { id: string; customerChain: string; coverageType: string; behaviourType: string };
type CicMapping = { id: string; cbuCode: string; customerChain: string; customerCode: string; cic: string | null; status: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2, "Production Started": 3,
  "FTR Approved": 4, "Stock Movement Initiated": 5, "Network transition complete": 6,
};
const RELAUNCH_TYPES = new Set([
  "RL_ART_PKG", "RL_ART_FORM", "RL_PKG_FORM", "RL_ART", "RL_FORM", "RL_PKG", "RL_PRICE",
]);

// ─── Scenario configuration ───────────────────────────────────────────────────

type ChainScenario = "Regional Listing" | "Regional Non-Listing" | "National";

const CHAIN_SCENARIO_MAP: Record<string, ChainScenario> = {
  "Amazon": "National", "Big Bazaar": "National", "BigBasket": "National",
  "Cloud Tail": "National", "Flipkart": "National", "JioMart": "National",
  "Metro C&C": "National", "Swiggy Instamart": "National",
  "Blinkit": "Regional Non-Listing", "DMart": "Regional Non-Listing", "Reliance Smart": "Regional Non-Listing",
  "Lulu Hypermarket": "Regional Listing",
};
function chainScenarioFromName(chain: string): ChainScenario {
  return CHAIN_SCENARIO_MAP[chain] ?? "Regional Non-Listing";
}
const SCENARIO_META: Record<ChainScenario, { badge: string; pill: string }> = {
  "Regional Listing":     { badge: "bg-violet-50 border-violet-200", pill: "bg-violet-100 text-violet-700 border border-violet-200" },
  "Regional Non-Listing": { badge: "bg-amber-50 border-amber-200",   pill: "bg-amber-100 text-amber-700 border border-amber-200" },
  "National":             { badge: "bg-blue-50 border-blue-200",     pill: "bg-blue-100 text-blue-700 border border-blue-200" },
};

// ─── DOH mock helpers ─────────────────────────────────────────────────────────
// Deterministic mock DOH (Days on Hand) values for demo.
// Successor DOH > 5 AND predecessor DOH < 3 → DOH condition met for National.

function _hashCode(s: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = ((h * 31) ^ s.charCodeAt(i)) & 0xffff;
  return Math.abs(h);
}
function mockSuccessorDoh(cbuCode: string): number {
  return (_hashCode(cbuCode, 17) % 12) + 2; // 2–13 days
}
function mockPredecessorDoh(predCode: string): number {
  return (_hashCode(predCode, 7) % 7) + 0;  // 0–6 days
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function NetworkStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "Draft";
  const high = ["FTR Approved", "Stock Movement Initiated", "Network transition complete"];
  const mid = ["Pricing Updated", "Production Started"];
  if (high.includes(s)) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">{s}</Badge>;
  if (mid.includes(s))  return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">{s}</Badge>;
  if (s === "Active")   return <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs">{s}</Badge>;
  return <Badge variant="outline" className="text-slate-500 text-xs">{s}</Badge>;
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
  return <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 text-xs">Pending</Badge>;
}

function TabTrigger({ value, label, count, countClass }: { value: string; label: string; count?: number; countClass?: string }) {
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

// ─── Confirm dialog (reused across tabs) ─────────────────────────────────────

type ConfirmDialogProps = {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: React.ReactNode; description: React.ReactNode; confirmLabel: React.ReactNode;
  confirmClass?: string; isPending: boolean; onConfirm: () => void;
  items: { cbu: string; label: string }[];
};
function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, confirmClass, isPending, onConfirm, items }: ConfirmDialogProps) {
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
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button size="sm" className={confirmClass ?? "bg-[#1f36c7] hover:bg-[#1730b0]"} disabled={isPending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Queue status for a single entry × chain ─────────────────────────────────

type QueueGate = {
  stockMet: boolean;
  dohApplies: boolean;
  dohMet: boolean;
  successorDoh: number;
  predecessorDoh: number;
  canRelease: boolean;
};

function queueGateFor(entry: NetworkEntry, chain: string): QueueGate {
  const stockMet = (STATUS_IDX[entry.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"];
  const scenario = chainScenarioFromName(chain);
  const dohApplies = scenario === "National";
  const succDoh = mockSuccessorDoh(entry.cbuCode ?? "");
  const predDoh = mockPredecessorDoh((entry as any).predecessorCode ?? "");
  const dohMet = dohApplies ? (succDoh > 5 && predDoh < 3) : true;
  return {
    stockMet,
    dohApplies,
    dohMet,
    successorDoh: succDoh,
    predecessorDoh: predDoh,
    canRelease: stockMet && dohMet,
  };
}

function QueueStatusCell({ entry, chain, onRelease, isPending }: {
  entry: NetworkEntry; chain: string;
  onRelease: (cbuCode: string) => void; isPending: boolean;
}) {
  const gate = queueGateFor(entry, chain);

  if (gate.canRelease) {
    return (
      <Button
        size="sm" variant="outline"
        className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2.5"
        disabled={isPending}
        onClick={e => { e.stopPropagation(); onRelease(entry.cbuCode ?? ""); }}
      >
        <Unlock className="h-3 w-3" /> Release to MT Listing
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      {!gate.stockMet && (
        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          <Clock className="h-2.5 w-2.5" /> Awaiting Stock Movement Initiated
        </span>
      )}
      {gate.stockMet && gate.dohApplies && !gate.dohMet && (
        <span className="inline-flex items-center gap-1 text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
          <Info className="h-2.5 w-2.5" />
          DOH not met — Succ: {gate.successorDoh}d / Pred: {gate.predecessorDoh}d
        </span>
      )}
    </div>
  );
}

// ─── Chain accordion with CBU rows ───────────────────────────────────────────

type ChainTableProps = {
  chain: string;
  entries: NetworkEntry[];
  postingStatusMap: Record<string, string>;
  selectable?: boolean;
  selectedCbus?: Set<string>;
  onToggleCbu?: (cbuCode: string) => void;
  onToggleAll?: (cbuCodes: string[], checked: boolean) => void;
  actionSlot?: (entry: NetworkEntry) => React.ReactNode;
  onNavigate: (path: string) => void;
  showExport?: boolean;
};

function ChainTable({ chain, entries, selectable, selectedCbus, onToggleCbu, onToggleAll, actionSlot, onNavigate, showExport = true }: ChainTableProps) {
  const scenario = chainScenarioFromName(chain);
  const meta = SCENARIO_META[scenario];

  const [expanded, setExpanded] = useState(true);

  // Key by "cbuCode||chain" so ticking a CBU in one chain doesn't affect the same CBU in another.
  const selectionKey = (cbuCode: string) => `${cbuCode}||${chain}`;
  const selectableCodes = entries.map(e => selectionKey(e.cbuCode ?? ""));
  const allSelected = selectable && selectableCodes.length > 0 && selectableCodes.every(c => selectedCbus?.has(c));
  const someSelected = selectable && selectableCodes.some(c => selectedCbus?.has(c)) && !allSelected;

  function handleExportChain() {
    const rows = entries.map(e => ({
      "Successor CBU": e.cbuCode ?? "",
      "Description": e.materialDescription || "",
      "Brand": e.brand || "",
      "Predecessor CBU": (e as any).predecessorCode || "",
      "Basepack": e.basepack || "",
      "Network Status": e.networkStatus || "",
      "Chain": chain,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "MT Listing");
    XLSX.writeFile(wb, `MT_Listing_${chain.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const hasActionSlot = !!actionSlot;

  return (
    <div className={`border-b last:border-b-0 ${expanded && meta ? meta.badge + " border" : ""}`}>
      {/* Chain header */}
      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => setExpanded(v => !v)}>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} />
        <span className="text-sm font-semibold text-foreground">{chain}</span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.pill}`}>{scenario}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">{entries.length} CBU{entries.length !== 1 ? "s" : ""}</span>
          {expanded && showExport && (
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={e => { e.stopPropagation(); handleExportChain(); }}>
              <Download className="h-3 w-3" /> Export
            </Button>
          )}
        </span>
      </div>

      {/* CBU sub-table */}
      {expanded && (
        <div className="border-t bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {selectable && (
                  <TableHead className="w-10 pl-6">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={v => onToggleAll?.(selectableCodes, !!v)}
                    />
                  </TableHead>
                )}
                {!selectable && <TableHead className="w-8 pl-6" />}
                <TableHead className="text-xs font-semibold">Successor CBU</TableHead>
                <TableHead className="text-xs font-semibold">Description</TableHead>
                <TableHead className="text-xs font-semibold">Brand</TableHead>
                <TableHead className="text-xs font-semibold">Predecessor CBU</TableHead>
                <TableHead className="text-xs font-semibold">Basepack</TableHead>
                <TableHead className="text-xs font-semibold">Network Status</TableHead>
                {hasActionSlot && <TableHead className="text-xs font-semibold text-right pr-5">Status / Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => {
                const cbuCode = entry.cbuCode ?? "";
                const key = selectionKey(cbuCode);
                const isSelected = selectable && (selectedCbus?.has(key) ?? false);
                return (
                  <TableRow
                    key={cbuCode}
                    className={`cursor-pointer hover:bg-muted/20 ${isSelected ? "bg-blue-50" : ""}`}
                    onClick={() => onNavigate(`/ccr/mt-listing/${encodeURIComponent(cbuCode)}?chain=${encodeURIComponent(chain)}`)}
                  >
                    {selectable && (
                      <TableCell className="pl-6 w-10" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleCbu?.(key)}
                        />
                      </TableCell>
                    )}
                    {!selectable && <TableCell className="w-8 pl-6"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>}
                    <TableCell className="py-3">
                      <span className="font-mono text-xs font-semibold">{cbuCode}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{entry.typeOfNetwork ?? "—"}</div>
                    </TableCell>
                    <TableCell className="py-3 max-w-[200px]">
                      <span className="text-xs truncate block">{entry.materialDescription || (entry as any).basepackDescription || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 text-xs">{entry.brand || "—"}</TableCell>
                    <TableCell className="py-3 font-mono text-xs text-muted-foreground">{(entry as any).predecessorCode ?? "—"}</TableCell>
                    <TableCell className="py-3 text-xs font-mono text-muted-foreground">{entry.basepack || "—"}</TableCell>
                    <TableCell className="py-3"><NetworkStatusBadge status={entry.networkStatus} /></TableCell>
                    {hasActionSlot && (
                      <TableCell className="py-3 text-right pr-5" onClick={e => e.stopPropagation()}>
                        {actionSlot(entry)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Chain-grouped view used across all tabs ──────────────────────────────────

type ChainGroupedViewProps = {
  entriesByChain: Record<string, NetworkEntry[]>;
  postingStatusMap: Record<string, string>;
  emptyMessage: string;
  selectable?: boolean;
  selectedCbus?: Set<string>;
  onToggleCbu?: (code: string) => void;
  onToggleAll?: (codes: string[], checked: boolean) => void;
  actionSlot?: (entry: NetworkEntry, chain: string) => React.ReactNode;
  onNavigate: (path: string) => void;
  showExport?: boolean;
};

function ChainGroupedView({ entriesByChain, postingStatusMap, emptyMessage, selectable, selectedCbus, onToggleCbu, onToggleAll, actionSlot, onNavigate, showExport }: ChainGroupedViewProps) {
  if (Object.keys(entriesByChain).length === 0) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }
  return (
    <div>
      {Object.entries(entriesByChain).map(([chain, entries]) => (
        <ChainTable
          key={chain}
          chain={chain}
          entries={entries}
          postingStatusMap={postingStatusMap}
          selectable={selectable}
          selectedCbus={selectedCbus}
          onToggleCbu={onToggleCbu}
          onToggleAll={onToggleAll}
          actionSlot={actionSlot ? (entry) => actionSlot(entry, chain) : undefined}
          onNavigate={onNavigate}
          showExport={showExport}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CcrMtListingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("queue");

  // Selection state
  const [outputSelected, setOutputSelected]   = useState<Set<string>>(new Set());
  const [requestedSelected, setRequestedSelected] = useState<Set<string>>(new Set());

  // Dialog state
  const [requestSapDialog, setRequestSapDialog] = useState(false);
  const [validateDialog,   setValidateDialog]   = useState(false);
  const [errorDialog,      setErrorDialog]      = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({ queryKey: ["/api/network-entries"] });
  const { data: customers = [] }        = useQuery<Customer[]>({ queryKey: ["/api/ccr/customers"] });
  const { data: cicMappings = [] }      = useQuery<CicMapping[]>({
    queryKey: ["/api/ccr/cic-mappings"],
    queryFn: () => fetch("/api/ccr/cic-mappings").then(r => r.json()),
  });
  const { data: postingStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/ccr/cic-mappings/summary"],
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const cicConfiguredPreds = useMemo(
    () => new Set(cicMappings.map(m => m.cbuCode)),
    [cicMappings],
  );

  // All eligible entries: relaunch/extension with predecessor and CIC configured.
  // Stage gate: Active+ (idx ≥ 1) — upcoming CBUs can be queued from Active onwards.
  const eligibleEntries = useMemo(
    () => networkEntries.filter(e => {
      if (!(RELAUNCH_TYPES.has(e.typeOfNetwork ?? "") || e.typeOfNetwork === "EXTENSION" || e.typeOfNetwork === "Extension")) return false;
      const pred = (e as any).predecessorCode;
      if (!pred) return false;
      if ((STATUS_IDX[e.networkStatus ?? ""] ?? 0) < STATUS_IDX["Active"]) return false;
      return cicConfiguredPreds.has(pred);
    }),
    [networkEntries, cicConfiguredPreds],
  );

  // Split by SAP/queue stage
  // Queued: sap_status = "Queued" — submitted from Configure, waiting for conditions
  const queuedEntries  = useMemo(() => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Queued"), [eligibleEntries, postingStatusMap]);
  // MT Listing Output: not in queue/SAP workflow AND Stock Movement Initiated+
  const outputEntries  = useMemo(() => eligibleEntries.filter(e => {
    const s = postingStatusMap[e.cbuCode ?? ""];
    if (s && s !== "Saved") return false; // Queued, Requested, Validated, Error → not here
    return (STATUS_IDX[e.networkStatus ?? ""] ?? 0) >= STATUS_IDX["Stock Movement Initiated"];
  }), [eligibleEntries, postingStatusMap]);
  const requestedEntries = useMemo(() => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Requested"),  [eligibleEntries, postingStatusMap]);
  const validatedEntries = useMemo(() => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Validated"), [eligibleEntries, postingStatusMap]);
  const errorEntries     = useMemo(() => eligibleEntries.filter(e => postingStatusMap[e.cbuCode ?? ""] === "Error"),      [eligibleEntries, postingStatusMap]);

  // Group each set by chain
  const chainSet = useMemo(() => new Set(customers.map(c => c.customerChain)), [customers]);

  function groupByChain(entries: NetworkEntry[]): Record<string, NetworkEntry[]> {
    const map: Record<string, NetworkEntry[]> = {};
    for (const entry of entries) {
      const cm = (entry as any).customerMapping;
      const chains = new Set<string>();
      if (cm && typeof cm === "object") {
        for (const codes of Object.values(cm)) {
          if (Array.isArray(codes)) {
            for (const code of codes) {
              const ch = NV_CODE_TO_CCR_CHAIN[code as string];
              if (ch && chainSet.has(ch)) chains.add(ch);
            }
          }
        }
      }
      for (const chain of chains) {
        if (!map[chain]) map[chain] = [];
        map[chain].push(entry);
      }
    }
    return map;
  }

  const queuedByChain    = useMemo(() => groupByChain(queuedEntries),    [queuedEntries,    chainSet]);
  const outputByChain    = useMemo(() => groupByChain(outputEntries),    [outputEntries,    chainSet]);
  const requestedByChain = useMemo(() => groupByChain(requestedEntries), [requestedEntries, chainSet]);
  const validatedByChain = useMemo(() => groupByChain(validatedEntries), [validatedEntries, chainSet]);
  const errorByChain     = useMemo(() => groupByChain(errorEntries),     [errorEntries,     chainSet]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (code: string) => setter(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  }
  function toggleAll(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (codes: string[], checked: boolean) => setter(prev => {
      const n = new Set(prev);
      codes.forEach(c => checked ? n.add(c) : n.delete(c));
      return n;
    });
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/ccr/cic-mappings/summary"] });

  const releaseFromQueueMutation = useMutation({
    mutationFn: (codes: string[]) => apiRequest("POST", "/api/ccr/release-from-queue", { cbu_codes: codes }),
    onSuccess: (_d, codes) => {
      invalidate();
      toast({ title: "Released to MT Listing Output", description: `${codes.length} CBU${codes.length > 1 ? "s" : ""} moved to MT Listing Output.` });
      setActiveTab("mt-output");
    },
    onError: (err: Error) => toast({ title: "Release failed", description: err.message, variant: "destructive" }),
  });

  const requestSapMutation = useMutation({
    mutationFn: (codes: string[]) => apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: codes, posted_by: "demo-user" }),
    onSuccess: (_d, codes) => {
      invalidate(); setOutputSelected(new Set()); setRequestSapDialog(false);
      toast({ title: "SAP update requested", description: `${codes.length} CBU${codes.length > 1 ? "s" : ""} submitted for SAP update.` });
      setActiveTab("sap-requested");
    },
    onError: (err: Error) => toast({ title: "Request failed", description: err.message, variant: "destructive" }),
  });

  const updateSapMutation = useMutation({
    mutationFn: ({ codes, status }: { codes: string[]; status: string }) =>
      apiRequest("POST", "/api/ccr/update-sap-status", { cbu_codes: codes, status, updated_by: "demo-user" }),
    onSuccess: (_d, { codes, status }) => {
      invalidate(); setRequestedSelected(new Set()); setValidateDialog(false); setErrorDialog(false);
      toast({
        title: status === "Validated" ? "Validated in SAP" : "Error recorded",
        description: `${codes.length} CBU${codes.length > 1 ? "s" : ""} ${status === "Validated" ? "validated in SAP" : "marked as error"}.`,
      });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const reRequestMutation = useMutation({
    mutationFn: (codes: string[]) => apiRequest("POST", "/api/ccr/post-cbus", { cbu_codes: codes, posted_by: "demo-user" }),
    onSuccess: (_d, codes) => {
      invalidate();
      toast({ title: "Re-requested", description: `${codes.length} CBU${codes.length > 1 ? "s" : ""} re-submitted for SAP update.` });
      setActiveTab("sap-requested");
    },
    onError: (err: Error) => toast({ title: "Re-request failed", description: err.message, variant: "destructive" }),
  });

  // ── Dialog item helpers ────────────────────────────────────────────────────

  // Selection keys are "cbuCode||chain" — extract just the cbuCode for display and API calls.
  const cbuFromKey = (key: string) => key.split("||")[0];

  function dialogItems(selected: Set<string>, pool: NetworkEntry[]) {
    return [...selected].map(key => {
      const cbu = cbuFromKey(key);
      const e = pool.find(x => x.cbuCode === cbu);
      return { cbu, label: e ? `${e.materialDescription || e.basepackDescription || "—"}${e.brand ? ` · ${e.brand}` : ""}` : "" };
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">MT Listing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Successor-predecessor CBU updates required as part of the CCR MT listing ruleset
          </p>
        </div>

        <Card className="overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>

            {/* ── Tab bar ───────────────────────────────────────────────────── */}
            <div className="border-b px-4 pt-3">
              <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 justify-start rounded-none overflow-x-auto flex-shrink-0">
                <TabTrigger value="mt-output"     label="MT Listing Output"          count={outputEntries.length}    countClass="bg-blue-100 text-blue-700" />
                <TabTrigger value="sap-requested" label="Requested for SAP Update"   count={requestedEntries.length} countClass="bg-amber-100 text-amber-700" />
                <TabTrigger value="sap-validated" label="Validated / Posted in SAP"  count={validatedEntries.length} countClass="bg-emerald-100 text-emerald-700" />
                <TabTrigger value="sap-error"     label="Error Returned by SAP"      count={errorEntries.length}     countClass="bg-red-100 text-red-700" />
              </TabsList>
            </div>

            {/* ══ Tab 1: MT Listing Output ══════════════════════════════════ */}
            <TabsContent value="mt-output" className="mt-0">
              {/* Selection toolbar */}
              {outputSelected.size > 0 ? (
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {outputSelected.size} CBU{outputSelected.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-700"
                      onClick={() => setOutputSelected(new Set())}>
                      Clear selection
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#1f36c7] hover:bg-[#1730b0]"
                      onClick={() => setRequestSapDialog(true)}>
                      <Send className="h-3.5 w-3.5" /> Request SAP Update
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 bg-muted/20 border-b text-xs text-muted-foreground">
                  Select CBUs to submit a SAP MT listing update request
                </div>
              )}

              {entriesLoading ? (
                <div className="p-6 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <ChainGroupedView
                  entriesByChain={outputByChain}
                  postingStatusMap={postingStatusMap}
                  emptyMessage="No eligible MT listing CBUs — all are in-queue or in the SAP workflow."
                  selectable
                  selectedCbus={outputSelected}
                  onToggleCbu={toggle(setOutputSelected)}
                  onToggleAll={toggleAll(setOutputSelected)}
                  onNavigate={navigate}
                />
              )}
            </TabsContent>

            {/* ══ Tab 2: Requested for SAP Update ══════════════════════════ */}
            <TabsContent value="sap-requested" className="mt-0">
              {requestedSelected.size > 0 ? (
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-sm text-blue-800 font-medium">
                    {requestedSelected.size} CBU{requestedSelected.size > 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-700"
                      onClick={() => setRequestedSelected(new Set())}>
                      Clear selection
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => setErrorDialog(true)}>
                      <AlertCircle className="h-3.5 w-3.5" /> Mark as Error
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setValidateDialog(true)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Validated
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 bg-muted/20 border-b text-xs text-muted-foreground">
                  Select CBUs to mark as <span className="font-semibold text-emerald-600">Validated in SAP</span> or <span className="font-semibold text-red-600">Error Returned by SAP</span>
                </div>
              )}
              <ChainGroupedView
                entriesByChain={requestedByChain}
                postingStatusMap={postingStatusMap}
                emptyMessage="No CBUs are currently awaiting SAP update."
                selectable
                selectedCbus={requestedSelected}
                onToggleCbu={toggle(setRequestedSelected)}
                onToggleAll={toggleAll(setRequestedSelected)}
                actionSlot={() => <SapStatusBadge status="Requested" />}
                onNavigate={navigate}
              />
            </TabsContent>

            {/* ══ Tab 3: Validated / Posted in SAP ═════════════════════════ */}
            <TabsContent value="sap-validated" className="mt-0">
              <div className="px-4 py-2 bg-emerald-50 border-b text-xs text-emerald-700 font-medium">
                These CBUs have been validated and posted in SAP
              </div>
              <ChainGroupedView
                entriesByChain={validatedByChain}
                postingStatusMap={postingStatusMap}
                emptyMessage="No CBUs have been validated in SAP yet."
                actionSlot={() => <SapStatusBadge status="Validated" />}
                onNavigate={navigate}
              />
            </TabsContent>

            {/* ══ Tab 4: Error Returned by SAP ══════════════════════════════ */}
            <TabsContent value="sap-error" className="mt-0">
              <div className="px-4 py-2 bg-red-50 border-b text-xs text-red-700 font-medium">
                SAP returned errors for these CBUs — review and re-request as needed
              </div>
              <ChainGroupedView
                entriesByChain={errorByChain}
                postingStatusMap={postingStatusMap}
                emptyMessage="No CBUs have SAP errors."
                actionSlot={(entry) => (
                  <Button size="sm" variant="outline"
                    className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 px-2"
                    disabled={reRequestMutation.isPending}
                    onClick={() => reRequestMutation.mutate([entry.cbuCode ?? ""])}>
                    <RotateCcw className="h-3 w-3" /> Re-request
                  </Button>
                )}
                onNavigate={navigate}
              />
            </TabsContent>

          </Tabs>
        </Card>
      </div>

      {/* ── Request SAP Update dialog ─────────────────────────────────────── */}
      <ConfirmDialog
        open={requestSapDialog} onOpenChange={setRequestSapDialog}
        title={<span className="flex items-center gap-2"><Send className="h-5 w-5 text-[#1f36c7]" /> Request SAP Update</span>}
        description={<>The MT listing mapping for the following CBU{outputSelected.size > 1 ? "s" : ""} will be submitted to SAP. Once requested, {outputSelected.size > 1 ? "they" : "it"} will move to the <strong>Requested for SAP Update</strong> tab.</>}
        confirmLabel={<><Send className="h-3.5 w-3.5 mr-1.5" />{requestSapMutation.isPending ? "Submitting…" : "Confirm & Request"}</>}
        isPending={requestSapMutation.isPending}
        onConfirm={() => requestSapMutation.mutate([...outputSelected].map(cbuFromKey))}
        items={dialogItems(outputSelected, outputEntries)}
      />

      {/* ── Mark Validated dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={validateDialog} onOpenChange={setValidateDialog}
        title={<span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Mark as Validated in SAP</span>}
        description={<>Confirm that the following CBU{requestedSelected.size > 1 ? "s have" : " has"} been successfully validated and posted in SAP.</>}
        confirmLabel={<><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{updateSapMutation.isPending ? "Updating…" : "Confirm Validated"}</>}
        confirmClass="bg-emerald-600 hover:bg-emerald-700 text-white"
        isPending={updateSapMutation.isPending}
        onConfirm={() => updateSapMutation.mutate({ codes: [...requestedSelected].map(cbuFromKey), status: "Validated" })}
        items={dialogItems(requestedSelected, requestedEntries)}
      />

      {/* ── Mark Error dialog ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={errorDialog} onOpenChange={setErrorDialog}
        title={<span className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" /> Mark as Error Returned by SAP</span>}
        description={<>Confirm that SAP returned an error for the following CBU{requestedSelected.size > 1 ? "s" : ""}. You can re-request them from the <strong>Error Returned by SAP</strong> tab.</>}
        confirmLabel={<><AlertCircle className="h-3.5 w-3.5 mr-1.5" />{updateSapMutation.isPending ? "Updating…" : "Confirm Error"}</>}
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        isPending={updateSapMutation.isPending}
        onConfirm={() => updateSapMutation.mutate({ codes: [...requestedSelected].map(cbuFromKey), status: "Error" })}
        items={dialogItems(requestedSelected, requestedEntries)}
      />
    </div>
  );
}
