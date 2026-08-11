import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Zap,
  RefreshCw,
  GitCompareArrows,
  User,
  MapPin,
  Layers,
  Info,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnileverHeader } from "@/components/unilever-header";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  ccrLineItemId: string;
  eventType: string;
  actor: string;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
}

interface CcrLineItem {
  id: string;
  predecessorCbuCode: string | null;
  successorCbuCode: string | null;
  customerChain: string;
  customerCode: string;
  cic: string | null;
  cicDescription: string | null;
  triggerStage: string;
  urgencyColor: string;
  ccrStatus: string;
  rulesetOutcome: Record<string, unknown> | null;
  overrides: unknown;
  escalationDueAt: string | null;
  escalatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  auditLog: AuditLogEntry[];
  newCicRequired: boolean;
  contentUpdateRequired: boolean;
  rundownRequired: boolean;
}

interface NetworkEntry {
  id: string;
  cbuCode: string | null;
  basepack: string | null;
  materialDescription: string | null;
  typeOfNetwork: string | null;
  networkStatus: string | null;
  successorDoh: number | null;
  predecessorCode: string | null;
}

interface RulesetEntry {
  id: string;
  networkChangeType: string;
  newCicRequired: boolean;
  contentUpdateRequired: boolean;
  rundownRequired: boolean;
  autoCcr: boolean;
  notes: string | null;
}

interface Recommendation {
  itemId: string;
  currentCbu: {
    cbuCode: string | null;
    basepack: string | null;
    description: string | null;
    atpScore: number;
  };
  alternates: {
    cbuCode: string;
    basepack: string | null;
    description: string | null;
    atpScore: number;
    networkStatus: string | null;
  }[];
  scenario: "A" | "B" | "C";
  rationale: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_STAGE_LABEL: Record<string, string> = {
  None:   "—",
  First:  "Production Started",
  Second: "Post FTR Clearance",
  Third:  "Stock Movement Initiated",
  Fourth: "Inventory Threshold Breached",
};

const TRIGGER_STAGE_COLOR: Record<string, string> = {
  None:   "bg-slate-50 text-slate-500 border-slate-200",
  First:  "bg-amber-50 text-amber-700 border-amber-300",
  Second: "bg-amber-50 text-amber-700 border-amber-300",
  Third:  "bg-red-50 text-red-700 border-red-300",
  Fourth: "bg-rose-100 text-rose-800 border-rose-400",
};

const URGENCY_DOT: Record<string, string> = {
  None: "bg-slate-300",
  Amber: "bg-amber-400",
  Red: "bg-red-500",
  "Blinking Red": "bg-red-600 animate-pulse",
};

const CCR_STATUS_COLOR: Record<string, string> = {
  "Action Required": "bg-red-50 text-red-700 border-red-300",
  Upcoming: "bg-sky-50 text-sky-700 border-sky-300",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

const EVENT_ICON: Record<string, typeof CheckCircle2> = {
  executed: CheckCircle2,
  "delisting_accept": CheckCircle2,
  "delisting_reject": AlertTriangle,
  note: Info,
};

function formatTs(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── UrgencyDot ──────────────────────────────────────────────────────────────

function UrgencyDot({ color }: { color: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${URGENCY_DOT[color] ?? "bg-slate-300"}`}
    />
  );
}

// ─── Audit Timeline ───────────────────────────────────────────────────────────

function AuditTimeline({ logs }: { logs: AuditLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No audit events yet.
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {logs.map((log, idx) => {
        const Icon = EVENT_ICON[log.eventType] ?? Info;
        const isLast = idx === logs.length - 1;
        return (
          <li key={log.id} className="flex gap-3" data-testid={`audit-entry-${log.id}`}>
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border border-border shrink-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
            </div>
            <div className="pb-4 min-w-0">
              <p className="text-xs font-semibold capitalize leading-tight">
                {log.eventType.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground">{log.actor} · {formatTs(log.createdAt)}</p>
              {log.payload && (
                <div className="mt-1 rounded bg-muted/60 px-2 py-1.5 text-[10px] text-muted-foreground break-words max-w-xs">
                  {log.payload.justification && (
                    <p>"{String(log.payload.justification)}"</p>
                  )}
                  {log.payload.cicCode && (
                    <p>CIC: <span className="font-mono">{String(log.payload.cicCode)}</span></p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Recommendation Panel ────────────────────────────────────────────────────

function RecommendationPanel({ itemId }: { itemId: string }) {
  const { data: rec, isLoading } = useQuery<Recommendation>({
    queryKey: [`/api/ccr/line-items/${itemId}/recommendation`],
    queryFn: () =>
      fetch(`/api/ccr/line-items/${itemId}/recommendation`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <RefreshCw className="h-3 w-3 animate-spin" /> Analysing…
      </div>
    );
  }
  if (!rec) return null;

  const scenarioColor: Record<string, string> = {
    A: "bg-emerald-50 text-emerald-700 border-emerald-300",
    B: "bg-amber-50 text-amber-700 border-amber-300",
    C: "bg-rose-50 text-rose-700 border-rose-300",
  };
  const scenarioLabel: Record<string, string> = {
    A: "Scenario A — Retain",
    B: "Scenario B — Switch Alternate",
    C: "Scenario C — Manual Review",
  };

  return (
    <div className="space-y-3" data-testid="recommendation-panel">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs font-semibold ${scenarioColor[rec.scenario]}`}
          data-testid="badge-scenario"
        >
          <Zap className="h-3 w-3 mr-1" />
          {scenarioLabel[rec.scenario]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>

      <div className="rounded border border-border text-xs">
        <div className="px-3 py-2 bg-muted/50 font-medium text-xs border-b border-border">
          Current Successor
        </div>
        <div className="px-3 py-2 grid grid-cols-2 gap-1">
          <span className="text-muted-foreground">CBU</span>
          <span className="font-mono">{rec.currentCbu.cbuCode ?? "—"}</span>
          <span className="text-muted-foreground">Basepack</span>
          <span>{rec.currentCbu.basepack ?? "—"}</span>
          <span className="text-muted-foreground">DOH (ATP proxy)</span>
          <span className="font-semibold">{rec.currentCbu.atpScore}</span>
        </div>
      </div>

      {rec.alternates.length > 0 && (
        <div className="rounded border border-border text-xs">
          <div className="px-3 py-2 bg-muted/50 font-medium text-xs border-b border-border">
            Top Alternates
          </div>
          {rec.alternates.map((alt) => (
            <div
              key={alt.cbuCode}
              className="px-3 py-2 border-b border-border last:border-b-0 grid grid-cols-2 gap-1"
            >
              <span className="text-muted-foreground">CBU</span>
              <span className="font-mono">{alt.cbuCode}</span>
              <span className="text-muted-foreground">DOH</span>
              <span className="font-semibold">{alt.atpScore}</span>
              <span className="text-muted-foreground">Status</span>
              <span>{alt.networkStatus ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Take Action Dialog ───────────────────────────────────────────────────────

interface TakeActionDialogProps {
  open: boolean;
  item: CcrLineItem;
  networkEntry: NetworkEntry | undefined;
  ruleset: RulesetEntry[];
  onClose: () => void;
  onSuccess: () => void;
}

function TakeActionDialog({
  open,
  item,
  networkEntry,
  ruleset,
  onClose,
  onSuccess,
}: TakeActionDialogProps) {
  const { toast } = useToast();

  // Explicit map from typeOfNetwork codes (stored in network_entries) to the
  // human-readable ruleset entry names (stored in ccr_ruleset.network_change_type).
  // This replaces the previous fragile fuzzy-match + alphabetical-fallback logic.
  const NW_TYPE_TO_RULESET: Record<string, string> = {
    "RL_ART_PKG":  "Artwork + Packaging Change",
    "RL_ART_FORM": "Formulation + Artwork Change",
    "RL_PKG_FORM": "Packaging Change",
    "RL_ART":      "Artwork Change",
    "RL_FORM":     "Formulation Change",
    "RL_PKG":      "Packaging Change",
    "RL_PRICE":    "Pricing Change ≤10%",
    "Relaunch":    "Artwork + Packaging Change",
    // Extension / pack-change types (outside CCR scope but included for completeness)
    "EXTENSION":   "Artwork Change",
    "Pack Change": "Packaging Change",
  };

  // Find matching ruleset rule by network change type
  const matchedRule = useMemo(() => {
    const nwType = networkEntry?.typeOfNetwork;
    if (!nwType) return null;
    const targetName = NW_TYPE_TO_RULESET[nwType];
    if (targetName) {
      const found = ruleset.find(r => r.networkChangeType === targetName);
      if (found) return found;
    }
    // Fallback: partial match (handles any unmapped custom types)
    return ruleset.find(r =>
      r.networkChangeType.toLowerCase().includes(nwType.toLowerCase())
    ) ?? null;
  }, [ruleset, networkEntry]);

  // Structured override type: tracks each parameter change with old/new/timestamp
  type Override = {
    field: string;
    originalValue: boolean;
    overrideValue: boolean;
    timestamp: string;
  };

  // Step 1: Ruleset values (pre-filled from matched rule, user can override)
  const [newCicRequired, setNewCicRequired] = useState(matchedRule?.newCicRequired ?? false);
  const [contentUpdateRequired, setContentUpdateRequired] = useState(matchedRule?.contentUpdateRequired ?? false);
  const [rundownRequired, setRundownRequired] = useState(matchedRule?.rundownRequired ?? false);
  const [overrides, setOverrides] = useState<Override[]>([]);

  // Step 2: CIC decision.
  // When newCicRequired=true, mode is locked to "new" per BRD.
  const cicModeLocked = newCicRequired;
  const [cicMode, setCicMode] = useState<"reuse" | "new">(newCicRequired ? "new" : "reuse");
  const [newCicCode, setNewCicCode] = useState("");
  const [newCicDescription, setNewCicDescription] = useState("");

  // Keep cicMode in sync when newCicRequired is toggled in Step 1
  // If user enables "New CIC Required", immediately force cicMode to "new"
  useEffect(() => {
    if (newCicRequired) setCicMode("new");
  }, [newCicRequired]);

  const [justification, setJustification] = useState("");

  const [step, setStep] = useState(1);

  const qc = useQueryClient();
  const executeMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("POST", `/api/ccr/line-items/${item.id}/execute`, payload).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "CCR Executed", description: "Line item marked Completed." });
      qc.invalidateQueries({ queryKey: ["/api/ccr/line-items"] });
      onSuccess();
      onClose();
    },
    onError: () => toast({ title: "Execution failed", variant: "destructive" }),
  });

  function handleToggle(field: string, value: boolean) {
    const orig = matchedRule as Record<string, unknown> | null;
    const originalValue = orig ? Boolean(orig[field]) : false;
    if (value !== originalValue) {
      setOverrides(prev => {
        const without = prev.filter(o => o.field !== field);
        return [
          ...without,
          { field, originalValue, overrideValue: value, timestamp: new Date().toISOString() },
        ];
      });
    } else {
      setOverrides(prev => prev.filter(o => o.field !== field));
    }
  }

  function handleExecute() {
    const cicCode = cicMode === "reuse" ? (item.cic ?? "") : newCicCode;
    const cicDescription = cicMode === "reuse" ? (item.cicDescription ?? undefined) : (newCicDescription.trim() || undefined);
    executeMutation.mutate({
      rulesetValues: {
        newCicRequired,
        contentUpdateRequired,
        rundownRequired,
      },
      overrides,
      cicCode,
      cicDescription,
      justification: justification || undefined,
      // Actor is NOT sent to the server — it is always derived server-side.
    });
  }

  // Reset state when dialog opens
  function handleOpenChange(open: boolean) {
    if (!open) {
      setStep(1);
      setOverrides([]);
      setNewCicRequired(matchedRule?.newCicRequired ?? false);
      setContentUpdateRequired(matchedRule?.contentUpdateRequired ?? false);
      setRundownRequired(matchedRule?.rundownRequired ?? false);
      setCicMode(newCicRequired ? "new" : "reuse");
      setNewCicCode("");
      setNewCicDescription("");
      setJustification("");
      onClose();
    }
  }

  const canProceedStep1 = true;
  const canProceedStep2 = cicMode === "reuse" || newCicCode.trim().length > 2;

  const stepTitles = [
    "Ruleset Evaluation",
    "CIC Decision",
    "Review & Confirm",
  ];

  const cicCode = cicMode === "reuse" ? (item.cic ?? "—") : newCicCode;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-xl"
        data-testid="dialog-take-action"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Take Action — CCR
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-1">
            {stepTitles.map((title, idx) => {
              const n = idx + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={n} className="flex items-center gap-1">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${n}`}
                  >
                    {done ? "✓" : n}
                  </div>
                  <span className={`text-[10px] ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {title}
                  </span>
                  {idx < stepTitles.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <Separator />

        <div className="min-h-[220px]">

          {/* ── Step 1: Ruleset Evaluation ── */}
          {step === 1 && (
            <div className="space-y-4" data-testid="step-ruleset">
              {matchedRule && (
                <div className="rounded bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-800">
                  <span className="font-semibold">Matched Rule:</span> {matchedRule.networkChangeType}
                  {matchedRule.notes && (
                    <p className="mt-0.5 text-sky-700 leading-relaxed">{matchedRule.notes}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Review and confirm (or override) the ruleset parameters for this CCR.
                {overrides.length > 0 && (
                  <span className="ml-1 font-medium text-amber-700">
                    {overrides.length} override(s) applied.
                  </span>
                )}
              </p>
              <div className="space-y-3">
                {/* New CIC Required — managed in-system */}
                {[
                  { key: "newCicRequired", label: "New CIC Required", value: newCicRequired, setter: setNewCicRequired },
                ].map(({ key, label, value, setter }) => {
                  const isOverridden = overrides.some(o => o.field === key);
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor={`toggle-${key}`}
                        className={`text-sm cursor-pointer ${isOverridden ? "text-amber-700 font-medium" : ""}`}
                      >
                        {label}
                        {isOverridden && (
                          <Badge variant="outline" className="ml-2 text-[9px] bg-amber-50 border-amber-300 text-amber-700">
                            Override
                          </Badge>
                        )}
                      </Label>
                      <Switch
                        id={`toggle-${key}`}
                        checked={value}
                        onCheckedChange={v => {
                          setter(v);
                          handleToggle(key, v);
                        }}
                        data-testid={`switch-${key}`}
                      />
                    </div>
                  );
                })}

                {/* Content Update & Rundown — externally managed */}
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 pt-2.5 pb-2 space-y-2.5">
                  {[
                    { key: "contentUpdateRequired", label: "Content Update Required", value: contentUpdateRequired, setter: setContentUpdateRequired },
                    { key: "rundownRequired", label: "Predecessor Rundown Required", value: rundownRequired, setter: setRundownRequired },
                  ].map(({ key, label, value, setter }) => {
                    const isOverridden = overrides.some(o => o.field === key);
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <Label
                          htmlFor={`toggle-${key}`}
                          className={`text-sm cursor-pointer text-slate-500 ${isOverridden ? "text-amber-700 font-medium" : ""}`}
                        >
                          {label}
                          {isOverridden && (
                            <Badge variant="outline" className="ml-2 text-[9px] bg-amber-50 border-amber-300 text-amber-700">
                              Override
                            </Badge>
                          )}
                        </Label>
                        <Switch
                          id={`toggle-${key}`}
                          checked={value}
                          onCheckedChange={v => {
                            setter(v);
                            handleToggle(key, v);
                          }}
                          data-testid={`switch-${key}`}
                        />
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-slate-400 italic pt-0.5">
                    * These actions are managed outside this system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: CIC Decision ── */}
          {step === 2 && (
            <div className="space-y-4" data-testid="step-cic">
              {cicModeLocked && (
                <div className="flex items-start gap-2 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    The matched ruleset requires a <strong>New CIC</strong> for this network change.
                    Reuse is not permitted.{" "}
                    <a
                      href="/ccr/master-maintenance"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold text-amber-900"
                      data-testid="link-master-maintenance"
                    >
                      Open Master Maintenance ↗
                    </a>{" "}
                    to register the new CIC before proceeding.
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {cicModeLocked
                  ? "Provide the new CIC code below. The existing CIC will be retired."
                  : "No new CIC required. Confirm reuse of the existing CIC or provide an alternate."}
              </p>
              <RadioGroup
                value={cicMode}
                onValueChange={v => !cicModeLocked && setCicMode(v as "reuse" | "new")}
                className="space-y-2"
                data-testid="radio-cic-mode"
              >
                {/* Reuse option — disabled when newCicRequired=true */}
                <div
                  className={`flex items-start gap-3 rounded border px-3 py-2.5 transition-colors ${
                    cicModeLocked
                      ? "border-border opacity-40 cursor-not-allowed"
                      : `cursor-pointer ${cicMode === "reuse" ? "border-primary bg-primary/5" : "border-border"}`
                  }`}
                >
                  <RadioGroupItem
                    value="reuse"
                    id="cic-reuse"
                    className="mt-0.5"
                    disabled={cicModeLocked}
                  />
                  <Label
                    htmlFor="cic-reuse"
                    className={`space-y-0.5 ${cicModeLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <p className="font-medium text-sm">Reuse Existing CIC</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.cic ?? "None assigned"}</p>
                    {item.cicDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.cicDescription}</p>
                    )}
                  </Label>
                </div>
                <div className={`flex items-start gap-3 rounded border px-3 py-2.5 cursor-pointer transition-colors ${cicMode === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="new" id="cic-new" className="mt-0.5" />
                  <Label htmlFor="cic-new" className="cursor-pointer space-y-0.5">
                    <p className="font-medium text-sm">Assign New CIC</p>
                    <p className="text-xs text-muted-foreground">Old CBU will be marked Inactive</p>
                  </Label>
                </div>
              </RadioGroup>
              {cicMode === "new" && (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-cic-input" className="text-xs">New CIC Code</Label>
                    <Input
                      id="new-cic-input"
                      placeholder="e.g. CIC-NEWX-DL-DMT"
                      value={newCicCode}
                      onChange={e => setNewCicCode(e.target.value)}
                      className="font-mono text-xs"
                      data-testid="input-new-cic"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-cic-desc-input" className="text-xs">CIC Description</Label>
                    <Input
                      id="new-cic-desc-input"
                      placeholder="e.g. Dove Beauty Bar Original 100g – Domex"
                      value={newCicDescription}
                      onChange={e => setNewCicDescription(e.target.value)}
                      className="text-xs"
                      data-testid="input-new-cic-desc"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review & Confirm ── */}
          {step === 3 && (
            <div className="space-y-3" data-testid="step-review">
              <p className="text-xs text-muted-foreground">
                Review all decisions before executing the CCR. This action will update CIC mappings
                and mark the item Completed.
              </p>
              <div className="rounded border border-border text-xs overflow-hidden">
                <div className="grid grid-cols-2 bg-muted/50 px-3 py-2 font-semibold text-xs border-b border-border">
                  <span>Parameter</span>
                  <span>Value</span>
                </div>
                {[
                  ["Network Change Type", networkEntry?.typeOfNetwork ?? "—"],
                  ["Matched Rule", matchedRule?.networkChangeType ?? "None"],
                  ["New CIC Required", newCicRequired ? "Yes" : "No"],
                  ["Content Update", contentUpdateRequired ? "Yes" : "No"],
                  ["Predecessor Rundown", rundownRequired ? "Yes" : "No"],
                  ["CIC Code", cicCode],
                  cicMode === "reuse" && item.cicDescription ? ["CIC Description", item.cicDescription] : null,
                  cicMode === "new" && newCicDescription.trim() ? ["CIC Description", newCicDescription.trim()] : null,
                  ["Overrides", overrides.length > 0 ? overrides.map(o => o.field).join(", ") : "None"],
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-2 px-3 py-1.5 border-b border-border last:border-b-0 odd:bg-background even:bg-muted/20"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium font-mono truncate">{value}</span>
                    </div>
                  ))}
              </div>
              {overrides.length > 0 && (
                <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    {overrides.length} ruleset parameter(s) were overridden. Ensure business
                    justification is documented before proceeding.
                  </span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="justification" className="text-xs">Justification / Context (optional)</Label>
                <Textarea
                  id="justification"
                  placeholder="Add context or notes for this CCR execution…"
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  data-testid="textarea-justification"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            data-testid="btn-dialog-back"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </Button>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
                data-testid="btn-dialog-next"
              >
                Next →
              </Button>
            )}
            {step === 3 && (
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={executeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="btn-execute-ccr"
              >
                {executeMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                )}
                Execute CCR
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delisting Response Dialog ────────────────────────────────────────────────

function DelistingDialog({
  open,
  itemId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [action, setAction] = useState<"accept" | "reject">("accept");
  const [justification, setJustification] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: { action: string; justification?: string }) =>
      apiRequest("POST", `/api/ccr/line-items/${itemId}/delisting-response`, payload).then(r =>
        r.json()
      ),
    onSuccess: () => {
      toast({ title: "Delisting Response Submitted" });
      qc.invalidateQueries({ queryKey: ["/api/ccr/line-items"] });
      onSuccess();
      onClose();
    },
    onError: () => toast({ title: "Submission failed", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm" data-testid="dialog-delisting">
        <DialogHeader>
          <DialogTitle>Delisting Response</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The Paid Bible has issued a delisting intimation for this CBU. Accept to mark the
            mapping as "Stock Base Delisted", or reject with a justification.
          </p>
          <RadioGroup
            value={action}
            onValueChange={v => setAction(v as "accept" | "reject")}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="accept" id="del-accept" />
              <Label htmlFor="del-accept" className="cursor-pointer text-sm">
                Accept delisting
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="reject" id="del-reject" />
              <Label htmlFor="del-reject" className="cursor-pointer text-sm">
                Reject delisting
              </Label>
            </div>
          </RadioGroup>
          {action === "reject" && (
            <div className="space-y-1">
              <Label className="text-xs">Justification</Label>
              <Textarea
                placeholder="Reason for rejection…"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                rows={3}
                className="text-xs resize-none"
                data-testid="textarea-delisting-justification"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="btn-delisting-cancel">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              mutation.mutate({
                action,
                justification: justification || undefined,
              })
            }
            disabled={
              mutation.isPending ||
              (action === "reject" && justification.trim().length < 5)
            }
            data-testid="btn-delisting-submit"
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DOH depot analysis ───────────────────────────────────────────────────────

const NATIONAL_CHAINS_DETAIL = new Set([
  "BigBasket", "Swiggy Instamart", "Amazon", "Flipkart",
  "JioMart", "Big Bazaar", "Metro C&C", "Cloud Tail",
]);

// ── Queue-gate helpers (mirrors ccr-workspace.tsx) ────────────────────────────
const DETAIL_STATUS_IDX: Record<string, number> = {
  "Draft": 0, "Active": 1, "Pricing Updated": 2,
  "Production Started": 3, "FTR Approved": 4,
  "Stock Movement Initiated": 5, "Network transition complete": 6,
};
function _detailWHash(s: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = ((h * 31) ^ s.charCodeAt(i)) & 0xffff;
  return Math.abs(h);
}
function detailSuccDoh(cbu: string)  { return (_detailWHash(cbu, 17) % 12) + 2; }
function detailPredDoh(pred: string) { return _detailWHash(pred, 7) % 7; }

// Simulated depot-level DOH data (demo — top depots sorted by CLOT%)
// VABH: both thresholds met → PASS
// DLGH: predecessor DOH 3.5 ≥ 3 (threshold: < 3) → FAIL
// ABDH: successor DOH 4.0 ≤ 5 (threshold: > 5) → FAIL
const DEMO_DEPOT_ROWS = [
  { dc: "VABH", predDoh: 2.0,  succDoh: 10.0, clot: 30, inTop70: true,  status: "PASS" as const },
  { dc: "DLGH", predDoh: 3.5,  succDoh: 12.0, clot: 28, inTop70: true,  status: "FAIL" as const },
  { dc: "ABDH", predDoh: 1.5,  succDoh:  4.0, clot: 26, inTop70: true,  status: "FAIL" as const },
  { dc: "SRDH", predDoh: 5.0,  succDoh:  6.0, clot: 10, inTop70: false, status: null },
  { dc: "HBDH", predDoh: 6.0,  succDoh:  7.0, clot:  4, inTop70: false, status: null },
];
// Aggregate BP-level DOH (from network entry: predecessor_doh=4, successor_doh=3)
const DEMO_PRED_OVERALL = 4;
const DEMO_SUCC_OVERALL = 3;

function DohDepotAnalysisCard({
  basepack,
}: {
  basepack: string | null | undefined;
}) {
  const top70Rows = DEMO_DEPOT_ROWS.filter(r => r.inTop70);
  const allTop70Pass = top70Rows.every(r => r.status === "PASS");
  const overallFail = !allTop70Pass || DEMO_PRED_OVERALL >= 3 || DEMO_SUCC_OVERALL <= 5;

  return (
    <Card className="shadow-none border-orange-200 bg-orange-50/30">
      <CardHeader className="py-3 px-4 border-b border-orange-200">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
          <Info className="h-3.5 w-3.5 shrink-0" />
          DOH Analysis — {basepack ?? "—"}
          <Badge
            variant="outline"
            className="ml-auto text-[10px] bg-red-50 border-red-300 text-red-700"
          >
            Threshold Not Met
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 pb-4 px-4 space-y-3">

        {/* BP-level summary */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Predecessor CBU", days: DEMO_PRED_OVERALL, threshold: "< 3 days", met: DEMO_PRED_OVERALL < 3 },
            { label: "Successor CBU",   days: DEMO_SUCC_OVERALL, threshold: "> 5 days", met: DEMO_SUCC_OVERALL > 5 },
          ].map(({ label, days, threshold, met }) => (
            <div
              key={label}
              className={`rounded border px-3 py-2.5 text-center ${
                met
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Threshold: {threshold}
              </p>
              <p className={`text-[10px] font-semibold mt-1 ${met ? "text-emerald-600" : "text-red-600"}`}>
                {met ? "✓ Met" : "✗ Not met"}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          Derived from BP demand estimate · Sorted by CLOT% (contribution)
        </p>

        {/* Depot-level table */}
        <div className="rounded border border-border overflow-hidden text-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="py-2 text-[11px] font-semibold text-center text-muted-foreground" colSpan={3}>
                  Predecessor CBU
                </TableHead>
                <TableHead className="py-2 text-[11px] font-semibold text-center text-muted-foreground border-l" colSpan={3}>
                  Successor CBU
                </TableHead>
                <TableHead className="py-2 text-[11px] font-semibold text-center text-muted-foreground border-l" colSpan={2}>
                  Evaluation
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-t">
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14">DC</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14 text-right">DOH</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14 text-right">CLOT%</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14 border-l">DC</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14 text-right">DOH</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-14 text-right">CLOT%</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-16 border-l text-center">Status</TableHead>
                <TableHead className="py-1.5 text-[10px] font-semibold text-muted-foreground w-20 text-center">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_DEPOT_ROWS.map((row, idx) => (
                <TableRow
                  key={row.dc}
                  className={`${!row.inTop70 ? "opacity-50" : ""} hover:bg-muted/20`}
                >
                  <TableCell className="py-1.5 font-mono text-[11px] font-semibold">{row.dc}</TableCell>
                  <TableCell className={`py-1.5 text-right font-mono text-[11px] ${row.inTop70 && row.predDoh >= 3 ? "text-red-600 font-semibold" : "text-emerald-700"}`}>
                    {row.predDoh}
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] text-muted-foreground">{row.clot}</TableCell>
                  <TableCell className="py-1.5 font-mono text-[11px] font-semibold border-l">{row.dc}</TableCell>
                  <TableCell className={`py-1.5 text-right font-mono text-[11px] ${row.inTop70 && row.succDoh <= 5 ? "text-red-600 font-semibold" : "text-emerald-700"}`}>
                    {row.succDoh}
                  </TableCell>
                  <TableCell className="py-1.5 text-right text-[11px] text-muted-foreground">{row.clot}</TableCell>
                  <TableCell className="py-1.5 border-l text-center">
                    {row.status === "PASS" && (
                      <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">PASS</span>
                    )}
                    {row.status === "FAIL" && (
                      <span className="inline-block text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">FAIL</span>
                    )}
                    {!row.status && <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="py-1.5 text-center">
                    {idx === 0 && (
                      <span className={`inline-block text-[10px] font-semibold rounded px-1.5 py-0.5 border ${
                        overallFail || !allTop70Pass
                          ? "text-red-700 bg-red-50 border-red-200"
                          : "text-emerald-700 bg-emerald-50 border-emerald-200"
                      }`}>
                        {overallFail || !allTop70Pass ? "FAIL" : "PASS"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Top 70% contributing depots evaluated · Activation requires <span className="font-medium">Successor DOH &gt; 5</span> and <span className="font-medium">Predecessor DOH &lt; 3</span> across all qualifying depots.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CcrDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const itemId = params.id;

  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data: item,
    isLoading: itemLoading,
    isError,
  } = useQuery<CcrLineItem>({
    queryKey: [`/api/ccr/line-items/${itemId}`],
    queryFn: () => fetch(`/api/ccr/line-items/${itemId}`).then(r => r.json()),
    enabled: !!itemId,
  });

  const { data: networkEntries = [] } = useQuery<NetworkEntry[]>({
    queryKey: ["/api/network-entries"],
  });

  const { data: ruleset = [] } = useQuery<RulesetEntry[]>({
    queryKey: ["/api/ccr/ruleset"],
    queryFn: () => fetch("/api/ccr/ruleset").then(r => r.json()),
  });

  const networkEntry = useMemo(
    () => networkEntries.find(e => e.cbuCode === item?.successorCbuCode),
    [networkEntries, item]
  );

  function refreshItem() {
    qc.invalidateQueries({ queryKey: [`/api/ccr/line-items/${itemId}`] });
  }

  if (itemLoading) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="ccr" />
        <main className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen bg-background">
        <UnileverHeader module="ccr" />
        <main className="max-w-5xl mx-auto px-6 py-10 text-center text-muted-foreground text-sm">
          CCR line item not found.{" "}
          <button className="underline" onClick={() => navigate("/ccr")}>
            Go back
          </button>
        </main>
      </div>
    );
  }

  const isCompleted = item.ccrStatus === "Completed";

  // ── Queue-gate: completed items that are still held pending conditions ────────
  const _netStatus   = networkEntry?.networkStatus ?? "";
  const _statusIdx   = DETAIL_STATUS_IDX[_netStatus] ?? 0;
  const _stockMet    = _statusIdx >= DETAIL_STATUS_IDX["Stock Movement Initiated"];
  const _needsDoh    = NATIONAL_CHAINS_DETAIL.has(item.customerChain) && item.newCicRequired === false;
  const _succDoh     = detailSuccDoh(item.successorCbuCode ?? "");
  const _predDoh     = detailPredDoh(item.predecessorCbuCode ?? "");
  const _dohMet      = _needsDoh ? (_succDoh > 5 && _predDoh < 3) : true;
  // isInQueue: mapping is done but cannot be released yet
  const isInQueue    = isCompleted && !(_stockMet && _dohMet);
  const queueReason  = isInQueue
    ? (!_stockMet
        ? "Awaiting Stock Movement Initiated"
        : "National chain DOH threshold not met")
    : null;

  // Take Action is shown for:
  //   • Action Required items at Third/Fourth trigger (original rule)
  //   • Upcoming items at any active trigger stage (First/Second/Third/Fourth)
  //     so that users navigating from the Upcoming tab can still execute a CCR.
  const isActionRequired =
    !isCompleted && !isInQueue && (
      (item.ccrStatus === "Action Required" && (item.triggerStage === "Third" || item.triggerStage === "Fourth")) ||
      (item.ccrStatus === "Upcoming" && item.triggerStage !== "None")
    );

  return (
    <div className="min-h-screen bg-background">
      <UnileverHeader module="ccr" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Breadcrumb + title */}
        <div className="space-y-2">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate("/ccr")}
            data-testid="btn-back-to-workspace"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to CCR Workspace
          </button>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-2 rounded-md">
                <GitCompareArrows className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight" data-testid="text-detail-title">
                  CCR Line Item
                </h2>
                <p className="text-xs text-muted-foreground">
                  {item.customerChain} · {item.customerCode}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isActionRequired && (
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="bg-primary text-white gap-1.5 text-xs"
                  data-testid="btn-take-action"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Take Action
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={`text-xs ${TRIGGER_STAGE_COLOR[item.triggerStage] ?? TRIGGER_STAGE_COLOR["None"]}`}
            data-testid="badge-trigger-stage-detail"
          >
            {TRIGGER_STAGE_LABEL[item.triggerStage] ?? "—"}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${isInQueue ? "bg-amber-50 text-amber-700 border-amber-300" : (CCR_STATUS_COLOR[item.ccrStatus] ?? "")}`}
            data-testid="badge-ccr-status-detail"
          >
            {isInQueue ? "In Queue" : item.ccrStatus}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UrgencyDot color={item.urgencyColor} />
            {item.urgencyColor}
          </div>
          {item.escalatedAt && (
            <Badge
              variant="outline"
              className="text-xs bg-rose-50 text-rose-700 border-rose-300 gap-1"
              data-testid="badge-escalated-detail"
            >
              <AlertTriangle className="h-3 w-3" />
              Escalated
            </Badge>
          )}
        </div>

        {/* In-queue reason banner */}
        {isInQueue && queueReason && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              <span className="font-semibold">CIC mapping submitted — held in queue.</span>{" "}
              {queueReason}.
            </span>
          </div>
        )}

        {/* 3-column metadata cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="shadow-none border-border">
            <CardContent className="pt-4 pb-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Layers className="h-3.5 w-3.5" /> CBU Codes
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono font-semibold" data-testid="text-successor-cbu">
                    {item.successorCbuCode ?? "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">successor</span>
                </div>
                {item.predecessorCbuCode && (
                  <div className="flex items-center gap-1.5">
                    <CornerDownRight className="h-3 w-3 text-muted-foreground rotate-180" />
                    <span className="text-xs font-mono text-muted-foreground" data-testid="text-predecessor-cbu">
                      {item.predecessorCbuCode}
                    </span>
                    <span className="text-[10px] text-muted-foreground">predecessor</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border">
            <CardContent className="pt-4 pb-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <User className="h-3.5 w-3.5" /> Customer
              </div>
              <p className="text-sm font-semibold" data-testid="text-customer-chain">
                {item.customerChain}
              </p>
              <p className="text-xs text-muted-foreground font-mono">{item.customerCode}</p>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border">
            <CardContent className="pt-4 pb-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <MapPin className="h-3.5 w-3.5" /> Network & CIC
              </div>
              <p className="text-xs text-muted-foreground">
                {networkEntry?.typeOfNetwork ?? "—"}
              </p>
              <p className="text-xs font-mono font-semibold" data-testid="text-cic">
                {item.cic ?? "Non-Mapped"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SLA info */}
        {item.escalationDueAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>SLA Due: <span className="font-medium text-foreground">{formatTs(item.escalationDueAt)}</span></span>
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Audit Timeline */}
          <Card className="shadow-none border-border lg:col-span-1">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-sm">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-4">
              <AuditTimeline logs={item.auditLog} />
            </CardContent>
          </Card>

          {/* Right: Action panel + recommendation */}
          <div className="lg:col-span-2 space-y-4">

            {/* Network entry context */}
            {networkEntry && (
              <Card className="shadow-none border-border">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-sm">Network Entry Context</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-3 px-4">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Basepack</dt>
                    <dd className="font-medium font-mono" data-testid="text-basepack">{networkEntry.basepack ?? "—"}</dd>
                    <dt className="text-muted-foreground">Description</dt>
                    <dd className="truncate" data-testid="text-material-desc">{networkEntry.materialDescription ?? "—"}</dd>
                    <dt className="text-muted-foreground">Network Status</dt>
                    <dd data-testid="text-network-status">{networkEntry.networkStatus ?? "—"}</dd>
                    <dt className="text-muted-foreground">Successor DOH</dt>
                    <dd className="font-semibold" data-testid="text-successor-doh">
                      {networkEntry.successorDoh != null ? `${networkEntry.successorDoh} days` : "—"}
                    </dd>
                  </dl>

                  <Separator className="my-3" />

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Actions Required</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: "New CIC",        active: item.newCicRequired },
                        { label: "Content Update", active: item.contentUpdateRequired },
                        { label: "Rundown",        active: item.rundownRequired },
                      ].map(({ label, active }) => (
                        <span
                          key={label}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            active
                              ? "bg-slate-100 border-slate-300 text-slate-700"
                              : "bg-muted/40 border-border text-muted-foreground line-through"
                          }`}
                          data-testid={`flag-${label.toLowerCase().replace(" ", "-")}`}
                        >
                          <CheckCircle2 className={`h-3 w-3 ${active ? "text-slate-500" : "text-muted-foreground/40"}`} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* DOH depot analysis — shown for National chains with existing CIC at Stock Movement Initiated */}
            {NATIONAL_CHAINS_DETAIL.has(item.customerChain) &&
              item.newCicRequired === false &&
              networkEntry?.networkStatus === "Stock Movement Initiated" && (
              <DohDepotAnalysisCard basepack={networkEntry?.basepack} />
            )}

            {/* Ruleset outcome (if completed) */}
            {isCompleted && item.rulesetOutcome && (
              <Card className="shadow-none border-border">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Execution Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-3 px-4">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {Object.entries(item.rulesetOutcome).map(([k, v]) => (
                      <>
                        <dt key={`${k}-k`} className="text-muted-foreground capitalize">
                          {k.replace(/([A-Z])/g, " $1").trim()}
                        </dt>
                        <dd key={`${k}-v`} className="font-medium">
                          {String(v)}
                        </dd>
                      </>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* CTA prompt when action required */}
            {isActionRequired && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Action Required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This CCR is at{" "}
                    <span className="font-medium">{TRIGGER_STAGE_LABEL[item.triggerStage]}</span>{" "}
                    and awaiting action. Use the Take Action dialog to evaluate and execute.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="shrink-0 gap-1.5"
                  data-testid="btn-take-action-cta"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Take Action
                </Button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Dialogs */}
      {dialogOpen && (
        <TakeActionDialog
          open={dialogOpen}
          item={item}
          networkEntry={networkEntry}
          ruleset={ruleset}
          onClose={() => setDialogOpen(false)}
          onSuccess={refreshItem}
        />
      )}

    </div>
  );
}
