import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { useNotificationStore } from "@/lib/notification-store";

interface UnileverHeaderProps {
  module?: "network" | "paid-bible";
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const PAID_BIBLE_TABS = [
  { label: "Overview",         tab: "overview" },
  { label: "Network Updates",  tab: "network-updates" },
  { label: "Service Requests", tab: "service-requests" },
];

const NETWORK_NAV = [
  { label: "Dashboard",    path: "/network" },
  { label: "My Queue",     path: "/my-queue" },
  { label: "Reports",      path: "/reports" },
  { label: "Admin Center", path: "/admin" },
];

export function UnileverHeader({ module = "network", activeTab, onTabChange }: UnileverHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { unreadCount } = useNotificationStore();

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
            <Button
              size="icon" variant="ghost"
              className="text-white no-default-hover-elevate no-default-active-elevate relative"
              data-testid="button-notifications"
              onClick={() => navigate("/my-queue")}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 bg-orange-400 rounded-full text-[9px] font-bold text-white leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
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
