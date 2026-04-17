import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SrType =
  | "basepack-status-change"
  | "geo-extension"
  | "channel-extension"
  | "sourcing-amendment";

export interface SrTypeMeta {
  label: string;
  description: string;
  colorClass: string;
}

export const SR_TYPE_META: Record<SrType, SrTypeMeta> = {
  "basepack-status-change": {
    label: "Status Change",
    description: "Basepack status change approval",
    colorClass: "bg-blue-100 text-blue-700 border-blue-300",
  },
  "geo-extension": {
    label: "Geo Extension",
    description: "Extend distribution to additional geographies or clusters",
    colorClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  "channel-extension": {
    label: "Channel Extension",
    description: "Extend to additional trade channels (GT, MT, Ecom, KA…)",
    colorClass: "bg-violet-100 text-violet-700 border-violet-300",
  },
  "sourcing-amendment": {
    label: "Sourcing Amendment",
    description: "Change sourcing mode or centralized depot scope",
    colorClass: "bg-amber-100 text-amber-700 border-amber-300",
  },
};

export const CBU_SR_TYPES: SrType[] = [
  "geo-extension",
  "channel-extension",
  "sourcing-amendment",
];

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
  srType: SrType;

  // ── Basepack context (basepack-status-change) ──────────────────────────────
  basepackId: string;
  basepackCode: string;
  basepackName: string;
  targetStatus?: string;
  mstnCoverage?: number;
  criteriaMetAtRaise?: boolean;
  materials?: MaterialCriteria[];

  // ── CBU context (geo / channel / sourcing) ─────────────────────────────────
  cbuId?: string;
  cbuCode?: string;
  cbuDescription?: string;
  currentValue?: string;
  requestedValue?: string;
  justification?: string;
  addedGeos?: string[];
  addedDepots?: string[];


  // ── Common ─────────────────────────────────────────────────────────────────
  brand: string;
  bg: string;
  raisedBy: string;
  raisedAt: string;
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
let _geoOverrides: Record<string, { geos: string[]; depots: string[] }> = {};
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

export function getGeoOverrides(): Record<string, { geos: string[]; depots: string[] }> {
  return _geoOverrides;
}

export function addRequest(req: ServiceRequest): void {
  _requests = [req, ..._requests];
  if (req.srType === "basepack-status-change" && req.basepackId) {
    _bpStatusOverrides = { ..._bpStatusOverrides, [req.basepackId]: "Draft" };
  }
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
    if (allApproved && sr.srType === "basepack-status-change" && sr.basepackId && sr.targetStatus) {
      _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: sr.targetStatus };
    }
    if (allApproved && sr.srType === "geo-extension" && sr.cbuId && (sr.addedGeos?.length || sr.addedDepots?.length)) {
      const prev = _geoOverrides[sr.cbuId] ?? { geos: [], depots: [] };
      const mergedGeos   = [...new Set([...prev.geos,   ...(sr.addedGeos   ?? [])])];
      const mergedDepots = [...new Set([...prev.depots, ...(sr.addedDepots ?? [])])];
      _geoOverrides = { ..._geoOverrides, [sr.cbuId]: { geos: mergedGeos, depots: mergedDepots } };
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/service-requests"),
      });
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
    if (sr.srType === "basepack-status-change" && sr.basepackId) {
      _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: "Draft" };
    }
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
  const [geoOverrides, setGeoOverrides] = useState<Record<string, { geos: string[]; depots: string[] }>>(getGeoOverrides);
  useEffect(() => {
    return subscribe(() => {
      setRequests([...getRequests()]);
      setBpStatusOverrides({ ...getBpStatusOverrides() });
      setGeoOverrides({ ...getGeoOverrides() });
    });
  }, []);
  return { requests, bpStatusOverrides, geoOverrides };
}
