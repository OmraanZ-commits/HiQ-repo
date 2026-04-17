import { useEffect } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, MapPin, Warehouse } from "lucide-react";
import { useNotificationStore, markAllRead } from "@/lib/notification-store";
import type { GeoExtensionNotification } from "@/lib/notification-store";

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

function GeoExtensionCard({ n }: { n: GeoExtensionNotification }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 flex gap-4 shadow-sm"
      data-testid={`notification-card-${n.id}`}
    >
      <div className="mt-0.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1.5">
          <div>
            <span className="text-sm font-semibold text-foreground" data-testid={`text-notification-title-${n.id}`}>
              Geo Extension Applied
            </span>
            <span className="ml-2 text-xs text-muted-foreground" data-testid={`text-notification-time-${n.id}`}>
              {relativeTime(n.timestamp)}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0" data-testid={`badge-cbu-code-${n.id}`}>
            {n.cbuCode}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3 truncate" data-testid={`text-cbu-description-${n.id}`}>
          {n.cbuDescription}
        </p>
        {n.addedGeos.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
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
            <div className="flex items-center gap-1.5 mb-1">
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
    </div>
  );
}

export default function MyQueuePage() {
  const { notifications } = useNotificationStore();

  useEffect(() => {
    markAllRead();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />
      <main className="max-w-[760px] mx-auto px-6 py-8">
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
          <div className="flex flex-col gap-3" data-testid="list-notifications">
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
