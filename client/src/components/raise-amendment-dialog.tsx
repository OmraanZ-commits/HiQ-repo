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
  ChevronRight, ChevronLeft, CheckCircle2, ExternalLink,
  MapPin, Check, Plus, X, Lock, Users, CalendarClock,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/users-data";
import type { ChannelDef, CustomerChainDef } from "@/lib/distribution-data";
import { CUSTOMER_CHAINS, MT_SUB_CHANNELS } from "@/lib/distribution-data";
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
    label: "Channel Amendment",
    desc: "Add or remove trade channels per cluster (GT, MT, Ecom, KA…)",
  },
  {
    value: "sourcing-amendment" as SrType,
    icon: PackageSearch,
    label: "Sourcing Amendment",
    desc: "Change the sourcing mode or centralized geography / depot scope",
  },
  {
    value: "customer-chain-amendment" as SrType,
    icon: Users,
    label: "Customer Chain Amendment",
    desc: "Amend MT sub-channel customer chains mapped against a cluster",
  },
  {
    value: "network-change-date-amendment" as SrType,
    icon: CalendarClock,
    label: "Network Change Date Amendment",
    desc: "Request a revised network change date due to MSTN clearance not met",
  },
];

const REGION_ORDER = ["North", "South", "East", "West"];


// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `SR-${Math.floor(100000 + Math.random() * 900000)}`;
}

function buildApprovers(
  users: PortalUser[],
  assignedPerson: string | null | undefined,
  cbuNetworkStatus?: string,
): ApproverStep[] {
  const byRole = (role: string) => users.find(u => u.role === role && u.isActive)?.name ?? "Unassigned";
  const npName = users.find(u => u.name === assignedPerson && u.isActive)?.name
              ?? users.find(u => u.role === "Network Planner" && u.isActive)?.name
              ?? assignedPerson
              ?? "Unassigned";

  // New unified 4-stage approval chain for all amendments / manual SRs:
  // Supply Planner -> Demand Planner -> Network Planner -> NCSM.
  return [
    { role: "supply-planner", label: "Supply Planner", subLabel: "Feasibility Validation", assignedTo: byRole("Supply Planner"), status: "pending" },
    { role: "demand-planner", label: "Demand Planner", subLabel: "Demand Signal Alignment", assignedTo: byRole("Demand Planner"), status: "waiting" },
    { role: "network-planner", label: "Network Planner", subLabel: "Pricing & Sourcing Validation", assignedTo: npName, status: "waiting" },
    { role: "ncsm", label: "NCSM", subLabel: "Final Approval", assignedTo: byRole("NCSM"), status: "waiting" },
  ];
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

type ChipState = "existing" | "new" | "available" | "removing";

function Chip({ label, state, onClick }: {
  label: string;
  state: ChipState;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all select-none cursor-pointer",
        state === "existing"  && "bg-blue-500 text-white border-blue-500 hover:bg-blue-600",
        state === "new"       && "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600",
        state === "removing"  && "bg-red-400 text-white border-red-400 hover:bg-red-500 line-through opacity-80",
        state === "available" && "bg-white text-foreground border-border hover:border-blue-300 hover:bg-blue-50",
      )}
    >
      {label}
    </button>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function SelectionLegend({ showRemoving = false }: { showRemoving?: boolean }) {
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
      {showRemoving && (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block shrink-0" />
          Removing (click to cancel)
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full border border-border bg-white inline-block shrink-0" />
        Available
      </span>
    </div>
  );
}

// ─── Geo Editor ───────────────────────────────────────────────────────────────

function GeoEditor({
  clusters, currentGeo, currentDepots, addedGeos, setAddedGeos,
  geographyDepotMap, addedDepots, setAddedDepots,
  removedGeos, setRemovedGeos, removedDepots, setRemovedDepots,
}: {
  clusters: ClusterInfo[];
  currentGeo: string[];
  currentDepots: string[];
  addedGeos: string[];
  setAddedGeos: (v: string[]) => void;
  geographyDepotMap: Record<string, string[]>;
  addedDepots: string[];
  setAddedDepots: (v: string[]) => void;
  removedGeos: string[];
  setRemovedGeos: (v: string[]) => void;
  removedDepots: string[];
  setRemovedDepots: (v: string[]) => void;
}) {
  const sorted = useMemo(
    () => [...clusters].sort((a, b) => a.name.localeCompare(b.name)),
    [clusters],
  );

  const curGeoDepots = (geo: string) =>
    (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d));

  // Checkbox click on an existing geo: toggle all-depots removal
  const toggleExistingGeo = (name: string) => {
    const geoDepots = curGeoDepots(name);
    if (removedGeos.includes(name)) {
      // Cancel removal — restore geo and all its depots
      setRemovedGeos(removedGeos.filter(g => g !== name));
      setRemovedDepots(removedDepots.filter(d => !geoDepots.includes(d)));
    } else {
      // Mark for removal — remove geo + all its current depots
      setRemovedGeos([...removedGeos, name]);
      const next = [...removedDepots];
      geoDepots.forEach(d => { if (!next.includes(d)) next.push(d); });
      setRemovedDepots(next);
    }
  };

  // Checkbox click on a new (added) geo: remove from added list
  const toggleNewGeo = (name: string) => {
    setAddedGeos(addedGeos.filter(g => g !== name));
    const geoDepots = geographyDepotMap[name] || [];
    setAddedDepots(addedDepots.filter(d => !geoDepots.includes(d)));
  };

  // Checkbox click on an available geo: add it
  const toggleAvailableGeo = (name: string) => {
    setAddedGeos([...addedGeos, name]);
  };

  const toggleGeo = (name: string) => {
    if (currentGeo.includes(name))  { toggleExistingGeo(name); return; }
    if (addedGeos.includes(name))   { toggleNewGeo(name);      return; }
    toggleAvailableGeo(name);
  };

  // Click on a current depot chip: toggle individual removal with cascade.
  // Invariant: geo is in removedGeos IFF all its current depots are in removedDepots.
  const toggleRemovedDepot = (geo: string, depot: string) => {
    const geoDepots = curGeoDepots(geo);
    if (removedDepots.includes(depot)) {
      // Un-remove this depot
      const next = removedDepots.filter(d => d !== depot);
      setRemovedDepots(next);
      // Cascade up: geo must leave removedGeos whenever any of its depots is kept
      const allStillRemoved = geoDepots.every(d => next.includes(d));
      if (!allStillRemoved) {
        setRemovedGeos(removedGeos.filter(g => g !== geo));
      }
    } else {
      // Mark for removal
      const next = [...removedDepots, depot];
      setRemovedDepots(next);
      // Cascade down: add geo to removedGeos only when ALL its current depots are removed
      if (geoDepots.length > 0 && geoDepots.every(d => next.includes(d))) {
        if (!removedGeos.includes(geo)) setRemovedGeos([...removedGeos, geo]);
      }
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
      const next = [...addedDepots];
      geoDepots.forEach(d => { if (!next.includes(d)) next.push(d); });
      setAddedDepots(next);
    }
  };

  const newGeoCount   = addedGeos.length;
  const newDepotCount = addedDepots.length;
  const rmvDepotCount = removedDepots.length;
  const rmvGeoCount   = removedGeos.length;

  return (
    <div className="space-y-3">
      <SelectionLegend showRemoving={rmvGeoCount > 0 || rmvDepotCount > 0} />
      {/* Header counters */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
        {(rmvGeoCount > 0 || rmvDepotCount > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            <span className="font-medium text-red-600">
              {rmvGeoCount > 0 ? `−${rmvGeoCount} geo · ` : ""}
              {rmvDepotCount > 0 ? `−${rmvDepotCount} depots` : ""}
            </span>
            <span className="text-muted-foreground">(removing)</span>
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
              <th className="text-left py-2 px-3 font-medium text-xs">Depots</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cluster, idx) => {
              const isExisting = currentGeo.includes(cluster.name);
              const isNew      = addedGeos.includes(cluster.name);
              const isRemoving = removedGeos.includes(cluster.name);
              const geoDepots  = geographyDepotMap[cluster.name] || [];
              const cDepots    = curGeoDepots(cluster.name);
              const hasAnyRemovedDepots = cDepots.some(d => removedDepots.includes(d));
              const anyRemoval = isRemoving || hasAnyRemovedDepots;
              const allNewDepotsSelected = geoDepots.length > 0 && geoDepots.every(d => addedDepots.includes(d));

              return (
                <tr
                  key={cluster.name}
                  className={cn(
                    idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    anyRemoval && "bg-red-50/60",
                  )}
                >
                  {/* Geography column */}
                  <td className="py-2 px-3 border-r align-middle whitespace-nowrap">
                    <label className={cn(
                      "flex items-center gap-2 text-xs font-medium rounded px-1 py-0.5 cursor-pointer",
                      isRemoving           && "text-red-700 bg-red-50",
                      hasAnyRemovedDepots && !isRemoving && "text-red-500",
                      isNew                && "bg-emerald-50 text-emerald-800",
                      !isNew && !isExisting && !anyRemoval && "hover:bg-muted/50",
                    )}>
                      <Checkbox
                        checked={(isExisting && !isRemoving) || isNew}
                        onCheckedChange={() => toggleGeo(cluster.name)}
                        className={cn(
                          isNew      && "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
                          isRemoving && "border-red-400",
                        )}
                        data-testid={`checkbox-geo-${cluster.name.toLowerCase().replace(/[\s-]+/g, "-")}`}
                      />
                      <span className={cn(isRemoving && "line-through")}>{cluster.name}</span>
                      {isExisting && !anyRemoval && (
                        <span className="ml-auto text-[10px] text-primary font-semibold">current</span>
                      )}
                      {isRemoving && (
                        <span className="ml-auto text-[10px] text-red-600 font-semibold">removing</span>
                      )}
                      {hasAnyRemovedDepots && !isRemoving && (
                        <span className="ml-auto text-[10px] text-red-500 font-semibold">partial</span>
                      )}
                    </label>
                  </td>

                  {/* Depots column */}
                  <td className="py-2 px-3">
                    {isExisting ? (
                      /* Existing geo (removing or not) — interactive depot chips for individual removal */
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {cDepots.length === 0
                          ? <span className="text-[11px] text-muted-foreground italic">—</span>
                          : <>
                            {cDepots.map(depot => {
                              const depotRemoving = removedDepots.includes(depot);
                              return (
                                <button
                                  key={depot}
                                  type="button"
                                  onClick={() => toggleRemovedDepot(cluster.name, depot)}
                                  title={depotRemoving ? "Click to keep this depot" : "Click to mark for removal"}
                                  className={cn(
                                    "text-[11px] font-mono px-1.5 py-0.5 rounded border transition-all",
                                    depotRemoving
                                      ? "bg-red-100 text-red-600 border-red-300 line-through hover:bg-red-200"
                                      : "bg-white text-muted-foreground border-border hover:border-red-300 hover:bg-red-50",
                                  )}
                                  data-testid={`chip-depot-remove-${depot.toLowerCase()}`}
                                >
                                  {depot}
                                </button>
                              );
                            })}
                            <span className="text-[10px] text-muted-foreground/50 italic">click to remove</span>
                          </>}
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

      {newGeoCount === 0 && rmvGeoCount === 0 && rmvDepotCount === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Check a geography to add it; uncheck a current geography or click its depot chips to request removal.
        </p>
      )}
    </div>
  );
}

// ─── Matrix Cell (3-state checkbox for amendment) ────────────────────────────

function MatrixCell({ state, onClick }: { state: ChipState; onClick: () => void }) {
  return (
    <div
      role="checkbox"
      tabIndex={0}
      aria-checked={state !== "available"}
      onClick={onClick}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(); } }}
      className={cn(
        "w-[18px] h-[18px] rounded border-2 flex items-center justify-center mx-auto cursor-pointer transition-all select-none focus:outline-none focus:ring-1 focus:ring-[#00b0d7] focus:ring-offset-1",
        state === "existing"  && "bg-[#00b0d7] border-[#00b0d7]",
        state === "new"       && "bg-emerald-500 border-emerald-500",
        state === "removing"  && "bg-red-400 border-red-400",
        state === "available" && "bg-white border-border hover:border-[#00b0d7]/60",
      )}
    >
      {state === "existing"  && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      {state === "new"       && <Plus  className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      {state === "removing"  && <X     className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </div>
  );
}

// Aggregate toggle cell (for MT-All and Row-All — shows overall coverage, no diff colour)
function AggCell({ active, mixed, onClick }: { active: boolean; mixed: boolean; onClick: () => void }) {
  return (
    <div
      role="checkbox"
      tabIndex={0}
      aria-checked={active}
      onClick={onClick}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(); } }}
      className={cn(
        "w-[18px] h-[18px] rounded border-2 flex items-center justify-center mx-auto cursor-pointer transition-all select-none focus:outline-none",
        active                  && "bg-[#00b0d7] border-[#00b0d7]",
        !active && mixed        && "bg-[#00b0d7]/10 border-[#00b0d7]/30",
        !active && !mixed       && "bg-white border-border hover:border-[#00b0d7]/60",
      )}
    >
      {active        && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      {!active && mixed && <span className="text-[#00b0d7] text-[9px] font-black leading-none">–</span>}
    </div>
  );
}

// ─── Channel Editor ───────────────────────────────────────────────────────────

function ChannelEditor({
  leafChannels,
  currentGeo,
  channelMapping,
  requestedChannelMapping,
  setRequestedChannelMapping,
}: {
  leafChannels: ChannelDef[];
  currentGeo: string[];
  channelMapping: Record<string, string[]>;
  requestedChannelMapping: Record<string, string[]>;
  setRequestedChannelMapping: (v: Record<string, string[]>) => void;
}) {
  // Partition into top-level channels (GT, RD, CSD) and MT sub-channels
  const topChs = useMemo(() => leafChannels.filter(c => !c.parent), [leafChannels]);
  const mtChs  = useMemo(() => leafChannels.filter(c => c.parent === "MT"), [leafChannels]);

  // Resolved requested state for a geo (falls back to current if untouched)
  const getReq = (geo: string): string[] =>
    requestedChannelMapping[geo] ?? [...(channelMapping[geo] || [])];

  // 4-state diff for a single geo×channel cell
  const getCellState = (geo: string, code: string): ChipState => {
    const orig = channelMapping[geo] || [];
    const req  = getReq(geo);
    if (orig.includes(code)  && req.includes(code))  return "existing";
    if (!orig.includes(code) && req.includes(code))  return "new";
    if (orig.includes(code)  && !req.includes(code)) return "removing";
    return "available";
  };

  // Toggle a single cell (or MT group when code === "MT")
  const toggleCell = (geo: string, code: string) => {
    const codes = code === "MT" ? mtChs.map(c => c.code) : [code];
    const req   = [...getReq(geo)];
    const next  = { ...requestedChannelMapping };
    if (code === "MT") {
      const allOn = codes.every(c => req.includes(c));
      next[geo] = allOn ? req.filter(c => !codes.includes(c)) : [...new Set([...req, ...codes])];
    } else {
      next[geo] = req.includes(code) ? req.filter(c => c !== code) : [...req, code];
    }
    setRequestedChannelMapping(next);
  };

  // Toggle an entire column across all geos
  const toggleColumn = (code: string) => {
    const codes   = code === "MT" ? mtChs.map(c => c.code) : [code];
    const allOn   = currentGeo.every(geo => codes.every(c => getReq(geo).includes(c)));
    const next    = { ...requestedChannelMapping };
    currentGeo.forEach(geo => {
      const req = [...getReq(geo)];
      next[geo] = allOn ? req.filter(c => !codes.includes(c)) : [...new Set([...req, ...codes])];
    });
    setRequestedChannelMapping(next);
  };

  // Toggle every channel for every geo
  const toggleAll = () => {
    const allCodes = leafChannels.map(c => c.code);
    const allOn    = currentGeo.every(geo => allCodes.every(c => getReq(geo).includes(c)));
    const next     = { ...requestedChannelMapping };
    currentGeo.forEach(geo => {
      const req = [...getReq(geo)];
      next[geo] = allOn ? req.filter(c => !allCodes.includes(c)) : [...new Set([...req, ...allCodes])];
    });
    setRequestedChannelMapping(next);
  };

  // Toggle all channels for a single geo row
  const toggleRowAll = (geo: string) => {
    const allCodes = leafChannels.map(c => c.code);
    const req      = [...getReq(geo)];
    const allOn    = allCodes.every(c => req.includes(c));
    const next     = { ...requestedChannelMapping };
    next[geo] = allOn ? req.filter(c => !allCodes.includes(c)) : [...new Set([...req, ...allCodes])];
    setRequestedChannelMapping(next);
  };

  // Column pill state (based on requested, for header toggles)
  const getColState = (code: string): boolean | "indeterminate" => {
    const codes = code === "MT" ? mtChs.map(c => c.code) : [code];
    const all  = currentGeo.every(geo => codes.every(c => getReq(geo).includes(c)));
    const some = currentGeo.some(geo =>  codes.some(c  => getReq(geo).includes(c)));
    return all ? true : some ? "indeterminate" : false;
  };

  const getAllState = (): boolean | "indeterminate" => {
    const allCodes = leafChannels.map(c => c.code);
    const all  = currentGeo.every(geo => allCodes.every(c => getReq(geo).includes(c)));
    const some = currentGeo.some(geo =>  allCodes.some(c  => getReq(geo).includes(c)));
    return all ? true : some ? "indeterminate" : false;
  };

  // Summary counts
  const totalAdded = currentGeo.reduce((n, geo) => {
    const orig = new Set(channelMapping[geo] || []);
    return n + getReq(geo).filter(c => !orig.has(c)).length;
  }, 0);
  const totalRemoved = currentGeo.reduce((n, geo) => {
    const orig = channelMapping[geo] || [];
    return n + orig.filter(c => !getReq(geo).includes(c)).length;
  }, 0);

  // Inline column-header pill
  const ColPill = ({ label, state, onClick }: {
    label: string;
    state: boolean | "indeterminate";
    onClick: (e: React.MouseEvent) => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all select-none",
        state === true            && "bg-[#00b0d7] border-[#00b0d7] text-white",
        state === "indeterminate" && "bg-[#00b0d7]/10 border-[#00b0d7]/30 text-[#00b0d7]",
        state === false           && "bg-white border-border text-muted-foreground hover:border-[#00b0d7]/40",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground py-2 border-b">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-[#00b0d7] bg-[#00b0d7] inline-flex items-center justify-center shrink-0">
            <Check className="h-2 w-2 text-white" strokeWidth={3} />
          </span>
          Current (click to remove)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-emerald-500 bg-emerald-500 inline-flex items-center justify-center shrink-0">
            <Plus className="h-2 w-2 text-white" strokeWidth={3} />
          </span>
          Adding (click to cancel)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-red-400 bg-red-400 inline-flex items-center justify-center shrink-0">
            <X className="h-2 w-2 text-white" strokeWidth={3} />
          </span>
          Removing (click to cancel)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-border bg-white inline-block shrink-0" />
          Available
        </span>
      </div>

      {/* Matrix table — mirrors "Channels by Geography" from Network Visibility */}
      <div className="overflow-auto max-h-80 rounded-md border">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            {/* Row 1: Cluster | TOP channels | MT group header | All */}
            <tr>
              <th className="text-left py-3 pl-4 pr-3 text-muted-foreground font-medium w-36 bg-white border-b border-border/60">
                Cluster
              </th>
              {topChs.map(ch => (
                <th
                  key={ch.code}
                  className="text-center py-3 px-3 bg-white border-b border-border/60 cursor-pointer select-none"
                >
                  <ColPill
                    label={ch.code}
                    state={getColState(ch.code)}
                    onClick={e => { e.stopPropagation(); toggleColumn(ch.code); }}
                  />
                </th>
              ))}
              {/* MT group header — label only, spans MT All + each sub-channel */}
              <th
                colSpan={mtChs.length + 1}
                className="text-center py-3 px-4 font-semibold text-[#00b0d7] bg-[#e6f7fb] border-b-2 border-[#00b0d7]/40"
              >
                MT
              </th>
              {/* All — toggles every channel for every geo */}
              <th className="text-center py-3 px-3 bg-white border-b border-border/60 cursor-pointer select-none">
                <ColPill
                  label="All"
                  state={getAllState()}
                  onClick={e => { e.stopPropagation(); toggleAll(); }}
                />
              </th>
            </tr>
            {/* Row 2: blank | blank for top-chs | MT All pill | MT sub-channel pills | blank */}
            <tr>
              <th className="py-2 pl-4 bg-white border-b border-border/50" />
              {topChs.map(ch => (
                <th key={ch.code} className="py-2 px-3 bg-white border-b border-border/50" />
              ))}
              {/* MT All */}
              <th className="text-center py-2 px-3 bg-[#e6f7fb] border-b border-border/50 cursor-pointer select-none">
                <ColPill
                  label="All"
                  state={getColState("MT")}
                  onClick={e => { e.stopPropagation(); toggleColumn("MT"); }}
                />
              </th>
              {/* MT sub-channels */}
              {mtChs.map(ch => (
                <th
                  key={ch.code}
                  className="text-center py-2 px-3 bg-[#e6f7fb] border-b border-border/50 cursor-pointer select-none"
                >
                  <ColPill
                    label={ch.code}
                    state={getColState(ch.code)}
                    onClick={e => { e.stopPropagation(); toggleColumn(ch.code); }}
                  />
                </th>
              ))}
              <th className="py-2 px-3 bg-white border-b border-border/50" />
            </tr>
          </thead>
          <tbody>
            {currentGeo.map((geo, idx) => {
              const req          = getReq(geo);
              const mtAllOn      = mtChs.every(c => req.includes(c.code));
              const mtSomeOn     = mtChs.some(c  => req.includes(c.code));
              const allOn        = leafChannels.every(c => req.includes(c.code));
              const someOn       = leafChannels.some(c  => req.includes(c.code));
              return (
                <tr
                  key={geo}
                  className={cn(
                    "border-b border-border/30 transition-colors hover:bg-muted/20",
                    idx % 2 !== 0 && "bg-muted/10",
                  )}
                >
                  {/* Cluster name */}
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#0d8ecf] shrink-0" />
                      <span className="text-[12px] font-medium text-[#00b0d7] leading-tight capitalize">
                        {geo.toLowerCase()}
                      </span>
                    </div>
                  </td>
                  {/* TOP channels */}
                  {topChs.map(ch => (
                    <td key={ch.code} className="text-center py-3 px-4">
                      <MatrixCell
                        state={getCellState(geo, ch.code)}
                        onClick={() => toggleCell(geo, ch.code)}
                      />
                    </td>
                  ))}
                  {/* MT All */}
                  <td className="text-center py-3 px-4 bg-[#f0fafd]">
                    <AggCell
                      active={mtAllOn}
                      mixed={mtSomeOn && !mtAllOn}
                      onClick={() => toggleCell(geo, "MT")}
                    />
                  </td>
                  {/* MT sub-channels */}
                  {mtChs.map(ch => (
                    <td key={ch.code} className="text-center py-3 px-4 bg-[#f0fafd]">
                      <MatrixCell
                        state={getCellState(geo, ch.code)}
                        onClick={() => toggleCell(geo, ch.code)}
                      />
                    </td>
                  ))}
                  {/* Row All */}
                  <td className="text-center py-3 px-4">
                    <AggCell
                      active={allOn}
                      mixed={someOn && !allOn}
                      onClick={() => toggleRowAll(geo)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Change summary */}
      {(totalAdded > 0 || totalRemoved > 0) && (
        <div className="flex gap-2">
          {totalAdded > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 flex-1">
              <span className="font-semibold">+{totalAdded}</span> channel slot{totalAdded !== 1 ? "s" : ""} to add across clusters
            </div>
          )}
          {totalRemoved > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex-1">
              <span className="font-semibold">−{totalRemoved}</span> channel slot{totalRemoved !== 1 ? "s" : ""} to remove across clusters
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sourcing Editor ──────────────────────────────────────────────────────────

function SourcingEditor({
  currentGeo, currentDepots,
  newMode, setNewMode,
  sourcingDepotMapping, setSourcingDepotMapping,
}: {
  currentGeo: string[];
  currentDepots: string[];
  newMode: "decentralized" | "centralized";
  setNewMode: (m: "decentralized" | "centralized") => void;
  sourcingDepotMapping: Record<string, string>;
  setSourcingDepotMapping: (v: Record<string, string>) => void;
}) {
  const sourcingDepotSet = new Set(Object.values(sourcingDepotMapping));

  const handleDepotChange = (depot: string, sourcingDepot: string) => {
    const next = { ...sourcingDepotMapping, [depot]: sourcingDepot };
    if (sourcingDepot !== depot) {
      next[sourcingDepot] = sourcingDepot;
    }
    setSourcingDepotMapping(next);
  };

  const handleDepotClear = (depot: string) => {
    const oldSourcing = sourcingDepotMapping[depot];
    const next = { ...sourcingDepotMapping };
    delete next[depot];
    if (oldSourcing && oldSourcing !== depot) {
      const stillReferenced = Object.values(next).some(v => v === oldSourcing);
      if (!stillReferenced) delete next[oldSourcing];
    }
    setSourcingDepotMapping(next);
  };

  const handleLockedDepotClear = (depot: string) => {
    const next = { ...sourcingDepotMapping };
    delete next[depot];
    Object.keys(next).forEach(d => { if (next[d] === depot) delete next[d]; });
    setSourcingDepotMapping(next);
  };

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
              onClick={() => {
                setNewMode(m);
                if (m === "centralized") setSourcingDepotMapping({});
              }}
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
            ? "All distribution depots source stock independently from themselves."
            : "Assign each distribution depot a sourcing depot. A depot chosen as a sourcing depot is auto-locked to itself."}
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

      {/* Centralized: depot → sourcing depot mapping table */}
      {newMode === "centralized" && (
        currentDepots.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No depots available — entry has no distribution coverage.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Depot Sourcing Mapping <span className="text-red-500">*</span>
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left py-2 px-3 font-medium text-xs w-[140px]">Depot</th>
                    <th className="text-left py-2 px-3 font-medium text-xs">Sourcing Depot</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDepots.map((depot, idx) => {
                    const isLocked = sourcingDepotSet.has(depot);
                    const current = sourcingDepotMapping[depot] || "";
                    const eligibleOptions = currentDepots.filter(d =>
                      !sourcingDepotMapping[d] || sourcingDepotMapping[d] === d
                    );
                    return (
                      <tr key={depot} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="py-2 px-3 border-r font-mono text-xs font-medium align-middle whitespace-nowrap">
                          {depot}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          {isLocked ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-semibold text-blue-600">{depot}</span>
                              <Badge variant="outline" className="text-[9px] gap-0.5 px-1.5 py-0 border-blue-400/40 text-blue-600">
                                <Lock className="h-2 w-2" /> Sourcing depot
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleLockedDepotClear(depot)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Remove sourcing depot lock"
                                data-testid={`sourcing-unlock-${depot.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={current}
                                onValueChange={val => handleDepotChange(depot, val)}
                                data-testid={`sourcing-select-${depot.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                <SelectTrigger className="h-7 text-xs font-mono w-full max-w-[200px]">
                                  <SelectValue placeholder="Select sourcing depot…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {eligibleOptions.map(d => (
                                    <SelectItem key={d} value={d} className="text-xs font-mono">{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {current && (
                                <button
                                  type="button"
                                  onClick={() => handleDepotClear(depot)}
                                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  title="Clear sourcing depot"
                                  data-testid={`sourcing-clear-${depot.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
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
        )
      )}
    </div>
  );
}

// ─── Customer Chain Editor ────────────────────────────────────────────────────

function CustomerChainEditor({
  mtGeos, channelMapping, customerMapping,
  requestedCustomerMapping, setRequestedCustomerMapping,
}: {
  mtGeos: string[];
  channelMapping: Record<string, string[]>;
  customerMapping: Record<string, string[]>;
  requestedCustomerMapping: Record<string, string[]>;
  setRequestedCustomerMapping: (v: Record<string, string[]>) => void;
}) {
  const getReq = (geo: string) => requestedCustomerMapping[geo] ?? customerMapping[geo] ?? [];

  const activeSubsFor = (geo: string) => {
    const geoChans = channelMapping[geo] || [];
    return MT_SUB_CHANNELS.filter(sc => geoChans.includes(sc.code)).map(sc => sc.code);
  };

  const chainsFor = (geo: string): CustomerChainDef[] => {
    const activeSubs = activeSubsFor(geo);
    return CUSTOMER_CHAINS.filter(c => activeSubs.includes(c.subChannel));
  };

  const toggleChain = (geo: string, code: string) => {
    const req = [...getReq(geo)];
    const next = { ...requestedCustomerMapping };
    next[geo] = req.includes(code) ? req.filter(c => c !== code) : [...req, code];
    setRequestedCustomerMapping(next);
  };

  const toggleGeoAll = (geo: string) => {
    const codes = chainsFor(geo).map(c => c.code);
    const req = getReq(geo);
    const allOn = codes.length > 0 && codes.every(c => req.includes(c));
    const next = { ...requestedCustomerMapping };
    next[geo] = allOn ? [] : codes;
    setRequestedCustomerMapping(next);
  };

  if (mtGeos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No clusters have an MT sub-channel selected against them — customer chain amendment is not applicable.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Toggle customer chains per cluster. Only chains belonging to the MT sub-channels already active
        for that cluster are shown.
      </p>
      {mtGeos.map(geo => {
        const chains = chainsFor(geo);
        const req = getReq(geo);
        const grouped = chains.reduce<Record<string, CustomerChainDef[]>>((acc, c) => {
          (acc[c.subChannel] ??= []).push(c);
          return acc;
        }, {});
        const allOn = chains.length > 0 && chains.every(c => req.includes(c.code));
        return (
          <div key={geo} className="rounded-lg border p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-[#0d8ecf] shrink-0" />
                <span className="text-sm font-medium text-[#00b0d7] capitalize">{geo.toLowerCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleGeoAll(geo)}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
                  allOn ? "bg-[#00b0d7] border-[#00b0d7] text-white" : "bg-white border-border text-muted-foreground hover:border-[#00b0d7]/40",
                )}
                data-testid={`button-toggle-all-chains-${geo.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {allOn ? "Clear all" : "Select all"}
              </button>
            </div>
            {chains.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No customer chains available for the active MT sub-channels in this cluster.</p>
            ) : (
              Object.entries(grouped).map(([subChannel, list]) => (
                <div key={subChannel} className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{subChannel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map(c => {
                      const isOn = req.includes(c.code);
                      const wasOn = (customerMapping[geo] || []).includes(c.code);
                      return (
                        <Chip
                          key={c.code}
                          label={c.code}
                          state={isOn ? (wasOn ? "existing" : "new") : (wasOn ? "removing" : "available")}
                          onClick={() => toggleChain(geo, c.code)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Network Change Date Editor ───────────────────────────────────────────────

function NetworkChangeDateEditor({
  currentNetworkChangeDate, requestedDate, setRequestedDate,
  mstnNote, setMstnNote,
}: {
  currentNetworkChangeDate?: string | null;
  requestedDate: string;
  setRequestedDate: (v: string) => void;
  mstnNote: string;
  setMstnNote: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-amber-50 border-amber-200 px-4 py-3 flex gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Use this amendment when MSTN clearance was not met during the MOC cycle check, requiring the
          network change date to be pushed out.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Current Network Change Date</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/30 text-sm font-mono">
            {currentNetworkChangeDate || "Not set"}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Requested Network Change Date <span className="text-red-500">*</span>
          </Label>
          <input
            type="date"
            value={requestedDate}
            onChange={e => setRequestedDate(e.target.value)}
            className="h-9 w-full rounded-md border px-3 text-sm font-mono"
            data-testid="input-requested-network-change-date"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">MSTN Clearance Note</Label>
        <Textarea
          value={mstnNote}
          onChange={e => setMstnNote(e.target.value)}
          placeholder="Describe the MSTN clearance gap identified during the MOC cycle check…"
          rows={2}
          className="resize-none text-sm"
          data-testid="input-mstn-note"
        />
      </div>
    </div>
  );
}

// ─── Summary View ─────────────────────────────────────────────────────────────

function SummaryView({
  amendmentType, currentGeo, currentChannels, currentDepots,
  addedGeos, addedChannels, removedChannels, addedDepots,
  removedGeos, removedDepots,
  channelMapping, requestedChannelMapping,
  newMode, sourcingDepotMapping,
  customerMapping, requestedCustomerMapping,
  currentNetworkChangeDate, requestedDate, mstnNote,
  justification, setJustification, cbuNetworkStatus,
  effectiveDate, setEffectiveDate, minEffectiveDate, effectiveDateValid,
}: {
  amendmentType: SrType;
  currentGeo: string[];
  currentChannels: string[];
  currentDepots: string[];
  addedGeos: string[];
  addedChannels: string[];
  removedChannels: string[];
  addedDepots: string[];
  removedGeos: string[];
  removedDepots: string[];
  channelMapping: Record<string, string[]>;
  requestedChannelMapping: Record<string, string[]>;
  newMode: "decentralized" | "centralized";
  sourcingDepotMapping: Record<string, string>;
  customerMapping: Record<string, string[]>;
  requestedCustomerMapping: Record<string, string[]>;
  currentNetworkChangeDate?: string | null;
  requestedDate: string;
  mstnNote: string;
  justification: string;
  setJustification: (v: string) => void;
  cbuNetworkStatus?: string;
  effectiveDate: string;
  setEffectiveDate: (v: string) => void;
  minEffectiveDate: string;
  effectiveDateValid: boolean;
}) {
  const keptGeos = currentGeo.filter(g => !removedGeos.includes(g));

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
              <p className="text-xs text-muted-foreground mb-1">
                Existing Geographies {removedGeos.length === 0 && removedDepots.length === 0 ? "(no change)" : "(retained)"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {keptGeos.length > 0
                  ? keptGeos.map(g => (
                      <Badge key={g} className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal">{g}</Badge>
                    ))
                  : <span className="text-xs text-muted-foreground italic">None</span>}
              </div>
            </div>
            {(removedGeos.length > 0 || removedDepots.length > 0) && (
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">Removing</p>
                {removedGeos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {removedGeos.map(g => (
                      <Badge key={g} className="bg-red-100 text-red-700 border border-red-300 text-xs font-normal line-through">{g}</Badge>
                    ))}
                  </div>
                )}
                {removedDepots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {removedDepots.map(d => (
                      <Badge key={d} className="bg-red-50 text-red-600 border border-red-200 text-xs font-mono font-normal line-through">{d}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {addedGeos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Adding Geographies</p>
                <div className="flex flex-wrap gap-1.5">
                  {addedGeos.map(g => (
                    <Badge key={g} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
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
          <div className="space-y-2 text-sm">
            {currentGeo.map(geo => {
              const original  = channelMapping[geo] || [];
              const requested = requestedChannelMapping[geo] ?? original;
              const added     = requested.filter(c => !original.includes(c));
              const removed   = original.filter(c => !requested.includes(c));
              const kept      = original.filter(c => requested.includes(c));
              if (added.length === 0 && removed.length === 0) return null;
              return (
                <div key={geo} className="rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">{geo}</p>
                  {kept.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {kept.map(c => <Badge key={c} className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-normal">{c}</Badge>)}
                    </div>
                  )}
                  {added.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {added.map(c => <Badge key={c} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">+ {c}</Badge>)}
                    </div>
                  )}
                  {removed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {removed.map(c => <Badge key={c} className="bg-red-100 text-red-700 border border-red-300 text-xs font-normal line-through">− {c}</Badge>)}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
            {addedChannels.length === 0 && removedChannels.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No channel changes</p>
            )}
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
            {newMode === "centralized" && Object.keys(sourcingDepotMapping).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Depot Sourcing Mapping</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left py-1.5 px-3 font-medium w-[130px]">Depot</th>
                        <th className="text-left py-1.5 px-3 font-medium">Sourcing Depot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sourcingDepotMapping).map(([depot, sourcing], idx) => (
                        <tr key={depot} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="py-1.5 px-3 font-mono border-r">{depot}</td>
                          <td className="py-1.5 px-3 font-mono">
                            {sourcing === depot ? (
                              <span className="flex items-center gap-1 text-blue-600">
                                {sourcing} <Lock className="h-2.5 w-2.5" />
                              </span>
                            ) : sourcing}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {amendmentType === "customer-chain-amendment" && (
          <div className="space-y-2 text-sm">
            {Object.keys(requestedCustomerMapping).map(geo => {
              const original = customerMapping[geo] || [];
              const requested = requestedCustomerMapping[geo] ?? original;
              const added = requested.filter(c => !original.includes(c));
              const removed = original.filter(c => !requested.includes(c));
              if (added.length === 0 && removed.length === 0) return null;
              return (
                <div key={geo} className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/30 px-3 py-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700 capitalize">{geo.toLowerCase()}</p>
                  {added.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {added.map(c => <Badge key={c} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-normal">+ {c}</Badge>)}
                    </div>
                  )}
                  {removed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {removed.map(c => <Badge key={c} className="bg-red-100 text-red-700 border border-red-300 text-xs font-normal line-through">− {c}</Badge>)}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
            {Object.keys(requestedCustomerMapping).length === 0 && (
              <p className="text-xs text-muted-foreground italic">No customer chain changes</p>
            )}
          </div>
        )}

        {amendmentType === "network-change-date-amendment" && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Network Change Date</p>
                <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal font-mono">
                  {currentNetworkChangeDate || "Not set"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requested Network Change Date</p>
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs font-normal font-mono">
                  {requestedDate || "—"}
                </Badge>
              </div>
            </div>
            {mstnNote && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">MSTN Clearance Note</p>
                <p className="text-xs bg-white border rounded-md px-3 py-2">{mstnNote}</p>
              </div>
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

      {/* Effective Date */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Effective Date <span className="text-red-500">*</span>
        </Label>
        <input
          type="date"
          value={effectiveDate}
          min={minEffectiveDate}
          onChange={e => setEffectiveDate(e.target.value)}
          className="h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
          data-testid="input-effective-date"
        />
        <p className="text-xs text-muted-foreground">
          Must be a future date. The Supply Planner may adjust this during feasibility review.
        </p>
        {effectiveDate && !effectiveDateValid && (
          <p className="text-xs text-red-600">Effective date must be later than today.</p>
        )}
      </div>

      {/* Approval chain */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Approval Chain
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["Supply Planner", "Demand Planner", "Network Planner", "NCSM"].map((role, i, arr) => (
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

export interface PendingAmendmentRef {
  id: string;
  srType: string;
  overallStatus: string;
}

export interface RaiseAmendmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cbuId: string;
  cbuCode: string;
  cbuDescription: string;
  cbuNetworkStatus?: string;
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
  channelMapping: Record<string, string[]>;
  clusters: ClusterInfo[];
  leafChannels: ChannelDef[];
  geographyDepotMap: Record<string, string[]>;
  pendingSrs?: PendingAmendmentRef[];
  mtGeos?: string[];
  customerMapping?: Record<string, string[]>;
  currentNetworkChangeDate?: string | null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RaiseAmendmentDialog({
  open, onOpenChange,
  cbuId, cbuCode, cbuDescription, cbuNetworkStatus, basepackCode, brand, bg, assignedPerson,
  raisedBy: raisedByProp,
  users, onSuccess,
  currentGeo, currentDepots, currentChannels,
  channelMapping,
  clusters, leafChannels, geographyDepotMap,
  pendingSrs = [],
  mtGeos = [],
  customerMapping = {},
  currentNetworkChangeDate,
}: RaiseAmendmentDialogProps) {
  const [step,          setStep]          = useState<Step>("type");
  const [amendmentType, setAmendmentType] = useState<SrType | "">("");

  const duplicateSr = useMemo(() => {
    if (!amendmentType) return null;
    return pendingSrs.find(sr => sr.srType === amendmentType && sr.overallStatus === "pending") ?? null;
  }, [amendmentType, pendingSrs]);

  const [addedGeos,     setAddedGeos]     = useState<string[]>([]);
  const [addedDepots,   setAddedDepots]   = useState<string[]>([]);
  const [removedGeos,   setRemovedGeos]   = useState<string[]>([]);
  const [removedDepots, setRemovedDepots] = useState<string[]>([]);

  // Channel amendment state: full per-geo requested mapping
  const [requestedChannelMapping, setRequestedChannelMapping] = useState<Record<string, string[]>>({});

  // Derived: flat added/removed channel lists (union across all geos)
  const addedChannels = useMemo(() => {
    const s = new Set<string>();
    currentGeo.forEach(geo => {
      const orig = new Set(channelMapping[geo] || []);
      (requestedChannelMapping[geo] ?? [...orig]).forEach(c => { if (!orig.has(c)) s.add(c); });
    });
    return Array.from(s);
  }, [currentGeo, channelMapping, requestedChannelMapping]);

  const removedChannels = useMemo(() => {
    const s = new Set<string>();
    currentGeo.forEach(geo => {
      const orig = channelMapping[geo] || [];
      const req  = requestedChannelMapping[geo] ?? orig;
      orig.forEach(c => { if (!req.includes(c)) s.add(c); });
    });
    return Array.from(s);
  }, [currentGeo, channelMapping, requestedChannelMapping]);

  const [newMode,              setNewMode]              = useState<"decentralized" | "centralized">("decentralized");
  const [sourcingDepotMapping, setSourcingDepotMapping] = useState<Record<string, string>>({});

  // Customer chain amendment state: full per-geo requested mapping
  const [requestedCustomerMapping, setRequestedCustomerMapping] = useState<Record<string, string[]>>({});

  // Network change date amendment state
  const [requestedDate, setRequestedDate] = useState("");
  const [mstnNote,      setMstnNote]      = useState("");

  const [justification, setJustification] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const minEffectiveDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const effectiveDateValid = !!effectiveDate && effectiveDate >= minEffectiveDate;

  const currentStepIdx = STEPS.indexOf(step);

  const hasChanges = useMemo(() => {
    if (amendmentType === "geo-extension")     return addedGeos.length > 0 || removedGeos.length > 0 || removedDepots.length > 0;
    if (amendmentType === "channel-extension") return addedChannels.length > 0 || removedChannels.length > 0;
    if (amendmentType === "sourcing-amendment") {
      if (newMode === "decentralized") return true;
      // Centralized: all current depots must have a sourcing depot assigned
      return currentDepots.length > 0 && currentDepots.every(d => !!sourcingDepotMapping[d]);
    }
    if (amendmentType === "customer-chain-amendment") {
      return mtGeos.some(geo => {
        const orig = customerMapping[geo] || [];
        const req = requestedCustomerMapping[geo] ?? orig;
        return orig.length !== req.length || orig.some(c => !req.includes(c)) || req.some(c => !orig.includes(c));
      });
    }
    if (amendmentType === "network-change-date-amendment") {
      return !!requestedDate && requestedDate !== currentNetworkChangeDate;
    }
    return false;
  }, [amendmentType, addedGeos, removedGeos, removedDepots, addedChannels, removedChannels, newMode, sourcingDepotMapping, currentDepots, mtGeos, customerMapping, requestedCustomerMapping, requestedDate, currentNetworkChangeDate]);

  const reset = () => {
    setStep("type");
    setAmendmentType("");
    setAddedGeos([]);
    setAddedDepots([]);
    setRequestedChannelMapping({});
    setRemovedGeos([]);
    setRemovedDepots([]);
    setNewMode("decentralized");
    setSourcingDepotMapping({});
    setRequestedCustomerMapping({});
    setRequestedDate("");
    setMstnNote("");
    setJustification("");
    setEffectiveDate("");
  };

  const handleClose = () => { onOpenChange(false); reset(); };

  const handleSubmit = async () => {
    if (!amendmentType || !justification.trim() || !effectiveDateValid) return;
    setSubmitting(true);

    let currentValue = "";
    let requestedValue = "";
    if (amendmentType === "geo-extension") {
      currentValue     = currentGeo.join(", ") || "None";
      const keptGeos   = currentGeo.filter(g => !removedGeos.includes(g));
      const finalGeos  = [...keptGeos, ...addedGeos];
      const geoStr     = finalGeos.join(", ") || "None";
      const addStr     = addedDepots.length > 0 ? `; Adding Depots: ${addedDepots.join(", ")}` : "";
      const rmvGeoStr  = removedGeos.length > 0 ? `; Removing Geo: ${removedGeos.join(", ")}` : "";
      const rmvDepStr  = removedDepots.length > 0 ? `; Removing Depots: ${removedDepots.join(", ")}` : "";
      requestedValue   = geoStr + addStr + rmvGeoStr + rmvDepStr;

    } else if (amendmentType === "channel-extension") {
      currentValue   = currentChannels.join(", ") || "None";
      const addStr   = addedChannels.length   > 0 ? `Adding: ${addedChannels.join(", ")}`   : "";
      const rmvStr   = removedChannels.length > 0 ? `Removing: ${removedChannels.join(", ")}` : "";
      requestedValue = [addStr, rmvStr].filter(Boolean).join("; ") || currentValue;
    } else if (amendmentType === "sourcing-amendment") {
      currentValue   = `Decentralized — ${currentGeo.length} geo(s), ${currentDepots.length} depot(s)`;
      if (newMode === "decentralized") {
        requestedValue = currentValue;
      } else {
        const pairs = Object.entries(sourcingDepotMapping)
          .map(([d, s]) => `${d}→${s}`)
          .join(", ");
        requestedValue = `Centralized — ${pairs}`;
      }
    } else if (amendmentType === "customer-chain-amendment") {
      currentValue = mtGeos.map(g => `${g}: ${(customerMapping[g] || []).join(", ") || "None"}`).join("; ");
      requestedValue = mtGeos.map(g => `${g}: ${(requestedCustomerMapping[g] ?? customerMapping[g] ?? []).join(", ") || "None"}`).join("; ");
    } else {
      currentValue = currentNetworkChangeDate || "Not set";
      requestedValue = requestedDate;
    }

    const raisedBy = raisedByProp || users.find(u => u.role === "Paid Bible Owner" && u.isActive)?.name || "PB SPOC";
    const approvers = buildApprovers(users, assignedPerson, cbuNetworkStatus);

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
      removedChannels: amendmentType === "channel-extension" ? removedChannels : [],
      requestedChannelMapping: amendmentType === "channel-extension" ? requestedChannelMapping : undefined,
      removedGeos: amendmentType === "geo-extension" ? removedGeos : [],
      removedDepots: amendmentType === "geo-extension" ? removedDepots : [],
      sourcingMode: amendmentType === "sourcing-amendment" ? newMode : undefined,
      sourcingDepotMapping: amendmentType === "sourcing-amendment" ? sourcingDepotMapping : undefined,
      centralizedGeos: [],
      centralizedDepots: [],
      requestedCustomerMapping: amendmentType === "customer-chain-amendment" ? requestedCustomerMapping : undefined,
      requestedDate: amendmentType === "network-change-date-amendment" ? requestedDate : undefined,
      currentNetworkChangeDate: amendmentType === "network-change-date-amendment" ? currentNetworkChangeDate : undefined,
      effectiveDate,
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
        removedChannels: amendmentType === "channel-extension" ? removedChannels : [],
        removedGeos: amendmentType === "geo-extension" ? removedGeos : [],
        removedDepots: amendmentType === "geo-extension" ? removedDepots : [],
        sourcingMode: amendmentType === "sourcing-amendment" ? newMode : undefined,
        sourcingDepotMapping: amendmentType === "sourcing-amendment" ? sourcingDepotMapping : undefined,
        centralizedGeo: [],
        centralizedDepots: [],
        requestedCustomerMapping: amendmentType === "customer-chain-amendment" ? requestedCustomerMapping : undefined,
        requestedDate: amendmentType === "network-change-date-amendment" ? requestedDate : undefined,
        effectiveDate,
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

              {/* Duplicate warning banner */}
              {duplicateSr && (
                <div
                  className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
                  data-testid="banner-duplicate-amendment"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-800">
                      A {SR_TYPE_META[amendmentType as SrType]?.label ?? amendmentType} request is already pending for this CBU.
                    </p>
                    <p className="text-amber-700 mt-0.5">
                      SR <span className="font-mono font-semibold">{duplicateSr.id}</span> is awaiting approval.
                      Submitting another may create a duplicate.
                    </p>
                    <a
                      href={`/paid-bible/requests/${duplicateSr.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-amber-700 underline underline-offset-2 hover:text-amber-900 text-xs font-medium"
                      data-testid="link-view-existing-sr"
                    >
                      View existing SR <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Editor ── */}
          {step === "edit" && amendmentType === "geo-extension" && (
            <GeoEditor
              clusters={clusters}
              currentGeo={currentGeo}
              currentDepots={currentDepots}
              addedGeos={addedGeos}
              setAddedGeos={setAddedGeos}
              geographyDepotMap={geographyDepotMap}
              addedDepots={addedDepots}
              setAddedDepots={setAddedDepots}
              removedGeos={removedGeos}
              setRemovedGeos={setRemovedGeos}
              removedDepots={removedDepots}
              setRemovedDepots={setRemovedDepots}
            />
          )}

          {step === "edit" && amendmentType === "channel-extension" && (
            <ChannelEditor
              leafChannels={leafChannels}
              currentGeo={currentGeo}
              channelMapping={channelMapping}
              requestedChannelMapping={requestedChannelMapping}
              setRequestedChannelMapping={setRequestedChannelMapping}
            />
          )}

          {step === "edit" && amendmentType === "sourcing-amendment" && (
            <SourcingEditor
              currentGeo={currentGeo}
              currentDepots={currentDepots}
              newMode={newMode}
              setNewMode={setNewMode}
              sourcingDepotMapping={sourcingDepotMapping}
              setSourcingDepotMapping={setSourcingDepotMapping}
            />
          )}

          {step === "edit" && amendmentType === "customer-chain-amendment" && (
            <CustomerChainEditor
              mtGeos={mtGeos}
              channelMapping={channelMapping}
              customerMapping={customerMapping}
              requestedCustomerMapping={requestedCustomerMapping}
              setRequestedCustomerMapping={setRequestedCustomerMapping}
            />
          )}

          {step === "edit" && amendmentType === "network-change-date-amendment" && (
            <NetworkChangeDateEditor
              currentNetworkChangeDate={currentNetworkChangeDate}
              requestedDate={requestedDate}
              setRequestedDate={setRequestedDate}
              mstnNote={mstnNote}
              setMstnNote={setMstnNote}
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
              removedChannels={removedChannels}
              channelMapping={channelMapping}
              requestedChannelMapping={requestedChannelMapping}
              removedGeos={removedGeos}
              removedDepots={removedDepots}
              newMode={newMode}
              sourcingDepotMapping={sourcingDepotMapping}
              customerMapping={customerMapping}
              requestedCustomerMapping={requestedCustomerMapping}
              currentNetworkChangeDate={currentNetworkChangeDate}
              requestedDate={requestedDate}
              mstnNote={mstnNote}
              justification={justification}
              setJustification={setJustification}
              cbuNetworkStatus={cbuNetworkStatus}
              effectiveDate={effectiveDate}
              setEffectiveDate={setEffectiveDate}
              minEffectiveDate={minEffectiveDate}
              effectiveDateValid={effectiveDateValid}
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
              disabled={!justification.trim() || !effectiveDateValid || submitting}
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
