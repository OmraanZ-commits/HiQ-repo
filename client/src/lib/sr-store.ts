import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaterialCriteria {
  code: string;
  description: string;
  mstnCleared: boolean;
  lastUpdated: string;
}

export interface ApproverStep {
  role: string;
  label: string;
  subLabel: string;
  assignedTo?: string;
  status: "waiting" | "pending" | "approved" | "rejected";
  actedAt?: string;
  rejectionReason?: string;
}

export interface ServiceRequest {
  id: string;
  requestType: "Basepack Status Change";
  targetStatus: string;
  basepackId: string;
  basepackCode: string;
  basepackName: string;
  brand: string;
  bg: string;
  raisedBy: string;
  raisedAt: string;
  mstnCoverage: number;
  tdpCoverage: number;
  criteriaMetAtRaise: boolean;
  materials: MaterialCriteria[];
  approvers: ApproverStep[];
  overallStatus: "pending" | "approved" | "rejected";
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const REJECTION_REASONS = [
  "Insufficient MSTN coverage (< 80%)",
  "TDP estimates not built in DP tool",
  "Production capacity not confirmed",
  "Logistics routing not ready",
  "Price activation pending",
  "Other — refer to comments",
];

export function formatNow(): string {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Module-level store ───────────────────────────────────────────────────────

let _requests: ServiceRequest[] = [];
let _bpStatusOverrides: Record<string, string> = {};
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(fn => fn());
}

export function getRequests(): ServiceRequest[] {
  return _requests;
}

export function getRequest(id: string): ServiceRequest | undefined {
  return _requests.find(r => r.id === id);
}

export function getBpStatusOverrides(): Record<string, string> {
  return _bpStatusOverrides;
}

export function addRequest(req: ServiceRequest): void {
  _requests = [req, ..._requests];
  _bpStatusOverrides = { ..._bpStatusOverrides, [req.basepackId]: "Draft" };
  notify();
}

export function approveStep(requestId: string, stepIndex: number): void {
  const now = formatNow();
  _requests = _requests.map(sr => {
    if (sr.id !== requestId) return sr;
    const approvers = sr.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "approved" as const, actedAt: now };
      if (i === stepIndex + 1) return { ...a, status: "pending" as const };
      return a;
    });
    const allApproved = approvers.every(a => a.status === "approved");
    if (allApproved) {
      _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: sr.targetStatus };
    }
    return { ...sr, approvers, overallStatus: allApproved ? "approved" as const : "pending" as const };
  });
  notify();
}

export function rejectStep(requestId: string, stepIndex: number, reason: string): void {
  const now = formatNow();
  _requests = _requests.map(sr => {
    if (sr.id !== requestId) return sr;
    const approvers = sr.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "rejected" as const, actedAt: now, rejectionReason: reason };
      if (i > stepIndex) return { ...a, status: "waiting" as const };
      return a;
    });
    _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: "Draft" };
    return { ...sr, approvers, overallStatus: "rejected" as const };
  });
  notify();
}

export function setBpStatusOverride(bpId: string, status: string): void {
  _bpStatusOverrides = { ..._bpStatusOverrides, [bpId]: status };
  notify();
}

export function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSrStore() {
  const [requests, setRequests] = useState<ServiceRequest[]>(getRequests);
  const [bpStatusOverrides, setBpStatusOverrides] = useState<Record<string, string>>(getBpStatusOverrides);
  useEffect(() => {
    return subscribe(() => {
      setRequests([...getRequests()]);
      setBpStatusOverrides({ ...getBpStatusOverrides() });
    });
  }, []);
  return { requests, bpStatusOverrides };
}
