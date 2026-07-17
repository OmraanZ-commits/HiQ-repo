import { useState } from "react";
import {
  Clock, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, User, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApproverStep } from "@/lib/sr-store";
import { REJECTION_REASONS } from "@/lib/sr-store";

const OTHER_REASON = "Other — refer to comments";

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

export function ApproverChain({ approvers, requestId, onApprove, onReject, srEffectiveDate }: {
  approvers: ApproverStep[];
  requestId: string;
  onApprove: (id: string, idx: number, comment?: string, effectiveDate?: string) => void;
  onReject: (id: string, idx: number, reason: string) => void;
  srEffectiveDate?: string;
}) {
  const [rejectingIdx, setRejectingIdx] = useState<number | null>(null);
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalEffectiveDate, setApprovalEffectiveDate] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [otherComment, setOtherComment] = useState("");

  const isOther = selectedReason === OTHER_REASON;
  const canSubmit = !!selectedReason && (!isOther || otherComment.trim().length > 0);

  const isSupplyPlannerStep = (idx: number) => approvers[idx]?.label === "Supply Planner";
  const currentSrEffectiveDate = approvers.find(a => a.effectiveDate)?.effectiveDate;
  const effectiveDateChanged = (idx: number) =>
    isSupplyPlannerStep(idx) && !!approvalEffectiveDate &&
    approvalEffectiveDate !== (approvers[idx]?.effectiveDate ?? currentSrEffectiveDate);

  const approveCommentRequired = (idx: number) =>
    isSupplyPlannerStep(idx) && effectiveDateChanged(idx);

  const canSubmitApprove = (idx: number) =>
    !approveCommentRequired(idx) || approvalComment.trim().length > 0;

  const submitApprove = (idx: number) => {
    if (!canSubmitApprove(idx)) return;
    onApprove(
      requestId,
      idx,
      approvalComment,
      isSupplyPlannerStep(idx) ? (approvalEffectiveDate || undefined) : undefined,
    );
    setApprovingIdx(null);
    setApprovalComment("");
    setApprovalEffectiveDate("");
  };

  const cancelApprove = () => {
    setApprovingIdx(null);
    setApprovalComment("");
    setApprovalEffectiveDate("");
  };

  const submitReject = (idx: number) => {
    if (!canSubmit) return;
    const finalReason = isOther ? otherComment.trim() : selectedReason;
    onReject(requestId, idx, finalReason);
    setRejectingIdx(null);
    setSelectedReason("");
    setOtherComment("");
  };

  const cancelReject = () => {
    setRejectingIdx(null);
    setSelectedReason("");
    setOtherComment("");
  };

  const statusColors = {
    waiting:  "border-slate-200 bg-white text-slate-400",
    pending:  "border-amber-300 bg-amber-50 text-amber-600",
    approved: "border-emerald-300 bg-emerald-50 text-emerald-600",
    rejected: "border-red-300 bg-red-50 text-red-500",
  };
  const statusIcons = {
    waiting:  <Clock className="h-4 w-4" />,
    pending:  <Clock className="h-4 w-4" />,
    approved: <CheckCircle2 className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
  };

  return (
    <div className="space-y-0">
      {approvers.map((step, idx) => {
        const isLast = idx === approvers.length - 1;
        return (
          <div key={step.role} className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center w-8 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${statusColors[step.status]}`}>
                {statusIcons[step.status]}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1.5 mb-1.5 min-h-[12px]" />}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <span className="text-sm text-muted-foreground">· {step.subLabel}</span>
                    {step.assignedTo && (
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {step.assignedTo}
                      </span>
                    )}
                  </div>
                  {step.actedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.status === "approved" ? "Approved" : "Rejected"} · {step.actedAt}
                    </p>
                  )}
                  {step.status === "approved" && step.approvalComment && (
                    <p className="text-xs text-emerald-700 mt-0.5 flex items-start gap-1">
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="italic">{step.approvalComment}</span>
                    </p>
                  )}
                  {step.rejectionReason && (
                    <p className="text-xs text-red-600 mt-0.5 italic">Reason: {step.rejectionReason}</p>
                  )}
                </div>

                {step.status === "pending" && approvingIdx !== idx && rejectingIdx !== idx && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setApprovingIdx(idx);
                        setApprovalComment("");
                        setApprovalEffectiveDate(step.effectiveDate ?? currentSrEffectiveDate ?? srEffectiveDate ?? "");
                      }}
                      data-testid={`button-approve-${requestId}-${idx}`}
                    >
                      <ThumbsUp className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setRejectingIdx(idx); setSelectedReason(""); }}
                      data-testid={`button-reject-${requestId}-${idx}`}
                    >
                      <ThumbsDown className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Approval comment panel */}
              {step.status === "pending" && approvingIdx === idx && (
                <div className="mt-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50 space-y-3">
                  <p className="text-sm font-medium text-emerald-800">Confirm approval</p>

                  {isSupplyPlannerStep(idx) && (
                    <div>
                      <Label className="text-xs font-medium text-emerald-800 mb-1.5 block">
                        Effective Date
                      </Label>
                      <input
                        type="date"
                        value={approvalEffectiveDate}
                        onChange={e => setApprovalEffectiveDate(e.target.value)}
                        className="h-9 w-full max-w-[220px] rounded-md border border-emerald-200 bg-white px-3 text-sm"
                        data-testid={`input-approve-effective-date-${requestId}-${idx}`}
                      />
                      {effectiveDateChanged(idx) && (
                        <p className="text-xs text-amber-700 mt-1">
                          Effective date is being modified — a comment is required below.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-medium text-emerald-800 mb-1.5 block">
                      Comment{" "}
                      <span className={approveCommentRequired(idx) ? "font-normal text-red-600" : "font-normal text-emerald-600"}>
                        {approveCommentRequired(idx) ? "(required)" : "(optional)"}
                      </span>
                    </Label>
                    <Textarea
                      value={approvalComment}
                      onChange={e => setApprovalComment(e.target.value)}
                      placeholder="Add a note for this approval…"
                      className="resize-none bg-white border-emerald-200 text-sm focus-visible:ring-emerald-300"
                      rows={3}
                      data-testid={`textarea-approve-comment-${requestId}-${idx}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!canSubmitApprove(idx)}
                      onClick={() => submitApprove(idx)}
                      data-testid={`button-confirm-approve-${requestId}-${idx}`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Confirm Approval
                    </Button>
                    <Button variant="ghost" onClick={cancelApprove} data-testid={`button-cancel-approve-${requestId}-${idx}`}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Rejection reason selector */}
              {step.status === "pending" && rejectingIdx === idx && (
                <div className="mt-3 p-4 rounded-lg border border-red-200 bg-red-50 space-y-3">
                  <p className="text-sm font-medium text-red-800">Select a reason for rejection:</p>
                  <RadioGroup value={selectedReason} onValueChange={(v) => { setSelectedReason(v); setOtherComment(""); }} className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <div key={r} className="flex items-center gap-2.5">
                        <RadioGroupItem value={r} id={`${requestId}-${idx}-${r}`} />
                        <Label htmlFor={`${requestId}-${idx}-${r}`} className="text-sm cursor-pointer text-red-700">{r}</Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Comment box — only shown when "Other" is selected */}
                  {isOther && (
                    <div className="pt-1">
                      <Label className="text-xs font-medium text-red-800 mb-1.5 block">
                        Add a comment <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        value={otherComment}
                        onChange={e => setOtherComment(e.target.value)}
                        placeholder="Describe the reason for rejection…"
                        className="resize-none bg-white border-red-200 text-sm focus-visible:ring-red-300"
                        rows={3}
                        data-testid={`textarea-reject-comment-${requestId}-${idx}`}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                      disabled={!canSubmit}
                      onClick={() => submitReject(idx)}
                      data-testid={`button-confirm-reject-${requestId}-${idx}`}
                    >
                      <XCircle className="h-4 w-4" /> Confirm Rejection
                    </Button>
                    <Button variant="ghost" onClick={cancelReject}>Cancel</Button>
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
