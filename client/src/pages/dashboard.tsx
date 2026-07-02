import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useNetworkEntries } from "@/controllers/useNetworkEntries";
import { useLifecycleData } from "@/controllers/useLifecycleData";
import { UnileverHeader } from "@/components/unilever-header";
import { StatsCards } from "@/components/stats-cards";
import { NetworkTable } from "@/components/network-table";
import { EntryDetailDialog } from "@/components/entry-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Download, Filter, Search, X, BarChart3, LayoutList, PieChart, Layers, FileSpreadsheet, Upload, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import { STATUS_FLOW, type NetworkEntry } from "@shared/schema";
import { getNotifications, registerBulkOpCbus } from "@/lib/notification-store";
import type { BulkDigestNotification } from "@/lib/notification-store";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const bulkOpFilter = new URLSearchParams(search).get("bulkOp") ?? null;

  const {
    entries,
    filteredEntries,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFilters,
    setShowFilters,
  } = useNetworkEntries();

  const { lifecycleMap } = useLifecycleData();
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewEntry, setViewEntry] = useState<NetworkEntry | null>(null);

  // ── FTR Excel Upload ────────────────────────────────────────────────────────
  const ftrExcelRef = useRef<HTMLInputElement>(null);
  const queryClientDash = useQueryClient();
  const [ftrExcelOpen, setFtrExcelOpen] = useState(false);
  const [ftrExcelFileName, setFtrExcelFileName] = useState("");
  const [ftrExcelRows, setFtrExcelRows] = useState<{ cbu_code: string; ftr_link: string; description: string }[]>([]);

  const uploadFtrExcelMutation = useMutation({
    mutationFn: (payload: { entries: any[]; uploadedBy: string; sourceFile: string }) =>
      apiRequest("POST", "/api/ftr/links/upload", payload).then(r => r.json()),
    onSuccess: (result) => {
      queryClientDash.invalidateQueries({ queryKey: ["/api/network-entries"] });
      setFtrExcelRows([]);
      setFtrExcelFileName("");
      if (ftrExcelRef.current) ftrExcelRef.current.value = "";
      setFtrExcelOpen(false);
      const msg = result.triggered > 0
        ? `${result.added} link(s) saved. ${result.triggered} CBU(s) moved to "FTR Approved".`
        : `${result.added} FTR link(s) saved.`;
      alert(msg);
    },
    onError: () => alert("Upload failed — please try again."),
  });

  const handleFtrExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFtrExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const parsed = rows.slice(1).filter(r => r[0] && r[1]).map(r => ({
        cbu_code: String(r[0]).trim(),
        ftr_link: String(r[1]).trim(),
        description: r[2] ? String(r[2]).trim() : "",
      }));
      setFtrExcelRows(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const [bulkOpCbuCodes, setBulkOpCbuCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!bulkOpFilter || !entries.length) return;
    if (bulkOpCbuCodes !== null) return;
    const notif = getNotifications().find(
      (n): n is BulkDigestNotification =>
        n.type === "bulk-digest" && n.bulkOperationId === bulkOpFilter
    );
    if (!notif) return;
    const count = Math.min(notif.cbuCount, entries.length);
    const codes = entries.slice(0, count).map(e => e.cbuCode ?? "").filter(Boolean);
    registerBulkOpCbus(bulkOpFilter, codes);
    setBulkOpCbuCodes(codes);
  }, [bulkOpFilter, entries, bulkOpCbuCodes]);

  const displayedEntries = useMemo(() => {
    if (!bulkOpFilter || !bulkOpCbuCodes) return filteredEntries;
    const codeSet = new Set(bulkOpCbuCodes);
    return filteredEntries.filter(e => codeSet.has(e.cbuCode ?? ""));
  }, [bulkOpFilter, bulkOpCbuCodes, filteredEntries]);

  const bulkOpCount = bulkOpCbuCodes?.length ?? null;

  const handleEdit = (entry: NetworkEntry) => {
    navigate(`/edit/${entry.id}`);
  };

  const handleView = (entry: NetworkEntry) => {
    setViewEntry(entry);
    setDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="page-header">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="text-page-title">Network Visibility</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Central portal for managing network visibility across all categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={ftrExcelRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFtrExcelChange}
              data-testid="input-ftr-excel"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFtrExcelOpen(true)}
              data-testid="button-ftr-excel-upload"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
              Upload FTR Excel
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        {bulkOpFilter && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800"
            data-testid="banner-bulk-op-filter"
          >
            <Layers className="h-4 w-4 shrink-0 text-indigo-600" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Showing {bulkOpCount !== null ? bulkOpCount : "…"} CBUs from Bulk Operation: </span>
              <span className="text-sm font-mono font-semibold">{bulkOpFilter}</span>
            </div>
            <button
              onClick={() => navigate("/network")}
              className="text-indigo-500 hover:text-indigo-700 transition-colors"
              data-testid="button-dismiss-bulk-op-filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <Tabs defaultValue={bulkOpFilter ? "entries" : "summary"} data-testid="dashboard-tabs">
          <TabsList className="mb-4">
            <TabsTrigger value="summary" data-testid="tab-summary" className="gap-1.5">
              <PieChart className="h-3.5 w-3.5" />Summary
            </TabsTrigger>
            <TabsTrigger value="entries" data-testid="tab-entries" className="gap-1.5">
              <LayoutList className="h-3.5 w-3.5" />Network
            </TabsTrigger>
          </TabsList>

          {/* ── Entries Tab ─────────────────────────────────── */}
          <TabsContent value="entries" className="mt-0 space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}><CardContent className="p-5">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent></Card>
                ))}
              </div>
            ) : (
              <StatsCards stats={stats} />
            )}

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by CBU code, description, or brand..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-table-search"
                      />
                      {searchQuery && (
                        <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")} data-testid="button-clear-search">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} data-testid="button-toggle-filters">
                      <Filter className="h-4 w-4 mr-1.5" />Filters
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border flex-wrap" data-testid="filters-panel">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {statusFilter !== "all" && (
                      <Button variant="ghost" size="sm" className="mt-5" onClick={() => setStatusFilter("all")} data-testid="button-clear-filters">
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <NetworkTable entries={displayedEntries} onView={handleView} onEdit={handleEdit} lifecycleMap={lifecycleMap} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Summary Tab ─────────────────────────────────── */}
          <TabsContent value="summary" className="mt-0">
            {(() => {
              const total = entries.length;

              /* status metadata */
              type StatusMeta = { bar: string; dot: string; card: string; label: string; text: string };
              const STATUS_META: Record<string, StatusMeta> = {
                "Draft":                       { bar: "bg-slate-400",   dot: "bg-slate-400",   card: "border-l-slate-400   bg-slate-50/60",   label: "Draft",          text: "text-slate-700" },
                "Active":                      { bar: "bg-green-500",   dot: "bg-green-500",   card: "border-l-green-500   bg-green-50/60",   label: "Active",         text: "text-green-700" },
                "Pricing Updated":             { bar: "bg-blue-500",    dot: "bg-blue-500",    card: "border-l-blue-500    bg-blue-50/60",    label: "Pricing Updated",text: "text-blue-700" },
                "Production Started":          { bar: "bg-amber-500",   dot: "bg-amber-500",   card: "border-l-amber-500   bg-amber-50/60",   label: "Prod. Started",  text: "text-amber-700" },
                "FTR Approved":                { bar: "bg-cyan-500",    dot: "bg-cyan-500",    card: "border-l-cyan-500    bg-cyan-50/60",    label: "FTR Approved",   text: "text-cyan-700" },
                "Stock Movement Initiated":    { bar: "bg-violet-500",  dot: "bg-violet-500",  card: "border-l-violet-500  bg-violet-50/60",  label: "Stock Mvmt.",    text: "text-violet-700" },
                "Network transition complete": { bar: "bg-emerald-500", dot: "bg-emerald-500", card: "border-l-emerald-500 bg-emerald-50/60", label: "NW Complete",    text: "text-emerald-700" },
              };
              const DEFAULT_META: StatusMeta = { bar: "bg-muted", dot: "bg-muted", card: "border-l-border bg-muted/20", label: "—", text: "text-muted-foreground" };

              const byStatus = STATUS_FLOW.map(s => ({
                status: s,
                count: entries.filter(e => e.networkStatus === s).length,
                meta: STATUS_META[s] ?? DEFAULT_META,
              }));

              const active    = entries.filter(e => e.networkStatus === "Active").length;
              const complete  = entries.filter(e => e.networkStatus === "Network transition complete").length;
              const inPipeline = total - (byStatus[0].count) - complete; /* everything between Draft and Complete */

              /* pending by assignee — all statuses except "Network transition complete" */
              const pendingEntries = entries.filter(e => e.networkStatus !== "Network transition complete");
              const assigneeKeys = Array.from(new Set(pendingEntries.map(e => e.assignedPerson ?? "Unassigned"))).sort();
              const byAssignee = assigneeKeys
                .map(person => {
                  const rows = pendingEntries.filter(e => (e.assignedPerson ?? "Unassigned") === person);
                  return {
                    person,
                    pending: rows.length,
                    statusCounts: STATUS_FLOW.filter(s => s !== "Network transition complete").map(s => ({
                      status: s,
                      count: rows.filter(e => e.networkStatus === s).length,
                      meta: STATUS_META[s] ?? DEFAULT_META,
                    })),
                  };
                })
                .sort((a, b) => b.pending - a.pending);
              const maxPending = byAssignee[0]?.pending ?? 1;

              /* ageing helpers */
              const todayMs = Date.now();
              const ageInDays = (d: string | null | undefined) =>
                d ? Math.floor((todayMs - new Date(d + "T00:00:00").getTime()) / 86_400_000) : 0;

              /* pending entries broken down by their current status, with ageing stats */
              const pendingByStatus = STATUS_FLOW.filter(s => s !== "Network transition complete").map(s => {
                const rows = pendingEntries.filter(e => e.networkStatus === s);
                const ages = rows.map(e => ageInDays(e.cbuCreatedDate));
                const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
                return {
                  status: s,
                  meta: STATUS_META[s] ?? DEFAULT_META,
                  count: rows.length,
                  avgAge,
                  gt7:  ages.filter(a => a > 7  && a <= 30).length,
                  gt30: ages.filter(a => a > 30 && a <= 90).length,
                  gt90: ages.filter(a => a > 90).length,
                };
              }).filter(r => r.count > 0);

              const bgKeys = Array.from(new Set(entries.map(e => e.bg ?? "—"))).sort();
              const byBG = bgKeys.map(bg => {
                const rows = entries.filter(e => (e.bg ?? "—") === bg);
                return {
                  bg,
                  total: rows.length,
                  statusCounts: STATUS_FLOW.map(s => ({
                    status: s,
                    count: rows.filter(e => e.networkStatus === s).length,
                    meta: STATUS_META[s] ?? DEFAULT_META,
                  })),
                };
              });

              return (
                <div className="space-y-5">

                  {/* ── Metric strip ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Total Entries",  value: total,       accent: "from-[#1f36c7] to-[#0d8ecf]", testId: "summary-total" },
                      { label: "Draft",          value: byStatus[0].count, accent: "from-slate-500 to-slate-400",  testId: "summary-draft" },
                      { label: "Active",         value: active,      accent: "from-green-600 to-green-400",  testId: "summary-active" },
                      { label: "NW Complete",    value: complete,    accent: "from-emerald-600 to-emerald-400", testId: "summary-complete" },
                    ].map(m => (
                      <div key={m.label} className={`bg-gradient-to-br ${m.accent} rounded-xl p-4 text-white shadow-sm`} data-testid={m.testId}>
                        <p className="text-xs font-medium opacity-75 mb-1">{m.label}</p>
                        <p className="text-3xl font-bold tabular-nums">{m.value}</p>
                        {total > 0 && <p className="text-[10px] opacity-60 mt-1">{Math.round((m.value / total) * 100)}% of total</p>}
                      </div>
                    ))}
                  </div>

                  {/* ── Pipeline bar ── */}
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status Pipeline</p>
                      {/* segmented bar */}
                      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-4">
                        {byStatus.map(({ status, count, meta }) =>
                          count > 0 ? (
                            <div
                              key={status}
                              title={`${status}: ${count}`}
                              className={`${meta.bar} transition-all`}
                              style={{ width: `${(count / total) * 100}%` }}
                            />
                          ) : null
                        )}
                      </div>
                      {/* legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {byStatus.map(({ status, count, meta }) => (
                          <div key={status} className="flex items-center gap-1.5" data-testid={`summary-status-${status}`}>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
                            <span className="text-xs text-muted-foreground">{status}</span>
                            <span className={`text-xs font-semibold tabular-nums ${meta.text}`}>{count}</span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {total > 0 ? `(${Math.round((count / total) * 100)}%)` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Pending by Status + Assignee (side by side) ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                  {/* Pending by Status (ageing table) */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-5 pt-4 pb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending by Status</p>
                        <Badge variant="secondary" className="text-[10px]">{pendingEntries.length} pending</Badge>
                      </div>
                      {pendingByStatus.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-5 pb-4">No pending entries</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-y border-border/60 bg-muted/40">
                                <th className="text-left font-semibold text-muted-foreground px-5 py-2 w-40">Status</th>
                                <th className="text-right font-semibold text-muted-foreground px-3 py-2">Items</th>
                                <th className="text-right font-semibold text-muted-foreground px-3 py-2">Avg Age</th>
                                <th className="text-right font-semibold text-muted-foreground px-3 py-2 text-amber-600">7–30 days</th>
                                <th className="text-right font-semibold text-muted-foreground px-3 py-2 text-orange-600">1–3 months</th>
                                <th className="text-right font-semibold text-muted-foreground px-5 py-2 text-red-600">&gt; 3 months</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingByStatus.map((r, i) => (
                                <tr key={r.status}
                                  data-testid={`summary-pending-status-${r.status}`}
                                  className={`border-b border-border/40 last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                                  <td className="px-5 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`h-2 w-2 rounded-full shrink-0 ${r.meta.dot}`} />
                                      <span className={`font-medium ${r.meta.text}`} title={r.status}>{r.meta.label}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{r.count}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                                    {r.avgAge}d
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">
                                    {r.gt7 > 0
                                      ? <span className="font-semibold text-amber-600">{r.gt7}</span>
                                      : <span className="text-muted-foreground/40">—</span>}
                                  </td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">
                                    {r.gt30 > 0
                                      ? <span className="font-semibold text-orange-600">{r.gt30}</span>
                                      : <span className="text-muted-foreground/40">—</span>}
                                  </td>
                                  <td className="px-5 py-2.5 text-right tabular-nums">
                                    {r.gt90 > 0
                                      ? <span className="font-bold text-red-600">{r.gt90}</span>
                                      : <span className="text-muted-foreground/40">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending by Assignee */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending by Assignee</p>
                        <Badge variant="secondary" className="text-[10px]">{byAssignee.length} people</Badge>
                      </div>
                      {byAssignee.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No pending entries</p>
                      ) : (
                        <div className="space-y-2">
                          {byAssignee.map((row, i) => (
                            <div key={row.person} data-testid={`summary-assignee-${i}`} className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-[#1f36c7]/10 border border-[#1f36c7]/20 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-[#1f36c7]">
                                  {row.person === "Unassigned" ? "?" : row.person.split(" ").map((p: string) => p[0]).join("").slice(0,2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs flex-1 truncate">{row.person}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-[#1f36c7]/60 transition-all"
                                  style={{ width: `${(row.pending / maxPending) * 100}%` }} />
                              </div>
                              <span className="text-xs font-bold tabular-nums text-[#1f36c7] w-5 text-right">{row.pending}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  </div>{/* end side-by-side grid */}

                  {/* ── BG summary ── */}
                  <Card>
                    <CardHeader className="pb-0 px-5 pt-4">
                      <p className="text-sm font-semibold">By Business Group</p>
                    </CardHeader>
                    <CardContent className="p-0 mt-3">
                      {/* sticky header */}
                      <div className="grid grid-cols-[180px_56px_repeat(7,minmax(0,1fr))] gap-0 px-5 py-2 bg-muted/50 border-y border-border/60 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-0">
                        <span>Business Group</span>
                        <span className="text-center">Total</span>
                        {byStatus.map(({ status, meta }) => (
                          <span key={status} className={`text-center ${meta.text}`} title={status}>{meta.label}</span>
                        ))}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {byBG.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic px-5 py-4">No data</p>
                        ) : byBG.map((row, i) => (
                          <div key={row.bg} data-testid={`summary-bg-${i}`}
                            className="grid grid-cols-[180px_56px_repeat(7,minmax(0,1fr))] gap-0 px-5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                            {/* BG name + mini bar */}
                            <div className="py-3 pr-3">
                              <p className="text-xs font-semibold text-[#1f36c7] truncate" title={row.bg}>{row.bg}</p>
                              <div className="mt-1 h-1 rounded-full bg-border/40 overflow-hidden">
                                <div className="h-full rounded-full bg-[#1f36c7]/50"
                                  style={{ width: total > 0 ? `${(row.total / total) * 100}%` : "0%" }} />
                              </div>
                            </div>
                            {/* total */}
                            <div className="flex items-center justify-center">
                              <span className="text-sm font-bold tabular-nums">{row.total}</span>
                            </div>
                            {/* per-status */}
                            {row.statusCounts.map(({ status, count, meta }) => (
                              <div key={status} className="flex items-center justify-center py-3">
                                {count > 0 ? (
                                  <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${meta.text}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                    {count}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </main>

      <EntryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entry={viewEntry}
      />

      {/* ── FTR Excel Upload Dialog ─────────────────────────────────────── */}
      <Dialog open={ftrExcelOpen} onOpenChange={setFtrExcelOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Upload FTR Excel
            </DialogTitle>
            <DialogDescription>
              Upload a spreadsheet mapping CBU codes to FTR document links. Any CBU in
              <span className="font-semibold"> "Production Started"</span> status will automatically
              advance to <span className="font-semibold">"FTR Approved"</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Format hint */}
            <div className="rounded-md bg-muted/50 border px-4 py-3 text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Expected Excel format (Sheet 1):</p>
              <div className="grid grid-cols-3 gap-2 mt-1 font-mono text-[11px]">
                <span className="bg-background border rounded px-2 py-1 text-center font-semibold text-foreground">A — CBU Code</span>
                <span className="bg-background border rounded px-2 py-1 text-center font-semibold text-foreground">B — FTR Link</span>
                <span className="bg-background border rounded px-2 py-1 text-center text-muted-foreground">C — Description (optional)</span>
              </div>
              <p className="mt-2">Row 1 is the header and will be skipped.</p>
            </div>

            {/* Dropzone */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-8 px-4 cursor-pointer hover:border-emerald-400/60 hover:bg-muted/10 transition-colors"
              onClick={() => ftrExcelRef.current?.click()}
              data-testid="dropzone-ftr-excel"
            >
              <Upload className="h-8 w-8 text-muted-foreground/40" />
              {ftrExcelFileName ? (
                <div className="text-center">
                  <p className="text-sm font-medium">{ftrExcelFileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ftrExcelRows.length} row(s) parsed · click to replace</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Click to select an Excel file</p>
                  <p className="text-xs text-muted-foreground mt-0.5">.xlsx or .xls</p>
                </div>
              )}
            </div>

            {/* Preview table */}
            {ftrExcelRows.length > 0 && (
              <div className="rounded-md border overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-36">CBU Code</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground">FTR Link</th>
                      <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-44">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ftrExcelRows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 px-3 font-mono text-[11px]">{r.cbu_code}</td>
                        <td className="py-2 px-3 truncate max-w-xs text-[#0d8ecf]">{r.ftr_link}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {ftrExcelRows.length > 0 && (
            <div className="mx-1 mb-1 flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed">
                Please ensure the CBU IDs in this file are correct. Uploading will trigger the <span className="font-semibold">FTR Approved</span> stage for any matching CBU currently in <span className="font-semibold">Production Started</span>.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setFtrExcelOpen(false); setFtrExcelRows([]); setFtrExcelFileName(""); }} data-testid="btn-ftr-excel-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => uploadFtrExcelMutation.mutate({ entries: ftrExcelRows, uploadedBy: "Portal User", sourceFile: ftrExcelFileName })}
              disabled={ftrExcelRows.length === 0 || uploadFtrExcelMutation.isPending}
              data-testid="btn-ftr-excel-submit"
            >
              {uploadFtrExcelMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
                : <><Upload className="h-4 w-4 mr-2" /> Upload {ftrExcelRows.length > 0 ? `${ftrExcelRows.length} link${ftrExcelRows.length !== 1 ? "s" : ""}` : "Links"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
