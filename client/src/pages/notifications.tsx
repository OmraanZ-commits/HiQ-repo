import { useEffect, useState } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell, CheckCircle2, MapPin, Warehouse, User, XCircle, Clock, Hash,
  Activity, UserCheck, UserX, Mail, Layers, AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNotificationStore, markAllRead } from "@/lib/notification-store";
import type {
  GeoExtensionNotification,
  LifecycleNotification,
  AssignmentNotification,
  FinanceEmailNotification,
  BulkDigestNotification,
  AppNotification,
} from "@/lib/notification-store";
import type { ApproverStep } from "@/lib/sr-store";
import type { NetworkEntry } from "@shared/schema";

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

function ApproverRow({ approver, index }: { approver: ApproverStep; index: number }) {
  const isApproved = approver.status === "approved";
  const isRejected = approver.status === "rejected";
  const isPending  = approver.status === "pending";
  const isWaiting  = approver.status === "waiting";

  return (
    <div
      className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0"
      data-testid={`approver-row-${index}`}
    >
      <div className="mt-0.5 shrink-0">
        {isApproved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        {isRejected && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        {(isPending || isWaiting) && <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground truncate">
            {approver.assignedTo || approver.label}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
              isApproved ? "text-emerald-600"
              : isRejected ? "text-red-500"
              : "text-muted-foreground/60"
            }`}
            data-testid={`approver-status-${index}`}
          >
            {isApproved ? "Approved" : isRejected ? "Rejected" : isPending ? "Pending" : "Waiting"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{approver.label}</p>
        {isRejected && approver.rejectionReason && (
          <p
            className="mt-1 text-[10px] text-red-500 bg-red-50 rounded px-1.5 py-0.5"
            data-testid={`rejection-reason-${index}`}
          >
            {approver.rejectionReason}
          </p>
        )}
        {approver.actedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{approver.actedAt}</p>
        )}
      </div>
    </div>
  );
}

// ─── Geo Extension Card ───────────────────────────────────────────────────────

function GeoExtensionCard({ n }: { n: GeoExtensionNotification }) {
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`notification-card-${n.id}`}
    >
      <div className="px-5 pt-4 pb-3 flex items-start gap-3 border-b border-border/50">
        <div className="mt-0.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-0.5">
            <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
              Geo Extension Applied
            </span>
            <span className="text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate" data-testid={`text-cbu-description-${n.id}`}>
            {n.cbuDescription}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2 flex-wrap justify-end">
          <Badge variant="outline" className="text-[10px] font-mono gap-1" data-testid={`badge-sr-id-${n.id}`}>
            <Hash className="h-2.5 w-2.5" />
            {n.srId}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-cbu-code-${n.id}`}>
            {n.cbuCode}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] divide-x divide-border/50">
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-2" data-testid={`text-raised-by-${n.id}`}>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Raised by: <span className="font-medium text-foreground">{n.raisedBy}</span>
            </span>
          </div>
          {n.addedGeos.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3 w-3 text-emerald-600" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                  Added Geographies
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {n.addedGeos.map(g => (
                  <Badge
                    key={g}
                    className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] font-normal"
                    data-testid={`badge-geo-${n.id}-${g.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {n.addedDepots.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Warehouse className="h-3 w-3 text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Added Depots
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {n.addedDepots.map(d => (
                  <Badge
                    key={d}
                    variant="outline"
                    className="text-[10px] font-mono"
                    data-testid={`badge-depot-${n.id}-${d.toLowerCase()}`}
                  >
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        {n.approvers.length > 0 && (
          <div className="px-5 py-4 w-64 shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Approval Chain
            </p>
            <div>
              {n.approvers.map((a, i) => (
                <ApproverRow key={i} approver={a} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Lifecycle Card ───────────────────────────────────────────────────────────

function LifecycleCard({ n }: { n: LifecycleNotification }) {
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`notification-card-${n.id}`}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
            <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
              {n.eventLabel}
            </span>
            <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-[10px]">
              Lifecycle
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-mono gap-1" data-testid={`badge-network-id-${n.id}`}>
              <Hash className="h-2.5 w-2.5" />
              {n.networkId}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-material-code-${n.id}`}>
              {n.materialCode}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

function AssignmentCard({ n }: { n: AssignmentNotification }) {
  const isAssigned = n.action === "assigned";
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`notification-card-${n.id}`}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            isAssigned ? "bg-violet-50 border-violet-200" : "bg-orange-50 border-orange-200"
          }`}>
            {isAssigned
              ? <UserCheck className="h-4 w-4 text-violet-600" />
              : <UserX className="h-4 w-4 text-orange-500" />
            }
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
            <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
              {isAssigned ? "Assigned to you" : "Removed from you"}
            </span>
            <Badge className={`text-[10px] border ${
              isAssigned
                ? "bg-violet-100 text-violet-700 border-violet-300"
                : "bg-orange-100 text-orange-700 border-orange-300"
            }`}>
              Assignment
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-cbu-id-${n.id}`}>
              {n.cbuCode}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Finance Email Card ───────────────────────────────────────────────────────

function FinanceEmailCard({ n }: { n: FinanceEmailNotification }) {
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`notification-card-${n.id}`}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            n.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
          }`}>
            <Mail className={`h-4 w-4 ${n.success ? "text-emerald-600" : "text-red-500"}`} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
            <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
              Finance Email {n.success ? "Confirmed" : "Failed"}
            </span>
            <Badge className={`text-[10px] border ${
              n.success
                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                : "bg-red-100 text-red-700 border-red-300"
            }`}>
              Finance
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
            <Badge variant="outline" className="text-[10px] font-mono gap-1" data-testid={`badge-network-id-${n.id}`}>
              <Hash className="h-2.5 w-2.5" />
              {n.networkId}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-sr-id-${n.id}`}>
              {n.srId}
            </Badge>
          </div>
          <div
            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
              n.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
            data-testid={`finance-status-message-${n.id}`}
          >
            {n.success
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
              : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
            }
            <span>{n.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Digest Card ─────────────────────────────────────────────────────────

function BulkDigestCbuTable({ cbuCount }: { cbuCount: number }) {
  const { data: entries = [], isLoading } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const cbusToShow = entries.slice(0, cbuCount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        Loading CBUs…
      </div>
    );
  }

  if (cbusToShow.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        No CBU data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" data-testid="table-bulk-cbus">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">CBU Code</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Material Description</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Brand</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">BG</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Type of Network</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">CBU Created Date</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {cbusToShow.map((entry, i) => (
            <tr
              key={entry.id}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              data-testid={`row-bulk-cbu-${entry.id}`}
            >
              <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap" data-testid={`text-cbu-code-${entry.id}`}>
                {entry.cbuCode ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground max-w-[200px] truncate" data-testid={`text-material-desc-${entry.id}`}>
                {entry.materialDescription ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap" data-testid={`text-brand-${entry.id}`}>
                {entry.brand ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap" data-testid={`text-bg-${entry.id}`}>
                {entry.bg ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap" data-testid={`text-network-type-${entry.id}`}>
                {entry.typeOfNetwork ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground whitespace-nowrap" data-testid={`text-cbu-created-date-${entry.id}`}>
                {entry.cbuCreatedDate ?? "—"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap" data-testid={`text-status-${entry.id}`}>
                <Badge variant="outline" className="text-[10px]">
                  {entry.networkStatus ?? "—"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkDigestCard({ n }: { n: BulkDigestNotification }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
        data-testid={`notification-card-${n.id}`}
      >
        <div className="px-5 py-4 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <Layers className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
              <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
                {n.cbuCount} CBUs {n.action === "assigned" ? "assigned to you" : "removed from you"}
              </span>
              <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-300 text-[10px]">
                Bulk Digest
              </Badge>
              <span className="text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
                {relativeTime(n.timestamp)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-3">
              <Badge variant="outline" className="text-[10px] font-mono" data-testid={`badge-bulk-op-id-${n.id}`}>
                {n.bulkOperationId}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setOpen(true)}
              data-testid={`button-view-impacted-cbus-${n.id}`}
            >
              <Layers className="h-3 w-3 mr-1.5" />
              View impacted CBUs
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-4xl w-full p-0 gap-0 overflow-hidden"
          data-testid={`dialog-bulk-cbus-${n.id}`}
        >
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base" data-testid={`dialog-title-${n.id}`}>
              <Layers className="h-4 w-4 text-indigo-600" />
              Bulk Operation: {n.bulkOperationId}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {n.cbuCount} CBUs {n.action === "assigned" ? "assigned to you" : "removed from you"}
            </p>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <BulkDigestCbuTable cbuCount={n.cbuCount} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  title,
  icon,
  children,
  count,
  testId,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count: number;
  testId: string;
}) {
  if (count === 0) return null;
  return (
    <section data-testid={testId}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      </div>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { notifications } = useNotificationStore();

  useEffect(() => {
    markAllRead();
  }, []);

  const lifecycle   = notifications.filter((n): n is LifecycleNotification    => n.type === "lifecycle");
  const assignment  = notifications.filter((n): n is AssignmentNotification   => n.type === "assignment");
  const finance     = notifications.filter((n): n is FinanceEmailNotification  => n.type === "finance-email");
  const bulkDigest  = notifications.filter((n): n is BulkDigestNotification   => n.type === "bulk-digest");
  const geoExt      = notifications.filter((n): n is GeoExtensionNotification => n.type === "geo-extension-applied");

  const hasAny = notifications.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />
      <main className="max-w-[900px] mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Notifications</h1>
          {hasAny && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-notification-count">
              {notifications.length}
            </Badge>
          )}
        </div>

        {!hasAny ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3"
            data-testid="empty-state-notifications"
          >
            <Bell className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-center max-w-[280px]">
              Lifecycle, assignment, finance, and geo extension alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8" data-testid="list-notifications">

            <CategorySection
              title="Lifecycle"
              icon={<Activity className="h-4 w-4 text-blue-600" />}
              count={lifecycle.length}
              testId="section-lifecycle"
            >
              {lifecycle.map(n => <LifecycleCard key={n.id} n={n} />)}
            </CategorySection>

            <CategorySection
              title="Assignment"
              icon={<UserCheck className="h-4 w-4 text-violet-600" />}
              count={assignment.length}
              testId="section-assignment"
            >
              {assignment.map(n => <AssignmentCard key={n.id} n={n} />)}
            </CategorySection>

            <CategorySection
              title="Finance"
              icon={<Mail className="h-4 w-4 text-emerald-600" />}
              count={finance.length}
              testId="section-finance"
            >
              {finance.map(n => <FinanceEmailCard key={n.id} n={n} />)}
            </CategorySection>

            <CategorySection
              title="Bulk Digest"
              icon={<Layers className="h-4 w-4 text-indigo-600" />}
              count={bulkDigest.length}
              testId="section-bulk-digest"
            >
              {bulkDigest.map(n => <BulkDigestCard key={n.id} n={n} />)}
            </CategorySection>

            <CategorySection
              title="Geo Extensions"
              icon={<MapPin className="h-4 w-4 text-emerald-600" />}
              count={geoExt.length}
              testId="section-geo-extensions"
            >
              {geoExt.map(n => <GeoExtensionCard key={n.id} n={n} />)}
            </CategorySection>

          </div>
        )}
      </main>
    </div>
  );
}
