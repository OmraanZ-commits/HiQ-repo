import { useState } from "react";
import { useLocation } from "wouter";
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
import { Download, Filter, Search, X, BarChart3, LayoutList, PieChart } from "lucide-react";
import { STATUS_FLOW, type NetworkEntry } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
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
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="entries" data-testid="dashboard-tabs">
          <TabsList className="mb-4">
            <TabsTrigger value="entries" data-testid="tab-entries" className="gap-1.5">
              <LayoutList className="h-3.5 w-3.5" />Entries
            </TabsTrigger>
            <TabsTrigger value="summary" data-testid="tab-summary" className="gap-1.5">
              <PieChart className="h-3.5 w-3.5" />Summary
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
                  <NetworkTable entries={filteredEntries} onView={handleView} onEdit={handleEdit} lifecycleMap={lifecycleMap} />
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

                  {/* ── Status cards row ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {byStatus.map(({ status, count, meta }) => (
                      <div key={status}
                        className={`rounded-lg border-l-4 border border-border/50 p-3 ${meta.card}`}
                        data-testid={`summary-status-card-${status}`}>
                        <p className={`text-[10px] font-medium leading-tight mb-2 ${meta.text}`}>{meta.label}</p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
                        <div className="mt-2 h-1 rounded-full bg-white/60 overflow-hidden">
                          <div className={`h-full rounded-full ${meta.bar}`}
                            style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Pending by Assignee ── */}
                  <Card>
                    <CardHeader className="pb-0 px-5 pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Pending by Assignee</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {pendingEntries.length} pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-4">
                      {byAssignee.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No pending entries</p>
                      ) : (
                        <div className="space-y-3">
                          {byAssignee.map((row, i) => (
                            <div key={row.person} data-testid={`summary-assignee-${i}`} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* avatar circle */}
                                  <div className="h-7 w-7 rounded-full bg-[#1f36c7]/10 border border-[#1f36c7]/20 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-[#1f36c7]">
                                      {row.person === "Unassigned" ? "?" : row.person.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium truncate">{row.person}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* status breakdown dots */}
                                  <div className="flex items-center gap-1 flex-wrap justify-end">
                                    {row.statusCounts.filter(sc => sc.count > 0).map(sc => (
                                      <span key={sc.status} title={`${sc.status}: ${sc.count}`}
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sc.meta.card} ${sc.meta.text}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${sc.meta.dot}`} />
                                        {sc.count}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-sm font-bold tabular-nums text-foreground w-6 text-right">{row.pending}</span>
                                </div>
                              </div>
                              {/* proportional bar */}
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-9">
                                <div className="h-full flex gap-px">
                                  {row.statusCounts.filter(sc => sc.count > 0).map(sc => (
                                    <div key={sc.status}
                                      title={`${sc.status}: ${sc.count}`}
                                      className={`h-full ${sc.meta.bar} transition-all`}
                                      style={{ width: `${(sc.count / maxPending) * 100}%` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
    </div>
  );
}
