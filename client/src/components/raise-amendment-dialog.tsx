import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Map as MapIcon, Radio, PackageSearch, AlertTriangle, AlertCircle,
  ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, ExternalLink,
  MapPin, Check, Plus, X, Lock, Users, CalendarClock,
  Upload, FileSpreadsheet, Trash2, IndianRupee, Network,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/users-data";
import type { ChannelDef, CustomerChainDef } from "@/lib/distribution-data";
import { CUSTOMER_CHAINS, MT_SUB_CHANNELS, GEOGRAPHY_DEPOT_MAP } from "@/lib/distribution-data";
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
  {
    value: "price-lot-change" as SrType,
    icon: IndianRupee,
    label: "Price Lot Change Request",
    desc: "Request a new or replacement price lot for an existing CBU — with overlap assessment and simulated pricing matrix",
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

// ─── Geo Depot Selector ───────────────────────────────────────────────────────

function GeoDepotSelector({
  availableDepots, selectedDepots, onChange,
}: {
  availableDepots: string[];
  selectedDepots: string[];
  onChange: (depots: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-wrap gap-1 items-center min-h-[28px] w-full text-left rounded px-1 py-0.5 hover:bg-muted/40 transition-colors"
        >
          {selectedDepots.length > 0
            ? selectedDepots.map(d => (
                <span
                  key={d}
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200"
                  onClick={e => { e.stopPropagation(); onChange(selectedDepots.filter(x => x !== d)); }}
                >
                  {d}
                  <X className="h-2.5 w-2.5 hover:text-red-500" />
                </span>
              ))
            : <span className="text-xs text-muted-foreground italic">None</span>
          }
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-[160px]" align="start" side="bottom">
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {availableDepots.map(d => (
            <label key={d} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono cursor-pointer hover:bg-muted">
              <Checkbox
                checked={selectedDepots.includes(d)}
                onCheckedChange={checked => {
                  onChange(checked ? [...selectedDepots, d] : selectedDepots.filter(x => x !== d));
                }}
                className="h-3.5 w-3.5"
              />
              {d}
            </label>
          ))}
          {availableDepots.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">No depots available</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Sourcing Editor ──────────────────────────────────────────────────────────

function SourcingEditor({
  currentGeo, currentDepots,
  newMode, setNewMode,
  sourcingDepotMapping, setSourcingDepotMapping,
  inheritedMode, availableSourcingDepots,
  geographyDepotMap,
  onDepotMappingChange,
}: {
  currentGeo: string[];
  currentDepots: string[];
  newMode: "decentralized" | "centralized";
  setNewMode: (m: "decentralized" | "centralized") => void;
  sourcingDepotMapping: Record<string, string>;
  setSourcingDepotMapping: (v: Record<string, string>) => void;
  inheritedMode?: "decentralized" | "centralized";
  availableSourcingDepots?: string[];
  geographyDepotMap?: Record<string, string[]>;
  onDepotMappingChange?: (mapping: Record<string, string[]>) => void;
}) {
  const effectiveMode = inheritedMode ?? newMode;
  const sourcingDepotSet = new Set(Object.values(sourcingDepotMapping));

  // Editable depot-by-geo mapping; initialized from current distribution on mount
  const [requestedDepotsByGeo, setRequestedDepotsByGeo] = useState<Record<string, string[]>>(() =>
    geographyDepotMap
      ? Object.fromEntries(
          currentGeo.map(geo => [geo, (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d))])
        )
      : {}
  );

  // Depots that have been newly added via the geo→depot selector (not in original currentDepots)
  const newlyAddedDepots = !inheritedMode && geographyDepotMap
    ? [...new Set(Object.values(requestedDepotsByGeo).flat().filter(d => !currentDepots.includes(d)))]
    : [];

  // Depot pool for sourcing dropdown: existing depots + any newly added ones
  const depotPool = availableSourcingDepots ?? [...currentDepots, ...newlyAddedDepots];

  // In sourcing-amendment (no inheritedMode): only map newly added depots.
  // In geo-extension wizard (inheritedMode set): map all passed-in currentDepots.
  const depotsToMap = !inheritedMode && geographyDepotMap ? newlyAddedDepots : currentDepots;

  const handleGeoDepotChange = (geo: string, depots: string[]) => {
    const next = { ...requestedDepotsByGeo, [geo]: depots };
    setRequestedDepotsByGeo(next);
    onDepotMappingChange?.(next);
  };

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
      {/* Mode: toggle (sourcing-amendment) or read-only badge (geo-extension wizard) */}
      <div>
        <p className="text-sm font-medium mb-2">Sourcing Strategy</p>
        {inheritedMode ? (
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border capitalize",
              inheritedMode === "decentralized"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-amber-50 border-amber-300 text-amber-700",
            )}>
              {inheritedMode}
            </span>
            <span className="text-xs text-muted-foreground">(inherited — cannot be changed here)</span>
          </div>
        ) : (
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
        )}
        <p className="text-xs text-muted-foreground mt-1.5">
          {effectiveMode === "decentralized"
            ? "All distribution depots source stock independently from themselves."
            : "Assign each distribution depot a sourcing depot. A depot chosen as a sourcing depot is auto-locked to itself."}
        </p>
      </div>

      {/* Decentralized: informational note for geo-extension wizard */}
      {effectiveMode === "decentralized" && inheritedMode && (
        <div className="rounded-lg border bg-blue-50 border-blue-200 px-4 py-3">
          <p className="text-xs text-blue-800">
            Each newly added depot will source stock independently from itself — no additional configuration is required.
          </p>
        </div>
      )}

      {/* Current coverage — geo→depot table (sourcing-amendment) or flat list (geo-extension) */}
      {currentGeo.length > 0 && (
        !inheritedMode && geographyDepotMap ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Network className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold">Sourcing by Geography &amp; Depot</p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-[200px]">Geography</th>
                    <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground">Depots</th>
                  </tr>
                </thead>
                <tbody>
                  {currentGeo.map((geo, idx) => {
                    const depots = (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d));
                    return (
                      <tr key={geo} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="py-2 px-3 border-r align-middle">
                          <span className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-xs font-medium">{geo}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <GeoDepotSelector
                            availableDepots={geographyDepotMap[geo] || []}
                            selectedDepots={requestedDepotsByGeo[geo] ?? depots}
                            onChange={ds => handleGeoDepotChange(geo, ds)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {inheritedMode ? "Newly Added Depots" : "Current Distribution Coverage"}
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
        )
      )}

      {/* Centralized: depot → sourcing depot mapping table */}
      {effectiveMode === "centralized" && (
        depotsToMap.length === 0 ? (
          (!inheritedMode && geographyDepotMap) ? (
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                No new depots added yet. Use the geography table above to add depots, then assign each a sourcing depot here.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No depots available — entry has no distribution coverage.
            </p>
          )
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
                  {depotsToMap.map((depot, idx) => {
                    const isLocked = sourcingDepotSet.has(depot);
                    const current = sourcingDepotMapping[depot] || "";
                    const eligibleOptions = depotPool.filter(d =>
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

// ─── Price Lot Change — constants, types, editor ──────────────────────────────

const PLR_MOCK_LOTS = [
  {
    id: "01", mrp: 199, validFrom: "2024-01-01", validTo: "9999-12-31",
    allIndia: true, scopeDesc: "All India", channels: [] as string[], geos: [] as string[],
  },
  {
    id: "02", mrp: 215, validFrom: "2024-07-01", validTo: "9999-12-31",
    allIndia: false, scopeDesc: "Regional", channels: [] as string[],
    geos: ["Kerala", "Tamil Nadu", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh"],
  },
  {
    id: "03", mrp: 229, validFrom: "2025-01-01", validTo: "9999-12-31",
    allIndia: false, scopeDesc: "Channel", channels: ["GT", "CSD", "MT Retail", "KA"], geos: [] as string[],
  },
  {
    id: "04", mrp: 245, validFrom: "2025-07-01", validTo: "9999-12-31",
    allIndia: false, scopeDesc: "Region × Channel",
    channels: ["GT", "Ecom"],
    geos: ["Delhi", "Tamil Nadu", "West Bengal", "Gujarat"],
  },
];

interface PriceLotChangeData {
  scopeType: "replace" | "new-channel" | "new-geo" | "new-region-channel";
  oldLotId: string;
  newLotNumber: string;
  newMrp: string;
  pricingEffectiveDate: string;
  pricingEndDate: string;
  oldLotInvoicingDeactivDate: string;
  oldLotProductionDeactivDate: string;
  productionEndDate: string;
  newChannels: string[];
  newGeos: string[];
  newDepots: string[];
  retailerMargin: string;
  rsMargin: string;
  priceOff: string;
}

const PLR_SCOPE_OPTIONS: { value: PriceLotChangeData["scopeType"]; label: string; desc: string }[] = [
  {
    value: "replace",
    label: "Replace existing price lot",
    desc: "Same channel & geography scope — new MRP replaces the selected lot for the same coverage.",
  },
  {
    value: "new-channel",
    label: "Extend to a new channel",
    desc: "Create a new price lot for channel(s) not yet in scope — existing scope retains its current price lot.",
  },
  {
    value: "new-geo",
    label: "Extend to a new region",
    desc: "Create a new price lot for region(s) not yet in scope — existing scope retains its current price lot.",
  },
  {
    value: "new-region-channel",
    label: "Extend to a region × channel",
    desc: "Create a new price lot for a specific region × channel combination — select both new region(s) and channel(s).",
  },
];

function PriceLotEditor({
  currentGeo, currentChannels, leafChannels, clusters,
  scopeType, setScopeType,
  oldLotId, setOldLotId,
  newMrp, setNewMrp,
  pricingEffectiveDate, setPricingEffectiveDate,
  pricingEndDate, setPricingEndDate,
  oldLotInvoicingDeactivDate, setOldLotInvoicingDeactivDate,
  oldLotProductionDeactivDate, setOldLotProductionDeactivDate,
  newChannels, setNewChannels,
  newGeos, setNewGeos,
  retailerMargin, setRetailerMargin,
  rsMargin, setRsMargin,
  priceOff, setPriceOff,
  newDepots, setNewDepots,
}: {
  currentGeo: string[];
  currentChannels: string[];
  leafChannels: ChannelDef[];
  clusters: ClusterInfo[];
  scopeType: PriceLotChangeData["scopeType"];
  setScopeType: (v: PriceLotChangeData["scopeType"]) => void;
  oldLotId: string;
  setOldLotId: (v: string) => void;
  newMrp: string;
  setNewMrp: (v: string) => void;
  pricingEffectiveDate: string;
  setPricingEffectiveDate: (v: string) => void;
  pricingEndDate: string;
  setPricingEndDate: (v: string) => void;
  oldLotInvoicingDeactivDate: string;
  setOldLotInvoicingDeactivDate: (v: string) => void;
  oldLotProductionDeactivDate: string;
  setOldLotProductionDeactivDate: (v: string) => void;
  newChannels: string[];
  setNewChannels: (v: string[]) => void;
  newGeos: string[];
  setNewGeos: (v: string[]) => void;
  newDepots: string[];
  setNewDepots: (v: string[]) => void;
  retailerMargin: string;
  setRetailerMargin: (v: string) => void;
  rsMargin: string;
  setRsMargin: (v: string) => void;
  priceOff: string;
  setPriceOff: (v: string) => void;
}) {
  const oldLot = PLR_MOCK_LOTS.find(l => l.id === oldLotId);

  // channels: split into already-applied and available-to-add
  const appliedChannels      = leafChannels.filter(ch => currentChannels.includes(ch.code));
  const availableNewChannels = leafChannels.filter(ch => !currentChannels.includes(ch.code));

  // geos: split into already-in-scope and available-to-add
  const appliedGeos    = clusters.filter(c => currentGeo.includes(c.name));
  const availableNewGeos = clusters.filter(c => !currentGeo.includes(c.name));

  const needsChannels = scopeType === "new-channel" || scopeType === "new-region-channel";
  const needsGeos     = scopeType === "new-geo"     || scopeType === "new-region-channel";

  return (
    <div className="space-y-5">

      {/* Amendment Scope */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Amendment Scope <span className="text-red-500">*</span></Label>
        <div className="grid gap-2">
          {PLR_SCOPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setScopeType(opt.value);
                setNewChannels([]);
                setNewGeos([]);
                setNewDepots([]);
                setOldLotId("");
              }}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                scopeType === opt.value
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-border hover:border-blue-200 hover:bg-muted/30",
              )}
              data-testid={`option-plc-scope-${opt.value}`}
            >
              <div className={cn(
                "mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                scopeType === opt.value ? "border-blue-500" : "border-muted-foreground",
              )}>
                {scopeType === opt.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <div>
                <span className="font-medium text-sm block">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Existing Price Lots — card grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            Existing Price Lots for this CBU
            {scopeType === "replace" && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <span className="text-xs text-muted-foreground italic">
            {scopeType === "replace"
              ? "Select the lot to replace"
              : "Click a lot to select for deactivation (optional)"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {PLR_MOCK_LOTS.map(lot => {
            const isSelected = oldLotId === lot.id;
            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => setOldLotId(isSelected && scopeType !== "replace" ? "" : lot.id)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3 text-left transition-all",
                  isSelected
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
                    : "border-border hover:border-amber-200 hover:bg-muted/20",
                )}
                data-testid={`btn-plc-lot-${lot.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-sm font-semibold">PL-{lot.id}</span>
                  <Badge className={cn(
                    "text-[10px] px-1.5 py-0",
                    lot.allIndia
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : lot.scopeDesc === "Channel"
                        ? "bg-violet-100 text-violet-700 border border-violet-200"
                        : lot.scopeDesc === "Regional"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-orange-100 text-orange-700 border border-orange-200",
                  )}>
                    {lot.scopeDesc}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <IndianRupee className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-sm font-semibold">₹{lot.mrp.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{lot.validFrom} – {lot.validTo === "9999-12-31" ? "till end" : lot.validTo}</span>
                </div>
                {lot.channels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lot.channels.map(ch => (
                      <span key={ch} className="text-[10px] bg-violet-50 text-violet-700 border border-violet-100 rounded px-1.5 py-0.5">{ch}</span>
                    ))}
                  </div>
                )}
                {lot.geos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lot.geos.slice(0, 3).map(g => (
                      <span key={g} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">{g}</span>
                    ))}
                    {lot.geos.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{lot.geos.length - 3} more</span>
                    )}
                  </div>
                )}
                {isSelected && (
                  <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                    <span>✓</span> {scopeType === "replace" ? "Selected for replacement" : "Selected for deactivation"}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {scopeType === "replace" && !oldLotId && (
          <p className="text-xs text-red-500">Select the price lot you want to replace.</p>
        )}
      </div>

      {/* Old Lot Deactivation Dates — shown only when a lot is selected */}
      {oldLot && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
          <Label className="text-sm font-semibold text-amber-800">
            Deactivation Dates for PL-{oldLot.id} (₹{oldLot.mrp})
          </Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-amber-700">Old Price Lot Invoicing Deactivation Date</Label>
              <input
                type="date"
                value={oldLotInvoicingDeactivDate}
                onChange={e => setOldLotInvoicingDeactivDate(e.target.value)}
                className="h-9 w-full rounded-md border border-amber-200 bg-white px-3 text-sm"
                data-testid="input-old-lot-invoicing-deactiv"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-amber-700">Old Price Lot Production Deactivation Date</Label>
              <input
                type="date"
                value={oldLotProductionDeactivDate}
                onChange={e => setOldLotProductionDeactivDate(e.target.value)}
                className="h-9 w-full rounded-md border border-amber-200 bg-white px-3 text-sm"
                data-testid="input-old-lot-production-deactiv"
              />
            </div>
          </div>
        </div>
      )}

      {/* Channel Scope — for new-channel and new-region-channel */}
      {needsChannels && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Channel Scope <span className="text-red-500">*</span>
          </Label>
          {appliedChannels.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Already active ({appliedChannels.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {appliedChannels.map(ch => (
                  <div
                    key={ch.code}
                    className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                    title="Already in distribution scope"
                  >
                    <Checkbox checked disabled className="pointer-events-none h-3.5 w-3.5 shrink-0 opacity-50" />
                    {ch.code}
                  </div>
                ))}
              </div>
            </div>
          )}
          {availableNewChannels.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">All available channels are already active for this CBU.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Available to extend to ({availableNewChannels.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {availableNewChannels.map(ch => {
                  const selected = newChannels.includes(ch.code);
                  return (
                    <button
                      key={ch.code}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? newChannels.filter(c => c !== ch.code)
                          : [...newChannels, ch.code];
                        setNewChannels(next);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all text-left",
                        selected ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-border hover:border-blue-200",
                      )}
                      data-testid={`btn-new-channel-${ch.code}`}
                    >
                      <Checkbox checked={selected} className="pointer-events-none h-3.5 w-3.5 shrink-0" />
                      {ch.code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {availableNewChannels.length > 0 && newChannels.length === 0 && (
            <p className="text-xs text-red-500">Select at least one new channel.</p>
          )}
        </div>
      )}

      {/* Region Scope — for new-geo and new-region-channel */}
      {needsGeos && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">
            Region / Geography Scope <span className="text-red-500">*</span>
          </Label>
          {appliedGeos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Already in scope ({appliedGeos.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {appliedGeos.map(c => (
                  <div
                    key={c.name}
                    className="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2 text-muted-foreground cursor-not-allowed"
                    title="Already in distribution scope"
                  >
                    <Checkbox checked disabled className="pointer-events-none h-3.5 w-3.5 shrink-0 mt-0.5 opacity-50" />
                    <div>
                      <span className="text-xs">{c.name}</span>
                      <span className="block text-[10px] text-muted-foreground/70">{c.region}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {availableNewGeos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">All available geographies are already in scope for this CBU.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Available to extend to ({availableNewGeos.length})
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableNewGeos.map(c => {
                  const selected = newGeos.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? newGeos.filter(g => g !== c.name)
                          : [...newGeos, c.name];
                        setNewGeos(next);
                        if (!selected) {
                          // Auto-select the depot if this geo has exactly one
                          const geoDepots = GEOGRAPHY_DEPOT_MAP[c.name] || [];
                          if (geoDepots.length === 1 && !newDepots.includes(geoDepots[0])) {
                            setNewDepots([...newDepots, geoDepots[0]]);
                          }
                        } else {
                          // Deselect: remove depots unique to this geo (not shared with remaining selections)
                          const remainingGeos = newGeos.filter(g => g !== c.name);
                          const stillNeeded = new Set(remainingGeos.flatMap(g => GEOGRAPHY_DEPOT_MAP[g] || []));
                          const geoDepots = GEOGRAPHY_DEPOT_MAP[c.name] || [];
                          setNewDepots(newDepots.filter(d => !geoDepots.includes(d) || stillNeeded.has(d)));
                        }
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-all",
                        selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border hover:border-blue-200",
                      )}
                      data-testid={`btn-new-geo-${c.name}`}
                    >
                      <Checkbox checked={selected} className="pointer-events-none h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium leading-snug block">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-snug block">{c.region}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {availableNewGeos.length > 0 && newGeos.length === 0 && (
            <p className="text-xs text-red-500">Select at least one new region.</p>
          )}
        </div>
      )}

      {/* DC Selection — shown after regions are chosen, for new-geo and new-region-channel */}
      {needsGeos && newGeos.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Distribution Centres (DCs) for New Regions <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Select the DCs that will serve each newly added region. At least one DC per region is required.
          </p>
          <div className="space-y-3">
            {newGeos.map(geo => {
              const availableDcs = GEOGRAPHY_DEPOT_MAP[geo] || [];
              const allSelected  = availableDcs.length > 0 && availableDcs.every(d => newDepots.includes(d));
              const anySelected  = availableDcs.some(d => newDepots.includes(d));
              return (
                <div key={geo} className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{geo}</span>
                    {availableDcs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            setNewDepots(newDepots.filter(d => !availableDcs.includes(d)));
                          } else {
                            const next = [...newDepots];
                            availableDcs.forEach(d => { if (!next.includes(d)) next.push(d); });
                            setNewDepots(next);
                          }
                        }}
                        className="text-xs text-blue-600 underline"
                        data-testid={`btn-plc-dc-selectall-${geo.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                  {availableDcs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No DCs mapped for this region.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableDcs.map(dc => {
                        const selected = newDepots.includes(dc);
                        return (
                          <button
                            key={dc}
                            type="button"
                            onClick={() =>
                              setNewDepots(selected ? newDepots.filter(d => d !== dc) : [...newDepots, dc])
                            }
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-medium transition-all",
                              selected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-border hover:border-emerald-300 hover:bg-muted/20",
                            )}
                            data-testid={`btn-plc-dc-${dc.toLowerCase()}`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {dc}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {availableDcs.length > 0 && !anySelected && (
                    <p className="text-xs text-red-500">Select at least one DC for {geo}.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Price Lot Dates */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">New Price Lot</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* MRP — required for replace, shown prominently here */}
          {scopeType === "replace" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New MRP per unit (₹) <span className="text-red-500">*</span></Label>
              <input
                type="number"
                min="0"
                step="1"
                value={newMrp}
                onChange={e => setNewMrp(e.target.value)}
                placeholder="e.g. 258"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                data-testid="input-new-mrp"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price Lot Start Date <span className="text-red-500">*</span></Label>
            <input
              type="date"
              value={pricingEffectiveDate}
              onChange={e => setPricingEffectiveDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-pricing-effective-date"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price Lot End Date</Label>
            <input
              type="date"
              value={pricingEndDate === "9999-12-31" ? "" : pricingEndDate}
              onChange={e => setPricingEndDate(e.target.value || "9999-12-31")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-pricing-end-date"
            />
            <p className="text-xs text-muted-foreground">Leave blank for "till end"</p>
          </div>
        </div>
      </div>

      {/* Optional fields */}
      <details className="group">
        <summary className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground list-none select-none">
          <Plus className="h-3.5 w-3.5 transition-transform group-open:rotate-45" />
          Optional fields (MRP, Margins &amp; Price Off)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 pl-5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">MRP per unit (₹)</Label>
            <input
              type="number"
              min="0"
              step="1"
              value={newMrp}
              onChange={e => setNewMrp(e.target.value)}
              placeholder="e.g. 258"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-new-mrp"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Retailer Margin</Label>
            <input
              type="text"
              value={retailerMargin}
              onChange={e => setRetailerMargin(e.target.value)}
              placeholder="e.g. 12% or 25"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-retailer-margin"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">RS Margin</Label>
            <input
              type="text"
              value={rsMargin}
              onChange={e => setRsMargin(e.target.value)}
              placeholder="e.g. as per system"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-rs-margin"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price Off</Label>
            <input
              type="text"
              value={priceOff}
              onChange={e => setPriceOff(e.target.value)}
              placeholder="e.g. NA or 5%"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              data-testid="input-price-off"
            />
          </div>
        </div>
      </details>

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
  demandEstimateFile, setDemandEstimateFile,
  priceLotChangeData,
  geoSourcingMode,
  geographyDepotMap,
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
  demandEstimateFile: File | null;
  setDemandEstimateFile: (f: File | null) => void;
  priceLotChangeData?: PriceLotChangeData;
  geoSourcingMode?: "decentralized" | "centralized";
  geographyDepotMap?: Record<string, string[]>;
}) {
  const keptGeos = currentGeo.filter(g => !removedGeos.includes(g));
  const MT_CH_CODES = MT_SUB_CHANNELS.map(sc => sc.code);

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
            {/* Per-geography breakdown for added geos */}
            {addedGeos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Adding Geographies — Per-Geo Breakdown</p>
                <div className="space-y-2.5">
                  {addedGeos.map(geo => {
                    const geoDepots = geographyDepotMap
                      ? (geographyDepotMap[geo] || []).filter(d => addedDepots.includes(d))
                      : [];
                    const channels = requestedChannelMapping[geo] ?? [];
                    const customerChains = requestedCustomerMapping[geo] ?? [];
                    const hasMt = channels.some(c => MT_CH_CODES.includes(c));
                    return (
                      <div key={geo} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2.5" data-testid={`geo-summary-card-${geo.toLowerCase().replace(/\s+/g, "-")}`}>
                        {/* Geo header */}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-sm font-semibold text-emerald-800">{geo}</span>
                          <Badge className="ml-auto bg-emerald-100 text-emerald-700 border border-emerald-300 text-[10px] px-1.5 py-0 font-normal">New</Badge>
                        </div>

                        {/* Depots being added for this geo */}
                        {geoDepots.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Depots Adding</p>
                            <div className="flex flex-wrap gap-1">
                              {geoDepots.map(d => (
                                <Badge key={d} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-normal" data-testid={`badge-depot-${d.toLowerCase()}`}>{d}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Channels */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Channels</p>
                          {channels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {channels.map(c => (
                                <Badge key={c} className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-normal" data-testid={`badge-channel-${c.toLowerCase().replace(/\s+/g, "-")}`}>{c}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No channels selected</span>
                          )}
                        </div>

                        {/* Customer chains — only when MT channels selected */}
                        {hasMt && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Customer Chains (MT)</p>
                            {customerChains.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {customerChains.map(c => (
                                  <Badge key={c} className="bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 text-xs font-normal" data-testid={`badge-chain-${c.toLowerCase().replace(/\s+/g, "-")}`}>{c}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None selected</span>
                            )}
                          </div>
                        )}

                        {/* Sourcing depot per added depot for this geo */}
                        {geoSourcingMode && geoDepots.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sourcing</p>
                            {geoSourcingMode === "decentralized" ? (
                              <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-normal capitalize">Decentralized — self-sourcing</Badge>
                            ) : (
                              <div className="space-y-1">
                                {geoDepots.map(depot => (
                                  <div key={depot} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-slate-600 w-20 shrink-0">{depot}</span>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    {sourcingDepotMapping[depot] ? (
                                      <span className="flex items-center gap-1 font-mono font-medium text-blue-700">
                                        {sourcingDepotMapping[depot]}
                                        {sourcingDepotMapping[depot] === depot && <Lock className="h-2.5 w-2.5" />}
                                      </span>
                                    ) : (
                                      <span className="text-amber-500 italic" data-testid={`sourcing-unassigned-${depot.toLowerCase()}`}>Not assigned</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

        {amendmentType === "price-lot-change" && priceLotChangeData && (() => {
          const oldLot = PLR_MOCK_LOTS.find(l => l.id === priceLotChangeData.oldLotId);
          const effectiveOldEnd = priceLotChangeData.oldLotInvoicingDeactivDate || oldLot?.validTo || "9999-12-31";
          const hasOverlap = !!oldLot && !!priceLotChangeData.pricingEffectiveDate &&
            effectiveOldEnd >= priceLotChangeData.pricingEffectiveDate;
          return (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Existing Price Lot</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs font-mono">PL-{priceLotChangeData.oldLotId}</Badge>
                    {oldLot && <span className="text-xs font-semibold font-mono">₹{oldLot.mrp.toFixed(2)}</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">New Price Lot</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-mono">
                      PL-{priceLotChangeData.newLotNumber || "NEW"}
                    </Badge>
                    {priceLotChangeData.newMrp && (
                      <span className="text-xs font-semibold font-mono">₹{Number(priceLotChangeData.newMrp).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amendment Scope</p>
                  <Badge className="bg-violet-100 text-violet-700 border border-violet-300 text-xs">
                    {priceLotChangeData.scopeType === "replace"          ? "Replacement (same scope)"
                      : priceLotChangeData.scopeType === "new-channel"   ? "New Channel Extension"
                      : priceLotChangeData.scopeType === "new-geo"       ? "New Region Extension"
                      : "New Region × Channel Extension"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pricing Effective Date</p>
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs font-mono">
                    {priceLotChangeData.pricingEffectiveDate || "—"}
                  </Badge>
                </div>
              </div>
              {hasOverlap && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Overlapping applicability detected between PL-{priceLotChangeData.oldLotId} and PL-{priceLotChangeData.newLotNumber || "NEW"} — Pricing Team will review.
                </div>
              )}
              {priceLotChangeData.newChannels.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">New Channels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {priceLotChangeData.newChannels.map(ch => (
                      <Badge key={ch} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">{ch}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {priceLotChangeData.newGeos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">New Geographies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {priceLotChangeData.newGeos.map(g => (
                      <Badge key={g} className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {priceLotChangeData.newDepots.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Distribution Centres (DCs)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {priceLotChangeData.newDepots.map(dc => (
                      <Badge key={dc} className="bg-sky-100 text-sky-700 border border-sky-300 text-xs font-mono">{dc}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                {priceLotChangeData.oldLotInvoicingDeactivDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Old Lot Invoicing Deactivation</p>
                    <p className="text-xs font-mono">{priceLotChangeData.oldLotInvoicingDeactivDate}</p>
                  </div>
                )}
                {priceLotChangeData.oldLotProductionDeactivDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Old Lot Production Deactivation</p>
                    <p className="text-xs font-mono">{priceLotChangeData.oldLotProductionDeactivDate}</p>
                  </div>
                )}
                {priceLotChangeData.productionEndDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Production End Date</p>
                    <p className="text-xs font-mono">{priceLotChangeData.productionEndDate}</p>
                  </div>
                )}
                {priceLotChangeData.pricingEndDate && priceLotChangeData.pricingEndDate !== "9999-12-31" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Pricing End Date</p>
                    <p className="text-xs font-mono">{priceLotChangeData.pricingEndDate}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Simulated Pricing Status Summary — price-lot-change only */}
      {amendmentType === "price-lot-change" && priceLotChangeData && priceLotChangeData.oldLotId && (() => {
        const oldLot = PLR_MOCK_LOTS.find(l => l.id === priceLotChangeData.oldLotId);
        const effectiveOldEnd = priceLotChangeData.oldLotInvoicingDeactivDate || oldLot?.validTo || "9999-12-31";
        const hasOverlap = !!oldLot && !!priceLotChangeData.pricingEffectiveDate &&
          effectiveOldEnd >= priceLotChangeData.pricingEffectiveDate;
        const allGeos = [
          ...currentGeo,
          ...((priceLotChangeData.scopeType === "new-geo" || priceLotChangeData.scopeType === "new-region-channel")
            ? priceLotChangeData.newGeos : []),
        ];
        const displayChannels = [
          ...currentChannels.slice(0, 5),
          ...((priceLotChangeData.scopeType === "new-channel" || priceLotChangeData.scopeType === "new-region-channel")
            ? priceLotChangeData.newChannels : []),
        ];
        if (allGeos.length === 0) return null;

        const isNewGeo = (geo: string) =>
          (priceLotChangeData.scopeType === "new-geo" || priceLotChangeData.scopeType === "new-region-channel")
          && priceLotChangeData.newGeos.includes(geo);
        const isNewChannel = (ch: string) =>
          (priceLotChangeData.scopeType === "new-channel" || priceLotChangeData.scopeType === "new-region-channel")
          && priceLotChangeData.newChannels.includes(ch);
        // For new-region-channel only the exact intersection (new geo AND new channel) gets PL-NEW.
        // "Half-new" cells (new geo × existing channel, existing geo × new channel) have no lot in this scope.
        const isNewLotCell = (geo: string, ch: string) => {
          if (priceLotChangeData.scopeType === "replace") return true;
          if (priceLotChangeData.scopeType === "new-region-channel") return isNewGeo(geo) && isNewChannel(ch);
          return isNewGeo(geo) || isNewChannel(ch);
        };
        const hasNoLot = (geo: string, ch: string) =>
          priceLotChangeData.scopeType === "new-region-channel" &&
          (isNewGeo(geo) !== isNewChannel(ch)); // XOR — exactly one side is new

        return (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold">Simulated Pricing Status Summary</p>
              <span className="ml-auto text-xs text-muted-foreground">Post-amendment view · Geo × Channel</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/20 border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground min-w-[120px]">Geography</th>
                    {displayChannels.map(ch => (
                      <th key={ch} className={cn(
                        "px-3 py-2 font-medium text-center whitespace-nowrap",
                        isNewChannel(ch) ? "text-emerald-700 bg-emerald-50" : "text-muted-foreground",
                      )}>
                        {ch}
                        {isNewChannel(ch) && (
                          <Badge className="ml-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] px-1 py-0 align-middle">
                            NEW
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allGeos.map((geo, gi) => (
                    <tr key={geo} className={cn("border-b last:border-0", gi % 2 === 0 ? "bg-white" : "bg-muted/5")}>
                      <td className={cn("px-4 py-2.5 font-medium", isNewGeo(geo) ? "text-emerald-700" : "text-foreground")}>
                        <span title={geo}>{geo.length > 20 ? geo.slice(0, 20) + "…" : geo}</span>
                        {isNewGeo(geo) && (
                          <Badge className="ml-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] px-1 py-0">NEW</Badge>
                        )}
                      </td>
                      {displayChannels.map(ch => {
                        const isNew = isNewLotCell(geo, ch);
                        const noLot = hasNoLot(geo, ch);
                        // Overlap only applies when the old lot actually covered this cell.
                        // New-channel and new-geo cells never had the old lot — no overlap.
                        const showOverlap = hasOverlap && !isNewChannel(ch) && !isNewGeo(geo);
                        return (
                          <td key={ch} className={cn(
                            "px-3 py-2.5 text-center font-mono",
                            noLot ? "text-muted-foreground/40 bg-muted/10"
                              : isNew ? "text-amber-700 font-semibold bg-amber-50"
                              : "text-blue-700",
                          )}>
                            {noLot ? (
                              <span className="text-base leading-none">—</span>
                            ) : isNew ? (
                              <span>
                                {showOverlap ? (
                                  <span className="block">
                                    <span className="text-blue-600">PL-{priceLotChangeData.oldLotId}</span>
                                    <span className="text-amber-500">, </span>
                                    <span className="text-amber-700">PL-{priceLotChangeData.newLotNumber || "NEW"}</span>
                                  </span>
                                ) : (
                                  <span className="block">PL-{priceLotChangeData.newLotNumber || "NEW"}</span>
                                )}
                                {priceLotChangeData.newMrp && (
                                  <span className="block text-[10px] font-normal">
                                    {showOverlap ? (
                                      <>
                                        <span className="text-blue-500">₹{oldLot ? oldLot.mrp.toFixed(0) : "—"}</span>
                                        <span className="text-slate-400"> / </span>
                                        <span className="text-amber-600">₹{Number(priceLotChangeData.newMrp).toFixed(0)}</span>
                                      </>
                                    ) : (
                                      <span className="text-amber-600">₹{Number(priceLotChangeData.newMrp).toFixed(0)}</span>
                                    )}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>
                                <span className="block">PL-{priceLotChangeData.oldLotId}</span>
                                {oldLot && (
                                  <span className="block text-[10px] font-normal text-blue-500">
                                    ₹{oldLot.mrp.toFixed(0)}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t bg-muted/10 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-100 inline-block border border-blue-200" />
                Existing lot (unchanged)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" />
                New lot (proposed)
              </span>
              {(priceLotChangeData.newChannels.length > 0 || priceLotChangeData.newGeos.length > 0) && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 inline-block border border-emerald-200" />
                  New scope added
                </span>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* Demand Estimate Upload — all amendment types */}
      <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Demand Estimate
            <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Upload your demand forecast Excel (.xlsx / .xls) to support this amendment request. The file will be reviewed by the Demand Planner.
          </p>
          {demandEstimateFile ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
              data-testid="container-demand-file-attached"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 truncate">{demandEstimateFile.name}</p>
                <p className="text-xs text-emerald-600">
                  {(demandEstimateFile.size / 1024).toFixed(1)} KB · Excel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDemandEstimateFile(null)}
                className="text-emerald-600 hover:text-red-600 transition-colors p-1 rounded"
                data-testid="button-remove-demand-file"
                title="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer py-5 px-4"
              data-testid="dropzone-demand-estimate"
            >
              <Upload className="h-6 w-6 text-muted-foreground/60" />
              <span className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">Click to upload</span> or drag & drop
              </span>
              <span className="text-xs text-muted-foreground">.xlsx or .xls files only</span>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                data-testid="input-demand-estimate-file"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setDemandEstimateFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
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
  sourcingMode?: "decentralized" | "centralized";
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
  sourcingMode,
}: RaiseAmendmentDialogProps) {
  const [step,          setStep]          = useState<Step>("type");
  const [amendmentType, setAmendmentType] = useState<SrType | "">("");
  // Geo-extension wizard sub-step: 1=Geo&Depot, 2=Channel, 3=CustomerChain, 4=SourcingDepot
  const [geoWizardStep, setGeoWizardStep] = useState(1);

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

  // Sourcing amendment: per-geo depot selection (populated when dialog opens)
  const [requestedDepotsByGeo, setRequestedDepotsByGeo] = useState<Record<string, string[]>>({});

  // Initialise depot mapping each time the sourcing-amendment dialog is opened
  useEffect(() => {
    if (open && amendmentType === "sourcing-amendment" && geographyDepotMap) {
      setRequestedDepotsByGeo(
        Object.fromEntries(
          currentGeo.map(geo => [geo, (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d))])
        )
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, amendmentType]);

  // Depot diff for sourcing-amendment SR payload
  const saAddedDepots = useMemo(() => {
    if (amendmentType !== "sourcing-amendment" || !geographyDepotMap) return [];
    return Object.entries(requestedDepotsByGeo).flatMap(([geo, ds]) => {
      const orig = (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d));
      return ds.filter(d => !orig.includes(d));
    });
  }, [amendmentType, requestedDepotsByGeo, geographyDepotMap, currentDepots]);

  const saRemovedDepots = useMemo(() => {
    if (amendmentType !== "sourcing-amendment" || !geographyDepotMap) return [];
    return currentGeo.flatMap(geo => {
      const orig = (geographyDepotMap[geo] || []).filter(d => currentDepots.includes(d));
      const req  = requestedDepotsByGeo[geo] ?? orig;
      return orig.filter(d => !req.includes(d));
    });
  }, [amendmentType, requestedDepotsByGeo, currentGeo, geographyDepotMap, currentDepots]);

  // Customer chain amendment state: full per-geo requested mapping
  const [requestedCustomerMapping, setRequestedCustomerMapping] = useState<Record<string, string[]>>({});

  // Network change date amendment state
  const [requestedDate, setRequestedDate] = useState("");
  const [mstnNote,      setMstnNote]      = useState("");

  const [justification,       setJustification]       = useState("");
  const [effectiveDate,       setEffectiveDate]       = useState("");
  const [demandEstimateFile,  setDemandEstimateFile]  = useState<File | null>(null);
  const [submitting,          setSubmitting]          = useState(false);

  // ── Price Lot Change state ──────────────────────────────────────────────────
  const [plcScopeType,             setPlcScopeType]             = useState<PriceLotChangeData["scopeType"]>("replace");
  const [plcOldLotId,              setPlcOldLotId]              = useState("");
  const [plcNewLotNumber,          setPlcNewLotNumber]          = useState("");
  const [plcNewMrp,                setPlcNewMrp]                = useState("");
  const [plcPricingEffectiveDate,  setPlcPricingEffectiveDate]  = useState("");
  const [plcPricingEndDate,        setPlcPricingEndDate]        = useState("9999-12-31");
  const [plcOldLotInvoicingDeactiv,  setPlcOldLotInvoicingDeactiv]  = useState("");
  const [plcOldLotProductionDeactiv, setPlcOldLotProductionDeactiv] = useState("");
  const [plcProductionEndDate,     setPlcProductionEndDate]     = useState("");
  const [plcNewChannels,           setPlcNewChannels]           = useState<string[]>([]);
  const [plcNewGeos,               setPlcNewGeos]               = useState<string[]>([]);
  const [plcNewDepots,             setPlcNewDepots]             = useState<string[]>([]);
  const [plcRetailerMargin,        setPlcRetailerMargin]        = useState("");
  const [plcRsMargin,              setPlcRsMargin]              = useState("");
  const [plcPriceOff,              setPlcPriceOff]              = useState("");

  const minEffectiveDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const effectiveDateValid = !!effectiveDate && effectiveDate >= minEffectiveDate;

  const currentStepIdx = STEPS.indexOf(step);

  // ── Geo-extension wizard derived values ─────────────────────────────────────
  const MT_CHANNEL_CODES = useMemo(() => ["Ecom", "Qcom", "MT Retail", "CNC"], []);

  // Geos added in this request that have at least one MT sub-channel requested
  const addedMtGeos = useMemo(() =>
    addedGeos.filter(geo =>
      MT_CHANNEL_CODES.some(mc => (requestedChannelMapping[geo] ?? []).includes(mc))
    ),
    [addedGeos, requestedChannelMapping, MT_CHANNEL_CODES],
  );
  const hasCustomerChainStep = addedMtGeos.length > 0;

  // Each added geo must have ≥1 depot ticked (not relevant for remove-only flows)
  const geoAddFlowValid = addedGeos.length === 0 || addedGeos.every(geo => {
    const geoDepots = geographyDepotMap[geo] || [];
    return geoDepots.some(d => addedDepots.includes(d));
  });
  // Step 1 "Next" is valid: at least one change (add or remove) AND add-flow requirements met
  const geoStep1Valid =
    (addedGeos.length > 0 || removedGeos.length > 0 || removedDepots.length > 0) &&
    geoAddFlowValid;

  // Step 4 "Next" is valid: when centralized, all newly added depots must have a sourcing depot assigned
  const geoStep4Valid = (() => {
    if (addedDepots.length === 0) return true;
    const imode = sourcingMode ?? "decentralized";
    if (imode === "decentralized") return true;
    return addedDepots.every(d => !!sourcingDepotMapping[d]);
  })();

  // Navigate within geo wizard, skipping Customer Chain if no MT channels
  const geoWizardNext = () => {
    if (geoWizardStep === 1) {
      // Pre-populate requestedChannelMapping for newly added geos with union of existing channels
      const channelUnion = Array.from(new Set(Object.values(channelMapping).flat()));
      setRequestedChannelMapping(prev => {
        const seeded = { ...prev };
        for (const geo of addedGeos) {
          if (!(geo in seeded)) seeded[geo] = channelUnion;
        }
        return seeded;
      });
    }
    if (geoWizardStep === 2 && !hasCustomerChainStep) { setGeoWizardStep(4); return; }
    if (geoWizardStep === 4) { setStep("summary"); return; }
    setGeoWizardStep(s => s + 1);
  };
  const geoWizardBack = () => {
    if (geoWizardStep === 1) { setStep("type"); setGeoWizardStep(1); return; }
    if (geoWizardStep === 4 && !hasCustomerChainStep) { setGeoWizardStep(2); return; }
    setGeoWizardStep(s => s - 1);
  };

  const hasChanges = useMemo(() => {
    if (amendmentType === "geo-extension")     return addedGeos.length > 0 || removedGeos.length > 0 || removedDepots.length > 0;
    if (amendmentType === "channel-extension") return addedChannels.length > 0 || removedChannels.length > 0;
    if (amendmentType === "sourcing-amendment") {
      if (newMode === "decentralized") return true;
      // Centralized: removals are always valid; additions require all new depots to have sourcing assigned
      const additionsValid = saAddedDepots.length === 0 || saAddedDepots.every(d => !!sourcingDepotMapping[d]);
      return (saAddedDepots.length > 0 || saRemovedDepots.length > 0) && additionsValid;
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
    if (amendmentType === "price-lot-change") {
      const needsGeos = plcScopeType === "new-geo" || plcScopeType === "new-region-channel";
      // For each new geo, at least one of its depots must be selected
      const dcsCoverAllGeos = !needsGeos || plcNewGeos.every(geo => {
        const available = GEOGRAPHY_DEPOT_MAP[geo] || [];
        return available.length === 0 || available.some(d => plcNewDepots.includes(d));
      });
      const scopeOk =
        (plcScopeType === "replace"            && !!plcOldLotId) ||
        (plcScopeType === "new-channel"         && plcNewChannels.length > 0) ||
        (plcScopeType === "new-geo"             && plcNewGeos.length > 0 && dcsCoverAllGeos) ||
        (plcScopeType === "new-region-channel"  && (plcNewChannels.length > 0 || plcNewGeos.length > 0) && dcsCoverAllGeos);
      const mrpOk = plcScopeType !== "replace" || !!plcNewMrp;
      return !!plcPricingEffectiveDate && mrpOk && scopeOk;
    }
    return false;
  }, [amendmentType, addedGeos, removedGeos, removedDepots, addedChannels, removedChannels, newMode, sourcingDepotMapping, saAddedDepots, saRemovedDepots, currentDepots, mtGeos, customerMapping, requestedCustomerMapping, requestedDate, currentNetworkChangeDate, plcOldLotId, plcNewMrp, plcPricingEffectiveDate, plcScopeType, plcNewChannels, plcNewGeos, plcNewDepots]);

  const reset = () => {
    setStep("type");
    setAmendmentType("");
    setGeoWizardStep(1);
    setAddedGeos([]);
    setAddedDepots([]);
    setRequestedChannelMapping({});
    setRemovedGeos([]);
    setRemovedDepots([]);
    setNewMode("decentralized");
    setSourcingDepotMapping({});
    setRequestedDepotsByGeo({});
    setRequestedCustomerMapping({});
    setRequestedDate("");
    setMstnNote("");
    setJustification("");
    setEffectiveDate("");
    setDemandEstimateFile(null);
    setPlcScopeType("replace");
    setPlcOldLotId("");
    setPlcNewLotNumber("");
    setPlcNewMrp("");
    setPlcPricingEffectiveDate("");
    setPlcPricingEndDate("9999-12-31");
    setPlcOldLotInvoicingDeactiv("");
    setPlcOldLotProductionDeactiv("");
    setPlcProductionEndDate("");
    setPlcNewChannels([]);
    setPlcNewGeos([]);
    setPlcNewDepots([]);
    setPlcRetailerMargin("");
    setPlcRsMargin("");
    setPlcPriceOff("");
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
      // Append channel summary per added geo
      const chParts = addedGeos
        .map(geo => { const chs = requestedChannelMapping[geo] ?? []; return chs.length > 0 ? `${geo}: [${chs.join(", ")}]` : null; })
        .filter(Boolean);
      if (chParts.length > 0) requestedValue += `; Channels: ${chParts.join("; ")}`;
      // Append sourcing info
      const geoSMode = sourcingMode ?? "decentralized";
      if (geoSMode === "centralized" && Object.keys(sourcingDepotMapping).length > 0) {
        const pairs = Object.entries(sourcingDepotMapping).map(([d, s]) => `${d}→${s}`).join(", ");
        requestedValue += `; Sourcing: Centralized (${pairs})`;
      } else if (geoSMode === "decentralized") {
        requestedValue += "; Sourcing: Decentralized";
      }

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
      if (saAddedDepots.length > 0)   requestedValue += `; Adding Depots: ${saAddedDepots.join(", ")}`;
      if (saRemovedDepots.length > 0) requestedValue += `; Removing Depots: ${saRemovedDepots.join(", ")}`;
    } else if (amendmentType === "customer-chain-amendment") {
      currentValue = mtGeos.map(g => `${g}: ${(customerMapping[g] || []).join(", ") || "None"}`).join("; ");
      requestedValue = mtGeos.map(g => `${g}: ${(requestedCustomerMapping[g] ?? customerMapping[g] ?? []).join(", ") || "None"}`).join("; ");
    } else if (amendmentType === "network-change-date-amendment") {
      currentValue = currentNetworkChangeDate || "Not set";
      requestedValue = requestedDate;
    } else if (amendmentType === "price-lot-change") {
      const oldLot = PLR_MOCK_LOTS.find(l => l.id === plcOldLotId);
      currentValue = oldLot
        ? `PL-${plcOldLotId} — MRP ₹${oldLot.mrp} (${oldLot.scopeDesc})`
        : "No existing lot selected for deactivation";
      const scopeLabel =
        plcScopeType === "replace"            ? "Replacement (same scope)" :
        plcScopeType === "new-channel"        ? `New channels: ${plcNewChannels.join(", ")}` :
        plcScopeType === "new-geo"            ? `New regions: ${plcNewGeos.join(", ")}` :
        `New region × channel — Regions: ${plcNewGeos.join(", ")}; Channels: ${plcNewChannels.join(", ")}`;
      requestedValue = `PL-NEW — Start ${plcPricingEffectiveDate}${plcPricingEndDate && plcPricingEndDate !== "9999-12-31" ? ` to ${plcPricingEndDate}` : ""}${plcNewMrp ? `; MRP ₹${plcNewMrp}` : ""}; Scope: ${scopeLabel}`;
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
      addedGeos: amendmentType === "geo-extension" ? addedGeos
        : (amendmentType === "price-lot-change" && (plcScopeType === "new-geo" || plcScopeType === "new-region-channel")) ? plcNewGeos
        : [],
      addedDepots: amendmentType === "geo-extension" ? addedDepots
        : amendmentType === "sourcing-amendment" ? saAddedDepots
        : (amendmentType === "price-lot-change" && (plcScopeType === "new-geo" || plcScopeType === "new-region-channel")) ? plcNewDepots
        : [],
      addedChannels: amendmentType === "channel-extension" ? addedChannels : [],
      removedChannels: amendmentType === "channel-extension" ? removedChannels : [],
      requestedChannelMapping: (amendmentType === "channel-extension" || amendmentType === "geo-extension") ? requestedChannelMapping : undefined,
      removedGeos: amendmentType === "geo-extension" ? removedGeos : [],
      removedDepots: amendmentType === "geo-extension" ? removedDepots : amendmentType === "sourcing-amendment" ? saRemovedDepots : [],
      sourcingMode: amendmentType === "sourcing-amendment" ? newMode : amendmentType === "geo-extension" ? (sourcingMode ?? "decentralized") : undefined,
      sourcingDepotMapping: (amendmentType === "sourcing-amendment" || amendmentType === "geo-extension") ? sourcingDepotMapping : undefined,
      centralizedGeos: [],
      centralizedDepots: [],
      requestedCustomerMapping: (amendmentType === "customer-chain-amendment" || amendmentType === "geo-extension") ? requestedCustomerMapping : undefined,
      requestedDate: amendmentType === "network-change-date-amendment" ? requestedDate : undefined,
      currentNetworkChangeDate: amendmentType === "network-change-date-amendment" ? currentNetworkChangeDate : undefined,
      effectiveDate,
    };

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
        {amendmentType === "geo-extension" && step !== "type" ? (
          // 5-step geo-extension wizard indicator
          <div className="flex items-center gap-1 text-xs overflow-x-auto pb-0.5">
            {[
              { n: 1, label: "Geo & Depot" },
              { n: 2, label: "Channel" },
              { n: 3, label: "Customer Chain", skip: !hasCustomerChainStep && geoWizardStep !== 3 },
              { n: 4, label: "Sourcing Depot" },
              { n: 5, label: "Review" },
            ].map(({ n, label, skip }, i, arr) => {
              const wizCurrentStep = step === "summary" ? 5 : geoWizardStep;
              const active  = wizCurrentStep === n;
              const done    = wizCurrentStep > n;
              return (
                <span key={n} className="flex items-center gap-1 shrink-0">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    active ? "bg-blue-500 text-white"
                    : done  ? "bg-emerald-500 text-white"
                    : skip  ? "bg-muted/40 text-muted-foreground/40"
                    : "bg-muted text-muted-foreground",
                  )}>
                    {done ? "✓" : n}
                  </span>
                  <span className={cn(
                    "hidden sm:inline whitespace-nowrap",
                    active ? "font-medium text-foreground"
                    : skip  ? "text-muted-foreground/40"
                    : "text-muted-foreground",
                  )}>
                    {label}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          // Standard 3-step indicator for all other amendment types
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
        )}

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

          {/* ── Geo-extension wizard sub-steps ── */}
          {step === "edit" && amendmentType === "geo-extension" && geoWizardStep === 1 && (
            <div className="space-y-2">
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
              {addedGeos.length > 0 && !geoAddFlowValid && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" data-testid="hint-geo-depot-required">
                  Select at least one depot for each added geography to proceed.
                </p>
              )}
            </div>
          )}

          {step === "edit" && amendmentType === "geo-extension" && geoWizardStep === 2 && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Select channels for each newly added geography. Existing geographies and their channels are unchanged.
              </div>
              <ChannelEditor
                leafChannels={leafChannels}
                currentGeo={addedGeos}
                channelMapping={{}}
                requestedChannelMapping={requestedChannelMapping}
                setRequestedChannelMapping={setRequestedChannelMapping}
              />
            </div>
          )}

          {step === "edit" && amendmentType === "geo-extension" && geoWizardStep === 3 && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Configure customer chains for newly added geographies that have MT sub-channels selected.
              </div>
              <CustomerChainEditor
                mtGeos={addedMtGeos}
                channelMapping={requestedChannelMapping}
                customerMapping={{}}
                requestedCustomerMapping={requestedCustomerMapping}
                setRequestedCustomerMapping={setRequestedCustomerMapping}
              />
            </div>
          )}

          {step === "edit" && amendmentType === "geo-extension" && geoWizardStep === 4 && (
            <div className="space-y-3">
              {addedDepots.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No new depots were added — sourcing configuration is not required.
                </div>
              ) : (
                <SourcingEditor
                  currentGeo={addedGeos}
                  currentDepots={addedDepots}
                  newMode={newMode}
                  setNewMode={setNewMode}
                  sourcingDepotMapping={sourcingDepotMapping}
                  setSourcingDepotMapping={setSourcingDepotMapping}
                  inheritedMode={sourcingMode ?? "decentralized"}
                  availableSourcingDepots={[...currentDepots, ...addedDepots]}
                />
              )}
            </div>
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
              geographyDepotMap={geographyDepotMap}
              onDepotMappingChange={setRequestedDepotsByGeo}
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

          {step === "edit" && amendmentType === "price-lot-change" && (
            <PriceLotEditor
              currentGeo={currentGeo}
              currentChannels={currentChannels}
              leafChannels={leafChannels}
              clusters={clusters}
              scopeType={plcScopeType}
              setScopeType={setPlcScopeType}
              oldLotId={plcOldLotId}
              setOldLotId={setPlcOldLotId}
              newMrp={plcNewMrp}
              setNewMrp={setPlcNewMrp}
              pricingEffectiveDate={plcPricingEffectiveDate}
              setPricingEffectiveDate={setPlcPricingEffectiveDate}
              pricingEndDate={plcPricingEndDate}
              setPricingEndDate={setPlcPricingEndDate}
              oldLotInvoicingDeactivDate={plcOldLotInvoicingDeactiv}
              setOldLotInvoicingDeactivDate={setPlcOldLotInvoicingDeactiv}
              oldLotProductionDeactivDate={plcOldLotProductionDeactiv}
              setOldLotProductionDeactivDate={setPlcOldLotProductionDeactiv}
              newChannels={plcNewChannels}
              setNewChannels={setPlcNewChannels}
              newGeos={plcNewGeos}
              setNewGeos={setPlcNewGeos}
              newDepots={plcNewDepots}
              setNewDepots={setPlcNewDepots}
              retailerMargin={plcRetailerMargin}
              setRetailerMargin={setPlcRetailerMargin}
              rsMargin={plcRsMargin}
              setRsMargin={setPlcRsMargin}
              priceOff={plcPriceOff}
              setPriceOff={setPlcPriceOff}
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
              demandEstimateFile={demandEstimateFile}
              setDemandEstimateFile={setDemandEstimateFile}
              priceLotChangeData={amendmentType === "price-lot-change" ? {
                scopeType: plcScopeType,
                oldLotId: plcOldLotId,
                newLotNumber: plcNewLotNumber,
                newMrp: plcNewMrp,
                pricingEffectiveDate: plcPricingEffectiveDate,
                pricingEndDate: plcPricingEndDate,
                oldLotInvoicingDeactivDate: plcOldLotInvoicingDeactiv,
                oldLotProductionDeactivDate: plcOldLotProductionDeactiv,
                productionEndDate: plcProductionEndDate,
                newChannels: plcNewChannels,
                newGeos: plcNewGeos,
                newDepots: plcNewDepots,
                retailerMargin: plcRetailerMargin,
                rsMargin: plcRsMargin,
                priceOff: plcPriceOff,
              } : undefined}
              geoSourcingMode={amendmentType === "geo-extension" ? (sourcingMode ?? "decentralized") : undefined}
              geographyDepotMap={amendmentType === "geo-extension" ? geographyDepotMap : undefined}
            />
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 pt-1 border-t">
          {/* Back button — geo-extension wizard */}
          {amendmentType === "geo-extension" && step === "edit" && (
            <Button variant="outline" onClick={geoWizardBack} className="gap-1" data-testid="button-geo-wizard-back">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {/* Back button — standard flow */}
          {amendmentType !== "geo-extension" && currentStepIdx > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[currentStepIdx - 1])}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {/* Back from summary — geo-extension returns to wizard step 4 */}
          {amendmentType === "geo-extension" && step === "summary" && (
            <Button
              variant="outline"
              onClick={() => { setStep("edit"); setGeoWizardStep(4); }}
              className="gap-1"
              data-testid="button-geo-wizard-back-from-review"
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
              onClick={() => { setGeoWizardStep(1); setStep("edit"); }}
              className="gap-1"
              data-testid="button-continue-type"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Next button — geo-extension wizard sub-steps 1-4 */}
          {step === "edit" && amendmentType === "geo-extension" && (
            <Button
              disabled={(geoWizardStep === 1 && !geoStep1Valid) || (geoWizardStep === 4 && !geoStep4Valid)}
              onClick={geoWizardNext}
              className="gap-1"
              data-testid={`button-geo-wizard-next-${geoWizardStep}`}
            >
              {geoWizardStep === 4 ? "Review Changes" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Next button — all other amendment types */}
          {step === "edit" && amendmentType !== "geo-extension" && (
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
