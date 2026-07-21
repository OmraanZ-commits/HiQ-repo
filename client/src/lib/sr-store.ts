import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { addNotification } from "@/lib/notification-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SrType =
  | "basepack-status-change"
  | "geo-extension"
  | "channel-extension"
  | "sourcing-amendment"
  | "customer-chain-amendment"
  | "network-change-date-amendment"
  | "price-lot-change";

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
  "customer-chain-amendment": {
    label: "Customer Chain Amendment",
    description: "Amend MT sub-channel customer chains mapped against a cluster",
    colorClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
  },
  "network-change-date-amendment": {
    label: "Network Change Date Amendment",
    description: "Amend the network change date due to MSTN clearance not met",
    colorClass: "bg-orange-100 text-orange-700 border-orange-300",
  },
  "price-lot-change": {
    label: "Price Lot Change",
    description: "Request a new or replacement price lot for an existing CBU, with overlap assessment",
    colorClass: "bg-rose-100 text-rose-700 border-rose-300",
  },
};

export const CBU_SR_TYPES: SrType[] = [
  "geo-extension",
  "channel-extension",
  "sourcing-amendment",
  "customer-chain-amendment",
  "network-change-date-amendment",
  "price-lot-change",
];

export interface MaterialCriteria {
  code: string;
  description: string;
  mstnCleared: boolean;
  lastUpdated: string;
  mstnByDepot?: Record<string, number>;
  networkChangeDate?: string | null;
}

export interface DepotDecision {
  cbuCode: string;
  depotCode: string;
  mstnPct: number | null;
  mstnCleared: boolean;
  ncsmDecision: "approved" | "rejected" | "pending";
  activationStatus: "Active" | "Not Activated" | "Pending";
}

export interface BpDates {
  activationDate?: string;
  inactiveDate?: string;
  delistDate?: string;
}

export interface ValidationCheck {
  status: string;
  [key: string]: any;
}

export interface DemandVisibilityMonth {
  mocMonth: string;
  totalUnits: number;
}

export interface DemandVisibilityByCbu {
  cbuCode?: string;
  cbuDescription?: string;
  status: string;
  totalUnits?: number;
  mocMonths?: number;
  byMonth?: DemandVisibilityMonth[];
}

export interface ValidationSummary {
  demandVisibility: ValidationCheck & {
    totalUnits?: number;
    mocMonths?: number;
    byCbu?: DemandVisibilityByCbu[];
  };
  sourcingMatrixCheck: ValidationCheck & { mode?: string | null; details?: string };
  priceCheck: ValidationCheck & { details?: string };
  mstnCheck: ValidationCheck & { coverage?: number; threshold?: number };
}

export interface ApproverStep {
  role: string;
  label: string;
  subLabel: string;
  assignedTo?: string;
  status: "waiting" | "pending" | "approved" | "rejected";
  actedAt?: string;
  rejectionReason?: string;
  approvalComment?: string;
  comments?: string;
  effectiveDate?: string;
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
  depotDecisions?: DepotDecision[];

  // ── CBU context (geo / channel / sourcing) ─────────────────────────────────
  cbuId?: string;
  cbuCode?: string;
  cbuDescription?: string;
  currentValue?: string;
  requestedValue?: string;
  justification?: string;

  // ── Structured payloads for SR types ───────────────────────────────────────
  addedGeos?: string[];
  addedDepots?: string[];
  addedChannels?: string[];
  removedChannels?: string[];
  requestedChannelMapping?: Record<string, string[]>;
  removedGeos?: string[];
  removedDepots?: string[];
  sourcingMode?: "decentralized" | "centralized";
  sourcingDepotMapping?: Record<string, string>;
  centralizedGeos?: string[];
  centralizedDepots?: string[];
  addedChains?: string[];
  removedChains?: string[];
  requestedCustomerMapping?: Record<string, string[]>;
  currentNetworkChangeDate?: string | null;
  requestedDate?: string;
  effectiveDate?: string;

  // ── Overview validation checks (snapshotted from Network Visibility at raise time) ──
  validationSummary?: ValidationSummary;
  pricingComplete?: boolean;
  sourcingComplete?: boolean;

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

// ─── Backend ↔ Frontend Mappers ────────────────────────────────────────────

function _formatDate(iso: string | null | undefined): string {
  if (!iso) return formatNow();
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function _mapApproverFromBackend(a: any): ApproverStep {
  return {
    role: a.label || a.role || "",
    label: a.label || "",
    subLabel: a.subLabel || "",
    assignedTo: a.assignedTo,
    status: a.status as ApproverStep["status"],
    actedAt: a.actionedAt ? _formatDate(a.actionedAt) : undefined,
    rejectionReason: a.rejectionReason ?? undefined,
    approvalComment: a.approvalComment ?? a.comments ?? undefined,
    comments: a.comments ?? undefined,
    effectiveDate: a.effectiveDate ?? undefined,
  };
}

function _mapApproverToBackend(a: ApproverStep): any {
  return {
    label: a.label,
    subLabel: a.subLabel,
    assignedTo: a.assignedTo,
    status: a.status,
    actionedAt: a.actedAt ?? null,
    rejectionReason: a.rejectionReason ?? null,
    comments: a.comments ?? null,
    effectiveDate: a.effectiveDate ?? null,
  };
}

export function mapBackendSrToFrontend(sr: any): ServiceRequest {
  const bpCode = sr.basepackCode || sr.basepakCode || "";
  return {
    id: sr.id,
    srType: sr.srType as SrType,
    basepackId: bpCode,
    basepackCode: bpCode,
    basepackName: sr.basepackName || sr.basepakName || "",
    targetStatus: sr.targetStatus || sr.requestedValue || undefined,
    mstnCoverage: sr.mstnCoverageAtRaise ?? undefined,
    criteriaMetAtRaise: sr.criteriaMetAtRaise ?? undefined,
    materials: sr.materials ?? [],
    depotDecisions: sr.depotDecisions ?? undefined,
    cbuId: sr.cbuId ?? undefined,
    cbuCode: sr.cbuCode ?? undefined,
    cbuDescription: sr.cbuDescription ?? undefined,
    currentValue: sr.currentValue ?? undefined,
    requestedValue: sr.requestedValue ?? undefined,
    justification: sr.businessJustification ?? undefined,
    addedGeos: sr.addedGeos ?? [],
    addedDepots: sr.addedDepots ?? [],
    addedChannels: sr.addedChannels ?? [],
    removedGeos: sr.removedGeos ?? [],
    removedDepots: sr.removedDepots ?? [],
    sourcingMode: (sr.sourcingMode ?? undefined) as ServiceRequest["sourcingMode"],
    centralizedGeos: sr.centralizedGeo ?? [],
    centralizedDepots: sr.centralizedDepots ?? [],
    addedChains: sr.addedChains ?? [],
    removedChains: sr.removedChains ?? [],
    requestedCustomerMapping: sr.requestedCustomerMapping ?? {},
    requestedDate: sr.requestedDate ?? undefined,
    effectiveDate: sr.effectiveDate ?? undefined,
    validationSummary: sr.validationSummary ?? undefined,
    pricingComplete: sr.pricingComplete ?? undefined,
    sourcingComplete: sr.sourcingComplete ?? undefined,
    brand: sr.brand || "",
    bg: sr.businessGroup || "",
    raisedBy: sr.raisedBy || "",
    raisedAt: _formatDate(sr.createdAt),
    approvers: (sr.approvers ?? []).map(_mapApproverFromBackend),
    overallStatus: (sr.status ?? "pending") as ServiceRequest["overallStatus"],
  };
}

function _mapFrontendSrToBackend(sr: ServiceRequest): any {
  return {
    srType: sr.srType,
    raisedBy: sr.raisedBy,
    businessGroup: sr.bg,
    brand: sr.brand,
    basepackCode: sr.basepackCode,
    basepackName: sr.basepackName,
    targetStatus: sr.targetStatus,
    requestedValue: sr.targetStatus ?? sr.requestedValue,
    currentValue: sr.currentValue,
    businessJustification: sr.justification,
    criteriaMetAtRaise: sr.criteriaMetAtRaise,
    mstnCoverageAtRaise: sr.mstnCoverage,
    depotDecisions: sr.depotDecisions ?? undefined,
    cbuId: sr.cbuId,
    cbuCode: sr.cbuCode,
    cbuDescription: sr.cbuDescription,
    addedGeos: sr.addedGeos ?? [],
    addedDepots: sr.addedDepots ?? [],
    addedChannels: sr.addedChannels ?? [],
    removedGeos: sr.removedGeos ?? [],
    removedDepots: sr.removedDepots ?? [],
    sourcingMode: sr.sourcingMode,
    centralizedGeo: sr.centralizedGeos ?? [],
    centralizedDepots: sr.centralizedDepots ?? [],
    addedChains: sr.addedChains ?? [],
    removedChains: sr.removedChains ?? [],
    requestedCustomerMapping: sr.requestedCustomerMapping ?? undefined,
    requestedDate: sr.requestedDate ?? undefined,
    effectiveDate: sr.effectiveDate ?? undefined,
    approvers: (sr.approvers ?? []).map(_mapApproverToBackend),
  };
}

// ─── Module-level store ────────────────────────────────────────────────────

let _requests: ServiceRequest[] = [];
let _bpStatusOverrides: Record<string, string> = {};
let _channelOverrides: Record<string, string[]> = {};
let _sourcingOverrides: Record<string, { mode: "decentralized" | "centralized"; depotMapping: Record<string, string>; centralizedGeos: string[]; centralizedDepots: string[] }> = {};
let _geoRemovalOverrides: Record<string, { removedGeos: string[]; removedDepots: string[] }> = {};
let _customerMappingOverrides: Record<string, Record<string, string[]>> = {};
let _networkChangeDateOverrides: Record<string, string> = {};
let _depotDecisionOverrides: Record<string, DepotDecision[]> = {};
let _bpDates: Record<string, BpDates> = {};
let _initialised = false;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(fn => fn());
}

// ─── Backend Hydration ────────────────────────────────────────────────────────

async function _loadFromBackend(): Promise<void> {
  try {
    const [srsRaw, bpStatusRaw, bpDatesRaw] = await Promise.all([
      fetch("/api/service-requests").then(r => r.ok ? r.json() : []),
      fetch("/api/basepack-status").then(r => r.ok ? r.json() : {}),
      fetch("/api/paid-bible/basepack-dates").then(r => r.ok ? r.json() : []),
    ]);

    _requests = Array.isArray(srsRaw) ? srsRaw.map(mapBackendSrToFrontend) : [];
    _bpStatusOverrides = typeof bpStatusRaw === "object" && !Array.isArray(bpStatusRaw) ? (bpStatusRaw as Record<string, string>) : {};

    if (Array.isArray(bpDatesRaw)) {
      _bpDates = {};
      for (const d of bpDatesRaw) {
        _bpDates[d.bpCode] = {
          activationDate: d.activationDate ?? undefined,
          inactiveDate: d.inactiveDate ?? undefined,
          delistDate: d.delistDate ?? undefined,
        };
      }
    }

    // Derive lifecycle dates from approved SRs for basepacks that have no
    // DB-persisted date yet (e.g. pre-seeded or legacy approved SRs).
    // Apply in chronological order so the most recent SR's date wins.
    const approvedStatusSrs = _requests
      .filter(r => r.srType === "basepack-status-change" && r.overallStatus === "approved" && r.basepackId && r.targetStatus)
      .sort((a, b) => a.raisedAt.localeCompare(b.raisedAt));

    for (const sr of approvedStatusSrs) {
      const d: BpDates = { ..._bpDates[sr.basepackId] };
      const lastActedAt = [...sr.approvers].reverse().find(a => a.actedAt)?.actedAt;
      if (!lastActedAt) continue;
      if (sr.targetStatus === "Active Pack") d.activationDate = lastActedAt;
      else if (sr.targetStatus === "Inactive Pack") d.inactiveDate = lastActedAt;
      else if (sr.targetStatus === "Delisted Packs" || sr.targetStatus === "Stock Base Delisted") d.delistDate = lastActedAt;
      _bpDates[sr.basepackId] = d;

      // Replay depot decisions so partial-activation trigger fires on load
      if (sr.depotDecisions && sr.depotDecisions.length > 0) {
        const resolved: DepotDecision[] = sr.depotDecisions.map(d =>
          d.ncsmDecision === "pending" ? { ...d, ncsmDecision: "rejected" as const, activationStatus: "Not Activated" as const } : d
        );
        _depotDecisionOverrides = { ..._depotDecisionOverrides, [sr.basepackId]: resolved };
      }
    }

    _initialised = true;
    notify();
  } catch {
    _initialised = true;
    notify();
  }
}

// ─── Public Getters ──────────────────────────────────────────────────────────

export function getRequests(): ServiceRequest[] {
  return _requests;
}

export function getRequest(id: string): ServiceRequest | undefined {
  return _requests.find(r => r.id === id);
}

export function getBpStatusOverrides(): Record<string, string> {
  return _bpStatusOverrides;
}

export function getChannelOverrides(): Record<string, string[]> {
  return _channelOverrides;
}

export function getSourcingOverrides(): Record<string, { mode: "decentralized" | "centralized"; depotMapping: Record<string, string>; centralizedGeos: string[]; centralizedDepots: string[] }> {
  return _sourcingOverrides;
}

export function getGeoRemovalOverrides(): Record<string, { removedGeos: string[]; removedDepots: string[] }> {
  return _geoRemovalOverrides;
}

export function getCustomerMappingOverrides(): Record<string, Record<string, string[]>> {
  return _customerMappingOverrides;
}

export function getNetworkChangeDateOverrides(): Record<string, string> {
  return _networkChangeDateOverrides;
}

export function getDepotDecisionOverrides(): Record<string, DepotDecision[]> {
  return _depotDecisionOverrides;
}

export function getBpDates(): Record<string, BpDates> { return _bpDates; }

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addRequest(req: ServiceRequest): void {
  // Optimistically add to local state
  _requests = [req, ..._requests];
  notify();

  // Persist to backend
  const payload = _mapFrontendSrToBackend(req);
  apiRequest("POST", "/api/service-requests", payload)
    .then((savedSr: any) => {
      // Replace the optimistic entry with the backend-assigned record
      _requests = _requests.map(r =>
        r.id === req.id ? mapBackendSrToFrontend(savedSr) : r
      );
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      notify();
    })
    .catch(() => {
      // Keep the optimistic entry on failure; data will reconcile on next reload
    });
}

function _deriveFinalBpStatus(decisions: DepotDecision[] | undefined, fallback: string | undefined): string {
  if (!decisions || decisions.length === 0) return fallback ?? "Active Pack";
  const approved = decisions.filter(d => d.ncsmDecision === "approved").length;
  const total = decisions.length;
  if (approved === 0) return "Draft";
  if (approved === total) return "Active Pack";
  return "Partially Active";
}

export function approveStep(requestId: string, stepIndex: number, comment?: string, effectiveDate?: string, depotDecisions?: DepotDecision[]): void {
  const now = formatNow();
  let fullyApprovedSr: ServiceRequest | null = null;

  // Optimistic local update
  _requests = _requests.map(sr => {
    if (sr.id !== requestId) return sr;
    const approvers = sr.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "approved" as const, actedAt: now, approvalComment: comment?.trim() || undefined, comments: comment?.trim() || undefined, effectiveDate: effectiveDate ?? a.effectiveDate };
      if (i === stepIndex + 1) return { ...a, status: "pending" as const };
      return a;
    });
    const allApproved = approvers.every(a => a.status === "approved");

    if (allApproved) {
      // Apply local overrides immediately for responsive UI
      if (sr.srType === "basepack-status-change" && sr.basepackId) {
        const finalDecisions = depotDecisions ?? sr.depotDecisions;
        const finalStatus = _deriveFinalBpStatus(finalDecisions, sr.targetStatus);
        _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: finalStatus };
        if (finalDecisions && finalDecisions.length > 0) {
          const resolved: DepotDecision[] = finalDecisions.map(d =>
            d.ncsmDecision === "pending" ? { ...d, ncsmDecision: "rejected" as const, activationStatus: "Not Activated" as const } : d
          );
          _depotDecisionOverrides = { ..._depotDecisionOverrides, [sr.basepackId]: resolved };
        }
        const d: Record<string, BpDates> = { ..._bpDates };
        _applyDateFromSr(d, { ...sr, approvers });
        _bpDates = d;
      }
      if (sr.srType === "geo-extension" && sr.cbuId && (sr.removedGeos?.length || sr.removedDepots?.length)) {
        const prev = _geoRemovalOverrides[sr.cbuId] ?? { removedGeos: [], removedDepots: [] };
        _geoRemovalOverrides = {
          ..._geoRemovalOverrides,
          [sr.cbuId]: {
            removedGeos: Array.from(new Set([...prev.removedGeos, ...(sr.removedGeos ?? [])])),
            removedDepots: Array.from(new Set([...prev.removedDepots, ...(sr.removedDepots ?? [])])),
          },
        };
      }
      if (sr.srType === "channel-extension" && sr.cbuId && sr.addedChannels?.length) {
        const prev = _channelOverrides[sr.cbuId] ?? [];
        const merged = Array.from(new Set([...prev, ...sr.addedChannels]));
        _channelOverrides = { ..._channelOverrides, [sr.cbuId]: merged };
      }
      if (sr.srType === "sourcing-amendment" && sr.cbuId && sr.sourcingMode) {
        _sourcingOverrides = {
          ..._sourcingOverrides,
          [sr.cbuId]: {
            mode: sr.sourcingMode,
            depotMapping: sr.sourcingDepotMapping ?? {},
            centralizedGeos: sr.centralizedGeos ?? [],
            centralizedDepots: sr.centralizedDepots ?? [],
          },
        };
      }
      if (sr.srType === "customer-chain-amendment" && sr.cbuId && sr.requestedCustomerMapping) {
        const prev = _customerMappingOverrides[sr.cbuId] ?? {};
        _customerMappingOverrides = {
          ..._customerMappingOverrides,
          [sr.cbuId]: { ...prev, ...sr.requestedCustomerMapping },
        };
      }
      if (sr.srType === "network-change-date-amendment" && sr.cbuId && sr.requestedDate) {
        _networkChangeDateOverrides = { ..._networkChangeDateOverrides, [sr.cbuId]: sr.requestedDate };
      }
      fullyApprovedSr = { ...sr, approvers, overallStatus: "approved" };
    }

    return { ...sr, approvers, overallStatus: allApproved ? "approved" as const : "pending" as const };
  });

  notify();

  // Persist approval to backend via saga
  apiRequest("POST", `/api/saga/sr-approve/${requestId}`, {
    stepIndex,
    actionedBy: "Portal User",
    comments: comment?.trim() || undefined,
    effectiveDate: effectiveDate ?? undefined,
    depotDecisions: depotDecisions ?? undefined,
  }).then(() => {
    // Refresh backend state after saga completes
    queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/basepack-status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/paid-bible/basepack-dates"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });

    if (fullyApprovedSr) {
      const fsr = fullyApprovedSr as ServiceRequest;
      if (fsr.srType === "geo-extension" && fsr.cbuId && (fsr.addedGeos?.length || fsr.addedDepots?.length)) {
        addNotification({
          type: "geo-extension-applied",
          srId: fsr.id,
          cbuId: fsr.cbuId!,
          cbuCode: fsr.cbuCode ?? fsr.cbuId!,
          cbuDescription: fsr.cbuDescription ?? "",
          raisedBy: fsr.raisedBy,
          addedGeos: fsr.addedGeos ?? [],
          addedDepots: fsr.addedDepots ?? [],
          approvers: fsr.approvers,
        });
      }
    }
  }).catch(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
  });
}

export function rejectStep(requestId: string, stepIndex: number, reason: string): void {
  const now = formatNow();

  // Optimistic local update
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

  // Persist rejection to backend via saga
  apiRequest("POST", `/api/saga/sr-reject/${requestId}`, {
    stepIndex,
    actionedBy: "Portal User",
    reason,
  }).then(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/basepack-status"] });
  }).catch(() => {
    // Optimistic state remains
  });
}

export function setBpStatusOverride(bpId: string, status: string): void {
  _bpStatusOverrides = { ..._bpStatusOverrides, [bpId]: status };
  notify();

  apiRequest("PUT", `/api/basepack-status/${bpId}`, {
    bpId,
    status,
    appliedBy: "Portal User",
  }).then(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/basepack-status"] });
  }).catch(() => {
    // optimistic state remains; will reconcile on next load
  });
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _applyDateFromSr(dates: Record<string, BpDates>, sr: ServiceRequest) {
  if (sr.srType !== "basepack-status-change" || !sr.basepackId || !sr.targetStatus) return;
  const effectiveDate = [...sr.approvers].reverse().find(a => a.actedAt)?.actedAt;
  if (!effectiveDate) return;
  const current = dates[sr.basepackId] ?? {};
  if (sr.targetStatus === "Active Pack")                                                  current.activationDate = effectiveDate;
  else if (sr.targetStatus === "Inactive Pack")                                           current.inactiveDate   = effectiveDate;
  else if (sr.targetStatus === "Delisted Packs" || sr.targetStatus === "Stock Base Delisted") current.delistDate = effectiveDate;
  dates[sr.basepackId] = current;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSrStore() {
  const [requests, setRequests] = useState<ServiceRequest[]>(getRequests);
  const [bpStatusOverrides, setBpStatusOverridesState] = useState<Record<string, string>>(getBpStatusOverrides);
  const [channelOverrides, setChannelOverrides] = useState<Record<string, string[]>>(getChannelOverrides);
  const [sourcingOverrides, setSourcingOverrides] = useState<Record<string, { mode: "decentralized" | "centralized"; depotMapping: Record<string, string>; centralizedGeos: string[]; centralizedDepots: string[] }>>(getSourcingOverrides);
  const [geoRemovalOverrides, setGeoRemovalOverrides] = useState<Record<string, { removedGeos: string[]; removedDepots: string[] }>>(getGeoRemovalOverrides);
  const [customerMappingOverrides, setCustomerMappingOverrides] = useState<Record<string, Record<string, string[]>>>(getCustomerMappingOverrides);
  const [networkChangeDateOverrides, setNetworkChangeDateOverrides] = useState<Record<string, string>>(getNetworkChangeDateOverrides);
  const [depotDecisionOverrides, setDepotDecisionOverrides] = useState<Record<string, DepotDecision[]>>(getDepotDecisionOverrides);
  const [bpDates, setBpDatesState] = useState<Record<string, BpDates>>(getBpDates);

  useEffect(() => {
    // Load backend state on mount if not already done
    if (!_initialised) {
      _loadFromBackend();
    }

    return subscribe(() => {
      setRequests([...getRequests()]);
      setBpStatusOverridesState({ ...getBpStatusOverrides() });
      setChannelOverrides({ ...getChannelOverrides() });
      setSourcingOverrides({ ...getSourcingOverrides() });
      setGeoRemovalOverrides({ ...getGeoRemovalOverrides() });
      setCustomerMappingOverrides({ ...getCustomerMappingOverrides() });
      setNetworkChangeDateOverrides({ ...getNetworkChangeDateOverrides() });
      setDepotDecisionOverrides({ ...getDepotDecisionOverrides() });
      setBpDatesState({ ...getBpDates() });
    });
  }, []);

  return {
    requests, bpStatusOverrides, channelOverrides, sourcingOverrides, geoRemovalOverrides,
    customerMappingOverrides, networkChangeDateOverrides, depotDecisionOverrides, bpDates,
  };
}
