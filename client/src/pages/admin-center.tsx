import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnileverHeader } from "@/components/unilever-header";
import { ReferenceDataContent } from "@/pages/reference-data";
import { UserManagementContent } from "@/pages/user-management";
import { IntegrationMonitoringContent } from "@/pages/integration-monitoring";
import { CcrRulesetContent } from "@/pages/ccr-ruleset";
import { cn } from "@/lib/utils";
import {
  Database,
  Settings,
  Users,
  Shield,
  Activity,
  ChevronRight,
  Grid3X3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PortalUser {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

const adminTabs = [
  {
    id: "reference-data",
    label: "Reference Data",
    icon: Database,
    description: "Channels, Clusters & Depots",
  },
  {
    id: "ccr-ruleset",
    label: "CCR Ruleset",
    icon: Grid3X3,
    description: "Per-account CCR rules matrix",
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    description: "Roles & permissions",
  },
  {
    id: "integration-monitoring",
    label: "Integration Monitoring",
    icon: Activity,
    description: "Ingestion health & run logs",
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

export default function AdminCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>("reference-data");

  const { data: allUsers = [] } = useQuery<PortalUser[]>({ queryKey: ["/api/users"] });
  const [actingUserId, setActingUserId] = useState<string>("");

  useEffect(() => {
    if (!actingUserId && allUsers.length) {
      const firstAdmin = allUsers.find((u) => u.isActive && u.role === "Admin");
      if (firstAdmin) setActingUserId(firstAdmin.id);
    }
  }, [allUsers, actingUserId]);

  const actingUser = allUsers.find((u) => u.id === actingUserId) ?? null;
  const isAdmin = actingUser?.role === "Admin";

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader />

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">
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

        <div className="flex gap-6 min-h-[600px]">
          <nav className="w-64 shrink-0 rounded-lg border bg-card">
            <ul className="p-2 space-y-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      data-testid={`sidebar-tab-${tab.id}`}
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

          <div className="flex-1 min-w-0">
            {activeTab === "reference-data" && <ReferenceDataContent />}
            {activeTab === "ccr-ruleset" && (
              <div className="rounded-lg border bg-card p-6 space-y-5">
                {/* Acting-as user selector (same pattern as Reference Data) */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Acting as:</span>
                  <Select value={actingUserId} onValueChange={setActingUserId}>
                    <SelectTrigger className="w-56 h-8 text-sm" data-testid="select-acting-user-ccr">
                      <SelectValue placeholder="Select user…" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.filter((u) => u.isActive).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {actingUser && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${isAdmin ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                      {isAdmin ? "Admin — editing enabled" : "Read-only"}
                    </span>
                  )}
                </div>
                <CcrRulesetContent isAdmin={isAdmin} actingUserId={actingUserId} />
              </div>
            )}
            {activeTab === "user-management" && <UserManagementContent />}
            {activeTab === "integration-monitoring" && <IntegrationMonitoringContent />}
            {activeTab === "system-settings" && <PlaceholderPanel title="System Settings" description="Application configuration options coming soon." />}
            {activeTab === "security" && <PlaceholderPanel title="Security" description="Audit logs and access control coming soon." />}
          </div>
        </div>
      </main>
    </div>
  );
}

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
