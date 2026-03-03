import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { NetworkEntry } from "@shared/schema";

interface StatsCardsProps {
  entries: NetworkEntry[];
}

export function StatsCards({ entries }: StatsCardsProps) {
  const total = entries.length;
  const active = entries.filter(e => e.networkStatus === "Active").length;
  const draft = entries.filter(e => e.networkStatus === "Draft").length;
  const productionStarted = entries.filter(e => e.networkStatus === "Production Started").length;

  const stats = [
    {
      label: "Total Entries",
      value: total,
      icon: FileText,
      color: "text-[#0d8ecf]",
      bg: "bg-[#0d8ecf]/10",
    },
    {
      label: "Active",
      value: active,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Draft",
      value: draft,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Production Started",
      value: productionStarted,
      icon: AlertTriangle,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cards">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bg} p-3 rounded-md`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
