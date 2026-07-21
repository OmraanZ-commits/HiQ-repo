import { useState, useEffect } from "react";
import {
  Clock, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, User, MessageSquare,
  CheckSquare, Square, Lock, IndianRupee, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { ApproverStep, DepotDecision } from "@/lib/sr-store";
import { REJECTION_REASONS } from "@/lib/sr-store";
import type { CbuSectionRecord } from "@/components/basepack-cbu-sections";
import { fmtDateStr } from "@/components/basepack-cbu-sections";

// ─── Pricing helpers (NCSM check) ─────────────────────────────────────────────

function lotValidityStatus(lot: { validFrom: string; validTo: string }): "active" | "expired" | "upcoming" {
  if (lot.validTo === "9999-12-31") return "active";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const to   = new Date(lot.validTo);
  const from = new Date(lot.validFrom);
  if (today > to)   return "expired";
  if (today < from) return "upcoming";
  return "active";
}

function lotScopeText(lot: { allIndia: boolean; regions: string[]; channels: string[]; regionChannelPairs: { region: string; channels: string[] }[] }): string {
  if (lot.allIndia) return "All India";
  const parts: string[] = [];
  if (lot.regionChannelPairs.length > 0) parts.push(`Reg×Ch (${lot.regionChannelPairs.length})`);
  else {
    if (lot.regions.length  > 0) parts.push(`Regional (${lot.regions.length})`);
    if (lot.channels.length > 0) parts.push(`Channel (${lot.channels.length})`);
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

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

export function ApproverChain({ approvers, requestId, onApprove, onReject, srEffectiveDate, depotDecisions, srType, cbuPricingData }: {
  approvers: ApproverStep[];
  requestId: string;
  onApprove: (id: string, idx: number, comment?: string, effectiveDate?: string, depotDecisions?: DepotDecision[]) => void;
  onReject: (id: string, idx: number, reason: string) => void;
  srEffectiveDate?: string;
  depotDecisions?: DepotDecision[];
  srType?: string;
  cbuPricingData?: CbuSectionRecord[];
}) {
  const [rejectingIdx, setRejectingIdx] = useState<number | null>(null);
  const [approvingIdx, setApprovingIdx] = useState<number | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalEffectiveDate, setApprovalEffectiveDate] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [otherComment, setOtherComment] = useState("");
  const [localDepotDecisions, setLocalDepotDecisions] = useState<DepotDecision[]>([]);

  // Sync depot decisions from prop when approval panel opens
  // Already-approved rows (from a prior activation) are locked; pending rows are pre-selected by MSTN
  useEffect(() => {
    if (approvingIdx !== null && depotDecisions && depotDecisions.length > 0) {
      setLocalDepotDecisions(depotDecisions.map(d => {
        if (d.ncsmDecision === "approved") {
          // Locked — already activated in a prior SR; keep as-is
          return { ...d, activationStatus: "Active" as const };
        }
        return {
          ...d,
          ncsmDecision: d.mstnCleared ? "approved" : "rejected",
          activationStatus: d.mstnCleared ? "Active" as const : "Not Activated" as const,
        };
      }));
    }
  }, [approvingIdx]);

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

  const isNcsmStep = (idx: number) => approvers[idx]?.label === "NCSM";
  const showDepotDecisions = (idx: number) =>
    isNcsmStep(idx) && srType === "basepack-status-change" && depotDecisions && depotDecisions.length > 0;

  const isDepotLocked = (cbuCode: string, depotCode: string): boolean =>
    depotDecisions?.find(o => o.cbuCode === cbuCode && o.depotCode === depotCode)?.ncsmDecision === "approved";

  const toggleDepotDecision = (cbuCode: string, depotCode: string, approved: boolean) => {
    if (isDepotLocked(cbuCode, depotCode)) return; // already activated in a prior SR — cannot change
    setLocalDepotDecisions(prev => prev.map(d =>
      d.cbuCode === cbuCode && d.depotCode === depotCode
        ? { ...d, ncsmDecision: approved ? "approved" : "rejected", activationStatus: approved ? "Active" as const : "Not Activated" as const }
        : d
    ));
  };

  const derivedStatus = () => {
    if (localDepotDecisions.length === 0) return "Active Pack";
    const approved = localDepotDecisions.filter(d => d.ncsmDecision === "approved").length;
    if (approved === 0) return "Draft";
    if (approved === localDepotDecisions.length) return "Active Pack";
    return "Partially Active";
  };

  const submitApprove = (idx: number) => {
    if (!canSubmitApprove(idx)) return;
    onApprove(
      requestId,
      idx,
      approvalComment,
      isSupplyPlannerStep(idx) ? (approvalEffectiveDate || undefined) : undefined,
      showDepotDecisions(idx) ? localDepotDecisions : undefined,
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

                  {/* Depot activation decisions — NCSM step only */}
                  {showDepotDecisions(idx) && (
                    <div>
                      <p className="text-xs font-medium text-emerald-800 mb-2">
                        Depot Activation Decisions
                        {localDepotDecisions.some(d => isDepotLocked(d.cbuCode, d.depotCode)) && (
                          <span className="ml-2 font-normal text-slate-500 inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> locked rows are already active from a prior activation
                          </span>
                        )}
                      </p>
                      <div className="rounded-md border border-emerald-200 overflow-hidden bg-white text-xs">
                        <table className="w-full">
                          <thead className="bg-emerald-50 border-b border-emerald-200">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-emerald-800">Depot</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">MSTN %</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">Cleared</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">NCSM Decision</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">Status</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">Indicator</th>
                              <th className="text-center px-3 py-2 font-medium text-emerald-800">Activate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {localDepotDecisions.map((d, di) => {
                              const locked = isDepotLocked(d.cbuCode, d.depotCode);
                              const indicator = d.ncsmDecision === "approved" ? "✓" : d.ncsmDecision === "rejected" ? "✕" : "☐";
                              return (
                                <tr key={`${d.cbuCode}-${d.depotCode}`}
                                  className={`${locked ? "bg-slate-50 opacity-70" : di % 2 === 0 ? "bg-white" : "bg-emerald-50/30"}`}>
                                  <td className="px-3 py-1.5 font-mono font-medium text-slate-800">
                                    {d.depotCode}
                                    {locked && <Lock className="h-2.5 w-2.5 inline ml-1 text-slate-400" />}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className={d.mstnPct != null && d.mstnPct >= 80 ? "text-emerald-700 font-medium" : "text-red-600"}>
                                      {d.mstnPct != null ? `${d.mstnPct.toFixed(1)}%` : "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {d.mstnCleared
                                      ? <span className="text-emerald-600 font-medium">Yes</span>
                                      : <span className="text-slate-400">No</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {d.ncsmDecision === "approved"
                                      ? <span className="text-emerald-700 font-medium">Approved</span>
                                      : d.ncsmDecision === "rejected"
                                        ? <span className="text-red-500">Rejected</span>
                                        : <span className="text-amber-600">Pending</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {d.ncsmDecision === "approved"
                                      ? <span className="text-emerald-600">Active</span>
                                      : d.ncsmDecision === "rejected"
                                        ? <span className="text-slate-400">Not Activated</span>
                                        : <span className="text-amber-500">Pending</span>}
                                  </td>
                                  <td className="px-3 py-1.5 text-center text-sm">
                                    <span className={d.ncsmDecision === "approved" ? "text-emerald-600" : d.ncsmDecision === "rejected" ? "text-red-500" : "text-slate-400"}>
                                      {indicator}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {locked ? (
                                      <Lock className="h-3 w-3 text-slate-300 mx-auto" />
                                    ) : (
                                      <Checkbox
                                        checked={d.ncsmDecision === "approved"}
                                        onCheckedChange={(v) => toggleDepotDecision(d.cbuCode, d.depotCode, !!v)}
                                        data-testid={`checkbox-depot-${d.cbuCode}-${d.depotCode}`}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1.5">
                        Resulting basepack status:{" "}
                        <span className="font-semibold">{derivedStatus()}</span>
                      </p>
                    </div>
                  )}

                  {/* ─── Pricing Check by CBU — NCSM step only ─── */}
                  {showDepotDecisions(idx) && cbuPricingData && cbuPricingData.length > 0 && (() => {
                    const uniqueCbuCodes = Array.from(new Set(localDepotDecisions.map(d => d.cbuCode)));
                    const cbuRows = uniqueCbuCodes.map(code => ({
                      code,
                      record: cbuPricingData.find(c => c.cbuCode === code),
                    }));
                    const allHaveActiveLots = cbuRows.every(({ record }) =>
                      (record?.priceLots ?? []).some(l => lotValidityStatus(l) === "active")
                    );
                    return (
                      <div className="border-t border-emerald-200 pt-3" data-testid="section-pricing-check-ncsm">
                        <div className="flex items-center gap-2 mb-2.5">
                          <IndianRupee className="h-3.5 w-3.5 text-emerald-700" />
                          <p className="text-xs font-medium text-emerald-800">Pricing Check by CBU</p>
                          <span className={`ml-auto text-[11px] font-semibold inline-flex items-center gap-1 ${allHaveActiveLots ? "text-emerald-700" : "text-amber-700"}`}
                            data-testid="badge-pricing-check-status">
                            {allHaveActiveLots
                              ? <><CheckCircle2 className="h-3 w-3" /> All Priced</>
                              : <><AlertTriangle className="h-3 w-3" /> Pricing Gap</>
                            }
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {cbuRows.map(({ code, record }) => {
                            const lots = record?.priceLots ?? [];
                            const activeLotCount = lots.filter(l => lotValidityStatus(l) === "active").length;
                            return (
                              <div key={code} className="rounded-md border border-emerald-200 overflow-hidden bg-white text-xs"
                                data-testid={`section-pricing-cbu-${code}`}>
                                {/* CBU identity row */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/60 border-b border-emerald-100">
                                  <span className="font-mono font-semibold text-[#1f36c7] text-[11px]">{code}</span>
                                  {record?.materialDescription && (
                                    <span className="text-slate-500 truncate text-[11px]">{record.materialDescription}</span>
                                  )}
                                  <span className={`ml-auto font-medium text-[10px] whitespace-nowrap ${activeLotCount > 0 ? "text-emerald-600" : "text-amber-700"}`}
                                    data-testid={`text-active-lots-${code}`}>
                                    {activeLotCount > 0
                                      ? `${activeLotCount} active lot${activeLotCount !== 1 ? "s" : ""}`
                                      : "No active lots"}
                                  </span>
                                </div>

                                {lots.length > 0 ? (
                                  <table className="w-full" data-testid={`table-price-lots-${code}`}>
                                    <thead>
                                      <tr className="bg-slate-50/60 border-b border-emerald-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                        <th className="text-left px-3 py-1.5">Price Lot</th>
                                        <th className="text-left px-3 py-1.5">Scope</th>
                                        <th className="text-right px-3 py-1.5">MRP (INR)</th>
                                        <th className="text-center px-3 py-1.5">Valid From</th>
                                        <th className="text-center px-3 py-1.5">Valid To</th>
                                        <th className="text-center px-3 py-1.5">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lots.map((lot, li) => {
                                        const vstatus = lotValidityStatus(lot);
                                        const lotId   = `${code}-${lot.priceLot.padStart(2, "0")}`;
                                        return (
                                          <tr key={lot.id}
                                            className={li % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                                            data-testid={`row-price-lot-${code}-${lot.priceLot}`}>
                                            <td className="px-3 py-1.5 font-mono font-semibold text-[#1f36c7]">{lotId}</td>
                                            <td className="px-3 py-1.5 text-slate-600">{lotScopeText(lot)}</td>
                                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-800">
                                              {lot.mrp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-3 py-1.5 text-center text-slate-500">{fmtDateStr(lot.validFrom)}</td>
                                            <td className="px-3 py-1.5 text-center text-slate-500">
                                              {lot.validTo === "9999-12-31" ? <span className="text-slate-400 italic text-[10px]">Indefinite</span> : fmtDateStr(lot.validTo)}
                                            </td>
                                            <td className="px-3 py-1.5 text-center">
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                vstatus === "active"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                vstatus === "expired"  ? "bg-red-50 text-red-600 border border-red-200" :
                                                                         "bg-amber-50 text-amber-700 border border-amber-200"
                                              }`} data-testid={`badge-lot-status-${code}-${lot.priceLot}`}>
                                                {vstatus === "active" ? "Active" : vstatus === "expired" ? "Expired" : "Upcoming"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="px-3 py-2 text-slate-400 italic text-[11px]">No pricing data available for this CBU</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

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
