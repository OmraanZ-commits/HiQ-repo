/**
 * ReassignmentDialog
 * Shown when an admin makes a change that affects a Network Planner's assigned entries:
 *   - Role changed away from Network Planner
 *   - Business Group changed (entries live in the old BG)
 *   - User deactivated
 *
 * Supports:
 *   - Bulk mode   : pick one planner → reassign all entries
 *   - Individual  : pick a different planner per entry
 */
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Users,
  Layers,
  CheckCircle2,
  ArrowRight,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type NetworkEntry } from "@shared/schema";
import { type PortalUser } from "@/lib/users-data";

/* ── Types ─────────────────────────────────────────────────────── */

export type ReassignTrigger = "role-change" | "bg-change" | "deactivation";

export interface ReassignmentDialogProps {
  open: boolean;
  /** Proceed without reassigning (entries stay orphaned) */
  onSkip: () => void;
  /** Confirm with the map of entryId → new assignee name */
  onConfirm: (assignments: Record<string, string>) => void;
  affectedEntries: NetworkEntry[];
  availablePlanners: PortalUser[];
  trigger: ReassignTrigger;
  userName: string;
  isPending?: boolean;
}

/* ── Status badge colours ───────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  Draft:                        "bg-slate-100 text-slate-600",
  Active:                       "bg-blue-50 text-blue-700",
  "Pricing Updated":            "bg-cyan-50 text-cyan-700",
  "Production Started":         "bg-violet-50 text-violet-700",
  "FTR Approved":               "bg-amber-50 text-amber-700",
  "Stock Movement Initiated":   "bg-orange-50 text-orange-700",
};

function StatusPill({ status }: { status: string | null }) {
  const cls = STATUS_COLOR[status ?? ""] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
      {status ?? "Unknown"}
    </span>
  );
}

/* ── Trigger description ────────────────────────────────────────── */

function triggerMessage(trigger: ReassignTrigger, userName: string): string {
  switch (trigger) {
    case "role-change":
      return `${userName}'s role has been changed from Network Planner. They are still assigned to the following incomplete networks.`;
    case "bg-change":
      return `${userName}'s Business Group has been changed. They are still assigned to incomplete networks in the previous BG.`;
    case "deactivation":
      return `${userName} has been deactivated. They are still assigned to the following incomplete networks.`;
  }
}

/* ── Planner option ─────────────────────────────────────────────── */

function PlannerSelect({
  value,
  onChange,
  planners,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  planners: PortalUser[];
  placeholder?: string;
  testId?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs" data-testid={testId}>
        <SelectValue placeholder={placeholder ?? "Select planner…"} />
      </SelectTrigger>
      <SelectContent>
        {planners.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No planners available</div>
        ) : (
          planners.map((p) => (
            <SelectItem key={p.id} value={p.name} data-testid={`option-reassign-${p.id}`}>
              <div className="flex items-center gap-1.5">
                <span>{p.name}</span>
                {p.isBgLead && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/* ── Main dialog ────────────────────────────────────────────────── */

export function ReassignmentDialog({
  open,
  onSkip,
  onConfirm,
  affectedEntries,
  availablePlanners,
  trigger,
  userName,
  isPending,
}: ReassignmentDialogProps) {
  const [mode, setMode] = useState<"bulk" | "individual">("bulk");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [individual, setIndividual] = useState<Record<string, string>>({});

  const allAssigned = useMemo(() => {
    if (mode === "bulk") return !!bulkAssignee;
    return affectedEntries.every((e) => !!individual[e.id]);
  }, [mode, bulkAssignee, individual, affectedEntries]);

  const handleConfirm = () => {
    const assignments: Record<string, string> = {};
    if (mode === "bulk") {
      affectedEntries.forEach((e) => { assignments[e.id] = bulkAssignee; });
    } else {
      affectedEntries.forEach((e) => { assignments[e.id] = individual[e.id] ?? ""; });
    }
    onConfirm(assignments);
  };

  const setAll = (name: string) => {
    const map: Record<string, string> = {};
    affectedEntries.forEach((e) => { map[e.id] = name; });
    setIndividual(map);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            Reassignment Required
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {triggerMessage(trigger, userName)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1">
          {/* Stats bar */}
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
            <Layers className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              {affectedEntries.length} incomplete {affectedEntries.length === 1 ? "network" : "networks"} need reassignment
            </span>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            {(["bulk", "individual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                data-testid={`tab-reassign-${m}`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "bulk" ? <Users className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                {m === "bulk" ? "Bulk Assign" : "Individual"}
              </button>
            ))}
          </div>

          {/* Bulk mode */}
          {mode === "bulk" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Reassign all to</p>
                  <PlannerSelect
                    value={bulkAssignee}
                    onChange={(v) => { setBulkAssignee(v); setAll(v); }}
                    planners={availablePlanners}
                    placeholder="Select a Network Planner…"
                    testId="select-bulk-assignee"
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-sm text-muted-foreground">
                  {affectedEntries.length} {affectedEntries.length === 1 ? "entry" : "entries"}
                </div>
              </div>
            </div>
          )}

          {/* Individual mode */}
          {mode === "individual" && (
            <div className="space-y-1.5">
              {/* Quick-fill header */}
              <div className="flex items-center gap-2 pb-1">
                <span className="text-xs text-muted-foreground flex-1">Set a planner for each entry, or use quick-fill:</span>
                <div className="w-48">
                  <PlannerSelect
                    value=""
                    onChange={(v) => setAll(v)}
                    planners={availablePlanners}
                    placeholder="Apply to all…"
                    testId="select-apply-all"
                  />
                </div>
              </div>

              {/* Per-entry rows */}
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_180px] gap-0 px-3 py-2 bg-muted/40 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Network Entry</span>
                  <span>Assign To</span>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {affectedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[1fr_180px] gap-3 items-center px-3 py-2.5"
                      data-testid={`row-reassign-entry-${entry.id}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium font-mono truncate">{entry.cbuCode ?? entry.id.slice(0, 8)}</span>
                          <StatusPill status={entry.networkStatus} />
                          {individual[entry.id] && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {entry.materialDescription ?? "—"}
                        </p>
                      </div>
                      <PlannerSelect
                        value={individual[entry.id] ?? ""}
                        onChange={(v) => setIndividual((p) => ({ ...p, [entry.id]: v }))}
                        planners={availablePlanners}
                        testId={`select-assignee-${entry.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No planners warning */}
          {availablePlanners.length === 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              No active Network Planners are available in this Business Group. You can skip reassignment and update assignments later.
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-2 border-t gap-2">
          <Button
            variant="ghost"
            onClick={onSkip}
            data-testid="button-reassign-skip"
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allAssigned || isPending || availablePlanners.length === 0}
            data-testid="button-reassign-confirm"
            className="bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] text-white hover:opacity-90"
          >
            {isPending ? "Reassigning…" : `Confirm & Reassign ${affectedEntries.length > 1 ? `(${affectedEntries.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
