import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Lock } from "lucide-react";

type DemandForecastEntry = {
  id: string;
  basepack: string;
  depot: string;
  mocMonth: string;
  channelType: "MT" | "Non-MT";
  forecastChannel: string | null;
  qtyCases: number;
  qtyRpm: number;
  qtyUnits: number;
};

type Uom = "qtyCases" | "qtyRpm" | "qtyUnits";

const UOM_OPTIONS: { value: Uom; label: string }[] = [
  { value: "qtyCases", label: "Cases" },
  { value: "qtyRpm", label: "RPM" },
  { value: "qtyUnits", label: "Units" },
];

const CHANNEL_FILTERS = ["All", "MT", "Non-MT"] as const;

function formatQty(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function DemandVisibilityTab({ basepack, cbuCode, isDraft }: { basepack: string; cbuCode: string; isDraft: boolean }) {
  const [uom, setUom] = useState<Uom>("qtyCases");
  const [channelFilter, setChannelFilter] = useState<(typeof CHANNEL_FILTERS)[number]>("All");

  const { data: entries = [], isLoading } = useQuery<DemandForecastEntry[]>({
    queryKey: ["/api/demand-forecast", basepack],
    queryFn: () => basepack ? fetch(`/api/demand-forecast/${encodeURIComponent(basepack)}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!basepack && !isDraft,
  });

  const filtered = useMemo(
    () => channelFilter === "All" ? entries : entries.filter(e => e.channelType === channelFilter),
    [entries, channelFilter]
  );

  const { rows, mocMonths } = useMemo(() => {
    const mocSet = new Set<string>();
    const grouped = new Map<string, { depot: string; channelType: string; forecastChannel: string | null; byMoc: Map<string, number> }>();

    for (const e of filtered) {
      mocSet.add(e.mocMonth);
      const key = `${e.depot}__${e.channelType}__${e.forecastChannel ?? ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, { depot: e.depot, channelType: e.channelType, forecastChannel: e.forecastChannel, byMoc: new Map() });
      }
      grouped.get(key)!.byMoc.set(e.mocMonth, e[uom] ?? 0);
    }

    const months = Array.from(mocSet).sort();
    const rows = Array.from(grouped.values()).sort((a, b) =>
      a.depot === b.depot ? a.channelType.localeCompare(b.channelType) : a.depot.localeCompare(b.depot)
    );
    return { rows, mocMonths: months };
  }, [filtered, uom]);

  if (isDraft) {
    return (
      <Card>
        <CardContent className="px-6 py-12 flex flex-col items-center gap-2 text-muted-foreground">
          <Lock className="h-6 w-6 opacity-30" />
          <p className="text-sm font-medium">Demand Visibility unlocks after activation</p>
          <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
            Dynamic forecast data (CBU × Depot × MOC) becomes available once this CBU moves out of Draft status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-6 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <LineChart className="h-4 w-4 text-[#0d8ecf]" />
            Demand Visibility · Dynamic Forecast
            <span className="text-xs font-normal text-muted-foreground ml-1">· {cbuCode}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forecast at CBU × Depot × MOC (Month of Consumption) granularity, across MT and Non-MT channels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={channelFilter}
            onValueChange={(v) => v && setChannelFilter(v as (typeof CHANNEL_FILTERS)[number])}
            data-testid="toggle-demand-channel-filter"
          >
            {CHANNEL_FILTERS.map(c => (
              <ToggleGroupItem key={c} value={c} size="sm" className="text-xs px-3" data-testid={`toggle-channel-${c}`}>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={uom}
            onValueChange={(v) => v && setUom(v as Uom)}
            data-testid="toggle-demand-uom"
          >
            {UOM_OPTIONS.map(o => (
              <ToggleGroupItem key={o.value} value={o.value} size="sm" className="text-xs px-3" data-testid={`toggle-uom-${o.value}`}>
                {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-5">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 w-full rounded" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground border rounded-lg">
            <LineChart className="h-6 w-6 opacity-20" />
            <p className="text-sm">No demand forecast data available for this CBU yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm" data-testid="table-demand-visibility">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Depot</th>
                  <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Channel</th>
                  {mocMonths.map(m => (
                    <th key={m} className="px-3 py-2 font-medium text-xs text-muted-foreground text-right whitespace-nowrap">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30" data-testid={`row-demand-${r.depot}-${r.channelType}-${i}`}>
                    <td className="px-3 py-2 font-mono text-xs">{r.depot}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={r.channelType === "MT" ? "text-[#0d8ecf] font-medium" : "text-emerald-600 font-medium"}>
                        {r.channelType}
                      </span>
                      {r.forecastChannel && r.forecastChannel !== r.channelType && (
                        <span className="text-muted-foreground ml-1">({r.forecastChannel})</span>
                      )}
                    </td>
                    {mocMonths.map(m => (
                      <td key={m} className="px-3 py-2 text-right tabular-nums" data-testid={`cell-demand-${r.depot}-${m}`}>
                        {formatQty(r.byMoc.get(m) ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
