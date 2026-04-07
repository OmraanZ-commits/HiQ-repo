import { useState } from "react";
import {
  Clock, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { ApproverStep } from "@/lib/sr-store";
import { REJECTION_REASONS } from "@/lib/sr-store";

// ─── SrStatusBadge ────────────────────────────────────────────────────────────

export function SrStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending:  "bg-amber-50 text-amber-700 border-amber-300",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-300",
    rejected: "bg-red-50 text-red-700 border-red-300",
  };
  const icons = {
    pending:  <Clock className="h-3 w-3" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status]}`}>
      {icons[status]} {status}
    </span>
  );
}

// ─── ApproverChain ────────────────────────────────────────────────────────────

export function ApproverChain({ approvers, requestId, onApprove, onReject }: {
  approvers: ApproverStep[];
  requestId: string;
  onApprove: (id: string, idx: number) => void;
  onReject: (id: string, idx: number, reason: string) => void;
}) {
  const [rejectingIdx, setRejectingIdx] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState("");

  const submitReject = (idx: number) => {
    if (!selectedReason) return;
    onReject(requestId, idx, selectedReason);
    setRejectingIdx(null);
    setSelectedReason("");
  };

  const statusColors = {
    waiting:  "border-slate-200 bg-slate-50 text-slate-400",
    pending:  "border-amber-300 bg-amber-50 text-amber-700",
    approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
    rejected: "border-red-300 bg-red-50 text-red-700",
  };
  const statusIcons = {
    waiting:  <Clock className="h-3.5 w-3.5" />,
    pending:  <Clock className="h-3.5 w-3.5 text-amber-500" />,
    approved: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
    rejected: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  };

  return (
    <div className="space-y-0">
      {approvers.map((step, idx) => {
        const isLast = idx === approvers.length - 1;
        return (
          <div key={step.role} className="flex gap-2.5">
            {/* Timeline connector */}
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${statusColors[step.status]}`}>
                {statusIcons[step.status]}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[6px]" />}
            </div>

            {/* Step content */}
            <div className="pb-3 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold leading-tight">{step.label}</p>
                    <span className="text-xs text-muted-foreground">· {step.subLabel}</span>
                    {step.assignedTo && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> {step.assignedTo}
                      </span>
                    )}
                  </div>
                  {step.actedAt && (
                    <p className="text-xs text-muted-foreground">{step.status === "approved" ? "Approved" : "Rejected"} · {step.actedAt}</p>
                  )}
                  {step.rejectionReason && (
                    <p className="text-xs text-red-600 italic">Reason: {step.rejectionReason}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {step.status === "pending" && rejectingIdx !== idx && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onApprove(requestId, idx)}
                        data-testid={`button-approve-${requestId}-${idx}`}
                      >
                        <ThumbsUp className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => { setRejectingIdx(idx); setSelectedReason(""); }}
                        data-testid={`button-reject-${requestId}-${idx}`}
                      >
                        <ThumbsDown className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection reason selector */}
              {step.status === "pending" && rejectingIdx === idx && (
                <div className="mt-2 p-3 rounded-lg border border-red-200 bg-red-50 space-y-2">
                  <p className="text-xs font-medium text-red-800">Select a reason for rejection:</p>
                  <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-1">
                    {REJECTION_REASONS.map(r => (
                      <div key={r} className="flex items-center gap-2">
                        <RadioGroupItem value={r} id={`${requestId}-${idx}-${r}`} className="h-3.5 w-3.5" />
                        <Label htmlFor={`${requestId}-${idx}-${r}`} className="text-xs cursor-pointer text-red-700">{r}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={!selectedReason}
                      onClick={() => submitReject(idx)}
                      data-testid={`button-confirm-reject-${requestId}-${idx}`}
                    >
                      <XCircle className="h-3 w-3" /> Confirm Rejection
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingIdx(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
