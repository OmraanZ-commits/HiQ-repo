import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, Zap } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    productionStarted: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Entries",
      value: stats.total,
      icon: FileText,
      gradient: "from-[#1f36c7] to-[#0d8ecf]",
      textColor: "text-white",
    },
    {
      label: "Active",
      value: stats.active,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      textColor: "text-white",
    },
    {
      label: "Draft",
      value: stats.draft,
      icon: Clock,
      gradient: "from-amber-400 to-orange-500",
      textColor: "text-white",
    },
    {
      label: "Production Started",
      value: stats.productionStarted,
      icon: Zap,
      gradient: "from-violet-500 to-purple-600",
      textColor: "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cards">
      {cards.map((card) => (
        <Card key={card.label} className={`bg-gradient-to-br ${card.gradient} border-0 hover-elevate`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={`text-sm ${card.textColor} opacity-85`}>{card.label}</p>
                <p className={`text-3xl font-bold mt-1 ${card.textColor}`} data-testid={`stat-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {card.value}
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-md">
                <card.icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
