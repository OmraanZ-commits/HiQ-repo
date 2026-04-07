import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  AlertTriangle,
  Users,
  LayoutList,
  CheckCircle2,
  Crown,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type NetworkEntry } from "@shared/schema";
import { type PortalUser } from "@/lib/users-data";

/* ── Types ─────────────────────────────────────────────────────── */

export type ReassignTrigger = "role-change" | "bg-change" | "deactivation";

export interface ReassignmentDialogProps {
  open: boolean;
  /** Cancel — closes dialog WITHOUT applying the pending user change */
  onCancel: () => void;
  /** Confirm with the map of entryId → new assignee name */
  onConfirm: (assignments: Record<string, string>) => void;
  affectedEntries: NetworkEntry[];
  availablePlanners: PortalUser[];
  trigger: ReassignTrigger;
  userName: string;
  isPending?: boolean;
}

/* ── Status colours ─────────────────────────────────────────────── */

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  Draft:                       { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  Active:                      { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  "Pricing Updated":           { bg: "bg-cyan-50",    text: "text-cyan-700",   dot: "bg-cyan-500"   },
  "Production Started":        { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500" },
  "FTR Approved":              { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500"  },
  "Stock Movement Initiated":  { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-500" },
};

function StatusPill({ status }: { status: string | null }) {
  const m = STATUS_META[status ?? ""] ?? { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", m.bg, m.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", m.dot)} />
      {status ?? "Unknown"}
    </span>
  );
}

/* ── Trigger banner ─────────────────────────────────────────────── */

function triggerLabel(trigger: ReassignTrigger): string {
  switch (trigger) {
    case "role-change":  return "Role Changed";
    case "bg-change":    return "Business Group Changed";
    case "deactivation": return "User Deactivated";
  }
}

function triggerBody(trigger: ReassignTrigger, userName: string): string {
  switch (trigger) {
    case "role-change":
      return `${userName} is no longer a Network Planner. The networks below are still assigned to them and need a new owner before the change is saved.`;
    case "bg-change":
      return `${userName}'s Business Group has changed. The networks below belong to the previous BG and still show them as assignee.`;
    case "deactivation":
      return `${userName} is being deactivated. Please reassign the networks below to an active Network Planner before proceeding.`;
  }
}

/* ── Planner Select ─────────────────────────────────────────────── */

function PlannerSelect({
  value,
  onChange,
  planners,
  placeholder = "Select planner…",
  testId,
  size = "default",
}: {
  value: string;
  onChange: (v: string) => void;
  planners: PortalUser[];
  placeholder?: string;
  testId?: string;
  size?: "default" | "sm";
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(size === "sm" ? "h-8 text-xs" : "h-9 text-sm")}
        data-testid={testId}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {planners.length === 0 ? (
          <div className="px-3 py-2.5 text-xs text-muted-foreground italic">No planners available in this BG</div>
        ) : (
          planners.map((p) => (
            <SelectItem key={p.id} value={p.name} data-testid={`option-reassign-${p.id}`}>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#1f36c7] to-[#0d8ecf] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {p.name.charAt(0)}
                </div>
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

/* ── Assigned avatar chip ───────────────────────────────────────── */

function AssignedChip({ name }: { name: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
      <div className="h-4 w-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
        {name.charAt(0)}
      </div>
      <span className="text-[11px] font-medium text-emerald-700 max-w-[100px] truncate">{name}</span>
      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
    </div>
  );
}

/* ── Main dialog ────────────────────────────────────────────────── */

export function ReassignmentDialog({
  open,
  onCancel,
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

  const assignedCount = useMemo(() => {
    if (mode === "bulk") return bulkAssignee ? affectedEntries.length : 0;
    return affectedEntries.filter((e) => !!individual[e.id]).length;
  }, [mode, bulkAssignee, individual, affectedEntries]);

  const allAssigned = assignedCount === affectedEntries.length;

  const handleConfirm = () => {
    const assignments: Record<string, string> = {};
    affectedEntries.forEach((e) => {
      assignments[e.id] = mode === "bulk" ? bulkAssignee : (individual[e.id] ?? "");
    });
    onConfirm(assignments);
  };

  const applyToAll = (name: string) => {
    const map: Record<string, string> = {};
    affectedEntries.forEach((e) => { map[e.id] = name; });
    setIndividual(map);
  };

  const noPlanners = availablePlanners.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent
        className="flex flex-col p-0 gap-0 overflow-hidden rounded-xl [&>button]:text-white [&>button]:bg-white/20 [&>button]:rounded-full [&>button]:p-1 [&>button]:opacity-90 [&>button:hover]:bg-white/35 [&>button:hover]:opacity-100"
        style={{ maxWidth: "780px", width: "95vw", maxHeight: "88vh" }}
      >
        {/* ── Header banner ─────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 shrink-0">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white font-bold text-lg leading-tight mb-0.5">
                Reassignment Required — {triggerLabel(trigger)}
              </DialogTitle>
              <DialogDescription className="text-amber-100 text-sm leading-relaxed">
                {triggerBody(trigger, userName)}
              </DialogDescription>
            </div>
          </div>

          {/* Progress pill */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${affectedEntries.length ? (assignedCount / affectedEntries.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-white shrink-0">
              {assignedCount} / {affectedEntries.length} reassigned
            </span>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit border">
            {(["bulk", "individual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                data-testid={`tab-reassign-${m}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  mode === m
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "bulk"
                  ? <Users className="h-4 w-4" />
                  : <LayoutList className="h-4 w-4" />
                }
                {m === "bulk" ? "Bulk Assign" : "Assign Individually"}
              </button>
            ))}
          </div>

          {/* ── Bulk mode ───────────────────────────────────── */}
          {mode === "bulk" && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Reassign all {affectedEntries.length} entries to</span>
                </div>
                <PlannerSelect
                  value={bulkAssignee}
                  onChange={(v) => { setBulkAssignee(v); applyToAll(v); }}
                  planners={availablePlanners}
                  placeholder="Choose a Network Planner…"
                  testId="select-bulk-assignee"
                />
              </div>

              {/* Preview list */}
              <div className="rounded-xl border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entries to be reassigned
                  </span>
                  <span className="text-xs text-muted-foreground">{affectedEntries.length} total</span>
                </div>
                <div className="divide-y overflow-y-auto" style={{ maxHeight: "320px" }}>
                  {affectedEntries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={cn("flex items-center gap-4 px-4 py-3", i % 2 === 0 ? "bg-background" : "bg-muted/20")}
                      data-testid={`row-reassign-entry-${entry.id}`}
                    >
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border flex items-center justify-center shrink-0">
                        <CircleDot className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold font-mono">{entry.cbuCode ?? entry.id.slice(0, 8)}</span>
                          <StatusPill status={entry.networkStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {entry.materialDescription ?? "—"}
                        </p>
                      </div>
                      {bulkAssignee
                        ? <AssignedChip name={bulkAssignee} />
                        : <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Individual mode ─────────────────────────────── */}
          {mode === "individual" && (
            <div className="space-y-3">
              {/* Quick-fill strip */}
              <div className="flex items-center gap-3 rounded-xl border bg-blue-50/60 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800">Quick-fill</p>
                  <p className="text-[11px] text-blue-600">Apply one planner to all entries, then fine-tune below</p>
                </div>
                <div className="w-52 shrink-0">
                  <PlannerSelect
                    value=""
                    onChange={(v) => applyToAll(v)}
                    planners={availablePlanners}
                    placeholder="Apply to all…"
                    testId="select-apply-all"
                    size="sm"
                  />
                </div>
              </div>

              {/* Entry table */}
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_200px] gap-0 px-4 py-2.5 bg-muted/50 border-b">
                  <div />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Network Entry</span>
                  <div />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assign To</span>
                </div>
                <div className="divide-y overflow-y-auto" style={{ maxHeight: "360px" }}>
                  {affectedEntries.map((entry, i) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "grid grid-cols-[auto_1fr_auto_200px] gap-3 items-center px-4 py-3",
                        i % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                      data-testid={`row-reassign-entry-${entry.id}`}
                    >
                      {/* Row number */}
                      <div className="h-6 w-6 rounded-md bg-muted border text-[11px] font-bold text-muted-foreground flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>

                      {/* Entry info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold font-mono">{entry.cbuCode ?? entry.id.slice(0, 8)}</span>
                          <StatusPill status={entry.networkStatus} />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {entry.materialDescription ?? "—"}
                        </p>
                      </div>

                      {/* Checkmark */}
                      <div className="w-5 flex justify-center shrink-0">
                        {individual[entry.id]
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        }
                      </div>

                      {/* Planner picker */}
                      <PlannerSelect
                        value={individual[entry.id] ?? ""}
                        onChange={(v) => setIndividual((p) => ({ ...p, [entry.id]: v }))}
                        planners={availablePlanners}
                        testId={`select-assignee-${entry.id}`}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No planners warning */}
          {noPlanners && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                No active Network Planners are available in this Business Group. Cancel and add a planner first, or update assignments manually later.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="shrink-0 border-t bg-muted/30 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="button-reassign-cancel"
            className="min-w-[100px]"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {!noPlanners && !allAssigned && (
              <span className="text-xs text-muted-foreground">
                {affectedEntries.length - assignedCount} remaining
              </span>
            )}
            <Button
              onClick={handleConfirm}
              disabled={!allAssigned || isPending || noPlanners}
              data-testid="button-reassign-confirm"
              className="bg-gradient-to-r from-[#1f36c7] to-[#0d8ecf] text-white hover:opacity-90 min-w-[180px]"
            >
              {isPending
                ? "Reassigning…"
                : `Confirm & Reassign (${affectedEntries.length})`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
