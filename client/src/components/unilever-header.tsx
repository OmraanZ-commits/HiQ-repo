import { Search, Bell, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";

export function UnileverHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, navigate] = useLocation();

  const navItems: { label: string; path: string }[] = [
    { label: "Dashboard", path: "/" },
    { label: "My Queue", path: "/my-queue" },
    { label: "Reports", path: "/reports" },
    { label: "Admin Center", path: "/admin" },
  ];

  return (
    <header className="sticky top-0 z-50" data-testid="header">
      <div className="bg-gradient-to-r from-[#1f36c7] via-[#0d8ecf] to-[#00b0d7] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <h1
              className="text-2xl font-bold italic tracking-wide"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="text-logo"
            >
              Unilever
            </h1>
            <nav className="hidden lg:flex items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-inner shadow-black/10">
                {navItems.map((item) => (
                  <NavItem
                    key={item.path}
                    label={item.label}
                    active={location === item.path}
                    onClick={() => navigate(item.path)}
                  />
                ))}
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search entries..."
                  className="h-8 w-48 bg-white/20 border-white/30 text-white placeholder:text-white/60 text-sm"
                  data-testid="input-search"
                  autoFocus
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="text-white no-default-hover-elevate no-default-active-elevate"
                onClick={() => setSearchOpen(true)}
                data-testid="button-search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-white no-default-hover-elevate no-default-active-elevate relative"
              data-testid="button-notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-orange-400 rounded-full" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white no-default-hover-elevate no-default-active-elevate"
              data-testid="button-user-menu"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-r from-[#1f36c7]/5 via-[#0d8ecf]/5 to-[#00b0d7]/5 border-b border-border">
        <div className="px-6 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground" data-testid="text-breadcrumb">
            Central Portal
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-medium" data-testid="text-breadcrumb-current">
            Network Visibility
          </span>
        </div>
      </div>
    </header>
  );
}

function NavItem({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
        active
          ? "bg-white text-[#0d8ecf] shadow-sm"
          : "text-white hover:text-white hover:bg-white/15"
      }`}
      data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      {label}
    </button>
  );
}
