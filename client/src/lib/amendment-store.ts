import { useState, useEffect } from "react";
import type { ApproverStep } from "./sr-store";
import { formatNow } from "./sr-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AmendmentType =
  | "geo-extension"
  | "channel-extension"
  | "sourcing-amendment";

export interface AmendmentTypeMeta {
  label: string;
  currentLabel: string;
  requestedLabel: string;
  description: string;
}

export const AMENDMENT_TYPE_META: Record<AmendmentType, AmendmentTypeMeta> = {
  "geo-extension": {
    label: "Geo Extension",
    currentLabel: "Current Geographies / Clusters",
    requestedLabel: "Requested Geographies / Clusters",
    description: "Extend distribution to additional geographies or clusters",
  },
  "channel-extension": {
    label: "Channel Extension",
    currentLabel: "Current Channels",
    requestedLabel: "Requested Channels",
    description: "Extend distribution to additional trade channels (GT, MT, Ecom, KA, etc.)",
  },
  "sourcing-amendment": {
    label: "Sourcing Amendment",
    currentLabel: "Current Sourcing Mode / Geos",
    requestedLabel: "Requested Sourcing Mode / Geos",
    description: "Change the sourcing mode or sourcing geography / depot assignments",
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
