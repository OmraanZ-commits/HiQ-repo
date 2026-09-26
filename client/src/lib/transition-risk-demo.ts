export type FindingStatus = "pass" | "concern" | "unknown" | "conflict";
export type RiskLevel = "Low" | "Medium" | "High" | "Insufficient evidence";

export interface NetworkEvidence {
  id: string;
  basepack: string | null;
  basepackDescription?: string | null;
  cbuCode: string | null;
  materialDescription?: string | null;
  bg?: string | null;
  brand?: string | null;
  networkStatus?: string | null;
  networkChangeDate?: string | null;
  typeOfNetwork?: string | null;
  priceUpdatedAt?: string | null;
  predecessorDoh?: number | null;
  successorDoh?: number | null;
  dohSnapshotDate?: string | null;
  slobRisk?: boolean | null;
  mstnPercentage?: number | null;
  mstnByDepot?: Record<string, number> | null;
  depot?: string[] | null;
  sourcingMode?: string | null;
}

export interface BasepackEvidence {
  basepackCode: string;
  basepackName: string;
  effectiveStatus: string;
  derivedStatus: string;
}

export interface DepotStockEvidence {
  id: string;
  cbuCode: string;
  basepackCode: string;
  depotCode: string;
  quantityCases: number;
  snapshotDate: string;
}

export interface RequestEvidence {
  id: string;
  srType: string;
  status: string;
  basepackCode?: string | null;
  cbuCode?: string | null;
  targetStatus?: string | null;
  addedDepots?: string[] | null;
  approvers?: Array<{ label?: string; assignedTo?: string; status: string }> | null;
}

export interface ClearanceEvidence {
  criteriaMet: boolean;
  mstnCoverage: number;
  materials: Array<{ code: string; mstnCleared: boolean; mstnByDepot?: Record<string, number> }>;
}

export interface AgentFinding {
  id: "quality" | "lifecycle" | "stock" | "depot" | "blockers";
  name: string;
  role: string;
  evidence: { status: FindingStatus; source: string; detail: string };
}

export interface RiskAssessment {
  level: RiskLevel;
  confidence: "High" | "Low";
  explanation: string;
  drivers: string[];
}

export const AGENT_ORDER: AgentFinding["id"][] = [
  "quality", "lifecycle", "stock", "depot", "blockers",
];

export function isCurrentSnapshot(value: string | null | undefined, today = new Date()): boolean {
  if (!value) return false;
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();
  if (!Number.isFinite(day)) return false;
  const currentDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return day <= currentDay && currentDay - day <= 30 * 24 * 60 * 60 * 1000;
}

export function evaluateTransitionRisk(
  entry: NetworkEvidence,
  basepack: BasepackEvidence,
  stock: DepotStockEvidence[],
  requests: RequestEvidence[],
  clearance: ClearanceEvidence | null,
  basepackEntries: NetworkEvidence[] = [entry],
): {
  agents: AgentFinding[];
  assessment: RiskAssessment;
  unmappedStock: DepotStockEvidence[];
  activationReady: boolean;
  pendingActivation?: RequestEvidence;
  pendingAmendments: RequestEvidence[];
} {
  const mapped = new Set(entry.depot ?? []);
  const cbustock = stock.filter(row =>
    row.cbuCode === entry.cbuCode && row.basepackCode === basepack.basepackCode);
  const freshStock = cbustock.filter(row => isCurrentSnapshot(row.snapshotDate));
  const unmappedStock = freshStock.filter(row =>
    row.quantityCases > 0 && !mapped.has(row.depotCode));
  const pending = requests.filter(row => row.status === "pending");
  const pendingActivation = pending.find(row =>
    row.srType === "basepack-status-change" &&
    row.targetStatus === "Active Pack" &&
    row.basepackCode === basepack.basepackCode);
  const pendingAmendments = pending.filter(row =>
    row.srType === "sourcing-amendment" && row.cbuCode === entry.cbuCode);
  const scored = Object.entries(entry.mstnByDepot ?? {});
  const missingScores = Array.from(mapped).filter(depot => !scored.some(([code]) => code === depot));
  const scoreCount = scored.filter(([depot, score]) => mapped.has(depot) && score >= 80).length;
  const completeBasepackStock = basepackEntries.length > 0 && basepackEntries.every(material => {
    const depots = material.depot ?? [];
    return depots.length > 0 && depots.every(depot =>
      stock.some(row => row.basepackCode === basepack.basepackCode &&
        row.cbuCode === material.cbuCode && row.depotCode === depot &&
        row.quantityCases > 0 && isCurrentSnapshot(row.snapshotDate)));
  });
  const qualityStatus: FindingStatus = !entry.cbuCode || !entry.basepack
    ? "unknown"
    : cbustock.length === 0 || freshStock.length === 0
      ? "unknown" : cbustock.some(row => !isCurrentSnapshot(row.snapshotDate))
        ? "concern" : "pass";
  const stockSummary = cbustock.length
    ? cbustock.map(row => `${row.depotCode}: ${row.quantityCases} cases (${row.snapshotDate}${mapped.has(row.depotCode) ? ", mapped" : ", unmapped"})`).join("; ")
    : "No depot-level stock record is available for this CBU.";
  const dohSummary = `Predecessor DOH ${entry.predecessorDoh ?? "not recorded"}; successor DOH ${entry.successorDoh ?? "not recorded"}; SLOB ${entry.slobRisk == null ? "not recorded" : entry.slobRisk ? "flagged" : "not flagged"}.`;
  const changeDate = entry.networkChangeDate
    ? new Date(`${entry.networkChangeDate.slice(0, 10)}T00:00:00Z`) : null;
  const daysToChange = changeDate && !Number.isNaN(changeDate.getTime())
    ? Math.ceil((changeDate.getTime() - Date.now()) / 86400000) : null;
  const agents: AgentFinding[] = [
    {
      id: "quality", name: "Data quality", role: "Verifies stock snapshot and CBU identity",
      evidence: {
        status: qualityStatus, source: "Network entries · depot stock snapshots",
        detail: qualityStatus === "unknown" ? "CBU identity or a current depot stock snapshot is missing. Do not infer stock from DOH or MSTN."
          : qualityStatus === "concern" ? "At least one depot stock snapshot is older than 30 days or in the future; only current rows can drive an action."
            : `Current depot stock records are available for ${entry.cbuCode}.`,
      },
    },
    {
      id: "lifecycle", name: "Lifecycle", role: "Checks the recorded network change date",
      evidence: {
        status: daysToChange == null ? "unknown" : daysToChange < 0 ? "concern" : "pass",
        source: "Network entries · networkChangeDate",
        detail: daysToChange == null ? "No valid network change date is recorded."
          : `${entry.networkChangeDate} · ${daysToChange < 0 ? `${Math.abs(daysToChange)} days ago` : `${daysToChange} days away`}.`,
      },
    },
    {
      id: "stock", name: "Stock health", role: "Checks explicit depot stock and available DOH/SLOB",
      evidence: {
        status: !freshStock.length ? "unknown" : unmappedStock.length || entry.slobRisk ? "concern" : "pass",
        source: "Depot stock snapshots · Network entries DOH/SLOB",
        detail: `${stockSummary} ${dohSummary}`,
      },
    },
    {
      id: "depot", name: "Depot readiness", role: "Checks mapped depot MSTN and activation clearance",
      evidence: {
        status: !mapped.size || missingScores.length || entry.mstnPercentage == null || !clearance
          ? "unknown" : !clearance.criteriaMet ? "concern" : "pass",
        source: "Network entries · MSTN by depot · clearance-check",
        detail: !mapped.size ? "No mapped depots are recorded." :
          `${scoreCount}/${mapped.size} mapped depots have MSTN ≥80%; CBU MSTN ${entry.mstnPercentage ?? "not recorded"}%. ` +
          (missingScores.length ? `Missing scores: ${missingScores.join(", ")}. ` : "") +
          (clearance ? `Basepack clearance: ${clearance.criteriaMet ? "met" : "not met"} (${clearance.mstnCoverage}% CBU coverage).` : "Clearance is unavailable."),
      },
    },
    {
      id: "blockers", name: "SR / approvals", role: "Finds pending requests and human approval steps",
      evidence: {
        status: pendingActivation || pendingAmendments.length ? "concern" : "pass",
        source: "Service requests · pending approval queue",
        detail: pendingActivation || pendingAmendments.length
          ? `Pending activation ${pendingActivation?.id ?? "none"}; pending sourcing amendments ${pendingAmendments.map(sr => sr.id).join(", ") || "none"}.`
          : "No pending activation or sourcing amendment was found for this selection.",
      },
    },
  ];
  const uncertain = agents.some(agent => agent.evidence.status === "unknown" || agent.evidence.status === "conflict");
  const concerns = agents.filter(agent => agent.evidence.status === "concern");
  const level: RiskLevel = uncertain ? "Insufficient evidence"
    : concerns.length >= 3 ? "High" : concerns.length ? "Medium" : "Low";
  const assessment: RiskAssessment = {
    level, confidence: uncertain ? "Low" : "High",
    explanation: uncertain
      ? "Some evidence is missing. Only actions with verified, current inputs can be submitted; other decisions need human investigation."
      : concerns.length
        ? "The stored evidence shows one or more concerns. Existing clearance and approval rules decide whether requests can proceed."
        : "The available evidence shows no concern in these five checks. Final status still depends on approval.",
    drivers: concerns.map(agent => `${agent.name}: ${agent.evidence.detail}`),
  };
  return {
    agents, assessment, unmappedStock,
    activationReady: basepack.effectiveStatus !== "Active Pack" &&
      !!clearance?.criteriaMet && !pendingActivation && qualityStatus === "pass" &&
      mapped.size > 0 && missingScores.length === 0 && completeBasepackStock,
    pendingActivation, pendingAmendments,
  };
}