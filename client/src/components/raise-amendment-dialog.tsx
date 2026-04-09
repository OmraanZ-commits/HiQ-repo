import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Map, Layers, Package, Grid3x3, Calendar, HelpCircle, AlertTriangle,
} from "lucide-react";
import type { PortalUser } from "@/lib/users-data";
import {
  AMENDMENT_TYPE_META, addAmendment, type AmendmentType, type AmendmentRequest,
} from "@/lib/amendment-store";
import type { ApproverStep } from "@/lib/sr-store";
import { formatNow } from "@/lib/sr-store";

// ─── Type config ──────────────────────────────────────────────────────────────

const AMENDMENT_TYPES: { value: AmendmentType; icon: React.ElementType }[] = [
  { value: "price-change",        icon: DollarSign },
  { value: "distribution-change", icon: Map },
  { value: "channel-change",      icon: Layers },
  { value: "dimension-change",    icon: Package },
  { value: "case-config-change",  icon: Grid3x3 },
  { value: "timeline-change",     icon: Calendar },
  { value: "other",               icon: HelpCircle },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return `AR-${Math.floor(100000 + Math.random() * 900000)}`;
}

function buildApprovers(users: PortalUser[], assignedPerson: string | null | undefined): ApproverStep[] {
  const pbo  = users.find(u => u.role === "Paid Bible Owner" && u.isActive);
  const np   = users.find(u => u.name === assignedPerson && u.isActive) ??
               users.find(u => u.role === "Network Planner" && u.isActive);
  const ncsm = users.find(u => u.role === "NCSM" && u.isActive);

  return [
    {
      role: "paid-bible-owner",
      label: "Paid Bible Owner",
      subLabel: "PBO Review",
      assignedTo: pbo?.name ?? "Unassigned",
      status: "pending",
    },
    {
      role: "network-planner",
      label: "Network Planner",
      subLabel: "Field Verification",
      assignedTo: np?.name ?? assignedPerson ?? "Unassigned",
      status: "waiting",
    },
    {
      role: "ncsm",
      label: "NCSM",
      subLabel: "Final Approval",
      assignedTo: ncsm?.name ?? "Unassigned",
      status: "waiting",
    },
  ];
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
  users: PortalUser[];
  onSuccess?: (req: AmendmentRequest) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RaiseAmendmentDialog({
  open, onOpenChange,
  cbuId, cbuCode, cbuDescription, basepackCode, brand, bg, assignedPerson,
  users, onSuccess,
}: RaiseAmendmentDialogProps) {
  const [amendmentType, setAmendmentType] = useState<AmendmentType | "">("");
  const [currentValue, setCurrentValue]   = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting]       = useState(false);

  const meta = amendmentType ? AMENDMENT_TYPE_META[amendmentType] : null;
  const canSubmit = !!amendmentType && currentValue.trim() && requestedValue.trim() && justification.trim();

  const handleClose = () => {
    onOpenChange(false);
    setAmendmentType("");
    setCurrentValue("");
    setRequestedValue("");
    setJustification("");
  };

  const handleSubmit = () => {
    if (!canSubmit || !amendmentType) return;
    setSubmitting(true);
    const req: AmendmentRequest = {
      id: genId(),
      amendmentType,
      cbuId,
      cbuCode,
      cbuDescription,
      basepackCode,
      brand,
      bg,
      raisedBy: "Current User",
      raisedAt: formatNow(),
      currentValue: currentValue.trim(),
      requestedValue: requestedValue.trim(),
      justification: justification.trim(),
      approvers: buildApprovers(users, assignedPerson),
      overallStatus: "pending",
    };
    addAmendment(req);
    setSubmitting(false);
    onSuccess?.(req);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[540px]" data-testid="dialog-raise-amendment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Raise Amendment Request
          </DialogTitle>
        </DialogHeader>

        {/* CBU info strip */}
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex flex-wrap gap-3 text-sm border">
          <span>
            <span className="text-muted-foreground text-xs">CBU </span>
            <span className="font-mono font-semibold">{cbuCode}</span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground truncate">{cbuDescription || "—"}</span>
          {basepackCode && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <Badge variant="outline" className="text-xs h-5">BP-{basepackCode}</Badge>
            </>
          )}
        </div>

        <div className="space-y-4">
          {/* Amendment type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Amendment Type <span className="text-red-500">*</span></Label>
            <Select value={amendmentType} onValueChange={v => setAmendmentType(v as AmendmentType)}>
              <SelectTrigger data-testid="select-amendment-type">
                <SelectValue placeholder="Select the type of change…" />
              </SelectTrigger>
              <SelectContent>
                {AMENDMENT_TYPES.map(({ value, icon: Icon }) => (
                  <SelectItem key={value} value={value} data-testid={`option-amendment-${value}`}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {AMENDMENT_TYPE_META[value].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {meta && (
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            )}
          </div>

          {/* Change details */}
          {meta && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {meta.currentLabel} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  placeholder={`Enter the current ${meta.currentLabel.toLowerCase()}…`}
                  rows={2}
                  className="resize-none text-sm"
                  data-testid="input-current-value"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {meta.requestedLabel} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={requestedValue}
                  onChange={e => setRequestedValue(e.target.value)}
                  placeholder={`Enter the requested ${meta.requestedLabel.toLowerCase()}…`}
                  rows={2}
                  className="resize-none text-sm"
                  data-testid="input-requested-value"
                />
              </div>
            </>
          )}

          {/* Justification */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Business Justification <span className="text-red-500">*</span></Label>
            <Textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Explain why this change is needed (market dynamics, business case, compliance, etc.)…"
              rows={3}
              className="resize-none text-sm"
              data-testid="input-justification"
            />
          </div>

          {/* Approval chain preview */}
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Approval Chain</p>
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

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-amendment">Cancel</Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            data-testid="button-submit-amendment"
          >
            <AlertTriangle className="h-4 w-4" />
            Submit Amendment Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
