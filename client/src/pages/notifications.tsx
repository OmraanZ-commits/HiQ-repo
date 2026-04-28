import { useState, useMemo } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell, CheckCircle2, MapPin, Warehouse, User, XCircle, Clock, Hash,
  Activity, UserCheck, UserX, Mail, Layers, AlertTriangle,
  ChevronDown, ChevronUp, Search, X, CheckCheck, Inbox, Package,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useNotificationStore, markRead, markAllRead,
} from "@/lib/notification-store";
import type {
  GeoExtensionNotification, LifecycleNotification, AssignmentNotification,
  FinanceEmailNotification, FinanceCbu, BulkDigestNotification, AppNotification,
} from "@/lib/notification-store";
import type { ApproverStep } from "@/lib/sr-store";
import type { NetworkEntry } from "@shared/schema";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Category config ─────────────────────────────────────────────────────────

type Category = "all" | AppNotification["type"];

const CATEGORIES: { id: Category; label: string; icon: typeof Bell }[] = [
  { id: "all",                    label: "All",            icon: Bell },
  { id: "lifecycle",              label: "Lifecycle",      icon: Activity },
  { id: "geo-extension-applied",  label: "Geo Extension",  icon: MapPin },
  { id: "assignment",             label: "Assignment",     icon: UserCheck },
  { id: "finance-email",          label: "Finance",        icon: Mail },
  { id: "bulk-digest",            label: "Bulk",           icon: Layers },
];

function categoryLabel(type: AppNotification["type"]): string {
  return CATEGORIES.find(c => c.id === type)?.label ?? type;
}

function typeBadgeClass(type: AppNotification["type"]): string {
  switch (type) {
    case "lifecycle":             return "bg-blue-100 text-blue-700 border-blue-300";
    case "geo-extension-applied": return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "assignment":            return "bg-violet-100 text-violet-700 border-violet-300";
    case "finance-email":         return "bg-amber-100 text-amber-700 border-amber-300";
    case "bulk-digest":           return "bg-indigo-100 text-indigo-700 border-indigo-300";
    default:                      return "bg-muted text-muted-foreground";
  }
}

function typeIconColor(type: AppNotification["type"]): string {
  switch (type) {
    case "lifecycle":             return "bg-blue-50 border-blue-200 text-blue-600";
    case "geo-extension-applied": return "bg-emerald-50 border-emerald-200 text-emerald-600";
    case "assignment":            return "bg-violet-50 border-violet-200 text-violet-600";
    case "finance-email":         return "bg-amber-50 border-amber-200 text-amber-600";
    case "bulk-digest":           return "bg-indigo-50 border-indigo-200 text-indigo-600";
    default:                      return "bg-muted border-border text-muted-foreground";
  }
}

function TypeIcon({ n }: { n: AppNotification }) {
  const cls = cn("w-8 h-8 rounded-full border flex items-center justify-center shrink-0", typeIconColor(n.type));
  switch (n.type) {
    case "lifecycle":             return <div className={cls}><Activity className="h-4 w-4" /></div>;
    case "geo-extension-applied": return <div className={cls}><MapPin className="h-4 w-4" /></div>;
    case "assignment":
      return <div className={cls}>{(n as AssignmentNotification).action === "assigned"
        ? <UserCheck className="h-4 w-4" />
        : <UserX className="h-4 w-4" />}
      </div>;
    case "finance-email":         return <div className={cls}><Mail className="h-4 w-4" /></div>;
    case "bulk-digest":           return <div className={cls}><Layers className="h-4 w-4" /></div>;
    default:                      return <div className={cls}><Bell className="h-4 w-4" /></div>;
  }
}

// ─── Summary line for each type ───────────────────────────────────────────────

function summaryLine(n: AppNotification): string {
  switch (n.type) {
    case "geo-extension-applied":
      return `${n.cbuDescription || n.cbuCode} — ${n.addedGeos.length} geo(s) added`;
    case "lifecycle":
      return `${n.eventLabel} · ${n.materialCode}`;
    case "assignment":
      return `${n.action === "assigned" ? "Assigned" : "Removed"}: ${n.cbuCode}`;
    case "finance-email":
      return `${n.cbuList.length} CBU${n.cbuList.length !== 1 ? "s" : ""} · ${n.success ? "Sent to finance@unilever.com" : "Delivery failed"}`;
    case "bulk-digest":
      return `${n.cbuCount} CBUs ${n.action === "assigned" ? "assigned to you" : "removed from you"} · ${n.bulkOperationId}`;
    default:
      return "";
  }
}

// ─── Search match ─────────────────────────────────────────────────────────────

function matchesSearch(n: AppNotification, q: string): boolean {
  if (!q.trim()) return true;
  const lq = q.toLowerCase();
  const haystack = [summaryLine(n), n.type].join(" ").toLowerCase();
  if (haystack.includes(lq)) return true;
  if (n.type === "geo-extension-applied") return n.cbuCode.toLowerCase().includes(lq) || n.srId.toLowerCase().includes(lq);
  if (n.type === "lifecycle") return n.networkId.toLowerCase().includes(lq) || n.materialCode.toLowerCase().includes(lq);
  if (n.type === "assignment") return n.cbuCode.toLowerCase().includes(lq);
  if (n.type === "finance-email") return n.srId.toLowerCase().includes(lq) || n.networkId.toLowerCase().includes(lq);
  if (n.type === "bulk-digest") return n.bulkOperationId.toLowerCase().includes(lq);
  return false;
}

// ─── Expanded detail panels ───────────────────────────────────────────────────

function ApproverRow({ approver, index }: { approver: ApproverStep; index: number }) {
  const isApproved = approver.status === "approved";
  const isRejected = approver.status === "rejected";
  const isPending  = approver.status === "pending";

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0" data-testid={`approver-row-${index}`}>
      <div className="mt-0.5 shrink-0">
        {isApproved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        {isRejected && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        {(isPending || approver.status === "waiting") && <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground truncate">{approver.assignedTo || approver.label}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
            isApproved ? "text-emerald-600" : isRejected ? "text-red-500" : "text-muted-foreground/60"
          }`} data-testid={`approver-status-${index}`}>
            {isApproved ? "Approved" : isRejected ? "Rejected" : isPending ? "Pending" : "Waiting"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{approver.label}</p>
        {isRejected && approver.rejectionReason && (
          <p className="mt-1 text-[10px] text-red-500 bg-red-50 rounded px-1.5 py-0.5">{approver.rejectionReason}</p>
        )}
        {approver.actedAt && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{approver.actedAt}</p>}
      </div>
    </div>
  );
}

function GeoExtDetail({ n }: { n: GeoExtensionNotification }) {
  return (
    <div className="grid grid-cols-[1fr_auto] divide-x divide-border/50 border-t border-border/50 bg-muted/20">
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Raised by: <span className="font-medium text-foreground">{n.raisedBy}</span></span>
        </div>
        {n.addedGeos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Added Geographies</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.addedGeos.map(g => (
                <Badge key={g} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-normal">{g}</Badge>
              ))}
            </div>
          </div>
        )}
        {n.addedDepots.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Warehouse className="h-3 w-3 text-slate-500" />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Added Depots</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {n.addedDepots.map(d => (
                <Badge key={d} variant="outline" className="text-[10px] font-mono">{d}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      {n.approvers.length > 0 && (
        <div className="px-5 py-4 w-64 shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Approval Chain</p>
          {n.approvers.map((a, i) => <ApproverRow key={i} approver={a} index={i} />)}
        </div>
      )}
    </div>
  );
}

function FinanceDetail({ n }: { n: FinanceEmailNotification }) {
  return (
    <div className="border-t border-border/50 bg-muted/20 space-y-3 px-5 py-4">
      {/* Status message */}
      <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
        n.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-700"
      }`}>
        {n.success
          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
          : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />}
        <span>{n.message}</span>
      </div>

      {/* CBU list */}
      {n.cbuList.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              CBUs in this notification ({n.cbuList.length})
            </span>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground whitespace-nowrap">CBU Code</th>
                  <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {n.cbuList.map((cbu: FinanceCbu, i: number) => (
                  <tr
                    key={cbu.code}
                    className={cn("border-b border-border/50 last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}
                    data-testid={`row-finance-cbu-${cbu.code}`}
                  >
                    <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap">{cbu.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">{cbu.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkDigestCbuTable({ cbuCount }: { cbuCount: number }) {
  const { data: entries = [], isLoading } = useQuery<NetworkEntry[]>({ queryKey: ["/api/network-entries"] });
  const cbusToShow = entries.slice(0, cbuCount);
  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading CBUs…</p>;
  if (!cbusToShow.length) return <p className="py-6 text-center text-sm text-muted-foreground">No CBU data available.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" data-testid="table-bulk-cbus">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {["CBU Code","Description","Brand","BG","Network Type","Status"].map(h => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cbusToShow.map(e => (
            <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-bulk-cbu-${e.id}`}>
              <td className="px-3 py-2 font-mono">{e.cbuCode ?? "—"}</td>
              <td className="px-3 py-2 max-w-[180px] truncate">{e.materialDescription ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{e.brand ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{e.bg ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{e.typeOfNetwork ?? "—"}</td>
              <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{e.networkStatus ?? "—"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Notification Row (compact + expandable) ──────────────────────────────────

function NotificationRow({
  n, showReadBtn,
}: {
  n: AppNotification;
  showReadBtn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const hasDetail =
    n.type === "geo-extension-applied" ||
    n.type === "finance-email" ||
    n.type === "bulk-digest";

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation();
    markRead(n.id);
  }

  return (
    <>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          !n.read ? "bg-card border-primary/20 shadow-sm" : "bg-muted/20 border-border",
        )}
        data-testid={`notification-row-${n.id}`}
      >
        {/* Main row */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            hasDetail && "cursor-pointer hover:bg-muted/30 transition-colors"
          )}
          onClick={() => hasDetail && setExpanded(v => !v)}
          data-testid={`button-expand-${n.id}`}
        >
          {/* Unread dot */}
          <div className="shrink-0">
            {!n.read
              ? <div className="w-2 h-2 rounded-full bg-primary" data-testid={`dot-unread-${n.id}`} />
              : <div className="w-2 h-2 rounded-full bg-transparent" />
            }
          </div>

          <TypeIcon n={n} />

          {/* Title + badge + summary — all on one line */}
          <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
            <span className="text-sm font-semibold whitespace-nowrap shrink-0" data-testid={`text-notification-title-${n.id}`}>
              {n.type === "geo-extension-applied" ? "Geo Extension Applied"
               : n.type === "lifecycle"           ? (n as LifecycleNotification).eventLabel
               : n.type === "assignment"          ? ((n as AssignmentNotification).action === "assigned" ? "Assigned to you" : "Removed from you")
               : n.type === "finance-email"       ? `Finance Email ${(n as FinanceEmailNotification).success ? "Confirmed" : "Failed"}`
               : n.type === "bulk-digest"         ? `Bulk: ${(n as BulkDigestNotification).cbuCount} CBUs ${(n as BulkDigestNotification).action === "assigned" ? "assigned" : "removed"}`
               : "Notification"}
            </span>
            <span className={cn("text-[10px] border rounded-full px-1.5 py-0.5 font-medium shrink-0", typeBadgeClass(n.type))}>
              {categoryLabel(n.type)}
            </span>
            <span className="text-muted-foreground text-xs shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate" data-testid={`text-summary-${n.id}`}>
              {summaryLine(n)}
            </span>
          </div>

          {/* Right: time + read btn + chevron — fixed width, always aligned */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap w-14 text-right" data-testid={`text-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
            {showReadBtn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1"
                onClick={handleMarkRead}
                data-testid={`button-mark-read-${n.id}`}
              >
                <CheckCheck className="h-3 w-3" />
                Read
              </Button>
            )}
            {hasDetail && (
              <span className="text-muted-foreground">
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <>
            {n.type === "geo-extension-applied" && <GeoExtDetail n={n as GeoExtensionNotification} />}
            {n.type === "finance-email" && <FinanceDetail n={n as FinanceEmailNotification} />}
            {n.type === "bulk-digest" && (
              <div className="border-t border-border/50 bg-muted/20 px-5 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setBulkOpen(true); }}
                  data-testid={`button-view-impacted-cbus-${n.id}`}
                >
                  <Layers className="h-3 w-3" />
                  View impacted CBUs
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {n.type === "bulk-digest" && (
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden" data-testid={`dialog-bulk-cbus-${n.id}`}>
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-indigo-600" />
                Bulk Operation: {(n as BulkDigestNotification).bulkOperationId}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {(n as BulkDigestNotification).cbuCount} CBUs {(n as BulkDigestNotification).action === "assigned" ? "assigned to you" : "removed from you"}
              </p>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh]">
              <BulkDigestCbuTable cbuCount={(n as BulkDigestNotification).cbuCount} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, hasFilters }: { tab: "inbox" | "read"; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {tab === "inbox"
        ? <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
        : <CheckCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />}
      <p className="text-sm font-medium text-muted-foreground">
        {hasFilters
          ? "No notifications match your filters"
          : tab === "inbox" ? "You're all caught up" : "No read notifications yet"}
      </p>
      {hasFilters && (
        <p className="text-xs text-muted-foreground/70 mt-1">Try clearing filters or switching categories</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications } = useNotificationStore();
  const [tab, setTab]               = useState<"inbox" | "read">("inbox");
  const [category, setCategory]     = useState<Category>("all");
  const [search, setSearch]         = useState("");

  const unread = notifications.filter(n => !n.read);
  const read   = notifications.filter(n =>  n.read);

  const base   = tab === "inbox" ? unread : read;

  const filtered = useMemo(() => {
    return base.filter(n => {
      if (category !== "all" && n.type !== category) return false;
      if (!matchesSearch(n, search)) return false;
      return true;
    });
  }, [base, category, search]);

  const hasFilters = category !== "all" || search.trim() !== "";

  // Category counts in the current tab's base
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = { all: base.length };
    for (const n of base) {
      counts[n.type as Category] = (counts[n.type as Category] ?? 0) + 1;
    }
    return counts;
  }, [base]);

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[860px] mx-auto px-6 py-8 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2 rounded-md">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight" data-testid="text-page-title">Notifications</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unread.length > 0
                  ? `${unread.length} unread notification${unread.length !== 1 ? "s" : ""}`
                  : "All caught up"}
              </p>
            </div>
          </div>
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={markAllRead}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border">
          {([["inbox", "Inbox", unread.length], ["read", "Read", read.length]] as const).map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setCategory("all"); setSearch(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tab-${id}`}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center h-4.5 min-w-[1.1rem] px-1 rounded-full text-[10px] font-bold",
                  tab === id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="space-y-3">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2" data-testid="category-filter-bar">
            {CATEGORIES.map(cat => {
              const cnt = categoryCounts[cat.id] ?? 0;
              const active = category === cat.id;
              if (cat.id !== "all" && cnt === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                  data-testid={`filter-category-${cat.id}`}
                >
                  {cat.id !== "all" && <cat.icon className="h-3 w-3" />}
                  {cat.label}
                  <span className={cn("ml-0.5", active ? "text-white/80" : "text-muted-foreground/70")}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by CBU, SR ID, material code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 rounded-md border bg-background pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              data-testid="input-notification-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {hasFilters && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {base.length} {tab === "inbox" ? "unread" : "read"} notifications
          </p>
        )}

        {/* Notification list */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0
            ? <EmptyState tab={tab} hasFilters={hasFilters} />
            : filtered.map(n => (
                <NotificationRow key={n.id} n={n} showReadBtn={tab === "inbox"} />
              ))
          }
        </div>
      </main>
    </div>
  );
}
