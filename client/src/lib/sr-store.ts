import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { addNotification } from "@/lib/notification-store";

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
  approvalComment?: string;
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

  // ── Structured payloads for SR types ───────────────────────────────────────
  addedGeos?: string[];
  addedDepots?: string[];
  addedChannels?: string[];
  sourcingMode?: "decentralized" | "centralized";
  centralizedGeos?: string[];
  centralizedDepots?: string[];

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

const SEED_APPROVERS_APPROVED = [
  { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",         assignedTo: "Meera Nair",   status: "approved" as const, actedAt: "12 Jan 2026, 10:15 AM" },
  { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities",  assignedTo: "Rohan Das",    status: "approved" as const, actedAt: "13 Jan 2026, 02:30 PM" },
  { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",   assignedTo: "Anita Rao",    status: "approved" as const, actedAt: "14 Jan 2026, 11:00 AM" },
  { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",         assignedTo: "Suresh Kumar", status: "approved" as const, actedAt: "15 Jan 2026, 09:45 AM" },
];

const SEED_REQUESTS: ServiceRequest[] = [
  // ── BP-1800 Lakme: Status Change → Active Pack (Approved) ─────────────────
  {
    id:              "SR-SEED-001",
    srType:          "basepack-status-change",
    basepackId:      "BP-1800",
    basepackCode:    "BP-1800",
    basepackName:    "Lakme 9to5 Weightless Mousse Foundation 25ml",
    targetStatus:    "Active Pack",
    brand:           "Lakme",
    bg:              "Beauty and Wellness",
    raisedBy:        "Meera Nair",
    raisedAt:        "12 Jan 2026, 09:30 AM",
    overallStatus:   "approved",
    approvers: SEED_APPROVERS_APPROVED,
    mstnCoverage:    92,
    criteriaMetAtRaise: true,
  },

  // ── BP-1800 Lakme: Geo Extension, CBU-50018001 (Pending — 1/4 done) ───────
  {
    id:              "SR-SEED-002",
    srType:          "geo-extension",
    basepackId:      "BP-1800",
    basepackCode:    "BP-1800",
    basepackName:    "Lakme 9to5 Weightless Mousse Foundation 25ml",
    cbuId:           "CBU-50018001",
    cbuCode:         "CBU-50018001",
    cbuDescription:  "Lakme 9to5 Weightless Mousse Foundation Ivory 25ml",
    addedGeos:       ["HYDERABAD-A", "HYDERABAD-B"],
    addedDepots:     ["HYD-01"],
    justification:   "Expanding to Hyderabad cluster per Q2 distribution plan.",
    brand:           "Lakme",
    bg:              "Beauty and Wellness",
    raisedBy:        "Meera Nair",
    raisedAt:        "03 Apr 2026, 11:15 AM",
    overallStatus:   "pending",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Meera Nair",   status: "approved",  actedAt: "04 Apr 2026, 09:30 AM", approvalComment: "Hyderabad expansion approved per Q2 plan" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",    status: "pending" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",    status: "waiting" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar", status: "waiting" },
    ],
  },

  // ── BP-1700 Pepsodent: Status Change → Active Pack (Approved) ────────────
  {
    id:              "SR-SEED-003",
    srType:          "basepack-status-change",
    basepackId:      "BP-1700",
    basepackCode:    "BP-1700",
    basepackName:    "Pepsodent Germi Check Toothpaste 150g",
    targetStatus:    "Active Pack",
    brand:           "Pepsodent",
    bg:              "Personal Care",
    raisedBy:        "Vikram Singh",
    raisedAt:        "20 Nov 2025, 10:00 AM",
    overallStatus:   "approved",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Vikram Singh", status: "approved", actedAt: "20 Nov 2025, 02:00 PM" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",    status: "approved", actedAt: "21 Nov 2025, 10:30 AM" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",    status: "approved", actedAt: "22 Nov 2025, 09:00 AM" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar", status: "approved", actedAt: "24 Nov 2025, 11:45 AM" },
    ],
    mstnCoverage:    88,
    criteriaMetAtRaise: true,
  },

  // ── BP-1700 Pepsodent: Channel Extension, CBU-50017001 — Ecom + KA (Approved)
  {
    id:              "SR-SEED-004",
    srType:          "channel-extension",
    basepackId:      "BP-1700",
    basepackCode:    "BP-1700",
    basepackName:    "Pepsodent Germi Check Toothpaste 150g",
    cbuId:           "CBU-50017001",
    cbuCode:         "CBU-50017001",
    cbuDescription:  "Pepsodent Germi Check Toothpaste GT Pack 150g",
    addedChannels:   ["Ecom", "KA"],
    justification:   "Listing on Ecom and Key Accounts as part of D2C push.",
    brand:           "Pepsodent",
    bg:              "Personal Care",
    raisedBy:        "Vikram Singh",
    raisedAt:        "05 Feb 2026, 02:45 PM",
    overallStatus:   "approved",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Vikram Singh", status: "approved", actedAt: "06 Feb 2026, 09:00 AM", approvalComment: "Ecom listing aligned with brand strategy" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",    status: "approved", actedAt: "07 Feb 2026, 11:30 AM" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",    status: "approved", actedAt: "08 Feb 2026, 03:00 PM" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar", status: "approved", actedAt: "10 Feb 2026, 10:15 AM" },
    ],
  },

  // ── BP-700 Brooke Bond: Status Change → Active Pack (Rejected at step 1) ──
  {
    id:              "SR-SEED-005",
    srType:          "basepack-status-change",
    basepackId:      "BP-700",
    basepackCode:    "BP-700",
    basepackName:    "Brooke Bond Red Label 500g",
    targetStatus:    "Active Pack",
    brand:           "Brooke Bond",
    bg:              "Foods",
    raisedBy:        "Arun Mehta",
    raisedAt:        "15 Mar 2026, 09:00 AM",
    overallStatus:   "rejected",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Arun Mehta",   status: "rejected", actedAt: "15 Mar 2026, 04:00 PM", rejectionReason: "Insufficient MSTN coverage (< 80%)" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",    status: "waiting" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",    status: "waiting" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar", status: "waiting" },
    ],
    mstnCoverage:    65,
    criteriaMetAtRaise: false,
  },

  // ── BP-700 Brooke Bond: Geo Extension, CBU-50007890 (Approved) ───────────
  {
    id:              "SR-SEED-006",
    srType:          "geo-extension",
    basepackId:      "BP-700",
    basepackCode:    "BP-700",
    basepackName:    "Brooke Bond Red Label 500g",
    cbuId:           "CBU-50007890",
    cbuCode:         "CBU-50007890",
    cbuDescription:  "Brooke Bond Red Label Natural Care Tea 500g",
    addedGeos:       ["PUNE-A", "PUNE-B", "NASHIK-A"],
    addedDepots:     ["PUNE-01", "NAS-01"],
    justification:   "West Maharashtra expansion as per NSM directive.",
    brand:           "Brooke Bond",
    bg:              "Foods",
    raisedBy:        "Arun Mehta",
    raisedAt:        "08 Jan 2026, 03:30 PM",
    overallStatus:   "approved",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Arun Mehta",   status: "approved", actedAt: "09 Jan 2026, 10:00 AM" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",    status: "approved", actedAt: "10 Jan 2026, 02:00 PM" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",    status: "approved", actedAt: "12 Jan 2026, 09:30 AM" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar", status: "approved", actedAt: "13 Jan 2026, 11:15 AM" },
    ],
  },

  // ── BP-800 Closeup: Sourcing Amendment, CBU-50008901 (Pending — 0/1 done) ─
  {
    id:              "SR-SEED-007",
    srType:          "sourcing-amendment",
    basepackId:      "BP-800",
    basepackCode:    "BP-800",
    basepackName:    "Closeup Ever Fresh Gel 150g",
    cbuId:           "CBU-50008901",
    cbuCode:         "CBU-50008901",
    cbuDescription:  "Closeup Ever Fresh Red Hot Gel Toothpaste 150g",
    sourcingMode:    "centralized",
    centralizedGeos: ["DELHI-A", "DELHI-B", "MUMBAI-A"],
    centralizedDepots: ["DEL-01", "MUM-02"],
    justification:   "Centralised sourcing for cost efficiency in North+West clusters.",
    brand:           "Closeup",
    bg:              "Personal Care",
    raisedBy:        "Deepa Krishnan",
    raisedAt:        "21 Apr 2026, 04:00 PM",
    overallStatus:   "pending",
    approvers: [
      { role: "Network Planner", label: "Network Planner", subLabel: "Network Review", assignedTo: "Deepa Krishnan", status: "pending" },
    ],
  },

  // ── BP-800 Closeup: Geo Extension, CBU-50008902 (Pending — 0/4 done) ─────
  {
    id:              "SR-SEED-008",
    srType:          "geo-extension",
    basepackId:      "BP-800",
    basepackCode:    "BP-800",
    basepackName:    "Closeup Ever Fresh Gel 150g",
    cbuId:           "CBU-50008902",
    cbuCode:         "CBU-50008902",
    cbuDescription:  "Closeup Ever Fresh Gel Whitening Toothpaste 150g",
    addedGeos:       ["BANGALORE-A", "BANGALORE-B"],
    addedDepots:     ["BLR-01"],
    justification:   "South India expansion — Bangalore cluster prioritisation.",
    brand:           "Closeup",
    bg:              "Personal Care",
    raisedBy:        "Deepa Krishnan",
    raisedAt:        "25 Apr 2026, 11:30 AM",
    overallStatus:   "pending",
    approvers: [
      { role: "Network Planner",      label: "Network Planner",      subLabel: "Network Review",        assignedTo: "Deepa Krishnan", status: "pending" },
      { role: "Supply Planner",       label: "Supply Planner",       subLabel: "Production Activities", assignedTo: "Rohan Das",      status: "waiting" },
      { role: "Distribution Planner", label: "Distribution Planner", subLabel: "Logistics Activities",  assignedTo: "Anita Rao",      status: "waiting" },
      { role: "NCSM",                 label: "NCSM",                 subLabel: "Final Approval",        assignedTo: "Suresh Kumar",   status: "waiting" },
    ],
  },
];

let _requests: ServiceRequest[] = [...SEED_REQUESTS];
let _bpStatusOverrides: Record<string, string> = {};
let _channelOverrides: Record<string, string[]> = {};
let _sourcingOverrides: Record<string, { mode: "decentralized" | "centralized"; centralizedGeos: string[]; centralizedDepots: string[] }> = {};
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

export function getChannelOverrides(): Record<string, string[]> {
  return _channelOverrides;
}

export function getSourcingOverrides(): Record<string, { mode: "decentralized" | "centralized"; centralizedGeos: string[]; centralizedDepots: string[] }> {
  return _sourcingOverrides;
}

export function addRequest(req: ServiceRequest): void {
  _requests = [req, ..._requests];
  if (req.srType === "basepack-status-change" && req.basepackId) {
    _bpStatusOverrides = { ..._bpStatusOverrides, [req.basepackId]: "Draft" };
  }
  notify();
}

export function approveStep(requestId: string, stepIndex: number, comment?: string): void {
  const now = formatNow();
  _requests = _requests.map(sr => {
    if (sr.id !== requestId) return sr;
    const approvers = sr.approvers.map((a, i) => {
      if (i === stepIndex) return { ...a, status: "approved" as const, actedAt: now, approvalComment: comment?.trim() || undefined };
      if (i === stepIndex + 1) return { ...a, status: "pending" as const };
      return a;
    });
    const allApproved = approvers.every(a => a.status === "approved");
    if (allApproved && sr.srType === "basepack-status-change" && sr.basepackId && sr.targetStatus) {
      _bpStatusOverrides = { ..._bpStatusOverrides, [sr.basepackId]: sr.targetStatus };
    }
    if (allApproved && sr.srType === "geo-extension" && sr.cbuId && (sr.addedGeos?.length || sr.addedDepots?.length)) {
      apiRequest("POST", `/api/network-entries/${sr.cbuId}/geo-extension`, {
        addedGeos: sr.addedGeos ?? [],
        addedDepots: sr.addedDepots ?? [],
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
        addNotification({
          type: "geo-extension-applied",
          srId: sr.id,
          cbuId: sr.cbuId!,
          cbuCode: sr.cbuCode ?? sr.cbuId!,
          cbuDescription: sr.cbuDescription ?? "",
          raisedBy: sr.raisedBy,
          addedGeos: sr.addedGeos ?? [],
          addedDepots: sr.addedDepots ?? [],
          approvers,
        });
      }).catch(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/network-entries"] });
      });
    }
    if (allApproved && sr.srType === "channel-extension" && sr.cbuId && sr.addedChannels?.length) {
      const prev = _channelOverrides[sr.cbuId] ?? [];
      const merged = [...new Set([...prev, ...sr.addedChannels])];
      _channelOverrides = { ..._channelOverrides, [sr.cbuId]: merged };
    }
    if (allApproved && sr.srType === "sourcing-amendment" && sr.cbuId && sr.sourcingMode) {
      _sourcingOverrides = {
        ..._sourcingOverrides,
        [sr.cbuId]: {
          mode: sr.sourcingMode,
          centralizedGeos: sr.centralizedGeos ?? [],
          centralizedDepots: sr.centralizedDepots ?? [],
        },
      };
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
  const [channelOverrides, setChannelOverrides] = useState<Record<string, string[]>>(getChannelOverrides);
  const [sourcingOverrides, setSourcingOverrides] = useState<Record<string, { mode: "decentralized" | "centralized"; centralizedGeos: string[]; centralizedDepots: string[] }>>(getSourcingOverrides);
  useEffect(() => {
    return subscribe(() => {
      setRequests([...getRequests()]);
      setBpStatusOverrides({ ...getBpStatusOverrides() });
      setChannelOverrides({ ...getChannelOverrides() });
      setSourcingOverrides({ ...getSourcingOverrides() });
    });
  }, []);
  return { requests, bpStatusOverrides, channelOverrides, sourcingOverrides };
}
