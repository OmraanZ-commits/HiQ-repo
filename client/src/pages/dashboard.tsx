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

              /* counts by status */
              const byStatus = STATUS_FLOW.map(s => ({
                status: s,
                count: entries.filter(e => e.networkStatus === s).length,
              }));

              /* counts by BG */
              const bgKeys = Array.from(new Set(entries.map(e => e.bg ?? "—"))).sort();
              const byBG = bgKeys.map(bg => {
                const rows = entries.filter(e => (e.bg ?? "—") === bg);
                return {
                  bg,
                  total: rows.length,
                  statusCounts: STATUS_FLOW.map(s => ({ status: s, count: rows.filter(e => e.networkStatus === s).length })),
                };
              });

              const statusColor: Record<string, string> = {
                "Draft":                      "bg-slate-100 text-slate-700 border-slate-300",
                "Active":                     "bg-green-50 text-green-700 border-green-300",
                "Pricing Updated":            "bg-blue-50 text-blue-700 border-blue-300",
                "Production Started":         "bg-amber-50 text-amber-700 border-amber-300",
                "FTR Approved":               "bg-cyan-50 text-cyan-700 border-cyan-300",
                "Stock Movement Initiated":   "bg-violet-50 text-violet-700 border-violet-300",
                "Network transition complete":"bg-emerald-50 text-emerald-700 border-emerald-300",
              };

              return (
                <div className="space-y-6">
                  {/* ── Total ── */}
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] rounded-xl p-5 text-white flex items-center gap-4 shadow-sm">
                      <div>
                        <p className="text-sm font-medium opacity-80">Total Entries</p>
                        <p className="text-4xl font-bold tabular-nums" data-testid="summary-total">{total}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── By Status ── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <p className="text-sm font-semibold">By Status</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {byStatus.map(({ status, count }) => (
                          <div key={status} data-testid={`summary-status-${status}`}
                            className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-4 bg-muted/20">
                            <p className="text-[11px] text-muted-foreground leading-tight">{status}</p>
                            <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
                            <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#1f36c7]/70 transition-all"
                                style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : "0%" }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {total > 0 ? `${Math.round((count / total) * 100)}%` : "0%"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── By BG ── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <p className="text-sm font-semibold">By Business Group (BG)</p>
                    </CardHeader>
                    <CardContent className="pt-0 px-0">
                      {/* header */}
                      <div className="grid grid-cols-[160px_60px_repeat(7,1fr)] gap-0 px-6 py-2 bg-muted/40 border-y border-border/60 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        <span>BG</span>
                        <span className="text-center">Total</span>
                        {STATUS_FLOW.map(s => (
                          <span key={s} className="text-center leading-tight px-1">{s}</span>
                        ))}
                      </div>
                      {byBG.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic px-6 py-4">No data</p>
                      ) : byBG.map((row, i) => (
                        <div key={row.bg} data-testid={`summary-bg-${i}`}
                          className="grid grid-cols-[160px_60px_repeat(7,1fr)] gap-0 px-6 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors text-xs">
                          <span className="font-medium text-[#1f36c7] truncate pr-2" title={row.bg}>{row.bg}</span>
                          <span className="text-center font-semibold">{row.total}</span>
                          {row.statusCounts.map(({ status, count }) => (
                            <span key={status} className="text-center">
                              {count > 0 ? (
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 font-medium ${statusColor[status] ?? ""}`}>
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ))}
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
