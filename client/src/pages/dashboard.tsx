import { useState } from "react";
import { useLocation } from "wouter";
import { useNetworkEntries } from "@/controllers/useNetworkEntries";
import { UnileverHeader } from "@/components/unilever-header";
import { StatsCards } from "@/components/stats-cards";
import { NetworkTable } from "@/components/network-table";
import { EntryDetailDialog } from "@/components/entry-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Filter, Search, X, BarChart3 } from "lucide-react";
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
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
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  Filters
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border flex-wrap" data-testid="filters-panel">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_FLOW.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {statusFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-5"
                    onClick={() => setStatusFilter("all")}
                    data-testid="button-clear-filters"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <NetworkTable
                entries={filteredEntries}
                onView={handleView}
                onEdit={handleEdit}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <EntryDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entry={viewEntry}
      />
    </div>
  );
}
