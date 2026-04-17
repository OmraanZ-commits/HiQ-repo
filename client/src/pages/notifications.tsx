import { useEffect } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, MapPin, Warehouse, User, XCircle, Clock, Hash } from "lucide-react";
import { useNotificationStore, markAllRead } from "@/lib/notification-store";
import type { GeoExtensionNotification } from "@/lib/notification-store";
import type { ApproverStep } from "@/lib/sr-store";

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

function GeoExtensionCard({ n }: { n: GeoExtensionNotification }) {
  return (
    <div
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`notification-card-${n.id}`}
    >
      {/* ── Header ── */}
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
          <Badge
            variant="outline"
            className="text-[10px] font-mono gap-1"
            data-testid={`badge-sr-id-${n.id}`}
          >
            <Hash className="h-2.5 w-2.5" />
            {n.srId}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] font-mono"
            data-testid={`badge-cbu-code-${n.id}`}
          >
            {n.cbuCode}
          </Badge>
        </div>
      </div>

      {/* ── Body: two columns ── */}
      <div className="grid grid-cols-[1fr_auto] divide-x divide-border/50">

        {/* Left — geo / depot + raised-by */}
        <div className="px-5 py-4 space-y-4">
          {/* Raised by */}
          <div className="flex items-center gap-2" data-testid={`text-raised-by-${n.id}`}>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Raised by: <span className="font-medium text-foreground">{n.raisedBy}</span>
            </span>
          </div>

          {/* Added Geographies */}
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

          {/* Added Depots */}
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

        {/* Right — approval chain */}
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

export default function NotificationsPage() {
  const { notifications } = useNotificationStore();

  useEffect(() => {
    markAllRead();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />
      <main className="max-w-[900px] mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Notifications</h1>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-notification-count">
              {notifications.length}
            </Badge>
          )}
        </div>

        {notifications.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3"
            data-testid="empty-state-notifications"
          >
            <Bell className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-center max-w-[280px]">
              Approval confirmations for geo and depot extensions will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="list-notifications">
            {notifications.map(n =>
              n.type === "geo-extension-applied" ? (
                <GeoExtensionCard key={n.id} n={n} />
              ) : null
            )}
          </div>
        )}
      </main>
    </div>
  );
}
