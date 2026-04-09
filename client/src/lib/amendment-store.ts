import { useState, useEffect } from "react";
import type { ApproverStep } from "./sr-store";
import { formatNow } from "./sr-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AmendmentType =
  | "price-change"
  | "distribution-change"
  | "channel-change"
  | "dimension-change"
  | "case-config-change"
  | "timeline-change"
  | "other";

export interface AmendmentTypeMeta {
  label: string;
  currentLabel: string;
  requestedLabel: string;
  description: string;
}

export const AMENDMENT_TYPE_META: Record<AmendmentType, AmendmentTypeMeta> = {
  "price-change": {
    label: "Price Change",
    currentLabel: "Current MRP / Price",
    requestedLabel: "Requested MRP / Price",
    description: "Change in MRP, net realization, or price ladder",
  },
  "distribution-change": {
    label: "Distribution Change",
    currentLabel: "Current Geographies / Clusters",
    requestedLabel: "Requested Geographies / Clusters",
    description: "Add or remove geographies or distribution clusters",
  },
  "channel-change": {
    label: "Channel Change",
    currentLabel: "Current Channels",
    requestedLabel: "Requested Channels",
    description: "Add or remove trade channels (GT, MT, Ecom, KA, etc.)",
  },
  "dimension-change": {
    label: "Pack Dimension Change",
    currentLabel: "Current Dimensions (weight / EAN / ITF)",
    requestedLabel: "Requested Dimensions (weight / EAN / ITF)",
    description: "Change in grammage, weight, EAN barcode, or ITF code",
  },
  "case-config-change": {
    label: "Case Configuration Change",
    currentLabel: "Current Case Config (units per case)",
    requestedLabel: "Requested Case Config (units per case)",
    description: "Change in the number of units per case or pallet configuration",
  },
  "timeline-change": {
    label: "Timeline / Date Change",
    currentLabel: "Current Dates (Change / Start / End)",
    requestedLabel: "Requested Dates (Change / Start / End)",
    description: "Revision to network change date, start date, or end date",
  },
  "other": {
    label: "Other",
    currentLabel: "Current State",
    requestedLabel: "Requested Change",
    description: "Any other amendment not covered by the categories above",
  },
};

export interface AmendmentRequest {
  id: string;
  amendmentType: AmendmentType;
  cbuId: string;
  cbuCode: string;
  cbuDescription: string;
  basepackCode: string;
  brand: string;
  bg: string;
  raisedBy: string;
  raisedAt: string;
  currentValue: string;
  requestedValue: string;
  justification: string;
  approvers: ApproverStep[];
  overallStatus: "pending" | "approved" | "rejected";
}

// ─── Module-level store ───────────────────────────────────────────────────────

let _amendments: AmendmentRequest[] = [];
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach(fn => fn()); }

export function getAmendments(): AmendmentRequest[] { return _amendments; }

export function addAmendment(req: AmendmentRequest): void {
  _amendments = [req, ..._amendments];
  notify();
}

export function approveAmendmentStep(requestId: string, stepIndex: number): void {
  const now = formatNow();
  _amendments = _amendments.map(ar => {
    if (ar.id !== requestId) return ar;
    const approvers = ar.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "approved" as const, actedAt: now };
      if (i === stepIndex + 1) return { ...a, status: "pending" as const };
      return a;
    });
    const allApproved = approvers.every(a => a.status === "approved");
    return { ...ar, approvers, overallStatus: allApproved ? "approved" as const : "pending" as const };
  });
  notify();
}

export function rejectAmendmentStep(requestId: string, stepIndex: number, reason: string): void {
  const now = formatNow();
  _amendments = _amendments.map(ar => {
    if (ar.id !== requestId) return ar;
    const approvers = ar.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "rejected" as const, actedAt: now, rejectionReason: reason };
      if (i > stepIndex) return { ...a, status: "waiting" as const };
      return a;
    });
    return { ...ar, approvers, overallStatus: "rejected" as const };
  });
  notify();
}

export function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function useAmendmentStore() {
  const [amendments, setAmendments] = useState<AmendmentRequest[]>(getAmendments);
  useEffect(() => {
    return subscribe(() => setAmendments([...getAmendments()]));
  }, []);
  return { amendments };
}
