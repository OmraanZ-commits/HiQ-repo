import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import * as XLSX from "xlsx";
import { UnileverHeader } from "@/components/unilever-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  GitCompareArrows, Download, RefreshCw, Filter, X, AlertTriangle,
  Clock, CheckCircle2, Zap,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TRIGGER_STAGE_ORDER = ["First", "Second", "Third", "Fourth", "None"];
const TRIGGER_STAGE_LABEL: Record<string, string> = {
  First:  "1st Intimation",
  Second: "2nd Intimation",
  Third:  "3rd Intimation",
  Fourth: "4th Intimation",
  None:   "—",
};
const TRIGGER_STAGE_COLOR: Record<string, string> = {
  First:  "bg-blue-100 text-blue-700 border-blue-200",
  Second: "bg-amber-100 text-amber-700 border-amber-200",
  Third:  "bg-orange-100 text-orange-700 border-orange-200",
  Fourth: "bg-red-100 text-red-700 border-red-200",
  None:   "bg-muted text-muted-foreground border-border",
};

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

function SlaChip({ escalationDueAt }: { escalationDueAt: string | null }) {
  if (!escalationDueAt) {
    return <span className="text-xs text-muted-foreground" data-testid="chip-sla-none">—</span>;
  }
  const due = new Date(escalationDueAt);
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) {
    return (
      <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300" data-testid="chip-sla-overdue">
        {Math.abs(daysLeft)}d overdue
      </Badge>
    );
  }
  if (daysLeft === 0) {
    return (
      <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300" data-testid="chip-sla-today">
        Due today
      </Badge>
    );
  }
  const cls = daysLeft <= 1
    ? "bg-red-50 text-red-700 border-red-300"
    : daysLeft <= 2
    ? "bg-orange-50 text-orange-700 border-orange-300"
    : "bg-green-50 text-green-700 border-green-300";
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`} data-testid="chip-sla-countdown">
      {daysLeft}d left
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

// ─── Row component ────────────────────────────────────────────────────────────

function LineItemRow({
  item,
  networkEntry,
}: {
  item: CcrLineItem;
  networkEntry: NetworkEntry | undefined;
}) {
  return (
    <TableRow
      className="hover:bg-muted/40 transition-colors"
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
        <SlaChip escalationDueAt={item.escalationDueAt} />
      </TableCell>

      <TableCell className="py-2.5">
        <CcrStatusChip status={item.ccrStatus} />
      </TableCell>

      <TableCell className="py-2.5 pr-4">
        {item.escalatedAt ? (
          <Badge
            variant="outline"
            className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 gap-1"
            data-testid={`badge-escalated-${item.id}`}
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Escalated
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

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
            <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground">CCR Status</TableHead>
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CcrWorkspacePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filterNwType, setFilterNwType] = useState(params.get("nwType") ?? "all");
  const [filterStage, setFilterStage] = useState(params.get("stage") ?? "all");
  const [filterEscalated, setFilterEscalated] = useState(params.get("escalated") === "true");
  const [showFilters, setShowFilters] = useState(false);

  const { data: lineItemsData, isLoading: itemsLoading } = useQuery<LineItemsResponse>({
    queryKey: ["/api/ccr/line-items"],
    queryFn: () => fetch("/api/ccr/line-items?limit=500").then(r => r.json()),
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

  const nwTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const item of allItems) {
      const entry = entryMap.get(item.successorCbuCode ?? "");
      if (entry?.typeOfNetwork) types.add(entry.typeOfNetwork);
    }
    return Array.from(types).sort();
  }, [allItems, entryMap]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (filterStage !== "all" && item.triggerStage !== filterStage) return false;
      if (filterEscalated && !item.escalatedAt) return false;
      if (filterNwType !== "all") {
        const entry = entryMap.get(item.successorCbuCode ?? "");
        if ((entry?.typeOfNetwork ?? "") !== filterNwType) return false;
      }
      return true;
    });
  }, [allItems, filterStage, filterEscalated, filterNwType, entryMap]);

  const actionRequired = filteredItems.filter(i => i.ccrStatus === "Action Required");
  const upcoming = filteredItems.filter(i => i.ccrStatus === "Upcoming");
  const completed = filteredItems.filter(i => i.ccrStatus === "Completed");

  const evaluateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/ccr/trigger-engine/evaluate", {
        networkEntries: networkEntries,
      }).then(r => r.json()),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/api/ccr/line-items"] });
      toast({
        title: "Trigger Engine Complete",
        description: `Updated ${result.updated} item(s), escalated ${result.escalated}.`,
      });
    },
    onError: () => toast({ title: "Evaluation failed", variant: "destructive" }),
  });

  function handleDownload() {
    const rows = filteredItems.map(item => {
      const entry = entryMap.get(item.successorCbuCode ?? "");
      return {
        "Successor CBU": item.successorCbuCode ?? "",
        "Predecessor CBU": item.predecessorCbuCode ?? "",
        "Customer Chain": item.customerChain,
        "Customer Code": item.customerCode,
        "CIC": item.cic ?? "",
        "Trigger Stage": TRIGGER_STAGE_LABEL[item.triggerStage] ?? item.triggerStage,
        "Urgency Color": item.urgencyColor,
        "CCR Status": item.ccrStatus,
        "Execution Type": item.executionType,
        "Basepack": entry?.basepack ?? "",
        "Network Change Type": entry?.typeOfNetwork ?? "",
        "Escalation Due": item.escalationDueAt ?? "",
        "Escalated At": item.escalatedAt ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CCR Workspace");
    XLSX.writeFile(wb, `CCR_Workspace_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const hasActiveFilters = filterNwType !== "all" || filterStage !== "all" || filterEscalated;

  function clearFilters() {
    setFilterNwType("all");
    setFilterStage("all");
    setFilterEscalated(false);
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
                Customer Change Request lifecycle — trigger stages, SLA tracking, and escalation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
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
              <div className="flex items-center gap-4 flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Network Change Type</label>
                  <Select value={filterNwType} onValueChange={setFilterNwType}>
                    <SelectTrigger className="w-[220px] h-8 text-xs" data-testid="select-filter-nw-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {nwTypeOptions.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Trigger Stage</label>
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-filter-stage">
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      {TRIGGER_STAGE_ORDER.filter(s => s !== "None").map(s => (
                        <SelectItem key={s} value={s}>{TRIGGER_STAGE_LABEL[s]}</SelectItem>
                      ))}
                      <SelectItem value="None">Not Triggered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Escalation</label>
                  <Button
                    variant={filterEscalated ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setFilterEscalated(e => !e)}
                    data-testid="button-filter-escalated"
                  >
                    <AlertTriangle className={`h-3 w-3 ${filterEscalated ? "text-rose-600" : "text-muted-foreground"}`} />
                    Escalated Only
                  </Button>
                </div>

                {hasActiveFilters && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground opacity-0">x</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 text-muted-foreground"
                      onClick={clearFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-3 w-3" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary metric strip */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="summary-strip">
            {[
              { label: "Total Items",     value: filteredItems.length,    accent: "from-[#1f36c7] to-[#0d8ecf]", testId: "metric-total" },
              { label: "Action Required", value: actionRequired.length,  accent: "from-red-600 to-red-400",       testId: "metric-action-required" },
              { label: "Upcoming",        value: upcoming.length,         accent: "from-amber-500 to-amber-400",   testId: "metric-upcoming" },
              { label: "Completed",       value: completed.length,        accent: "from-emerald-600 to-emerald-400", testId: "metric-completed" },
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

        {/* Three-tab workspace */}
        <Card>
          <Tabs defaultValue="action-required" data-testid="workspace-tabs">
            <div className="border-b border-border/60 px-4 pt-3">
              <TabsList className="h-9 bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="action-required"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-action-required"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Action Required
                  {actionRequired.length > 0 && (
                    <span className="ml-1 min-w-[18px] h-4.5 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center" data-testid="badge-action-required-count">
                      {actionRequired.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="upcoming"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-upcoming"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Upcoming
                  <span className="ml-1 min-w-[18px] h-4.5 px-1 bg-muted text-muted-foreground text-[9px] font-bold rounded-full flex items-center justify-center" data-testid="badge-upcoming-count">
                    {upcoming.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="completed"
                  className="gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-b-none rounded-t-md px-3 h-9"
                  data-testid="tab-completed"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                  <span className="ml-1 min-w-[18px] h-4.5 px-1 bg-muted text-muted-foreground text-[9px] font-bold rounded-full flex items-center justify-center" data-testid="badge-completed-count">
                    {completed.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="action-required" className="mt-0">
              <TabPanel items={actionRequired} entryMap={entryMap} loading={isLoading} />
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
