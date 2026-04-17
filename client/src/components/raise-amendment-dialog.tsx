import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Map as MapIcon, Radio, PackageSearch, AlertTriangle,
  ChevronRight, ChevronLeft, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/users-data";
import type { ChannelDef } from "@/lib/distribution-data";
import {
  SR_TYPE_META, addRequest,
  type SrType, type ServiceRequest, type ApproverStep,
  formatNow,
} from "@/lib/sr-store";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "type" | "edit" | "summary";
const STEPS: Step[] = ["type", "edit", "summary"];

interface ClusterInfo { name: string; region: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const AMENDMENT_TYPES = [
  {
    value: "geo-extension" as SrType,
    icon: MapIcon,
    label: "Geo Extension",
    desc: "Extend distribution to additional geographies or clusters",
  },
  {
    value: "channel-extension" as SrType,
    icon: Radio,
    label: "Channel Extension",
    desc: "Extend distribution to additional trade channels (GT, MT, Ecom, KA…)",
  },
  {
    value: "sourcing-amendment" as SrType,
    icon: PackageSearch,
    label: "Sourcing Amendment",
    desc: "Change the sourcing mode or centralized geography / depot scope",
  },
];

const REGION_ORDER = ["North", "South", "East", "West"];

const CHANNEL_GROUPS: { label: string; match: (c: ChannelDef) => boolean }[] = [
  { label: "Core & Traditional", match: c => c.type === "Core" || c.type === "Traditional" },
  { label: "Modern Trade",       match: c => c.type === "Modern Trade" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `SR-${Math.floor(100000 + Math.random() * 900000)}`;
}

function buildApprovers(
  users: PortalUser[],
  assignedPerson: string | null | undefined,
): ApproverStep[] {
  const byRole = (role: string) => users.find(u => u.role === role && u.isActive)?.name ?? "Unassigned";
  const npName = users.find(u => u.name === assignedPerson && u.isActive)?.name
              ?? users.find(u => u.role === "Network Planner" && u.isActive)?.name
              ?? assignedPerson
              ?? "Unassigned";
  return [
    { role: "network-planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: npName,                      status: "pending"  },
    { role: "supply-planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: byRole("Supply Planner"),    status: "waiting"  },
    { role: "distribution-planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: byRole("Distribution Planner"), status: "waiting" },
    { role: "ncsm",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: byRole("NCSM"),              status: "waiting"  },
  ];
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

type ChipState = "existing" | "new" | "available";

function Chip({ label, state, onClick }: {
  label: string;
  state: ChipState;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "existing"}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all select-none",
        state === "existing"  && "bg-blue-500 text-white border-blue-500 cursor-default",
        state === "new"       && "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 cursor-pointer",
        state === "available" && "bg-white text-foreground border-border hover:border-blue-300 hover:bg-blue-50 cursor-pointer",
      )}
    >
      {label}
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function SelectionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground py-2 border-b">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0" />
        Current selection
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
        New addition (click to toggle)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full border border-border bg-white inline-block shrink-0" />
        Available
      </span>
    </div>
  );
}

// ─── Geo Editor ───────────────────────────────────────────────────────────────

function GeoEditor({
  clusters, currentGeo, addedGeos, setAddedGeos,
  geographyDepotMap, addedDepots, setAddedDepots,
}: {
  clusters: ClusterInfo[];
  currentGeo: string[];
  addedGeos: string[];
  setAddedGeos: (v: string[]) => void;
  geographyDepotMap: Record<string, string[]>;
  addedDepots: string[];
  setAddedDepots: (v: string[]) => void;
}) {
  const sorted = useMemo(
    () => [...clusters].sort((a, b) => a.name.localeCompare(b.name)),
    [clusters],
  );

  const toggleGeo = (name: string) => {
    if (currentGeo.includes(name)) return;
    const isAdding = !addedGeos.includes(name);
    setAddedGeos(isAdding ? [...addedGeos, name] : addedGeos.filter(g => g !== name));
    if (!isAdding) {
      const geoDepots = geographyDepotMap[name] || [];
      setAddedDepots(addedDepots.filter(d => !geoDepots.includes(d)));
    }
  };

  const toggleDepot = (depot: string) =>
    setAddedDepots(
      addedDepots.includes(depot)
        ? addedDepots.filter(d => d !== depot)
        : [...addedDepots, depot],
    );

  const toggleAllGeoDepots = (geo: string) => {
    const geoDepots = geographyDepotMap[geo] || [];
    const allSelected = geoDepots.every(d => addedDepots.includes(d));
    if (allSelected) {
      setAddedDepots(addedDepots.filter(d => !geoDepots.includes(d)));
    } else {
      const newDepots = [...addedDepots];
      geoDepots.forEach(d => { if (!newDepots.includes(d)) newDepots.push(d); });
      setAddedDepots(newDepots);
    }
  };

  const newGeoCount = addedGeos.length;
  const newDepotCount = addedDepots.length;

  return (
    <div className="space-y-3">
      {/* Header counters */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/80 inline-block" />
          <span className="font-medium text-foreground">{currentGeo.length}/{clusters.length} geo</span>
          <span className="text-muted-foreground">(current)</span>
        </span>
        {newGeoCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="font-medium text-emerald-700">+{newGeoCount} geo · +{newDepotCount} depots</span>
            <span className="text-muted-foreground">(adding)</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[340px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/50 border-b">
              <th className="text-left py-2 px-3 font-medium text-xs w-[200px]">Geography</th>
              <th className="text-left py-2 px-3 font-medium text-xs">Available Depots</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cluster, idx) => {
              const isExisting = currentGeo.includes(cluster.name);
              const isNew      = addedGeos.includes(cluster.name);
              const geoDepots  = geographyDepotMap[cluster.name] || [];
              const allNewDepotsSelected = geoDepots.length > 0 && geoDepots.every(d => addedDepots.includes(d));

              return (
                <tr
                  key={cluster.name}
                  className={cn(
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isExisting && "opacity-60",
                  )}
                >
                  {/* Geography column */}
                  <td className="py-2 px-3 border-r align-middle whitespace-nowrap">
                    <label className={cn(
                      "flex items-center gap-2 text-xs font-medium rounded px-1 py-0.5",
                      isExisting ? "cursor-not-allowed" : "cursor-pointer",
                      isNew && "bg-emerald-50 text-emerald-800",
                      !isNew && !isExisting && "hover:bg-muted/50",
                    )}>
                      <Checkbox
                        checked={isExisting || isNew}
                        disabled={isExisting}
                        onCheckedChange={() => toggleGeo(cluster.name)}
                        className={cn(isNew && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500")}
                        data-testid={`checkbox-geo-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                      />
                      <span>{cluster.name}</span>
                      {isExisting && (
                        <span className="ml-auto text-[10px] text-primary font-semibold">current</span>
                      )}
                    </label>
                  </td>

                  {/* Depots column */}
                  <td className="py-2 px-3">
                    {isExisting ? (
                      /* Existing geo — show current depots read-only */
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {geoDepots.length === 0
                          ? <span className="text-[11px] text-muted-foreground italic">—</span>
                          : geoDepots.map(depot => (
                            <span key={depot} className="text-[11px] font-mono text-muted-foreground">{depot}</span>
                          ))}
                      </div>
                    ) : isNew ? (
                      /* New geo — selectable depots */
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {geoDepots.length > 1 && (
                          <label className={cn(
                            "flex items-center gap-1.5 py-0.5 px-2 rounded border cursor-pointer transition-colors text-[11px] font-medium",
                            allNewDepotsSelected
                              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                              : "bg-muted/50 border-muted text-muted-foreground hover:bg-muted",
                          )}>
                            <Checkbox
                              checked={allNewDepotsSelected}
                              onCheckedChange={() => toggleAllGeoDepots(cluster.name)}
                              className="h-3 w-3 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            All
                          </label>
                        )}
                        {geoDepots.map(depot => {
                          const checked = addedDepots.includes(depot);
                          return (
                            <label key={depot} className={cn(
                              "flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer transition-colors",
                              checked ? "bg-emerald-50" : "hover:bg-muted/50",
                            )}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleDepot(depot)}
                                className="h-3 w-3 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                data-testid={`checkbox-depot-${depot.toLowerCase()}`}
                              />
                              <span className="text-xs font-mono">{depot}</span>
                            </label>
                          );
                        })}
                        {geoDepots.length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">No depots mapped</span>
                        )}
                      </div>
                    ) : (
                      /* Available geo — show depots greyed out */
                      <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-40">
                        {geoDepots.length === 0
                          ? <span className="text-[11px] text-muted-foreground italic">—</span>
                          : geoDepots.map(depot => (
                            <span key={depot} className="text-[11px] font-mono text-muted-foreground">{depot}</span>
                          ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {newGeoCount === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Click a geography checkbox to add it to the extension request.
        </p>
      )}
    </div>
  );
}

// ─── Channel Editor ───────────────────────────────────────────────────────────

function ChannelEditor({ leafChannels, currentChannels, addedChannels, setAddedChannels }: {
  leafChannels: ChannelDef[];
  currentChannels: string[];
  addedChannels: string[];
  setAddedChannels: (v: string[]) => void;
}) {
  const groups = useMemo(
    () => CHANNEL_GROUPS
      .map(g => ({ label: g.label, channels: leafChannels.filter(g.match) }))
      .filter(g => g.channels.length > 0),
    [leafChannels],
  );

  const getState = (code: string): ChipState =>
    currentChannels.includes(code) ? "existing"
    : addedChannels.includes(code) ? "new"
    : "available";

  const toggle = (code: string) => {
    if (currentChannels.includes(code)) return;
    setAddedChannels(
      addedChannels.includes(code)
        ? addedChannels.filter(c => c !== code)
        : [...addedChannels, code],
    );
  };

  return (
    <div className="space-y-4">
      <SelectionLegend />
      {groups.map(g => (
        <div key={g.label}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.channels.map(c => (
              <Chip key={c.code} label={c.code} state={getState(c.code)} onClick={() => toggle(c.code)} />
            ))}
          </div>
        </div>
      ))}
      {addedChannels.length > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
          <span className="font-semibold">{addedChannels.length} new {addedChannels.length === 1 ? "channel" : "channels"} to add:</span>{" "}
          {addedChannels.join(", ")}
        </div>
      )}
    </div>
  );
}

// ─── Sourcing Editor ──────────────────────────────────────────────────────────

function SourcingEditor({
  currentGeo, currentDepots, geographyDepotMap,
  newMode, setNewMode,
  centralizedGeo, setCentralizedGeo,
  centralizedDepots, setCentralizedDepots,
}: {
  currentGeo: string[];
  currentDepots: string[];
  geographyDepotMap: Record<string, string[]>;
  newMode: "decentralized" | "centralized";
  setNewMode: (m: "decentralized" | "centralized") => void;
  centralizedGeo: string[];
  setCentralizedGeo: (v: string[]) => void;
  centralizedDepots: string[];
  setCentralizedDepots: (v: string[]) => void;
}) {
  const availableDepots = useMemo(() => {
    const s = new Set<string>();
    centralizedGeo.forEach(geo =>
      (geographyDepotMap[geo] || [])
        .filter(d => currentDepots.includes(d))
        .forEach(d => s.add(d)),
    );
    return Array.from(s).sort();
  }, [centralizedGeo, geographyDepotMap, currentDepots]);

  const toggleGeo = (geo: string) => {
    const next = centralizedGeo.includes(geo)
      ? centralizedGeo.filter(g => g !== geo)
      : [...centralizedGeo, geo];
    setCentralizedGeo(next);
    const validD = new Set<string>();
    next.forEach(g =>
      (geographyDepotMap[g] || [])
        .filter(d => currentDepots.includes(d))
        .forEach(d => validD.add(d)),
    );
    setCentralizedDepots(centralizedDepots.filter(d => validD.has(d)));
  };

  const toggleDepot = (d: string) =>
    setCentralizedDepots(
      centralizedDepots.includes(d)
        ? centralizedDepots.filter(x => x !== d)
        : [...centralizedDepots, d],
    );

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div>
        <p className="text-sm font-medium mb-2">Requested Sourcing Mode</p>
        <div className="flex gap-2">
          {(["decentralized", "centralized"] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setNewMode(m)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize",
                newMode === m
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-foreground border-border hover:border-blue-300 hover:bg-blue-50",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {newMode === "decentralized"
            ? "All distribution geographies and depots are included in the sourcing scope."
            : "Select a specific subset of geographies and depots for centralized sourcing."}
        </p>
      </div>

      {/* Current coverage (read-only context) */}
      {currentGeo.length > 0 && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Current Distribution Coverage
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentGeo.map(g => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
          </div>
          {currentDepots.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentDepots.map(d => <Badge key={d} variant="outline" className="text-xs font-mono">{d}</Badge>)}
            </div>
          )}
        </div>
      )}

      {/* Centralized selection */}
      {newMode === "centralized" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">
              Select Geographies for Centralized Sourcing <span className="text-red-500">*</span>
            </p>
            {currentGeo.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No geographies available — entry has no distribution coverage.
              </p>
            ) : (
              <div className="space-y-1">
                {currentGeo.map(geo => (
                  <label
                    key={geo}
                    className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-muted/40 rounded-md px-2 py-1.5 transition-colors"
                  >
                    <Checkbox
                      checked={centralizedGeo.includes(geo)}
                      onCheckedChange={() => toggleGeo(geo)}
                      data-testid={`check-sourcing-geo-${geo}`}
                    />
                    <span>{geo}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d)).length} depot(s)
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {centralizedGeo.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                Select Depots <span className="text-red-500">*</span>
              </p>
              <div className="space-y-1 columns-2">
                {availableDepots.map(depot => (
                  <label
                    key={depot}
                    className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-muted/40 rounded-md px-2 py-1.5 transition-colors break-inside-avoid"
                  >
                    <Checkbox
                      checked={centralizedDepots.includes(depot)}
                      onCheckedChange={() => toggleDepot(depot)}
                      data-testid={`check-sourcing-depot-${depot}`}
                    />
                    <span className="font-mono">{depot}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary View ─────────────────────────────────────────────────────────────

function SummaryView({
  amendmentType, currentGeo, currentChannels, currentDepots,
  addedGeos, addedChannels, addedDepots,
  newMode, centralizedGeo, centralizedDepots,
  justification, setJustification,
}: {
  amendmentType: SrType;
  currentGeo: string[];
  currentChannels: string[];
  currentDepots: string[];
  addedGeos: string[];
  addedChannels: string[];
  addedDepots: string[];
  newMode: "decentralized" | "centralized";
  centralizedGeo: string[];
  centralizedDepots: string[];
  justification: string;
  setJustification: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Change summary card */}
      <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Changes Requested
        </p>

        {amendmentType === "geo-extension" && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Existing Geographies (no change)</p>
              <div className="flex flex-wrap gap-1.5">
                {currentGeo.length > 0
                  ? currentGeo.map(g => (
                      <Badge key={g} className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal">{g}</Badge>
                    ))
                  : <span className="text-xs text-muted-foreground italic">None</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Adding Geographies</p>
              <div className="flex flex-wrap gap-1.5">
                {addedGeos.map(g => (
                  <Badge key={g} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">{g}</Badge>
                ))}
              </div>
            </div>
            {addedDepots.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Adding Depots</p>
                <div className="flex flex-wrap gap-1.5">
                  {addedDepots.map(d => (
                    <Badge key={d} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-normal">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {amendmentType === "channel-extension" && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Existing Channels (no change)</p>
              <div className="flex flex-wrap gap-1.5">
                {currentChannels.length > 0
                  ? currentChannels.map(c => (
                      <Badge key={c} className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal">{c}</Badge>
                    ))
                  : <span className="text-xs text-muted-foreground italic">None</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Adding Channels</p>
              <div className="flex flex-wrap gap-1.5">
                {addedChannels.map(c => (
                  <Badge key={c} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">{c}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {amendmentType === "sourcing-amendment" && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Mode</p>
                <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal">Decentralized</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requested Mode</p>
                <Badge className={cn(
                  "text-xs font-normal border",
                  newMode === "decentralized"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-emerald-100 text-emerald-700 border-emerald-300",
                )}>
                  {newMode === "decentralized" ? "Decentralized" : "Centralized"}
                </Badge>
              </div>
            </div>
            {newMode === "centralized" && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Centralized Geographies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {centralizedGeo.map(g => (
                      <Badge key={g} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">{g}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Centralized Depots</p>
                  <div className="flex flex-wrap gap-1.5">
                    {centralizedDepots.map(d => (
                      <Badge key={d} variant="outline" className="text-xs font-mono">{d}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Justification */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Business Justification <span className="text-red-500">*</span>
        </Label>
        <Textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          placeholder="Explain why this change is needed (market dynamics, business case, compliance, etc.)…"
          rows={3}
          className="resize-none text-sm"
          data-testid="input-justification"
        />
      </div>

      {/* Approval chain */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Approval Chain
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Paid Bible Owner", "Network Planner", "NCSM"].map((role, i, arr) => (
            <span key={role} className="flex items-center gap-1.5">
              <span className="text-xs bg-white border rounded-full px-2.5 py-0.5 font-medium">{role}</span>
              {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RaiseAmendmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cbuId: string;
  cbuCode: string;
  cbuDescription: string;
  basepackCode: string;
  brand: string;
  bg: string;
  assignedPerson?: string | null;
  raisedBy?: string;
  users: PortalUser[];
  onSuccess?: (req: ServiceRequest) => void;
  currentGeo: string[];
  currentDepots: string[];
  currentChannels: string[];
  clusters: ClusterInfo[];
  leafChannels: ChannelDef[];
  geographyDepotMap: Record<string, string[]>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RaiseAmendmentDialog({
  open, onOpenChange,
  cbuId, cbuCode, cbuDescription, basepackCode, brand, bg, assignedPerson,
  raisedBy: raisedByProp,
  users, onSuccess,
  currentGeo, currentDepots, currentChannels,
  clusters, leafChannels, geographyDepotMap,
}: RaiseAmendmentDialogProps) {
  const [step,          setStep]          = useState<Step>("type");
  const [amendmentType, setAmendmentType] = useState<SrType | "">("");

  const [addedGeos,     setAddedGeos]     = useState<string[]>([]);
  const [addedDepots,   setAddedDepots]   = useState<string[]>([]);
  const [addedChannels, setAddedChannels] = useState<string[]>([]);

  const [newMode,          setNewMode]          = useState<"decentralized" | "centralized">("decentralized");
  const [centralizedGeo,   setCentralizedGeo]   = useState<string[]>([]);
  const [centralizedDepots,setCentralizedDepots]= useState<string[]>([]);

  const [justification, setJustification] = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const currentStepIdx = STEPS.indexOf(step);

  const hasChanges = useMemo(() => {
    if (amendmentType === "geo-extension")     return addedGeos.length > 0;
    if (amendmentType === "channel-extension") return addedChannels.length > 0;
    if (amendmentType === "sourcing-amendment") {
      if (newMode === "decentralized") return false;
      return centralizedGeo.length > 0 && centralizedDepots.length > 0;
    }
    return false;
  }, [amendmentType, addedGeos, addedChannels, newMode, centralizedGeo, centralizedDepots]);

  const reset = () => {
    setStep("type");
    setAmendmentType("");
    setAddedGeos([]);
    setAddedDepots([]);
    setAddedChannels([]);
    setNewMode("decentralized");
    setCentralizedGeo([]);
    setCentralizedDepots([]);
    setJustification("");
  };

  const handleClose = () => { onOpenChange(false); reset(); };

  const handleSubmit = async () => {
    if (!amendmentType || !justification.trim()) return;
    setSubmitting(true);

    let currentValue = "";
    let requestedValue = "";
    if (amendmentType === "geo-extension") {
      currentValue     = currentGeo.join(", ") || "None";
      const geoStr     = [...currentGeo, ...addedGeos].join(", ");
      const depotStr   = addedDepots.length > 0 ? `; Depots: ${addedDepots.join(", ")}` : "";
      requestedValue   = geoStr + depotStr;

    } else if (amendmentType === "channel-extension") {
      currentValue     = currentChannels.join(", ") || "None";
      requestedValue   = [...currentChannels, ...addedChannels].join(", ");
    } else {
      currentValue     = `Decentralized — ${currentGeo.length} geo(s), ${currentDepots.length} depot(s)`;
      requestedValue   = newMode === "decentralized"
        ? currentValue
        : `Centralized — Geos: ${centralizedGeo.join(", ")}; Depots: ${centralizedDepots.join(", ")}`;
    }

    const raisedBy = raisedByProp || users.find(u => u.role === "Paid Bible Owner" && u.isActive)?.name || "PB SPOC";
    const approvers = buildApprovers(users, assignedPerson);

    const req: ServiceRequest = {
      id: genId(),
      srType: amendmentType as SrType,
      basepackId: "",
      basepackCode,
      basepackName: `${brand} · ${basepackCode}`,
      cbuId, cbuCode, cbuDescription, brand, bg,
      raisedBy,
      raisedAt: formatNow(),
      currentValue,
      requestedValue,
      justification: justification.trim(),
      approvers,
      overallStatus: "pending",
      addedGeos: amendmentType === "geo-extension" ? addedGeos : [],
      addedDepots: amendmentType === "geo-extension" ? addedDepots : [],
      addedChannels: amendmentType === "channel-extension" ? addedChannels : [],
      sourcingMode: amendmentType === "sourcing-amendment" ? newMode : undefined,
      centralizedGeo: amendmentType === "sourcing-amendment" ? centralizedGeo : [],
      centralizedDepots: amendmentType === "sourcing-amendment" ? centralizedDepots : [],
    };

    try {
      await apiRequest("POST", "/api/service-requests", {
        srType: amendmentType,
        raisedBy,
        businessGroup: bg,
        basepakCode: basepackCode,
        basepakName: `${brand} · ${basepackCode}`,
        businessJustification: justification.trim(),
        cbuId,
        cbuCode,
        cbuDescription,
        currentValue,
        requestedValue,
        addedGeos: amendmentType === "geo-extension" ? addedGeos : [],
        addedDepots: amendmentType === "geo-extension" ? addedDepots : [],
        addedChannels: amendmentType === "channel-extension" ? addedChannels : [],
        sourcingMode: amendmentType === "sourcing-amendment" ? newMode : undefined,
        centralizedGeo: amendmentType === "sourcing-amendment" ? centralizedGeo : [],
        centralizedDepots: amendmentType === "sourcing-amendment" ? centralizedDepots : [],
        approvers,
      });
    } catch {
    }

    addRequest(req);
    setSubmitting(false);
    onSuccess?.(req);
    handleClose();
  };

  const stepLabel = step === "type" ? "Select Type"
    : step === "edit" ? (SR_TYPE_META[amendmentType as SrType]?.label ?? "Edit")
    : "Review & Confirm";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-3xl" data-testid="dialog-raise-amendment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            Raise Amendment Request
            <span className="ml-auto text-sm font-normal text-muted-foreground">{stepLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {/* CBU strip */}
        <div className="bg-muted/40 rounded-lg px-4 py-2.5 flex flex-wrap gap-3 text-sm border">
          <span>
            <span className="text-muted-foreground text-xs">CBU </span>
            <span className="font-mono font-semibold">{cbuCode}</span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground truncate max-w-[280px]">{cbuDescription || "—"}</span>
          {basepackCode && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <Badge variant="outline" className="text-xs h-5">{basepackCode}</Badge>
            </>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                i === currentStepIdx ? "bg-blue-500 text-white"
                : i < currentStepIdx ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground",
              )}>
                {i < currentStepIdx ? "✓" : i + 1}
              </span>
              <span className={cn(
                "hidden sm:inline",
                i === currentStepIdx ? "font-medium text-foreground" : "text-muted-foreground",
              )}>
                {s === "type" ? "Type" : s === "edit" ? "Edit" : "Review"}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="max-h-[52vh] overflow-y-auto pr-1 -mr-1">

          {/* ── Step 1: Type selection ── */}
          {step === "type" && (
            <div className="grid gap-2.5 py-1">
              {AMENDMENT_TYPES.map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmendmentType(value)}
                  data-testid={`option-amendment-${value}`}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-4 text-left transition-all",
                    amendmentType === value
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-border hover:border-blue-200 hover:bg-muted/30",
                  )}
                >
                  <span className={cn(
                    "mt-0.5 p-2 rounded-lg shrink-0",
                    amendmentType === value ? "bg-blue-100" : "bg-muted",
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      amendmentType === value ? "text-blue-600" : "text-muted-foreground",
                    )} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-sm">{label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
                  </span>
                  {amendmentType === value && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Editor ── */}
          {step === "edit" && amendmentType === "geo-extension" && (
            <GeoEditor
              clusters={clusters}
              currentGeo={currentGeo}
              addedGeos={addedGeos}
              setAddedGeos={setAddedGeos}
              geographyDepotMap={geographyDepotMap}
              addedDepots={addedDepots}
              setAddedDepots={setAddedDepots}
            />
          )}

          {step === "edit" && amendmentType === "channel-extension" && (
            <ChannelEditor
              leafChannels={leafChannels}
              currentChannels={currentChannels}
              addedChannels={addedChannels}
              setAddedChannels={setAddedChannels}
            />
          )}

          {step === "edit" && amendmentType === "sourcing-amendment" && (
            <SourcingEditor
              currentGeo={currentGeo}
              currentDepots={currentDepots}
              geographyDepotMap={geographyDepotMap}
              newMode={newMode}
              setNewMode={setNewMode}
              centralizedGeo={centralizedGeo}
              setCentralizedGeo={setCentralizedGeo}
              centralizedDepots={centralizedDepots}
              setCentralizedDepots={setCentralizedDepots}
            />
          )}

          {/* ── Step 3: Summary ── */}
          {step === "summary" && amendmentType && (
            <SummaryView
              amendmentType={amendmentType as SrType}
              currentGeo={currentGeo}
              currentChannels={currentChannels}
              currentDepots={currentDepots}
              addedGeos={addedGeos}
              addedDepots={addedDepots}
              addedChannels={addedChannels}
              newMode={newMode}
              centralizedGeo={centralizedGeo}
              centralizedDepots={centralizedDepots}
              justification={justification}
              setJustification={setJustification}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 pt-1 border-t">
          {currentStepIdx > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[currentStepIdx - 1])}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-amendment">
            Cancel
          </Button>

          {step === "type" && (
            <Button
              disabled={!amendmentType}
              onClick={() => setStep("edit")}
              className="gap-1"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "edit" && (
            <Button
              disabled={!hasChanges}
              onClick={() => setStep("summary")}
              className="gap-1"
              data-testid="button-review-changes"
            >
              Review Changes <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === "summary" && (
            <Button
              disabled={!justification.trim() || submitting}
              onClick={handleSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              data-testid="button-submit-amendment"
            >
              <AlertTriangle className="h-4 w-4" />
              Confirm & Submit SR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
