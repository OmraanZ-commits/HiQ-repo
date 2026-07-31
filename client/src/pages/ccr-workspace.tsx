import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import * as XLSX from "xlsx";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  GitCompareArrows, Download, RefreshCw, Filter, X, AlertTriangle,
  Clock, CheckCircle2, Zap, ChevronDown, User, Siren, Play,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NetworkEntry } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

type CcrLineItem = {
  id: string;
  predecessorCbuCode: string | null;
  successorCbuCode: string | null;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  triggerStage: string;
  urgencyColor: string;
  ccrStatus: string;
  executionType: string;
  newCicRequired: boolean | null;
  contentUpdateRequired: boolean | null;
  rundownRequired: boolean | null;
  rulesetOutcome: Record<string, unknown> | null;
  overrides: Record<string, unknown> | null;
  escalationDueAt: string | null;
  escalatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type LineItemsResponse = {
  total: number;
  items: CcrLineItem[];
};

type CcrCustomer = {
  id: string;
  customerChain: string;
  coverageType: string;
  behaviourType: string;
  cseId: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

// Relaunch change types — CCR is only applicable for relaunch / predecessor–successor CBUs
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

// CCR is actionable from Price Activated (Pricing Updated) onwards.
const TRIGGER_STAGE_ORDER = ["Pricing", "First", "Second", "Third", "Fourth", "None"];

const TRIGGER_STAGE_LABEL: Record<string, string> = {
  Pricing: "Price Activated",
  First:   "Production Started",
  Second:  "Post FTR Clearance",
  Third:   "Stock Movement Initiated",
  Fourth:  "Inventory Threshold Breached",
  None:    "—",
};

const TRIGGER_STAGE_COLOR: Record<string, string> = {
  Pricing: "bg-violet-100 text-violet-700 border-violet-200",
  First:   "bg-amber-100 text-amber-700 border-amber-200",
  Second:  "bg-amber-100 text-amber-700 border-amber-200",
  Third:   "bg-red-100 text-red-700 border-red-200",
  Fourth:  "bg-rose-100 text-rose-800 border-rose-400",
  None:    "bg-muted text-muted-foreground border-border",
};

// ─── URL filter helpers ───────────────────────────────────────────────────────

function parseMulti(value: string | null): string[] {
  if (!value || value === "all") return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
}

function serializeMulti(values: string[]): string {
  return values.length === 0 ? "all" : values.join(",");
}

// ─── Small UI components ──────────────────────────────────────────────────────

function UrgencyDot({ color }: { color: string }) {
  if (color === "Blinking Red") {
    return (
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0"
        title="Blinking Red — Critical"
        data-testid="dot-urgency-blinking-red"
      />
    );
  }
  if (color === "Red") {
    return (
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shrink-0"
        title="Red — High"
        data-testid="dot-urgency-red"
      />
    );
  }
  if (color === "Amber") {
    return (
      <span
        className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0"
        title="Amber — Medium"
        data-testid="dot-urgency-amber"
      />
    );
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0"
      title="No urgency"
      data-testid="dot-urgency-none"
    />
  );
}

function slaDaysLeft(escalationDueAt: string | null): number | null {
  if (!escalationDueAt) return null;
  const due = new Date(escalationDueAt);
  return Math.ceil((due.getTime() - Date.now()) / 86_400_000);
}

// SLA window is only applicable to the Fourth trigger (3-day action window before escalation).
// All other stages show a plain dash — they have no SLA deadline.
function SlaChip({ escalationDueAt, triggerStage }: { escalationDueAt: string | null; triggerStage: string }) {
  if (triggerStage !== "Fourth") {
    return <span className="text-xs text-muted-foreground" data-testid="chip-sla-none">—</span>;
  }
  const days = slaDaysLeft(escalationDueAt);
  if (days === null) {
    return <span className="text-xs text-muted-foreground" data-testid="chip-sla-none">—</span>;
  }
  if (days < 0) {
    return (
      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300" data-testid="chip-sla-overdue">
        {Math.abs(days)}d overdue
      </Badge>
    );
  }
  if (days === 0) {
    return (
      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300" data-testid="chip-sla-today">
        Due today
      </Badge>
    );
  }
  const cls = days <= 1
    ? "bg-red-50 text-red-700 border-red-300"
    : days <= 2
    ? "bg-orange-50 text-orange-700 border-orange-300"
    : "bg-green-50 text-green-700 border-green-300";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`} data-testid="chip-sla-countdown">
      {days}d left
    </Badge>
  );
}

function CcrStatusChip({ status }: { status: string }) {
  const cls =
    status === "Action Required"
      ? "bg-red-100 text-red-700 border-red-200"
      : status === "Completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`} data-testid={`chip-ccr-status-${status}`}>
      {status}
    </Badge>
  );
}

// Replaces the generic "Action Required" chip with the specific CCR actions
// derived from the ruleset outcome stored on each line item.
function CcrActionsChip({ item }: { item: CcrLineItem }) {
  const actions: { label: string; cls: string }[] = [];

  if (item.newCicRequired)
    actions.push({ label: "New CIC Required",       cls: "bg-red-100 text-red-700 border-red-200" });
  if (item.contentUpdateRequired)
    actions.push({ label: "Content Update Required", cls: "bg-amber-100 text-amber-700 border-amber-200" });
  if (item.rundownRequired)
    actions.push({ label: "Rundown Required",        cls: "bg-violet-100 text-violet-700 border-violet-200" });

  if (actions.length === 0) {
    // Fallback to generic status when ruleset hasn't been applied yet
    return <CcrStatusChip status={item.ccrStatus} />;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {actions.map(({ label, cls }) => (
        <Badge
          key={label}
          variant="outline"
          className={`text-[10px] whitespace-nowrap ${cls}`}
          data-testid={`chip-ccr-action-${label.replace(/\s+/g, "-").toLowerCase()}`}
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}

// ─── Multi-select popover ────────────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  testId,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  testId: string;
}) {
  function toggle(val: string) {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  }

  const displayLabel =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 min-w-[140px] justify-between font-normal"
          data-testid={testId}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted cursor-pointer"
              data-testid={`filter-option-${testId}-${opt}`}
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                className="h-3.5 w-3.5"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="mt-2 w-full text-[10px] text-muted-foreground hover:text-foreground text-center py-1 border-t border-border"
            data-testid={`${testId}-clear`}
          >
            Clear selection
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Table row ───────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  networkEntry,
}: {
  item: CcrLineItem;
  networkEntry: NetworkEntry | undefined;
}) {
  const [, navigate] = useLocation();
  return (
    <TableRow
      className="hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => navigate(`/ccr/line-items/${item.id}`)}
      data-testid={`row-ccr-line-item-${item.id}`}
    >
      <TableCell className="py-2.5 pl-4">
        <UrgencyDot color={item.urgencyColor} />
      </TableCell>

      <TableCell className="py-2.5">
        <Badge
          variant="outline"
          className={`text-[10px] border ${TRIGGER_STAGE_COLOR[item.triggerStage] ?? TRIGGER_STAGE_COLOR["None"]}`}
          data-testid={`badge-trigger-stage-${item.id}`}
        >
          {TRIGGER_STAGE_LABEL[item.triggerStage] ?? "—"}
        </Badge>
      </TableCell>

      <TableCell className="py-2.5">
        <span className="text-sm font-medium" data-testid={`text-customer-chain-${item.id}`}>
          {item.customerChain}
        </span>
        <p className="text-[10px] text-muted-foreground leading-tight">{item.customerCode}</p>
      </TableCell>

      <TableCell className="py-2.5">
        <span className="text-xs font-mono" data-testid={`text-cbu-code-${item.id}`}>
          {item.successorCbuCode ?? "—"}
        </span>
        {item.predecessorCbuCode && (
          <p className="text-[10px] text-muted-foreground leading-tight">
            ← {item.predecessorCbuCode}
          </p>
        )}
      </TableCell>

      <TableCell className="py-2.5">
        <span className="text-xs" data-testid={`text-basepack-${item.id}`}>
          {networkEntry?.basepack ?? "—"}
        </span>
      </TableCell>

      <TableCell className="py-2.5">
        <span className="text-xs truncate max-w-[160px] block" data-testid={`text-nw-type-${item.id}`}>
          {networkEntry?.typeOfNetwork ?? "—"}
        </span>
      </TableCell>

      <TableCell className="py-2.5">
        <SlaChip escalationDueAt={item.escalationDueAt} triggerStage={item.triggerStage} />
      </TableCell>

      <TableCell className="py-2.5 text-center">
        {item.newCicRequired
          ? <CheckCircle2 className="h-4 w-4 text-slate-500 inline-block" />
          : <span className="text-muted-foreground/40 text-sm">—</span>}
      </TableCell>
      <TableCell className="py-2.5 text-center">
        {item.contentUpdateRequired
          ? <CheckCircle2 className="h-4 w-4 text-slate-500 inline-block" />
          : <span className="text-muted-foreground/40 text-sm">—</span>}
      </TableCell>
      <TableCell className="py-2.5 text-center">
        {item.rundownRequired
          ? <CheckCircle2 className="h-4 w-4 text-slate-500 inline-block" />
          : <span className="text-muted-foreground/40 text-sm">—</span>}
      </TableCell>

      <TableCell className="py-2.5 pr-4">
        {item.escalatedAt ? (
          <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-600 text-white text-[11px] font-bold select-none"
            title="Escalated"
            data-testid={`badge-escalated-${item.id}`}
          >
            !
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Tab panel ───────────────────────────────────────────────────────────────

function TabPanel({
  items,
  entryMap,
  loading,
}: {
  items: CcrLineItem[];
  entryMap: Map<string, NetworkEntry>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 px-4 py-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2" data-testid="empty-state">
        <CheckCircle2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">No items in this category</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-y border-border/60 bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-8 pl-4 py-2.5 text-xs font-semibold text-muted-foreground"></TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">Trigger Stage</TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">Customer Chain</TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">CBU Code</TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">Basepack</TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">Network Change Type</TableHead>
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">SLA</TableHead>
            <TableHead className="py-2.5 w-24 text-center text-xs font-semibold text-muted-foreground">New CIC</TableHead>
            <TableHead className="py-2.5 w-28 text-center text-xs font-semibold text-muted-foreground">Content Update</TableHead>
            <TableHead className="py-2.5 w-24 text-center text-xs font-semibold text-muted-foreground">Rundown</TableHead>
            <TableHead className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Escalation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <LineItemRow
              key={item.id}
              item={item}
              networkEntry={entryMap.get(item.successorCbuCode ?? "")}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CcrWorkspacePage() {
  const [, navigate] = useLocation();
  const rawSearch = useSearch();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Parse URL params into local filter state ──────────────────────────────
  const initialParams = new URLSearchParams(rawSearch);
  const urlCse = initialParams.get("cse") ?? "";
  // "" = resolved from /api/me (pending); real cse_id = explicit URL override
  const [selectedCse, setSelectedCse] = useState(urlCse);
  const [filterStages, setFilterStages] = useState<string[]>(parseMulti(initialParams.get("stage")));
  const [filterNwTypes, setFilterNwTypes] = useState<string[]>(parseMulti(initialParams.get("nwType")));
  const [filterEscalated, setFilterEscalated] = useState(initialParams.get("escalated") === "1");
  const [filterNewCic, setFilterNewCic] = useState(initialParams.get("newCic") === "1");
  const [filterContentUpdate, setFilterContentUpdate] = useState(initialParams.get("contentUpdate") === "1");
  const [filterRundown, setFilterRundown] = useState(initialParams.get("rundown") === "1");
  const [showFilters, setShowFilters] = useState(false);

  // ── Sync filter changes back to URL ──────────────────────────────────────
  const syncUrl = useCallback((
    cse: string,
    stages: string[],
    nwTypes: string[],
    escalated: boolean,
    newCic: boolean,
    contentUpdate: boolean,
    rundown: boolean,
  ) => {
    const p = new URLSearchParams();
    if (cse && cse !== "all") p.set("cse", cse);
    if (stages.length > 0) p.set("stage", stages.join(","));
    if (nwTypes.length > 0) p.set("nwType", nwTypes.join(","));
    if (escalated) p.set("escalated", "1");
    if (newCic) p.set("newCic", "1");
    if (contentUpdate) p.set("contentUpdate", "1");
    if (rundown) p.set("rundown", "1");
    const qs = p.toString();
    navigate(`/ccr${qs ? `?${qs}` : ""}`, { replace: true });
  }, [navigate]);

  // ── Current user — used for default CSE scope ────────────────────────────
  type CurrentUser = { id: string; name: string; email: string; cseId: string | null; role: string; isAdmin: boolean };
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/me"],
    queryFn: () => fetch("/api/me").then(r => r.json()),
  });

  // Enforce CSE scope once /api/me resolves.
  // - Non-admins: hard-bind to their assigned CSE — URL ?cse= is ignored entirely
  //   (backend also enforces this server-side for defense in depth).
  // - Admins: URL ?cse= override is honoured; default is "all" (unscoped).
  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.isAdmin) {
      // Non-admin: always force their own CSE regardless of URL param
      const cseId = currentUser.cseId ?? "all";
      if (cseId !== selectedCse) {
        setSelectedCse(cseId);
        syncUrl(cseId, filterStages, filterNwTypes, filterEscalated, filterNewCic, filterContentUpdate, filterRundown);
      }
    } else {
      // Admin: respect URL override; default to "all" if no param
      if (urlCse) return;
      if (selectedCse !== "all") {
        setSelectedCse("all");
        syncUrl("all", filterStages, filterNwTypes, filterEscalated, filterNewCic, filterContentUpdate, filterRundown);
      }
    }
  }, [currentUser]);

  function handleCseChange(v: string) {
    setSelectedCse(v);
    syncUrl(v, filterStages, filterNwTypes, filterEscalated, filterNewCic, filterContentUpdate, filterRundown);
  }
  function handleStagesChange(v: string[]) {
    setFilterStages(v);
    syncUrl(selectedCse, v, filterNwTypes, filterEscalated, filterNewCic, filterContentUpdate, filterRundown);
  }
  function handleNwTypesChange(v: string[]) {
    setFilterNwTypes(v);
    syncUrl(selectedCse, filterStages, v, filterEscalated, filterNewCic, filterContentUpdate, filterRundown);
  }
  function handleEscalatedChange(v: boolean) {
    setFilterEscalated(v);
    syncUrl(selectedCse, filterStages, filterNwTypes, v, filterNewCic, filterContentUpdate, filterRundown);
  }
  function handleNewCicChange(v: boolean) {
    setFilterNewCic(v);
    syncUrl(selectedCse, filterStages, filterNwTypes, filterEscalated, v, filterContentUpdate, filterRundown);
  }
  function handleContentUpdateChange(v: boolean) {
    setFilterContentUpdate(v);
    syncUrl(selectedCse, filterStages, filterNwTypes, filterEscalated, filterNewCic, v, filterRundown);
  }
  function handleRundownChange(v: boolean) {
    setFilterRundown(v);
    syncUrl(selectedCse, filterStages, filterNwTypes, filterEscalated, filterNewCic, filterContentUpdate, v);
  }
  function clearFilters() {
    // Restore logged-in CSE scope, not "all"
    const defaultCse = currentUser?.cseId ?? "all";
    setSelectedCse(defaultCse);
    setFilterStages([]);
    setFilterNwTypes([]);
    setFilterEscalated(false);
    setFilterNewCic(false);
    setFilterContentUpdate(false);
    setFilterRundown(false);
    syncUrl(defaultCse, [], [], false, false, false, false);
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: customers = [] } = useQuery<CcrCustomer[]>({
    queryKey: ["/api/ccr/customers"],
    queryFn: () => fetch("/api/ccr/customers").then(r => r.json()),
  });

  // Unique CSE IDs from customer master for the CSE selector
  const cseOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { cseId: string; chains: string[] }[] = [];
    for (const c of customers) {
      if (!c.cseId || seen.has(c.cseId)) {
        if (c.cseId) {
          const existing = out.find(o => o.cseId === c.cseId);
          if (existing) existing.chains.push(c.customerChain);
        }
        continue;
      }
      seen.add(c.cseId);
      out.push({ cseId: c.cseId, chains: [c.customerChain] });
    }
    return out;
  }, [customers]);

  const lineItemsQueryKey = ["/api/ccr/line-items", selectedCse];
  const { data: lineItemsData, isLoading: itemsLoading } = useQuery<LineItemsResponse>({
    queryKey: lineItemsQueryKey,
    queryFn: () => {
      const p = new URLSearchParams({ limit: "500" });
      // Only scope by CSE when a real email is selected ("" = pending, "all" = admin)
      if (selectedCse && selectedCse !== "all") p.set("cse_id", selectedCse);
      return fetch(`/api/ccr/line-items?${p}`).then(r => r.json());
    },
    // Wait until we know which CSE to scope to (avoids showing all items on first flash)
    enabled: selectedCse !== "",
  });

  const { data: networkEntries = [], isLoading: entriesLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const isLoading = itemsLoading || entriesLoading;

  const entryMap = useMemo(() => {
    const m = new Map<string, NetworkEntry>();
    for (const e of networkEntries) {
      if (e.cbuCode) m.set(e.cbuCode, e);
    }
    return m;
  }, [networkEntries]);

  const allItems = lineItemsData?.items ?? [];

  // Relaunch-only: CCR applies exclusively to relaunch CBUs.
  // Pack changes, extensions, and new launches are managed in other flows.
  // The backend already enforces this; the frontend mirrors it so counts
  // are consistent even if stale cache data sneaks in.
  const relaunchItems = useMemo(() => {
    return allItems.filter(item => {
      const entry = entryMap.get(item.successorCbuCode ?? "");
      return RELAUNCH_TYPES.has(entry?.typeOfNetwork ?? "");
    });
  }, [allItems, entryMap]);

  const nwTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const item of relaunchItems) {
      const entry = entryMap.get(item.successorCbuCode ?? "");
      if (entry?.typeOfNetwork) types.add(entry.typeOfNetwork);
    }
    return Array.from(types).sort();
  }, [relaunchItems, entryMap]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return relaunchItems.filter(item => {
      if (filterStages.length > 0 && !filterStages.includes(item.triggerStage)) return false;
      if (filterEscalated && !item.escalatedAt) return false;
      if (filterNwTypes.length > 0) {
        const entry = entryMap.get(item.successorCbuCode ?? "");
        if (!filterNwTypes.includes(entry?.typeOfNetwork ?? "")) return false;
      }
      if (filterNewCic && !item.newCicRequired) return false;
      if (filterContentUpdate && !item.contentUpdateRequired) return false;
      if (filterRundown && !item.rundownRequired) return false;
      return true;
    });
  }, [relaunchItems, filterStages, filterEscalated, filterNwTypes, filterNewCic, filterContentUpdate, filterRundown, entryMap]);

  // ── View routing ──────────────────────────────────────────────────────────
  // Four views per BRD:
  //   Immediate Actions — Stage 3 (Stock Movement) or 4 (Inventory Threshold): red/blinking-red urgency
  //   Actions to Start  — Stage 1 (Production Started) or 2 (Post FTR): amber urgency, action required
  //   Upcoming          — no trigger fired yet, or post-FTR status still "Upcoming"
  //   Completed         — CIC transition done
  // Immediate Actions = only Fourth trigger (inventory threshold breached; loss imminent)
  // Actions to Start  = First / Second / Third (post first trigger through stock movement)
  const immediateActions = filteredItems.filter(i =>
    i.ccrStatus === "Action Required" && i.triggerStage === "Fourth",
  );
  const actionsToStart = filteredItems.filter(i =>
    i.ccrStatus === "Action Required" &&
    (i.triggerStage === "Pricing" || i.triggerStage === "First" ||
     i.triggerStage === "Second"  || i.triggerStage === "Third"),
  );
  const upcoming  = filteredItems.filter(i => i.ccrStatus === "Upcoming");
  const completed = filteredItems.filter(i => i.ccrStatus === "Completed");

  // "Active filters" only tracks the filter-panel knobs (not CSE scope, which is
  // a persistent scope selector shown separately from the Filters panel).
  const hasActiveFilters =
    filterStages.length > 0 ||
    filterNwTypes.length > 0 ||
    filterEscalated ||
    filterNewCic ||
    filterContentUpdate ||
    filterRundown;

  // ── Trigger engine mutation ───────────────────────────────────────────────
  const evaluateMutation = useMutation({
    mutationFn: () =>
      // No body: backend fetches network entries server-side (tamper-resistant)
      apiRequest("POST", "/api/ccr/trigger-engine/evaluate").then(r => r.json()),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/api/ccr/line-items"] });
      toast({
        title: "Trigger Engine Complete",
        description: `Updated ${result.updated} item(s), escalated ${result.escalated}.`,
      });
    },
    onError: () => toast({ title: "Evaluation failed", variant: "destructive" }),
  });

  // ── Export ────────────────────────────────────────────────────────────────
  function handleDownload() {
    const rows = filteredItems.map(item => {
      const entry = entryMap.get(item.successorCbuCode ?? "");
      const days = slaDaysLeft(item.escalationDueAt);
      return {
        "Successor CBU":       item.successorCbuCode ?? "",
        "Predecessor CBU":     item.predecessorCbuCode ?? "",
        "Customer Chain":      item.customerChain,
        "Customer Code":       item.customerCode,
        "CIC":                 item.cic ?? "",
        "Trigger Stage":       TRIGGER_STAGE_LABEL[item.triggerStage] ?? item.triggerStage,
        "Urgency Color":       item.urgencyColor,
        "CCR Status":          item.ccrStatus,
        "Basepack":            entry?.basepack ?? "",
        "Network Change Type": entry?.typeOfNetwork ?? "",
        "SLA Days":            days !== null ? days : "",
        "Escalation Due":      item.escalationDueAt ?? "",
        "Escalated At":        item.escalatedAt ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CCR Workspace");
    XLSX.writeFile(wb, `CCR_Workspace_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="page-header">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-2.5 rounded-md">
              <GitCompareArrows className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="text-page-title">CCR Workspace</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Relaunch CBU transitions — 4 trigger stages · SLA window on 4th trigger · escalation after 3 days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* CSE scope identifier / admin selector */}
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {currentUser?.isAdmin ? (
                /* Admin: full CSE override dropdown */
                <Select value={selectedCse || "all"} onValueChange={handleCseChange}>
                  <SelectTrigger className="h-8 w-[210px] text-xs" data-testid="select-cse-scope">
                    <SelectValue placeholder="Loading…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="text-muted-foreground italic">All CSEs (Admin view)</span>
                    </SelectItem>
                    {cseOptions.map(opt => (
                      <SelectItem key={opt.cseId} value={opt.cseId}>
                        <span className="font-medium">{opt.cseId.split("@")[0]}</span>
                        <span className="text-muted-foreground text-[10px] ml-1">
                          ({opt.chains.join(", ")})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                /* Non-admin CSE: name badge + My / All toggle */
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-8 px-3 flex items-center border border-border rounded-md text-xs bg-muted/40 text-muted-foreground gap-1"
                    data-testid="badge-cse-identity"
                  >
                    <span className="font-medium text-foreground">
                      {currentUser?.name ?? currentUser?.email?.split("@")[0] ?? "Loading…"}
                    </span>
                  </div>
                  <div className="flex items-center border border-border rounded-md overflow-hidden text-xs h-8">
                    <button
                      className={`px-3 h-full transition-colors ${selectedCse !== "all" ? "bg-primary text-primary-foreground font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      onClick={() => handleCseChange(currentUser?.cseId ?? "")}
                      data-testid="btn-scope-mine"
                    >
                      My Items
                    </button>
                    <button
                      className={`px-3 h-full border-l border-border transition-colors ${selectedCse === "all" ? "bg-primary text-primary-foreground font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      onClick={() => handleCseChange("all")}
                      data-testid="btn-scope-all"
                    >
                      All Items
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(f => !f)}
              className={showFilters ? "bg-muted" : ""}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending || isLoading}
              data-testid="button-run-trigger-engine"
            >
              {evaluateMutation.isPending
                ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                : <Zap className="h-4 w-4 mr-1.5 text-amber-500" />
              }
              Run Trigger Engine
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={filteredItems.length === 0}
              data-testid="button-download-all"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download All
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card data-testid="filters-panel">
            <CardContent className="p-4">
              <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Network Change Type</label>
                  <MultiSelectFilter
                    label="All Types"
                    options={nwTypeOptions}
                    selected={filterNwTypes}
                    onChange={handleNwTypesChange}
                    testId="filter-nw-type"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Trigger Stage</label>
                  <MultiSelectFilter
                    label="All Stages"
                    options={TRIGGER_STAGE_ORDER.filter(s => s !== "None").map(s => s)}
                    selected={filterStages}
                    onChange={handleStagesChange}
                    testId="filter-stage"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Escalation</label>
                  <Button
                    variant={filterEscalated ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => handleEscalatedChange(!filterEscalated)}
                    data-testid="button-filter-escalated"
                  >
                    <AlertTriangle className={`h-3 w-3 ${filterEscalated ? "text-rose-600" : "text-muted-foreground"}`} />
                    Escalated Only
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Actions Required</label>
                  <div className="flex gap-1.5">
                    <Button
                      variant={filterNewCic ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleNewCicChange(!filterNewCic)}
                      data-testid="button-filter-new-cic"
                    >
                      <CheckCircle2 className={`h-3 w-3 ${filterNewCic ? "text-slate-700" : "text-muted-foreground"}`} />
                      New CIC
                    </Button>
                    <Button
                      variant={filterContentUpdate ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleContentUpdateChange(!filterContentUpdate)}
                      data-testid="button-filter-content-update"
                    >
                      <CheckCircle2 className={`h-3 w-3 ${filterContentUpdate ? "text-slate-700" : "text-muted-foreground"}`} />
                      Content Update
                    </Button>
                    <Button
                      variant={filterRundown ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleRundownChange(!filterRundown)}
                      data-testid="button-filter-rundown"
                    >
                      <CheckCircle2 className={`h-3 w-3 ${filterRundown ? "text-slate-700" : "text-muted-foreground"}`} />
                      Rundown
                    </Button>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Active filter tags */}
              {hasActiveFilters && (filterStages.length > 0 || filterNwTypes.length > 0 || filterNewCic || filterContentUpdate || filterRundown) && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                  {filterStages.map(s => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-[10px] gap-1 cursor-pointer"
                      onClick={() => handleStagesChange(filterStages.filter(x => x !== s))}
                      data-testid={`filter-tag-stage-${s}`}
                    >
                      {TRIGGER_STAGE_LABEL[s]} <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                  {filterNwTypes.map(t => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="text-[10px] gap-1 cursor-pointer"
                      onClick={() => handleNwTypesChange(filterNwTypes.filter(x => x !== t))}
                      data-testid={`filter-tag-nwtype-${t}`}
                    >
                      {t} <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                  {filterNewCic && (
                    <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => handleNewCicChange(false)} data-testid="filter-tag-new-cic">
                      New CIC Required <X className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                  {filterContentUpdate && (
                    <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => handleContentUpdateChange(false)} data-testid="filter-tag-content-update">
                      Content Update Required <X className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                  {filterRundown && (
                    <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => handleRundownChange(false)} data-testid="filter-tag-rundown">
                      Rundown Required <X className="h-2.5 w-2.5" />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary metric strip */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="summary-strip">
            {[
              { label: "Total Items",       value: filteredItems.length,      accent: "from-[#1f36c7] to-[#0d8ecf]",        testId: "metric-total" },
              { label: "Immediate Actions", value: immediateActions.length,   accent: "from-violet-700 to-purple-500",       testId: "metric-immediate-actions" },
              { label: "Actions to Start",  value: actionsToStart.length,     accent: "from-sky-600 to-cyan-500",            testId: "metric-actions-to-start" },
              { label: "Completed",         value: completed.length,          accent: "from-emerald-600 to-emerald-400",     testId: "metric-completed" },
            ].map(m => (
              <div
                key={m.label}
                className={`bg-gradient-to-br ${m.accent} rounded-xl p-4 text-white shadow-sm`}
                data-testid={m.testId}
              >
                <p className="text-xs font-medium opacity-75 mb-1">{m.label}</p>
                <p className="text-3xl font-bold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Four-tab workspace */}
        <Card>
          <Tabs defaultValue="immediate-actions" data-testid="workspace-tabs">
            <div className="border-b border-border/60 px-4 pt-3">
              <TabsList className="h-9 bg-transparent p-0 gap-1">

                {/* Tab 1 — Immediate Actions: Stage 3-4, loss started / new stock available */}
                <TabsTrigger
                  value="immediate-actions"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-immediate-actions"
                >
                  <Siren className="h-3.5 w-3.5 text-red-500" />
                  Immediate Actions
                  {immediateActions.length > 0 && (
                    <span
                      className="ml-1 min-w-[18px] px-1 h-[18px] bg-violet-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      data-testid="badge-immediate-actions-count"
                    >
                      {immediateActions.length}
                    </span>
                  )}
                </TabsTrigger>

                {/* Tab 2 — Actions to Start: Stage 1-2, post first trigger, network still amber */}
                <TabsTrigger
                  value="actions-to-start"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-actions-to-start"
                >
                  <Play className="h-3.5 w-3.5 text-amber-500" />
                  Actions to Start
                  {actionsToStart.length > 0 && (
                    <span
                      className="ml-1 min-w-[18px] px-1 h-[18px] bg-sky-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      data-testid="badge-actions-to-start-count"
                    >
                      {actionsToStart.length}
                    </span>
                  )}
                </TabsTrigger>

                {/* Tab 3 — Upcoming: no trigger fired yet */}
                <TabsTrigger
                  value="upcoming"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-upcoming"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Upcoming
                  <span
                    className="ml-1 min-w-[18px] px-1 h-[18px] bg-muted text-muted-foreground text-[9px] font-bold rounded-full flex items-center justify-center"
                    data-testid="badge-upcoming-count"
                  >
                    {upcoming.length}
                  </span>
                </TabsTrigger>

                {/* Tab 4 — Completed */}
                <TabsTrigger
                  value="completed"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-completed"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                  <span
                    className="ml-1 min-w-[18px] px-1 h-[18px] bg-muted text-muted-foreground text-[9px] font-bold rounded-full flex items-center justify-center"
                    data-testid="badge-completed-count"
                  >
                    {completed.length}
                  </span>
                </TabsTrigger>

              </TabsList>
            </div>

            <TabsContent value="immediate-actions" className="mt-0">
              <TabPanel items={immediateActions} entryMap={entryMap} loading={isLoading} />
            </TabsContent>

            <TabsContent value="actions-to-start" className="mt-0">
              <TabPanel items={actionsToStart} entryMap={entryMap} loading={isLoading} />
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0">
              <TabPanel items={upcoming} entryMap={entryMap} loading={isLoading} />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <TabPanel items={completed} entryMap={entryMap} loading={isLoading} />
            </TabsContent>
          </Tabs>
        </Card>

      </main>
    </div>
  );
}
