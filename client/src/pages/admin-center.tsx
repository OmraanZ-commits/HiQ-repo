import { useState } from "react";
import { UnileverHeader } from "@/components/unilever-header";
import { ReferenceDataContent } from "@/pages/reference-data";
import { UserManagementContent } from "@/pages/user-management";
import { cn } from "@/lib/utils";
import {
  Database,
  Settings,
  Users,
  Shield,
  ChevronRight,
} from "lucide-react";

/* ── Sidebar tab definitions ──────────────────────────────────── */
const adminTabs = [
  {
    id: "reference-data",
    label: "Reference Data",
    icon: Database,
    description: "Channels, Clusters & Depots",
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    description: "Roles & permissions",
  },
  {
    id: "system-settings",
    label: "System Settings",
    icon: Settings,
    description: "App configuration",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Audit & access logs",
  },
] as const;

type TabId = (typeof adminTabs)[number]["id"];

/* ── Page ─────────────────────────────────────────────────────── */
export default function AdminCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>("reference-data");

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
        {/* Page heading */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#1f36c7] to-[#00b0d7] p-2.5 rounded-md">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Center</h1>
            <p className="text-sm text-muted-foreground">
              Manage reference data, users, and system configuration
            </p>
          </div>
        </div>

        {/* Two-column layout: vertical sidebar + content */}
        <div className="flex gap-6 min-h-[600px]">
          {/* Vertical tab sidebar */}
          <nav className="w-64 shrink-0 rounded-lg border bg-card">
            <ul className="p-2 space-y-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight truncate">{tab.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight truncate">
                          {tab.description}
                        </p>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {activeTab === "reference-data" && <ReferenceDataContent />}
            {activeTab === "user-management" && <UserManagementContent />}
            {activeTab === "system-settings" && <PlaceholderPanel title="System Settings" description="Application configuration options coming soon." />}
            {activeTab === "security" && <PlaceholderPanel title="Security" description="Audit logs and access control coming soon." />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Placeholder for future tabs ──────────────────────────────── */
function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-80 rounded-lg border border-dashed bg-muted/30">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
