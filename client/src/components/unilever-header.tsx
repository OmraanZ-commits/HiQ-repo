import { Search, Bell, User, Activity, UserCheck, UserX, Mail, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { useLocation } from "wouter";
import { useNotificationStore, markAllRead } from "@/lib/notification-store";
import type { AppNotification } from "@/lib/notification-store";

interface UnileverHeaderProps {
  module?: "network" | "paid-bible";
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const PAID_BIBLE_TABS = [
  { label: "Overview",         tab: "overview" },
  { label: "Network Updates",  tab: "network-updates" },
  { label: "Service Requests", tab: "service-requests" },
  { label: "Summary",          tab: "summary" },
];

const NETWORK_NAV = [
  { label: "Dashboard",    path: "/network" },
  { label: "My Queue",     path: "/my-queue" },
  { label: "Reports",      path: "/reports" },
  { label: "Admin Center", path: "/admin" },
];

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function NotificationRow({ n }: { n: AppNotification }) {
  let icon = <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
  let summary = "";
  let iconBg = "bg-slate-100 border-slate-200";

  if (n.type === "geo-extension-applied") {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    iconBg = "bg-emerald-50 border-emerald-200";
    summary = `Geo Extension Applied — ${n.cbuCode}`;
  } else if (n.type === "lifecycle") {
    icon = <Activity className="h-3.5 w-3.5 text-blue-600" />;
    iconBg = "bg-blue-50 border-blue-200";
    summary = `${n.eventLabel} — ${n.networkId} / ${n.materialCode}`;
  } else if (n.type === "assignment") {
    const isAssigned = n.action === "assigned";
    icon = isAssigned
      ? <UserCheck className="h-3.5 w-3.5 text-violet-600" />
      : <UserX className="h-3.5 w-3.5 text-orange-500" />;
    iconBg = isAssigned ? "bg-violet-50 border-violet-200" : "bg-orange-50 border-orange-200";
    summary = isAssigned
      ? `Assigned to you — ${n.cbuCode}`
      : `Removed from you — ${n.cbuCode}`;
  } else if (n.type === "finance-email") {
    icon = <Mail className={`h-3.5 w-3.5 ${n.success ? "text-emerald-600" : "text-red-500"}`} />;
    iconBg = n.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200";
    summary = n.success
      ? `Finance email confirmed — ${n.networkId}`
      : `Finance email failed — ${n.networkId}`;
  } else if (n.type === "bulk-digest") {
    icon = <Layers className="h-3.5 w-3.5 text-indigo-600" />;
    iconBg = "bg-indigo-50 border-indigo-200";
    summary = `${n.cbuCount} CBUs ${n.action} to you (bulk)`;
  }

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
      data-testid={`popover-notification-row-${n.id}`}
    >
      <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug truncate">{summary}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(n.timestamp)}</p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
      )}
    </div>
  );
}

export function UnileverHeader({ module = "network", activeTab, onTabChange }: UnileverHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { unreadCount, notifications } = useNotificationStore();
  const hasNotifications = notifications.length > 0;
  const top5 = notifications.slice(0, 5);

  function handleViewAll() {
    setPopoverOpen(false);
    markAllRead();
    navigate("/notifications");
  }

  function handleOpenChange(open: boolean) {
    setPopoverOpen(open);
  }

  return (
    <header className="sticky top-0 z-50" data-testid="header">
      {/* Main gradient bar */}
      <div className="bg-gradient-to-r from-[#1f36c7] via-[#0d8ecf] to-[#00b0d7] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <h1
              className="text-2xl font-bold italic tracking-wide cursor-pointer"
              style={{ fontFamily: "'Playfair Display', serif" }}
              onClick={() => navigate("/")}
              data-testid="text-logo"
            >
              Unilever
            </h1>

            <nav className="hidden lg:flex items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-inner shadow-black/10">
                {module === "paid-bible"
                  ? PAID_BIBLE_TABS.map(item => (
                      <NavItem
                        key={item.tab}
                        label={item.label}
                        active={activeTab === item.tab}
                        onClick={() => onTabChange?.(item.tab)}
                        testId={`nav-pb-${item.tab}`}
                      />
                    ))
                  : NETWORK_NAV.map(item => (
                      <NavItem
                        key={item.label}
                        label={item.label}
                        active={location === item.path}
                        onClick={() => navigate(item.path)}
                        testId={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                      />
                    ))
                }
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {searchOpen ? (
              <Input
                type="search"
                placeholder="Search entries..."
                className="h-8 w-48 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm"
                data-testid="input-search"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            ) : (
              <Button
                size="icon" variant="ghost"
                className="text-white no-default-hover-elevate no-default-active-elevate"
                onClick={() => setSearchOpen(true)}
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}

            <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  size="icon" variant="ghost"
                  className="text-white no-default-hover-elevate no-default-active-elevate relative"
                  data-testid="button-notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 bg-orange-400 rounded-full text-[9px] font-bold text-white leading-none" data-testid="badge-unread-count">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : hasNotifications ? (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-white/40 rounded-full" data-testid="badge-all-read" />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 p-0 shadow-xl"
                data-testid="popover-notifications"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold" data-testid="text-popover-title">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
                  )}
                </div>

                {top5.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground" data-testid="popover-empty-state">
                    No notifications yet
                  </div>
                ) : (
                  <div className="divide-y divide-border/50" data-testid="popover-notification-list">
                    {top5.map(n => (
                      <NotificationRow key={n.id} n={n} />
                    ))}
                  </div>
                )}

                <div className="border-t border-border px-3 py-2">
                  <button
                    onClick={handleViewAll}
                    className="w-full text-xs text-center text-primary hover:underline font-medium py-0.5"
                    data-testid="link-view-all-notifications"
                  >
                    View all notifications
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              size="icon" variant="ghost"
              className="text-white no-default-hover-elevate no-default-active-elevate"
              data-testid="button-user-menu"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb sub-bar */}
      <div className="bg-gradient-to-r from-[#1f36c7]/5 via-[#0d8ecf]/5 to-[#00b0d7]/5 border-b border-border">
        <div className="px-6 py-2 flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="text-breadcrumb"
          >
            Central Portal
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-medium" data-testid="text-breadcrumb-current">
            {module === "paid-bible" ? "Paid Bible" : "Network Visibility"}
          </span>
          {module === "paid-bible" && activeTab && (
            <>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs text-muted-foreground">
                {PAID_BIBLE_TABS.find(t => t.tab === activeTab)?.label}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({
  label, active = false, onClick, testId,
}: {
  label: string; active?: boolean; onClick?: () => void; testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
        active
          ? "bg-white text-[#0d8ecf] shadow-sm"
          : "text-white hover:text-white hover:bg-white/15"
      }`}
      data-testid={testId}
    >
      {label}
    </button>
  );
}
